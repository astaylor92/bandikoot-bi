import type { Transport, TransportHandlers } from '../data/transport';
import type { RestClient } from './restClient';

/**
 * REST polling fallback. GetCurrentSessionStateJson is public (no auth), so
 * the app remains fully functional without broker credentials — just with
 * ~5s latency instead of the sub-second patch stream.
 */
export class PollingTransport implements Transport {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private failures = 0;

  constructor(
    private eventId: number,
    private handlers: TransportHandlers,
    private rest: RestClient,
    private intervalMs = 5_000,
  ) {}

  async start(): Promise<void> {
    this.handlers.onStatus('connecting');
    await this.tick();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule(): void {
    if (this.stopped) return;
    // Back off up to 3x the base interval while failing.
    const backoff = Math.min(this.failures, 2) * this.intervalMs;
    this.timer = setTimeout(() => void this.tick(), this.intervalMs + backoff);
  }

  private async tick(): Promise<void> {
    try {
      const state = await this.rest.getCurrentSessionState(this.eventId);
      if (this.stopped) return;
      if (state) {
        this.handlers.onFullState(state);
        this.handlers.onStatus('polling');
      } else {
        this.handlers.onStatus('polling', 'no live session state');
      }
      this.failures = 0;
    } catch (err) {
      this.failures++;
      if (!this.stopped) this.handlers.onStatus('error', String(err));
    }
    this.schedule();
  }
}
