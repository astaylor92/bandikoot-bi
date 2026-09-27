import { describe, expect, it } from 'vitest';
import { Flags } from '../api/redmist/flags';
import { freshness } from './freshness';

const T = 1_000_000;

describe('freshness', () => {
  it('green: ok, warn at 30s, stale at 90s', () => {
    expect(freshness(T + 5_000, T, Flags.Green)).toEqual({ level: 'ok', sinceCrossingSec: 5 });
    expect(freshness(T + 30_000, T, Flags.Green).level).toBe('warn');
    expect(freshness(T + 90_000, T, Flags.Green).level).toBe('stale');
  });

  it('yellow is looser; red and checkered never warn', () => {
    expect(freshness(T + 45_000, T, Flags.Yellow).level).toBe('ok');
    expect(freshness(T + 200_000, T, Flags.Yellow).level).toBe('stale');
    expect(freshness(T + 600_000, T, Flags.Red).level).toBe('neutral');
    expect(freshness(T + 600_000, T, Flags.Checkered).level).toBe('neutral');
  });

  it('neutral until a crossing has been seen', () => {
    expect(freshness(T, null, Flags.Green)).toEqual({ level: 'neutral', sinceCrossingSec: null });
  });
});
