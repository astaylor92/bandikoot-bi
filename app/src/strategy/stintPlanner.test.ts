import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';
import { actualStints, buildEvenPlan, pitDecision, stintStatus, stopsRequired } from './stintPlanner';

const MIN = 60_000;

const CFG = {
  raceLengthMs: 480 * MIN, // 8h
  maxStintMs: 110 * MIN,
  minPitMs: 5 * MIN,
  drivers: ['Ana', 'Ben', 'Cal'],
};

describe('stopsRequired', () => {
  it('no stop when the race fits one stint', () => {
    expect(stopsRequired(100 * MIN, 110 * MIN)).toBe(0);
  });
  it('8h race with 110min stints needs 4 stops', () => {
    expect(stopsRequired(480 * MIN, 110 * MIN)).toBe(4);
  });
});

describe('buildEvenPlan', () => {
  it('covers the whole race with even stints and rotated drivers', () => {
    const plan = buildEvenPlan(CFG);
    expect(plan).toHaveLength(5);
    expect(plan[0].driver).toBe('Ana');
    expect(plan[1].driver).toBe('Ben');
    expect(plan[3].driver).toBe('Ana');
    const last = plan[plan.length - 1];
    expect(last.pitAfterMs).toBeNull();
    expect(last.endMs).toBeCloseTo(CFG.raceLengthMs, -3);
    // every stint fits the max window
    for (const s of plan) expect(s.endMs - s.startMs).toBeLessThanOrEqual(CFG.maxStintMs);
  });
});

function pitLap(n: number, totalMs: number): LapRecord {
  return { lap: n, lapMs: 8 * MIN, totalMs, flag: Flags.Green, pit: true, overallPosition: 1, classPosition: 1, cls: null };
}
function greenLap(n: number, totalMs: number): LapRecord {
  return { lap: n, lapMs: 2.4 * MIN, totalMs, flag: Flags.Green, pit: false, overallPosition: 1, classPosition: 1, cls: null };
}

describe('actualStints / stintStatus', () => {
  const laps: LapRecord[] = [
    greenLap(1, 2.4 * MIN),
    greenLap(2, 4.8 * MIN),
    pitLap(3, 100 * MIN), // first stop completes lap 3 at 100min
    greenLap(4, 102.4 * MIN),
  ];

  it('splits stints at pit laps', () => {
    const stints = actualStints(laps);
    expect(stints).toHaveLength(2);
    expect(stints[0].endLap).toBe(3);
    expect(stints[1].endLap).toBeNull();
  });

  it('computes the live window from the last stop', () => {
    const status = stintStatus(CFG, laps, 150 * MIN);
    expect(status.stopsTaken).toBe(1);
    expect(status.currentStintMs).toBe(50 * MIN);
    expect(status.mustPitByMs).toBe(210 * MIN);
    expect(status.windowRemainingMs).toBe(60 * MIN);
    // 480-210 = 270min remain after window edge -> 1 + ceil(270/110)-1 = 3 stops
    expect(status.stopsStillRequired).toBe(3);
  });

  it('recommends must-pit when the window is exhausted', () => {
    const status = stintStatus(CFG, laps, 211 * MIN);
    expect(pitDecision(status, CFG, 211 * MIN).recommendation).toBe('must-pit');
  });
});
