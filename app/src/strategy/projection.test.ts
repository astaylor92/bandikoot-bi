import { describe, expect, it } from 'vitest';
import { projectStandings } from './projection';
import { assessTarget } from './targetPosition';

const HOUR = 3_600_000;

describe('projectStandings', () => {
  it('faster car overtakes on projection', () => {
    // A leads B by 1 lap at half distance, but B is 3s/lap faster with 4h to go.
    const result = projectStandings(
      [
        { number: 'A', cls: 'X', lapsCompleted: 100, lastCrossMs: 4 * HOUR, paceMs: 144_000 },
        { number: 'B', cls: 'X', lapsCompleted: 99, lastCrossMs: 4 * HOUR, paceMs: 141_000 },
      ],
      { raceEndMs: 8 * HOUR },
    );
    expect(result[0].number).toBe('B');
    expect(result[0].projOverallPos).toBe(1);
    expect(result[1].number).toBe('A');
  });

  it('car without pace holds its lap count', () => {
    const result = projectStandings(
      [
        { number: 'A', cls: 'X', lapsCompleted: 50, lastCrossMs: 4 * HOUR, paceMs: 150_000 },
        { number: 'PARKED', cls: 'X', lapsCompleted: 80, lastCrossMs: 3 * HOUR, paceMs: null },
      ],
      { raceEndMs: 8 * HOUR },
    );
    // A adds ~96 laps in 4h; parked car stays at 80.
    expect(result[0].number).toBe('A');
    expect(result[1].projLaps).toBe(80);
  });

  it('assigns class positions independently', () => {
    const result = projectStandings(
      [
        { number: '1', cls: 'A', lapsCompleted: 100, lastCrossMs: 0, paceMs: null },
        { number: '2', cls: 'B', lapsCompleted: 90, lastCrossMs: 0, paceMs: null },
        { number: '3', cls: 'B', lapsCompleted: 95, lastCrossMs: 0, paceMs: null },
      ],
      { raceEndMs: 0 },
    );
    const three = result.find((r) => r.number === '3')!;
    const two = result.find((r) => r.number === '2')!;
    expect(three.projClassPos).toBe(1);
    expect(two.projClassPos).toBe(2);
  });

  it('accounts for planned pit loss', () => {
    const result = projectStandings(
      [
        { number: 'A', cls: 'X', lapsCompleted: 100, lastCrossMs: 4 * HOUR, paceMs: 144_000 },
        { number: 'B', cls: 'X', lapsCompleted: 100, lastCrossMs: 4 * HOUR, paceMs: 144_000 },
      ],
      { raceEndMs: 8 * HOUR, extraLossMsByCar: { B: 10 * 60_000 } },
    );
    expect(result[0].number).toBe('A');
    // B loses 10 min at 144s/lap ≈ 4.2 laps
    expect(result[0].projLaps - result[1].projLaps).toBeGreaterThan(4);
  });
});

describe('assessTarget', () => {
  const projections = projectStandings(
    [
      { number: '17', cls: 'B', lapsCompleted: 102, lastCrossMs: 4 * HOUR, paceMs: 142_000 },
      { number: '440', cls: 'B', lapsCompleted: 100, lastCrossMs: 4 * HOUR, paceMs: 144_000 },
      { number: '325', cls: 'B', lapsCompleted: 96, lastCrossMs: 4 * HOUR, paceMs: 145_000 },
      { number: '55', cls: 'A', lapsCompleted: 105, lastCrossMs: 4 * HOUR, paceMs: 140_000 },
    ],
    { raceEndMs: 8 * HOUR },
  );

  it('reports on-target when already ahead of the rival', () => {
    const a = assessTarget({
      ourCar: '440',
      ourClass: 'B',
      targetClassPos: 2,
      projections,
      ourLastCrossMs: 4 * HOUR,
      ourLapsCompleted: 100,
      raceEndMs: 8 * HOUR,
      currentPaceMs: 144_000,
      bestPaceMs: 140_000,
    });
    // Rival for P2 (excluding us) is #325, projected well behind us.
    expect(a.rival?.number).toBe('325');
    expect(a.feasibility).toBe('on-target');
  });

  it('requires faster pace to catch the class leader', () => {
    const a = assessTarget({
      ourCar: '440',
      ourClass: 'B',
      targetClassPos: 1,
      projections,
      ourLastCrossMs: 4 * HOUR,
      ourLapsCompleted: 100,
      raceEndMs: 8 * HOUR,
      currentPaceMs: 144_000,
      bestPaceMs: 140_000,
    });
    expect(a.rival?.number).toBe('17');
    expect(a.requiredPaceMs).not.toBeNull();
    expect(a.requiredPaceMs!).toBeLessThan(144_000);
    expect(['push', 'stretch', 'unrealistic']).toContain(a.feasibility);
  });
});

describe('projection from now', () => {
  it('does not credit a car stopped since its last crossing', () => {
    const base = { cls: 'B', lapsCompleted: 60, paceMs: 120_000 };
    const [moving, stopped] = ['moving', 'stopped'];
    const out = projectStandings(
      [
        { ...base, number: moving, lastCrossMs: 7_190_000 },
        { ...base, number: stopped, lastCrossMs: 6_300_000, inPit: true }, // in the pits for 15 min
      ],
      { raceEndMs: 10_800_000, nowMs: 7_200_000 },
    );
    const m = out.find((c) => c.number === moving)!;
    const s = out.find((c) => c.number === stopped)!;
    // the car in the pits is credited from now, not from its crossing 15 min ago
    expect(s.projLaps).toBeCloseTo(60 + (10_800_000 - 7_200_000) / 120_000, 5);
    expect(m.projLaps).toBeGreaterThan(s.projLaps);
  });
});
