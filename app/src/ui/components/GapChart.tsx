import { formatClock } from '../../data/time';
import type { GapPoint } from '../../strategy/rivalCall';

function fmtGap(ms: number): string {
  const s = Math.abs(ms) / 1000;
  const txt = s >= 60 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : `${s.toFixed(0)}s`;
  return `${ms >= 0 ? '+' : '−'}${txt}`;
}

/**
 * Gap to the rival over race time. Above the zero line = we're ahead. Pit
 * stops show as ticks (ours on top, theirs on the bottom); the dashed tail is
 * the projected gap at the flag.
 */
export function GapChart({
  series,
  myStopsMs,
  rivalStopsMs,
  raceEndMs,
  projectedFinishGapMs,
  rival,
}: {
  series: GapPoint[];
  myStopsMs: number[];
  rivalStopsMs: number[];
  raceEndMs: number | null;
  projectedFinishGapMs: number | null;
  rival: string;
}) {
  const W = 640;
  const H = 220;
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 22;
  if (series.length < 2) {
    return <div className="py-8 text-center text-sm text-pit-dim">Gap chart appears after a couple of shared laps.</div>;
  }
  const endX = raceEndMs ?? series[series.length - 1].atMs;
  const ys = series.map((p) => p.gapMs);
  if (projectedFinishGapMs !== null) ys.push(projectedFinishGapMs);
  const maxAbs = Math.max(30_000, ...ys.map(Math.abs)) * 1.1;
  const x = (ms: number) => padL + (ms / endX) * (W - padL - padR);
  const y = (ms: number) => padT + ((maxAbs - ms) / (2 * maxAbs)) * (H - padT - padB);
  const path = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.atMs).toFixed(1)} ${y(p.gapMs).toFixed(1)}`).join('');
  const last = series[series.length - 1];
  const ticks = [maxAbs / 1.1, maxAbs / 2.2, 0, -maxAbs / 2.2, -maxAbs / 1.1];
  const hours = Array.from({ length: Math.floor(endX / 3_600_000) + 1 }, (_, h) => h * 3_600_000);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Gap to #${rival} over the race`}>
      <rect x={padL} y={padT} width={W - padL - padR} height={y(0) - padT} fill="var(--color-mycar)" opacity={0.06} />
      <rect x={padL} y={y(0)} width={W - padL - padR} height={H - padB - y(0)} fill="var(--color-accent)" opacity={0.06} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--color-pit-line)" strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--color-pit-dim)">
            {t === 0 ? '0' : fmtGap(t)}
          </text>
        </g>
      ))}
      {hours.map((h) => (
        <text key={h} x={x(h)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-pit-dim)">
          {h / 3_600_000}h
        </text>
      ))}
      <text x={padL + 6} y={padT + 12} fontSize={10} fill="var(--color-mycar)">we lead</text>
      <text x={padL + 6} y={H - padB - 6} fontSize={10} fill="var(--color-accent)">#{rival} leads</text>
      {myStopsMs.map((t) => (
        <path key={`m${t}`} d={`M${x(t)} ${padT} l-4 -7 h8 z`} fill="var(--color-mycar)" transform="translate(0 7)">
          <title>Our stop · {formatClock(t)}</title>
        </path>
      ))}
      {rivalStopsMs.map((t) => (
        <path key={`r${t}`} d={`M${x(t)} ${H - padB} l-4 7 h8 z`} fill="var(--color-accent)" transform="translate(0 -7)">
          <title>#{rival} stop · {formatClock(t)}</title>
        </path>
      ))}
      <path d={path} fill="none" stroke="var(--color-pit-text)" strokeWidth={2} strokeLinejoin="round" />
      {projectedFinishGapMs !== null && raceEndMs !== null && (
        <>
          <line
            x1={x(last.atMs)}
            y1={y(last.gapMs)}
            x2={x(raceEndMs)}
            y2={y(projectedFinishGapMs)}
            stroke="var(--color-pit-dim)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <circle cx={x(raceEndMs)} cy={y(projectedFinishGapMs)} r={3.5} fill="var(--color-pit-dim)">
            <title>Projected at the flag: {fmtGap(projectedFinishGapMs)}</title>
          </circle>
        </>
      )}
      <circle cx={x(last.atMs)} cy={y(last.gapMs)} r={3.5} fill="var(--color-pit-text)" />
    </svg>
  );
}

export { fmtGap };
