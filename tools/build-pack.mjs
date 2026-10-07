#!/usr/bin/env node
// Builds the remastered asset pack (our own art, fonts, sounds, music and data) into
// public/assets/remastered/, in the same layout the importer produces for the original
// game, so the game code can use either pack.
//
//   node tools/build-pack.mjs                 build everything
//   node tools/build-pack.mjs --only a,b      just these images (fast iteration)
//   node tools/build-pack.mjs --group Sharks  just one spec group
//   node tools/build-pack.mjs --report        list images that are still missing
//   node tools/build-pack.mjs --audio         just sounds and music
//   node tools/build-pack.mjs --data          just data files and fonts
// Partial modes never delete other output, so several people can iterate at once.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'packs', 'remastered');
const OUT = path.join(ROOT, 'public', 'assets', 'remastered');
const SCALE = 2;
// Images ship as WebP (about a fifth the size of PNG): lossy for art, lossless for the
// bitmap-font atlases so glyph edges stay exact.
const IMAGE_EXT = 'webp';

/** Write one built image (PNG buffer in) as the pack's image format. */
async function writeImage(name, png, { lossless = false } = {}) {
  const out = await sharp(png).webp(lossless ? { lossless: true, effort: 4 } : { quality: 90, alphaQuality: 95, effort: 4 }).toBuffer();
  writeFileSync(path.join(OUT, 'images', `${name}.${IMAGE_EXT}`), out);
  if (name === 'favicon') writeFileSync(path.join(OUT, 'favicon.png'), png); // browsers' tab icon
}

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt('--only')?.split(',');
const group = opt('--group');
const reportOnly = args.includes('--report');
const audioOnly = args.includes('--audio');
const dataOnly = args.includes('--data');
const partial = !!(only || group || audioOnly || dataOnly);

const spec = JSON.parse(readFileSync(path.join(PACK, 'spec.json'), 'utf8'));

// ---------------------------------------------------------------- art

async function loadArt() {
  const dir = path.join(PACK, 'art');
  const art = {};
  const owner = {};
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.mjs') || f === 'lib.mjs' || f.endsWith('-lib.mjs')) continue;
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    for (const [name, fn] of Object.entries(mod.default ?? {})) {
      if (owner[name]) throw new Error(`${name} is defined in both ${owner[name]} and ${f}`);
      owner[name] = f;
      art[name] = fn;
    }
  }
  return { art, owner };
}

/** Raster art (packs/remastered/raster/*.mjs): painted sources cut and animated in code. */
async function loadRaster() {
  const dir = path.join(PACK, 'raster');
  const raster = {};
  if (!existsSync(dir)) return raster;
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.mjs') || f === 'lib.mjs' || f.endsWith('-lib.mjs')) continue;
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    for (const [name, fn] of Object.entries(mod.default ?? {})) {
      if (raster[name]) throw new Error(`${name} is defined twice in packs/remastered/raster`);
      raster[name] = fn;
    }
  }
  return raster;
}

function placeholder(name, w, h) {
  const fs = Math.max(6, Math.min(14, (w / Math.max(4, name.length)) * 1.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="#ff00ff" fill-opacity="0.35" stroke="#ff00ff"/>
    <text x="${w / 2}" y="${h / 2}" font-size="${fs}" text-anchor="middle" fill="#ffffff">${name}</text></svg>`;
}

function sizeOf(svgText) {
  const m = /<svg[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"/.exec(svgText);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function render(svgText, w) {
  const r = new Resvg(svgText, { fitTo: { mode: 'width', value: Math.round(w * SCALE) }, font: { loadSystemFonts: true } });
  return r.render().asPng();
}

async function buildImages() {
  const { art } = await loadArt();
  const raster = await loadRaster();
  const { png: encodePng, SCALE: RS } = await import(pathToFileURL(path.join(PACK, 'raster', 'lib.mjs')).href);
  let rasterCount = 0;
  const imgDir = path.join(OUT, 'images');
  mkdirSync(imgDir, { recursive: true });
  const names = Object.keys(spec).filter((n) => (!only || only.includes(n)) && (!group || spec[n].group === group));
  const missing = [];
  const errors = [];
  for (const name of names) {
    const { w, h } = spec[name];
    if (raster[name]) {
      try {
        const img = await raster[name]();
        if (img.w !== w * RS || img.h !== h * RS) errors.push(`${name}: raster is ${img.w}x${img.h}, spec x${RS} is ${w * RS}x${h * RS}`);
        else {
          if (!reportOnly) await writeImage(name, await encodePng(img));
          rasterCount++;
          continue;
        }
      } catch (e) {
        // A source that hasn't been generated yet falls back to the SVG art.
        if (!/missing source/.test(e.message)) errors.push(`${name}: ${e.stack}`);
      }
    }
    let svgText;
    if (art[name]) {
      try {
        svgText = art[name]();
        const sz = sizeOf(svgText);
        if (!sz || sz[0] !== w || sz[1] !== h) errors.push(`${name}: SVG is ${sz?.join('x')}, spec is ${w}x${h}`);
      } catch (e) {
        errors.push(`${name}: ${e.stack}`);
        svgText = placeholder(name, w, h);
      }
    } else {
      missing.push(name);
      svgText = placeholder(name, w, h);
    }
    if (!reportOnly) await writeImage(name, render(svgText, w));
  }
  return { count: names.length, rasterCount, missing, errors, sizes: Object.fromEntries(Object.entries(spec).map(([n, v]) => [n, [v.w, v.h]])) };
}

// ---------------------------------------------------------------- fonts

// Each game font name maps to an open font sized to match the original's cap height
// (originals render at ~4/3 px per point with caps ~0.67em).
const FONT_MAP = {
  '12ptfont': { file: 'Barlow-SemiBold.ttf', pt: 11 },
  CourierFinalDraft15Bold: { file: 'CourierPrime-Bold.ttf', pt: 15 },
  GillSansMT10Bold: { file: 'Lato-Bold.ttf', pt: 10 },
  MyriadCondensedWeb12Bold: { file: 'BarlowCondensed-Bold.ttf', pt: 12 },
  MyriadCondensedWeb14Bold: { file: 'BarlowCondensed-SemiBold.ttf', pt: 14 },
  MyriadCondensedWeb15: { file: 'BarlowCondensed-Medium.ttf', pt: 15 },
  MyriadCondensedWeb28Bold: { file: 'BarlowCondensed-Bold.ttf', pt: 28 },
  Rockwell13: { file: 'Arvo-Regular.ttf', pt: 13 },
  Rockwell13Bold: { file: 'Arvo-Bold.ttf', pt: 13 },
  SwissCheesed24: { file: 'LuckiestGuy-Regular.ttf', pt: 24 },
};
const CHARS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));

function buildFont(name, { file, pt }) {
  const buf = readFileSync(path.join(PACK, 'fonts', file));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const capUnits = font.charToGlyph('H').getBoundingBox().y2 || font.tables.os2?.sCapHeight || font.unitsPerEm * 0.7;
  const targetCap = pt * (4 / 3) * 0.67;
  const size = (targetCap * font.unitsPerEm) / capUnits;
  const k = size / font.unitsPerEm;
  const ascent = Math.ceil(font.ascender * k) + 1;
  const descent = Math.ceil(-font.descender * k) + 1;
  const lineH = ascent + descent;
  const pad = 2;
  let x = 0;
  const glyphs = [];
  let paths = '';
  for (const ch of CHARS) {
    const adv = Math.round(font.getAdvanceWidth(ch, size));
    const p = font.getPath(ch, 0, 0, size);
    const bb = p.getBoundingBox();
    const empty = !isFinite(bb.x1) || bb.x2 - bb.x1 <= 0;
    const left = empty ? 0 : Math.floor(bb.x1) - pad;
    const w = empty ? 0 : Math.ceil(bb.x2) + pad - left;
    if (w > 0) {
      const gp = font.getPath(ch, x - left, ascent, size);
      paths += `<path d="${gp.toPathData(2)}" fill="#fff"/>`;
    }
    glyphs.push({ ch, x, w, adv, ox: left });
    x += w + 1;
  }
  const W = Math.max(1, x);
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${lineH}" viewBox="0 0 ${W} ${lineH}">${paths}</svg>`;
  return writeImage(name, render(svgText, W), { lossless: true }).then(() => {
  const q = (c) => (c === "'" ? `"'"` : c === '\\' ? `'\\\\'` : `'${c}'`);
  const desc = [
    `// ${name}: generated from ${file} by tools/build-pack.mjs`,
    `Define CharList (${glyphs.map((g) => q(g.ch)).join(', ')});`,
    `Define WidthList (${glyphs.map((g) => g.adv).join(', ')});`,
    `Define RectList (${glyphs.map((g) => `(${g.x},0,${g.w},${lineH})`).join(', ')});`,
    `Define OffsetList (${glyphs.map((g) => `(${g.ox},0)`).join(', ')});`,
    'CreateLayer Main;',
    `LayerSetImage Main '../images/${name}';`,
    'LayerSetImageMap Main CharList RectList;',
    'LayerSetCharWidths Main CharList WidthList;',
    'LayerSetCharOffsets Main CharList OffsetList;',
    `LayerSetAscent Main ${ascent};`,
    `LayerSetPointSize Main ${pt};`,
    '',
  ].join('\n');
  writeFileSync(path.join(OUT, 'data', `${name}.txt`), desc);
  });
  return [W, lineH];
}

// ---------------------------------------------------------------- sounds

function wav(samples, rate = 44100) {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return b;
}

async function buildAudio() {
  const sounds = [];
  const sfx = path.join(PACK, 'audio', 'sfx.mjs');
  if (existsSync(sfx)) {
    const mod = await import(pathToFileURL(sfx).href);
    mkdirSync(path.join(OUT, 'sounds'), { recursive: true });
    for (const [name, fn] of Object.entries(mod.default)) {
      writeFileSync(path.join(OUT, 'sounds', `${name}.wav`), wav(fn()));
      sounds.push(name);
    }
  }
  const music = [];
  const song = path.join(PACK, 'audio', 'music.mjs');
  if (existsSync(song)) {
    const mod = await import(pathToFileURL(song).href);
    mkdirSync(path.join(OUT, 'music'), { recursive: true });
    writeFileSync(path.join(OUT, 'music', 'music.json'), JSON.stringify(mod.default));
    music.push('music');
  }
  return { sounds, music };
}

function copyData() {
  const dataDir = path.join(PACK, 'data');
  if (!existsSync(dataDir)) return;
  for (const f of readdirSync(dataDir)) if (!f.endsWith('.md')) copyFileSync(path.join(dataDir, f), path.join(OUT, 'data', f));
}

/** Manifest from whatever is on disk, so partial builds keep it accurate. */
async function writeManifest() {
  const list = (d, ext) => (existsSync(path.join(OUT, d)) ? readdirSync(path.join(OUT, d)).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)).sort() : []);
  const sizes = Object.fromEntries(Object.entries(spec).map(([n, v]) => [n, [v.w, v.h]]));
  for (const name of Object.keys(FONT_MAP)) {
    const p = path.join(OUT, 'images', `${name}.${IMAGE_EXT}`);
    if (existsSync(p)) {
      const { width, height } = await sharp(p).metadata();
      sizes[name] = [width / SCALE, height / SCALE];
    }
  }
  const manifest = {
    pack: 'remastered',
    scale: SCALE,
    imageExt: IMAGE_EXT,
    images: sizes,
    sounds: list('sounds', '.wav'),
    soundExt: 'wav',
    music: list('music', '.json'),
    musicType: 'synth',
    wordPlates: true,
    // White words on a soft dark halo, typed letters gold: reads on any painted body.
    wordColors: [0xffffff, 0xffc31a],
    // Painted sharks: words sit on the trunk between gills and dorsal fin (frame x ~68).
    wordOffsets: Object.fromEntries(['shark_basic_swim', 'shark_black_swim', 'shark_red_swim', 'shark_ghost_swim', 'toxic_basic_swim'].map((n) => [n, -12])),
    data: existsSync(path.join(OUT, 'data')) ? readdirSync(path.join(OUT, 'data')).sort() : [],
  };
  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  return manifest;
}

// ---------------------------------------------------------------- main

async function main() {
  if (!partial && !reportOnly) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(path.join(OUT, 'data'), { recursive: true });
  mkdirSync(path.join(OUT, 'images'), { recursive: true });
  if (audioOnly || dataOnly) {
    if (dataOnly) {
      for (const [name, cfg] of Object.entries(FONT_MAP)) await buildFont(name, cfg);
      copyData();
      console.log('data and fonts rebuilt');
    }
    if (audioOnly) {
      const a = await buildAudio();
      console.log(`audio rebuilt: ${a.sounds.length} sounds, ${a.music.length} music file(s)`);
    }
    await writeManifest();
    return;
  }
  const img = await buildImages();
  if (reportOnly) {
    console.log(`${img.missing.length} of ${img.count} images still missing:\n${img.missing.join(' ')}`);
    if (img.errors.length) console.log(`errors:\n${img.errors.join('\n')}`);
    return;
  }
  if (partial) {
    console.log(`rendered ${img.count} image(s)`);
    if (img.errors.length) console.error(img.errors.join('\n'));
    return;
  }
  for (const [name, cfg] of Object.entries(FONT_MAP)) await buildFont(name, cfg);
  copyData();
  await buildAudio();
  const manifest = await writeManifest();
  console.log(`remastered pack: ${img.count} images (${img.rasterCount} painted, ${img.missing.length} placeholders), ${Object.keys(FONT_MAP).length} fonts, ${manifest.sounds.length} sounds, ${manifest.data.length} data files`);
  if (img.errors.length) {
    console.error(`errors:\n${img.errors.join('\n')}`);
    process.exitCode = 1;
  }
}

await main();
