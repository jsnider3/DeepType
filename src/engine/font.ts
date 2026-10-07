// PopCap ImageFont descriptors (data/*.txt) and a text renderer for them.
//
// Script grammar: `Define Name value;`, `CreateLayer L;`, `LayerSetImage L 'path';`,
// `LayerSetImageMap L CharList RectList;`, `LayerSetCharWidths L CharList WidthList;`,
// `LayerSetCharOffsets L CharList OffsetList;`, `LayerSetKerningPairs L Pairs Values;`,
// `LayerSetAscent L n;`. Values are numbers, quoted strings/chars, or ( lists ).

import { Container, Sprite, Texture } from 'pixi.js';
import { data, hasTex, sub } from './assets';

type Val = number | string | Val[];

interface Glyph {
  tex?: Texture;
  width: number;
  ox: number;
  oy: number;
}

function tokenize(src: string): string[] {
  const out: string[] = [];
  const re = /\s*(?:(\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([(),;])|([^\s(),;'"]+))/gy;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) && m[0].length) {
    if (m[1]) continue;
    out.push(m[2] ?? m[3] ?? m[4]);
  }
  return out;
}

function parseValue(toks: string[], i: { p: number }): Val {
  const t = toks[i.p++];
  if (t === '(') {
    const list: Val[] = [];
    while (toks[i.p] !== ')' && i.p < toks.length) {
      if (toks[i.p] === ',') {
        i.p++;
        continue;
      }
      list.push(parseValue(toks, i));
    }
    i.p++;
    return list;
  }
  if (t.startsWith("'") || t.startsWith('"')) return t.slice(1, -1).replace(/\\(.)/g, '$1');
  const n = Number(t);
  return Number.isNaN(n) ? t : n;
}

export class BitmapFont {
  readonly glyphs = new Map<string, Glyph>();
  readonly kerning = new Map<string, number>();
  ascent = 0;
  height = 0;

  constructor(descriptor: string, imageOverride?: string) {
    const toks = tokenize(data(descriptor));
    const defs = new Map<string, Val>();
    const resolve = (v: Val): Val => (typeof v === 'string' && defs.has(v) ? defs.get(v)! : v);
    let image = imageOverride ?? '';
    let rects: [string[], number[][]] | null = null;
    const widths: [string[], number[]][] = [];
    let offsets: [string[], number[][]] | null = null;

    let i = { p: 0 };
    while (i.p < toks.length) {
      const cmd = toks[i.p++];
      const args: Val[] = [];
      while (i.p < toks.length && toks[i.p] !== ';') args.push(parseValue(toks, i));
      i.p++;
      switch (cmd) {
        case 'Define':
          defs.set(String(args[0]), args[1]);
          break;
        case 'LayerSetImage':
          if (!imageOverride) image = String(args[1]).split('/').pop()!.replace(/^_/, '');
          break;
        case 'LayerSetImageMap':
          rects = [resolve(args[1]) as string[], resolve(args[2]) as number[][]];
          break;
        case 'LayerSetCharWidths':
          widths.push([resolve(args[1]) as string[], resolve(args[2]) as number[]]);
          break;
        case 'LayerSetCharOffsets':
          offsets = [resolve(args[1]) as string[], resolve(args[2]) as number[][]];
          break;
        case 'LayerSetKerningPairs': {
          const pairs = resolve(args[1]) as string[];
          const vals = resolve(args[2]) as number[];
          pairs.forEach((p, k) => this.kerning.set(p, vals[k]));
          break;
        }
        case 'LayerSetAscent':
          this.ascent = Number(args[1]);
          break;
      }
    }
    if (!hasTex(image)) throw new Error(`Font image ${image} missing for ${descriptor}`);
    if (rects) {
      rects[0].forEach((c, k) => {
        const [x, y, w, h] = rects![1][k];
        this.height = Math.max(this.height, h);
        this.glyphs.set(c, { tex: w > 0 && h > 0 ? sub(image, x, y, w, h) : undefined, width: w, ox: 0, oy: 0 });
      });
    }
    for (const [chars, ws] of widths) {
      chars.forEach((c, k) => {
        const g = this.glyphs.get(c) ?? { width: 0, ox: 0, oy: 0 };
        g.width = ws[k];
        this.glyphs.set(c, g);
      });
    }
    if (offsets) {
      offsets[0].forEach((c, k) => {
        const g = this.glyphs.get(c);
        if (g) [g.ox, g.oy] = offsets![1][k];
      });
    }
  }

  measure(text: string): number {
    let w = 0;
    for (let k = 0; k < text.length; k++) {
      w += this.glyphs.get(text[k])?.width ?? 0;
      if (k + 1 < text.length) w += this.kerning.get(text[k] + text[k + 1]) ?? 0;
    }
    return w;
  }
}

/** A line of bitmap-font text. Position is the top-left of the line box. */
export class BitmapText extends Container {
  private _text = '';
  private _tint = 0xffffff;

  constructor(readonly font: BitmapFont, text = '', tint = 0xffffff) {
    super();
    this._tint = tint;
    this.text = text;
  }

  get text() {
    return this._text;
  }
  set text(v: string) {
    if (v === this._text && this.children.length) return;
    this._text = v;
    this.removeChildren().forEach((c) => c.destroy());
    let x = 0;
    for (let k = 0; k < v.length; k++) {
      const g = this.font.glyphs.get(v[k]);
      if (g?.tex) {
        const s = new Sprite(g.tex);
        s.position.set(x + g.ox, g.oy);
        s.tint = this._tint;
        this.addChild(s);
      }
      x += g?.width ?? 0;
      if (k + 1 < v.length) x += this.font.kerning.get(v[k] + v[k + 1]) ?? 0;
    }
  }

  set tint(c: number) {
    this._tint = c;
    for (const s of this.children) (s as Sprite).tint = c;
  }

  /** Recolor glyphs individually (e.g. typed vs remaining letters). */
  tintRange(from: number, to: number, color: number) {
    let gi = 0;
    for (let k = 0; k < this._text.length; k++) {
      const g = this.font.glyphs.get(this._text[k]);
      if (!g?.tex) continue;
      if (k >= from && k < to) (this.children[gi] as Sprite).tint = color;
      gi++;
    }
  }

  get textWidth() {
    return this.font.measure(this._text);
  }
}

const fonts = new Map<string, BitmapFont>();
export function font(name: string, image?: string): BitmapFont {
  const key = `${name}|${image ?? ''}`;
  let f = fonts.get(key);
  if (!f) {
    f = new BitmapFont(`${name}.txt`, image);
    fonts.set(key, f);
  }
  return f;
}

/** Greedy word wrap to a pixel width. */
export function wrap(f: BitmapFont, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && f.measure(next) > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Text placed by baseline (y = baseline). */
export function textAt(
  f: BitmapFont, s: string, x: number, baseline: number, color: number,
  align: 'left' | 'center' | 'right' = 'left', width = 0,
): BitmapText {
  const t = new BitmapText(f, s, color);
  const w = t.textWidth;
  t.position.set(Math.round(align === 'left' ? x : align === 'center' ? x + (width - w) / 2 : x + width - w), baseline - f.ascent);
  return t;
}

/** Several coloured runs drawn back to back (WriteString with ^RRGGBB^ codes). */
export function runs(
  f: BitmapFont, parts: [string, number][], x: number, baseline: number,
  align: 'left' | 'center' | 'right' = 'left', width = 0,
): Container {
  const c = new Container();
  let cx = 0;
  for (const [s, color] of parts) {
    const t = new BitmapText(f, s, color);
    t.position.set(cx, 0);
    cx += t.textWidth;
    c.addChild(t);
  }
  c.position.set(Math.round(align === 'left' ? x : align === 'center' ? x + (width - cx) / 2 : x + width - cx), baseline - f.ascent);
  return c;
}
