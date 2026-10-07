import { describe, expect, it } from 'vitest';
import { rollRange } from '../src/game/rng';

describe('rollRange (rand % max(1, max - min) + min)', () => {
  it('never reaches max when min < max', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(rollRange(3, 6));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it('returns min when min == max (Min 3 / Max 4 always gives 3)', () => {
    for (let i = 0; i < 50; i++) {
      expect(rollRange(7, 7)).toBe(7);
      expect(rollRange(3, 4)).toBe(3);
    }
  });
});
