import type { SessionState } from '../api/redmist/session-state';
import type { Session } from '../api/redmist/session';
import type { RestClient } from '../api/restClient';
import { sessionStateFromLaps, type SnapshotContext } from './lapsSnapshot';

/** token = authenticated live snapshot; public = LoadSessionResults; public-laps = built from live lap history. */
export type FeedSource = 'token' | 'public' | 'public-laps';

export interface Snapshot {
  state: SessionState | null;
  source: FeedSource;
}

const SESSION_RESOLVE_MS = 60_000;
const TOKEN_RETRY_MS = 5 * 60_000;

function toTime(value: unknown): number {
  if (!value) return 0;
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Sessions newest-first by start time. The first one with cars on the board is
 * the current session. isLive/endTime can't be trusted, and Red Mist's shadow
 * session (id 95) can even be the most recently started — with no cars (seen
 * on event 408 after its race ended), so emptiness has to be checked.
 */
export function sessionsByRecency(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => toTime(b.startTime) - toTime(a.startTime));
}

const hasCars = (s: SessionState | null): s is SessionState => !!s && s.carPositions.length > 0;

/** Red Mist's long-lived shadow session: often open and empty, never the real race. */
const SHADOW_SESSION_ID = 95;

/** The live lap history grows to ~5 MB over a race, so it's pulled at most this often. */
const LAPS_REFRESH_MS = 20_000;

function contextFrom(state: SessionState): SnapshotContext {
  return {
    eventEntries: state.eventEntries,
    classColors: state.classColors,
    classOrder: state.classOrder,
    eventName: state.eventName,
  };
}

/**
 * Fetches the full session snapshot. Uses the authenticated live snapshot
 * (GetCurrentSessionStateJson) when a token client is available; otherwise —
 * or when auth fails — falls back to public endpoints: LoadSessionResults for
 * sessions that have results, or the live lap history for a running session.
 */
export class SnapshotSource {
  private current: { session: Session; mode: 'results' | 'laps' } | null = null;
  private sessionResolvedAt: number | null = null;
  private lapsCache: { sessionId: number; at: number; state: SessionState | null } | null = null;
  private ctx: SnapshotContext | null = null;
  private tokenFailedAt: number | null = null;

  constructor(
    private eventId: number,
    private publicRest: RestClient,
    private authedRest: RestClient | null,
    private now: () => number = Date.now,
  ) {}

  async fetch(): Promise<Snapshot> {
    const tokenUsable =
      this.authedRest !== null &&
      (this.tokenFailedAt === null || this.now() - this.tokenFailedAt > TOKEN_RETRY_MS);
    if (tokenUsable && this.authedRest) {
      try {
        const state = await this.authedRest.getCurrentSessionState(this.eventId);
        this.tokenFailedAt = null;
        return { state, source: 'token' };
      } catch {
        // Broker down, token rejected, or snapshot endpoint erroring: the
        // public path still works, so fall back rather than blank the board.
        this.tokenFailedAt = this.now();
      }
    }
    return this.fetchPublic();
  }

  private async fetchPublic(): Promise<Snapshot> {
    // Searching costs a request per session, so do it at most once a minute —
    // even when the last search found nothing (e.g. race morning, pre-qualifying).
    const due = this.sessionResolvedAt === null || this.now() - this.sessionResolvedAt > SESSION_RESOLVE_MS;
    if (!due) {
      if (!this.current) return { state: null, source: 'public' };
      if (this.current.mode === 'laps') {
        return { state: await this.lapsState(this.current.session, false), source: 'public-laps' };
      }
      const state = await this.publicRest.loadSessionResults(this.eventId, this.current.session.id);
      return { state: hasCars(state) ? state : null, source: 'public' };
    }

    // Resolve, newest session first:
    //  - a session with results (finished, or populated) wins;
    //  - a running session has no public results (HTTP 204) — build it from its live laps;
    //  - never fall back to an older, finished session while a newer real one is running.
    this.sessionResolvedAt = this.now();
    this.current = null;
    for (const session of sessionsByRecency(await this.publicRest.loadSessions(this.eventId))) {
      const results = await this.publicRest.loadSessionResults(this.eventId, session.id);
      if (hasCars(results)) {
        this.ctx ??= contextFrom(results);
        this.current = { session, mode: 'results' };
        return { state: results, source: 'public' };
      }
      const running = !session.endTime && session.id !== SHADOW_SESSION_ID;
      if (!running) continue;
      await this.ensureContext(session.id);
      const live = await this.lapsState(session, true);
      if (hasCars(live)) {
        this.current = { session, mode: 'laps' };
        return { state: live, source: 'public-laps' };
      }
      // Started but nobody has crossed yet: wait rather than show an older race.
      return { state: null, source: 'public-laps' };
    }
    return { state: null, source: 'public' };
  }

  private async lapsState(session: Session, force: boolean): Promise<SessionState | null> {
    const c = this.lapsCache;
    if (!force && c && c.sessionId === session.id && this.now() - c.at < LAPS_REFRESH_MS) return c.state;
    const laps = await this.publicRest.loadSessionLaps(this.eventId, session.id);
    const state = sessionStateFromLaps(laps, session, this.eventId, this.ctx);
    this.lapsCache = { sessionId: session.id, at: this.now(), state };
    return state;
  }

  /** Team names and class colours come from any finished session of the same event. */
  private async ensureContext(excludeSessionId: number): Promise<void> {
    if (this.ctx) return;
    const sessions = sessionsByRecency(await this.publicRest.loadSessions(this.eventId));
    for (const s of sessions) {
      if (s.id === excludeSessionId) continue;
      const r = await this.publicRest.loadSessionResults(this.eventId, s.id);
      if (hasCars(r)) {
        this.ctx = contextFrom(r);
        return;
      }
    }
  }
}
