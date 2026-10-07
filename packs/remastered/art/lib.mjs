// Shared helpers for the remastered art pack. Every image is an SVG string drawn in the
// original's logical pixel size (e.g. a 3200x70 strip of twenty 160x70 frames); the build
// renders it at 2x. Keep art modules pure: they return SVG text and touch nothing else.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import opentype from 'opentype.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- style guide

/** Shared palette. Art should draw from these so the pack reads as one style. */
export const C = {
  ink: '#16233a', // outline colour for everything
  inkSoft: '#2c3e5c',
  white: '#ffffff',
  black: '#000000',
  // sea
  sea0: '#0b2a55', // deep
  sea1: '#11407a',
  sea2: '#1d63a8',
  sea3: '#3d8fd1', // shallow
  foam: '#cfefff',
  sand0: '#b08a52',
  sand1: '#d8b878',
  sand2: '#f0dca6',
  rock0: '#2b3550',
  rock1: '#46547a',
  rock2: '#6b7aa3',
  kelp0: '#1f6b45',
  kelp1: '#38a865',
  coral: '#ff7b6b',
  // creatures
  sharkGrey: '#8fa6b8',
  sharkGreyDark: '#5f7688',
  sharkBelly: '#e8f1f5',
  tigerOrange: '#f29a3a',
  tigerStripe: '#7a3b14',
  hammer: '#9aa5ad',
  ghost: '#c9f2ff',
  toxic: '#7ed957',
  toxicDark: '#3d8a2a',
  piranha: '#4b8fe0',
  piranhaWhite: '#e9eef5',
  gumbo: '#7a3fb0',
  jelly: '#ff8ad8',
  // metal / boss
  steel0: '#3a4552',
  steel1: '#6a7888',
  steel2: '#a9b6c4',
  rust: '#a5532c',
  brass: '#d9a63a',
  wood0: '#5a3a22',
  wood1: '#8a5a34',
  wood2: '#b8834d',
  // diver
  diverYellow: '#ffd23f',
  diverYellowDark: '#d99a16',
  // UI
  ui0: '#2f3b52',
  uiPanel: '#c7ccd6',
  uiPanelDark: '#8a93a6',
  uiGold: '#ffcf4a',
  uiGoldDark: '#c48a12',
  uiRed: '#e2453a',
  uiGreen: '#38c172',
};

/** Outline width in logical px for sprites (rendered 2x, so this is a crisp 4px line). */
export const STROKE = 2;

// ---------------------------------------------------------------- SVG building

let uid = 0;
/** Unique id for gradients/clip paths within one image. */
export const id = (p = 'g') => `${p}${++uid}`;

/** Wrap body markup in an SVG document of logical size w x h. */
export function svg(w, h, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
}

/**
 * Lay out n frames of fw x fh side by side (or stacked if vertical), each clipped to its
 * cell so nothing bleeds into the neighbour. frame(i, t) returns markup in frame-local
 * coordinates; t = i / n is the animation phase in [0, 1).
 */
export function strip(n, fw, fh, frame, { vertical = false, clip = true } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = vertical ? 0 : i * fw;
    const y = vertical ? i * fh : 0;
    const cid = id('clip');
    out += clip
      ? `<clipPath id="${cid}"><rect x="0" y="0" width="${fw}" height="${fh}"/></clipPath><g transform="translate(${x},${y})" clip-path="url(#${cid})">${frame(i, i / n)}</g>`
      : `<g transform="translate(${x},${y})">${frame(i, i / n)}</g>`;
  }
  return out;
}

/** A cols x rows grid of frames (row-major), each fw x fh. */
export function grid(cols, rows, fw, fh, frame) {
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cid = id('clip');
      out += `<clipPath id="${cid}"><rect width="${fw}" height="${fh}"/></clipPath><g transform="translate(${c * fw},${r * fh})" clip-path="url(#${cid})">${frame(i, r, c)}</g>`;
    }
  }
  return out;
}

/** Linear gradient definition; stops = [[offset 0..1, colour, opacity?], ...]. Returns [defs, url]. */
export function linear(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const gid = id('lin');
  const s = stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  return [`<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`, `url(#${gid})`];
}

/** Radial gradient definition. Returns [defs, url]. */
export function radial(stops, { cx = 0.5, cy = 0.5, r = 0.5, fx, fy } = {}) {
  const gid = id('rad');
  const s = stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  return [`<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}"${fx !== undefined ? ` fx="${fx}" fy="${fy}"` : ''}>${s}</radialGradient>`, `url(#${gid})`];
}

/** Attribute string helper: attrs({ fill: 'red', 'stroke-width': 2 }). Skips null/undefined. */
export function attrs(o) {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
}

/** Standard outlined shape style. */
export function ink(fill, width = STROKE, extra = {}) {
  return attrs({ fill, stroke: C.ink, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...extra });
}

// ---------------------------------------------------------------- colour

function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
/** Lighten (amt > 0) or darken (amt < 0) a hex colour; amt in -1..1. */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  return rgbToHex([r + (t - r) * k, g + (t - g) * k, b + (t - b) * k]);
}
/** Mix two hex colours, k = 0 gives a, 1 gives b. */
export function mix(a, b, k) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * k));
}

// ---------------------------------------------------------------- geometry

/** Smooth closed path through points (Catmull-Rom to cubic Bezier). */
export function smoothPath(pts, closed = true, tension = 0.5) {
  const n = pts.length;
  const p = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
const f = (v) => +v.toFixed(2);
export const fmt = f;

/** Rotate point [x,y] around [cx,cy] by deg. */
export function rot([x, y], [cx, cy], deg) {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Deterministic pseudo-random generator so art is identical on every build. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// ---------------------------------------------------------------- text as paths

const fontCache = new Map();
/** Load a TTF from packs/remastered/fonts. */
export function loadFont(file) {
  if (!fontCache.has(file)) {
    const buf = readFileSync(path.join(here, '..', 'fonts', file));
    fontCache.set(file, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
  }
  return fontCache.get(file);
}

export const FONTS = {
  display: 'LuckiestGuy-Regular.ttf', // logos, banners
  slab: 'Arvo-Bold.ttf', // buttons, labels
  slabRegular: 'Arvo-Regular.ttf',
  condensed: 'BarlowCondensed-Bold.ttf',
  sans: 'Barlow-Bold.ttf',
};

/** Width of text in px at the given size. */
export function measure(str, size, file = FONTS.display) {
  return loadFont(file).getAdvanceWidth(str, size);
}

/**
 * Text converted to an SVG path (so rendering never depends on installed fonts).
 * anchor: 'start' | 'middle' | 'end'; y is the baseline.
 */
export function text(str, { x = 0, y = 0, size = 20, file = FONTS.display, anchor = 'start', fill = C.white, stroke, strokeWidth = 0, letterSpacing = 0, extra = {} } = {}) {
  const font = loadFont(file);
  let w = font.getAdvanceWidth(str, size) + letterSpacing * Math.max(0, str.length - 1);
  let x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  let d = '';
  for (const ch of str) {
    d += font.getPath(ch, x0, y, size).toPathData(2);
    x0 += font.getAdvanceWidth(ch, size) + letterSpacing;
  }
  const outline = stroke ? `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>` : '';
  return `${outline}<path d="${d}" ${attrs({ fill, ...extra })}/>`;
}

/** Title shown in logo art (title screen, menu, favicon text). Change here to rebrand. */
export const GAME_TITLE = 'DEEP TYPE';
