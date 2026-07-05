import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapReplayFixture, LapTuple } from './fixture';
import { ReplayEngine } from './replayEngine';

const MIN = 60_000;

function laps(lapMs: number, count: number, pitEvery = 0): LapTuple[] {
  const out: LapTuple[] = [];
  let t = 0;
  for (let i = 1; i <= count; i++) {
    const pit = pitEvery > 0 && i % pitEvery === 0 ? 1 : 0;
    const ms = lapMs + (pit ? 5 * MIN : 0);
    t += ms;
    out.push([i, ms, t, Flags.Green, pit]);
  }
  return out;
}

const fixture: LapReplayFixture = {
  format: 'redmist-replay/laps@1',
  eventId: 1,
  eventName: 'Test Race',
  sessionId: 1,
  sessionName: 'Race',
  trackName: 'Test Track',
  organizationName: 'Test Org',
  durationMs: 120 * MIN,
  localStartMs: 9 * 3_600_000,
  classColors: { A: '#ff0000', B: '#0000ff' },
  classOrder: { A: '1', B: '2' },
  entries: [
    { no: '1', nm: 'Fast Team', t: 'Miata', c: 'A' },
    { no: '2', nm: 'Slow Team', t: '325', c: 'B' },
    { no: '3', nm: 'Mid Team', t: 'Civic', c: 'B' },
  ],
  flags: [
    { f: Flags.Green, startMs: 0, endMs: 60 * MIN },
    { f: Flags.Yellow, startMs: 60 * MIN, endMs: 70 * MIN },
    { f: Flags.Green, startMs: 70 * MIN, endMs: null },
  ],
  cars: [
    { n: '1', c: 'A', laps: laps(2 * MIN, 55, 20) },
    { n: '2', c: 'B', laps: laps(2.5 * MIN, 45, 20) },
    { n: '3', c: 'B', laps: laps(2.2 * MIN, 50, 20) },
  ],
};

describe('ReplayEngine', () => {
  const engine = new ReplayEngine(fixture);

  it('ranks cars by laps then crossing time', () => {
    const state = engine.stateAt(30 * MIN);
    const order = state.carPositions.map((c) => c.number);
    expect(order).toEqual(['1', '3', '2']);
    expect(state.carPositions[0].overallPosition).toBe(1);
  });

  it('assigns class positions', () => {
    const state = engine.stateAt(30 * MIN);
    const car3 = state.carPositions.find((c) => c.number === '3')!;
    const car2 = state.carPositions.find((c) => c.number === '2')!;
    expect(car3.classPosition).toBe(1);
    expect(car2.classPosition).toBe(2);
  });

  it('computes lap counts consistent with crossing times', () => {
    const state = engine.stateAt(10 * MIN);
    const car1 = state.carPositions.find((c) => c.number === '1')!;
    expect(car1.lastLapCompleted).toBe(5); // 2-min laps
  });

  it('reports the active flag period', () => {
    expect(engine.flagAt(30 * MIN)).toBe(Flags.Green);
    expect(engine.flagAt(65 * MIN)).toBe(Flags.Yellow);
    expect(engine.stateAt(65 * MIN).currentFlag).toBe(Flags.Yellow);
  });

  it('tracks pit stops', () => {
    // Car 1 pits on lap 20; that lap crosses at 20*2min + 5min = 45min.
    const before = engine.stateAt(38 * MIN).carPositions.find((c) => c.number === '1')!;
    expect(before.pitStopCount).toBe(0);
    // At 44 min the in-progress lap (lap 20) is the pit lap.
    const during = engine.stateAt(44 * MIN).carPositions.find((c) => c.number === '1')!;
    expect(during.isInPit).toBe(true);
    const after = engine.stateAt(46 * MIN).carPositions.find((c) => c.number === '1')!;
    expect(after.pitStopCount).toBe(1);
    expect(after.lastLapPitted).toBe(20);
  });

  it('produces gap strings between cars', () => {
    const state = engine.stateAt(30 * MIN);
    const car3 = state.carPositions.find((c) => c.number === '3')!;
    // Car 3 at 30min: 13 laps (2.2min); car 1: 15 laps -> 2 laps down.
    expect(car3.overallDifference).toContain('lap');
  });

  it('lap history matches the state at the same time', () => {
    const t = 30 * MIN;
    const hist = engine.lapsUpTo('1', t);
    const state = engine.stateAt(t).carPositions.find((c) => c.number === '1')!;
    expect(hist.length).toBe(state.lastLapCompleted);
    expect(hist[hist.length - 1].totalMs).toBeLessThanOrEqual(t);
  });

  it('clocks run with the sim time', () => {
    const state = engine.stateAt(60 * MIN);
    expect(state.runningRaceTime).toBe('01:00:00');
    expect(state.timeToGo).toBe('01:00:00');
    expect(state.localTimeOfDay).toBe('10:00:00');
  });
});
