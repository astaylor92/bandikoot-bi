import { useMemo } from 'react';
import { useSessionStore } from '../../data/sessionStore';
import { useAppStore, useDriverChangeOverrides } from '../../state/appStore';
import { fieldIntel, type CarIntel } from '../../strategy/fieldIntel';

/** Derived per-car intel (stops, driver stints, reclasses) for the whole field. */
export function useFieldIntel(): Record<string, CarIntel> {
  const lapLog = useSessionStore((s) => s.lapLog);
  const strategy = useAppStore((s) => s.strategy);
  const overrides = useDriverChangeOverrides();
  return useMemo(
    () =>
      fieldIntel({
        lapLog,
        rules: {
          driverChangeMinStopMs: strategy.driverChangeMinStopMin * 60_000,
          refuelMinStopMs: strategy.refuelMinStopMin * 60_000,
        },
        driverChangeOverrides: overrides,
      }),
    [lapLog, strategy.driverChangeMinStopMin, strategy.refuelMinStopMin, overrides],
  );
}
