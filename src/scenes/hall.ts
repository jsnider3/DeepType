// Hall of Fame: ten rows per table, Rockwell13.

import { Sprite } from 'pixi.js';
import { game, Scene } from '../engine/app';
import { tex } from '../engine/assets';
import { dbutton } from '../engine/dialog';
import { font, textAt, type BitmapFont } from '../engine/font';
import { highScores } from '../game/profile';

const DIFF_ABBR: Record<string, string> = { easy: 'Easy', normal: 'Norm', hard: 'Hard', expert: 'Exp', xtreme: 'Xtr' };

/** Drop characters until the name fits in the width of "WWWWWWWW", then append "...". */
function truncate(f: BitmapFont, name: string): string {
  const max = f.measure('WWWWWWWW');
  if (f.measure(name) <= max) return name;
  let s = name;
  while (s.length && f.measure(`${s}...`) > max) s = s.slice(0, -1);
  return `${s}...`;
}

export class HallScene extends Scene {
  enter() {
    this.addChild(new Sprite(tex('high_score_bg')));
    const hs = highScores();
    const f = font('Rockwell13');
    for (let i = 0; i < 10; i++) {
      const y = 165 + i * 19;
      const a = hs.adventure[i];
      if (a) {
        this.addChild(textAt(f, truncate(f, a.name), 49, y, 0x000000));
        this.addChild(textAt(f, String(a.score), 0, y, 0x668b9f, 'right', 264));
        this.addChild(textAt(f, DIFF_ABBR[a.difficulty] ?? '', 281, y, 0xb29e58, 'center', 38));
      }
      const b = hs.abyss[i];
      if (b) {
        this.addChild(textAt(f, truncate(f, b.name), 389, y, 0x000000));
        this.addChild(textAt(f, String(b.level), 0, y, 0xb56b40, 'right', 581));
      }
    }
    const close = dbutton('Close', () => this.back(), 193, 27);
    close.position.set(221, 443);
    this.addChild(close);
  }

  private back() {
    void import('./selector').then(({ SelectorScene }) => game.set(new SelectorScene()));
  }

  onKey(key: string) {
    if (key === 'Escape' || key === 'Enter') this.back();
  }

  onChar(c: string) {
    if (c === ' ') this.back();
  }
}
