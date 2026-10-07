// State that persists across levels of one game.

import { DIFFICULTIES, GameConfig, type Difficulty, type LevelDef } from '../data/config';
import { data } from '../engine/assets';
import { WordPicker } from './wordpicker';
import { parseNameList } from '../data/words';
import { MAP_NODES } from './mapdata';
import { profile, saveProfiles, type AdventureSave } from './profile';

const EXTRA_LIVES: Record<Difficulty, { first: number[]; step: number }> = {
  easy: { first: [450_000, 625_000], step: 400_000 },
  normal: { first: [525_000, 775_000, 1_150_000], step: 600_000 },
  hard: { first: [650_000, 900_000, 1_550_000], step: 800_000 },
  expert: { first: [700_000, 1_250_000, 1_750_000], step: 1_500_000 },
  xtreme: { first: [900_000, 1_500_000, 2_000_000], step: 2_000_000 },
};

const BOSS_BONUS = [10_000, 30_000, 50_000, 70_000, 100_000];

const RANKS = [
  'Plankton', 'Tadpole', 'Sea Sprout', 'Puddle Paddler', 'Minnow', 'Shell Collector', 'Tide Pooler',
  'Sand Dollar', 'Snorkel Scout', 'Wave Rider', 'Reef Wanderer', 'Bubble Blower', 'Kelp Climber',
  'Seahorse Rider', 'Lagoon Explorer', 'Flipper Finder', 'Junior Diver', 'Pearl Seeker', 'Coral Keeper',
  'Wreck Hunter', 'Deckhand', 'First Mate', 'Chart Reader', 'Tide Tamer', 'Current Surfer', 'Deep Diver',
  'Sonar Specialist', 'Sea Ranger', 'Shark Shocker', 'Fin Wrangler', 'Piranha Tamer', 'Reef Guardian',
  'Trench Explorer', 'Abyss Walker', 'Kraken Tickler', 'Treasure Master', 'Harbor Admiral', 'Ocean Champion',
  'Sea Legend',
];
const HIGH_RANKS: [number, string][] = [
  [6_150_000, 'Tidal Titan'], [6_650_000, 'Deep Sea Sage'], [7_450_000, 'Whale Whisperer'],
  [8_850_000, 'Lord of the Depths'], [10_850_000, 'Ruler of the Seven Seas'], [30_000_001, 'Grand Master of the Deep'],
];

export function rankFor(score: number): string {
  if (score < 0) return 'Score Glitch?!';
  if (score < 5_850_000) return RANKS[Math.floor(score / 150_000)];
  for (const [limit, name] of HIGH_RANKS) if (score < limit) return name;
  return 'Off the Charts!';
}

export function nextRankAt(score: number): number | null {
  if (score < 5_850_000) return (Math.floor(score / 150_000) + 1) * 150_000;
  for (const [limit] of HIGH_RANKS) if (score < limit) return limit;
  return null;
}

export type Mode = Difficulty | 'abyss';

export class Session {
  readonly config: GameConfig;
  readonly words = new WordPicker();
  readonly abyss: boolean;
  /** Adventure difficulty; Abyss plays its own config and scales with depth. */
  readonly difficulty: Difficulty;
  levelIndex = 0;
  score = 0;
  lives = 2;
  /** Abyss: current depth in feet, maintained by the board. */
  depth = 0;
  /** Abyss: bosses fought so far minus one (Board+0xd2c starts at -1). */
  abyssBossCount = -1;
  charge = 0;
  /** Per-game correct/typo keystrokes (f68/f6c) and typing time for WPM. */
  correct = 0;
  typos = 0;
  typingMs = 0;
  /** Levels finished at >= 95% accuracy (e8c). */
  levelsAt95 = 0;
  /** Consecutive gold-medal waves. */
  goldStreak = 0;
  sharksKilled = 0;
  piranhasKilled = 0;
  // Expedition map state (MapScreen): mutable exits, path of visited nodes, trail dots.
  mapNext: number[][] = MAP_NODES.map((n) => [...n.next]);
  path: number[] = [0];
  visitedThisRun = new Set<number>([0]);
  trail: [number, number][] = [];
  stage = 1;
  /** After diving the last level: the map only offers uncharted waters. */
  final = false;
  endlessCounter = 0;
  private endlessLevel: LevelDef | null = null;
  private extraLifeIdx = 0;
  private nextExtraLife: number;
  onExtraLife?: () => void;

  constructor(mode: Mode) {
    this.abyss = mode === 'abyss';
    this.difficulty = mode === 'abyss' ? 'normal' : mode;
    this.config = this.abyss
      ? new GameConfig(data('abyss.xml'), null)
      : new GameConfig(data(`${mode}-cfg.xml`), mode as Difficulty);
    this.nextExtraLife = this.abyss ? Infinity : EXTRA_LIVES[this.difficulty].first[0];
    if (this.abyss) {
      this.lives = 0;
      this.charge = profile().abyss.savedCharge;
    }
  }

  /** 0..4 difficulty index; Abyss derives it from depth. */
  get diffIndex(): number {
    if (!this.abyss) return DIFFICULTIES.indexOf(this.difficulty);
    const d = this.depth;
    return d < 1000 ? 0 : d < 1750 ? 1 : d < 2500 ? 2 : d < 3250 ? 3 : 4;
  }

  /** Abyss score multiplier: depth/600 when that's at least 3, otherwise 2. */
  get pointsMultiplier(): number {
    if (!this.abyss) return 1;
    const m = Math.trunc(this.depth / 600);
    return m >= 3 ? m : 2;
  }

  /** Abyss NextLevel: past the last level, keep it and speed it up a little. */
  nextAbyssLevel() {
    if (this.levelIndex + 1 < this.config.levels.length) {
      this.levelIndex++;
      return;
    }
    const bump = this.depth > 5400 ? 0.05 : 0.025;
    const l = this.config.levels[this.levelIndex];
    l.minSpeed += bump;
    l.maxSpeed += bump;
    for (const w of l.waves) {
      for (const e of w.enemies) {
        e.minSpeed += bump;
        e.maxSpeed += bump;
      }
    }
  }

  /** Abyss resume at depth D. Returns whether a boss is due right away. */
  resumeAbyssAt(depth: number): boolean {
    this.depth = depth;
    for (let i = 0; i < Math.trunc((depth - 1) / 200) + 1 && depth > 0; i++) this.nextAbyssLevel();
    this.abyssBossCount += Math.trunc(depth / 1000);
    return depth > 0 && depth % 1000 === 0;
  }

  // ---------------------------------------------------------------- saved games

  toSave(): AdventureSave {
    return {
      difficulty: this.difficulty, levelIndex: this.levelIndex, stage: this.stage, score: this.score,
      lives: this.lives, charge: this.charge, correct: this.correct, typos: this.typos, typingMs: this.typingMs,
      levelsAt95: this.levelsAt95, goldStreak: this.goldStreak, sharksKilled: this.sharksKilled,
      piranhasKilled: this.piranhasKilled, mapNext: this.mapNext, path: this.path,
      visitedThisRun: [...this.visitedThisRun], trail: this.trail, final: this.final,
      endlessCounter: this.endlessCounter, uncharted: this.uncharted,
    };
  }

  static fromSave(v: AdventureSave): Session {
    const s = new Session(v.difficulty);
    Object.assign(s, {
      levelIndex: v.levelIndex, stage: v.stage, score: 0, lives: v.lives, charge: v.charge,
      correct: v.correct, typos: v.typos, typingMs: v.typingMs, levelsAt95: v.levelsAt95,
      goldStreak: v.goldStreak, sharksKilled: v.sharksKilled, piranhasKilled: v.piranhasKilled,
      mapNext: v.mapNext, path: v.path, visitedThisRun: new Set(v.visitedThisRun), trail: v.trail,
      final: v.final,
    });
    s.addScore(v.score); // advances the extra-life thresholds without awarding lives
    s.lives = v.lives;
    if (v.uncharted) {
      // SetLevel(-1) with the saved counter: re-apply the cumulative speed-ups.
      for (let i = 0; i < v.endlessCounter - 1; i++) s.diveUncharted();
      s.diveUncharted();
    }
    return s;
  }

  /** The original saves at the start of each adventure level. */
  saveGame() {
    if (this.abyss || this.stage <= 1) return;
    profile().adventure.save = this.toSave();
    saveProfiles();
  }

  clearSave() {
    if (this.abyss) return;
    profile().adventure.save = null;
    saveProfiles();
  }

  get level(): LevelDef {
    return this.endlessLevel ?? this.config.levels[this.levelIndex];
  }

  get uncharted() {
    return this.endlessLevel !== null;
  }

  private usedShips = new Set<string>();

  /** A wreck name for the map headline (no repeats per game). */
  shipName(): string {
    const names = parseNameList(data('shipnames.txt'));
    if (this.usedShips.size >= names.length) this.usedShips.clear();
    let n: string;
    do n = names[Math.floor(Math.random() * names.length)];
    while (this.usedShips.has(n));
    this.usedShips.add(n);
    return n;
  }

  /** Remember finished levels per difficulty (open chests on the map). */
  markVisited() {
    if (this.uncharted || this.abyss) return;
    const v = profile().adventure.visited;
    const list = new Set(v[this.difficulty] ?? []);
    list.add(this.levelIndex);
    v[this.difficulty] = [...list];
    saveProfiles();
  }

  visitedEver(level: number) {
    return (profile().adventure.visited[this.difficulty] ?? []).includes(level);
  }

  /** Dive to a chosen map node. */
  diveTo(levelIndex: number) {
    this.endlessLevel = null;
    this.levelIndex = levelIndex;
  }

  /** SetLevel(-1): a random copy of levels 31-36, every copy a little faster each time. */
  diveUncharted() {
    this.endlessCounter++;
    const bump = this.endlessCounter * 0.1;
    for (const l of this.config.endless) {
      l.minSpeed += bump;
      l.maxSpeed += bump;
      for (const w of l.waves) {
        for (const e of w.enemies) {
          e.minSpeed += bump;
          e.maxSpeed += bump;
        }
      }
    }
    const i = Math.floor(Math.random() * this.config.endless.length);
    this.endlessLevel = this.config.endless[i];
    this.levelIndex = 30 + i;
  }

  /** "Difficulty: X + N%" shown in uncharted waters. */
  unchartedPercent() {
    const k = [2.5, 2.2222, 2.0, 1.7857, 1.4286][this.diffIndex];
    return Math.trunc((this.endlessCounter + 1) * 0.1 * k * 100);
  }

  addScore(n: number) {
    this.score += n;
    while (this.score >= this.nextExtraLife) {
      this.lives++;
      const t = EXTRA_LIVES[this.difficulty];
      this.extraLifeIdx++;
      this.nextExtraLife =
        this.extraLifeIdx < t.first.length ? t.first[this.extraLifeIdx] : this.nextExtraLife + t.step;
      this.onExtraLife?.();
    }
  }

  get accuracy(): number {
    const total = this.correct + this.typos;
    return total ? Math.trunc((100 * this.correct) / total) : 100;
  }

  /** Adjusted WPM; null when there's no typing time yet. */
  get adjustedWpm(): number | null {
    const minutes = this.typingMs / 60000;
    if (minutes <= 0) return null;
    const raw = Math.trunc(this.correct / 5 / minutes);
    const adj = Math.trunc(0.75 * raw - this.typos / 5 / minutes);
    return adj < 0 ? null : adj;
  }

  bossBonus() {
    return this.abyss ? 100_000 : BOSS_BONUS[this.diffIndex];
  }

  /** Speed penalty for themed words. */
  themePenalty(): number {
    if (this.abyss) return this.depth <= 1000 ? 0.1 : this.depth <= 2500 ? 0.075 : this.depth <= 4000 ? 0.025 : 0;
    return [0.1, 0.1, 0.075, 0.025, 0][this.diffIndex];
  }

  /** Toxic shark letter-mutation delay after each correct letter (ms). */
  toxicDelay(): number {
    return this.abyss ? 1500 : [2500, 2000, 2000, 1700, 1300][this.diffIndex];
  }

  /** Level completion bonus. */
  levelBonus() {
    return Math.min(60_000, (this.diffIndex + 1) * Math.min(this.levelIndex + 1, 11) * 1000);
  }

  /** Level accuracy bonus for n levels at >= 95%. */
  levelAccuracyBonus(n: number) {
    return Math.min(100_000, (Math.min(this.levelIndex + 1, 8) + this.diffIndex * 4) * (Math.min(n, 6) * 1000 + 500) + 3000);
  }

  /** End-of-wave gold-medal bonus. */
  waveBonus(acc: number, wavePoints: number) {
    const lvl = Math.min(this.levelIndex + 1, 11) > 10 ? 10 : Math.min(this.levelIndex + 1, 11);
    return Math.min(20_000, Math.trunc(acc * 0.01 * wavePoints + lvl * Math.min(this.goldStreak, 10) * 75 + this.diffIndex * 200));
  }

  /** Treasure-dive word value; n = words already typed this dive. */
  treasureWordValue(n: number) {
    switch (this.difficulty) {
      case 'easy': return (n + 1) * 50;
      case 'normal': return 150 + 100 * n;
      case 'hard': return 450 + 250 * n;
      case 'expert': return 1000 + 600 * n;
      case 'xtreme': return 3800 + 1050 * n;
    }
  }

  /** Top-background variant by 0-based level index. */
  topBackground(): string {
    if (this.abyss) return 'topbackground';
    const i = this.levelIndex;
    if ([0, 1, 2, 3, 6].includes(i)) return 'topbackground';
    if ([4, 5, 14, 17, 18, 19, 25].includes(i)) return 'topbackground_volcano';
    if ([7, 8, 12, 13, 16, 24, 28].includes(i)) return 'topbackground_shipwreck';
    if ([9, 10, 11, 15, 20, 22, 23, 31].includes(i)) return 'topbackground_lighthouse';
    if ([21, 26, 27, 32].includes(i)) return 'topbackground_iceberg';
    return 'topbackground_storm';
  }
}
