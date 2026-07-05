import type { SessionState } from '../api/redmist/session-state';
import type { SessionStatePatch } from '../api/redmist/session-state-patch';
import type { CarPositionPatch } from '../api/redmist/car-position-patch';
import type { ConnectionStatus, LapRecord } from './sessionStore';

/**
 * Events a transport raises. Implemented identically by the live SignalR
 * transport, the REST polling fallback and the replay transport — the rest of
 * the app cannot tell which one is feeding it.
 */
export interface TransportHandlers {
  onFullState(state: SessionState): void;
  onSessionPatch(patch: SessionStatePatch): void;
  onCarPatches(patches: CarPositionPatch[]): void;
  /** Replace the accumulated lap history for a car (seeding / scrubbing). */
  onLapHistory(car: string, laps: LapRecord[]): void;
  onStatus(status: ConnectionStatus, detail?: string): void;
  /** Server-side reset: local state is invalid and a fresh snapshot follows. */
  onReset(): void;
}

export interface Transport {
  start(): Promise<void>;
  stop(): Promise<void>;
}
