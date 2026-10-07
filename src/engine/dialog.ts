// Dialog look: dialog.gif and dbutton.gif drawn as nine-slice boxes,
// header in Rockwell13Bold, lines and button labels in Rockwell13, all black; buttons
// along the bottom inside 40/20/40/40 insets. Dialogs don't dim the screen.

import { Container, Graphics, NineSliceSprite } from 'pixi.js';
import { tex } from './assets';
import { play } from './audio';
import { BitmapText, font, textAt, wrap } from './font';
import { HEIGHT, WIDTH } from './app';

export interface DialogButton {
  label: string;
  action: () => void;
  /** Keyboard shortcut (single character, compared case-insensitively). */
  key?: string;
}

export const DIALOG_TEXT = 0x000000;
export const INSET = { l: 40, t: 20, r: 40, b: 40 };

/** DialogButton: nine-slice dbutton, Rockwell13 label (black, white on hover), +1,+1 when pressed. */
export function dbutton(label: string, onClick: () => void, width = 115, height = 32, opts: { image?: string; labelColor?: number } = {}): Container {
  const c = new Container();
  const inner = new Container();
  const img = opts.image ?? 'dbutton';
  const bg = new NineSliceSprite({ texture: tex(img), leftWidth: 38, topHeight: 10, rightWidth: 38, bottomHeight: 10 });
  bg.width = width;
  bg.height = height;
  const f = font('Rockwell13');
  const base = opts.labelColor ?? 0x000000;
  const t = new BitmapText(f, label, base);
  t.position.set(Math.round((width - t.textWidth) / 2), Math.round((height - f.ascent / 6 - 1 + f.ascent) / 2) - f.ascent);
  inner.addChild(bg, t);
  c.addChild(inner);
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = { contains: (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height };
  let down = false;
  c.on('pointerover', () => (t.tint = 0xffffff));
  c.on('pointerout', () => {
    t.tint = base;
    down = false;
    inner.position.set(0, 0);
  });
  c.on('pointerdown', () => {
    down = true;
    inner.position.set(1, 1);
  });
  c.on('pointerup', () => {
    inner.position.set(0, 0);
    if (!down) return;
    down = false;
    play('buttonclick');
    onClick();
  });
  return c;
}

/** dialog.gif as a nine-slice box with a centred Rockwell13Bold header. */
export function dialogFrame(w: number, h: number, title = ''): Container {
  const c = new Container();
  const frame = new NineSliceSprite({ texture: tex('dialog'), leftWidth: 30, topHeight: 64, rightWidth: 30, bottomHeight: 24 });
  frame.width = w;
  frame.height = h;
  c.addChild(frame);
  if (title) {
    const f = font('Rockwell13Bold');
    c.addChild(textAt(f, title, 0, INSET.t + f.ascent, DIALOG_TEXT, 'center', w));
  }
  return c;
}

export class Dialog extends Container {
  readonly buttons: DialogButton[];
  readonly box: Container;

  constructor(
    title: string,
    body: string | string[],
    buttons: DialogButton[],
    opts: { width?: number; height?: number; x?: number; y?: number; dim?: boolean; align?: 'left' | 'center' } = {},
  ) {
    super();
    this.buttons = buttons;
    const w = opts.width ?? 360;
    if (opts.dim) this.addChild(new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({ color: 0x000000, alpha: 0.35 }));
    const f = font('Rockwell13');
    const cw = w - INSET.l - INSET.r - 4;
    const lines = (Array.isArray(body) ? body : [body]).flatMap((l) => (l ? wrap(f, l, cw) : ['']));
    const btnRows = buttons.length <= 2 ? 1 : Math.ceil(buttons.length / 2);
    const top = INSET.t + font('Rockwell13Bold').ascent + 25;
    const h = opts.height ?? Math.max(180, top + lines.length * 19 + 20 + btnRows * 40 + INSET.b);
    const box = dialogFrame(w, h, title);
    lines.forEach((l, i) => box.addChild(textAt(f, l, INSET.l + 2, top + f.ascent + i * 19, DIALOG_TEXT, opts.align ?? 'center', cw)));
    // Buttons: one full-width, or pairs (bw = (w - 88) / 2) from the bottom up.
    const bw = buttons.length === 1 ? w - INSET.l - INSET.r : Math.floor((w - INSET.l - INSET.r - 8) / 2);
    buttons.forEach((b, i) => {
      const row = Math.floor(i / 2);
      const lastRow = Math.floor((buttons.length - 1) / 2);
      const alone = buttons.length % 2 === 1 && i === buttons.length - 1;
      const width = buttons.length === 1 || alone ? w - INSET.l - INSET.r : bw;
      const btn = dbutton(b.label, b.action, width, 32);
      btn.position.set(alone || buttons.length === 1 ? INSET.l : INSET.l + (i % 2) * (bw + 8), h - INSET.b - 32 - (lastRow - row) * 40);
      box.addChild(btn);
    });
    box.position.set(opts.x ?? Math.round((WIDTH - w) / 2), opts.y ?? Math.round((HEIGHT - h) / 2));
    this.box = box;
    this.addChild(box);
  }

  /** Route a typed character to a button shortcut. Returns true if handled. */
  key(c: string): boolean {
    const b = this.buttons.find((x) => x.key && x.key.toUpperCase() === c.toUpperCase());
    if (b) b.action();
    return !!b;
  }
}
