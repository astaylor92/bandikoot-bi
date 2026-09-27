import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';
import { sparkSeries } from './spark';

function lap(n: number, ms: number, extra: Partial<LapRecord> = {}): LapRecord {
  return { lap: n, lapMs: ms, totalMs: null, flag: Flags.Green, pit: false, overallPosition: 1, classPosition: 1, cls: null, ...extra };
}

describe('sparkSeries', () => {
  it('keeps the last N laps and scales only to clean ones', () => {
    const laps = [
      lap(1, 120_000),
      lap(2, 119_000),
      lap(3, 430_000, { pit: true }),
      lap(4, 118_000),
      lap(5, 150_000, { flag: Flags.Yellow }),
      lap(6, 117_000),
    ];
    const s = sparkSeries(laps, 5);
    expect(s.points.map((p) => p.lap)).toEqual([2, 3, 4, 5, 6]);
    expect(s.points.map((p) => p.clean)).toEqual([true, false, true, false, true]);
    expect([s.minMs, s.maxMs]).toEqual([117_000, 119_000]);
    expect(s.slopeMsPerLap).toBeLessThan(0);
  });

  it('drops timing-glitch laps from the clean set', () => {
    const laps = [lap(1, 120_000), lap(2, 18_000), lap(3, 121_000), lap(4, 119_000)];
    expect(sparkSeries(laps, 10).minMs).toBe(119_000);
  });

  it('handles no clean laps', () => {
    expect(sparkSeries([lap(1, 400_000, { pit: true })], 10)).toMatchObject({ minMs: null, slopeMsPerLap: null });
  });
});
