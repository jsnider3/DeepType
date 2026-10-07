// Creatures: every shark, piranha, the gumbo anglerfish, the bonus jellyfish, the dazed
// diver, the fight cloud and the background fish, animated from painted sources
// (gen/core.mjs, gen/creatures.mjs).
//
// - Sharks (160x70 frames, facing left): 20-frame swim bent from one pose; 6-frame death
//   = the knocked-out pose rolling belly-up. Shock images (sharkshock, *_shock) are an
//   X-ray pose the game swaps in place of the swim frame, so each pose is stretched onto
//   the base shark's exact bounds. The game centres the word on the frame (+11 px right).
//   Hammerhead = shark_black, tiger = shark_red; the ghost shark uses sharkshock.
// - Glows (*_glow_*, 180x90, additive): a blurred tinted halo of the matching swim/death
//   frame, offset (10, 10) so it sits centred on the 160x70 creature frame.
// - Piranhas / gumbo (60x60): swim + bob; death rolls belly-up over 5 frames, then holds.
//   piranhashock serves both piranhas. gumbo's word is WHITE: its body is dark.
// - bonus_creature_swim (80x80): jelly pulse, bell centred near the word at (40, 40).
//   bonus_creature_death (100x100): drawn at (-12, -20), so the jelly sits at (52, 60);
//   it squashes, pops into a splash and fades.
// - diver_beaten (50x84): fitted onto the SVG layout, hose fitting near x 23.5 at the top.
// - rumblecloud (7 x 125x125): two painted brawl clouds alternating with jitter.
// - smallgoldfish (20 x 20x20): faces RIGHT (BgFish swims right); light colours, the game
//   tints it by depth.

import sharp from 'sharp';
import { SCALE as S, source, place, paste, blank, swim, strip, warp, darken, fade, resize, bbox, crop, rotate, svgArt, repaint, tint } from './lib.mjs';

const px = (a) => a.map((v) => v * S);
const SHARK_BOX = [3, 6, 154, 58];
const FISH_BOX = [4, 8, 52, 46];

/** A source fitted in a frame (output pixels). */
const fit = async (name, fw, fh, box, opts = {}) => place(await source(name), fw * S, fh * S, { box: px(box), ...opts });

/** A pose source stretched onto the exact visible bounds of an already placed base. */
async function onto(base, name) {
  const [x, y, w, h] = bbox(base);
  return paste(blank(base.w, base.h), await resize(await source(name), w, h), x, y);
}

const flipH = (img) => warp(img, (x, y) => [img.w - x, y]);

/** Belly-up roll over the first `roll` frames; the rest hold the last pose. */
function roll(body, n, roll = n, { dim = 0.25 } = {}) {
  const cy = body.h / 2;
  return Array.from({ length: n }, (_, i) => {
    const p = Math.min(1, i / (roll - 1));
    const th = p * Math.PI;
    const sy = Math.sign(Math.cos(th) || 1) * Math.max(0.12, Math.abs(Math.cos(th)));
    const tilt = Math.sin(th) * 0.12; // the nose dips as it rolls
    const f = warp(body, (x, y) => [x, cy + (y - cy - (x - body.w / 2) * tilt) / sy]);
    return darken(f, p * dim);
  });
}

const swimFrames = (body, n, amp) => Array.from({ length: n }, (_, i) => swim(body, i / n, { amp }));

// ------------------------------------------------------------------ sharks

const shark = (name) => fit(name, 160, 70, SHARK_BOX);
const sharkSwim = async (name, k = 1) => {
  const f = strip(swimFrames(await shark(name), 20, 70 * S * 0.05));
  return k < 1 ? fade(f, k) : f;
};
const sharkDeath = async (dead, k = 1) => {
  const f = strip(roll(await shark(dead), 6));
  return k < 1 ? fade(f, k) : f;
};
const sharkShock = async (base, shock) => onto(await shark(base), shock);

/** Gaussian blur of an image (output pixels). */
async function blur(img, sigma) {
  const { data, info } = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** Additive glow strip: each 160x70 frame's silhouette, padded to 180x90, blurred and tinted. */
async function glow(frames, [r, g, b], { inner = 0.88, gain = 1.25 } = {}) {
  const out = [];
  for (const f of frames) {
    const pad = paste(blank(180 * S, 90 * S), f, 10 * S, 10 * S);
    const sil = tint(pad, (_r, _g, _b, a) => [r, g, b, a]);
    const soft = await blur(sil, 3 * S);
    const wide = await blur(sil, 7 * S);
    // Bright rim and halo; weaker over the body itself so the painting stays readable.
    const o = blank(sil.w, sil.h);
    for (let i = 0; i < o.data.length; i += 4) {
      o.data[i] = r;
      o.data[i + 1] = g;
      o.data[i + 2] = b;
      const a = Math.min(255, (soft.data[i + 3] * 0.6 + wide.data[i + 3] * 0.7) * gain);
      o.data[i + 3] = Math.round(a * (1 - inner * (pad.data[i + 3] / 255)));
    }
    out.push(o);
  }
  return strip(out);
}

const unstrip = (img, n) => Array.from({ length: n }, (_, i) => crop(img, [(i * img.w) / n, 0, img.w / n, img.h]));

const GHOST = [110, 210, 255];
const TOXIC = [130, 255, 50];

// ------------------------------------------------------------------ piranhas & gumbo

const fish = (name, box = FISH_BOX) => fit(name, 60, 60, box);
async function fishSwim(name, box) {
  const body = await fish(name, box);
  return strip(
    Array.from({ length: 20 }, (_, i) => {
      const t = i / 20;
      const f = swim(body, t, { amp: 60 * S * 0.045, head: 0.4, waves: 0.7 });
      const bob = Math.sin(t * Math.PI * 4 + 0.6) * 0.6 * S;
      return warp(f, (x, y) => [x, y - bob]);
    }),
  );
}
const fishDeath = async (dead, box) => strip(roll(await fish(dead, box), 10, 5, { dim: 0.2 }));
const fishShock = async (base, shock, box) => onto(await fish(base, box), shock);

// ------------------------------------------------------------------ jellyfish

const JELLY_BOX = [11, 15, 58, 60];
const jelly = () => fit('jellyfish', 80, 80, JELLY_BOX, { ay: 0 });

/** Pulse: the bell squeezes and relaxes, tentacles trail the beat. */
function pulse(img, t, cx, top) {
  const ph = t * Math.PI * 2;
  const s = Math.sin(ph);
  return warp(img, (x, y) => {
    const v = Math.max(0, y - top) / (img.h - top); // 0 at the bell top, 1 at the tentacle tips
    const sx = 1 - 0.07 * s * (1 - v * 0.5);
    const lag = Math.sin(ph - v * 2.4) * 2.2 * S * v;
    const sy = 1 + 0.05 * s;
    return [cx + (x - cx) / sx - lag * 0.6, top + (y - top) / sy];
  });
}

async function jellySwim() {
  const body = await jelly();
  const [, top] = bbox(body);
  return strip(Array.from({ length: 20 }, (_, i) => pulse(body, i / 20, 40 * S, top)));
}

async function jellyDeath() {
  const body = await jelly(); // 80x80 frame; in the death frame it sits 12, 20 further on
  const splashSrc = await source('jelly_splash');
  const frames = [];
  const scale = (img, sx, sy, cx, cy) => warp(img, (x, y) => [cx + (x - cx) / sx, cy + (y - cy) / sy]);
  const cx = 40 * S, cy = 40 * S;
  const steps = [
    { sx: 1.08, sy: 0.9, a: 1, sp: 0 },
    { sx: 1.2, sy: 0.78, a: 1, sp: 0 },
    { sx: 1.35, sy: 0.62, a: 0.75, sp: 0.45 },
    { sx: 1.5, sy: 0.5, a: 0.3, sp: 0.65 },
    { a: 0, sp: 0.8 },
    { a: 0, sp: 0.9 },
    { a: 0, sp: 0.98 },
    { a: 0, sp: 1.04 },
  ];
  const fade_ = [0, 0, 1, 1, 1, 0.8, 0.5, 0.22];
  for (const [i, st] of steps.entries()) {
    const f = blank(100 * S, 100 * S);
    if (st.a > 0) paste(f, scale(body, st.sx, st.sy, cx, cy), 12 * S, 20 * S, st.a);
    if (st.sp > 0) {
      const d = 72 * S * st.sp;
      const sp = await resize(splashSrc, d, (d * splashSrc.h) / splashSrc.w);
      paste(f, sp, 52 * S - sp.w / 2, 60 * S - sp.h / 2, fade_[i]);
    }
    frames.push(f);
  }
  return strip(frames);
}

// ------------------------------------------------------------------ diver & fight cloud

async function diverBeaten() {
  return repaint('diver_dazed', await svgArt('diver_beaten'), { mask: false });
}

async function rumblecloud() {
  const a = await fit('fight_cloud', 125, 125, [8, 8, 109, 109]);
  const b = await fit('fight_cloud_b', 125, 125, [8, 8, 109, 109]);
  const c = 62.5 * S;
  return strip(
    Array.from({ length: 7 }, (_, i) => {
      const t = i / 7;
      const src = i % 2 ? b : a;
      const k = 1 + 0.04 * Math.sin(t * Math.PI * 2 * 3);
      const ang = 7 * Math.sin(t * Math.PI * 2 * 2) + (i % 2 ? -4 : 4);
      const r = rotate(src, ang, c, c);
      return warp(r, (x, y) => [c + (x - c) / k, c + (y - c) / k]);
    }),
  );
}

async function smallgoldfish() {
  const body = flipH(await fit('goldfish', 20, 20, [1, 4, 18, 12]));
  return strip(Array.from({ length: 20 }, (_, i) => flipH(swim(body, i / 20, { amp: 20 * S * 0.07, head: 0.35 }))));
}

export default {
  shark_basic_swim: () => sharkSwim('shark_basic'),
  shark_basic_death: () => sharkDeath('shark_basic_dead'),
  sharkshock: () => sharkShock('shark_basic', 'shark_basic_shock'),

  shark_black_swim: () => sharkSwim('shark_hammer'),
  shark_black_death: () => sharkDeath('shark_hammer_dead'),
  shark_black_shock: () => sharkShock('shark_hammer', 'shark_hammer_shock'),

  shark_red_swim: () => sharkSwim('shark_tiger'),
  shark_red_death: () => sharkDeath('shark_tiger_dead'),
  shark_red_shock: () => sharkShock('shark_tiger', 'shark_tiger_shock'),

  shark_ghost_swim: () => sharkSwim('shark_ghost', 0.85),
  shark_ghost_death: () => sharkDeath('shark_ghost_dead', 0.85),
  shark_ghost_glow_swim: async () => glow(unstrip(await sharkSwim('shark_ghost'), 20), GHOST),
  shark_ghost_glow_death: async () => glow(unstrip(await sharkDeath('shark_ghost_dead'), 6), GHOST),

  toxic_basic_swim: () => sharkSwim('shark_toxic'),
  toxic_basic_death: () => sharkDeath('shark_toxic_dead'),
  toxic_basic_shock: () => sharkShock('shark_toxic', 'shark_toxic_shock'),
  toxic_glow_swim: async () => glow(unstrip(await sharkSwim('shark_toxic'), 20), TOXIC),
  toxic_glow_death: async () => glow(unstrip(await sharkDeath('shark_toxic_dead'), 6), TOXIC),

  piranha_basic_swim: () => fishSwim('piranha'),
  piranha_basic_death: () => fishDeath('piranha_dead'),
  piranhashock: () => fishShock('piranha', 'piranha_shock'),
  piranha_white_swim: () => fishSwim('piranha_white'),
  piranha_white_death: () => fishDeath('piranha_white_dead'),

  gumbo_swim: () => fishSwim('gumbo'),
  gumbo_die: () => fishDeath('gumbo_dead'),
  gumbo_shock: () => fishShock('gumbo', 'gumbo_shock'),

  bonus_creature_swim: jellySwim,
  bonus_creature_death: jellyDeath,

  diver_beaten: diverBeaten,
  rumblecloud,
  smallgoldfish,
};
