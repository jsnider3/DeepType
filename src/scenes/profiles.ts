// Player selection, new-player and remove-player dialogs. At most 10 players.

import { Container, Graphics, NineSliceSprite, Sprite } from 'pixi.js';
import { game, Scene } from '../engine/app';
import { tex } from '../engine/assets';
import { dbutton, Dialog, dialogFrame, DIALOG_TEXT } from '../engine/dialog';
import { BitmapText, font, textAt, wrap } from '../engine/font';
import { ListWidget } from '../engine/listwidget';
import { deleteProfile, hasProfile, profile, profileNames, selectProfile, typeNameChar, validateNewName } from '../game/profile';
import { applyOptions } from './options';
import { TutorScene } from './tutor';

const CREATE = '(Add a New Player)';
const DELETE = '(Remove a Player)';
const MAX_USERS = 10;

type Mode = 'select' | 'new' | 'delete';

export class ProfileScene extends Scene {
  private mode: Mode = 'select';
  private layer = new Container();
  private popup: Dialog | null = null;
  private list?: ListWidget;
  private typedName = '';
  private nameText?: BitmapText;
  private caret = 0;
  private caretLine?: Graphics;
  private toDelete = '';

  enter() {
    this.addChild(new Sprite(tex('gameselector')), this.layer);
    if (profileNames().length === 0) this.mode = 'new';
    this.build();
  }

  private items(): string[] {
    const names = profileNames();
    const out: string[] = [];
    if (names.length < MAX_USERS) out.push(CREATE);
    out.push(...names);
    if (names.length >= MAX_USERS) out.push(DELETE);
    return out;
  }

  private build() {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.list = undefined;
    this.nameText = undefined;
    this.caretLine = undefined;
    if (this.mode === 'new') return this.buildNew();
    if (this.mode === 'delete') return this.buildDelete();

    const w = 352;
    const lh = 19;
    const listH = 6 * (lh + 2);
    const h = 66 + listH + 16 + 32 + 40;
    const box = dialogFrame(w, h, "WHO'S DIVING?");
    box.position.set(131, 34);
    const items = this.items();
    const current = hasProfile() ? profile().name : '';
    const btnY = h - 40 - 32;
    this.list = new ListWidget(items, w - 80, listH, (_i, item) => this.picked(item), () => this.ok());
    this.list.setItems(items, Math.max(0, items.indexOf(current)));
    this.list.position.set(40, btnY - listH - 16);
    const bw = Math.floor((w - 80 - 48) / 2);
    const ok = dbutton('OK', () => this.ok(), bw);
    ok.position.set(40 + 16, btnY);
    const cancel = dbutton('CANCEL', () => this.back(), bw);
    cancel.position.set(40 + 32 + bw, btnY);
    box.addChild(this.list, ok, cancel);
    this.layer.addChild(box);
  }

  private picked(item: string) {
    if (item === CREATE) {
      this.mode = 'new';
      this.typedName = '';
      this.build();
    } else if (item === DELETE) {
      this.mode = 'delete';
      this.build();
    }
  }

  private ok() {
    const v = this.list?.value;
    if (!v || v === CREATE || v === DELETE) return this.picked(v ?? CREATE);
    selectProfile(v);
    applyOptions();
    this.back();
  }

  private buildNew() {
    const w = 316;
    const h = 240;
    const box = dialogFrame(w, h, 'NEW PLAYER');
    box.position.set(250 - 88, 32 + 60);
    const f = font('Rockwell13');
    const prompt = ['Type your name below.', ...wrap(f, '(For instance "Maya" or "Maya Torres")', w - 80)];
    prompt.forEach((l, i) => box.addChild(textAt(f, l, 0, 72 + i * 19, DIALOG_TEXT, 'center', w)));
    // EditWidget framed by editbox.gif as a 3-slice, grown by 4 px.
    const ex = 48;
    const ey = h - 110;
    const frame = new NineSliceSprite({ texture: tex('editbox'), leftWidth: 32, rightWidth: 32, topHeight: 0, bottomHeight: 0 });
    frame.width = w - 96 + 8;
    frame.height = 32;
    frame.position.set(ex - 4, ey - 4);
    // The EditWidget paints its own white field inside the dark editbox frame.
    const field = new Graphics().rect(ex, ey, w - 96, 24).fill(0xffffff);
    this.nameText = new BitmapText(f, '', 0x4b4b4b);
    this.nameText.position.set(ex + 4, ey + 3);
    const bw = Math.floor((w - 88) / 2);
    const ok = dbutton('OK', () => this.commitName(), bw);
    ok.position.set(40, h - 72);
    const cancel = dbutton('CANCEL', () => this.cancelNew(), bw);
    cancel.position.set(40 + bw + 8, h - 72);
    // Rockwell13 has no '|' glyph, so the caret is a drawn line.
    this.caretLine = new Graphics().rect(0, 0, 1, 18).fill(0x000000);
    this.caretLine.y = ey + 3;
    box.addChild(frame, field, this.nameText, this.caretLine, ok, cancel);
    this.layer.addChild(box);
  }

  private cancelNew() {
    if (!profileNames().length) return;
    this.mode = 'select';
    this.build();
  }

  private commitName() {
    const n = this.typedName.trim();
    const problem = validateNewName(n, profileNames());
    if (problem) return this.message(...problem);
    selectProfile(n);
    applyOptions();
    this.mode = 'select';
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.nameText = undefined;
    this.caretLine = undefined;
    this.showPopup(
      new Dialog(
        'TYPING CHECK?',
        [
          'Want to take a quick typing test to find out how many words per minute you can type?',
          '',
          'The result helps us suggest a difficulty that suits you. You can retake the test any time.',
        ],
        [
          { label: 'YES', key: 'Y', action: () => game.set(new TutorScene(0)) },
          { label: 'NO', key: 'N', action: () => this.back() },
        ],
      ),
    );
  }

  private buildDelete() {
    const w = 352;
    const lh = 19;
    const listH = 5 * (lh + 2);
    const h = 220 + listH;
    const box = dialogFrame(w, h, 'REMOVE A PLAYER');
    box.position.set(131, 20);
    const f = font('Rockwell13');
    ['Pick a player to erase.', 'Their scores and saved games', 'will be gone for good!'].forEach((l, i) =>
      box.addChild(textAt(f, l, 0, 70 + i * lh, DIALOG_TEXT, 'center', w)),
    );
    const btnY = h - 40 - 32;
    const names = profileNames();
    this.list = new ListWidget(names, w - 80, listH, () => {}, () => this.confirmDelete());
    this.list.position.set(40, btnY - listH - 16);
    const bw = Math.floor((w - 80 - 48) / 2);
    const ok = dbutton('OK', () => this.confirmDelete(), bw);
    ok.position.set(56, btnY);
    const cancel = dbutton('CANCEL', () => {
      this.mode = 'select';
      this.build();
    }, bw);
    cancel.position.set(72 + bw, btnY);
    box.addChild(this.list, ok, cancel);
    this.layer.addChild(box);
  }

  private confirmDelete() {
    this.toDelete = this.list?.value ?? '';
    if (!this.toDelete) return;
    this.showPopup(
      new Dialog('ARE YOU SURE?', ['Erase the player', `'${this.toDelete}'`, 'and all of their progress?'], [
        {
          label: 'YES',
          key: 'Y',
          action: () => {
            deleteProfile(this.toDelete);
            this.closePopup();
            this.mode = profileNames().length ? 'select' : 'new';
            this.build();
          },
        },
        { label: 'NO', key: 'N', action: () => this.closePopup() },
      ]),
    );
  }

  private message(title: string, text: string) {
    this.showPopup(new Dialog(title, text, [{ label: 'OK', key: ' ', action: () => this.closePopup() }], { width: 370 }));
  }

  private showPopup(d: Dialog) {
    this.closePopup();
    this.popup = d;
    this.addChild(d);
  }

  private closePopup() {
    this.popup?.destroy({ children: true });
    this.popup = null;
  }

  private back() {
    void import('./selector').then(({ SelectorScene }) => game.set(new SelectorScene()));
  }

  update() {
    if (this.nameText && this.caretLine) {
      this.caret++;
      this.nameText.text = this.typedName;
      this.caretLine.x = this.nameText.x + this.nameText.textWidth + 1;
      this.caretLine.visible = Math.floor(this.caret / 40) % 2 === 0;
    }
  }

  onChar(c: string) {
    if (this.popup) {
      this.popup.key(c);
      return;
    }
    if (this.mode !== 'new') return;
    const f = font('Rockwell13');
    this.typedName = typeNameChar(this.typedName, c, (s) => f.measure(s));
  }

  onKey(key: string) {
    if (this.popup) {
      if (key === 'Enter' || key === 'Escape') this.popup.buttons[this.popup.buttons.length - 1].action();
      return;
    }
    if (this.mode === 'new') {
      if (key === 'Backspace') this.typedName = this.typedName.slice(0, -1);
      else if (key === 'Enter') this.commitName();
      else if (key === 'Escape') this.cancelNew();
      return;
    }
    if (key === 'ArrowUp') this.list?.move(-1, false);
    else if (key === 'ArrowDown') this.list?.move(1, false);
    else if (key === 'Enter') this.mode === 'delete' ? this.confirmDelete() : this.ok();
    else if (key === 'Escape') {
      if (this.mode === 'delete') {
        this.mode = 'select';
        this.build();
      } else if (hasProfile()) this.back();
    }
  }
}

