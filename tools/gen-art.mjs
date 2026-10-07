#!/usr/bin/env node
// Generates the remastered pack's painted source art with Codex's built-in image tool
// (runs on the user's ChatGPT plan; no API key involved). Each source is one picture
// described in packs/remastered/gen/*.mjs; packs/remastered/raster/*.mjs then cuts,
// sizes and animates sources into the game's images during build-pack.
//
//   node tools/gen-art.mjs shark_basic,diver         generate these sources
//   node tools/gen-art.mjs --all                     every source that has no image yet
//   node tools/gen-art.mjs shark_basic --variants 3  three candidates: shark_basic.v1..v3
//   node tools/gen-art.mjs ... --jobs 4              parallel Codex runs (default 3)
//   node tools/gen-art.mjs --list                    sources and whether they exist
//
// Output: packs/remastered/raw/<name>.webp (committed; downsized, alpha kept). The full-size
// originals are kept in .art-cache/ (ignored) for reprocessing.
// Never pass PopCap images as references: sources must be our own work.
//
// refs may name other sources, or 'svg:<image>' to attach our SVG art for that image as a
// layout guide (for pictures whose shapes must line up with game coordinates).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'packs', 'remastered', 'raw');
const CACHE = path.join(ROOT, '.art-cache');
const GEN = path.join(ROOT, 'packs', 'remastered', 'gen');
const { STYLE } = await import(pathToFileURL(path.join(GEN, 'style.mjs')).href);
const SOURCES = {};
for (const f of readdirSync(GEN).sort()) {
  if (!f.endsWith('.mjs') || f === 'style.mjs') continue;
  for (const [k, v] of Object.entries((await import(pathToFileURL(path.join(GEN, f)).href)).default)) {
    if (SOURCES[k]) throw new Error(`source ${k} is defined twice (gen/${f})`);
    SOURCES[k] = v;
  }
}

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const variants = Number(opt('--variants', 1));
const jobs = Number(opt('--jobs', 3));
const rawPath = (n) => path.join(RAW, `${n}.webp`);

if (args.includes('--list')) {
  for (const n of Object.keys(SOURCES)) console.log(`${existsSync(rawPath(n)) ? 'done   ' : 'missing'} ${n}`);
  process.exit(0);
}
const names = args.includes('--all') ? Object.keys(SOURCES).filter((n) => !existsSync(rawPath(n))) : (args[0] && !args[0].startsWith('--') ? args[0].split(',') : []);
for (const n of names) if (!SOURCES[n]) throw new Error(`No prompt for ${n} in packs/remastered/gen/`);
if (!names.length) {
  console.log('Nothing to generate (name sources, or --all).');
  process.exit(0);
}
mkdirSync(RAW, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const SHAPES = { landscape: 'a wide landscape image (3:2)', portrait: 'a tall portrait image (2:3)', square: 'a square image' };

function promptFor(name, refs) {
  const s = SOURCES[name];
  const bg = s.opaque
    ? 'The image is a full-bleed scene: paint all the way to every edge, no border or frame.'
    : 'Background: fully transparent (real alpha). If transparency is impossible, use a perfectly flat solid pure magenta (#FF00FF) background with no gradient, shadow or texture so it can be keyed out. The subject must not touch the image edges and must contain no magenta.';
  return [
    'Use your built-in image generation tool (not the CLI script and not code) to generate exactly ONE image.',
    `When it is done, copy the generated PNG to this exact path: ${'OUT_PATH'}`,
    refs.length ? `The attached image(s) are art from the same game, made by us${s.refNote ? ` (${s.refNote})` : ''}. ${s.layout ? 'The FIRST attachment is a flat layout guide: keep its composition, shapes, proportions and positions exactly (same silhouette and placement), but repaint it completely in the art style described below. Any other attachments show the style to match.' : 'Match their art style, rendering quality, lighting and level of detail. Do not copy their content unless told to.'}` : '',
    '',
    `Art style for the whole game: ${STYLE}`,
    '',
    `Make ${SHAPES[s.shape ?? 'landscape']}.`,
    s.prompt.trim(),
    '',
    bg,
    s.text ? `The only text in the image is: ${s.text}. Spell it exactly.` : 'No text, letters, numbers, logos, watermarks or signatures anywhere.',
    '',
    "Don't write code or any other files; only the image.",
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

function run(cmd, argv, input, log) {
  return new Promise((resolve) => {
    const p = spawn(cmd, argv, { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => out.push(d));
    p.on('close', (code) => {
      writeFileSync(log, Buffer.concat(out));
      resolve(code);
    });
    p.stdin.end(input);
  });
}

/** Turn a flat magenta background into alpha (with despill) when the image has none. */
async function keyed(file) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 250) opaque++;
  const corners = [0, info.width - 1, (info.height - 1) * info.width, info.height * info.width - 1].map((p) => data.subarray(p * 4, p * 4 + 4));
  const magentaBg = corners.every(([r, g, b, a]) => a > 250 && r > 200 && b > 200 && g < 80);
  if (!magentaBg || opaque < (data.length / 4) * 0.99) return sharp(data, { raw: info });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.max(0, Math.min(r, b) - g) / 255;
    const a = Math.max(0, Math.min(1, 1 - (m - 0.25) / 0.35));
    const spill = Math.max(0, Math.min(r, b) - g) * (1 - a);
    data[i] = Math.max(0, r - spill);
    data[i + 2] = Math.max(0, b - spill);
    data[i + 3] = Math.round(a * 255);
  }
  return sharp(data, { raw: info });
}

async function generate(name, variant) {
  const s = SOURCES[name];
  const tag = variants > 1 ? `${name}.v${variant}` : name;
  const work = mkdtempSync(path.join(os.tmpdir(), 'gen-art-'));
  const out = path.join(work, 'out.png');
  // Codex wants PNG/JPEG attachments.
  const refPngs = [];
  for (const [i, r] of (s.refs ?? []).entries()) {
    const p = path.join(work, `ref${i}.png`);
    if (r.startsWith('svg:')) {
      const { svgArt } = await import(pathToFileURL(path.join(ROOT, 'packs', 'remastered', 'raster', 'lib.mjs')).href);
      const img = await svgArt(r.slice(4), 4);
      // On a neutral grey so transparent parts read as background.
      await sharp({ create: { width: img.w, height: img.h, channels: 4, background: '#808080' } })
        .composite([{ input: img.data, raw: { width: img.w, height: img.h, channels: 4 } }])
        .png()
        .toFile(p);
    } else if (existsSync(rawPath(r))) await sharp(rawPath(r)).png().toFile(p);
    else continue;
    refPngs.push(p);
  }
  const prompt = promptFor(name, refPngs).replace('OUT_PATH', out);
  const argv = ['exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', work, ...refPngs.flatMap((p) => ['-i', p]), '-'];
  const log = path.join(CACHE, `${tag}.log`);
  const t0 = Date.now();
  const code = await run('codex', argv, prompt, log);
  if (code !== 0 || !existsSync(out)) {
    console.log(`FAIL  ${tag} (exit ${code}; see ${path.relative(ROOT, log)})`);
    return false;
  }
  const full = path.join(CACHE, `${tag}.png`);
  copyFileSync(out, full);
  const img = await keyed(full);
  const max = s.opaque ? 1536 : 1024;
  await img
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(path.join(RAW, `${tag}.webp`));
  rmSync(work, { recursive: true, force: true });
  console.log(`ok    ${tag} (${Math.round((Date.now() - t0) / 1000)}s)`);
  return true;
}

// A source whose style references are in this batch waits for them to finish.
const pending = new Set(names);
const queue = names.flatMap((n) => Array.from({ length: variants }, (_, i) => [n, i + 1]));
let failed = 0;
const ready = ([n]) => !(SOURCES[n].refs ?? []).some((r) => r !== n && pending.has(r));
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    while (queue.length) {
      const i = queue.findIndex(ready);
      if (i < 0) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      const [n, v] = queue.splice(i, 1)[0];
      if (!(await generate(n, v))) failed++;
      if (!queue.some(([m]) => m === n)) pending.delete(n);
    }
  }),
);
console.log(failed ? `${failed} failed` : 'done');
process.exit(failed ? 1 : 0);
