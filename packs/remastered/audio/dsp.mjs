// Tiny offline DSP kit for the remastered sound effects (sfx.mjs). Everything renders into
// Float32Arrays at 44.1 kHz, mono, nominally in -1..1. Deterministic: all randomness comes from
// seeded generators, so a rebuild produces identical WAVs.

export const SR = 44100;
const TAU = Math.PI * 2;

/** Seeded PRNG (mulberry32) returning floats in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const samples = (sec) => Math.max(1, Math.round(sec * SR));
export const buf = (sec) => new Float32Array(samples(sec));
export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const val = (v, t) => (typeof v === 'function' ? v(t) : v);

// PolyBLEP residual for band-limited saw/square edges (keeps bright tones from aliasing harshly).
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

function wave(shape, p, dt) {
  switch (shape) {
    case 'sine':
      return Math.sin(TAU * p);
    case 'tri':
      return 4 * Math.abs(p - 0.5) - 1;
    case 'saw':
      return 2 * p - 1 - blep(p, dt);
    case 'square': {
      let v = p < 0.5 ? 1 : -1;
      v += blep(p, dt);
      v -= blep((p + 0.5) % 1, dt);
      return v;
    }
    default:
      throw new Error(`unknown wave ${shape}`);
  }
}

/**
 * Oscillator. `freq` is Hz or a function of time (s). `fm` optionally adds a per-sample
 * frequency offset in Hz (function of time and sample index).
 */
export function osc(dur, freq, shape = 'sine', { phase = 0, fm = null } = {}) {
  const n = samples(dur);
  const out = new Float32Array(n);
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let f = val(freq, t);
    if (fm) f += fm(t, i);
    const dt = Math.min(0.49, Math.abs(f) / SR);
    out[i] = wave(shape, ph, dt);
    ph += f / SR;
    ph -= Math.floor(ph);
  }
  return out;
}

/** Seeded white noise. */
export function noise(dur, seed) {
  const r = rng(seed);
  const n = samples(dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
}

/** Multiply by an envelope function of time (s), in place. */
export function env(x, fn) {
  for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR);
  return x;
}

/** Attack/decay envelope: linear attack then exponential decay with time constant `tau`. */
export const ad = (a, tau) => (t) => (t < a ? t / a : Math.exp(-(t - a) / tau));

/** ADSR envelope; the note is held for `hold` s (including attack+decay), then released. */
export const adsr = (a, d, s, hold, r) => (t) => {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < hold) return s;
  const rt = t - Math.max(hold, a + d);
  return rt < r ? s * (1 - rt / r) : 0;
};

/** Exponential glide from a to b over `dur` seconds (then holds b). */
export const glide = (a, b, dur) => (t) => a * Math.pow(b / a, Math.min(1, t / dur));

export function scale(x, g) {
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

/** Add `src` into `dst` at `at` seconds with gain `g` (clipped to dst length). */
export function mix(dst, src, at = 0, g = 1) {
  const o = Math.round(at * SR);
  const n = Math.min(src.length, dst.length - o);
  for (let i = Math.max(0, -o); i < n; i++) dst[o + i] += src[i] * g;
  return dst;
}

/** Add `src` into a circular buffer (wrapping past the end); used for seamless loops. */
export function mixWrap(dst, src, at = 0, g = 1) {
  const o = Math.round(at * SR);
  const L = dst.length;
  for (let i = 0; i < src.length; i++) dst[(((o + i) % L) + L) % L] += src[i] * g;
  return dst;
}

/**
 * State-variable filter (TPT/Simper form, stable under modulation). `cutoff` is Hz or a
 * function of time. mode: 'lp' | 'bp' | 'hp'. Returns a new array.
 */
export function svf(x, cutoff, q = 0.707, mode = 'lp') {
  const out = new Float32Array(x.length);
  const k = 1 / q;
  let ic1 = 0;
  let ic2 = 0;
  const fixed = typeof cutoff !== 'function';
  let g = 0;
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  const coef = (fc) => {
    g = Math.tan(Math.PI * Math.min(Math.max(fc, 10), SR * 0.45) / SR);
    a1 = 1 / (1 + g * (g + k));
    a2 = g * a1;
    a3 = g * a2;
  };
  if (fixed) coef(cutoff);
  for (let i = 0; i < x.length; i++) {
    if (!fixed && (i & 7) === 0) coef(cutoff(i / SR));
    const v0 = x[i];
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : v0 - k * v1 - v2;
  }
  return out;
}

/** Soft saturation (keeps things round instead of clipping). */
export function soft(x, drive = 1.5) {
  const n = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / n;
  return x;
}

/** Feedback echo; returns a longer array including `tail` seconds. */
export function echo(x, delay, fb = 0.35, wet = 0.4, tail = 0, damp = 3500) {
  const out = new Float32Array(x.length + samples(tail));
  out.set(x);
  const d = samples(delay);
  const line = new Float32Array(out.length);
  let lp = 0;
  const c = 1 - Math.exp((-TAU * damp) / SR);
  for (let i = 0; i < out.length; i++) {
    const back = i >= d ? line[i - d] : 0;
    lp += c * (back - lp);
    line[i] = (i < x.length ? x[i] : 0) + lp * fb;
    out[i] += lp * wet;
  }
  return out;
}

/** Small Schroeder reverb (4 damped combs + 2 allpasses). Returns x length + tail. */
export function reverb(x, wet = 0.25, room = 0.8, tail = 0.6, damp = 0.35) {
  const n = x.length + samples(tail);
  const dry = new Float32Array(n);
  dry.set(x);
  const acc = new Float32Array(n);
  for (const len of [1116, 1188, 1277, 1356]) {
    const L = Math.round((len * SR) / 44100);
    const b = new Float32Array(L);
    let p = 0;
    let f = 0;
    for (let i = 0; i < n; i++) {
      const y = b[p];
      f = y * (1 - damp) + f * damp;
      b[p] = dry[i] + f * room;
      acc[i] += y * 0.25;
      p = (p + 1) % L;
    }
  }
  for (const len of [556, 441]) {
    const b = new Float32Array(len);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const y = b[p];
      const v = acc[i] + y * 0.5;
      b[p] = v;
      acc[i] = y - v * 0.5;
      p = (p + 1) % len;
    }
  }
  for (let i = 0; i < n; i++) dry[i] += acc[i] * wet;
  return dry;
}

/**
 * Underwater bubble: a sine whose pitch rises as it decays (Minnaert-style), `rise` octaves
 * over its life.
 */
export function bubble(freq, dur = 0.06, rise = 0.7) {
  const x = osc(dur, (t) => freq * Math.pow(2, (rise * t) / dur));
  return env(x, (t) => Math.min(1, t / 0.0015) * Math.exp(-t / (dur * 0.3)));
}

/** Scatter `count` bubbles between t0 and t1 (s). `wrap` mixes circularly (loops). */
export function bubbles(dst, r, { t0 = 0, t1, count, fmin = 400, fmax = 1400, amp = 0.3, dmin = 0.03, dmax = 0.08, wrap = false, shape = null }) {
  const end = t1 ?? dst.length / SR;
  for (let i = 0; i < count; i++) {
    let u = r();
    if (shape) u = shape(u);
    const at = t0 + u * (end - t0);
    const f = fmin * Math.pow(fmax / fmin, r());
    const d = dmin + r() * (dmax - dmin);
    const a = amp * (0.5 + 0.5 * r());
    (wrap ? mixWrap : mix)(dst, bubble(f, d, 0.5 + r() * 0.6), at, a);
  }
  return dst;
}

/**
 * Electric zap: a buzzy square whose pitch sweeps f0 -> f1 with random jitter, gated by a
 * crackling amplitude pattern, band-limited so it sizzles instead of screeches.
 */
export function zap(dur, f0, f1, seed, { buzz = 55, jitter = 0.35, bright = 5000 } = {}) {
  const r = rng(seed);
  let walk = 0;
  const sweep = glide(f0, f1, dur * 0.8);
  const x = osc(dur, sweep, 'square', {
    fm: (t) => {
      walk += (r() * 2 - 1) * 0.08;
      walk *= 0.995;
      return sweep(t) * jitter * walk;
    },
  });
  // Mains-hum style AM plus random crackle gating.
  const r2 = rng(seed + 7);
  let gate = 1;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    if ((i & 255) === 0) gate = 0.55 + 0.45 * r2();
    x[i] *= gate * (0.65 + 0.35 * Math.sin(TAU * buzz * t));
  }
  const n = noise(dur, seed + 13);
  const hiss = svf(n, bright, 1.2, 'bp');
  const y = svf(x, (t) => bright * (1 - 0.6 * (t / dur)) + 300, 0.9, 'lp');
  return mix(y, hiss, 0, 0.6);
}

/** Sparse crackle (random clicks, filtered). */
export function crackle(dur, seed, rate = 60, amp = 1) {
  const r = rng(seed);
  const x = buf(dur);
  const n = x.length;
  const count = Math.round(rate * dur);
  for (let i = 0; i < count; i++) {
    const at = Math.floor(r() * n);
    const a = amp * (0.3 + 0.7 * r()) * (r() < 0.5 ? -1 : 1);
    const L = 20 + Math.floor(r() * 80);
    for (let j = 0; j < L && at + j < n; j++) x[at + j] += a * Math.exp(-j / (L * 0.25)) * (j & 1 ? -1 : 1);
  }
  return svf(x, 6000, 0.7, 'lp');
}

/** Short pitched note with a soft attack and exponential decay (chimes, bells, plucks). */
export function pluck(freq, dur, { shape = 'sine', tau = 0.2, a = 0.004, harmonics = null } = {}) {
  const x = osc(dur, freq, shape);
  if (harmonics) {
    for (const [ratio, g, htau] of harmonics) {
      const h = env(osc(dur, freq * ratio, 'sine', { phase: 0.25 }), ad(a, htau ?? tau * 0.5));
      mix(x, h, 0, g);
    }
  }
  return env(x, ad(a, tau));
}

/** Bell: additive inharmonic partials (struck metal). */
export function bell(freq, dur, tau = 0.5) {
  const partials = [
    [1, 1, 1],
    [2.0, 0.45, 0.6],
    [2.76, 0.35, 0.45],
    [5.4, 0.18, 0.25],
    [8.93, 0.08, 0.15],
  ];
  const x = buf(dur);
  for (const [ratio, g, tr] of partials) {
    if (freq * ratio > SR * 0.45) continue;
    mix(x, env(osc(dur, freq * ratio), ad(0.002, tau * tr)), 0, g);
  }
  return x;
}

/** Fade in/out (seconds), in place. */
export function fades(x, fin = 0.002, fout = 0.015) {
  const a = samples(fin);
  const b = samples(fout);
  for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a;
  for (let i = 0; i < b && i < x.length; i++) x[x.length - 1 - i] *= i / b;
  return x;
}

/** One-pole high-pass to remove DC / sub-rumble. */
export function dcBlock(x, fc = 25) {
  const out = new Float32Array(x.length);
  const R = Math.exp((-TAU * fc) / SR);
  let px = 0;
  let py = 0;
  for (let i = 0; i < x.length; i++) {
    py = x[i] - px + R * py;
    px = x[i];
    out[i] = py;
  }
  return out;
}

export function peak(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

/** Normalise so the peak sits at `db` dBFS. */
export function normalize(x, db = -3) {
  const p = peak(x);
  if (p > 0) scale(x, Math.pow(10, db / 20) / p);
  return x;
}

/** Standard finishing chain: DC block, fades, peak normalise; trimmed to `dur` if given. */
export function finish(x, { db = -3, dur = 0, fin = 0.002, fout = 0.02 } = {}) {
  let y = dur ? x.subarray(0, Math.min(x.length, samples(dur))) : x;
  y = dcBlock(y);
  fades(y, fin, fout);
  normalize(y, db);
  return y;
}
