// Secret bonus level memory game: 22 clams with letters, four
// hide pearls (two white, two pink). Open matching pairs before the air runs out.

import { Container, Sprite, type Texture } from 'pixi.js';
import { grid } from '../engine/assets';
import { play } from '../engine/audio';
import { BitmapText, font } from '../engine/font';
import { rand } from './rng';

const ROWS: [number, number, number][] = [
  [170, 200, 5],
  [220, 175, 6],
  [280, 200, 5],
  [330, 175, 6],
];

type Pearl = 'none' | 'white' | 'pink';

class Clam extends Container {
  frame = 0;
  opening = false;
  closing = false;
  open = false;
  matched = false;
  private t = 0;
  private sprite = new Sprite();
  private letterText: BitmapText;
  private idleFrames: Texture[];
  private openFrames: Texture[];

  constructor(readonly letter: string, readonly pearl: Pearl) {
    super();
    const g = grid('clams', 10, 4);
    this.idleFrames = g.slice(0, 10);
    const row = pearl === 'white' ? 1 : pearl === 'pink' ? 3 : 2;
    this.openFrames = g.slice(row * 10, row * 10 + 10);
    this.sprite.texture = this.idleFrames[0];
    this.addChild(this.sprite);
    const t = new BitmapText(font('MyriadCondensedWeb15'), letter, 0xffffff);
    t.position.set(Math.round((50 - t.textWidth) / 2), Math.round((50 - t.font.height) / 2) + 6);
    this.label = letter;
    this.letterText = t;
    this.addChild(t);
    this.t = rand() % 40;
  }

  update() {
    this.t++;
    if (this.opening) {
      if (this.t % 4 === 0 && this.frame < 9) this.frame++;
      if (this.frame >= 9) {
        this.opening = false;
        this.open = true;
      }
      this.letterText.visible = this.frame < 3;
      this.sprite.texture = this.openFrames[this.frame];
    } else if (this.closing) {
      if (this.t % 4 === 0 && this.frame > 0) this.frame--;
      if (this.frame <= 0) {
        this.closing = false;
        this.open = false;
      }
      this.letterText.visible = this.frame < 3;
      this.sprite.texture = this.openFrames[this.frame];
    } else if (!this.open) {
      // Idle "breathing": ping-pong through the closed frames.
      const i = Math.floor(this.t / 6) % 18;
      this.sprite.texture = this.idleFrames[i < 10 ? i : 18 - i];
    }
  }

  doOpen() {
    this.opening = true;
    this.closing = false;
  }

  doClose() {
    if (this.matched) return;
    this.closing = true;
    this.opening = false;
  }
}

export class ClamGame extends Container {
  private clams: Clam[] = [];
  private pending: Clam | null = null;
  private emptyOpen: Clam | null = null;
  pairs = 0;

  constructor(private onScore: (n: number) => void) {
    super();
    const pearlSlots = new Set<number>();
    while (pearlSlots.size < 4) pearlSlots.add(rand() % 22);
    const colors: Pearl[] = ['white', 'white', 'pink', 'pink'];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let id = 0;
    for (const [y, x0, n] of ROWS) {
      for (let i = 0; i < n; i++, id++) {
        const letter = letters.splice(rand() % letters.length, 1)[0];
        const pearl = pearlSlots.has(id) ? colors.splice(rand() % colors.length, 1)[0] : 'none';
        const c = new Clam(letter, pearl);
        c.position.set(x0 + i * 50, y);
        this.clams.push(c);
        this.addChild(c);
      }
    }
  }

  get done() {
    return this.pairs >= 2;
  }

  update() {
    for (const c of this.clams) c.update();
  }

  /** Returns false if the key matched no clam. */
  key(c: string): boolean {
    const clam = this.clams.find((x) => x.letter === c && !x.open && !x.opening && !x.matched);
    if (!clam) {
      play('wrong');
      return false;
    }
    play('type');
    clam.doOpen();
    if (this.emptyOpen && this.emptyOpen !== clam) {
      this.emptyOpen.doClose();
      this.emptyOpen = null;
    }
    if (clam.pearl === 'none') {
      play('bad');
      this.pending?.doClose();
      this.pending = null;
      this.emptyOpen = clam;
      return true;
    }
    if (!this.pending) {
      play('treasure');
      this.pending = clam;
      return true;
    }
    if (this.pending.pearl === clam.pearl) {
      this.pending.matched = clam.matched = true;
      this.pending = null;
      this.pairs++;
      play('wingem');
      if (this.pairs === 1) play('wave_bonus3');
      this.onScore(this.pairs === 1 ? 100_000 : 200_000);
    } else {
      play('wrong');
      const other = this.pending;
      this.pending = null;
      other.doClose();
      setTimeout(() => clam.doClose(), 600);
    }
    return true;
  }
}
