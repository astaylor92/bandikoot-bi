import type { SessionState } from './redmist/session-state';
import type { CarPosition } from './redmist/car-position';
import type { EventListSummary } from './redmist/event-list-summary';
import type { Event } from './redmist/event';
import type { Session } from './redmist/session';
import type { FlagDuration } from './redmist/flag-duration';
import type { CarControlLogs } from './redmist/car-control-logs';
import {
  sessionStateFromJson,
  carPositionFromJson,
  eventListSummaryFromJson,
  eventFromJson,
  sessionFromJson,
  flagDurationFromJson,
  carControlLogsFromJson,
} from './redmist/from-json-functions';

export const DEFAULT_API_BASE = 'https://api.redmist.racing/status';

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  const text = await res.text();
  if (text.trim() === '') return null;
  return JSON.parse(text);
}

/**
 * Typed client for the Red Mist Status API v2 (all endpoints are public).
 * https://api.redmist.racing/status/swagger/v2/swagger.json
 */
export class RestClient {
  constructor(private base: string = DEFAULT_API_BASE) {}

  private url(path: string, params: Record<string, string | number>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    const q = qs.toString();
    return `${this.base}/v2/Events/${path}${q ? `?${q}` : ''}`;
  }

  async loadLiveAndRecentEvents(): Promise<EventListSummary[]> {
    const json = (await getJson(this.url('LoadLiveAndRecentEvents', {}))) as Record<string, unknown>[] | null;
    return (json ?? []).map(eventListSummaryFromJson);
  }

  async loadEvent(eventId: number): Promise<Event | null> {
    const json = (await getJson(this.url('LoadEvent', { eventId }))) as Record<string, unknown> | null;
    return json ? eventFromJson(json) : null;
  }

  async loadSessions(eventId: number): Promise<Session[]> {
    const json = (await getJson(this.url('LoadSessions', { eventId }))) as Record<string, unknown>[] | null;
    return (json ?? []).map(sessionFromJson);
  }

  /** Full session snapshot. Returns null when the event has no live state. */
  async getCurrentSessionState(eventId: number): Promise<SessionState | null> {
    const json = (await getJson(this.url('GetCurrentSessionStateJson', { eventId }))) as
      | Record<string, unknown>
      | null;
    return json ? sessionStateFromJson(json) : null;
  }

  /** All laps for all cars in a session: a flat list of per-lap CarPosition records. */
  async loadSessionLaps(eventId: number, sessionId: number): Promise<CarPosition[]> {
    const json = (await getJson(this.url('LoadSessionLaps', { eventId, sessionId }))) as
      | Record<string, unknown>[]
      | null;
    return (json ?? []).map(carPositionFromJson);
  }

  async loadCarLaps(eventId: number, sessionId: number, carNumber: string): Promise<CarPosition[]> {
    const json = (await getJson(this.url('LoadCarLaps', { eventId, sessionId, carNumber }))) as
      | Record<string, unknown>[]
      | null;
    return (json ?? []).map(carPositionFromJson);
  }

  async loadFlags(eventId: number, sessionId: number): Promise<FlagDuration[]> {
    const json = (await getJson(this.url('LoadFlags', { eventId, sessionId }))) as
      | Record<string, unknown>[]
      | null;
    return (json ?? []).map(flagDurationFromJson);
  }

  async loadCarControlLogs(eventId: number, car: string): Promise<CarControlLogs | null> {
    const json = (await getJson(this.url('LoadCarControlLogs', { eventId, car }))) as
      | Record<string, unknown>
      | null;
    return json ? carControlLogsFromJson(json) : null;
  }
}
