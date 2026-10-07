// Shared helpers for the big background images (scenery.mjs, map.mjs). Not an image module.

import { id, fmt, smoothPath } from './lib.mjs';

/** Gaussian blur filter over a user-space region. Returns [defs, url]. */
export function blur(sd, x = -200, y = -200, w = 1200, h = 1000) {
  const fid = id('blur');
  return [`<filter id="${fid}" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feGaussianBlur stdDeviation="${sd}"/></filter>`, `url(#${fid})`];
}

/** Colour-matrix filter (5x4 values string). Returns [defs, url]. */
export function colorMatrix(values) {
  const fid = id('cm');
  return [`<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="${values}"/></filter>`, `url(#${fid})`];
}

/** Clip path from markup. Returns [defs, url]. */
export function clip(markup) {
  const cid = id('clip');
  return [`<clipPath id="${cid}">${markup}</clipPath>`, `url(#${cid})`];
}

/** Polyline path string from points. */
export function poly(pts, close = false) {
  return 'M' + pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L') + (close ? 'Z' : '');
}

/**
 * A ridge line across [x0, x1]: sum of a few random sines plus jitter.
 * Returns points [[x, y], ...] (y = base + offsets).
 */
export function ridgeLine(rand, { x0 = -10, x1 = 650, step = 8, base = 40, amp = 20, jag = 3, waves = 3, period = 640 } = {}) {
  const ph = Array.from({ length: waves }, () => [rand() * Math.PI * 2, 0.6 + rand() * 0.8]);
  const pts = [];
  for (let x = x0; x <= x1 + 0.01; x += step) {
    let y = 0;
    ph.forEach(([p, a], k) => {
      y += Math.sin((x / period) * Math.PI * 2 * (k + 1) + p) * a / (k + 1);
    });
    pts.push([x, base + y * amp + (rand() - 0.5) * jag * 2]);
  }
  return pts;
}

/** Closed smooth shape from a top line down to y = bottom. */
export function fillBelow(pts, bottom, tension = 0.4) {
  const top = smoothPath(pts, false, tension);
  const last = pts[pts.length - 1];
  return `${top} L${fmt(last[0])},${bottom} L${fmt(pts[0][0])},${bottom}Z`;
}

/** Water surface wave points across a width. */
export function wave(y, { amp = 1.5, len = 40, phase = 0, w = 640, step = 4, amp2 = 0, len2 = 17 } = {}) {
  const pts = [];
  for (let x = -10; x <= w + 10; x += step) {
    pts.push([x, y + Math.sin((x / len) * Math.PI * 2 + phase) * amp + Math.sin((x / len2) * Math.PI * 2 + phase * 1.7) * amp2]);
  }
  return pts;
}

/** A soft cartoon cloud: union of circles with a flat-ish base. */
export function cloudShape(x, y, s, rand) {
  const n = 4 + Math.floor(rand() * 3);
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const cx = x + (t - 0.5) * s * 2.2;
    const r = s * (0.45 + Math.sin(t * Math.PI) * 0.45 + rand() * 0.15);
    out += `<circle cx="${fmt(cx)}" cy="${fmt(y - r * 0.55)}" r="${fmt(r)}"/>`;
  }
  out += `<rect x="${fmt(x - s * 1.25)}" y="${fmt(y - s * 0.5)}" width="${fmt(s * 2.5)}" height="${fmt(s * 0.5)}" rx="${fmt(s * 0.25)}"/>`;
  return out;
}
