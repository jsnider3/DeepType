import { beforeEach, describe, expect, it } from 'vitest';
import { WordPicker } from '../src/game/wordpicker';
import { registerWordFixtures } from './fixtures';

describe('WordPicker (word / letter / theme word)', () => {
  let w: WordPicker;
  beforeEach(() => {
    registerWordFixtures();
    w = new WordPicker();
  });

  it('keeps first letters unique within a wave so the first key picks one target', () => {
    w.newWave();
    const firsts = Array.from({ length: 20 }, () => w.word(3, 6)[0]);
    expect(new Set(firsts).size).toBe(20);
  });

  it('picks lengths in [min, max) clamped to 3..7', () => {
    for (let i = 0; i < 30; i++) {
      w.newWave();
      expect(w.word(3, 4)).toHaveLength(3); // Min 3 / Max 4 always gives 3 letters
      w.newWave();
      expect([4, 5]).toContain(w.word(4, 6).length);
      w.newWave();
      expect(w.word(7, 99)).toHaveLength(7);
    }
  });

  it('gives unique letters until all 26 are used, then nothing', () => {
    w.newWave();
    const got = Array.from({ length: 26 }, () => w.letter());
    expect(new Set(got).size).toBe(26);
    expect(w.letter()).toBe('');
    w.newWave();
    expect(w.letter()).not.toBe('');
  });

  it('builds ghost gibberish starting with an unused letter', () => {
    w.newWave();
    const g = w.gibberish(4, 6);
    expect(g).toMatch(/^[A-Z]{4,5}$/);
    expect(w.lettersInUse).toContain(g[0]);
  });

  it('draws themed words from one theme per wave', () => {
    w.newWave();
    const r = w.themeWord(3, 5);
    expect(r.themed).toBe(true);
    expect(['ROBIN', 'WREN', 'HERON']).toContain(r.word);
  });

  it('picks treasure words from the twords DIFF range [min, max)', () => {
    for (let i = 0; i < 20; i++) expect(['LEE', 'GAL', 'EGGS', 'SEAL']).toContain(w.treasureWord(3, 5));
  });
});
