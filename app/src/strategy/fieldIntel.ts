import type { CarPosition } from '../api/redmist/car-position';
import type { LapRecord } from '../data/sessionStore';
import { parseDurationMs } from '../data/time';
import { predictNextPit, type NextPit, type PitAssumptions } from './nextPit';
import { paceSummary, type PaceSummary } from './pace';
import { classHistory, summarizeStints, type ClassChange, type StintRules, type StintSummary } from './stints';

export interface CarIntel {
  stints: StintSummary;
  classChanges: ClassChange[];
  pace: PaceSummary;
  next: NextPit | null;
}

export interface FieldIntelInput {
  lapLog: Record<string, LapRecord[]>;
  cars: Record<string, CarPosition>;
  rules: StintRules;
  driverChangeOverrides: Record<string, Record<number, boolean>>;
  assumptionsFor: (car: string) => PitAssumptions;
  nowMs: number | null;
  raceEndMs: number | null;
}

/** Per-car derived intel for every car with laps. Pure; memoise at the call site. */
export function fieldIntel(input: FieldIntelInput): Record<string, CarIntel> {
  const out: Record<string, CarIntel> = {};
  for (const [car, laps] of Object.entries(input.lapLog)) {
    const stints = summarizeStints(laps, input.rules, input.driverChangeOverrides[car] ?? {});
    const pace = paceSummary(laps);
    const cp = input.cars[car];
    const next =
      input.nowMs !== null
        ? predictNextPit({
            stints,
            assumptions: input.assumptionsFor(car),
            nowMs: input.nowMs,
            raceEndMs: input.raceEndMs,
            paceMs: pace.rollingMs,
            lastCrossMs: parseDurationMs(cp?.totalTime) ?? laps[laps.length - 1]?.totalMs ?? null,
            inPit: cp?.isInPit ?? false,
          })
        : null;
    out[car] = { stints, classChanges: classHistory(laps), pace, next };
  }
  return out;
}
