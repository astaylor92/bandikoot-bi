import type { ProjectedCar } from './projection';

export type Feasibility = 'on-target' | 'push' | 'stretch' | 'unrealistic';

export interface TargetAssessment {
  targetClassPos: number;
  /** The car currently projected to hold the target position (excluding us). */
  rival: ProjectedCar | null;
  /** Average pace we must run for the rest of the race, ms/lap. Null when no pace data. */
  requiredPaceMs: number | null;
  currentPaceMs: number | null;
  bestPaceMs: number | null;
  /** requiredPaceMs - currentPaceMs; negative = must go faster by this much per lap. */
  deltaMs: number | null;
  feasibility: Feasibility;
  note: string;
}

export interface TargetInput {
  ourCar: string;
  ourClass: string;
  targetClassPos: number;
  projections: ProjectedCar[];
  /** Elapsed race time at our last crossing, ms. */
  ourLastCrossMs: number | null;
  ourLapsCompleted: number;
  raceEndMs: number;
  currentPaceMs: number | null;
  bestPaceMs: number | null;
  /** Time we still plan to lose in the pits, ms. */
  plannedPitLossMs?: number;
}

/**
 * Invert the projection: what average pace do we need for the rest of the
 * race to finish at (or ahead of) the target in-class position?
 */
export function assessTarget(input: TargetInput): TargetAssessment {
  const {
    ourCar,
    ourClass,
    targetClassPos,
    projections,
    ourLastCrossMs,
    ourLapsCompleted,
    raceEndMs,
    currentPaceMs,
    bestPaceMs,
    plannedPitLossMs = 0,
  } = input;

  const classCars = projections.filter((p) => p.cls === ourClass && p.number !== ourCar);
  // The car we must beat: the one projected at the target position once we're
  // excluded (i.e. the targetClassPos'th other car in class).
  const rival = classCars[targetClassPos - 1] ?? null;

  const base: Omit<TargetAssessment, 'feasibility' | 'note'> = {
    targetClassPos,
    rival,
    requiredPaceMs: null,
    currentPaceMs,
    bestPaceMs,
    deltaMs: null,
  };

  if (!rival) {
    return {
      ...base,
      feasibility: 'on-target',
      note: `Fewer than ${targetClassPos} rivals in class — position is yours if you finish.`,
    };
  }
  if (ourLastCrossMs === null || currentPaceMs === null) {
    return { ...base, feasibility: 'stretch', note: 'Not enough lap data yet.' };
  }

  const remainingMs = Math.max(0, raceEndMs - ourLastCrossMs - plannedPitLossMs);
  const lapsNeeded = rival.projLaps - ourLapsCompleted;

  if (lapsNeeded <= 0) {
    return {
      ...base,
      requiredPaceMs: currentPaceMs,
      deltaMs: 0,
      feasibility: 'on-target',
      note: 'Already ahead of the projected target — hold pace.',
    };
  }
  if (remainingMs <= 0) {
    return { ...base, feasibility: 'unrealistic', note: 'No race time left.' };
  }

  const requiredPaceMs = remainingMs / lapsNeeded;
  const deltaMs = requiredPaceMs - currentPaceMs;

  let feasibility: Feasibility;
  let note: string;
  if (requiredPaceMs >= currentPaceMs) {
    feasibility = 'on-target';
    note = 'Current pace is enough if everyone holds station.';
  } else if (bestPaceMs !== null && requiredPaceMs >= bestPaceMs) {
    const pct = ((currentPaceMs - requiredPaceMs) / currentPaceMs) * 100;
    feasibility = pct <= 1.5 ? 'push' : 'stretch';
    note = `Need ${(Math.abs(deltaMs) / 1000).toFixed(1)}s/lap more than current pace (${pct.toFixed(1)}%).`;
  } else {
    feasibility = 'unrealistic';
    note = 'Required pace is quicker than your best lap — needs rival trouble or fewer stops.';
  }

  return { ...base, requiredPaceMs, deltaMs, feasibility, note };
}
