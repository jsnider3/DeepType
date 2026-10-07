// Bosses & projectiles from painted sources (gen/bosses.mjs). The pirate sub body and wreck
// are in scenes.mjs; everything else in the spec group is here. Layout (src/game/boss.ts):
//
// - torpedo_boss_rotor (14 x 22x81) is drawn at (227, 54) on the sub: the sub's stern ring
//   spans y 91..134 and ends at x 231, so the propeller hub sits at frame (10, 58.5) on a
//   short shaft from the frame's left edge.
// - torpedo_swim (126x39), nose left; rotor_torpedo (14 x 11x41) is drawn at x 124, so the
//   tail shaft meets the right edge; the game prints a black word (12 px a letter) centred
//   at x 69, so the light label band is stretched to x 28..108.
// - torpedo_reverse: 6 frames flipping nose-left to nose-right (the last is the mirror).
// - torpedo_launch (8 x 200x100) is drawn 40 px left of the torpedo's tail: the wake starts
//   at frame (40, 50) and trails right. torpedo_explode (8 x 150x150) is centred.
// - cannonball (12 x 74x44, V): the game prints a black letter centred on the frame, so the
//   pale ball is centred at (37, 22) with a ghostly trail behind it (right) and a halo;
//   cannonball_turn swings the trail to the left (the returning ball is shown mirrored).
// - boss_mecha (184x217), boss_squid (218x147) are painted over our SVG layout guides and
//   fitted to them (repaint), so hit boxes and tubes match; the mecha's edge is stretched to
//   meet its tail at x 184 and the squid's eye socket is nudged under the eye sprite.
//   boss_galleon (159x349) came out broader than the guide, so it is fitted by hand: cannons
//   on the tubes (ball centres y 242, 288), keel at the rudder (y 300), plus a rudder post.
//   Wrecks take the same fit as their live body. Parts: boss_mecha_fin (10 x 39x98) at
//   (184, 60), hinge at its left middle; boss_squid_fin (10 x 67x47) at (217, 60), socket at
//   its left middle; boss_squid_eye (5 x 12x12) at (133, 80); galleon_rudder (5 x 21x47) at
//   (121, 300), hinge on its left (the game ping-pongs frames 0..4).
// - boss_meter (380x40): the fill (294x20) is drawn at (36, 10); the painted dark channel
//   is three-sliced exactly onto that rect.
//   boss_meter_fill is even along its length (the game squashes it horizontally).
// - abyss_boss (288x337): four 138x162 cards at (4,4), (146,4), (4,170), (146,170), in the
//   order sub, galleon / mecha, squid; names are drawn here with our fonts; the game writes
//   "xN" left-aligned at card-local x 100 (left cards) / 96 (right), baseline 144, so a
//   light slot sits at x 90..130, y 130..151.

import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { svg, text, FONTS } from '../art/lib.mjs';
import { SCALE as S, source, place, paste, blank, strip, warp, rotate, resize, tint, brighten, darken, svgArt, repaint, bbox, crop, cut } from './lib.mjs';

const px = (a) => a.map((v) => v * S);

/** Render SVG markup (logical w x h) at output scale. */
async function svgImg(w, h, body, defs = '') {
  const png = new Resvg(svg(w, h, body, defs), { fitTo: { mode: 'width', value: w * S } }).render().asPng();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** Gaussian blur (premultiplied so edges don't darken). */
async function blur(img, sigma) {
  const pre = tint(img, (r, g, b, a) => [(r * a) / 255, (g * a) / 255, (b * a) / 255, a]);
  const { data } = await sharp(pre.data, { raw: { width: img.w, height: img.h, channels: 4 } }).blur(sigma).raw().toBuffer({ resolveWithObject: true });
  const out = { w: img.w, h: img.h, data };
  return tint(out, (r, g, b, a) => (a ? [(r * 255) / a, (g * 255) / a, (b * 255) / a, a] : [0, 0, 0, 0]));
}

/** Scale an image about (cx, cy) by (kx, ky) into a w x h canvas, placing (cx, cy) at (ox, oy). */
function xform(img, { kx = 1, ky = 1, cx = img.w / 2, cy = img.h / 2, ox, oy, w, h, deg = 0 }) {
  const a = (-deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return warp(img, (x, y) => {
    // Inverse: undo translation, rotation, then scale.
    const dx = x - ox, dy = y - oy;
    const rx = dx * c - dy * s, ry = dx * s + dy * c;
    return [cx + rx / kx, cy + ry / ky];
  }, w, h);
}

const scaled = async (img, k) => resize(img, img.w * k, img.h * k);
const fit = async (img, w, h) => scaled(img, Math.min(w / img.w, h / img.h));

// ------------------------------------------------------------------ propellers

/**
 * Propeller frame: the face-on painted propeller turned by `deg` and squashed to an
 * edge-on ellipse D tall, hub at (hx, hy) in a w x h frame.
 */
async function propFrame(deg, D, squash, hx, hy, w, h) {
  const p = await source('boss_propeller');
  const k = (D * S) / Math.max(p.w, p.h);
  const r = await scaled(p, k);
  const spun = rotate(r, deg);
  return xform(spun, { kx: squash, ky: 1, ox: hx * S, oy: hy * S, w: w * S, h: h * S });
}

/** A short gunmetal drive shaft from the frame's left edge to the hub. */
const shaft = (hx, hy, w, h, r) =>
  svgImg(w, h, `<rect x="-2" y="${hy - r}" width="${hx + 2}" height="${2 * r}" rx="${r * 0.6}" fill="url(#s)" stroke="#141a24" stroke-width="0.6"/>`,
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa4b0"/><stop offset="0.35" stop-color="#5d6672"/><stop offset="1" stop-color="#262c36"/></linearGradient>`);

const propStrip = async (D, squash, hx, hy, w, h, shaftR) => {
  const frames = [];
  for (let i = 0; i < 14; i++) {
    const f = await shaft(hx, hy, w, h, shaftR);
    frames.push(paste(f, await propFrame((i * 120) / 14, D, squash, hx, hy, w, h), 0, 0));
  }
  return strip(frames);
};

// ------------------------------------------------------------------ torpedo

/** The torpedo's cream label band: the longest light run along its middle row. */
function labelBand(img) {
  const light = (x, y) => {
    const i = (y * img.w + x) * 4;
    return img.data[i + 3] > 200 && (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3 > 150;
  };
  const cy = Math.floor(img.h / 2);
  let best = [0, 0];
  for (let x = 0, st = -1; x <= img.w; x++) {
    if (x < img.w && light(x, cy)) {
      if (st < 0) st = x;
    } else if (st >= 0) {
      if (x - st > best[1] - best[0]) best = [st, x];
      st = -1;
    }
  }
  return best;
}

/**
 * Three-slice fit: the label band is widened to x 28..108 (80 px, about 6.5 letters of the
 * 12 px word font, centred near the word's x 69); the nose and the finned tail are
 * scaled into the rest, the tail shaft flush with the right edge (propeller at x 124).
 */
async function torpedo() {
  const src = await source('boss_torpedo');
  const [b0, b1] = labelBand(src);
  const H = 37 * S;
  const ky = H / src.h;
  const out = blank(126 * S, 39 * S);
  const slices = [
    [0, b0, 0, 28],
    [b0, b1 - b0, 28, 80],
    [b1, src.w - b1, 108, 18],
  ];
  for (const [sx, sw, dx, dw] of slices) paste(out, await resize(cut(src, sx, 0, sw, src.h), dw * S, H), dx * S, S);
  return out;
}

async function torpedoReverse() {
  const t = await torpedo();
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const c = Math.cos((Math.PI * i) / 5);
    const k = Math.sign(c || 1) * Math.max(0.14, Math.abs(c));
    const lift = Math.sin((Math.PI * i) / 5) * 2 * S;
    // The side turned away is a little darker mid-turn.
    const shadeK = 0.25 * Math.sin((Math.PI * i) / 5);
    frames.push(xform(darken(t, shadeK), { kx: k, ox: t.w / 2, oy: t.h / 2 - lift, w: t.w, h: t.h }));
  }
  return strip(frames);
}

/** Soft radial glow (logical units), colour [r,g,b]. */
function glowDot(w, h, cx, cy, rx, ry, [r, g, b], alpha = 1) {
  const out = blank(w * S, h * S);
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) {
      const dx = (x / S - cx) / rx, dy = (y / S - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const a = (1 - d) ** 1.6 * alpha;
      const i = (y * out.w + x) * 4;
      const wht = Math.max(0, 1 - d * 2.2);
      out.data[i] = r + (255 - r) * wht;
      out.data[i + 1] = g + (255 - g) * wht;
      out.data[i + 2] = b + (255 - b) * wht;
      out.data[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}

async function torpedoLaunch() {
  const wake = await source('boss_wake');
  const frames = [];
  for (let i = 0; i < 8; i++) {
    const k = i / 7;
    const f = blank(200 * S, 100 * S);
    const w = (70 + 115 * Math.sqrt(k)) * S;
    const h = Math.min(92 * S, (wake.h * w) / wake.w * (0.75 + 0.35 * k));
    const r = await resize(wake, w, h);
    const x0 = (38 + 6 * k) * S;
    paste(f, r, x0, 50 * S - r.h / 2 - k * 4 * S, 1 - 0.8 * k * k);
    if (i < 3) paste(f, glowDot(200, 100, 44 + i * 5, 50, 26 - i * 6, 18 - i * 4, [255, 214, 90], 1 - i * 0.3), 0, 0);
    frames.push(f);
  }
  return strip(frames);
}

async function torpedoExplode() {
  const fire = await source('boss_fireball');
  const smoke = await source('boss_smoke');
  const fireK = [0.32, 0.62, 0.86, 0.96, 1.0, 1.02, 1.04, 1.05];
  const fireA = [1, 1, 1, 0.85, 0.5, 0.2, 0, 0];
  const smokeK = [0.5, 0.55, 0.65, 0.78, 0.88, 0.95, 1.0, 1.04];
  const smokeA = [0, 0, 0.25, 0.6, 0.9, 0.85, 0.6, 0.28];
  const frames = [];
  for (let i = 0; i < 8; i++) {
    const f = blank(150 * S, 150 * S);
    if (smokeA[i] > 0) {
      const s = await fit(smoke, 146 * S * smokeK[i], 146 * S * smokeK[i]);
      paste(f, s, (f.w - s.w) / 2, (f.h - s.h) / 2 - i * 1.5 * S, smokeA[i]);
    }
    if (fireA[i] > 0) {
      let b = await fit(fire, 130 * S * fireK[i], 130 * S * fireK[i]);
      if (i < 2) b = brighten(b, 0.35 - i * 0.15);
      if (i >= 4) b = darken(b, 0.2 * (i - 3));
      paste(f, b, (f.w - b.w) / 2, (f.h - b.h) / 2, fireA[i]);
    }
    if (i < 2) paste(f, glowDot(150, 150, 75, 75, 50 - i * 8, 50 - i * 8, [255, 230, 140], 0.9 - i * 0.4), 0, 0);
    frames.push(f);
  }
  return strip(frames);
}

// ------------------------------------------------------------------ cannonball

const BALL_D = 40;
async function ball() {
  return fit(await source('boss_cannonball'), BALL_D * S, BALL_D * S);
}

/**
 * Ghost trail behind the ball: dir 1 = trailing right, -1 = left; k = length 0..1. Its
 * bright head sits just under the ball's rim so it shows in the 74 px frame.
 */
async function trail(t, dir = 1, k = 1) {
  const wisp = await source('boss_wisp');
  const len = 36 * k;
  const f = blank(74 * S, 44 * S);
  if (len < 2) return f;
  const r = await resize(wisp, len * S, 28 * S);
  // Flowing ripple along the trail, growing toward its tip.
  const ph = t * Math.PI * 2;
  const wv = warp(r, (x, y) => {
    const u = x / r.w;
    return [x, y + Math.sin(ph * 2 - u * 6) * u * 2.5 * S];
  });
  const flick = 0.85 + 0.15 * Math.sin(ph * 3);
  const img = dir > 0 ? wv : warp(wv, (x, y) => [wv.w - x, y]);
  // Twice over: the mist is sheer and the trail is small at game size.
  for (let k2 = 0; k2 < 2; k2++) paste(f, img, dir > 0 ? 38 * S : (36 - len) * S, 8 * S, flick);
  return f;
}

/**
 * One cannonball frame: the trail, a cold spectral halo that breathes with t, then the
 * ball (kept upright so its highlight stays lit from above; the trail and halo carry the
 * motion).
 */
async function ballFrame(t, trailFrame, glow = 0) {
  const f = blank(74 * S, 44 * S);
  const halo = 0.35 + 0.15 * Math.sin(t * Math.PI * 4) + glow;
  paste(f, glowDot(74, 44, 37, 22, 25, 22, [120, 240, 220], Math.min(1, halo)), 0, 0);
  paste(f, trailFrame, 0, 0);
  const b = await ball();
  paste(f, b, 37 * S - b.w / 2, 22 * S - b.h / 2);
  return f;
}

async function cannonball() {
  const frames = [];
  for (let i = 0; i < 12; i++) frames.push(await ballFrame(i / 12, await trail(i / 12)));
  return strip(frames, true);
}

async function cannonballTurn() {
  const cfg = [[1, 0.75, 0], [1, 0.35, 0.3], [1, 0, 0.5], [-1, 0.35, 0.3], [-1, 0.75, 0]];
  const frames = [];
  for (let i = 0; i < 5; i++) {
    const [dir, k, g] = cfg[i];
    frames.push(await ballFrame(i / 5, await trail(i / 5, dir, k), g));
  }
  return strip(frames, true);
}

// ------------------------------------------------------------------ bosses

// The tail is drawn at x 184, so the body's solid edge is stretched to reach it.
async function mechaBody() {
  const b = await repaint('boss_mecha_src', await svgArt('boss_mecha'));
  const [bx, , bw] = bbox(b, 128);
  const k = (184.5 * S - bx) / bw;
  return warp(b, (x, y) => [bx + (x - bx) / k, y]);
}
// The painted eye socket lands at (131, 86); the eye sprite is centred at (139, 86), so a
// soft local warp slides the socket 8 px right under it.
async function squidBody() {
  const b = await repaint('boss_squid_src', await svgArt('boss_squid'));
  return nudge(b, 139, 86, 8, 0, 22);
}

/** Smoothly displace the area within radius r of (cx, cy) (logical) by (dx, dy). */
function nudge(img, cx, cy, dx, dy, r) {
  return warp(img, (x, y) => {
    const d = Math.hypot(x / S - cx, y / S - cy) / r;
    const f = d >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * d));
    return [x - dx * S * f, y - dy * S * f];
  });
}
/** Source scaled to logical size (w, h) and pasted at logical (x, y) on a cw x ch canvas. */
async function sized(src, cw, ch, x, y, w, h) {
  const img = typeof src === 'string' ? await source(src) : src;
  return paste(blank(cw * S, ch * S), await resize(img, w * S, h * S), x * S, y * S);
}

// The painted galleon is broader than our layout, so it is narrowed to 159 wide (a slight
// vertical stretch) and placed so its two cannons sit on the tubes (ball centres y 242, 288)
// and its keel meets the rudder at (121..142, 300).
// The hull curves up above the rudder's top (y 300) toward the stern, so a rudder post
// (the hinge side of the painted rudder) hangs from the hull down to it, behind the hull.
const galleonBody = () => withRudderPost(sized('boss_galleon_src', 159, 349, 0, 8, 159, 300));

async function withRudderPost(shipP) {
  const ship = await shipP;
  const r = await source('boss_galleon_rudder');
  const post = await resize(cut(r, 0, 0, r.w * 0.33, r.h * 0.45), 7 * S, 26 * S);
  const out = paste(blank(ship.w, ship.h), post, 121 * S, 279 * S);
  return paste(out, ship, 0, 0);
}

/**
 * A hinged part: source fitted into box (or stretched to fill it), then each frame
 * transforms it about the joint.
 */
async function partStrip(src, n, fw, fh, box, joint, frameFn, { fill = false } = {}) {
  const base = fill ? await sized(src, fw, fh, ...box) : await place(await source(src), fw * S, fh * S, { box: px(box), ax: 0 });
  const frames = [];
  for (let i = 0; i < n; i++) {
    const { kx = 1, ky = 1, deg = 0, shade = 0 } = frameFn(i);
    let fr = xform(base, { kx, ky, deg, cx: joint[0] * S, cy: joint[1] * S, ox: joint[0] * S, oy: joint[1] * S, w: fw * S, h: fh * S });
    if (shade) fr = darken(fr, shade);
    frames.push(fr);
  }
  return strip(frames);
}

// Mecha tail: sweeps up and down about its hinge with a slight foreshortening. The painted
// tail is stretched a little taller than its own proportions to suit the big body.
const mechaFin = () =>
  partStrip('boss_mecha_tail', 10, 39, 98, [0, 11, 37, 76], [1, 49], (i) => {
    const a = Math.sin((i / 10) * Math.PI * 2);
    return { deg: a * 8, kx: 0.88 + 0.12 * Math.cos((i / 10) * Math.PI * 2), shade: 0.08 * (1 - Math.cos((i / 10) * Math.PI * 2)) / 2 };
  }, { fill: true });

// Squid fin: flaps (vertical squash) and wags about its socket.
const squidFin = () =>
  partStrip('boss_squid_tail', 10, 67, 47, [0, 3, 66, 41], [1, 23.5], (i) => {
    const ph = (i / 10) * Math.PI * 2;
    return { deg: Math.sin(ph) * 7, ky: 0.82 + 0.18 * Math.cos(ph), shade: 0.1 * (1 - Math.cos(ph)) / 2 };
  });

// Rudder: turning about its hinge (left edge), so it narrows and darkens.
const rudder = () =>
  partStrip('boss_galleon_rudder', 5, 21, 47, [0, 0, 21, 47], [0, 23.5], (i) => ({ kx: 1 - 0.15 * i, shade: 0.07 * i }));

/** Squid eye: a glowing amber lens that pulses and narrows (ping-ponged by the game). */
async function squidEye() {
  const frames = [];
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const pupil = 1.6 - k * 1.0;
    const body = `<circle cx="6" cy="6" r="5.6" fill="#1b1830"/>
      <circle cx="6" cy="6" r="4.6" fill="url(#iris)"/>
      <ellipse cx="6" cy="6" rx="${pupil.toFixed(2)}" ry="3.4" fill="#2a0a05"/>
      <ellipse cx="4.6" cy="4.2" rx="1.5" ry="1" fill="#fff" opacity="0.8"/>
      <circle cx="6" cy="6" r="5.6" fill="none" stroke="#c9a24a" stroke-width="0.9"/>`;
    const defs = `<radialGradient id="iris" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbd0"/><stop offset="${(0.35 + k * 0.2).toFixed(2)}" stop-color="#ffd23f"/><stop offset="1" stop-color="${k > 0.5 ? '#ff7a1a' : '#e0531c'}"/></radialGradient>`;
    frames.push(await svgImg(12, 12, body, defs));
  }
  return strip(frames);
}

/** A boss with its parts at the game's offsets, on a canvas wide enough for them. */
async function assembled(which) {
  const frame0 = (img, fw) => cut(img, 0, 0, fw * S, img.h);
  if (which === 'sub') {
    const out = blank(250 * S, 155 * S);
    paste(out, await place(await source('torpedo_boss'), 250 * S, 155 * S, { box: px([22, 0, 210, 155]), ax: 1, ay: 1 }), 0, 0);
    return paste(out, frame0(await propStrip(44, 0.4, 10, 58.5, 22, 81, 4), 22), 227 * S, 54 * S);
  }
  if (which === 'mecha') {
    const out = blank(223 * S, 217 * S);
    paste(out, await mechaBody(), 0, 0);
    return paste(out, frame0(await mechaFin(), 39), 184 * S, 60 * S);
  }
  if (which === 'squid') {
    const out = blank(284 * S, 147 * S);
    paste(out, await squidBody(), 0, 0);
    paste(out, frame0(await squidFin(), 67), 217 * S, 60 * S);
    return paste(out, frame0(await squidEye(), 12), 133 * S, 80 * S);
  }
  const out = blank(159 * S, 349 * S);
  paste(out, await galleonBody(), 0, 0);
  return paste(out, cut(await rudder(), 2 * 21 * S, 0, 21 * S, 47 * S), 121 * S, 300 * S);
}

// ------------------------------------------------------------------ HUD meter

/** The meter's dark channel in its source: the longest dark run along the middle row. */
function darkChannel(img) {
  const dark = (x, y) => {
    const i = (y * img.w + x) * 4;
    return img.data[i + 3] > 200 && (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3 < 32;
  };
  const cy = Math.floor(img.h / 2);
  let best = [0, 0];
  for (let x = 0, st = -1; x <= img.w; x++) {
    if (x < img.w && dark(x, cy)) {
      if (st < 0) st = x;
    } else if (st >= 0) {
      if (x - st > best[1] - best[0]) best = [st, x];
      st = -1;
    }
  }
  const mid = Math.floor((best[0] + best[1]) / 2);
  let top = cy, bot = cy;
  while (top > 0 && dark(mid, top - 1)) top--;
  while (bot < img.h - 1 && dark(mid, bot + 1)) bot++;
  return { x: best[0], w: best[1] - best[0], y: top, h: bot - top + 1 };
}

/**
 * Three-slice fit: the channel maps exactly onto the fill rect (36, 10, 294, 20); the
 * skull end and the BOSS end are scaled into the space either side.
 */
async function meter() {
  const src = await source('boss_meter_src');
  const ch = darkChannel(src);
  const ky = (20 * S) / ch.h;
  const H = src.h * ky;
  const y = 10 * S - ch.y * ky;
  const out = blank(380 * S, 40 * S);
  const slices = [
    [0, ch.x, 0, 36],
    [ch.x, ch.w, 36, 294],
    [ch.x + ch.w, src.w - ch.x - ch.w, 330, 50],
  ];
  for (const [sx, sw, dx, dw] of slices) paste(out, await resize(cut(src, sx, 0, sw, src.h), dw * S, H), dx * S, y);
  return out;
}

async function meterFill() {
  const src = await source('boss_meter_liquid');
  // The even middle of the bar, without its ends.
  const mid = cut(src, src.w * 0.3, 0, src.w * 0.4, src.h);
  return resize(mid, 294 * S, 20 * S);
}

// ------------------------------------------------------------------ abyss trophy card

const CARDS = [
  { x: 4, y: 4, name: 'PIRATE SUB', boss: 'sub', k: 1 },
  { x: 146, y: 4, name: 'GHOST SHIP', boss: 'galleon', k: 0.98 },
  { x: 4, y: 170, name: 'MECHA-SHARK', boss: 'mecha', k: 1 },
  { x: 146, y: 170, name: 'ROBO-SQUID', boss: 'squid', k: 1 },
];
const CW = 138, CH = 162;
// Each card: name strip, picture window, footer with "DEFEATED" and the count slot.

/** Blue runs down the card's centre column: [y0, y1] pairs (the name strip, the window). */
function blueRuns(img) {
  const isBlue = (x, y) => {
    const i = (y * img.w + x) * 4;
    const [r, g, b] = img.data.subarray(i, i + 3);
    return b > r + 25 && (r + g + b) / 3 < 170;
  };
  const cx = Math.floor(img.w / 2);
  const runs = [];
  for (let y = 0, st = -1; y <= img.h; y++) {
    if (y < img.h && isBlue(cx, y)) {
      if (st < 0) st = y;
    } else if (st >= 0) {
      if (y - st > img.h * 0.03) runs.push([st, y]);
      st = -1;
    }
  }
  // The window is the tallest run; its left/right edges come from a row in its water.
  const win = runs.reduce((m, r) => (r[1] - r[0] > m[1] - m[0] ? r : m));
  const strip = runs.filter((r) => r[1] <= win[0]).pop();
  // The window runs on below the blue water (its sand is pale) to the brass frame.
  const brass = (y) => {
    const i = (y * img.w + cx) * 4;
    return img.data[i] - img.data[i + 2] > 55 && img.data[i] > 140;
  };
  let bot = win[1];
  while (bot < img.h - 1 && !brass(bot)) bot++;
  win[1] = bot;
  const cy = Math.floor(win[0] + (win[1] - win[0]) * 0.3);
  let x0 = cx, x1 = cx;
  while (x0 > 0 && isBlue(x0 - 1, cy)) x0--;
  while (x1 < img.w - 1 && isBlue(x1 + 1, cy)) x1++;
  return { win: [x0, win[0], x1 - x0 + 1, win[1] - win[0]], strip };
}

async function abyssCard() {
  const out = blank(288 * S, 337 * S);
  const src = await source('boss_trophy_card');
  const { win: [wx, wy, ww, wh], strip: nameStrip } = blueRuns(src);
  // The card is stretched to 138x162; its window and name strip are found in the source.
  const card = await resize(src, CW * S, CH * S);
  const sx = (CW * S) / src.w, sy = (CH * S) / src.h;
  const win = [wx * sx, wy * sy, ww * sx, wh * sy];
  for (const c of CARDS) {
    const cardImg = { w: card.w, h: card.h, data: Buffer.from(card.data) };
    const b = await assembled(c.boss);
    const [bx, by, bw, bh] = bbox(b);
    const trimmed = crop(b, [bx, by, bw, bh]);
    const inset = 3 * S;
    const t = await fit(trimmed, (win[2] - inset * 2) * c.k, (win[3] - inset * 2) * c.k);
    // Clip to the window.
    // A little above centre, clear of the count slot that overlaps the window's foot.
    const layer = paste(blank(card.w, card.h), t, win[0] + (win[2] - t.w) / 2, win[1] + (win[3] - t.h) / 2 - 4 * S);
    for (let y = 0; y < card.h; y++)
      for (let x = 0; x < card.w; x++)
        if (x < win[0] + 2 || x >= win[0] + win[2] - 2 || y < win[1] + 2 || y >= win[1] + win[3] - 2) layer.data[(y * card.w + x) * 4 + 3] = 0;
    paste(cardImg, layer, 0, 0);
    paste(out, cardImg, c.x * S, c.y * S);
  }
  // Names on the strips above the windows, and the footer label + count slot.
  // Baseline a little below the name strip's middle (cap height ~ 9 at size 13).
  const nameY = nameStrip ? ((nameStrip[0] + nameStrip[1]) / 2) * (sy / S) + 4.6 : 22;
  let body = '';
  for (const c of CARDS) {
    body += text(c.name, { x: c.x + CW / 2, y: c.y + nameY, size: 13, file: FONTS.display, anchor: 'middle', fill: '#ffd76a', stroke: '#14203a', strokeWidth: 2.5 });
    body += text('DEFEATED', { x: c.x + 12, y: c.y + 146, size: 10.5, file: FONTS.slab, fill: '#7a5a2e' });
    body += `<rect x="${c.x + 90}" y="${c.y + 130}" width="40" height="21" rx="6" fill="#fffaf0" stroke="#b8975c" stroke-width="1.2" opacity="0.95"/>`;
  }
  return paste(out, await svgImg(288, 337, body), 0, 0);
}

export default {
  torpedo_boss_rotor: () => propStrip(44, 0.4, 10, 58.5, 22, 81, 4),
  rotor_torpedo: () => propStrip(34, 0.3, 5, 20, 11, 41, 2.5),
  torpedo_swim: torpedo,
  torpedo_reverse: torpedoReverse,
  torpedo_launch: torpedoLaunch,
  torpedo_explode: torpedoExplode,
  cannonball,
  cannonball_turn: cannonballTurn,
  boss_mecha: mechaBody,
  boss_mecha_fin: mechaFin,
  // Same scale as the live body (its tail now attached), listing nose-down a little.
  boss_mecha_death: async () => rotate(await place(await source('boss_mecha_wreck'), 230 * S, 216 * S, { box: px([0, -6, 230, 228]), ax: 0 }), 6),
  boss_squid: squidBody,
  boss_squid_fin: squidFin,
  boss_squid_eye: squidEye,
  boss_squid_death: async () => repaint('boss_squid_wreck', await svgArt('boss_squid_death'), { mask: false }),
  boss_galleon: galleonBody,
  // Painted with the live ship as its reference, so it takes the same fit.
  boss_galleon_death: () => sized('boss_galleon_wreck', 159, 349, 0, 8, 159, 300),
  galleon_rudder: rudder,
  boss_meter: meter,
  boss_meter_fill: meterFill,
  abyss_boss: abyssCard,
};

