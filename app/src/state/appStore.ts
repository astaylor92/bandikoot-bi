import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReplayProgress } from '../replay/replayTransport';

export type View =
  | { name: 'events' }
  | { name: 'board' }
  | { name: 'car'; car: string }
  | { name: 'strategy' }
  | { name: 'plan' }
  | { name: 'settings' };

export type SessionMode = 'live' | 'replay' | null;

export interface StintConfigStored {
  raceLengthMin: number;
  maxStintMin: number;
  minPitMin: number;
  drivers: string[];
}

export const DEFAULT_STINT_CONFIG: StintConfigStored = {
  raceLengthMin: 480,
  maxStintMin: 110,
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

  navigate(view: View): void;
  setSession(mode: SessionMode, eventId: number | null, label?: string): void;
  setReplayProgress(p: ReplayProgress | null): void;
  setBroker(url: string, teamKey: string): void;
  setMyCar(car: string): void;
  setTargetClassPos(pos: number): void;
  setStintConfig(cfg: StintConfigStored): void;
}

function eventKey(mode: SessionMode, eventId: number | null): string {
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
      }),
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
  return useAppStore((s) => s.stintConfigByEvent[eventKey(s.mode, s.eventId)] ?? DEFAULT_STINT_CONFIG);
}
