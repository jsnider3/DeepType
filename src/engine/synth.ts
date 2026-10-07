// Built-in synth music for the remastered pack: songs keyed by the original module's order
// positions, so musicOrder(n) means the same cue for either pack:
//   0 dive, 0x11 menus, 0x14 map, 0x1e game over, 0x22 air refill, 0x25 danger,
//   0x2b extreme danger, 0x2e level complete, 0x30 boss.
// The songs themselves are data (packs/remastered/audio/music.mjs -> music/music.json); this
// file is a small Web Audio sequencer that plays them.
//
// How it works: each song is a grid of steps (16ths by default). A look-ahead scheduler
// (setInterval every 25 ms) books every step that starts within the next ~120 ms onto the
// AudioContext clock, creating short-lived oscillator/noise voices with gain envelopes. A
// song plays through its own gain node; switching songs ramps the old one's gain to 0 and
// hard-stops its remaining voices shortly after, so rapid cue changes never pile up voices.
// Loop songs wrap from their last step back to `loopStart` (an intro can play once first);
// one-shots stop scheduling at their end and let the last notes ring out.

// ---------------------------------------------------------------- song format

export type InstrumentName = 'lead' | 'bass' | 'pad' | 'arp' | 'bell' | 'drums';
export const INSTRUMENTS: readonly InstrumentName[] = ['lead', 'bass', 'pad', 'arp', 'bell', 'drums'];

/** [step, pitch (MIDI note; drum id for drums), length in steps, velocity 0..1 (default 1)] */
export type NoteEvent = [number, number, number, number?];

export interface Track {
  inst: InstrumentName;
  /** Track gain multiplier (default 1). */
  vol?: number;
  notes: NoteEvent[];
}

export interface Song {
  title?: string;
  bpm: number;
  /** Grid resolution: steps per beat (4 = 16ths, 3 = triplet 8ths). Default 4. */
  stepsPerBeat?: number;
  /** Total length in steps. */
  steps: number;
  /** Loop songs wrap from `steps` back to `loopStart`; one-shots end at `steps`. */
  loop: boolean;
  loopStart?: number;
  tracks: Track[];
}

export type SongBook = Record<string, Song>;

/** Drum ids (General MIDI numbers) understood by the 'drums' instrument. */
export const DRUM = {
  kick: 36,
  rim: 37,
  snare: 38,
  shaker: 39,
  hat: 42,
  tomLo: 45,
  openHat: 46,
  tomHi: 50,
  crash: 49,
} as const;
const DRUM_IDS = new Set<number>(Object.values(DRUM));

// ---------------------------------------------------------------- pure helpers

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" / "F#5" / "Bb3" -> MIDI note number (C4 = 60). */
export function parseNote(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`bad note name ${name}`);
  const pc = NOTE_PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 12 * (Number(m[3]) + 1) + pc;
}

/** Frequency in Hz of a MIDI note number (A4 = 69 = 440 Hz) or a note name. */
export function noteFreq(note: number | string): number {
  const n = typeof note === 'string' ? parseNote(note) : note;
  return 440 * Math.pow(2, (n - 69) / 12);
}

/** Seconds per step. */
export function stepSeconds(song: Pick<Song, 'bpm' | 'stepsPerBeat'>): number {
  return 60 / song.bpm / (song.stepsPerBeat ?? 4);
}

/**
 * Map a timeline step (steps since the song started) to the song's own step, unwrapping
 * loops; -1 once a one-shot has finished.
 */
export function songStep(song: Pick<Song, 'steps' | 'loop' | 'loopStart'>, t: number): number {
  if (t < 0) return -1;
  if (t < song.steps) return t;
  if (!song.loop) return -1;
  const ls = song.loopStart ?? 0;
  return ls + ((t - ls) % (song.steps - ls));
}

export interface StepNote {
  track: number;
  inst: InstrumentName;
  pitch: number;
  /** Length in steps. */
  len: number;
  /** Final gain multiplier (track vol x velocity). */
  vel: number;
}

export interface CompiledSong {
  song: Song;
  stepDur: number;
  /** Notes starting at each song step. */
  byStep: StepNote[][];
}

/** Index a song's notes by step for fast scheduling. */
export function compileSong(song: Song): CompiledSong {
  const byStep: StepNote[][] = Array.from({ length: song.steps }, () => []);
  song.tracks.forEach((tr, track) => {
    for (const [step, pitch, len, vel = 1] of tr.notes) {
      if (step < 0 || step >= song.steps) continue;
      byStep[step].push({ track, inst: tr.inst, pitch, len, vel: vel * (tr.vol ?? 1) });
    }
  });
  return { song, stepDur: stepSeconds(song), byStep };
}

export interface ScheduledEvent extends StepNote {
  /** Timeline step (monotonic across loops). */
  t: number;
  /** Start time in seconds from the start of playback. */
  time: number;
  /** Duration in seconds. */
  dur: number;
}

/** Notes that start at timeline step t (empty after a one-shot ends). */
export function notesAt(c: CompiledSong, t: number): StepNote[] {
  const s = songStep(c.song, t);
  return s < 0 ? [] : c.byStep[s];
}

/** Every note starting in timeline steps [from, to), with times; follows loops. */
export function eventsInRange(c: CompiledSong, from: number, to: number): ScheduledEvent[] {
  const out: ScheduledEvent[] = [];
  for (let t = Math.max(0, from); t < to; t++) {
    for (const n of notesAt(c, t)) out.push({ ...n, t, time: t * c.stepDur, dur: n.len * c.stepDur });
  }
  return out;
}

/** Length in seconds of one pass through the song (intro + one loop). */
export function songDuration(song: Song): number {
  return song.steps * stepSeconds(song);
}

/** Structural problems with a song (empty = OK). */
export function validateSong(song: Song): string[] {
  const errs: string[] = [];
  if (!(song.bpm >= 40 && song.bpm <= 240)) errs.push(`bpm ${song.bpm} out of range`);
  const spb = song.stepsPerBeat ?? 4;
  if (!Number.isInteger(spb) || spb < 1 || spb > 8) errs.push(`stepsPerBeat ${spb}`);
  if (!Number.isInteger(song.steps) || song.steps <= 0) errs.push(`steps ${song.steps}`);
  const ls = song.loopStart ?? 0;
  if (!Number.isInteger(ls) || ls < 0 || ls >= song.steps) errs.push(`loopStart ${ls}`);
  if (!Array.isArray(song.tracks) || !song.tracks.length) errs.push('no tracks');
  for (const [i, tr] of (song.tracks ?? []).entries()) {
    if (!INSTRUMENTS.includes(tr.inst)) errs.push(`track ${i}: unknown instrument ${tr.inst}`);
    for (const n of tr.notes) {
      const [step, pitch, len, vel = 1] = n;
      if (!Number.isInteger(step) || step < 0 || step >= song.steps) errs.push(`track ${i}: step ${step}`);
      if (tr.inst === 'drums' ? !DRUM_IDS.has(pitch) : !(pitch >= 24 && pitch <= 108)) errs.push(`track ${i}: pitch ${pitch}`);
      if (!(len > 0)) errs.push(`track ${i}: len ${len} at ${step}`);
      if (!(vel > 0 && vel <= 1.5)) errs.push(`track ${i}: vel ${vel} at ${step}`);
    }
  }
  return errs;
}

// ---------------------------------------------------------------- Web Audio engine

export interface SynthMusic {
  /** Switch to the song for this cue, from its start (no-op if the key has no song). */
  play(order: number): void;
  stop(): void;
}

const LOOKAHEAD = 0.12; // s of audio booked ahead
const TICK_MS = 25;
const XFADE = 0.25; // s fade-out of the previous song on a switch
const DRUM_LEVEL = 0.55; // drum kit trim relative to the melodic voices

interface Player {
  c: CompiledSong;
  gain: GainNode;
  send: GainNode;
  start: number;
  next: number;
  finished: boolean;
  sources: Set<AudioScheduledSourceNode>;
}

export function createSynthMusic(ctx: AudioContext, out: AudioNode, songs: SongBook): SynthMusic {
  const master = ctx.createGain();
  master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.2;
  master.connect(comp);
  comp.connect(out);

  // Shared echo bus (lead/arp/bell sends), damped so repeats sound watery rather than sharp.
  const delay = ctx.createDelay(2);
  const fb = ctx.createGain();
  const damp = ctx.createBiquadFilter();
  const wet = ctx.createGain();
  delay.delayTime.value = 0.375;
  fb.gain.value = 0.32;
  damp.type = 'lowpass';
  damp.frequency.value = 2200;
  wet.gain.value = 0.35;
  delay.connect(damp);
  damp.connect(fb);
  fb.connect(delay);
  damp.connect(wet);
  wet.connect(master);

  // One second of deterministic white noise for the drums.
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  {
    const d = noiseBuf.getChannelData(0);
    let s = 0x9e3779b9;
    for (let i = 0; i < d.length; i++) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      d[i] = ((s >>> 0) / 4294967296) * 2 - 1;
    }
  }
  let noiseOfs = 0;

  const compiled = new Map<string, CompiledSong>();
  let current: Player | null = null;
  const retired = new Set<Player>();
  let timer: ReturnType<typeof setInterval> | null = null;

  function track(p: Player, src: AudioScheduledSourceNode, tail: AudioNode) {
    p.sources.add(src);
    src.onended = () => {
      p.sources.delete(src);
      tail.disconnect();
    };
  }

  /** Gain envelope: attack, decay to sustain, release after `dur`. Returns the stop time. */
  function envelope(g: AudioParam, t: number, dur: number, peak: number, a: number, d: number, s: number, r: number) {
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + a);
    g.setTargetAtTime(peak * s, t + a, d / 3);
    const rel = t + Math.max(dur, a);
    g.setTargetAtTime(0, rel, r / 3);
    return rel + r * 1.2;
  }

  function oscVoice(
    p: Player,
    t: number,
    dur: number,
    freq: number,
    vel: number,
    o: {
      waves: [OscillatorType, number][];
      gain: number;
      a: number;
      d: number;
      s: number;
      r: number;
      cutoff: number;
      cutoffEnv?: number;
      q?: number;
      send?: number;
    },
  ) {
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = o.q ?? 0.8;
    if (o.cutoffEnv) {
      filt.frequency.setValueAtTime(o.cutoff + o.cutoffEnv, t);
      filt.frequency.setTargetAtTime(o.cutoff, t, 0.06);
    } else filt.frequency.value = o.cutoff;
    const env = ctx.createGain();
    const end = envelope(env.gain, t, dur, o.gain * vel, o.a, o.d, o.s, o.r);
    filt.connect(env);
    env.connect(p.gain);
    if (o.send) {
      const sg = ctx.createGain();
      sg.gain.value = o.send;
      env.connect(sg);
      sg.connect(p.send);
    }
    let first: OscillatorNode | null = null;
    for (const [type, detune] of o.waves) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filt);
      osc.start(t);
      osc.stop(end);
      if (!first) {
        first = osc;
        track(p, osc, env);
      } else {
        p.sources.add(osc);
        osc.onended = () => p.sources.delete(osc);
      }
    }
  }

  /** Mallet/bell: two-operator FM with a fast-decaying modulation index. */
  function bellVoice(p: Player, t: number, dur: number, freq: number, vel: number) {
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const idx = ctx.createGain();
    const env = ctx.createGain();
    car.frequency.value = freq;
    mod.frequency.value = freq * 4;
    idx.gain.setValueAtTime(freq * 2.2, t);
    idx.gain.setTargetAtTime(freq * 0.15, t, 0.05);
    mod.connect(idx);
    idx.connect(car.frequency);
    const end = envelope(env.gain, t, Math.min(dur, 0.05), 0.2 * vel, 0.002, 0.3, 0.4, Math.max(0.35, dur));
    car.connect(env);
    env.connect(p.gain);
    const sg = ctx.createGain();
    sg.gain.value = 0.5;
    env.connect(sg);
    sg.connect(p.send);
    for (const o of [car, mod]) {
      o.start(t);
      o.stop(end);
    }
    track(p, car, env);
    p.sources.add(mod);
    mod.onended = () => p.sources.delete(mod);
  }

  function noiseHit(p: Player, t: number, type: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.002, decay / 3);
    src.connect(f);
    f.connect(g);
    g.connect(p.gain);
    noiseOfs = (noiseOfs + 0.137) % 0.5;
    src.start(t, noiseOfs);
    src.stop(t + decay * 1.3 + 0.01);
    track(p, src, g);
  }

  function toneHit(p: Player, t: number, type: OscillatorType, f0: number, f1: number, sweep: number, peak: number, decay: number) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.002, decay / 3);
    o.connect(g);
    g.connect(p.gain);
    o.start(t);
    o.stop(t + decay * 1.3 + 0.01);
    track(p, o, g);
  }

  function drum(p: Player, t: number, id: number, v: number) {
    const vel = v * DRUM_LEVEL;
    switch (id) {
      case DRUM.kick:
        toneHit(p, t, 'sine', 150, 42, 0.12, 0.9 * vel, 0.32);
        break;
      case DRUM.snare:
        noiseHit(p, t, 'bandpass', 1900, 0.7, 0.55 * vel, 0.17);
        toneHit(p, t, 'triangle', 220, 160, 0.05, 0.35 * vel, 0.08);
        break;
      case DRUM.rim:
        noiseHit(p, t, 'bandpass', 3200, 2, 0.35 * vel, 0.04);
        break;
      case DRUM.shaker:
        noiseHit(p, t, 'bandpass', 6500, 1.2, 0.18 * vel, 0.05);
        break;
      case DRUM.hat:
        noiseHit(p, t, 'highpass', 7500, 0.7, 0.16 * vel, 0.045);
        break;
      case DRUM.openHat:
        noiseHit(p, t, 'highpass', 7000, 0.7, 0.14 * vel, 0.3);
        break;
      case DRUM.crash:
        noiseHit(p, t, 'highpass', 4500, 0.5, 0.2 * vel, 1.2);
        break;
      case DRUM.tomLo:
        toneHit(p, t, 'sine', 160, 90, 0.15, 0.6 * vel, 0.25);
        break;
      case DRUM.tomHi:
        toneHit(p, t, 'sine', 240, 140, 0.15, 0.55 * vel, 0.22);
        break;
    }
  }

  function voice(p: Player, t: number, n: StepNote) {
    const dur = n.len * p.c.stepDur;
    const f = noteFreq(n.pitch);
    switch (n.inst) {
      case 'lead':
        oscVoice(p, t, dur, f, n.vel, {
          waves: [['square', 0], ['sawtooth', 7]],
          gain: 0.12,
          a: 0.008,
          d: 0.15,
          s: 0.7,
          r: 0.12,
          cutoff: 2400,
          cutoffEnv: 2000,
          q: 1.5,
          send: 0.35,
        });
        break;
      case 'bass':
        oscVoice(p, t, dur, f, n.vel, {
          waves: [['sawtooth', 0], ['triangle', -1200]],
          gain: 0.2,
          a: 0.004,
          d: 0.15,
          s: 0.6,
          r: 0.06,
          cutoff: 450,
          cutoffEnv: 1500,
          q: 3,
        });
        break;
      case 'pad':
        oscVoice(p, t, dur, f, n.vel, {
          waves: [['sawtooth', -9], ['sawtooth', 9]],
          gain: 0.035,
          a: 0.25,
          d: 0.4,
          s: 0.8,
          r: 0.5,
          cutoff: 1200,
          q: 0.6,
        });
        break;
      case 'arp':
        oscVoice(p, t, dur, f, n.vel, {
          waves: [['square', 0]],
          gain: 0.08,
          a: 0.002,
          d: 0.1,
          s: 0.15,
          r: 0.06,
          cutoff: 2800,
          cutoffEnv: 1500,
          send: 0.4,
        });
        break;
      case 'bell':
        bellVoice(p, t, dur, f, n.vel);
        break;
      case 'drums':
        drum(p, t, n.pitch, n.vel);
        break;
    }
  }

  function kill(p: Player) {
    for (const s of p.sources) {
      try {
        s.stop();
      } catch {
        // not started yet / already stopped
      }
    }
    p.sources.clear();
    p.gain.disconnect();
    p.send.disconnect();
    retired.delete(p);
  }

  function retire(p: Player, fade: number) {
    p.finished = true;
    retired.add(p);
    const now = ctx.currentTime;
    for (const g of [p.gain.gain, p.send.gain]) {
      const v = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(v, now);
      g.linearRampToValueAtTime(0, now + fade);
    }
    setTimeout(() => kill(p), (fade + 0.1) * 1000);
  }

  function tick() {
    const p = current;
    if (!p || p.finished) {
      if (timer !== null) clearInterval(timer);
      timer = null;
      return;
    }
    const now = ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    const sd = p.c.stepDur;
    // After a stall (background tab, debugger), jump to the present instead of bursting.
    const behind = Math.floor((now - p.start) / sd) - 1;
    if (behind > p.next) p.next = behind;
    for (;;) {
      const t = p.start + p.next * sd;
      if (t >= horizon) break;
      if (!p.c.song.loop && p.next >= p.c.song.steps) {
        p.finished = true;
        break;
      }
      if (t >= now - 0.005) for (const n of notesAt(p.c, p.next)) voice(p, Math.max(t, now), n);
      p.next++;
    }
  }

  function play(order: number) {
    const key = String(order);
    const song = songs[key];
    if (current) retire(current, XFADE);
    current = null;
    if (!song) return;
    let c = compiled.get(key);
    if (!c) {
      c = compileSong(song);
      compiled.set(key, c);
    }
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const send = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.08);
    send.gain.value = 1;
    gain.connect(master);
    send.connect(delay);
    // Echo time follows the tempo (a dotted eighth).
    delay.delayTime.setTargetAtTime(Math.min(1.5, (60 / song.bpm) * 0.75), now, 0.05);
    current = { c, gain, send, start: now + 0.05, next: 0, finished: false, sources: new Set() };
    tick();
    if (timer === null) timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (current) retire(current, 0.08);
    current = null;
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  return { play, stop };
}
