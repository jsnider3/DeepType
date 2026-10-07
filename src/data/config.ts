// Difficulty configs (easy/normal/hard/expert/xtreme-cfg.xml, abyss.xml), loaded with
// the same rules as the original game:
// - Inheritance is copy-at-open: a <Level> copies Default when it opens, a <Wave>
//   copies its Level, an <Enemy> copies its Wave/Level. Tags after a child has opened
//   don't propagate into it.
// - Speeds are adjusted at load time (per scope and per enemy type).
// - Bonus waves force KnockBack 0 and 12..15 creatures.

import { parsePXml, type PNode } from './pxml';

export type WaveType = 'Sharks' | 'Piranhas' | 'Bonus' | 'Boss';
export type EnemyType =
  | 'Blue' | 'Black' | 'Red' | 'Stealth' | 'Toxic' | 'CrazyToxic' | 'White' | 'WhiteStealth'
  | 'Purple' | 'RedStealth' | 'BlackStealth' | 'Standard' | 'Torpedo' | 'Ghost'
  | 'GhostShip' | 'MechaShark' | 'MechaSquid';

export const STEALTH_TYPES: EnemyType[] = ['Stealth', 'WhiteStealth', 'RedStealth', 'BlackStealth'];
export const BOSS_TYPES: EnemyType[] = ['Torpedo', 'MechaShark', 'MechaSquid', 'GhostShip'];

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert', 'xtreme'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert', xtreme: 'X-Treme!',
};

export interface EnemyDef {
  type: EnemyType;
  minSpeed: number;
  maxSpeed: number;
  minDiff: number;
  maxDiff: number;
  minNumber: number;
  maxNumber: number;
  themeRandom: boolean;
  // Bosses
  timeToFire: number;
  health: number;
  minMissiles: number;
  maxMissiles: number;
  bobSpeed: number;
  minMissileSpeed: number;
  maxMissileSpeed: number;
}

export interface WaveDef {
  type: WaveType;
  knockBack: number;
  minCol: number;
  maxCol: number;
  enemies: EnemyDef[];
}

/** Values shared by Default and Level scopes. */
interface ScopeVals {
  minSpeed: number;
  maxSpeed: number;
  knockBack: number;
  minDiff: number;
  maxDiff: number;
  diverSpeed: number;
  minEndDiff: number;
  maxEndDiff: number;
  minCol: number;
  maxCol: number;
  letterDelay: number;
  numForPenalty: number;
  oceanDepth: number;
  penaltySpeed: number;
}

export interface LevelDef extends ScopeVals {
  bonusLevel: boolean;
  firstWave: number;
  waves: WaveDef[];
}

const INT_TAGS: Record<string, keyof ScopeVals> = {
  KnockBack: 'knockBack', MinDiff: 'minDiff', MaxDiff: 'maxDiff', MinEndDiff: 'minEndDiff',
  MaxEndDiff: 'maxEndDiff', MinCol: 'minCol', MaxCol: 'maxCol', LetterDelay: 'letterDelay',
  NumForPenalty: 'numForPenalty', OceanDepth: 'oceanDepth',
};
const FLOAT_TAGS: Record<string, keyof ScopeVals> = { DiverSpeed: 'diverSpeed', PenaltySpeed: 'penaltySpeed' };

function adjustEnemySpeed(raw: number, type: EnemyType, wave: WaveType, xt: boolean, isMax: boolean): number {
  // Speed adjustment rules; first match wins.
  if (type === 'Black' && xt) return raw;
  if (type === 'Red' && xt) return raw - 0.05;
  if (wave === 'Sharks' && (type === 'Stealth' || type === 'RedStealth' || type === 'BlackStealth'))
    return raw * (isMax ? 0.75 : 0.7);
  if (wave === 'Piranhas' && (type === 'WhiteStealth' || type === 'Stealth')) return raw * (isMax ? 0.9 : 0.75);
  if (type === 'Ghost' && xt) return raw + 0.05;
  if (type === 'Blue' && xt && wave === 'Sharks') return raw + 0.15;
  if (wave === 'Piranhas') return raw + (isMax ? (xt ? 0.35 : 0.2) : xt ? 0.25 : 0.05) + 0.15;
  if (wave === 'Bonus') return raw + 0.2;
  return raw + (xt ? 0 : isMax ? 0.1 : 0.05);
}

function num(n: PNode): number {
  return Number(n.text);
}

export class GameConfig {
  readonly levels: LevelDef[] = [];
  /** Deep copies of levels 31-36 used for the endless levels after level 36. */
  readonly endless: LevelDef[] = [];
  readonly abyss: boolean;

  /** `difficulty` is the file's difficulty; null for abyss.xml. */
  constructor(src: string, difficulty: Difficulty | null) {
    const xt = difficulty === 'xtreme';
    const root = parsePXml(src);
    const cfg = root.children.find((c) => c.tag === 'Config') ?? root;
    this.abyss = cfg.children.some((c) => c.tag === 'AbyssMode');

    const defaults: ScopeVals = {
      minSpeed: 0, maxSpeed: 0, knockBack: 0, minDiff: 0, maxDiff: 0, diverSpeed: 0,
      minEndDiff: 0, maxEndDiff: 0, minCol: 0, maxCol: 0, letterDelay: 0,
      numForPenalty: 1, oceanDepth: 0, penaltySpeed: 1.0,
    };
    const scopeTag = (vals: ScopeVals, n: PNode) => {
      if (n.tag === 'MinSpeed') vals.minSpeed = num(n) + (xt ? 0 : 0.03);
      else if (n.tag === 'MaxSpeed') vals.maxSpeed = num(n) + (xt ? 0 : 0.1);
      else if (n.tag in INT_TAGS) vals[INT_TAGS[n.tag]] = Math.trunc(num(n));
      else if (n.tag in FLOAT_TAGS) vals[FLOAT_TAGS[n.tag]] = num(n);
    };

    for (const node of cfg.children) {
      if (node.tag === 'Default') {
        for (const c of node.children) scopeTag(defaults, c);
      } else if (node.tag === 'Level') {
        this.levels.push(this.loadLevel(node, defaults, scopeTag, xt));
      }
    }
    if (!this.abyss) {
      for (const l of this.levels.slice(30)) this.endless.push(structuredClone(l));
    }
  }

  private loadLevel(node: PNode, defaults: ScopeVals, scopeTag: (v: ScopeVals, n: PNode) => void, xt: boolean): LevelDef {
    const level: LevelDef = { ...defaults, bonusLevel: false, firstWave: 0, waves: [] };
    for (const c of node.children) {
      if (c.tag === 'BonusLevel') level.bonusLevel = true;
      else if (c.tag === 'Wave') {
        const wave = this.loadWave(c, level, xt);
        if (c.children.some((w) => w.tag === 'FirstWave')) level.firstWave = level.waves.length;
        level.waves.push(wave);
      } else scopeTag(level, c);
    }
    return level;
  }

  private loadWave(node: PNode, level: LevelDef, xt: boolean): WaveDef {
    const type = (node.attrs.Type ?? 'Sharks') as WaveType;
    const wave: WaveDef = {
      type,
      knockBack: type === 'Bonus' ? 0 : level.knockBack,
      minCol: level.minCol,
      maxCol: level.maxCol,
      enemies: [],
    };
    let waveMin = 0;
    let waveMax = 0;
    for (const c of node.children) {
      switch (c.tag) {
        case 'MinSpeed': waveMin = num(c) + 0.1; break;
        case 'MaxSpeed': waveMax = num(c) + 0.1; break;
        case 'KnockBack':
          if (type === 'Bonus') level.knockBack = Math.trunc(num(c));
          else wave.knockBack = Math.trunc(num(c));
          break;
        case 'MinCol': wave.minCol = Math.trunc(num(c)); break;
        case 'MaxCol': wave.maxCol = Math.trunc(num(c)); break;
        case 'Enemy': {
          const t = (c.attrs.Type ?? 'Blue') as EnemyType;
          const e: EnemyDef = {
            type: t,
            minSpeed: waveMin > 0 ? waveMin : level.minSpeed,
            maxSpeed: waveMax > 0 ? waveMax : level.maxSpeed,
            minDiff: level.minDiff,
            maxDiff: level.maxDiff,
            minNumber: 0, maxNumber: 0, themeRandom: false,
            timeToFire: 0, health: 0, minMissiles: 0, maxMissiles: 0, bobSpeed: 0,
            minMissileSpeed: 0, maxMissileSpeed: 0,
          };
          for (const f of c.children) {
            const v = num(f);
            switch (f.tag) {
              case 'MinSpeed': e.minSpeed = adjustEnemySpeed(v, t, type, xt, false); break;
              case 'MaxSpeed': e.maxSpeed = adjustEnemySpeed(v, t, type, xt, true); break;
              case 'MinDiff': e.minDiff = Math.trunc(v); break;
              case 'MaxDiff': e.maxDiff = Math.trunc(v); break;
              case 'MinNumber': e.minNumber = Math.trunc(v); break;
              case 'MaxNumber': e.maxNumber = Math.trunc(v); break;
              case 'ThemeRandom': e.themeRandom = true; break;
              case 'KnockBack': wave.knockBack = Math.trunc(v); break;
              case 'TimeToFire': e.timeToFire = v; break;
              case 'Health': e.health = Math.trunc(v); break;
              case 'MinMissiles': e.minMissiles = Math.trunc(v); break;
              case 'MaxMissiles': e.maxMissiles = Math.trunc(v); break;
              case 'BobSpeed': e.bobSpeed = v; break;
              case 'MinMissileSpeed': e.minMissileSpeed = v + 0.3; break;
              case 'MaxMissileSpeed': e.maxMissileSpeed = v + 0.3; break;
            }
          }
          if (type === 'Bonus') {
            e.minNumber = 12;
            e.maxNumber = 15;
          }
          wave.enemies.push(e);
          break;
        }
      }
    }
    // SortEnemies: stealth types first (stable).
    wave.enemies.sort((a, b) => Number(STEALTH_TYPES.includes(b.type)) - Number(STEALTH_TYPES.includes(a.type)));
    return wave;
  }
}
