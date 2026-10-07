import { Sprite } from 'pixi.js';
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../data/config';
import { game, Scene } from '../engine/app';
import { tex } from '../engine/assets';
import { dbutton, dialogFrame, DIALOG_TEXT } from '../engine/dialog';
import { font, textAt } from '../engine/font';
import { BoardScene } from '../game/board';
import { recommendedDifficulty } from '../game/profile';
import { Session } from '../game/session';
import { SelectorScene } from './selector';

/** Difficulty dialog: 300x423 at (170,40); the recommended button is highlighted. */
export class DifficultyScene extends Scene {
  enter() {
    this.addChild(new Sprite(tex('gameselector')));
    const rec = recommendedDifficulty();
    const lh = 19;
    const dlg = dialogFrame(300, 423, 'DIFFICULTY');
    dlg.position.set(170, 40);
    let shift = 0;
    DIFFICULTIES.forEach((d, i) => {
      if (d === rec) shift = 2 * lh;
      const y = 65 + i * 45 + shift;
      if (d === rec) dlg.addChild(textAt(font('Rockwell13'), 'Our pick for you:', 44, y - lh + 13, DIALOG_TEXT));
      const b = dbutton(DIFFICULTY_LABELS[d], () => this.start(d), 220, 40, {
        image: d === rec ? 'dbutton_hilight' : 'dbutton',
        labelColor: 0xffffff,
      });
      b.position.set(40, y);
      dlg.addChild(b);
    });
    const cancel = dbutton('Cancel', () => game.set(new SelectorScene()), 220, 32);
    cancel.position.set(40, 423 - 72);
    dlg.addChild(cancel);
    this.addChild(dlg);
  }

  onChar(c: string) {
    const n = Number(c);
    if (n >= 1 && n <= 5) this.start(DIFFICULTIES[n - 1]);
  }

  onKey(key: string) {
    if (key === 'Escape') game.set(new SelectorScene());
  }

  private start(d: Difficulty) {
    game.set(new BoardScene(new Session(d)));
  }
}
