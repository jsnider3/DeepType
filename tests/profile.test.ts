import { beforeEach, describe, expect, it, vi } from 'vitest';

// profile.ts reads localStorage when it loads, so each test imports a fresh copy.
async function load() {
  vi.resetModules();
  return import('../src/game/profile');
}

beforeEach(() => localStorage.clear());

describe('new-player names', () => {
  it('rejects empty, reserved and duplicate names (case-insensitive)', async () => {
    const { validateNewName } = await load();
    expect(validateNewName('   ', [])?.[0]).toBe('NAME NEEDED');
    expect(validateNewName('(add a new player)', [])?.[0]).toBe('ERROR');
    expect(validateNewName('josh', ['Josh'])?.[0]).toBe('NAME TAKEN');
    expect(validateNewName(' Maya Torres ', ['Josh'])).toBeNull();
  });

  it('accepts typed characters up to 24 chars and 240 px', async () => {
    const { typeNameChar } = await load();
    const px = (s: string) => s.length * 10;
    let n = '';
    for (const c of 'Josh') n = typeNameChar(n, c, px);
    expect(n).toBe('Josh');
    expect(typeNameChar('Jo', '\u0007', px)).toBe('Jo');
    expect(typeNameChar('x'.repeat(24), 'y', () => 0)).toHaveLength(24);
    expect(typeNameChar('x'.repeat(23), 'y', px)).toHaveLength(24);
    expect(typeNameChar('x'.repeat(10), 'y', (s) => s.length * 30)).toHaveLength(10);
  });
});

describe('profiles', () => {
  it('creates, selects, persists and deletes players', async () => {
    let p = await load();
    expect(p.hasProfile()).toBe(false);
    p.selectProfile('Josh');
    p.profile().adventure.gems[2] = 3;
    p.saveProfiles();
    p = await load();
    expect(p.profile().name).toBe('Josh');
    expect(p.profile().adventure.gems[2]).toBe(3);
    p.deleteProfile('Josh');
    expect(p.hasProfile()).toBe(false);
  });

  it('fills fields added in later versions when loading old saves', async () => {
    localStorage.setItem('typershark.profiles', JSON.stringify({
      current: 'Old',
      profiles: { Old: { name: 'Old', options: { music: 0.2 }, lessons: [{ status: 1, attempts: 2 }] } },
    }));
    const p = await load();
    const prof = p.profile();
    expect(prof.options.music).toBe(0.2);
    expect(prof.options.enableFx).toBe(true);
    expect(prof.lessons).toHaveLength(19);
    expect(prof.lessons[0]).toMatchObject({ status: 1, attempts: 2, sumWpm: 0 });
    expect(prof.abyss.bossKills).toEqual({});
  });

  it('recommends a difficulty from the mean of recent WPM', async () => {
    const p = await load();
    p.selectProfile('T');
    expect(p.recommendedDifficulty()).toBeNull();
    p.pushWpm(25);
    p.pushWpm(45);
    expect(p.recommendedDifficulty()).toBe('normal'); // mean 35
    expect([29, 30, 40, 60, 80].map(p.difficultyForWpm)).toEqual(['easy', 'normal', 'hard', 'expert', 'xtreme']);
  });

  it('keeps the top 10 high scores (abyss ranked by depth)', async () => {
    const p = await load();
    for (let i = 1; i <= 12; i++) p.addHighScore('adventure', { name: `P${i}`, score: i * 1000, difficulty: 'normal', level: 1 });
    const hs = p.highScores();
    expect(hs.adventure).toHaveLength(10);
    expect(hs.adventure[0].score).toBe(12_000);
    expect(p.addHighScore('adventure', { name: 'low', score: 1, difficulty: 'easy', level: 1 })).toBe(-1);
    p.addHighScore('abyss', { name: 'A', score: 50, difficulty: 'abyss', level: 800 });
    p.addHighScore('abyss', { name: 'B', score: 999, difficulty: 'abyss', level: 400 });
    expect(p.highScores().abyss.map((e) => e.name)).toEqual(['A', 'B']);
  });
});
