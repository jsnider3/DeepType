import { describe, expect, it } from 'vitest';
import { fingerFor, KEY_GLOW, keyFor, shiftSide } from '../src/scenes/tutorlayout';

describe('typing tutor guide', () => {
  it('maps the home row to the right fingers', () => {
    expect([...'asdfjkl;'].map(fingerFor)).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
    expect(fingerFor(' ')).toBe(4);
    expect(fingerFor('\n')).toBe(8);
  });

  it('uses the opposite shift key from the typing hand', () => {
    expect(shiftSide('A')).toBe('rshift');
    expect(shiftSide('P')).toBe('lshift');
    expect(shiftSide('a')).toBeNull();
  });

  it('keeps the original quirks', () => {
    expect(keyFor('8')).toBe('9'); // 8 lights the glo_9 image
    expect(fingerFor('_')).toBe(-1); // no finger for _ \ |
    expect(shiftSide('_')).toBeNull(); // and no shift
  });

  it('has a glow position for every key a lesson character can light', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()-_=+[]{}\\|;:\'",<.>/? ';
    for (const c of chars) {
      const k = keyFor(c);
      expect(k, c).not.toBeNull();
      expect(KEY_GLOW[k!], `${c} -> ${k}`).toBeDefined();
    }
  });
});
