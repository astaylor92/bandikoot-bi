import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionState } from '../api/redmist/session-state';
import type { CarPosition } from '../api/redmist/car-position';
import { emptyCarPosition, emptySessionState } from './patch';
import { useSessionStore } from './sessionStore';

function state(sessionId: number, laps: number): SessionState {
  const cp: CarPosition = { ...emptyCarPosition('440'), lastLapCompleted: laps, lastLapTime: '00:02:00.000', totalTime: '00:10:00.000' };
  return { ...emptySessionState(), eventId: 410, sessionId, carPositions: [cp] };
}

describe('sessionStore session changes', () => {
  beforeEach(() => useSessionStore.getState().resetSession());

  it('starts a fresh lap history when the session changes under the same event', () => {
    const store = useSessionStore.getState();
    store.applyFullState(state(15, 150));
    expect(useSessionStore.getState().lapLog['440'].map((l) => l.lap)).toEqual([150]);
    useSessionStore.getState().applyFullState(state(16, 20));
    expect(useSessionStore.getState().lapLog['440'].map((l) => l.lap)).toEqual([20]);
  });

  it('keeps accumulating within a session', () => {
    useSessionStore.getState().applyFullState(state(15, 10));
    useSessionStore.getState().applyFullState(state(15, 11));
    expect(useSessionStore.getState().lapLog['440'].map((l) => l.lap)).toEqual([10, 11]);
  });
});

describe('lastCrossingAt', () => {
  beforeEach(() => useSessionStore.getState().resetSession());

  it('seeds from the feed clock on the first snapshot, then updates on real crossings', () => {
    const first = { ...state(15, 10), runningRaceTime: '00:10:20' }; // last crossing 20s before the clock
    const before = Date.now();
    useSessionStore.getState().applyFullState(first);
    const seeded = useSessionStore.getState().lastCrossingAt!;
    expect(before - seeded).toBeGreaterThanOrEqual(19_000);
    expect(before - seeded).toBeLessThan(22_000);

    useSessionStore.getState().applyFullState(state(15, 10)); // no new lap
    expect(useSessionStore.getState().lastCrossingAt).toBe(seeded);

    useSessionStore.getState().applyFullState(state(15, 11));
    expect(useSessionStore.getState().lastCrossingAt!).toBeGreaterThanOrEqual(before);
  });
});
