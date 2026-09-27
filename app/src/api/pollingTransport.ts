import type { Transport, TransportHandlers } from '../data/transport';
import type { SnapshotSource } from '../data/snapshotSource';

/**
 * REST polling transport. Works without broker credentials via the public
 * LoadSessionResults fallback in SnapshotSource — ~5s latency instead of the
 * sub-second patch stream.
 */
export class PollingTransport implements Transport {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private failures = 0;

  constructor(
    private eventId: number,
    private handlers: TransportHandlers,
    private snapshots: SnapshotSource,
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
      const { state, source } = await this.snapshots.fetch();
      if (this.stopped) return;
      this.handlers.onFeedSource?.(source);
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
