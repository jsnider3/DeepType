// Small creatures: piranhas (blue and armoured white), the "gumbo" penalty anglerfish, the
// bonus jellyfish, background fish and the secret-level clams. Fish face left (except the
// right-swimming background fish). The game draws a letter/word centred on each frame, so
// those spots stay calm: light for black text (piranhas, jellyfish), dark for white text
// (gumbo, closed clams).

import { C, STROKE, svg, ink, shade, mix, linear, radial, smoothPath, rot, id, attrs, rng, fmt } from './lib.mjs';
import { frames, sparkle, bubble, bolt } from './creatures-lib.mjs';

const TAU = Math.PI * 2;
const P = (pts) => pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

// ------------------------------------------------------------------ piranha

/**
 * A piranha in a 60x60 frame, facing left, body centred near (31,31) so the game's
 * letter sits on the light flank patch.
 * opts: base, back, belly, patch, outline, armour, face ('grin'|'x'|'xray'), opacity.
 */
function piranha(t, opts = {}) {
  const {
    base = C.piranha,
    back = shade(C.piranha, -0.35),
    belly = '#dceeff',
    patch = '#eef7ff',
    outline = C.ink,
    armour = false,
    face = 'grin',
    opacity = 1,
    chomp = true,
  } = opts;
  const wag = Math.sin(t * TAU);
  const bob = Math.sin(t * TAU + 0.6) * 0.7;
  const jawOpen = chomp ? (0.5 - 0.5 * Math.cos(t * TAU * 2)) * 9 : 3;
  const w = STROKE;
  const st = (fill, sw = w) => attrs({ fill, stroke: outline, 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  let defs = '';
  let out = `<g opacity="${opacity}" transform="translate(0 ${fmt(bob)})">`;

  // Tail (behind body), sweeping around the peduncle.
  const pivot = [49, 31];
  const tail = [[47, 28], [54, 19], [58, 21], [55, 31], [58, 41], [54, 43], [47, 34]].map((p) => rot(p, pivot, wag * 16));
  out += `<path d="${smoothPath(tail, true, 0.2)}" ${st(back)}/>`;
  // Dorsal and anal fins.
  const d1 = smoothPath([[27, 14], [33, 4 + wag * 0.6], [40, 5 + wag * 0.6], [45, 17]], true, 0.25);
  const d2 = smoothPath([[38, 47], [42, 55 - wag * 0.6], [48, 52 - wag * 0.6], [47, 42]], true, 0.25);
  out += `<path d="${d1}" ${st(back)}/><path d="${d2}" ${st(back)}/>`;
  // Fin rays.
  out += `<g stroke="${shade(back, -0.3)}" stroke-width="1" stroke-linecap="round" fill="none"><path d="M33,8 l1,6 M38,8 l0,7 M42,51 l0,-5"/></g>`;

  // Body: round and deep, blunt head at the left.
  const bodyPts = [[10, 30], [14, 19], [24, 13], [36, 12], [46, 17], [51, 25], [51, 31], [50, 37], [45, 45], [34, 49], [22, 48], [13, 41]];
  const bodyD = smoothPath(bodyPts, true, 0.55);
  const [gdef, gurl] = linear([[0, back], [0.45, base], [1, shade(base, 0.25)]]);
  defs += gdef;
  out += `<path d="${bodyD}" ${st(gurl)}/>`;
  const cid = id('pbody');
  defs += `<clipPath id="${cid}"><path d="${bodyD}"/></clipPath>`;
  out += `<g clip-path="url(#${cid})">`;
  // Belly and the light flank patch for the letter.
  out += `<path d="${smoothPath([[12, 36], [30, 39], [52, 34], [52, 50], [10, 50]], true, 0.4)}" fill="${belly}"/>`;
  const [pdef, purl] = radial([[0, patch, 1], [0.6, patch, 0.85], [1, patch, 0]]);
  defs += pdef;
  out += `<ellipse cx="31" cy="31" rx="14" ry="13" fill="${purl}"/>`;
  // Top highlight.
  out += `<path d="M20,17 Q32,11 44,17" fill="none" stroke="${shade(base, 0.5)}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  if (armour) {
    // Overlapping armour plates on the back and a riveted brow plate.
    const plate = shade(base, -0.12);
    for (let i = 0; i < 3; i++) {
      const x = 36 + i * 5;
      out += `<path d="M${x},10 q5,8 1,16" fill="none" stroke="${shade(back, -0.25)}" stroke-width="1.4"/>`;
      out += `<circle cx="${x + 2.2}" cy="15" r="0.9" fill="${shade(back, -0.35)}"/>`;
    }
    out += `<path d="M12,22 Q20,11 32,12 L30,17 Q21,17 15,25Z" fill="${plate}" stroke="${shade(back, -0.3)}" stroke-width="1"/>`;
    for (const [x, y] of [[17, 19], [22, 15.5], [27, 14]]) out += `<circle cx="${x}" cy="${y}" r="0.9" fill="${shade(back, -0.35)}"/>`;
    out += `<path d="M44,32 q4,4 3,9" fill="none" stroke="${shade(back, -0.2)}" stroke-width="1.2"/>`;
  } else {
    // A few scale flecks on the back.
    for (const [x, y] of [[40, 20], [45, 24], [36, 17]]) out += `<path d="M${x},${y} q2,2 0,4" fill="none" stroke="${shade(back, -0.2)}" stroke-width="1"/>`;
  }
  out += `</g><path d="${bodyD}" fill="none" stroke="${outline}" stroke-width="${w}" stroke-linejoin="round"/>`;

  // Mouth: dark gape, overbite teeth, a big underbite jaw with upturned teeth.
  const hinge = [25, 40];
  const jaw = [[24, 38], [16, 38], [8, 36], [5, 40], [9, 45], [18, 48], [26, 45]].map((p) => rot(p, hinge, -jawOpen));
  const lipY = 35;
  out += `<path d="${smoothPath([[8, lipY - 1], [24, lipY + 1], [25, 42], [16, 45], [8, 42]], true, 0.3)}" fill="${face === 'xray' ? '#0d1d55' : '#6e1626'}" stroke="${outline}" stroke-width="1.4" stroke-linejoin="round"/>`;
  let up = `M9,${lipY - 0.6}`;
  for (let i = 0; i < 5; i++) up += ` l1.6,3.4 l1.6,-3.2`;
  out += `<path d="${up}" fill="#fff" stroke="${outline}" stroke-width="0.8" stroke-linejoin="round"/>`;
  out += `<path d="${smoothPath(jaw, true, 0.3)}" ${st(shade(base, 0.08), 1.8)}/>`;
  // Lower teeth follow the jaw rim.
  let low = '';
  for (let i = 0; i < 5; i++) {
    const a = [8 + i * 3.2, 37.2], b = [9.6 + i * 3.2, 33], c = [11.2 + i * 3.2, 37.2];
    const [pa, pb, pc] = [a, b, c].map((p) => rot(p, hinge, -jawOpen));
    low += `M${fmt(pa[0])},${fmt(pa[1])} L${fmt(pb[0])},${fmt(pb[1])} L${fmt(pc[0])},${fmt(pc[1])}Z `;
  }
  out += `<path d="${low}" fill="#fff" stroke="${outline}" stroke-width="0.8" stroke-linejoin="round"/>`;

  // Pectoral fin, flapping.
  const flap = Math.sin(t * TAU * 2 + 1) * 2;
  out += `<path d="${smoothPath([[37, 41], [44, 38.5 + flap], [49, 42 + flap], [46, 47 + flap], [38, 44]], true, 0.3)}" ${st(back, 1.6)}/>`;
  out += `<path d="M39,42.5 L46,41 M39,43 L45.5,45" stroke="${shade(back, -0.3)}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;

  // Eye.
  if (face === 'x') {
    out += `<g stroke="${outline}" stroke-width="1.8" stroke-linecap="round"><path d="M16,19 l6,6 M22,19 l-6,6"/></g>`;
  } else if (face === 'xray') {
    out += `<circle cx="19" cy="22" r="4.2" fill="#bfe8ff"/>`;
  } else {
    out += `<circle cx="19" cy="22" r="4.4" fill="#fff" stroke="${outline}" stroke-width="1.5"/><circle cx="17.8" cy="22.8" r="2.3" fill="${C.ink}"/><circle cx="17.2" cy="21.8" r="0.8" fill="#fff"/>`;
    out += `<path d="M13,16.5 l11,3.5" stroke="${outline}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  out += '</g>';
  return { out, defs };
}

const BLUE = {};
const WHITE = { base: C.piranhaWhite, back: '#8a9db4', belly: '#ffffff', patch: '#ffffff', armour: true };

const piranhaSwim = (opts) => () => frames(20, 60, 60, (_i, t) => piranha(t, opts));

/** Death: stiffens, X eyes, flips belly-up over 5 frames; frames 5..9 settle (last is held). */
const piranhaDeath = (opts) => () =>
  frames(10, 60, 60, (i) => {
    const k = Math.min(1, i / 5);
    const ease = k * k * (3 - 2 * k);
    const fade = { ...opts, base: mix(opts.base ?? C.piranha, '#9aa7b8', 0.35 * ease), opacity: 1 - 0.1 * ease };
    const r = piranha(0.05, { ...fade, face: 'x', chomp: false });
    const settle = i >= 5 ? Math.sin((i - 5) * 1.3) * 6 * (1 - (i - 5) / 4) : 0;
    const ang = 180 * ease + settle;
    let extra = '';
    // A few bubbles escape as it goes limp.
    if (i < 7) for (const [bx, by, br] of [[14, 30, 2.2], [20, 24, 1.5], [10, 22, 1.2]]) extra += bubble(bx + i * 0.3, by - i * 3, br);
    return { out: `<g transform="rotate(${fmt(ang)} 31 31)">${r.out}</g>${extra}`, defs: r.defs };
  });

/** Electrified x-ray look: dark-blue silhouette with white outline, skeleton and sparks. */
function xrayExtras(cx, cy, spineFrom, spineTo, ribs, skull, seed) {
  const rnd = rng(seed);
  let out = `<g stroke="#bfe8ff" stroke-width="1.8" stroke-linecap="round" fill="none">`;
  out += `<path d="M${spineFrom[0]},${spineFrom[1]} L${spineTo[0]},${spineTo[1]}"/>`;
  for (let i = 0; i < ribs; i++) {
    const x = spineFrom[0] + 5 + i * ((spineTo[0] - spineFrom[0] - 8) / ribs);
    out += `<path d="M${fmt(x)},${cy - 9} Q${fmt(x + 3)},${cy} ${fmt(x)},${cy + 9}"/>`;
  }
  out += `<circle cx="${skull[0]}" cy="${skull[1]}" r="5" stroke-width="1.6"/></g>`;
  out += `<g stroke="#fff36b" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round">`;
  for (const [x, y, x2, y2] of [[cx - 6, 1, cx - 14, 13], [cx + 22, 56, cx + 14, 46], [4, 50, 12, 42]]) out += `<path d="${bolt(x, y, x2, y2, 3, 2.5, rnd)}"/>`;
  out += '</g>';
  return out;
}

const XRAY = { base: '#1b3a8a', back: '#10246a', belly: '#2a55b8', patch: '#2a55b8', outline: '#ffffff', face: 'xray', chomp: false };

const piranhaShock = () => {
  const r = piranha(0.25, XRAY);
  return svg(60, 60, r.out + xrayExtras(31, 31, [14, 30], [50, 31], 5, [19, 22], 7), r.defs);
};

// ------------------------------------------------------------------ gumbo (anglerfish)

/**
 * Deep-sea anglerfish in a 60x60 frame, facing left, with a glowing lure. Body centre
 * around (33,31): the game's WHITE letter sits there (x offset +4), so the flank stays dark.
 */
function gumbo(t, opts = {}) {
  const { base = shade(C.gumbo, -0.15), back = shade(C.gumbo, -0.5), flank = shade(C.gumbo, -0.32), outline = C.ink, face = 'grin', glow = 1, opacity = 1, fast = 2 } = opts;
  const wag = Math.sin(t * TAU * fast);
  const lureBob = Math.sin(t * TAU);
  const w = STROKE;
  const st = (fill, sw = w) => attrs({ fill, stroke: outline, 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  let defs = '';
  let out = `<g opacity="${opacity}">`;

  // Ragged tail.
  const pivot = [50, 32];
  const tail = [[48, 28], [55, 20], [57, 25], [59, 27], [56, 32], [59, 37], [57, 40], [55, 44], [48, 36]].map((p) => rot(p, pivot, wag * 18));
  out += `<path d="${smoothPath(tail, true, 0.15)}" ${st(back)}/>`;
  // Spiky dorsal fin and ventral fin.
  out += `<path d="M32,13 L36,6 L38,11 L42,6 L43,13 L47,10 L47,18Z" ${st(back, 1.6)}/>`;
  out += `<path d="${smoothPath([[38, 47], [41, 55 - wag], [47, 52 - wag], [46, 43]], true, 0.2)}" ${st(back, 1.6)}/>`;

  // Lure stalk and bulb (behind the head outline start, in front of the fin).
  const bx = 8.5 + lureBob * 0.8, by = 9 + lureBob * 1.4;
  const [ldef, lurl] = radial([[0, '#fffbd0', 0.95], [0.35, '#d6ff6a', 0.55], [1, '#9dff4a', 0]]);
  defs += ldef;
  out += `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(7.5 * (0.85 + 0.15 * glow))}" fill="${lurl}" opacity="${fmt(glow)}"/>`;
  out += `<path d="M22,14 Q18,2 ${fmt(bx + 3)},${fmt(by - 2)}" fill="none" stroke="${outline}" stroke-width="3.6" stroke-linecap="round"/>`;
  out += `<path d="M22,14 Q18,2 ${fmt(bx + 3)},${fmt(by - 2)}" fill="none" stroke="${base}" stroke-width="1.6" stroke-linecap="round"/>`;
  const bulb = glow > 0.3 ? '#f4ff9a' : '#8a8f70';
  out += `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="3.4" fill="${bulb}" stroke="${outline}" stroke-width="1.4"/><circle cx="${fmt(bx - 1)}" cy="${fmt(by - 1)}" r="1.1" fill="#fff" opacity="${fmt(glow)}"/>`;

  // Body: big-headed lump tapering to the tail.
  const bodyPts = [[8, 30], [12, 19], [22, 13], [36, 13], [46, 19], [51, 28], [51, 35], [45, 44], [33, 49], [20, 48], [11, 42]];
  const bodyD = smoothPath(bodyPts, true, 0.55);
  const [gdef, gurl] = linear([[0, back], [0.5, base], [1, shade(base, 0.1)]]);
  defs += gdef;
  out += `<path d="${bodyD}" ${st(gurl)}/>`;
  const cid = id('gbody');
  defs += `<clipPath id="${cid}"><path d="${bodyD}"/></clipPath>`;
  out += `<g clip-path="url(#${cid})">`;
  out += `<ellipse cx="34" cy="31" rx="12" ry="11" fill="${flank}"/>`;
  out += `<path d="M18,17 Q30,11 44,18" fill="none" stroke="${shade(base, 0.35)}" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>`;
  // Bioluminescent dots along the belly line.
  for (let i = 0; i < 5; i++) {
    const x = 22 + i * 5.5, y = 45 - Math.abs(i - 2) * 0.6;
    const on = glow * (0.6 + 0.4 * Math.sin(t * TAU + i));
    out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="1.3" fill="#7ff0ff" opacity="${fmt(on)}"/>`;
  }
  out += `</g><path d="${bodyD}" fill="none" stroke="${outline}" stroke-width="${w}" stroke-linejoin="round"/>`;

  // Huge gaping mouth with long fangs.
  const mouth = smoothPath([[7, 31], [16, 31], [27, 35], [24, 43], [14, 46], [7, 41]], true, 0.35);
  out += `<path d="${mouth}" fill="${face === 'xray' ? '#0d1d55' : '#2a0b2f'}" stroke="${outline}" stroke-width="1.5" stroke-linejoin="round"/>`;
  out += `<path d="M9,41 Q16,46 24,42" fill="none" stroke="#c0396b" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`;
  const fangs = [[8.5, 31.5, 9.5, 37], [12.5, 31.5, 13, 38.5], [17, 32, 17.5, 36.5], [21.5, 33.5, 21.5, 38]];
  for (const [x, y, x2, y2] of fangs) out += `<path d="M${x - 1.2},${y} L${x2},${y2} L${x + 1.4},${y}Z" fill="#f4f1e6" stroke="${outline}" stroke-width="0.7" stroke-linejoin="round"/>`;
  for (const [x, y] of [[10.5, 44], [15, 45.5], [20, 43.6]]) out += `<path d="M${x - 1.2},${y} L${x},${y - 5} L${x + 1.2},${y}Z" fill="#f4f1e6" stroke="${outline}" stroke-width="0.7" stroke-linejoin="round"/>`;

  // Pectoral fin.
  const flap = Math.sin(t * TAU * fast + 1) * 2;
  out += `<path d="${smoothPath([[42, 38], [49, 41 + flap], [48, 45 + flap], [41, 42]], true, 0.3)}" ${st(back, 1.5)}/>`;

  // Small, beady glowing eye.
  if (face === 'x') {
    out += `<g stroke="#ffe36b" stroke-width="1.6" stroke-linecap="round"><path d="M20,20 l5,5 M25,20 l-5,5"/></g>`;
  } else if (face === 'xray') {
    out += `<circle cx="22.5" cy="22.5" r="3.6" fill="#bfe8ff"/>`;
  } else {
    out += `<circle cx="22.5" cy="22.5" r="3.6" fill="#ffe36b" stroke="${outline}" stroke-width="1.4"/><circle cx="21.8" cy="22.8" r="1.5" fill="${C.ink}"/><circle cx="21.4" cy="22" r="0.6" fill="#fff"/>`;
    out += `<path d="M17,18 l10,2.5" stroke="${outline}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  out += '</g>';
  return { out, defs };
}

const gumboSwim = () => frames(20, 60, 60, (_i, t) => gumbo(t));
const gumboDie = () =>
  frames(10, 60, 60, (i) => {
    const k = Math.min(1, i / 5);
    const ease = k * k * (3 - 2 * k);
    const r = gumbo(0.05, { face: 'x', glow: 1 - ease * 0.85, opacity: 1 - 0.1 * ease });
    const settle = i >= 5 ? Math.sin((i - 5) * 1.3) * 6 * (1 - (i - 5) / 4) : 0;
    let extra = '';
    if (i < 7) for (const [bx, by, br] of [[14, 36, 2.2], [9, 30, 1.4], [18, 28, 1.2]]) extra += bubble(bx, by - i * 3, br);
    return { out: `<g transform="rotate(${fmt(180 * ease + settle)} 32 31)">${r.out}</g>${extra}`, defs: r.defs };
  });
const gumboShock = () => {
  const r = gumbo(0.1, { base: '#1b3a8a', back: '#10246a', flank: '#1f4296', outline: '#ffffff', face: 'xray', glow: 1 });
  return svg(60, 60, r.out + xrayExtras(33, 31, [14, 31], [50, 32], 5, [22.5, 22.5], 11), r.defs);
};

// ------------------------------------------------------------------ bonus jellyfish

/**
 * Jellyfish centred at (cx, cy) = centre of its word. p in [0,1) is the swim pulse phase.
 * squash scales the bell for the pop animation.
 */
function jelly(cx, cy, p, { sx = 1, sy = 1, opacity = 1, tentacles = true } = {}) {
  const pulse = Math.sin(p * TAU); // +1 = contracted (narrow, tall)
  const bw = (29 - pulse * 2) * sx; // half-width of the bell
  const top = cy - (31 + pulse * 1.5) * sy;
  const rim = cy + 11 * sy;
  let defs = '';
  let out = `<g opacity="${opacity}">`;

  if (tentacles) {
    // Thin rim tentacles (trail down, waving), then frilly oral arms.
    for (let j = 0; j < 6; j++) {
      const x0 = cx - bw * 0.82 + (j * bw * 1.64) / 5;
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const y = rim + s * 5.4;
        const sway = Math.sin(p * TAU - s * 0.9 + j * 1.7) * (0.6 + s * 0.75);
        const pull = (x0 - cx) * (pulse * 0.08) * (s / 5);
        pts.push([x0 + sway - pull, y]);
      }
      const d = smoothPath(pts, false, 0.5);
      out += `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${shade(C.jelly, 0.25)}" stroke-width="1.3" stroke-linecap="round"/>`;
    }
    for (let j = 0; j < 3; j++) {
      const x0 = cx - 7 + j * 7;
      const left = [], right = [];
      for (let s = 0; s <= 4; s++) {
        const y = rim - 1 + s * 6.3;
        const sway = Math.sin(p * TAU - s * 0.8 + j * 2.1) * (0.5 + s * 0.8);
        const wdt = 2.6 - s * 0.35 + Math.sin(s * 2.3 + j) * 0.5;
        left.push([x0 + sway - wdt, y]);
        right.unshift([x0 + sway + wdt, y]);
      }
      out += `<path d="${smoothPath([...left, ...right], true, 0.4)}" ${ink(j === 1 ? shade(C.jelly, -0.08) : shade(C.jelly, 0.1), 1.4)}/>`;
    }
  }

  // Bell: dome with a scalloped rim.
  const pts = [];
  const N = 8;
  pts.push([cx + bw, rim - 2 * sy]);
  pts.push([cx + bw * 0.95, cy - 9 * sy]);
  pts.push([cx + bw * 0.7, top + 9 * sy]);
  pts.push([cx, top]);
  pts.push([cx - bw * 0.7, top + 9 * sy]);
  pts.push([cx - bw * 0.95, cy - 9 * sy]);
  pts.push([cx - bw, rim - 2 * sy]);
  let d = smoothPath(pts, false, 0.6);
  for (let i = 0; i < N; i++) {
    const xa = cx - bw + ((i + 1) * 2 * bw) / N;
    const xm = cx - bw + ((i + 0.5) * 2 * bw) / N;
    d += ` Q${fmt(xm)},${fmt(rim + 4 * sy)} ${fmt(xa)},${fmt(rim - 2 * sy)}`;
  }
  d += 'Z';
  const [gdef, gurl] = radial([[0, '#fff4fb'], [0.55, '#ffd6f0'], [1, C.jelly]], { cx: 0.5, cy: 0.62, r: 0.62 });
  defs += gdef;
  out += `<path d="${d}" ${ink(gurl)}/>`;
  // Inner rim shadow, gloss and a few freckles near the crown.
  out += `<path d="M${fmt(cx - bw + 3)},${fmt(rim - 3 * sy)} Q${fmt(cx)},${fmt(rim + 1 * sy)} ${fmt(cx + bw - 3)},${fmt(rim - 3 * sy)}" fill="none" stroke="${shade(C.jelly, -0.15)}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
  out += `<path d="M${fmt(cx - bw * 0.62)},${fmt(top + 12 * sy)} Q${fmt(cx - bw * 0.45)},${fmt(top + 3 * sy)} ${fmt(cx - bw * 0.1)},${fmt(top + 2.5 * sy)}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/>`;
  for (const [dx, dy] of [[8, 6], [13, 10], [4, 4]]) out += `<circle cx="${fmt(cx + dx * sx)}" cy="${fmt(top + dy * sy)}" r="1.1" fill="${shade(C.jelly, -0.1)}" opacity="0.8"/>`;
  out += '</g>';
  return { out, defs };
}

const jellySwim = () => frames(20, 80, 80, (_i, t) => jelly(40, 39, t));

/** Pop: squash, burst into a ring of pink droplets and sparkles, fizzle out. Jelly at (52,59). */
const jellyDeath = () =>
  frames(8, 100, 100, (i) => {
    const cx = 52, cy = 59;
    let out = '';
    let defs = '';
    if (i <= 1) {
      const r = jelly(cx, cy, 0.75, { sx: 1 + i * 0.16, sy: 1 - i * 0.14 });
      out += r.out;
      defs += r.defs;
    }
    const rnd = rng(42);
    if (i >= 1) {
      const k = (i - 1) / 6; // 0..1
      // Pop burst: a spiky white star with a pink rim, then speed lines.
      if (i >= 2 && i <= 3) {
        const R = i === 2 ? 26 : 32, r0 = i === 2 ? 13 : 20;
        let d = '';
        for (let j = 0; j < 24; j++) {
          const a = (j / 24) * TAU + 0.1;
          const rr = j % 2 ? r0 : R * (0.8 + 0.2 * Math.sin(j * 2.7));
          d += `${j ? 'L' : 'M'}${fmt(cx + Math.cos(a) * rr)},${fmt(cy - 12 + Math.sin(a) * rr)}`;
        }
        const [fd, fu] = radial([[0, '#ffffff'], [0.6, '#fff0fa'], [1, '#ffc2ea']]);
        defs += fd;
        out += `<path d="${d}Z" fill="${fu}" stroke="${shade(C.jelly, -0.1)}" stroke-width="2" stroke-linejoin="round" opacity="1"/>`;
      }
      if (i >= 3 && i <= 5) {
        out += `<g stroke="#fff" stroke-linecap="round" opacity="${fmt(1 - (i - 3) * 0.35)}">`;
        for (let j = 0; j < 8; j++) {
          const a = (j / 8) * TAU + 0.35;
          const r1 = 20 + (i - 3) * 9, r2 = r1 + 7;
          out += `<path d="M${fmt(cx + Math.cos(a) * r1)},${fmt(cy - 12 + Math.sin(a) * r1)} L${fmt(cx + Math.cos(a) * r2)},${fmt(cy - 12 + Math.sin(a) * r2)}" stroke-width="2"/>`;
        }
        out += '</g>';
      }
      // Droplets of jelly flung outward.
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * TAU + rnd() * 0.5;
        const dist = (10 + rnd() * 8) + k * (26 + rnd() * 12);
        const x = cx + Math.cos(a) * dist, y = cy - 12 + Math.sin(a) * dist + k * k * 8;
        const r = (2.8 - k * 2) * (0.7 + rnd() * 0.5);
        if (r > 0.3 && i >= 2) out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${shade(C.jelly, 0.2)}" stroke="${C.ink}" stroke-width="${fmt(Math.min(1.2, r * 0.5))}" opacity="${fmt(1 - k * 0.6)}"/>`;
      }
      // Sparkles twinkling outward.
      for (let j = 0; j < (i >= 2 ? 7 : 0); j++) {
        const a = (j / 7) * TAU + 0.4 + rnd() * 0.4;
        const dist = 8 + k * (22 + rnd() * 14);
        const x = cx + Math.cos(a) * dist, y = cy - 12 + Math.sin(a) * dist;
        const tw = Math.abs(Math.sin(i * 1.7 + j * 2.2));
        const r = (3 + 4 * tw) * (1 - k * 0.7);
        out += sparkle(x, y, r, j % 3 === 0 ? '#ffe56b' : j % 3 === 1 ? '#ffffff' : '#ffc4ec', 1 - k * 0.5);
      }
      // Bubbles drifting up.
      for (let j = 0; j < 4; j++) {
        const x = cx - 18 + j * 12 + Math.sin(i + j) * 2;
        const y = cy - 6 - k * (30 + j * 6);
        if (i >= 2) out += bubble(x, y, 1.6 + (j % 2), 1);
      }
    }
    return { out, defs };
  });

// ------------------------------------------------------------------ background fish

/** Tiny right-facing fish in light neutrals (the game tints it by distance). */
const smallFish = () =>
  frames(20, 20, 20, (_i, t) => {
    const wag = Math.sin(t * TAU);
    const ol = '#5a6070';
    const tail = [[6.5, 10], [2, 6.5], [2.8, 10], [2, 13.5]].map((p) => rot(p, [6.5, 10], wag * 18));
    let out = `<path d="${smoothPath(tail, true, 0.1)}" fill="#d9dde3" stroke="${ol}" stroke-width="0.8" stroke-linejoin="round"/>`;
    out += `<path d="M9,6.6 Q11,4.4 13,6.4Z" fill="#d9dde3" stroke="${ol}" stroke-width="0.7" stroke-linejoin="round"/>`;
    const body = smoothPath([[6, 10 + wag * 0.3], [9, 6.6], [14, 6.6], [17.6, 9.6], [14.5, 13], [9, 13.2]], true, 0.6);
    out += `<path d="${body}" fill="#f2f4f7" stroke="${ol}" stroke-width="0.8" stroke-linejoin="round"/>`;
    out += `<path d="M8,11.6 Q12.5,13.4 16,11.2" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>`;
    out += `<path d="M13,8.2 q0.8,1.6 0,3.2" fill="none" stroke="#b9bfc8" stroke-width="0.6"/>`;
    out += `<circle cx="15" cy="8.9" r="1" fill="${C.ink}"/><circle cx="15.3" cy="8.6" r="0.35" fill="#fff"/>`;
    return out;
  });

// ------------------------------------------------------------------ clams

const SHELL_TOP = '#5b3f92';
const SHELL_TOP_LIGHT = '#8166bf';
const SHELL_BOT = '#3f2c6e';
const SHELL_RIB = '#33215c';
const LIP = 33; // closed lip line
const CX = 25;
const HW = 19; // half width

/** One clam on its rock, lifted lid by `lift` px (0 closed, ~16 open), with an optional pearl. */
function clam(lift, pearl, glint = 0) {
  let defs = '';
  let out = '';
  // Rock shelf.
  const rock = smoothPath([[0, 50], [0, 43], [6, 39.5], [18, 40.5], [32, 39], [44, 40], [50, 42.5], [50, 50]], true, 0.4);
  const [rdef, rurl] = linear([[0, C.rock2], [0.5, C.rock1], [1, C.rock0]]);
  defs += rdef;
  out += `<path d="${rock}" fill="${rurl}" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  out += `<path d="M8,45 q4,-1.5 7,0 M36,46 q3,-1.5 6,0" fill="none" stroke="${C.rock0}" stroke-width="1" stroke-linecap="round"/>`;
  out += `<ellipse cx="${CX}" cy="43.2" rx="${HW + 1}" ry="2.6" fill="${C.rock0}" opacity="0.5"/>`;

  const o = Math.min(1, lift / 14); // openness 0..1
  const topLip = LIP - lift;
  // Dark mouth between the shells (the hinge is at the back).
  if (lift > 0.05) out += `<path d="M${CX - HW + 1},${LIP} Q${CX - HW - 1.5},${fmt((LIP + topLip) / 2)} ${CX - HW + 1.5},${fmt(topLip)} L${CX + HW - 1.5},${fmt(topLip)} Q${CX + HW + 1.5},${fmt((LIP + topLip) / 2)} ${CX + HW - 1},${LIP}Z" fill="#241640" stroke="${C.ink}" stroke-width="1.2"/>`;

  // Lid (behind the pearl once open): pearly lining below its lip, ribbed dome above.
  const domeH = 13 - o * 3.5;
  const tLine = 0.6 + o * 7;
  if (lift > 0.05) {
    const [ld, lu] = linear([[0, '#efdcf8'], [1, '#c9a3e3']]);
    defs += ld;
    out += `<ellipse cx="${CX}" cy="${fmt(topLip)}" rx="${HW - 0.5}" ry="${fmt(tLine)}" fill="${lu}" stroke="${C.ink}" stroke-width="1"/>`;
  }
  const domeD = `M${CX - HW},${fmt(topLip)} Q${CX - HW + 1},${fmt(topLip - domeH * 1.15)} ${CX},${fmt(topLip - domeH)} Q${CX + HW - 1},${fmt(topLip - domeH * 1.15)} ${CX + HW},${fmt(topLip)} Q${CX},${fmt(topLip - 2.2)} ${CX - HW},${fmt(topLip)}Z`;
  const [sd, su] = linear([[0, SHELL_TOP_LIGHT], [0.7, SHELL_TOP], [1, SHELL_TOP]]);
  defs += sd;
  out += `<path d="${domeD}" fill="${su}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
  const cid = id('dome');
  defs += `<clipPath id="${cid}"><path d="${domeD}"/></clipPath>`;
  out += `<g clip-path="url(#${cid})" fill="none" stroke="${SHELL_RIB}" stroke-width="1.1" stroke-linecap="round" opacity="0.85">`;
  for (const a of [-62, -38, 38, 62]) {
    const x = CX + Math.sin((a * Math.PI) / 180) * 24;
    const y = topLip + 2 - Math.cos((a * Math.PI) / 180) * domeH * 1.4;
    out += `<path d="M${CX},${fmt(topLip + 2)} L${fmt(x)},${fmt(y)}"/>`;
  }
  out += `</g><path d="M${CX - 11},${fmt(topLip - domeH * 0.72)} Q${CX - 5},${fmt(topLip - domeH * 0.98)} ${CX + 1},${fmt(topLip - domeH * 0.98)}" fill="none" stroke="#b9a5e6" stroke-width="1.6" stroke-linecap="round"/>`;
  out += `<path d="M${CX - HW + 1.5},${fmt(topLip - 0.6)} Q${CX},${fmt(topLip - 3)} ${CX + HW - 1.5},${fmt(topLip - 0.6)}" fill="none" stroke="#4fb3b0" stroke-width="1.2" stroke-linecap="round"/>`;

  // Bottom shell lining (seen from slightly above) and the pearl resting on it.
  const bLine = 0.6 + o * 4.5;
  out += `<ellipse cx="${CX}" cy="${LIP}" rx="${HW - 1}" ry="${fmt(bLine)}" fill="#f2bfd8" stroke="${C.ink}" stroke-width="1"/>`;
  if (pearl !== 'none' && lift > 0.05) {
    const pc = pearl === 'pink' ? ['#fff3fa', '#ff9fd0', '#d4528f'] : ['#ffffff', '#eef4ff', '#9fb1d2'];
    const [pd, pu] = radial([[0, pc[0]], [0.55, pc[1]], [1, pc[2]]], { cx: 0.38, cy: 0.35, r: 0.7 });
    defs += pd;
    const py = LIP - 4;
    const pid = id('pearl');
    defs += `<clipPath id="${pid}"><rect x="0" y="${fmt(topLip)}" width="50" height="50"/></clipPath>`;
    out += `<g clip-path="url(#${pid})">`;
    if (o > 0.4) {
      const [gd, gu] = radial([[0, pearl === 'pink' ? '#ffc6e6' : '#ffffff', 0.9], [1, '#ffffff', 0]]);
      defs += gd;
      out += `<circle cx="${CX}" cy="${py}" r="${fmt(8 + o * 6)}" fill="${gu}" opacity="${fmt(Math.min(1, (o - 0.4) * 1.6))}"/>`;
    }
    out += `<circle cx="${CX}" cy="${py}" r="6.6" fill="${pu}" stroke="${C.ink}" stroke-width="1.3"/>`;
    out += `<circle cx="${CX - 2.2}" cy="${py - 2.3}" r="1.7" fill="#fff"/></g>`;
    if (o > 0.7) out += sparkle(CX + 5.5, py - 5.5, 2.5 + glint * 2.5, '#ffffff');
  }
  // Bottom shell outer (bowl below the lip), in front of everything.
  const bot = `M${CX - HW},${LIP} Q${CX - HW + 1},${LIP + 10} ${CX},${LIP + 10.5} Q${CX + HW - 1},${LIP + 10} ${CX + HW},${LIP} Q${CX},${LIP + 2.4} ${CX - HW},${LIP}Z`;
  out += `<path d="${bot}" fill="${SHELL_BOT}" stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
  out += `<path d="M${CX - 11},${LIP + 3} q2,4 4,6 M${CX},${LIP + 3.4} v6 M${CX + 11},${LIP + 3} q-2,4 -4,6" fill="none" stroke="${SHELL_RIB}" stroke-width="1.2" stroke-linecap="round"/>`;
  return { out, defs };
}

const clamsGrid = () => {
  let defs = '';
  let body = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      let res;
      if (r === 0) {
        const breathe = (1 - Math.cos((c / 10) * TAU)) / 2; // ping-ponged by the game
        res = clam(breathe * 1.4, 'none');
      } else {
        const k = c / 9;
        const ease = k * k * (3 - 2 * k);
        res = clam(ease * 14, r === 1 ? 'white' : r === 3 ? 'pink' : 'none', c === 9 ? 1 : 0);
      }
      const cid = id('clip');
      defs += res.defs + `<clipPath id="${cid}"><rect width="50" height="50"/></clipPath>`;
      body += `<g transform="translate(${c * 50},${r * 50})" clip-path="url(#${cid})">${res.out}</g>`;
    }
  }
  return svg(500, 200, body, defs);
};

export default {
  piranha_basic_swim: piranhaSwim(BLUE),
  piranha_basic_death: piranhaDeath(BLUE),
  piranhashock: piranhaShock,
  piranha_white_swim: piranhaSwim(WHITE),
  piranha_white_death: piranhaDeath(WHITE),
  gumbo_swim: gumboSwim,
  gumbo_die: gumboDie,
  gumbo_shock: gumboShock,
  bonus_creature_swim: jellySwim,
  bonus_creature_death: jellyDeath,
  smallgoldfish: smallFish,
  clams: clamsGrid,
};
