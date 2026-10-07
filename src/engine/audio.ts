// Web Audio playback for sound effects and music.

import { getManifest, musicSource as findMusic, soundUrl } from './assets';
import { createSynthMusic, type SynthMusic } from './synth';

let ctx: AudioContext | null = null;
let sfxGain: GainNode;
let musicGain: GainNode;
const buffers = new Map<string, AudioBuffer>();
const loops = new Map<string, AudioBufferSourceNode>();
let musicSource: AudioBufferSourceNode | null = null;
let musicName = '';

// Tracker-module music: PopCap packs every tune into one .mo3 and jumps between
// order positions, so it's played live with libopenmpt (chiptune3) when available.
interface ModPlayer {
  gain: GainNode;
  play(buf: ArrayBuffer): void;
  setOrderRow(o: number, r: number): void;
  onInitialized(h: () => void): void;
}
let mod: ModPlayer | null = null;
let modBuffer: ArrayBuffer | null = null;
let modPlaying = false;
let modOrder = -1;
let pendingOrder = -1;

export const volume = { sfx: 0.8, music: 0.6 };

function ensureCtx() {
  if (!ctx) {
    ctx = new AudioContext();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain.gain.value = volume.sfx;
    musicGain.gain.value = volume.music;
    sfxGain.connect(ctx.destination);
    musicGain.connect(ctx.destination);
  }
  return ctx;
}

async function decode(url: string) {
  const c = ensureCtx();
  const r = await fetch(url);
  return c.decodeAudioData(await r.arrayBuffer());
}

export async function loadSounds(onProgress: (p: number) => void = () => {}) {
  const m = getManifest();
  void loadMusic(); // music is optional; never block startup on it
  let done = 0;
  await Promise.all(
    m.sounds.map(async (s) => {
      buffers.set(s, await decode(soundUrl(s)));
      onProgress(++done / m.sounds.length);
    }),
  );
}

let synth: SynthMusic | null = null;

async function loadMusic() {
  const src = findMusic();
  if (!src) return;
  if (src.type === 'synth') {
    try {
      const songs = await (await fetch(src.url)).json();
      synth = createSynthMusic(ensureCtx(), musicGain, songs);
      if (pendingOrder >= 0 && ctx?.state === 'running') {
        const o = pendingOrder;
        pendingOrder = -1;
        musicOrder(o);
      }
    } catch (e) {
      console.warn('Synth music unavailable', e);
    }
    return;
  }
  await loadModule(src.url);
}

async function loadModule(url: string) {
  try {
    const c = ensureCtx();
    modBuffer = await (await fetch(url)).arrayBuffer();
    const playerUrl = `${import.meta.env.BASE_URL}vendor/chiptune3/chiptune3.js`;
    // Load the vendored file as a plain static module: Vite refuses source imports from
    // public/, and the worklet must resolve its sibling files relative to its own URL.
    const nativeImport = new Function('u', 'return import(u)') as (u: string) => Promise<unknown>;
    const { ChiptuneJsPlayer } = (await nativeImport(new URL(playerUrl, location.href).href)) as {
      ChiptuneJsPlayer: new (cfg: object) => ModPlayer;
    };
    const p = new ChiptuneJsPlayer({ context: c, repeatCount: -1 });
    await new Promise<void>((res, rej) => {
      p.onInitialized(res);
      setTimeout(() => rej(new Error('music worklet did not start')), 15000);
    });
    p.gain.connect(musicGain);
    mod = p;
    if (pendingOrder >= 0 && ctx?.state === 'running') {
      const o = pendingOrder;
      pendingOrder = -1;
      musicOrder(o);
    }
  } catch (e) {
    console.warn('Module music unavailable', e);
  }
}

/** Jump the music to an order position of the module. */
export function musicOrder(order: number) {
  if (synth) {
    if (ctx?.state !== 'running') {
      pendingOrder = order;
      return;
    }
    if (order === modOrder) return;
    modOrder = order;
    synth.play(order);
    return;
  }
  if (!mod || !modBuffer || ctx?.state !== 'running') {
    pendingOrder = order;
    return;
  }
  if (!modPlaying) {
    mod.play(modBuffer.slice(0));
    modPlaying = true;
  }
  if (order === modOrder) return;
  modOrder = order;
  mod.setOrderRow(order, 0);
}

export function currentOrder() {
  return modOrder;
}

export function musicStatus() {
  return { loaded: !!mod || !!synth, playing: modPlaying || !!synth, order: modOrder, pending: pendingOrder, ctx: ctx?.state };
}

/** Browsers start audio suspended until a user gesture. */
export function resumeAudio() {
  if (ctx?.state === 'suspended') {
    void ctx.resume().then(() => {
      if (pendingOrder >= 0) {
        const o = pendingOrder;
        pendingOrder = -1;
        musicOrder(o);
      }
    });
  }
}

export function play(name: string, opts: { volume?: number; rate?: number } = {}) {
  const b = buffers.get(name);
  if (!b || !ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = opts.rate ?? 1;
  let out: AudioNode = sfxGain;
  if (opts.volume !== undefined) {
    const g = ctx.createGain();
    g.gain.value = opts.volume;
    g.connect(sfxGain);
    out = g;
  }
  src.connect(out);
  src.start();
}

export function loop(name: string, on: boolean) {
  const cur = loops.get(name);
  if (!on) {
    cur?.stop();
    loops.delete(name);
    return;
  }
  const b = buffers.get(name);
  if (cur || !b || !ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.loop = true;
  src.connect(sfxGain);
  src.start();
  loops.set(name, src);
}

export function playMusic(name: string, from = 0, loopStart = 0, loopEnd = 0) {
  const b = buffers.get(`music:${name}`);
  if (!b || !ctx) return;
  stopMusic();
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.loop = true;
  src.loopStart = loopStart;
  src.loopEnd = loopEnd || b.duration;
  src.connect(musicGain);
  src.start(0, from);
  musicSource = src;
  musicName = name;
}

export function stopMusic() {
  musicSource?.stop();
  musicSource = null;
  musicName = '';
}

export function currentMusic() {
  return musicName;
}

export function setVolumes(sfx: number, music: number) {
  volume.sfx = sfx;
  volume.music = music;
  if (ctx) {
    sfxGain.gain.value = sfx;
    musicGain.gain.value = music;
  }
}
