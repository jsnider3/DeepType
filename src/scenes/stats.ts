// Statistics screen: Adventure / Abyss / Typing Tutor tabs, each with its own panel.

import { Container, Graphics, NineSliceSprite, Sprite } from 'pixi.js';
import { game, Scene } from '../engine/app';
import { activePack, tex } from '../engine/assets';
import { play } from '../engine/audio';
import { dbutton } from '../engine/dialog';
import { font, runs, textAt, wrap } from '../engine/font';
import { profile } from '../game/profile';

type Tab = 'adventure' | 'abyss' | 'tutor';
const TABS: [Tab, string][] = [['adventure', 'Adventure Mode'], ['abyss', 'Abyss Mode'], ['tutor', 'Typing Tutor']];
const VALUE = 0xa68856;
const GEMS = ['gem_green', 'gem_orange', 'gem_purple', 'gem_red', 'gem_white', 'gem_yellow'];
const PANEL_Y = 46;

export class StatsScene extends Scene {
  private tabs = new Container();
  private panel = new Container();
  private lesson = 0;
  private graph: 'wpm' | 'acc' | 'awpm' = 'wpm';
  private bars: { g: Graphics; target: number; h: number; x: number; color: number; label?: Container }[] = [];
  private barT = 0;

  constructor(private tab: Tab = 'adventure') {
    super();
  }

  enter() {
    this.addChild(new Sprite(tex('water1')), this.tabs);
    const bg = new Sprite(tex('tab_panel'));
    bg.position.set(0, 38);
    this.addChild(bg, this.panel);
    const close = dbutton('Close', () => this.back(), 100, 27, { image: 'tab_button' });
    close.position.set(480, 420);
    this.addChild(close);
    this.lesson = profile().lastLesson ?? 0;
    this.build();
  }

  private build() {
    this.tabs.removeChildren().forEach((c) => c.destroy({ children: true }));
    const f = font('Rockwell13');
    let x = 16;
    for (const [t, label] of TABS) {
      const w = Math.max(f.measure(label), 108) + 20;
      const c = new Container();
      const img = new NineSliceSprite({ texture: tex(t === this.tab ? 'tab_top' : 'tab_top_shadow'), leftWidth: 54, rightWidth: 54, topHeight: 0, bottomHeight: 0 });
      img.width = w;
      c.addChild(img, textAt(f, label, 0, f.ascent + 10, 0x000000, 'center', w));
      if (t !== this.tab) c.addChild(new Graphics().rect(0, 37, w, 1).fill(0x000000));
      c.position.set(x, 8);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => {
        play('buttonclick');
        this.tab = t;
        this.build();
      });
      this.tabs.addChild(c);
      x += w;
    }
    this.panel.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.bars = [];
    this.panel.y = PANEL_Y;
    if (this.tab === 'adventure') this.adventure();
    else if (this.tab === 'abyss') this.abyss();
    else this.tutor();
  }

  private rows(labels: [string, string | number][], firstBaseline: number) {
    const f = font('MyriadCondensedWeb14Bold');
    labels.forEach(([label, value], i) => {
      this.panel.addChild(runs(f, [[label, 0x000000], [String(value), VALUE]], 35, firstBaseline + i * 41));
    });
    return firstBaseline + (labels.length - 1) * 41;
  }

  private adventure() {
    const p = profile();
    const a = p.adventure;
    this.panel.addChild(textAt(font('Rockwell13Bold'), 'Adventure Record', 60, 35 + 16, 0x000000));
    const last = this.rows([
      ['Sharks zapped: ', a.sharksKilled],
      ['Piranhas popped: ', a.piranhasKilled],
      ['Bosses beaten: ', a.bossesKilled],
      ['Most treasure words in one dive: ', a.maxTreasureWords],
      ['Highest score: ', a.highScore],
    ], 95);
    this.panel.addChild(runs(font('Rockwell13'), [['Expeditions finished: ', 0x4f3c1a], [String(a.expeditions), 0xc5a34e]], 35, last + 6 + 41));
    const n = a.expeditions;
    if (n > 0) {
      const m = new Sprite(tex(n >= 5 ? 'medal_gold' : n >= 3 ? 'medal_silver' : 'medal_bronze'));
      m.position.set(336, 270);
      m.width = 66;
      m.height = 90;
      this.panel.addChild(m);
    }
    const tp = new Sprite(tex('tab_panel_treasure'));
    tp.position.set(408, 23);
    this.panel.addChild(tp);
    const f = font('Rockwell13');
    const b14 = font('MyriadCondensedWeb14Bold');
    this.panel.addChild(textAt(f, 'Gems collected:', 419, 42, 0x000000, 'center', 200));
    const gemPos = [[475, 90], [574, 90], [475, 142], [574, 142], [475, 195], [574, 195]];
    a.gems.forEach((v, i) => {
      // The original panel art has the gems painted in; ours has empty slots.
      if (activePack() === 'remastered') {
        const g = new Sprite(tex(GEMS[i]));
        g.position.set(gemPos[i][0] - 54, gemPos[i][1] - 32); // into the panel's gem sockets
        g.alpha = v ? 1 : 0.35;
        this.panel.addChild(g);
      }
      this.panel.addChild(textAt(b14, `x${v}`, gemPos[i][0], gemPos[i][1], VALUE));
    });
    this.panel.addChild(textAt(f, 'Secret finds:', 419, 246, 0x000000, 'center', 200));
    const secrets: [string, number, number, number, number][] = [
      ['secret_crown', 425, 267, 476, 292], ['secret_figurine', 425, 317, 476, 342],
      ['secret_necklace', 524, 267, 575, 292], ['secret_scepter', 524, 317, 575, 342],
    ];
    secrets.forEach(([img, x, y, tx, ty], i) => {
      const count = a.secrets[i];
      const s = new Sprite(tex(count ? img : 'tab_panel_question'));
      s.position.set(x + (count ? 0 : 12), y + (count ? 0 : 6));
      this.panel.addChild(s);
      if (count) this.panel.addChild(textAt(b14, `x${count}`, tx, ty, VALUE));
    });
  }

  private abyss() {
    const a = profile().abyss;
    this.panel.addChild(textAt(font('Rockwell13Bold'), 'Abyss Record', 60, 80 + 16, 0x000000));
    const last = this.rows([
      ['Deepest dive (feet): ', a.deepest],
      ['Sharks zapped: ', a.sharksKilled],
      ['Piranhas popped: ', a.piranhasKilled],
      ['Bosses beaten: ', a.bossesKilled],
    ], 154);
    this.panel.addChild(runs(font('Rockwell13'), [['Best score: ', 0x4f3c1a], [String(a.highScore), 0xc5a34e]], 35, last + 41));
    const img = new Sprite(tex('abyss_boss'));
    img.position.set(324, 24);
    this.panel.addChild(img);
    const b14 = font('MyriadCondensedWeb14Bold');
    const kills: [string, number, number][] = [['Torpedo', 428, 172], ['GhostShip', 566, 172], ['MechaSquid', 566, 334], ['MechaShark', 428, 334]];
    for (const [type, x, y] of kills) this.panel.addChild(textAt(b14, `x${a.bossKills?.[type] ?? 0}`, x, y, VALUE));
  }

  private tutor() {
    const p = profile();
    const lessons = p.lessons;
    const prev = dbutton('Previous Lesson', () => this.setLesson(this.lesson - 1), 150, 27, { image: 'tab_button' });
    prev.position.set(60, 105);
    const next = dbutton('Next Lesson', () => this.setLesson(this.lesson + 1), 150, 27, { image: 'tab_button' });
    next.position.set(60, 75);
    if (this.lesson + 1 < lessons.length) this.panel.addChild(next);
    if (this.lesson > 0) this.panel.addChild(prev);
    const radios: ['wpm' | 'acc' | 'awpm', string, number][] = [['wpm', 'Words Per Minute', 305], ['acc', 'Accuracy', 341], ['awpm', 'Adjusted WPM', 377]];
    for (const [g, label, y] of radios) {
      const c = new Container();
      c.addChild(new Sprite(tex(this.graph === g ? 'tab_radiobtn_active' : 'tab_radiobtn_inactive')));
      c.addChild(textAt(font('Rockwell13'), label, 0, 23, 0x000000, 'center', 169));
      c.position.set(60, y);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => {
        play('buttonclick');
        this.graph = g;
        this.build();
      });
      this.panel.addChild(c);
    }
    const white = new Sprite(tex('tab_panel_white'));
    white.position.set(242, 59);
    this.panel.addChild(white);
    const name = this.lesson === 0 ? 'TYPING TEST' : `LESSON ${this.lesson}`;
    const kind = { wpm: 'Words Per Minute', acc: 'Accuracy', awpm: 'Adjusted WPM' }[this.graph];
    this.panel.addChild(textAt(font('Rockwell13Bold'), `${name}: ${kind}`, 245, 55 + 16, 0x000000, 'center', 350));
    const rec = lessons[this.lesson];
    const [best, last] =
      this.graph === 'wpm' ? [rec.bestWpm, rec.lastWpm] : this.graph === 'acc' ? [rec.bestAcc, rec.lastAcc] : [rec.bestAdjWpm, rec.lastAdjWpm];
    const sum = this.graph === 'wpm' ? rec.sumWpm : this.graph === 'acc' ? rec.sumAcc : rec.sumAdjWpm;
    const avg = rec.attempts ? Math.trunc(sum / rec.attempts) : 0;
    const f = font('Rockwell13');
    const desc =
      rec.attempts === 0 || (best === 0 && last === 0)
        ? `No ${this.graph === 'acc' ? 'accuracy' : this.graph === 'awpm' ? 'adjusted WPM' : 'WPM'} score here yet. Give this lesson another go!`
        : {
            wpm: 'Your raw typing speed in words per minute (WPM). Mistakes are not counted against it here.',
            awpm: 'Your speed in words per minute after a deduction for every mistake you made (AWPM).',
            acc: 'How many of your keystrokes were correct. The higher it climbs, the fewer slips you made.',
          }[this.graph];
    wrap(f, desc, 365).slice(0, 2).forEach((l, i) => this.panel.addChild(textAt(f, l, 250, 79 + f.ascent + i * 19, 0x000000)));
    if (rec.attempts === 0) return;

    // Axes and grid.
    const max = this.graph === 'acc' ? 100 : Math.max(best, last, 1);
    const step = this.graph === 'acc' ? 10 : max > 9 ? 10 : 1;
    const n = this.graph === 'acc' ? 11 : Math.floor(max / step) + 2;
    const spacing = this.graph === 'acc' ? 19 : 212 / n;
    const g = new Graphics();
    const small = font('MyriadCondensedWeb12Bold');
    for (let i = 1; i < n; i++) {
      g.rect(273, 340 - spacing * i, 309, 2).fill(0x000000);
      this.panel.addChild(textAt(small, String(step * i), 0, 340 - spacing * i + small.ascent / 2, 0x000000, 'right', 271));
    }
    g.rect(273, 340, 309, 2).fill(0xffcc00).rect(273, 340 - 266, 2, 266).fill(0xffcc00);
    this.panel.addChild(g);
    const barH = (v: number) => spacing * Math.floor(v / step) + (v % step);
    const specs: [string, number, number, number][] = [['Average', 295, 0x0000ff, avg], ['Best', 405, 0xff0000, best], ['Latest Attempt', 515, 0x00ff00, last]];
    for (const [label, x, color, v] of specs) {
      const bar = new Graphics();
      this.panel.addChild(bar);
      const vt = textAt(font('Rockwell13Bold'), this.graph === 'acc' ? `${v}%` : String(v), x, 0, 0xffffff, 'center', 60);
      this.panel.addChild(vt);
      wrap(small, label, 60).forEach((l, i) => this.panel.addChild(textAt(small, l, x, 360 + i * 14, 0x000000, 'center', 60)));
      this.bars.push({ g: bar, target: barH(v), h: 0, x, color, label: vt });
    }
    this.barT = 0;
  }

  private setLesson(i: number) {
    this.lesson = Math.max(0, Math.min(profile().lessons.length - 1, i));
    this.build();
  }

  update() {
    // Bars grow 20 px per update after a short delay.
    if (!this.bars.length || ++this.barT < 5) return;
    for (const b of this.bars) {
      b.h = Math.min(b.target, b.h + 20);
      b.g.clear();
      if (b.h > 0) {
        b.g.rect(b.x + 5, 345 - b.h, 60, Math.max(0, b.h - 5)).fill({ color: 0x141414, alpha: 0.5 });
        b.g.rect(b.x, 340 - b.h, 60, b.h).fill({ color: b.color, alpha: 0.5 });
      }
      if (b.label) b.label.y = 340 - b.h - 4 - font('Rockwell13Bold').ascent;
    }
  }

  private back() {
    void import('./selector').then(({ SelectorScene }) => game.set(new SelectorScene()));
  }

  onKey(key: string) {
    if (key === 'Escape') this.back();
  }
}
