import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';

export interface StintRules {
  /** A stop at least this long (stationary + lane time over normal pace) is assumed to change driver. */
  driverChangeMinStopMs: number;
  /** A stop at least this long is assumed to refuel. */
  refuelMinStopMs: number;
}

export const DEFAULT_STINT_RULES: StintRules = {
  driverChangeMinStopMs: 4 * 60_000,
  refuelMinStopMs: 4 * 60_000,
};

/** Laps slower than normal pace by less than this are never stops, even when pit-flagged (drive-throughs). */
const MIN_STOP_MS = 90_000;

export interface Stop {
  /** First lap of the stop — the stable key for manual corrections (merging moves `lap`). */
  firstLap: number;
  /** Last lap whose time contains the stop. */
  lap: number;
  /** Race time the car completed that lap (≈ when it rejoined). */
  endMs: number;
  /** Time lost vs normal pace — pit lane + stationary. */
  durationMs: number;
  /** True when timing loops didn't flag it and we inferred it from lap time alone. */
  inferred: boolean;
  /** Pit lap(s) under a red flag: a hold, so no assumed driver change/refuel unless corrected. */
  underRed: boolean;
  driverChange: boolean;
  refuel: boolean;
}

export interface DriverStint {
  index: number;
  startMs: number;
  startLap: number;
  endMs: number | null;
  endLap: number | null;
  lapCount: number;
}

export interface StintSummary {
  stops: Stop[];
  stints: DriverStint[];
  driverChanges: number;
  /** Race time the current driver took over (0 = race start). */
  driverStartMs: number;
  /** Race time of the last refuel (0 = race start, full tank). */
  fuelStartMs: number;
  /** Normal (median green, non-pit) lap time used to size stops. */
  refPaceMs: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function referencePace(laps: LapRecord[]): number | null {
  return median(laps.filter((l) => !l.pit && l.flag === Flags.Green).map((l) => l.lapMs));
}

/**
 * Find pit stops in a car's lap log. Red Mist's pit loop misses many real
 * stops at LDRL (see docs/data-sources.md), so a green/yellow lap that's
 * `inferMinMs` slower than normal also counts, as an inferred stop. Red-flag
 * laps are never stops. Consecutive stop laps merge into one stop.
 */
export function findStops(
  laps: LapRecord[],
  rules: StintRules = DEFAULT_STINT_RULES,
  overrides: Record<number, boolean> = {},
): { stops: Stop[]; refPaceMs: number | null } {
  const refPaceMs = referencePace(laps);
  const stops: Stop[] = [];
  const inferMinMs = Math.min(rules.driverChangeMinStopMs, rules.refuelMinStopMs);
  let prevLap: number | null = null;

  for (const l of laps) {
    const extra = refPaceMs !== null ? l.lapMs - refPaceMs : 0;
    const flagged = l.pit && extra >= MIN_STOP_MS;
    const inferred = !l.pit && l.flag !== Flags.Red && refPaceMs !== null && extra >= inferMinMs;
    if (flagged || inferred) {
      const last = stops[stops.length - 1];
      if (last && prevLap !== null && last.lap === prevLap) {
        last.lap = l.lap;
        last.endMs = l.totalMs ?? last.endMs;
        last.durationMs += Math.max(0, extra);
        last.inferred = last.inferred && inferred;
        last.underRed = last.underRed || l.flag === Flags.Red;
      } else {
        stops.push({
          firstLap: l.lap,
          lap: l.lap,
          endMs: l.totalMs ?? 0,
          durationMs: Math.max(0, extra),
          inferred,
          underRed: l.flag === Flags.Red,
          driverChange: false,
          refuel: false,
        });
      }
    }
    prevLap = l.lap;
  }

  for (const s of stops) {
    s.driverChange = overrides[s.firstLap] ?? (!s.underRed && s.durationMs >= rules.driverChangeMinStopMs);
    s.refuel = !s.underRed && s.durationMs >= rules.refuelMinStopMs;
  }
  return { stops, refPaceMs };
}

/** Stops, driver stints (split only at driver changes) and the current driver/fuel clocks. */
export function summarizeStints(
  laps: LapRecord[],
  rules: StintRules = DEFAULT_STINT_RULES,
  overrides: Record<number, boolean> = {},
): StintSummary {
  const { stops, refPaceMs } = findStops(laps, rules, overrides);
  const stints: DriverStint[] = [];
  let startMs = 0;
  let startLap = laps[0]?.lap ?? 1;
  let fuelStartMs = 0;
  let lapsSoFar = 0;

  const changeAt = new Map(stops.filter((s) => s.driverChange).map((s) => [s.lap, s]));
  for (const l of laps) {
    lapsSoFar++;
    const stop = changeAt.get(l.lap);
    if (stop) {
      stints.push({
        index: stints.length,
        startMs,
        startLap,
        endMs: stop.endMs,
        endLap: l.lap,
        lapCount: lapsSoFar,
      });
      startMs = stop.endMs;
      startLap = l.lap + 1;
      lapsSoFar = 0;
    }
  }
  // The current driver's stint is always open, even before their first lap completes.
  stints.push({ index: stints.length, startMs, startLap, endMs: null, endLap: null, lapCount: lapsSoFar });
  for (const s of stops) if (s.refuel) fuelStartMs = s.endMs;

  return {
    stops,
    stints,
    driverChanges: stops.filter((s) => s.driverChange).length,
    driverStartMs: startMs,
    fuelStartMs,
    refPaceMs,
  };
}

/** Stops longer than this are red-flag holds or garage visits, not a normal stop. */
const ROUTINE_STOP_MAX_MS = 15 * 60_000;

/** Median of a car's routine stops (at least `minPitMs`), for projecting future stop cost. */
export function typicalStopMs(stops: Stop[], minPitMs: number): number {
  const d = stops
    .map((s) => s.durationMs)
    .filter((ms) => ms <= ROUTINE_STOP_MAX_MS)
    .sort((a, b) => a - b);
  return d.length ? Math.max(minPitMs, d[d.length >> 1]) : minPitMs;
}

export interface ClassChange {
  lap: number;
  /** Race time of the lap that first showed the new class. */
  atMs: number | null;
  from: string;
  to: string;
}

/** Reclass history from the per-lap class in the lap log. */
export function classHistory(laps: LapRecord[]): ClassChange[] {
  const out: ClassChange[] = [];
  let prev: string | null = null;
  for (const l of laps) {
    if (!l.cls) continue;
    if (prev !== null && l.cls !== prev) out.push({ lap: l.lap, atMs: l.totalMs, from: prev, to: l.cls });
    prev = l.cls;
  }
  return out;
}
