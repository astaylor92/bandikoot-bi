import { useState } from 'react';
import { useAppStore } from '../../state/appStore';
import { atLocalTime, clockLabel, toLocalHHMM, type RaceSegment } from '../../strategy/schedule';
import { useRaceSegments } from '../hooks/useRaceClock';

interface Row {
  start: string;
  end: string;
}

/** Edit the race's green-to-checkered windows for this device. */
export function ScheduleEditor({ onClose }: { onClose: () => void }) {
  const now = Date.now();
  const { segments, manual } = useRaceSegments(now);
  const setOverride = useAppStore((s) => s.setScheduleOverride);
  const [rows, setRows] = useState<Row[]>(
    (segments ?? []).map((s) => ({ start: toLocalHHMM(s.startMs), end: toLocalHHMM(s.endMs) })),
  );
  const [error, setError] = useState('');

  const save = () => {
    const segs: RaceSegment[] = [];
    for (const r of rows) {
      const startMs = atLocalTime(now, r.start);
      const endMs = atLocalTime(now, r.end);
      if (startMs === null || endMs === null || endMs <= startMs) {
        setError('Each part needs a start and a later finish.');
        return;
      }
      segs.push({ startMs, endMs });
    }
    setOverride(segs.length ? segs : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-pit-line bg-pit-panel p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 font-bold">Race schedule</h3>
        <p className="mb-3 text-sm text-pit-dim">
          Green flag to checkered flag, in your phone's time. Add a part for each race when there's a break (e.g. 9:00–11:00
          and 12:00–17:00). {manual ? 'You set this on this device.' : "Filled in from Red Mist's schedule."}
        </p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 text-xs uppercase text-pit-dim">Part {i + 1}</span>
              <input
                type="time"
                className="tnum rounded border border-pit-line bg-pit-bg px-2 py-1"
                value={r.start}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
              />
              <span className="text-pit-dim">to</span>
              <input
                type="time"
                className="tnum rounded border border-pit-line bg-pit-bg px-2 py-1"
                value={r.end}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
              />
              <button className="ml-auto text-pit-dim" aria-label="Remove part" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-sm text-accent"
          onClick={() => setRows([...rows, rows.length ? { start: rows[rows.length - 1].end, end: rows[rows.length - 1].end } : { start: '09:00', end: '17:00' }])}
        >
          + Add part
        </button>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded bg-accent px-3 py-1 font-bold text-black" onClick={save}>
            Save
          </button>
          {manual && (
            <button
              className="rounded border border-pit-line px-3 py-1"
              onClick={() => {
                setOverride(null);
                onClose();
              }}
            >
              Use Red Mist's schedule
            </button>
          )}
          <button className="ml-auto rounded border border-pit-line px-3 py-1 text-pit-dim" onClick={onClose}>
            Cancel
          </button>
        </div>
        {segments && (
          <p className="mt-3 text-xs text-pit-dim">
            Now: {segments.map((s) => `${clockLabel(s.startMs)}–${clockLabel(s.endMs)}`).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
