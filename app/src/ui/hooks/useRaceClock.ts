import { Flags } from '../../api/redmist/flags';
import { useSessionStore } from '../../data/sessionStore';
import { useAppStore, useScheduleOverride, useStintConfig } from '../../state/appStore';
import { raceClock, scheduledRaceClock, type RaceClock } from '../../strategy/liveInputs';
import { scheduleStatus, segmentsFromPublished, type RaceSegment } from '../../strategy/schedule';

/**
 * The race's segments for a live event: this device's manual schedule, else
 * Red Mist's published one (same on every device). Dry Runs have none — their
 * clock is simulated, not wall time.
 */
export function useRaceSegments(nowMs: number): { segments: RaceSegment[] | null; manual: boolean } {
  const mode = useAppStore((s) => s.mode);
  const override = useScheduleOverride();
  const published = useSessionStore((s) => s.published);
  if (mode !== 'live') return { segments: null, manual: false };
  if (override) return { segments: override, manual: true };
  return {
    segments: published ? segmentsFromPublished(published.entries, published.tzHours, nowMs) : null,
    manual: false,
  };
}

/**
 * Race clock, most trusted first: a race schedule (manual, then Red Mist's
 * published one), a real feed countdown, the session-name length, then the
 * Pit Plan race length.
 */
export function useRaceClock(): RaceClock {
  const session = useSessionStore((s) => s.session);
  const raceLengthMin = useStintConfig().raceLengthMin;
  const now = Date.now();
  const { segments } = useRaceSegments(now);
  if (segments && segments.length) {
    const status = scheduleStatus(now, segments);
    // A schedule for a different day (all past/future far away) shouldn't win over the feed.
    if (status.phase !== 'finished' || session.currentFlag === Flags.Checkered) return scheduledRaceClock(session, status);
  }
  return raceClock(session, raceLengthMin * 60_000);
}
