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
 * The event's current session is the one that started most recently. The
 * isLive/endTime flags aren't reliable: Red Mist keeps a long-lived shadow
 * session (id 95) that can stay flagged live across whole weekends.
 */
export function pickCurrentSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) return null;
  return [...sessions].sort((a, b) => toTime(b.startTime) - toTime(a.startTime))[0];
}

/**
 * Fetches the full session snapshot. Uses the authenticated live snapshot
 * (GetCurrentSessionStateJson) when a token client is available; otherwise —
 * or when auth fails — falls back to the public LoadSessionResults for the
 * current session, which returns the same SessionState shape.
 */
export class SnapshotSource {
  private sessionId: number | null = null;
  private sessionResolvedAt = 0;
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
    if (this.sessionId === null || this.now() - this.sessionResolvedAt > SESSION_RESOLVE_MS) {
      const sessions = await this.publicRest.loadSessions(this.eventId);
      const current = pickCurrentSession(sessions);
      this.sessionId = current?.id ?? null;
      this.sessionResolvedAt = this.now();
    }
    if (this.sessionId === null) return null;
    return this.publicRest.loadSessionResults(this.eventId, this.sessionId);
  }
}
