import { typicalStopMs, type StintSummary } from './stints';

export interface PitAssumptions {
  maxStintMs: number;
  tankGal: number;
  gph: number;
  reserveMs: number;
}

export interface NextPitInput {
  stints: StintSummary;
  assumptions: PitAssumptions;
  /** Current race time. */
  nowMs: number;
  raceEndMs: number | null;
  paceMs: number | null;
  lastCrossMs: number | null;
  inPit: boolean;
}

/** A car that hasn't crossed the line for this long (and isn't in pit lane) is parked/retired. */
export function isParked(nowMs: number, lastCrossMs: number | null, paceMs: number | null, inPit: boolean): boolean {
  if (inPit || lastCrossMs === null) return false;
  return nowMs - lastCrossMs > Math.max(4 * (paceMs ?? 180_000), 10 * 60_000);
}

export type PitReason = 'driver' | 'fuel';

export interface NextPit {
  /** Predicted race time of the next stop; null when the car should make the flag. */
  atMs: number | null;
  reason: PitReason;
  driverOutMs: number;
  fuelOutMs: number;
  /** Laps until the stop at current pace (null without pace). */
  inLaps: number | null;
  inPit: boolean;
  /** Not seen for several laps: retired, in the garage, or stopped on track. */
  parked: boolean;
  /** Past its predicted window and not yet stopped. */
  overdue: boolean;
  finishes: boolean;
  /** Further stops needed to the flag, including the next one. */
  remainingStops: number;
  /** Median on-track time between refuels this race, for calibrating tank/gph. */
  observedFuelStintMs: number | null;
}

/** Usable time on a full tank: tank ÷ burn rate, minus a safety reserve. */
export function fuelWindowMs(a: PitAssumptions): number {
  if (a.gph <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, (a.tankGal / a.gph) * 3_600_000 - a.reserveMs);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Track time between consecutive refuel stops (the first stint counts from the green flag). */
export function observedFuelStintMs(stints: StintSummary): number | null {
  const intervals: number[] = [];
  let prevEnd = 0;
  for (const s of stints.stops) {
    if (!s.refuel) continue;
    intervals.push(s.endMs - s.durationMs - prevEnd);
    prevEnd = s.endMs;
  }
  return median(intervals.filter((ms) => ms > 10 * 60_000));
}

/**
 * When will this car next have to pit? The earlier of its driver hitting the
 * max stint and its fuel running out, from the last driver change / refuel.
 */
export function predictNextPit(input: NextPitInput): NextPit {
  const { stints, assumptions, nowMs, raceEndMs, paceMs, lastCrossMs, inPit } = input;
  const driverOutMs = stints.driverStartMs + assumptions.maxStintMs;
  const fuelWindow = fuelWindowMs(assumptions);
  const fuelOutMs = stints.fuelStartMs + fuelWindow;
  const reason: PitReason = fuelOutMs < driverOutMs ? 'fuel' : 'driver';
  const dueMs = Math.min(driverOutMs, fuelOutMs);

  const finishes = raceEndMs !== null && dueMs >= raceEndMs;
  const atMs = finishes ? null : inPit ? nowMs : dueMs;
  const parked = isParked(nowMs, lastCrossMs, paceMs, inPit);
  const overdue = !inPit && !parked && !finishes && dueMs < nowMs;

  let inLaps: number | null = null;
  if (atMs !== null && paceMs && paceMs > 0) {
    const from = lastCrossMs ?? nowMs;
    inLaps = Math.max(0, Math.floor((atMs - from) / paceMs));
  }

  let remainingStops = 0;
  if (atMs !== null && raceEndMs !== null) {
    const cycle = Math.min(assumptions.maxStintMs, fuelWindow);
    const stopMs = typicalStopMs(stints.stops, 0);
    const afterNext = raceEndMs - Math.max(atMs, nowMs) - stopMs;
    remainingStops = 1 + (cycle > 0 && Number.isFinite(cycle) ? Math.max(0, Math.ceil(afterNext / cycle) - 1) : 0);
  }

  return {
    atMs,
    reason,
    driverOutMs,
    fuelOutMs,
    inLaps,
    inPit,
    parked,
    overdue,
    finishes,
    remainingStops,
    observedFuelStintMs: observedFuelStintMs(stints),
  };
}

/** Time a car will still lose in the pits before the flag, for finish projections. */
export function remainingPitLossMs(next: NextPit, stints: StintSummary, minPitMs: number): number {
  return next.remainingStops * typicalStopMs(stints.stops, minPitMs);
}
