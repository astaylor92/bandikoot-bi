import type { Transport, TransportHandlers } from '../data/transport';
import type { LapReplayFixture } from './fixture';
import { ReplayEngine } from './replayEngine';

export interface ReplayProgress {
  simTimeMs: number;
  durationMs: number;
  playing: boolean;
  speed: number;
}

const TICK_MS = 250;
const EMIT_EVERY_TICKS = 4; // emit state at 1 Hz real time

/**
 * Drives the app from a recorded/reconstructed race exactly as if it were
 * live. Supports play/pause, speed and scrubbing (Dry Run mode).
 */
export class ReplayTransport implements Transport {
  readonly engine: ReplayEngine;
  private timer: ReturnType<typeof setInterval> | null = null;
  private simTimeMs: number;
  private speed = 10;
  private playing = false;
  private tickCount = 0;
  private lastEmittedLaps = new Map<string, number>();

  constructor(
    fixture: LapReplayFixture,
    private handlers: TransportHandlers,
    private onProgress?: (p: ReplayProgress) => void,
    startAtMs?: number,
  ) {
    this.engine = new ReplayEngine(fixture);
    // Default: drop into the race a third of the way in so the board is
    // immediately interesting.
    this.simTimeMs = startAtMs ?? Math.floor(this.engine.durationMs / 3);
  }

  async start(): Promise<void> {
    this.handlers.onStatus('replay');
    this.emitFull(true);
    this.play();
  }

  async stop(): Promise<void> {
    this.pause();
  }

  play(): void {
    if (this.timer) return;
    this.playing = true;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.progress();
  }

  pause(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.progress();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.progress();
  }

  seekTo(ms: number): void {
    const clamped = Math.max(0, Math.min(ms, this.engine.durationMs));
    const backwards = clamped < this.simTimeMs;
    this.simTimeMs = clamped;
    if (backwards) this.handlers.onReset();
    this.emitFull(true);
    this.progress();
  }

  getProgress(): ReplayProgress {
    return {
      simTimeMs: this.simTimeMs,
      durationMs: this.engine.durationMs,
      playing: this.playing,
      speed: this.speed,
    };
  }

  private tick(): void {
    this.simTimeMs = Math.min(this.simTimeMs + TICK_MS * this.speed, this.engine.durationMs);
    this.tickCount++;
    if (this.tickCount % EMIT_EVERY_TICKS === 0 || this.simTimeMs >= this.engine.durationMs) {
      this.emitFull(false);
    }
    if (this.simTimeMs >= this.engine.durationMs) this.pause();
    this.progress();
  }

  private emitFull(withLapHistory: boolean): void {
    const state = this.engine.stateAt(this.simTimeMs);
    this.handlers.onFullState(state);
    for (const cp of state.carPositions) {
      const num = cp.number!;
      const prev = this.lastEmittedLaps.get(num) ?? 0;
      // Seed/repair the lap log whenever more than one lap elapsed between
      // emissions (fast-forward, scrub) — normal accumulation only sees the
      // latest lap.
      if (withLapHistory || cp.lastLapCompleted > prev + 1 || cp.lastLapCompleted < prev) {
        this.handlers.onLapHistory(num, this.engine.lapsUpTo(num, this.simTimeMs));
      }
      this.lastEmittedLaps.set(num, cp.lastLapCompleted);
    }
  }

  private progress(): void {
    this.onProgress?.(this.getProgress());
  }
}
