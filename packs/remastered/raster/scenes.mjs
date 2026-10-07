// Title screen, main menu, diver, the torpedo-sub boss and the dive scenery.
// Layout coupling (logical px): see src/scenes/title.ts, src/scenes/selector.ts,
// src/game/boss.ts (Torpedo hitboxes/rotor) and art/scenery.mjs's layout notes.

import { SCALE as S, source, place, paste, blank, strip, warp, brighten, darken, resize } from './lib.mjs';

const px = (a) => a.map((v) => v * S);

// ------------------------------------------------------------------ title

async function titlescreen() {
  const out = await place(await source('title_scene', { trim: false }), 640 * S, 480 * S, { mode: 'cover' });
  // Logo across the open water at the top.
  return paste(out, await place(await source('logo'), 640 * S, 170 * S, { box: px([60, 6, 520, 158]) }), 0, 0);
}

// Loading bar (title.ts): frame at (126, 354); the fill (goldbar, 370x76) is drawn at
// (149, 369), cropped to the progress. So the frame's glass channel must span x 23..393
// of barandlogo, and goldbar carries the liquid at the channel's height.
const FILL = { x: 23, y: 15, w: 370, h: 76 };

/** The glass channel in the loadbar source: the longest dark-blue run along its middle row. */
function channel(img) {
  const isGlass = (x, y) => {
    const i = (y * img.w + x) * 4;
    const [r, g, b, a] = img.data.subarray(i, i + 4);
    return a > 60 && b > r + 15 && (r + g + b) / 3 < 150; // the glass is see-through
  };
  const cy = Math.floor(img.h / 2);
  let best = [0, 0];
  for (let x = 0, start = -1; x <= img.w; x++) {
    if (x < img.w && isGlass(x, cy)) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      if (x - start > best[1] - best[0]) best = [start, x];
      start = -1;
    }
  }
  const mid = Math.floor((best[0] + best[1]) / 2);
  let top = cy, bot = cy;
  while (top > 0 && isGlass(mid, top - 1)) top--;
  while (bot < img.h - 1 && isGlass(mid, bot + 1)) bot++;
  return { x: best[0], w: best[1] - best[0], y: top, h: bot - top + 1 };
}

async function barLayout() {
  const img = await source('loadbar');
  const ch = channel(img);
  const k = (FILL.w * S) / ch.w;
  // The continue button sits at y 432 (78 px below the frame's top), so the frame may be
  // squashed vertically a little to stay clear of it; it hangs from the top of its slot.
  const ky = Math.min(k, (76 * S) / img.h);
  return { img, ch, k, ky, x: FILL.x * S - ch.x * k, y: 0, chMid: (ch.y + ch.h / 2) * ky };
}

async function barandlogo() {
  const { img, k, ky, x, y } = await barLayout();
  return paste(blank(514 * S, 126 * S), await resize(img, img.w * k, img.h * ky), x, y);
}

async function goldbar() {
  const { ch, ky, chMid } = await barLayout();
  const h = Math.round(ch.h * ky);
  const fill = await resize(await source('loadbar_fill'), FILL.w * S, h);
  // goldbar is drawn FILL.y below the frame's top.
  return paste(blank(FILL.w * S, FILL.h * S), fill, 0, chMid - FILL.y * S - h / 2);
}

// ------------------------------------------------------------------ main menu

// Button rects (selector.ts BUTTONS) and the source painted for each.
const BUTTONS = {
  adventure: ['btn_adventure', 303, 32, 310, 101],
  abyss: ['btn_abyss', 303, 136, 310, 101],
  tutor: ['btn_tutor', 303, 240, 310, 101],
  hall: ['btn_hall', 307, 362, 204, 42],
  options: ['btn_options', 307, 404, 204, 41],
  quit: ['btn_quit', 511, 362, 98, 83],
};

async function button(key) {
  const [src, , , w, h] = BUTTONS[key];
  return place(await source(src), w * S, h * S, { box: px([1, 1, w - 2, h - 2]) });
}

/**
 * Welcome sign: white greeting and name (baselines 55, 77) on its dark upper panel, the two
 * brown links (y ~85..125) on its light lower label, so the split goes at y 83.
 */
async function plaque() {
  const img = await source('menu_plaque');
  const k = (284 * S) / img.w;
  const r = await resize(img, img.w * k, img.h * k);
  // The split: the row down the middle where dark panel turns to light label.
  const lum = (y) => {
    const i = (y * r.w + Math.floor(r.w / 2)) * 4;
    return (r.data[i] + r.data[i + 1] + r.data[i + 2]) / 3;
  };
  let split = Math.floor(r.h / 2);
  for (let y = Math.floor(r.h * 0.2); y < r.h * 0.8; y++) {
    if (lum(y) < 90 && lum(y + 3) > 170) {
      split = y + 2;
      break;
    }
  }
  return paste(blank(640 * S, 480 * S), r, 14 * S, 83 * S - split);
}

async function gameselector() {
  const out = await place(await source('menu_scene', { trim: false }), 640 * S, 480 * S, { mode: 'cover', ax: 0.3 });
  paste(out, await plaque(), 0, 0);
  for (const key of Object.keys(BUTTONS)) {
    const [, x, y] = BUTTONS[key];
    paste(out, await button(key), x * S, y * S);
  }
  return out;
}

/** Hover: lit up. Pressed: darker and nudged down a pixel. */
const over = async (key) => brighten(await button(key), 0.18);
async function down(key) {
  const b = darken(await button(key), 0.18);
  return paste(blank(b.w, b.h), b, 0, S);
}

// ------------------------------------------------------------------ diver

/** Idle: a gentle bob and sway. The hose fitting stays near frame (14.5, 20). */
async function diverIdle() {
  const body = await place(await source('diver'), 50 * S, 84 * S, { box: px([1, 8, 48, 76]), ay: 1 });
  return strip(
    Array.from({ length: 8 }, (_, i) => {
      const t = (i / 8) * Math.PI * 2;
      const dy = Math.sin(t) * 0.8 * S;
      const lean = Math.sin(t) * 0.012;
      return warp(body, (x, y) => [x + (y - body.h) * lean, y - dy]);
    }),
  );
}

// ------------------------------------------------------------------ torpedo sub

// Hull fills x 25..218, y 53..153 and the tower x 80..155 above it; the propeller sprite
// is drawn at (227, 54), so the stern sits at the right edge of the box.
const SUB_BOX = px([22, 0, 210, 155]); // stern overlaps the propeller at x 227
const sub = async (src) => place(await source(src), 250 * S, 155 * S, { box: SUB_BOX, ax: 1, ay: 1 });

// ------------------------------------------------------------------ scenery

/** A ridge layer: full width, ridgeline near the top, solid down to the bottom edge. */
async function ridge(src, w = 640, h = 200) {
  const img = await source(src);
  const k = (w * S) / img.w;
  let r = await resize(img, w * S, img.h * k);
  if (r.h < h * S) {
    // Extend the solid base by stretching its bottom rows.
    const ext = blank(r.w, h * S);
    paste(ext, r, 0, 0);
    const base = await resize({ w: r.w, h: 4, data: r.data.subarray((r.h - 4) * r.w * 4) }, r.w, h * S - r.h + 2);
    paste(ext, base, 0, r.h - 2);
    r = ext;
  }
  const out = blank(w * S, h * S);
  return paste(out, r, 0, 0);
}

async function oceanfloor() {
  return place(await source('seafloor'), 690 * S, 300 * S, { mode: 'cover', ay: 1 });
}

export default {
  titlescreen,
  barandlogo,
  goldbar,
  gameselector,
  ...Object.fromEntries(Object.keys(BUTTONS).flatMap((k) => [[`button_${k}_over`, () => over(k)], [`button_${k}_down`, () => down(k)]])),
  diver_idle: diverIdle,
  torpedo_boss_bobbing: () => sub('torpedo_boss'),
  torpedo_boss_dying: async () => darken(await sub('torpedo_boss_wreck'), 0.15),
  mountain3: () => ridge('ridge_far'),
  mountain2: () => ridge('ridge_mid'),
  mountain1: () => ridge('ridge_near'),
  oceanfloor,
};
