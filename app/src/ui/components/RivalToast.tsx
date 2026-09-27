import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../../data/sessionStore';
import { useAppStore, useRivals } from '../../state/appStore';

const SHOW_MS = 20_000;

/** Pops a toast on any tab when a rival enters the pits; tap to open the Rival page. */
export function RivalToast() {
  const rivals = useRivals();
  const cars = useSessionStore((s) => s.cars);
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const prev = useRef<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ car: string; at: number } | null>(null);

  useEffect(() => {
    for (const r of rivals) {
      const inPit = cars[r]?.isInPit ?? false;
      if (inPit && prev.current[r] === false) setToast({ car: r, at: Date.now() });
      prev.current[r] = inPit;
    }
  }, [cars, rivals]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast || view.name === 'rival') return null;
  return (
    <button
      onClick={() => {
        setToast(null);
        navigate({ name: 'rival' });
      }}
      className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-accent px-4 py-2 font-bold text-black shadow-lg"
    >
      Rival #{toast.car} is pitting — open Rival ▸
    </button>
  );
}
