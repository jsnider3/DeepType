// Shared drawing helpers for the menu screens (screens.mjs) and widgets (widgets.mjs):
// undersea backdrop pieces, the yellow diver, a big title shark, the shark-fin emblem and
// chunky panel/button shapes. Every helper returns { out, defs } or a plain string as noted.

import { C, STROKE, linear, radial, shade, mix, smoothPath, rng, id, text, measure, FONTS, fmt } from './lib.mjs';

export const f2 = fmt;

/** Rounded-rect path. */
export function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${f2(x + r)},${f2(y)}H${f2(x + w - r)}A${r},${r} 0 0 1 ${f2(x + w)},${f2(y + r)}V${f2(y + h - r)}A${r},${r} 0 0 1 ${f2(x + w - r)},${f2(y + h)}H${f2(x + r)}A${r},${r} 0 0 1 ${f2(x)},${f2(y + h - r)}V${f2(y + r)}A${r},${r} 0 0 1 ${f2(x + r)},${f2(y)}Z`;
}

/** Rounded rect with only the top corners rounded. */
export function rrTop(x, y, w, h, r) {
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}

/** Soft blur filter def; returns [defs, url]. */
export function blur(sd, pad = 50) {
  const fid = id('blur');
  return [`<filter id="${fid}" x="-${pad}%" y="-${pad}%" width="${100 + 2 * pad}%" height="${100 + 2 * pad}%"><feGaussianBlur stdDeviation="${sd}"/></filter>`, `url(#${fid})`];
}

// ---------------------------------------------------------------- backdrop

/** Full-bleed sea gradient (lighter at the top). */
export function seaGradient(w, h, top = C.sea3, mid = C.sea2, bottom = C.sea0) {
  const [d, u] = linear([[0, top], [0.45, mid], [1, bottom]]);
  return { defs: d, out: `<rect width="${w}" height="${h}" fill="${u}"/>` };
}

/** God rays fanning down from the surface. */
export function rays(w, h, seed = 3, n = 6, alpha = 0.1) {
  const r = rng(seed);
  const [d, u] = linear([[0, '#ffffff', alpha * 1.6], [1, '#ffffff', 0]]);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = (w / n) * (i + 0.2 + r() * 0.6);
    const tw = 14 + r() * 26;
    const lean = 60 + r() * 90;
    const bw = tw * 2.6 + r() * 30;
    out += `<path d="M${f2(x)},0 L${f2(x + tw)},0 L${f2(x + tw + lean + bw)},${h} L${f2(x + lean)},${h}Z" fill="${u}"/>`;
  }
  return { defs: d, out };
}

/** Wavy caustic shimmer lines near the top. */
export function caustics(w, y0, y1, seed = 9, alpha = 0.18) {
  const r = rng(seed);
  let out = `<g fill="none" stroke="#ffffff" stroke-opacity="${alpha}" stroke-linecap="round">`;
  for (let i = 0; i < 18; i++) {
    const x = r() * w;
    const y = y0 + r() * (y1 - y0);
    const l = 14 + r() * 26;
    out += `<path d="M${f2(x)},${f2(y)} q${f2(l / 4)},-4 ${f2(l / 2)},0 t${f2(l / 2)},0" stroke-width="${f2(1 + r() * 1.5)}"/>`;
  }
  return out + '</g>';
}

/** Rising bubbles (outlined light circles). */
export function bubbles(pts, alpha = 0.8) {
  let out = '';
  for (const [x, y, r] of pts) {
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.foam}" fill-opacity="0.25" stroke="${C.foam}" stroke-opacity="${alpha}" stroke-width="${Math.max(1, r / 4)}"/>`;
    out += `<circle cx="${f2(x - r * 0.35)}" cy="${f2(y - r * 0.35)}" r="${f2(r * 0.28)}" fill="#fff" fill-opacity="${alpha}"/>`;
  }
  return out;
}

/** A column of bubbles drifting up from (x, y). */
export function bubbleTrail(x, y, n, seed = 1, spread = 10, step = 22) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([x + (r() - 0.5) * spread * 2, y - i * step - r() * 8, 2 + r() * 3 + i * 0.3]);
  return bubbles(pts);
}

/** Kelp strand rising from (x, y) to height h. */
export function kelp(x, y, h, seed = 1, col = C.kelp1, dark = C.kelp0, width = 9) {
  const r = rng(seed);
  const pts = [];
  const n = Math.max(3, Math.round(h / 28));
  for (let i = 0; i <= n; i++) pts.push([x + Math.sin(i * 1.3 + seed) * (6 + r() * 4), y - (h * i) / n]);
  const d = smoothPath(pts, false, 0.5);
  let out = `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${width + 3}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${dark}" stroke-width="${width}" stroke-linecap="round"/>`;
  out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${width * 0.45}" stroke-linecap="round" transform="translate(-1.5,0)"/>`;
  // leaves
  for (let i = 1; i < n; i++) {
    const [px, py] = pts[i];
    const s = i % 2 ? 1 : -1;
    const lf = `M${f2(px)},${f2(py)} q${s * 14},-6 ${s * 20},-20 q${-s * 12},4 ${-s * 20},20z`;
    out += `<path d="${lf}" fill="${col}" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }
  return out;
}

/** Sandy seabed with a soft wavy top from y (left) to y2 (right). */
export function seabed(w, h, y, y2 = y, seed = 5) {
  const r = rng(seed);
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) pts.push([(w * i) / n, y + ((y2 - y) * i) / n + (r() - 0.5) * 14]);
  const top = smoothPath(pts, false, 0.5);
  const d = `${top} L${w},${h} L0,${h}Z`;
  const [gd, gu] = linear([[0, C.sand1], [1, C.sand0]]);
  let out = `<path d="${d}" fill="${gu}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  // ripples
  for (let i = 0; i < 16; i++) {
    const x = r() * w;
    const yy = (y + y2) / 2 + 18 + r() * (h - Math.max(y, y2) - 10);
    out += `<path d="M${f2(x)},${f2(yy)} q8,-4 16,0" fill="none" stroke="${C.sand0}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
  }
  return { defs: gd, out };
}

/** A lumpy outlined rock. */
export function rock(cx, cy, rx, ry, seed = 2, col = C.rock1) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (Math.PI * i) / 8;
    pts.push([cx + Math.cos(a) * rx * (0.85 + r() * 0.25), cy + Math.sin(a) * ry * (0.8 + r() * 0.3)]);
  }
  pts.push([cx + rx * 0.9, cy + ry * 0.15], [cx - rx * 0.9, cy + ry * 0.15]);
  const d = smoothPath(pts, true, 0.45);
  return `<path d="${d}" fill="${col}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/><path d="M${f2(cx - rx * 0.5)},${f2(cy - ry * 0.55)} q${f2(rx * 0.35)},${f2(-ry * 0.3)} ${f2(rx * 0.7)},${f2(-ry * 0.05)}" fill="none" stroke="${shade(col, 0.35)}" stroke-width="3" stroke-linecap="round"/>`;
}

// ---------------------------------------------------------------- characters

/** Thick limb: ink outline stroke under a coloured stroke. */
function limb(d, w, col) {
  return `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${w + STROKE * 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/**
 * The yellow diver, facing right, about 150 x 210 units around (0,0) (helmet top ~ -102,
 * fins ~ +105). opts.wave lifts the front arm; opts.zapper gives him a glowing zapper.
 */
export function diver({ wave = false, zapper = false } = {}) {
  let defs = '';
  const [sd, su] = linear([[0, shade(C.diverYellow, 0.25)], [0.6, C.diverYellow], [1, C.diverYellowDark]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const [hd, hu] = radial([[0, shade(C.diverYellow, 0.45)], [0.55, C.diverYellow], [1, C.diverYellowDark]], { cx: 0.35, cy: 0.3, r: 0.75 });
  const [td, tu] = linear([[0, C.steel2], [0.5, C.steel1], [1, C.steel0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const [gd, gu] = radial([[0, '#bfe9ff'], [0.7, '#5aa9d6'], [1, '#2f6f9e']], { cx: 0.35, cy: 0.35, r: 0.8 });
  defs += sd + hd + td + gd;
  const fin = '#1f7a8c';
  let out = '';
  // air tank on the back
  out += `<path d="${rr(-46, -58, 26, 86, 12)}" fill="${tu}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  out += `<rect x="-38" y="-66" width="10" height="10" rx="2" fill="${C.steel1}" stroke="${C.ink}" stroke-width="1.5"/>`;
  // back leg + fin
  out += limb('M-4,30 Q-14,62 -10,88', 19, shade(C.diverYellow, -0.12));
  out += `<path d="M-22,84 Q-12,80 2,86 L22,104 Q4,108 -18,100Z" fill="${shade(fin, -0.25)}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
  // back arm
  out += limb(wave ? 'M-12,-26 Q-30,-6 -24,14' : 'M-12,-26 Q-28,-2 -16,18', 15, shade(C.diverYellow, -0.15));
  // torso
  out += `<path d="${smoothPath([[-24, -36], [0, -44], [26, -34], [30, 0], [24, 34], [0, 40], [-22, 32], [-28, 0]], true, 0.5)}" fill="${su}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  out += `<path d="M-14,-24 q10,-8 24,-4" fill="none" stroke="#fff6c9" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`;
  // belt
  out += `<path d="M-26,18 Q2,26 29,16 L28,27 Q2,36 -25,29Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  out += `<rect x="4" y="19" width="12" height="10" rx="2" fill="${C.brass}" stroke="${C.ink}" stroke-width="1.5"/>`;
  // front leg + fin
  out += limb('M12,30 Q22,60 18,90', 19, C.diverYellow);
  out += `<path d="M6,86 Q18,80 30,86 L54,100 Q30,110 6,100Z" fill="${fin}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
  out += `<path d="M20,90 l22,10" stroke="${shade(fin, 0.35)}" stroke-width="2" stroke-linecap="round"/>`;
  // hose from helmet to tank
  out += `<path d="M-20,-64 Q-48,-80 -34,-60" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/><path d="M-20,-64 Q-48,-80 -34,-60" fill="none" stroke="${C.steel0}" stroke-width="4" stroke-linecap="round"/>`;
  // helmet
  out += `<rect x="-20" y="-50" width="44" height="12" rx="4" fill="${C.brass}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  out += `<circle cx="2" cy="-74" r="32" fill="${hu}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  for (const [bx, by] of [[-24, -60], [-26, -84], [-12, -102], [2, -48]]) out += `<circle cx="${bx}" cy="${by}" r="2.6" fill="${C.diverYellowDark}" stroke="${C.ink}" stroke-width="1"/>`;
  // front porthole with a face
  out += `<circle cx="16" cy="-72" r="20" fill="${C.steel1}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  out += `<circle cx="16" cy="-72" r="15" fill="${gu}" stroke="${C.ink}" stroke-width="1.5"/>`;
  // face (kept inside the glass by geometry: clip paths off-canvas upset resvg in cut-outs)
  out += `<circle cx="17" cy="-70" r="10.5" fill="#f2c39b" stroke="${C.ink}" stroke-width="1.2"/>`;
  out += `<circle cx="14" cy="-72" r="1.9" fill="${C.ink}"/><circle cx="21" cy="-72" r="1.9" fill="${C.ink}"/>`;
  out += `<path d="M13.5,-66 q4,3.5 8,0" fill="none" stroke="${C.ink}" stroke-width="1.5" stroke-linecap="round"/>`;
  out += `<path d="M5,-78 a12,12 0 0 1 9,-7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    out += `<circle cx="${f2(16 + Math.cos(a) * 17.5)}" cy="${f2(-72 + Math.sin(a) * 17.5)}" r="1.4" fill="${C.steel2}"/>`;
  }
  out += `<path d="M-18,-92 a26,26 0 0 1 22,-12" fill="none" stroke="#fffbe0" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`;
  // front arm (+ zapper)
  if (wave) {
    out += limb('M14,-26 Q40,-40 44,-70', 15, C.diverYellow);
    out += `<circle cx="45" cy="-76" r="9" fill="${C.steel1}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  } else {
    out += limb('M14,-26 Q36,-14 52,-22', 15, C.diverYellow);
    if (zapper) {
      out += `<path d="${rr(46, -36, 40, 16, 6)}" fill="${C.steel1}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
      out += `<rect x="54" y="-24" width="8" height="12" rx="2" fill="${C.steel0}" stroke="${C.ink}" stroke-width="1.5"/>`;
      out += `<circle cx="88" cy="-28" r="7" fill="#9ff7ff" stroke="${C.ink}" stroke-width="1.5"/>`;
      const [bd, bu] = blur(4);
      defs += bd;
      out += `<circle cx="92" cy="-28" r="16" fill="#7ff3ff" opacity="0.55" filter="${bu}"/>`;
      out += `<path d="M96,-28 l10,-4 l-4,6 l12,-2" fill="none" stroke="#e9ffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    out += `<circle cx="52" cy="-22" r="8.5" fill="${C.steel1}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  }
  return { out, defs };
}

/**
 * A big grey shark facing left with its jaws open, about 400 x 190 units; nose tip at (0,0),
 * body centre line y = 0, tail at x ~ 390.
 */
export function bigShark({ base = C.sharkGrey, back = C.sharkGreyDark, belly = C.sharkBelly, mouth = true, clip = true } = {}) {
  let defs = '';
  const W = 3;
  const st = (fill) => `fill="${fill}" stroke="${C.ink}" stroke-width="${W}" stroke-linejoin="round"`;
  const top = [[0, 2], [40, -36], [120, -56], [210, -52], [290, -32], [340, -12], [362, -4]];
  const bot = [[362, 8], [330, 18], [260, 38], [170, 48], [100, 44], [50, 30], [14, 22]];
  const body = smoothPath([...top, ...bot], true, 0.55);
  const bellyD = smoothPath([[30, 14], [110, 8], [220, 10], [320, 8], [330, 18], [260, 38], [170, 48], [100, 44], [50, 30]], true, 0.5);
  const tail = smoothPath([[356, -4], [380, -50], [412, -82], [400, -30], [392, 2], [410, 52], [380, 36], [358, 10]], true, 0.25);
  const dorsal = smoothPath([[140, -54], [178, -108], [200, -110], [194, -92], [222, -52]], true, 0.25);
  const pect = smoothPath([[130, 36], [104, 80], [124, 82], [170, 42]], true, 0.2);
  const [gd, gu] = linear([[0, shade(base, 0.12)], [0.55, base], [1, back]], { x1: 0, y1: 1, x2: 0, y2: 0 });
  defs += gd;
  let out = `<path d="${tail}" ${st(back)}/><path d="${dorsal}" ${st(back)}/>`;
  out += `<path d="${smoothPath([[300, -30], [318, -50], [330, -24]], true, 0.2)}" ${st(back)}/>`;
  out += `<path d="${body}" ${st(gu)}/>`;
  // (clip = false avoids clip paths, which crash resvg when wholly off-canvas in cut-outs)
  const cid = id('sb');
  if (clip) defs += `<clipPath id="${cid}"><path d="${body}"/></clipPath>`;
  out += `<g ${clip ? `clip-path="url(#${cid})"` : ''}><path d="${bellyD}" fill="${belly}"/>`;
  // dorsal highlight
  out += `<path d="M60,-30 Q150,-50 260,-38" fill="none" stroke="${shade(base, 0.35)}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
  out += `</g><path d="${body}" fill="none" stroke="${C.ink}" stroke-width="${W}"/>`;
  // gills
  for (let i = 0; i < 4; i++) out += `<path d="M${96 + i * 11},-14 q5,14 0,28" fill="none" stroke="${shade(back, -0.3)}" stroke-width="2.6" stroke-linecap="round"/>`;
  if (mouth) {
    // open jaws: dark mouth wedge, upper and lower teeth
    out += `<path d="M6,8 Q40,0 86,14 Q62,52 30,50 Q14,40 6,8Z" fill="#6e1626" stroke="${C.ink}" stroke-width="${W}" stroke-linejoin="round"/>`;
    out += `<path d="M30,38 Q50,34 70,30 Q56,48 34,48Z" fill="#c24a5a"/>`;
    let up = 'M10,8';
    for (let i = 0; i < 7; i++) up += ` l${f2(5.5)},${f2(9 - i * 0.6)} l${f2(5.5)},${f2(-(9 - i * 0.6) + 1.6)}`;
    out += `<path d="${up}" fill="#fff" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
    let lo = 'M24,47';
    for (let i = 0; i < 5; i++) lo += ` l${f2(5.5)},-9 l${f2(5.5)},${f2(9 - 3)}`;
    out += `<path d="${lo}" fill="#fff" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }
  out += `<path d="${pect}" ${st(back)}/>`;
  // eye and angry brow
  out += `<circle cx="62" cy="-14" r="10" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/><circle cx="58" cy="-12" r="5.2" fill="${C.ink}"/><circle cx="56.5" cy="-14" r="1.8" fill="#fff"/>`;
  out += `<path d="M44,-30 L80,-18" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`;
  return { out, defs };
}

// ---------------------------------------------------------------- emblems & panels

/** Shark fin cutting a wave inside a circle of radius r at (cx, cy). */
export function finBadge(cx, cy, r, { ring = C.uiGold, ringDark = C.uiGoldDark, sea = C.sea2, fin = C.sharkGrey, w = STROKE } = {}) {
  const [gd, gu] = linear([[0, shade(ring, 0.35)], [0.5, ring], [1, ringDark]]);
  const [sd, su] = linear([[0, C.sea3], [1, sea === C.sea2 ? C.sea0 : shade(sea, -0.4)]]);
  let defs = gd + sd;
  const k = r / 50;
  let out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${gu}" stroke="${C.ink}" stroke-width="${w}"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${f2(r * 0.78)}" fill="${su}" stroke="${C.ink}" stroke-width="${w}"/>`;
  const cid = id('fb');
  defs += `<clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${f2(r * 0.78 - w / 2)}"/></clipPath>`;
  const P = (x, y) => `${f2(cx + x * k)},${f2(cy + y * k)}`;
  out += `<g clip-path="url(#${cid})">`;
  out += `<path d="M${P(-26, 16)} Q${P(-6, 2)} ${P(-2, -30)} Q${P(12, -12)} ${P(24, 16)}Z" fill="${fin}" stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round"/>`;
  out += `<path d="M${P(-4, -20)} Q${P(-8, 0)} ${P(-18, 12)}" fill="none" stroke="${shade(fin, 0.45)}" stroke-width="${f2(Math.max(1, 3 * k))}" stroke-linecap="round"/>`;
  out += `<path d="M${P(-50, 16)} Q${P(-38, 8)} ${P(-26, 16)} T${P(0, 16)} T${P(26, 16)} T${P(52, 16)} V${P(52, 60)} H${P(-50, 60)}Z" fill="${C.sea1}" stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round"/>`;
  out += `<path d="M${P(-44, 18)} Q${P(-38, 13)} ${P(-30, 17)} M${P(-18, 18)} Q${P(-12, 13)} ${P(-4, 17)} M${P(8, 18)} Q${P(14, 13)} ${P(22, 17)}" fill="none" stroke="${C.foam}" stroke-width="${f2(Math.max(1, 2.4 * k))}" stroke-linecap="round"/>`;
  out += `</g>`;
  out += `<path d="M${P(-30, -30)} A${f2(r * 0.62)},${f2(r * 0.62)} 0 0 1 ${P(10, -42)}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="${f2(Math.max(1, 3 * k))}" stroke-linecap="round"/>`;
  return { out, defs };
}

/**
 * Chunky glossy panel (button body): rounded rect with ink outline, vertical gradient,
 * top gloss and a bottom lip.
 */
export function glossPanel(x, y, w, h, r, col, { lip = 4, stroke = STROKE, gloss = 0.35 } = {}) {
  const [gd, gu] = linear([[0, shade(col, 0.28)], [0.5, col], [1, shade(col, -0.18)]]);
  let out = '';
  if (lip) out += `<path d="${rr(x, y + lip, w, h, r)}" fill="${shade(col, -0.45)}" stroke="${C.ink}" stroke-width="${stroke}"/>`;
  out += `<path d="${rr(x, y, w, h, r)}" fill="${gu}" stroke="${C.ink}" stroke-width="${stroke}"/>`;
  if (gloss) out += `<path d="${rr(x + r * 0.6, y + 3, w - r * 1.2, Math.min(h * 0.38, 18), Math.min(r, h * 0.19))}" fill="#ffffff" opacity="${gloss}"/>`;
  return { out, defs: gd };
}

/** Text with a chunky ink outline and a drop shadow, as used for menu titles. */
export function bannerText(str, { x, y, size, fill = '#fff', anchor = 'start', file = FONTS.display, outline = C.ink, ow = 4, shadow = 2.5, letterSpacing = 0 }) {
  let out = '';
  if (shadow) out += text(str, { x: x + shadow * 0.4, y: y + shadow, size, file, anchor, fill: outline, stroke: outline, strokeWidth: ow, letterSpacing });
  out += text(str, { x, y, size, file, anchor, fill, stroke: outline, strokeWidth: ow, letterSpacing });
  return out;
}

/** Font size so str fits maxW (capped at size). */
export function fit(str, size, maxW, file = FONTS.display) {
  const w = measure(str, size, file);
  return w > maxW ? (size * maxW) / w : size;
}

export { mix };
