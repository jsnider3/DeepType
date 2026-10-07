// Adventure map: pick the next dive site A/B/C, then SPACE to dive.

import { Container, Graphics, Sprite } from 'pixi.js';
import { DIFFICULTY_LABELS } from '../data/config';
import { game, HEIGHT, Scene, WIDTH } from '../engine/app';
import { frames, tex } from '../engine/assets';
import { musicOrder, play } from '../engine/audio';
import { BitmapText, font, wrap } from '../engine/font';
import { BoardScene } from '../game/board';
import { MAP_NODES, trailBetween } from '../game/mapdata';
import type { Session } from '../game/session';

interface Chest {
  level: number;
  letter: string;
  sprite: Sprite;
  t: number;
}

export class MapScene extends Scene {
  private chests: Chest[] = [];
  private chosen = -1;
  private chosenLetter = '';
  private ready = false;
  private reached = 0;
  private segStart = 0;
  private previews: [number, number][][] = [];
  private timerMs = 0;
  private bells = 0;
  private t = 0;
  private dots = new Container();
  private ships = new Container();
  private shipColor = new Sprite();
  private headline!: BitmapText;
  private prompt!: BitmapText;
  private promptX = WIDTH;
  private tooltip = new Container();
  private pendingShip = false;

  constructor(private session: Session) {
    super();
  }

  enter() {
    musicOrder(0x14);
    const s = this.session;
    s.stage++;
    s.visitedThisRun.add(s.path[s.path.length - 1]);
    this.reached = s.trail.length;
    this.segStart = s.trail.length;

    // Returning from a secret level: it's a side trip back to the parent.
    const cur = s.path[s.path.length - 1];
    if (MAP_NODES[cur].secret && s.path.length >= 2) {
      const parent = s.path[s.path.length - 2];
      s.mapNext[parent] = s.mapNext[parent].filter((n) => n !== cur);
      s.path.splice(s.path.length - 2, 1);
      s.path.push(parent);
    }

    this.addChild(new Sprite(tex('mapbg')));
    this.addChild(this.dots, this.ships);
    this.shipColor.texture = frames('mapshipcolor', 6)[0];
    this.addChild(this.shipColor);
    const arch = new Sprite(tex('mapscreen_arch'));
    arch.position.set(443, 341);
    this.addChild(arch);

    const top = new Graphics().rect(0, 0, WIDTH, 30).fill({ color: 0x000000, alpha: 180 / 255 });
    const lvl = new BitmapText(font('MyriadCondensedWeb14Bold'), `Level ${s.stage}`, 0xffffff);
    lvl.position.set(10, 6);
    this.headline = new BitmapText(font('Rockwell13'), 'Where will you dive next?', 0x00ff00);
    this.headline.position.set(lvl.x + lvl.textWidth + 40, 8);
    if (!s.final) this.addChild(top, lvl, this.headline);

    const bottom = new Graphics().rect(0, HEIGHT - 34, WIDTH, 34).fill({ color: 0x000000, alpha: 180 / 255 });
    this.prompt = new BitmapText(font('Rockwell13'), '', 0xffffff);
    this.prompt.y = HEIGHT - 26;
    this.addChild(bottom, this.prompt);
    this.addChild(this.tooltip);

    if (s.final) this.buildUncharted();
    else this.buildOptions();
    this.redrawDots();
    play('divebell1');
    this.bells = 1;
  }

  private buildOptions() {
    const s = this.session;
    const cur = s.path[s.path.length - 1];
    const exits = s.mapNext[cur].filter((n) => !s.visitedThisRun.has(n));
    if (exits.length === 0) return;
    if (exits.length === 1) {
      this.choose(exits[0], 'A');
      this.addChest(exits[0], 'A');
      return;
    }
    const sorted = [...exits].sort((a, b) => MAP_NODES[a].x - MAP_NODES[b].x);
    sorted.forEach((lvl, i) => {
      this.addChest(lvl, 'ABC'[i]);
      this.previews.push(trailBetween(MAP_NODES[cur], MAP_NODES[lvl]));
    });
  }

  private addChest(level: number, letter: string) {
    const n = MAP_NODES[level];
    const visited = this.visitedEver(level);
    const img = `mapchest_${letter.toLowerCase()}${visited ? '_open' : ''}`;
    const sp = new Sprite(tex(img));
    sp.position.set(n.x - 24, n.y - 17);
    sp.alpha = 0.5;
    sp.eventMode = 'static';
    sp.cursor = 'pointer';
    sp.on('pointertap', () => this.onChar(letter));
    sp.on('pointerover', () => this.showTooltip(n.description, n.x, n.y));
    sp.on('pointerout', () => this.tooltip.removeChildren());
    this.chests.push({ level, letter, sprite: sp, t: 0 });
    this.addChild(sp);
  }

  private visitedEver(level: number) {
    return this.session.visitedEver(level);
  }

  private showTooltip(text: string, x: number, y: number) {
    this.tooltip.removeChildren();
    const f = font('Rockwell13');
    const t = new BitmapText(f, text, 0x000000);
    const w = t.textWidth + 8;
    const bx = Math.min(WIDTH - w, Math.max(0, x - 24));
    const by = y - 17 - f.height - 6;
    this.tooltip.addChild(new Graphics().rect(bx, by, w, f.height + 4).fill(0xffffe1).stroke({ color: 0x000000, width: 1 }));
    t.position.set(bx + 4, by + 2);
    this.tooltip.addChild(t);
  }

  private choose(level: number, letter: string) {
    const s = this.session;
    const cur = s.path[s.path.length - 1];
    this.segStart = s.trail.length;
    s.trail.push(...trailBetween(MAP_NODES[cur], MAP_NODES[level]));
    s.path.push(level);
    this.chosen = level;
    this.chosenLetter = letter;
    this.ready = true;
    this.pendingShip = true;
    this.previews = [];
    this.timerMs = 0;
    this.headline.text = `Next stop: the wreck of the ${this.session.shipName()}`;
    this.redrawDots();
  }

  private buildUncharted() {
    const s = this.session;
    const panel = new Container();
    panel.addChild(new Graphics().rect(100, 60, 440, 204).fill({ color: 0x000000, alpha: 180 / 255 }));
    const g = new Sprite(frames('gumbo_swim', 20)[0]);
    g.position.set(128, 105);
    g.label = 'gumbo';
    panel.addChild(g);
    const title = new BitmapText(font('MyriadCondensedWeb28Bold'), `LEVEL ${s.stage}`, 0xf7f776);
    title.position.set(120 + (400 - title.textWidth) / 2, 70);
    panel.addChild(title);
    const f = font('MyriadCondensedWeb14Bold');
    const lines = wrap(f, 'No map reaches this far. Every level from here on is fiercer than the one before. How long can you survive?', 320);
    lines.forEach((l, i) => {
      const t = new BitmapText(f, l, 0xffffff);
      t.position.set(205, 115 + i * 22);
      panel.addChild(t);
    });
    const d = new BitmapText(f, `Difficulty: ${DIFFICULTY_LABELS[s.difficulty]} + ${s.unchartedPercent()}%`, 0xff4040);
    d.position.set(205, 225);
    panel.addChild(d);
    this.addChild(panel);
    this.ready = true;
    this.prompt.text = 'Press SPACE to dive past the edge of the map';
  }

  private redrawDots() {
    const s = this.session;
    this.dots.removeChildren().forEach((c) => c.destroy());
    const add = (img: string, [x, y]: [number, number], alpha: number, tint = 0xffffff) => {
      const d = new Sprite(tex(img));
      d.position.set(x, y);
      d.alpha = alpha;
      d.tint = tint;
      this.dots.addChild(d);
    };
    s.trail.forEach((p, i) => {
      if (i < this.segStart) add('point', p, 0xa8 / 255);
      else if (i < this.reached) add('point_green', p, 1);
      else add('point_green', p, 0.5);
    });
    for (const pv of this.previews) for (const p of pv) add('point_green', p, 0.5);

    this.ships.removeChildren().forEach((c) => c.destroy());
    const k = this.session.path.length - (this.pendingShip ? 2 : 1);
    for (let i = 0; i < k; i++) {
      const n = MAP_NODES[s.path[i]];
      const sp = new Sprite(tex('mapship'));
      sp.position.set(n.x - 13, n.y - 11);
      this.ships.addChild(sp);
    }
    const cur = MAP_NODES[s.path[Math.max(0, k)]];
    if (s.final) this.shipColor.position.set(486 - 25, 403 - 22);
    else this.shipColor.position.set(cur.x - 25, cur.y - 22);
  }

  update() {
    this.t++;
    this.shipColor.texture = frames('mapshipcolor', 6)[Math.floor(this.t / 11) % 6];
    for (const c of this.chests) {
      c.t++;
      c.sprite.alpha = (150 + Math.abs(((c.t * 2) % 210) - 105)) / 255;
    }
    const g = this.getChildByLabel('gumbo', true) as Sprite | null;
    if (g && this.t % 50 === 0) g.texture = frames('gumbo_swim', 20)[(this.t / 50) % 2 ? 6 : 0];

    this.timerMs += 10;
    if (this.timerMs >= 500) {
      const s = this.session;
      if (this.reached + 1 < s.trail.length + 1 && this.reached < s.trail.length) {
        this.reached++;
        play('shipmove');
        this.timerMs = 0;
        this.redrawDots();
      } else if (this.bells < 3) {
        this.bells++;
        play('divebell1');
        this.timerMs = 0;
      }
    }

    if (!this.session.final) {
      this.prompt.text = this.ready ? 'Press SPACE to start the dive' : "Type a site's letter to pick your next dive";
      if (this.ready) this.prompt.x = Math.round((WIDTH - this.prompt.textWidth) / 2);
      else {
        this.promptX = Math.max((WIDTH - this.prompt.textWidth) / 2, this.promptX - 2);
        this.prompt.x = Math.round(this.promptX);
      }
    } else this.prompt.x = Math.round((WIDTH - this.prompt.textWidth) / 2);
  }

  onChar(raw: string) {
    const c = raw.toUpperCase();
    if (this.ready && (c === ' ' || c === this.chosenLetter)) {
      this.dive();
      return;
    }
    if (this.ready) return;
    const chest = this.chests.find((x) => x.letter === c);
    if (!chest) return;
    for (const other of this.chests) if (other !== chest) other.sprite.destroy();
    this.chests = [chest];
    play('buttonclick');
    this.choose(chest.level, chest.letter);
  }

  onKey(key: string) {
    if (key === 'Enter' && this.ready) this.dive();
  }

  private dive() {
    const s = this.session;
    if (s.final) s.diveUncharted();
    else {
      s.diveTo(this.chosen);
      if (this.chosen === 35) s.final = true;
    }
    game.set(new BoardScene(s));
  }
}
