import { useSessionStore } from '../../data/sessionStore';
import { useStintConfig } from '../../state/appStore';
import { raceClock, type RaceClock } from '../../strategy/liveInputs';

/** Race clock with the Pit Plan race length as the last-resort fallback. */
export function useRaceClock(): RaceClock {
  const session = useSessionStore((s) => s.session);
  const raceLengthMin = useStintConfig().raceLengthMin;
  return raceClock(session, raceLengthMin * 60_000);
}
