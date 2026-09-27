import { create } from 'zustand';
import type { SessionState } from '../api/redmist/session-state';
import type { SessionStatePatch } from '../api/redmist/session-state-patch';
import type { CarPosition } from '../api/redmist/car-position';
import type { CarPositionPatch } from '../api/redmist/car-position-patch';
import { Flags } from '../api/redmist/flags';
import { mergeSessionPatch, mergeCarPatch, emptyCarPosition, emptySessionState } from './patch';
import { parseDurationMs } from './time';
import type { FeedSource } from './snapshotSource';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'polling'
  | 'replay'
  | 'reconnecting'
  | 'error';

/** One completed lap for a car, accumulated from the update stream or seeded from REST. */
export interface LapRecord {
  lap: number;
  lapMs: number;
  /** Elapsed race time at the moment this lap completed (from CarPosition.totalTime). */
  totalMs: number | null;
  flag: Flags;
  pit: boolean;
  overallPosition: number;
  classPosition: number;
  /** The car's class when this lap completed (reclasses show up as changes). */
  cls: string | null;
}

export function lapRecordFromCarPosition(cp: CarPosition): LapRecord | null {
  const lapMs = parseDurationMs(cp.lastLapTime);
  if (lapMs === null || !cp.lastLapCompleted) return null;
  return {
    lap: cp.lastLapCompleted,
    lapMs,
    totalMs: parseDurationMs(cp.totalTime),
    flag: cp.trackFlag,
    pit: cp.lapIncludedPit,
    overallPosition: cp.overallPosition,
    classPosition: cp.classPosition,
    cls: cp.class,
  };
}

interface SessionStore {
  session: SessionState;
  hasSession: boolean;
  cars: Record<string, CarPosition>;
  lapLog: Record<string, LapRecord[]>;
  connection: ConnectionStatus;
  connectionDetail: string;
  feedSource: FeedSource | null;
  lastUpdateAt: number | null;

  applyFullState(state: SessionState): void;
  applySessionPatch(patch: SessionStatePatch): void;
  applyCarPatches(patches: CarPositionPatch[]): void;
  seedLapLog(car: string, laps: LapRecord[]): void;
  resetSession(): void;
  setConnection(status: ConnectionStatus, detail?: string): void;
  setFeedSource(source: FeedSource | null): void;
}

function upsertLap(log: LapRecord[] | undefined, rec: LapRecord): LapRecord[] {
  const out = log ? [...log] : [];
  const idx = out.findIndex((l) => l.lap === rec.lap);
  if (idx >= 0) out[idx] = rec;
  else {
    out.push(rec);
    if (out.length > 1 && out[out.length - 2].lap > rec.lap) {
      out.sort((a, b) => a.lap - b.lap);
    }
  }
  return out;
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: emptySessionState(),
  hasSession: false,
  cars: {},
  lapLog: {},
  connection: 'idle',
  connectionDetail: '',
  feedSource: null,
  lastUpdateAt: null,

  applyFullState: (state) =>
    set((prev) => {
      const cars: Record<string, CarPosition> = {};
      let lapLog = prev.lapLog;
      for (const cp of state.carPositions) {
        if (!cp.number) continue;
        cars[cp.number] = cp;
        const prevCar = prev.cars[cp.number];
        if (cp.lastLapCompleted > (prevCar?.lastLapCompleted ?? 0)) {
          const rec = lapRecordFromCarPosition(cp);
          if (rec) lapLog = { ...lapLog, [cp.number]: upsertLap(lapLog[cp.number], rec) };
        }
      }
      return {
        session: { ...state, carPositions: [] },
        hasSession: true,
        cars,
        lapLog,
        lastUpdateAt: Date.now(),
      };
    }),

  applySessionPatch: (patch) =>
    set((prev) => {
      let session = mergeSessionPatch(prev.session, patch);
      let cars = prev.cars;
      let lapLog = prev.lapLog;

      // A session patch can carry full CarPosition objects.
      if (patch.carPositions) {
        cars = { ...cars };
        for (const cp of patch.carPositions) {
          if (!cp.number) continue;
          const prevCar = cars[cp.number];
          cars[cp.number] = cp;
          if (cp.lastLapCompleted > (prevCar?.lastLapCompleted ?? 0)) {
            const rec = lapRecordFromCarPosition(cp);
            if (rec) lapLog = { ...lapLog, [cp.number]: upsertLap(lapLog[cp.number], rec) };
          }
        }
      }

      // A full entry list is authoritative: drop cars that are no longer entered.
      if (patch.eventEntries) {
        const valid = new Set(patch.eventEntries.map((e) => e.number));
        const pruned: Record<string, CarPosition> = {};
        for (const [num, car] of Object.entries(cars)) {
          if (valid.has(num)) pruned[num] = car;
        }
        cars = pruned;
      }

      return { session, cars, lapLog, hasSession: true, lastUpdateAt: Date.now() };
    }),

  applyCarPatches: (patches) =>
    set((prev) => {
      if (patches.length === 0) return prev;
      const cars = { ...prev.cars };
      let lapLog = prev.lapLog;
      for (const patch of patches) {
        if (!patch.number) continue;
        const base = cars[patch.number] ?? emptyCarPosition(patch.number);
        const next = mergeCarPatch(base, patch);
        cars[patch.number] = next;
        if (next.lastLapCompleted > (base.lastLapCompleted ?? 0)) {
          const rec = lapRecordFromCarPosition(next);
          if (rec) lapLog = { ...lapLog, [patch.number]: upsertLap(lapLog[patch.number], rec) };
        }
      }
      return { cars, lapLog, lastUpdateAt: Date.now() };
    }),

  seedLapLog: (car, laps) =>
    set((prev) => {
      const existing = prev.lapLog[car] ?? [];
      const byLap = new Map<number, LapRecord>();
      for (const l of laps) byLap.set(l.lap, l);
      for (const l of existing) if (!byLap.has(l.lap)) byLap.set(l.lap, l);
      const merged = [...byLap.values()].sort((a, b) => a.lap - b.lap);
      return { lapLog: { ...prev.lapLog, [car]: merged } };
    }),

  resetSession: () =>
    set({
      session: emptySessionState(),
      hasSession: false,
      cars: {},
      lapLog: {},
      feedSource: null,
      lastUpdateAt: null,
    }),

  setConnection: (status, detail = '') => set({ connection: status, connectionDetail: detail }),
  setFeedSource: (source) => set((prev) => (prev.feedSource === source ? prev : { feedSource: source })),
}));

// ---- Selectors -------------------------------------------------------------

/** Cars sorted by overall position (cars with no position sink to the bottom). */
export function selectOverallOrder(cars: Record<string, CarPosition>): CarPosition[] {
  return Object.values(cars).sort((a, b) => {
    const ap = a.overallPosition > 0 ? a.overallPosition : Number.MAX_SAFE_INTEGER;
    const bp = b.overallPosition > 0 ? b.overallPosition : Number.MAX_SAFE_INTEGER;
    return ap - bp;
  });
}

/** Cars grouped by class, classes ordered by ClassOrder then name. */
export function selectClassGroups(
  cars: Record<string, CarPosition>,
  classOrder: Record<string, string>,
): { className: string; cars: CarPosition[] }[] {
  const groups = new Map<string, CarPosition[]>();
  for (const car of Object.values(cars)) {
    const cls = car.class || 'Unclassified';
    const arr = groups.get(cls);
    if (arr) arr.push(car);
    else groups.set(cls, [car]);
  }
  const orderOf = (cls: string) => {
    const raw = classOrder[cls];
    const n = raw !== undefined ? parseInt(raw, 10) : NaN;
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
  };
  return [...groups.entries()]
    .sort((a, b) => orderOf(a[0]) - orderOf(b[0]) || a[0].localeCompare(b[0]))
    .map(([className, list]) => ({
      className,
      cars: list.sort((a, b) => {
        const ap = a.classPosition > 0 ? a.classPosition : Number.MAX_SAFE_INTEGER;
        const bp = b.classPosition > 0 ? b.classPosition : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      }),
    }));
}
