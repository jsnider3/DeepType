// Full-screen menu art: title/loading screen (+ loading bar pieces and the CONTINUE button),
// the main menu (gameselector) with its button hover/pressed cut-outs, and the Hall of Fame.
// Layout coordinates come from src/scenes/{title,selector,hall}.ts.

import { C, STROKE, svg, linear, radial, shade, text, measure, FONTS, GAME_TITLE, rng } from './lib.mjs';
import { rr, blur, seaGradient, rays, caustics, bubbles, bubbleTrail, kelp, seabed, rock, diver, bigShark, finBadge, glossPanel, bannerText, fit, f2 } from './screens-lib.mjs';

const W = 640;
const H = 480;

/** Collect { out, defs } pieces. */
function acc() {
  const a = { out: '', defs: '' };
  a.add = (p) => {
    if (typeof p === 'string') a.out += p;
    else {
      a.out += p.out;
      a.defs += p.defs ?? '';
    }
    return a;
  };
  return a;
}

const place = (p, x, y, s = 1, extra = '') => ({ out: `<g transform="translate(${x},${y}) scale(${s})" ${extra}>${p.out}</g>`, defs: p.defs });

// ---------------------------------------------------------------- logo

/** GAME_TITLE as a chunky gold logo centred at cx; one or two lines. */
function logo(cx, y0, maxW) {
  const a = acc();
  const words = GAME_TITLE.split(/\s+/);
  const lines = words.length === 2 ? words : [GAME_TITLE];
  const [gd, gu] = linear([[0, '#fff3a8'], [0.45, C.uiGold], [1, '#f08a24']]);
  a.defs += gd;
  let y = y0;
  lines.forEach((ln, i) => {
    const size = fit(ln, i === 0 && lines.length === 2 ? 92 : 112, maxW);
    y += size * 0.78;
    const o = { x: cx, y, size, anchor: 'middle', letterSpacing: 2 };
    // extrusion
    for (let d = 7; d >= 1; d--) a.add(text(ln, { ...o, x: cx + d * 0.5, y: y + d, fill: C.ink, stroke: C.ink, strokeWidth: 12 }));
    a.add(text(ln, { ...o, fill: C.ink, stroke: C.ink, strokeWidth: 12 }));
    a.add(text(ln, { ...o, fill: shade(C.sea1, 0.1), stroke: '#fffbe6', strokeWidth: 5 }));
    a.add(text(ln, { ...o, fill: gu }));
    y += 14;
  });
  return a;
}

// ---------------------------------------------------------------- title screen

function titlescreen() {
  const a = acc();
  a.add(seaGradient(W, H, '#56b4e8', C.sea2, C.sea0));
  a.add(rays(W, H, 11, 7, 0.12));
  a.add(caustics(W, 6, 120, 4, 0.2));
  // distant reef silhouettes
  a.add(`<path d="M0,330 Q60,280 120,300 T240,290 T380,310 T520,280 T640,300 V480 H0Z" fill="${C.sea1}" opacity="0.7"/>`);
  a.add(`<path d="M0,360 Q80,330 170,345 T340,350 T520,335 T640,345 V480 H0Z" fill="${shade(C.sea0, 0.05)}"/>`);
  // background fish school
  const r = rng(21);
  for (let i = 0; i < 9; i++) {
    const x = 470 + r() * 150;
    const y = 30 + r() * 90;
    a.add(`<path d="M${f2(x)},${f2(y)} q8,-6 16,0 l6,-4 v8 l-6,-4 q-8,6 -16,0z" fill="${C.sea1}" opacity="0.55"/>`);
  }
  // the shark lunging in from the right
  a.add(place(bigShark(), 372, 262, 0.92));
  // the diver with his zapper, left
  a.add(place(diver({ zapper: true }), 128, 252, 0.78));
  a.add(bubbleTrail(118, 160, 5, 7, 8, 26));
  // seabed bits at the far left (most of the band is covered by the loading bar)
  a.add(seabed(W, H, 440, 452, 8));
  a.add(rock(40, 446, 40, 26, 3));
  a.add(kelp(16, 450, 120, 2));
  a.add(kelp(98, 452, 80, 5, C.kelp1, C.kelp0, 7));
  a.add(rock(600, 452, 46, 22, 7, C.rock0));
  a.add(bubbles([[300, 330, 4], [470, 220, 3], [560, 160, 5], [250, 120, 3]]));
  // logo on top
  a.add(logo(320, 6, 560));
  return svg(W, H, a.out, a.defs);
}

/** Loading-bar frame: a capsule trough (gold fills local x 23..393, y 15..91) + fin emblem. */
function barandlogo() {
  const a = acc();
  const [rd, ru] = linear([[0, C.steel2], [0.5, C.steel1], [1, C.steel0]]);
  const [id, iu] = linear([[0, '#06162e'], [1, C.sea1]]);
  a.defs += rd + id;
  // bracket to the emblem
  a.add(`<path d="${rr(380, 30, 60, 26, 6)}" fill="${ru}" stroke="${C.ink}" stroke-width="${STROKE}"/>`);
  // trough
  a.add(`<path d="${rr(12, 8, 396, 66, 33)}" fill="${ru}" stroke="${C.ink}" stroke-width="${STROKE * 1.25}"/>`);
  a.add(`<path d="${rr(16, 10, 388, 22, 11)}" fill="#fff" opacity="0.3"/>`);
  a.add(`<path d="${rr(22, 17, 374, 48, 24)}" fill="${iu}" stroke="${C.ink}" stroke-width="${STROKE}"/>`);
  for (let i = 1; i < 10; i++) a.add(`<path d="M${22 + i * 37.4},22 v6 M${22 + i * 37.4},54 v6" stroke="${C.sea3}" stroke-width="1.5" opacity="0.6"/>`);
  // rivets
  for (const [x, y] of [[32, 13], [388, 13], [32, 69], [388, 69]]) a.add(`<circle cx="${x}" cy="${y}" r="2.2" fill="${C.steel2}" stroke="${C.ink}" stroke-width="1"/>`);
  // emblem
  a.add(finBadge(462, 50, 44, { w: 2.5 }));
  return svg(514, 126, a.out, a.defs);
}

/** The gold fill (a capsule inside goldbar's 370x76 box; revealed left to right). */
function goldbar() {
  const a = acc();
  const [gd, gu] = linear([[0, '#fff1a0'], [0.35, C.uiGold], [0.75, '#f0a21c'], [1, '#c46f0c']]);
  a.defs += gd;
  const cid = 'gbclip';
  a.defs += `<clipPath id="${cid}"><path d="${rr(3, 6, 364, 40, 20)}"/></clipPath>`;
  a.add(`<path d="${rr(3, 6, 364, 40, 20)}" fill="${gu}" stroke="${C.ink}" stroke-width="1.5"/>`);
  a.add(`<g clip-path="url(#${cid})">`);
  for (let x = -20; x < 380; x += 22) a.add(`<path d="M${x},46 l14,-40 h9 l-14,40z" fill="#fff" opacity="0.16"/>`);
  a.add(`<path d="M3,40 H367 V46 H3Z" fill="#7ff3ff" opacity="0.35"/>`);
  a.add(`</g>`);
  a.add(`<path d="${rr(14, 10, 342, 11, 5.5)}" fill="#fff" opacity="0.55"/>`);
  a.add(bubbles([[60, 30, 3], [140, 34, 2.5], [230, 28, 3], [320, 33, 2.5]], 0.6));
  return svg(370, 76, a.out, a.defs);
}

function continueBtn(over) {
  const a = acc();
  const fill = over ? C.uiGold : C.sea0;
  a.add(`<path d="${rr(1.5, 1.5, 232, 25, 12.5)}" fill="${fill}" fill-opacity="${over ? 1 : 0.85}" stroke="${C.ink}" stroke-width="${STROKE}"/>`);
  if (over) a.add(`<path d="${rr(10, 3.5, 215, 7, 3.5)}" fill="#fff" opacity="0.45"/>`);
  const size = fit('CLICK HERE TO CONTINUE', 17, 205);
  a.add(text('CLICK HERE TO CONTINUE', { x: 117.5, y: 21, size, anchor: 'middle', fill: over ? C.ink : '#fff', stroke: over ? null : C.ink, strokeWidth: 3, letterSpacing: 0.5 }));
  return svg(235, 28, a.out, a.defs);
}

// ---------------------------------------------------------------- main menu

const BIG = [
  { key: 'adventure', x: 303, y: 32, title: 'ADVENTURE', blurb: 'Dive for sunken treasure!', col: '#f08a24', icon: 'chest' },
  { key: 'abyss', x: 303, y: 136, title: 'ABYSS', blurb: 'How deep can you go?', col: '#6a4bc4', icon: 'gauge' },
  { key: 'tutor', x: 303, y: 240, title: 'TYPING TUTOR', blurb: 'Lessons to sharpen your typing', col: '#2a9f5c', icon: 'key' },
];
const SLIM = [
  { key: 'hall', x: 307, y: 362, w: 204, h: 42, title: 'HALL OF FAME', col: '#2394b8', icon: 'trophy' },
  { key: 'options', x: 307, y: 404, w: 204, h: 41, title: 'OPTIONS', col: '#2394b8', icon: 'gear' },
];
const QUIT = { key: 'quit', x: 511, y: 362, w: 98, h: 83 };

/** Small icons centred on (0,0), about 44 px. */
function icon(kind) {
  const s = `stroke="${C.ink}" stroke-width="${STROKE}" stroke-linejoin="round"`;
  switch (kind) {
    case 'chest':
      return (
        `<path d="M-20,-4 H20 V16 H-20Z" fill="${C.wood1}" ${s}/>` +
        `<path d="M-20,-4 V-10 Q0,-26 20,-10 V-4Z" fill="${C.wood2}" ${s}/>` +
        `<path d="M-6,-19 V16 M6,-19 V16" stroke="${C.brass}" stroke-width="4"/>` +
        `<rect x="-5" y="-6" width="10" height="9" rx="2" fill="${C.uiGold}" ${s}/>` +
        `<circle cx="-14" cy="-14" r="4" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1.2"/><circle cx="15" cy="-15" r="3.5" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1.2"/>` +
        `<path d="M-20,-4 H20 V16 H-20Z" fill="none" ${s}/>`
      );
    case 'gauge': {
      let t = '';
      for (let i = 0; i <= 8; i++) {
        const ang = Math.PI * (0.8 + (i / 8) * 1.4);
        t += `<path d="M${f2(Math.cos(ang) * 13)},${f2(Math.sin(ang) * 13)} L${f2(Math.cos(ang) * 17)},${f2(Math.sin(ang) * 17)}" stroke="${C.ink}" stroke-width="1.6"/>`;
      }
      return (
        `<circle r="23" fill="${C.steel1}" ${s}/><circle r="19" fill="#fdf6e0" ${s}/>` + t +
        `<path d="M0,0 L13,9" stroke="${C.uiRed}" stroke-width="3.5" stroke-linecap="round"/><circle r="3.5" fill="${C.ink}"/>` +
        `<path d="M-7,10 l7,6 l7,-6" fill="none" stroke="${C.sea1}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    case 'key':
      return (
        `<path d="${rr(-20, -16, 40, 36, 7)}" fill="${C.steel1}" ${s}/>` +
        `<path d="${rr(-16, -20, 32, 31, 6)}" fill="#f4f6fa" ${s}/>` +
        text('A', { x: 0, y: 4, size: 22, anchor: 'middle', fill: C.ink })
      );
    case 'trophy':
      return (
        `<path d="M-8,-9 h-4 a4,4 0 0 0 4,8 M8,-9 h4 a4,4 0 0 1 -4,8" fill="none" stroke="${C.ink}" stroke-width="2"/>` +
        `<path d="M-8,-10 H8 V-2 Q8,6 0,6 Q-8,6 -8,-2Z" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1.5"/>` +
        `<path d="M-2,6 h4 v3 h4 v3 h-12 v-3 h4z" fill="${C.uiGoldDark}" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/>`
      );
    case 'gear': {
      let d = '';
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const p = (r, da) => `${f2(Math.cos(ang + da) * r)},${f2(Math.sin(ang + da) * r)}`;
        d += `${i ? 'L' : 'M'}${p(7.5, -0.28)} L${p(11, -0.18)} L${p(11, 0.18)} L${p(7.5, 0.28)} `;
      }
      return `<path d="${d}Z" fill="${C.steel2}" stroke="${C.ink}" stroke-width="1.5" stroke-linejoin="round"/><circle r="3.2" fill="${C.sea1}" stroke="${C.ink}" stroke-width="1.5"/>`;
    }
    case 'power':
      return `<path d="M-7,-9 A11,11 0 1 0 7,-9" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/><path d="M0,-14 V-1" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/><path d="M-7,-9 A11,11 0 1 0 7,-9" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M0,-14 V-1" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  return '';
}

/** Glow halo behind a hovered button. */
function halo(x, y, w, h, r) {
  const [bd, bu] = blur(4, 20);
  return { defs: bd, out: `<path d="${rr(x, y, w, h, r)}" fill="none" stroke="#fff3a0" stroke-width="7" opacity="0.9" filter="${bu}"/>` };
}

/** A big mode button in local 310x101 coordinates. */
function bigButton(b, state) {
  const a = acc();
  const over = state === 'over';
  const down = state === 'down';
  const col = over ? shade(b.col, 0.14) : down ? shade(b.col, -0.12) : b.col;
  if (over) a.add(halo(7, 5, 296, 89, 20));
  const dx = down ? 2 : 0;
  const dy = down ? 4 : 0;
  a.add(`<g transform="translate(${dx},${dy})">`);
  a.add(glossPanel(8, 6, 294, 84, 18, col, { lip: down ? 0 : 5, stroke: 2.5, gloss: over ? 0.45 : 0.32 }));
  // icon badge
  const [bd, bu] = radial([[0, '#ffffff'], [1, '#f4e3b8']], { cx: 0.4, cy: 0.35, r: 0.7 });
  a.defs += bd;
  a.add(`<circle cx="52" cy="48" r="31" fill="${bu}" stroke="${C.ink}" stroke-width="2.5"/>`);
  a.add(`<circle cx="52" cy="48" r="26" fill="none" stroke="${shade(b.col, -0.1)}" stroke-width="2" opacity="0.5"/>`);
  a.add(`<g transform="translate(52,${b.icon === 'chest' ? 51 : 48})">${icon(b.icon)}</g>`);
  // title + blurb
  const size = fit(b.title, 34, 196);
  a.add(bannerText(b.title, { x: 194, y: 50, size, anchor: 'middle', fill: over ? '#fff6c0' : '#fff', ow: 5, shadow: 3 }));
  a.add(`<path d="${rr(92, 60, 202, 20, 10)}" fill="${C.ink}" opacity="0.3"/>`);
  const bs = fit(b.blurb, 11.5, 190, FONTS.slab);
  a.add(text(b.blurb, { x: 193, y: 74, size: bs, anchor: 'middle', file: FONTS.slab, fill: '#fff' }));
  if (over) {
    for (const [sx, sy, k] of [[284, 18, 1], [100, 16, 0.7], [292, 72, 0.6]])
      a.add(`<path d="M${sx},${sy - 7 * k} L${sx + 2 * k},${sy - 2 * k} L${sx + 7 * k},${sy} L${sx + 2 * k},${sy + 2 * k} L${sx},${sy + 7 * k} L${sx - 2 * k},${sy + 2 * k} L${sx - 7 * k},${sy} L${sx - 2 * k},${sy - 2 * k}Z" fill="#fff"/>`);
  }
  a.add('</g>');
  return a;
}

/** Slim pill button (Hall of Fame / Options) in local w x h coordinates. */
function slimButton(b, state) {
  const a = acc();
  const over = state === 'over';
  const down = state === 'down';
  const col = over ? shade(b.col, 0.16) : down ? shade(b.col, -0.12) : b.col;
  if (over) a.add(halo(4, 3, 196, 33, 16));
  a.add(`<g transform="translate(${down ? 1 : 0},${down ? 3 : 0})">`);
  a.add(glossPanel(4, 3, 196, 32, 16, col, { lip: down ? 0 : 4, stroke: 2, gloss: over ? 0.45 : 0.3 }));
  a.add(`<circle cx="22" cy="19" r="13" fill="#fdf3d6" stroke="${C.ink}" stroke-width="2"/>`);
  a.add(`<g transform="translate(22,${b.icon === 'trophy' ? 20 : 19})">${icon(b.icon)}</g>`);
  a.add(bannerText(b.title, { x: 116, y: 27, size: fit(b.title, 20, 140), anchor: 'middle', fill: over ? '#fff6c0' : '#fff', ow: 3.5, shadow: 2 }));
  a.add('</g>');
  return a;
}

function quitButton(state) {
  const a = acc();
  const over = state === 'over';
  const down = state === 'down';
  const col = over ? shade(C.uiRed, 0.14) : down ? shade(C.uiRed, -0.12) : C.uiRed;
  if (over) a.add(halo(5, 4, 88, 70, 16));
  a.add(`<g transform="translate(${down ? 1 : 0},${down ? 4 : 0})">`);
  a.add(glossPanel(5, 4, 88, 70, 16, col, { lip: down ? 0 : 5, stroke: 2.5, gloss: over ? 0.45 : 0.3 }));
  a.add(`<g transform="translate(49,30)">${icon('power')}</g>`);
  a.add(bannerText('QUIT GAME', { x: 49, y: 65, size: fit('QUIT GAME', 16, 76), anchor: 'middle', fill: over ? '#fff6c0' : '#fff', ow: 3.5, shadow: 2 }));
  a.add('</g>');
  return a;
}

/** The whole menu with each button in the given state (default idle). */
function selectorScene(states = {}) {
  const a = acc();
  a.add(seaGradient(W, H, '#4aa6de', C.sea2, C.sea0));
  a.add(rays(W, H, 5, 6, 0.1));
  a.add(caustics(W, 4, 70, 12, 0.18));
  // distant shark patrolling behind the diver
  a.add(place(bigShark({ base: '#3b6f9e', back: '#2c5a85', belly: '#5b8cb8', mouth: false, clip: false }), 40, 196, 0.42, 'opacity="0.55"'));
  // seabed + scenery
  a.add(`<path d="M0,410 Q90,380 190,400 T380,392 T640,400 V480 H0Z" fill="${C.sea1}" opacity="0.8"/>`);
  a.add(seabed(W, H, 428, 452, 14));
  a.add(rock(255, 440, 52, 34, 4));
  a.add(rock(70, 448, 40, 22, 9, C.rock0));
  a.add(kelp(18, 452, 210, 3));
  a.add(kelp(282, 436, 150, 8, C.kelp1, C.kelp0, 8));
  a.add(kelp(626, 470, 90, 6, C.kelp1, C.kelp0, 7));
  // chest half buried
  a.add(`<g transform="translate(226,446) rotate(-8)">${icon('chest')}</g>`);
  // our diver, waving hello
  a.add(place(diver({ wave: true }), 150, 336, 0.92));
  a.add(bubbleTrail(150, 232, 4, 3, 6, 24));
  // welcome plaque
  const [pd, pu] = linear([[0, C.sea1], [1, '#082040']]);
  a.defs += pd;
  a.add(`<path d="${rr(20, 22, 280, 128, 16)}" fill="${C.ink}" opacity="0.35" transform="translate(3,4)"/>`);
  a.add(`<path d="${rr(20, 22, 280, 128, 16)}" fill="${pu}" stroke="${C.ink}" stroke-width="2.5"/>`);
  a.add(`<path d="${rr(25, 27, 270, 118, 12)}" fill="none" stroke="${C.uiGold}" stroke-width="2"/>`);
  for (const [x, y] of [[33, 35], [287, 35]]) a.add(`<circle cx="${x}" cy="${y}" r="2.5" fill="${C.uiGold}" stroke="${C.ink}" stroke-width="1"/>`);
  a.add(`<path d="${rr(31, 80, 258, 61, 9)}" fill="#e2c78f" stroke="${C.ink}" stroke-width="1.5"/>`);
  a.add(`<path d="${rr(35, 82, 250, 5, 2.5)}" fill="#fff" opacity="0.35"/>`);
  // button rack
  a.add(`<path d="${rr(296, 24, 324, 428, 22)}" fill="${C.sea0}" opacity="0.28"/>`);
  for (const b of BIG) a.add(place(bigButton(b, states[b.key] ?? 'idle'), b.x, b.y));
  for (const b of SLIM) a.add(place(slimButton(b, states[b.key] ?? 'idle'), b.x, b.y));
  a.add(place(quitButton(states.quit ?? 'idle'), QUIT.x, QUIT.y));
  return a;
}

// resvg panics on layers (opacity groups) that lie wholly outside the canvas, which the
// cut-outs below produce; so the menu uses fill/stroke-opacity instead of opacity, in both
// the full image and the cut-outs so they stay pixel-identical.
const safe = (s) => s.replace(/ opacity="([\d.]+)"/g, ' fill-opacity="$1" stroke-opacity="$1"');

function gameselector() {
  const a = selectorScene();
  return svg(W, H, safe(a.out), a.defs);
}

/** Cut-out of the menu at a button rect with that button in the given state. */
function cut(key, x, y, w, h, state) {
  return () => {
    const a = selectorScene({ [key]: state });
    return svg(w, h, `<g transform="translate(${-x},${-y})">${safe(a.out)}</g>`, a.defs);
  };
}

const buttons = {};
for (const b of BIG) for (const st of ['over', 'down']) buttons[`button_${b.key}_${st}`] = cut(b.key, b.x, b.y, 310, 101, st);
for (const b of SLIM) for (const st of ['over', 'down']) buttons[`button_${b.key}_${st}`] = cut(b.key, b.x, b.y, b.w, b.h, st);
for (const st of ['over', 'down']) buttons[`button_quit_${st}`] = cut('quit', QUIT.x, QUIT.y, QUIT.w, QUIT.h, st);

// ---------------------------------------------------------------- hall of fame

/** One score table: rim, coloured title plate, column-heading strip and a light striped body. */
function scoreTable(x, w, title, col, heads, rankRight) {
  const a = acc();
  const y = 86;
  const h = 268;
  a.add(`<path d="${rr(x, y, w, h, 14)}" fill="${C.ink}" opacity="0.35" transform="translate(3,4)"/>`);
  a.add(`<path d="${rr(x, y, w, h, 14)}" fill="${C.sea1}" stroke="${C.ink}" stroke-width="2.5"/>`);
  a.add(glossPanel(x + 6, y + 6, w - 12, 30, 10, col, { lip: 0, stroke: 2, gloss: 0.3 }));
  a.add(bannerText(title, { x: x + w / 2, y: y + 31, size: 24, anchor: 'middle', ow: 4, shadow: 2 }));
  // headings strip
  a.add(`<path d="${rr(x + 6, 125, w - 12, 22, 4)}" fill="#e2c78f" stroke="${C.ink}" stroke-width="1.2"/>`);
  for (const [str, hx, anchor] of heads) a.add(text(str, { x: hx, y: 141, size: 11.5, file: FONTS.slab, anchor, fill: C.ink, letterSpacing: 0.5 }));
  // body with alternating rows (row i baseline 165 + 19i)
  a.add(`<path d="${rr(x + 6, 148, w - 12, 199, 6)}" fill="#fbf7ec" stroke="${C.ink}" stroke-width="1.2"/>`);
  for (let i = 1; i < 10; i += 2) a.add(`<rect x="${x + 7}" y="${150 + 19 * i}" width="${w - 14}" height="19" fill="#f0e6cc"/>`);
  for (let i = 0; i < 10; i++) a.add(text(String(i + 1), { x: rankRight, y: 163 + 19 * i, size: 9, file: FONTS.slab, anchor: 'end', fill: '#b39a63' }));
  return a;
}

function trophy(cx, cy, s) {
  return `<g transform="translate(${cx},${cy}) scale(${s})">${icon('trophy')}</g>`;
}

function high_score_bg() {
  const a = acc();
  a.add(seaGradient(W, H, C.sea2, C.sea1, '#071b3a'));
  a.add(rays(W, H, 17, 6, 0.08));
  a.add(caustics(W, 4, 60, 30, 0.15));
  a.add(bubbles([[20, 120, 4], [14, 90, 3], [24, 60, 2.5], [622, 200, 4], [628, 160, 3], [618, 130, 2]]));
  // seabed + scenery
  a.add(seabed(W, H, 420, 412, 21));
  a.add(rock(70, 430, 56, 30, 12));
  a.add(rock(580, 424, 60, 32, 13, C.rock0));
  a.add(kelp(16, 440, 120, 11));
  a.add(kelp(622, 436, 110, 12, C.kelp1, C.kelp0, 8));
  a.add(`<g transform="translate(130,432) rotate(6)">${icon('chest')}</g>`);
  a.add(`<g transform="translate(512,430) scale(0.9) rotate(-6)">${icon('chest')}</g>`);
  // a small shark patrolling between the tables and the seabed
  a.add(place(bigShark({ base: '#3b6f9e', back: '#2c5a85', belly: '#5b8cb8', mouth: false }), 300, 386, 0.22, 'opacity="0.6"'));
  // plain dark plate for the Hall of Fame close button (221,443,193,27)
  a.add(`<path d="${rr(212, 436, 211, 41, 12)}" fill="${C.sea0}" fill-opacity="0.75" stroke="${C.ink}" stroke-width="2"/>`);
  // title banner
  const [bd, bu] = linear([[0, C.sea2], [1, C.sea0]]);
  a.defs += bd;
  a.add(`<path d="M150,16 H490 L512,46 L490,76 H150 L128,46Z" fill="${C.ink}" opacity="0.35" transform="translate(3,4)"/>`);
  a.add(`<path d="M150,16 H490 L512,46 L490,76 H150 L128,46Z" fill="${bu}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`);
  a.add(`<path d="M154,21 H487 L506,46 L487,71 H154 L135,46Z" fill="none" stroke="${C.uiGold}" stroke-width="2" stroke-linejoin="round"/>`);
  const [gd, gu] = linear([[0, '#fff3a8'], [0.5, C.uiGold], [1, '#f08a24']]);
  a.defs += gd;
  a.add(text('HALL OF FAME', { x: 323, y: 63, size: 40, anchor: 'middle', fill: C.ink, stroke: C.ink, strokeWidth: 7, letterSpacing: 1 }));
  a.add(text('HALL OF FAME', { x: 320, y: 60, size: 40, anchor: 'middle', fill: gu, stroke: C.ink, strokeWidth: 6, letterSpacing: 1 }));
  a.add(text('HALL OF FAME', { x: 320, y: 60, size: 40, anchor: 'middle', fill: gu, letterSpacing: 1 }));
  for (const x of [78, 562]) {
    a.add(`<circle cx="${x}" cy="46" r="28" fill="#fdf3d6" stroke="${C.ink}" stroke-width="2.5"/><circle cx="${x}" cy="46" r="23" fill="none" stroke="${C.uiGold}" stroke-width="2"/>`);
    a.add(trophy(x, 48, 1.9));
  }
  // tables
  a.add(scoreTable(28, 314, 'ADVENTURE', '#f08a24', [['PLAYER', 49, 'start'], ['SCORE', 264, 'end'], ['DIFF.', 300, 'middle']], 45));
  a.add(`<path d="M272,150 V346" stroke="#e2c78f" stroke-width="1.2"/>`);
  a.add(scoreTable(358, 254, 'ABYSS', '#6a4bc4', [['PLAYER', 389, 'start'], ['DEPTH', 581, 'end']], 384));
  return svg(W, H, safe(a.out), a.defs);
}

void measure;

export default {
  titlescreen,
  barandlogo,
  goldbar,
  title_continue: () => continueBtn(false),
  title_continue_over: () => continueBtn(true),
  gameselector,
  ...buttons,
  high_score_bg,
};
