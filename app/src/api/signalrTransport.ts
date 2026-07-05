import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
  type IRetryPolicy,
  type RetryContext,
} from '@microsoft/signalr';
import type { Transport, TransportHandlers } from '../data/transport';
import type { RestClient } from './restClient';
import type { TokenProvider } from './tokenProvider';
import {
  sessionStatePatchFromJson,
  carPositionPatchFromJson,
} from './redmist/from-json-functions';

export const DEFAULT_HUB_URL = 'https://api.redmist.racing/status/event-status';

/** 0s, 2s, 10s then 30s forever — mirrors the official client's guidance. */
class InfiniteRetryPolicy implements IRetryPolicy {
  private readonly delays = [0, 2_000, 10_000];
  nextRetryDelayInMilliseconds(ctx: RetryContext): number {
    return this.delays[ctx.previousRetryCount] ?? 30_000;
  }
}

/**
 * Live transport: REST snapshot + SignalR V2 patch stream.
 *
 * Flow (mirrors RedMist.Timing.UI HubClient/LiveTimingViewModel):
 *  1. Fetch GetCurrentSessionStateJson and emit as full state.
 *  2. Connect to the status hub (Bearer token via broker) and invoke
 *     SubscribeToEventV2(eventId).
 *  3. Apply ReceiveSessionPatch / ReceiveCarPatches (nullable-field patches).
 *  4. On ReceiveReset or reconnect: resubscribe and re-fetch the snapshot,
 *     since patches missed during a gap make local state unrecoverable.
 */
export class SignalRTransport implements Transport {
  private hub: HubConnection | null = null;
  private stopped = false;
  private resyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private eventId: number,
    private handlers: TransportHandlers,
    private rest: RestClient,
    private tokens: TokenProvider,
    private hubUrl: string = DEFAULT_HUB_URL,
  ) {}

  async start(): Promise<void> {
    this.handlers.onStatus('connecting');

    // Validate broker + credentials before opening the socket so the caller
    // can fall back to polling on a clean failure.
    await this.tokens.getToken();

    await this.refreshSnapshot();

    const hub = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.tokens.getToken(),
      })
      .withAutomaticReconnect(new InfiniteRetryPolicy())
      .configureLogging(LogLevel.Warning)
      .build();

    hub.on('ReceiveSessionPatch', (raw: Record<string, unknown>) => {
      this.handlers.onSessionPatch(sessionStatePatchFromJson(raw));
    });
    hub.on('ReceiveCarPatches', (raw: Record<string, unknown>[]) => {
      this.handlers.onCarPatches(raw.map(carPositionPatchFromJson));
    });
    hub.on('ReceiveReset', () => {
      this.handlers.onReset();
      void this.refreshSnapshot();
    });

    hub.onreconnecting(() => this.handlers.onStatus('reconnecting'));
    hub.onreconnected(() => {
      void (async () => {
        try {
          await hub.invoke('SubscribeToEventV2', this.eventId);
          await this.refreshSnapshot();
          this.handlers.onStatus('live');
        } catch (err) {
          this.handlers.onStatus('error', `resubscribe failed: ${String(err)}`);
        }
      })();
    });
    hub.onclose(() => {
      if (!this.stopped) this.handlers.onStatus('error', 'connection closed');
    });

    await hub.start();
    await hub.invoke('SubscribeToEventV2', this.eventId);
    this.hub = hub;
    this.handlers.onStatus('live');

    // Safety net: periodically re-sync the full snapshot in case a patch was
    // dropped without a visible disconnect (flaky paddock networks).
    this.resyncTimer = setInterval(() => void this.refreshSnapshot(), 5 * 60_000);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.resyncTimer) clearInterval(this.resyncTimer);
    const hub = this.hub;
    this.hub = null;
    if (hub) {
      try {
        await hub.invoke('UnsubscribeFromEventV2', this.eventId);
      } catch {
        // best effort — the server drops group membership on disconnect anyway
      }
      await hub.stop();
    }
  }

  private async refreshSnapshot(): Promise<void> {
    try {
      const state = await this.rest.getCurrentSessionState(this.eventId);
      if (state) this.handlers.onFullState(state);
    } catch (err) {
      this.handlers.onStatus('error', `snapshot failed: ${String(err)}`);
    }
  }
}
