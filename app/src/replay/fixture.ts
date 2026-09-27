/**
 * Replay fixture formats.
 *
 * `laps@1` reconstructs a race from per-lap crossing times (built from the
 * public LoadSessionLaps + LoadFlags endpoints by tools/fixtures). Compact and
 * scrubbable: the session state at any time t is a pure function of the laps.
 *
 * Each lap tuple is [lapNumber, lapTimeMs, crossingTimeMs, flag, pitFlag]
 * where crossingTimeMs is elapsed race time when the car completed the lap.
 *
 * `laps@2` adds per-car class changes (`cc`) so reclasses replay; `laps@1`
 * fixtures still load (class stays fixed).
 */

export const SUPPORTED_FIXTURE_FORMATS = ['redmist-replay/laps@1', 'redmist-replay/laps@2'] as const;

export type LapTuple = [number, number, number, number, number];

export interface FixtureCar {
  /** Car number */
  n: string;
  /** Class at the car's first lap */
  c: string;
  laps: LapTuple[];
  /** laps@2: reclasses as [lapNumber, newClass] — the class shown from that lap's completion on. */
  cc?: [number, string][];
}

export interface FixtureFlagPeriod {
  f: number;
  startMs: number;
  endMs: number | null;
}

export interface LapReplayFixture {
  format: 'redmist-replay/laps@1' | 'redmist-replay/laps@2';
  eventId: number;
  eventName: string;
  sessionId: number;
  sessionName: string;
  trackName: string;
  organizationName: string;
  durationMs: number;
  /** Local time of day at race start, ms since midnight (for the clock display). */
  localStartMs: number;
  classColors: Record<string, string>;
  classOrder: Record<string, string>;
  entries: { no: string; nm: string; t: string; c: string }[];
  flags: FixtureFlagPeriod[];
  cars: FixtureCar[];
}
