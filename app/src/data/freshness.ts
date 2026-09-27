import { Flags } from '../api/redmist/flags';

export type FreshnessLevel = 'ok' | 'warn' | 'stale' | 'neutral';

export interface Freshness {
  level: FreshnessLevel;
  /** Wall-clock seconds since any car was last seen crossing the line (null = none seen yet). */
  sinceCrossingSec: number | null;
}

/**
 * With a full LDRL field (~40 cars, ~2-min laps) someone crosses the line
 * every few seconds under green, so a long silence means the feed is stuck —
 * even if polls keep "succeeding" with cached data. Slow/no crossings are
 * normal under yellow (looser thresholds), red and checkered (no warning).
 */
export function freshness(nowMs: number, lastCrossingAt: number | null, flag: Flags): Freshness {
  const sinceCrossingSec = lastCrossingAt === null ? null : Math.max(0, Math.round((nowMs - lastCrossingAt) / 1000));
  const limits =
    flag === Flags.Green ? { warn: 30, stale: 90 } : flag === Flags.Yellow ? { warn: 60, stale: 180 } : null;
  if (!limits || sinceCrossingSec === null) return { level: 'neutral', sinceCrossingSec };
  const level = sinceCrossingSec >= limits.stale ? 'stale' : sinceCrossingSec >= limits.warn ? 'warn' : 'ok';
  return { level, sinceCrossingSec };
}
