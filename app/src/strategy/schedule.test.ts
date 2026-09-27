import { describe, expect, it } from 'vitest';
import { atLocalTime, scheduleStatus, segmentsFromPublished, type RaceSegment } from './schedule';

const MIN = 60_000;
const day = new Date(2026, 8, 27).getTime();
const t = (hhmm: string) => atLocalTime(day, hhmm)!;
// Sunday 2+5: green 9:00, checkered 11:00, break, green 12:00, checkered 5:00 PM.
const SUN: RaceSegment[] = [
  { startMs: t('12:00'), endMs: t('17:00') },
  { startMs: t('09:00'), endMs: t('11:00') },
];

describe('scheduleStatus (Sun 2+5)', () => {
  it('before the start', () => {
    const s = scheduleStatus(t('08:30'), SUN);
    expect(s.phase).toBe('before');
    expect(s.nextGreenAtMs).toBe(t('09:00'));
    expect(s.racingLeftMs).toBe(7 * 60 * MIN);
  });

  it('racing in the morning stint: counts to the 11:00 flag', () => {
    const s = scheduleStatus(t('10:00'), SUN);
    expect(s.phase).toBe('racing');
    expect(s.flagAtMs).toBe(t('11:00'));
    expect(s.toFlagMs).toBe(60 * MIN);
    expect(s.isLastSegment).toBe(false);
    expect(s.racingLeftMs).toBe(6 * 60 * MIN);
  });

  it('in the break: next green 12:00, and the next stint is a full 5 h', () => {
    const s = scheduleStatus(t('11:20'), SUN);
    expect(s.phase).toBe('break');
    expect(s.nextGreenAtMs).toBe(t('12:00'));
    expect(s.toFlagMs).toBe(5 * 60 * MIN);
    expect(s.racingLeftMs).toBe(5 * 60 * MIN);
  });

  it('afternoon stint is the last; finished after 5:00 PM', () => {
    const s = scheduleStatus(t('15:00'), SUN);
    expect([s.phase, s.isLastSegment, s.toFlagMs]).toEqual(['racing', true, 2 * 60 * MIN]);
    expect(scheduleStatus(t('17:01'), SUN).phase).toBe('finished');
  });

  it('parses HH:MM on a given day', () => {
    expect(new Date(t('17:00')).getHours()).toBe(17);
    expect(atLocalTime(day, 'nope')).toBeNull();
  });
});

describe('segmentsFromPublished (real 410 schedule, track UTC-4)', () => {
  const entries = [
    { day: '2026-09-26T00:00:00', start: '0001-01-01T09:00:00', end: '2026-09-26T09:40:00', name: 'Sat Qual' },
    { day: '2026-09-26T00:00:00', start: '2026-09-26T10:00:00', end: '2026-09-26T17:00:00', name: 'Sat 7Hr' },
    { day: '2026-09-27T00:00:00', start: '0001-01-01T09:00:00', end: '0001-01-01T17:00:00', name: 'Sun 2+5Hr' },
  ];
  const sunMorning = Date.UTC(2026, 8, 27, 14, 0); // 10:00 EDT

  it('splits "Sun 2+5Hr" 9–17 into 9–11 and 12–17 Eastern', () => {
    const segs = segmentsFromPublished(entries, -4, sunMorning)!;
    expect(segs.map((s) => [new Date(s.startMs).toISOString(), new Date(s.endMs).toISOString()])).toEqual([
      ['2026-09-27T13:00:00.000Z', '2026-09-27T15:00:00.000Z'],
      ['2026-09-27T16:00:00.000Z', '2026-09-27T21:00:00.000Z'],
    ]);
  });

  it("uses Saturday's single window on Saturday, skipping qualifying", () => {
    const sat = segmentsFromPublished(entries, -4, Date.UTC(2026, 8, 26, 15, 0))!;
    expect(sat).toEqual([{ startMs: Date.UTC(2026, 8, 26, 14, 0), endMs: Date.UTC(2026, 8, 26, 21, 0) }]);
  });

  it('returns null when nothing is scheduled today', () => {
    expect(segmentsFromPublished(entries, -4, Date.UTC(2026, 8, 30, 14, 0))).toBeNull();
  });
});
