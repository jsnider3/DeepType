import { afterEach, describe, expect, it, vi } from 'vitest';
import sfx from '../packs/remastered/audio/sfx.mjs';
import songs from '../packs/remastered/audio/music.mjs';
import {
  compileSong,
  createSynthMusic,
  eventsInRange,
  noteFreq,
  parseNote,
  songDuration,
  songStep,
  stepSeconds,
  validateSong,
  type Song,
} from '../src/engine/synth';

const SR = 44100;

describe('note helpers', () => {
  it('maps MIDI numbers and names to frequencies', () => {
    expect(noteFreq(69)).toBeCloseTo(440, 6);
    expect(noteFreq('A4')).toBeCloseTo(440, 6);
    expect(noteFreq('C4')).toBeCloseTo(261.626, 2);
    expect(noteFreq(81) / noteFreq(69)).toBeCloseTo(2, 9);
    expect(parseNote('C4')).toBe(60);
    expect(parseNote('F#5')).toBe(78);
    expect(parseNote('Bb3')).toBe(58);
    expect(() => parseNote('H2')).toThrow();
  });
});

const tiny: Song = {
  bpm: 120,
  steps: 8,
  loop: true,
  loopStart: 4,
  tracks: [
    { inst: 'lead', notes: [[0, 60, 2], [5, 64, 1, 0.5]] },
    { inst: 'drums', vol: 0.5, notes: [[4, 36, 1]] },
  ],
};

describe('scheduling', () => {
  it('maps timeline steps through intros and loops', () => {
    expect(songStep(tiny, 0)).toBe(0);
    expect(songStep(tiny, 7)).toBe(7);
    expect(songStep(tiny, 8)).toBe(4); // wraps to loopStart, the intro plays once
    expect(songStep(tiny, 13)).toBe(5);
    expect(songStep({ ...tiny, loop: false }, 8)).toBe(-1);
    expect(songStep({ ...tiny, loopStart: 0 }, 8)).toBe(0);
  });

  it('produces timed events that repeat each loop', () => {
    const c = compileSong(tiny);
    expect(stepSeconds(tiny)).toBeCloseTo(0.125);
    expect(songDuration(tiny)).toBeCloseTo(1);
    const ev = eventsInRange(c, 0, 16);
    // intro note once; loop notes (steps 4 and 5) three times (t = 4,5 / 8,9 / 12,13)
    expect(ev.filter((e) => e.pitch === 60).map((e) => e.t)).toEqual([0]);
    expect(ev.filter((e) => e.pitch === 64).map((e) => e.t)).toEqual([5, 9, 13]);
    const kick = ev.filter((e) => e.inst === 'drums');
    expect(kick.map((e) => e.t)).toEqual([4, 8, 12]);
    expect(kick[0].vel).toBeCloseTo(0.5);
    expect(kick[1].time).toBeCloseTo(1);
    const lead = ev.find((e) => e.pitch === 60)!;
    expect(lead.dur).toBeCloseTo(0.25);
    expect(eventsInRange(compileSong({ ...tiny, loop: false }), 0, 32)).toHaveLength(3);
  });

  it('flags malformed songs', () => {
    expect(validateSong(tiny)).toEqual([]);
    expect(validateSong({ ...tiny, tracks: [{ inst: 'lead', notes: [[9, 60, 1]] }] })).not.toEqual([]);
    expect(validateSong({ ...tiny, tracks: [{ inst: 'drums', notes: [[0, 60, 1]] }] })).not.toEqual([]);
    expect(validateSong({ ...tiny, loopStart: 8 })).not.toEqual([]);
  });
});

describe('remastered songs', () => {
  const cues = [0, 0x11, 0x14, 0x1e, 0x22, 0x25, 0x2b, 0x2e, 0x30];

  it('has a song for every music cue', () => {
    expect(Object.keys(songs).map(Number).sort((a, b) => a - b)).toEqual(cues);
  });

  it.each(cues)('cue %i is well formed and JSON-safe', (cue) => {
    const s = songs[cue];
    expect(validateSong(s)).toEqual([]);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    for (const t of s.tracks) expect(t.notes.length).toBeGreaterThan(0);
    const loopLen = (s.steps - (s.loopStart ?? 0)) * stepSeconds(s);
    if (s.loop) expect(loopLen).toBeGreaterThan(4);
  });

  it('only game over is a one-shot; air refill and level complete have intros', () => {
    for (const c of cues) expect(songs[c].loop).toBe(c !== 0x1e);
    expect(songDuration(songs[0x1e])).toBeLessThan(10);
    const air = songs[0x22];
    const intro = (air.loopStart ?? 0) * stepSeconds(air);
    expect(intro).toBeGreaterThan(2.5);
    expect(intro).toBeLessThan(4.5);
    expect(songs[0x2e].loopStart).toBeGreaterThan(0);
  });

  it('danger cues get faster', () => {
    expect(songs[0x25].bpm).toBeGreaterThan(songs[0].bpm);
    expect(songs[0x2b].bpm).toBeGreaterThan(songs[0x25].bpm);
  });
});

// ------------------------------------------------------------------ sound effects

const NAMES = [
  'eerie1', 'eerie3', 'playerdies', 'sharkdies', 'wrong', 'buttonclick', 'divebell1', 'wingem',
  'wave_bonus', 'wave_bonus2', 'wave_bonus3', 'treasure', 'shipmove', 'emp', 'extralife',
  ...Array.from({ length: 13 }, (_, i) => `tone${i + 1}`),
  'sonarping1', 'torpedolaunch', 'jellyfish', 'explosion', 'type', 'type2', 'type3', 'sharkhurt',
  'diverenters', 'piranhadies1', 'underwaterloop', 'bad',
];

const rendered = new Map<string, Float32Array>();
const get = (n: string) => {
  if (!rendered.has(n)) rendered.set(n, sfx[n]());
  return rendered.get(n)!;
};

/** Pitch by autocorrelation over a 0.1 s window after the attack. */
function pitch(x: Float32Array) {
  const a = Math.round(0.03 * SR);
  const n = Math.round(0.1 * SR);
  let best = -Infinity;
  let lag = 0;
  for (let l = Math.round(SR / 2000); l < Math.round(SR / 200); l++) {
    let s = 0;
    for (let i = a; i < a + n; i++) s += x[i] * x[i + l];
    if (s > best) {
      best = s;
      lag = l;
    }
  }
  // parabolic refinement of the peak
  const ac = (l: number) => {
    let s = 0;
    for (let i = a; i < a + n; i++) s += x[i] * x[i + l];
    return s;
  };
  const y0 = ac(lag - 1);
  const y2 = ac(lag + 1);
  const shift = (0.5 * (y0 - y2)) / (y0 - 2 * best + y2);
  return SR / (lag + shift);
}

describe('remastered sound effects', () => {
  it('covers exactly the 40 game sounds', () => {
    expect(Object.keys(sfx).sort()).toEqual([...NAMES].sort());
  });

  it.each(NAMES)('%s renders clean audio', (name) => {
    const x = get(name);
    expect(x).toBeInstanceOf(Float32Array);
    const dur = x.length / SR;
    expect(dur).toBeGreaterThan(0.1);
    expect(dur).toBeLessThan(4);
    let peak = 0;
    let sum = 0;
    let sq = 0;
    for (const v of x) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
      sum += v;
      sq += v * v;
    }
    expect(peak).toBeLessThanOrEqual(1);
    expect(peak).toBeGreaterThan(0.2); // not silent
    expect(peak).toBeLessThan(0.75); // headroom (about -3 dBFS)
    expect(Math.sqrt(sq / x.length)).toBeGreaterThan(0.01);
    expect(Math.abs(sum / x.length)).toBeLessThan(0.005); // no DC
    if (name !== 'underwaterloop') {
      expect(Math.abs(x[0])).toBeLessThan(0.01); // faded in/out: no clicks
      expect(Math.abs(x[x.length - 1])).toBeLessThan(0.01);
    }
  });

  it('keeps the original durations roughly', () => {
    const want: Record<string, number> = { sharkdies: 1.61, emp: 2.0, playerdies: 2.51, tone1: 0.82, torpedolaunch: 2.19, type: 0.2 };
    for (const [n, d] of Object.entries(want)) expect(get(n).length / SR).toBeCloseTo(d, 0);
  });

  it('tone1..tone13 rise by a semitone each', () => {
    const f = Array.from({ length: 13 }, (_, i) => pitch(get(`tone${i + 1}`)));
    for (let i = 1; i < 13; i++) {
      expect(f[i]).toBeGreaterThan(f[i - 1]);
      expect(f[i] / f[i - 1]).toBeGreaterThan(1.04);
      expect(f[i] / f[i - 1]).toBeLessThan(1.08);
    }
    expect(f[12] / f[0]).toBeCloseTo(2, 1);
  });

  it('is deterministic', () => {
    expect(sfx.explosion()).toEqual(get('explosion'));
  });

  it('underwaterloop wraps without a seam', () => {
    const x = get('underwaterloop');
    let maxStep = 0;
    for (let i = 1; i < x.length; i++) maxStep = Math.max(maxStep, Math.abs(x[i] - x[i - 1]));
    expect(Math.abs(x[0] - x[x.length - 1])).toBeLessThanOrEqual(maxStep);
  });
});

// ------------------------------------------------------------------ sequencer (fake Web Audio)

class FakeParam {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
  setTargetAtTime() {
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class FakeCtx {
  currentTime = 0;
  sampleRate = 8000;
  live = new Set<FakeSource>();
  created = 0;
  advance(dt: number) {
    this.currentTime += dt;
    for (const s of [...this.live]) if (s.stopAt <= this.currentTime) s.end();
  }
  node() {
    return { connect: (n: unknown) => n, disconnect() {}, gain: new FakeParam(), frequency: new FakeParam(), Q: new FakeParam(), type: '' };
  }
  createGain() {
    return this.node();
  }
  createBiquadFilter() {
    return this.node();
  }
  createDelay() {
    return { ...this.node(), delayTime: new FakeParam() };
  }
  createDynamicsCompressor() {
    return { ...this.node(), threshold: new FakeParam(), ratio: new FakeParam(), attack: new FakeParam(), release: new FakeParam() };
  }
  createBuffer(_c: number, n: number) {
    const d = new Float32Array(n);
    return { getChannelData: () => d };
  }
  createOscillator() {
    return new FakeSource(this);
  }
  createBufferSource() {
    return new FakeSource(this);
  }
}

class FakeSource {
  stopAt = Infinity;
  onended: (() => void) | null = null;
  frequency = new FakeParam();
  detune = new FakeParam();
  type = '';
  buffer: unknown = null;
  private done = false;
  private ctx: FakeCtx;
  constructor(ctx: FakeCtx) {
    this.ctx = ctx;
  }
  connect(n: unknown) {
    return n;
  }
  disconnect() {}
  start() {
    this.ctx.created++;
    this.ctx.live.add(this);
  }
  stop(when?: number) {
    this.stopAt = when ?? this.ctx.currentTime;
    if (this.stopAt <= this.ctx.currentTime) this.end();
  }
  end() {
    if (this.done) return;
    this.done = true;
    this.ctx.live.delete(this);
    this.onended?.();
  }
}

describe('createSynthMusic', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function run(ctx: FakeCtx, seconds: number, each?: (i: number) => void) {
    const ticks = Math.round(seconds / 0.025);
    for (let i = 0; i < ticks; i++) {
      each?.(i);
      ctx.advance(0.025);
      vi.advanceTimersByTime(25);
    }
  }

  it('plays, switches rapidly without piling up voices, and stops cleanly', () => {
    vi.useFakeTimers();
    const ctx = new FakeCtx();
    const m = createSynthMusic(ctx as unknown as AudioContext, ctx.node() as unknown as AudioNode, songs);
    m.play(0);
    run(ctx, 4);
    expect(ctx.created).toBeGreaterThan(50); // notes are being scheduled
    let maxLive = 0;
    run(ctx, 6, (i) => {
      if (i % 3 === 0) m.play([0x25, 0x2b, 0][(i / 3) % 3]);
      maxLive = Math.max(maxLive, ctx.live.size);
    });
    expect(maxLive).toBeLessThan(150);
    m.stop();
    run(ctx, 1);
    expect(ctx.live.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends one-shots and ignores unknown cues', () => {
    vi.useFakeTimers();
    const ctx = new FakeCtx();
    const m = createSynthMusic(ctx as unknown as AudioContext, ctx.node() as unknown as AudioNode, songs);
    m.play(0x1e);
    run(ctx, songDuration(songs[0x1e]) + 3);
    expect(ctx.live.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    m.play(0x7f); // no song: silence, no timers
    run(ctx, 1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
