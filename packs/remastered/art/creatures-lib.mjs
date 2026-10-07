// Shared helpers for creatures.mjs and diver.mjs (not loaded as an image module).

import { C, svg, strip, attrs, fmt } from './lib.mjs';

/**
 * Animation strip where each frame returns { out, defs } (or a plain string); collects defs.
 */
export function frames(n, fw, fh, draw) {
  let defs = '';
  const body = strip(n, fw, fh, (i, t) => {
    const r = draw(i, t);
    if (typeof r === 'string') return r;
    defs += r.defs ?? '';
    return r.out;
  });
  return svg(n * fw, fh, body, defs);
}

/** Four-point sparkle star centred at (x,y), radius r. */
export function sparkle(x, y, r, fill = '#fff', opacity = 1) {
  const k = r * 0.28;
  const d = `M${fmt(x)},${fmt(y - r)} Q${fmt(x + k)},${fmt(y - k)} ${fmt(x + r)},${fmt(y)} Q${fmt(x + k)},${fmt(y + k)} ${fmt(x)},${fmt(y + r)} Q${fmt(x - k)},${fmt(y + k)} ${fmt(x - r)},${fmt(y)} Q${fmt(x - k)},${fmt(y - k)} ${fmt(x)},${fmt(y - r)}Z`;
  return `<path d="${d}" ${attrs({ fill, opacity })}/>`;
}

/** Five-point cartoon star with ink outline. */
export function star(x, y, r, fill = C.uiGold, rotDeg = 0, sw = 1.4) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = ((i * 36 - 90 + rotDeg) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.48 : r;
    d += `${i ? 'L' : 'M'}${fmt(x + Math.cos(a) * rr)},${fmt(y + Math.sin(a) * rr)}`;
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

/** Small shiny bubble: pale ring, faint fill, highlight. */
export function bubble(x, y, r, sw = Math.max(0.6, r * 0.28)) {
  return (
    `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${C.foam}" fill-opacity="0.22" stroke="${C.foam}" stroke-width="${fmt(sw)}"/>` +
    `<circle cx="${fmt(x - r * 0.35)}" cy="${fmt(y - r * 0.35)}" r="${fmt(Math.max(0.5, r * 0.28))}" fill="#fff"/>`
  );
}

/** Jagged lightning polyline from (x0,y0) to (x1,y1) with n segments; rnd from rng(). */
export function bolt(x0, y0, x1, y1, n, jitter, rnd) {
  let d = `M${fmt(x0)},${fmt(y0)}`;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const j = (rnd() * 2 - 1) * jitter;
    d += ` L${fmt(x0 + dx * k + nx * j)},${fmt(y0 + dy * k + ny * j)}`;
  }
  return d + ` L${fmt(x1)},${fmt(y1)}`;
}
