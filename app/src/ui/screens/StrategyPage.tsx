import { useSessionStore } from '../../data/sessionStore';
import { useAppStore, useMyCar, useTargetClassPos } from '../../state/appStore';
import { useProjections } from '../hooks/useProjections';
import { formatClock, formatLapTime } from '../../data/time';
import { assessTarget } from '../../strategy/targetPosition';
import { ClassChip } from '../components/ClassChip';
import { useFieldIntel } from '../hooks/useFieldIntel';
import { ReclassCard } from '../components/ReclassCard';

export function StrategyPage() {
  const session = useSessionStore((s) => s.session);
  const hasSession = useSessionStore((s) => s.hasSession);
  const myCar = useMyCar();
  const targetPos = useTargetClassPos();
  const setTargetPos = useAppStore((s) => s.setTargetClassPos);
  const intel = useFieldIntel();

  const { data, projections, clock } = useProjections(intel);

  if (!hasSession) {
    return <div className="p-6 text-center text-pit-dim">Waiting for session data…</div>;
  }
  if (!myCar) {
    return (
      <div className="p-6 text-center text-pit-dim">
        Pin your car on the timing board (tap ☆) to unlock strategy tools.
      </div>
    );
  }

  const mine = data[myCar];
  const myClass = mine?.car.class ?? '';
  const myProj = projections.find((p) => p.number === myCar);
  const classProj = projections.filter((p) => p.cls === myClass);

  const assessment =
    mine && clock.raceEndMs !== null
      ? assessTarget({
          ourCar: myCar,
          ourClass: myClass,
          targetClassPos: targetPos,
          projections,
          ourLastCrossMs: mine.lastCrossMs,
          ourLapsCompleted: mine.car.lastLapCompleted,
          raceEndMs: clock.raceEndMs,
          currentPaceMs: mine.pace.rollingMs,
          bestPaceMs: mine.pace.bestMs,
        })
      : null;

  const feasibilityStyle: Record<string, string> = {
    'on-target': 'bg-flag-green text-white',
    push: 'bg-flag-yellow text-black',
    stretch: 'bg-orange-500 text-black',
    unrealistic: 'bg-flag-red text-white',
  };

  const myChanges = intel[myCar]?.classChanges ?? [];
  const lastReclass = myChanges[myChanges.length - 1];
  const reclassedRecently =
    lastReclass && lastReclass.atMs !== null && clock.elapsedMs !== null && clock.elapsedMs - lastReclass.atMs < 30 * 60_000;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {reclassedRecently && (
        <div className="rounded-lg bg-miami-light p-3 text-sm font-bold text-black">
          ↻ We were reclassed {lastReclass.from} → {lastReclass.to} at {formatClock(lastReclass.atMs)}. Class
          projections and the target below now use {lastReclass.to}.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Race time" value={formatClock(clock.elapsedMs)} />
        <Card label="Remaining" value={formatClock(clock.remainingMs)} />
        <Card label="Our pace" value={formatLapTime(mine?.pace.rollingMs ?? null)} />
        <Card
          label="Trend"
          value={
            mine?.pace.trendMsPerLap == null
              ? '–'
              : `${mine.pace.trendMsPerLap >= 0 ? '+' : ''}${(mine.pace.trendMsPerLap / 1000).toFixed(2)}s`
          }
        />
      </div>

      <ReclassCard risk={intel[myCar]?.reclass} title="Our reclass risk" />

      {assessment && (
        <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold">Target: finish</h3>
            <select
              className="rounded border border-pit-line bg-pit-bg px-2 py-1 font-bold"
              value={targetPos}
              onChange={(e) => setTargetPos(Number(e.target.value))}
            >
              {classProj.map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  P{i + 1}
                </option>
              ))}
            </select>
            <span className="text-pit-dim">in {myClass}</span>
            <span
              className={`ml-auto rounded px-2 py-1 text-sm font-bold ${feasibilityStyle[assessment.feasibility]}`}
            >
              {assessment.feasibility.toUpperCase().replace('-', ' ')}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card
              label="Required pace"
              value={formatLapTime(assessment.requiredPaceMs)}
              sub={
                assessment.deltaMs !== null && assessment.deltaMs < 0
                  ? `${(assessment.deltaMs / 1000).toFixed(1)}s vs now`
                  : undefined
              }
            />
            <Card label="Current pace" value={formatLapTime(assessment.currentPaceMs)} />
            <Card
              label="Car to beat"
              value={assessment.rival ? `#${assessment.rival.number}` : '–'}
              sub={assessment.rival ? `proj ${assessment.rival.projLaps.toFixed(1)} laps` : undefined}
            />
          </div>
          <p className="mt-2 text-sm text-pit-dim">{assessment.note}</p>
        </div>
      )}

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">
          Projected finish — {myClass} <ClassChip cls={myClass} classColors={session.classColors} />
        </h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-pit-dim">
            <tr>
              <th className="px-2 py-1">Proj</th>
              <th className="px-2 py-1">Now</th>
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1 text-right">Laps</th>
              <th className="px-2 py-1 text-right">Pace</th>
              <th className="px-2 py-1 text-right">Proj laps</th>
            </tr>
          </thead>
          <tbody>
            {classProj.map((p) => {
              const nowPos = data[p.number]?.car.classPosition ?? 0;
              const gain = nowPos > 0 ? nowPos - p.projClassPos : 0;
              return (
                <tr
                  key={p.number}
                  className={`border-t border-pit-line ${p.number === myCar ? 'bg-mycar/15 font-bold' : ''}`}
                >
                  <td className="tnum px-2 py-1">
                    P{p.projClassPos}{' '}
                    {gain !== 0 && (
                      <span className={gain > 0 ? 'text-flag-green' : 'text-flag-red'}>
                        {gain > 0 ? `▲${gain}` : `▼${-gain}`}
                      </span>
                    )}
                  </td>
                  <td className="tnum px-2 py-1 text-pit-dim">{nowPos > 0 ? `P${nowPos}` : '–'}</td>
                  <td className="tnum px-2 py-1">#{p.number}</td>
                  <td className="tnum px-2 py-1 text-right">{p.lapsCompleted}</td>
                  <td className="tnum px-2 py-1 text-right">{formatLapTime(p.paceMs)}</td>
                  <td className="tnum px-2 py-1 text-right">{p.projLaps.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {myProj && (
          <p className="mt-2 text-sm text-pit-dim">
            Overall projection: P{myProj.projOverallPos} of {projections.length}. Projections assume
            everyone holds their current rolling pace; pit-stop plans are on the Plan page.
          </p>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-pit-line bg-pit-panel p-3">
      <div className="text-xs uppercase text-pit-dim">{label}</div>
      <div className="tnum text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-pit-dim">{sub}</div>}
    </div>
  );
}
