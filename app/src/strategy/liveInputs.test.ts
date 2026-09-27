import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import { emptyCarPosition, emptySessionState } from '../data/patch';
import type { LapRecord } from '../data/sessionStore';
import { toWireDuration } from '../data/time';
import { carStrategyData, liveProjections, raceClock } from './liveInputs';

const HOUR = 3_600_000;

function carWithLaps(number: string, cls: string, lapMs: number, count: number) {
  const cp = emptyCarPosition(number);
  cp.class = cls;
  cp.lastLapCompleted = count;
  cp.totalTime = toWireDuration(lapMs * count);
  const laps: LapRecord[] = Array.from({ length: count }, (_, i) => ({
    lap: i + 1,
    lapMs,
    totalMs: lapMs * (i + 1),
    flag: Flags.Green,
    pit: false,
    overallPosition: 1,
    classPosition: 1,
    cls: null,
  }));
  return { cp, laps };
}

describe('liveProjections', () => {
  it('treats a car that stopped running as parked', () => {
    // Runner: 2:20 laps, still circulating at t=4h. DNF: blistering 2:00 pace
    // but stopped after 4 laps.
    const runner = carWithLaps('440', 'B', 140_000, 100);
    const dnf = carWithLaps('220', 'B', 120_000, 4);
    const data = carStrategyData(
      { '440': runner.cp, '220': dnf.cp },
      { '440': runner.laps, '220': dnf.laps },
    );
    const nowMs = 4 * HOUR;
    const proj = liveProjections(data, 8 * HOUR, nowMs);
    expect(proj[0].number).toBe('440');
    const parked = proj.find((p) => p.number === '220')!;
    expect(parked.projLaps).toBe(4);
  });

  it('keeps active cars projected when now is unknown', () => {
    const runner = carWithLaps('440', 'B', 140_000, 100);
    const data = carStrategyData({ '440': runner.cp }, { '440': runner.laps });
    const proj = liveProjections(data, 8 * HOUR, null);
    expect(proj[0].projLaps).toBeGreaterThan(100);
  });
});

describe('raceClock without a feed countdown (LDRL sends timeToGo 00:00:00)', () => {
  const H = 3_600_000;
  const base = { ...emptySessionState(), runningRaceTime: '01:00:00', timeToGo: '00:00:00', currentFlag: Flags.Green };

  it('uses the race length in the session name', () => {
    const c = raceClock({ ...base, sessionName: 'Sun 2+5Hr' });
    expect([c.remainingMs, c.raceEndMs, c.lengthSource]).toEqual([6 * H, 7 * H, 'name']);
  });

  it('falls back to the configured race length', () => {
    const c = raceClock({ ...base, sessionName: 'Main Event' }, 8 * H);
    expect([c.remainingMs, c.lengthSource]).toEqual([7 * H, 'setting']);
  });

  it('trusts a real countdown, and a finished race stays at zero', () => {
    expect(raceClock({ ...base, timeToGo: '02:30:00', sessionName: 'Sun 2+5Hr' }).remainingMs).toBe(2.5 * H);
    const done = raceClock({ ...base, currentFlag: Flags.Checkered, sessionName: 'Sun 2+5Hr' });
    expect([done.remainingMs, done.lengthSource]).toEqual([0, 'feed']);
  });
});
