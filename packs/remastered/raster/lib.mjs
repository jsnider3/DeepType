// Helpers for raster art: turns the painted sources in packs/remastered/raw/ (made by
// tools/gen-art.mjs) into the game's images. Images are { w, h, data } with straight-alpha
// RGBA bytes, in output pixels: SCALE x the game's logical size.
//
// A raster module default-exports { imageName: async () => img, ... }; build-pack checks
// each result is exactly spec size x SCALE and uses it instead of any SVG art.

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

export const SCALE = 2;
const PACK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(PACK, 'raw');

let svgModules;
/**
 * Our SVG art for an image (packs/remastered/art), rendered at scale x its logical size.
 * Raster art uses it for exact geometry: layouts, silhouettes and masks.
 */
export async function svgArt(name, scale = SCALE) {
  // One shared load, so concurrent callers never see a half-filled table.
  svgModules ??= (async () => {
    const all = {};
    const dir = path.join(PACK, 'art');
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.mjs') || f === 'lib.mjs' || f.endsWith('-lib.mjs')) continue;
      Object.assign(all, (await import(pathToFileURL(path.join(dir, f)).href)).default);
    }
    return all;
  })();
  const modules = await svgModules;
  if (!modules[name]) throw new Error(`no SVG art for ${name}`);
  const text = modules[name]();
  const w = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(text)[1]);
  const png = new Resvg(text, { fitTo: { mode: 'width', value: Math.round(w * scale) } }).render().asPng();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/**
 * A repainted source fitted onto its SVG layout guide: scaled so its visible bounds match
 * the guide's, then cut to the guide's silhouette (alpha), so it lines up exactly.
 */
export async function repaint(srcName, guide, { mask = true } = {}) {
  const src = await source(srcName);
  const [gx, gy, gw, gh] = bbox(guide);
  const r = await resize(src, gw, gh);
  const out = paste(blank(guide.w, guide.h), r, gx, gy);
  if (mask) for (let i = 3; i < out.data.length; i += 4) out.data[i] = Math.round((out.data[i] * guide.data[i]) / 255);
  return out;
}

const cache = new Map();
/** A source image, trimmed to its visible pixels (opaque sources stay whole). */
export async function source(name, { trim = true } = {}) {
  const key = `${name}:${trim}`;
  if (!cache.has(key)) {
    const file = path.join(RAW, `${name}.webp`);
    if (!existsSync(file)) throw new Error(`missing source ${name} (run: node tools/gen-art.mjs ${name})`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const img = { w: info.width, h: info.height, data };
    cache.set(key, trim ? crop(img, bbox(img)) : img);
  }
  return cache.get(key);
}

export function blank(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}

/** Bounding box [x, y, w, h] of pixels with alpha above the threshold. */
export function bbox(img, threshold = 8) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? [0, 0, img.w, img.h] : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

export function crop(img, [x, y, w, h]) {
  const out = blank(w, h);
  for (let r = 0; r < h; r++) img.data.copy(out.data, r * w * 4, ((y + r) * img.w + x) * 4, ((y + r) * img.w + x + w) * 4);
  return out;
}

/** High-quality resize to w x h (premultiplied, so edges don't fringe). */
export async function resize(img, w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const { data, info } = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** Alpha-composite src onto dst at (x, y), with optional opacity. Mutates dst. */
export function paste(dst, src, x, y, opacity = 1) {
  x = Math.round(x);
  y = Math.round(y);
  for (let r = 0; r < src.h; r++) {
    const dy = y + r;
    if (dy < 0 || dy >= dst.h) continue;
    for (let c = 0; c < src.w; c++) {
      const dx = x + c;
      if (dx < 0 || dx >= dst.w) continue;
      const si = (r * src.w + c) * 4;
      const sa = (src.data[si + 3] / 255) * opacity;
      if (sa <= 0) continue;
      const di = (dy * dst.w + dx) * 4;
      const da = dst.data[di + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) dst.data[di + k] = Math.round((src.data[si + k] * sa + dst.data[di + k] * da * (1 - sa)) / oa);
      dst.data[di + 3] = Math.round(oa * 255);
    }
  }
  return dst;
}

/**
 * Scale img to fit a box (in output pixels) inside a w x h canvas.
 * mode 'contain' keeps it all visible; 'cover' fills the box and crops.
 * ax/ay place it in the box: 0 = left/top, 0.5 = centre, 1 = right/bottom.
 */
export async function place(img, w, h, { box = [0, 0, w, h], mode = 'contain', ax = 0.5, ay = 0.5 } = {}) {
  const [bx, by, bw, bh] = box;
  const k = mode === 'cover' ? Math.max(bw / img.w, bh / img.h) : Math.min(bw / img.w, bh / img.h);
  const r = await resize(img, img.w * k, img.h * k);
  const out = blank(w, h);
  return paste(out, r, bx + (bw - r.w) * ax, by + (bh - r.h) * ay);
}

/** Inverse-mapped warp: fn(x, y) gives the source position for output pixel (x, y). */
export function warp(img, fn, w = img.w, h = img.h) {
  const out = blank(w, h);
  const s = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx, sy] = fn(x + 0.5, y + 0.5);
      const fx = sx - 0.5, fy = sy - 0.5;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      // Bilinear on premultiplied colour.
      let r = 0, g = 0, b = 0, a = 0;
      for (const [cx, cy, wt] of [[x0, y0, (1 - tx) * (1 - ty)], [x0 + 1, y0, tx * (1 - ty)], [x0, y0 + 1, (1 - tx) * ty], [x0 + 1, y0 + 1, tx * ty]]) {
        if (cx < 0 || cy < 0 || cx >= img.w || cy >= img.h || wt === 0) continue;
        const i = (cy * img.w + cx) * 4;
        const pa = (s[i + 3] / 255) * wt;
        r += s[i] * pa;
        g += s[i + 1] * pa;
        b += s[i + 2] * pa;
        a += pa;
      }
      const o = (y * w + x) * 4;
      if (a > 0) {
        out.data[o] = Math.round(r / a);
        out.data[o + 1] = Math.round(g / a);
        out.data[o + 2] = Math.round(b / a);
        out.data[o + 3] = Math.round(a * 255);
      }
    }
  }
  return out;
}

/** Rotate by deg (clockwise) about (cx, cy), keeping the canvas size. */
export function rotate(img, deg, cx = img.w / 2, cy = img.h / 2) {
  const a = (-deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return warp(img, (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}

/** Per-pixel colour transform: fn(r, g, b, a) -> [r, g, b, a] (0..255). */
export function tint(img, fn) {
  const out = { w: img.w, h: img.h, data: Buffer.from(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    const v = fn(out.data[i], out.data[i + 1], out.data[i + 2], out.data[i + 3]);
    for (let k = 0; k < 4; k++) out.data[i + k] = Math.max(0, Math.min(255, Math.round(v[k])));
  }
  return out;
}

export const brighten = (img, k) => tint(img, (r, g, b, a) => [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k, a]);
export const darken = (img, k) => tint(img, (r, g, b, a) => [r * (1 - k), g * (1 - k), b * (1 - k), a]);
export const fade = (img, k) => tint(img, (r, g, b, a) => [r, g, b, a * k]);

/** Frames laid out left to right (or top to bottom). */
export function strip(frames, vertical = false) {
  const fw = frames[0].w, fh = frames[0].h;
  const out = vertical ? blank(fw, fh * frames.length) : blank(fw * frames.length, fh);
  frames.forEach((f, i) => paste(out, f, vertical ? 0 : i * fw, vertical ? i * fh : 0));
  return out;
}

/** Copy a region of an image (in its pixels) as a new image. */
export const cut = (img, x, y, w, h) => crop(img, [Math.round(x), Math.round(y), Math.round(w), Math.round(h)]);

export async function png(img) {
  return sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Swimming motion for a creature drawn facing left: the body bends in a travelling wave
 * that grows towards the tail, so the tail sweeps while the head stays nearly still.
 * t in [0, 1) loops. amp is the tail's vertical swing in pixels.
 */
export function swim(img, t, { amp = img.h * 0.06, head = 0.3, waves = 0.9 } = {}) {
  const ph = t * Math.PI * 2;
  return warp(img, (x, y) => {
    const u = x / img.w; // 0 = nose (left), 1 = tail tip
    const k = smooth(head, 1, u) ** 1.3;
    const dy = amp * k * Math.sin(ph - u * waves * Math.PI * 2) + amp * 0.08 * Math.sin(ph);
    return [x, y - dy];
  });
}
