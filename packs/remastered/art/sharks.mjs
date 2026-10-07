// Shark family: regular, hammerhead (2 words, "black"), tiger (3 words, "red"), ghost and
// toxic sharks. Frames are 160x70 (glows 180x90), facing left, 20 swim / 6 death frames.
// The word is drawn by the game across the middle of the body, so the flank stays light
// and calm there.
//
// This module is the style reference for the pack: chunky ink outlines (STROKE), two-tone
// cel shading (base colour + darker back, light belly), round friendly eyes, simple shapes.

import { C, STROKE, svg, strip, ink, shade, linear, smoothPath, rot, id, attrs } from './lib.mjs';

const FW = 160;
const FH = 70;
const CY = 37; // body centre line

/**
 * One shark pose in a 160x70 frame. t in [0,1) drives the tail sweep.
 * opts: base, back, belly colours; head: 'round' | 'hammer'; stripes; spots; face.
 */
function shark(t, opts) {
  const {
    base = C.sharkGrey,
    back = C.sharkGreyDark,
    belly = C.sharkBelly,
    head = 'round',
    stripes = 0,
    stripeColor = C.tigerStripe,
    spots = false,
    face = 'grin',
    opacity = 1,
    outline = C.ink,
  } = opts;
  const wag = Math.sin(t * Math.PI * 2); // -1..1
  const flex = wag * 3; // body tip sway
  const tailAngle = wag * 14;

  // Body silhouette: nose at left, tapering to the tail peduncle at right.
  const top = [
    [6, CY + 1],
    [22, CY - 13],
    [52, CY - 20],
    [86, CY - 19],
    [112, CY - 12],
    [128, CY - 5 + flex * 0.4],
    [136, CY - 2 + flex],
  ];
  const bottom = [
    [136, CY + 3 + flex],
    [124, CY + 7 + flex * 0.4],
    [96, CY + 14],
    [60, CY + 17],
    [34, CY + 14],
    [14, CY + 7],
  ];
  const bodyD = smoothPath([...top, ...bottom], true, 0.55);
  const bellyD = smoothPath(
    [
      [20, CY + 4],
      [40, CY + 3],
      [80, CY + 4],
      [118, CY + 3 + flex * 0.4],
      [124, CY + 7 + flex * 0.4],
      [96, CY + 14],
      [60, CY + 17],
      [34, CY + 14],
    ],
    true,
    0.5,
  );

  // Tail fin, rotated around the peduncle.
  const pivot = [134, CY + flex];
  const tail = [
    [132, CY - 2],
    [144, CY - 20],
    [158, CY - 32],
    [153, CY - 12],
    [148, CY + 1],
    [157, CY + 20],
    [143, CY + 14],
    [134, CY + 4],
  ].map((p) => rot([p[0], p[1] + flex], pivot, tailAngle));
  const tailD = smoothPath(tail, true, 0.25);

  // Fins: dorsal (sways a little), pectoral, small rear fins.
  const dorsal = smoothPath([[54, CY - 18], [70, CY - 36 + wag], [80, CY - 36 + wag], [76, CY - 30 + wag], [86, CY - 19]], true, 0.25);
  const pecFlap = Math.sin(t * Math.PI * 2 + 1) * 3;
  const pectoral = smoothPath([[52, CY + 12], [44, CY + 26 + pecFlap], [52, CY + 27 + pecFlap], [66, CY + 14]], true, 0.2);
  const rearTop = smoothPath([[110, CY - 11], [116, CY - 18], [121, CY - 9]], true, 0.2);
  const rearBot = smoothPath([[104, CY + 11], [108, CY + 20], [114, CY + 10]], true, 0.2);

  const [gdef, gurl] = linear([[0, shade(base, 0.12)], [0.55, base], [1, back]], { x1: 0, y1: 1, x2: 0, y2: 0 });
  let defs = gdef;
  const w = STROKE;
  let out = `<g opacity="${opacity}">`;
  const st = (fill) => attrs({ fill, stroke: outline, 'stroke-width': w, 'stroke-linejoin': 'round' });
  out += `<path d="${tailD}" ${st(back)}/>`;
  out += `<path d="${rearBot}" ${st(back)}/><path d="${dorsal}" ${st(back)}/><path d="${rearTop}" ${st(back)}/>`;
  out += `<path d="${bodyD}" ${st(gurl)}/>`;
  // Light belly and flank where the word goes.
  const cid = id('body');
  defs += `<clipPath id="${cid}"><path d="${bodyD}"/></clipPath>`;
  out += `<g clip-path="url(#${cid})"><path d="${bellyD}" fill="${belly}"/>`;
  for (let i = 0; i < stripes; i++) {
    const x = 50 + i * 16;
    out += `<path d="M${x},${CY - 22} q5,9 -1,16" fill="none" stroke="${stripeColor}" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (spots) {
    const pts = [[46, CY - 10], [70, CY - 13], [98, CY - 9], [84, CY - 4], [118, CY - 6]];
    for (const [x, y] of pts) out += `<circle cx="${x}" cy="${y}" r="3.2" fill="${shade(base, 0.45)}" stroke="${shade(back, -0.2)}" stroke-width="1"/>`;
  }
  out += `</g><path d="${bodyD}" fill="none" stroke="${outline}" stroke-width="${w}" stroke-linejoin="round"/>`;
  out += `<path d="${pectoral}" ${st(back)}/>`;
  // Gills.
  for (let i = 0; i < 3; i++) out += `<path d="M${40 + i * 5},${CY - 6} q2,6 0,11" fill="none" stroke="${shade(back, -0.25)}" stroke-width="1.4" stroke-linecap="round"/>`;

  if (head === 'hammer') {
    // Hammer head: a wide crossbar at the nose with eyes at the tips.
    const hb = smoothPath([[5, CY - 22], [13, CY - 22], [16, CY - 10], [30, CY - 9], [30, CY + 6], [16, CY + 8], [13, CY + 19], [5, CY + 19], [3, CY - 2]], true, 0.2);
    out += `<path d="${hb}" ${st(shade(base, 0.05))}/>`;
    for (const ey of [CY - 17, CY + 14]) out += `<circle cx="8.5" cy="${ey}" r="3.6" fill="#fff" stroke="${outline}" stroke-width="1.5"/><circle cx="7.8" cy="${ey}" r="1.8" fill="${C.ink}"/>`;
    out += `<path d="M5,${CY - 22} l8,2" stroke="${outline}" stroke-width="2" stroke-linecap="round"/>`;
    const m = `M11,${CY + 2} q9,7 20,1`;
    out += `<path d="${m} q-10,5 -20,-1z" fill="#7a1f2b" stroke="${outline}" stroke-width="1.4"/>`;
    for (let i = 0; i < 4; i++) out += `<path d="M${13 + i * 4.2},${CY + 3.2} l2,3 l2,-3z" fill="#fff"/>`;
  } else {
    // Eye and toothy grin.
    out += `<circle cx="25" cy="${CY - 6}" r="4.4" fill="#fff" stroke="${outline}" stroke-width="1.5"/><circle cx="23.8" cy="${CY - 5.4}" r="2.3" fill="${C.ink}"/><circle cx="23.2" cy="${CY - 6.4}" r="0.8" fill="#fff"/>`;
    if (face !== 'none') out += `<path d="M18,${CY - 12} l13,4" stroke="${outline}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (face === 'grin') {
      // Wide jaw with two rows of jagged teeth.
      out += `<path d="M9,${CY + 3} q16,10 34,1 q-6,10 -18,10 q-10,0 -16,-11z" fill="#6e1626" stroke="${outline}" stroke-width="1.5" stroke-linejoin="round"/>`;
      let teeth = `M10,${CY + 3.6}`;
      for (let i = 0; i < 7; i++) teeth += ` l2.3,4 l2.3,-4`;
      out += `<path d="${teeth}" fill="#fff" stroke="${outline}" stroke-width="0.8" stroke-linejoin="round"/>`;
      let low = `M15,${CY + 12.6}`;
      for (let i = 0; i < 5; i++) low += ` l2.2,-3.4 l2.2,3.4`;
      out += `<path d="${low}" fill="#fff" stroke="${outline}" stroke-width="0.8" stroke-linejoin="round"/>`;
    } else if (face === 'x') {
      out += `<path d="M20,${CY + 5} q10,3 20,0" fill="none" stroke="${outline}" stroke-width="1.6"/>`;
    }
  }
  out += '</g>';
  return { out, defs };
}

/** Collect markup and defs from per-frame drawing into one SVG. */
function frames(n, fw, fh, draw, w = fw * n) {
  let defs = '';
  const body = strip(n, fw, fh, (i, t) => {
    const r = draw(i, t);
    defs += r.defs;
    return r.out;
  });
  return svg(w, fh, body, defs);
}

const swim = (opts) => () => frames(20, FW, FH, (_i, t) => shark(t, opts));

/** Death: rolls belly-up with X eyes and sinks/fades a touch over 6 frames. */
const death = (opts) => () =>
  frames(6, FW, FH, (i) => {
    const k = i / 5;
    const r = shark(0.25, { ...opts, face: 'x', opacity: 1 - k * 0.35 });
    const ang = 180 * Math.min(1, k * 1.4);
    const eyeX = opts.head === 'hammer' ? 8 : 27;
    const xs = `<g stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"><path d="M${eyeX - 3},${CY - 9} l6,6 M${eyeX + 3},${CY - 9} l-6,6"/></g>`;
    return { out: `<g transform="rotate(${ang} 80 ${CY}) translate(0 ${k * 4})">${r.out}${xs}</g>`, defs: r.defs };
  });

/** Shock: an electrified x-ray silhouette (single frame). */
const shock = (opts) => () => {
  const r = shark(0.25, { ...opts, base: '#1b3a8a', back: '#10246a', belly: '#2a55b8', stripes: 0, spots: false, outline: '#ffffff', face: 'none' });
  const bones =
    `<g stroke="#bfe8ff" stroke-width="2" stroke-linecap="round" fill="none">` +
    `<path d="M24,${CY} L132,${CY}"/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M${42 + i * 10},${CY - 9} L${44 + i * 10},${CY + 9}"/>`).join('') +
    `<circle cx="27" cy="${CY - 6}" r="4" fill="#bfe8ff"/></g>`;
  const bolts = `<g stroke="#fff36b" stroke-width="2" fill="none" stroke-linejoin="round"><path d="M70,2 l-6,10 h8 l-6,10"/><path d="M118,60 l-5,-8 h7 l-5,-8"/><path d="M30,58 l5,-8 h-7 l5,-8"/></g>`;
  return svg(FW, FH, r.out + bones + bolts, r.defs);
};

/** Glow underlay (additive): soft halo around the body, 180x90 frames centred on the shark. */
const glow = (n, color) => () =>
  frames(n, 180, 90, (_i, t) => {
    const fid = id('blur');
    const pulse = 0.75 + 0.25 * Math.sin(t * Math.PI * 2);
    const defs = `<filter id="${fid}" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>`;
    const out = `<g filter="url(#${fid})" opacity="${pulse}"><ellipse cx="90" cy="47" rx="70" ry="22" fill="${color}"/><ellipse cx="160" cy="45" rx="14" ry="20" fill="${color}"/></g>`;
    return { out, defs };
  });

const REGULAR = {};
const HAMMER = { head: 'hammer', base: C.hammer, back: shade(C.hammer, -0.3) };
const TIGER = { base: C.tigerOrange, back: shade(C.tigerOrange, -0.3), belly: '#fde7c8', stripes: 5 };
const GHOST = { base: C.ghost, back: shade(C.ghost, -0.25), belly: '#f2fdff' };
const TOXIC = { base: C.toxic, back: C.toxicDark, belly: '#e9ffd2', spots: true };

export default {
  shark_basic_swim: swim(REGULAR),
  shark_basic_death: death(REGULAR),
  sharkshock: shock(REGULAR),
  shark_black_swim: swim(HAMMER),
  shark_black_death: death(HAMMER),
  shark_black_shock: shock(HAMMER),
  shark_red_swim: swim(TIGER),
  shark_red_death: death(TIGER),
  shark_red_shock: shock(TIGER),
  shark_ghost_swim: swim({ ...GHOST, opacity: 0.85 }),
  shark_ghost_death: death({ ...GHOST, opacity: 0.85 }),
  shark_ghost_glow_swim: glow(20, '#7fe7ff'),
  shark_ghost_glow_death: glow(6, '#7fe7ff'),
  toxic_basic_swim: swim(TOXIC),
  toxic_basic_death: death(TOXIC),
  toxic_basic_shock: shock(TOXIC),
  toxic_glow_swim: glow(20, '#9dff4a'),
  toxic_glow_death: glow(6, '#9dff4a'),
};

void ink;
