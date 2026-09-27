import { describe, expect, it, vi } from 'vitest';
import { HttpError, type RestClient } from '../api/restClient';
import type { Session } from '../api/redmist/session';
import type { SessionState } from '../api/redmist/session-state';
import { SnapshotSource, pickCurrentSession } from './snapshotSource';

function session(id: number, start: string, extra: Partial<Session> = {}): Session {
  return {
    id,
    eventId: 410,
    name: `S${id}`,
    startTime: start as unknown as Date,
    endTime: null,
    localTimeZoneOffset: -4,
    lastUpdated: null,
    isLive: false,
    isPracticeQualifying: false,
    ...extra,
  };
}

const STATE = { sessionId: 15 } as SessionState;

function fakeRest(overrides: Partial<Record<keyof RestClient, unknown>>): RestClient {
  return overrides as unknown as RestClient;
}

describe('pickCurrentSession', () => {
  it('picks the latest-started session and ignores the shadow session 95', () => {
    // Real shape from event 244: session 95 is flagged live but started first.
    const s = pickCurrentSession([
      session(5, '2026-06-26T13:00:01'),
      session(6, '2026-06-26T13:58:53'),
      session(7, '2026-06-27T12:58:33'),
      session(95, '2026-06-26T12:09:21', { isLive: true }),
    ]);
    expect(s?.id).toBe(7);
  });
  it('returns null for no sessions', () => {
    expect(pickCurrentSession([])).toBeNull();
  });
});

describe('SnapshotSource', () => {
  it('uses the authenticated snapshot when a token client works', async () => {
    const authed = fakeRest({ getCurrentSessionState: vi.fn().mockResolvedValue(STATE) });
    const pub = fakeRest({ loadSessions: vi.fn(), loadSessionResults: vi.fn() });
    const src = new SnapshotSource(410, pub, authed);
    expect(await src.fetch()).toEqual({ state: STATE, source: 'token' });
    expect(pub.loadSessionResults).not.toHaveBeenCalled();
  });

  it('falls back to public results on 401 and waits before retrying the token', async () => {
    let now = 0;
    const getCurrent = vi.fn().mockRejectedValue(new HttpError(401, 'x'));
    const authed = fakeRest({ getCurrentSessionState: getCurrent });
    const pub = fakeRest({
      loadSessions: vi.fn().mockResolvedValue([session(15, '2026-09-26T14:01:08')]),
      loadSessionResults: vi.fn().mockResolvedValue(STATE),
    });
    const src = new SnapshotSource(410, pub, authed, () => now);

    expect(await src.fetch()).toEqual({ state: STATE, source: 'public' });
    expect(pub.loadSessionResults).toHaveBeenCalledWith(410, 15);

    now += 10_000;
    await src.fetch();
    expect(getCurrent).toHaveBeenCalledTimes(1);

    now += 5 * 60_000;
    await src.fetch();
    expect(getCurrent).toHaveBeenCalledTimes(2);
  });

  it('uses public results without a token client and caches the session id', async () => {
    let now = 0;
    const pub = fakeRest({
      loadSessions: vi.fn().mockResolvedValue([session(15, '2026-09-26T14:01:08')]),
      loadSessionResults: vi.fn().mockResolvedValue(STATE),
    });
    const src = new SnapshotSource(410, pub, null, () => now);
    await src.fetch();
    now += 5_000;
    await src.fetch();
    expect(pub.loadSessions).toHaveBeenCalledTimes(1);
    now += 61_000;
    await src.fetch();
    expect(pub.loadSessions).toHaveBeenCalledTimes(2);
  });

  it('returns a null state when the event has no sessions', async () => {
    const pub = fakeRest({ loadSessions: vi.fn().mockResolvedValue([]), loadSessionResults: vi.fn() });
    const src = new SnapshotSource(410, pub, null);
    expect(await src.fetch()).toEqual({ state: null, source: 'public' });
  });
});
