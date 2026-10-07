// Shared drawing for the boss module: the four bosses, their animated parts and the
// projectiles. Every function returns { out, defs } in the image's own logical coordinates
// so bosses.mjs can use them both full size and as thumbnails (abyss_boss trophy card).
//
// Bosses face LEFT (toward the diver). Layout-coupled spots (tubes, hit boxes, part
// offsets) match the game code in src/game/boss.ts; see comments per boss.

import { C, STROKE, ink, shade, mix, linear, radial, smoothPath, rot, id, rng, fmt } from './lib.mjs';

// ---------------------------------------------------------------- small helpers

export const P = (d, fill, w = STROKE, extra = {}) => `<path d="${d}" ${ink(fill, w, extra)}/>`;
export const poly = (pts) => 'M' + pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L') + 'Z';
const line = (pts) => 'M' + pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L');

/** Gaussian blur filter. Returns [defs, 'url(#..)']. */
export function blur(sd) {
  const fid = id('blur');
  return [`<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`, `url(#${fid})`];
}

/** Clip path from a path d. Returns [defs, 'url(#..)']. */
export function clip(d) {
  const cid = id('clp');
  return [`<clipPath id="${cid}"><path d="${d}"/></clipPath>`, `url(#${cid})`];
}

export function rivets(pts, r = 1.4, fill = C.steel2) {
  return pts.map(([x, y]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${r}" fill="${fill}" stroke="${C.ink}" stroke-width="0.6"/>`).join('');
}

/** Little skull and crossbones, centred at (cx, cy), roughly 2.4*s wide. */
export function skull(cx, cy, s = 10, bone = '#f4efe0', ink2 = C.ink) {
  const bw = s * 0.36;
  let o = '';
  for (const a of [35, -35]) {
    const [x1, y1] = rot([cx - s * 1.25, cy + s * 0.15], [cx, cy + s * 0.15], a);
    const [x2, y2] = rot([cx + s * 1.25, cy + s * 0.15], [cx, cy + s * 0.15], a);
    o += `<path d="M${fmt(x1)},${fmt(y1)} L${fmt(x2)},${fmt(y2)}" stroke="${ink2}" stroke-width="${bw + 2}" stroke-linecap="round"/>`;
    o += `<path d="M${fmt(x1)},${fmt(y1)} L${fmt(x2)},${fmt(y2)}" stroke="${bone}" stroke-width="${bw}" stroke-linecap="round"/>`;
    for (const [x, y] of [[x1, y1], [x2, y2]]) o += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(bw * 0.75)}" fill="${bone}" stroke="${ink2}" stroke-width="0.8"/>`;
  }
  const head = `M${cx - s * 0.8},${cy - s * 0.1} a${s * 0.8},${s * 0.78} 0 1 1 ${s * 1.6},0 v${s * 0.42} h${-s * 0.3} v${s * 0.3} h${-s} v${-s * 0.3} h${-s * 0.3}Z`;
  o += `<path d="${head}" fill="${bone}" stroke="${ink2}" stroke-width="1.2" stroke-linejoin="round"/>`;
  o += `<circle cx="${cx - s * 0.33}" cy="${cy - s * 0.05}" r="${s * 0.23}" fill="${ink2}"/><circle cx="${cx + s * 0.33}" cy="${cy - s * 0.05}" r="${s * 0.23}" fill="${ink2}"/>`;
  o += `<path d="M${cx},${cy + s * 0.18} l${-s * 0.1},${s * 0.18} h${s * 0.2}z" fill="${ink2}"/>`;
  return o;
}

/** Soft smoke puff cluster (no outline). */
export function smoke(cx, cy, r, seed = 1, op = 0.75, col = '#6c7480') {
  const R = rng(seed);
  let o = '';
  for (let i = 0; i < 5; i++) {
    const a = R() * Math.PI * 2;
    const d = R() * r * 0.6;
    o += `<circle cx="${fmt(cx + Math.cos(a) * d)}" cy="${fmt(cy + Math.sin(a) * d)}" r="${fmt(r * (0.45 + R() * 0.35))}" fill="${shade(col, R() * 0.2)}" opacity="${op}"/>`;
  }
  return o;
}

/** Four-point cartoon spark. */
export function spark(cx, cy, r, col = '#fff36b') {
  const k = r * 0.28;
  return `<path d="M${cx},${cy - r} L${cx + k},${cy - k} L${cx + r},${cy} L${cx + k},${cy + k} L${cx},${cy + r} L${cx - k},${cy + k} L${cx - r},${cy} L${cx - k},${cy - k}Z" fill="${col}" stroke="${C.ink}" stroke-width="0.8" stroke-linejoin="round"/>`;
}

/** Jagged crack line from a seed point. */
export function crack(x, y, len, ang, seed = 3, w = 1.4) {
  const R = rng(seed);
  const pts = [[x, y]];
  let a = (ang * Math.PI) / 180;
  for (let i = 0; i < 5; i++) {
    a += (R() - 0.5) * 1.2;
    const [px, py] = pts[pts.length - 1];
    pts.push([px + Math.cos(a) * (len / 5), py + Math.sin(a) * (len / 5)]);
  }
  return `<path d="${line(pts)}" fill="none" stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/** A row of triangular teeth along segment a->b, tips offset by n (normal side +1/-1). */
function teeth(a, b, count, h, side, fill = '#eef3f7') {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const nx = (-dy / L) * side, ny = (dx / L) * side;
  let o = '';
  for (let i = 0; i < count; i++) {
    const t0 = i / count, t1 = (i + 1) / count, tm = (t0 + t1) / 2;
    const p0 = [a[0] + dx * t0, a[1] + dy * t0];
    const p1 = [a[0] + dx * t1, a[1] + dy * t1];
    const pm = [a[0] + dx * tm + nx * h, a[1] + dy * tm + ny * h];
    o += `<path d="${poly([p0, pm, p1])}" fill="${fill}" stroke="${C.ink}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  return o;
}

/** Side view of a propeller with 3 blades, spinning by phase t (one blade spacing per loop). */
export function propeller(cx, cy, R, t, { blade = C.brass, hub = C.uiRed, hubRx = 4, hubRy = 7, bladeW = 6 } = {}) {
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const phi = t * ((Math.PI * 2) / 3) + (k * Math.PI * 2) / 3;
    const L = Math.cos(phi) * R;
    const depth = Math.sin(phi);
    const w = Math.abs(depth) * bladeW + 1.6;
    parts.push({ L, depth, w });
  }
  const draw = ({ L, depth, w }) => {
    if (Math.abs(L) < 2.5) return `<ellipse cx="${cx + 1}" cy="${cy}" rx="${fmt(w * 0.6)}" ry="3" ${ink(shade(blade, depth > 0 ? -0.3 : 0.1), 1.2)}/>`;
    const tip = [cx + 1, cy - L];
    const pts = [[cx - w * 0.4, cy], [cx - w, cy - L * 0.55], tip, [cx + w, cy - L * 0.5], [cx + w * 0.4, cy]];
    const fill = depth > 0 ? shade(blade, -0.3) : blade;
    let o = `<path d="${smoothPath(pts, true, 0.35)}" ${ink(fill, 1.3)}/>`;
    if (depth <= 0) o += `<path d="M${fmt(cx + 1 - w * 0.3)},${fmt(cy - L * 0.25)} L${fmt(cx + 1 - w * 0.3)},${fmt(cy - L * 0.75)}" stroke="#fff" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="round"/>`;
    return o;
  };
  let o = parts.filter((p) => p.depth > 0).map(draw).join('');
  o += `<ellipse cx="${cx}" cy="${cy}" rx="${hubRx}" ry="${hubRy}" ${ink(hub, 1.3)}/><ellipse cx="${cx - hubRx * 0.3}" cy="${cy - hubRy * 0.4}" rx="${hubRx * 0.35}" ry="${hubRy * 0.25}" fill="#fff" opacity="0.6"/>`;
  o += parts.filter((p) => p.depth <= 0).map(draw).join('');
  return o;
}

// ---------------------------------------------------------------- pirate submarine (250x155)
// Hit box A x 25..218 y 53..153; tower box x 80..155 y 1..46. Tubes at y 65/101/135 on the
// bow. The rotor strip (22x81) is drawn over the stern at (227, 54): hub near (238, 95).

const SUB_HULL = [[6, 104], [14, 74], [40, 56], [90, 50], [160, 52], [205, 62], [226, 84], [236, 96], [226, 110], [204, 134], [150, 150], [80, 152], [30, 144], [10, 126]];

export function sub({ dying = false } = {}) {
  const dk = dying ? -0.32 : 0;
  const base = shade('#5d6f86', dk);
  const [g1, u1] = linear([[0, shade(base, 0.35)], [0.4, base], [1, shade(base, -0.45)]]);
  const [g2, u2] = linear([[0, shade(base, 0.3)], [1, shade(base, -0.2)]]);
  const hull = smoothPath(SUB_HULL, true, 0.5);
  const [cd, cu] = clip(hull);
  let defs = g1 + g2 + cd;
  let out = '';
  const fin = shade(C.uiRed, dying ? -0.45 : -0.15);

  // Flag and periscope (behind the tower).
  if (!dying) {
    out += `<path d="M146,20 L146,1.5" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>`;
    out += P('M147,2 Q155,-0.5 162,3 T176,3 L174,16 Q167,13 160,16 T147,14 Z', '#20222c', 1.4);
    out += skull(161, 8.5, 3.4);
    out += P('M98,20 L98,7 L104,7 L104,20 Z', shade(base, -0.1), 1.5);
    out += P('M86,2.5 L105,2.5 L105,11 L86,11 Z', shade(base, 0.1), 1.5);
    out += `<circle cx="89.5" cy="6.8" r="2.4" fill="#9ff2ff" stroke="${C.ink}" stroke-width="0.9"/>`;
  } else {
    out += `<path d="M146,20 L148,8 L156,4" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    out += P('M156,4 L168,9 L163,12 L167,17 L157,15 Z', '#20222c', 1.2);
    out += P('M98,20 L98,12 L92,6 L96,3 L104,11 L104,20 Z', shade(base, -0.1), 1.5);
  }

  // Tower.
  const tower = 'M88,58 L92,26 Q94,18 102,18 L142,18 Q150,18 152,26 L156,58 Z';
  out += P(tower, u2);
  out += `<path d="M93,24 L151,24" stroke="${shade(base, 0.45)}" stroke-width="1.6" opacity="0.7"/>`;
  out += rivets([[96, 50], [108, 50], [120, 50], [132, 50], [144, 50]], 1.2);
  for (const x of [106, 122, 138]) {
    out += `<circle cx="${x}" cy="35" r="5.4" ${ink(C.brass, 1.4)}/>`;
    out += dying ? `<circle cx="${x}" cy="35" r="3.4" fill="#1a1d26"/>` : `<circle cx="${x}" cy="35" r="3.4" fill="#ffd86b"/><circle cx="${x - 1}" cy="34" r="1.1" fill="#fff"/>`;
  }
  if (dying) out += crack(118, 20, 18, 80, 5, 1.2);

  // Stern fins (red, piratey), behind the hull.
  out += P('M188,64 L202,36 L222,34 L220,46 L214,84 Z', fin);
  out += P('M186,134 L202,153 L222,153 L220,143 L214,116 Z', fin);

  // Hull.
  out += P(hull, u1);
  out += `<g clip-path="${cu}">`;
  out += `<path d="M0,132 Q120,140 250,112 L250,160 L0,160Z" fill="${shade(base, -0.5)}" opacity="0.55"/>`;
  out += `<path d="M24,66 Q110,48 214,72" fill="none" stroke="#fff" stroke-opacity="${dying ? 0.12 : 0.28}" stroke-width="7" stroke-linecap="round"/>`;
  for (const x of [80, 128, 178]) {
    out += `<path d="M${x},44 Q${x - 7},100 ${x},158" fill="none" stroke="${shade(base, -0.45)}" stroke-width="1.4"/>`;
    const rv = [];
    for (let y = 60; y < 150; y += 13) rv.push([x - 4 - Math.sin(((y - 44) / 114) * Math.PI) * 3, y]);
    out += rivets(rv, 1.1, shade(C.steel2, dk));
    // rust drips under two rivets
    out += `<path d="M${x - 5},${74} q1,10 -1,18" stroke="${C.rust}" stroke-width="2.2" opacity="0.5" stroke-linecap="round" fill="none"/>`;
  }
  // Painted shark grin on the bow.
  out += `<path d="M24,110 Q52,126 84,110 Q66,134 32,126 Z" fill="#6e1626" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
  out += teeth([26, 111], [82, 111.5], 7, 6, 1, dying ? '#c9c4b6' : '#f4efe0');
  out += teeth([36, 126], [70, 124], 4, -5, 1, dying ? '#c9c4b6' : '#f4efe0');
  if (dying) {
    const R = rng(11);
    for (let i = 0; i < 9; i++) out += `<ellipse cx="${fmt(30 + R() * 190)}" cy="${fmt(60 + R() * 85)}" rx="${fmt(8 + R() * 14)}" ry="${fmt(5 + R() * 8)}" fill="#14161c" opacity="0.4"/>`;
    out += crack(100, 60, 40, 70, 7) + crack(170, 80, 34, 110, 9) + crack(60, 140, 28, -60, 13) + crack(200, 120, 22, 200, 17);
    out += `<path d="M150,80 l10,6 l-4,8 l9,5" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;
  }
  out += `</g><path d="${hull}" fill="none" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;

  // Emblem.
  out += skull(132, 98, 12, dying ? '#bdb7a8' : '#f4efe0');

  // Angry eye porthole.
  if (!dying) {
    const [gr, gu] = radial([[0, '#fff2b0'], [0.45, '#ff8a3c'], [1, '#c4231c']]);
    defs += gr;
    out += `<circle cx="54" cy="84" r="13" ${ink(C.brass)}/><circle cx="54" cy="84" r="9" fill="${gu}" stroke="${C.ink}" stroke-width="1.2"/><circle cx="51" cy="81" r="2.4" fill="#fff" opacity="0.85"/>`;
  } else {
    out += `<circle cx="54" cy="84" r="13" ${ink(shade(C.brass, -0.4))}/><circle cx="54" cy="84" r="9" fill="#23262e" stroke="${C.ink}" stroke-width="1.2"/>`;
    out += `<path d="M49,79 l10,10 M59,79 l-10,10" stroke="#e8e2d0" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  out += P('M36,67 L74,73 L72,80 L35,74 Z', shade(base, -0.3), 1.6);
  out += rivets([[40, 70.5], [68, 75]], 1.1);

  // Torpedo tubes on the bow face.
  for (const [x, y] of [[16, 70], [9, 104], [16, 134]]) {
    out += P(`M${x - 6},${y - 8} L${x + 8},${y - 8} L${x + 8},${y + 8} L${x - 6},${y + 8} Z`, shade(C.steel0, dk), 1.6);
    out += `<ellipse cx="${x - 6}" cy="${y}" rx="4" ry="8" ${ink(dying ? shade(C.brass, -0.4) : C.brass, 1.5)}/><ellipse cx="${x - 6.5}" cy="${y}" rx="2.3" ry="5.4" fill="#0b1020"/>`;
  }
  // Prop shaft collar.
  out += P('M222,88 L232,88 L232,104 L222,104 Z', shade(C.brass, dying ? -0.4 : -0.1), 1.5);

  if (dying) {
    // Bent, stopped propeller and smoke.
    out += P('M233,96 L236,72 L242,70 L240,96 Z', shade(C.brass, -0.4), 1.4);
    out += P('M233,96 L246,112 L240,118 L232,100 Z', shade(C.brass, -0.4), 1.4);
    out += `<ellipse cx="236" cy="96" rx="4" ry="7" ${ink(shade(C.uiRed, -0.45), 1.3)}/>`;
    out += smoke(116, 10, 12, 3, 0.7) + smoke(134, 6, 9, 4, 0.55) + smoke(196, 88, 10, 5, 0.6) + smoke(60, 58, 9, 6, 0.55);
    out += spark(176, 104, 6) + spark(92, 132, 5, '#ffb347') + spark(146, 40, 4);
  }
  return { out, defs };
}

/** torpedo_boss_rotor frame: 22x81, hub at (11, 41). */
export function subRotor(t) {
  return { out: propeller(10, 41, 35, t, { blade: C.brass, hub: C.uiRed, hubRx: 5, hubRy: 9, bladeW: 7 }), defs: '' };
}

// ---------------------------------------------------------------- mecha shark (184x217)
// Hit box A x 28..184 y 65..210; dorsal fin box x 111..156 y 4..70. Tubes (projectile tops)
// at y 98/131/165. Tail strip (39x98) is drawn at (184, 60), so the body ends at x 184 with
// a hazard-striped collar around y 76..150.

const MECHA_BODY = [[184, 72], [124, 60], [64, 62], [28, 74], [4, 92], [8, 100], [72, 124], [22, 170], [12, 184], [40, 200], [96, 208], [150, 196], [184, 164]];

export function mecha({ dead = false } = {}) {
  const base = dead ? '#626f80' : '#8494a8';
  const [g1, u1] = linear([[0, shade(base, 0.4)], [0.5, base], [1, shade(base, -0.35)]]);
  const body = poly(MECHA_BODY);
  const [cd, cu] = clip(body);
  let defs = g1 + cd;
  let out = '';
  const finCol = shade(base, -0.12);

  // Dorsal fin and lower fins behind the body.
  out += P(poly([[110, 72], [128, 34], [150, 4], [155, 12], [150, 44], [158, 72]]), finCol);
  out += `<path d="M131,32 L146,16" stroke="#fff" stroke-opacity="0.4" stroke-width="2" stroke-linecap="round"/>`;
  out += P(poly([[98, 196], [120, 215], [136, 214], [134, 194]]), finCol);
  out += P(poly([[150, 188], [164, 206], [172, 204], [174, 180]]), finCol);

  // Mouth interior (behind the jaws).
  const [gm, um] = radial([[0, dead ? '#3a1a1a' : '#ff7b3c'], [0.35, dead ? '#2a1214' : '#a3241c'], [1, '#2a0a12']], { cx: 0.6, cy: 0.5, r: 0.6 });
  defs += gm;
  out += P(poly([[6, 97], [78, 122], [18, 174]]), um);

  out += P(body, u1);
  out += `<g clip-path="${cu}">`;
  // Light belly plate and armour seams.
  out += `<path d="M0,176 L60,170 L184,140 L184,220 L0,220Z" fill="${shade(base, 0.45)}"/>`;
  out += `<path d="M0,176 L60,170 L184,140" fill="none" stroke="${shade(base, -0.45)}" stroke-width="1.5"/>`;
  out += `<path d="M40,66 L104,62 L128,104 L118,196" fill="none" stroke="${shade(base, -0.45)}" stroke-width="1.5"/>`;
  out += `<path d="M30,76 L96,66" stroke="#fff" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>`;
  // Gill vents.
  for (let i = 0; i < 3; i++) out += P(`M${136 + i * 10},${96} l-6,40 l4,0 l6,-40 z`, '#1d2430', 1.2);
  // Hazard collar where the tail plugs in.
  out += `<rect x="168" y="70" width="20" height="96" fill="${C.diverYellow}"/>`;
  for (let k = 0; k < 9; k++) out += `<path d="M168,${68 + k * 12} l20,-10 v6 l-20,10z" fill="${C.ink}"/>`;
  out += `<path d="M168,70 L168,170" stroke="${C.ink}" stroke-width="1.6"/>`;
  if (dead) {
    const R = rng(21);
    for (let i = 0; i < 8; i++) out += `<ellipse cx="${fmt(30 + R() * 140)}" cy="${fmt(70 + R() * 130)}" rx="${fmt(7 + R() * 12)}" ry="${fmt(5 + R() * 7)}" fill="#14161c" opacity="0.4"/>`;
    out += crack(84, 70, 40, 80, 3) + crack(150, 120, 36, 150, 8) + crack(60, 196, 24, -40, 12);
  }
  out += `</g><path d="${body}" fill="none" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
  out += rivets([[40, 72], [62, 67], [86, 65], [108, 64], [124, 98], [128, 140], [122, 182], [60, 190], [88, 198]], 1.5, C.brass);

  // Steel teeth.
  out += teeth([9, 101], [72, 124], 6, 9, 1);
  out += teeth([21, 170], [70, 126], 5, -8, 1);

  // Eye visor.
  out += P('M46,79 L88,86 L86,99 L50,93 Z', '#1a0d10', 1.6);
  if (!dead) {
    const [bd, bu] = blur(2.5);
    defs += bd;
    out += `<path d="M54,84 L82,89 L80,95 L56,91 Z" fill="#ff3b30" filter="${bu}"/>`;
    out += `<path d="M56,85 L81,89.5 L79.5,94 L57,90.5 Z" fill="#ff4a3a"/><path d="M60,86.5 L74,89 L73,91.5 L61,89.5 Z" fill="#ffe08a"/>`;
  } else {
    out += `<path d="M58,84 l10,9 M68,84 l-10,9" stroke="#c9d3dd" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  out += `<path d="M42,76 L92,84" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`;

  // Launch tubes: nose barrel (y~98), throat cannon (y~131), chin barrel (y~165+).
  const tube = (x, y, len, r) =>
    P(`M${x},${y - r} L${x + len},${y - r} L${x + len},${y + r} L${x},${y + r} Z`, C.steel0, 1.5) +
    `<ellipse cx="${x}" cy="${y}" rx="${r * 0.45}" ry="${r}" ${ink(C.brass, 1.4)}/><ellipse cx="${x - 0.4}" cy="${y}" rx="${r * 0.25}" ry="${r * 0.62}" fill="#0b1020"/>`;
  out += tube(3, 96, 20, 6.5);
  out += `<circle cx="44" cy="138" r="9" ${ink(C.steel0, 1.5)}/><circle cx="44" cy="138" r="5.5" fill="${dead ? '#0b1020' : '#ffb347'}" stroke="${C.ink}" stroke-width="1"/>`;
  out += tube(8, 180, 20, 6.5);

  if (dead) {
    out += spark(118, 92, 6) + spark(70, 160, 5, '#ffb347') + spark(160, 40, 5);
    out += `<path d="M126,110 q6,-8 2,-16 q8,4 6,-12" fill="none" stroke="#7fe7ff" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  return { out, defs };
}

/** boss_mecha_fin frame: 39x98 tail, root at x 0, centre y 49. */
export function mechaFin(t, { droop = null } = {}) {
  const wag = droop ?? Math.sin(t * Math.PI * 2);
  const ang = wag * 9;
  const flex = Math.sin(t * Math.PI * 2 - 1) * 3;
  const base = '#7a8a9e';
  const pivot = [2, 49];
  const pts = [[-2, 30], [10, 30], [24, 18 + flex], [36, 10 + flex], [32, 30], [22, 49], [32, 70], [34, 88 - flex], [22, 80 - flex], [10, 68], [-2, 68]].map((p) => rot(p, pivot, ang));
  const [g, u] = linear([[0, shade(base, 0.35)], [1, shade(base, -0.3)]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  let out = P(poly(pts), u);
  const seam = [[12, 34], [21, 49], [12, 64]].map((p) => rot(p, pivot, ang));
  out += `<path d="${line(seam)}" fill="none" stroke="${shade(base, -0.45)}" stroke-width="1.3"/>`;
  out += rivets([rot([6, 40], pivot, ang), rot([6, 58], pivot, ang)], 1.3, C.brass);
  const hl = [[14, 31], [30, 16 + flex]].map((p) => rot(p, pivot, ang));
  out += `<path d="${line(hl)}" stroke="#fff" stroke-opacity="0.45" stroke-width="1.8" stroke-linecap="round"/>`;
  return { out, defs: g };
}

// ---------------------------------------------------------------- robo-squid (218x147)
// Boxes x 32..132 y 0..144 (tentacle cannons) and x 120..218 y 48..106 (mantle). Cannon mouths
// face left at the projectile spawn heights (y 7/58/120 tops). Fin strip (67x47) drawn at
// (217, 60), its root centred on y 82; eye strip (12x12) at (133, 80), socket centre (139, 86).

const SQ = { base: '#8a4fc0', back: '#5a2c88', belly: '#dcc6f4' };

function cannon(x, c, { scale = 1, angle = 0, dead = false } = {}) {
  const r = 13;
  let o = `<g transform="rotate(${angle} ${x + 24} ${c})">`;
  const [g, u] = linear([[0, '#7c8696'], [0.5, '#4a5462'], [1, '#262c38']]);
  o += P(`M${x + 44},${c - 10} L${x + 8},${c - r} L${x},${c - r - 3} L${x},${c + r + 3} L${x + 8},${c + r} L${x + 44},${c + 10} Z`, u, 1.8);
  o += `<circle cx="${x + 44}" cy="${c}" r="10" ${ink(C.brass, 1.6)}/><circle cx="${x + 44}" cy="${c}" r="4" fill="${shade(C.brass, -0.3)}"/>`;
  for (const bx of [16, 30]) o += `<rect x="${x + bx}" y="${c - r + 0.5}" width="4" height="${2 * r - 1}" ${ink(C.brass, 1.1)}/>`;
  o += `<ellipse cx="${x}" cy="${c}" rx="5" ry="${r + 3}" ${ink(C.brass, 1.6)}/><ellipse cx="${x - 0.5}" cy="${c}" rx="3" ry="${r - 1}" fill="#0b1020"/>`;
  if (!dead) o += `<ellipse cx="${x - 0.5}" cy="${c}" rx="1.6" ry="${r - 6}" fill="#3cff9c" opacity="0.45"/>`;
  o += `<path d="M${x + 10},${c - 9} L${x + 40},${c - 7}" stroke="#fff" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round"/>`;
  o += '</g>';
  void scale;
  return { out: o, defs: g };
}

function tentacle(d, w, col) {
  return `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${w + 4}" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${shade(col, -0.35)}" stroke-width="${w}" stroke-dasharray="1.6 5"/>`;
}

const SQ_MANTLE = [[128, 58], [170, 56], [204, 63], [221, 72], [223, 90], [206, 100], [170, 108], [128, 106]];

export function squid({ dead = false } = {}) {
  let out = '', defs = '';
  const add = (r) => { out += r.out; defs += r.defs; };
  const base = dead ? shade(SQ.base, -0.25) : SQ.base;
  const back = dead ? shade(SQ.back, -0.25) : SQ.back;
  const belly = dead ? shade(SQ.belly, -0.25) : SQ.belly;
  // Decorative thin tentacles.
  out += tentacle('M120,64 C112,36 96,8 72,4 C64,3 60,8 64,12', 4, base);
  out += tentacle('M120,100 C116,132 92,144 66,141 C58,140 56,134 62,132', 4, base);
  // Cannon arms.
  out += tentacle('M116,74 C98,70 100,26 82,26', 9, base);
  out += tentacle('M114,83 C100,83 98,76 82,76', 9, base);
  out += tentacle('M116,92 C98,100 100,126 82,126', 9, base);
  add(cannon(38, 26, { dead }));
  add(cannon(38, 76, { dead }));
  add(cannon(38, 126, { dead }));
  // Mantle.
  const md = smoothPath(SQ_MANTLE, true, 0.45);
  const [g, u] = linear([[0, shade(back, 0.1)], [0.45, base], [1, base]]);
  const [cd, cu] = clip(md);
  defs += g + cd;
  out += P(md, u);
  out += `<g clip-path="${cu}"><path d="M120,92 Q170,98 230,84 L230,120 L120,120Z" fill="${belly}"/>`;
  for (const x of [168, 196]) out += `<path d="M${x},50 Q${x + 5},82 ${x},112" fill="none" stroke="${shade(back, -0.3)}" stroke-width="1.4"/>`;
  out += `<path d="M138,64 Q176,58 210,70" stroke="#fff" stroke-opacity="0.35" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  out += `</g><path d="${md}" fill="none" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  out += rivets([[176, 66], [176, 98], [204, 70], [204, 95], [160, 62]], 1.3, C.brass);
  // Head.
  out += `<ellipse cx="128" cy="82" rx="20" ry="25" ${ink(shade(base, 0.08))}/>`;
  out += `<path d="M114,66 Q126,58 140,64" stroke="#fff" stroke-opacity="0.35" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  out += P('M146,60 Q152,82 146,104 L152,104 Q158,82 152,60 Z', C.brass, 1.5);
  out += rivets([[118, 72], [118, 94], [112, 83]], 1.2, C.brass);
  // Eye socket (eye strip draws on top at 133..145, 80..92).
  out += `<circle cx="139" cy="86" r="8.5" ${ink(C.brass, 1.6)}/><circle cx="139" cy="86" r="6" fill="#140a1e"/>`;
  out += P('M126,73 L148,77 L147,80 L126,77 Z', back, 1.2);
  if (dead) {
    out += `<path d="M135,82 l8,8 M143,82 l-8,8" stroke="#e8e0f0" stroke-width="2" stroke-linecap="round"/>`;
    out += crack(176, 60, 30, 90, 4) + crack(200, 96, 18, 200, 9);
  }
  return { out, defs };
}

/** boss_squid_fin frame: 67x47, root at x 0, centre y 22. */
export function squidFin(t) {
  const a = Math.sin(t * Math.PI * 2);
  const b = Math.sin(t * Math.PI * 2 - 1.3);
  const pts = [[-2, 7], [10, 6], [34, 3 + a * 2.5], [62, 22 + b * 5], [34, 43 - a * 2.5], [10, 38], [-2, 37]];
  const [g, u] = linear([[0, shade(SQ.back, 0.15)], [0.5, SQ.base], [1, SQ.belly]]);
  let out = P(smoothPath(pts, true, 0.18), u);
  out += `<path d="M4,22 Q34,${22 + b * 1.5} 58,${22 + b * 3}" fill="none" stroke="${shade(SQ.back, -0.2)}" stroke-width="1.3"/>`;
  out += `<path d="M14,9 Q28,${5 + a * 2} 40,${8 + a * 2}" stroke="#fff" stroke-opacity="0.4" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  out += rivets([[5, 14], [5, 30]], 1.2, C.brass);
  return { out, defs: g };
}

/** boss_squid_eye frame: 12x12; i 0 = wide open and bright .. 4 = nearly shut. */
export function squidEye(i) {
  const o = [1, 0.8, 0.55, 0.3, 0.1][i];
  const [cd, cu] = clip('M6,0.6 a5.4,5.4 0 1 1 -0.01,0 Z');
  const [gr, gu] = radial([[0, '#fffbd0'], [0.5, '#ffd23f'], [1, '#ff7b1c']]);
  let out = `<circle cx="6" cy="6" r="5.4" fill="#140a1e"/>`;
  out += `<g clip-path="${cu}"><ellipse cx="6" cy="6" rx="5.2" ry="5.2" fill="${gu}" opacity="${0.55 + 0.45 * o}"/>`;
  out += `<ellipse cx="6" cy="6" rx="1.2" ry="${fmt(3.4 * o + 0.4)}" fill="#2a0a12"/>`;
  out += `<circle cx="4.4" cy="4.2" r="1" fill="#fff" opacity="${o}"/>`;
  const lid = 5.6 * (1 - o);
  out += `<rect x="0" y="0" width="12" height="${fmt(0.6 + lid)}" fill="${SQ.back}"/><rect x="0" y="${fmt(11.4 - lid)}" width="12" height="${fmt(0.6 + lid)}" fill="${SQ.back}"/>`;
  out += `<path d="M0,${fmt(0.6 + lid)} H12 M0,${fmt(11.4 - lid)} H12" stroke="${C.ink}" stroke-width="0.8"/></g>`;
  out += `<circle cx="6" cy="6" r="5.4" fill="none" stroke="${C.ink}" stroke-width="1"/>`;
  return { out, defs: cd + gr };
}

// ---------------------------------------------------------------- ghost galleon (159x349)
// Hit box x 25..159 y 33..324. Cannons fire from the bow face at y 220 / 266 (ball tops).
// Rudder strip (21x47) is drawn at (121, 300): the sternpost sits at x ~124..140 there.

const GH = { wood: '#4f5f52', woodDark: '#2c3a34', woodLight: '#7b8d74', sail: '#c9ffe4', glow: '#5dffb0' };

export function galleon({ dead = false } = {}) {
  let out = '', defs = '';
  const op = dead ? 0.78 : 1;
  const [bd, bu] = blur(5);
  const [bd2, bu2] = blur(1.6);
  defs += bd + bd2;
  const hull = 'M16,204 L24,198 L56,210 L104,206 L108,176 L159,172 L158,250 Q154,286 134,308 L128,316 Q100,328 72,326 Q42,320 30,292 Q20,262 18,232 Z';
  const [hcd, hcu] = clip(hull);
  const [gw, uw] = linear([[0, GH.woodLight], [0.35, GH.wood], [1, GH.woodDark]]);
  defs += hcd + gw;

  // Ghostly halo (blurred silhouette).
  out += `<g filter="${bu}" opacity="${dead ? 0.35 : 0.55}"><path d="${hull}" fill="${GH.glow}"/><path d="M26,60 L150,40 L150,172 L26,190Z" fill="${GH.glow}" opacity="0.6"/></g>`;
  out += `<g opacity="${op}">`;

  // Masts and spars.
  const mast = (x, y0, y1) => P(`M${x - 2.5},${y1} L${x - 2},${y0} L${x + 2},${y0} L${x + 2.5},${y1} Z`, GH.woodDark, 1.4);
  if (!dead) {
    out += mast(112, 6, 180) + mast(52, 26, 208);
  } else {
    out += mast(112, 70, 180) + `<g transform="rotate(-18 112 70)">${mast(112, 10, 70)}</g>` + mast(52, 40, 208);
  }
  // Bowsprit.
  out += P('M24,204 L2,174 L6,172 L30,200 Z', GH.woodDark, 1.4);
  // Rigging lines.
  out += `<path d="M4,174 L52,30 M52,30 L112,8 M112,8 L156,172 M52,30 L20,200" fill="none" stroke="${C.ink}" stroke-width="0.8" opacity="0.6"/>`;

  // Tattered glowing sails (translucent).
  const sail = (pts, seed) => {
    const R = rng(seed);
    const [x0, y0, x1, y1] = pts;
    const top = [[x0, y0], [x1, y0]];
    const right = [[x1 + 4, (y0 + y1) / 2]];
    const bottom = [];
    const n = 6;
    for (let i = n; i >= 0; i--) bottom.push([x0 + ((x1 - x0) * i) / n, y1 - (i % 2 ? 6 + R() * 6 : 0) + 4]);
    const left = [[x0 + 4, (y0 + y1) / 2]];
    const d = smoothPath([...top, ...right, ...bottom, ...left], true, 0.2);
    const [sg, su] = linear([[0, '#ffffff', 0.95], [1, GH.sail, dead ? 0.45 : 0.75]]);
    defs += sg;
    let o = `<path d="${d}" fill="${GH.glow}" opacity="0.5" filter="${bu2}"/>`;
    o += `<path d="${d}" fill="${su}" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
    // holes
    for (let k = 0; k < (dead ? 4 : 2); k++) {
      const hx = x0 + 8 + R() * (x1 - x0 - 16), hy = y0 + 8 + R() * (y1 - y0 - 20);
      o += `<path d="M${fmt(hx)},${fmt(hy)} l${fmt(3 + R() * 3)},${fmt(-2 - R() * 2)} l${fmt(2 + R() * 3)},${fmt(4 + R() * 3)} l${fmt(-4)},${fmt(3 + R() * 2)}z" fill="#163a32" opacity="0.65"/>`;
    }
    o += `<path d="M${x0 - 2},${y0} L${x1 + 2},${y0}" stroke="${GH.woodDark}" stroke-width="3" stroke-linecap="round"/>`;
    return o;
  };
  if (!dead) {
    out += sail([74, 22, 150, 90], 3) + sail([78, 102, 148, 166], 5);
    out += sail([22, 50, 84, 112], 7) + sail([24, 124, 82, 184], 9);
  } else {
    out += `<g transform="rotate(-18 112 70)">${sail([84, 30, 140, 70], 3)}</g>` + sail([80, 104, 146, 162], 5);
    out += sail([26, 70, 80, 116], 7) + `<g transform="rotate(8 52 150)">${sail([26, 130, 80, 178], 9)}</g>`;
  }
  // Jib.
  out += `<path d="M8,178 L48,40 L46,190 Z" fill="${GH.sail}" opacity="${dead ? 0.35 : 0.55}" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
  // Flag.
  if (!dead) {
    out += P('M114,6 Q124,3 132,7 T148,6 L146,18 Q138,15 130,18 T114,17 Z', '#16231d', 1.2);
    out += skull(128, 11, 3.2, GH.sail);
  }

  // Hull.
  out += P(hull, uw);
  out += `<g clip-path="${hcu}">`;
  for (let y = 214; y < 330; y += 13) out += `<path d="M10,${y} Q90,${y + 8} 162,${y - 14}" fill="none" stroke="${GH.woodDark}" stroke-width="1.3"/>`;
  out += `<path d="M20,212 Q90,222 160,190" stroke="${GH.glow}" stroke-opacity="0.35" stroke-width="4" fill="none"/>`;
  out += `<path d="M10,300 Q90,330 170,260 L170,360 L0,360Z" fill="#0f1a16" opacity="0.4"/>`;
  if (dead) {
    out += `<path d="M84,200 L78,232 L90,252 L80,280 L92,330 L120,330 L120,200Z" fill="#071410" opacity="0.55"/>`;
    out += crack(84, 204, 60, 95, 6, 1.8) + crack(40, 240, 30, 30, 8) + crack(140, 200, 40, 110, 10);
  }
  out += `</g><path d="${hull}" fill="none" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
  // Deck rail and stern castle trim.
  out += `<path d="M24,198 L56,210 L104,206 L108,176 L159,172" fill="none" stroke="${GH.woodLight}" stroke-width="2"/>`;
  for (let x = 30; x < 104; x += 9) out += `<path d="M${x},${203 + (x - 30) * 0.12} v-7" stroke="${C.ink}" stroke-width="1.2"/>`;
  out += `<path d="M24,197 L54,203 L104,199" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`;
  // Glowing portholes / stern windows.
  const winCol = dead ? '#2b5a4a' : '#bfffe0';
  for (const [x, y] of [[70, 236], [96, 232], [122, 226], [146, 220]]) {
    out += `<rect x="${x - 5}" y="${y - 4}" width="10" height="8" rx="2" ${ink(winCol, 1.2)}/>`;
    if (!dead) out += `<rect x="${x - 7}" y="${y - 6}" width="14" height="12" rx="4" fill="${GH.glow}" opacity="0.35" filter="${bu2}"/>`;
  }
  for (const x of [120, 134, 148]) out += `<rect x="${x - 4}" y="184" width="8" height="12" rx="2" ${ink(winCol, 1.2)}/>`;
  // Lantern on the stern.
  out += `<path d="M154,172 L154,160" stroke="${C.ink}" stroke-width="1.5"/><circle cx="154" cy="156" r="${dead ? 3 : 5}" fill="${GH.glow}" stroke="${C.ink}" stroke-width="1.2"/>`;
  // Skull figurehead at the bow.
  out += skull(18, 206, 6, GH.sail);
  // Bow cannons (projectiles leave at y 220 / 266 tops: centres ~242 / 288).
  for (const [x, y] of [[16, 242], [24, 288]]) {
    out += `<rect x="${x + 2}" y="${y - 9}" width="16" height="18" rx="2" fill="#0d1a15" stroke="${C.ink}" stroke-width="1.2"/>`;
    out += P(`M${x - 10},${y - 6} L${x + 10},${y - 5} L${x + 10},${y + 5} L${x - 10},${y + 6} Z`, '#2b3138', 1.5);
    out += `<ellipse cx="${x - 10}" cy="${y}" rx="3" ry="7.5" ${ink('#3e4652', 1.4)}/><ellipse cx="${x - 10.4}" cy="${y}" rx="1.7" ry="4.6" fill="${dead ? '#0b1020' : GH.glow}"/>`;
  }
  out += '</g>';
  if (dead) {
    // Wisps of ghost-light escaping.
    out += `<g filter="${bu2}" opacity="0.7">`;
    for (const [x, y, s] of [[60, 160, 1], [120, 120, 0.8], [40, 260, 1.1], [130, 280, 0.9], [96, 60, 0.7]]) out += `<path d="M${x},${y} q${8 * s},${-10 * s} 0,${-20 * s} q${-8 * s},${-10 * s} 0,${-22 * s}" fill="none" stroke="${GH.glow}" stroke-width="${4 * s}" stroke-linecap="round"/>`;
    out += '</g>';
    out += spark(90, 300, 5, GH.glow) + spark(36, 230, 4, GH.glow) + spark(140, 150, 4, GH.glow);
  }
  return { out, defs };
}

/** galleon_rudder frame: 21x47; i 0..4 swings from turned away (dark, narrow) to turned toward. */
export function rudder(i) {
  const th = (-35 + i * 17.5) * (Math.PI / 180);
  const w = 15 * Math.cos(th) + 2;
  const col = th > 0 ? GH.woodLight : th < 0 ? GH.woodDark : GH.wood;
  let out = P(`M3,1 L${fmt(3 + w * 0.6)},3 L${fmt(3 + w)},30 Q${fmt(3 + w)},44 ${fmt(3 + w * 0.5)},45 L3,45 Z`, col, 1.6);
  for (let y = 12; y < 44; y += 9) out += `<path d="M4,${y} L${fmt(2 + w)},${y + 1}" stroke="${GH.woodDark}" stroke-width="1"/>`;
  out += `<rect x="1" y="6" width="5" height="4" rx="1" ${ink('#3e4652', 1)}/><rect x="1" y="30" width="5" height="4" rx="1" ${ink('#3e4652', 1)}/>`;
  out += `<path d="M4,3 L4,44" stroke="${GH.glow}" stroke-opacity="0.35" stroke-width="1.5"/>`;
  return { out, defs: '' };
}

// ---------------------------------------------------------------- projectiles

/**
 * Torpedo body in a 126x39 frame, nose pointing left. The word is drawn over the cream hull
 * (centre x ~69, y ~11..28), so the hull is flat and light there.
 */
export function torpedo() {
  const body = 'M18,6.5 L112,6.5 Q118,7 124,14 L124,25 Q118,32 112,32.5 L22,32.5 Z';
  const nose = 'M21,6.5 Q7,6.5 3,16 Q1,19.5 3,23 Q7,32.5 21,32.5 Z';
  const [g, u] = linear([[0, '#ffffff'], [0.18, '#f6f1e2'], [0.8, '#efe8d4'], [1, '#c9bfa3']]);
  const [g2, u2] = linear([[0, '#ff8a6b'], [0.45, C.uiRed], [1, '#8e1a14']]);
  let out = '';
  out += P('M104,8 L114,0.8 L124,1.2 L121,12 Z', '#3a4552', 1.5);
  out += P('M104,31 L114,38.2 L124,37.8 L121,27 Z', '#3a4552', 1.5);
  out += P(body, u);
  out += `<path d="M114,7 L114,32" stroke="${C.ink}" stroke-width="1.2"/><rect x="114" y="7.5" width="3" height="24" fill="#3a4552"/>`;
  out += P(nose, u2);
  // hazard ring behind the warhead
  out += `<rect x="20" y="6.5" width="3.5" height="26" fill="${C.diverYellow}" stroke="${C.ink}" stroke-width="1"/>`;
  out += `<path d="M6,13 Q10,9 18,9" stroke="#fff" stroke-opacity="0.6" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  out += `<path d="M26,9 L112,9" stroke="#fff" stroke-width="1.6" stroke-opacity="0.9"/>`;
  out += rivets([[120, 15], [120, 24]], 1, C.steel2);
  return { out, defs: g + g2 };
}

/** rotor_torpedo frame: 11x41, hub on the left edge (sprite sits at torpedo x 124). */
export function torpedoRotor(t) {
  return { out: propeller(4, 20.5, 17, t, { blade: '#c7ccd6', hub: C.uiRed, hubRx: 3.5, hubRy: 5, bladeW: 3.6 }), defs: '' };
}

/** Iron cannonball with a pale label spot at (37, 22); spin phase t; trail side +1 right / -1 left / 0 none. */
export function cannonball(t, { trail = 1, trailLen = 1, burst = 0 } = {}) {
  const cx = 37, cy = 22, r = 18;
  const [bd, bu] = blur(1.8);
  const [g, u] = radial([[0, '#8c97a8'], [0.55, '#3c4553'], [1, '#1b212b']], { cx: 0.38, cy: 0.32, r: 0.75 });
  const [cd, cu] = clip(`M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0Z`);
  let defs = bd + g + cd;
  let out = '';
  const glow = '#5dffb0';
  if (trail && trailLen > 0) {
    const s = trail;
    const R = rng(Math.floor(t * 12) + 5);
    const flick = Math.sin(t * Math.PI * 2 * 3);
    const len = 22 * trailLen;
    const x0 = cx + s * (r - 6);
    const tip = x0 + s * (len + 8 + flick * 3);
    const d = `M${x0},${cy - 14} Q${x0 + s * len * 0.5},${cy - 12 - flick * 2} ${tip},${cy - 2 + flick} Q${x0 + s * len * 0.6},${cy + 3} ${tip - s * 4},${cy + 9 - flick} Q${x0 + s * len * 0.4},${cy + 14} ${x0},${cy + 14}Z`;
    out += `<path d="${d}" fill="${glow}" opacity="0.55" filter="${bu}"/>`;
    out += `<path d="${d}" fill="${glow}" fill-opacity="0.5" stroke="#1d7a55" stroke-width="1"/>`;
    for (let i = 0; i < 3; i++) {
      const bx = x0 + s * (10 + R() * len), by = cy - 10 + R() * 20;
      out += `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(1.3 + R() * 1.8)}" fill="#e6fff3" fill-opacity="0.5" stroke="#bfffe0" stroke-width="0.8"/>`;
    }
  }
  if (burst) {
    out += `<circle cx="${cx}" cy="${cy}" r="${r + 3 + burst * 2}" fill="none" stroke="${glow}" stroke-width="2.5" opacity="0.8" filter="${bu}"/>`;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      out += `<path d="M${fmt(cx + Math.cos(a) * (r + 2))},${fmt(cy + Math.sin(a) * (r + 2))} L${fmt(cx + Math.cos(a) * (r + 5))},${fmt(cy + Math.sin(a) * (r + 5))}" stroke="${glow}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${u}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  // Spinning grooves and bolts around the label (rolls counter-clockwise as it flies left).
  const a = -t * 360;
  out += `<g clip-path="${cu}"><g transform="rotate(${fmt(a)} ${cx} ${cy})">`;
  for (let k = 0; k < 3; k++) {
    const ang = (k * 120 * Math.PI) / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    out += `<path d="M${fmt(cx + ca * 10)},${fmt(cy + sa * 10)} L${fmt(cx + ca * 18)},${fmt(cy + sa * 18)}" stroke="#0f141c" stroke-width="2.4"/>`;
    const b = ang + Math.PI / 3;
    out += `<circle cx="${fmt(cx + Math.cos(b) * 13.5)}" cy="${fmt(cy + Math.sin(b) * 13.5)}" r="2" fill="#aab4c4" stroke="#0f141c" stroke-width="0.8"/>`;
  }
  out += '</g></g>';
  out += `<path d="M${cx - 11},${cy - 9} Q${cx - 6},${cy - 14.5} ${cx + 1},${cy - 15}" stroke="#fff" stroke-opacity="0.5" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  // Label spot for the letter.
  out += `<circle cx="${cx}" cy="${cy}" r="8.8" fill="#e9fff3" stroke="#1d7a55" stroke-width="1.2"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="${glow}" stroke-opacity="0.6" stroke-width="1"/>`;
  return { out, defs };
}
