// The diver and his effects: idle animation, the dazed "beaten" pose, the air hose, the
// fight cloud when a shark gets him, bubbles and the Shark Zapper's shockwave.
//
// The diver faces RIGHT (towards the sharks). The game draws the hose sprite 10px right of
// the diver frame (frame x 10..19, centre 14.5) ending at frame y 20, behind the body, so the
// helmet carries a hose fitting there. diver_beaten is drawn 9px further left, so its fitting
// sits at x 23.5.

import { C, STROKE, svg, ink, shade, linear, radial, smoothPath, rot, id, attrs, rng, fmt, text, FONTS } from './lib.mjs';
import { frames, star, bubble, bolt } from './creatures-lib.mjs';

const TAU = Math.PI * 2;
const Y = C.diverYellow;
const YD = C.diverYellowDark;
const BRASS = C.brass;
const BRASS_D = shade(C.brass, -0.3);
const BRASS_L = shade(C.brass, 0.4);
const GLOVE = '#7a4a2a';
const BOOT = C.steel0;

/** Thick outlined limb along a smooth polyline. */
function limb(pts, fill, w = 6) {
  const d = smoothPath(pts, false, 0.5);
  return `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${w + STROKE * 1.6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Heavy weighted boot; (x,y) = heel bottom, toes point right (dir 1). ang tilts it. */
function boot(x, y, ang = 0) {
  const pts = [[x, y], [x, y - 7], [x + 6, y - 8], [x + 9, y - 5], [x + 14, y - 4], [x + 15.5, y - 1.5], [x + 15, y]];
  const p = pts.map((q) => rot(q, [x + 5, y - 4], ang));
  let out = `<path d="${smoothPath(p, true, 0.2)}" ${ink(BOOT, 1.8)}/>`;
  const sole = [[x - 0.5, y - 1.8], [x + 15.5, y - 1.8]].map((q) => rot(q, [x + 5, y - 4], ang));
  out += `<path d="M${fmt(sole[0][0])},${fmt(sole[0][1])} L${fmt(sole[1][0])},${fmt(sole[1][1])}" stroke="${shade(BOOT, 0.25)}" stroke-width="1.2" stroke-linecap="round"/>`;
  const cap = rot([x + 12.2, y - 3.6], [x + 5, y - 4], ang);
  out += `<circle cx="${fmt(cap[0])}" cy="${fmt(cap[1])}" r="2.1" fill="${BRASS}" stroke="${C.ink}" stroke-width="1"/>`;
  return out;
}

/**
 * Brass helmet centred at (cx,cy), radius 14, rotated by ang. face: 'calm' | 'dizzy'.
 * Includes the hose fitting at the top-left (local offset -8.5,-14).
 */
function helmet(cx, cy, ang, face = 'calm', t = 0, fitting = [-8.5, -12.5]) {
  let defs = '';
  const [hd, hu] = radial([[0, BRASS_L], [0.55, BRASS], [1, BRASS_D]], { cx: 0.38, cy: 0.3, r: 0.75 });
  defs += hd;
  let g = `<g transform="translate(${fmt(cx)} ${fmt(cy)}) rotate(${fmt(ang)})">`;
  // Hose fitting (behind the dome so it looks screwed in).
  g += `<rect x="${fitting[0] - 3.2}" y="${fitting[1] - 4}" width="6.4" height="6" rx="1.2" ${ink(BRASS_D, 1.5)}/>`;
  g += `<rect x="${fitting[0] - 4}" y="${fitting[1] - 0.5}" width="8" height="3" rx="1" ${ink(BRASS, 1.3)}/>`;
  // Air valve knob at the back.
  g += `<rect x="-17" y="0" width="5" height="5" rx="1.5" ${ink(BRASS_D, 1.4)}/>`;
  // Dome.
  g += `<circle cx="0" cy="0" r="14" fill="${hu}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  g += `<path d="M-9,-8 Q-5,-12 1,-12.5" fill="none" stroke="#fff6cf" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`;
  // Seam band and rivets.
  g += `<path d="M-13.4,4 Q-4,9 3,8.6" fill="none" stroke="${BRASS_D}" stroke-width="1.4"/>`;
  for (const [x, y] of [[-10, 6.2], [-5, 7.8]]) g += `<circle cx="${x}" cy="${y}" r="0.9" fill="${BRASS_D}"/>`;
  // Small side window with a guard bar.
  g += `<circle cx="-7.5" cy="1.5" r="3.4" fill="#3d6f93" stroke="${C.ink}" stroke-width="1.3"/><path d="M-10.9,1.5 h6.8" stroke="${C.ink}" stroke-width="1"/>`;
  // Front porthole, facing right.
  const [gd, gu] = radial([[0, '#d8f6ff'], [0.7, '#9fd8ef'], [1, '#5ea3c6']], { cx: 0.35, cy: 0.35, r: 0.8 });
  defs += gd;
  g += `<circle cx="7" cy="1" r="8.6" fill="${BRASS_D}" stroke="${C.ink}" stroke-width="${STROKE}"/>`;
  g += `<circle cx="7" cy="1" r="6.4" fill="${gu}" stroke="${C.ink}" stroke-width="1.2"/>`;
  // Face behind the glass.
  g += `<circle cx="8" cy="2" r="5" fill="#f3c49a" opacity="0.92"/>`;
  if (face === 'dizzy') {
    for (const ex of [6.2, 10.4]) g += `<path d="M${ex},0.4 m-1.4,0 a1.4,1.4 0 1,1 1.4,1.4 a0.8,0.8 0 1,1 -0.6,-0.9" fill="none" stroke="${C.ink}" stroke-width="0.8" stroke-linecap="round"/>`;
    g += `<path d="M6.5,4.6 q1.8,-1.3 3.6,0.2" fill="none" stroke="${C.ink}" stroke-width="0.9" stroke-linecap="round"/>`;
  } else {
    const blink = t > 0.55 && t < 0.65;
    for (const ex of [7.2, 10.6]) g += blink ? `<path d="M${ex - 1},0.4 h2" stroke="${C.ink}" stroke-width="0.9" stroke-linecap="round"/>` : `<ellipse cx="${ex}" cy="0.2" rx="0.95" ry="1.3" fill="${C.ink}"/>`;
    g += `<path d="M5.2,-1.9 l2.6,0.4 M9.6,-1.6 l2.4,-0.4" stroke="${C.ink}" stroke-width="0.8" stroke-linecap="round"/>`;
    g += `<path d="M6.8,3.6 q2,1.3 4.4,0 q-1,-0.9 -2.2,-0.2 q-1.2,-0.7 -2.2,0.2z" fill="#7a4a2a"/>`;
  }
  g += `<path d="M3.2,-2.6 Q4.6,-4.6 7,-5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>`;
  // Porthole bolts.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    g += `<circle cx="${fmt(7 + Math.cos(a) * 7.5)}" cy="${fmt(1 + Math.sin(a) * 7.5)}" r="0.7" fill="${BRASS_L}"/>`;
  }
  g += '</g>';
  return { out: g, defs };
}

/** Brass shoulder plate (corselet) with bolts, centred at x=cx, top y. */
function corselet(cx, y, ang = 0) {
  const d = smoothPath([[cx - 15, y + 7], [cx - 10, y], [cx + 10, y], [cx + 15, y + 7], [cx + 12, y + 13], [cx, y + 15], [cx - 12, y + 13]], true, 0.4);
  let out = `<g transform="rotate(${fmt(ang)} ${cx} ${y + 7})"><path d="${d}" ${ink(BRASS)}/>`;
  out += `<path d="M${cx - 10},${y + 3} Q${cx},${y + 1} ${cx + 9},${y + 3}" fill="none" stroke="${BRASS_L}" stroke-width="1.6" stroke-linecap="round"/>`;
  for (const [x, yy] of [[-11, 8], [-5, 11.5], [2, 12.3], [8, 10.5], [12.5, 7]]) out += `<circle cx="${cx + x}" cy="${y + yy}" r="1.1" fill="${BRASS_L}" stroke="${BRASS_D}" stroke-width="0.6"/>`;
  return out + '</g>';
}

/** Suit torso with weight belt. */
function torso(cx, top, ang = 0) {
  const d = smoothPath([[cx - 12, top + 3], [cx, top], [cx + 12, top + 3], [cx + 14, top + 14], [cx + 12, top + 26], [cx, top + 28], [cx - 12, top + 26], [cx - 14, top + 14]], true, 0.5);
  const [gd, gu] = linear([[0, YD], [0.45, Y], [1, shade(Y, 0.15)]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  let out = `<g transform="rotate(${fmt(ang)} ${cx} ${top + 14})"><path d="${d}" ${ink(gu)}/>`;
  // Fold creases.
  out += `<path d="M${cx - 6},${top + 8} q2,4 0,8 M${cx + 5},${top + 10} q-1.6,3 0,6" fill="none" stroke="${YD}" stroke-width="1.2" stroke-linecap="round"/>`;
  // Weight belt with lead blocks and buckle.
  out += `<path d="M${cx - 13.6},${top + 18} Q${cx},${top + 21} ${cx + 13.6},${top + 18} L${cx + 13},${top + 23.5} Q${cx},${top + 26.5} ${cx - 13},${top + 23.5}Z" ${ink(C.wood0, 1.6)}/>`;
  for (const x of [-10, 6]) out += `<rect x="${cx + x}" y="${top + 18.6}" width="5" height="5.6" rx="1" ${ink(C.steel1, 1.1)}/>`;
  out += `<rect x="${cx - 2.6}" y="${top + 19.4}" width="5.2" height="4.6" rx="0.8" fill="none" stroke="${BRASS}" stroke-width="1.4"/>`;
  return { out: out + '</g>', defs: gd };
}

// ------------------------------------------------------------------ diver_idle

function diverIdle(t) {
  const s = Math.sin(t * TAU);
  const bob = s * 0.9; // upper body breathing bob
  const hb = Math.sin(t * TAU - 0.6) * 1.1; // helmet lags a touch
  let defs = '';
  let out = '';
  // Legs and boots (planted).
  out += limb([[19, 62], [18, 70], [19, 76]], YD, 7);
  out += boot(13, 83);
  out += limb([[28, 62], [29, 70], [28, 76]], Y, 7);
  out += boot(22, 83.5);
  // Back arm.
  const swing = s * 1.2;
  out += limb([[14, 42 + bob], [10.5, 50 + bob], [12 + swing * 0.4, 57 + bob]], YD, 6);
  out += `<circle cx="${fmt(12 + swing * 0.4)}" cy="${fmt(58.5 + bob)}" r="3.6" ${ink(shade(GLOVE, -0.15), 1.6)}/>`;
  const tr = torso(24, 37 + bob);
  out += tr.out;
  defs += tr.defs;
  // Helmet + corselet.
  const h = helmet(23, 20 + hb, 0, 'calm', t);
  out += corselet(24, 31 + hb * 0.6);
  out += h.out;
  defs += h.defs;
  // Front arm, hand resting forward.
  out += limb([[32, 42 + bob], [37, 49 + bob], [38 - swing * 0.3, 56 + bob]], Y, 6.4);
  out += `<circle cx="${fmt(38 - swing * 0.3)}" cy="${fmt(57.5 + bob)}" r="3.8" ${ink(GLOVE, 1.6)}/><path d="M${fmt(36 - swing * 0.3)},${fmt(56.5 + bob)} q2,-1 3.4,0.4" fill="none" stroke="${shade(GLOVE, 0.3)}" stroke-width="0.9" stroke-linecap="round"/>`;
  // A little exhaust bubble rising from the valve.
  const bt = (t + 0.3) % 1;
  out += bubble(7.5 - bt * 1.5 + Math.sin(bt * 9) * 0.8, 21 - bt * 18, 1.4 + bt * 0.5);
  return { out, defs };
}

// ------------------------------------------------------------------ diver_beaten

function diverBeaten() {
  let defs = '';
  let out = '';
  // Hauled up by the hose: dangling legs (toes down), limp arms, head lolling.
  out += limb([[20, 60], [18, 69], [19, 74]], YD, 7);
  out += boot(14, 81, 28);
  out += limb([[29, 60], [31, 68], [30, 73]], Y, 7);
  out += boot(25, 82, 40);
  out += limb([[15, 40], [11, 49], [10, 57]], YD, 6);
  out += `<circle cx="10" cy="58.5" r="3.6" ${ink(shade(GLOVE, -0.15), 1.6)}/>`;
  const tr = torso(25, 35, 4);
  out += tr.out;
  defs += tr.defs;
  out += corselet(25, 30, 6);
  // Helmet tilted, fitting still under the hose at x 23.5.
  const ang = 14; // lolling forward
  const fit = rot([-8.5, -12.5], [0, 0], ang); // fitting position after rotation
  const hx = 23.5 - fit[0], hy = 21;
  const h = helmet(hx, hy, ang, 'dizzy');
  out += h.out;
  defs += h.defs;
  // Sticking-plaster cross on the dome.
  out += `<g transform="translate(${fmt(hx + 6)} ${fmt(hy - 10)}) rotate(20)"><rect x="-5" y="-1.6" width="10" height="3.2" rx="1" ${ink('#f6e3c8', 1)}/><rect x="-1.6" y="-5" width="3.2" height="10" rx="1" ${ink('#f6e3c8', 1)}/></g>`;
  // A dent line.
  out += `<path d="M${fmt(hx - 9)},${fmt(hy + 3)} l2,-2 l1.5,2" fill="none" stroke="${BRASS_D}" stroke-width="1.1" stroke-linecap="round"/>`;
  // Front arm hanging limp.
  out += limb([[33, 40], [37, 49], [37, 57]], Y, 6.4);
  out += `<circle cx="37.5" cy="58.5" r="3.8" ${ink(GLOVE, 1.6)}/>`;
  // Dizzy stars circling the head.
  out += star(6, 8, 4.2, C.uiGold, 10, 1.1);
  out += star(43, 12, 3.6, '#ffb03a', -15, 1.1);
  out += star(44, 30, 2.8, C.uiGold, 25, 1);
  out += `<path d="M7,14 Q20,2 34,4 M40,17 Q44,22 43,26" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2 2" stroke-linecap="round" opacity="0.8"/>`;
  return svg(50, 84, out, defs);
}

// ------------------------------------------------------------------ upper_hose

/** 8 frames of a 9x210 hose that tiles vertically; frames ping-pong between two waves. */
function hose() {
  return frames(8, 9, 210, (i) => {
    const a = 1.25 * ((i / 7) * 2 - 1);
    const xAt = (y) => 4.5 + a * Math.sin((y / 210) * TAU * 2) + 0.35 * Math.sin((y / 210) * TAU * 3 + i * 0.4) * (1 - Math.abs(a) / 1.25);
    const pts = [];
    for (let y = -10; y <= 220; y += 5) pts.push([xAt(y), y]);
    const d = 'M' + pts.map(([x, y]) => `${fmt(x)},${y}`).join(' L');
    let out = `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="6.4" stroke-linejoin="round"/>`;
    out += `<path d="${d}" fill="none" stroke="${C.rock1}" stroke-width="3.6" stroke-linejoin="round"/>`;
    const hl = 'M' + pts.map(([x, y]) => `${fmt(x - 0.9)},${y}`).join(' L');
    out += `<path d="${hl}" fill="none" stroke="${C.rock2}" stroke-width="1" stroke-linejoin="round"/>`;
    // Reinforcing rings every 10px (21 per tile, so the pattern repeats exactly).
    for (let y = 5; y < 210; y += 10) {
      const x = xAt(y);
      out += `<path d="M${fmt(x - 2.3)},${y} L${fmt(x + 2.3)},${y}" stroke="${C.rock0}" stroke-width="1.3" stroke-linecap="round"/>`;
    }
    return out;
  });
}

// ------------------------------------------------------------------ rumblecloud

function cloudFrame(i, t) {
  const cx = 70, cy = 64;
  const rnd = rng(100 + i);
  let defs = '';
  let out = '';
  // Things poking out of the scuffle (behind the cloud): shark fin, shark tail, diver boot, glove.
  const spin = t * TAU;
  const at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  {
    const [x, y] = at(-1.9 + spin * 0.5, 40);
    const a = (-1.9 + spin * 0.5) * (180 / Math.PI) + 90;
    out += `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(a)})"><path d="M-9,6 L-2,-12 L3,-13 L9,6Z" ${ink(C.sharkGrey)}/><path d="M-2,-12 L3,-13 L5,-4 L-3,-2Z" fill="${C.sharkGreyDark}"/></g>`;
  }
  {
    const [x, y] = at(0.4 + spin * 0.5, 41);
    const a = (0.4 + spin * 0.5) * (180 / Math.PI) + 90;
    out += `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(a)})"><path d="M-3,6 L-12,-12 L-1,-4 L0,-14 L4,-4 L12,-10 L3,6Z" ${ink(C.sharkGreyDark)}/></g>`;
  }
  {
    const [x, y] = at(2.3 + spin * 0.5, 40);
    const a = (2.3 + spin * 0.5) * (180 / Math.PI) - 90;
    out += `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(a)})">${limb([[0, 10], [0, 0]], Y, 7)}${boot(-5, -2, 180)}</g>`;
  }
  {
    const [x, y] = at(-0.5 + spin * 0.5 + Math.PI, 41);
    out += `<g transform="translate(${fmt(x)} ${fmt(y)})">${limb([[4, 6], [0, 0]], Y, 6)}<circle cx="0" cy="0" r="4.4" ${ink(GLOVE, 1.6)}/></g>`;
  }
  // Cloud: union of puffs (outline pass then fill pass), then soft shading.
  const puffs = [[cx, cy, 30]];
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * TAU + t * TAU * 0.3 + rnd() * 0.2;
    const r = 13 + 3 * Math.sin(k * 1.9 + t * TAU * 2) + rnd() * 2;
    const R = 27 + rnd() * 3;
    puffs.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.92, r]);
  }
  for (const [x, y, r] of puffs) out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r + STROKE)}" fill="${C.ink}"/>`;
  for (const [x, y, r] of puffs) out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="#e9eef5"/>`;
  for (const [x, y, r] of puffs.slice(1)) out += `<circle cx="${fmt(x - r * 0.18)}" cy="${fmt(y - r * 0.2)}" r="${fmt(r * 0.72)}" fill="#ffffff"/>`;
  out += `<circle cx="${cx - 4}" cy="${cy - 5}" r="24" fill="#ffffff"/>`;
  // Dust swirls inside.
  out += `<g fill="none" stroke="#b9c4d6" stroke-width="2" stroke-linecap="round">`;
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + t * TAU * 0.5;
    const r = 10 + k * 7;
    out += `<path d="M${fmt(cx + Math.cos(a) * r)},${fmt(cy + Math.sin(a) * r)} A${r},${r} 0 0,1 ${fmt(cx + Math.cos(a + 1.3) * r)},${fmt(cy + Math.sin(a + 1.3) * r)}"/>`;
  }
  out += '</g>';
  // Flying stars, bubbles and impact ticks in front.
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7 + t * TAU * (k % 2 ? 0.6 : -0.4);
    const r = 44 + (k % 2) * 6;
    const [x, y] = at(a, r);
    out += star(x, y, 5 + (k % 3), k % 2 ? '#ffb03a' : C.uiGold, i * 25 + k * 40, 1.3);
  }
  for (let k = 0; k < 4; k++) {
    const x = cx - 36 + rnd() * 72;
    const y = cy - 30 - ((t * 40 + k * 12) % 26);
    out += bubble(x, y, 1.6 + rnd() * 1.8, 0.9);
  }
  // Comic words.
  const word = i < 4 ? 'CHOMP!' : 'BONK!';
  const wa = i % 2 ? 1 : -1;
  out += `<g transform="rotate(${wa * 7} ${cx} ${cy})">${text(word, { x: cx + wa * 3, y: cy + 5, size: 14 + (i % 3) * 1, file: FONTS.display, anchor: 'middle', fill: C.uiRed, stroke: C.ink, strokeWidth: 3 })}</g>`;
  return { out, defs };
}

// ------------------------------------------------------------------ bubbles

const bubbleImg = (s) => () => {
  const c = s / 2;
  const r = c - 0.6;
  const body =
    `<circle cx="${c}" cy="${c}" r="${fmt(r)}" fill="${C.foam}" fill-opacity="0.25" stroke="#e6f8ff" stroke-width="${fmt(s <= 5 ? 0.8 : 1)}"/>` +
    `<circle cx="${fmt(c - r * 0.38)}" cy="${fmt(c - r * 0.38)}" r="${fmt(Math.max(0.55, r * 0.3))}" fill="#ffffff"/>` +
    (s >= 7 ? `<path d="M${fmt(c + r * 0.55)},${fmt(c + r * 0.15)} A${fmt(r * 0.6)},${fmt(r * 0.6)} 0 0,1 ${fmt(c + r * 0.1)},${fmt(c + r * 0.58)}" fill="none" stroke="#ffffff" stroke-width="0.6" opacity="0.7"/>` : '');
  return svg(s, s, body);
};

// ------------------------------------------------------------------ empwave

function empwave() {
  const W = 209, H = 480, cx = 104.5;
  const rnd = rng(77);
  const [gd, gu] = linear(
    [[0, '#3fd6ff', 0], [0.22, '#3fd6ff', 0.18], [0.4, '#7fe9ff', 0.55], [0.5, '#ffffff', 0.95], [0.6, '#7fe9ff', 0.55], [0.78, '#3fd6ff', 0.18], [1, '#3fd6ff', 0]],
    { x1: 0, y1: 0, x2: 1, y2: 0 },
  );
  const blur = id('blur');
  const blur2 = id('blur');
  let defs = gd + `<filter id="${blur}" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="4"/></filter>`;
  defs += `<filter id="${blur2}" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="10"/></filter>`;
  let out = `<rect x="0" y="0" width="${W}" height="${H}" fill="${gu}"/>`;
  // Wavy bright core with soft glow.
  let core = `M${cx},-10`;
  for (let y = 0; y <= H + 10; y += 12) core += ` L${fmt(cx + Math.sin(y * 0.05) * 6 + Math.sin(y * 0.13) * 3)},${y}`;
  out += `<path d="${core}" fill="none" stroke="#9ff0ff" stroke-width="26" filter="url(#${blur2})" opacity="0.8"/>`;
  out += `<path d="${core}" fill="none" stroke="#ffffff" stroke-width="7" filter="url(#${blur})"/>`;
  // Lightning arcs zig-zagging down the band, glowing cyan with white cores.
  let arcs = '';
  for (let k = 0; k < 6; k++) {
    const off = (k - 2.5) * 13;
    arcs += bolt(cx + off * 0.4, -5, cx - off * 0.6, H + 5, 34, 14 + k * 2, rnd) + ' ';
  }
  // Short forks branching off.
  let forks = '';
  for (let k = 0; k < 22; k++) {
    const y = 10 + rnd() * (H - 20);
    const x = cx + (rnd() * 2 - 1) * 20;
    const dir = rnd() > 0.5 ? 1 : -1;
    forks += bolt(x, y, x + dir * (25 + rnd() * 45), y + (rnd() * 2 - 1) * 30, 5, 6, rnd) + ' ';
  }
  out += `<path d="${arcs}${forks}" fill="none" stroke="#3fd6ff" stroke-width="5" stroke-linejoin="round" filter="url(#${blur})" opacity="0.9"/>`;
  out += `<path d="${arcs}" fill="none" stroke="#c8f6ff" stroke-width="2" stroke-linejoin="round"/>`;
  out += `<path d="${forks}" fill="none" stroke="#e9fcff" stroke-width="1.2" stroke-linejoin="round" opacity="0.9"/>`;
  // Sparks.
  for (let k = 0; k < 40; k++) {
    const x = cx + (rnd() * 2 - 1) * 70, y = rnd() * H;
    out += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(0.8 + rnd() * 1.6)}" fill="#ffffff" opacity="${fmt(0.5 + rnd() * 0.5)}"/>`;
  }
  return svg(W, H, out, defs);
}

export default {
  diver_idle: () => frames(8, 50, 84, (_i, t) => diverIdle(t)),
  diver_beaten: diverBeaten,
  upper_hose: hose,
  rumblecloud: () => frames(7, 125, 125, cloudFrame),
  bubble1: bubbleImg(5),
  bubble2: bubbleImg(7),
  bubble3: bubbleImg(9),
  empwave,
};

void attrs;
