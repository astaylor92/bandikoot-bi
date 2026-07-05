import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';
import { cleanLaps, paceSummary } from './pace';

function lap(n: number, ms: number, flag = Flags.Green, pit = false): LapRecord {
  return { lap: n, lapMs: ms, totalMs: n * ms, flag, pit, overallPosition: 1, classPosition: 1 };
}

describe('cleanLaps', () => {
  it('drops yellow, pit and outlier laps', () => {
    const laps = [
      lap(1, 142_000),
      lap(2, 141_500),
      lap(3, 260_000, Flags.Green, true), // pit lap
      lap(4, 300_000, Flags.Yellow), // yellow
      lap(5, 240_000), // outlier (traffic/off)
      lap(6, 143_000),
    ];
    const clean = cleanLaps(laps);
    expect(clean.map((l) => l.lap)).toEqual([1, 2, 6]);
  });

  it('returns empty for no green laps', () => {
    expect(cleanLaps([lap(1, 150_000, Flags.Yellow)])).toEqual([]);
  });
});

describe('paceSummary', () => {
  it('computes rolling median and best', () => {
    const laps = [lap(1, 145_000), lap(2, 143_000), lap(3, 141_000), lap(4, 144_000), lap(5, 142_000)];
    const s = paceSummary(laps);
    expect(s.rollingMs).toBe(143_000);
    expect(s.bestMs).toBe(141_000);
    expect(s.cleanLapCount).toBe(5);
  });

  it('detects a slowing trend', () => {
    const laps = Array.from({ length: 10 }, (_, i) => lap(i + 1, 140_000 + i * 500));
    const s = paceSummary(laps);
    expect(s.trendMsPerLap).toBeGreaterThan(400);
    expect(s.trendMsPerLap).toBeLessThan(600);
  });

  it('handles empty input', () => {
    const s = paceSummary([]);
    expect(s.rollingMs).toBeNull();
    expect(s.bestMs).toBeNull();
    expect(s.trendMsPerLap).toBeNull();
  });
});
