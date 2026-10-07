// Level-complete sonar console. sonar_bg (364x364) is drawn at screen (138, 23), so the radar
// centre is (182, 182) in the image = screen (320, 205). The stats text is drawn over the
// glass (screen x 190..450, y 105..330), so the glass is dark and calm.
//
// Sweep quadrants (155x155) are drawn on top: sonar_sweep_N is the top-right quadrant (radar
// centre at its bottom-left corner), sonar_sweep2_N the bottom-right one (centre at top-left).
// Frames 1..4 move the beam clockwise through the quadrant; frame 0 is a faint afterglow.

import { C, svg, linear, radial, text, FONTS, fmt, rng } from './lib.mjs';
import { blur } from './bosses-lib.mjs';

const CX = 182, CY = 182;
const R_GLASS = 162;
const BEAM = '#7dffb0';

function bg() {
  const [gb, ub] = linear([[0, '#a9b6c4'], [0.5, '#6a7888'], [1, '#3a4552']]);
  const [gi, ui] = linear([[0, '#2b3442'], [1, '#8a97a6']]);
  const [gg, ug] = radial([[0, '#0f3b33'], [0.7, '#0a2a25'], [1, '#04120f']]);
  let out = '';
  // Bezel ring.
  out += `<circle cx="${CX}" cy="${CY}" r="180" fill="${ub}" stroke="${C.ink}" stroke-width="2.5"/>`;
  out += `<circle cx="${CX}" cy="${CY}" r="170" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="2"/>`;
  out += `<circle cx="${CX}" cy="${CY}" r="${R_GLASS + 4}" fill="${ui}" stroke="${C.ink}" stroke-width="2"/>`;
  // Bolts.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
    const x = CX + Math.cos(a) * 173, y = CY + Math.sin(a) * 173;
    out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="3.6" fill="#c7ccd6" stroke="${C.ink}" stroke-width="1.2"/><path d="M${fmt(x - 2)},${fmt(y)} h4" stroke="${C.ink}" stroke-width="1"/>`;
  }
  // Glass.
  out += `<circle cx="${CX}" cy="${CY}" r="${R_GLASS}" fill="${ug}" stroke="${C.ink}" stroke-width="2"/>`;
  const g = '#2f9c78';
  for (const r of [40, 80, 120, 155]) out += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${g}" stroke-opacity="${r === 155 ? 0.5 : 0.22}" stroke-width="1"/>`;
  out += `<path d="M${CX - 155},${CY} H${CX + 155} M${CX},${CY - 155} V${CY + 155}" stroke="${g}" stroke-opacity="0.22" stroke-width="1"/>`;
  out += `<path d="M${CX - 110},${CY - 110} L${CX + 110},${CY + 110} M${CX - 110},${CY + 110} L${CX + 110},${CY - 110}" stroke="${g}" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="3 5"/>`;
  // Rim ticks.
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const l = k % 6 === 0 ? 8 : 4;
    const r0 = R_GLASS - 1, r1 = R_GLASS - 1 - l;
    out += `<path d="M${fmt(CX + Math.cos(a) * r0)},${fmt(CY + Math.sin(a) * r0)} L${fmt(CX + Math.cos(a) * r1)},${fmt(CY + Math.sin(a) * r1)}" stroke="${g}" stroke-opacity="0.6" stroke-width="1"/>`;
  }
  out += `<circle cx="${CX}" cy="${CY}" r="2.5" fill="${g}" opacity="0.6"/>`;
  // Glass reflection along the top-left edge only (keeps the middle calm).
  out += `<path d="M${CX - 140},${CY - 60} A150,150 0 0 1 ${CX - 50},${CY - 145}" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="6" stroke-linecap="round"/>`;
  // Name plate at the bottom of the bezel.
  out += `<rect x="${CX - 26}" y="${CY + 166}" width="52" height="12" rx="3" fill="#2f3b52" stroke="${C.ink}" stroke-width="1.2"/>`;
  out += text('SONAR', { x: CX, y: CY + 175.5, size: 9, file: FONTS.slab, anchor: 'middle', fill: BEAM });
  return svg(364, 364, out, gb + gi + gg);
}

/**
 * One sweep quadrant frame. centre = radar centre in image coords; base = clockwise angle
 * (degrees from north) where the quadrant starts; f = frame 0..4.
 */
function sweep(centre, base, f, seed) {
  const [cx, cy] = centre;
  const R = 152;
  const [bd, bu] = blur(2.5);
  let out = '';
  const pt = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  };
  const wedge = (a0, a1, op) => {
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    return `<path d="M${cx},${cy} L${fmt(x0)},${fmt(y0)} A${R},${R} 0 0 1 ${fmt(x1)},${fmt(y1)} Z" fill="${BEAM}" opacity="${fmt(op)}"/>`;
  };
  // Blips: a couple per quadrant, lit once the beam has passed them.
  const Rn = rng(seed);
  const blips = [0, 1].map(() => ({ a: base + 15 + Rn() * 60, r: 60 + Rn() * 80 }));
  if (f === 0) {
    for (const b of blips) {
      const [x, y] = pt(b.a, b.r);
      out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="2.2" fill="${BEAM}" opacity="0.25"/>`;
    }
    return { out, defs: bd };
  }
  const beam = base + (f - 1) * 22.5 + 11.25;
  // Trailing glow behind the beam (counter-clockwise side).
  for (let k = 0; k < 10; k++) out += wedge(beam - (k + 1) * 4, beam - k * 4, 0.22 * (1 - k / 10) ** 1.5);
  const [bx, by] = pt(beam, R);
  out += `<path d="M${cx},${cy} L${fmt(bx)},${fmt(by)}" stroke="${BEAM}" stroke-width="6" opacity="0.6" filter="${bu}"/>`;
  out += `<path d="M${cx},${cy} L${fmt(bx)},${fmt(by)}" stroke="#c8ffdf" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`;
  for (const b of blips) {
    const behind = beam - b.a;
    if (behind < 0 || behind > 60) continue;
    const op = 1 - behind / 60;
    const [x, y] = pt(b.a, b.r);
    out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="5" fill="${BEAM}" opacity="${fmt(op * 0.6)}" filter="${bu}"/><circle cx="${fmt(x)}" cy="${fmt(y)}" r="2.4" fill="#eafff3" opacity="${fmt(op)}"/>`;
  }
  return { out, defs: bd };
}

const quad = (centre, base, f, seed) => () => {
  const r = sweep(centre, base, f, seed);
  return svg(155, 155, r.out, r.defs);
};

const out = { sonar_bg: bg };
for (let f = 0; f < 5; f++) {
  out[`sonar_sweep_${f}`] = quad([0, 155], 0, f, 5);
  out[`sonar_sweep2_${f}`] = quad([0, 0], 90, f, 9);
}
export default out;
