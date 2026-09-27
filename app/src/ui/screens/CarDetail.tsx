import { useSessionStore } from '../../data/sessionStore';
import { useAppStore } from '../../state/appStore';
import { formatClock, formatLapTime } from '../../data/time';
import { paceSummary } from '../../strategy/pace';
import { Flags } from '../../api/redmist/flags';
import { ClassChip } from '../components/ClassChip';
import { useFieldIntel } from '../hooks/useFieldIntel';

export function CarDetail({ car }: { car: string }) {
  const cp = useSessionStore((s) => s.cars[car]);
  const laps = useSessionStore((s) => s.lapLog[car] ?? []);
  const session = useSessionStore((s) => s.session);
  const navigate = useAppStore((s) => s.navigate);
  const setDriverChange = useAppStore((s) => s.setDriverChangeOverride);
  const intel = useFieldIntel()[car];

  if (!cp) {
    return <div className="p-6 text-center text-pit-dim">No data for car {car}.</div>;
  }

  const team = session.eventEntries.find((e) => e.number === car);
  const pace = paceSummary(laps);
  const stops = intel?.stints.stops ?? [];
  const stints = intel?.stints.stints ?? [];
  const classChanges = intel?.classChanges ?? [];

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
          <Stat label="Pit stops" value={String(cp.pitStopCount ?? stops.length)} />
          <Stat label="Driver changes" value={String(intel?.stints.driverChanges ?? 0)} />
          <Stat label="Reclasses" value={String(classChanges.length)} />
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
        <h3 className="mb-1 font-bold">Stops</h3>
        <p className="mb-2 text-xs text-pit-dim">
          Driver changes are inferred from stop length (Red Mist has no driver data for LDRL). Tap a stop to
          correct it. "Inferred" stops were missed by the pit loop and detected from lap time.
        </p>
        {stops.length === 0 && <div className="text-sm text-pit-dim">No stops yet.</div>}
        <div className="space-y-1">
          {stops.map((st) => (
            <button
              key={st.lap}
              className="tnum flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-pit-line"
              onClick={() => setDriverChange(car, st.lap, !st.driverChange)}
              title="Toggle driver change"
            >
              <span>
                Lap {st.lap} · {formatClock(st.endMs)} · +{formatClock(st.durationMs)}
                {st.inferred && <span className="ml-1 text-xs text-pit-dim">inferred</span>}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                  st.driverChange ? 'bg-mycar text-black' : 'bg-pit-line text-pit-dim'
                }`}
              >
                {st.driverChange ? 'DRIVER CHANGE' : st.refuel ? 'SAME DRIVER' : 'SHORT STOP'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">Driver stints</h3>
        <div className="space-y-1">
          {stints.map((st) => (
            <div key={st.index} className="tnum flex justify-between text-sm">
              <span>
                Driver {st.index + 1} · laps {st.startLap}–{st.endLap ?? '…'} ({st.lapCount})
              </span>
              <span className="text-pit-dim">
                {formatClock(st.startMs)} → {st.endMs !== null ? formatClock(st.endMs) : 'on track'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {classChanges.length > 0 && (
        <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
          <h3 className="mb-2 font-bold">Class history</h3>
          <div className="space-y-1">
            {classChanges.map((c) => (
              <div key={c.lap} className="tnum flex items-center gap-2 text-sm">
                <ClassChip cls={c.from} classColors={session.classColors} />→
                <ClassChip cls={c.to} classColors={session.classColors} />
                <span className="text-pit-dim">
                  lap {c.lap} · {c.atMs !== null ? formatClock(c.atMs) : '–'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
