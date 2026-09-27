import type { LapRecord } from '../data/sessionStore';
import { cleanLaps } from './pace';

/**
 * Reclass risk heuristic. LDRL officials reclass arbitrarily, but in the five
 * bundled races cars were far more likely to move up when running near the
 * faster class's pace at the top of their own class, and down when near the
 * slower class's pace at the bottom of theirs. Scores and the per-hour rates
 * below come from tools/analysis/reclass-backtest.ts — see
 * docs/strategy-models.md. Treat as a hint, not a prediction.
 */

export type Risk = 'low' | 'med' | 'high';

export interface DirectionRisk {
  score: number;
  risk: Risk;
  /** Historical chance of this reclass within the next hour for cars in this risk band. */
  perHour: number;
  reasons: string[];
}

export interface ReclassRisk {
  car: string;
  cls: string;
  /** Toward the faster class (null if already fastest / no class above running). */
  up: DirectionRisk | null;
  down: DirectionRisk | null;
}

export interface CarPaceSnapshot {
  car: string;
  cls: string;
  paceMs: number;
  sdMs: number;
  trendMsPerLap: number;
}

const MIN_CLEAN_LAPS = 5;
const WINDOW = 10;
const EARLY_MS = 60 * 60_000;

/**
 * Per-hour reclass rates by band from `npm run backtest:reclass` (2026-09-26:
 * 5 races, ~9.5k car-samples). "early" = first race hour, when officials
 * re-sort the field after qualifying; early bands have few samples.
 */
export const CALIBRATION = {
  up: { early: { low: 0.039, med: 0.29, high: 0.3 }, later: { low: 0.008, med: 0.026, high: 0.14 } },
  down: { early: { low: 0.18, med: 0.81, high: 0.84 }, later: { low: 0.027, med: 0.093, high: 0.11 } },
} as const;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 4) return 0;
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, i) => {
    num += (i - mx) * (y - my);
    den += (i - mx) ** 2;
  });
  return den ? num / den : 0;
}

/** Rolling pace/consistency/trend over the last 10 clean laps; null with too few clean laps. */
export function paceSnapshot(car: string, cls: string, laps: LapRecord[]): CarPaceSnapshot | null {
  const clean = cleanLaps(laps).slice(-WINDOW).map((l) => l.lapMs);
  if (clean.length < MIN_CLEAN_LAPS) return null;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const sd = Math.sqrt(clean.reduce((a, b) => a + (b - mean) ** 2, 0) / clean.length);
  return { car, cls, paceMs: median(clean), sdMs: sd, trendMsPerLap: slope(clean) };
}

function band(score: number): Risk {
  return score >= 3 ? 'high' : score >= 2 ? 'med' : 'low';
}

const pctText = (x: number) => `${Math.abs(x * 100).toFixed(1)}%`;

/**
 * Score every car's chance of moving up or down a class.
 * `classOrder` maps class → rank string (lower = faster), as Red Mist sends it.
 */
export function reclassRisks(
  snapshots: CarPaceSnapshot[],
  classOrder: Record<string, string>,
  elapsedMs: number,
): Record<string, ReclassRisk> {
  const rank = (cls: string) => {
    const n = parseInt(classOrder[cls] ?? '', 10);
    return Number.isNaN(n) ? null : n;
  };
  const byClass = new Map<string, number[]>();
  for (const s of snapshots) {
    const arr = byClass.get(s.cls);
    if (arr) arr.push(s.paceMs);
    else byClass.set(s.cls, [s.paceMs]);
  }
  const classAt = (r: number) => [...byClass.keys()].find((c) => rank(c) === r) ?? null;
  const phase = elapsedMs < EARLY_MS ? 'early' : 'later';

  const out: Record<string, ReclassRisk> = {};
  for (const s of snapshots) {
    const r = rank(s.cls);
    const mates = byClass.get(s.cls) ?? [];
    const pct = mates.length > 1 ? mates.filter((p) => p < s.paceMs).length / (mates.length - 1) : 0.5;
    const faster = r !== null ? classAt(r - 1) : null;
    const slower = r !== null ? classAt(r + 1) : null;

    let up: DirectionRisk | null = null;
    if (faster) {
      const vs = s.paceMs / median(byClass.get(faster)!) - 1;
      let score = 0;
      const reasons: string[] = [];
      if (vs <= 0.01) {
        score += 2;
        reasons.push(
          vs <= 0
            ? `${pctText(vs)} faster than ${faster}'s median pace`
            : `within ${pctText(vs)} of ${faster}'s median pace`,
        );
      } else if (vs <= 0.02) {
        score += 1;
        reasons.push(`${pctText(vs)} off ${faster}'s median pace`);
      }
      if (pct < 0.1) {
        score += 1;
        reasons.push(`top of ${s.cls} on pace`);
      }
      if (s.sdMs < 1500) {
        score += 0.5;
        reasons.push(`very consistent (±${(s.sdMs / 1000).toFixed(1)}s)`);
      }
      if (s.trendMsPerLap < -100) {
        score += 0.5;
        reasons.push(`getting faster (${(s.trendMsPerLap / 1000).toFixed(2)}s/lap)`);
      }
      const risk = band(score);
      up = { score, risk, perHour: CALIBRATION.up[phase][risk], reasons };
    }

    let down: DirectionRisk | null = null;
    if (slower) {
      const vs = s.paceMs / median(byClass.get(slower)!) - 1;
      let score = 0;
      const reasons: string[] = [];
      if (vs >= 0) {
        score += 2;
        reasons.push(`slower than ${slower}'s median pace`);
      } else if (vs >= -0.02) {
        score += 1.5;
        reasons.push(`within ${pctText(vs)} of ${slower}'s median pace`);
      }
      if (pct >= 0.9) {
        score += 1;
        reasons.push(`bottom of ${s.cls} on pace`);
      } else if (pct >= 0.75) {
        score += 0.5;
        reasons.push(`lower quarter of ${s.cls} on pace`);
      }
      const risk = band(score);
      down = { score, risk, perHour: CALIBRATION.down[phase][risk], reasons };
    }

    out[s.car] = { car: s.car, cls: s.cls, up, down };
  }
  return out;
}

/** The more likely direction, if either is at least `min` risk. */
export function headlineRisk(r: ReclassRisk | undefined, min: Risk = 'high'): { dir: 'up' | 'down'; d: DirectionRisk } | null {
  if (!r) return null;
  const order: Record<Risk, number> = { low: 0, med: 1, high: 2 };
  const cands = [
    r.up ? { dir: 'up' as const, d: r.up } : null,
    r.down ? { dir: 'down' as const, d: r.down } : null,
  ].filter((x): x is { dir: 'up' | 'down'; d: DirectionRisk } => x !== null && order[x.d.risk] >= order[min]);
  cands.sort((a, b) => b.d.perHour - a.d.perHour);
  return cands[0] ?? null;
}
