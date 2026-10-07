// Victory dialog: 460x490 at (90,0) over the map after the final boss.

import { Sprite } from 'pixi.js';
import { game, Scene } from '../engine/app';
import { tex } from '../engine/assets';
import { musicOrder, play } from '../engine/audio';
import { Dialog } from '../engine/dialog';
import { font, runs, textAt, wrap } from '../engine/font';
import { addHighScore, profile, saveProfiles } from '../game/profile';
import type { Session } from '../game/session';
import { MapScene } from './map';

const COLLECTION: [string, number, number, number, number][] = [
  ['gem_green', 40, 270, 75, 292], ['gem_orange', 40, 305, 75, 327],
  ['gem_purple', 120, 270, 155, 292], ['gem_red', 120, 305, 155, 327],
  ['gem_white', 200, 270, 235, 292], ['gem_yellow', 200, 305, 235, 327],
  ['secret_crown', 280, 270, 315, 292], ['secret_figurine', 280, 305, 315, 327],
  ['secret_necklace', 360, 270, 395, 292], ['secret_scepter', 360, 305, 395, 327],
];

export class WinScene extends Scene {
  private dialog!: Dialog;

  constructor(private session: Session) {
    super();
  }

  enter() {
    const s = this.session;
    const p = profile();
    p.adventure.expeditions++;
    p.adventure.highScore = Math.max(p.adventure.highScore, s.score);
    const n = p.adventure.expeditions;
    saveProfiles();
    musicOrder(0x11);
    play('wingem');
    // The map has panned to show the whirlpool when this dialog opens.
    const map = new Sprite(tex('mapbg'));
    map.position.set(-60, -60);
    this.addChild(map);

    this.dialog = new Dialog('EXPEDITION COMPLETE!', [], [
      { label: 'RETURN HOME', key: 'H', action: () => this.home() },
      { label: 'KEEP GOING', key: 'K', action: () => game.set(new MapScene(this.session)) },
    ], { width: 460, height: 490, x: 90, y: 0 });
    const box = this.dialog.box;
    const f = font('Rockwell13');
    const B = 0x000000;
    const V = 0x4f3c1a;
    let y = 20 + 16 + 20 + 25;
    for (const l of wrap(f, 'You made it all the way through! Every journey you finish brings you closer to a shinier medal.', 460 - 84)) {
      box.addChild(textAt(f, l, 42, y, B));
      y += 19;
    }
    y += 19;
    const stats: [string, string][] = [
      ['Total Score: ', String(s.score)],
      ['Sharks Zapped: ', String(s.sharksKilled)],
      ['Piranhas Popped: ', String(s.piranhasKilled)],
      ['Adjusted WPM: ', String(s.adjustedWpm ?? 'N/A')],
      ['Accuracy: ', `${s.accuracy}%`],
    ];
    for (const [k, v] of stats) {
      box.addChild(runs(f, [[k, B], [v, V]], 160, y));
      y += 19;
    }
    if (n > 0) {
      const medal = new Sprite(tex(n >= 5 ? 'medal_gold' : n >= 3 ? 'medal_silver' : 'medal_bronze'));
      medal.position.set(76, 150);
      medal.width = 66;
      medal.height = 90;
      box.addChild(medal);
    }
    const counts = [...p.adventure.gems, ...p.adventure.secrets];
    COLLECTION.forEach(([img, x, iy, tx, ty], i) => {
      const icon = new Sprite(tex(img));
      icon.position.set(x, iy);
      icon.width = icon.height = 30;
      box.addChild(icon, textAt(f, `x${counts[i]}`, tx, ty, counts[i] ? B : 0x808080));
    });
    y = 350;
    for (const l of wrap(f, 'Head home to plan a new expedition and hunt for more gems, or press on into the bottomless sea ahead?', 460 - 84)) {
      box.addChild(textAt(f, l, 42, y, B));
      y += 19;
    }
    this.addChild(this.dialog);
  }

  private home() {
    const s = this.session;
    s.clearSave();
    addHighScore('adventure', { name: profile().name, score: s.score, difficulty: s.difficulty, level: s.stage });
    void import('./selector').then(({ SelectorScene }) => game.set(new SelectorScene()));
  }

  onChar(c: string) {
    this.dialog.key(c);
  }
}
