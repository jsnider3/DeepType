// Map screen: the nautical chart (mapbg), the rock arch overlay, dive-site chests, ship
// markers, trail dots and the pointing-hand cursor.
//
// mapbg is 700x540 but normally only its top-left 640x480 shows (it pans by -60,-60 at the
// very end). Dive sites sit at MAP_NODES in src/game/mapdata.ts; land, reefs and doodles are
// placed in the gaps between sites and their trails so chests always sit on calm open water.
// The arch (mapscreen_arch, drawn at 443,341) has its feet on the two headlands either side of
// the channel from Victory Bay (node 34) to the whirlpool gateway (node 35).

import { C, svg, linear, radial, shade, mix, smoothPath, rng, fmt, text, FONTS, strip, id } from './lib.mjs';
import { blur, clip } from './scenery-lib.mjs';

const INK = C.ink;
const PAPER = '#efe0b6';
const LAND = '#e2cb92';
const LAND_DARK = '#c7a96a';
const HILL = '#9fb46c';
const SEA = '#7fb3c6';
const SEA_DEEP = '#5f93ac';

// ================================================================ chart pieces

/** Land mass with chart-style coastal ripple bands. */
function land(d, { fill = LAND, ripples = true } = {}) {
  let o = '';
  if (ripples) {
    o += `<path d="${d}" fill="none" stroke="#b9dcdc" stroke-width="22" stroke-linejoin="round" opacity="0.55"/>`;
    o += `<path d="${d}" fill="none" stroke="${SEA}" stroke-width="15" stroke-linejoin="round"/>`;
    o += `<path d="${d}" fill="none" stroke="#cfe7e0" stroke-width="10" stroke-linejoin="round"/>`;
    o += `<path d="${d}" fill="none" stroke="#9cc8d0" stroke-width="5" stroke-linejoin="round"/>`;
  }
  o += `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  return o;
}

/** Little hill/mountain glyph. */
const hill = (x, y, s, col = HILL) =>
  `<path d="M${fmt(x - s)},${fmt(y)} Q${fmt(x - s * 0.3)},${fmt(y - s * 1.3)} ${fmt(x)},${fmt(y - s * 1.2)} Q${fmt(x + s * 0.4)},${fmt(y - s * 1.1)} ${fmt(x + s)},${fmt(y)}Z" fill="${col}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M${fmt(x)},${fmt(y - s * 1.2)} Q${fmt(x + s * 0.4)},${fmt(y - s * 0.6)} ${fmt(x + s * 0.7)},${fmt(y)}" fill="${shade(col, -0.2)}" opacity="0.7"/>`;

/** Peak with snow-less rocky shading. */
const peak = (x, y, s) =>
  `<path d="M${fmt(x - s)},${fmt(y)} L${fmt(x - s * 0.15)},${fmt(y - s * 1.5)} L${fmt(x + s)},${fmt(y)}Z" fill="#b4a27a" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M${fmt(x - s * 0.15)},${fmt(y - s * 1.5)} L${fmt(x + s)},${fmt(y)} L${fmt(x + s * 0.2)},${fmt(y)}Z" fill="#8f7f5c"/>`;

const tree = (x, y, s = 1) =>
  `<circle cx="${fmt(x)}" cy="${fmt(y - 5 * s)}" r="${fmt(4 * s)}" fill="#6f9a4a" stroke="${INK}" stroke-width="1.1"/><path d="M${fmt(x)},${fmt(y - 2 * s)} L${fmt(x)},${fmt(y + 1.5 * s)}" stroke="${INK}" stroke-width="1.4"/>`;

function palm(x, y, s = 1) {
  let o = `<path d="M${x},${y} q${2 * s},${-6 * s} ${1 * s},${-12 * s}" fill="none" stroke="#6b4a2a" stroke-width="${1.8 * s}" stroke-linecap="round"/>`;
  const tx = x + s;
  const ty = y - 12 * s;
  for (const [dx, dy] of [[-7, 2], [-5, -4], [1, -6], [6, -3], [8, 3]]) o += `<path d="M${tx},${ty} q${dx * 0.5 * s},${(dy * 0.5 - 2) * s} ${dx * s},${dy * s}" fill="none" stroke="#3f7a3a" stroke-width="${2 * s}" stroke-linecap="round"/>`;
  return o;
}

/** Jagged sea rocks with a foam ring. */
function rocks(x, y, n, rand, s = 1) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const rx = x + (rand() - 0.5) * 26 * s;
    const ry = y + (rand() - 0.5) * 18 * s;
    const w = (4 + rand() * 5) * s;
    const h = (5 + rand() * 6) * s;
    o += `<ellipse cx="${fmt(rx)}" cy="${fmt(ry + 0.5)}" rx="${fmt(w + 2.5)}" ry="${fmt(2.6)}" fill="#e6f3ee" opacity="0.85"/>`;
    o += `<path d="M${fmt(rx - w)},${fmt(ry)} L${fmt(rx - w * 0.3)},${fmt(ry - h)} L${fmt(rx + w * 0.2)},${fmt(ry - h * 0.6)} L${fmt(rx + w)},${fmt(ry)}Z" fill="#8c8a84" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    o += `<path d="M${fmt(rx - w * 0.3)},${fmt(ry - h)} L${fmt(rx + w * 0.2)},${fmt(ry - h * 0.6)} L${fmt(rx + w)},${fmt(ry)} L${fmt(rx)},${fmt(ry)}Z" fill="#6a6862"/>`;
  }
  return o;
}

/** Chart wave mark "~~". */
const waveMark = (x, y, s = 1, op = 0.5) => `<path d="M${fmt(x - 6 * s)},${fmt(y)} q${3 * s},${-3 * s} ${6 * s},0 t${6 * s},0" fill="none" stroke="#2c5a72" stroke-width="1.1" stroke-linecap="round" opacity="${op}"/>`;

/** Sunken ship glyph: tilted hull half under water with a broken mast. */
function wreckIcon(x, y, s = 1, flip = false) {
  let o = `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(-14)">`;
  o += `<path d="M-14,0 L14,0 L10,7 L-11,7Z" fill="#7a5638" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
  o += `<path d="M-14,0 L14,0" stroke="#5a3e28" stroke-width="2"/>`;
  o += `<path d="M2,0 L3,-17 M-6,0 L-7,-10" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
  o += `<path d="M3,-15 L12,-10 L4,-7Z" fill="#e8e0c8" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  o += `<path d="M-4,-17 l-4,6 l3,0 l-4,6" fill="none" stroke="${INK}" stroke-width="0" />`;
  o += `</g>`;
  o += `<path d="M${x - 18 * s},${y + 5 * s} q6,-3 12,0 t12,0 t12,0" fill="none" stroke="#f0f8f4" stroke-width="1.6" stroke-linecap="round"/>`;
  return o;
}

function compass(cx, cy, r) {
  let o = `<g transform="translate(${cx} ${cy})">`;
  o += `<circle r="${r}" fill="${PAPER}" fill-opacity="0.55" stroke="${INK}" stroke-width="1.4"/>`;
  o += `<circle r="${r - 4}" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.7"/>`;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const L = i % 8 === 0 ? 5 : i % 2 === 0 ? 3 : 1.6;
    o += `<path d="M${fmt(Math.cos(a) * (r - 4))},${fmt(Math.sin(a) * (r - 4))} L${fmt(Math.cos(a) * (r - 4 - L))},${fmt(Math.sin(a) * (r - 4 - L))}" stroke="${INK}" stroke-width="0.8"/>`;
  }
  const star = (len, w, rotDeg, dark, light) => {
    let s = '';
    for (let k = 0; k < 4; k++) {
      const a = rotDeg + k * 90;
      s += `<g transform="rotate(${a})"><path d="M0,${-len} L${w},0 L0,0Z" fill="${dark}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/><path d="M0,${-len} L${-w},0 L0,0Z" fill="${light}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/></g>`;
    }
    return s;
  };
  o += star(r * 0.62, r * 0.13, 45, '#5f93ac', '#e9f2f2');
  o += star(r * 0.92, r * 0.17, 0, C.uiRed, '#fbe9c4');
  o += `<circle r="2.4" fill="${C.uiGold}" stroke="${INK}" stroke-width="1"/>`;
  o += text('N', { x: 0, y: -r - 3, size: 11, file: FONTS.display, anchor: 'middle', fill: C.uiRed, stroke: INK, strokeWidth: 2.2 });
  return o + '</g>';
}

function serpent(x, y) {
  const g = '#4f9a6a';
  const gd = '#2f6a46';
  let o = `<g transform="translate(${x} ${y})">`;
  // Humps (back to front) with foam where they meet the water.
  for (const [hx, hw, hh] of [[16, 9, 9], [-2, 10, 12]]) {
    o += `<path d="M${hx - hw},2 Q${hx - hw},${-hh} ${hx},${-hh} Q${hx + hw},${-hh} ${hx + hw},2 L${hx + hw - 4},2 Q${hx + hw - 4},${-hh + 5} ${hx},${-hh + 5} Q${hx - hw + 4},${-hh + 5} ${hx - hw + 4},2Z" fill="${g}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
    o += `<path d="M${hx - 3},${-hh} l2,-4 l2,4" fill="${C.coral}" stroke="${INK}" stroke-width="0.9"/>`;
  }
  // Tail curl.
  o += `<path d="M26,2 Q30,-8 36,-6 Q33,-4 32,2Z" fill="${g}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  // Neck and head.
  o += `<path d="M-14,2 Q-16,-14 -24,-18 Q-30,-20 -34,-15 L-32,-11 Q-28,-13 -25,-11 Q-21,-6 -20,2Z" fill="${g}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
  o += `<path d="M-24,-18 l1,-6 l3,5 M-28,-19 l-1,-5 l3,4" fill="${C.coral}" stroke="${INK}" stroke-width="0.9"/>`;
  o += `<circle cx="-28" cy="-15.5" r="1.4" fill="#fff" stroke="${INK}" stroke-width="0.6"/><circle cx="-28.3" cy="-15.5" r="0.6" fill="${INK}"/>`;
  o += `<path d="M-33,-12 q3,1 5,-1" stroke="${gd}" stroke-width="0.9" fill="none"/>`;
  for (const fx of [-24, -6, 12, 30]) o += `<path d="M${fx - 6},3 q3,-2.4 6,0 t6,0" fill="none" stroke="#f0f8f4" stroke-width="1.4" stroke-linecap="round"/>`;
  return o + '</g>';
}

function whirlpool(cx, cy, r) {
  let defs = '';
  const [gd, gu] = radial([[0, '#18465e'], [0.45, '#3b7590'], [1, SEA, 0]]);
  defs += gd;
  let o = `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.15}" ry="${r * 0.82}" fill="${gu}"/>`;
  // Spiral arms.
  for (let arm = 0; arm < 4; arm++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = arm * (Math.PI / 2) + t * Math.PI * 2.4;
      const rr = r * (1 - t * 0.92);
      pts.push([cx + Math.cos(a) * rr * 1.1, cy + Math.sin(a) * rr * 0.75]);
    }
    o += `<path d="${smoothPath(pts, false, 0.5)}" fill="none" stroke="#e8f6f6" stroke-width="${arm % 2 ? 1.4 : 2.2}" stroke-linecap="round" opacity="0.85"/>`;
    o += `<path d="${smoothPath(pts.slice(4), false, 0.5)}" transform="translate(0 2)" fill="none" stroke="#1d4d66" stroke-width="1" stroke-linecap="round" opacity="0.5"/>`;
  }
  o += `<ellipse cx="${cx}" cy="${cy}" rx="5" ry="3.4" fill="#0e2a3a"/>`;
  return { o, defs };
}

function factory(x, y) {
  let o = `<g transform="translate(${x} ${y})">`;
  o += `<rect x="-2" y="-10" width="30" height="20" fill="#a99a8a" stroke="${INK}" stroke-width="1.4"/>`;
  o += `<path d="M-2,-10 l7.5,-7 l0,7 l7.5,-7 l0,7 l7.5,-7 l0,7 l7.5,-7 l0,7" fill="#8a7a6a" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
  o += `<rect x="30" y="-30" width="7" height="40" fill="#8a6a5a" stroke="${INK}" stroke-width="1.4"/><rect x="30" y="-26" width="7" height="3" fill="${C.uiRed}"/>`;
  for (const [sx, sy, sr] of [[34, -36, 5], [40, -44, 6.5], [48, -52, 8]]) o += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#7d7a70" stroke="${INK}" stroke-width="1" opacity="0.85"/>`;
  for (const wx of [3, 11, 19]) o += `<rect x="${wx}" y="-4" width="5" height="5" fill="#d8c86a" stroke="${INK}" stroke-width="0.8"/>`;
  // Outflow pipe to the sea.
  o += `<path d="M-2,4 L-22,4 L-22,10" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M-2,4 L-22,4 L-22,10" fill="none" stroke="#7a8a7a" stroke-width="3.4" stroke-linejoin="round"/>`;
  o += `<path d="M-22,12 q-2,6 -6,8 q4,1 8,-1 q3,3 6,1 q-4,-3 -8,-8z" fill="#7da03a" stroke="${INK}" stroke-width="0.9"/>`;
  return o + '</g>';
}

function barrel(x, y, a = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-4" y="-5.5" width="8" height="11" rx="2.2" fill="#c9a43a" stroke="${INK}" stroke-width="1"/><path d="M-4,-2 L4,-2 M-4,2 L4,2" stroke="${INK}" stroke-width="0.8"/><circle r="1.6" fill="${INK}"/></g>`;
}

function volcanoIsle(x, y) {
  let o = '';
  const d = smoothPath([[x - 28, y + 6], [x - 20, y - 8], [x - 4, y - 14], [x + 16, y - 10], [x + 30, y + 2], [x + 22, y + 14], [x - 2, y + 18], [x - 22, y + 15]], true, 0.4);
  o += land(d, { fill: '#cbb282' });
  o += `<path d="M${x - 16},${y + 8} L${x - 3},${y - 22} L${x + 7},${y - 22} L${x + 20},${y + 8}Z" fill="#7a6a5e" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
  o += `<path d="M${x + 2},${y - 22} L${x + 7},${y - 22} L${x + 20},${y + 8} L${x + 8},${y + 8}Z" fill="#5d5048"/>`;
  o += `<ellipse cx="${x + 2}" cy="${y - 22}" rx="5.4" ry="2" fill="#ff7a2a" stroke="${INK}" stroke-width="1"/>`;
  // Lava runs down toward the north-west (node 18, the volcanic secret level).
  o += `<path d="M${x},${y - 21} Q${x - 4},${y - 12} ${x - 10},${y - 6} Q${x - 16},${y - 2} ${x - 22},${y - 6}" fill="none" stroke="#ff6a2a" stroke-width="3" stroke-linecap="round"/><path d="M${x},${y - 21} Q${x - 4},${y - 12} ${x - 10},${y - 6} Q${x - 16},${y - 2} ${x - 22},${y - 6}" fill="none" stroke="#ffd04a" stroke-width="1.2" stroke-linecap="round"/>`;
  o += `<path d="M${x + 4},${y - 21} Q${x + 8},${y - 10} ${x + 12},${y + 2}" fill="none" stroke="#ff6a2a" stroke-width="2.2" stroke-linecap="round"/>`;
  for (const [sx, sy, sr] of [[x + 3, y - 29, 4], [x + 7, y - 36, 5.5], [x + 14, y - 42, 6.5]]) o += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#8a8178" stroke="${INK}" stroke-width="0.9" opacity="0.8"/>`;
  return o;
}

// ================================================================ mapbg

function mapbg() {
  const Wd = 700;
  const H = 540;
  let defs = '';
  let body = '';
  const r = rng(7001);

  // Sea: parchment-tinted, lighter in the middle.
  const [sd, su] = radial([[0, '#8fc0cd'], [0.6, SEA], [1, SEA_DEEP]], { cx: 0.45, cy: 0.42, r: 0.75 });
  defs += sd;
  body += `<rect width="${Wd}" height="${H}" fill="${su}"/>`;
  // Paper fibres / mottling.
  const [bd, bu] = blur(14, -100, -100, Wd + 200, H + 200);
  defs += bd;
  let mott = '';
  for (let i = 0; i < 40; i++) mott += `<ellipse cx="${fmt(r() * Wd)}" cy="${fmt(r() * H)}" rx="${fmt(30 + r() * 60)}" ry="${fmt(20 + r() * 40)}" fill="${r() < 0.5 ? PAPER : '#4f86a0'}" fill-opacity="${fmt(0.12 + r() * 0.12)}"/>`;
  body += `<g filter="${bu}">${mott}</g>`;
  // Lat/long grid.
  for (let x = 50; x < Wd; x += 100) body += `<path d="M${x},0 L${x},${H}" stroke="#2c5a72" stroke-width="0.7" stroke-dasharray="2 4" opacity="0.35"/>`;
  for (let y = 70; y < H; y += 100) body += `<path d="M0,${y} L${Wd},${y}" stroke="#2c5a72" stroke-width="0.7" stroke-dasharray="2 4" opacity="0.35"/>`;

  // Polluted water by the sewage works (nodes 4 and 5): murky green patches.
  const [pd, pu] = blur(9, -100, -100, Wd + 200, H + 200);
  defs += pd;
  body += `<g filter="${pu}"><ellipse cx="560" cy="95" rx="70" ry="48" fill="#7d9a52" fill-opacity="0.5"/><ellipse cx="510" cy="120" rx="40" ry="26" fill="#8a8a4a" fill-opacity="0.4"/><ellipse cx="600" cy="60" rx="40" ry="40" fill="#6d8a40" fill-opacity="0.5"/></g>`;
  // Warm lava glow in the water around the volcano isle (node 18).
  body += `<g filter="${pu}"><ellipse cx="452" cy="285" rx="42" ry="34" fill="#ff8a4a" fill-opacity="0.35"/><ellipse cx="440" cy="260" rx="24" ry="18" fill="#ff9a5a" fill-opacity="0.3"/></g>`;

  // ---- West coast with the home port (node 0) and the bay (node 20), running along the south.
  const west = smoothPath([
    [-20, -20], [104, -20], [100, 12], [80, 34], [62, 62], [50, 92], [30, 118], [20, 150], [26, 190], [16, 230], [22, 276], [14, 318], [4, 346],
    [-4, 372], [4, 404], [28, 424], [70, 432], [120, 424], [160, 438], [208, 446], [254, 456], [300, 458], [348, 452], [392, 456], [420, 444], [446, 428],
    [462, 432], [476, 456], [490, 496], [500, 560], [-20, 560],
  ], true, 0.4);
  body += land(west);
  // Hills and woods on the west coast.
  const west2 = '';
  void west2;
  body += hill(14, 140, 9) + hill(10, 200, 8) + hill(8, 260, 7) + tree(30, 92) + tree(18, 104, 0.9) + tree(8, 300);
  body += peak(20, 60, 12) + peak(40, 64, 9) + hill(64, 18, 8);
  // Port: houses and a pier reaching out toward node 0.
  const house = (x, y, col) => `<rect x="${x}" y="${y}" width="9" height="7" fill="#f4ead2" stroke="${INK}" stroke-width="1"/><path d="M${x - 1.5},${y} L${x + 4.5},${y - 5} L${x + 10.5},${y}Z" fill="${col}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  body += house(62, 36, C.uiRed) + house(74, 30, '#3f6fb0') + house(52, 48, '#c9772a');
  body += `<path d="M84,44 L104,40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M84,44 L104,40" stroke="#a87a4a" stroke-width="3" stroke-linecap="round"/>`;
  body += `<path d="M90,43 l0,4 M97,42 l0,4" stroke="${INK}" stroke-width="1.2"/>`;
  // South coast dressing.
  body += hill(60, 470, 10) + hill(90, 476, 8) + tree(130, 452) + tree(150, 462) + peak(200, 490, 12) + peak(222, 494, 9) + tree(260, 476) + hill(330, 482, 10) + tree(380, 474) + hill(420, 470, 8) + tree(30, 500) + peak(120, 520, 14);
  // Bay (node 20): sandy beach line and a hut.
  body += `<path d="M2,350 Q-2,376 6,400" fill="none" stroke="${C.sand2}" stroke-width="3" stroke-linecap="round"/>`;

  // ---- North-east shore with the sewage works (nodes 4/5).
  const ne = smoothPath([[620, -20], [720, -20], [720, 160], [672, 160], [636, 150], [618, 124], [608, 96], [614, 62], [606, 30], [612, 4]], true, 0.4);
  body += land(ne, { fill: '#d6c393' });
  body += factory(628, 84) + hill(680, 130, 9) + hill(660, 30, 8);
  body += barrel(520, 114, 20) + barrel(534, 124, -30) + barrel(506, 128, 70);

  // ---- South-east shore around the whirlpool lagoon (arch right foot at ~511,406).
  const se = smoothPath([[720, 290], [660, 312], [622, 340], [590, 368], [560, 386], [534, 398], [512, 406], [540, 412], [584, 408], [618, 422], [636, 452], [646, 500], [632, 560], [720, 560]], true, 0.35);
  body += land(se);
  body += peak(640, 380, 12) + peak(662, 372, 14) + hill(680, 420, 10) + tree(600, 396) + tree(660, 470) + hill(690, 510, 9);
  const wp = whirlpool(548, 468, 50);
  defs += wp.defs;
  body += wp.o;

  // ---- Islands, reefs and doodles in the open gaps.
  const isle = smoothPath([[150, 138], [164, 124], [186, 122], [204, 134], [200, 156], [184, 170], [160, 168], [146, 156]], true, 0.45);
  body += land(isle);
  body += hill(170, 150, 9) + hill(186, 148, 7) + palm(158, 160, 0.9) + palm(194, 162, 0.8);
  const islet = smoothPath([[312, 140], [324, 132], [338, 136], [340, 150], [326, 156], [312, 152]], true, 0.45);
  body += land(islet) + palm(326, 148, 0.9);
  body += volcanoIsle(458, 318);
  // Rocks around node 22 (the rocky secret level) (196,328) and a few strays.
  const rr = rng(7011);
  body += rocks(172, 280, 4, rr) + rocks(142, 330, 3, rr) + rocks(214, 296, 2, rr, 0.8) + rocks(264, 122, 2, rr, 0.8) + rocks(248, 368, 2, rr, 0.8);
  // Sunken ships.
  body += wreckIcon(122, 92, 0.9) + wreckIcon(590, 296, 1, true);
  body += serpent(344, 258);
  body += compass(604, 196, 28);
  // Chart wave marks in open water away from sites.
  const marks = [[226, 40], [380, 34], [300, 40], [420, 104], [520, 170], [90, 280], [130, 380], [330, 196], [600, 250], [400, 420], [470, 100], [36, 200], [580, 140], [660, 230], [680, 330], [240, 120]];
  for (const [x, y] of marks) body += waveMark(x, y, 1, 0.45);
  // Aged-paper vignette.
  const [vd, vu] = radial([[0, '#5a3a14', 0], [0.7, '#5a3a14', 0.05], [1, '#5a3a14', 0.38]], { cx: 0.5, cy: 0.5, r: 0.72 });
  defs += vd;
  body += `<rect width="${Wd}" height="${H}" fill="${vu}"/>`;
  return svg(Wd, H, body, defs);
}

// ================================================================ arch overlay

function mapscreen_arch() {
  let defs = '';
  let o = '';
  const outer = [[2, 90], [4, 58], [12, 28], [28, 6], [44, 2], [58, 12], [70, 34], [77, 66]];
  const inner = [[66, 66], [60, 40], [50, 22], [40, 16], [30, 22], [20, 44], [16, 70], [18, 90]];
  const d = smoothPath([...outer, ...inner], true, 0.35);
  const [gd, gu] = linear([[0, '#b8a888'], [0.5, '#9b8a6a'], [1, '#7a6a52']], { x1: 0, y1: 0, x2: 0.3, y2: 1 });
  defs += gd;
  const [kd, ku] = clip(`<path d="${d}"/>`);
  defs += kd;
  o += `<path d="${d}" fill="${gu}"/>`;
  let inn = '';
  // Shadowed underside of the span.
  inn += `<path d="${smoothPath(inner, false, 0.35)}" fill="none" stroke="#5a4c3a" stroke-width="9" opacity="0.6"/>`;
  // Lit top edge.
  inn += `<path d="${smoothPath(outer, false, 0.35)}" fill="none" stroke="#e2d6b4" stroke-width="5" opacity="0.6"/>`;
  // Cracks and strata.
  const r = rng(7101);
  for (const [x, y, a] of [[10, 60, 70], [22, 20, 30], [44, 8, -10], [64, 30, -55], [70, 54, -75], [8, 80, 80]]) {
    const L = 6 + r() * 4;
    const rad = (a * Math.PI) / 180;
    inn += `<path d="M${x},${y} l${fmt(Math.cos(rad) * L)},${fmt(Math.sin(rad) * L)}" stroke="#5a4c3a" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  o += `<g clip-path="${ku}">${inn}</g>`;
  o += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  // Grass tufts and rubble at the feet.
  o += `<path d="M1,90 q3,-6 5,0 q2,-7 5,0 q2,-6 5,0 q2,-5 4,0" fill="#7fa04a" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  o += `<path d="M64,68 q3,-6 5,0 q2,-7 5,0 q2,-5 4,0" fill="#7fa04a" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  o += `<path d="M36,8 q3,-5 6,-1 q3,-4 6,1" fill="#7fa04a" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  return svg(79, 91, o, defs);
}

// ================================================================ chests

function chest(letter, open) {
  let o = '';
  const wood = C.wood1;
  const woodD = C.wood0;
  const band = C.brass;
  const s = 1.5;
  if (!open) {
    // Domed lid.
    o += `<path d="M5,15 L5,11 Q5,3 24,3 Q43,3 43,11 L43,15Z" fill="${shade(wood, 0.08)}" stroke="${INK}" stroke-width="${s}" stroke-linejoin="round"/>`;
    o += `<path d="M8,9 Q24,4 40,9" fill="none" stroke="${shade(wood, 0.35)}" stroke-width="1.4" stroke-linecap="round"/>`;
    o += `<path d="M12,4.6 L12,15 M36,4.6 L36,15" stroke="${band}" stroke-width="3"/><path d="M10.5,4.8 L10.5,15 M13.5,4.4 L13.5,15 M34.5,4.4 L34.5,15 M37.5,4.8 L37.5,15" stroke="${INK}" stroke-width="0.8"/>`;
  } else {
    // Lid flipped back, gold heaped inside.
    o += `<path d="M6,13 L8,3 Q24,-1 40,3 L42,13Z" fill="${woodD}" stroke="${INK}" stroke-width="${s}" stroke-linejoin="round"/>`;
    o += `<path d="M8,14 Q12,7 18,9 Q24,4 30,8 Q36,6 40,14Z" fill="${C.uiGold}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    for (const [cx, cy] of [[15, 11], [22, 8.5], [29, 10], [35, 12]]) o += `<ellipse cx="${cx}" cy="${cy}" rx="2.6" ry="1.5" fill="#ffe27a" stroke="${C.uiGoldDark}" stroke-width="0.7"/>`;
  }
  // Body.
  o += `<rect x="5" y="15" width="38" height="18" rx="2" fill="${wood}" stroke="${INK}" stroke-width="${s}" stroke-linejoin="round"/>`;
  o += `<path d="M6,16.5 L42,16.5" stroke="${shade(wood, 0.3)}" stroke-width="1.2"/>`;
  o += `<path d="M12,15 L12,33 M36,15 L36,33" stroke="${band}" stroke-width="3"/><path d="M10.5,15 L10.5,33 M13.5,15 L13.5,33 M34.5,15 L34.5,33 M37.5,15 L37.5,33" stroke="${INK}" stroke-width="0.8"/>`;
  o += `<rect x="5" y="15" width="38" height="18" rx="2" fill="none" stroke="${INK}" stroke-width="${s}"/>`;
  // Big letter on the front, overlapping lid and body.
  o += text(letter, { x: 24, y: open ? 32.5 : 31.5, size: 23, file: FONTS.display, anchor: 'middle', fill: '#ffffff', stroke: INK, strokeWidth: 3.4 });
  if (open) {
    // Red check mark: the site has been visited before.
    const ck = 'M27,9 L32,15 L45,1';
    o += `<path d="${ck}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    o += `<path d="${ck}" fill="none" stroke="#ffffff" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    o += `<path d="${ck}" fill="none" stroke="#e8262a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return svg(48, 35, o);
}

// ================================================================ ships

/** Little sailing ship facing right; scale s around the hull centre. */
function ship({ hull = '#8a5a34', sail = '#f6f0dc', flag = C.uiRed, sw = 1.2 } = {}) {
  let o = '';
  // Jib (behind), hull, mast, bellied square sail, pennant.
  o += `<path d="M13.6,2.6 L24,12 L17,12Z" fill="${shade(sail, -0.1)}" stroke="${INK}" stroke-width="${sw * 0.85}" stroke-linejoin="round"/>`;
  o += `<path d="M2,10 L6,12 L25,12 L21.5,19 L6.5,19 Q3.5,16 2,10Z" fill="${hull}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  o += `<path d="M5,14.6 L23.4,14.6" stroke="${shade(hull, 0.35)}" stroke-width="1"/>`;
  o += `<path d="M13,12 L13,1.4" stroke="${INK}" stroke-width="${sw + 0.3}" stroke-linecap="round"/>`;
  o += `<path d="M7.5,3.4 Q13,2.2 18.5,3.4 Q20,7.4 18.5,10.6 Q13,9.6 7.5,10.6 Q6.6,7.4 7.5,3.4Z" fill="${sail}" stroke="${INK}" stroke-width="${sw * 0.85}" stroke-linejoin="round"/>`;
  o += `<path d="M10,4 Q10.6,7 10,10" fill="none" stroke="${shade(sail, -0.18)}" stroke-width="0.8"/>`;
  o += `<path d="M13,1.4 L8,2.2 L13,3.2Z" fill="${flag}" stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"/>`;
  return o;
}

function mapship() {
  return svg(26, 22, ship() + `<path d="M3,20.5 q3,-1.6 6,0 t6,0 t6,0" fill="none" stroke="#f0f8f4" stroke-width="1" stroke-linecap="round"/>`);
}

function mapshipcolor() {
  let defs = '';
  const body = strip(6, 50, 45, (i, t) => {
    const a = t * Math.PI * 2;
    const bob = Math.sin(a) * 1.4;
    const tilt = Math.sin(a + 0.8) * 3;
    const [gd, gu] = radial([[0, '#fff6b0', 1], [0.5, '#ffd84a', 0.65], [1, '#ffd84a', 0]]);
    defs += gd;
    const pulse = 1 + Math.sin(a) * 0.06;
    let o = `<ellipse cx="25" cy="26" rx="${fmt(23 * pulse)}" ry="${fmt(18 * pulse)}" fill="${gu}"/>`;
    // Ripple ring under the hull.
    o += `<ellipse cx="25" cy="36" rx="${fmt(16 + (t * 6) % 6)}" ry="3.4" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="${fmt(0.8 - ((t * 6) % 6) / 8)}"/>`;
    o += `<g transform="translate(25 ${fmt(30 + bob)}) rotate(${fmt(tilt)}) scale(1.55) translate(-13 -14)">${ship({ hull: C.uiRed, sail: '#fff8e0', flag: C.diverYellow, sw: 1.1 })}</g>`;
    // Glint travelling over the sail.
    const gx = 18 + Math.sin(a) * 6;
    const gy = 15 + bob;
    const k = 0.6 + 0.4 * Math.abs(Math.cos(a));
    o += `<path d="M${fmt(gx)},${fmt(gy - 5 * k)} L${fmt(gx + 1.2)},${fmt(gy - 1.2)} L${fmt(gx + 5 * k)},${fmt(gy)} L${fmt(gx + 1.2)},${fmt(gy + 1.2)} L${fmt(gx)},${fmt(gy + 5 * k)} L${fmt(gx - 1.2)},${fmt(gy + 1.2)} L${fmt(gx - 5 * k)},${fmt(gy)} L${fmt(gx - 1.2)},${fmt(gy - 1.2)}Z" fill="#ffffff"/>`;
    return o;
  });
  return svg(300, 45, body, defs);
}

// ================================================================ trail dots and cursor

const point = () =>
  svg(10, 10, `<circle cx="5" cy="5" r="3.4" fill="#8a2a1c" stroke="#3a1208" stroke-width="1"/><circle cx="4" cy="4" r="1" fill="#e08a6a"/>`);

const point_green = () =>
  svg(10, 10, `<circle cx="5" cy="5" r="3.8" fill="#3ee05a" stroke="${INK}" stroke-width="1.3"/><circle cx="3.9" cy="3.9" r="1.2" fill="#d8ffd0"/>`);

function pointer2() {
  // Drawn with the fingertip at the origin pointing up, then placed at (10,2) and tilted.
  let o = '';
  const glove = '#ffffff';
  const shadeC = '#c9d3e0';
  const st = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  // Cuff.
  o += `<rect x="-3" y="38" width="26" height="9" rx="3" fill="${C.diverYellow}" ${st}/>`;
  // Folded fingers (knuckles on the right).
  o += `<path d="M2,18 L20,18 Q26,18 26,23 Q26,27 22,27 Q27,28 26,32 Q25,36 20,35 Q24,38 21,40 L-1,40 Q-5,40 -5,34 L-5,26 Z" fill="${glove}" ${st}/>`;
  o += `<path d="M20,27 L13,27 M20,35 L13,35" ${st}/>`;
  o += `<path d="M-3,36 Q8,39 20,38" fill="none" stroke="${shadeC}" stroke-width="2"/>`;
  // Thumb across the front.
  o += `<path d="M-5,27 Q-10,22 -8,18 Q-6,15 -2,19 L4,25 Q6,28 3,30 Z" fill="${glove}" ${st}/>`;
  // Index finger.
  o += `<path d="M-4,22 L-4,4 Q-4,-1 0,-1 Q4,-1 4,4 L4,20" fill="${glove}" ${st}/>`;
  o += `<path d="M1.6,3 L1.6,17" stroke="${shadeC}" stroke-width="1.6" stroke-linecap="round"/>`;
  o += `<path d="M-4,10 L-1,10" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`;
  return svg(58, 58, `<g transform="translate(10 3.2) rotate(-14)">${o}</g>`);
}

export default {
  mapbg,
  mapscreen_arch,
  mapchest_a: () => chest('A', false),
  mapchest_b: () => chest('B', false),
  mapchest_c: () => chest('C', false),
  mapchest_a_open: () => chest('A', true),
  mapchest_b_open: () => chest('B', true),
  mapchest_c_open: () => chest('C', true),
  mapship,
  mapshipcolor,
  point,
  point_green,
  pointer2,
};

void mix;
void id;
