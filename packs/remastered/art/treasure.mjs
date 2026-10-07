// Treasure dive and end-of-level art: the "SHIPWRECK BONUS!" banner, the air tank gauge,
// six faceted gems, the four secret treasures (icon + large) and the gem sparkle strip.
//
// Layout (src/game/board.ts drawLevelUi / drawAir / startResults): airgauge at (175, gaugeY);
// the game fills a green rect at local (19, 7, up to 240, 15), so that trough is drawn empty.
// sparkle_large frames are drawn with additive blending.

import { C, svg, strip, linear, radial, shade, mix, smoothPath, id, attrs, fmt } from './lib.mjs';
import { banner, GOLD_TEXT } from './hud-lib.mjs';

// ---------------------------------------------------------------- banner

function shipwreckbonus() {
  const b = banner('SHIPWRECK BONUS!', { cx: 196, base: 33, size: 40, maxW: 380, fillStops: GOLD_TEXT, wave: false });
  return svg(392, 39, b.out, b.defs);
}

// ---------------------------------------------------------------- air gauge

function airgauge() {
  let defs = '';
  let out = '';
  const T = { x: 19, y: 7, w: 240, h: 15 };
  // Capsule body.
  const [bd, bu] = linear([[0, C.steel2], [0.45, mix(C.steel1, '#4fb3ad', 0.25)], [1, C.steel0]]);
  defs += bd;
  out += `<rect x="2" y="2.5" width="265" height="24" rx="12" ${attrs({ fill: bu, stroke: C.ink, 'stroke-width': 1.5 })}/>`;
  out += `<path d="M10,5 H259" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.2" stroke-linecap="round"/>`;
  // Left cap: a tiny pressure dial.
  const [dd, du] = radial([[0, '#ffffff'], [1, '#d6e4ee']]);
  defs += dd;
  out += `<circle cx="10.5" cy="14.5" r="6" ${attrs({ fill: du, stroke: C.ink, 'stroke-width': 1.2 })}/>`;
  for (let i = 0; i < 5; i++) {
    const a = ((-210 + i * 60) * Math.PI) / 180;
    out += `<path d="M${fmt(10.5 + Math.cos(a) * 3.9)},${fmt(14.5 + Math.sin(a) * 3.9)} L${fmt(10.5 + Math.cos(a) * 5)},${fmt(14.5 + Math.sin(a) * 5)}" stroke="${C.ink}" stroke-width="0.7"/>`;
  }
  out += `<path d="M10.5,14.5 L13.6,11.6" stroke="${C.uiRed}" stroke-width="1.1" stroke-linecap="round"/><circle cx="10.5" cy="14.5" r="1" fill="${C.ink}"/>`;
  // Trough: ink frame hugging the fill rect, dark recessed interior.
  out += `<rect x="${T.x - 2}" y="${T.y - 2}" width="${T.w + 4}" height="${T.h + 4}" rx="3" fill="${C.ink}"/>`;
  const [td, tu] = linear([[0, '#02060d'], [0.4, '#0a1628'], [1, '#132743']]);
  defs += td;
  out += `<rect x="${T.x}" y="${T.y}" width="${T.w}" height="${T.h}" fill="${tu}"/>`;
  for (const k of [0.25, 0.5, 0.75]) out += `<path d="M${T.x + T.w * k},${T.y + 2}V${T.y + T.h - 2}" stroke="#4fb3ad" stroke-opacity="0.25" stroke-width="1"/>`;
  // Right: neck, valve block and handwheel.
  const [gd, gu] = linear([[0, '#fff0b0'], [0.45, C.brass], [1, shade(C.brass, -0.4)]]);
  defs += gd;
  out += `<rect x="264" y="9.5" width="9" height="10" ${attrs({ fill: gu, stroke: C.ink, 'stroke-width': 1.2 })}/>`;
  out += `<rect x="271" y="5" width="9" height="19" rx="2" ${attrs({ fill: gu, stroke: C.ink, 'stroke-width': 1.3 })}/>`;
  out += `<path d="M273,8 V21" stroke="#fff6cc" stroke-width="1" stroke-linecap="round" opacity="0.8"/>`;
  out += `<rect x="280" y="12" width="3" height="5" fill="${C.steel1}" stroke="${C.ink}" stroke-width="0.9"/>`;
  out += `<ellipse cx="285" cy="14.5" rx="3.3" ry="12" ${attrs({ fill: C.uiRed, stroke: C.ink, 'stroke-width': 1.3 })}/>`;
  for (const y of [7, 11, 18, 22]) out += `<path d="M283.2,${y} H286.8" stroke="${shade(C.uiRed, -0.45)}" stroke-width="1"/>`;
  out += `<path d="M284.2,5 Q283.4,9 283.6,12" fill="none" stroke="#ffb3a8" stroke-width="0.9" stroke-linecap="round"/>`;
  return svg(290, 29, out, defs);
}

// ---------------------------------------------------------------- gems

const LIGHT = [-0.55, -0.83];

/**
 * Faceted gem from a convex outline P (clockwise). The crown is split into a ring of facets
 * between the outline and a scaled table; each facet is shaded by how much it faces the light.
 */
function gem(P, { base, center, k = 0.52, sw = 1.4, fire = false, steps = false, star = false }) {
  let defs = '';
  let out = '';
  const n = P.length;
  const [cx, cy] = center;
  const T = P.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  const poly = (pts) => pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');
  const tints = ['#ffb3e6', '#a8f0ff', '#fff3a0', '#c8b6ff'];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (P[i][0] + P[j][0]) / 2 - cx;
    const my = (P[i][1] + P[j][1]) / 2 - cy;
    const len = Math.hypot(mx, my) || 1;
    const b = (mx * LIGHT[0] + my * LIGHT[1]) / len; // -1..1
    const col = (v) => {
      let c = v > 0 ? shade(base, Math.min(0.75, v * 0.62)) : shade(base, Math.max(-0.6, v * 0.45));
      if (fire && i % 3 === 1) c = mix(c, tints[i % 4], 0.35);
      return c;
    };
    out += `<polygon points="${poly([P[i], P[j], T[j]])}" fill="${col(b + 0.12)}"/>`;
    out += `<polygon points="${poly([P[i], T[j], T[i]])}" fill="${col(b - 0.12)}"/>`;
  }
  // Facet edges.
  let edges = '';
  for (let i = 0; i < n; i++) edges += `M${fmt(P[i][0])},${fmt(P[i][1])} L${fmt(T[i][0])},${fmt(T[i][1])} `;
  out += `<path d="${edges}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.6" fill="none"/>`;
  if (steps) {
    const S = P.map(([x, y]) => [cx + (x - cx) * ((1 + k) / 2), cy + (y - cy) * ((1 + k) / 2)]);
    out += `<polygon points="${poly(S)}" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="0.6"/>`;
  }
  // Table.
  const [td, tu] = linear([[0, shade(base, 0.6)], [0.55, shade(base, 0.15)], [1, shade(base, -0.1)]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  defs += td;
  out += `<polygon points="${poly(T)}" fill="${tu}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.7"/>`;
  if (star) {
    let d = '';
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      d += `M${fmt(T[i][0])},${fmt(T[i][1])} L${fmt(cx)},${fmt(cy)} L${fmt(T[j][0])},${fmt(T[j][1])} `;
    }
    out += `<path d="${d}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.5" fill="none"/>`;
  }
  // Highlight streak on the table and a glint.
  const tl = T.reduce((a, p) => (p[0] * LIGHT[0] + p[1] * LIGHT[1] > a[0] * LIGHT[0] + a[1] * LIGHT[1] ? p : a));
  const hx = (tl[0] + cx) / 2, hy = (tl[1] + cy) / 2;
  out += `<ellipse cx="${fmt(hx)}" cy="${fmt(hy)}" rx="3.2" ry="1.4" transform="rotate(-40 ${fmt(hx)} ${fmt(hy)})" fill="#ffffff" opacity="0.75"/>`;
  out += `<polygon points="${poly(P)}" ${attrs({ fill: 'none', stroke: C.ink, 'stroke-width': sw, 'stroke-linejoin': 'round' })}/>`;
  const gx = tl[0] - 1, gy = tl[1] - 1;
  out += `<path d="M${fmt(gx)},${fmt(gy - 4.5)} L${fmt(gx + 1)},${fmt(gy - 1)} L${fmt(gx + 4.5)},${fmt(gy)} L${fmt(gx + 1)},${fmt(gy + 1)} L${fmt(gx)},${fmt(gy + 4.5)} L${fmt(gx - 1)},${fmt(gy + 1)} L${fmt(gx - 4.5)},${fmt(gy)} L${fmt(gx - 1)},${fmt(gy - 1)} Z" fill="#ffffff"/>`;
  return { defs, out };
}

const ring = (n, cx, cy, rx, ry, a0 = -90) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((a0 + (i * 360) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

const cutRect = (x0, y0, x1, y1, c) => [
  [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
];

function pear() {
  const cx = 20.5, cy = 24.5, r = 14.5;
  const pts = [[20.5, 2.5]];
  for (let a = -38; a <= 218; a += 32) pts.push([cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r]);
  return pts;
}

const GEMS = {
  gem_green: () => gem(cutRect(7.5, 3, 33.5, 38, 6), { base: '#22b864', center: [20.5, 20.5], k: 0.5, steps: true }),
  gem_orange: () => gem(ring(6, 20.5, 20.5, 18.5, 17, 0), { base: '#ff8a1e', center: [20.5, 20.5], k: 0.55 }),
  gem_purple: () => gem(ring(12, 20.5, 20.5, 14.5, 18.5), { base: '#9a4cf0', center: [20.5, 20.5], k: 0.5 }),
  gem_red: () => gem(cutRect(3.5, 4, 37.5, 37, 9), { base: '#e3263e', center: [20.5, 20.5], k: 0.52, steps: true }),
  gem_white: () => gem(ring(16, 20.5, 20.5, 18, 18), { base: '#cfeaff', center: [20.5, 20.5], k: 0.55, fire: true, star: true }),
  gem_yellow: () => gem(pear(), { base: '#ffcc1f', center: [20.5, 22.5], k: 0.5 }),
};

// ---------------------------------------------------------------- secret treasures

const GOLD = [[0, '#fff5c4'], [0.4, C.uiGold], [1, C.uiGoldDark]];
const goldFill = (ctx, dir = {}) => {
  const [d, u] = linear(GOLD, dir);
  ctx.defs += d;
  return u;
};
const jewel = (ctx, cx, cy, r, color, sw, ry = r) => {
  const [d, u] = radial([[0, shade(color, 0.7)], [0.45, color], [1, shade(color, -0.45)]], { cx: 0.35, cy: 0.32, r: 0.75 });
  ctx.defs += d;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}" ${attrs({ fill: u, stroke: C.ink, 'stroke-width': sw * 0.6 })}/><ellipse cx="${fmt(cx - r * 0.35)}" cy="${fmt(cy - ry * 0.4)}" rx="${fmt(r * 0.3)}" ry="${fmt(ry * 0.2)}" fill="#ffffff" opacity="0.85"/>`;
};
const pearl = (ctx, cx, cy, r, sw) => {
  const [d, u] = radial([[0, '#ffffff'], [0.55, '#f3ece0'], [1, '#c9bfd6']], { cx: 0.35, cy: 0.32, r: 0.75 });
  ctx.defs += d;
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${r}" ${attrs({ fill: u, stroke: C.ink, 'stroke-width': sw * 0.5 })}/>`;
};
const st = (fill, sw) => attrs({ fill, stroke: C.ink, 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });

/** Each secret draws in its large-image coordinates; sw is the outline width in those units. */
const SECRETS = {
  crown: {
    w: 81,
    h: 72,
    draw(ctx, sw) {
      let o = '';
      // Velvet cap peeking between the points.
      o += `<path d="M14,44 Q40.5,8 67,44 Z" ${st('#a3203a', sw)}/>`;
      o += `<path d="M24,36 Q40.5,16 56,34" fill="none" stroke="#e86a7e" stroke-width="${sw}" stroke-linecap="round" opacity="0.7"/>`;
      const g = goldFill(ctx);
      o += `<path d="M11,48 L5,19 L16,32 L23,13 L32,29 L40.5,8 L49,29 L58,13 L65,32 L76,19 L70,48 Z" ${st(g, sw)}/>`;
      // Lit left faces of the points.
      o += `<path d="M7.5,23 L14,38 L12,46 Z M23,16 L28,33 L22,40 Z M40.5,11 L45,32 L39,38 Z M58,16 L62,33 L56,38 Z M74,23 L68,40 L66,34 Z" fill="#fff6cc" opacity="0.55"/>`;
      // Band.
      const gb = goldFill(ctx);
      o += `<path d="M9,45 Q40.5,55 72,45 L70,61 Q40.5,71 11,61 Z" ${st(gb, sw)}/>`;
      o += `<path d="M12,49 Q40.5,58 69,49" fill="none" stroke="#fff6cc" stroke-width="${sw * 0.8}" stroke-linecap="round" opacity="0.8"/>`;
      o += `<path d="M12,58 Q40.5,67 69,58" fill="none" stroke="${C.uiGoldDark}" stroke-width="${sw * 0.7}" stroke-linecap="round"/>`;
      // Jewels on the band and pearls on the tips.
      o += jewel(ctx, 40.5, 57, 6, C.uiRed, sw, 5.2);
      o += jewel(ctx, 24, 55.5, 4, '#2f7bff', sw) + jewel(ctx, 57, 55.5, 4, '#2f7bff', sw);
      o += jewel(ctx, 13.5, 52.5, 2.6, C.uiGreen, sw) + jewel(ctx, 67.5, 52.5, 2.6, C.uiGreen, sw);
      for (const [x, y, r] of [[5, 17, 3.4], [23, 11, 3.4], [40.5, 6, 4.2], [58, 11, 3.4], [76, 17, 3.4]]) o += pearl(ctx, x, y, r, sw);
      return o;
    },
  },
  figurine: {
    w: 56,
    h: 91,
    draw(ctx, sw) {
      let o = '';
      // Pedestal (sea-green stone).
      const [pd, pu] = linear([[0, '#5fd1b8'], [1, '#1f6b5c']]);
      ctx.defs += pd;
      o += `<path d="M13,72 H43 L47,80 H9 Z" ${st(pu, sw)}/>`;
      o += `<rect x="5" y="79.5" width="46" height="9.5" rx="2.5" ${st(pu, sw)}/>`;
      o += `<path d="M9,82 H47" stroke="#b9fff0" stroke-width="${sw * 0.6}" opacity="0.6" stroke-linecap="round"/>`;
      const g = goldFill(ctx, { x1: 0, y1: 0, x2: 1, y2: 1 });
      // Tail fin (fans out on the pedestal, left), then tail.
      o += `<path d="${smoothPath([[22, 66], [9, 59], [6, 66], [11, 71], [6, 76], [20, 74], [27, 71]], true, 0.35)}" ${st(g, sw)}/>`;
      o += `<path d="M10,64 L19,68 M9,72 L19,71" stroke="${C.uiGoldDark}" stroke-width="${sw * 0.6}" stroke-linecap="round"/>`;
      o += `<path d="${smoothPath([[20, 43], [36, 43], [39, 54], [35, 64], [27, 71], [20, 70], [26, 63], [24, 54]], true, 0.45)}" ${st(g, sw)}/>`;
      // Scales.
      for (const [x, y] of [[27, 48], [33, 49], [30, 54], [35, 55], [28, 60], [33, 61], [29, 66]]) o += `<path d="M${x - 2.4},${y} q2.4,3 4.8,0" fill="none" stroke="${C.uiGoldDark}" stroke-width="${sw * 0.55}" stroke-linecap="round"/>`;
      // Hair (behind the body), torso.
      o += `<path d="${smoothPath([[28, 11], [38, 15], [39, 27], [41, 38], [35, 36], [28, 30], [21, 36], [15, 38], [17, 27], [18, 15]], true, 0.4)}" ${st(shade(C.uiGold, -0.15), sw)}/>`;
      o += `<path d="${smoothPath([[23, 29], [33, 29], [36, 38], [36, 45], [20, 45], [20, 38]], true, 0.35)}" ${st(g, sw)}/>`;
      o += `<path d="M22,44 Q28,47 34,44" fill="none" stroke="${C.uiGoldDark}" stroke-width="${sw * 0.7}" stroke-linecap="round"/>`;
      // Arms raised to hold the orb.
      o += `<path d="M23,32 Q15,24 23,12" fill="none" stroke="${C.ink}" stroke-width="${4 + sw * 2}" stroke-linecap="round"/><path d="M23,32 Q15,24 23,12" fill="none" stroke="${C.uiGold}" stroke-width="4" stroke-linecap="round"/>`;
      o += `<path d="M33,32 Q41,24 33,12" fill="none" stroke="${C.ink}" stroke-width="${4 + sw * 2}" stroke-linecap="round"/><path d="M33,32 Q41,24 33,12" fill="none" stroke="${shade(C.uiGold, -0.1)}" stroke-width="4" stroke-linecap="round"/>`;
      // Head with a calm face.
      const [hd, hu] = radial([[0, '#fff5c4'], [0.6, C.uiGold], [1, C.uiGoldDark]], { cx: 0.4, cy: 0.35, r: 0.7 });
      ctx.defs += hd;
      o += `<circle cx="28" cy="21" r="7.2" ${st(hu, sw)}/>`;
      o += `<path d="M24.2,20.5 q1.4,1.3 2.8,0 M29,20.5 q1.4,1.3 2.8,0 M26.4,24.4 q1.6,1.2 3.2,0" fill="none" stroke="${C.ink}" stroke-width="${sw * 0.55}" stroke-linecap="round"/>`;
      // Shell tiara.
      o += `<path d="M24,15 L28,10.5 L32,15 Z" ${st('#ffd9e0', sw * 0.6)}/>`;
      // The orb: a ruby held overhead.
      o += jewel(ctx, 28, 7, 5.5, C.uiRed, sw);
      // Sheen down the body.
      o += `<path d="M24,33 Q22,39 23,43 M33,47 Q36,53 34,59" fill="none" stroke="#fff6cc" stroke-width="${sw * 0.8}" stroke-linecap="round" opacity="0.8"/>`;
      return o;
    },
  },
  necklace: {
    w: 48,
    h: 86,
    draw(ctx, sw) {
      let o = '';
      const P = (t) => {
        const a = t * Math.PI * 2;
        const wide = 1 - 0.18 * (1 - Math.cos(a)) * 0.5 * (Math.cos(a) < 0 ? 1.4 : 0);
        return [24 + 19 * Math.sin(a) * wide, 34 - 29 * Math.cos(a)];
      };
      // Gold thread.
      let d = '';
      for (let i = 0; i <= 60; i++) {
        const [x, y] = P(i / 60);
        d += `${i ? 'L' : 'M'}${fmt(x)},${fmt(y)} `;
      }
      o += `<path d="${d}Z" fill="none" stroke="${C.uiGoldDark}" stroke-width="${sw * 0.7}"/>`;
      // Pearls, skipping the clasp (top) and the pendant mount (bottom).
      const N = 26;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        if (t < 0.035 || t > 0.965 || Math.abs(t - 0.5) < 0.03) continue;
        const [x, y] = P(t);
        o += pearl(ctx, x, y, 3, sw);
      }
      // Clasp.
      const g = goldFill(ctx);
      o += `<rect x="20.5" y="2" width="7" height="5" rx="1.5" ${st(g, sw * 0.7)}/>`;
      // Pendant: bail, gold teardrop setting, sapphire.
      o += `<circle cx="24" cy="64.5" r="2.6" ${st(g, sw * 0.7)}/>`;
      o += `<path d="${smoothPath([[24, 66.5], [33, 76], [24, 85], [15, 76]], true, 0.5)}" ${st(goldFill(ctx), sw)}/>`;
      o += `<path d="${smoothPath([[24, 69.5], [30.5, 76.3], [24, 82.3], [17.5, 76.3]], true, 0.5)}" ${st('#2557d6', sw * 0.6)}/>`;
      o += `<path d="M24,69.5 L24,82.3 M17.6,76.3 L30.4,76.3" stroke="#9fc4ff" stroke-width="0.6" opacity="0.7"/>`;
      o += `<ellipse cx="21.8" cy="74" rx="1.8" ry="1" fill="#ffffff" opacity="0.85" transform="rotate(-40 21.8 74)"/>`;
      return o;
    },
  },
  scepter: {
    w: 85,
    h: 90,
    draw(ctx, sw) {
      let o = '';
      const x0 = 10, y0 = 82, x1 = 56, y1 = 34;
      const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
      const len = Math.hypot(x1 - x0, y1 - y0);
      // Shaft drawn along +x, then rotated.
      let s = `<rect x="0" y="-3" width="${fmt(len)}" height="6" rx="3" ${st(goldFill(ctx), sw)}/>`;
      s += `<path d="M3,-1.4 H${fmt(len - 3)}" stroke="#fff6cc" stroke-width="${sw * 0.7}" stroke-linecap="round" opacity="0.85"/>`;
      for (const t of [0.12, 0.42, 0.7]) s += `<rect x="${fmt(len * t - 2.5)}" y="-4.6" width="5" height="9.2" rx="2" ${st(goldFill(ctx), sw * 0.8)}/>`;
      s += `<rect x="${fmt(len * 0.5)}" y="-3.3" width="${fmt(len * 0.17)}" height="6.6" rx="2" ${st('#7a3fb0', sw * 0.7)}/>`;
      o += `<g transform="translate(${x0},${y0}) rotate(${fmt(ang)})">${s}</g>`;
      // Bottom finial.
      o += jewel(ctx, 8, 84, 4, C.uiGold, sw);
      // Head: curled gold wings, cup, big amethyst orb, small cross.
      const g = goldFill(ctx);
      o += `<path d="${smoothPath([[58, 32], [46, 30], [42, 22], [47, 16], [52, 21], [49, 25], [55, 27]], true, 0.4)}" ${st(g, sw)}/>`;
      o += `<path d="${smoothPath([[66, 32], [78, 30], [82, 22], [77, 16], [72, 21], [75, 25], [69, 27]], true, 0.4)}" ${st(g, sw)}/>`;
      o += `<path d="M53,30 Q62,40 71,30 L68,26 H56 Z" ${st(goldFill(ctx), sw)}/>`;
      o += jewel(ctx, 62, 18, 10, '#9a4cf0', sw);
      o += `<path d="M55,22 Q62,30 69,22" fill="none" stroke="${C.ink}" stroke-width="${sw * 0.5}" opacity="0.4"/>`;
      // Gold prongs over the orb.
      o += `<path d="M53,25 Q52,15 57,9 M71,25 Q72,15 67,9 M62,28 V8" fill="none" stroke="${C.ink}" stroke-width="${2.4 + sw * 1.4}" stroke-linecap="round"/>`;
      o += `<path d="M53,25 Q52,15 57,9 M71,25 Q72,15 67,9 M62,28 V8" fill="none" stroke="${C.uiGold}" stroke-width="2.4" stroke-linecap="round"/>`;
      o += `<path d="M62,1.5 V8.5 M58.5,4.8 H65.5" stroke="${C.ink}" stroke-width="${2.6 + sw * 1.2}" stroke-linecap="round"/><path d="M62,1.5 V8.5 M58.5,4.8 H65.5" stroke="${C.uiGold}" stroke-width="2.6" stroke-linecap="round"/>`;
      return o;
    },
  },
};

function secretLarge(key) {
  return () => {
    const s = SECRETS[key];
    const ctx = { defs: '' };
    const body = s.draw(ctx, 2);
    return svg(s.w, s.h, body, ctx.defs);
  };
}

function secretIcon(key) {
  return () => {
    const s = SECRETS[key];
    const ctx = { defs: '' };
    const k = Math.min(39 / s.w, 39 / s.h);
    const body = s.draw(ctx, 1.4 / k);
    const tx = (41 - s.w * k) / 2, ty = (41 - s.h * k) / 2;
    return svg(41, 41, `<g transform="translate(${fmt(tx)},${fmt(ty)}) scale(${fmt(k)})">${body}</g>`, ctx.defs);
  };
}

// ---------------------------------------------------------------- sparkle (additive)

function sparkle() {
  let defs = '';
  const fid = id('blur');
  defs += `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  const body = strip(14, 40, 40, (i) => {
    const s = Math.sin((Math.PI * (i + 1)) / 15); // small at both ends, peak mid-strip
    const L = 3 + 15.5 * s;
    const rotA = i * 2.5;
    const ray = (len, w, deg, fill, op = 1) =>
      `<path d="M0,${-len} L${w},${-w} L0,0 L${-w},${-w} Z" fill="${fill}" opacity="${op}" transform="rotate(${deg})"/>`;
    let o = `<g transform="translate(20,20) rotate(${fmt(rotA)})">`;
    o += `<circle r="${fmt(2 + 7 * s)}" fill="#ffd36b" opacity="${fmt(0.55 * s + 0.15)}" filter="url(#${fid})"/>`;
    for (const d of [45, 135, 225, 315]) o += ray(L * 0.5, 0.9 + 0.7 * s, d, '#ffd970', 0.85);
    for (const d of [0, 90, 180, 270]) o += ray(L, 1 + 0.8 * s, d, '#ffffff');
    o += `<circle r="${fmt(1.2 + 1.8 * s)}" fill="#ffffff"/>`;
    o += '</g>';
    return o;
  });
  return svg(560, 40, body, defs);
}

// ---------------------------------------------------------------- exports

const images = { shipwreckbonus, airgauge, sparkle_large: sparkle };
for (const [name, fn] of Object.entries(GEMS)) {
  images[name] = () => {
    const r = fn();
    return svg(41, 41, r.out, r.defs);
  };
}
for (const key of Object.keys(SECRETS)) {
  images[`secret_${key}`] = secretIcon(key);
  images[`secret_${key}_lrg`] = secretLarge(key);
}
export default images;
