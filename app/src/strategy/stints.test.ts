import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';
import { ReplayEngine } from '../replay/replayEngine';
import type { LapReplayFixture } from '../replay/fixture';
import { classHistory, findStops, summarizeStints } from './stints';

const MIN = 60_000;
const PACE = 2 * MIN;

/** Build a lap log from per-lap extra seconds; pit laps marked with `p`. */
function log(spec: (number | { extra: number; pit?: boolean; flag?: Flags; cls?: string })[]): LapRecord[] {
  let t = 0;
  return spec.map((s, i) => {
    const o = typeof s === 'number' ? { extra: s } : s;
    const lapMs = PACE + o.extra;
    t += lapMs;
    return {
      lap: i + 1,
      lapMs,
      totalMs: t,
      flag: o.flag ?? Flags.Green,
      pit: o.pit ?? false,
      overallPosition: 1,
      classPosition: 1,
      cls: o.cls ?? 'A',
    };
  });
}

describe('findStops', () => {
  it('counts pit-flagged stops and infers unflagged ones from lap time', () => {
    const laps = log([0, 0, { extra: 5 * MIN, pit: true }, 0, 0, 5.5 * MIN, 0]);
    const { stops } = findStops(laps);
    expect(stops.map((s) => [s.lap, s.inferred])).toEqual([
      [3, false],
      [6, true],
    ]);
    expect(stops.every((s) => s.driverChange && s.refuel)).toBe(true);
  });

  it('ignores short pit-flagged laps (drive-through) and red-flag laps', () => {
    const laps = log([0, { extra: 40_000, pit: true }, 0, { extra: 20 * MIN, flag: Flags.Red }, 0]);
    expect(findStops(laps).stops).toEqual([]);
  });

  it('merges a stop spread over consecutive laps', () => {
    const laps = log([0, { extra: 3 * MIN, pit: true }, { extra: 2.5 * MIN, pit: true }, 0]);
    const { stops } = findStops(laps);
    expect(stops).toHaveLength(1);
    expect(stops[0].lap).toBe(3);
    expect(stops[0].durationMs).toBe(5.5 * MIN);
  });

  it('a stop below the driver-change threshold keeps the driver clock running', () => {
    const laps = log([0, { extra: 2.5 * MIN, pit: true }, 0]);
    const [stop] = findStops(laps).stops;
    expect(stop.driverChange).toBe(false);
    expect(stop.refuel).toBe(false);
  });

  it('manual overrides win', () => {
    const laps = log([0, { extra: 2.5 * MIN, pit: true }, 0, { extra: 6 * MIN, pit: true }, 0]);
    const { stops } = findStops(laps, undefined, { 2: true, 4: false });
    expect(stops.map((s) => s.driverChange)).toEqual([true, false]);
  });
});

describe('summarizeStints', () => {
  it('splits driver stints at driver changes and tracks the current driver/fuel clocks', () => {
    const laps = log([0, 0, { extra: 5 * MIN, pit: true }, 0, { extra: 2 * MIN, pit: true }, 0]);
    const s = summarizeStints(laps);
    expect(s.driverChanges).toBe(1);
    expect(s.stints).toHaveLength(2);
    expect(s.stints[0]).toMatchObject({ startLap: 1, endLap: 3, lapCount: 3 });
    expect(s.stints[1]).toMatchObject({ startLap: 4, endLap: null, lapCount: 3 });
    expect(s.driverStartMs).toBe(laps[2].totalMs);
    // The 2-min stop is a splash below the refuel threshold: fuel clock unchanged.
    expect(s.fuelStartMs).toBe(laps[2].totalMs);
  });

  it('opens a fresh stint right after a change', () => {
    const laps = log([0, { extra: 5 * MIN, pit: true }]);
    const s = summarizeStints(laps);
    expect(s.stints.map((x) => x.lapCount)).toEqual([2, 0]);
  });
});

describe('classHistory', () => {
  it('lists reclasses in order', () => {
    const laps = log([{ extra: 0, cls: 'A' }, { extra: 0, cls: 'B' }, { extra: 0, cls: 'B' }, { extra: 0, cls: 'A' }]);
    expect(classHistory(laps).map((c) => `${c.from}>${c.to}@${c.lap}`)).toEqual(['A>B@2', 'B>A@4']);
  });
});

describe('real race: LDRL 410 Sat 7 Hr fixture', () => {
  const fixture = JSON.parse(
    readFileSync(resolve(__dirname, '../../public/fixtures/410-15.json'), 'utf8'),
  ) as LapReplayFixture;
  const engine = new ReplayEngine(fixture);
  const end = fixture.durationMs;

  it('replays car 224 through C→A→C→B→A', () => {
    const seq = classHistory(engine.lapsUpTo('224', end)).map((c) => c.to);
    expect(['LDRL C', ...seq]).toEqual(['LDRL C', 'LDRL A', 'LDRL C', 'LDRL B', 'LDRL A']);
    expect(engine.stateAt(end).carPositions.find((c) => c.number === '224')?.class).toBe('LDRL A');
  });

  it('infers stops the pit loop missed (car 203 has no pit flags)', () => {
    const laps = engine.lapsUpTo('203', end);
    expect(laps.some((l) => l.pit)).toBe(false);
    const { stops } = findStops(laps);
    expect(stops.filter((s) => s.inferred).map((s) => s.lap)).toEqual(expect.arrayContaining([50, 100, 142]));
  });
});
