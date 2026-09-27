import { RestClient, DEFAULT_API_BASE } from '../api/restClient';
import { SnapshotSource } from './snapshotSource';
import { TokenProvider } from '../api/tokenProvider';
import { SignalRTransport } from '../api/signalrTransport';
import { PollingTransport } from '../api/pollingTransport';
import { ReplayTransport } from '../replay/replayTransport';
import { SUPPORTED_FIXTURE_FORMATS, type LapReplayFixture } from '../replay/fixture';
import type { Transport, TransportHandlers } from './transport';
import { useSessionStore, lapRecordFromCarPosition, type LapRecord } from './sessionStore';
import { useAppStore } from '../state/appStore';

const rest = new RestClient();

let active: Transport | null = null;
let activeReplay: ReplayTransport | null = null;
let seededSessionId: number | null = null;
let seededAt = 0;
let seeding = false;
/** Bumped on every connect/disconnect so in-flight lap downloads from an old connection are discarded. */
let generation = 0;

function resetSeeding(): void {
  generation++;
  seededSessionId = null;
  seededAt = 0;
  seeding = false;
}

// Full lap history is ~5 MB for an endurance race, so it's refreshed slowly;
// per-poll diffs fill the gaps in between.
const RESEED_MS = 3 * 60_000;

function storeHandlers(): TransportHandlers {
  const store = useSessionStore.getState();
  return {
    onFullState: (state) => {
      useSessionStore.getState().applyFullState(state);
    },
    onSessionPatch: (patch) => useSessionStore.getState().applySessionPatch(patch),
    onCarPatches: (patches) => useSessionStore.getState().applyCarPatches(patches),
    // Transports send a car's complete history (replay scrubbing), so replace rather than merge.
    onLapHistory: (car, laps) => useSessionStore.getState().replaceLapLog(car, laps),
    onStatus: (status, detail) => useSessionStore.getState().setConnection(status, detail),
    onFeedSource: (source) => useSessionStore.getState().setFeedSource(source),
    onReset: () => {
      // Keep entries/laps; the transport follows a reset with a fresh snapshot.
      void store;
    },
  };
}

/**
 * Seed the lap log from LoadSessionLaps when the session changes, then
 * re-seed every few minutes. Live accumulation only sees laps completed while
 * we watch (and only the laps visible between polls); this backfills the rest.
 */
async function seedLapsFromRest(eventId: number, sessionId: number): Promise<void> {
  if (seeding) return;
  if (seededSessionId === sessionId && Date.now() - seededAt < RESEED_MS) return;
  const gen = generation;
  seeding = true;
  seededSessionId = sessionId;
  seededAt = Date.now();
  try {
    const laps = await rest.loadSessionLaps(eventId, sessionId);
    // The crew may have switched event/session while ~5 MB downloaded.
    if (gen !== generation || useSessionStore.getState().session.sessionId !== sessionId) return;
    const byCar = new Map<string, LapRecord[]>();
    for (const cp of laps) {
      if (!cp.number) continue;
      const rec = lapRecordFromCarPosition(cp);
      if (!rec) continue;
      const arr = byCar.get(cp.number);
      if (arr) arr.push(rec);
      else byCar.set(cp.number, [rec]);
    }
    const store = useSessionStore.getState();
    for (const [car, recs] of byCar) store.seedLapLog(car, recs);
  } catch {
    if (gen === generation) seededSessionId = null; // retry on next snapshot
  } finally {
    if (gen === generation) seeding = false;
  }
}

/** Red Mist's published event schedule + track time zone, for the race clock. Best effort. */
async function loadPublishedSchedule(eventId: number): Promise<void> {
  const gen = generation;
  try {
    const [event, sessions] = await Promise.all([rest.loadEvent(eventId), rest.loadSessions(eventId)]);
    if (gen !== generation || !event?.schedule) return;
    const tzHours = sessions.find((s) => typeof s.localTimeZoneOffset === 'number')?.localTimeZoneOffset ?? 0;
    const entries = event.schedule.entries.map((e) => ({
      day: String(e.dayOfEvent),
      start: String(e.startTime),
      end: String(e.endTime),
      name: e.name,
    }));
    useSessionStore.getState().setPublished({ entries, tzHours });
  } catch {
    // No schedule: the clock falls back to the session name / Pit Plan length.
  }
}

export async function connectLive(eventId: number, label: string): Promise<void> {
  await disconnect();
  useSessionStore.getState().resetSession();
  useAppStore.getState().setSession('live', eventId, label);
  resetSeeding();

  const base = storeHandlers();
  const handlers: TransportHandlers = {
    ...base,
    onFullState: (state) => {
      base.onFullState(state);
      if (state.sessionId) void seedLapsFromRest(eventId, state.sessionId);
    },
  };

  void loadPublishedSchedule(eventId);

  const { brokerUrl, teamKey } = useAppStore.getState();
  const tokens = new TokenProvider(brokerUrl, teamKey || undefined);
  const authed = brokerUrl ? new RestClient(DEFAULT_API_BASE, () => tokens.getToken()) : null;
  const snapshots = new SnapshotSource(eventId, rest, authed);
  const signalr = new SignalRTransport(eventId, handlers, snapshots, tokens);
  try {
    await signalr.start();
    active = signalr;
  } catch {
    // No broker / no credentials / hub unreachable -> public REST polling.
    await signalr.stop().catch(() => {});
    const polling = new PollingTransport(eventId, handlers, snapshots);
    await polling.start();
    active = polling;
  }
}

export async function connectReplay(fixtureUrl: string, label: string): Promise<void> {
  await disconnect();
  useSessionStore.getState().resetSession();

  const res = await fetch(fixtureUrl);
  if (!res.ok) throw new Error(`Failed to load replay fixture: HTTP ${res.status}`);
  const fixture = (await res.json()) as LapReplayFixture;
  if (!(SUPPORTED_FIXTURE_FORMATS as readonly string[]).includes(fixture.format)) {
    throw new Error(`Unsupported fixture format: ${String(fixture.format)}`);
  }

  useAppStore.getState().setSession('replay', fixture.eventId, label || fixture.eventName);

  const handlers = storeHandlers();
  const replay = new ReplayTransport(fixture, handlers, (p) =>
    useAppStore.getState().setReplayProgress(p),
  );
  await replay.start();
  active = replay;
  activeReplay = replay;
}

export function getActiveReplay(): ReplayTransport | null {
  return activeReplay;
}

export async function disconnect(): Promise<void> {
  resetSeeding();
  const t = active;
  active = null;
  activeReplay = null;
  if (t) await t.stop().catch(() => {});
  useSessionStore.getState().setConnection('idle');
  useAppStore.getState().setReplayProgress(null);
}

export { rest as restClient };
