import type { CarPosition } from '../api/redmist/car-position';
import type { Session } from '../api/redmist/session';
import type { SessionState } from '../api/redmist/session-state';
import { emptySessionState } from './patch';
import { parseDurationMs, toWireClock } from './time';

/**
 * Race length from a session name: "Sat 7 Hr" → 7 h, "Sunday 2+5Hr" → 7 h,
 * "Sat 6.5Hr" → 6.5 h. Null when the name carries no duration.
 */
export function raceLengthMsFromName(name: string): number | null {
  const m = /((?:\d+(?:\.\d+)?\s*\+\s*)*\d+(?:\.\d+)?)\s*h(?:ou)?rs?\b/i.exec(name);
  if (!m) return null;
  const hours = m[1].split('+').reduce((sum, part) => sum + parseFloat(part), 0);
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 3_600_000) : null;
}

/** Context borrowed from a finished session of the same event (team names, class colours). */
export interface SnapshotContext {
  eventEntries: SessionState['eventEntries'];
  classColors: SessionState['classColors'];
  classOrder: SessionState['classOrder'];
  eventName: string;
}

/**
 * Build a live SessionState from public lap history. During a race Red Mist's
 * public LoadSessionResults is empty (HTTP 204) but LoadSessionLaps updates,
 * and each lap record is a full CarPosition as of that lap — so the latest
 * record per car is a usable, slightly delayed board.
 */
export function sessionStateFromLaps(
  laps: CarPosition[],
  session: Session,
  eventId: number,
  ctx: SnapshotContext | null,
): SessionState | null {
  const latest = new Map<string, CarPosition>();
  for (const cp of laps) {
    if (!cp.number) continue;
    const cur = latest.get(cp.number);
    if (!cur || cp.lastLapCompleted > cur.lastLapCompleted) latest.set(cp.number, cp);
  }
  if (latest.size === 0) return null;

  const cars = [...latest.values()];
  // Race clock ≈ the most recent crossing; with a full field that lags by seconds.
  let lastCross: CarPosition = cars[0];
  let clockMs = 0;
  for (const cp of cars) {
    const t = parseDurationMs(cp.totalTime) ?? 0;
    if (t > clockMs) {
      clockMs = t;
      lastCross = cp;
    }
  }
  const lengthMs = raceLengthMsFromName(session.name);

  const state = emptySessionState();
  state.eventId = eventId;
  state.eventName = ctx?.eventName ?? '';
  state.sessionId = session.id;
  state.sessionName = session.name;
  state.runningRaceTime = toWireClock(clockMs);
  state.timeToGo = lengthMs !== null ? toWireClock(Math.max(0, lengthMs - clockMs)) : '';
  state.currentFlag = lastCross.trackFlag;
  state.isLive = true;
  state.carPositions = cars;
  state.eventEntries = ctx?.eventEntries ?? [];
  state.classColors = ctx?.classColors ?? {};
  state.classOrder = ctx?.classOrder ?? {};
  return state;
}
