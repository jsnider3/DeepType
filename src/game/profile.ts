// Player profiles, options, statistics, saved games and high scores, kept in
// localStorage as JSON.

import type { Difficulty } from '../data/config';

export interface Options {
  music: number; // 0..1
  sfx: number; // 0..1
  fullscreen: boolean;
  spacePauses: boolean;
  customCursor: boolean;
  enableFx: boolean;
  hints: boolean;
}

export interface LessonRecord {
  status: -1 | 0 | 1; // never tried / tried / passed
  bestWpm: number;
  lastWpm: number;
  bestAdjWpm: number;
  lastAdjWpm: number;
  bestAcc: number;
  lastAcc: number;
  attempts: number;
  sumWpm: number;
  sumAdjWpm: number;
  sumAcc: number;
}

export interface AdventureSave {
  difficulty: Difficulty;
  levelIndex: number;
  stage: number;
  score: number;
  lives: number;
  charge: number;
  correct: number;
  typos: number;
  typingMs: number;
  levelsAt95: number;
  goldStreak: number;
  sharksKilled: number;
  piranhasKilled: number;
  mapNext: number[][];
  path: number[];
  visitedThisRun: number[];
  trail: [number, number][];
  final: boolean;
  endlessCounter: number;
  uncharted: boolean;
}

export interface Profile {
  name: string;
  options: Options;
  seenTutorial: boolean;
  seenHints: string[];
  wpmHistory: number[];
  adventure: {
    expeditions: number;
    highScore: number;
    maxTreasureWords: number;
    sharksKilled: number;
    piranhasKilled: number;
    bossesKilled: number;
    gems: number[]; // green, orange, purple, red, white, yellow
    secrets: number[]; // crown, figurine, necklace, scepter
    visited: Partial<Record<Difficulty, number[]>>;
    save: AdventureSave | null;
  };
  abyss: {
    deepest: number;
    highScore: number;
    sharksKilled: number;
    piranhasKilled: number;
    bossesKilled: number;
    bossKills: Record<string, number>;
    savedCharge: number;
  };
  lessons: LessonRecord[];
  lastLesson: number;
}

export interface HighScore {
  name: string;
  score: number;
  difficulty: Difficulty | 'abyss';
  level: number; // stage for adventure, depth for abyss
}

const KEY = 'typershark.profiles';
const HS_KEY = 'typershark.highscores';

function defaultProfile(name: string): Profile {
  return {
    name,
    options: { music: 0.85, sfx: 0.85, fullscreen: false, spacePauses: false, customCursor: false, enableFx: true, hints: true },
    seenTutorial: false,
    seenHints: [],
    wpmHistory: [],
    adventure: {
      expeditions: 0, highScore: 0, maxTreasureWords: 0, sharksKilled: 0, piranhasKilled: 0, bossesKilled: 0,
      gems: [0, 0, 0, 0, 0, 0], secrets: [0, 0, 0, 0], visited: {}, save: null,
    },
    abyss: { deepest: 0, highScore: 0, sharksKilled: 0, piranhasKilled: 0, bossesKilled: 0, bossKills: {}, savedCharge: 0 },
    lessons: Array.from({ length: 19 }, () => ({
      status: -1, bestWpm: 0, lastWpm: 0, bestAdjWpm: 0, lastAdjWpm: 0, bestAcc: 0, lastAcc: 0, attempts: 0,
      sumWpm: 0, sumAdjWpm: 0, sumAcc: 0,
    })),
    lastLesson: 0,
  };
}

interface Store {
  current: string | null;
  profiles: Record<string, Profile>;
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      // Fill fields added in later versions.
      for (const [n, p] of Object.entries(s.profiles)) {
        const def = defaultProfile(n);
        const merged = mergeDefaults(def, p);
        // Arrays are taken as stored; fill per-lesson fields added later.
        merged.lessons = def.lessons.map((d, i) => ({ ...d, ...(p.lessons?.[i] ?? {}) }));
        s.profiles[n] = merged;
      }
      return s;
    }
  } catch {
    // corrupt or unavailable storage: start fresh
  }
  return { current: null, profiles: {} };
}

function mergeDefaults<T>(def: T, val: unknown): T {
  if (Array.isArray(def) || typeof def !== 'object' || def === null) return (val ?? def) as T;
  const out = { ...def } as Record<string, unknown>;
  const v = (val ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(v)) {
    out[k] = k in out ? mergeDefaults((def as Record<string, unknown>)[k], v[k]) : v[k];
  }
  return out as T;
}

const store = load();

export function saveProfiles() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage unavailable: progress lasts for this session only
  }
}

export function profileNames(): string[] {
  return Object.keys(store.profiles);
}

export function hasProfile() {
  return store.current !== null && store.profiles[store.current] !== undefined;
}

/** The active profile (a default "Player" profile is created on first use). */
export function profile(): Profile {
  if (!hasProfile()) selectProfile('Player');
  return store.profiles[store.current!];
}

export function selectProfile(name: string) {
  if (!store.profiles[name]) store.profiles[name] = defaultProfile(name);
  store.current = name;
  saveProfiles();
}

export function deleteProfile(name: string) {
  delete store.profiles[name];
  if (store.current === name) store.current = Object.keys(store.profiles)[0] ?? null;
  saveProfiles();
}

/** Adjusted WPM history ring (last 10) used for the recommended difficulty. */
export function pushWpm(wpm: number) {
  const p = profile();
  p.wpmHistory.push(wpm);
  if (p.wpmHistory.length > 10) p.wpmHistory.shift();
  saveProfiles();
}

/** Recommended difficulty from the mean of the non-zero WPM history (DifficultyDialog). */
export function recommendedDifficulty(): Difficulty | null {
  const v = profile().wpmHistory.filter((x) => x > 0);
  if (!v.length) return null;
  return difficultyForWpm(Math.trunc(v.reduce((a, b) => a + b, 0) / v.length));
}

export function difficultyForWpm(wpm: number): Difficulty {
  if (wpm < 30) return 'easy';
  if (wpm < 40) return 'normal';
  if (wpm < 60) return 'hard';
  if (wpm < 80) return 'expert';
  return 'xtreme';
}

// ---------------------------------------------------------------- new-user names

export const MAX_NAME_CHARS = 24;
export const MAX_NAME_PX = 240;

/** New-player name validation: null when OK, otherwise [title, message]. */
export function validateNewName(raw: string, existing: string[]): [string, string] | null {
  const n = raw.trim();
  if (!n) return ['NAME NEEDED', 'Type a name for your new player. It keeps your high scores and saved games together.'];
  if (['(ADD A NEW PLAYER)', '(REMOVE A PLAYER)'].includes(n.toUpperCase())) return ['ERROR', 'That name is reserved. Please pick another one.'];
  if (existing.some((x) => x.toLowerCase() === n.toLowerCase())) {
    return ['NAME TAKEN', 'Someone already plays under that name. Please choose a different one.'];
  }
  return null;
}

/** Name after typing `c`: at most 24 chars and 240 px wide (EditWidget limits). */
export function typeNameChar(current: string, c: string, measure: (s: string) => number): string {
  if (c.length !== 1 || !/[\w .'"-]/.test(c)) return current;
  const next = current + c;
  return next.length <= MAX_NAME_CHARS && measure(next) <= MAX_NAME_PX ? next : current;
}

// ---------------------------------------------------------------- high scores

export function highScores(): { adventure: HighScore[]; abyss: HighScore[] } {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through
  }
  return { adventure: [], abyss: [] };
}

/** Records a score; returns its rank (0-based) or -1 if it didn't place in the top 10. */
export function addHighScore(kind: 'adventure' | 'abyss', entry: HighScore): number {
  const hs = highScores();
  const list = hs[kind];
  list.push(entry);
  list.sort((a, b) => (kind === 'abyss' ? b.level - a.level || b.score - a.score : b.score - a.score));
  const rank = list.indexOf(entry);
  hs[kind] = list.slice(0, 10);
  try {
    localStorage.setItem(HS_KEY, JSON.stringify(hs));
  } catch {
    // storage unavailable
  }
  return rank < 10 ? rank : -1;
}
