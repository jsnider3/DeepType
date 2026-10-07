// World images: playfield backdrops, the dive-start surface strips with the boat and hose,
// the map screen, and the typing tutor. Sources are described in gen/world.mjs.
//
// Notes per image (logical px; output is SCALE x):
// - water1 690x480: water_open stretched to size, its top-to-bottom tone flattened row by row
//   and wrapped (blended with itself shifted half a tile) so it tiles vertically seamlessly.
// - sand 690x300: sand_floor, sand line ~y 20, solid (bottom rows stretched) to the bottom.
// - coralshelf 396x259: coral_shelf fitted to the box, base on the bottom edge. Clams cover
//   local x 49..349, y 19..229 (board.ts: drawn at 126,floorY; clams.ts ROWS).
// - topbackground*: a surf_* split-level painting cropped to the strip with its waterline at
//   y 95 (WATERLINE table per source), the bottom rows faded into water1's colour; the same
//   dive_boat composited at the same place on every strip (tinted per scene), its pulley at
//   the far left; the hose (tube(), same look as upper_hose) drops from the pulley's left side
//   at x 44.5 to the bottom edge, where upper_hose (drawn by diver.ts at x 40) continues it.
// - upper_hose 8 x 9x210: a dark corrugated rubber hose (like the painted diver's) centred at
//   x 4.5 with the same wave as art/diver.mjs; ribs every 3 px so each frame tiles at 210.
// - mapbg 700x540: map_chart (a repaint of svg:mapbg, so islands, coasts and the open water
//   around the MAP_NODES sites stay where the SVG layout put them), with the arch composited
//   at (443,341). mapscreen_arch: the same arch image (map_arch fitted to svg:mapscreen_arch),
//   so the overlay lines up exactly with the arch in mapbg.
// - mapchest_*: map_chest / map_chest_open fitted to 48x35 with the letter drawn in Luckiest
//   Guy (white, ink outline) over the front, as the SVG did. mapship / mapshipcolor: map_ship;
//   the colour version adds a pulsing gold glow, bob/tilt, a wake ring and a glint (6 frames).
//   point / point_green: small shaded beads (procedural).
// - tutor_bg: built from the key rects in art/tutor.mjs (R = KEY_GLOW + spec sizes, plus the
//   unlit keys): tut_case nine-sliced so its tray holds every cap, one tut_keycap nine-sliced
//   per CAP rect with legends in Barlow, the side panel from tut_side / tut_plaque / tut_card
//   at the SVG's rects (text card 461,56 173x314; LESSON label 521,383; button tray y 416+),
//   a cable to the panel and a glass frame behind the lesson text. Water shows through.
// - glo_*: tut_keycap_lit nine-sliced to the same cap (a touch larger) over a pink halo that
//   fills the glow rect, with the legend; drawn at KEY_GLOW so it covers the idle cap exactly.
// - hands: tut_hands repainted onto svg:hands. finger0..8(x): tut_finger warped along each
//   finger's axis (FINGERS base -> tip centre, as art/tutor.mjs) so tips sit at RING_POS + 29
//   and bases hide under the knuckles; pressed = shortened 3 px, hot orange, pink halo.
// - glowring 58x58: procedural pink/gold ring with a soft glow.

import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { SCALE as S, source, place, paste, blank, strip, warp, resize, repaint, svgArt, bbox, crop, tint, darken, rotate, cut } from './lib.mjs';
import { C, text, FONTS } from '../art/lib.mjs';

const px = (a) => a.map((v) => v * S);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ================================================================ helpers

/** Render an SVG fragment (logical w x h) at SCALE. */
async function vec(w, h, body, defs = '') {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
  const pngBuf = new Resvg(s, { fitTo: { mode: 'width', value: w * S } }).render().asPng();
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** Piecewise-linear map through matching knots (out -> src). */
function knots(outK, srcK) {
  return (v) => {
    for (let i = 0; i < outK.length - 1; i++) {
      if (v <= outK[i + 1] || i === outK.length - 2) {
        const t = (v - outK[i]) / (outK[i + 1] - outK[i] || 1);
        return srcK[i] + t * (srcK[i + 1] - srcK[i]);
      }
    }
    return srcK[srcK.length - 1];
  };
}

/**
 * Nine-slice: the source's borders (sx: [left, right] insets, sy: [top, bottom], in source px)
 * map to the destination borders (dx, dy in output px); the middle stretches.
 */
function nine(img, w, h, [sl, sr], [st, sb], [dl, dr], [dt, db]) {
  w = Math.round(w);
  h = Math.round(h);
  const fx = knots([0, dl, w - dr, w], [0, sl, img.w - sr, img.w]);
  const fy = knots([0, dt, h - db, h], [0, st, img.h - sb, img.h]);
  // Pre-shrink for quality when the source is much larger than the borders need.
  return warp(img, (x, y) => [fx(x), fy(y)], w, h);
}

/** Box-filtered downscale so warp() (bilinear) doesn't alias on big sources. */
async function prescale(img, k) {
  return k < 1 ? resize(img, img.w * k, img.h * k) : img;
}

/** Blur all four channels (use on single-colour glow layers). */
async function blur(img, sigma) {
  const { data, info } = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).blur(sigma).raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** A glow layer: img's silhouette in one colour, dilated a little and blurred. */
async function glowOf(img, color, sigma, gain = 1) {
  const [r, g, b] = hex(color);
  const out = tint(img, (_r, _g, _b, a) => [r, g, b, a]);
  const bl = await blur(out, sigma);
  return tint(bl, (_r, _g, _b, a) => [r, g, b, Math.min(255, a * gain)]);
}

function meanColor(img, [x0, y0, w, h] = [0, 0, img.w, img.h]) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.w + x) * 4;
      r += img.data[i];
      g += img.data[i + 1];
      b += img.data[i + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

// ================================================================ hose / tube

const HOSE = { r: 3.3, rib: 3, base: [44, 48, 56], hi: [176, 196, 214], groove: 0.5 };

/**
 * A corrugated rubber tube along a polyline (output px), drawn onto a w x h canvas.
 * Ribs follow arc length, or the y coordinate when alongY (so vertical tiles repeat exactly).
 */
function tube(w, h, pts, { r = HOSE.r * S, rib = HOSE.rib * S, alongY = false, light = 1 } = {}) {
  const out = blank(w, h);
  const segs = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (L > 0) segs.push({ ax, ay, bx, by, L, s0: acc });
    acc += L;
  }
  const [br, bg, bb] = HOSE.base;
  const [hr, hg, hb] = HOSE.hi;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px0 = x + 0.5, py0 = y + 0.5;
      let best = null;
      for (const s of segs) {
        const dx = s.bx - s.ax, dy = s.by - s.ay;
        const t = clamp(((px0 - s.ax) * dx + (py0 - s.ay) * dy) / (s.L * s.L));
        const qx = s.ax + dx * t, qy = s.ay + dy * t;
        const d2 = (px0 - qx) ** 2 + (py0 - qy) ** 2;
        if (!best || d2 < best.d2) best = { d2, s, t, side: Math.sign(dx * (py0 - s.ay) - dy * (px0 - s.ax)) };
      }
      if (!best) continue;
      const d = Math.sqrt(best.d2);
      const a = clamp(r - d + 0.5);
      if (a <= 0) continue;
      // Signed across-coordinate: negative on the side facing the light (up-left).
      const { s } = best;
      // The cross-product side (+) has normal (-dy, dx); light comes from the upper left.
      const plusLit = (-(s.by - s.ay) * -0.6 + (s.bx - s.ax) * -0.8) / s.L > 0;
      const tSigned = clamp((d / r) * (best.side > 0 ? 1 : -1) * (plusLit ? -1 : 1), -1, 1);
      const nz = Math.sqrt(Math.max(0, 1 - tSigned * tSigned));
      const sPos = alongY ? py0 : s.s0 + best.t * s.L;
      const ph = (((sPos / rib) % 1) + 1) % 1;
      const groove = Math.exp(-(((ph - 0.5) / 0.16) ** 2));
      const crest = Math.exp(-(((ph - 0.18) / 0.12) ** 2));
      let diff = 0.32 + 0.68 * clamp(nz * 0.8 - tSigned * 0.4);
      diff *= 1 - HOSE.groove * groove * (0.4 + 0.6 * nz);
      diff *= light;
      const spec = (Math.exp(-(((tSigned + 0.42) / 0.2) ** 2)) * 0.5 + crest * 0.12 * nz) * light;
      const rim = Math.exp(-(((tSigned - 0.86) / 0.1) ** 2)) * 0.22; // cool bounce light on the far side
      const edge = 0.55 + 0.45 * smooth((1 - Math.abs(tSigned)) / 0.25);
      const i = (y * w + x) * 4;
      out.data[i] = clamp((br * diff + hr * spec + 90 * rim) * edge, 0, 255);
      out.data[i + 1] = clamp((bg * diff + hg * spec + 140 * rim) * edge, 0, 255);
      out.data[i + 2] = clamp((bb * diff + hb * spec + 190 * rim) * edge, 0, 255);
      out.data[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}

/** upper_hose: 8 frames ping-ponging between two gentle waves (same motion as art/diver.mjs). */
function upperHose() {
  const TAU = Math.PI * 2;
  const frames = Array.from({ length: 8 }, (_, i) => {
    const a = 1.25 * ((i / 7) * 2 - 1);
    const xAt = (y) => 4.5 + a * Math.sin((y / 210) * TAU * 2) + 0.35 * Math.sin((y / 210) * TAU * 3 + i * 0.4) * (1 - Math.abs(a) / 1.25);
    const pts = [];
    for (let y = -10; y <= 220; y += 3) pts.push([xAt(y) * S, y * S]);
    return tube(9 * S, 210 * S, pts, { alongY: true });
  });
  return strip(frames);
}

// ================================================================ open water

let waterCache;
async function water1() {
  if (waterCache) return waterCache;
  const W = 690 * S, H = 480 * S;
  const img = await resize(await source('water_open', { trim: false }), W, H);
  // Flatten the vertical tone: shift each row's mean (smoothed) to the image mean.
  const rows = [];
  for (let y = 0; y < H; y++) rows.push(meanColor(img, [0, y, W, 1]));
  const all = [0, 1, 2].map((k) => rows.reduce((s, r) => s + r[k], 0) / H);
  const R = 40;
  const sm = rows.map((_, y) => {
    const acc = [0, 0, 0];
    let n = 0;
    for (let k = -R; k <= R; k++) {
      const yy = clamp(y + k, 0, H - 1);
      for (let c = 0; c < 3; c++) acc[c] += rows[yy][c];
      n++;
    }
    return acc.map((v) => v / n);
  });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) img.data[i + c] = clamp(img.data[i + c] + all[c] - sm[y][c], 0, 255);
    }
  }
  // Wrap: blend with itself shifted by half a tile near the top and bottom edges.
  const out = blank(W, H);
  const B = H * 0.3;
  for (let y = 0; y < H; y++) {
    const wgt = smooth(Math.min(y, H - 1 - y) / B);
    const y2 = (y + H / 2) % H;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const j = (y2 * W + x) * 4;
      for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(img.data[i + c] * wgt + img.data[j + c] * (1 - wgt));
      out.data[i + 3] = 255;
    }
  }
  waterCache = out;
  return out;
}

// ================================================================ clam level floor

async function sand() {
  const W = 690 * S, H = 300 * S;
  const img = await source('sand_floor');
  const r = await resize(img, W, (img.h * W) / img.w);
  const top = 18 * S;
  const out = blank(W, H);
  paste(out, r, 0, top);
  if (top + r.h < H) {
    // Stretch the bottom rows of sand down to the edge.
    const band = 8;
    const base = await resize(cut(r, 0, r.h - band, W, band), W, H - (top + r.h) + band);
    paste(out, base, 0, top + r.h - band);
  }
  // Distance haze: the far (upper) sand fades towards the water colour.
  const wc = meanColor(await water1(), [0, 0, 640 * S, 40 * S]);
  for (let y = 0; y < H * 0.5; y++) {
    const t = 0.5 * (1 - smooth(y / (H * 0.5)));
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(out.data[i + c] * (1 - t) + wc[c] * t);
    }
  }
  return out;
}

async function coralshelf() {
  // Stretched to fill the box so its four ledges carry the four clam rows.
  return resize(await source('coral_shelf'), 396 * S, 259 * S);
}

// ================================================================ surface strips

const TH = 119;
const WL = 95;
/** Waterline row in each surf_* source, as a fraction of its height (checked by eye). */
const WATERLINE = { surf_sunny: 0.655, surf_iceberg: 0.66, surf_lighthouse: 0.689, surf_shipwreck: 0.667, surf_storm: 0.693, surf_volcano: 0.652 };
/** Vertical squash for sources whose landmark rises too high to fit the strip (lighthouse lamp). */
const SQUASH = { surf_lighthouse: 0.76 };

/** The boat, scaled and positioned: pulley centre at (PULLEY) and hull bottom near y 104. */
const BOAT_W = 152;
const PULLEY_X = 47.5; // the hose drops from its left side at x 44.5
let boatCache;
async function boatLayout() {
  if (boatCache) return boatCache;
  const src = await source('dive_boat');
  const k = (BOAT_W * S) / src.w;
  const img = await resize(src, src.w * k, src.h * k);
  // Pulley: the left-most opaque pixels (top of the A-frame overhanging the stern).
  const cols = Math.max(2, Math.round(img.w * 0.035));
  let sy = 0, n = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < cols; x++) if (img.data[(y * img.w + x) * 4 + 3] > 128) (sy += y), n++;
  const py = n ? sy / n : img.h * 0.2;
  const ox = PULLEY_X * S - cols / 2 - 2 * S;
  const oy = (TH - 13) * S - img.h; // hull's flat cut ~12 px under the waterline
  boatCache = { img, ox, oy, pulley: [PULLEY_X * S, oy + py] };
  return boatCache;
}

async function surfaceStrip(src, { boatTone = null, tilt = 0 } = {}) {
  const W = 640 * S, H = TH * S;
  const sky = await source(src, { trim: false });
  const k = W / sky.w;
  const sc = await resize(sky, W, sky.h * k * (SQUASH[src] ?? 1));
  const wl = WATERLINE[src] * sc.h;
  const out = cut(sc, 0, clamp(Math.round(wl - WL * S), 0, sc.h - H), W, H);
  // Fade the underwater band into the open water below (water1 continues under the strip).
  const wc = meanColor(await water1(), [0, 0, 640 * S, 40 * S]);
  for (let y = WL * S; y < H; y++) {
    const t = 0.15 + 0.85 * smooth((y - WL * S) / (H - WL * S));
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(out.data[i + c] * (1 - t) + wc[c] * t);
    }
  }
  // Boat.
  const { img, ox, oy, pulley } = await boatLayout();
  let boat = blank(W, H);
  paste(boat, img, ox, oy);
  if (boatTone) boat = tint(boat, boatTone);
  // Below the waterline the hull is seen through the water: tinted and fading out with depth.
  const under = meanColor(out, [200 * S, (WL + 4) * S, 200 * S, 6 * S]);
  const y0 = (WL - 1) * S;
  for (let y = y0; y < H; y++) {
    const d = (y - y0) / ((TH - WL) * S);
    const t = smooth(d / 0.12) * (0.4 + 0.35 * d);
    const fadeA = 1 - smooth(d / 0.5) * 0.55;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!boat.data[i + 3]) continue;
      for (let c = 0; c < 3; c++) boat.data[i + c] = Math.round(boat.data[i + c] * (1 - t) + under[c] * t);
      boat.data[i + 3] = Math.round(boat.data[i + 3] * fadeA);
    }
  }
  if (tilt) boat = rotate(boat, tilt, pulley[0], pulley[1]);
  paste(out, boat, 0, 0);
  // Hose over the pulley's top and straight down at x 44.5 to the bottom edge.
  const [cx, cy] = pulley;
  const pr = 3 * S;
  const pts = [];
  for (let a = -40; a >= -180; a -= 10) {
    const rad = (a * Math.PI) / 180;
    pts.push([cx + Math.cos(rad) * pr, cy + Math.sin(rad) * pr]);
  }
  pts.push([44.5 * S, cy + 4 * S], [44.5 * S, H + 4 * S]);
  paste(out, tube(W, H, pts, { light: boatTone ? 0.75 : 1 }), 0, 0);
  // A little foam where the hose enters the water.
  const foam = await vec(640, TH, `<ellipse cx="44.5" cy="${WL}" rx="7" ry="1.6" fill="#ffffff" opacity="0.75"/><ellipse cx="44.5" cy="${WL + 0.6}" rx="4" ry="1" fill="#ffffff"/>`);
  paste(out, await blur(foam, 1.2), 0, 0);
  return out;
}

const NIGHT = (r, g, b, a) => [r * 0.42 + 6, g * 0.48 + 10, b * 0.66 + 30, a];
const STORM = (r, g, b, a) => [r * 0.62 + 6, g * 0.66 + 8, b * 0.74 + 16, a];
const DUSK = (r, g, b, a) => [r * 0.98 + 10, g * 0.86 + 4, b * 0.74, a];
const ICE = (r, g, b, a) => [r * 0.94, g * 0.97 + 4, b * 1.02 + 6, a];

// ================================================================ map screen

const ARCH_AT = [443, 341];
let archCache;
async function arch() {
  archCache ??= await repaint('map_arch', await svgArt('mapscreen_arch'));
  return archCache;
}

async function mapbg() {
  const chart = await resize(await source('map_chart', { trim: false }), 700 * S, 540 * S);
  const a = await arch();
  const [ax, ay] = ARCH_AT;
  // The arch stands in the shallows: a soft shadow and foam around its two feet.
  paste(chart, await glowOf(a, '#06243a', 2.5 * S, 1), (ax + 4) * S, (ay + 5) * S, 0.45);
  const foam = await vec(700, 540, [[ax + 10, ay + 89, 11], [ax + 71, ay + 67, 9]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.42}" fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.8"/>`).join(''));
  paste(chart, await blur(foam, 1.2 * S), 0, 0);
  return paste(chart, a, ax * S, ay * S);
}

async function chest(letter, open) {
  const img = await source(open ? 'map_chest_open' : 'map_chest');
  const out = await place(img, 48 * S, 35 * S, { box: px([3, 1, 42, 33]), ay: 1 });
  const label = await vec(48, 35, text(letter, { x: 24, y: 31.5, size: 22, file: FONTS.display, anchor: 'middle', fill: '#ffffff', stroke: C.ink, strokeWidth: 3.4 }));
  return paste(out, label, 0, 0);
}

const mapship = async () => place(await source('map_ship'), 26 * S, 22 * S, { box: px([0, 0, 26, 22]), ay: 1 });

async function mapshipcolor() {
  const ship = await place(await source('map_ship'), 50 * S, 45 * S, { box: px([9, 6, 32, 30]), ay: 1 });
  const glow = await glowOf(ship, '#ffd84a', 5 * S, 2.2);
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const a = t * Math.PI * 2;
    const bob = Math.sin(a) * 1.2 * S;
    const f = blank(50 * S, 45 * S);
    const pulse = 0.8 + 0.2 * Math.sin(a);
    const ring = (t * 6) % 6;
    const halo = await vec(
      50,
      45,
      `<ellipse cx="25" cy="25" rx="${23 * (0.95 + pulse * 0.05)}" ry="${19 * (0.95 + pulse * 0.05)}" fill="url(#g)"/>` +
        `<ellipse cx="25" cy="37" rx="${15 + ring}" ry="3.2" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="${0.8 - ring / 8}"/>`,
      `<radialGradient id="g"><stop offset="0" stop-color="#fff6b0" stop-opacity="${0.75 * pulse}"/><stop offset="0.55" stop-color="#ffd84a" stop-opacity="${0.4 * pulse}"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient>`,
    );
    paste(f, halo, 0, 0);
    let s = blank(50 * S, 45 * S);
    paste(s, glow, 0, 0, 0.9 * pulse);
    paste(s, ship, 0, 0);
    s = rotate(s, Math.sin(a + 0.8) * 3, 25 * S, 34 * S);
    paste(f, s, 0, bob);
    // Glint travelling over the sail.
    const gx = 22 + Math.sin(a) * 5, gy = 15 + bob / S, kk = 0.6 + 0.4 * Math.abs(Math.cos(a));
    const star = `M${gx},${gy - 5 * kk} L${gx + 1.1},${gy - 1.1} L${gx + 5 * kk},${gy} L${gx + 1.1},${gy + 1.1} L${gx},${gy + 5 * kk} L${gx - 1.1},${gy + 1.1} L${gx - 5 * kk},${gy} L${gx - 1.1},${gy - 1.1}Z`;
    paste(f, await vec(50, 45, `<path d="${star}" fill="#ffffff"/>`), 0, 0);
    frames.push(f);
  }
  return strip(frames);
}

const bead = (c0, c1, rim) =>
  vec(
    10,
    10,
    `<circle cx="5" cy="5.4" r="4" fill="#000" opacity="0.25"/><circle cx="5" cy="5" r="3.6" fill="url(#b)" stroke="${rim}" stroke-width="0.9"/><ellipse cx="3.9" cy="3.6" rx="1.4" ry="0.9" fill="#fff" opacity="0.85"/>`,
    `<radialGradient id="b" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></radialGradient>`,
  );

// ================================================================ typing tutor

// Glow rects [x, y, w, h] (KEY_GLOW + spec sizes) and the unlit keys; rows; cap tops/bottoms
// and legends: copied from art/tutor.mjs so the caps line up with the glo_* images.
const R = {
  tilde: [36, 171, 29, 22], 1: [64, 171, 28, 22], 2: [91, 171, 26, 23], 3: [117, 171, 24, 22],
  4: [141, 171, 25, 21], 5: [166, 171, 25, 21], 6: [190, 171, 25, 21], 7: [215, 171, 22, 21],
  8: [237, 171, 24, 21], 9: [264, 171, 24, 21], 0: [289, 171, 25, 21], hyphen: [315, 171, 27, 21],
  plus: [342, 171, 25, 21],
  q: [67, 197, 28, 22], w: [94, 197, 28, 22], e: [122, 197, 24, 22], r: [148, 197, 24, 22],
  t: [174, 197, 24, 22], y: [198, 197, 24, 22], u: [223, 197, 24, 22], i: [248, 197, 24, 22],
  o: [274, 197, 24, 22], p: [300, 197, 27, 22], lbrace: [328, 197, 28, 22], rbrace: [356, 197, 27, 22],
  backslash: [383, 197, 27, 22],
  a: [75, 224, 29, 23], s: [104, 224, 29, 23], d: [133, 224, 26, 23], f: [160, 224, 26, 23],
  g: [188, 224, 25, 23], h: [213, 224, 25, 23], j: [238, 224, 26, 23], k: [265, 224, 26, 23],
  l: [292, 224, 28, 23], colon: [321, 224, 29, 22], apostrophe: [350, 224, 29, 22],
  z: [83, 252, 28, 22], x: [113, 252, 28, 22], c: [143, 252, 28, 22], v: [171, 252, 28, 22],
  b: [201, 252, 25, 22], n: [227, 252, 25, 22], m: [254, 252, 27, 22], comma: [283, 252, 27, 22],
  period: [310, 252, 29, 22], forslash: [341, 252, 29, 22],
  space: [119, 278, 217, 24], lshift: [20, 252, 61, 22], rshift: [372, 252, 50, 22],
  back: [369, 171, 39, 21], tab: [31, 197, 35, 22], caps: [24, 224, 49, 22], enter: [381, 224, 36, 22],
  lctrl: [22, 278, 41, 24], lalt: [74, 278, 41, 24], ralt: [340, 278, 40, 24], rctrl: [384, 278, 40, 24],
};
const ROWS = [
  ['tilde', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'hyphen', 'plus', 'back'],
  ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'lbrace', 'rbrace', 'backslash'],
  ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'colon', 'apostrophe', 'enter'],
  ['lshift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'comma', 'period', 'forslash', 'rshift'],
  ['lctrl', 'lalt', 'space', 'ralt', 'rctrl'],
];
const ROW_Y = [[172, 191], [198.5, 217.5], [225.5, 244.5], [253.5, 272.5], [279.5, 300.5]];
const LEGEND = {
  tilde: ['~', '`'], 1: ['!', '1'], 2: ['@', '2'], 3: ['#', '3'], 4: ['$', '4'], 5: ['%', '5'],
  6: ['^', '6'], 7: ['&', '7'], 8: ['*', '8'], 9: ['(', '9'], 0: [')', '0'], hyphen: ['_', '-'],
  plus: ['+', '='], lbrace: ['{', '['], rbrace: ['}', ']'], backslash: ['|', '\\'], colon: [':', ';'],
  apostrophe: ['"', "'"], comma: ['<', ','], period: ['>', '.'], forslash: ['?', '/'],
  back: 'Back', tab: 'Tab', caps: 'Caps', enter: 'Enter', lshift: 'Shift', rshift: 'Shift',
  lctrl: 'Ctrl', rctrl: 'Ctrl', lalt: 'Alt', ralt: 'Alt', space: '',
};
const CAP = {};
ROWS.forEach((row, ri) => {
  const [y0, y1] = ROW_Y[ri];
  row.forEach((k, i) => {
    const [x, , w] = R[k];
    let x0 = x + 1.5;
    let x1 = x + w - 1.5;
    if (i > 0) {
      const [qx, , qw] = R[row[i - 1]];
      x0 = Math.max(x + 1, (qx + qw + x) / 2 + 1.5);
    }
    if (i < row.length - 1) {
      const [nx] = R[row[i + 1]];
      x1 = Math.min(x + w - 1, (x + w + nx) / 2 - 1.5);
    }
    CAP[k] = [x0, y0, x1, y1];
  });
});

/** Legend markup in screen coordinates. */
function legend(k, [x0, y0, x1], color) {
  const L = LEGEND[k];
  const cx = (x0 + x1) / 2;
  if (L === undefined) return text(k.toUpperCase(), { x: cx, y: y0 + 12.4, size: 11, file: FONTS.sans, anchor: 'middle', fill: color });
  if (Array.isArray(L)) {
    return (
      text(L[0], { x: cx, y: y0 + 7.6, size: 7.5, file: FONTS.sans, anchor: 'middle', fill: color }) +
      text(L[1], { x: cx, y: y0 + 15, size: 8.5, file: FONTS.sans, anchor: 'middle', fill: color })
    );
  }
  return L ? text(L, { x: cx, y: y0 + 11.6, size: 8, file: FONTS.condensed, anchor: 'middle', fill: color, letterSpacing: 0.3 }) : '';
}

/** A painted key cap (source cap nine-sliced) sized w x h output px. */
let capSrc = {};
async function capImage(src, w, h) {
  if (!capSrc[src]) {
    const img = await source(src);
    capSrc[src] = await prescale(img, 160 / img.w);
  }
  const img = capSrc[src];
  const b = Math.min(w, h) * 0.3;
  const sb = img.w * 0.3;
  return nine(img, w, h, [sb, sb], [sb, sb], [b, b], [b, b]);
}

/** Case: nine-sliced so its tray (dark recess) spans the key area. */
function trayOf(img) {
  const lum = (x, y) => {
    const i = (y * img.w + x) * 4;
    return img.data[i + 3] > 200 ? (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3 : 255;
  };
  const midY = Math.floor(img.h / 2), midX = Math.floor(img.w / 2);
  const dark = (v) => v < 70;
  const run = (n, get) => {
    let best = [0, 0];
    for (let i = 0, st = -1; i <= n; i++) {
      if (i < n && dark(get(i))) {
        if (st < 0) st = i;
      } else if (st >= 0) {
        if (i - st > best[1] - best[0]) best = [st, i];
        st = -1;
      }
    }
    return best;
  };
  const [l, r] = run(img.w, (x) => lum(x, midY));
  const [t, b] = run(img.h, (y) => lum(midX, y));
  return { l, r, t, b };
}

const KB_OUT = [6, 156, 438, 320]; // case outer x0, y0, x1, y1
const KB_DECK = [16, 166, 428, 308]; // tray (all caps inside)

async function keyboardCase() {
  const src = await source('tut_case');
  const img = await prescale(src, (440 * S * 1.2) / src.w);
  const tr = trayOf(img);
  const [ox0, oy0, ox1, oy1] = px(KB_OUT);
  const [dx0, dy0, dx1, dy1] = px(KB_DECK);
  const w = ox1 - ox0, h = oy1 - oy0;
  const fx = knots([0, dx0 - ox0, dx1 - ox0, w], [0, tr.l, tr.r, img.w]);
  const fy = knots([0, dy0 - oy0, dy1 - oy0, h], [0, tr.t, tr.b, img.h]);
  return { img: warp(img, (x, y) => [fx(x), fy(y)], w, h), x: ox0, y: oy0 };
}

async function tutorBg() {
  const out = blank(640 * S, 480 * S);
  // Glass frame behind the lesson text (water shows through).
  paste(
    out,
    await vec(
      640,
      480,
      `<rect x="5" y="3" width="451" height="153" rx="12" fill="url(#f)"/>` +
        `<rect x="5.75" y="3.75" width="449.5" height="151.5" rx="11.5" fill="none" stroke="#cfefff" stroke-opacity="0.45" stroke-width="1.5"/>` +
        `<rect x="7.5" y="5.5" width="446" height="148" rx="10" fill="none" stroke="#0b1a33" stroke-opacity="0.45" stroke-width="1"/>` +
        '',
      `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06203f" stop-opacity="0.5"/><stop offset="1" stop-color="#06203f" stop-opacity="0.28"/></linearGradient>`,
    ),
    0,
    0,
  );
  // Keyboard: drop shadow, case, caps, legends.
  const kb = await keyboardCase();
  const sh = await glowOf(kb.img, '#020c1c', 6 * S, 1);
  paste(out, sh, kb.x + 3 * S, kb.y + 7 * S, 0.7);
  paste(out, kb.img, kb.x, kb.y);
  let labels = '';
  for (const k of Object.keys(R)) {
    const [x0, y0, x1, y1] = CAP[k];
    const cap = await capImage('tut_keycap', (x1 - x0) * S, (y1 - y0) * S);
    paste(out, cap, x0 * S, y0 * S);
    labels += legend(k, CAP[k], C.ink);
    if (k === 'f' || k === 'j') labels += `<path d="M${(x0 + x1) / 2 - 3},${y1 - 4.2} h6" stroke="#6f7c96" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  paste(out, await vec(640, 480, labels), 0, 0);
  // Cable from the keyboard to the side panel.
  const cable = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = 434 + t * 32;
    const y = 232 + 14 * (3 * t * t - 2 * t * t * t);
    cable.push([x * S, y * S]);
  }
  paste(out, tube(640 * S, 480 * S, cable, { r: 4.6 * S, rib: 2.6 * S }), 0, 0);
  await sidePanel(out);
  return out;
}

/** Nine-slice a source into w x h output px, keeping its corners' proportions (borders frac of its short side). */
async function nineSrc(name, w, h, frac, pre = 700) {
  const src = await source(name);
  const img = await prescale(src, Math.min(1, pre / Math.max(src.w, src.h)));
  const bs = frac * Math.min(img.w, img.h);
  const k = Math.min(w / img.w, h / img.h);
  const db = Math.min(bs * k, w / 2.05, h / 2.05);
  return nine(img, w, h, [bs, bs], [bs, bs], [db, db], [db, db]);
}

async function sidePanel(out) {
  const X = 462;
  // Steel column.
  const panel = await nineSrc('tut_side', 178 * S, 480 * S, 0.16);
  paste(out, panel, X * S, 0);
  // Shadow cast to the left onto the water.
  const shadow = await vec(640, 480, `<rect x="${X - 10}" y="0" width="12" height="480" fill="url(#s)"/>`, `<linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#020c1c" stop-opacity="0"/><stop offset="1" stop-color="#020c1c" stop-opacity="0.5"/></linearGradient>`);
  paste(out, shadow, 0, 0);
  // Button tray (Options / Back to Main Menu) at y 416+: darker steel with a lit top edge.
  const tray = darken(cut(panel, 0, 416 * S, 178 * S, 64 * S), 0.38);
  paste(out, tray, X * S, 416 * S);
  paste(out, await vec(640, 480, `<path d="M${X},416.5 H640" stroke="#0b1a33" stroke-width="1.6"/><path d="M${X},418 H640" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1"/>`), 0, 0);
  // TUTOR MODE plaque.
  const plaque = await nineSrc('tut_plaque', 168 * S, 46 * S, 0.32);
  paste(out, plaque, 467 * S, 5 * S);
  // Text card.
  // Widened 6 px to the left of the SVG's rect: the code prints text from x 472, which
  // otherwise sits on the card's gilt edge.
  const card = await nineSrc('tut_card', 173 * S, 314 * S, 0.1);
  paste(out, card, 461 * S, 56 * S);
  // LESSON label between the Prev / Next buttons.
  const lab = await nineSrc('tut_plaque', 63 * S, 24 * S, 0.32);
  paste(out, lab, 521 * S, 383 * S);
  const words =
    text('TUTOR MODE', { x: 551, y: 38.5, size: 23, file: FONTS.display, anchor: 'middle', fill: C.uiGold, stroke: C.ink, strokeWidth: 3.6, letterSpacing: 0.5 }) +
    text('LESSON', { x: 552.5, y: 399.6, size: 11, file: FONTS.slab, anchor: 'middle', fill: C.uiGold, stroke: C.ink, strokeWidth: 2.2, letterSpacing: 0.6 });
  paste(out, await vec(640, 480, words), 0, 0);
}

/** glo_*: the lit cap over a pink halo, cropped to the glow rect. */
async function glo(k) {
  const [rx, ry, rw, rh] = R[k];
  let [x0, y0, x1, y1] = CAP[k];
  x0 = Math.max(rx + 0.5, x0 - 0.8);
  x1 = Math.min(rx + rw - 0.5, x1 + 0.8);
  y0 = Math.max(ry + 0.5, y0 - 0.8);
  y1 = Math.min(ry + rh - 0.5, y1 + 0.8);
  const out = blank(rw * S, rh * S);
  const halo = await vec(rw, rh, `<rect x="0.6" y="0.6" width="${rw - 1.2}" height="${rh - 1.2}" rx="5" fill="#ff4f9a"/>`);
  paste(out, await blur(halo, 1.2 * S), 0, 0, 0.75);
  const cap = await capImage('tut_keycap_lit', (x1 - x0) * S, (y1 - y0) * S);
  paste(out, cap, (x0 - rx) * S, (y0 - ry) * S);
  // Legend (shifted into the image's frame).
  const lg = await vec(rw, rh, `<g transform="translate(${-rx},${-ry})">${legend(k, CAP[k], '#3a0d24')}</g>`);
  return paste(out, lg, 0, 0);
}

// ---------------------------------------------------------------- hands and fingers

const FINGER_POS = [[26, 358], [53, 352], [88, 349], [135, 353], [248, 430], [255, 351], [291, 347], [334, 348], [374, 355]];
const FINGER_SIZE = [[64, 60], [75, 67], [85, 66], [75, 94], [52, 50], [79, 95], [93, 70], [83, 74], [70, 65]];
const FINGERS = [
  { b: [66, 424], t: [55, 387], w: 19 },
  { b: [91, 420], t: [82, 381], w: 21 },
  { b: [119, 418], t: [117, 378], w: 22 },
  { b: [149, 422], t: [164, 382], w: 22 },
  null,
  { b: [301, 422], t: [284, 380], w: 22 },
  { b: [330, 418], t: [328, 376], w: 22 },
  { b: [360, 420], t: [368, 377], w: 21 },
  { b: [387, 424], t: [403, 384], w: 19 },
];
const THUMBS = [
  { joint: [243, 461], tip: [265, 459], w: 22 },
  { joint: [307, 464], tip: [289, 459], w: 22 },
];

/**
 * hands: the painted gloves fitted to the guide's width and knuckle line, with the top of the
 * painted cuff (CUFF_SRC of the source's height) on the guide's cuff line (screen y 471), so
 * only the top of the cuff shows above the bottom edge like the SVG.
 */
const CUFF_SRC = 0.816;
async function hands() {
  const guide = await svgArt('hands');
  const [gx, gy, gw] = bbox(guide);
  const src = await source('tut_hands');
  const k = gw / src.w;
  const img = await resize(src, gw, src.h * k);
  const cuffOut = (471 - 379) * S;
  const cuffSrc = img.h * CUFF_SRC;
  const fy = knots([gy, cuffOut, cuffOut + 100], [0, cuffSrc, cuffSrc + 100]);
  return warp(img, (x, y) => [x - gx, fy(y)], guide.w, guide.h);
}

let fingerSrc;
async function fingerSource() {
  if (!fingerSrc) {
    const src = await source('tut_finger');
    fingerSrc = await prescale(src, 120 / src.w);
  }
  return fingerSrc;
}

/** One finger from base b to tip centre t (screen coords), width w, onto an image at (ox, oy). */
function fingerOnto(out, src, ox, oy, b, t, w, { extend = 16, pressed = false } = {}) {
  let dx = t[0] - b[0], dy = t[1] - b[1];
  const L0 = Math.hypot(dx, dy);
  dx /= L0;
  dy /= L0;
  const r = w / 2;
  const L = L0 - (pressed ? 3 : 0);
  const top = [b[0] + dx * (L + r), b[1] + dy * (L + r)]; // tip end
  const len = L + r + extend; // tip end -> hidden base end
  const wid = w + 1.5;
  const ks = src.h / (len * S);
  const kw = src.w / (wid * S);
  const f = warp(
    src,
    (x, y) => {
      const sx0 = ox + x / S - top[0], sy0 = oy + y / S - top[1];
      const along = -(sx0 * dx + sy0 * dy); // 0 at the tip end, growing towards the base
      const across = sx0 * -dy + sy0 * dx;
      return [src.w / 2 + across * S * kw, along * S * ks];
    },
    out.w,
    out.h,
  );
  return paste(out, f, 0, 0);
}

const HOT = (r, g, b, a) => [Math.min(255, r * 1.02 + 8), g * 0.6, b * 0.5 + 8, a];

async function finger(i, pressed) {
  const [ox, oy] = FINGER_POS[i];
  const [w, h] = FINGER_SIZE[i];
  const src = await fingerSource();
  let out = blank(w * S, h * S);
  if (i === 4) for (const th of THUMBS) fingerOnto(out, src, ox, oy, th.joint, th.tip, th.w, { extend: 8, pressed });
  else fingerOnto(out, src, ox, oy, FINGERS[i].b, FINGERS[i].t, FINGERS[i].w, { pressed });
  if (!pressed) return out;
  out = tint(out, HOT);
  const halo = await glowOf(out, '#ff5fa2', 3 * S, 1.8);
  if (i === 4) {
    // The thumbs run off both sides: fade their halo towards the edges.
    for (let y = 0; y < halo.h; y++) for (let x = 0; x < halo.w; x++) {
      const u = x / halo.w;
      halo.data[(y * halo.w + x) * 4 + 3] *= smooth(Math.min(u, 1 - u) / 0.2);
    }
  }
  const res = blank(w * S, h * S);
  paste(res, halo, 0, 0, 0.85);
  return paste(res, out, 0, 0);
}

async function glowring() {
  return vec(
    58,
    58,
    `<circle cx="29" cy="29" r="29" fill="url(#h)"/>` +
      `<circle cx="29" cy="29" r="22.5" fill="none" stroke="#3a0d24" stroke-width="7" stroke-opacity="0.75"/>` +
      `<circle cx="29" cy="29" r="22.5" fill="none" stroke="url(#ring)" stroke-width="5"/>` +
      `<circle cx="29" cy="29" r="22.5" fill="none" stroke="#ffe08a" stroke-width="1.6" stroke-dasharray="9 4.5" opacity="0.95"/>` +
      `<path d="M13.5,18 A19,19 0 0 1 29,9.5" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>`,
    `<radialGradient id="h"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.2"/><stop offset="0.74" stop-color="#ff5fa2" stop-opacity="0"/><stop offset="0.86" stop-color="#ff5fa2" stop-opacity="0.6"/><stop offset="1" stop-color="#ff5fa2" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="ring" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8cc0"/><stop offset="1" stop-color="#e0287a"/></linearGradient>`,
  );
}

// ================================================================ exports

const images = {
  water1,
  sand,
  coralshelf,
  upper_hose: upperHose,
  topbackground: () => surfaceStrip('surf_sunny'),
  topbackground_iceberg: () => surfaceStrip('surf_iceberg', { boatTone: ICE }),
  topbackground_lighthouse: () => surfaceStrip('surf_lighthouse', { boatTone: NIGHT }),
  topbackground_shipwreck: () => surfaceStrip('surf_shipwreck', { boatTone: STORM }),
  topbackground_storm: () => surfaceStrip('surf_storm', { boatTone: STORM, tilt: -3 }),
  topbackground_volcano: () => surfaceStrip('surf_volcano', { boatTone: DUSK }),
  mapbg,
  mapscreen_arch: arch,
  mapchest_a: () => chest('A', false),
  mapchest_b: () => chest('B', false),
  mapchest_c: () => chest('C', false),
  mapchest_a_open: () => chest('A', true),
  mapchest_b_open: () => chest('B', true),
  mapchest_c_open: () => chest('C', true),
  mapship,
  mapshipcolor,
  point: () => bead('#d0664a', '#6e1c10', '#3a1208'),
  point_green: () => bead('#b8ff9a', '#1fae3e', C.ink),
  tutor_bg: tutorBg,
  hands,
  glowring,
};
for (const k of Object.keys(R)) images[`glo_${k}`] = () => glo(k);
for (let i = 0; i < 9; i++) {
  images[`finger${i}`] = () => finger(i, false);
  images[`finger${i}x`] = () => finger(i, true);
}
export default images;

void bbox;
void crop;
