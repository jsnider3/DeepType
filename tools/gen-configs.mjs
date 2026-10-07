#!/usr/bin/env node
// Generates the remastered difficulty configs (easy/normal/hard/expert/xtreme-cfg.xml and
// abyss.xml) into packs/remastered/data/. The level design below is original to this
// project; only the file schema follows the original game (see docs/GAME_DESIGN.md §3.1).
//
//   node tools/gen-configs.mjs
//
// Design notes
// - Speeds are designed as the *effective* speed (pixels per 10 ms tick) an enemy ends up
//   with, and converted back to the raw XML value by inverting the load-time adjustments
//   that src/data/config.ts applies (per scope, per enemy type, X-Treme exceptions).
// - Word lengths (MinDiff/MaxDiff) are designed as inclusive ranges and written with the
//   game's exclusive Max (rand % (max - min) + min; Max > 7 is clamped to 7, so 7-letter
//   words need MinDiff = MaxDiff = 7).
// - Enemy counts are designed for Normal and scaled per difficulty (MaxNumber exclusive),
//   capped so one wave never needs more than ~22 distinct first letters.
// - Every difficulty shares the same level structure; numbers scale with the difficulty
//   "power" p (0 = Easy ... 4 = X-Treme) and with the map stage of the level.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'packs', 'remastered', 'data');

// ------------------------------------------------------------------ helpers

const lerp = (arr, p) => {
  const i = Math.max(0, Math.min(arr.length - 1, p));
  const lo = Math.floor(i);
  const hi = Math.min(arr.length - 1, lo + 1);
  return arr[lo] + (arr[hi] - arr[lo]) * (i - lo);
};
const r3 = (x) => Math.round(x * 1000) / 1000;
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(3));

const STEALTH_SHARKS = ['Stealth', 'RedStealth', 'BlackStealth'];
const WORDS_PER = { Blue: 1, Stealth: 1, Ghost: 1, Toxic: 1, Black: 2, BlackStealth: 2, Red: 3, RedStealth: 3 };
const LETTERS_PER = { Blue: 1, Stealth: 1, White: 2, WhiteStealth: 2 };

/** Inverse of config.ts adjustEnemySpeed: the raw XML value that loads as `eff`. */
function rawSpeed(eff, type, wave, xt, isMax) {
  if (type === 'Black' && xt) return eff;
  if (type === 'Red' && xt) return eff + 0.05;
  if (wave === 'Sharks' && STEALTH_SHARKS.includes(type)) return eff / (isMax ? 0.75 : 0.7);
  if (wave === 'Piranhas' && (type === 'WhiteStealth' || type === 'Stealth')) return eff / (isMax ? 0.9 : 0.75);
  if (type === 'Ghost' && xt) return eff - 0.05;
  if (type === 'Blue' && xt && wave === 'Sharks') return eff - 0.15;
  if (wave === 'Piranhas') return eff - ((isMax ? (xt ? 0.35 : 0.2) : xt ? 0.25 : 0.05) + 0.15);
  if (wave === 'Bonus') return eff - 0.2;
  return eff - (xt ? 0 : isMax ? 0.1 : 0.05);
}

// ------------------------------------------------------------------ tuning (by power p)

// Effective speed band of a plain shark / piranha at stage 1, and the per-stage ramp.
const SHARK_LO = [0.27, 0.33, 0.39, 0.5, 0.66];
const SHARK_HI = [0.33, 0.41, 0.5, 0.63, 0.8];
const SHARK_RAMP = [0.003, 0.005, 0.007, 0.008, 0.009];
const PIR_LO = [0.42, 0.52, 0.6, 0.72, 0.92];
const PIR_HI = [0.55, 0.68, 0.78, 0.92, 1.12];
const COUNT_SCALE = [0.75, 1, 1.2, 1.4, 1.6];

// Relative speed of each enemy type (multi-word and stealth sharks are slower).
const SHARK_FACTOR = { Blue: 1, Stealth: 0.72, Black: 0.88, BlackStealth: 0.66, Red: 0.76, RedStealth: 0.6, Ghost: 0.9, Toxic: 0.8 };
const PIR_FACTOR = { Blue: 1, Stealth: 0.86, White: 0.84, WhiteStealth: 0.76 };

function sharkSpeed(p, stage, type) {
  const ramp = lerp(SHARK_RAMP, p) * (stage - 1);
  const f = SHARK_FACTOR[type];
  return [(lerp(SHARK_LO, p) + ramp) * f, (lerp(SHARK_HI, p) + ramp) * f];
}
function piranhaSpeed(p, stage, type) {
  const ramp = lerp(SHARK_RAMP, p) * 1.2 * (stage - 1);
  const f = PIR_FACTOR[type];
  return [(lerp(PIR_LO, p) + ramp) * f, (lerp(PIR_HI, p) + ramp) * f];
}

/** Inclusive word-length range for a plain shark word. */
function wordLen(p, stage, kind) {
  const x = 0.6 * p + 0.12 * (stage - 1);
  let lo = Math.max(3, Math.floor(2.6 + x));
  let hi = Math.max(lo, Math.floor(3.3 + x));
  if (hi > 6) hi = 6;
  if (lo > hi) lo = hi;
  if (kind === 'short') return [Math.max(3, lo - 1), Math.max(3, hi - 1)];
  if (kind === 'long') return hi + 1 >= 7 ? [7, 7] : [hi, hi + 1];
  return [lo, hi];
}

/** [MinDiff, MaxDiff] with the game's exclusive max. */
function diffTags([lo, hi]) {
  return hi > lo ? [lo, hi + 1] : [lo, lo];
}

/** [MinNumber, MaxNumber] with exclusive max. */
function countTags(lo, hi) {
  return hi > lo ? [lo, hi + 1] : [lo, lo];
}

function scaleCounts(enemies, p, perUnit, cap) {
  const s = lerp(COUNT_SCALE, p);
  let out = enemies.map(([t, lo, hi, o]) => {
    const a = Math.max(1, Math.round(lo * s));
    return [t, a, Math.max(a, Math.round(hi * s)), o];
  });
  // Keep the number of distinct first letters the wave needs within the cap.
  const need = () => out.reduce((n, [t, , hi]) => n + hi * perUnit[t], 0);
  while (need() > cap) {
    let best = 0;
    out.forEach((e, i) => {
      if (e[2] * perUnit[e[0]] > out[best][2] * perUnit[out[best][0]]) best = i;
    });
    const e = out[best];
    if (e[2] <= 1) break;
    e[2]--;
    if (e[1] > e[2]) e[1] = e[2];
  }
  return out;
}

// ------------------------------------------------------------------ XML writer

class Xml {
  lines = [];
  depth = 0;
  line(s = '') {
    this.lines.push(s ? '\t'.repeat(this.depth) + s : '');
  }
  leaf(tag, v) {
    this.line(`<${tag}>\t${typeof v === 'number' ? fmt(v) : v}\t</${tag}>`);
  }
  flag(tag) {
    this.line(`<${tag}>\t</${tag}>`);
  }
  open(s) {
    this.line(`<${s}>`);
    this.depth++;
  }
  close(tag) {
    this.depth--;
    this.line(`</${tag}>`);
  }
  toString() {
    return this.lines.join('\r\n') + '\r\n';
  }
}

// ------------------------------------------------------------------ waves

// Wave spec: { t: 'S' | 'P' | 'B' | 'X', e: [[type, lo, hi, opts?]], theme?, len?, first? }
//   S = sharks, P = piranhas, B = bonus jellyfish, X = boss ({ boss: 'Torpedo' | ... }).
//   Counts are for Normal; opts.len = 'short' | 'long' overrides the word length class.

const S = (e, o = {}) => ({ t: 'S', e, ...o });
const P = (e, o = {}) => ({ t: 'P', e, ...o });
const B = (o = {}) => ({ t: 'B', e: [['Standard', 4, 5]], ...o });
const X = (boss) => ({ t: 'X', boss });

const BOSS = {
  Torpedo: { health: 200, cannon: false, speed: [0.5, 0.6], step: 0.1 },
  MechaShark: { health: 250, cannon: false, speed: [0.58, 0.7], step: 0.11 },
  MechaSquid: { health: 300, cannon: true, speed: [0.78, 0.88], step: 0.28 },
  GhostShip: { health: 400, cannon: true, speed: [0.8, 0.95], step: 0.3 },
};

function writeWave(x, w, idx, p, stage, xt, { abyss = false } = {}) {
  const type = { S: 'Sharks', P: 'Piranhas', B: 'Bonus', X: 'Boss' }[w.t];
  if (w.note) x.line(`<!-- ${w.note} -->`);
  x.open(`Wave WaveNum = "${idx + 1}" Type = "${type}"`);
  if (w.first) x.flag('FirstWave');

  if (w.t === 'X') {
    const b = BOSS[w.boss];
    const tp = abyss ? p : p;
    const lo = b.speed[0] + b.step * tp;
    const hi = b.speed[1] + b.step * tp;
    const len = diffTags(wordLen(p, stage, 'short'));
    x.open(`Enemy Type = "${w.boss}"`);
    x.leaf('KnockBack', 0);
    x.leaf('TimeToFire', Math.round(lerp([1500, 1250, 1100, 950, 800], p)));
    x.leaf('Health', b.health);
    x.leaf('MinMissiles', p < 1 ? 1 : 2);
    x.leaf('MaxMissiles', p < 1 ? 2 : p < 3 ? 3 : 4);
    x.leaf('BobSpeed', r3(lerp([0.15, 0.2, 0.22, 0.25, 0.3], p)));
    x.leaf('MinDiff', len[0]);
    x.leaf('MaxDiff', len[1]);
    x.leaf('MinNumber', 1);
    x.leaf('MaxNumber', 1);
    // +0.3 is added at load time.
    x.leaf('MinMissileSpeed', r3(lo - 0.3));
    x.leaf('MaxMissileSpeed', r3(hi - 0.3));
    x.close('Enemy');
    x.close('Wave');
    return;
  }

  if (w.t === 'B') {
    x.leaf('MinCol', 3);
    x.leaf('MaxCol', 5);
    if (w.secret) x.leaf('KnockBack', 0);
    x.open('Enemy Type = "Standard"');
    if (!w.secret) {
      x.leaf('MinSpeed', r3(rawSpeed(0.78, 'Standard', 'Bonus', xt, false)));
      x.leaf('MaxSpeed', r3(rawSpeed(0.98, 'Standard', 'Bonus', xt, true)));
    }
    x.leaf('MinDiff', 3);
    x.leaf('MaxDiff', 3);
    x.leaf('MinNumber', 12);
    x.leaf('MaxNumber', 15);
    x.close('Enemy');
    x.close('Wave');
    return;
  }

  const sharks = w.t === 'S';
  if (!sharks) {
    // Piranha schools stack a little taller than shark packs.
    x.leaf('MinCol', Math.round(lerp([4, 5, 5, 6, 6], p)));
    x.leaf('MaxCol', Math.round(lerp([6, 7, 8, 8, 9], p)));
  }
  const enemies = scaleCounts(w.e, p, sharks ? WORDS_PER : LETTERS_PER, sharks ? 22 : 22);
  for (const [t, lo, hi, o = {}] of enemies) {
    const [smin, smax] = sharks ? sharkSpeed(p, stage, t) : piranhaSpeed(p, stage, t);
    x.open(`Enemy Type = "${t}"`);
    if (w.theme && sharks) x.flag('ThemeRandom');
    x.leaf('MinSpeed', r3(rawSpeed(smin, t, type, xt, false)));
    x.leaf('MaxSpeed', r3(rawSpeed(smax, t, type, xt, true)));
    let kind = o.len ?? w.len ?? 'normal';
    if (sharks && WORDS_PER[t] > 1 && !o.len) kind = 'short';
    if (t === 'Ghost') kind = 'short';
    const d = sharks ? diffTags(wordLen(p, stage, kind)) : [3, 3];
    x.leaf('MinDiff', d[0]);
    x.leaf('MaxDiff', d[1]);
    const [nlo, nhi] = countTags(lo, hi);
    x.leaf('MinNumber', nlo);
    x.leaf('MaxNumber', nhi);
    x.close('Enemy');
  }
  x.close('Wave');
}

// ------------------------------------------------------------------ adventure design

// Map stage of each level (shortest route from the port; see src/game/mapdata.ts).
// Level numbers are 1-based as in the XML.
const ADVENTURE = {
  1: { stage: 1, note: 'The shallows: plain sharks only', waves: [
    S([['Blue', 3, 5]], { first: true }),
    S([['Blue', 4, 6]]),
    S([['Blue', 3, 5]], { theme: true }),
  ] },
  2: { stage: 2, note: 'First piranha school and jellyfish', waves: [
    S([['Blue', 4, 6]]),
    P([['Blue', 7, 9]], { first: true }),
    B(),
    S([['Blue', 4, 5]], { theme: true }),
    P([['Blue', 8, 10]]),
  ] },
  3: { stage: 3, note: 'Stealth sharks appear', waves: [
    S([['Stealth', 4, 5]], { first: true }),
    S([['Blue', 4, 6]], { theme: true }),
    S([['Stealth', 2, 3], ['Blue', 3, 4]]),
    P([['Blue', 8, 10]]),
  ] },
  4: { stage: 4, note: 'Hammerheads, then the pirate sub', waves: [
    S([['Black', 2, 3]], { first: true }),
    S([['Stealth', 4, 5]], { theme: true }),
    S([['Black', 2, 2], ['Stealth', 2, 3]]),
    B(),
    P([['Blue', 9, 11]]),
    X('Torpedo'),
  ] },
  5: { stage: 5, note: 'Toxic sharks debut', waves: [
    S([['Stealth', 4, 5]]),
    S([['Toxic', 2, 3]], { first: true }),
    S([['Blue', 5, 6]], { theme: true }),
    P([['Blue', 9, 11]]),
    S([['Toxic', 1, 2], ['Blue', 3, 4]]),
    S([['Black', 2, 3]]),
  ] },
  6: { secret: true, stage: 6, note: 'Secret clam bed (sunken garden)' },
  7: { stage: 3, note: 'Strong piranhas', waves: [
    P([['White', 4, 6]], { first: true }),
    P([['Blue', 8, 11]]),
    S([['Blue', 4, 6]], { theme: true }),
    P([['White', 3, 4], ['Blue', 4, 6]]),
    B(),
  ] },
  8: { stage: 3, note: 'Hammerheads', waves: [
    S([['Black', 2, 3]], { first: true }),
    S([['Blue', 4, 6]]),
    S([['Blue', 5, 6]], { theme: true, len: 'long' }),
    S([['Black', 1, 2], ['Blue', 3, 4]]),
    P([['Blue', 8, 10]]),
  ] },
  9: { stage: 5, note: 'Ghost sharks debut', waves: [
    S([['Ghost', 3, 4]], { first: true }),
    S([['Black', 2, 3]]),
    S([['Stealth', 4, 5]], { theme: true }),
    S([['Ghost', 2, 3], ['Blue', 2, 3]]),
    P([['Blue', 9, 11]]),
    B(),
  ] },
  10: { stage: 4, note: 'Stealth piranhas, then the pirate sub', waves: [
    P([['Stealth', 6, 8]], { first: true }),
    P([['White', 4, 6]]),
    P([['Stealth', 4, 5], ['Blue', 4, 5]]),
    S([['Blue', 5, 6]], { theme: true }),
    B(),
    P([['White', 3, 4], ['Stealth', 3, 4]]),
    X('Torpedo'),
  ] },
  11: { stage: 4, note: 'Hammerheads and strong piranhas, then the pirate sub', waves: [
    S([['Black', 2, 3]], { first: true }),
    P([['White', 5, 6]]),
    S([['Blue', 5, 6]], { theme: true }),
    S([['Black', 1, 2], ['Blue', 3, 4]]),
    P([['White', 3, 4], ['Blue', 5, 6]]),
    X('Torpedo'),
  ] },
  12: { stage: 5, note: 'Tiger sharks debut', waves: [
    S([['Red', 1, 2]], { first: true }),
    S([['Black', 2, 3]]),
    S([['Blue', 5, 6]], { theme: true }),
    S([['Red', 1, 1], ['Blue', 3, 4]]),
    P([['White', 5, 6]]),
    S([['Stealth', 4, 5]]),
  ] },
  13: { stage: 4, note: 'Stealth sharks and hammerheads, then the pirate sub', waves: [
    S([['Stealth', 4, 5]], { first: true }),
    S([['Black', 2, 3]]),
    S([['Stealth', 2, 3], ['Black', 1, 2]]),
    S([['Blue', 5, 6]], { theme: true }),
    P([['Blue', 9, 11]]),
    B(),
    X('Torpedo'),
  ] },
  14: { stage: 5.5, note: 'Toxic sharks, hammerheads, strong piranhas', waves: [
    S([['Toxic', 2, 3]], { first: true }),
    S([['Black', 2, 3]]),
    P([['White', 5, 6]]),
    S([['Toxic', 1, 2], ['Black', 1, 2]]),
    S([['Stealth', 4, 5]], { theme: true }),
    P([['White', 3, 4], ['Blue', 4, 6]]),
  ] },
  15: { stage: 6, note: 'Ghosts, toxic and stealth sharks', waves: [
    S([['Ghost', 3, 4]], { first: true }),
    S([['Toxic', 2, 3]]),
    S([['Stealth', 4, 6]], { theme: true }),
    S([['Ghost', 2, 3], ['Toxic', 1, 2]]),
    P([['Stealth', 7, 9]]),
    B(),
  ] },
  16: { stage: 6, note: 'Tigers plus a mix of all piranha types', waves: [
    S([['Red', 2, 2]], { first: true }),
    P([['Stealth', 7, 9]]),
    P([['White', 4, 6]]),
    P([['WhiteStealth', 3, 4], ['Blue', 4, 5]]),
    S([['Blue', 5, 6]], { theme: true }),
    S([['Red', 1, 1], ['Black', 1, 2]]),
  ] },
  17: { stage: 6, note: 'Hammerheads with hidden words', waves: [
    S([['BlackStealth', 2, 3]], { first: true }),
    S([['Red', 1, 2]]),
    S([['Black', 2, 3]], { theme: true }),
    S([['BlackStealth', 1, 2], ['Blue', 3, 4]]),
    P([['White', 5, 6]]),
    B(),
  ] },
  18: { stage: 6.5, note: 'Hidden-word hammerheads alongside toxic sharks', waves: [
    S([['BlackStealth', 2, 3]], { first: true }),
    S([['Toxic', 2, 3]]),
    S([['BlackStealth', 1, 2], ['Toxic', 1, 2]]),
    S([['Stealth', 4, 6]], { theme: true }),
    P([['WhiteStealth', 3, 4], ['Stealth', 3, 4]]),
    P([['Blue', 10, 12]]),
  ] },
  19: { secret: true, stage: 7.5, note: 'Secret clam bed (volcanic vent)' },
  20: { stage: 7, note: 'Ghosts and toxic sharks, then the mecha-shark', waves: [
    S([['Ghost', 3, 5]], { first: true }),
    S([['Toxic', 3, 4]]),
    S([['Ghost', 2, 3], ['Stealth', 2, 3]]),
    S([['Black', 2, 3]], { theme: true }),
    P([['Stealth', 8, 10]]),
    S([['Toxic', 2, 2], ['Blue', 2, 3]]),
    X('MechaShark'),
  ] },
  21: { secret: true, stage: 6, note: 'Secret clam bed (lagoon)' },
  22: { stage: 5, note: 'Strong stealth piranhas', waves: [
    P([['WhiteStealth', 4, 5]], { first: true }),
    P([['Stealth', 7, 9]]),
    P([['WhiteStealth', 2, 3], ['White', 2, 3]]),
    S([['Blue', 5, 6]], { theme: true }),
    S([['Black', 2, 3]]),
    B(),
    P([['WhiteStealth', 2, 3], ['Blue', 4, 6]]),
  ] },
  23: { secret: true, stage: 8, note: 'Secret clam bed (reef caves)' },
  24: { stage: 7, note: 'Tigers and hidden-word hammerheads, then the mecha-shark', waves: [
    S([['Red', 2, 2]], { first: true }),
    S([['BlackStealth', 2, 3]]),
    S([['Red', 1, 1], ['BlackStealth', 1, 2]]),
    S([['Stealth', 4, 6]], { theme: true }),
    P([['White', 5, 6]]),
    B(),
    X('MechaShark'),
  ] },
  25: { stage: 7.5, note: 'Hidden-word hammerheads, toxic sharks, then the mecha-shark', waves: [
    S([['BlackStealth', 2, 3]], { first: true }),
    S([['Toxic', 3, 4]]),
    P([['WhiteStealth', 4, 5]]),
    S([['Black', 2, 3]], { theme: true }),
    S([['BlackStealth', 1, 2], ['Toxic', 1, 2]]),
    P([['Stealth', 4, 5], ['White', 2, 3]]),
    X('MechaShark'),
  ] },
  26: { stage: 8, note: 'Tigers with hidden words', waves: [
    S([['RedStealth', 1, 2]], { first: true }),
    S([['Ghost', 3, 5]]),
    S([['Toxic', 3, 4]]),
    S([['RedStealth', 1, 1], ['Blue', 3, 4]]),
    S([['Stealth', 5, 6]], { theme: true }),
    P([['White', 5, 7]]),
    B(),
  ] },
  27: { stage: 6, note: 'Tigers, ghosts and strong stealth piranhas', waves: [
    S([['Red', 1, 2]], { first: true }),
    S([['Ghost', 3, 4]]),
    P([['WhiteStealth', 4, 5]]),
    S([['Red', 1, 1], ['Ghost', 2, 3]]),
    S([['Black', 2, 3]], { theme: true }),
    P([['WhiteStealth', 2, 3], ['White', 2, 3]]),
    B(),
  ] },
  28: { stage: 7, note: 'Tigers and piranha swarms, then the mecha-shark', waves: [
    S([['Red', 2, 2]], { first: true }),
    P([['WhiteStealth', 4, 5]]),
    P([['Stealth', 8, 10]]),
    P([['White', 3, 4], ['Blue', 4, 6]]),
    P([['WhiteStealth', 2, 3], ['Stealth', 3, 4]]),
    S([['Blue', 5, 7]], { theme: true }),
    S([['Red', 1, 1], ['Blue', 3, 4]]),
    X('MechaShark'),
  ] },
  29: { stage: 8.5, note: 'Hammerheads mixed with hidden-word tigers', waves: [
    S([['RedStealth', 1, 2]], { first: true }),
    S([['Black', 3, 3]]),
    S([['BlackStealth', 2, 3]]),
    S([['RedStealth', 1, 1], ['Black', 1, 2]]),
    S([['Blue', 6, 7]], { theme: true, len: 'long' }),
    P([['WhiteStealth', 3, 4], ['White', 2, 3]]),
  ] },
  30: { stage: 9.5, note: 'Every kind of shark', waves: [
    S([['RedStealth', 2, 2]], { first: true }),
    S([['Red', 2, 2]]),
    S([['BlackStealth', 2, 3], ['Black', 1, 2]]),
    S([['Ghost', 3, 4], ['Stealth', 2, 3]]),
    S([['Blue', 6, 7]], { theme: true, len: 'long' }),
    S([['Toxic', 3, 4]]),
    P([['WhiteStealth', 3, 4], ['White', 3, 4]]),
    B(),
  ] },
  31: { stage: 9, note: 'Stealth tigers and toxic sharks', waves: [
    S([['RedStealth', 2, 2]], { first: true }),
    S([['Toxic', 3, 5]]),
    S([['RedStealth', 1, 1], ['Toxic', 1, 2]]),
    S([['Stealth', 5, 6]], { theme: true }),
    P([['Stealth', 9, 11]]),
    S([['Red', 1, 2], ['Blue', 2, 3]]),
  ] },
  32: { stage: 8, note: 'Stealth tigers and piranha swarms', waves: [
    S([['RedStealth', 1, 2]], { first: true }),
    P([['Blue', 11, 13]]),
    P([['Stealth', 8, 10]]),
    P([['WhiteStealth', 3, 4], ['Stealth', 4, 5]]),
    S([['Stealth', 5, 6]], { theme: true }),
    S([['RedStealth', 1, 1], ['Stealth', 2, 3]]),
    B(),
  ] },
  33: { stage: 8, note: 'Toxic sharks, ghosts and hidden-word hammerheads', waves: [
    S([['Toxic', 3, 4]], { first: true }),
    S([['Ghost', 4, 5]]),
    S([['BlackStealth', 2, 3]]),
    S([['Toxic', 1, 2], ['Ghost', 2, 3]]),
    S([['Black', 2, 3]], { theme: true }),
    P([['WhiteStealth', 4, 5]]),
  ] },
  34: { stage: 9, note: 'A bit of everything', waves: [
    S([['Black', 2, 3], ['Red', 1, 1]], { first: true }),
    S([['Toxic', 3, 4]]),
    S([['Ghost', 4, 5]]),
    P([['WhiteStealth', 3, 4], ['Stealth', 4, 5]]),
    S([['Black', 3, 3]], { theme: true }),
    S([['BlackStealth', 2, 3]]),
    B(),
  ] },
  35: { stage: 10, note: 'Stealth hunters, then the robo-squid', waves: [
    S([['BlackStealth', 3, 3]], { first: true }),
    S([['RedStealth', 2, 2]]),
    S([['Toxic', 3, 5]]),
    P([['WhiteStealth', 4, 5]]),
    P([['Stealth', 9, 11]]),
    S([['Stealth', 5, 6]], { theme: true }),
    S([['RedStealth', 1, 1], ['BlackStealth', 1, 2]]),
    X('MechaSquid'),
  ] },
  36: { stage: 11, note: 'The whirlpool: everything, then the ghost ship', waves: [
    S([['RedStealth', 2, 3]], { first: true }),
    S([['Red', 2, 2], ['Black', 1, 2]]),
    S([['Ghost', 4, 5]]),
    S([['Toxic', 3, 5]]),
    P([['WhiteStealth', 3, 4], ['White', 3, 4]]),
    P([['Stealth', 10, 12]]),
    S([['BlackStealth', 2, 3]], { theme: true }),
    S([['BlackStealth', 1, 2], ['Stealth', 2, 3]]),
    B(),
    X('GhostShip'),
  ] },
};

const DIFFS = ['easy', 'normal', 'hard', 'expert', 'xtreme'];
const LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert', xtreme: 'X-Treme' };

function adventure(diff) {
  const p = DIFFS.indexOf(diff);
  const xt = diff === 'xtreme';
  const x = new Xml();
  x.line('<!-- Deep Type: remastered data pack -->');
  x.line(`<!-- Difficulty: ${LABEL[diff]} (generated by tools/gen-configs.mjs) -->`);
  x.line();
  x.open('Config');
  x.open('Default');
  x.leaf('DiverSpeed', 0.3);
  x.leaf('KnockBack', Math.round(lerp([6, 5, 5, 4, 4], p)));
  x.leaf('MinCol', Math.round(lerp([3, 4, 4, 5, 5], p)));
  x.leaf('MaxCol', Math.round(lerp([5, 6, 7, 7, 8], p)));
  x.leaf('MinEndDiff', 3 + 3 * p);
  x.leaf('MaxEndDiff', Math.min(21, 8 + 3 * p));
  x.leaf('LetterDelay', Math.round(lerp([2200, 2000, 1700, 1400, 1100], p)));
  x.leaf('OceanDepth', 300);
  x.leaf('TreasureSecs', 30);
  x.leaf('MapDelay', 250);
  x.close('Default');

  for (let n = 1; n <= 36; n++) {
    const L = ADVENTURE[n];
    x.line();
    x.line(`<!-- LEVEL ${n}: ${L.note} -->`);
    x.open(`Level LevelNum = "${n}"`);
    const tier = Math.floor((L.stage - 1) / 3);
    const endMin = Math.min(19, 3 + 3 * p + tier);
    const endMax = Math.min(21, endMin + 5);
    // Penalty fish: never on Easy, and not before the third stage elsewhere.
    const penalty = p === 0 || L.stage < 3 ? 32765 : [32765, 4, 3, 2, 1][p];
    x.leaf('NumForPenalty', penalty);
    x.leaf('PenaltySpeed', p === 0 ? 0 : r3(lerp([0, 0.45, 0.6, 0.8, 1.1], p) + 0.01 * (L.stage - 1)));
    x.leaf('MinEndDiff', endMin);
    x.leaf('MaxEndDiff', endMax);
    if (L.secret) {
      x.flag('BonusLevel');
      x.leaf('OceanDepth', 50);
      x.line('<!-- The clam game needs no waves; this one is never spawned. -->');
      writeWave(x, B({ secret: true }), 0, p, L.stage, xt);
    } else {
      L.waves.forEach((w, i) => writeWave(x, w, i, p, L.stage, xt));
    }
    x.close('Level');
  }
  x.close('Config');
  return x.toString();
}

// ------------------------------------------------------------------ abyss design

// One level per 200 ft. Bosses are injected by code every 1000 ft, so none here.
// Past the last level the game keeps the last one and speeds it up slightly.
const ABYSS = [
  /* 1 */ [S([['Blue', 4, 6]]), S([['Blue', 4, 6]], { theme: true })],
  /* 2 */ [S([['Blue', 5, 7]]), P([['Blue', 8, 10]]), B()],
  /* 3 */ [S([['Stealth', 4, 5]]), S([['Blue', 5, 6]], { theme: true }), P([['Blue', 9, 11]])],
  /* 4 */ [S([['Black', 2, 3]]), S([['Black', 1, 2], ['Blue', 3, 4]]), P([['White', 4, 6]]), B()],
  /* 5 */ [S([['Stealth', 2, 3], ['Blue', 3, 4]]), P([['White', 3, 4], ['Blue', 5, 6]]), P([['Stealth', 7, 9]]), S([['Blue', 5, 7]], { theme: true })],
  /* 6 */ [S([['Ghost', 3, 4]]), S([['Black', 2, 3]]), P([['Stealth', 4, 5], ['Blue', 4, 5]]), S([['Stealth', 4, 6]], { theme: true })],
  /* 7 */ [S([['Red', 1, 2]]), S([['Black', 1, 2], ['Stealth', 2, 3]]), P([['White', 5, 6]]), B(), S([['Ghost', 2, 3], ['Blue', 2, 3]])],
  /* 8 */ [S([['Toxic', 2, 3]]), S([['Red', 1, 1], ['Blue', 3, 4]]), P([['WhiteStealth', 3, 4]]), S([['Stealth', 5, 6]], { theme: true })],
  /* 9 */ [S([['BlackStealth', 2, 3]]), S([['Ghost', 3, 4], ['Blue', 2, 3]]), P([['White', 3, 4], ['Stealth', 4, 5]]), S([['Red', 1, 2]]), B()],
  /* 10 */ [S([['RedStealth', 1, 2]]), S([['Toxic', 1, 2], ['Black', 1, 2]]), P([['Blue', 11, 13]]), S([['Black', 2, 3]], { theme: true })],
  /* 11 */ [S([['Red', 1, 1], ['Black', 1, 2]]), S([['Toxic', 3, 4]]), P([['WhiteStealth', 2, 3], ['White', 2, 3]]), S([['Ghost', 4, 5]]), B()],
  /* 12 */ [S([['BlackStealth', 2, 3]]), S([['Stealth', 5, 6]], { theme: true }), P([['Stealth', 8, 10]]), S([['RedStealth', 1, 1], ['Blue', 3, 4]])],
  /* 13 */ [S([['Red', 2, 2]]), S([['Ghost', 2, 3], ['Toxic', 1, 2]]), P([['WhiteStealth', 3, 4], ['Blue', 4, 5]]), S([['Blue', 6, 7]], { theme: true, len: 'long' }), B()],
  /* 14 */ [S([['RedStealth', 1, 2]]), S([['BlackStealth', 1, 2], ['Black', 1, 2]]), P([['White', 5, 7]]), S([['Toxic', 3, 4]])],
  /* 15 */ [S([['Black', 3, 3]], { theme: true }), S([['Ghost', 4, 5]]), P([['Stealth', 9, 11]]), S([['Red', 1, 1], ['Stealth', 2, 3]]), B()],
  /* 16 */ [S([['RedStealth', 2, 2]]), S([['Toxic', 3, 5]]), P([['WhiteStealth', 4, 5]]), S([['BlackStealth', 2, 3]])],
  /* 17 */ [S([['Red', 2, 2], ['Black', 1, 2]]), S([['Stealth', 5, 6]], { theme: true }), P([['WhiteStealth', 3, 4], ['Stealth', 4, 5]]), S([['Ghost', 3, 4], ['Toxic', 1, 2]]), B()],
  /* 18 */ [S([['BlackStealth', 3, 3]]), S([['RedStealth', 1, 1], ['Toxic', 1, 2]]), P([['Blue', 12, 14]]), S([['Blue', 6, 7]], { theme: true, len: 'long' })],
  /* 19 */ [S([['RedStealth', 2, 2]]), S([['Ghost', 4, 5]]), P([['White', 3, 4], ['WhiteStealth', 3, 4]]), S([['BlackStealth', 1, 2], ['Stealth', 2, 3]]), B()],
  /* 20 */ [S([['Red', 2, 3]]), S([['Toxic', 4, 5]]), P([['Stealth', 10, 12]]), S([['Black', 3, 3]], { theme: true }), S([['RedStealth', 1, 1], ['BlackStealth', 1, 2]])],
  /* 21 */ [S([['BlackStealth', 3, 3]]), S([['Ghost', 4, 6]]), P([['WhiteStealth', 4, 5], ['Blue', 3, 4]]), S([['Stealth', 6, 7]], { theme: true }), B()],
  /* 22 */ [S([['RedStealth', 2, 3]]), S([['Red', 1, 2], ['Black', 1, 2]]), S([['Toxic', 4, 5]]), P([['WhiteStealth', 3, 4], ['White', 3, 4]]), S([['BlackStealth', 2, 3]], { theme: true }), S([['Blue', 7, 8]], { len: 'long' })],
];

function abyss() {
  const x = new Xml();
  x.line('<!-- Deep Type: remastered data pack -->');
  x.line('<!-- Abyss: endless dive, one level per 200 ft (generated by tools/gen-configs.mjs) -->');
  x.line();
  x.open('Config');
  x.flag('AbyssMode');
  x.open('Default');
  x.leaf('DiverSpeed', 0.3);
  x.leaf('OceanDepth', -1);
  x.leaf('TimeDelay', 0);
  x.leaf('KnockBack', 5);
  x.leaf('TreasureSecs', 30);
  x.leaf('MapDelay', 250);
  x.leaf('MinCol', 4);
  x.leaf('MaxCol', 7);
  x.leaf('LetterDelay', 1200);
  x.leaf('MinEndDiff', 10);
  x.leaf('MaxEndDiff', 16);
  x.leaf('NumForPenalty', 1);
  x.leaf('PenaltySpeed', 1.0);
  x.close('Default');

  const n = ABYSS.length;
  ABYSS.forEach((waves, i) => {
    const lvl = i + 1;
    // Difficulty power climbs from a gentle start to beyond X-Treme pace at the bottom.
    const p = 0.4 + (3.8 * i) / (n - 1);
    const stage = 1 + i * 0.25;
    x.line();
    x.line(`<!-- LEVEL ${lvl}: ${i * 200}-${lvl * 200} ft -->`);
    x.open(`Level LevelNum = "${lvl}"`);
    if (lvl <= 2) {
      x.leaf('NumForPenalty', 65535);
      x.leaf('PenaltySpeed', 0);
    } else {
      x.leaf('NumForPenalty', lvl <= 6 ? 3 : lvl <= 12 ? 2 : 1);
      x.leaf('PenaltySpeed', r3(0.5 + 0.035 * (lvl - 3)));
    }
    const endMin = Math.min(18, 9 + Math.floor(i / 2));
    x.leaf('MinEndDiff', endMin);
    x.leaf('MaxEndDiff', Math.min(21, endMin + 6));
    x.leaf('LetterDelay', Math.round(2000 - 45 * i));
    waves.forEach((w, wi) => writeWave(x, w, wi, p, stage, false, { abyss: true }));
    x.close('Level');
  });
  x.close('Config');
  return x.toString();
}

// ------------------------------------------------------------------ main

mkdirSync(OUT, { recursive: true });
for (const d of DIFFS) writeFileSync(path.join(OUT, `${d}-cfg.xml`), adventure(d), 'latin1');
writeFileSync(path.join(OUT, 'abyss.xml'), abyss(), 'latin1');
console.log(`wrote ${DIFFS.length} adventure configs and abyss.xml to ${path.relative(ROOT, OUT)}`);
