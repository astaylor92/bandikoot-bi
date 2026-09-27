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

export class HttpError extends Error {
  constructor(
    public status: number,
    url: string,
  ) {
    super(`GET ${url} -> HTTP ${status}`);
  }
}

/**
 * Typed client for the Red Mist Status API v2.
 * https://api.redmist.racing/status/swagger/v2/swagger.json
 *
 * Most endpoints are public; GetCurrentSessionStateJson needs a Bearer token
 * (see docs/data-sources.md). Pass a token getter to authenticate requests.
 */
export class RestClient {
  constructor(
    private base: string = DEFAULT_API_BASE,
    private getToken?: () => Promise<string>,
  ) {}

  private async getJson(url: string): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.getToken) headers.Authorization = `Bearer ${await this.getToken()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new HttpError(res.status, url);
    const text = await res.text();
    if (text.trim() === '') return null;
    return JSON.parse(text);
  }

  private url(path: string, params: Record<string, string | number>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    const q = qs.toString();
    return `${this.base}/v2/Events/${path}${q ? `?${q}` : ''}`;
  }

  async loadLiveAndRecentEvents(): Promise<EventListSummary[]> {
    const json = (await this.getJson(this.url('LoadLiveAndRecentEvents', {}))) as Record<string, unknown>[] | null;
    return (json ?? []).map(eventListSummaryFromJson);
  }

  async loadEvent(eventId: number): Promise<Event | null> {
    const json = (await this.getJson(this.url('LoadEvent', { eventId }))) as Record<string, unknown> | null;
    return json ? eventFromJson(json) : null;
  }

  async loadSessions(eventId: number): Promise<Session[]> {
    const json = (await this.getJson(this.url('LoadSessions', { eventId }))) as Record<string, unknown>[] | null;
    return (json ?? []).map(sessionFromJson);
  }

  /** Final/current results for a session; public, same SessionState shape as the live snapshot. */
  async loadSessionResults(eventId: number, sessionId: number): Promise<SessionState | null> {
    const json = (await this.getJson(this.url('LoadSessionResults', { eventId, sessionId }))) as
      | Record<string, unknown>
      | null;
    return json && Array.isArray(json['carPositions']) ? sessionStateFromJson(json) : null;
  }

  /** Full live session snapshot (requires a token). Returns null when the event has no live state. */
  async getCurrentSessionState(eventId: number): Promise<SessionState | null> {
    const json = (await this.getJson(this.url('GetCurrentSessionStateJson', { eventId }))) as
      | Record<string, unknown>
      | null;
    return json ? sessionStateFromJson(json) : null;
  }

  /** All laps for all cars in a session: a flat list of per-lap CarPosition records. */
  async loadSessionLaps(eventId: number, sessionId: number): Promise<CarPosition[]> {
    const json = (await this.getJson(this.url('LoadSessionLaps', { eventId, sessionId }))) as
      | Record<string, unknown>[]
      | null;
    return (json ?? []).map(carPositionFromJson);
  }

  async loadCarLaps(eventId: number, sessionId: number, carNumber: string): Promise<CarPosition[]> {
    const json = (await this.getJson(this.url('LoadCarLaps', { eventId, sessionId, carNumber }))) as
      | Record<string, unknown>[]
      | null;
    return (json ?? []).map(carPositionFromJson);
  }

  async loadFlags(eventId: number, sessionId: number): Promise<FlagDuration[]> {
    const json = (await this.getJson(this.url('LoadFlags', { eventId, sessionId }))) as
      | Record<string, unknown>[]
      | null;
    return (json ?? []).map(flagDurationFromJson);
  }

  async loadCarControlLogs(eventId: number, car: string): Promise<CarControlLogs | null> {
    const json = (await this.getJson(this.url('LoadCarControlLogs', { eventId, car }))) as
      | Record<string, unknown>
      | null;
    return json ? carControlLogsFromJson(json) : null;
  }
}
