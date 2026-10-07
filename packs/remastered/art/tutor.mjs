// Typing tutor screen: tutor_bg (keyboard console + right-hand "TUTOR MODE" panel), one
// glo_* highlight per key cap, the yellow-glove hands with separate idle/pressed fingers, and
// the glowring finger marker.
//
// Layout is fixed by the game (src/scenes/tutorlayout.ts):
// - each glo_* image is drawn with its top-left at KEY_GLOW[key]; the key caps in tutor_bg
//   are derived from those same rects (see capRect) so the glows line up exactly. Keys the
//   game never lights (tab, caps, backspace, enter, ctrl, alt) use EXTRA positions below.
// - fingers are drawn at FINGER_POS, then `hands` at (13,379) on top of them, so each finger
//   image is a whole finger whose base hides under the knuckles of the hands image.
// - fingertips sit at the centre of RING_POS + 29 so the glowring frames them.

import { C, svg, text, FONTS, linear, radial, shade, smoothPath, id, fmt } from './lib.mjs';

// ---------------------------------------------------------------- keyboard layout

/** Glow rects [x, y, w, h] in screen coordinates (KEY_GLOW positions + spec sizes). */
const R = {
  tilde: [36, 171, 29, 22], 1: [64, 171, 28, 22], 2: [91, 171, 26, 23], 3: [117, 171, 24, 22],
  4: [141, 171, 25, 21], 5: [166, 171, 25, 21], 6: [190, 171, 25, 21], 7: [215, 171, 22, 21],
  8: [237, 171, 24, 21], 9: [264, 171, 24, 21], 0: [289, 171, 25, 21], hyphen: [315, 171, 27, 21],
  plus: [342, 171, 25, 21],
  q: [67, 197, 28, 22], w: [94, 197, 28, 22], e: [122, 197, 24, 22], r: [148, 197, 24, 22],
  t: [174, 197, 24, 22], y: [198, 197, 24, 22], u: [223, 197, 24, 22], i: [248, 197, 24, 22],
  o: [274, 197, 24, 22], p: [300, 197, 27, 22], lbrace: [328, 197, 28, 22], rbrace: [356, 197, 27, 22],
  backslash: [383, 197, 27, 22],
  a: [75, 224, 29, 23], s: [104, 224, 29, 23], d: [133, 224, 26, 23], f: [160, 224, 26, 23],
  g: [188, 224, 25, 23], h: [213, 224, 25, 23], j: [238, 224, 26, 23], k: [265, 224, 26, 23],
  l: [292, 224, 28, 23], colon: [321, 224, 29, 22], apostrophe: [350, 224, 29, 22],
  z: [83, 252, 28, 22], x: [113, 252, 28, 22], c: [143, 252, 28, 22], v: [171, 252, 28, 22],
  b: [201, 252, 25, 22], n: [227, 252, 25, 22], m: [254, 252, 27, 22], comma: [283, 252, 27, 22],
  period: [310, 252, 29, 22], forslash: [341, 252, 29, 22],
  space: [119, 278, 217, 24], lshift: [20, 252, 61, 22], rshift: [372, 252, 50, 22],
  // Not in KEY_GLOW (never lit by the game); placed where tutor_bg draws them.
  back: [369, 171, 39, 21], tab: [31, 197, 35, 22], caps: [24, 224, 49, 22], enter: [381, 224, 36, 22],
  lctrl: [22, 278, 41, 24], lalt: [74, 278, 41, 24], ralt: [340, 278, 40, 24], rctrl: [384, 278, 40, 24],
};

const ROWS = [
  ['tilde', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'hyphen', 'plus', 'back'],
  ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'lbrace', 'rbrace', 'backslash'],
  ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'colon', 'apostrophe', 'enter'],
  ['lshift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'comma', 'period', 'forslash', 'rshift'],
  ['lctrl', 'lalt', 'space', 'ralt', 'rctrl'],
];
/** Cap top / bottom per row (uniform within a row, inside every glow rect of the row). */
const ROW_Y = [[172, 191], [198.5, 217.5], [225.5, 244.5], [253.5, 272.5], [279.5, 300.5]];

/** Legends: [shifted, plain] pairs are stacked; strings are centred words. */
const LEGEND = {
  tilde: ['~', '`'], 1: ['!', '1'], 2: ['@', '2'], 3: ['#', '3'], 4: ['$', '4'], 5: ['%', '5'],
  6: ['^', '6'], 7: ['&', '7'], 8: ['*', '8'], 9: ['(', '9'], 0: [')', '0'], hyphen: ['_', '-'],
  plus: ['+', '='], lbrace: ['{', '['], rbrace: ['}', ']'], backslash: ['|', '\\'], colon: [':', ';'],
  apostrophe: ['"', "'"], comma: ['<', ','], period: ['>', '.'], forslash: ['?', '/'],
  back: 'Back', tab: 'Tab', caps: 'Caps', enter: 'Enter', lshift: 'Shift', rshift: 'Shift',
  lctrl: 'Ctrl', rctrl: 'Ctrl', lalt: 'Alt', ralt: 'Alt', space: '',
};

/** Cap rect [x0, y0, x1, y1]: neighbours split the space between their glow rects with a 3px gap. */
const CAP = {};
ROWS.forEach((row, ri) => {
  const [y0, y1] = ROW_Y[ri];
  row.forEach((k, i) => {
    const [x, , w] = R[k];
    let x0 = x + 1.5;
    let x1 = x + w - 1.5;
    if (i > 0) {
      const [px, , pw] = R[row[i - 1]];
      x0 = Math.max(x + 1, (px + pw + x) / 2 + 1.5);
    }
    if (i < row.length - 1) {
      const [nx] = R[row[i + 1]];
      x1 = Math.min(x + w - 1, (x + w + nx) / 2 - 1.5);
    }
    CAP[k] = [x0, y0, x1, y1];
  });
});

function legend(k, [x0, y0, x1], color) {
  const L = LEGEND[k];
  const cx = (x0 + x1) / 2;
  if (L === undefined) return text(k.toUpperCase(), { x: cx, y: y0 + 11.6, size: 10.5, file: FONTS.sans, anchor: 'middle', fill: color });
  if (Array.isArray(L)) {
    return (
      text(L[0], { x: cx, y: y0 + 7.4, size: 7.5, file: FONTS.sans, anchor: 'middle', fill: color }) +
      text(L[1], { x: cx, y: y0 + 14.6, size: 8.5, file: FONTS.sans, anchor: 'middle', fill: color })
    );
  }
  return L ? text(L, { x: cx, y: y0 + 10.6, size: 7.5, file: FONTS.condensed, anchor: 'middle', fill: color, letterSpacing: 0.3 }) : '';
}

/** One key cap in screen coordinates. lit = glow version. Returns [defs, body]. */
function keyCap(k, lit = false) {
  let [x0, y0, x1, y1] = CAP[k];
  let defs = '';
  let out = '';
  if (lit) {
    // Slightly larger than the idle cap so it fully covers it, plus a soft halo to the rect edge.
    const [rx, ry, rw, rh] = R[k];
    out += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="5" fill="#ff5fa2" opacity="0.55"/>`;
    out += `<rect x="${rx + 0.6}" y="${ry + 0.6}" width="${rw - 1.2}" height="${rh - 1.2}" rx="4.5" fill="#ffd0e4" opacity="0.5"/>`;
    x0 = Math.max(rx + 0.5, x0 - 0.8);
    x1 = Math.min(rx + rw - 0.5, x1 + 0.8);
    y0 = Math.max(ry + 0.5, y0 - 0.8);
    y1 = Math.min(ry + rh - 0.5, y1 + 0.8);
  }
  const w = x1 - x0;
  const h = y1 - y0;
  const [gd, gu] = lit
    ? linear([[0, '#fff6b8'], [0.45, '#ffc04a'], [1, '#ff7a3d']])
    : linear([[0, '#ffffff'], [1, '#d9e2ee']]);
  defs += gd;
  const side = lit ? '#e0386f' : '#8d9ab3';
  out += `<rect x="${fmt(x0)}" y="${fmt(y0)}" width="${fmt(w)}" height="${fmt(h)}" rx="3" fill="${side}" stroke="${C.ink}" stroke-width="1.2"/>`;
  const fx0 = x0 + 1.8, fy0 = y0 + 1.1, fw = w - 3.6, fh = h - 4.4;
  out += `<rect x="${fmt(fx0)}" y="${fmt(fy0)}" width="${fmt(fw)}" height="${fmt(fh)}" rx="2.4" fill="${gu}"/>`;
  out += `<path d="M${fmt(fx0 + 2)},${fmt(fy0 + 1)} H${fmt(fx0 + fw - 2)}" stroke="#fff" stroke-opacity="${lit ? 0.9 : 0.8}" stroke-width="1" stroke-linecap="round"/>`;
  if (k === 'f' || k === 'j') out += `<path d="M${fmt((x0 + x1) / 2 - 3)},${fmt(fy0 + fh - 1.6)} h6" stroke="${lit ? C.ink : '#7d8aa3'}" stroke-width="1.1" stroke-linecap="round"/>`;
  out += legend(k, [x0, y0, x1, y1], lit ? '#3a0d24' : C.ink);
  return [defs, out];
}

// ---------------------------------------------------------------- tutor_bg

const KB = { l: 24, r: 420, top: 160, bl: 8, br: 436, bot: 310 };

function keyboard() {
  let defs = '';
  let out = '';
  // Drop shadow on the water.
  out += `<path d="M${KB.l + 6},${KB.top + 10} L${KB.r + 10},${KB.top + 10} L${KB.br + 8},${KB.bot + 16} L${KB.bl + 4},${KB.bot + 16} Z" fill="${C.sea0}" opacity="0.35"/>`;
  // Casing: front lip (thickness) then the top surface.
  const [lipD, lipU] = linear([[0, C.steel1], [1, C.steel0]]);
  defs += lipD;
  out += `<path d="M${KB.bl},${KB.bot - 6} L${KB.br},${KB.bot - 6} L${KB.br - 2},${KB.bot + 8} Q${KB.br - 3},${KB.bot + 11} ${KB.br - 7},${KB.bot + 11} L${KB.bl + 7},${KB.bot + 11} Q${KB.bl + 3},${KB.bot + 11} ${KB.bl + 2},${KB.bot + 8} Z" fill="${lipU}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  const [topD, topU] = linear([[0, '#7f93ad'], [1, '#56677f']]);
  defs += topD;
  const body = `M${KB.l + 6},${KB.top} L${KB.r - 6},${KB.top} Q${KB.r},${KB.top} ${KB.r + 1},${KB.top + 6} L${KB.br},${KB.bot - 6} Q${KB.br + 1},${KB.bot} ${KB.br - 6},${KB.bot} L${KB.bl + 6},${KB.bot} Q${KB.bl - 1},${KB.bot} ${KB.bl},${KB.bot - 6} L${KB.l - 1},${KB.top + 6} Q${KB.l},${KB.top} ${KB.l + 6},${KB.top} Z`;
  out += `<path d="${body}" fill="${topU}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  // Rim highlight along the top edge.
  out += `<path d="M${KB.l + 6},${KB.top + 2.2} L${KB.r - 6},${KB.top + 2.2}" stroke="#c5d3e4" stroke-width="1.6" stroke-linecap="round"/>`;
  // Recessed key deck.
  const deck = `M${KB.l + 8},${KB.top + 8} L${KB.r - 7},${KB.top + 8} L${KB.br - 8},${KB.bot - 6} L${KB.bl + 9},${KB.bot - 6} Z`;
  out += `<path d="${deck}" fill="${C.ui0}" stroke="${shade(C.ink, 0.1)}" stroke-width="1.4" stroke-linejoin="round"/>`;
  out += `<path d="M${KB.l + 9},${KB.top + 9.5} L${KB.r - 8},${KB.top + 9.5}" stroke="${C.ink}" stroke-opacity="0.6" stroke-width="2"/>`;
  // Screws in the corners of the casing.
  for (const [x, y] of [[KB.l + 4.5, KB.top + 4.5], [KB.r - 4.5, KB.top + 4.5], [KB.bl + 5, KB.bot - 3], [KB.br - 5, KB.bot - 3]]) {
    out += `<circle cx="${x}" cy="${y}" r="2" fill="${C.steel2}" stroke="${C.ink}" stroke-width="0.9"/><path d="M${x - 1.1},${y - 1.1} l2.2,2.2" stroke="${C.ink}" stroke-width="0.7"/>`;
  }
  // Little status lights on the lip.
  out += `<circle cx="${KB.br - 26}" cy="${KB.bot + 4}" r="2" fill="${C.uiGreen}" stroke="${C.ink}" stroke-width="0.8"/>`;
  out += `<circle cx="${KB.br - 18}" cy="${KB.bot + 4}" r="2" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="0.8"/>`;
  for (const k of Object.keys(R)) {
    const [d, b] = keyCap(k);
    defs += d;
    out += b;
  }
  return [defs, out];
}

/** Ribbed hose from the keyboard to the side panel. */
function hose() {
  let out = '';
  const y = 232;
  out += `<path d="M${KB.r + 6},${y} C445,${y} 448,${y + 14} 466,${y + 14}" fill="none" stroke="${C.ink}" stroke-width="13" stroke-linecap="round"/>`;
  out += `<path d="M${KB.r + 6},${y} C445,${y} 448,${y + 14} 466,${y + 14}" fill="none" stroke="${C.steel1}" stroke-width="9" stroke-linecap="round"/>`;
  out += `<path d="M${KB.r + 6},${y - 2} C445,${y - 2} 448,${y + 12} 466,${y + 12}" fill="none" stroke="${C.steel2}" stroke-width="2.4" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.15;
    const x = KB.r + 8 + t * 40;
    const yy = y + 14 * (3 * t * t - 2 * t * t * t);
    out += `<path d="M${fmt(x)},${fmt(yy - 5)} l0,10" stroke="${C.ink}" stroke-opacity="0.55" stroke-width="1.1"/>`;
  }
  // Collar where it meets the keyboard.
  out += `<rect x="${KB.r + 1}" y="${y - 8}" width="9" height="16" rx="2" fill="${C.brass}" stroke="${C.ink}" stroke-width="1.5"/>`;
  out += `<path d="M${KB.r + 3},${y - 6} v12" stroke="#ffe39a" stroke-width="1.2"/>`;
  return out;
}

function rivet(x, y, r = 2.3) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.steel2}" stroke="${C.ink}" stroke-width="1"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#fff" opacity="0.8"/>`;
}

function sidebar() {
  let defs = '';
  let out = '';
  const X = 462;
  const [sd, su] = linear([[0, C.steel1], [0.08, C.steel2], [0.5, '#b9c5d2'], [1, '#8796a8']], { x1: 0, y1: 0, x2: 1, y2: 0 });
  defs += sd;
  out += `<rect x="${X}" y="-2" width="${642 - X}" height="484" fill="${su}" stroke="${C.ink}" stroke-width="2.5"/>`;
  out += `<path d="M${X + 3},0 V480" stroke="#e1e8f0" stroke-width="1.4"/>`;
  // TUTOR MODE plaque.
  const [pd, pu] = linear([[0, '#2a78c2'], [1, C.sea1]]);
  defs += pd;
  out += `<rect x="${X + 6}" y="6" width="${634 - X - 6}" height="44" rx="9" fill="${C.brass}" stroke="${C.ink}" stroke-width="2"/>`;
  out += `<rect x="${X + 10}" y="10" width="${634 - X - 14}" height="36" rx="6" fill="${pu}" stroke="${shade(C.brass, -0.35)}" stroke-width="1.2"/>`;
  out += `<path d="M${X + 16},13.5 H${634 - 10}" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" stroke-linecap="round"/>`;
  out += text('TUTOR MODE', { x: 551, y: 39, size: 24, file: FONTS.display, anchor: 'middle', fill: C.uiGold, stroke: C.ink, strokeWidth: 3.2, letterSpacing: 0.5 });
  out += rivet(X + 8 + 3.5, 28) + rivet(634 - 5.5, 28);
  // Light text panel (black text: title, description, statistics).
  const P = { x: 467, y: 56, w: 167, h: 314 };
  out += `<rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="7" fill="#f4f7fb" stroke="${C.ink}" stroke-width="2"/>`;
  out += `<path d="M${P.x + 2},${P.y + 6} Q${P.x + 2},${P.y + 2} ${P.x + 7},${P.y + 2} H${P.x + P.w - 6}" fill="none" stroke="${C.uiPanelDark}" stroke-opacity="0.7" stroke-width="2"/>`;
  // Faint wave watermark near the bottom of the panel, below the stats.
  out += `<path d="M${P.x + 10},${P.y + P.h - 10} q10,-6 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0" fill="none" stroke="${C.sea3}" stroke-opacity="0.22" stroke-width="2" stroke-linecap="round"/>`;
  // LESSON label between the Prev / Next buttons.
  out += `<rect x="521" y="383" width="63" height="24" rx="5" fill="${C.ui0}" stroke="${C.ink}" stroke-width="1.6"/>`;
  out += `<path d="M524,385.5 H581" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.4" stroke-linecap="round"/>`;
  out += text('LESSON', { x: 552.5, y: 400.5, size: 12, file: FONTS.slab, anchor: 'middle', fill: C.uiGold, letterSpacing: 0.6 });
  // Button tray for the Options / Back to Main Menu buttons.
  const [td, tu] = linear([[0, C.steel0], [1, shade(C.steel0, -0.25)]]);
  defs += td;
  out += `<rect x="${X + 1}" y="416" width="${640 - X}" height="66" fill="${tu}" stroke="${C.ink}" stroke-width="2"/>`;
  out += `<path d="M${X + 2},418.5 H640" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.4"/>`;
  out += rivet(X + 5.5, 395) + rivet(636, 395);
  return [defs, out];
}

/** Soft frame behind the lesson text so it reads over the water and passing fish. */
function textFrame() {
  const [d, u] = linear([[0, C.sea0, 0.42], [1, C.sea0, 0.22]]);
  let out = `<rect x="5" y="3" width="451" height="153" rx="12" fill="${u}"/>`;
  out += `<rect x="5" y="3" width="451" height="153" rx="12" fill="none" stroke="${C.foam}" stroke-opacity="0.35" stroke-width="1.5"/>`;
  out += `<rect x="7.5" y="5.5" width="446" height="148" rx="10" fill="none" stroke="${C.ink}" stroke-opacity="0.35" stroke-width="1"/>`;
  return [d, out];
}

function tutorBg() {
  const parts = [textFrame(), keyboard(), sidebar()];
  const defs = parts.map((p) => p[0]).join('');
  const body = parts[0][1] + parts[1][1] + hose() + parts[2][1];
  return svg(640, 480, body, defs);
}

function glo(k) {
  const [x, y, w, h] = R[k];
  const [d, b] = keyCap(k, true);
  return svg(w, h, `<g transform="translate(${-x},${-y})">${b}</g>`, d);
}

// ---------------------------------------------------------------- hands and fingers

const FINGER_POS = [[26, 358], [53, 352], [88, 349], [135, 353], [248, 430], [255, 351], [291, 347], [334, 348], [374, 355]];
const FINGER_SIZE = [[64, 60], [75, 67], [85, 66], [75, 94], [52, 50], [79, 95], [93, 70], [83, 74], [70, 65]];
const HANDS_AT = [13, 379];

/** Fingers in screen coords: base (hidden under the knuckles), tip centre (= ring centre), width. */
const FINGERS = [
  { b: [66, 424], t: [55, 387], w: 19 },
  { b: [91, 420], t: [82, 381], w: 21 },
  { b: [119, 418], t: [117, 378], w: 22 },
  { b: [149, 422], t: [164, 382], w: 22 },
  null,
  { b: [301, 422], t: [284, 380], w: 22 },
  { b: [330, 418], t: [328, 376], w: 22 },
  { b: [360, 420], t: [368, 377], w: 21 },
  { b: [387, 424], t: [403, 384], w: 19 },
];
/** Thumb tips in the finger4 image (screen coords) and the joints the hands image draws. */
const THUMBS = [
  { root: [190, 482], joint: [243, 461], tip: [265, 459], w: 22 },
  { root: [346, 484], joint: [307, 464], tip: [289, 459], w: 22 },
];

const GLOVE = { base: C.diverYellow, dark: C.diverYellowDark, light: '#fff1a8' };
const HOT = { base: '#ff8a4a', dark: '#e0386f', light: '#ffe08a' };

/** A finger capsule from base b to tip t (tip centre), rendered in its own rotated frame. */
function fingerShape(b, t, w, { pressed = false, extend = 16, haloMask = '' } = {}) {
  const dx = t[0] - b[0];
  const dy = t[1] - b[1];
  let L = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // local -y points to the tip
  const pal = pressed ? HOT : GLOVE;
  const r = w / 2;
  const wb = w + 3;
  let defs = '';
  let out = '';
  if (pressed) L -= 3; // pushed down a little onto the key
  const [gd, gu] = linear([[0, pal.light], [0.35, pal.base], [1, pal.dark]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  defs += gd;
  const d = `M${fmt(-wb / 2)},${extend} L${fmt(-wb / 2)},0 L${fmt(-r)},${fmt(-L)} A${r},${r} 0 0 1 ${fmt(r)},${fmt(-L)} L${fmt(wb / 2)},0 L${fmt(wb / 2)},${extend} Z`;
  if (pressed) {
    out += `<g${haloMask ? ` mask="${haloMask}"` : ''}><path d="${d}" fill="#ff5fa2" opacity="0.35" stroke="#ff5fa2" stroke-width="12" stroke-linejoin="round"/>`;
    out += `<path d="${d}" fill="none" stroke="#ffd0a0" stroke-opacity="0.55" stroke-width="6" stroke-linejoin="round"/></g>`;
  }
  out += `<path d="${d}" fill="${gu}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  // Highlight down the lit side and a glossy fingertip.
  out += `<path d="M${fmt(-r + 4)},${fmt(-L + 2)} L${fmt(-r + 4.5)},${fmt(-L * 0.35)}" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2.4" stroke-linecap="round"/>`;
  out += `<ellipse cx="${fmt(-r * 0.15)}" cy="${fmt(-L - r * 0.25)}" rx="${fmt(r * 0.45)}" ry="${fmt(r * 0.3)}" fill="#ffffff" opacity="0.45"/>`;
  // Knuckle creases.
  const crease = (y, k = 1) => `<path d="M${fmt(-r * 0.55 * k)},${fmt(y)} Q0,${fmt(y + 2.6)} ${fmt(r * 0.55 * k)},${fmt(y)}" fill="none" stroke="${shade(pal.dark, -0.35)}" stroke-width="1.3" stroke-linecap="round"/>`;
  out += crease(-L * 0.45);
  out += crease(-L * 0.45 - 3, 0.7);
  if (pressed) out += crease(-L * 0.82, 0.8);
  return [defs, `<g transform="translate(${b[0]},${b[1]}) rotate(${fmt(ang)})">${out}</g>`];
}

function fingerImage(i, pressed) {
  const [x, y] = FINGER_POS[i];
  const [w, h] = FINGER_SIZE[i];
  let defs = '';
  let body = '';
  let haloMask = '';
  if (i === 4) {
    // The thumbs run off both sides of this small image: fade their halo out towards the edges.
    const [gd, gu] = linear([[0, '#fff', 0], [0.2, '#fff', 1], [0.8, '#fff', 1], [1, '#fff', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
    const mid = id('mask');
    defs += `${gd}<mask id="${mid}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${gu}"/></mask>`;
    haloMask = `url(#${mid})`;
  }
  const parts = i === 4 ? THUMBS.map((th) => fingerShape(th.joint, th.tip, th.w, { pressed, extend: 0, haloMask })) : [fingerShape(FINGERS[i].b, FINGERS[i].t, FINGERS[i].w, { pressed })];
  for (const [d, b] of parts) {
    defs += d;
    body += b;
  }
  const cid = id('fclip');
  defs += `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
  return svg(w, h, `<g transform="translate(${-x},${-y})"><g clip-path="url(#${cid})">${body}</g></g>`, defs);
}

/** Palm outlines (screen coords): wrist, outer edge, knuckle bumps, inner edge, thumb pad. */
const PALMS = [
  [[60, 490], [47, 465], [43, 440], [47, 420], [55, 411], [66, 407], [78, 412], [91, 404], [105, 410], [119, 402],
    [134, 408], [149, 405], [162, 409], [168, 420], [172, 434], [182, 450], [196, 462], [206, 476], [198, 492]],
  [[392, 490], [405, 465], [409, 440], [405, 420], [397, 411], [386, 407], [374, 412], [361, 404], [347, 410], [333, 402],
    [318, 408], [303, 405], [290, 409], [284, 420], [287, 434], [298, 448], [316, 462], [336, 474], [348, 492]],
];

/** One glove (back of hand, from above). side 0 = left hand, 1 = right hand. */
function glove(side) {
  let defs = '';
  let out = '';
  const th = THUMBS[side];
  // Thumb, from under the palm out to the joint where the finger4 image takes over.
  const tdx = th.joint[0] - th.root[0];
  const tdy = th.joint[1] - th.root[1];
  const tl = Math.hypot(tdx, tdy);
  const ta = (Math.atan2(tdy, tdx) * 180) / Math.PI;
  const tr = th.w / 2 + 0.5;
  const [tgd, tgu] = linear([[0, GLOVE.light], [0.4, GLOVE.base], [1, GLOVE.dark]]);
  defs += tgd;
  out += `<g transform="translate(${th.root[0]},${th.root[1]}) rotate(${fmt(ta)})">`;
  out += `<path d="M-6,${-tr - 1} L${fmt(tl)},${-tr} A${tr},${tr} 0 0 1 ${fmt(tl)},${tr} L-6,${tr + 2} Z" fill="${tgu}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  out += `<path d="M${fmt(tl * 0.3)},${fmt(side ? tr - 3.5 : -tr + 3.5)} L${fmt(tl - 2)},${fmt(side ? tr - 3.5 : -tr + 3.5)}" stroke="#fff" stroke-opacity="0.6" stroke-width="2.2" stroke-linecap="round"/>`;
  out += `<path d="M${fmt(tl - 1)},${fmt(-tr * 0.6)} Q${fmt(tl + 2.5)},0 ${fmt(tl - 1)},${fmt(tr * 0.6)}" fill="none" stroke="${shade(GLOVE.dark, -0.35)}" stroke-width="1.3" stroke-linecap="round"/>`;
  out += `</g>`;

  const palm = smoothPath(PALMS[side], true, 0.5);
  const [pgd, pgu] = radial([[0, GLOVE.light], [0.5, GLOVE.base], [1, GLOVE.dark]], { cx: 0.45, cy: 0.3, r: 0.8 });
  defs += pgd;
  out += `<path d="${palm}" fill="${pgu}"/>`;
  const cid = id('palm');
  defs += `<clipPath id="${cid}"><path d="${palm}"/></clipPath>`;
  out += `<g clip-path="url(#${cid})">`;
  // Shadow side (away from the light) and knuckle highlights / tendon hints.
  const ks = (side ? [8, 7, 6, 5] : [0, 1, 2, 3]).map((i) => FINGERS[i]);
  const outerX = side ? 410 : 42;
  out += `<ellipse cx="${outerX}" cy="452" rx="18" ry="50" fill="${GLOVE.dark}" opacity="0.45"/>`;
  for (const [j, f] of ks.entries()) {
    const [bx, by] = f.b;
    out += `<ellipse cx="${bx}" cy="${by - 9}" rx="${fmt(f.w * 0.32)}" ry="2.8" fill="#ffffff" opacity="0.55"/>`;
    const sx = side ? -1 : 1;
    out += `<path d="M${bx},${by - 4} Q${bx + sx * 3},${by + 14} ${fmt(bx + sx * (6 + j * 4))},${by + 34}" fill="none" stroke="${GLOVE.dark}" stroke-opacity="0.55" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  // Ribbed cuff across the wrist.
  out += `<rect x="0" y="471" width="460" height="20" fill="${shade(GLOVE.dark, -0.05)}"/>`;
  for (let x = 2; x < 460; x += 6) out += `<path d="M${x},474 v10" stroke="${shade(GLOVE.dark, -0.3)}" stroke-width="1.6" stroke-linecap="round"/>`;
  out += `<path d="M0,471 H460" stroke="${C.ink}" stroke-width="1.8"/><path d="M0,473 H460" stroke="${GLOVE.light}" stroke-opacity="0.6" stroke-width="1"/>`;
  out += `</g>`;
  out += `<path d="${palm}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  return [defs, out];
}

function handsImage() {
  const parts = [glove(0), glove(1)];
  const defs = parts.map((p) => p[0]).join('');
  const body = parts.map((p) => p[1]).join('');
  return svg(443, 101, `<g transform="translate(${-HANDS_AT[0]},${-HANDS_AT[1]})">${body}</g>`, defs);
}

// ---------------------------------------------------------------- glowring

function glowring() {
  const [hd, hu] = radial([[0, '#ffffff', 0.62], [0.62, '#ffffff', 0.5], [0.78, '#ff5fa2', 0.0], [0.86, '#ff5fa2', 0.55], [1, '#ff5fa2', 0]]);
  let out = `<circle cx="29" cy="29" r="29" fill="${hu}"/>`;
  out += `<circle cx="29" cy="29" r="22.5" fill="none" stroke="${C.ink}" stroke-width="6.5" stroke-opacity="0.8"/>`;
  out += `<circle cx="29" cy="29" r="22.5" fill="none" stroke="#ff4f9a" stroke-width="4.5"/>`;
  out += `<circle cx="29" cy="29" r="22.5" fill="none" stroke="#ffd36b" stroke-width="1.8" stroke-dasharray="10 4.2"/>`;
  out += `<path d="M14.5,17 A19,19 0 0 1 29,10" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>`;
  return svg(58, 58, out, hd);
}

// ---------------------------------------------------------------- exports

const images = { tutor_bg: tutorBg, hands: handsImage, glowring };
for (const k of Object.keys(R)) images[`glo_${k}`] = () => glo(k);
for (let i = 0; i < 9; i++) {
  images[`finger${i}`] = () => fingerImage(i, false);
  images[`finger${i}x`] = () => fingerImage(i, true);
}
export default images;
