// List box look: grey box with a black outline, white Rockwell13 rows, the
// selected row darker and its text gold. Scrolls with the mouse wheel when it overflows.

import { Container, Graphics } from 'pixi.js';
import { play } from './audio';
import { font, textAt } from './font';

const BG = 0x808080;
const OUTLINE = 0x000000;
const TEXT = 0xffffff;
const HILITE = 0xffc856;
const SELECT = 0x646464;

export class ListWidget extends Container {
  selected = 0;
  private top = 0;
  private rowsLayer = new Container();
  private readonly rowH = 21;
  private lastClick = { i: -1, t: 0 };

  constructor(
    private items: string[],
    private w: number,
    private h: number,
    private onPick: (index: number, item: string) => void,
    private onActivate?: (index: number, item: string) => void,
  ) {
    super();
    this.addChild(new Graphics().rect(0, 0, w, h).fill(BG).stroke({ color: OUTLINE, width: 1 }));
    this.addChild(this.rowsLayer);
    const mask = new Graphics().rect(0, 0, w, h).fill(0xffffff);
    this.addChild(mask);
    this.rowsLayer.mask = mask;
    this.eventMode = 'static';
    this.on('wheel', (e) => {
      const max = Math.max(0, this.items.length - this.visibleRows);
      this.top = Math.max(0, Math.min(max, this.top + Math.sign(e.deltaY)));
      this.draw();
    });
    this.draw();
  }

  get visibleRows() {
    return Math.floor(this.h / this.rowH);
  }

  setItems(items: string[], selected = 0) {
    this.items = items;
    this.selected = selected;
    this.top = Math.max(0, Math.min(selected, items.length - this.visibleRows));
    this.draw();
  }

  get value() {
    return this.items[this.selected];
  }

  move(delta: number, notify = true) {
    this.selected = Math.max(0, Math.min(this.items.length - 1, this.selected + delta));
    if (this.selected < this.top) this.top = this.selected;
    if (this.selected >= this.top + this.visibleRows) this.top = this.selected - this.visibleRows + 1;
    if (notify) this.onPick(this.selected, this.items[this.selected]);
    this.draw();
  }

  private draw() {
    this.rowsLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const f = font('Rockwell13');
    for (let i = this.top; i < Math.min(this.items.length, this.top + this.visibleRows + 1); i++) {
      const y = (i - this.top) * this.rowH;
      const row = new Container();
      if (i === this.selected) row.addChild(new Graphics().rect(1, 0, this.w - 2, this.rowH).fill(SELECT));
      row.addChild(textAt(f, this.items[i], 6, 16, i === this.selected ? HILITE : TEXT));
      row.y = y;
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.hitArea = { contains: (x: number, yy: number) => x >= 0 && x < this.w && yy >= 0 && yy < this.rowH };
      row.on('pointertap', () => {
        const now = performance.now();
        const dbl = this.lastClick.i === i && now - this.lastClick.t < 400;
        this.lastClick = { i, t: now };
        play('buttonclick');
        this.selected = i;
        this.onPick(i, this.items[i]);
        this.draw();
        if (dbl) this.onActivate?.(i, this.items[i]);
      });
      this.rowsLayer.addChild(row);
    }
  }
}
