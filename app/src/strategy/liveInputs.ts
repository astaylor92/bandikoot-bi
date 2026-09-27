import type { SessionState } from '../api/redmist/session-state';
import type { CarPosition } from '../api/redmist/car-position';
import type { LapRecord } from '../data/sessionStore';
import { parseDurationMs } from '../data/time';
import { paceSummary, type PaceSummary } from './pace';
import { isParked } from './nextPit';
import { projectStandings, type ProjectedCar, type ProjectionCarInput } from './projection';

export interface RaceClock {
  elapsedMs: number | null;
  remainingMs: number | null;
  raceEndMs: number | null;
}

export function raceClock(session: SessionState): RaceClock {
  const elapsedMs = parseDurationMs(session.runningRaceTime);
  const remainingMs = parseDurationMs(session.timeToGo);
  return {
    elapsedMs,
    remainingMs,
    raceEndMs: elapsedMs !== null && remainingMs !== null ? elapsedMs + remainingMs : null,
  };
}

export interface CarStrategyData {
  car: CarPosition;
  pace: PaceSummary;
  lastCrossMs: number | null;
}

export function carStrategyData(
  cars: Record<string, CarPosition>,
  lapLog: Record<string, LapRecord[]>,
): Record<string, CarStrategyData> {
  const out: Record<string, CarStrategyData> = {};
  for (const [num, car] of Object.entries(cars)) {
    out[num] = {
      car,
      pace: paceSummary(lapLog[num] ?? []),
      lastCrossMs: parseDurationMs(car.totalTime),
    };
  }
  return out;
}

/** Assemble projection inputs for every car currently on the board. */
export function liveProjections(
  data: Record<string, CarStrategyData>,
  raceEndMs: number,
  nowMs: number | null = null,
  extraLossMsByCar?: Record<string, number>,
  /** Under a red flag nobody crosses the line; don't treat stopped cars as parked. */
  redFlag = false,
): ProjectedCar[] {
  const inputs: ProjectionCarInput[] = Object.values(data).map((d) => ({
    number: d.car.number ?? '',
    cls: d.car.class ?? '',
    lapsCompleted: d.car.lastLapCompleted,
    lastCrossMs: d.lastCrossMs,
    // A car whose last crossing is long past is parked/retired — projecting its
    // historical pace across the remaining race would rank a 4-lap DNF first.
    paceMs:
      !redFlag && nowMs !== null && isParked(nowMs, d.lastCrossMs, d.pace.rollingMs, d.car.isInPit)
        ? null
        : d.pace.rollingMs,
    inPit: d.car.isInPit,
  }));
  return projectStandings(inputs, { raceEndMs, extraLossMsByCar, nowMs });
}
