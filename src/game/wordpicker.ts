// Word/letter selection. Every word or letter on screen within one wave
// starts with a different letter, so the first keystroke always identifies one target.

import { data } from '../engine/assets';
import { parseBuckets, parseThemes, type Buckets } from '../data/words';
import { rand, rollRange } from './rng';

export class WordPicker {
  private waves: Buckets;
  private twords: Buckets;
  private themes: string[][];
  private usedWords = new Set<string>();
  private usedTreasure = new Set<string>();
  private usedThemes = new Set<number>();
  private usedLetters = '';
  private waveTheme = -1;

  constructor() {
    this.waves = parseBuckets(data('waves.txt'), 'LENGTH');
    this.twords = parseBuckets(data('twords.txt'), 'DIFF');
    this.themes = parseThemes(data('themes.txt')).map((t) => t.words);
  }

  /** Called at the start of every wave. */
  newWave() {
    this.usedLetters = '';
    this.waveTheme = -1;
  }

  /** Releases a word's first letter (not done by the original; kept for treasure/clams). */
  get lettersInUse() {
    return this.usedLetters;
  }

  /** Random word: length in [min, max) from waves.txt, clamped to 3..7. */
  word(minDiff: number, maxDiff: number): string {
    const min = minDiff === -1 ? 3 : Math.max(3, minDiff);
    const max = maxDiff === -1 || maxDiff > 7 ? 7 : maxDiff;
    const len = Math.min(7, rollRange(min, max));
    const bucket = this.waves.get(len)!;
    for (let tries = 0; tries < bucket.length * 4; tries++) {
      if (tries > 0 && tries % bucket.length === 0) this.usedWords.clear();
      const w = bucket[rand() % bucket.length];
      if (this.usedWords.has(w) || this.usedLetters.includes(w[0])) continue;
      this.usedWords.add(w);
      this.usedLetters += w[0];
      return w;
    }
    return '';
  }

  /** Theme word: one random theme per wave; falls back to word(). */
  themeWord(minDiff: number, maxDiff: number): { word: string; themed: boolean } {
    if (this.waveTheme === -1) {
      if (this.usedThemes.size >= this.themes.length) this.usedThemes.clear();
      do this.waveTheme = rand() % this.themes.length;
      while (this.usedThemes.has(this.waveTheme));
      this.usedThemes.add(this.waveTheme);
    }
    const candidates = [...this.themes[this.waveTheme]];
    while (candidates.length) {
      const w = candidates.splice(rand() % candidates.length, 1)[0];
      if (this.usedWords.has(w) || this.usedLetters.includes(w[0])) continue;
      this.usedWords.add(w);
      this.usedLetters += w[0];
      return { word: w, themed: true };
    }
    return { word: this.word(minDiff, maxDiff), themed: false };
  }

  /** Random letter: unique A-Z, '' when all 26 are in use. */
  letter(): string {
    if (this.usedLetters.length >= 26) return '';
    let c: string;
    do c = String.fromCharCode(65 + (rand() % 26));
    while (this.usedLetters.includes(c));
    this.usedLetters += c;
    return c;
  }

  /** Ghost shark gibberish: unique first letter + random A-Z. */
  gibberish(minDiff: number, maxDiff: number): string {
    const len = rollRange(minDiff, maxDiff);
    let s = this.letter();
    for (let i = 1; i < len; i++) s += String.fromCharCode(65 + (rand() % 26));
    return s;
  }

  /** Treasure-dive word from twords.txt, Diff in [min, max) with max clamped to 21. */
  treasureWord(minEndDiff: number, maxEndDiff: number): string {
    const min = minEndDiff === -1 ? 3 : minEndDiff;
    const max = maxEndDiff === -1 || maxEndDiff > 21 ? 21 : maxEndDiff;
    for (;;) {
      const bucket = this.twords.get(rollRange(min, max));
      if (!bucket) return 'TREASURE';
      for (let tries = 0; tries < bucket.length; tries++) {
        const w = bucket[rand() % bucket.length];
        if (this.usedTreasure.has(w)) continue;
        this.usedTreasure.add(w);
        return w;
      }
      this.usedTreasure.clear();
    }
  }
}
