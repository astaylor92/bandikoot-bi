import type { SessionState } from '../api/redmist/session-state';
import type { CarPosition } from '../api/redmist/car-position';
import type { LapRecord } from '../data/sessionStore';
import { parseDurationMs } from '../data/time';
import { raceLengthMsFromName } from '../data/lapsSnapshot';
import { Flags } from '../api/redmist/flags';
import type { ScheduleStatus } from './schedule';
import { paceSummary, type PaceSummary } from './pace';
import { isParked } from './nextPit';
import { projectStandings, type ProjectedCar, type ProjectionCarInput } from './projection';

export interface RaceClock {
  elapsedMs: number | null;
  remainingMs: number | null;
  raceEndMs: number | null;
  /** Where the race length came from: a race schedule, the timing feed, the session name, or the Pit Plan setting. */
  lengthSource: 'schedule' | 'feed' | 'name' | 'setting' | null;
  /** Present when timing comes from a race schedule (wall clock). */
  schedule?: ScheduleStatus;
}

/**
 * Race clock from a wall-clock schedule: "remaining" is time to the current
 * (or next) checkered flag, so each part of a split day (2+5) is planned as its
 * own race. Elapsed still comes from the timing feed's race clock.
 */
export function scheduledRaceClock(session: SessionState, status: ScheduleStatus): RaceClock {
  const elapsedMs = parseDurationMs(session.runningRaceTime);
  const remainingMs = status.phase === 'finished' ? 0 : status.toFlagMs;
  return {
    elapsedMs,
    remainingMs,
    raceEndMs: elapsedMs !== null && remainingMs !== null ? elapsedMs + remainingMs : null,
    lengthSource: 'schedule',
    schedule: status,
  };
}

/**
 * Race clock from the session. LDRL's timing sends timeToGo "00:00:00" for the
 * whole race (no countdown configured), which would make the race look over.
 * While the race is running, a zero/missing countdown falls back to the length
 * in the session name ("Sun 2+5Hr" = 7 h), then to `fallbackLengthMs`.
 */
export function raceClock(session: SessionState, fallbackLengthMs: number | null = null): RaceClock {
  const elapsedMs = parseDurationMs(session.runningRaceTime);
  const fed = parseDurationMs(session.timeToGo);
  let remainingMs = fed;
  let lengthSource: RaceClock['lengthSource'] = fed !== null ? 'feed' : null;
  const finished = session.currentFlag === Flags.Checkered;
  if ((fed === null || fed === 0) && !finished && elapsedMs !== null) {
    const fromName = raceLengthMsFromName(session.sessionName ?? '');
    const length = fromName ?? fallbackLengthMs;
    if (length !== null) {
      remainingMs = Math.max(0, length - elapsedMs);
      lengthSource = fromName !== null ? 'name' : 'setting';
    }
  }
  return {
    elapsedMs,
    remainingMs,
    raceEndMs: elapsedMs !== null && remainingMs !== null ? elapsedMs + remainingMs : null,
    lengthSource,
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
