import { formatLapTime } from '../../data/time';
import type { LapRecord } from '../../data/sessionStore';
import { sparkSeries } from '../../strategy/spark';

/** Slopes smaller than this (ms/lap) read as flat. */
const FLAT_MS = 150;

export function trendColor(slope: number | null): string {
  if (slope === null || Math.abs(slope) < FLAT_MS) return 'var(--color-pit-dim)';
  return slope < 0 ? 'var(--color-flag-green)' : 'var(--color-accent)';
}

/**
 * Lap-time sparkline for the last `count` laps. Faster laps plot higher, so a
 * line rising to the right means the car is speeding up. Pit/yellow laps are
 * muted ticks along the bottom rather than stretching the scale.
 */
export function Sparkline({
  laps,
  count,
  width = 96,
  height = 24,
  color,
  showRange = false,
}: {
  laps: LapRecord[];
  count: number;
  width?: number;
  height?: number;
  color?: string;
  showRange?: boolean;
}) {
  const s = sparkSeries(laps, count);
  const stroke = color ?? trendColor(s.slopeMsPerLap);
  const pad = 3;
  if (s.minMs === null || s.maxMs === null || s.points.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const span = Math.max(s.maxMs - s.minMs, 500);
  const x = (i: number) => pad + (i * (width - 2 * pad)) / Math.max(1, count - 1);
  // Fastest lap at the top.
  const y = (ms: number) => pad + ((Math.min(ms, s.minMs! + span) - s.minMs!) / span) * (height - 2 * pad);

  const offset = count - s.points.length;
  const segments: string[] = [];
  let run: string[] = [];
  s.points.forEach((p, i) => {
    if (p.clean) run.push(`${x(i + offset).toFixed(1)},${y(p.lapMs).toFixed(1)}`);
    else if (run.length) {
      segments.push(run.join(' '));
      run = [];
    }
  });
  if (run.length) segments.push(run.join(' '));
  const last = [...s.points].reverse().find((p) => p.clean);
  const lastIdx = last ? s.points.lastIndexOf(last) : -1;

  const title = s.points.map((p) => `L${p.lap} ${formatLapTime(p.lapMs)}${p.clean ? '' : ' (pit/flag)'}`).join('\n');

  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent lap times">
        <title>{title}</title>
        {segments.map((pts, i) =>
          pts.includes(' ') ? (
            <polyline key={i} points={pts} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          ) : (
            <circle key={i} cx={pts.split(',')[0]} cy={pts.split(',')[1]} r={1.5} fill={stroke} />
          ),
        )}
        {s.points.map((p, i) =>
          p.clean ? null : (
            <line key={`u${i}`} x1={x(i + offset)} x2={x(i + offset)} y1={height - pad - 3} y2={height - pad + 1} stroke="var(--color-pit-dim)" strokeWidth={1.5} opacity={0.6} />
          ),
        )}
        {last && <circle cx={x(lastIdx + offset)} cy={y(last.lapMs)} r={2.5} fill={stroke} />}
      </svg>
      {showRange && (
        <span className="tnum text-xs leading-tight text-pit-dim">
          {formatLapTime(s.minMs)}
          <br />
          {formatLapTime(s.maxMs)}
        </span>
      )}
    </span>
  );
}
