import { describe, expect, it } from 'vitest';
import type { Stop, StintSummary } from './stints';
import { fuelWindowMs, observedFuelStintMs, predictNextPit, remainingPitLossMs, type PitAssumptions } from './nextPit';

const MIN = 60_000;
const H = 60 * MIN;

const A: PitAssumptions = { maxStintMs: 2 * H, tankGal: 14, gph: 5, reserveMs: 5 * MIN };

function stop(endMs: number, durationMs = 5 * MIN, driverChange = true, refuel = true): Stop {
  const lap = Math.round(endMs / (2 * MIN));
  return { firstLap: lap, lap, endMs, durationMs, inferred: false, underRed: false, driverChange, refuel };
}

function summary(stops: Stop[]): StintSummary {
  const lastChange = [...stops].reverse().find((s) => s.driverChange);
  const lastFuel = [...stops].reverse().find((s) => s.refuel);
  return {
    stops,
    stints: [],
    driverChanges: stops.filter((s) => s.driverChange).length,
    driverStartMs: lastChange?.endMs ?? 0,
    fuelStartMs: lastFuel?.endMs ?? 0,
    refPaceMs: 2 * MIN,
  };
}

const base = { raceEndMs: 8 * H, paceMs: 2 * MIN, inPit: false };

describe('fuelWindowMs', () => {
  it('is tank / burn rate minus reserve', () => {
    expect(fuelWindowMs(A)).toBe(2.8 * H - 5 * MIN);
  });
});

describe('predictNextPit', () => {
  it('driver limit binds when the tank lasts longer', () => {
    const p = predictNextPit({ ...base, stints: summary([]), assumptions: A, nowMs: 30 * MIN, lastCrossMs: 30 * MIN });
    expect(p.reason).toBe('driver');
    expect(p.atMs).toBe(2 * H);
    expect(p.inLaps).toBe(45);
    // 8 h race: stop at 2 h, then 6 h left in 2 h cycles → 3 stops total.
    expect(p.remainingStops).toBe(3);
  });

  it('fuel binds with a thirsty car', () => {
    const p = predictNextPit({ ...base, stints: summary([]), assumptions: { ...A, gph: 8 }, nowMs: 0, lastCrossMs: 0 });
    expect(p.reason).toBe('fuel');
    expect(p.atMs).toBe(1.75 * H - 5 * MIN);
  });

  it('a splash (refuel, same driver) resets fuel but not the driver clock', () => {
    const s = summary([stop(90 * MIN, 4.5 * MIN, false, true)]);
    const p = predictNextPit({ ...base, stints: s, assumptions: { ...A, gph: 8 }, nowMs: 100 * MIN, lastCrossMs: 100 * MIN });
    expect(p.fuelOutMs).toBe(90 * MIN + 1.75 * H - 5 * MIN);
    expect(p.driverOutMs).toBe(2 * H);
    expect(p.reason).toBe('driver');
  });

  it('reports cars that make the flag and cars overdue', () => {
    const late = predictNextPit({ ...base, stints: summary([stop(7 * H)]), assumptions: A, nowMs: 7.5 * H, lastCrossMs: 7.5 * H });
    expect(late.finishes).toBe(true);
    expect(late.atMs).toBeNull();
    expect(late.remainingStops).toBe(0);

    const overdue = predictNextPit({ ...base, stints: summary([]), assumptions: A, nowMs: 2.2 * H, lastCrossMs: 2.2 * H });
    expect(overdue.overdue).toBe(true);
  });

  it('a car not seen for ages is parked, not overdue', () => {
    const p = predictNextPit({ ...base, stints: summary([]), assumptions: A, nowMs: 3 * H, lastCrossMs: 10 * MIN });
    expect(p.parked).toBe(true);
    expect(p.overdue).toBe(false);
  });

  it('a car in the pits is pitting now', () => {
    const p = predictNextPit({ ...base, inPit: true, stints: summary([]), assumptions: A, nowMs: H, lastCrossMs: H });
    expect(p.atMs).toBe(H);
    expect(p.overdue).toBe(false);
  });
});

describe('calibration + projection loss', () => {
  it('observed fuel stint is the median on-track time between refuels', () => {
    const s = summary([stop(105 * MIN), stop(215 * MIN), stop(330 * MIN)]);
    // on-track: 100, 105, 110 min
    expect(observedFuelStintMs(s)).toBe(105 * MIN);
  });

  it('a stop in progress costs only its remainder', () => {
    const s = summary([stop(2 * H, 6 * MIN)]);
    // in-lap started 5 min ago at a 2-min pace: ~4 min of the stop already done
    const p = predictNextPit({ ...base, inPit: true, stints: s, assumptions: A, nowMs: 3 * H, lastCrossMs: 3 * H - 5 * MIN });
    expect(p.currentStopElapsedMs).toBe(4 * MIN);
    expect(remainingPitLossMs(p, s, 5 * MIN)).toBe((p.remainingStops - 1) * 6 * MIN + 2 * MIN);
  });

  it('typical stop ignores red-flag/garage stops', () => {
    const s = summary([stop(2 * H, 6 * MIN), stop(3 * H, 40 * MIN)]);
    const p = predictNextPit({ ...base, stints: s, assumptions: A, nowMs: 3.5 * H, lastCrossMs: 3.5 * H });
    expect(remainingPitLossMs(p, s, 5 * MIN)).toBe(p.remainingStops * 6 * MIN);
  });

  it('remaining pit loss = remaining stops × typical stop', () => {
    const s = summary([stop(2 * H, 6 * MIN)]);
    const p = predictNextPit({ ...base, stints: s, assumptions: A, nowMs: 3 * H, lastCrossMs: 3 * H });
    expect(remainingPitLossMs(p, s, 5 * MIN)).toBe(p.remainingStops * 6 * MIN);
  });
});
