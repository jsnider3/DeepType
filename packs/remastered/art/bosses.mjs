// Bosses & projectiles: pirate submarine, mecha-shark, robo-squid and ghost galleon (all
// facing left), their animated parts, the torpedo / cannonball projectiles and effects, the
// HUD boss meter and the abyss trophy card. Drawing lives in bosses-lib.mjs.

import { C, STROKE, svg, strip, ink, shade, linear, radial, rng, text, FONTS, fmt, id } from './lib.mjs';
import { P, blur, skull, sub, subRotor, mecha, mechaFin, squid, squidFin, squidEye, galleon, rudder, torpedo, torpedoRotor, cannonball } from './bosses-lib.mjs';

/** Single image from a { out, defs } drawing. */
const one = (w, h, draw) => () => {
  const r = draw();
  return svg(w, h, r.out, r.defs);
};

/** Strip of n frames from per-frame { out, defs } drawings. */
const frames = (n, fw, fh, draw, vertical = false) => () => {
  let defs = '';
  const body = strip(n, fw, fh, (i, t) => {
    const r = draw(i, t);
    defs += r.defs;
    return r.out;
  }, { vertical });
  return svg(vertical ? fw : fw * n, vertical ? fh * n : fh, body, defs);
};

// ---------------------------------------------------------------- effects

/** Torpedo flipping from nose-left to nose-right (6 frames, 126x39). */
function reverseFrame(i) {
  const s = Math.cos((Math.PI * i) / 5);
  const k = Math.sign(s) * Math.max(0.16, Math.abs(s));
  const r = torpedo();
  const lift = Math.sin((Math.PI * i) / 5) * 2;
  let out = `<g transform="translate(63 ${fmt(19.5 - lift)}) scale(${fmt(k)} 1) translate(-63 -19.5)">${r.out}</g>`;
  if (i > 0 && i < 5) {
    const a = Math.sin((Math.PI * i) / 5);
    out += `<g fill="none" stroke="#e6f7ff" stroke-width="2" stroke-linecap="round" opacity="${fmt(0.8 * a)}">` +
      `<path d="M${fmt(63 - 40 * a)},6 Q63,${fmt(-2)} ${fmt(63 + 40 * a)},6"/><path d="M${fmt(63 - 40 * a)},33 Q63,41 ${fmt(63 + 40 * a)},33"/></g>`;
  }
  return { out, defs: r.defs };
}

/** Launch burst trailing the torpedo tail (frame-local tail at ~(40, 50)), 8 x 200x100. */
function launchFrame(i) {
  const k = i / 7;
  const R = rng(17);
  const [bd, bu] = blur(2 + k * 3);
  let out = '';
  let defs = bd;
  const fade = 1 - k * 0.85;
  // Foamy cloud that billows out behind the tail and drifts right.
  out += `<g filter="${bu}" opacity="${fmt(0.9 * fade)}">`;
  for (let j = 0; j < 9; j++) {
    const ox = 40 + R() * 70 + k * 60;
    const oy = 50 + (R() - 0.5) * 30 * (0.6 + k);
    const rr = (10 + R() * 12) * (0.6 + k * 0.9);
    out += `<circle cx="${fmt(ox)}" cy="${fmt(oy)}" r="${fmt(rr)}" fill="${j % 3 ? '#ffffff' : C.foam}"/>`;
  }
  out += '</g>';
  // Bright muzzle flash at the start.
  if (i < 3) {
    const fr = 20 - i * 5;
    const [fd, fu] = radial([[0, '#ffffff'], [0.5, '#fff6c2'], [1, '#ffd23f', 0]]);
    defs += fd;
    out += `<ellipse cx="${46 + i * 6}" cy="50" rx="${fr * 1.3}" ry="${fr}" fill="${fu}" opacity="${1 - i * 0.3}"/>`;
  }
  // Bubbles.
  const B = rng(29);
  for (let j = 0; j < 16; j++) {
    const bx = 44 + B() * 120 * (0.3 + k) + k * 20;
    const by = 50 + (B() - 0.5) * 70 * (0.3 + k) - k * 12 * B();
    const br = 1.5 + B() * 4;
    if (bx + br > 199 || by - br < 0 || by + br > 100) continue;
    out += `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(br)}" fill="#ffffff" fill-opacity="0.25" stroke="#e6f7ff" stroke-width="1" opacity="${fmt(Math.min(1, fade + 0.2))}"/>`;
  }
  return { out, defs };
}

/** Cartoon explosion with bubbles, 8 x 150x150, centred. */
function explodeFrame(i) {
  const cx = 75, cy = 75;
  const [bd, bu] = blur(4);
  let defs = bd;
  let out = '';
  const burst = (r, n, jag, seed) => {
    const R = rng(seed);
    const pts = [];
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2;
      const rr = k % 2 ? r * (1 - jag * (0.6 + R() * 0.4)) : r * (0.9 + R() * 0.15);
      pts.push(`${fmt(cx + Math.cos(a) * rr)},${fmt(cy + Math.sin(a) * rr)}`);
    }
    return 'M' + pts.join(' L') + 'Z';
  };
  const fire = [[18, 0], [40, 1], [54, 2], [60, 3], [62, 4]];
  if (i <= 4) {
    const [r] = fire[i];
    if (i <= 1) out += `<circle cx="${cx}" cy="${cy}" r="${r * 1.2}" fill="#fff6c2" opacity="0.8" filter="${bu}"/>`;
    const cols = i < 2 ? ['#ffd23f', '#fff6c2'] : i < 3 ? ['#ff8a3c', '#ffd23f'] : ['#8a8f9c', '#ff8a3c'];
    out += `<path d="${burst(r, 11, 0.32, 3 + i)}" ${ink(cols[0], STROKE)}/>`;
    out += `<path d="${burst(r * 0.6, 9, 0.28, 9 + i)}" fill="${cols[1]}"/>`;
    if (i >= 2) {
      // Smoke puffs creeping in from the rim.
      const R = rng(40 + i);
      for (let k = 0; k < 7; k++) {
        const a = R() * Math.PI * 2, d = r * (0.5 + R() * 0.4);
        out += `<circle cx="${fmt(cx + Math.cos(a) * d)}" cy="${fmt(cy + Math.sin(a) * d)}" r="${fmt(8 + R() * 8 + (i - 2) * 4)}" fill="${i > 3 ? '#9aa3b2' : '#6c7480'}" stroke="${C.ink}" stroke-width="1.4" opacity="${i > 3 ? 0.9 : 0.85}"/>`;
      }
    }
  }
  if (i >= 4) {
    // Dissolving smoke rising, fading.
    const R = rng(60 + i);
    const k = (i - 4) / 3;
    for (let j = 0; j < 9; j++) {
      const a = R() * Math.PI * 2, d = 20 + R() * 30 + k * 12;
      out += `<circle cx="${fmt(cx + Math.cos(a) * d)}" cy="${fmt(cy + Math.sin(a) * d - k * 10)}" r="${fmt((10 + R() * 9) * (1 - k * 0.55))}" fill="#c3cad6" opacity="${fmt(0.8 - k * 0.6)}"/>`;
    }
  }
  // Bubbles flying outward and up.
  const B = rng(77);
  for (let j = 0; j < 22; j++) {
    const a = B() * Math.PI * 2;
    const sp = 0.5 + B() * 0.5;
    const d = 10 + (i / 7) * 62 * sp;
    const bx = cx + Math.cos(a) * d;
    const by = cy + Math.sin(a) * d - (i / 7) * 14;
    const br = 1.5 + B() * 4;
    if (i < 3 || bx - br < 0 || bx + br > 150 || by - br < 0 || by + br > 150) continue;
    out += `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(br)}" fill="#ffffff" fill-opacity="0.3" stroke="#e6f7ff" stroke-width="1.1" opacity="${fmt(1 - Math.max(0, i - 5) * 0.3)}"/>`;
  }
  return { out, defs };
}

/** Cannonball turning around: trail swings from the right to the left. */
function cannonTurn(i) {
  const cfg = [
    { trail: 1, trailLen: 0.7 },
    { trail: 1, trailLen: 0.3, burst: 1 },
    { trail: 0, burst: 2 },
    { trail: -1, trailLen: 0.3, burst: 1 },
    { trail: -1, trailLen: 0.7 },
  ][i];
  return cannonball(i / 5, cfg);
}

// ---------------------------------------------------------------- HUD meter

function meter() {
  const [g, u] = linear([[0, '#3d4c68'], [1, '#1a2438']]);
  const [g2, u2] = linear([[0, '#05080f'], [1, '#1b2335']]);
  let out = `<rect x="1" y="2" width="378" height="36" rx="12" ${ink(u)}/>`;
  out += `<rect x="5" y="5" width="370" height="6" rx="3" fill="#fff" opacity="0.12"/>`;
  // Trough exactly under the fill (36,10)-(330,30), with a lip around it.
  out += `<rect x="33" y="7" width="300" height="26" rx="5" fill="${C.steel1}" stroke="${C.ink}" stroke-width="1.5"/>`;
  out += `<rect x="36" y="10" width="294" height="20" fill="${u2}"/>`;
  out += `<rect x="36" y="10" width="294" height="3" fill="#000" opacity="0.4"/>`;
  // Skull badge.
  out += `<circle cx="18" cy="20" r="14" ${ink(C.uiRed, 1.8)}/><circle cx="18" cy="20" r="11" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="1.5"/>`;
  out += skull(18, 19.5, 6.2, '#fffaf0');
  // BOSS label.
  out += text('BOSS', { x: 356, y: 28, size: 17, file: FONTS.display, anchor: 'middle', fill: C.uiRed, stroke: C.ink, strokeWidth: 3 });
  return { out, defs: g + g2 };
}

function meterFill() {
  // Vertical-only gradient: the game squashes this horizontally to show health.
  const [g, u] = linear([[0, '#ff9a8a'], [0.3, '#f0473a'], [0.75, '#c2241b'], [1, '#7d120d']]);
  const out = `<rect x="0" y="0" width="294" height="20" fill="${u}"/><rect x="0" y="2" width="294" height="5" fill="#fff" opacity="0.45"/><rect x="0" y="18" width="294" height="2" fill="#4a0805" opacity="0.6"/>`;
  return { out, defs: g };
}

// ---------------------------------------------------------------- abyss trophy card

/** Bosses composed with their part sprites at the game's offsets. */
const composite = {
  sub: () => {
    const a = sub(), b = subRotor(0.2);
    return { out: a.out + `<g transform="translate(227 54)">${b.out}</g>`, defs: a.defs + b.defs, w: 250, h: 155 };
  },
  mecha: () => {
    const a = mecha(), b = mechaFin(0.25);
    return { out: a.out + `<g transform="translate(184 60)">${b.out}</g>`, defs: a.defs + b.defs, w: 223, h: 217 };
  },
  squid: () => {
    const a = squid(), b = squidFin(0.1), e = squidEye(0);
    return { out: a.out + `<g transform="translate(217 60)">${b.out}</g><g transform="translate(133 80)">${e.out}</g>`, defs: a.defs + b.defs + e.defs, w: 284, h: 147 };
  },
  galleon: () => {
    const a = galleon(), b = rudder(2);
    return { out: `<g transform="translate(121 300)">${b.out}</g>` + a.out, defs: a.defs + b.defs, w: 159, h: 349 };
  },
};

function abyssCard() {
  let out = '';
  let defs = '';
  const cards = [
    { x: 4, y: 4, name: 'PIRATE SUB', boss: 'sub', s: 0.5 },
    { x: 146, y: 4, name: 'GHOST SHIP', boss: 'galleon', s: 0.25 },
    { x: 4, y: 170, name: 'MECHA-SHARK', boss: 'mecha', s: 0.44 },
    { x: 146, y: 170, name: 'ROBO-SQUID', boss: 'squid', s: 0.44 },
  ];
  const [gs, us] = linear([[0, C.sea2], [1, C.sea0]]);
  const [gc, uc] = linear([[0, '#fbf3dc'], [1, '#ecdcb4']]);
  defs += gs + gc;
  for (const c of cards) {
    const W = 138, H = 162;
    out += `<g transform="translate(${c.x} ${c.y})">`;
    out += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="9" ${ink(uc)}/>`;
    // Name plate.
    out += `<rect x="7" y="7" width="${W - 14}" height="20" rx="5" ${ink(C.ui0, 1.5)}/>`;
    out += text(c.name, { x: W / 2, y: 22.5, size: 13, file: FONTS.display, anchor: 'middle', fill: C.uiGold });
    // Picture window.
    const wx = 7, wy = 31, ww = W - 14, wh = 92;
    const cid = id('win');
    defs += `<clipPath id="${cid}"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="6"/></clipPath>`;
    out += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="6" fill="${us}"/>`;
    out += `<g clip-path="url(#${cid})">`;
    const R = rng(c.x + c.y);
    for (let k = 0; k < 6; k++) out += `<circle cx="${fmt(wx + R() * ww)}" cy="${fmt(wy + R() * wh)}" r="${fmt(1 + R() * 2)}" fill="none" stroke="${C.foam}" stroke-opacity="0.6" stroke-width="0.8"/>`;
    out += `<path d="M${wx},${wy + wh - 10} Q${wx + 40},${wy + wh - 18} ${wx + ww},${wy + wh - 8} L${wx + ww},${wy + wh} L${wx},${wy + wh}Z" fill="${C.sand0}" opacity="0.8"/>`;
    const b = composite[c.boss]();
    defs += b.defs;
    const bw = b.w * c.s, bh = b.h * c.s;
    const bx = wx + (ww - bw) / 2, by = wy + (wh - bh) / 2 + (c.boss === 'galleon' ? 0 : 2);
    out += `<g transform="translate(${fmt(bx)} ${fmt(by)}) scale(${c.s})">${b.out}</g>`;
    out += `</g><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="6" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`;
    // Footer: "DEFEATED" label and a clear light slot where the game writes "x3" at (104, baseline 148).
    out += text('DEFEATED', { x: 12, y: 146, size: 10.5, file: FONTS.slab, fill: '#8a6a3a' });
    out += `<rect x="94" y="130" width="36" height="22" rx="6" fill="#fffaf0" stroke="#c8ad78" stroke-width="1.2"/>`;
    out += '</g>';
  }
  return { out, defs };
}

export default {
  // Pirate submarine.
  torpedo_boss_bobbing: one(250, 155, () => sub()),
  torpedo_boss_dying: one(250, 155, () => sub({ dying: true })),
  torpedo_boss_rotor: frames(14, 22, 81, (_i, t) => subRotor(t)),
  // Mecha-shark.
  boss_mecha: one(184, 217, () => mecha()),
  boss_mecha_fin: frames(10, 39, 98, (_i, t) => mechaFin(t)),
  boss_mecha_death: one(230, 216, () => {
    const a = mecha({ dead: true });
    const f = mechaFin(0, { droop: 1.6 });
    const [bd, bu] = blur(3);
    let out = `<g transform="translate(6 -2) rotate(9 92 108)">${a.out}<g transform="translate(184 60)">${f.out}</g></g>`;
    out += `<g filter="${bu}" opacity="0.7"><circle cx="150" cy="40" r="10" fill="#6c7480"/><circle cx="160" cy="26" r="8" fill="#6c7480"/><circle cx="140" cy="20" r="6" fill="#6c7480"/><circle cx="70" cy="62" r="9" fill="#6c7480"/></g>`;
    return { out, defs: a.defs + f.defs + bd };
  }),
  // Robo-squid.
  boss_squid: one(218, 147, () => squid()),
  boss_squid_fin: frames(10, 67, 47, (_i, t) => squidFin(t)),
  boss_squid_eye: frames(5, 12, 12, (i) => squidEye(i)),
  boss_squid_death: one(268, 123, () => {
    const a = squid({ dead: true });
    const f = squidFin(0.6);
    const [bd, bu] = blur(3);
    // Limp and tilted: tail end up, cannons sagging.
    let out = `<g transform="translate(22 -14) scale(0.82) rotate(-10 150 82)">${a.out}<g transform="translate(217 60) rotate(10 0 22)">${f.out}</g></g>`;
    out += `<g filter="${bu}" opacity="0.65"><circle cx="150" cy="30" r="9" fill="#6c7480"/><circle cx="162" cy="18" r="7" fill="#6c7480"/><circle cx="70" cy="40" r="8" fill="#6c7480"/></g>`;
    return { out, defs: a.defs + f.defs + bd };
  }),
  // Ghost galleon.
  boss_galleon: one(159, 349, () => galleon()),
  boss_galleon_death: one(159, 349, () => galleon({ dead: true })),
  galleon_rudder: frames(5, 21, 47, (i) => rudder(i)),
  // Projectiles and effects.
  torpedo_swim: one(126, 39, () => torpedo()),
  rotor_torpedo: frames(14, 11, 41, (_i, t) => torpedoRotor(t)),
  torpedo_launch: frames(8, 200, 100, (i) => launchFrame(i)),
  torpedo_reverse: frames(6, 126, 39, (i) => reverseFrame(i)),
  torpedo_explode: frames(8, 150, 150, (i) => explodeFrame(i)),
  cannonball: frames(12, 74, 44, (_i, t) => cannonball(t), true),
  cannonball_turn: frames(5, 74, 44, (i) => cannonTurn(i), true),
  // HUD and stats.
  boss_meter: one(380, 40, meter),
  boss_meter_fill: one(294, 20, meterFill),
  abyss_boss: one(288, 337, abyssCard),
};

void radial;
void shade;
void P;
