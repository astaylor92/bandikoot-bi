// Parsing/formatting for Red Mist duration strings ("HH:mm:ss.fff") and gaps
// ("12.345", "1 lap", "2 laps").

/** Parse a Red Mist duration string like "00:02:22.768", "02:22.768" or "22.768" to milliseconds. */
export function parseDurationMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value.trim().split(':');
  if (parts.length === 0 || parts.length > 3) return null;
  let ms = 0;
  let scale = 1000; // seconds
  for (let i = parts.length - 1; i >= 0; i--) {
    // Orbits has been seen to emit negative second components before race start
    // (e.g. "00:00:-05"); treat components as magnitudes.
    const n = Math.abs(parseFloat(parts[i]));
    if (Number.isNaN(n)) return null;
    ms += n * scale;
    scale *= 60;
  }
  return Math.round(ms);
}

export type Gap =
  | { kind: 'time'; ms: number }
  | { kind: 'laps'; laps: number };

/** Parse a gap/difference field which is either a duration or "N lap(s)". */
export function parseGap(value: string | null | undefined): Gap | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const lapMatch = /^(\d+)\s+laps?$/i.exec(trimmed);
  if (lapMatch) return { kind: 'laps', laps: parseInt(lapMatch[1], 10) };
  const ms = parseDurationMs(trimmed);
  return ms === null ? null : { kind: 'time', ms };
}

/** Format milliseconds as a lap time, e.g. 142768 -> "2:22.8". */
export function formatLapTime(ms: number | null | undefined, decimals = 1): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms <= 0) return '–';
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  const secStr = s.toFixed(decimals).padStart(decimals > 0 ? 3 + decimals : 2, '0');
  return `${m}:${secStr}`;
}

/** Format milliseconds as a clock duration, e.g. "8:02:51" or "42:05". */
export function formatClock(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '–';
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Format a gap for display: "+12.3", "+1:02.5" or "+2 laps". */
export function formatGap(gap: Gap | null): string {
  if (!gap) return '–';
  if (gap.kind === 'laps') return `+${gap.laps} lap${gap.laps === 1 ? '' : 's'}`;
  if (gap.ms >= 60_000) return `+${formatLapTime(gap.ms, 1)}`;
  return `+${(gap.ms / 1000).toFixed(1)}`;
}

/** Format ms as "HH:mm:ss" (Red Mist wire format for TimeToGo / RunningRaceTime). */
export function toWireClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** Format ms as "HH:mm:ss.fff" (Red Mist wire format for lap/total times). */
export function toWireDuration(ms: number): string {
  const base = toWireClock(ms);
  const frac = Math.round(ms % 1000);
  return `${base}.${String(frac).padStart(3, '0')}`;
}
