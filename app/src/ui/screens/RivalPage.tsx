import { useMemo } from 'react';
import { selectClassGroups, useSessionStore } from '../../data/sessionStore';
import { formatClock, formatLapTime } from '../../data/time';
import { useAppStore, useMyCar, useRivals } from '../../state/appStore';
import type { CarIntel } from '../../strategy/fieldIntel';
import { headlineRisk, paceSnapshot } from '../../strategy/reclass';
import { currentGap, describeGap, gapSeries, projectedFinishGapMs, rivalCall } from '../../strategy/rivalCall';
import { ClassChip } from '../components/ClassChip';
import { GapChart, fmtGap } from '../components/GapChart';
import { NextPitCell } from '../components/NextPitCell';
import { Sparkline } from '../components/Sparkline';
import { useFieldIntel } from '../hooks/useFieldIntel';
import { useProjections } from '../hooks/useProjections';

export function RivalPage() {
  const session = useSessionStore((s) => s.session);
  const cars = useSessionStore((s) => s.cars);
  const lapLog = useSessionStore((s) => s.lapLog);
  const hasSession = useSessionStore((s) => s.hasSession);
  const myCar = useMyCar();
  const rivals = useRivals();
  const toggleRival = useAppStore((s) => s.toggleRival);
  const setPrimary = useAppStore((s) => s.setPrimaryRival);
  const navigate = useAppStore((s) => s.navigate);
  const sparkLaps = useAppStore((s) => s.strategy.sparkLaps);
  const intel = useFieldIntel();
  const { projections, clock, minPitMs } = useProjections(intel);

  const teamOf = useMemo(() => new Map(session.eventEntries.map((e) => [e.number, e.name])), [session.eventEntries]);

  if (!hasSession) return <div className="p-6 text-center text-pit-dim">Waiting for session data…</div>;
  if (!myCar) {
    return <div className="p-6 text-center text-pit-dim">Pin your car on the timing board (tap ☆) first.</div>;
  }

  const rival = rivals[0];
  const picker = (
    <div className="rounded-lg border border-pit-line bg-pit-panel p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">Rivals</span>
        {rivals.map((r, i) => (
          <span key={r} className={`flex items-center gap-1 rounded px-2 py-0.5 text-sm ${i === 0 ? 'bg-accent text-black' : 'bg-pit-line'}`}>
            <button onClick={() => setPrimary(r)} title="Make primary" className="tnum font-bold">
              #{r}
            </button>
            <button onClick={() => toggleRival(r)} aria-label={`Remove #${r}`} className="opacity-70 hover:opacity-100">
              ×
            </button>
          </span>
        ))}
        <select
          className="ml-auto rounded border border-pit-line bg-pit-bg px-2 py-1 text-sm"
          value=""
          onChange={(e) => e.target.value && toggleRival(e.target.value)}
        >
          <option value="">+ Add rival…</option>
          {selectClassGroups(cars, session.classOrder).map((g) => (
            <optgroup key={g.className} label={g.className}>
              {g.cars
                .filter((c) => c.number && c.number !== myCar && !rivals.includes(c.number))
                .map((c) => (
                  <option key={c.number} value={c.number!}>
                    #{c.number} {teamOf.get(c.number!) ?? ''} (P{c.classPosition})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-pit-dim">Up to 3; the first is compared in detail. Also toggle ⚔ on the timing board.</p>
    </div>
  );

  if (!rival || !cars[rival]) {
    return <div className="mx-auto max-w-4xl space-y-4 p-4">{picker}</div>;
  }

  const mine = intel[myCar];
  const theirs = intel[rival];
  const myLaps = lapLog[myCar] ?? [];
  const rivalLaps = lapLog[rival] ?? [];
  const series = gapSeries(myLaps, rivalLaps);
  const gap = currentGap(myLaps, rivalLaps);
  const finishGap = projectedFinishGapMs(
    projections.find((p) => p.number === myCar),
    projections.find((p) => p.number === rival),
  );
  const call =
    clock.elapsedMs !== null
      ? rivalCall({
          nowMs: clock.elapsedMs,
          gapMs: gap.onSameLap ? gap.gapMs : null,
          myNext: mine?.next ?? null,
          rivalNext: theirs?.next ?? null,
          myStops: mine?.stints.stops ?? [],
          rivalStops: theirs?.stints.stops ?? [],
          myPaceMs: mine?.pace.rollingMs ?? null,
          rivalPaceMs: theirs?.pace.rollingMs ?? null,
          minPitMs,
          rival,
        })
      : null;

  const myCls = cars[myCar]?.class ?? '';
  const theirCls = cars[rival]?.class ?? '';
  const mySnap = paceSnapshot(myCar, myCls, myLaps);
  const theirSnap = paceSnapshot(rival, theirCls, rivalLaps);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {picker}

      {call && call.kind !== 'none' && (
        <div className={`rounded-lg p-3 text-sm font-bold ${call.kind === 'rival-pitting' ? 'bg-accent text-black' : 'bg-flag-yellow text-black'}`}>
          {call.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Gap now" value={describeGap(gap, fmtGap)} hint="+ = we're ahead" />
        <Card label="Projected at flag" value={finishGap !== null ? fmtGap(finishGap) : '–'} />
        <Card label="Class" value={myCls === theirCls ? 'Same class' : `${theirCls.replace(/^LDRL\s*/, '')} vs our ${myCls.replace(/^LDRL\s*/, '')}`} />
        <Card label="Pace delta" value={mine?.pace.rollingMs && theirs?.pace.rollingMs ? `${((theirs.pace.rollingMs - mine.pace.rollingMs) / 1000).toFixed(2)}s/lap` : '–'} hint="+ = we're faster" />
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">
          Gap to #{rival} <span className="font-normal text-pit-dim">{teamOf.get(rival) ?? ''}</span>
        </h3>
        <GapChart
          series={series}
          myStopsMs={(mine?.stints.stops ?? []).map((s) => s.endMs)}
          rivalStopsMs={(theirs?.stints.stops ?? []).map((s) => s.endMs)}
          raceEndMs={clock.raceEndMs}
          projectedFinishGapMs={finishGap}
          rival={rival}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-pit-line bg-pit-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-pit-dim">
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">
                Us #{myCar} <ClassChip cls={myCls} classColors={session.classColors} />
              </th>
              <th className="px-3 py-2">
                <button className="hover:underline" onClick={() => navigate({ name: 'car', car: rival })}>
                  #{rival}
                </button>{' '}
                <ClassChip cls={theirCls} classColors={session.classColors} />
              </th>
            </tr>
          </thead>
          <tbody className="tnum">
            <Row label="Position (class)" a={pos(cars[myCar]?.classPosition)} b={pos(cars[rival]?.classPosition)} />
            <Row label={`Last ${sparkLaps} laps`} a={<Sparkline laps={myLaps} count={sparkLaps} width={110} height={28} />} b={<Sparkline laps={rivalLaps} count={sparkLaps} width={110} height={28} />} />
            <Row label="Rolling pace" a={formatLapTime(mine?.pace.rollingMs)} b={formatLapTime(theirs?.pace.rollingMs)} />
            <Row label="Best clean lap" a={formatLapTime(mine?.pace.bestMs)} b={formatLapTime(theirs?.pace.bestMs)} />
            <Row label="Trend" a={trend(mine)} b={trend(theirs)} />
            <Row label="Consistency (σ)" a={mySnap ? `±${(mySnap.sdMs / 1000).toFixed(2)}s` : '–'} b={theirSnap ? `±${(theirSnap.sdMs / 1000).toFixed(2)}s` : '–'} />
            <Row label="Stops / driver changes" a={stopsText(mine)} b={stopsText(theirs)} />
            <Row label="Current stint" a={stintAge(mine, clock.elapsedMs)} b={stintAge(theirs, clock.elapsedMs)} />
            <Row label="Next pit" a={<NextPitCell next={mine?.next ?? null} nowMs={clock.elapsedMs} />} b={<NextPitCell next={theirs?.next ?? null} nowMs={clock.elapsedMs} />} />
            <Row label="Fuel out" a={formatClock(mine?.next?.fuelOutMs)} b={formatClock(theirs?.next?.fuelOutMs)} />
            <Row label="Reclass risk" a={riskText(mine)} b={riskText(theirs)} />
          </tbody>
        </table>
      </div>

      {rivals.length > 1 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {rivals.slice(1).map((r) => {
            const g = currentGap(myLaps, lapLog[r] ?? []);
            return (
              <button key={r} onClick={() => setPrimary(r)} className="rounded-lg border border-pit-line bg-pit-panel p-3 text-left hover:bg-pit-line">
                <div className="flex items-center justify-between">
                  <span className="tnum font-bold">
                    #{r} <span className="font-normal text-pit-dim">{teamOf.get(r) ?? ''}</span>
                  </span>
                  <NextPitCell next={intel[r]?.next ?? null} nowMs={clock.elapsedMs} />
                </div>
                <div className="tnum text-sm text-pit-dim">
                  Gap {describeGap(g, fmtGap)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function pos(p: number | undefined) {
  return p && p > 0 ? `P${p}` : '–';
}

function trend(ci: CarIntel | undefined) {
  const t = ci?.pace.trendMsPerLap;
  return t == null ? '–' : `${t >= 0 ? '+' : ''}${(t / 1000).toFixed(2)}s/lap`;
}

function stopsText(ci: CarIntel | undefined) {
  return ci ? `${ci.stints.stops.length} / ${ci.stints.driverChanges}` : '–';
}

function stintAge(ci: CarIntel | undefined, now: number | null) {
  return ci && now !== null ? formatClock(Math.max(0, now - ci.stints.driverStartMs)) : '–';
}

function riskText(ci: CarIntel | undefined) {
  const h = headlineRisk(ci?.reclass ?? undefined, 'med');
  return h ? `${h.dir === 'up' ? '▲' : '▼'} ${h.d.risk} · ~${Math.round(h.d.perHour * 100)}%/h` : 'low';
}

function Row({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <tr className="border-t border-pit-line">
      <td className="px-2 py-1.5 text-xs uppercase text-pit-dim sm:px-3">{label}</td>
      <td className="px-2 py-1.5 sm:px-3">{a}</td>
      <td className="px-2 py-1.5 sm:px-3">{b}</td>
    </tr>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-pit-line bg-pit-panel p-3">
      <div className="text-xs uppercase text-pit-dim">{label}</div>
      <div className="tnum text-lg font-bold">{value}</div>
      {hint && <div className="text-xs text-pit-dim">{hint}</div>}
    </div>
  );
}
