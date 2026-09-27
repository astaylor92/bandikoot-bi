import { formatClock } from '../../data/time';
import type { NextPit } from '../../strategy/nextPit';

const SOON_MS = 10 * 60_000;

export function NextPitCell({ next, nowMs }: { next: NextPit | null; nowMs: number | null }) {
  if (!next) return <span className="text-pit-dim">–</span>;
  if (next.inPit) return <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-black">IN PIT</span>;
  if (next.finishes) return <span className="text-xs text-pit-dim" title="Should reach the flag without stopping">to flag</span>;
  if (next.overdue) {
    return (
      <span className="rounded bg-flag-red px-1.5 py-0.5 text-xs font-bold text-white" title={`Predicted ${formatClock(next.atMs)} (${next.reason})`}>
        DUE · {next.reason === 'fuel' ? 'fuel' : 'drv'}
      </span>
    );
  }
  const soon = next.atMs !== null && nowMs !== null && next.atMs - nowMs < SOON_MS;
  return (
    <span
      className={`tnum whitespace-nowrap ${soon ? 'font-bold text-flag-yellow' : ''}`}
      title={`Driver out ${formatClock(next.driverOutMs)} · fuel out ${formatClock(next.fuelOutMs)}`}
    >
      {formatClock(next.atMs)}
      {next.inLaps !== null && <span className="text-pit-dim"> · {next.inLaps}L</span>}
      <span className="ml-1 text-xs text-pit-dim">{next.reason === 'fuel' ? 'fuel' : 'drv'}</span>
    </span>
  );
}
