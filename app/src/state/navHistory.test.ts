import { describe, expect, it } from 'vitest';
import { hashToView, resolvePop, viewToHash } from './navHistory';

describe('view <-> hash', () => {
  it('round-trips every screen', () => {
    for (const v of [
      { name: 'events' },
      { name: 'board' },
      { name: 'car', car: '440' },
      { name: 'car', car: '07' },
      { name: 'strategy' },
      { name: 'plan' },
      { name: 'rival' },
      { name: 'settings' },
    ] as const) {
      expect(hashToView(viewToHash(v))).toEqual(v);
    }
  });

  it('treats empty and unknown hashes sensibly', () => {
    expect(hashToView('')).toEqual({ name: 'events' });
    expect(hashToView('#/')).toEqual({ name: 'events' });
    expect(hashToView('#/nope')).toBeNull();
    expect(hashToView('#/car')).toBeNull();
  });
});

describe('resolvePop', () => {
  it('blocks Back out of a race to the event list', () => {
    expect(resolvePop({ name: 'events' }, true)).toBe('block');
    expect(resolvePop(null, true)).toBe('block');
  });

  it('allows moving between race screens', () => {
    expect(resolvePop({ name: 'car', car: '440' }, true)).toEqual({ name: 'car', car: '440' });
    expect(resolvePop({ name: 'board' }, true)).toEqual({ name: 'board' });
  });

  it('outside a race, old race screens fall back to the event list; settings is fine', () => {
    expect(resolvePop({ name: 'board' }, false)).toEqual({ name: 'events' });
    expect(resolvePop({ name: 'settings' }, false)).toEqual({ name: 'settings' });
  });
});
