// Checks against the real game data. These run only after `npm run import-assets`
// (the data is copyrighted and never committed), and are skipped otherwise.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, GameConfig } from '../src/data/config';
import { parseLesson } from '../src/data/lessons';
import { parseBuckets, parseThemes, wordValue } from '../src/data/words';

const DIR = 'public/assets/original/data';
const have = existsSync(DIR);
const read = (n: string) => new TextDecoder('latin1').decode(readFileSync(`${DIR}/${n}`));

describe.skipIf(!have)('imported game data', () => {
  it('parses all five adventure configs with the same structure', () => {
    for (const d of DIFFICULTIES) {
      const c = new GameConfig(read(`${d}-cfg.xml`), d);
      expect(c.levels, d).toHaveLength(36);
      expect(c.levels.reduce((n, l) => n + l.waves.length, 0), d).toBe(287);
      expect(c.levels.flatMap((l, i) => (l.bonusLevel ? [i + 1] : [])), d).toEqual([6, 19, 21, 23]);
      const bosses = c.levels.flatMap((l, i) => (l.waves.some((w) => w.type === 'Boss') ? [i + 1] : []));
      expect(bosses, d).toEqual([4, 10, 11, 13, 20, 24, 25, 28, 35, 36]);
    }
  });

  it('parses abyss.xml (including its mismatched close tags)', () => {
    const c = new GameConfig(read('abyss.xml'), null);
    expect(c.abyss).toBe(true);
    expect(c.levels).toHaveLength(23);
    expect(c.levels.every((l) => l.oceanDepth === -1)).toBe(true);
  });

  it('confirms every twords.txt DIFF bucket equals the word value', () => {
    const b = parseBuckets(read('twords.txt'), 'DIFF');
    expect(b.size).toBe(19);
    for (const [diff, words] of b) for (const w of words) expect(wordValue(w), w).toBe(diff);
  });

  it('has waves.txt words of exactly their bucket length', () => {
    const b = parseBuckets(read('waves.txt'), 'LENGTH');
    expect([...b.keys()]).toEqual([3, 4, 5, 6, 7]);
    for (const [len, words] of b) for (const w of words) expect(w).toHaveLength(len);
    expect(parseThemes(read('themes.txt')).length).toBeGreaterThan(70);
  });

  it('parses all 19 lessons', () => {
    const files = readdirSync(DIR).filter((f: string) => /^lesson\d+\.xml$/i.test(f));
    expect(files).toHaveLength(19);
    for (const f of files) {
      const l = parseLesson(read(f), 0);
      expect(l.tasks.length, f).toBeGreaterThan(0);
      for (const t of l.tasks) expect(l.headings[t.heading - 1], `${f} heading ${t.heading}`).toBeDefined();
    }
  });
});
