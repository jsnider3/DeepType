// Asset access. All game code works in the original 640x480 coordinate space; packs
// may ship images at any scale (manifest.scale) and textures are loaded with that
// resolution so their logical size matches the original.
//
// Packs live in public/assets/<pack>/ with the original game's file names
// (images/<name>.png, sounds/<name>.<ext>, music/, data/):
// - "remastered": our own art, sounds, music and data, always present (tools/build-pack.mjs)
// - "original": assets imported from your own copy of the original game (tools/import_assets.py), optional
// The active pack wins per file; anything it lacks falls back to "remastered".

import { Assets, Rectangle, Texture } from 'pixi.js';

export interface Manifest {
  pack?: string;
  scale: number;
  /** Image file extension (default png). */
  imageExt?: string;
  images: Record<string, [number, number]>;
  sounds: string[];
  /** Sound file extension (the original pack ships .ogg). */
  soundExt?: string;
  music: string[];
  /** 'module' = tracker module with order jumps (original); 'synth' = built-in synth songs. */
  musicType?: 'module' | 'synth';
  data: string[];
  /** Draw a soft plate behind enemy words (for art whose bodies are too busy or dark for bare text). */
  wordPlates?: boolean;
  /** Word x offsets from the frame centre, by swim image (overrides the game's defaults to fit this pack's art). */
  wordOffsets?: Record<string, number>;
  /** Word colours [untyped, typed] for every enemy (overrides each creature's own). */
  wordColors?: [number, number];
}

export type PackName = 'remastered' | 'original';

const BASE = `${import.meta.env.BASE_URL}assets/`;
const PREF_KEY = 'typershark.pack';
const textures = new Map<string, Texture>();
const dataFiles = new Map<string, string>();
const frameCache = new Map<string, Texture[]>();
const packs: Partial<Record<PackName, Manifest>> = {};
let active: PackName = 'remastered';

async function fetchManifest(pack: string): Promise<Manifest | null> {
  try {
    const r = await fetch(`${BASE}${pack}/manifest.json`);
    if (!r.ok) return null;
    return (await r.json()) as Manifest;
  } catch {
    return null; // missing, or Vite served index.html instead
  }
}

/** The pack that provides `kind/name`: the active one if it has it, else remastered. */
function sourceFor(has: (m: Manifest) => boolean): { pack: PackName; m: Manifest } {
  const a = packs[active];
  if (a && has(a)) return { pack: active, m: a };
  return { pack: 'remastered', m: packs.remastered ?? a! };
}

/** URL of a non-image asset (sounds/music) in the pack that provides it. */
export function assetUrl(file: string) {
  return `${BASE}${active}/${file}`;
}

export function activePack(): PackName {
  return active;
}

export function availablePacks(): PackName[] {
  return (['remastered', 'original'] as PackName[]).filter((p) => packs[p]);
}

/** Remember the preferred pack; takes effect on the next load. */
export function setPreferredPack(p: PackName) {
  try {
    localStorage.setItem(PREF_KEY, p);
  } catch {
    // storage unavailable
  }
}

/** The stored choice; without one, our remastered pack. */
function preferredPack(): PackName {
  try {
    const p = localStorage.getItem(PREF_KEY);
    if (p === 'original' || p === 'remastered') return p;
  } catch {
    // storage unavailable
  }
  return 'remastered';
}

/** Manifest of the pack that provides sounds/music (the active one when it has them). */
export function getManifest(): Manifest {
  return sourceFor((m) => m.sounds.length > 0).m;
}

/** The active pack's manifest. */
export function activeManifest(): Manifest | undefined {
  return packs[active];
}

/** Sound URL, honouring each pack's file extension. */
export function soundUrl(name: string) {
  const { pack, m } = sourceFor((x) => x.sounds.includes(name));
  return `${BASE}${pack}/sounds/${name}.${m.soundExt ?? 'ogg'}`;
}

/** Music source: the active pack's if it has music, else remastered's synth songs. */
export function musicSource(): { type: 'module' | 'synth'; url: string } | null {
  const { pack, m } = sourceFor((x) => x.music.length > 0);
  if (!m.music.length) return null;
  const type = m.musicType ?? 'module';
  return { type, url: `${BASE}${pack}/music/${m.music[0]}.${type === 'synth' ? 'json' : 'mo3'}` };
}

/** Images the title screen needs; loaded first so it can show the real loading bar. */
export const TITLE_IMAGES = ['titlescreen', 'barandlogo', 'goldbar', 'title_continue', 'title_continue_over'];

function entryFor(name: string) {
  const { pack, m } = sourceFor((x) => x.images[name] !== undefined);
  return {
    alias: name,
    src: `${BASE}${pack}/images/${name}.${m.imageExt ?? 'png'}`,
    data: { resolution: m.scale, scaleMode: 'linear' as const },
  };
}

/** Manifests plus the title-screen images. Throws 'missing-assets' if no pack exists. */
export async function loadBoot() {
  const [r, o] = await Promise.all([fetchManifest('remastered'), fetchManifest('original')]);
  if (r) packs.remastered = r;
  if (o) packs.original = o;
  if (!r && !o) throw new Error('missing-assets');
  active = preferredPack();
  if (!packs[active]) active = r ? 'remastered' : 'original';
  await Promise.all(TITLE_IMAGES.map(async (n) => textures.set(n, await Assets.load<Texture>(entryFor(n)))));
}

/** Everything else: remaining images and data files. */
export async function loadAll(onProgress: (p: number) => void) {
  const all = new Set<string>();
  const dataNames = new Set<string>();
  // Only the packs in use: names only the inactive pack has would fall back to a missing file.
  for (const m of new Set([packs[active], packs.remastered])) {
    if (!m) continue;
    for (const n of Object.keys(m.images)) all.add(n);
    for (const d of m.data) dataNames.add(d);
  }
  const names = [...all].filter((n) => !textures.has(n));
  const total = names.length + dataNames.size;
  let done = 0;
  const tick = () => onProgress(++done / total);

  await Promise.all([
    ...names.map(async (n) => {
      try {
        textures.set(n, await Assets.load<Texture>(entryFor(n)));
      } catch (e) {
        console.error(`Could not load image ${n}`, e); // one bad file shouldn't stall the game
      }
      tick();
    }),
    ...[...dataNames].map(async (n) => {
      const { pack } = sourceFor((x) => x.data.includes(n));
      const buf = await (await fetch(`${BASE}${pack}/data/${n}`)).arrayBuffer();
      registerData(n, new TextDecoder('latin1').decode(buf));
      tick();
    }),
  ]);
}

export function tex(name: string): Texture {
  const t = textures.get(name);
  if (!t) throw new Error(`Unknown image ${name}`);
  return t;
}

export function hasTex(name: string) {
  return textures.has(name);
}

/** Make a data file available to data() (the loader, and tests that don't fetch). */
export function registerData(name: string, text: string) {
  dataFiles.set(name.toLowerCase(), text);
}

/** Data files are matched case-insensitively (the install mixes Lesson5/lesson5). */
export function data(name: string): string {
  const d = dataFiles.get(name.toLowerCase());
  if (d === undefined) throw new Error(`Unknown data file ${name}`);
  return d;
}

/** Sub-texture in logical (original 640x480-era) pixels. */
export function sub(name: string, x: number, y: number, w: number, h: number): Texture {
  const base = tex(name);
  return new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
}

/** Split an animation strip into `count` equal frames (horizontal unless vertical). */
export function frames(name: string, count: number, vertical = false): Texture[] {
  const key = `${name}:${count}:${vertical}`;
  let out = frameCache.get(key);
  if (!out) {
    const t = tex(name);
    const w = vertical ? t.width : t.width / count;
    const h = vertical ? t.height / count : t.height;
    out = Array.from({ length: count }, (_, i) =>
      sub(name, vertical ? 0 : i * w, vertical ? i * h : 0, w, h),
    );
    frameCache.set(key, out);
  }
  return out;
}

/** Grid of frames, row-major. */
export function grid(name: string, cols: number, rows: number): Texture[] {
  const key = `${name}:grid:${cols}x${rows}`;
  let out = frameCache.get(key);
  if (!out) {
    const t = tex(name);
    const w = t.width / cols;
    const h = t.height / rows;
    out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(sub(name, c * w, r * h, w, h));
    frameCache.set(key, out);
  }
  return out;
}

