import { useSessionStore } from '../../data/sessionStore';
import { useAppStore } from '../../state/appStore';
import { formatClock, formatLapTime } from '../../data/time';
import { paceSummary } from '../../strategy/pace';
import { actualStints } from '../../strategy/stintPlanner';
import { Flags } from '../../api/redmist/flags';
import { ClassChip } from '../components/ClassChip';

export function CarDetail({ car }: { car: string }) {
  const cp = useSessionStore((s) => s.cars[car]);
  const laps = useSessionStore((s) => s.lapLog[car] ?? []);
  const session = useSessionStore((s) => s.session);
  const navigate = useAppStore((s) => s.navigate);

  if (!cp) {
    return <div className="p-6 text-center text-pit-dim">No data for car {car}.</div>;
  }

  const team = session.eventEntries.find((e) => e.number === car);
  const pace = paceSummary(laps);
  const stints = actualStints(laps);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <button className="text-sm text-accent" onClick={() => navigate({ name: 'board' })}>
        ← Back to board
      </button>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="tnum text-3xl font-bold">#{car}</span>
          <ClassChip cls={cp.class} classColors={session.classColors} />
          <div>
            <div className="font-semibold">{team?.name ?? ''}</div>
            <div className="text-sm text-pit-dim">{team?.team ?? ''}</div>
          </div>
          {cp.isInPit && (
            <span className="ml-auto rounded bg-accent px-2 py-1 text-sm font-bold text-black">IN PIT</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Overall" value={cp.overallPosition > 0 ? `P${cp.overallPosition}` : '–'} />
          <Stat label="In class" value={cp.classPosition > 0 ? `P${cp.classPosition}` : '–'} />
          <Stat label="Laps" value={String(cp.lastLapCompleted || 0)} />
          <Stat label="Pit stops" value={String(cp.pitStopCount ?? stints.filter((s) => s.endMs !== null).length)} />
          <Stat label="Rolling pace" value={formatLapTime(pace.rollingMs)} />
          <Stat label="Best clean lap" value={formatLapTime(pace.bestMs)} />
          <Stat
            label="Trend"
            value={
              pace.trendMsPerLap === null
                ? '–'
                : `${pace.trendMsPerLap >= 0 ? '+' : ''}${(pace.trendMsPerLap / 1000).toFixed(2)}s/lap`
            }
          />
          <Stat label="Clean laps" value={String(pace.cleanLapCount)} />
        </div>
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">Stints</h3>
        {stints.length === 0 && <div className="text-sm text-pit-dim">No laps yet.</div>}
        <div className="space-y-1">
          {stints.map((s, i) => (
            <div key={i} className="tnum flex justify-between text-sm">
              <span>
                Stint {i + 1} · laps {s.startLap}–{s.endLap ?? '…'} ({s.lapCount})
              </span>
              <span className="text-pit-dim">
                {formatClock(s.startMs)} → {s.endMs !== null ? formatClock(s.endMs) : 'running'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">Laps ({laps.length})</h3>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-pit-panel text-left text-xs uppercase text-pit-dim">
              <tr>
                <th className="px-2 py-1">Lap</th>
                <th className="px-2 py-1 text-right">Time</th>
                <th className="px-2 py-1 text-right">Race clock</th>
                <th className="px-2 py-1 text-right">P</th>
                <th className="px-2 py-1 text-right">Flag</th>
              </tr>
            </thead>
            <tbody>
              {[...laps].reverse().map((l) => (
                <tr key={l.lap} className={`border-t border-pit-line ${l.pit ? 'bg-accent/10' : ''}`}>
                  <td className="tnum px-2 py-1">
                    {l.lap} {l.pit && <span className="text-xs font-bold text-accent">PIT</span>}
                  </td>
                  <td className="tnum px-2 py-1 text-right">{formatLapTime(l.lapMs)}</td>
                  <td className="tnum px-2 py-1 text-right text-pit-dim">
                    {l.totalMs !== null ? formatClock(l.totalMs) : '–'}
                  </td>
                  <td className="tnum px-2 py-1 text-right">{l.overallPosition || '–'}</td>
                  <td className="px-2 py-1 text-right">{flagDot(l.flag)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-pit-dim">{label}</div>
      <div className="tnum text-lg font-bold">{value}</div>
    </div>
  );
}

function flagDot(flag: Flags) {
  const color =
    flag === Flags.Green
      ? 'bg-flag-green'
      : flag === Flags.Yellow
        ? 'bg-flag-yellow'
        : flag === Flags.Red
          ? 'bg-flag-red'
          : 'bg-pit-line';
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}
