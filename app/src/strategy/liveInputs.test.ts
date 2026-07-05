import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import { emptyCarPosition } from '../data/patch';
import type { LapRecord } from '../data/sessionStore';
import { toWireDuration } from '../data/time';
import { carStrategyData, liveProjections } from './liveInputs';

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
