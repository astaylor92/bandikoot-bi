import { describe, expect, it } from 'vitest';
import { raceLengthMsFromName } from './lapsSnapshot';

const H = 3_600_000;

describe('raceLengthMsFromName', () => {
  it('reads LDRL session names', () => {
    expect(raceLengthMsFromName('Sat 7 Hr')).toBe(7 * H);
    expect(raceLengthMsFromName('Sun 8hr')).toBe(8 * H);
    expect(raceLengthMsFromName('Sat 6.5Hr')).toBe(6.5 * H);
    expect(raceLengthMsFromName('Sunday 2+5Hr')).toBe(7 * H);
    expect(raceLengthMsFromName('Sun 2+5Hr')).toBe(7 * H);
    expect(raceLengthMsFromName('Race-Rite Battle At The Hill 8hr')).toBe(8 * H);
    expect(raceLengthMsFromName('Saturday - 8 Hours')).toBe(8 * H);
  });

  it('returns null without a duration', () => {
    expect(raceLengthMsFromName('Sat Qual')).toBeNull();
    expect(raceLengthMsFromName('Friday Track Day')).toBeNull();
  });
});
