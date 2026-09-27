import { describe, expect, it, vi } from 'vitest';
import { HttpError, type RestClient } from '../api/restClient';
import type { Session } from '../api/redmist/session';
import type { SessionState } from '../api/redmist/session-state';
import { SnapshotSource, sessionsByRecency } from './snapshotSource';

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

const STATE = { sessionId: 15, carPositions: [{}] } as unknown as SessionState;
const EMPTY = { sessionId: 95, carPositions: [] } as unknown as SessionState;

function fakeRest(overrides: Partial<Record<keyof RestClient, unknown>>): RestClient {
  return overrides as unknown as RestClient;
}

describe('sessionsByRecency', () => {
  it('orders by start time, ignoring the isLive flag', () => {
    // Real shape from event 244: session 95 is flagged live but started first.
    const s = sessionsByRecency([
      session(5, '2026-06-26T13:00:01'),
      session(6, '2026-06-26T13:58:53'),
      session(7, '2026-06-27T12:58:33'),
      session(95, '2026-06-26T12:09:21', { isLive: true }),
    ]);
    expect(s.map((x) => x.id)).toEqual([7, 6, 5, 95]);
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

  it('skips a newer session with no cars (shadow session 95 after the race, event 408)', async () => {
    const results = vi.fn(async (_e: number, sid: number) => (sid === 95 ? EMPTY : STATE));
    const pub = fakeRest({
      loadSessions: vi.fn().mockResolvedValue([
        session(31, '2026-09-26T12:11:13'),
        session(95, '2026-09-26T22:47:54', { isLive: true }),
      ]),
      loadSessionResults: results,
    });
    const src = new SnapshotSource(408, pub, null);
    expect(await src.fetch()).toEqual({ state: STATE, source: 'public' });
    expect(results.mock.calls.map((c) => c[1])).toEqual([95, 31]);
    await src.fetch(); // cached: goes straight to 31
    expect(results.mock.calls.map((c) => c[1])).toEqual([95, 31, 31]);
  });

  it('when no session has cars, searches again only after a minute', async () => {
    let now = 0;
    const results = vi.fn().mockResolvedValue(EMPTY);
    const pub = fakeRest({
      loadSessions: vi.fn().mockResolvedValue([session(11, '2026-09-27T08:00:00'), session(95, '2026-09-27T07:00:00')]),
      loadSessionResults: results,
    });
    const src = new SnapshotSource(410, pub, null, () => now);
    expect((await src.fetch()).state).toBeNull();
    expect(results).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 10; i++) {
      now += 5_000;
      await src.fetch();
    }
    expect(pub.loadSessions).toHaveBeenCalledTimes(1);
    expect(results).toHaveBeenCalledTimes(2);
    now += 15_000;
    await src.fetch();
    expect(pub.loadSessions).toHaveBeenCalledTimes(2);
  });

  it('returns a null state when the event has no sessions', async () => {
    const pub = fakeRest({ loadSessions: vi.fn().mockResolvedValue([]), loadSessionResults: vi.fn() });
    const src = new SnapshotSource(410, pub, null);
    expect(await src.fetch()).toEqual({ state: null, source: 'public' });
  });
});
