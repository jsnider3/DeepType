// In-game HUD: the bottom status bar (shark zapper plate, meter window, baked PAUSE / OPTIONS /
// QUIT buttons and their over/down states), the zapper charge fill and the level-start banner.
//
// Layout (src/game/board.ts buildHud): the bar is drawn at
// screen y 441. The game paints a dark rect and the meter (statusbarmeter) at local
// (117,8,228,22) BEHIND the bar, so that window is cut out of statusbarX. Status text is drawn
// white at half opacity, baseline y 26, inside the window. Buttons: the normal state is the bar
// art itself; _over/_down images are drawn at their rects (x, 4).

import { C, svg, linear, radial, shade, mix, text, FONTS, id, attrs, rng } from './lib.mjs';
import { banner, GOLD_TEXT } from './hud-lib.mjs';

const W = 640;
const H = 39;
const WIN = { x: 117, y: 8, w: 228, h: 22 };
const BUTTONS = [
  { name: 'pause', label: 'PAUSE', x: 380, w: 82 },
  { name: 'options', label: 'OPTIONS', x: 467, w: 81 },
  { name: 'quit', label: 'QUIT', x: 553, w: 81 },
];
const BTN_Y = 4;
const BTN_H = 30;

// Sea-glass metal: steel tinted toward teal.
const GLASS = '#4fb3ad';
const PANEL_TOP = mix(C.steel2, GLASS, 0.3);
const PANEL_MID = mix(C.steel1, GLASS, 0.3);
const PANEL_BOT = mix(C.steel0, C.sea0, 0.35);
const GLOW = '#7fe9ff';

const rivet = (x, y, r = 1.6) => {
  const [d, u] = radial([[0, '#ffffff'], [0.5, C.steel2], [1, C.steel0]], { cx: 0.35, cy: 0.35, r: 0.7 });
  return { defs: d, out: `<circle cx="${x}" cy="${y}" r="${r}" fill="${u}" stroke="${C.ink}" stroke-width="0.7"/>` };
};

/** A baked status-bar button in local coords (w x 30). state: 'normal' | 'over' | 'down'. */
function button(w, label, state) {
  let defs = '';
  let out = '';
  const h = BTN_H;
  const stops =
    state === 'over'
      ? [[0, '#ffffff'], [0.45, '#d8f6ff'], [1, '#8fd2ea']]
      : state === 'down'
        ? [[0, '#5d6d7e'], [0.5, '#7f8fa0'], [1, '#a8b6c4']]
        : [[0, '#f2f6f9'], [0.45, '#cfd9e2'], [1, '#93a4b5']];
  const [gd, gu] = linear(stops);
  defs += gd;
  // Body.
  out += `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="6" ${attrs({ fill: gu, stroke: C.ink, 'stroke-width': 1.5 })}/>`;
  if (state === 'down') {
    // Inset: shadow along the top and left edge, no gloss.
    out += `<path d="M3,${h - 6} V8 Q3,3 8,3 H${w - 5}" fill="none" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="2.5" stroke-linecap="round"/>`;
  } else {
    // Gloss on the upper half and a bright top lip.
    out += `<rect x="3.5" y="3" width="${w - 7}" height="${(h - 6) / 2}" rx="4" fill="#ffffff" opacity="${state === 'over' ? 0.55 : 0.4}"/>`;
    out += `<path d="M7,${h - 3.2} H${w - 7}" stroke="${C.ink}" stroke-opacity="0.25" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  if (state === 'over') {
    out += `<rect x="2.6" y="2.6" width="${w - 5.2}" height="${h - 5.2}" rx="4.6" fill="none" stroke="${GLOW}" stroke-width="1.8"/>`;
  }
  const dy = state === 'down' ? 1 : 0;
  const col = state === 'over' ? C.sea0 : state === 'down' ? '#1c2a40' : C.ink;
  if (state === 'over') out += text(label, { x: w / 2, y: 20 + dy, size: 13, file: FONTS.slab, anchor: 'middle', fill: 'none', stroke: '#ffffff', strokeWidth: 3 });
  out += text(label, { x: w / 2, y: 20 + dy, size: 13, file: FONTS.slab, anchor: 'middle', fill: col });
  return { defs, out };
}

function statusbar() {
  let defs = '';
  let out = '';
  // Clip that cuts the meter window out of everything.
  const cid = id('win');
  defs += `<clipPath id="${cid}"><path clip-rule="evenodd" d="M0,0H${W}V${H}H0Z M${WIN.x},${WIN.y}V${WIN.y + WIN.h}H${WIN.x + WIN.w}V${WIN.y}Z"/></clipPath>`;

  // Panel.
  const [pd, pu] = linear([[0, PANEL_TOP], [0.5, PANEL_MID], [1, PANEL_BOT]]);
  defs += pd;
  out += `<rect x="0" y="0" width="${W}" height="${H}" fill="${pu}"/>`;
  // Faint brushed lines.
  for (let y = 6; y < H - 2; y += 4) out += `<path d="M0,${y}H${W}" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>`;
  out += `<path d="M0,0.75H${W}" stroke="${C.ink}" stroke-width="1.5"/>`;
  out += `<path d="M0,2.2H${W}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1"/>`;
  out += `<path d="M0,${H - 0.5}H${W}" stroke="${C.ink}" stroke-opacity="0.6" stroke-width="1"/>`;

  // ---- Shark zapper plate (x 4..108).
  const [ld, lu] = linear([[0, mix(C.ui0, C.sea1, 0.4)], [1, C.sea0]]);
  defs += ld;
  out += `<rect x="4" y="4.5" width="104" height="30" rx="6" ${attrs({ fill: lu, stroke: C.ink, 'stroke-width': 1.5 })}/>`;
  out += `<path d="M9,7 H103" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.2" stroke-linecap="round"/>`;
  // Lightning bolt with a soft glow.
  const [gd, gu] = radial([[0, C.uiGold, 0.65], [1, C.uiGold, 0]]);
  defs += gd;
  out += `<circle cx="22" cy="19.5" r="13" fill="${gu}"/>`;
  const bolt = 'M25,6 L14,21 H21 L17,33 L30,16 H23 L28,6 Z';
  out += `<path d="${bolt}" ${attrs({ fill: C.diverYellow, stroke: C.ink, 'stroke-width': 1.3, 'stroke-linejoin': 'round' })}/>`;
  out += `<path d="M25.4,8 L17.5,19.6" stroke="#fffbe0" stroke-width="1.2" stroke-linecap="round"/>`;
  // Label.
  const lx = 67;
  out += text('SHARK', { x: lx, y: 18, size: 13, anchor: 'middle', fill: '#ffffff', stroke: C.ink, strokeWidth: 2.4, letterSpacing: 0.8 });
  out += text('ZAPPER', { x: lx, y: 31, size: 13, anchor: 'middle', fill: C.uiGold, stroke: C.ink, strokeWidth: 2.4, letterSpacing: 0.4 });
  for (const [x, y] of [[8, 8.5], [8, 30.5], [104, 8.5], [104, 30.5]]) {
    const r = rivet(x, y, 1.4);
    defs += r.defs;
    out += r.out;
  }

  // ---- Meter bezel around the window.
  const bx = 111, by = 2, bw = 240, bh = 35;
  const [bd, bu] = linear([[0, shade(C.steel0, -0.2)], [0.5, C.steel0], [1, mix(C.steel1, GLASS, 0.2)]]);
  defs += bd;
  out += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="7" ${attrs({ fill: bu, stroke: C.ink, 'stroke-width': 1.5 })}/>`;
  // Tick marks along the top and bottom lips (ten energy cells).
  for (let i = 0; i <= 10; i++) {
    const x = WIN.x + (WIN.w * i) / 10;
    const big = i % 5 === 0;
    out += `<path d="M${x},${big ? 3.6 : 4.4}V6.2 M${x},${H - 6.4}V${big ? H - 3.6 : H - 4.4}" stroke="${GLOW}" stroke-opacity="${big ? 0.85 : 0.5}" stroke-width="1"/>`;
  }
  // Sea-glass lip and a dark inner edge hugging the window.
  out += `<rect x="${WIN.x - 2.5}" y="${WIN.y - 2.5}" width="${WIN.w + 5}" height="${WIN.h + 5}" rx="3" fill="none" stroke="${GLASS}" stroke-opacity="0.9" stroke-width="1.2"/>`;
  out += `<rect x="${WIN.x - 1}" y="${WIN.y - 1}" width="${WIN.w + 2}" height="${WIN.h + 2}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  // Small end clamps.
  for (const x of [bx + 1.5, bx + bw - 4.5]) out += `<rect x="${x}" y="13" width="3" height="13" rx="1.2" fill="${C.steel2}" stroke="${C.ink}" stroke-width="0.8"/>`;

  // ---- Vents between meter and buttons.
  for (let i = 0; i < 3; i++) {
    const x = 357 + i * 5;
    out += `<rect x="${x}" y="9" width="2.6" height="21" rx="1.3" fill="${C.ink}" opacity="0.75"/><path d="M${x + 3},10V29" stroke="#ffffff" stroke-opacity="0.3" stroke-width="0.8"/>`;
  }

  // ---- Button tray.
  out += `<rect x="375" y="1.5" width="263" height="36" rx="6" fill="${C.ink}" fill-opacity="0.32"/>`;
  out += `<path d="M379,${H - 1.6}H634" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1"/>`;
  for (const b of BUTTONS) {
    const r = button(b.w, b.label, 'normal');
    defs += r.defs;
    out += `<g transform="translate(${b.x},${BTN_Y})">${r.out}</g>`;
  }

  return svg(W, H, `<g clip-path="url(#${cid})">${out}</g>`, defs);
}

const btnImage = (b, state) => () => {
  const r = button(b.w, b.label, state);
  return svg(b.w, BTN_H, r.out, r.defs);
};

/** Zapper charge: a glowing electric-blue energy bar, revealed left to right. */
function meter() {
  const w = WIN.w, h = WIN.h;
  let defs = '';
  let out = '';
  const [gd, gu] = linear([[0, '#082a70'], [0.22, '#1f6fe8'], [0.45, '#4fb8ff'], [0.55, '#6fd4ff'], [0.75, '#1f74ec'], [1, '#08205c']]);
  defs += gd;
  out += `<rect width="${w}" height="${h}" fill="${gu}"/>`;
  // Slight brightening toward the right so a full bar reads as "charged".
  const [hd, hu] = linear([[0, '#00eaff', 0], [1, '#9ff7ff', 0.35]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  defs += hd;
  out += `<rect width="${w}" height="${h}" fill="${hu}"/>`;
  // Crackling lightning thread through the core.
  let d = `M0,${h / 2}`;
  const pts = [];
  const rnd = rng(7);
  for (let x = 0, i = 0; x <= w + 6; x += 4 + rnd() * 6, i++) pts.push([x, h / 2 + (i % 2 ? -1 : 1) * (1.5 + rnd() * 3.5)]);
  for (const [x, y] of pts) d += ` L${x},${y.toFixed(1)}`;
  const fid = id('blur');
  defs += `<filter id="${fid}" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>`;
  out += `<path d="${d}" fill="none" stroke="#9fefff" stroke-width="3" filter="url(#${fid})" opacity="0.6"/>`;
  out += `<path d="${d}" fill="none" stroke="#e8fdff" stroke-width="0.9" stroke-linejoin="round" opacity="0.7"/>`;
  // Energy cell dividers.
  for (let i = 1; i < 10; i++) {
    const x = (w * i) / 10;
    out += `<path d="M${x},0V${h}" stroke="#041a4a" stroke-opacity="0.45" stroke-width="1.2"/><path d="M${x + 1},1V${h - 1}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="0.8"/>`;
  }
  // Gloss.
  out += `<rect x="0" y="1" width="${w}" height="4" fill="#ffffff" opacity="0.18"/>`;
  return svg(w, h, out, defs);
}

function textovers() {
  // Two 400x60 rows: "PREPARE TO DIVE!" (the game uses 0..50) and "GAME OVER" (unused by
  // the original, kept for completeness).
  const a = banner('PREPARE TO DIVE!', { cx: 200, base: 39, size: 44, maxW: 384, fillStops: GOLD_TEXT, waveY: 44.5 });
  const b = banner('GAME OVER', { cx: 200, base: 99, size: 46, maxW: 300, fillStops: [[0, '#fff0e6'], [0.4, '#ffb08a'], [0.65, C.coral], [1, '#c8322a']], wave: false });
  return svg(400, 120, a.out + b.out, a.defs + b.defs);
}

const images = {
  statusbarX: statusbar,
  statusbarmeter: meter,
  textovers,
};
for (const b of BUTTONS) {
  images[`statusbarX_${b.name}_over`] = btnImage(b, 'over');
  images[`statusbarX_${b.name}_down`] = btnImage(b, 'down');
}
export default images;
