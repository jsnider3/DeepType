import { beforeEach, describe, expect, it } from 'vitest';
import { profile } from '../src/game/profile';
import { nextRankAt, rankFor, Session } from '../src/game/session';
import { registerConfigFixture, registerWordFixtures } from './fixtures';

beforeEach(() => {
  localStorage.clear();
  registerWordFixtures();
  registerConfigFixture();
});

describe('ranks', () => {
  it('steps every 150,000 points, then named high ranks', () => {
    expect(rankFor(0)).toBe('Plankton');
    expect(rankFor(149_999)).toBe('Plankton');
    expect(rankFor(150_000)).toBe('Tadpole');
    expect(rankFor(5_849_999)).toBe('Sea Legend');
    expect(rankFor(6_000_000)).toBe('Tidal Titan');
    expect(rankFor(30_000_000)).toBe('Grand Master of the Deep');
    expect(rankFor(30_000_001)).toBe('Off the Charts!');
    expect(rankFor(-1)).toBe('Score Glitch?!');
    expect(nextRankAt(160_000)).toBe(300_000);
  });
});

describe('Session scoring', () => {
  it('awards extra lives at the Normal thresholds', () => {
    const s = new Session('normal');
    expect(s.lives).toBe(2);
    s.addScore(524_999);
    expect(s.lives).toBe(2);
    s.addScore(1);
    expect(s.lives).toBe(3);
    s.addScore(775_000 - 525_000);
    s.addScore(1_150_000 - 775_000);
    expect(s.lives).toBe(5);
    s.addScore(600_000);
    expect(s.lives).toBe(6);
  });

  it('computes level, wave and treasure bonuses with their caps', () => {
    const s = new Session('normal');
    expect(s.levelBonus()).toBe(2000);
    s.levelIndex = 20;
    expect(s.levelBonus()).toBe(2 * 11 * 1000);
    s.goldStreak = 50;
    expect(s.waveBonus(100, 1_000_000)).toBe(20_000);
    expect(s.treasureWordValue(0)).toBe(150);
    expect(s.treasureWordValue(3)).toBe(450);
    expect(s.bossBonus()).toBe(30_000);
  });

  it('reports adjusted WPM', () => {
    const s = new Session('normal');
    expect(s.adjustedWpm).toBeNull();
    s.correct = 500; // 100 words
    s.typos = 0;
    s.typingMs = 60_000;
    expect(s.adjustedWpm).toBe(75); // 0.75 * 100
  });
});

describe('Abyss session', () => {
  it('has no lives and scales score multiplier and difficulty with depth', () => {
    const s = new Session('abyss');
    expect(s.abyss).toBe(true);
    expect(s.lives).toBe(0);
    s.depth = 500;
    expect([s.pointsMultiplier, s.diffIndex, s.bossBonus()]).toEqual([2, 0, 100_000]);
    s.depth = 2400;
    expect([s.pointsMultiplier, s.diffIndex]).toEqual([4, 2]);
  });

  it('speeds up the last level once past the end (+0.025, or +0.05 below 5400 ft)', () => {
    const s = new Session('abyss');
    s.nextAbyssLevel();
    expect(s.levelIndex).toBe(1);
    const before = s.level.waves[0].enemies[0].minSpeed;
    s.nextAbyssLevel();
    expect(s.levelIndex).toBe(1);
    expect(s.level.waves[0].enemies[0].minSpeed).toBeCloseTo(before + 0.025);
    s.depth = 6000;
    s.nextAbyssLevel();
    expect(s.level.waves[0].enemies[0].minSpeed).toBeCloseTo(before + 0.075);
  });

  it('resumes at a checkpoint with the right boss count', () => {
    const s = new Session('abyss');
    expect(s.resumeAbyssAt(2000)).toBe(true); // a boss is due exactly at 2000 ft
    expect(s.abyssBossCount).toBe(1);
  });
});

describe('saved games', () => {
  it('round-trips an adventure session', () => {
    const s = new Session('normal');
    s.diveTo(1);
    s.stage = 4;
    s.addScore(123_456);
    s.charge = 0.42;
    s.path = [0, 1];
    s.visitedThisRun = new Set([0, 1]);
    const r = Session.fromSave(JSON.parse(JSON.stringify(s.toSave())));
    expect([r.levelIndex, r.stage, r.score, r.lives, r.charge]).toEqual([1, 4, 123_456, 2, 0.42]);
    expect([...r.visitedThisRun]).toEqual([0, 1]);
  });

  it('does not save during the first level', () => {
    const s = new Session('normal');
    profile().adventure.save = null;
    s.saveGame();
    expect(profile().adventure.save).toBeNull();
    s.stage = 2;
    s.saveGame();
    expect(profile().adventure.save?.stage).toBe(2);
  });
});
