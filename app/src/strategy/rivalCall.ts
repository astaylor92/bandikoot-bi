import type { LapRecord } from '../data/sessionStore';
import type { NextPit } from './nextPit';
import type { ProjectedCar } from './projection';
import { typicalStopMs, type Stop } from './stints';

export interface GapPoint {
  lap: number;
  /** Our crossing time for that lap (x axis). */
  atMs: number;
  /** Positive = we crossed first (we're ahead on the road for that lap). */
  gapMs: number;
}

/**
 * Head-to-head gap at every lap both cars have completed: the difference in
 * when each crossed the line on the same lap number. Works across lap-downs
 * because it compares equal lap counts.
 */
export function gapSeries(mine: LapRecord[], rival: LapRecord[]): GapPoint[] {
  const theirs = new Map(rival.filter((l) => l.totalMs !== null).map((l) => [l.lap, l.totalMs!]));
  const out: GapPoint[] = [];
  for (const l of mine) {
    const t = theirs.get(l.lap);
    if (l.totalMs === null || t === undefined) continue;
    out.push({ lap: l.lap, atMs: l.totalMs, gapMs: t - l.totalMs });
  }
  return out;
}

export interface CurrentGap {
  /** Our laps minus theirs. */
  lapsDiff: number;
  /** Gap at the latest lap both completed (positive = we're ahead). */
  gapMs: number | null;
  /**
   * Within a lap on the road: the leader may have crossed the line once more,
   * so lap counts differ by one but the time gap is the meaningful number.
   */
  onSameLap: boolean;
}

export function currentGap(mine: LapRecord[], rival: LapRecord[]): CurrentGap {
  const series = gapSeries(mine, rival);
  const lastMine = mine[mine.length - 1]?.lap ?? 0;
  const lastRival = rival[rival.length - 1]?.lap ?? 0;
  const lapsDiff = lastMine - lastRival;
  const gapMs = series[series.length - 1]?.gapMs ?? null;
  const pace = mine[mine.length - 1]?.lapMs ?? null;
  const onSameLap = gapMs !== null && (lapsDiff === 0 || (Math.abs(lapsDiff) === 1 && pace !== null && Math.abs(gapMs) < pace));
  return { lapsDiff, gapMs, onSameLap };
}

/** "+1:32", "−45s" or "+2 laps" for display. */
export function describeGap(g: CurrentGap, fmtTime: (ms: number) => string): string {
  if (g.onSameLap && g.gapMs !== null) return fmtTime(g.gapMs);
  if (g.lapsDiff !== 0) return `${g.lapsDiff > 0 ? '+' : '−'}${Math.abs(g.lapsDiff)} lap${Math.abs(g.lapsDiff) === 1 ? '' : 's'}`;
  return g.gapMs !== null ? fmtTime(g.gapMs) : '–';
}

/** Projected margin at the flag, positive = we finish ahead (ms of the trailing car's pace). */
export function projectedFinishGapMs(mine: ProjectedCar | undefined, rival: ProjectedCar | undefined): number | null {
  if (!mine || !rival) return null;
  const pace = mine.projLaps >= rival.projLaps ? rival.paceMs : mine.paceMs;
  if (!pace) return null;
  return (mine.projLaps - rival.projLaps) * pace;
}

export type RivalCallKind = 'rival-pitting' | 'rival-window' | 'none';

export interface RivalCall {
  kind: RivalCallKind;
  message: string;
  /** Estimated gap once both cars have made their next stop (positive = we're ahead). */
  cycledGapMs: number | null;
  /** Change vs the current gap. */
  deltaMs: number | null;
}

export interface RivalCallInput {
  nowMs: number;
  gapMs: number | null;
  myNext: NextPit | null;
  rivalNext: NextPit | null;
  myStops: Stop[];
  rivalStops: Stop[];
  myPaceMs: number | null;
  rivalPaceMs: number | null;
  minPitMs: number;
  rival: string;
}


const WINDOW_MS = 10 * 60_000;

function fmt(ms: number): string {
  const s = Math.abs(ms) / 1000;
  return s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s.toFixed(0)}s`;
}

/**
 * Undercut/overcut read when the rival pits (or is about to). With LDRL's long
 * stationary stops, the cycle is mostly stop-length difference plus whatever
 * pace delta accrues while one car is still out:
 *   cycled gap ≈ gap now + their stop − our stop + laps until our stop × (their pace − our pace)
 */
export function rivalCall(input: RivalCallInput): RivalCall {
  const { nowMs, gapMs, myNext, rivalNext, rival } = input;
  const theirStop = typicalStopMs(input.rivalStops, input.minPitMs);
  const ourStop = typicalStopMs(input.myStops, input.minPitMs);

  const cycle = (): { cycled: number | null; lapsOut: number } => {
    if (gapMs === null) return { cycled: null, lapsOut: 0 };
    const lapsOut = myNext?.inLaps ?? 0;
    const paceDelta = input.myPaceMs && input.rivalPaceMs ? input.rivalPaceMs - input.myPaceMs : 0;
    const ourStopCost = myNext?.finishes ? 0 : ourStop;
    return { cycled: gapMs + theirStop - ourStopCost + lapsOut * paceDelta, lapsOut };
  };

  if (rivalNext?.inPit) {
    const { cycled, lapsOut } = cycle();
    const delta = cycled !== null && gapMs !== null ? cycled - gapMs : null;
    const verdict =
      cycled === null
        ? ''
        : ` If we stay out ${lapsOut} lap${lapsOut === 1 ? '' : 's'} to our window, after both stop we're ≈${fmt(cycled)} ${cycled >= 0 ? 'ahead' : 'behind'}` +
          (delta !== null ? ` (${delta >= 0 ? 'gain' : 'lose'} ${fmt(delta)}).` : '.');
    return { kind: 'rival-pitting', message: `#${rival} is pitting.${verdict}`, cycledGapMs: cycled, deltaMs: delta };
  }

  const theirAt = rivalNext && !rivalNext.finishes && !rivalNext.parked ? rivalNext.atMs : null;
  if (theirAt !== null && theirAt - nowMs <= WINDOW_MS) {
    const ours = myNext?.atMs ?? null;
    const clash = ours !== null && Math.abs(ours - theirAt) <= WINDOW_MS;
    return {
      kind: 'rival-window',
      message:
        `#${rival} is due to pit within ${fmt(Math.max(0, theirAt - nowMs))} (${rivalNext!.reason === 'fuel' ? 'fuel' : 'driver limit'}).` +
        (clash ? ' Our window overlaps: watch them and decide whether to follow or cover.' : ''),
      cycledGapMs: null,
      deltaMs: null,
    };
  }
  return { kind: 'none', message: '', cycledGapMs: null, deltaMs: null };
}
