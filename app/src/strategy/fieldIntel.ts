import type { CarPosition } from '../api/redmist/car-position';
import type { LapRecord } from '../data/sessionStore';
import { parseDurationMs } from '../data/time';
import { isParked, predictNextPit, type NextPit, type PitAssumptions } from './nextPit';
import { paceSnapshot, reclassRisks, type CarPaceSnapshot, type ReclassRisk } from './reclass';
import { paceSummary, type PaceSummary } from './pace';
import { classHistory, summarizeStints, type ClassChange, type StintRules, type StintSummary } from './stints';

export interface CarIntel {
  stints: StintSummary;
  classChanges: ClassChange[];
  pace: PaceSummary;
  next: NextPit | null;
  reclass: ReclassRisk | null;
}

export interface FieldIntelInput {
  lapLog: Record<string, LapRecord[]>;
  cars: Record<string, CarPosition>;
  rules: StintRules;
  driverChangeOverrides: Record<string, Record<number, boolean>>;
  assumptionsFor: (car: string) => PitAssumptions;
  nowMs: number | null;
  raceEndMs: number | null;
  classOrder: Record<string, string>;
}

/** Per-car derived intel for every car with laps. Pure; memoise at the call site. */
export function fieldIntel(input: FieldIntelInput): Record<string, CarIntel> {
  const out: Record<string, CarIntel> = {};
  const snapshots: CarPaceSnapshot[] = [];
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
    out[car] = { stints, classChanges: classHistory(laps), pace, next, reclass: null };

    const cls = cp?.class ?? laps[laps.length - 1]?.cls;
    const lastCross = parseDurationMs(cp?.totalTime);
    const parked = input.nowMs !== null && isParked(input.nowMs, lastCross, pace.rollingMs, cp?.isInPit ?? false);
    const snap = cls && !parked ? paceSnapshot(car, cls, laps) : null;
    if (snap) snapshots.push(snap);
  }
  if (input.nowMs !== null) {
    const risks = reclassRisks(snapshots, input.classOrder, input.nowMs);
    for (const [car, r] of Object.entries(risks)) out[car].reclass = r;
  }
  return out;
}
