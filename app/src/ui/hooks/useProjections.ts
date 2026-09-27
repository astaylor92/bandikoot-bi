import { useMemo } from 'react';
import { useSessionStore } from '../../data/sessionStore';
import { useStintConfig } from '../../state/appStore';
import { carStrategyData, liveProjections } from '../../strategy/liveInputs';
import { useRaceClock } from './useRaceClock';
import { remainingPitLossMs } from '../../strategy/nextPit';
import type { CarIntel } from '../../strategy/fieldIntel';
import { Flags } from '../../api/redmist/flags';

/** Finish projections for the field, net of each car's remaining pit time. */
export function useProjections(intel: Record<string, CarIntel>) {
  const session = useSessionStore((s) => s.session);
  const cars = useSessionStore((s) => s.cars);
  const lapLog = useSessionStore((s) => s.lapLog);
  const minPitMs = useStintConfig().minPitMin * 60_000;
  const clock = useRaceClock();

  const data = useMemo(() => carStrategyData(cars, lapLog), [cars, lapLog]);
  const pitLoss = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [car, ci] of Object.entries(intel)) {
      if (ci.next) out[car] = remainingPitLossMs(ci.next, ci.stints, minPitMs);
    }
    return out;
  }, [intel, minPitMs]);
  const redFlag = session.currentFlag === Flags.Red;
  const projections = useMemo(
    () => (clock.raceEndMs !== null ? liveProjections(data, clock.raceEndMs, clock.elapsedMs, pitLoss, redFlag) : []),
    [data, clock.raceEndMs, clock.elapsedMs, pitLoss, redFlag],
  );
  return { data, projections, clock, minPitMs };
}
