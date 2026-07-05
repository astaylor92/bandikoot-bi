import type { LapRecord } from '../data/sessionStore';

export interface StintConfig {
  raceLengthMs: number;
  /** Longest a car can stay out (fuel or rules), ms. */
  maxStintMs: number;
  /** Minimum stationary/pit time per stop, ms (Lucky Dog: typically 5 min). */
  minPitMs: number;
  drivers: string[];
}

export interface PlannedStint {
  index: number;
  driver: string;
  startMs: number;
  endMs: number;
  /** null for the final stint (no stop after). */
  pitAfterMs: number | null;
}

/** Minimum number of stops to cover the remaining race time. */
export function stopsRequired(remainingMs: number, maxStintMs: number): number {
  if (remainingMs <= maxStintMs) return 0;
  return Math.ceil(remainingMs / maxStintMs) - 1;
}

/**
 * Even-stint plan from `fromMs` to the end of the race: minimum number of
 * stops, equal-length stints, drivers rotated in order.
 */
export function buildEvenPlan(cfg: StintConfig, fromMs = 0, driverOffset = 0): PlannedStint[] {
  const total = Math.max(0, cfg.raceLengthMs - fromMs);
  if (total === 0) return [];
  const stops = stopsRequired(total, cfg.maxStintMs);
  const stints = stops + 1;
  const driveTime = total - stops * cfg.minPitMs;
  const stintLen = driveTime / stints;

  const out: PlannedStint[] = [];
  let t = fromMs;
  for (let i = 0; i < stints; i++) {
    const driver = cfg.drivers.length
      ? cfg.drivers[(driverOffset + i) % cfg.drivers.length]
      : `Stint ${i + 1}`;
    const endMs = t + stintLen;
    out.push({
      index: i,
      driver,
      startMs: t,
      endMs,
      pitAfterMs: i < stints - 1 ? cfg.minPitMs : null,
    });
    t = endMs + cfg.minPitMs;
  }
  return out;
}

export interface ActualStint {
  startLap: number;
  endLap: number | null;
  startMs: number;
  endMs: number | null;
  lapCount: number;
}

/** Derive actual stints from the lap log: each pit-flagged lap closes a stint. */
export function actualStints(laps: LapRecord[]): ActualStint[] {
  const out: ActualStint[] = [];
  let current: ActualStint | null = null;
  for (const lap of laps) {
    if (!current) {
      current = {
        startLap: lap.lap,
        endLap: null,
        startMs: (lap.totalMs ?? 0) - lap.lapMs,
        endMs: null,
        lapCount: 0,
      };
    }
    current.lapCount++;
    if (lap.pit) {
      current.endLap = lap.lap;
      current.endMs = lap.totalMs;
      out.push(current);
      current = null;
    }
  }
  if (current) out.push(current);
  return out;
}

export interface StintStatus {
  currentStintMs: number;
  stopsTaken: number;
  stopsStillRequired: number;
  /** Latest race time by which the car must next pit (fuel/stint limit). */
  mustPitByMs: number;
  /** Time left in the current stint window. */
  windowRemainingMs: number;
  plan: PlannedStint[];
}

/** Live plan-vs-actual: where we are in the stint cycle and what's left. */
export function stintStatus(
  cfg: StintConfig,
  laps: LapRecord[],
  elapsedMs: number,
): StintStatus {
  const stints = actualStints(laps);
  const finished = stints.filter((s) => s.endMs !== null);
  const stopsTaken = finished.length;
  const currentStart = stopsTaken > 0 ? finished[finished.length - 1].endMs! : 0;
  const currentStintMs = Math.max(0, elapsedMs - currentStart);

  const mustPitByMs = Math.min(currentStart + cfg.maxStintMs, cfg.raceLengthMs);
  const windowRemainingMs = Math.max(0, mustPitByMs - elapsedMs);

  const remainingAfterStintEnd = Math.max(0, cfg.raceLengthMs - mustPitByMs);
  const stopsStillRequired =
    remainingAfterStintEnd > 0 ? 1 + stopsRequired(remainingAfterStintEnd, cfg.maxStintMs) : 0;

  const plan = buildEvenPlan(cfg, elapsedMs, stopsTaken);

  return { currentStintMs, stopsTaken, stopsStillRequired, mustPitByMs, windowRemainingMs, plan };
}

export interface PitDecision {
  /** Total expected pit time loss if we pit now vs at the end of the window. */
  recommendation: 'pit-now' | 'stay-out' | 'must-pit';
  note: string;
}

/**
 * Simple pit-now-vs-stretch heuristic. Stops cost the same stationary time
 * whenever they happen, so staying out is free unless it strands you with an
 * extra stop or the window is about to close.
 */
export function pitDecision(status: StintStatus, cfg: StintConfig, elapsedMs: number): PitDecision {
  const remaining = cfg.raceLengthMs - elapsedMs;
  if (status.windowRemainingMs <= 0) {
    return { recommendation: 'must-pit', note: 'Stint/fuel window is exhausted.' };
  }
  // If pitting now still needs the same number of stops as pitting at the
  // window edge, staying out banks flexibility (yellow may fall).
  const stopsIfNow = remaining > 0 ? 1 + stopsRequired(Math.max(0, remaining - cfg.minPitMs), cfg.maxStintMs) : 0;
  const stopsIfStretch = status.stopsStillRequired;
  if (stopsIfNow < stopsIfStretch) {
    return {
      recommendation: 'pit-now',
      note: 'Pitting now saves a stop vs waiting for the window edge.',
    };
  }
  if (status.windowRemainingMs < 10 * 60_000) {
    return {
      recommendation: 'stay-out',
      note: `Window closes in ${Math.round(status.windowRemainingMs / 60_000)} min — pit under yellow if one falls, otherwise before it closes.`,
    };
  }
  return { recommendation: 'stay-out', note: 'No stop saved by pitting early; stay out.' };
}
