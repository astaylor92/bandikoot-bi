/**
 * Race schedule in wall-clock time. LDRL doesn't publish a countdown in its
 * timing, and some days are split (e.g. 9–11 then 12–5 with a break), so the
 * crew sets the green-to-checkered windows and everything times off the
 * phone's clock rather than the feed's race clock.
 */

export interface RaceSegment {
  /** Epoch ms (wall clock). */
  startMs: number;
  endMs: number;
}

export type SchedulePhase = 'before' | 'racing' | 'break' | 'finished';

export interface ScheduleStatus {
  phase: SchedulePhase;
  /** Segment we're in (racing) or about to start (before/break). */
  segmentIndex: number | null;
  /** Wall time of the next checkered flag (end of the current or next segment). */
  flagAtMs: number | null;
  /** Until that checkered flag, counting from now (or from the next green when not racing). */
  toFlagMs: number | null;
  /** Wall time the next segment goes green (before/break only). */
  nextGreenAtMs: number | null;
  /** Racing time left across all remaining segments. */
  racingLeftMs: number;
  /** More segments after the current one. */
  isLastSegment: boolean;
}

export function sortSegments(segments: RaceSegment[]): RaceSegment[] {
  return [...segments].filter((s) => s.endMs > s.startMs).sort((a, b) => a.startMs - b.startMs);
}

export function scheduleStatus(nowMs: number, segments: RaceSegment[]): ScheduleStatus {
  const segs = sortSegments(segments);
  const racingLeftMs = segs.reduce((sum, s) => sum + Math.max(0, s.endMs - Math.max(nowMs, s.startMs)), 0);
  const current = segs.findIndex((s) => nowMs >= s.startMs && nowMs < s.endMs);
  if (current >= 0) {
    const s = segs[current];
    return {
      phase: 'racing',
      segmentIndex: current,
      flagAtMs: s.endMs,
      toFlagMs: s.endMs - nowMs,
      nextGreenAtMs: null,
      racingLeftMs,
      isLastSegment: current === segs.length - 1,
    };
  }
  const next = segs.findIndex((s) => s.startMs > nowMs);
  if (next >= 0) {
    const s = segs[next];
    return {
      phase: next === 0 ? 'before' : 'break',
      segmentIndex: next,
      flagAtMs: s.endMs,
      toFlagMs: s.endMs - s.startMs,
      nextGreenAtMs: s.startMs,
      racingLeftMs,
      isLastSegment: next === segs.length - 1,
    };
  }
  return {
    phase: 'finished',
    segmentIndex: null,
    flagAtMs: null,
    toFlagMs: null,
    nextGreenAtMs: null,
    racingLeftMs: 0,
    isLastSegment: true,
  };
}

/** "09:00" on the day of `dayMs` (local time) → epoch ms. */
export function atLocalTime(dayMs: number, hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date(dayMs);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d.getTime();
}

/** epoch ms → "HH:MM" local, for time inputs. */
export function toLocalHHMM(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "5:00 PM"-style label. */
export function clockLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export interface PublishedEntry {
  /** Red Mist dayOfEvent, e.g. "2026-09-27T00:00:00" (track-local). */
  day: string;
  /** Track-local times; only the time of day is used ("0001-01-01T09:00:00"). */
  start: string;
  end: string;
  name: string;
}

function timeOfDay(value: string): [number, number] | null {
  const m = /T(\d{2}):(\d{2})/.exec(value);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
}

function trackEpoch(day: string, hm: [number, number], tzHours: number): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!d) return null;
  return Date.UTC(+d[1], +d[2] - 1, +d[3], hm[0], hm[1]) - tzHours * 3_600_000;
}

/**
 * Race segments from Red Mist's published event schedule, so every device
 * agrees without setup. Picks today's race entry (not qualifying); a name like
 * "Sun 2+5Hr" in a 9:00–17:00 window becomes 9:00–11:00 and 12:00–17:00 — the
 * first part from the green, the last part to the checkered, the gap a break.
 */
export function segmentsFromPublished(
  entries: PublishedEntry[],
  tzHours: number,
  nowMs: number,
): RaceSegment[] | null {
  const trackToday = new Date(nowMs + tzHours * 3_600_000).toISOString().slice(0, 10);
  const races = entries.filter((e) => e.day.startsWith(trackToday) && !/qual|practice/i.test(e.name));
  for (const e of races) {
    const s = timeOfDay(e.start);
    const en = timeOfDay(e.end);
    if (!s || !en) continue;
    const startMs = trackEpoch(e.day, s, tzHours);
    const endMs = trackEpoch(e.day, en, tzHours);
    if (startMs === null || endMs === null || endMs <= startMs) continue;

    const parts = /((?:\d+(?:\.\d+)?\s*\+\s*)+\d+(?:\.\d+)?)\s*h/i.exec(e.name)?.[1].split('+').map(parseFloat);
    if (!parts || parts.length < 2) return [{ startMs, endMs }];
    const hours = parts.map((h) => h * 3_600_000);
    const racing = hours.reduce((a, b) => a + b, 0);
    const window = endMs - startMs;
    if (racing > window) return [{ startMs, endMs }];
    // Split the spare time evenly into the breaks between parts.
    const gap = (window - racing) / (hours.length - 1);
    const out: RaceSegment[] = [];
    let t = startMs;
    for (const h of hours) {
      out.push({ startMs: t, endMs: t + h });
      t += h + gap;
    }
    return out;
  }
  return null;
}
