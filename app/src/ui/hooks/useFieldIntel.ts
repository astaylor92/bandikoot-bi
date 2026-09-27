import { useMemo } from 'react';
import { useSessionStore } from '../../data/sessionStore';
import { useAppStore, useCarOverrides, useDriverChangeOverrides } from '../../state/appStore';
import { fieldIntel, type CarIntel } from '../../strategy/fieldIntel';
import { raceClock } from '../../strategy/liveInputs';

/** Derived per-car intel (stops, driver stints, reclasses, next pit) for the whole field. */
export function useFieldIntel(): Record<string, CarIntel> {
  const lapLog = useSessionStore((s) => s.lapLog);
  const cars = useSessionStore((s) => s.cars);
  const session = useSessionStore((s) => s.session);
  const strategy = useAppStore((s) => s.strategy);
  const overrides = useDriverChangeOverrides();
  const carOverrides = useCarOverrides();
  const { elapsedMs, raceEndMs } = raceClock(session);
  return useMemo(
    () =>
      fieldIntel({
        lapLog,
        cars,
        rules: {
          driverChangeMinStopMs: strategy.driverChangeMinStopMin * 60_000,
          refuelMinStopMs: strategy.refuelMinStopMin * 60_000,
        },
        driverChangeOverrides: overrides,
        assumptionsFor: (car) => {
          const o = carOverrides[car] ?? {};
          return {
            maxStintMs: (o.maxStintMin ?? strategy.maxStintMin) * 60_000,
            tankGal: o.tankGal ?? strategy.tankGal,
            gph: o.gph ?? strategy.gph,
            reserveMs: strategy.reserveMin * 60_000,
          };
        },
        nowMs: elapsedMs,
        raceEndMs,
      }),
    [lapLog, cars, strategy, overrides, carOverrides, elapsedMs, raceEndMs],
  );
}
