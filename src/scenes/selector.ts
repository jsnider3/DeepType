// Main menu: mode buttons, welcome text and profile/statistics links.

import { Container, Graphics, Sprite } from 'pixi.js';
import { DIFFICULTY_LABELS } from '../data/config';
import { game, Scene } from '../engine/app';
import { tex } from '../engine/assets';
import { musicOrder } from '../engine/audio';
import { dbutton, Dialog, dialogFrame } from '../engine/dialog';
import { font, textAt } from '../engine/font';
import { ListWidget } from '../engine/listwidget';
import { ImageButton } from '../engine/ui';
import { BoardScene } from '../game/board';
import { hasProfile, profile, saveProfiles } from '../game/profile';
import { Session } from '../game/session';
import { GAME_NAME } from '../game/brand';
import { DifficultyScene } from './difficulty';
import { HallScene } from './hall';
import { OptionsScene } from './options';
import { ProfileScene } from './profiles';
import { StatsScene } from './stats';
import { TitleScene } from './title';
import { TutorScene } from './tutor';

// Button positions; idle art is part of gameselector.jpg.
const BUTTONS: [string, number, number, string][] = [
  ['button_adventure', 303, 32, 'Adventure'],
  ['button_abyss', 303, 136, 'Abyss'],
  ['button_tutor', 303, 240, 'Typing Tutor'],
  ['button_hall', 307, 362, 'Hall of Fame'],
  ['button_options', 307, 404, 'Options'],
  ['button_quit', 511, 362, 'Quit'],
];

export class SelectorScene extends Scene {
  private dialog: Container | null = null;
  private dialogKeys: ((c: string) => void) | null = null;

  enter() {
    musicOrder(0x11);
    this.addChild(new Sprite(tex('gameselector')));
    for (const [img, x, y, label] of BUTTONS) {
      const b = new ImageButton(img, () => this.choose(label));
      b.position.set(x, y);
      this.addChild(b);
    }
    const f = font('Rockwell13');
    const name = hasProfile() ? profile().name : '';
    this.addChild(textAt(f, name ? `Welcome to ${GAME_NAME},` : `Welcome to ${GAME_NAME}!`, 35, 55, 0xffffff, 'center', 250));
    if (name) this.addChild(textAt(f, name, 35, 77, 0xffffff, 'center', 250));
    this.addChild(this.link('(Not you? Switch players here)', 163, 78 + 18, 0x8c3c00, () => game.set(new ProfileScene())));
    this.addChild(this.link('See how your typing is going', 163, 103 + 18, 0x964614, () => game.set(new StatsScene())));
  }

  /** Text link centred on `cx`: MyriadCondensedWeb12Bold, underlined, white on hover. */
  private link(text: string, cx: number, baseline: number, color: number, onClick: () => void) {
    const f = font('MyriadCondensedWeb12Bold');
    const c = new Container();
    const t = textAt(f, text, 0, f.ascent, color);
    const line = new Graphics().rect(0, f.ascent + 2, t.textWidth, 1).fill(0xffffff);
    line.tint = color;
    c.addChild(t, line);
    c.position.set(Math.round(cx - t.textWidth / 2), baseline - f.ascent);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerover', () => {
      t.tint = 0xffffff;
      line.tint = 0xffffff;
    });
    c.on('pointerout', () => {
      t.tint = color;
      line.tint = color;
    });
    c.on('pointertap', onClick);
    return c;
  }

  private choose(label: string) {
    if (this.dialog) return;
    switch (label) {
      case 'Adventure':
        return this.adventure();
      case 'Abyss':
        return this.abyss();
      case 'Typing Tutor':
        return game.set(new TutorScene());
      case 'Hall of Fame':
        return game.set(new HallScene());
      case 'Options':
        return game.push(new OptionsScene());
      case 'Quit':
        return this.showDialog(
          new Dialog('LEAVING?', 'Done diving for today?', [
            { label: 'YES', key: 'Y', action: () => game.set(new TitleScene()) },
            { label: 'NO', key: 'N', action: () => this.closeDialog() },
          ]),
        );
    }
  }

  private adventure() {
    const save = profile().adventure.save;
    if (!save) {
      game.set(new DifficultyScene());
      return;
    }
    const where = save.uncharted ? `level ${save.stage}, beyond the map` : `level ${save.stage}`;
    this.showDialog(
      new Dialog(
        'CONTINUE?',
        [`Your dive on ${where} (${DIFFICULTY_LABELS[save.difficulty]} difficulty) is still waiting for you.`, 'Pick up where you left off?'],
        [
          { label: 'YES', key: 'Y', action: () => game.set(new BoardScene(Session.fromSave(save))) },
          {
            label: 'NO',
            key: 'N',
            action: () => {
              profile().adventure.save = null;
              saveProfiles();
              game.set(new DifficultyScene());
            },
          },
        ],
      ),
    );
  }

  /** Abyss start dialog: pick a 400-ft checkpoint to resume from. */
  private abyss() {
    const deepest = Math.floor(profile().abyss.deepest / 400) * 400;
    if (deepest < 400) {
      this.startAbyss(0);
      return;
    }
    const items = ['(Start at the surface)'];
    for (let d = 400; d <= deepest; d += 400) items.push(`${d} feet`);
    const w = 352;
    const lh = 19;
    const listH = 5 * (lh + 2);
    const h = 180 + 5 * lh + 16;
    const box = dialogFrame(w, h, 'CONTINUE?');
    box.position.set(131, 34);
    const btnY = h - 24 - 32;
    const list = new ListWidget(items, w - 80, listH, () => {}, (_i, item) => this.startAbyss(parseInt(item, 10) || 0));
    list.setItems(items, items.length - 1);
    list.position.set(40, btnY - listH - 12);
    const ok = dbutton('OK', () => this.startAbyss(parseInt(list.value, 10) || 0), 112);
    ok.position.set(56, btnY);
    const cancel = dbutton('CANCEL', () => this.closeDialog(), 112);
    cancel.position.set(184, btnY);
    box.addChild(list, ok, cancel);
    box.addChild(textAt(font('Rockwell13'), 'Choose where to start your dive:', 0, 70, 0x000000, 'center', w));
    this.showDialog(box, (c) => {
      if (c === '\n') this.startAbyss(parseInt(list.value, 10) || 0);
      if (c === 'ArrowUp') list.move(-1);
      if (c === 'ArrowDown') list.move(1);
    });
  }

  private startAbyss(depth: number) {
    const s = new Session('abyss');
    if (depth === 0) s.charge = 0;
    const bossDue = depth > 0 ? s.resumeAbyssAt(depth) : false;
    game.set(new BoardScene(s, { abyssBossDue: bossDue }));
  }

  private showDialog(d: Container, keys?: (c: string) => void) {
    this.closeDialog();
    this.dialog = d;
    this.dialogKeys = keys ?? (d instanceof Dialog ? (c) => void d.key(c) : null);
    this.addChild(d);
  }

  private closeDialog() {
    this.dialog?.destroy({ children: true });
    this.dialog = null;
    this.dialogKeys = null;
  }

  onChar(c: string) {
    this.dialogKeys?.(c);
  }

  onKey(key: string) {
    if (key === 'Escape') {
      if (this.dialog) this.closeDialog();
      else this.choose('Quit');
    } else if (key === 'Enter') this.dialogKeys?.('\n');
    else this.dialogKeys?.(key);
  }
}
