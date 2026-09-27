import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReplayProgress } from '../replay/replayTransport';

export type View =
  | { name: 'events' }
  | { name: 'board' }
  | { name: 'car'; car: string }
  | { name: 'strategy' }
  | { name: 'plan' }
  | { name: 'rival' }
  | { name: 'settings' };

export type SessionMode = 'live' | 'replay' | null;

export interface StintConfigStored {
  raceLengthMin: number;
  maxStintMin: number;
  minPitMin: number;
  drivers: string[];
}

/** Global strategy assumptions; see docs/strategy-models.md. */
export interface StrategyDefaults {
  /** Max continuous driver time (LDRL: 2 h). */
  maxStintMin: number;
  tankGal: number;
  gph: number;
  /** Safety margin before the tank is predicted empty. */
  reserveMin: number;
  /** Stops at least this long are assumed to change driver. */
  driverChangeMinStopMin: number;
  /** Stops at least this long are assumed to refuel. */
  refuelMinStopMin: number;
  /** Laps shown in lap-time sparklines. */
  sparkLaps: number;
}

export const DEFAULT_STRATEGY: StrategyDefaults = {
  maxStintMin: 120,
  tankGal: 14,
  gph: 5,
  reserveMin: 5,
  driverChangeMinStopMin: 4,
  refuelMinStopMin: 4,
  sparkLaps: 10,
};

export interface CarOverride {
  tankGal?: number;
  gph?: number;
  maxStintMin?: number;
}

export const DEFAULT_STINT_CONFIG: StintConfigStored = {
  raceLengthMin: 480,
  maxStintMin: 120,
  minPitMin: 5, // Lucky Dog minimum stop — always confirm against the current rulebook
  drivers: ['Driver 1', 'Driver 2', 'Driver 3'],
};

interface AppStore {
  view: View;
  mode: SessionMode;
  eventId: number | null;
  eventLabel: string;
  replay: ReplayProgress | null;

  // Persisted preferences
  brokerUrl: string;
  teamKey: string;
  myCarByEvent: Record<string, string>;
  targetClassPosByEvent: Record<string, number>;
  stintConfigByEvent: Record<string, StintConfigStored>;
  strategy: StrategyDefaults;
  /** event key -> car -> fuel/stint overrides */
  carOverridesByEvent: Record<string, Record<string, CarOverride>>;
  /** event key -> car -> stop lap -> is a driver change (manual correction) */
  driverChangeOverridesByEvent: Record<string, Record<string, Record<number, boolean>>>;
  /** event key -> rival car numbers, primary first (max 3) */
  rivalsByEvent: Record<string, string[]>;

  navigate(view: View): void;
  setSession(mode: SessionMode, eventId: number | null, label?: string): void;
  setReplayProgress(p: ReplayProgress | null): void;
  setBroker(url: string, teamKey: string): void;
  setMyCar(car: string): void;
  setTargetClassPos(pos: number): void;
  setStintConfig(cfg: StintConfigStored): void;
  setStrategy(patch: Partial<StrategyDefaults>): void;
  setCarOverride(car: string, patch: CarOverride | null): void;
  setDriverChangeOverride(car: string, lap: number, value: boolean | null): void;
  toggleRival(car: string): void;
  setPrimaryRival(car: string): void;
}

export function eventKey(mode: SessionMode, eventId: number | null): string {
  return `${mode ?? 'none'}:${eventId ?? 0}`;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      view: { name: 'events' },
      mode: null,
      eventId: null,
      eventLabel: '',
      replay: null,

      brokerUrl: '/api/token',
      teamKey: '',
      myCarByEvent: {},
      targetClassPosByEvent: {},
      stintConfigByEvent: {},
      strategy: DEFAULT_STRATEGY,
      carOverridesByEvent: {},
      driverChangeOverridesByEvent: {},
      rivalsByEvent: {},

      navigate: (view) => set({ view }),
      setSession: (mode, eventId, label = '') =>
        set({ mode, eventId, eventLabel: label, replay: null }),
      setReplayProgress: (p) => set({ replay: p }),
      setBroker: (brokerUrl, teamKey) => set({ brokerUrl, teamKey }),
      setMyCar: (car) => {
        const { mode, eventId, myCarByEvent } = get();
        set({ myCarByEvent: { ...myCarByEvent, [eventKey(mode, eventId)]: car } });
      },
      setTargetClassPos: (pos) => {
        const { mode, eventId, targetClassPosByEvent } = get();
        set({ targetClassPosByEvent: { ...targetClassPosByEvent, [eventKey(mode, eventId)]: pos } });
      },
      setStintConfig: (cfg) => {
        const { mode, eventId, stintConfigByEvent } = get();
        set({ stintConfigByEvent: { ...stintConfigByEvent, [eventKey(mode, eventId)]: cfg } });
      },
      setStrategy: (patch) => set({ strategy: { ...get().strategy, ...patch } }),
      setCarOverride: (car, patch) => {
        const { mode, eventId, carOverridesByEvent } = get();
        const key = eventKey(mode, eventId);
        const cars = { ...(carOverridesByEvent[key] ?? {}) };
        if (patch === null) delete cars[car];
        else cars[car] = { ...cars[car], ...patch };
        set({ carOverridesByEvent: { ...carOverridesByEvent, [key]: cars } });
      },
      setDriverChangeOverride: (car, lap, value) => {
        const { mode, eventId, driverChangeOverridesByEvent } = get();
        const key = eventKey(mode, eventId);
        const cars = { ...(driverChangeOverridesByEvent[key] ?? {}) };
        const laps = { ...(cars[car] ?? {}) };
        if (value === null) delete laps[lap];
        else laps[lap] = value;
        cars[car] = laps;
        set({ driverChangeOverridesByEvent: { ...driverChangeOverridesByEvent, [key]: cars } });
      },
      toggleRival: (car) => {
        const { mode, eventId, rivalsByEvent } = get();
        const key = eventKey(mode, eventId);
        const cur = rivalsByEvent[key] ?? [];
        // At capacity, drop the oldest secondary rival — never the primary.
        const next = cur.includes(car)
          ? cur.filter((c) => c !== car)
          : cur.length < 3
            ? [...cur, car]
            : [cur[0], ...cur.slice(2), car];
        set({ rivalsByEvent: { ...rivalsByEvent, [key]: next } });
      },
      setPrimaryRival: (car) => {
        const { mode, eventId, rivalsByEvent } = get();
        const key = eventKey(mode, eventId);
        const cur = (rivalsByEvent[key] ?? []).filter((c) => c !== car);
        set({ rivalsByEvent: { ...rivalsByEvent, [key]: [car, ...cur].slice(0, 3) } });
      },
    }),
    {
      // Pre-rebrand key kept on purpose: renaming it would wipe everyone's saved settings.
      name: 'pitwall-settings',
      partialize: (s) => ({
        brokerUrl: s.brokerUrl,
        teamKey: s.teamKey,
        myCarByEvent: s.myCarByEvent,
        targetClassPosByEvent: s.targetClassPosByEvent,
        stintConfigByEvent: s.stintConfigByEvent,
        strategy: s.strategy,
        carOverridesByEvent: s.carOverridesByEvent,
        driverChangeOverridesByEvent: s.driverChangeOverridesByEvent,
        rivalsByEvent: s.rivalsByEvent,
      }),
      // Older saved settings lack newer fields; fill them from defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppStore>;
        return { ...current, ...p, strategy: { ...DEFAULT_STRATEGY, ...(p.strategy ?? {}) } };
      },
    },
  ),
);

export function useMyCar(): string {
  return useAppStore((s) => s.myCarByEvent[eventKey(s.mode, s.eventId)] ?? '');
}

export function useTargetClassPos(): number {
  return useAppStore((s) => s.targetClassPosByEvent[eventKey(s.mode, s.eventId)] ?? 1);
}

export function useStintConfig(): StintConfigStored {
  const stored = useAppStore((s) => s.stintConfigByEvent[eventKey(s.mode, s.eventId)]);
  const maxStintMin = useAppStore((s) => s.strategy.maxStintMin);
  return stored ?? { ...DEFAULT_STINT_CONFIG, maxStintMin };
}

const NO_OVERRIDES: Record<string, never> = {};
const NO_RIVALS: string[] = [];

export function useCarOverrides(): Record<string, CarOverride> {
  return useAppStore((s) => s.carOverridesByEvent[eventKey(s.mode, s.eventId)] ?? NO_OVERRIDES);
}

export function useDriverChangeOverrides(): Record<string, Record<number, boolean>> {
  return useAppStore((s) => s.driverChangeOverridesByEvent[eventKey(s.mode, s.eventId)] ?? NO_OVERRIDES);
}

export function useRivals(): string[] {
  return useAppStore((s) => s.rivalsByEvent[eventKey(s.mode, s.eventId)] ?? NO_RIVALS);
}
