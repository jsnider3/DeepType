// Typing Tutor: lessons with a keyboard/finger guide, WPM and accuracy results,
// pass/fail requirements. Lesson 0 is the typing test. Text positions below are baselines.

import { Container, Graphics, Sprite } from 'pixi.js';
import { DIFFICULTY_LABELS } from '../data/config';
import { parseLesson, type Lesson } from '../data/lessons';
import { game, Scene } from '../engine/app';
import { data, hasTex, tex } from '../engine/assets';
import { musicOrder, play } from '../engine/audio';
import { dbutton, Dialog } from '../engine/dialog';
import { font, textAt, wrap } from '../engine/font';
import { EState, Enemy, Jellyfish, Piranha, Shark, type EnemyHost } from '../game/enemy';
import { rand } from '../game/rng';
import { difficultyForWpm, profile, pushWpm, saveProfiles } from '../game/profile';
import { OptionsScene } from './options';
import { FINGER_POS, fingerFor, KEY_GLOW, keyFor, RING_POS, shiftSide } from './tutorlayout';

const LAST_LESSON = 18;

const DECOR_HOST: EnemyHost = {
  diverY: () => 200,
  onWordComplete: () => {},
  onAttack: (e) => (e.removed = true),
  onDiverHit: () => {},
  onRemove: (e) => (e.removed = true),
  onBubbleBurst: () => {},
};

export class TutorScene extends Scene {
  private lesson!: Lesson;
  private index: number;
  private state: 0 | 1 | 2 = 0;
  private task = 0;
  private line = 0;
  private col = 0;
  private firstLine = 0;
  private clean = true;
  private correct = 0;
  private firstTry = 0;
  private errors = 0;
  private tasksDone = 0;
  private seconds = 0;
  private remaining = -1;
  private secMs = 0;
  private glowMs = 0;
  private glowOn = true;
  private glowBlink = false;
  private cursorMs = 0;
  private cursorOn = true;
  private raw = 0;
  private adjusted = 0;
  private accuracy = 0;

  private decor = new Container();
  private decorFish: Enemy[] = [];
  private guide = new Container();
  private textLayer = new Container();
  private side = new Container();
  private buttons = new Container();
  private dialog: Dialog | null = null;
  private t = 0;

  constructor(index?: number) {
    super();
    const p = profile();
    let i = index ?? p.lastLesson ?? 0;
    if (index === undefined && i === 0 && p.lessons[0].status === 1) i = 1;
    this.index = i;
  }

  enter() {
    musicOrder(0x11);
    this.addChild(new Sprite(tex('water1')), this.decor, new Sprite(tex('tutor_bg')));
    this.addChild(this.guide, this.textLayer, this.side, this.buttons);
    this.load(this.index);
  }

  private load(i: number) {
    this.index = Math.max(0, Math.min(LAST_LESSON, i));
    profile().lastLesson = this.index;
    saveProfiles();
    this.lesson = parseLesson(data(`Lesson${this.index}.xml`), this.index);
    Object.assign(this, {
      state: 0, task: 0, line: 0, col: 0, firstLine: 0, clean: true, correct: 0, firstTry: 0, errors: 0,
      tasksDone: 0, seconds: 0, remaining: this.lesson.lessonTime, secMs: 0, glowBlink: false, glowOn: true,
    });
    this.buildButtons();
    this.redraw();
  }

  private buildButtons() {
    this.buttons.removeChildren().forEach((c) => c.destroy({ children: true }));
    // Button rects.
    if (this.index > 0) {
      const prev = dbutton('Prev', () => this.load(this.index - 1), 50, 30);
      prev.position.set(468, 380);
      this.buttons.addChild(prev);
    }
    if (this.index < LAST_LESSON) {
      const next = dbutton('Next', () => this.load(this.index + 1), 50, 30);
      next.position.set(587, 380);
      this.buttons.addChild(next);
    }
    const opts = dbutton('Options', () => game.push(new OptionsScene()), 170, 25);
    opts.position.set(466, 425);
    const back = dbutton('Back to Main Menu', () => this.confirmQuit(), 170, 25);
    back.position.set(466, 450);
    this.buttons.addChild(opts, back);
  }

  // ---------------------------------------------------------------- drawing

  private redraw() {
    this.drawSide();
    this.drawText();
    this.drawGuide();
  }

  private drawSide() {
    this.side.removeChildren().forEach((c) => c.destroy({ children: true }));
    const b14 = font('MyriadCondensedWeb14Bold');
    const gill = font('GillSansMT10Bold');
    const line = (y: number) => this.side.addChild(new Graphics().moveTo(472, y).lineTo(y === 86 ? 617 : 624, y).stroke({ color: 0x000000, width: 1 }));
    this.side.addChild(textAt(b14, this.index === 0 ? 'TYPING TEST' : `LESSON ${this.index}`, 472, 75, 0x000000));
    const st = profile().lessons[this.index]?.status;
    if (this.index >= 8 && st !== undefined && st >= 0) {
      this.side.addChild(textAt(b14, st === 1 ? 'PASSED!' : 'FAILED!', 472, 75, st === 1 ? 0x00dc00 : 0xff0000, 'right', 145));
    }
    line(86);
    const desc =
      this.state === 2
        ? 'Your raw speed in words per minute (WPM) appears below, with your adjusted WPM under it. The adjusted number knocks off points for every mistake you made along the way.'
        : this.lesson.description;
    wrap(gill, desc, 152).slice(0, 9).forEach((l, i) => this.side.addChild(textAt(gill, l, 472, 95 + gill.ascent + i * 14, 0x000000)));

    if (this.state === 2) {
      line(257);
      this.side.addChild(textAt(b14, 'STATISTICS', 508, 282, 0xff0000));
      line(295);
      this.side.addChild(textAt(b14, `${this.raw} WPM`, 472, 315, 0x000000));
      this.side.addChild(textAt(b14, `${this.adjusted} WPM Adjusted`, 472, 335, 0x000000));
      this.side.addChild(textAt(b14, `${this.accuracy}% Accuracy`, 472, 355, 0x000000));
      return;
    }
    line(247);
    if (this.lesson.lessonTime !== -1) {
      const r = Math.max(0, this.remaining);
      this.side.addChild(textAt(b14, `TIME ${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`, 508, 270, 0xff0000));
    }
    line(280);
    if (this.state === 0) this.side.addChild(textAt(b14, 'Just start typing!', 472, 300, 0x000000));
    else {
      const pct = Math.trunc((this.tasksDone / Math.max(1, this.lesson.tasks.length)) * 100);
      this.side.addChild(textAt(b14, `${pct}% COMPLETE`, 472, 300, 0x000000));
      this.side.addChild(textAt(b14, `${this.errors} ERRORS`, 472, 326, 0x000000));
    }
  }

  private drawText() {
    this.textLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (this.state === 2) return;
    const task = this.lesson.tasks[this.task];
    if (!task) return;
    const f = font('MyriadCondensedWeb14Bold');
    const heading = this.lesson.headings[task.heading - 1] ?? '';
    wrap(f, heading, 460).slice(0, 2).forEach((l, i) => this.textLayer.addChild(textAt(f, l, 10, 5 + f.ascent + i * 21, 0x00c8e6, 'center', 460)));
    const last = Math.min(this.firstLine + 4, task.lines.length);
    for (let li = this.firstLine; li < last; li++) {
      const row = li - this.firstLine;
      const base = 65 + 26 * row;
      const text = task.lines[li];
      const t = textAt(f, text, 16, base, 0xffffff);
      if (this.state === 1) {
        if (li < this.line) t.tint = 0x00ff00;
        else if (li === this.line) t.tintRange(0, this.col, 0x00ff00);
      }
      this.textLayer.addChild(t);
      if (li === this.line && this.cursorOn) {
        const x = 16 + f.measure(text.slice(0, this.col));
        const w = Math.max(4, f.measure(text[this.col] ?? ' '));
        this.textLayer.addChild(new Graphics().rect(x, base + 5, w, 1.5).fill(0xffffff));
      }
    }
  }

  private get expected(): string | undefined {
    return this.lesson.tasks[this.task]?.lines[this.line]?.[this.col];
  }

  private drawGuide() {
    this.guide.removeChildren().forEach((c) => c.destroy({ children: true }));
    const ch = this.state === 2 ? undefined : this.expected;
    const pressed = new Set<number>();
    const rings: [number, string][] = [];
    const glows: string[] = [];
    if (ch !== undefined) {
      const fi = fingerFor(ch);
      if (fi >= 0) {
        pressed.add(fi);
        rings.push([fi, ch === ' ' ? 'Space' : ch]);
      }
      const k = keyFor(ch);
      if (k) glows.push(k);
      const sh = shiftSide(ch);
      if (sh) {
        const sf = sh === 'rshift' ? 8 : 0;
        pressed.add(sf);
        rings.push([sf, 'Shift']);
        glows.push(sh);
      }
    }
    // Fingers 0-3 first, then 8..4; the hands art is drawn over them.
    for (const i of [0, 1, 2, 3, 8, 7, 6, 5, 4]) {
      const s = new Sprite(tex(`finger${i}${pressed.has(i) ? 'x' : ''}`));
      s.position.set(...FINGER_POS[i]);
      this.guide.addChild(s);
    }
    const hands = new Sprite(tex('hands'));
    hands.position.set(13, 379);
    this.guide.addChild(hands);
    const b14 = font('MyriadCondensedWeb14Bold');
    for (const [fi, label] of rings) {
      const [x, y] = RING_POS[fi];
      const r = new Sprite(tex('glowring'));
      r.position.set(x, y);
      this.guide.addChild(r, textAt(b14, label, x, y + 34, 0x000000, 'center', 58));
    }
    if (this.glowOn) {
      for (const g of glows) {
        const pos = KEY_GLOW[g];
        if (!pos || !hasTex(`glo_${g}`)) continue;
        const s = new Sprite(tex(`glo_${g}`));
        s.position.set(...pos);
        this.guide.addChild(s);
      }
    }
  }

  // ---------------------------------------------------------------- input

  onChar(c: string) {
    if (this.dialog) {
      this.dialog.key(c);
      return;
    }
    this.key(c);
  }

  onKey(key: string) {
    if (this.dialog) {
      if (key === 'Escape') this.closeDialog();
      return;
    }
    if (key === 'Enter') this.key('\n');
    else if (key === 'Escape') this.confirmQuit();
  }

  private key(c: string) {
    if (this.state === 2) return;
    const exp = this.expected;
    if (exp === undefined) return;
    if (this.state === 0) {
      this.state = 1;
      for (const f of this.decorFish) f.destroy({ children: true });
      this.decorFish = [];
    }
    const lineLen = this.lesson.tasks[this.task].lines[this.line].length;
    if ((this.col === 0 || this.col === lineLen - 1) && (c === '\n' || c === ' ') && c !== exp) {
      play('type'); // stray Enter/Space at a line boundary is ignored
      return;
    }
    if (c === exp) {
      this.correct++;
      if (this.clean) this.firstTry++;
      play(['type', 'type2', 'type3'][rand() % 3]);
      this.glowBlink = false;
      this.glowOn = true;
      this.cursorOn = true;
      this.cursorMs = 0;
      this.advance();
    } else {
      if (this.clean) {
        this.errors++;
        this.clean = false;
        this.glowBlink = true;
        this.glowMs = 0;
      }
      play('wrong');
      if (this.lesson.maxErrors >= 0 && this.errors > this.lesson.maxErrors) this.finish();
    }
    if ((this.state as number) !== 2) this.redraw(); // finish() may have run
  }

  private advance() {
    this.clean = true;
    this.col++;
    const task = this.lesson.tasks[this.task];
    if (this.col >= task.lines[this.line].length) {
      this.col = 0;
      this.line++;
      if (this.line % 4 === 0) this.firstLine = this.line;
      if (this.line >= task.lines.length) {
        this.line = 0;
        this.firstLine = 0;
        this.task++;
        this.tasksDone++;
        if (this.task >= this.lesson.tasks.length) this.finish();
      }
    }
  }

  update(dt: number) {
    this.t++;
    let dirty = false;
    if (this.state === 1) {
      this.secMs += dt;
      if (this.secMs >= 1000) {
        this.secMs -= 1000;
        this.seconds++;
        if (this.lesson.lessonTime !== -1) {
          this.remaining--;
          if (this.remaining <= 0) {
            this.finish();
            return;
          }
        }
        this.drawSide();
      }
      if (this.glowBlink) {
        this.glowMs += dt;
        if (this.glowMs >= 400) {
          this.glowMs = 0;
          this.glowOn = !this.glowOn;
          dirty = true;
        }
      }
    }
    if (this.state !== 2) {
      this.cursorMs += dt;
      if (this.cursorMs >= 500) {
        this.cursorMs = 0;
        this.cursorOn = !this.cursorOn;
        this.drawText();
      }
    }
    if (dirty) this.drawGuide();
    this.updateDecor();
  }

  /** Decorative fish swimming behind the keyboard while not typing. */
  private updateDecor() {
    if (this.state !== 1 && this.t % 5 === 0 && this.decorFish.length < 3 && rand() % 60 === 0) {
      const kind = rand() % 4;
      const speed = 0.4 + (rand() % 40) * 0.01;
      const e: Enemy =
        kind === 0 ? new Shark('Black', [''], speed)
          : kind === 1 ? new Shark('Toxic', [''], speed)
            : kind === 2 ? new Piranha('Blue', [''], speed)
              : new Jellyfish('', 0.5 + (rand() % 40) * 0.01);
      if (e instanceof Jellyfish) e.place(40 + (rand() % 360), 480);
      else e.position.set(640 + (rand() % 40), 10 + (rand() % 120));
      this.decorFish.push(e);
      this.decor.addChild(e);
    }
    for (const e of this.decorFish) {
      e.update(DECOR_HOST);
      if (e.state === EState.Attack) e.removed = true;
    }
    for (const e of this.decorFish.filter((x) => x.removed)) e.destroy({ children: true });
    this.decorFish = this.decorFish.filter((x) => !x.removed);
  }

  // ---------------------------------------------------------------- results

  private finish() {
    const l = this.lesson;
    this.state = 2;
    const minutes = this.seconds / 60;
    this.raw = minutes > 0 ? Math.max(0, Math.trunc(this.correct / 5 / minutes)) : 0;
    this.adjusted = minutes > 0 ? Math.max(0, Math.trunc(this.firstTry / 5 / minutes)) : 0;
    this.accuracy = this.firstTry + this.errors > 0 ? Math.trunc((this.firstTry / (this.firstTry + this.errors)) * 100) : 0;
    const maxErrors = l.maxErrors === -1 ? Infinity : l.maxErrors;
    const minWpm = l.minWpm === -1 ? -50 : l.minWpm;
    const minAcc = l.minAccuracy === -1 ? -10 : l.minAccuracy;
    const minTasks = l.minTasks === -1 ? l.tasks.length : l.minTasks === 0 ? -5 : l.minTasks;
    const passed = !(this.errors > maxErrors || this.adjusted < minWpm || this.tasksDone < minTasks || this.accuracy < minAcc);

    const p = profile();
    const rec = p.lessons[this.index];
    if (passed) rec.status = 1;
    else if (rec.status === -1) rec.status = 0;
    rec.attempts++;
    rec.sumWpm += this.raw;
    rec.sumAdjWpm += this.adjusted;
    rec.sumAcc += this.accuracy;
    Object.assign(rec, { lastWpm: this.raw, lastAdjWpm: this.adjusted, lastAcc: this.accuracy });
    rec.bestWpm = Math.max(rec.bestWpm, this.raw);
    rec.bestAdjWpm = Math.max(rec.bestAdjWpm, this.adjusted);
    rec.bestAcc = Math.max(rec.bestAcc, this.accuracy);
    pushWpm(this.adjusted);
    saveProfiles();
    musicOrder(0x11);
    this.redraw();

    if (this.index === 0) {
      const level = DIFFICULTY_LABELS[difficultyForWpm(this.adjusted)];
      this.showDialog(
        new Dialog(
          'Test Finished!',
          [
            ...wrap(font('MyriadCondensedWeb14Bold'), `You typed ${this.raw} WPM before mistakes. Once your errors are taken off, your score is:`, 300),
            '',
            `${this.adjusted} WPM (adjusted)`,
            '',
            `Suggested difficulty: ${level}`,
          ],
          [
            { label: 'Main Menu', key: 'M', action: () => this.back() },
            { label: 'Next Lesson', key: 'N', action: () => (this.closeDialog(), this.load(1)) },
          ],
        ),
      );
    } else {
      this.showDialog(
        new Dialog(passed ? 'PASSED!' : 'FAILED!', [
          `${this.raw} WPM, ${this.adjusted} WPM Adjusted`,
          `${this.accuracy}% Accuracy, ${this.errors} errors`,
          '',
          'Open your typing stats now?',
        ], [
          { label: 'Yes', key: 'Y', action: () => void import('./stats').then(({ StatsScene }) => game.set(new StatsScene('tutor'))) },
          { label: 'No', key: 'N', action: () => this.closeDialog() },
        ]),
      );
    }
  }

  private confirmQuit() {
    if (this.dialog) return;
    this.showDialog(
      new Dialog('QUIT?', 'Leave the typing tutor for now?', [
        { label: 'Yes', key: 'Y', action: () => this.back() },
        { label: 'No', key: 'N', action: () => this.closeDialog() },
      ]),
    );
  }

  private showDialog(d: Dialog) {
    this.closeDialog();
    this.dialog = d;
    this.addChild(d);
  }

  private closeDialog() {
    this.dialog?.destroy({ children: true });
    this.dialog = null;
  }

  private back() {
    void import('./selector').then(({ SelectorScene }) => game.set(new SelectorScene()));
  }
}
