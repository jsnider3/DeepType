// In-game HUD, treasure / secret-level images, the stats-screen treasure panel and the sonar
// console, from the painted sources in gen/hud.mjs. Logical px below; output is x SCALE.
//
// statusbarX (640x39, drawn at y 441; board.ts buildHud): painted panel (hud_bar) with the
//   zapper plate (hud_zapper) at the left, the brass gauge (hud_gauge) whose glass channel is
//   mapped onto the meter window (117, 8, 228, 22) and CUT OUT, because the game draws a dark
//   rect + statusbarmeter behind the bar there (status text goes on top, baseline 26). A faint
//   glass sheen is left over the window. PAUSE / OPTIONS / QUIT buttons (painted, words baked)
//   sit at (380|467|553, 4, 82|81|81, 30): the bar shows their normal state.
// statusbarX_{pause,options,quit}_{over,down}: cut-outs of the bar at those rects with the
//   button lit (over) or darkened and nudged down a pixel (down), so they match exactly.
// statusbarmeter (228x22): electric fill, revealed left to right by a mask.
// textovers (2 x 400x60 stacked): "PREPARE TO DIVE!" (the game shows rows 0..50 at (120, 203))
//   and "GAME OVER" (unused by the game).
// shipwreckbonus (392x39): baked "SHIPWRECK BONUS!".
// airgauge (290x29, at (175, gaugeY)): the game fills a green rect at local (19, 7, <=240, 15)
//   ON TOP of it, so the painted gauge's glass channel is mapped onto exactly that rect.
// clams (10x4 grid of 50x50; src/game/clams.ts): row 0 closed idle "breathing" (ping-ponged),
//   rows 1/2/3 opening frames 0..9 with a white pearl / empty / pink pearl. A white letter is
//   drawn at the cell centre on frames 0..2, so the closed shell is dark there.
// gem_* / secret_* (41x41) and secret_*_lrg: painted items fitted to their boxes.
// tab_panel_treasure (208x344, at panel (408, 23); src/scenes/stats.ts): repainted onto the
//   SVG layout so the sockets sit under the gems (41x41 at local (13|112, 35|87|140)) and
//   secrets, counts go on the blank right halves of the cells.
// sonar_bg (364x364, at (138, 23)): repainted onto the SVG layout (radar centre (182, 182),
//   glass radius ~162); the middle is darkened so the stats text reads.
// Left as SVG: sparkle_large (additive procedural sparkle) and the sonar_sweep* quadrants.

import { SCALE as S, source, place, paste, blank, resize, warp, brighten, darken, cut, crop, bbox, svgArt, repaint } from './lib.mjs';

const px = (a) => a.map((v) => v * S);
const once = (fn) => {
  let p;
  return () => (p ??= fn());
};

// ------------------------------------------------------------------ gauges

/** The see-through glass channel of a painted gauge: the longest dark-blue run on some row. */
function channel(img) {
  const isGlass = (x, y) => {
    const i = (y * img.w + x) * 4;
    const [r, g, b, a] = img.data.subarray(i, i + 4);
    return a > 60 && b >= r + 8 && (r + g + b) / 3 < 120;
  };
  let best = { len: 0 };
  for (let y = Math.floor(img.h * 0.3); y < img.h * 0.7; y++) {
    for (let x = 0, start = -1; x <= img.w; x++) {
      if (x < img.w && isGlass(x, y)) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        if (x - start > best.len) best = { len: x - start, x0: start, x1: x, y };
        start = -1;
      }
    }
  }
  // Vertical extent: median over a few columns along the run.
  const tops = [], bots = [];
  for (let k = 1; k < 8; k++) {
    const x = Math.floor(best.x0 + ((best.x1 - best.x0) * k) / 8);
    let t = best.y, b = best.y;
    while (t > 0 && isGlass(x, t - 1)) t--;
    while (b < img.h - 1 && isGlass(x, b + 1)) b++;
    tops.push(t);
    bots.push(b);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  const top = med(tops), bot = med(bots);
  return { x: best.x0, w: best.x1 - best.x0, y: top, h: bot - top + 1 };
}

/**
 * A painted gauge stretched so its glass channel lands exactly on rect T (output px) of a
 * W x H canvas: the left cap fills [x0, T.x], the channel T.w, the right cap [T.x+T.w, x1];
 * one vertical scale throughout (channel height -> T.h).
 */
async function gauge(srcName, W, H, T, x0, x1, inset = 0) {
  const src = await source(srcName);
  const ch = channel(src);
  ch.x += inset;
  ch.w -= 2 * inset;
  ch.y += inset;
  ch.h -= 2 * inset;
  const ky = T.h / ch.h;
  // Pre-scale with a good filter to roughly the output size, then map piecewise.
  const kx0 = (T.w / ch.w);
  const pre = await resize(src, src.w * kx0, src.h * ky);
  const sx = pre.w / src.w, sy = pre.h / src.h;
  const c = { x: ch.x * sx, w: ch.w * sx, y: ch.y * sy, h: ch.h * sy };
  const lw = T.x - x0, rw = x1 - (T.x + T.w);
  const right0 = c.x + c.w;
  return warp(pre, (x, y) => {
    let u;
    if (x < T.x) u = c.x - ((T.x - x) / lw) * c.x;
    else if (x < T.x + T.w) u = c.x + ((x - T.x) / T.w) * c.w;
    else u = right0 + ((x - T.x - T.w) / rw) * (pre.w - right0);
    if (x < x0 || x >= x1) u = -10;
    return [u, c.y + (y - T.y) * (c.h / T.h)];
  }, W, H);
}

// ------------------------------------------------------------------ status bar

const WIN = { x: 117, y: 8, w: 228, h: 22 };
const BTNS = { pause: [380, 82, 'hud_btn_pause'], options: [467, 81, 'hud_btn_options'], quit: [553, 81, 'hud_btn_quit'] };
const BTN_Y = 4, BTN_H = 30;

/** The panel strip at 640x39: caps kept, the uniform middle stretched to length. */
async function panel() {
  const img = await source('hud_bar');
  const h = 39 * S;
  const k = h / img.h;
  const r = await resize(img, img.w * k, h);
  const W = 640 * S;
  if (r.w >= W) return crop(r, [Math.floor((r.w - W) / 2), 0, W, h]);
  const cap = Math.floor(r.w * 0.12);
  const out = blank(W, h);
  paste(out, cut(r, 0, 0, cap, h), 0, 0);
  paste(out, cut(r, r.w - cap, 0, cap, h), W - cap, 0);
  paste(out, await resize(cut(r, cap, 0, r.w - 2 * cap, h), W - 2 * cap, h), cap, 0);
  return out;
}

const btnImg = async (key) => {
  const [, w, src] = BTNS[key];
  return place(await source(src), w * S, BTN_H * S, { box: px([0, 0, w, BTN_H]) });
};

const statusbar = once(async () => {
  const out = await panel();
  // Shark zapper plate.
  paste(out, await place(await source('hud_zapper'), 640 * S, 39 * S, { box: px([3, 3, 106, 33]) }), 0, 0);
  // Gauge: channel -> meter window.
  const g = await gauge('hud_gauge', 640 * S, 39 * S, { x: WIN.x * S, y: WIN.y * S, w: WIN.w * S, h: WIN.h * S }, 111 * S, 372 * S, 2);
  paste(out, g, 0, 0);
  // Cut the window out; leave a faint glass sheen along its top.
  for (let y = WIN.y * S; y < (WIN.y + WIN.h) * S; y++) {
    const t = (y - WIN.y * S) / (WIN.h * S);
    const sheen = t < 0.28 ? 0.22 * (1 - t / 0.28) : 0;
    for (let x = WIN.x * S; x < (WIN.x + WIN.w) * S; x++) {
      const i = (y * out.w + x) * 4;
      out.data[i] = out.data[i + 1] = out.data[i + 2] = 255;
      out.data[i + 3] = Math.round(sheen * 255);
    }
  }
  for (const key of Object.keys(BTNS)) paste(out, await btnImg(key), BTNS[key][0] * S, BTN_Y * S);
  return out;
});

async function btnState(key, state) {
  const [x, w] = BTNS[key];
  const bg = cut(await statusbar(), x * S, BTN_Y * S, w * S, BTN_H * S);
  const b = await btnImg(key);
  if (state === 'over') return paste(bg, brighten(b, 0.2), 0, 0);
  return paste(bg, darken(b, 0.2), 0, S);
}

async function meter() {
  const img = await source('hud_meter');
  const m = Math.floor(img.w * 0.03);
  // Toned down a little so the half-opacity white status text reads over it.
  return darken(await place(cut(img, m, 0, img.w - 2 * m, img.h), WIN.w * S, WIN.h * S, { mode: 'cover' }), 0.3);
}

// ------------------------------------------------------------------ banners

async function textovers() {
  const out = blank(400 * S, 120 * S);
  paste(out, await place(await source('hud_prepare'), 400 * S, 60 * S, { box: px([4, 2, 392, 46]) }), 0, 0);
  paste(out, await place(await source('hud_gameover'), 400 * S, 60 * S, { box: px([50, 2, 300, 46]) }), 0, 60 * S);
  return out;
}

const shipwreckbonus = async () => place(await source('hud_shipwreck'), 392 * S, 39 * S, { box: px([2, 1, 388, 37]) });

const airgauge = () => gauge('hud_airgauge', 290 * S, 29 * S, { x: 19 * S, y: 7 * S, w: 240 * S, h: 15 * S }, 0, 290 * S, 1);

// ------------------------------------------------------------------ clams

const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Per-pixel mix of two same-size images (premultiplied), t = weight of b. */
function mixImg(a, b, t) {
  const out = blank(a.w, a.h);
  for (let i = 0; i < out.data.length; i += 4) {
    const aa = (a.data[i + 3] / 255) * (1 - t), ba = (b.data[i + 3] / 255) * t;
    const oa = aa + ba;
    if (oa <= 0) continue;
    for (let k = 0; k < 3; k++) out.data[i + k] = Math.round((a.data[i + k] * aa + b.data[i + k] * ba) / oa);
    out.data[i + 3] = Math.round(oa * 255);
  }
  return out;
}

/** Stretch the part of img above row py vertically by k (k > 1 lifts it), pivoting at py. */
const lift = (img, py, k) => warp(img, (x, y) => [x, y < py ? py - (py - y) / k : y]);

/** Width of the visible pixels in the bottom fraction of an image. */
function baseWidth(img, frac = 0.3) {
  const y0 = Math.floor(img.h * (1 - frac));
  const [, , w] = bbox(crop(img, [0, y0, img.w, img.h - y0]));
  return w;
}

const CLAM = { cell: 50 * S, w: 46 * S, bottom: 49 * S };

const clamParts = once(async () => {
  const closed = await source('hud_clam_closed');
  const open = await source('hud_clam_open');
  const pearls = await source('hud_pearls');
  // Same base width for both; shrink until the open clam fits the cell.
  let wc = CLAM.w;
  const kc = () => wc / closed.w;
  const ko = () => (kc() * baseWidth(closed)) / baseWidth(open);
  while (open.h * ko() > CLAM.bottom - S || closed.h * kc() > CLAM.bottom - 2 * S) wc -= S;
  const put = async (img, k) => {
    const r = await resize(img, img.w * k, img.h * k);
    return paste(blank(CLAM.cell, CLAM.cell), r, (CLAM.cell - r.w) / 2, CLAM.bottom - r.h);
  };
  const c = await put(closed, kc());
  const o = await put(open, ko());
  const ch = closed.h * kc();
  const oh = open.h * ko();
  // Pearls: left / right halves of the source.
  const half = Math.floor(pearls.w / 2);
  const pd = 12 * S;
  const pearl = async (x) => {
    const p = crop(pearls, [x, 0, half, pearls.h]);
    return resize(crop(p, bbox(p)), pd, pd);
  };
  return {
    closed: c,
    open: o,
    // Lip of the closed shell, and the hinge line of the open one (top of the bottom shell).
    closedLip: CLAM.bottom - ch * 0.45,
    openLip: CLAM.bottom - oh * 0.48,
    pearlY: CLAM.bottom - oh * 0.4 - pd * 0.75,
    white: await pearl(0),
    pink: await pearl(half),
    pd,
  };
});

async function clams() {
  const P = await clamParts();
  const out = blank(500 * S, 200 * S);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      let f;
      if (r === 0) {
        const breathe = (1 - Math.cos((c / 10) * Math.PI * 2)) / 2;
        f = lift(P.closed, P.closedLip, 1 + 0.06 * breathe);
      } else {
        const k = c / 9;
        const o = k * k * (3 - 2 * k);
        const w = smooth(0.25, 0.6, o);
        const a = lift(P.closed, P.closedLip, 1 + 0.35 * o);
        const b = lift(P.open, P.openLip, 0.4 + 0.6 * o);
        f = c === 0 ? P.closed : mixImg(a, b, w);
        const pearl = r === 1 ? P.white : r === 3 ? P.pink : null;
        if (pearl && w > 0) paste(f, pearl, (CLAM.cell - P.pd) / 2, P.pearlY, smooth(0.3, 0.8, o));
      }
      paste(out, f, c * CLAM.cell, r * CLAM.cell);
    }
  }
  return out;
}

// ------------------------------------------------------------------ gems + secrets

const GEMS = ['green', 'orange', 'purple', 'red', 'white', 'yellow'];
const icon = (src) => async () => place(await source(src), 41 * S, 41 * S, { box: px([1, 1, 39, 39]) });
const SECRETS = { crown: [81, 72], figurine: [56, 91], necklace: [48, 86], scepter: [85, 90] };
const large = (key) => async () => {
  const [w, h] = SECRETS[key];
  return place(await source(`hud_secret_${key}`), w * S, h * S, { box: px([1, 1, w - 2, h - 2]) });
};

// ------------------------------------------------------------------ panel + sonar

/** Piecewise-linear map through [target, source] control points (logical px). */
const pwl = (pts) => (t) => {
  for (let i = 1; i < pts.length; i++) {
    const [t0, s0] = pts[i - 1], [t1, s1] = pts[i];
    if (t <= t1 || i === pts.length - 1) return s0 + ((t - t0) / (t1 - t0)) * (s1 - s0);
  }
};

// The repaint came out with its gem rows ~8 px low and its left column ~4 px right of the
// layout; these maps pull the sockets onto the spots stats.ts draws the gems (centres
// (33.5|132.5, 55.5|107.5|160.5)) and secrets (centres (37.5|136.5, 264.5|314.5)).
const PANEL_Y = pwl([[0, 0], [28, 36.5], [185, 193], [205, 205], [232, 230], [330, 326], [344, 344]]);
const PANEL_X = pwl([[0, 0], [8, 11], [95, 99], [104, 104], [208, 208]]);

async function treasurePanel() {
  const img = await repaint('hud_treasure_panel', await svgArt('tab_panel_treasure'));
  return warp(img, (x, y) => [PANEL_X(x / S) * S, PANEL_Y(y / S) * S]);
}

async function sonarBg() {
  const img = await repaint('hud_sonar', await svgArt('sonar_bg'));
  // Calm the middle of the glass where the stats are printed.
  const cx = 182 * S, cy = 182 * S, r0 = 60 * S, r1 = 150 * S;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r1) continue;
      const k = 0.35 * (1 - smooth(r0, r1, d));
      const i = (y * img.w + x) * 4;
      for (let j = 0; j < 3; j++) img.data[i + j] = Math.round(img.data[i + j] * (1 - k));
    }
  }
  return img;
}

// ------------------------------------------------------------------ exports

const images = {
  statusbarX: statusbar,
  statusbarmeter: meter,
  textovers,
  shipwreckbonus,
  airgauge,
  clams,
  tab_panel_treasure: treasurePanel,
  sonar_bg: sonarBg,
};
for (const key of Object.keys(BTNS)) {
  images[`statusbarX_${key}_over`] = () => btnState(key, 'over');
  images[`statusbarX_${key}_down`] = () => btnState(key, 'down');
}
for (const g of GEMS) images[`gem_${g}`] = icon(`hud_gem_${g}`);
for (const key of Object.keys(SECRETS)) {
  images[`secret_${key}`] = icon(`hud_secret_${key}`);
  images[`secret_${key}_lrg`] = large(key);
}
export default images;
