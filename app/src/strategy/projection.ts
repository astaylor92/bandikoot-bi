export interface ProjectionCarInput {
  number: string;
  cls: string;
  lapsCompleted: number;
  /** Elapsed race time at the car's last lap crossing, ms. */
  lastCrossMs: number | null;
  /** Rolling pace, ms per lap; null when unknown (car projected as parked). */
  paceMs: number | null;
  inPit?: boolean;
}

export interface ProjectedCar {
  number: string;
  cls: string;
  /** Continuous projected total laps at the checkered flag. */
  projLaps: number;
  projOverallPos: number;
  projClassPos: number;
  paceMs: number | null;
  lapsCompleted: number;
}

export interface ProjectionOptions {
  /** Total race length in ms (elapsed + remaining). */
  raceEndMs: number;
  /**
   * Expected additional time loss per car in ms (planned pit stops etc.)
   * keyed by car number; applied by shrinking that car's remaining time.
   */
  extraLossMsByCar?: Record<string, number>;
}

/**
 * Project the finishing order assuming every car continues at its current
 * rolling pace. Cars without pace (parked / no clean laps) hold their lap
 * count. Pure and deliberately simple — the point is a live, glanceable
 * "where does this end up if nothing changes".
 */
export function projectStandings(
  cars: ProjectionCarInput[],
  opts: ProjectionOptions,
): ProjectedCar[] {
  const projected = cars.map((car) => {
    let projLaps = car.lapsCompleted;
    if (car.paceMs && car.paceMs > 0 && car.lastCrossMs !== null) {
      const extra = opts.extraLossMsByCar?.[car.number] ?? 0;
      const remaining = Math.max(0, opts.raceEndMs - car.lastCrossMs - extra);
      projLaps = car.lapsCompleted + remaining / car.paceMs;
    }
    return {
      number: car.number,
      cls: car.cls,
      projLaps,
      projOverallPos: 0,
      projClassPos: 0,
      paceMs: car.paceMs,
      lapsCompleted: car.lapsCompleted,
    };
  });

  projected.sort((a, b) => b.projLaps - a.projLaps);
  const classCounts = new Map<string, number>();
  projected.forEach((car, i) => {
    car.projOverallPos = i + 1;
    const c = (classCounts.get(car.cls) ?? 0) + 1;
    classCounts.set(car.cls, c);
    car.projClassPos = c;
  });
  return projected;
}

/** Gap in laps between two projected cars, converted to seconds at the chaser's pace. */
export function projectedMarginMs(ahead: ProjectedCar, behind: ProjectedCar): number | null {
  if (!behind.paceMs) return null;
  return (ahead.projLaps - behind.projLaps) * behind.paceMs;
}
