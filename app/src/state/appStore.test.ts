import { describe, expect, it } from 'vitest';
import { useAppStore, eventKey } from './appStore';

describe('rivals', () => {
  it('a 4th rival replaces the oldest secondary, never the primary', () => {
    const s = useAppStore.getState();
    s.setSession('replay', 1);
    for (const c of ['A', 'B', 'C', 'D']) useAppStore.getState().toggleRival(c);
    expect(useAppStore.getState().rivalsByEvent[eventKey('replay', 1)]).toEqual(['A', 'C', 'D']);
  });
});
