import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';
import type { NextPit } from './nextPit';
import { currentGap, gapSeries, projectedFinishGapMs, rivalCall } from './rivalCall';

const MIN = 60_000;

function laps(paceMs: number, n: number, startMs = 0): LapRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    lap: i + 1,
    lapMs: paceMs,
    totalMs: startMs + (i + 1) * paceMs,
    flag: Flags.Green,
    pit: false,
    overallPosition: 1,
    classPosition: 1,
    cls: 'B',
  }));
}

function next(p: Partial<NextPit>): NextPit {
  return {
    atMs: null, reason: 'driver', driverOutMs: 0, fuelOutMs: 0, inLaps: null, inPit: false,
    parked: false, overdue: false, finishes: false, remainingStops: 1, observedFuelStintMs: null, ...p,
  };
}

describe('gap series', () => {
  it('compares crossing times at equal lap numbers', () => {
    const g = gapSeries(laps(120_000, 3), laps(121_000, 3));
    expect(g.map((p) => p.gapMs)).toEqual([1000, 2000, 3000]);
  });

  it('reports lap difference and gap at the last common lap', () => {
    expect(currentGap(laps(100_000, 10), laps(110_000, 9))).toEqual({ lapsDiff: 1, gapMs: 90_000, onSameLap: true });
    expect(currentGap(laps(100_000, 10), laps(130_000, 7)).onSameLap).toBe(false);
  });

  it('projected finish gap is positive when we finish ahead', () => {
    const mine = { number: '440', cls: 'B', projLaps: 200.5, projOverallPos: 1, projClassPos: 1, paceMs: 110_000, lapsCompleted: 100 };
    const theirs = { ...mine, number: '760', projLaps: 200 };
    expect(projectedFinishGapMs(mine, theirs)).toBe(55_000);
    expect(projectedFinishGapMs(theirs, mine)).toBe(-55_000);
  });
});

describe('rivalCall', () => {
  const base = {
    nowMs: 100 * MIN,
    myStops: [],
    rivalStops: [],
    myPaceMs: 115_000,
    rivalPaceMs: 116_000,
    minPitMs: 5 * MIN,
    rival: '760',
  };

  it('rival pitting: cycled gap adds their stop, subtracts ours, plus pace delta while we stay out', () => {
    const call = rivalCall({
      ...base,
      gapMs: -20_000,
      rivalNext: next({ inPit: true, atMs: 100 * MIN }),
      myNext: next({ atMs: 110 * MIN, inLaps: 5 }),
    });
    expect(call.kind).toBe('rival-pitting');
    // -20s + 300s - 300s + 5 × 1s
    expect(call.cycledGapMs).toBe(-15_000);
    expect(call.deltaMs).toBe(5_000);
    expect(call.message).toMatch(/#760 is pitting/);
  });

  it('warns when the rival window opens, noting overlap with ours', () => {
    const call = rivalCall({
      ...base,
      gapMs: 5000,
      rivalNext: next({ atMs: 106 * MIN, reason: 'fuel' }),
      myNext: next({ atMs: 112 * MIN }),
    });
    expect(call.kind).toBe('rival-window');
    expect(call.message).toMatch(/overlaps/);
  });

  it('is quiet otherwise', () => {
    expect(
      rivalCall({ ...base, gapMs: 1000, rivalNext: next({ atMs: 160 * MIN }), myNext: next({ atMs: 150 * MIN }) }).kind,
    ).toBe('none');
  });
});
