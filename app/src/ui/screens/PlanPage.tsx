import { useMemo } from 'react';
import { useSessionStore } from '../../data/sessionStore';
import { useAppStore, useMyCar, useStintConfig, type StintConfigStored } from '../../state/appStore';
import { formatClock } from '../../data/time';
import { useRaceClock } from '../hooks/useRaceClock';
import { pitDecision, stintStatus, type StintConfig } from '../../strategy/stintPlanner';

const MIN = 60_000;

export function PlanPage() {
  const session = useSessionStore((s) => s.session);
  const hasSession = useSessionStore((s) => s.hasSession);
  const lapLog = useSessionStore((s) => s.lapLog);
  const myCar = useMyCar();
  const stored = useStintConfig();
  const setStintConfig = useAppStore((s) => s.setStintConfig);

  const clock = useRaceClock();
  const elapsedMs = clock.elapsedMs ?? 0;

  const cfg: StintConfig = useMemo(
    () => ({
      raceLengthMs: stored.raceLengthMin * MIN,
      maxStintMs: stored.maxStintMin * MIN,
      minPitMs: stored.minPitMin * MIN,
      drivers: stored.drivers,
    }),
    [stored],
  );

  const laps = lapLog[myCar] ?? [];
  const status = useMemo(() => stintStatus(cfg, laps, elapsedMs), [cfg, laps, elapsedMs]);
  const decision = pitDecision(status, cfg, elapsedMs);

  if (!hasSession) {
    return <div className="p-6 text-center text-pit-dim">Waiting for session data…</div>;
  }
  if (!myCar) {
    return (
      <div className="p-6 text-center text-pit-dim">
        Pin your car on the timing board (tap ☆) to use the stint planner.
      </div>
    );
  }

  const update = (patch: Partial<StintConfigStored>) => setStintConfig({ ...stored, ...patch });

  const windowMin = Math.floor(status.windowRemainingMs / MIN);
  const windowUrgent = status.windowRemainingMs < 15 * MIN;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Current stint" value={formatClock(status.currentStintMs)} />
        <Card
          label="Window closes in"
          value={formatClock(status.windowRemainingMs)}
          highlight={windowUrgent ? 'bg-flag-red text-white' : undefined}
        />
        <Card label="Must pit by" value={formatClock(status.mustPitByMs)} sub="race clock" />
        <Card label="Stops left (min)" value={String(status.stopsStillRequired)} sub={`${status.stopsTaken} taken`} />
      </div>

      <div
        className={`rounded-lg p-3 text-sm font-semibold ${
          decision.recommendation === 'must-pit'
            ? 'bg-flag-red text-white'
            : decision.recommendation === 'pit-now'
              ? 'bg-flag-yellow text-black'
              : 'border border-pit-line bg-pit-panel'
        }`}
      >
        {decision.recommendation === 'must-pit' && 'PIT NOW — '}
        {decision.recommendation === 'pit-now' && 'PIT THIS CYCLE — '}
        {decision.note}
        {windowUrgent && decision.recommendation === 'stay-out' && ` (${windowMin} min margin)`}
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-3 font-bold">Race & stint rules</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            label="Race length (min)"
            value={stored.raceLengthMin}
            onChange={(v) => update({ raceLengthMin: v })}
          />
          <NumberField
            label="Max stint (min)"
            value={stored.maxStintMin}
            onChange={(v) => update({ maxStintMin: v })}
          />
          <NumberField
            label="Min pit stop (min)"
            value={stored.minPitMin}
            onChange={(v) => update({ minPitMin: v })}
          />
          <div>
            <label className="text-xs uppercase text-pit-dim">Drivers (one per line)</label>
            <textarea
              className="tnum mt-1 w-full rounded border border-pit-line bg-pit-bg px-2 py-1 text-sm"
              rows={3}
              value={stored.drivers.join('\n')}
              onChange={(e) =>
                update({ drivers: e.target.value.split('\n').map((d) => d.trim()).filter(Boolean) })
              }
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-pit-dim">
          Defaults assume Lucky Dog-style rules (5-min minimum stop). Always confirm against the
          current event supplemental regulations.
        </p>
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">Plan from now — even stints, minimum stops</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-pit-dim">
            <tr>
              <th className="px-2 py-1">Stint</th>
              <th className="px-2 py-1">Driver</th>
              <th className="px-2 py-1 text-right">Start</th>
              <th className="px-2 py-1 text-right">Pit at</th>
              <th className="px-2 py-1 text-right">Length</th>
            </tr>
          </thead>
          <tbody>
            {status.plan.map((s) => (
              <tr key={s.index} className="tnum border-t border-pit-line">
                <td className="px-2 py-1">{status.stopsTaken + s.index + 1}</td>
                <td className="px-2 py-1">{s.driver}</td>
                <td className="px-2 py-1 text-right">{formatClock(s.startMs)}</td>
                <td className="px-2 py-1 text-right">
                  {s.pitAfterMs !== null ? formatClock(s.endMs) : 'FINISH'}
                </td>
                <td className="px-2 py-1 text-right">{formatClock(s.endMs - s.startMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-pit-dim">
          Times are race clock. The plan re-balances from the current moment every time you open
          this page — after an unplanned stop it recomputes automatically.
        </p>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: string;
}) {
  return (
    <div className={`rounded-lg border border-pit-line p-3 ${highlight ?? 'bg-pit-panel'}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="tnum text-xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase text-pit-dim">{label}</label>
      <input
        type="number"
        className="tnum mt-1 w-full rounded border border-pit-line bg-pit-bg px-2 py-1"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
