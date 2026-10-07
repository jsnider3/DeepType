// Playfield backgrounds: the open-water backdrop (tiles vertically), the three parallax rock
// ridges that rise as the sea floor approaches, the sea floor with the shipwreck (treasure
// dive), the plain sand and coral shelf of the secret clam levels, and the six surface strips
// with our dive boat seen at the start of a dive.
//
// Layout notes (see src/game/board.ts layoutBackground):
// - water1 690x480 stacks with itself vertically; only x 0..640 is seen.
// - mountains 640x200 come to rest at y -71 (3), 15 (2), 101 (1); oceanfloor at 151. While they
//   slide past each other, each ridge's lower part (local y >= ~50) is always covered by a
//   nearer layer or must itself be solid, so ridgelines stay in local y 0..48.
// - topbackground*: waterline ~y 95; the diver's hose (9 px wide at x 40..49) hangs from the
//   boat's A-frame pulley and runs off the bottom edge.

import { C, svg, linear, radial, shade, mix, smoothPath, rng, fmt, rot, id } from './lib.mjs';
import { blur, colorMatrix, clip, poly, ridgeLine, fillBelow, wave, cloudShape } from './scenery-lib.mjs';

const W = 640;

/** Main colour of the open water (water1); surface strips fade into it at their bottom edge. */
const WATER = '#174d86';

/** Draw markup three times (y - h, y, y + h) so it wraps seamlessly when tiled vertically. */
const wrapV = (h, f) => [-h, 0, h].map((dy) => f(dy)).join('');

// ================================================================ open water

function water1() {
  const Wd = 690;
  const H = 480;
  const r = rng(1101);
  let defs = '';
  let body = `<rect width="${Wd}" height="${H}" fill="${WATER}"/>`;
  // Gentle horizontal tone: a lighter band left of centre, darker to the right.
  const [hd, hu] = linear([[0, '#1a5590'], [0.35, '#1b5893'], [0.75, '#154780'], [1, '#123f74']], { x1: 0, y1: 0, x2: 1, y2: 0 });
  defs += hd;
  body += `<rect width="${Wd}" height="${H}" fill="${hu}"/>`;

  // Soft blotches of lighter and darker water.
  const [bd, bu] = blur(26, -200, -700, Wd + 400, H + 1400);
  defs += bd;
  let blot = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * Wd;
    const y = r() * H;
    const rx = 40 + r() * 90;
    const ry = 30 + r() * 60;
    const light = r() < 0.5;
    const col = light ? '#2c6fae' : '#0e3768';
    const op = 0.25 + r() * 0.25;
    blot += wrapV(H, (dy) => `<ellipse cx="${fmt(x)}" cy="${fmt(y + dy)}" rx="${fmt(rx)}" ry="${fmt(ry)}" fill="${col}" fill-opacity="${fmt(op)}"/>`);
  }
  body += `<g filter="${bu}">${blot}</g>`;

  // Light shafts slanting down from upper right; each fades in and out along its length.
  const [sd, su] = blur(7, -200, -700, Wd + 400, H + 1400);
  defs += sd;
  let shafts = '';
  for (let i = 0; i < 8; i++) {
    const x = 40 + r() * (Wd - 20);
    const y = r() * H;
    const len = 240 + r() * 200;
    const w = 12 + r() * 34;
    const sl = len * 0.22;
    const op = 0.05 + r() * 0.07;
    const [gd, gu] = linear([[0, '#bfe9ff', 0], [0.45, '#bfe9ff', op], [1, '#bfe9ff', 0]]);
    defs += gd;
    shafts += wrapV(H, (dy) => `<path d="${poly([[x, y + dy], [x + w, y + dy], [x + w * 1.5 - sl, y + len + dy], [x - w * 0.4 - sl, y + len + dy]], true)}" fill="${gu}"/>`);
  }
  body += `<g filter="${su}">${shafts}</g>`;

  // Faint caustic net in patches (cells on a 12-row grid so it tiles every 480 px).
  const [cd, cu] = blur(1.2, -200, -700, Wd + 400, H + 1400);
  defs += cd;
  let net = '';
  const rows = 12;
  const cols = 13;
  const patch = (x, y) => Math.sin((x / Wd) * Math.PI * 4 + 1.3) * Math.sin((y / H) * Math.PI * 4 + 0.4) + Math.sin((x / Wd) * Math.PI * 2 + (y / H) * Math.PI * 2) * 0.6;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5 + (j % 2) * 0.5) * (Wd / cols) + (r() - 0.5) * 16;
      const cy = (j + 0.5) * (H / rows) + (r() - 0.5) * 12;
      const pts = [];
      const n = 5 + Math.floor(r() * 3);
      const base = 14 + r() * 10;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.5;
        const rr = base * (0.75 + r() * 0.5);
        pts.push([cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr * 0.9]);
      }
      const p = patch(cx, cy);
      if (p < 0.2) continue;
      const op = Math.min(0.07, 0.015 + p * 0.03);
      const d = smoothPath(pts, true, 0.7);
      const sw = fmt(0.7 + r() * 1.1);
      net += wrapV(H, (dy) => `<path d="${d}" transform="translate(0 ${dy})" fill="none" stroke="#a8e0ff" stroke-width="${sw}" stroke-opacity="${fmt(op)}"/>`);
    }
  }
  body += `<g filter="${cu}">${net}</g>`;

  // Marine snow and tiny bubbles.
  let parts = '';
  for (let i = 0; i < 170; i++) {
    const x = r() * Wd;
    const y = r() * H;
    const rr = 0.5 + r() * r() * 1.8;
    const op = 0.18 + r() * 0.4;
    parts += wrapV(H, (dy) => `<circle cx="${fmt(x)}" cy="${fmt(y + dy)}" r="${fmt(rr)}" fill="#cdeeff" fill-opacity="${fmt(op)}"/>`);
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * Wd;
    const y = r() * H;
    const rr = 1.5 + r() * 2.2;
    parts += wrapV(H, (dy) => `<circle cx="${fmt(x)}" cy="${fmt(y + dy)}" r="${fmt(rr)}" fill="none" stroke="#cdeeff" stroke-width="0.8" stroke-opacity="0.35"/><circle cx="${fmt(x - rr * 0.35)}" cy="${fmt(y + dy - rr * 0.35)}" r="${fmt(rr * 0.25)}" fill="#ffffff" fill-opacity="0.4"/>`);
  }
  body += parts;
  return svg(Wd, H, body, defs);
}

// ================================================================ rock ridges

/** Rescale a ridge's y values into [lo, hi]. */
function fitRidge(pts, lo, hi) {
  const ys = pts.map((p) => p[1]);
  const a = Math.min(...ys);
  const b = Math.max(...ys);
  return pts.map(([x, y]) => [x, lo + ((y - a) / (b - a || 1)) * (hi - lo)]);
}

/** Kelp stalk from (x, y) upward with alternating leaves; sway bends it sideways. */
function kelp(x, y, h, rand, { col = C.kelp0, leaf = C.kelp1, sway = 6, width = 2.2, op = 1 } = {}) {
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x + Math.sin(t * 2.6 + rand() * 0.6) * sway * t, y - h * t]);
  }
  let out = `<g opacity="${op}"><path d="${smoothPath(pts, false, 0.5)}" fill="none" stroke="${col}" stroke-width="${width}" stroke-linecap="round"/>`;
  for (let i = 1; i < n; i++) {
    const [px, py] = pts[i];
    const side = i % 2 ? 1 : -1;
    const L = 7 + rand() * 5;
    const tip = [px + side * L, py - 3 - rand() * 4];
    out += `<path d="M${fmt(px)},${fmt(py)} Q${fmt(px + side * L * 0.5)},${fmt(py + 3)} ${fmt(tip[0])},${fmt(tip[1])} Q${fmt(px + side * L * 0.4)},${fmt(py - 4)} ${fmt(px)},${fmt(py)}Z" fill="${leaf}"/>`;
  }
  return out + '</g>';
}

/** Rounded boulder. */
function boulder(x, y, rx, ry, fill, rand, outline) {
  const pts = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    pts.push([x + Math.cos(a) * rx * (0.85 + rand() * 0.2), y + Math.sin(a) * ry * (0.85 + rand() * 0.25)]);
  }
  pts.push([x + rx * 0.9, y + ry * 0.4], [x - rx * 0.9, y + ry * 0.4]);
  const d = smoothPath(pts, true, 0.35);
  const hl = `<path d="M${fmt(x - rx * 0.55)},${fmt(y - ry * 0.45)} Q${fmt(x - rx * 0.1)},${fmt(y - ry * 0.95)} ${fmt(x + rx * 0.4)},${fmt(y - ry * 0.7)}" fill="none" stroke="${shade(fill, 0.25)}" stroke-width="${fmt(Math.max(1, ry * 0.18))}" stroke-linecap="round"/>`;
  return `<path d="${d}" fill="${fill}" ${outline ? `stroke="${outline}" stroke-width="1.2" stroke-linejoin="round"` : ''}/>${hl}`;
}

/** Sea fan coral silhouette. */
function fan(x, y, s, col, rand) {
  let out = '';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.28;
    const L = s * (0.7 + rand() * 0.35);
    const ex = x + Math.cos(a) * L;
    const ey = y + Math.sin(a) * L;
    out += `<path d="M${fmt(x)},${fmt(y)} Q${fmt(x + Math.cos(a) * L * 0.4 + (rand() - 0.5) * 4)},${fmt(y + Math.sin(a) * L * 0.5)} ${fmt(ex)},${fmt(ey)}" fill="none" stroke="${col}" stroke-width="${fmt(s * 0.09)}" stroke-linecap="round"/>`;
  }
  return out;
}

const RIDGES = {
  // back: hazy, blue, little detail
  3: { seed: 303, lo: 4, hi: 40, top: '#2f64a0', bottom: '#1f4b80', rim: '#6aa3d8', facet: '#173d6e', haze: 0.0 },
  2: { seed: 202, lo: 6, hi: 44, top: '#21497c', bottom: '#183a66', rim: '#4f86bf', facet: '#112c52', haze: 0.0 },
  // front: darkest, most detail
  1: { seed: 101, lo: 10, hi: 46, top: '#183659', bottom: '#11284a', rim: '#3d6c9f', facet: '#0b1d36', haze: 0.0 },
};

function mountain(layer) {
  const cfg = RIDGES[layer];
  const H = 200;
  const r = rng(cfg.seed);
  let defs = '';
  let body = '';
  // Ridged noise: sharp peaks, rounded valleys.
  const oct = [[230, 1], [110, 0.5], [52, 0.25], [24, 0.1]].map(([l, a]) => [l * (0.85 + r() * 0.3), a, r() * Math.PI]);
  let pts = [];
  for (let x = -16; x <= 656; x += layer === 1 ? 6 : 8) {
    let h = 0;
    for (const [l, a, p] of oct) h += a * Math.pow(1 - Math.abs(Math.sin((x / l) * Math.PI + p)), 1.6);
    pts.push([x, -h + (r() - 0.5) * (layer === 3 ? 0.02 : 0.05)]);
  }
  pts = fitRidge(pts, cfg.lo, cfg.hi);
  const shape = fillBelow(pts, H + 2, 0.35);
  const [gd, gu] = linear([[0, cfg.top], [0.45, mix(cfg.top, cfg.bottom, 0.6)], [1, cfg.bottom]]);
  defs += gd;
  const [kd, ku] = clip(`<path d="${shape}"/>`);
  defs += kd;

  // Kelp behind the crest (layer 1 and a few hazy ones on 2).
  if (layer !== 3) {
    const kr = rng(cfg.seed + 7);
    const n = layer === 1 ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const k = Math.floor(kr() * (pts.length - 2)) + 1;
      const [x, y] = pts[k];
      const h = layer === 1 ? 26 + kr() * 26 : 20 + kr() * 18;
      body += kelp(x, y + 6, Math.min(h, y + 4), kr, layer === 1 ? { col: '#174f3a', leaf: '#1f6b4a', sway: 5 } : { col: '#1d4f62', leaf: '#245e73', sway: 4, op: 0.85 });
    }
  }

  body += `<path d="${shape}" fill="${gu}"/>`;
  let inner = '';
  // Cel facets: a shadow on the right flank of every peak (light from the upper left).
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    if (!(py <= pts[i - 1][1] && py <= pts[i + 1][1])) continue;
    let j = i + 1;
    while (j < pts.length - 1 && pts[j + 1][1] >= pts[j][1]) j++;
    const seg = pts.slice(i, j + 1);
    const [vx, vy] = pts[j];
    const poly2 = [...seg, [vx + (H - vy) * 0.15, H + 2], [px + (H - py) * 0.35, H + 2]];
    inner += `<path d="${poly(poly2, true)}" fill="${cfg.facet}" opacity="0.38"/>`;
  }
  // Strata and cracks.
  const sr = rng(cfg.seed + 3);
  for (let i = 0; i < (layer === 3 ? 4 : 7); i++) {
    const y = cfg.hi + 14 + sr() * (H - cfg.hi - 20);
    const x = sr() * 600;
    const L = 40 + sr() * 120;
    const d = smoothPath([[x, y], [x + L * 0.33, y - 3 + sr() * 6], [x + L * 0.66, y - 3 + sr() * 6], [x + L, y + sr() * 4]], false, 0.5);
    inner += `<path d="${d}" fill="none" stroke="${cfg.facet}" stroke-width="${layer === 1 ? 2 : 1.5}" stroke-linecap="round" opacity="0.5"/>`;
    inner += `<path d="${d}" transform="translate(0 2)" fill="none" stroke="${cfg.rim}" stroke-width="1" stroke-linecap="round" opacity="0.18"/>`;
  }
  // Pebbles/pits for texture on the nearer layers.
  if (layer !== 3) {
    for (let i = 0; i < (layer === 1 ? 40 : 22); i++) {
      const x = sr() * 640;
      const y = cfg.hi + 8 + sr() * (H - cfg.hi);
      inner += `<ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="${fmt(1.5 + sr() * 3)}" ry="${fmt(1 + sr() * 1.6)}" fill="${cfg.facet}" opacity="0.4"/>`;
    }
  }
  // Rim light along the crest, and a soft shade toward the bottom.
  inner += `<path d="${smoothPath(pts, false, 0.35)}" transform="translate(0 1.5)" fill="none" stroke="${cfg.rim}" stroke-width="${layer === 3 ? 3 : 2.4}" stroke-linecap="round" opacity="0.75"/>`;
  const [ld, lu] = linear([[0, '#000', 0], [1, '#000', layer === 3 ? 0.12 : 0.25]]);
  defs += ld;
  inner += `<rect y="${cfg.hi}" width="640" height="${H - cfg.hi + 2}" fill="${lu}"/>`;
  body += `<g clip-path="${ku}">${inner}</g>`;

  // Crest dressing: boulders, sponges and fans.
  const dr = rng(cfg.seed + 11);
  if (layer === 2) {
    for (let i = 0; i < 6; i++) {
      const k = Math.floor(dr() * (pts.length - 2)) + 1;
      const [x, y] = pts[k];
      body += boulder(x, y + 5, 7 + dr() * 7, 5 + dr() * 4, '#284f80', dr);
    }
  }
  if (layer === 1) {
    for (let i = 0; i < 6; i++) {
      const k = Math.floor(dr() * (pts.length - 2)) + 1;
      const [x, y] = pts[k];
      body += fan(x, y + 4, 14 + dr() * 10, ['#7a3f6b', '#8a4a5a', '#5d4a8a'][i % 3], dr);
    }
    for (let i = 0; i < 9; i++) {
      const k = Math.floor(dr() * (pts.length - 2)) + 1;
      const [x, y] = pts[k];
      body += boulder(x, y + 6, 8 + dr() * 9, 6 + dr() * 5, '#1f3f66', dr, C.ink);
    }
    // Small sponges/tubes.
    for (let i = 0; i < 5; i++) {
      const k = Math.floor(dr() * (pts.length - 2)) + 1;
      const [x, y] = pts[k];
      for (let t = 0; t < 3; t++) {
        const h = 6 + dr() * 7;
        const tx = x + t * 4 - 4;
        body += `<rect x="${fmt(tx)}" y="${fmt(y + 4 - h)}" width="3.4" height="${fmt(h + 4)}" rx="1.6" fill="#8a5a6a" stroke="${C.ink}" stroke-width="0.8"/><ellipse cx="${fmt(tx + 1.7)}" cy="${fmt(y + 4 - h)}" rx="1.4" ry="0.8" fill="#3a1f2a"/>`;
      }
    }
  }
  return svg(640, H, body, defs);
}

// ================================================================ sea floor helpers

/** Underwater sand tint (sand pulled toward the sea colour). */
const SANDS = [mix(C.sand1, C.sea1, 0.5), mix(C.sand1, C.sea2, 0.32), mix(C.sand1, C.sea2, 0.2)];

function sandBed(r, { Wd = 690, H = 300, lo = 38, hi = 58 } = {}) {
  let defs = '';
  let body = '';
  let pts = ridgeLine(r, { x0: -12, x1: Wd + 12, step: 12, base: 0, amp: 1, jag: 0.05, waves: 3, period: 760 });
  pts = fitRidge(pts, lo, hi);
  const shape = fillBelow(pts, H + 2, 0.4);
  const [gd, gu] = linear([[0, SANDS[0]], [0.35, SANDS[1]], [1, SANDS[2]]]);
  defs += gd;
  body += `<path d="${shape}" fill="${gu}"/>`;
  const [kd, ku] = clip(`<path d="${shape}"/>`);
  defs += kd;
  let inner = `<path d="${smoothPath(pts, false, 0.4)}" transform="translate(0 1.5)" fill="none" stroke="${shade(SANDS[0], 0.25)}" stroke-width="2.5" opacity="0.7"/>`;
  // Dune bands and ripples.
  for (let i = 0; i < 5; i++) {
    const y = hi + 20 + i * 45 + r() * 15;
    const band = ridgeLine(r, { x0: -12, x1: Wd + 12, step: 20, base: y, amp: 6, jag: 1, waves: 2, period: 500 });
    inner += `<path d="${fillBelow(band, H + 2, 0.4)}" fill="${shade(SANDS[1], -0.06)}" opacity="0.28"/>`;
    inner += `<path d="${smoothPath(band, false, 0.4)}" fill="none" stroke="${shade(SANDS[1], 0.22)}" stroke-width="1.6" opacity="0.4"/>`;
  }
  for (let i = 0; i < 46; i++) {
    const x = r() * Wd;
    const y = hi + 12 + r() * (H - hi - 10);
    const L = 8 + r() * 16;
    inner += `<path d="M${fmt(x)},${fmt(y)} q${fmt(L / 2)},-3 ${fmt(L)},0" fill="none" stroke="${shade(SANDS[1], 0.18)}" stroke-width="1" stroke-linecap="round" opacity="0.45"/>`;
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * Wd;
    const y = hi + 8 + r() * (H - hi);
    inner += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(0.6 + r() * 1.1)}" fill="${shade(SANDS[2], -0.25)}" opacity="0.45"/>`;
  }
  body += `<g clip-path="${ku}">${inner}</g>`;
  return { body, defs, pts };
}

function ridgeY(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) {
    const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
    return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
  }
  return pts[pts.length - 1][1];
}

function shell(x, y, s, col, angle = 0) {
  let out = `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(angle)}) scale(${fmt(s)})">`;
  out += `<path d="M-5,1 Q-6,-5 0,-6 Q6,-5 5,1 Z" fill="${col}" stroke="${C.ink}" stroke-width="0.9" stroke-linejoin="round"/>`;
  out += `<path d="M0,1 L0,-5 M-2.5,1 L-3.2,-4 M2.5,1 L3.2,-4" stroke="${shade(col, -0.3)}" stroke-width="0.7"/>`;
  out += `<rect x="-2" y="0.5" width="4" height="2" rx="0.8" fill="${shade(col, -0.15)}" stroke="${C.ink}" stroke-width="0.8"/>`;
  return out + '</g>';
}

function starfish(x, y, s, col, angle = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? s * 0.42 : s;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6]);
  }
  return `<g transform="rotate(${angle} ${x} ${y})"><path d="${smoothPath(pts, true, 0.15)}" fill="${col}" stroke="${C.ink}" stroke-width="1" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="${fmt(s * 0.15)}" fill="${shade(col, 0.35)}"/></g>`;
}

function seaweedClump(x, y, n, rand, opts = {}) {
  let out = '';
  for (let i = 0; i < n; i++) out += kelp(x + (i - n / 2) * 5 + rand() * 3, y + rand() * 3, (opts.h ?? 34) * (0.6 + rand() * 0.6), rand, { width: 2.6, ...opts });
  return out;
}

// ================================================================ sea floor with shipwreck

function wreck() {
  // Hull in ship space: stern at x 0, bow at x 520, deck line ~y 0, keel ~y 175.
  let defs = '';
  let out = '';
  const wood = '#4a3a33';
  const woodDark = '#2f2522';
  const woodLight = '#6e5646';
  const hull = smoothPath([
    [-6, -66], [70, -62], [92, -8], [300, 6], [450, -2], [508, -34], [528, -40], [520, 30], [470, 140], [300, 186], [80, 180], [4, 120],
  ], true, 0.18);
  const [hd, hu] = clip(`<path d="${hull}"/>`);
  defs += hd;
  const [gd, gu] = linear([[0, woodLight], [0.25, wood], [1, woodDark]]);
  defs += gd;
  out += `<path d="${hull}" fill="${gu}"/>`;
  let inner = '';
  // Planks.
  for (let i = 0; i < 12; i++) {
    const y = -40 + i * 18;
    inner += `<path d="M-20,${y} Q260,${y + 22} 560,${y - 18}" fill="none" stroke="${woodDark}" stroke-width="1.6" opacity="0.6"/>`;
    inner += `<path d="M-20,${y + 2} Q260,${y + 24} 560,${y - 16}" fill="none" stroke="${woodLight}" stroke-width="0.8" opacity="0.25"/>`;
  }
  // Rail strake and gun ports along the top.
  inner += `<path d="M90,8 Q300,24 520,-6" fill="none" stroke="${woodDark}" stroke-width="6"/>`;
  inner += `<path d="M90,5 Q300,21 520,-9" fill="none" stroke="${woodLight}" stroke-width="1.5" opacity="0.6"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 120 + i * 58;
    const y = 30 + Math.sin((x / 520) * Math.PI) * 10;
    inner += `<rect x="${x}" y="${fmt(y)}" width="18" height="14" rx="2" fill="#1a1316" opacity="0.7"/>`;
  }
  // Stern castle windows.
  for (let i = 0; i < 3; i++) inner += `<rect x="${14 + i * 20}" y="-50" width="12" height="16" rx="5" fill="#141018" stroke="${woodLight}" stroke-width="1.2"/>`;
  inner += `<path d="M2,-28 L80,-24" stroke="${woodDark}" stroke-width="4"/>`;
  // Barnacles and weed on the hull.
  const br = rng(77);
  for (let i = 0; i < 40; i++) {
    const x = br() * 520;
    const y = 40 + br() * 140;
    inner += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(1 + br() * 2)}" fill="#7d8a86" opacity="0.35"/>`;
  }
  // Broken hole near the bow with glinting treasure inside.
  const hole = smoothPath([[380, 46], [404, 36], [430, 52], [448, 44], [452, 80], [440, 112], [414, 118], [392, 106], [376, 84]], true, 0.1);
  inner += `<path d="${hole}" fill="#0d0a0d" stroke="${woodDark}" stroke-width="3" stroke-linejoin="round"/>`;
  inner += `<path d="M386,108 Q412,88 444,104 L440,118 L392,118Z" fill="${C.uiGold}" opacity="0.85"/>`;
  for (const [cx, cy] of [[400, 104], [414, 98], [428, 101], [420, 108], [434, 109]]) inner += `<circle cx="${cx}" cy="${cy}" r="3" fill="#ffe27a" stroke="${C.uiGoldDark}" stroke-width="0.8"/>`;
  inner += `<path d="M408,92 l2,-6 l2,6 l6,2 l-6,2 l-2,6 l-2,-6 l-6,-2z" fill="#fffbe0"/>`;
  // Splintered plank ends around the hole.
  inner += `<path d="M380,46 l-12,-6 l8,10 M448,44 l10,-10 l-4,14 M452,80 l14,2 l-12,6" fill="none" stroke="${woodLight}" stroke-width="2.4" stroke-linecap="round"/>`;
  out += `<g clip-path="${hu}">${inner}</g>`;
  out += `<path d="${hull}" fill="none" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  // Deck rail posts along the stern castle.
  for (let i = 0; i < 6; i++) out += `<rect x="${2 + i * 13}" y="-76" width="3" height="11" fill="${woodDark}" stroke="${C.ink}" stroke-width="0.8"/>`;
  out += `<path d="M0,-76 L76,-73" stroke="${woodDark}" stroke-width="3" stroke-linecap="round"/>`;
  return { out, defs };
}

function oceanfloor() {
  const Wd = 690;
  const H = 300;
  const r = rng(4001);
  let defs = '';
  let body = '';
  const bed = sandBed(r, { Wd, H, lo: 40, hi: 56 });
  defs += bed.defs;

  // Distant rocks peeking over the sand line, behind the wreck.
  const dr = rng(4002);
  for (let i = 0; i < 7; i++) {
    const x = dr() * Wd;
    body += boulder(x, ridgeY(bed.pts, x) + 8, 14 + dr() * 16, 10 + dr() * 10, mix(C.rock1, C.sea1, 0.55), dr);
  }
  body += bed.body;

  // Masts: the long main mast leans back over the stern (drawn behind the hull).
  const mx0 = 400;
  const my0 = 96;
  const mast = (x0, y0, x1, y1, w) => `<path d="M${x0},${y0} L${x1},${y1}" stroke="${C.ink}" stroke-width="${w + 3}" stroke-linecap="round"/><path d="M${x0},${y0} L${x1},${y1}" stroke="#5a463a" stroke-width="${w}" stroke-linecap="round"/><path d="M${x0 - 1.5},${y0} L${x1 - 1.5},${y1}" stroke="#7d6450" stroke-width="${w * 0.3}" stroke-linecap="round"/>`;
  body += mast(mx0, my0, 300, 4, 7);
  // Yard with a torn, faded sail.
  body += `<path d="M268,30 L360,14" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/><path d="M268,30 L360,14" stroke="#5a463a" stroke-width="4" stroke-linecap="round"/>`;
  body += `<path d="M276,32 L352,19 Q350,40 338,56 L330,46 L320,64 L310,52 L296,66 Q284,48 276,32Z" fill="#8f9c9c" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round" opacity="0.9"/>`;
  body += `<path d="M290,40 Q300,50 296,62 M318,34 Q324,46 320,60" fill="none" stroke="#6b7878" stroke-width="1.2"/>`;
  // Rigging lines.
  body += `<path d="M300,6 Q250,60 214,96 M302,10 Q380,40 470,86" fill="none" stroke="#2a2a2a" stroke-width="1.2" opacity="0.7"/>`;
  // Broken foremast stump near the bow.
  body += mast(560, 104, 578, 52, 6);
  body += `<path d="M572,56 l4,-10 l3,8 l4,-6 l1,10" fill="#7d6450" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;

  // The hull, tilted a little with the bow raised.
  const wk = wreck();
  defs += wk.defs;
  body += `<g transform="translate(150 118) rotate(-4)">${wk.out}</g>`;

  // Sand drifted up against the hull (foreground), covering its keel.
  const drift = ridgeLine(rng(4003), { x0: -12, x1: Wd + 12, step: 14, base: 0, amp: 1, jag: 0.06, waves: 3, period: 900 });
  const dpts = fitRidge(drift, 222, 240).map(([x, y]) => [x, y + (x > 560 ? -(x - 560) * 0.12 : 0)]);
  const [ddd, ddu] = linear([[0, SANDS[1]], [1, SANDS[2]]]);
  defs += ddd;
  body += `<path d="${fillBelow(dpts, H + 2, 0.4)}" fill="${ddu}"/>`;
  body += `<path d="${smoothPath(dpts, false, 0.4)}" transform="translate(0 1.4)" fill="none" stroke="${shade(SANDS[1], 0.28)}" stroke-width="2.2" opacity="0.7"/>`;
  for (let i = 0; i < 24; i++) {
    const x = dr() * Wd;
    const y = 246 + dr() * 50;
    body += `<path d="M${fmt(x)},${fmt(y)} q6,-3 12,0" fill="none" stroke="${shade(SANDS[2], 0.2)}" stroke-width="1" opacity="0.5"/>`;
  }

  // Keep the middle calm for the treasure word: a soft dark veil behind it.
  const [vd, vu] = radial([[0, '#03101f', 0.45], [0.7, '#03101f', 0.25], [1, '#03101f', 0]]);
  defs += vd;
  body += `<ellipse cx="322" cy="170" rx="250" ry="92" fill="${vu}"/>`;

  // Treasure spilled beside where the diver lands (x 30..80).
  body += treasurePile(118, 262);
  // Rocks and weed at both sides.
  const sr = rng(4004);
  body += seaweedClump(16, 248, 4, sr, { h: 60, col: '#1c6040', leaf: '#2c8a55' });
  body += boulder(640, 246, 26, 18, '#3a4d70', sr, C.ink) + boulder(608, 256, 16, 11, '#465a80', sr, C.ink);
  body += seaweedClump(664, 238, 4, sr, { h: 70, col: '#1c6040', leaf: '#2c8a55' });
  body += shell(560, 262, 1.2, '#f2a0a0', -10) + starfish(510, 272, 7, '#e8743c', 15) + shell(196, 276, 1, '#f5d6a8', 8);
  return svg(Wd, H, body, defs);
}

function treasurePile(x, y) {
  let out = `<g transform="translate(${x} ${y})">`;
  // Coins heap.
  out += `<path d="M-38,10 Q-20,-8 0,-10 Q22,-8 38,10 Z" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const coins = [[-26, 4], [-14, -2], [-2, -6], [10, -3], [22, 3], [-8, 5], [6, 5], [30, 8]];
  for (const [cx, cy] of coins) out += `<ellipse cx="${cx}" cy="${cy}" rx="4" ry="2.4" fill="#ffe27a" stroke="${C.uiGoldDark}" stroke-width="0.9"/>`;
  // Small chest, lid open.
  out += `<g transform="translate(-6 -16) rotate(-8)">`;
  out += `<path d="M-14,-12 Q0,-24 14,-12 L14,-14 Q0,-28 -14,-14Z" fill="#7a4a2a" stroke="${C.ink}" stroke-width="1.4"/>`;
  out += `<rect x="-14" y="-6" width="28" height="16" rx="2" fill="${C.wood1}" stroke="${C.ink}" stroke-width="1.6"/>`;
  out += `<path d="M-14,-7 Q0,-14 14,-7" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1.2"/>`;
  out += `<rect x="-14" y="0" width="28" height="3" fill="${C.brass}" stroke="${C.ink}" stroke-width="0.8"/><rect x="-3" y="-2" width="6" height="7" rx="1" fill="${C.brass}" stroke="${C.ink}" stroke-width="0.8"/>`;
  out += `</g>`;
  out += `<path d="M18,-10 l1.5,-4 l1.5,4 l4,1.5 l-4,1.5 l-1.5,4 l-1.5,-4 l-4,-1.5z" fill="#fffbe0"/>`;
  out += `<path d="M-30,-2 l1,-3 l1,3 l3,1 l-3,1 l-1,3 l-1,-3 l-3,-1z" fill="#fffbe0"/>`;
  return out + '</g>';
}

// ================================================================ secret level floor

function sand() {
  const Wd = 690;
  const H = 300;
  const r = rng(5001);
  let defs = '';
  let body = '';
  const bed = sandBed(r, { Wd, H, lo: 34, hi: 52 });
  defs += bed.defs;
  const dr = rng(5002);
  for (let i = 0; i < 6; i++) {
    const x = dr() * Wd;
    body += boulder(x, ridgeY(bed.pts, x) + 8, 12 + dr() * 14, 8 + dr() * 8, mix(C.rock1, C.sea1, 0.55), dr);
  }
  body += bed.body;
  const sr = rng(5003);
  body += seaweedClump(30, 236, 4, sr, { h: 64, col: '#1c6040', leaf: '#2c8a55' });
  body += seaweedClump(92, 120, 3, sr, { h: 40, col: '#1d5a44', leaf: '#2a7a52' });
  body += seaweedClump(600, 130, 3, sr, { h: 46, col: '#1d5a44', leaf: '#2a7a52' });
  body += seaweedClump(660, 230, 4, sr, { h: 70, col: '#1c6040', leaf: '#2c8a55' });
  body += boulder(560, 250, 20, 14, '#3a4d70', sr, C.ink) + boulder(84, 262, 16, 10, '#465a80', sr, C.ink);
  body += shell(60, 200, 1.1, '#f5d6a8', -12) + shell(570, 200, 1.2, '#f2a0a0', 10) + starfish(110, 170, 7, '#e8743c', 10);
  body += starfish(620, 282, 6, '#d9535a', -20) + shell(36, 282, 0.9, '#efe3c8', 4);
  return svg(Wd, H, body, defs);
}

function coralshelf() {
  const Wd = 396;
  const H = 259;
  const r = rng(6001);
  let defs = '';
  let body = '';
  // A broad flat-topped rock table seen from above, with a short front face.
  const top = smoothPath([
    [26, 22], [80, 8], [200, 4], [320, 8], [372, 22], [388, 80], [382, 160], [372, 226], [300, 236], [198, 240], [96, 236], [24, 226], [12, 160], [8, 80],
  ], true, 0.35);
  const face = smoothPath([[24, 226], [96, 236], [198, 240], [300, 236], [372, 226], [380, 246], [340, 256], [198, 258], [56, 256], [16, 246]], true, 0.3);
  const [fd, fu] = linear([[0, '#4a4677'], [1, '#2a2747']]);
  defs += fd;
  body += `<path d="${face}" fill="${fu}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  const [td, tu] = linear([[0, '#6d6d9e'], [1, '#585887']]);
  defs += td;
  body += `<path d="${top}" fill="${tu}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  const [kd, ku] = clip(`<path d="${top}"/>`);
  defs += kd;
  let inner = '';
  // Two shallow terraces (clam rows at local y 19..119 and 129..229) with a soft step line.
  inner += `<path d="M10,124 Q200,116 390,124" fill="none" stroke="#43426b" stroke-width="3" opacity="0.6"/>`;
  inner += `<path d="M10,127 Q200,119 390,127" fill="none" stroke="#9a9acb" stroke-width="1.2" opacity="0.35"/>`;
  // Low-contrast mottling.
  for (let i = 0; i < 60; i++) {
    const x = r() * Wd;
    const y = r() * H;
    inner += `<ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="${fmt(3 + r() * 9)}" ry="${fmt(2 + r() * 4)}" fill="${r() < 0.5 ? '#8080b0' : '#46466e'}" opacity="0.22"/>`;
  }
  // Lit rim along the back edge.
  inner += `<path d="M26,24 Q200,0 372,24" fill="none" stroke="#a8a8d8" stroke-width="3" opacity="0.5"/>`;
  body += `<g clip-path="${ku}">${inner}</g>`;
  // Coral dressing on the left and right rims (outside the clam area x 49..349).
  const cr = rng(6002);
  const branch = (x, y, s, col) => {
    let o = '';
    const arms = [[-0.5, 1], [0, 1.2], [0.45, 0.9], [-0.25, 0.7], [0.25, 0.75]];
    for (const [a, L] of arms) {
      const ex = x + Math.sin(a) * s * L;
      const ey = y - Math.cos(a) * s * L;
      o += `<path d="M${x},${y} Q${fmt(x + Math.sin(a) * s * 0.3)},${fmt(y - s * 0.5)} ${fmt(ex)},${fmt(ey)}" fill="none" stroke="${C.ink}" stroke-width="${fmt(s * 0.22 + 2)}" stroke-linecap="round"/>`;
      o += `<path d="M${x},${y} Q${fmt(x + Math.sin(a) * s * 0.3)},${fmt(y - s * 0.5)} ${fmt(ex)},${fmt(ey)}" fill="none" stroke="${col}" stroke-width="${fmt(s * 0.22)}" stroke-linecap="round"/>`;
    }
    return o;
  };
  const brain = (x, y, s, col) => `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${fmt(s * 0.7)}" fill="${col}" stroke="${C.ink}" stroke-width="1.4"/><path d="M${x - s * 0.6},${y} q${s * 0.3},-${s * 0.4} ${s * 0.6},0 t${s * 0.6},0" fill="none" stroke="${shade(col, -0.3)}" stroke-width="1.2"/>`;
  body += branch(22, 70, 22, C.coral) + brain(30, 120, 14, '#e8a94a') + branch(26, 190, 20, '#d45a9a') + fan(16, 232, 22, '#9b59b6', cr);
  body += branch(376, 64, 22, '#d45a9a') + brain(370, 150, 13, C.coral) + branch(372, 200, 18, '#ffb04a') + fan(384, 236, 20, '#e86a6a', cr);
  // Small coral tufts along the back rim, above the first clam row.
  for (let i = 0; i < 9; i++) {
    const x = 56 + i * 36 + cr() * 10;
    const col = ['#ff7b6b', '#ffb04a', '#d45a9a', '#7ed0c0'][i % 4];
    body += i % 2 ? `<ellipse cx="${fmt(x)}" cy="${fmt(9 + cr() * 3)}" rx="${fmt(5 + cr() * 3)}" ry="3.4" fill="${col}" stroke="${C.ink}" stroke-width="1.1"/>` : branch(x, 13, 9, col);
  }
  body += seaweedClump(200, 252, 3, cr, { h: 18, col: '#1c6040', leaf: '#2c8a55' });
  body += starfish(300, 248, 6, '#e8743c', 20) + shell(110, 250, 1, '#f5d6a8', -6);
  // Little anemones and pebbles along the front lip.
  for (let i = 0; i < 8; i++) {
    const x = 50 + i * 40 + cr() * 10;
    body += `<circle cx="${fmt(x)}" cy="${fmt(244 + cr() * 6)}" r="${fmt(2 + cr() * 2.5)}" fill="#6d7fa3" stroke="${C.ink}" stroke-width="0.8"/>`;
  }
  return svg(Wd, H, body, defs);
}

// ================================================================ surface strips

const TH = 119;
const WL = 95; // waterline

/** The dive boat. Stern at left with an A-frame whose pulley drops the hose at x 44.5. */
function boat({ lights = false } = {}) {
  let o = '';
  const s = 1.6;
  const ink = (w = s) => `stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // Hull.
  const hull = smoothPath([[58, 80], [120, 82], [176, 78], [196, 70], [190, 86], [176, 104], [90, 108], [64, 100]], true, 0.25);
  const [hd, hu] = clip(`<path d="${hull}"/>`);
  o += `<defs>${hd}</defs>`;
  o += `<path d="${hull}" fill="#f4f6f8"/>`;
  o += `<g clip-path="${hu}"><rect x="40" y="94" width="170" height="20" fill="#c8423a"/><rect x="40" y="91" width="170" height="3.5" fill="${C.ink}"/><path d="M58,80 L198,72 L198,78 L58,85Z" fill="#2c6fb0"/><rect x="40" y="99" width="170" height="20" fill="${shade('#c8423a', -0.3)}"/></g>`;
  o += `<path d="${hull}" fill="none" ${ink(2)}/>`;
  // Name plate dots / portholes.
  for (const x of [128, 146, 164]) o += `<circle cx="${x}" cy="87" r="2.6" fill="#bfe6ff" ${ink(1.1)}/>`;
  // Cabin + wheelhouse.
  o += `<path d="M104,80 L104,58 Q104,54 108,54 L156,54 Q162,54 164,60 L170,79 Z" fill="${C.diverYellow}" ${ink()}/>`;
  o += `<path d="M104,66 L166,66" stroke="${C.diverYellowDark}" stroke-width="2"/>`;
  const glass = lights ? '#ffe9a0' : '#9fd8f5';
  o += `<rect x="110" y="58" width="12" height="7" rx="1.5" fill="${glass}" ${ink(1.1)}/><rect x="126" y="58" width="12" height="7" rx="1.5" fill="${glass}" ${ink(1.1)}/><path d="M142,58 L156,58 Q159,58 160,61 L161,65 L142,65Z" fill="${glass}" ${ink(1.1)}/>`;
  o += `<path d="M100,55 L160,55 Q166,55 168,51 L104,51 Q100,51 100,55Z" fill="${C.uiRed}" ${ink(1.4)}/>`;
  // Mast with radar, light and flag.
  o += `<path d="M134,51 L134,22" ${ink(3.6)}/><path d="M134,51 L134,22" stroke="#d8dde3" stroke-width="1.8"/>`;
  o += `<rect x="124" y="30" width="20" height="4" rx="2" fill="#d8dde3" ${ink(1.1)}/>`;
  o += `<path d="M134,22 L150,25 L144,28 L150,31 L134,31Z" fill="${C.uiRed}" ${ink(1.1)}/>`;
  o += `<circle cx="134" cy="21" r="2" fill="${lights ? '#fff6b0' : '#ffffff'}" ${ink(1)}/>`;
  // Railing on the aft deck.
  o += `<path d="M62,73 L102,73" ${ink(2.6)}/><path d="M62,73 L102,73" stroke="#d8dde3" stroke-width="1"/>`;
  for (const x of [64, 76, 88, 100]) o += `<path d="M${x},73 L${x},80" stroke="${C.ink}" stroke-width="1.4"/>`;
  // Winch drum on deck.
  o += `<rect x="80" y="70" width="18" height="11" rx="3" fill="${C.steel1}" ${ink(1.3)}/><ellipse cx="89" cy="75.5" rx="6" ry="4.5" fill="${C.diverYellow}" ${ink(1.1)}/><circle cx="89" cy="75.5" r="1.4" fill="${C.ink}"/>`;
  // A-frame: two legs from the deck leaning out over the stern to the pulley head.
  o += `<path d="M76,80 L52,30 M64,80 L50,32" ${ink(5)}/><path d="M76,80 L52,30 M64,80 L50,32" stroke="${C.uiRed}" stroke-width="2.6"/>`;
  o += `<path d="M47,30 L58,30" ${ink(5)}/><path d="M47,30 L58,30" stroke="${C.uiRed}" stroke-width="2.6"/>`;
  return o;
}

/** Hose from the winch over the pulley and straight down to the bottom edge at x 44.5. */
function hose() {
  // Same look as the upper_hose sprite it joins at the bottom edge (see diver.mjs).
  const col = C.rock1;
  let o = `<path d="M89,72 L54,31" stroke="${C.ink}" stroke-width="3.6" stroke-linecap="round"/><path d="M89,72 L54,31" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<path d="M44.5,36 L44.5,${TH + 2}" stroke="${C.ink}" stroke-width="6.4"/><path d="M44.5,36 L44.5,${TH + 2}" stroke="${col}" stroke-width="3.6"/><path d="M43.6,36 L43.6,${TH + 2}" stroke="${C.rock2}" stroke-width="1"/>`;
  for (let y = 45; y < TH; y += 10) o += `<path d="M42.2,${y} L46.8,${y}" stroke="${C.rock0}" stroke-width="1.3" stroke-linecap="round"/>`;
  // Pulley wheel (hose rides over its left side).
  o += `<circle cx="49.5" cy="35" r="6" fill="${C.steel2}" stroke="${C.ink}" stroke-width="1.6"/><circle cx="49.5" cy="35" r="1.8" fill="${C.ink}"/>`;
  return o;
}

/**
 * Compose a surface strip. opts: sky (stops), far (far sea colour), shallow (top of the
 * underwater band), scene(defs) => {back, under, front, fx}, boatFilter, chop, lights.
 */
function surface(opts) {
  const { sky, far = '#3a8fc8', shallow = '#3f8fcf', chop = 1, horizon = 84, lights = false } = opts;
  let defs = '';
  let body = '';
  const [sd, su] = linear(sky);
  defs += sd;
  body += `<rect width="${W}" height="${TH}" fill="${su}"/>`;
  const sc = opts.scene ? opts.scene() : {};
  if (sc.defs) defs += sc.defs;
  body += sc.sky ?? '';
  // Far sea band.
  const [fd, fu] = linear([[0, shade(far, -0.12)], [1, far]]);
  defs += fd;
  body += `<rect y="${horizon}" width="${W}" height="${TH - horizon}" fill="${fu}"/>`;
  body += `<path d="M0,${horizon + 0.5} L${W},${horizon + 0.5}" stroke="${shade(far, 0.35)}" stroke-width="1" opacity="0.6"/>`;
  for (let i = 0; i < 26; i++) {
    const r = rng(900 + i)();
    const x = (i * 97 + r * 40) % W;
    const y = horizon + 2 + ((i * 7) % 9);
    body += `<path d="M${fmt(x)},${y} l${fmt(6 + r * 10)},0" stroke="${shade(far, 0.4)}" stroke-width="0.9" opacity="0.6"/>`;
  }
  body += sc.back ?? '';
  // Underwater band below the waterline.
  const wpts = wave(WL, { amp: 1.4 * chop, len: 46, amp2: 0.8 * chop, len2: 19 });
  const under = `${smoothPath(wpts, false, 0.4)} L650,${TH + 5} L-10,${TH + 5}Z`;
  const [ud, uu] = linear([[0, shallow], [0.35, mix(shallow, WATER, 0.55)], [1, WATER]]);
  defs += ud;
  body += `<path d="${under}" fill="${uu}"/>`;
  const [ld, lu] = linear([[0, '#bfe9ff', 0.0], [0.3, '#bfe9ff', 0.14], [1, '#bfe9ff', 0]]);
  defs += ld;
  for (const [x, w] of [[230, 18], [300, 30], [420, 14], [520, 26], [600, 16]]) body += `<path d="M${x},${WL} l${w},0 l${-12 + w * 0.3},${TH - WL + 5} l${-w * 1.2},0z" fill="${lu}"/>`;
  body += sc.under ?? '';
  // Boat (hull partly under water) and its hose.
  let b = boat({ lights });
  if (opts.boatTilt) b = `<g transform="rotate(${opts.boatTilt} 49.5 35)">${b}</g>`;
  if (opts.boatFilter) {
    const [cd, cu] = colorMatrix(opts.boatFilter);
    defs += cd;
    b = `<g filter="${cu}">${b}</g>`;
  }
  body += b;
  // Water veil over everything below the waterline (tints the hull's submerged part).
  const [vd, vu] = linear([[0, shallow, 0.55], [1, WATER, 0.75]]);
  defs += vd;
  const [cd, cu] = clip(`<path d="${under}"/>`);
  defs += cd;
  body += `<g clip-path="${cu}"><rect y="${WL - 6}" width="${W}" height="${TH - WL + 8}" fill="${vu}"/></g>`;
  body += hose();
  // Waterline: bright foam edge plus a darker underside.
  body += `<path d="${smoothPath(wpts, false, 0.4)}" fill="none" stroke="${C.foam}" stroke-width="${1.8 + chop * 0.4}" stroke-linecap="round" opacity="0.9"/>`;
  body += `<path d="${smoothPath(wpts, false, 0.4)}" transform="translate(0 2.4)" fill="none" stroke="${shade(shallow, 0.3)}" stroke-width="1" opacity="0.5"/>`;
  // Little splash where the hose enters the water.
  body += `<path d="M36,${WL - 1} q4,-3 8,0 q4,-3 9,0" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>`;
  body += sc.front ?? '';
  body += sc.fx ?? '';
  return svg(W, TH, body, defs);
}

const gull = (x, y, s = 1, col = '#ffffff') => `<path d="M${x - 5 * s},${y} q${2.5 * s},${-3 * s} ${5 * s},0 q${2.5 * s},${-3 * s} ${5 * s},0" fill="none" stroke="${col}" stroke-width="${1.3 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;

function clouds(list, fill, shadeCol, seed, op = 1) {
  const r = rng(seed);
  let o = '';
  for (const [x, y, s] of list) {
    const shape = cloudShape(x, y, s, r);
    o += `<g opacity="${op}"><g fill="${shadeCol}" transform="translate(0 ${fmt(s * 0.12)})">${shape}</g><g fill="${fill}">${cloudShape(x, y - s * 0.04, s * 0.96, rng(seed + x))}</g></g>`;
  }
  return o;
}

function palm(x, y, h, lean = 6, col = '#2f8a4a') {
  let o = `<path d="M${x},${y} Q${x + lean * 0.3},${y - h * 0.6} ${x + lean},${y - h}" fill="none" stroke="#5a3f2a" stroke-width="2.2" stroke-linecap="round"/>`;
  const tx = x + lean;
  const ty = y - h;
  for (const [dx, dy] of [[-10, 3], [-7, -5], [0, -7], [8, -4], [11, 4], [3, 6]]) o += `<path d="M${tx},${ty} Q${tx + dx * 0.6},${ty + dy * 0.6 - 3} ${tx + dx},${ty + dy}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
  return o;
}

const topbackground = () =>
  surface({
    sky: [[0, '#3ea6e6'], [0.7, '#9ddcf7'], [1, '#d8f3fd']],
    far: '#2f86c4',
    shallow: '#3f97d6',
    scene: () => {
      const [gd, gu] = radial([[0, '#fff8d0', 0.9], [0.4, '#fff3b0', 0.35], [1, '#fff3b0', 0]]);
      let sky = `<circle cx="572" cy="26" r="40" fill="${gu}"/><circle cx="572" cy="26" r="13" fill="#fff6c8"/>`;
      sky += clouds([[250, 40, 18], [330, 32, 13], [470, 58, 15], [140, 24, 10]], '#ffffff', '#cfe8f5', 21);
      sky += gull(360, 20) + gull(376, 26, 0.8) + gull(220, 12, 0.7);
      // Low island with palms on the horizon.
      const back = `<path d="M400,85 Q420,74 446,72 Q470,73 492,85Z" fill="#3f8a5a" stroke="${C.ink}" stroke-width="1.2"/><path d="M404,85 Q440,80 488,85Z" fill="${C.sand2}"/>` + palm(436, 76, 16, 4) + palm(458, 75, 13, -3);
      return { sky, back, defs: gd };
    },
  });

const topbackground_iceberg = () =>
  surface({
    sky: [[0, '#7fbde3'], [0.7, '#cbe9f6'], [1, '#eef9ff']],
    far: '#4b97bf',
    shallow: '#4a9ccc',
    scene: () => {
      const r = rng(31);
      let sky = clouds([[200, 30, 14], [520, 22, 11]], '#f8fdff', '#d5e7f0', 33);
      // Distant glacier line.
      sky += `<path d="M230,85 L250,72 L268,78 L290,66 L312,76 L330,70 L350,85Z" fill="#e3f2fa" stroke="#9cc3da" stroke-width="1"/>`;
      // Big iceberg: tip above water, larger mass below.
      const tip = `M372,${WL} L384,64 L398,58 L410,38 L424,44 L438,30 L452,48 L466,56 L476,74 L492,${WL}Z`;
      let back = `<path d="${tip}" fill="#f4fbff" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"/>`;
      back += `<path d="M438,30 L452,48 L466,56 L476,74 L492,${WL} L450,${WL} L444,70 L432,56Z" fill="#bfe0f1"/>`;
      back += `<path d="M398,58 L410,38 L418,46 L404,66Z" fill="#ffffff"/>`;
      back += `<path d="${tip}" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"/>`;
      // Ice floes on the surface.
      for (const [x, w] of [[180, 26], [262, 14], [560, 34], [612, 18], [520, 10]]) back += `<path d="M${x},${WL + 1} l3,-5 l${w - 6},-1 l3,6z" fill="#f4fbff" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
      const under = `<path d="M372,${WL} L360,104 L352,${TH + 4} L520,${TH + 4} L510,108 L492,${WL}Z" fill="#9fd2ec" opacity="0.9"/><path d="M440,${WL} L470,${TH + 4} L520,${TH + 4} L510,108 L492,${WL}Z" fill="#7bbcdf" opacity="0.8"/>`;
      let fx = '';
      for (let i = 0; i < 40; i++) fx += `<circle cx="${fmt(r() * W)}" cy="${fmt(r() * (WL - 4))}" r="${fmt(0.7 + r() * 1.1)}" fill="#ffffff" opacity="0.85"/>`;
      return { sky, back, under, fx };
    },
  });

const topbackground_lighthouse = () =>
  surface({
    sky: [[0, '#070d24'], [0.75, '#1b2452'], [1, '#2d3768']],
    far: '#14305a',
    shallow: '#1d4f86',
    lights: true,
    boatFilter: '0.42 0 0 0 0.02  0 0.46 0 0 0.04  0 0 0.62 0 0.11  0 0 0 1 0',
    scene: () => {
      const r = rng(41);
      let defs = '';
      let sky = '';
      for (let i = 0; i < 70; i++) {
        const rr = r() < 0.15 ? 1.3 : 0.6 + r() * 0.5;
        sky += `<circle cx="${fmt(r() * W)}" cy="${fmt(r() * 78)}" r="${fmt(rr)}" fill="#ffffff" opacity="${fmt(0.4 + r() * 0.6)}"/>`;
      }
      // Crescent moon.
      sky += `<circle cx="300" cy="24" r="11" fill="#fff4cf"/><circle cx="306" cy="20" r="10" fill="#0c1430"/>`;
      // Rocky point with the lighthouse.
      let back = `<path d="M470,${WL + 2} Q500,78 530,74 L548,62 L590,58 L612,66 L640,64 L640,${WL + 2}Z" fill="#141a30" stroke="${C.ink}" stroke-width="1.4"/>`;
      back += `<path d="M530,74 L548,62 L566,66 L556,80Z M600,62 L620,70 L606,82Z" fill="#232c4a"/>`;
      const lx = 572;
      back += `<path d="M${lx - 8},60 L${lx - 5},22 L${lx + 5},22 L${lx + 8},60Z" fill="#d9dde6" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
      for (const y of [30, 44]) back += `<path d="M${lx - 6.6},${y + 8} L${lx - 6},${y} L${lx + 6},${y} L${lx + 6.6},${y + 8}Z" fill="#b7363a"/>`;
      back += `<rect x="${lx - 6}" y="12" width="12" height="10" fill="#fff2a0" stroke="${C.ink}" stroke-width="1.3"/><path d="M${lx - 8},12 L${lx},5 L${lx + 8},12Z" fill="#b7363a" stroke="${C.ink}" stroke-width="1.3" stroke-linejoin="round"/><path d="M${lx - 8},22 L${lx + 8},22" stroke="${C.ink}" stroke-width="2"/>`;
      // Beam sweeping left over the water (additive-looking soft wedge) and lamp glow.
      const [bd, bu] = linear([[0, '#fff3b0', 0.55], [1, '#fff3b0', 0]], { x1: 1, y1: 0, x2: 0, y2: 0 });
      const [gd, gu] = radial([[0, '#fff6c0', 0.9], [0.35, '#ffe68a', 0.35], [1, '#ffe68a', 0]]);
      defs += bd + gd;
      let fx = `<path d="M${lx},17 L240,-6 L220,52Z" fill="${bu}"/><circle cx="${lx}" cy="17" r="26" fill="${gu}"/>`;
      // Moon sparkle on the water and the boat's lit windows/deck lamp.
      let under = '';
      for (let i = 0; i < 6; i++) under += `<path d="M${294 - i * 2},${WL - 8 + i * 1.4} l${10 + i * 3},0" stroke="#fff4cf" stroke-width="1" opacity="${0.5 - i * 0.06}"/>`;
      back += under;
      const [wd, wu] = radial([[0, '#ffe9a0', 0.55], [1, '#ffe9a0', 0]]);
      defs += wd;
      fx += `<circle cx="134" cy="61" r="22" fill="${wu}"/><circle cx="134" cy="21" r="8" fill="${wu}"/>`;
      return { sky, back, fx, defs };
    },
  });

const topbackground_shipwreck = () =>
  surface({
    sky: [[0, '#6f8aa6'], [0.7, '#b6c7d4'], [1, '#d6e0e6']],
    far: '#3f7398',
    shallow: '#3d7fb2',
    scene: () => {
      let sky = clouds([[160, 30, 20], [300, 22, 16], [470, 34, 22], [600, 18, 14]], '#e8eef2', '#98aabb', 51);
      sky += gull(420, 40, 0.8, '#ffffff') + gull(236, 54, 0.7, '#ffffff');
      // Two broken masts of a sunken ship sticking out of the water, leaning.
      const mast = (x0, x1, y1, w) => `<path d="M${x0},${WL + 20} L${x1},${y1}" stroke="${C.ink}" stroke-width="${w + 3}" stroke-linecap="round"/><path d="M${x0},${WL + 20} L${x1},${y1}" stroke="#6b5040" stroke-width="${w}" stroke-linecap="round"/>`;
      let back = '';
      back += mast(368, 384, 26, 5);
      back += `<path d="M366,44 L404,38" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/><path d="M366,44 L404,38" stroke="#6b5040" stroke-width="2.6" stroke-linecap="round"/>`;
      back += `<path d="M370,45 L400,40 Q398,56 390,62 L384,56 L378,66 Q372,56 370,45Z" fill="#cfc6b0" stroke="${C.ink}" stroke-width="1.3" stroke-linejoin="round"/>`;
      back += `<path d="M380,30 l14,4 l-6,3 l6,3 l-14,0z" fill="#262626" stroke="${C.ink}" stroke-width="1"/>`;
      back += mast(452, 440, 50, 4.4);
      back += `<path d="M430,62 L454,58" stroke="${C.ink}" stroke-width="4.4" stroke-linecap="round"/><path d="M430,62 L454,58" stroke="#6b5040" stroke-width="2.2" stroke-linecap="round"/>`;
      back += `<path d="M384,26 Q420,60 444,52 M384,30 L340,${WL} M440,52 L480,${WL}" fill="none" stroke="#2a2a2a" stroke-width="1" opacity="0.8"/>`;
      back += gull(384, 22, 0.7, '#ffffff');
      // Hull shadow just under the water.
      const under = `<path d="M320,${TH + 4} Q330,104 360,100 L470,100 Q500,104 510,${TH + 4}Z" fill="#1d3a52" opacity="0.7"/>`;
      return { sky, back, under };
    },
  });

const topbackground_storm = () =>
  surface({
    sky: [[0, '#1a212d'], [0.7, '#36414f'], [1, '#4b5664']],
    far: '#26465e',
    shallow: '#285a82',
    chop: 2.4,
    boatTilt: -3,
    boatFilter: '0.62 0 0 0 0.02  0 0.66 0 0 0.03  0 0 0.74 0 0.06  0 0 0 1 0',
    scene: () => {
      let defs = '';
      const [bd, bu] = blur(4);
      defs += bd;
      let sky = `<g filter="${bu}">${clouds([[100, 26, 26], [250, 18, 30], [420, 22, 28], [580, 30, 26], [340, 50, 22]], '#4a5566', '#262e3b', 61)}</g>`;
      sky += clouds([[180, 12, 18], [520, 10, 20]], '#5b6678', '#2c3442', 62, 0.9);
      // Lightning with glow.
      const bolt = 'M468,0 L458,30 L470,30 L452,66 L476,24 L464,24 L476,0Z';
      const [gd, gu] = blur(5);
      defs += gd;
      sky += `<path d="${bolt}" fill="#cfe9ff" filter="${gu}" opacity="0.9"/><path d="${bolt}" fill="#ffffff"/>`;
      const [hd, hu] = radial([[0, '#cfe9ff', 0.45], [1, '#cfe9ff', 0]]);
      defs += hd;
      sky += `<ellipse cx="466" cy="22" rx="80" ry="40" fill="${hu}"/>`;
      // Whitecaps on the far sea.
      let back = '';
      for (let i = 0; i < 18; i++) back += `<path d="M${(i * 41) % 640},${86 + (i % 3) * 3} q4,-3 8,0" fill="none" stroke="#dfe9f2" stroke-width="1.2" opacity="0.7"/>`;
      // Rain streaks over everything.
      const r = rng(63);
      let fx = '';
      for (let i = 0; i < 160; i++) {
        const x = r() * 680;
        const y = r() * 130 - 10;
        const L = 8 + r() * 10;
        fx += `<path d="M${fmt(x)},${fmt(y)} l${fmt(-L * 0.3)},${fmt(L)}" stroke="#c8d6e6" stroke-width="0.8" opacity="${fmt(0.25 + r() * 0.3)}"/>`;
      }
      return { sky, back, fx, defs };
    },
  });

const topbackground_volcano = () =>
  surface({
    sky: [[0, '#e8743c'], [0.55, '#f8a85a'], [1, '#ffd89a']],
    far: '#2f8aa6',
    shallow: '#33a0b8',
    scene: () => {
      let defs = '';
      // Low sun behind haze.
      const [sd, su] = radial([[0, '#fff2c0', 0.9], [0.4, '#ffd27a', 0.4], [1, '#ffd27a', 0]]);
      defs += sd;
      let sky = `<circle cx="210" cy="64" r="40" fill="${su}"/><circle cx="210" cy="64" r="12" fill="#fff0c0"/>`;
      // Smoke plume drifting right from the crater.
      const r = rng(71);
      const [bd, bu] = blur(1.5);
      defs += bd;
      let smoke = '';
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = 498 + t * 120 + Math.sin(t * 5) * 8;
        const y = 22 - t * 34;
        const rr = 7 + t * 14;
        smoke += `<circle cx="${fmt(x)}" cy="${fmt(y + 2)}" r="${fmt(rr)}" fill="#6b5a5a"/><circle cx="${fmt(x - 2)}" cy="${fmt(y - 1)}" r="${fmt(rr * 0.85)}" fill="#8f7d78"/>`;
        void r;
      }
      sky += gull(330, 30, 0.8, '#5a3a2a') + gull(350, 22, 0.6, '#5a3a2a');
      // Island with volcano cone, lava streak, beach and palms.
      let back = `<path d="M380,${WL} Q420,82 456,70 L486,24 L512,22 L540,62 Q580,78 628,${WL}Z" fill="#5a4a48" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
      back += `<path d="M512,22 L540,62 Q580,78 628,${WL} L560,${WL} Q530,70 506,40Z" fill="#433636"/>`;
      back += `<path d="M486,24 Q492,20 499,24 Q506,20 512,22 L508,28 Q499,24 490,28Z" fill="#ff6a2a" stroke="${C.ink}" stroke-width="1"/>`;
      back += `<path d="M496,26 Q492,40 498,52 Q490,64 494,76" fill="none" stroke="#ff7b2a" stroke-width="3" stroke-linecap="round"/><path d="M496,26 Q492,40 498,52 Q490,64 494,76" fill="none" stroke="#ffd04a" stroke-width="1.2" stroke-linecap="round"/>`;
      back += `<path d="M384,${WL} Q420,86 470,84 L470,${WL}Z" fill="#3e8a4a"/><path d="M380,${WL} Q430,88 600,90 Q620,92 628,${WL}Z" fill="${C.sand2}" stroke="${C.ink}" stroke-width="1"/>`;
      back += palm(410, 90, 20, 6, '#2f7a3a') + palm(428, 89, 16, -4, '#2f7a3a') + palm(588, 90, 18, -5, '#2f7a3a');
      const [gd, gu] = radial([[0, '#ffb04a', 0.7], [1, '#ff6a2a', 0]]);
      defs += gd;
      sky += `<ellipse cx="500" cy="22" rx="34" ry="18" fill="${gu}"/>`;
      sky += `<g filter="${bu}">${smoke}</g>`;
      return { sky, back, defs };
    },
  });

export default {
  water1,
  mountain1: () => mountain(1),
  mountain2: () => mountain(2),
  mountain3: () => mountain(3),
  oceanfloor,
  sand,
  coralshelf,
  topbackground,
  topbackground_iceberg,
  topbackground_lighthouse,
  topbackground_shipwreck,
  topbackground_storm,
  topbackground_volcano,
};

void rot;
void id;
