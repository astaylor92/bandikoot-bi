import type { SessionState } from '../api/redmist/session-state';
import type { Session } from '../api/redmist/session';
import type { RestClient } from '../api/restClient';

export type FeedSource = 'token' | 'public';

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

/**
 * Fetches the full session snapshot. Uses the authenticated live snapshot
 * (GetCurrentSessionStateJson) when a token client is available; otherwise —
 * or when auth fails — falls back to the public LoadSessionResults for the
 * current session, which returns the same SessionState shape.
 */
export class SnapshotSource {
  private sessionId: number | null = null;
  private sessionResolvedAt: number | null = null;
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
    return { state: await this.fetchPublic(), source: 'public' };
  }

  private async fetchPublic(): Promise<SessionState | null> {
    // Searching costs a request per session, so do it at most once a minute —
    // even when the last search found nothing (e.g. race morning, pre-qualifying).
    const due = this.sessionResolvedAt === null || this.now() - this.sessionResolvedAt > SESSION_RESOLVE_MS;
    if (!due) {
      if (this.sessionId === null) return null;
      const state = await this.publicRest.loadSessionResults(this.eventId, this.sessionId);
      return hasCars(state) ? state : null;
    }
    // Resolve: newest session with cars wins; remember it until the next resolve.
    this.sessionResolvedAt = this.now();
    const candidates = sessionsByRecency(await this.publicRest.loadSessions(this.eventId));
    for (const session of candidates) {
      const state = await this.publicRest.loadSessionResults(this.eventId, session.id);
      if (hasCars(state)) {
        this.sessionId = session.id;
        return state;
      }
    }
    this.sessionId = null;
    return null;
  }
}
