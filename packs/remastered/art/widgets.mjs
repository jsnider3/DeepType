// UI widgets: dialog frame and buttons (nine-sliced by src/engine/dialog.ts), edit box,
// checkbox, slider, the statistics screen panels/tabs (src/scenes/stats.ts), medals, the
// custom cursor and the favicon. Stretchable images keep all detail inside their fixed
// corners/caps and use only flat or along-the-stretch gradients in the stretched bands.

import { C, svg, linear, radial, shade, text, FONTS } from './lib.mjs';
import { rr, rrTop, finBadge, fit, f2 } from './screens-lib.mjs';

const PARCH = '#f6edd6'; // stats panel / active tab
const PARCH_DARK = '#d9c79c'; // inactive tab
const RIM = C.sea1;

// ---------------------------------------------------------------- dialog (30/64/30/24)

function dialog() {
  let defs = '';
  const [hd, hu] = linear([[0, '#ffe58a'], [0.5, C.uiGold], [1, '#e9a92a']]);
  defs += hd;
  let o = '';
  o += `<path d="${rr(1.5, 1.5, 357, 357, 16)}" fill="${RIM}" stroke="${C.ink}" stroke-width="2.5"/>`;
  o += `<path d="${rr(5, 5, 350, 350, 13)}" fill="none" stroke="${C.sea3}" stroke-width="1.5" opacity="0.8"/>`;
  // header bar (title is drawn on it, black, baseline ~37)
  o += `<path d="${rr(10, 10, 340, 40, 11)}" fill="${hu}" stroke="${C.ink}" stroke-width="2"/>`;
  o += `<path d="${rr(17, 13, 326, 9, 4.5)}" fill="#fff" opacity="0.45"/>`;
  o += `<path d="M14,44 H346" stroke="${C.uiGoldDark}" stroke-width="2" opacity="0.5"/>`;
  for (const x of [20, 340]) o += `<circle cx="${x}" cy="30" r="3.2" fill="${C.uiGoldDark}" stroke="${C.ink}" stroke-width="1.2"/>`;
  // body
  o += `<path d="M10,54 H350 V342 A8,8 0 0 1 342,350 H18 A8,8 0 0 1 10,342Z" fill="#e8ebf1" stroke="${C.ink}" stroke-width="1.5"/>`;
  o += `<path d="M11,55.5 H349" stroke="${C.uiPanelDark}" stroke-width="1.5" opacity="0.7"/>`;
  return svg(360, 360, o, defs);
}

// ---------------------------------------------------------------- buttons (38/10 nine-slice)

function button(w, h, col, { rim = null, r = 9 } = {}) {
  const [gd, gu] = linear([[0, shade(col, 0.3)], [0.5, col], [1, shade(col, -0.2)]]);
  let o = `<path d="${rr(1, 1, w - 2, h - 2, r)}" fill="${gu}" stroke="${C.ink}" stroke-width="1.5"/>`;
  if (rim) o += `<path d="${rr(3, 3, w - 6, h - 6, r - 2)}" fill="none" stroke="${rim}" stroke-width="2"/>`;
  o += `<path d="${rr(7, 3.5, w - 14, 6, 3)}" fill="#fff" opacity="0.45"/>`;
  o += `<path d="M${r},${h - 3.5} H${w - r}" stroke="${shade(col, -0.4)}" stroke-width="1.5" opacity="0.6"/>`;
  return svg(w, h, o, gd);
}

// ---------------------------------------------------------------- small widgets

function editbox() {
  const [gd, gu] = linear([[0, C.steel1], [1, C.steel0]]);
  let o = `<path d="${rr(1, 1, 94, 30, 7)} ${rr(4, 4, 88, 24, 3)}" fill="${gu}" fill-rule="evenodd" stroke="${C.ink}" stroke-width="1.5"/>`;
  o += `<path d="M8,2.5 H88" stroke="#fff" stroke-width="1" opacity="0.4"/>`;
  return svg(96, 32, o, gd);
}

function checkbox(on) {
  let o = `<path d="${rr(2, 2.5, 20, 20, 5)}" fill="#fdfbf4" stroke="${C.ink}" stroke-width="2"/>`;
  o += `<path d="M5,7 Q5,5 7,5 H17" fill="none" stroke="${C.uiPanelDark}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
  if (on) {
    const d = 'M6,12 L11,18 L21,4';
    o += `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    o += `<path d="${d}" fill="none" stroke="${C.uiGreen}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return o;
}

function slider() {
  let o = `<path d="${rr(1, 1, 170, 8, 4)}" fill="${C.sea0}" stroke="${C.ink}" stroke-width="1.5"/>`;
  o += `<path d="M5,6.5 H167" stroke="${C.sea3}" stroke-width="1.2" opacity="0.7"/>`;
  return svg(172, 10, o);
}

function slideranchor() {
  const [gd, gu] = radial([[0, '#fff4b8'], [0.5, C.uiGold], [1, C.uiGoldDark]], { cx: 0.38, cy: 0.32, r: 0.7 });
  let o = `<circle cx="10" cy="10" r="8.5" fill="${gu}" stroke="${C.ink}" stroke-width="2"/>`;
  o += `<circle cx="10" cy="10" r="3" fill="none" stroke="${C.uiGoldDark}" stroke-width="1.4"/>`;
  return svg(20, 20, o, gd);
}

// ---------------------------------------------------------------- stats screen

function tab(fill) {
  const [gd, gu] = linear([[0, shade(fill, 0.35)], [0.4, fill], [1, fill]]);
  let o = `<path d="${rrTop(1, 2, 160, 37, 12)}" fill="${gu}" stroke="${C.ink}" stroke-width="1.5"/>`;
  o += `<path d="M10,5.5 H152" stroke="#fff" stroke-width="2" opacity="0.5" stroke-linecap="round"/>`;
  return svg(162, 38, o, gd);
}

function tab_panel() {
  let o = `<path d="${rr(1.5, 1.5, 634, 426, 16)}" fill="${RIM}" stroke="${C.ink}" stroke-width="2.5"/>`;
  o += `<path d="${rr(8, 8, 621, 413, 11)}" fill="${PARCH}" stroke="${C.ink}" stroke-width="1.5"/>`;
  o += `<path d="${rr(12, 12, 613, 405, 8)}" fill="none" stroke="${PARCH_DARK}" stroke-width="1.5"/>`;
  // faint waves along the bottom
  for (let i = 0; i < 2; i++) {
    let d = `M14,${400 - i * 9}`;
    for (let x = 14; x < 620; x += 30) d += ` q7.5,-5 15,0 t15,0`;
    o += `<path d="${d}" fill="none" stroke="${PARCH_DARK}" stroke-width="1.5" opacity="${0.7 - i * 0.3}"/>`;
  }
  // rivets
  return svg(637, 429, o);
}

function tab_panel_white() {
  const o = `<path d="${rr(1, 1, 375, 314, 8)}" fill="#fff" stroke="#b9a77e" stroke-width="1.5"/>`;
  return svg(377, 316, o);
}

const GEM_COLS = ['#38d14a', '#ff9a2e', '#a35bf0', '#ef3b3b', '#e8f4ff', '#ffd23f'];

function socket(cx, cy, tint) {
  const [gd, gu] = radial([[0, tint, 0.45], [0.7, tint, 0.12], [1, tint, 0]]);
  let o = `<circle cx="${cx}" cy="${cy}" r="20" fill="#e7d9b6" stroke="#b39a63" stroke-width="1.5"/>`;
  o += `<path d="M${cx - 15},${cy - 9} A17,17 0 0 1 ${cx + 9},${cy - 15}" fill="none" stroke="#a88d55" stroke-width="2" opacity="0.6" stroke-linecap="round"/>`;
  if (tint) o += `<circle cx="${cx}" cy="${cy}" r="17" fill="${gu}"/>`;
  return { o, d: tint ? gd : '' };
}

/** Treasure box at panel (408,23): 2x3 gem slots (counts at x 67/166) + 2x2 secret slots. */
function tab_panel_treasure() {
  let defs = '';
  let o = `<path d="${rr(1, 1, 206, 342, 12)}" fill="#efe0b8" stroke="${C.ink}" stroke-width="2"/>`;
  const band = (y) => `<path d="${rr(5, y, 198, 24, 8)}" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1.2"/><path d="${rr(10, y + 2, 188, 6, 3)}" fill="#fff" opacity="0.4"/>`;
  o += band(4) + band(206);
  const cell = (x, y, w, h) => `<path d="${rr(x, y, w, h, 8)}" fill="#fffaf0" stroke="#c9b07a" stroke-width="1.5"/>`;
  const gemRows = [[32, 56], [84, 108], [137, 161]];
  let gi = 0;
  for (const [y, cy] of gemRows) {
    for (const [x, sx] of [[6, 37], [106, 136]]) {
      o += cell(x, y, 96, 48);
      const s = socket(sx, cy, GEM_COLS[gi++]);
      o += s.o;
      defs += s.d;
    }
  }
  for (const [y, cy] of [[239, 264.5], [291, 314.5]]) {
    for (const [x, sx] of [[6, 37.5], [106, 136.5]]) {
      o += cell(x, y, 96, 49);
      o += socket(sx, cy, null).o;
    }
  }
  return svg(208, 344, o, defs);
}

function tab_panel_question() {
  const size = 30;
  let o = text('?', { x: 8.5, y: 26.5, size, anchor: 'middle', fill: '#fff8e0', stroke: C.ink, strokeWidth: 3 });
  o += text('?', { x: 8.5, y: 26.5, size, anchor: 'middle', fill: '#fff8e0' });
  return svg(17, 29, o);
}

function radio(active) {
  const fill = active ? C.uiGold : '#e6dcc4';
  const [gd, gu] = linear([[0, shade(fill, 0.35)], [0.5, fill], [1, shade(fill, -0.12)]]);
  let o = `<path d="${rr(1, 1, 167, 34, 10)}" fill="${gu}" stroke="${C.ink}" stroke-width="1.5"/>`;
  o += `<path d="${rr(8, 3.5, 153, 6, 3)}" fill="#fff" opacity="0.45"/>`;
  o += `<circle cx="13" cy="18" r="5.5" fill="#fffdf6" stroke="${C.ink}" stroke-width="1.5"/>`;
  if (active) o += `<circle cx="13" cy="18" r="3" fill="${C.sea1}"/>`;
  return svg(169, 36, o, gd);
}

// ---------------------------------------------------------------- medals

function medal(light, mid, dark) {
  let defs = '';
  let o = '';
  // ribbon: two straps meeting behind the disc
  const strap = (d, c1, c2) => `<path d="${d}" fill="${c1}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c2}" stroke-width="0"/>`;
  o += strap('M14,2 H40 L62,66 H38Z', C.sea2);
  o += `<path d="M24,2 H30 L52,66 H46Z" fill="${C.uiGold}"/>`;
  o += strap('M57,2 H83 L59,66 H35Z', C.uiRed);
  o += `<path d="M67,2 H73 L49,66 H43Z" fill="#fff" opacity="0.85"/>`;
  o += `<path d="M14,2 H40 L62,66 H38Z M57,2 H83 L59,66 H35Z" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  // disc
  const [gd, gu] = radial([[0, light], [0.55, mid], [1, dark]], { cx: 0.38, cy: 0.32, r: 0.75 });
  defs += gd;
  o += `<rect x="38" y="52" width="21" height="10" rx="3" fill="${mid}" stroke="${C.ink}" stroke-width="2"/>`;
  o += `<circle cx="48.5" cy="94" r="36" fill="${gu}" stroke="${C.ink}" stroke-width="2.5"/>`;
  let star = '';
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    star += `<circle cx="${f2(48.5 + Math.cos(a) * 31.5)}" cy="${f2(94 + Math.sin(a) * 31.5)}" r="1.4" fill="${dark}"/>`;
  }
  o += star;
  o += `<circle cx="48.5" cy="94" r="27" fill="${mid}" stroke="${dark}" stroke-width="2"/>`;
  // embossed fin + wave
  o += `<path d="M28,106 Q46,98 58,70 Q54,92 68,106Z" fill="${shade(mid, 0.25)}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>`;
  o += `<path d="M24,108 q6,-5 12,0 t12,0 t12,0 t12,0" fill="none" stroke="${dark}" stroke-width="2.4" stroke-linecap="round"/>`;
  o += `<path d="M27,82 A24,24 0 0 1 46,68" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
  return svg(97, 133, o, defs);
}

// ---------------------------------------------------------------- cursor + favicon

function cursor1() {
  const [gd, gu] = linear([[0, '#ffffff'], [1, C.sharkGrey]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const d = 'M2.5,2.5 L3,34 Q8,28 12,25 L18,38 Q20,41 23,39.5 L25,38.5 Q27,37 26,34.5 L20,22 Q26,21 33,21.5Z';
  let o = `<path d="${d}" fill="${gu}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  o += `<path d="M6,9 L6,24" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`;
  return svg(54, 54, o, gd);
}

function favicon() {
  const [gd, gu] = linear([[0, C.sea3], [1, C.sea0]]);
  let o = `<path d="${rr(2, 2, 60, 60, 14)}" fill="${gu}" stroke="${C.ink}" stroke-width="3"/>`;
  o += `<path d="M10,46 Q32,38 44,6 Q40,30 54,46Z" fill="#ffffff" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  o += `<path d="M40,16 Q34,32 22,42" fill="none" stroke="${C.sharkGrey}" stroke-width="3" stroke-linecap="round"/>`;
  o += `<path d="M3,46 Q10,40 18,46 T33,46 T48,46 T63,46 V50 Q63,62 50,62 H14 Q2,62 2,50Z" fill="${C.sea1}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  o += `<path d="M8,47 q5,-4 10,0 M24,47 q5,-4 10,0 M40,47 q5,-4 10,0" fill="none" stroke="${C.foam}" stroke-width="2.4" stroke-linecap="round"/>`;
  return svg(64, 64, o, gd);
}

void finBadge;
void fit;
void FONTS;

export default {
  dialog,
  dbutton: () => button(115, 32, '#e0a052'),
  dbutton_hilight: () => button(115, 32, '#2fb36a', { rim: '#ffe27a' }),
  tab_button: () => button(121, 37, '#5cb8c4'),
  editbox,
  checked: () => svg(48, 25, checkbox(false) + `<g transform="translate(24,0)">${checkbox(true)}</g>`),
  slider,
  slideranchor,
  tab_top: () => tab(PARCH),
  tab_top_shadow: () => tab(PARCH_DARK),
  tab_panel,
  tab_panel_white,
  tab_panel_treasure,
  tab_panel_question,
  tab_radiobtn_active: () => radio(true),
  tab_radiobtn_inactive: () => radio(false),
  medal_bronze: () => medal('#ffd2a6', '#d98a4a', '#8f4f22'),
  medal_silver: () => medal('#ffffff', '#c9d2dc', '#7d8a98'),
  medal_gold: () => medal('#fff4b0', C.uiGold, C.uiGoldDark),
  cursor1,
  favicon,
};
