import type { LapRecord } from '../data/sessionStore';
import { classHistory, summarizeStints, type ClassChange, type StintRules, type StintSummary } from './stints';

export interface CarIntel {
  stints: StintSummary;
  classChanges: ClassChange[];
}

export interface FieldIntelInput {
  lapLog: Record<string, LapRecord[]>;
  rules: StintRules;
  driverChangeOverrides: Record<string, Record<number, boolean>>;
}

/** Per-car derived intel for every car with laps. Pure; memoise at the call site. */
export function fieldIntel(input: FieldIntelInput): Record<string, CarIntel> {
  const out: Record<string, CarIntel> = {};
  for (const [car, laps] of Object.entries(input.lapLog)) {
    out[car] = {
      stints: summarizeStints(laps, input.rules, input.driverChangeOverrides[car] ?? {}),
      classChanges: classHistory(laps),
    };
  }
  return out;
}
