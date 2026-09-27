import { useState } from 'react';
import type { CarPosition } from '../../api/redmist/car-position';
import { selectClassGroups, selectOverallOrder, useSessionStore } from '../../data/sessionStore';
import { useAppStore, useMyCar } from '../../state/appStore';
import { ClassChip } from '../components/ClassChip';
import { useFieldIntel } from '../hooks/useFieldIntel';
import type { CarIntel } from '../../strategy/fieldIntel';
import { raceClock } from '../../strategy/liveInputs';

/** How long a reclass stays highlighted on the board. */
const RECENT_RECLASS_MS = 10 * 60_000;

export function TimingBoard() {
  const cars = useSessionStore((s) => s.cars);
  const session = useSessionStore((s) => s.session);
  const hasSession = useSessionStore((s) => s.hasSession);
  const [byClass, setByClass] = useState(true);
  const myCar = useMyCar();
  const intel = useFieldIntel();
  const elapsedMs = raceClock(session).elapsedMs;

  if (!hasSession) {
    return <div className="p-6 text-center text-pit-dim">Waiting for session data…</div>;
  }

  const teamByNo = new Map(session.eventEntries.map((e) => [e.number, e.name]));

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center gap-2">
        <button
          className={`rounded px-3 py-1 text-sm font-bold ${byClass ? 'bg-accent text-black' : 'bg-pit-panel text-pit-dim'}`}
          onClick={() => setByClass(true)}
        >
          By class
        </button>
        <button
          className={`rounded px-3 py-1 text-sm font-bold ${!byClass ? 'bg-accent text-black' : 'bg-pit-panel text-pit-dim'}`}
          onClick={() => setByClass(false)}
        >
          Overall
        </button>
        <span className="ml-auto text-sm text-pit-dim">
          {Object.keys(cars).length} cars · tap ☆ to pin your car
        </span>
      </div>

      {byClass ? (
        selectClassGroups(cars, session.classOrder).map((g) => (
          <div key={g.className} className="mb-4">
            <div className="mb-1 flex items-center gap-2 px-1">
              <ClassChip cls={g.className} classColors={session.classColors} />
              <span className="text-sm font-bold text-pit-dim">{g.className}</span>
            </div>
            <BoardTable cars={g.cars} teamByNo={teamByNo} myCar={myCar} classColors={session.classColors} showClass={false} posOf={(c) => c.classPosition} intel={intel} elapsedMs={elapsedMs} />
          </div>
        ))
      ) : (
        <BoardTable cars={selectOverallOrder(cars)} teamByNo={teamByNo} myCar={myCar} classColors={session.classColors} showClass posOf={(c) => c.overallPosition} intel={intel} elapsedMs={elapsedMs} />
      )}
    </div>
  );
}

function BoardTable({
  cars,
  teamByNo,
  myCar,
  classColors,
  showClass,
  posOf,
  intel,
  elapsedMs,
}: {
  cars: CarPosition[];
  teamByNo: Map<string, string>;
  myCar: string;
  classColors: Record<string, string>;
  showClass: boolean;
  posOf: (c: CarPosition) => number;
  intel: Record<string, CarIntel>;
  elapsedMs: number | null;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const setMyCar = useAppStore((s) => s.setMyCar);

  return (
    <div className="overflow-x-auto rounded-lg border border-pit-line">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-pit-panel text-left text-xs uppercase text-pit-dim">
            <th className="w-8 px-2 py-1.5"></th>
            <th className="w-10 px-2 py-1.5">P</th>
            <th className="w-14 px-2 py-1.5">#</th>
            {showClass && <th className="w-16 px-2 py-1.5">Cls</th>}
            <th className="px-2 py-1.5">Team</th>
            <th className="w-14 px-2 py-1.5 text-right">Laps</th>
            <th className="w-20 px-2 py-1.5 text-right">Last</th>
            <th className="w-20 px-2 py-1.5 text-right">Best</th>
            <th className="w-20 px-2 py-1.5 text-right">Gap</th>
            <th className="w-20 px-2 py-1.5 text-right">Ldr</th>
            <th className="w-12 px-2 py-1.5 text-right" title="Pit stops (loop-detected + inferred from lap time)">Pits</th>
            <th className="w-12 px-2 py-1.5 text-right" title="Driver changes (inferred from stop length)">Chg</th>
            <th className="w-14 px-2 py-1.5"></th>
          </tr>
        </thead>
        <tbody>
          {cars.map((c) => {
            const num = c.number ?? '';
            const mine = num === myCar;
            const ci = intel[num];
            const lastReclass = ci?.classChanges[ci.classChanges.length - 1];
            const recentReclass =
              lastReclass && lastReclass.atMs !== null && elapsedMs !== null && elapsedMs - lastReclass.atMs < RECENT_RECLASS_MS
                ? lastReclass
                : null;
            return (
              <tr
                key={num}
                onClick={() => navigate({ name: 'car', car: num })}
                className={`cursor-pointer border-t border-pit-line hover:bg-pit-line/50 ${
                  mine ? 'bg-mycar/15' : c.isInPit ? 'bg-accent/10' : ''
                } ${c.isStale ? 'opacity-50' : ''}`}
              >
                <td
                  className="px-2 py-1.5 text-center text-mycar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMyCar(mine ? '' : num);
                  }}
                >
                  {mine ? '★' : '☆'}
                </td>
                <td className="tnum px-2 py-1.5 font-bold">{posOf(c) > 0 ? posOf(c) : '–'}</td>
                <td className="tnum px-2 py-1.5 font-bold">{num}</td>
                {showClass && (
                  <td className="px-2 py-1.5">
                    <ClassChip cls={c.class} classColors={classColors} />
                  </td>
                )}
                <td className="max-w-[220px] truncate px-2 py-1.5">
                  {recentReclass && (
                    <span
                      className="mr-1.5 rounded bg-miami-light px-1 py-0.5 text-xs font-bold text-black"
                      title={`Reclassed ${recentReclass.from} → ${recentReclass.to}`}
                    >
                      ↻ {shortCls(recentReclass.from)}→{shortCls(recentReclass.to)}
                    </span>
                  )}
                  {teamByNo.get(num) ?? ''}
                </td>
                <td className="tnum px-2 py-1.5 text-right">{c.lastLapCompleted || '–'}</td>
                <td className="tnum px-2 py-1.5 text-right">{shortTime(c.lastLapTime)}</td>
                <td className={`tnum px-2 py-1.5 text-right ${c.isBestTimeClass ? 'text-purple-400' : ''}`}>
                  {shortTime(c.bestTime)}
                </td>
                <td className="tnum px-2 py-1.5 text-right text-pit-dim">{shortGap(c.overallGap)}</td>
                <td className="tnum px-2 py-1.5 text-right text-pit-dim">{shortGap(c.overallDifference)}</td>
                <td className="tnum px-2 py-1.5 text-right">{c.pitStopCount ?? ci?.stints.stops.length ?? '–'}</td>
                <td className="tnum px-2 py-1.5 text-right">{ci ? ci.stints.driverChanges : '–'}</td>
                <td className="px-2 py-1.5 text-right">
                  {c.isInPit && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-black">PIT</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function shortCls(cls: string): string {
  return cls.replace(/^LDRL\s*/i, '');
}

function shortTime(t: string | null | undefined): string {
  if (!t) return '–';
  // "00:02:22.768" -> "2:22.8"
  const m = /^(\d+):(\d+):(\d+)\.(\d+)$/.exec(t);
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) + h * 60;
  return `${min}:${m[3]}.${m[4].slice(0, 1)}`;
}

function shortGap(g: string | null | undefined): string {
  if (!g) return '–';
  if (/lap/i.test(g)) return g;
  const m = /^(\d+):(\d+):(\d+)\.(\d+)$/.exec(g);
  if (m) {
    const min = parseInt(m[2], 10) + parseInt(m[1], 10) * 60;
    return min > 0 ? `${min}:${m[3]}.${m[4].slice(0, 1)}` : `${parseInt(m[3], 10)}.${m[4].slice(0, 1)}`;
  }
  const f = parseFloat(g);
  return Number.isNaN(f) ? g : f.toFixed(1);
}
