import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransportHandlers } from './transport';
import type { SessionState } from '../api/redmist/session-state';
import type { CarPosition } from '../api/redmist/car-position';

const h = vi.hoisted(() => ({
  handlers: [] as TransportHandlers[],
  pending: [] as { eventId: number; resolve: (laps: unknown[]) => void }[],
}));

vi.mock('../api/signalrTransport', () => ({
  SignalRTransport: class {
    start() {
      return Promise.reject(new Error('no broker'));
    }
    stop() {
      return Promise.resolve();
    }
  },
}));

vi.mock('../api/pollingTransport', () => ({
  PollingTransport: class {
    constructor(_e: number, handlers: TransportHandlers) {
      h.handlers.push(handlers);
    }
    start() {
      return Promise.resolve();
    }
    stop() {
      return Promise.resolve();
    }
  },
}));

vi.mock('../api/restClient', async (orig) => {
  const real = await orig<typeof import('../api/restClient')>();
  class RestClient {
    loadSessionLaps(eventId: number) {
      return new Promise((resolve) => h.pending.push({ eventId, resolve }));
    }
  }
  return { ...real, RestClient };
});

const { connectLive } = await import('./connect');
const { useSessionStore } = await import('./sessionStore');
const { emptyCarPosition, emptySessionState } = await import('./patch');

function snapshot(eventId: number, sessionId: number): SessionState {
  return { ...emptySessionState(), eventId, sessionId, carPositions: [] };
}

function lapRow(car: string, lap: number): CarPosition {
  return { ...emptyCarPosition(car), lastLapCompleted: lap, lastLapTime: '00:02:00.000', totalTime: '00:02:00.000' };
}

describe('lap-history seeding across connections', () => {
  beforeEach(() => {
    h.handlers.length = 0;
    h.pending.length = 0;
  });

  it("discards a previous event's lap download that finishes after switching events", async () => {
    await connectLive(100, 'A');
    h.handlers[0].onFullState(snapshot(100, 1));
    expect(h.pending).toHaveLength(1);

    await connectLive(200, 'B');
    h.handlers[1].onFullState(snapshot(200, 2));
    expect(h.pending).toHaveLength(2); // B's seed wasn't blocked by A's in-flight one

    h.pending[0].resolve([lapRow('440', 7)]);
    await new Promise((r) => setTimeout(r, 0));
    expect(useSessionStore.getState().lapLog['440']).toBeUndefined();

    h.pending[1].resolve([lapRow('440', 3)]);
    await new Promise((r) => setTimeout(r, 0));
    expect(useSessionStore.getState().lapLog['440'].map((l) => l.lap)).toEqual([3]);
  });
});
