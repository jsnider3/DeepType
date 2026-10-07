// Checks the remastered pack's own game data (packs/remastered/data): configs, word
// lists, themes, lessons and name lists.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOSS_TYPES, DIFFICULTIES, GameConfig, type EnemyType } from '../src/data/config';
import { parseLesson } from '../src/data/lessons';
import { parseBuckets, parseNameList, parseThemes, wordValue } from '../src/data/words';

const DIR = 'packs/remastered/data';
const read = (n: string) => new TextDecoder('latin1').decode(readFileSync(`${DIR}/${n}`));

const ENEMY_TYPES: EnemyType[] = [
  'Blue', 'Black', 'Red', 'Stealth', 'Toxic', 'CrazyToxic', 'White', 'WhiteStealth', 'Purple',
  'RedStealth', 'BlackStealth', 'Standard', 'Torpedo', 'Ghost', 'GhostShip', 'MechaShark', 'MechaSquid',
];
const SHARK_TYPES: EnemyType[] = ['Blue', 'Black', 'Red', 'Stealth', 'Toxic', 'RedStealth', 'BlackStealth', 'Ghost'];
const PIRANHA_TYPES: EnemyType[] = ['Blue', 'White', 'Stealth', 'WhiteStealth'];
const BOSS_AT: Record<number, [EnemyType, number]> = {
  4: ['Torpedo', 200], 10: ['Torpedo', 200], 11: ['Torpedo', 200], 13: ['Torpedo', 200],
  20: ['MechaShark', 250], 24: ['MechaShark', 250], 25: ['MechaShark', 250], 28: ['MechaShark', 250],
  35: ['MechaSquid', 300], 36: ['GhostShip', 400],
};

function checkWaves(c: GameConfig, label: string) {
  for (const [li, l] of c.levels.entries()) {
    const where = `${label} L${li + 1}`;
    expect(l.firstWave, where).toBeLessThan(Math.max(1, l.waves.length));
    for (const w of l.waves) {
      expect(w.enemies.length, where).toBeGreaterThan(0);
      for (const e of w.enemies) {
        expect(ENEMY_TYPES, where).toContain(e.type);
        if (w.type === 'Sharks') expect(SHARK_TYPES, `${where} shark ${e.type}`).toContain(e.type);
        if (w.type === 'Piranhas') expect(PIRANHA_TYPES, `${where} piranha ${e.type}`).toContain(e.type);
        if (w.type === 'Bonus') expect(e.type, where).toBe('Standard');
        if (w.type === 'Boss') expect(BOSS_TYPES, where).toContain(e.type);
        if (w.type === 'Sharks' || w.type === 'Piranhas') {
          expect(e.minSpeed, `${where} ${e.type} speed`).toBeGreaterThan(0.1);
          expect(e.maxSpeed, `${where} ${e.type} speed`).toBeGreaterThanOrEqual(e.minSpeed - 1e-9);
          expect(e.minNumber, where).toBeGreaterThan(0);
          expect(e.maxNumber, where).toBeGreaterThanOrEqual(e.minNumber);
          expect(e.minDiff, where).toBeGreaterThanOrEqual(3);
          expect(e.maxDiff, where).toBeLessThanOrEqual(7);
        }
      }
      // Each wave must fit within 26 distinct first letters.
      const per: Partial<Record<EnemyType, number>> = { Black: 2, BlackStealth: 2, Red: 3, RedStealth: 3, White: 2, WhiteStealth: 2 };
      if (w.type === 'Sharks' || w.type === 'Piranhas') {
        const letters = w.enemies.reduce((n, e) => n + Math.max(e.minNumber, e.maxNumber - 1) * (per[e.type] ?? 1), 0);
        expect(letters, `${where} letters`).toBeLessThanOrEqual(24);
      }
    }
  }
}

describe('remastered configs', () => {
  for (const d of DIFFICULTIES) {
    it(`${d}-cfg.xml has 36 levels with secret and boss levels in place`, () => {
      const c = new GameConfig(read(`${d}-cfg.xml`), d);
      expect(c.abyss).toBe(false);
      expect(c.levels).toHaveLength(36);
      expect(c.levels.flatMap((l, i) => (l.bonusLevel ? [i + 1] : []))).toEqual([6, 19, 21, 23]);
      for (const [i, l] of c.levels.entries()) {
        const n = i + 1;
        if (l.bonusLevel) {
          expect(l.oceanDepth, `L${n}`).toBe(50);
          expect(l.waves.map((w) => w.type), `L${n}`).toEqual(['Bonus']);
          continue;
        }
        expect(l.oceanDepth, `L${n}`).toBe(300);
        expect(l.maxEndDiff, `L${n}`).toBeLessThanOrEqual(21);
        expect(l.minEndDiff, `L${n}`).toBeLessThan(l.maxEndDiff);
        const bossWaves = l.waves.flatMap((w, wi) => (w.type === 'Boss' ? [wi] : []));
        if (BOSS_AT[n]) {
          expect(bossWaves, `L${n}`).toEqual([l.waves.length - 1]);
          const boss = l.waves[l.waves.length - 1];
          expect(boss.knockBack, `L${n}`).toBe(0);
          const [type, health] = BOSS_AT[n];
          expect(boss.enemies[0].type, `L${n}`).toBe(type);
          expect(boss.enemies[0].health, `L${n}`).toBe(health);
          expect(boss.enemies[0].timeToFire, `L${n}`).toBeGreaterThan(0);
          expect(boss.enemies[0].maxMissiles, `L${n}`).toBeGreaterThanOrEqual(boss.enemies[0].minMissiles);
          expect(l.waves[l.firstWave].type, `L${n}`).not.toBe('Boss');
        } else {
          expect(bossWaves, `L${n}`).toEqual([]);
        }
      }
      checkWaves(c, d);
    });
  }

  it('gets harder with each difficulty', () => {
    const speed = (d: (typeof DIFFICULTIES)[number]) => {
      const c = new GameConfig(read(`${d}-cfg.xml`), d);
      const blue = c.levels.flatMap((l) => l.waves.filter((w) => w.type === 'Sharks').flatMap((w) => w.enemies.filter((e) => e.type === 'Blue')));
      return blue.reduce((s, e) => s + e.maxSpeed, 0) / blue.length;
    };
    const speeds = DIFFICULTIES.map(speed);
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
  });

  it('abyss.xml is an endless config without bosses', () => {
    const c = new GameConfig(read('abyss.xml'), null);
    expect(c.abyss).toBe(true);
    expect(c.levels.length).toBeGreaterThanOrEqual(20);
    expect(c.levels.length).toBeLessThanOrEqual(25);
    expect(c.levels.every((l) => l.oceanDepth === -1)).toBe(true);
    expect(c.levels.some((l) => l.waves.some((w) => w.type === 'Boss'))).toBe(false);
    checkWaves(c, 'abyss');
  });
});

describe('remastered word lists', () => {
  it('waves.txt buckets hold words of exactly their length', () => {
    const b = parseBuckets(read('waves.txt'), 'LENGTH');
    expect([...b.keys()]).toEqual([3, 4, 5, 6, 7]);
    const min: Record<number, number> = { 3: 500, 4: 1200, 5: 2000, 6: 2000, 7: 2000 };
    for (const [len, words] of b) {
      expect(words.length, `LENGTH-${len}`).toBeGreaterThanOrEqual(min[len]);
      expect(new Set(words.map((w) => w[0])).size, `LENGTH-${len} first letters`).toBeGreaterThanOrEqual(20);
      for (const w of words) {
        expect(w).toMatch(/^[A-Z]+$/);
        expect(w).toHaveLength(len);
      }
    }
  });

  it('twords.txt DIFF buckets equal the word value', () => {
    const b = parseBuckets(read('twords.txt'), 'DIFF');
    expect([...b.keys()]).toEqual(Array.from({ length: 19 }, (_, i) => i + 3));
    for (const [diff, words] of b) {
      expect(words.length, `DIFF-${diff}`).toBeGreaterThan(0);
      for (const w of words) {
        expect(w).toMatch(/^[A-Z]{3,19}$/);
        expect(wordValue(w), w).toBe(diff);
      }
    }
  });

  it('themes.txt has at least 50 themes with varied first letters', () => {
    const themes = parseThemes(read('themes.txt'));
    expect(themes.length).toBeGreaterThanOrEqual(50);
    for (const t of themes) {
      expect(t.name, 'theme name').not.toBe('');
      expect(t.words.length, t.name).toBeGreaterThanOrEqual(12);
      expect(new Set(t.words.map((w) => w[0])).size, t.name).toBeGreaterThanOrEqual(6);
      for (const w of t.words) expect(w, t.name).toMatch(/^[A-Z]{3,10}$/);
    }
  });

  it('has ship and gem names', () => {
    expect(parseNameList(read('shipnames.txt')).length).toBeGreaterThanOrEqual(25);
    expect(parseNameList(read('gemnames.txt')).length).toBeGreaterThanOrEqual(30);
  });
});

describe('remastered lessons', () => {
  it('has Lesson0..18, each parsing with valid headings and short lines', () => {
    const files = readdirSync(DIR).filter((f) => /^lesson\d+\.xml$/i.test(f));
    expect(files.map((f) => Number(/\d+/.exec(f)![0])).sort((a, b) => a - b)).toEqual(Array.from({ length: 19 }, (_, i) => i));
    for (const f of files) {
      const l = parseLesson(read(f), 0);
      expect(l.description, f).not.toBe('');
      expect(l.tasks.length, f).toBeGreaterThan(0);
      for (const t of l.tasks) {
        expect(l.headings[t.heading - 1], `${f} heading ${t.heading}`).toBeDefined();
        expect(t.lines.length, f).toBeGreaterThanOrEqual(2);
        for (const line of t.lines) {
          expect(line.length, `${f}: ${line}`).toBeLessThanOrEqual(46);
          expect(line, f).toMatch(/^[\x20-\x7e]+$/);
        }
      }
    }
  });

  it('sets the lesson goals', () => {
    const l = (n: number) => parseLesson(read(`Lesson${n}.xml`), n);
    expect(l(9).minWpm).toBe(25);
    expect(l(13).maxErrors).toBe(5);
    expect(l(14).lessonTime).toBe(300);
    expect([l(16).minWpm, l(16).minAccuracy]).toEqual([30, 90]);
    expect([l(18).minWpm, l(18).minAccuracy]).toEqual([35, 95]);
  });
});
