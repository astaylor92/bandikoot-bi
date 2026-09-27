import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';
import { headlineRisk, paceSnapshot, reclassRisks, type CarPaceSnapshot } from './reclass';

const ORDER = { A: '1', B: '2', C: '3' };
const H = 3_600_000;

function snap(car: string, cls: string, paceMs: number, sdMs = 2000, trendMsPerLap = 0): CarPaceSnapshot {
  return { car, cls, paceMs, sdMs, trendMsPerLap };
}

// A ≈ 110s, B ≈ 115s, C ≈ 120s
const field = [
  snap('a1', 'A', 109_000), snap('a2', 'A', 110_000), snap('a3', 'A', 111_000),
  snap('b1', 'B', 114_000), snap('b2', 'B', 115_000), snap('b3', 'B', 116_000),
  snap('c1', 'C', 119_000), snap('c2', 'C', 120_000), snap('c3', 'C', 121_000),
];

describe('reclassRisks', () => {
  it('flags a B car running A pace, consistent and improving, as high up-risk', () => {
    const risks = reclassRisks([...field, snap('b9', 'B', 110_500, 900, -250)], ORDER, 3 * H);
    const up = risks.b9.up!;
    expect(up.risk).toBe('high');
    expect(up.reasons.join(' ')).toMatch(/A's median pace/);
    expect(up.perHour).toBeGreaterThan(0.1);
    expect(headlineRisk(risks.b9)?.dir).toBe('up');
  });

  it('flags a B car at C pace as high down-risk', () => {
    const risks = reclassRisks([...field, snap('b9', 'B', 120_500)], ORDER, 3 * H);
    expect(risks.b9.down!.risk).toBe('high');
    expect(headlineRisk(risks.b9)?.dir).toBe('down');
  });

  it('mid-pack cars are low risk; the fastest class has no up direction', () => {
    const risks = reclassRisks(field, ORDER, 3 * H);
    expect(risks.b2.up!.risk).toBe('low');
    expect(risks.b2.down!.risk).toBe('low');
    expect(risks.a1.up).toBeNull();
    expect(risks.c3.down).toBeNull();
    expect(headlineRisk(risks.b2)).toBeNull();
  });

  it('uses higher early-race rates for the same band', () => {
    const early = reclassRisks([...field, snap('b9', 'B', 120_500)], ORDER, 0.5 * H);
    const later = reclassRisks([...field, snap('b9', 'B', 120_500)], ORDER, 3 * H);
    expect(early.b9.down!.perHour).toBeGreaterThan(later.b9.down!.perHour);
  });
});

describe('paceSnapshot', () => {
  it('needs 5 clean laps', () => {
    const laps: LapRecord[] = [1, 2, 3, 4].map((n) => ({
      lap: n, lapMs: 110_000, totalMs: null, flag: Flags.Green, pit: false, overallPosition: 1, classPosition: 1, cls: 'A',
    }));
    expect(paceSnapshot('x', 'A', laps)).toBeNull();
    expect(paceSnapshot('x', 'A', [...laps, { ...laps[0], lap: 5 }])?.paceMs).toBe(110_000);
  });
});
