import type { LapRecord } from '../data/sessionStore';
import { cleanLaps } from './pace';

export interface SparkPoint {
  lap: number;
  lapMs: number;
  /** Clean laps are drawn on the line; pit/yellow/outlier laps as muted markers. */
  clean: boolean;
}

export interface SparkSeries {
  points: SparkPoint[];
  /** y-domain from the clean laps in the window (null if none). */
  minMs: number | null;
  maxMs: number | null;
  /** Least-squares slope over the window's clean laps, ms per lap. */
  slopeMsPerLap: number | null;
}

/** The last `count` laps, flagged clean/unclean, with a y-domain that ignores pit and yellow laps. */
export function sparkSeries(laps: LapRecord[], count: number): SparkSeries {
  const window = laps.slice(-count);
  const cleanSet = new Set(cleanLaps(laps).map((l) => l.lap));
  const points = window.map((l) => ({ lap: l.lap, lapMs: l.lapMs, clean: cleanSet.has(l.lap) }));
  const clean = points.filter((p) => p.clean);
  if (clean.length === 0) return { points, minMs: null, maxMs: null, slopeMsPerLap: null };

  let slope: number | null = null;
  if (clean.length >= 3) {
    const n = clean.length;
    const xs = clean.map((_, i) => i);
    const mx = (n - 1) / 2;
    const my = clean.reduce((a, p) => a + p.lapMs, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (clean[i].lapMs - my);
      den += (xs[i] - mx) ** 2;
    }
    slope = den > 0 ? num / den : 0;
  }
  return {
    points,
    minMs: Math.min(...clean.map((p) => p.lapMs)),
    maxMs: Math.max(...clean.map((p) => p.lapMs)),
    slopeMsPerLap: slope,
  };
}
