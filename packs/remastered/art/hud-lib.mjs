// Shared helpers for hud.mjs and treasure.mjs (banner text).
import { C, linear, text, measure } from './lib.mjs';

/** Big banner word: gold-to-white fill, chunky ink outline, offset shadow. */
export function banner(str, { cx, base, size, maxW, fillStops, wave = true, waveY }) {
  let defs = '';
  let out = '';
  const ls = 1;
  let s = size;
  while (measure(str, s) + ls * (str.length - 1) > maxW) s -= 0.5;
  const [fd, fu] = linear(fillStops);
  defs += fd;
  const o = { x: cx, y: base, size: s, anchor: 'middle', letterSpacing: ls };
  if (wave) {
    // Wavy underline in sea-glass foam.
    const tw = measure(str, s) + ls * (str.length - 1);
    let d = `M${cx - tw / 2 + 8},${waveY}`;
    const n = 12;
    const step = (tw - 16) / n;
    for (let i = 0; i < n; i++) d += ` q${step / 4},${i % 2 ? 2.2 : -2.2} ${step / 2},0 t${step / 2},0`;
    out += `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`;
    out += `<path d="${d}" fill="none" stroke="${C.foam}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  out += `<g transform="translate(2,2.5)">${text(str, { ...o, fill: C.ink, stroke: C.ink, strokeWidth: 6 })}</g>`;
  out += text(str, { ...o, fill: fu, stroke: C.ink, strokeWidth: 6 });
  return { defs, out, size: s };
}

export const GOLD_TEXT = [[0, '#fffbe6'], [0.38, '#ffe27a'], [0.62, C.uiGold], [1, '#f08a1c']];

