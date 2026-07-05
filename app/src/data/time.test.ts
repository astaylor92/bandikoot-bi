import { describe, expect, it } from 'vitest';
import { formatClock, formatGap, formatLapTime, parseDurationMs, parseGap, toWireClock, toWireDuration } from './time';

describe('parseDurationMs', () => {
  it('parses HH:mm:ss.fff', () => {
    expect(parseDurationMs('00:02:22.768')).toBe(142_768);
    expect(parseDurationMs('08:02:51')).toBe(28_971_000);
  });
  it('parses mm:ss and bare seconds', () => {
    expect(parseDurationMs('02:22.5')).toBe(142_500);
    expect(parseDurationMs('12.345')).toBe(12_345);
  });
  it('tolerates the Orbits negative-seconds quirk', () => {
    expect(parseDurationMs('00:00:-05')).toBe(5_000);
  });
  it('rejects garbage', () => {
    expect(parseDurationMs('')).toBeNull();
    expect(parseDurationMs(null)).toBeNull();
    expect(parseDurationMs('abc')).toBeNull();
  });
});

describe('parseGap', () => {
  it('parses lap gaps', () => {
    expect(parseGap('1 lap')).toEqual({ kind: 'laps', laps: 1 });
    expect(parseGap('79 laps')).toEqual({ kind: 'laps', laps: 79 });
  });
  it('parses time gaps', () => {
    expect(parseGap('12.345')).toEqual({ kind: 'time', ms: 12_345 });
    expect(parseGap('00:01:02.500')).toEqual({ kind: 'time', ms: 62_500 });
  });
  it('empty means no gap available', () => {
    expect(parseGap('')).toBeNull();
  });
});

describe('formatting', () => {
  it('round-trips wire formats', () => {
    expect(toWireDuration(142_768)).toBe('00:02:22.768');
    expect(parseDurationMs(toWireDuration(142_768))).toBe(142_768);
    expect(toWireClock(28_971_000)).toBe('08:02:51');
  });
  it('formats for display', () => {
    expect(formatLapTime(142_768)).toBe('2:22.8');
    expect(formatClock(28_971_000)).toBe('8:02:51');
    expect(formatGap({ kind: 'laps', laps: 2 })).toBe('+2 laps');
    expect(formatGap({ kind: 'time', ms: 12_345 })).toBe('+12.3');
  });
});
