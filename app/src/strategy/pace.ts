import { Flags } from '../api/redmist/flags';
import type { LapRecord } from '../data/sessionStore';

export interface PaceOptions {
  /** Number of recent clean laps used for the rolling figure. */
  window?: number;
  /** Laps slower than median * outlierFactor are excluded as traffic/offs. */
  outlierFactor?: number;
}

const DEFAULTS: Required<PaceOptions> = { window: 10, outlierFactor: 1.35 };

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Green-flag, non-pit laps with traffic/off-track outliers (and impossible timing-glitch laps) removed. */
export function cleanLaps(laps: LapRecord[], opts: PaceOptions = {}): LapRecord[] {
  const { outlierFactor } = { ...DEFAULTS, ...opts };
  const green = laps.filter((l) => l.flag === Flags.Green && !l.pit && l.lapMs > 0);
  const med = median(green.map((l) => l.lapMs));
  if (med === null) return [];
  return green.filter((l) => l.lapMs <= med * outlierFactor && l.lapMs >= med * 0.7);
}

export interface PaceSummary {
  /** Median of the last `window` clean laps, ms. */
  rollingMs: number | null;
  /** Best clean lap of the session, ms. */
  bestMs: number | null;
  /** Linear trend over the last `window` clean laps, ms per lap (positive = getting slower). */
  trendMsPerLap: number | null;
  cleanLapCount: number;
}

export function paceSummary(laps: LapRecord[], opts: PaceOptions = {}): PaceSummary {
  const { window } = { ...DEFAULTS, ...opts };
  const clean = cleanLaps(laps, opts);
  const recent = clean.slice(-window);

  const rollingMs = median(recent.map((l) => l.lapMs));
  const bestMs = clean.length ? Math.min(...clean.map((l) => l.lapMs)) : null;

  let trendMsPerLap: number | null = null;
  if (recent.length >= 4) {
    // Least-squares slope of lapMs against lap index.
    const n = recent.length;
    const meanX = (n - 1) / 2;
    const meanY = recent.reduce((s, l) => s + l.lapMs, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - meanX) * (recent[i].lapMs - meanY);
      den += (i - meanX) ** 2;
    }
    trendMsPerLap = den === 0 ? null : num / den;
  }

  return { rollingMs, bestMs, trendMsPerLap, cleanLapCount: clean.length };
}
