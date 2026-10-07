// Remastered sound effects, synthesised from scratch (see dsp.mjs). Palette: bright modern
// arcade tones (sines, soft squares, bells) plus watery textures (bubbles, filtered noise).
// Each entry returns a mono Float32Array at 44.1 kHz; tools/build-pack.mjs writes
// sounds/<name>.wav. Durations follow the originals (docs/GAME_DESIGN.md §10).

import {
  SR,
  ad,
  adsr,
  bell,
  bubble,
  bubbles,
  buf,
  crackle,
  echo,
  env,
  finish,
  glide,
  midiHz,
  mix,
  noise,
  normalize,
  osc,
  pluck,
  reverb,
  rng,
  samples,
  soft,
  svf,
  zap,
} from './dsp.mjs';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- typing / UI

/** Soft key click: a tiny noise tick, a rounded blip and a little bubble. */
function keyClick(freq, seed, dur) {
  const x = buf(dur);
  const tick = svf(env(noise(0.012, seed), ad(0.0005, 0.002)), 3500, 0.8, 'bp');
  mix(x, tick, 0, 0.5);
  const blip = env(osc(0.06, glide(freq * 1.25, freq, 0.02), 'tri'), ad(0.001, 0.012));
  mix(x, svf(blip, 4000), 0, 0.7);
  mix(x, bubble(freq * 0.55, 0.05, 0.8), 0.018, 0.35);
  return finish(svf(x, 6000), { db: -9, fout: 0.03 });
}

function buttonclick() {
  const x = buf(0.3);
  mix(x, svf(env(noise(0.01, 51), ad(0.0003, 0.0015)), 5000, 1, 'bp'), 0, 0.6);
  mix(x, env(osc(0.08, glide(1300, 800, 0.04)), ad(0.001, 0.02)), 0.002, 0.9);
  mix(x, env(osc(0.1, 1600, 'tri'), ad(0.001, 0.025)), 0.03, 0.35);
  mix(x, bubble(700, 0.06, 0.9), 0.05, 0.3);
  return finish(x, { db: -4 });
}

/** Error buzz: two detuned saws, low-passed, in a quick "eh-ehh" double pulse. */
function wrong() {
  const dur = 0.36;
  const a = osc(dur, glide(150, 130, dur), 'saw');
  mix(a, osc(dur, glide(158, 136, dur), 'square'), 0, 0.6);
  env(a, (t) => {
    const p1 = t < 0.11 ? Math.min(1, t / 0.005) * (1 - t / 0.13) : 0;
    const p2 = t >= 0.13 ? Math.min(1, (t - 0.13) / 0.005) * Math.exp(-(t - 0.13) / 0.09) : 0;
    return p1 + p2;
  });
  return finish(svf(soft(a, 1.3), 1600, 1.2), { db: -4 });
}

/** Dull "nope": two short descending low tones with a padded thump. */
function bad() {
  const x = buf(0.22);
  const t1 = env(osc(0.08, glide(330, 290, 0.08), 'tri'), adsr(0.003, 0.03, 0.6, 0.06, 0.015));
  const t2 = env(osc(0.13, glide(220, 180, 0.13), 'tri'), ad(0.003, 0.06));
  mix(x, t1, 0, 0.8);
  mix(x, t2, 0.075, 1);
  mix(x, env(osc(0.1, glide(140, 60, 0.08)), ad(0.002, 0.03)), 0, 0.6);
  return finish(svf(x, 1200), { db: -4 });
}

// ---------------------------------------------------------------- chimes and rewards

/** Treasure-dive chime: fundamental + soft octave/twelfth, a glassy attack and a short echo. */
function chime(midi) {
  const f = midiHz(midi);
  const x = pluck(f, 0.82, {
    tau: 0.22,
    a: 0.003,
    harmonics: [
      [2, 0.25, 0.12],
      [3, 0.1, 0.06],
      [4.2, 0.05, 0.03],
    ],
  });
  const y = echo(x, 0.11, 0.25, 0.25, 0, 3000);
  return finish(y, { db: -3, dur: 0.82, fout: 0.08 });
}

/** Quick arpeggio of bell-ish notes. */
function arpeggio(notes, step, { tau = 0.18, shape = 'sine', gain = 1 } = {}) {
  const dur = notes.length * step + tau * 4;
  const x = buf(dur);
  notes.forEach((m, i) => {
    const f = midiHz(m);
    const p = pluck(f, tau * 4, { shape, tau, harmonics: [[2, 0.3, tau * 0.4], [3, 0.12, tau * 0.25]] });
    mix(x, p, i * step, gain);
  });
  return x;
}

/** High glittery sparkles (random short high sines). */
function sparkles(dst, seed, t0, t1, count, amp = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const at = t0 + r() * (t1 - t0);
    const f = 3000 + r() * 4000;
    mix(dst, env(osc(0.06, f), ad(0.001, 0.012)), at, amp * (0.5 + 0.5 * r()));
  }
  return dst;
}

function treasure() {
  const x = buf(0.5);
  mix(x, arpeggio([76, 80, 83, 88], 0.045, { tau: 0.08 }), 0, 0.8);
  sparkles(x, 11, 0.02, 0.35, 14, 0.18);
  mix(x, svf(env(noise(0.4, 12), ad(0.01, 0.1)), 8000, 0.8, 'hp'), 0, 0.08);
  return finish(svf(x, 11000), { db: -3, dur: 0.5, fout: 0.06 });
}

function wingem() {
  const dur = 0.62;
  const x = buf(dur);
  // Bright major stab (C major) with soft square tone.
  for (const m of [72, 76, 79, 84]) {
    const s = env(osc(dur, midiHz(m), 'square'), adsr(0.004, 0.08, 0.35, 0.25, 0.3));
    mix(x, svf(s, glide(5000, 1500, 0.4), 0.8), 0, 0.18);
  }
  mix(x, arpeggio([84, 88, 91, 96], 0.04, { tau: 0.09 }), 0.03, 0.55);
  sparkles(x, 21, 0.05, 0.5, 18, 0.16);
  return finish(reverb(x, 0.18, 0.7, 0), { db: -3, dur, fout: 0.08 });
}

/** Wave medal stings: bronze (2 notes) < silver (3 notes, brighter) < gold (4 + shimmer). */
function medal(notes, step, seed, extra) {
  const dur = notes.length * step + 0.3;
  const x = buf(dur);
  notes.forEach((m, i) => {
    const f = midiHz(m);
    const last = i === notes.length - 1;
    const p = pluck(f, last ? 0.35 : 0.2, {
      shape: 'tri',
      tau: last ? 0.12 : 0.06,
      harmonics: [[2, 0.35, 0.06], [3, 0.15, 0.03]],
    });
    mix(x, p, i * step, last ? 1 : 0.8);
  });
  if (extra) extra(x);
  return finish(reverb(x, 0.15, 0.6, 0), { db: -3, dur, fout: 0.06 });
}

const wave_bonus = () => medal([79, 84], 0.08, 31);
const wave_bonus2 = () => medal([76, 79, 84], 0.065, 32, (x) => sparkles(x, 33, 0.15, 0.35, 6, 0.12));
const wave_bonus3 = () =>
  medal([72, 76, 79, 84, 88], 0.05, 34, (x) => {
    sparkles(x, 35, 0.1, 0.5, 16, 0.18);
    for (const m of [84, 88, 91]) mix(x, env(osc(0.4, midiHz(m), 'tri'), ad(0.02, 0.12)), 0.22, 0.12);
  });

/** 1-up jingle: fast rising square arpeggio with a little trill. */
function extralife() {
  const notes = [79, 83, 86, 91, 88, 91];
  const step = 0.05;
  const dur = 0.46;
  const x = buf(dur);
  notes.forEach((m, i) => {
    const last = i === notes.length - 1;
    const len = last ? 0.18 : step + 0.01;
    const s = env(osc(len, midiHz(m), 'square'), adsr(0.002, 0.02, 0.6, len - 0.02, 0.02));
    mix(x, svf(s, 4500, 0.8), i * step, 0.5);
    mix(x, env(osc(len, midiHz(m + 12)), ad(0.002, 0.03)), i * step, 0.15);
  });
  return finish(x, { db: -3, dur, fout: 0.05 });
}

function divebell1() {
  const dur = 0.95;
  const x = bell(midiHz(81), dur, 0.55);
  mix(x, bell(midiHz(69), dur, 0.35), 0, 0.25);
  mix(x, svf(env(noise(0.02, 61), ad(0.0005, 0.004)), 4000, 1, 'bp'), 0, 0.3);
  return finish(reverb(x, 0.2, 0.7, 0), { db: -3, dur, fout: 0.1 });
}

function sonarping1() {
  const dur = 1.6;
  const ping = env(osc(0.5, glide(1250, 1180, 0.4)), (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.09));
  mix(ping, env(osc(0.5, 2500), ad(0.002, 0.03)), 0, 0.15);
  const x = buf(dur);
  mix(x, ping, 0, 1);
  const wet = echo(x, 0.33, 0.45, 0.6, 0, 1800);
  return finish(reverb(wet, 0.3, 0.82, 0), { db: -3, dur, fout: 0.15 });
}

// ---------------------------------------------------------------- map

function shipmove() {
  const dur = 0.75;
  const x = buf(dur);
  // Wooden creak: a jittery low pulse train through a resonant band-pass.
  const r = rng(71);
  const creak = osc(0.32, (t) => 55 + 40 * Math.sin(TAU * 3 * t) + r() * 25, 'saw');
  env(creak, (t) => Math.sin(Math.PI * Math.min(1, t / 0.32)) ** 1.5);
  mix(x, svf(creak, glide(700, 1100, 0.3), 4, 'bp'), 0, 0.9);
  // Paddle splash + bloop.
  const splash = env(noise(0.25, 72), ad(0.01, 0.06));
  mix(x, svf(splash, glide(2500, 600, 0.2), 0.8, 'bp'), 0.33, 0.7);
  mix(x, bubble(380, 0.1, 1.2), 0.36, 0.8);
  bubbles(x, rng(73), { t0: 0.38, t1: 0.6, count: 4, fmin: 500, fmax: 1100, amp: 0.25 });
  return finish(x, { db: -4, dur, fout: 0.06 });
}

// ---------------------------------------------------------------- creatures

function sharkdies() {
  const dur = 1.62;
  const x = buf(dur);
  const z = zap(0.55, 900, 70, 81, { buzz: 60, bright: 5000 });
  env(z, (t) => Math.min(1, t / 0.004) * (t < 0.15 ? 1 : Math.exp(-(t - 0.15) / 0.18)));
  mix(x, z, 0, 1);
  // Sizzle: band-passed hiss and crackles fading out.
  const s = svf(noise(dur, 82), (t) => 5200 - 2000 * (t / dur), 1.5, 'bp');
  env(s, (t) => Math.min(1, t / 0.05) * Math.exp(-t / 0.45));
  mix(x, s, 0.05, 0.45);
  const c = env(crackle(dur, 83, 70), (t) => Math.exp(-t / 0.5));
  mix(x, c, 0.05, 0.6);
  // Fizz of bubbles as it floats off.
  bubbles(x, rng(84), { t0: 0.4, t1: 1.3, count: 10, fmin: 600, fmax: 1600, amp: 0.15 });
  return finish(svf(x, 9000), { db: -3, dur, fout: 0.15 });
}

function sharkhurt() {
  const dur = 0.66;
  const x = buf(dur);
  const z = zap(0.3, 1300, 220, 91, { buzz: 75, bright: 5500 });
  env(z, (t) => Math.min(1, t / 0.003) * Math.exp(-t / 0.1));
  mix(x, z, 0, 1);
  const s = svf(noise(0.5, 92), 4800, 1.5, 'bp');
  env(s, ad(0.01, 0.12));
  mix(x, s, 0.03, 0.35);
  mix(x, env(crackle(0.4, 93, 50), (t) => Math.exp(-t / 0.15)), 0.02, 0.5);
  return finish(svf(x, 9000), { db: -3, dur, fout: 0.1 });
}

function piranhadies1() {
  const dur = 0.72;
  const x = buf(dur);
  const z = zap(0.14, 1600, 400, 101, { buzz: 90, bright: 6000 });
  env(z, (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.05));
  mix(x, z, 0, 0.8);
  // Pop: a quick downward sine thump.
  mix(x, env(osc(0.12, glide(900, 160, 0.06)), ad(0.001, 0.035)), 0.04, 1);
  bubbles(x, rng(102), { t0: 0.08, t1: 0.5, count: 7, fmin: 700, fmax: 1800, amp: 0.3 });
  return finish(svf(x, 9000), { db: -3, dur, fout: 0.1 });
}

/** Jellyfish: a rubbery "boing" (pitch overshoot + decaying wobble) with a bubble pop. */
function jellyfish() {
  const dur = 0.6;
  const x = buf(dur);
  const f = (t) => 260 * (1 + 0.9 * Math.exp(-t / 0.03)) * (1 + 0.18 * Math.exp(-t / 0.15) * Math.sin(TAU * 16 * t));
  const b = env(osc(dur, f, 'tri'), ad(0.003, 0.14));
  mix(x, svf(b, 2500), 0, 0.9);
  mix(x, env(osc(dur, (t) => f(t) * 2), ad(0.003, 0.08)), 0, 0.25);
  mix(x, bubble(500, 0.07, 1.3), 0, 0.6);
  bubbles(x, rng(111), { t0: 0.05, t1: 0.4, count: 6, fmin: 800, fmax: 2000, amp: 0.3 });
  return finish(x, { db: -3, dur, fout: 0.08 });
}

/** Shark Zapper: rising charge whine into a big sweeping discharge with crackle and reverb. */
function emp() {
  const dur = 2.0;
  const x = buf(dur);
  const charge = env(osc(0.32, glide(220, 1800, 0.3), 'saw'), (t) => (t / 0.32) ** 2);
  mix(x, svf(charge, 3000, 2), 0, 0.35);
  // Discharge: detuned buzzy saws through a resonant low-pass sweeping down.
  const T = 1.65;
  const d = buf(T);
  for (const [f0, det] of [[180, 1], [180, 1.013], [90, 1]]) {
    mix(d, osc(T, (t) => f0 * det * (1 + 0.5 * Math.exp(-t / 0.2)), 'saw'), 0, 0.4);
  }
  mix(d, noise(T, 121), 0, 0.5);
  const sw = svf(d, (t) => 200 + 7000 * Math.exp(-t / 0.35), 3, 'lp');
  env(sw, (t) => Math.min(1, t / 0.01) * Math.exp(-t / 0.55) * (0.75 + 0.25 * Math.sin(TAU * 50 * t)));
  mix(x, soft(sw, 1.4), 0.3, 1);
  const z = zap(0.7, 2000, 120, 122, { buzz: 45, bright: 6000 });
  env(z, ad(0.003, 0.2));
  mix(x, z, 0.3, 0.5);
  mix(x, env(crackle(1.4, 123, 90), (t) => Math.exp(-t / 0.5)), 0.32, 0.6);
  mix(x, env(osc(0.5, glide(120, 40, 0.4)), ad(0.002, 0.15)), 0.3, 0.7);
  return finish(svf(reverb(x, 0.22, 0.8, 0), 9000), { db: -3, dur, fout: 0.2 });
}

/** Underwater boom: deep sine thump, muffled noise blast and rising bubbles. */
function explosion() {
  const dur = 1.36;
  const x = buf(dur);
  mix(x, env(osc(0.9, glide(110, 32, 0.5)), ad(0.003, 0.3)), 0, 1);
  const n = env(noise(1.2, 131), ad(0.004, 0.28));
  mix(x, svf(n, glide(2400, 160, 0.6), 0.9), 0, 1.3);
  mix(x, soft(svf(env(noise(0.15, 132), ad(0.001, 0.03)), 1500, 0.7), 2), 0, 0.4);
  bubbles(x, rng(133), { t0: 0.15, t1: 1.1, count: 22, fmin: 250, fmax: 1200, amp: 0.2, dmin: 0.04, dmax: 0.1 });
  return finish(svf(reverb(soft(x, 1.2), 0.15, 0.75, 0), 8000), { db: -3, dur, fout: 0.15 });
}

/** Torpedo: launch thunk, swelling filtered whoosh, a stream of bubbles. */
function torpedolaunch() {
  const dur = 2.2;
  const x = buf(dur);
  mix(x, env(osc(0.3, glide(160, 55, 0.15)), ad(0.002, 0.07)), 0, 0.9);
  const w = noise(dur, 141);
  const whoosh = svf(w, (t) => 300 + 2200 * Math.sin(Math.PI * Math.min(1, t / 1.8)), 2.2, 'bp');
  env(whoosh, (t) => Math.min(1, t / 0.15) * Math.exp(-t / 0.9) * (t < 2 ? 1 : 0.5));
  mix(x, whoosh, 0.02, 0.9);
  // Prop hum.
  mix(x, env(svf(osc(dur, glide(70, 110, 1.5), 'saw'), 500), (t) => Math.min(1, t / 0.2) * Math.exp(-t / 0.7)), 0, 0.25);
  bubbles(x, rng(142), { t0: 0.05, t1: 1.9, count: 40, fmin: 400, fmax: 2000, amp: 0.18, shape: (u) => u * u });
  return finish(x, { db: -3, dur, fout: 0.2 });
}

/** Diver eaten: two crunchy jaw chomps, then a sad wobbling slide down and bubbles. */
function playerdies() {
  const dur = 2.52;
  const x = buf(dur);
  for (const [at, seed] of [[0, 151], [0.17, 152]]) {
    const c = buf(0.16);
    mix(c, env(osc(0.16, glide(180, 60, 0.08)), ad(0.001, 0.04)), 0, 1);
    mix(c, svf(env(noise(0.08, seed), ad(0.001, 0.015)), 1800, 0.9, 'bp'), 0, 0.9);
    mix(x, soft(c, 1.5), at, 1);
  }
  // Sad "wah-wah-waaah": three falling notes then a long vibrato slide.
  const steps = [[0.42, 67, 0.22], [0.66, 66, 0.22], [0.9, 65, 0.22]];
  for (const [at, m, len] of steps) {
    const s = env(osc(len, midiHz(m), 'square'), adsr(0.02, 0.05, 0.7, len - 0.06, 0.05));
    mix(x, svf(s, 1300, 1.5), at, 0.4);
  }
  const fall = osc(1.4, (t) => midiHz(64) * Math.pow(2, -t * 0.55) * (1 + 0.025 * Math.sin(TAU * 6 * t)), 'square');
  env(fall, adsr(0.03, 0.1, 0.8, 1.0, 0.35));
  mix(x, svf(fall, (t) => 1300 - 600 * t, 1.5), 1.14, 0.42);
  bubbles(x, rng(153), { t0: 0.3, t1: 2.3, count: 14, fmin: 300, fmax: 1000, amp: 0.15 });
  return finish(x, { db: -3, dur, fout: 0.2 });
}

/** Diver splashes in: noisy splash with a body thump, then a cascade of bubbles. */
function diverenters() {
  const dur = 2.44;
  const x = buf(dur);
  const s = noise(0.8, 161);
  const splash = svf(s, glide(5000, 900, 0.5), 0.7, 'bp');
  env(splash, (t) => Math.min(1, t / 0.008) * Math.exp(-t / 0.16));
  mix(x, splash, 0, 1.1);
  mix(x, svf(env(noise(0.6, 162), ad(0.005, 0.2)), 500), 0, 0.8);
  mix(x, env(osc(0.3, glide(120, 50, 0.2)), ad(0.003, 0.08)), 0, 0.6);
  // Droplets falling back.
  const r = rng(163);
  for (let i = 0; i < 6; i++) mix(x, bubble(1200 + r() * 1500, 0.03, 1.2), 0.12 + r() * 0.3, 0.3);
  bubbles(x, rng(164), { t0: 0.15, t1: 2.2, count: 45, fmin: 300, fmax: 1500, amp: 0.25, shape: (u) => Math.pow(u, 1.8) });
  return finish(x, { db: -3, dur, fout: 0.2 });
}

// ---------------------------------------------------------------- ghosts

/** Spooky whoosh: resonant noise sweep plus a breathy theremin-like wail. */
function eerie(dur, seed, wail) {
  const x = buf(dur);
  const n = noise(dur, seed);
  const sweep = svf(n, (t) => 500 + 1800 * Math.sin(Math.PI * Math.min(1, t / dur)), 6, 'bp');
  env(sweep, (t) => Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.2);
  mix(x, sweep, 0, 0.8);
  if (wail) {
    const f = (t) => midiHz(76) * Math.pow(2, (Math.sin(TAU * 0.35 * t) * 3) / 12) * (1 + 0.012 * Math.sin(TAU * 5.5 * t));
    const v = env(osc(dur, f), (t) => Math.sin(Math.PI * Math.min(1, t / dur)) ** 2);
    mix(v, env(osc(dur, (t) => f(t) * 1.5), (t) => 0.3 * Math.sin(Math.PI * Math.min(1, t / dur)) ** 3), 0, 1);
    mix(x, v, 0, 0.35);
  }
  return finish(reverb(x, 0.35, 0.85, 0), { db: -4, dur, fout: 0.05 });
}

const eerie1 = () => eerie(0.55, 171, false);
const eerie3 = () => eerie(2.0, 172, true);

// ---------------------------------------------------------------- ambience

/**
 * Seamless ~3.5 s underwater bed: periodic filtered noise (every LFO completes a whole number
 * of cycles per loop) with bubbles mixed circularly, so the end flows into the start.
 */
function underwaterloop() {
  const dur = 3.5;
  const N = samples(dur);
  const L = N / SR;
  const n = noise(dur, 181);
  // Run the filter over two periods and keep the second, so its state is periodic.
  const twice = new Float32Array(N * 2);
  twice.set(n);
  twice.set(n, N);
  const cutoff = (t) => 380 + 160 * Math.sin((TAU * 2 * t) / L) + 90 * Math.sin((TAU * 3 * t) / L + 1);
  const rumble = svf(twice, cutoff, 0.9, 'lp').subarray(N);
  const swell = svf(twice, (t) => 900 + 300 * Math.sin((TAU * t) / L), 3, 'bp').subarray(N);
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    x[i] = rumble[i] * 1.2 * (0.8 + 0.2 * Math.sin((TAU * 2 * t) / L)) + swell[i] * 0.25 * (0.6 + 0.4 * Math.sin((TAU * t) / L + 2));
  }
  bubbles(x, rng(182), { count: 26, fmin: 350, fmax: 1300, amp: 0.12, dmin: 0.04, dmax: 0.09, wrap: true });
  // Periodic DC removal: subtract the mean (a high-pass would break the loop seam).
  let m = 0;
  for (let i = 0; i < N; i++) m += x[i];
  m /= N;
  for (let i = 0; i < N; i++) x[i] -= m;
  return normalize(x, -6);
}

// ---------------------------------------------------------------- table

const tones = {};
for (let i = 1; i <= 13; i++) tones[`tone${i}`] = () => chime(71 + i); // C5 .. C6

export default {
  eerie1,
  eerie3,
  playerdies,
  sharkdies,
  wrong,
  buttonclick,
  divebell1,
  wingem,
  wave_bonus,
  wave_bonus2,
  wave_bonus3,
  treasure,
  shipmove,
  emp,
  extralife,
  ...tones,
  sonarping1,
  torpedolaunch,
  jellyfish,
  explosion,
  type: () => keyClick(1500, 1, 0.18),
  type2: () => keyClick(1700, 2, 0.18),
  type3: () => keyClick(1350, 3, 0.18),
  sharkhurt,
  diverenters,
  piranhadies1,
  underwaterloop,
  bad,
};
