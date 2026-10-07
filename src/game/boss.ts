// Boss fights: TorpedoBoss (pirate sub), MechaShark, GhostShip,
// MechaSquid and their projectiles. Typing a projectile's word/letter reflects it back
// at the boss; each hit does 10 damage.

import { Container, Sprite, type Texture } from 'pixi.js';
import type { EnemyDef, EnemyType } from '../data/config';
import { frames, tex } from '../engine/assets';
import { play } from '../engine/audio';
import { BitmapText, font } from '../engine/font';
import { HEIGHT, WIDTH } from '../engine/app';
import { wordValue } from '../data/words';
import { rand } from './rng';

const SB = 39; // status bar height

export const enum PState {
  Incoming = 0,
  Returning = 1,
  Exploding = 3,
  Fleeing = 4,
  Reversing = 6,
}

export interface BossHost {
  diverX(): number;
  diverY(): number;
  diverInFight(): boolean;
  pickWord(minDiff: number, maxDiff: number): string;
  onProjectileReturned(p: Projectile): void;
  onDiverStruck(p: Projectile): void;
  onDiverStruckDone(): void;
  onBossKilled(b: Boss): void;
  onBossGone(b: Boss): void;
  addBubble(x: number, y: number): void;
}

class Explosion extends Sprite {
  t = 0;
  constructor(x: number, y: number) {
    super(frames('torpedo_explode', 8)[0]);
    this.position.set(x, y);
  }
  step(): boolean {
    this.t++;
    this.y -= 0.5;
    const f = Math.floor(this.t / 3);
    if (f > 7) return false;
    this.texture = frames('torpedo_explode', 8)[f];
    return true;
  }
}

export class Projectile extends Container {
  state = PState.Incoming;
  vx = 0;
  typed = 0;
  tube = 0;
  removed = false;
  struckDiver = false;
  private body = new Sprite();
  private prop?: Sprite;
  private flash?: Sprite;
  private text?: BitmapText;
  private t = 0;
  private stateT = 0;
  private animDelay = 5;
  private swim: Texture[];
  private reverse: Texture[];
  private boom?: Sprite;

  constructor(readonly word: string, readonly cannon: boolean) {
    super();
    this.swim = cannon ? frames('cannonball', 12, true) : [tex('torpedo_swim')];
    this.reverse = cannon ? frames('cannonball_turn', 5, true) : frames('torpedo_reverse', 6);
    this.body.texture = this.swim[0];
    if (!cannon) {
      this.prop = new Sprite(frames('rotor_torpedo', 14)[0]);
      this.prop.x = this.body.width - 2;
      this.addChild(this.prop);
      this.flash = new Sprite(frames('torpedo_launch', 8)[0]);
      this.flash.position.set(this.body.width - 40, (this.body.height - 100) / 2);
    }
    this.addChild(this.body);
    if (this.flash) this.addChild(this.flash);
    this.text = new BitmapText(font('CourierFinalDraft15Bold'), word, 0x000000);
    this.text.position.set(Math.round((this.body.width - this.text.textWidth) / 2 + (cannon ? 0 : 6)), Math.round((this.body.height - this.text.font.height) / 2));
    this.addChild(this.text);
  }

  get w() {
    return this.cannon ? 74 : 126;
  }
  get h() {
    return this.cannon ? 44 : 39;
  }
  get nextChar() {
    return this.word[this.typed];
  }
  get points() {
    return 15 * wordValue(this.word);
  }

  setSpeed(v: number) {
    this.vx = -v;
    this.animDelay = v <= 0.3 ? 6 : v <= 0.4 ? 5 : v <= 0.5 ? 4 : 3;
  }

  /** Correct letter; returns true when the word is complete. */
  typeLetter(): boolean {
    this.typed++;
    this.text?.tintRange(0, this.typed, 0x11a111);
    if (this.typed >= this.word.length) {
      this.setState(PState.Reversing);
      this.vx = -this.vx;
      return true;
    }
    return false;
  }

  setState(s: PState) {
    this.state = s;
    this.stateT = 0;
    if (this.text) this.text.visible = s === PState.Incoming;
    if (s === PState.Exploding) {
      play('explosion');
      this.body.visible = false;
      if (this.prop) this.prop.visible = false;
      if (this.flash) this.flash.visible = false;
      this.boom = new Sprite(frames('torpedo_explode', 8)[0]);
      this.boom.position.set((this.w - 150) / 2, (this.h - 150) / 2);
      this.addChild(this.boom);
    }
  }

  /** Returns false once the projectile should be removed. */
  update(boss: Boss, host: BossHost): void {
    this.t++;
    this.stateT++;
    switch (this.state) {
      case PState.Incoming:
      case PState.Fleeing:
        if (this.state === PState.Fleeing) this.vx -= 0.05;
        this.x += this.vx;
        this.animateBody();
        if (this.flash) {
          const f = Math.floor(this.stateT / 5);
          this.flash.visible = f < 8;
          if (f < 8) this.flash.texture = frames('torpedo_launch', 8)[f];
        }
        break;
      case PState.Reversing: {
        this.x += this.vx;
        const f = Math.floor(this.stateT / this.animDelay);
        if (f >= this.reverse.length) {
          this.state = PState.Returning;
          this.faceRight();
        } else this.body.texture = this.reverse[f];
        break;
      }
      case PState.Returning:
        this.vx = Math.min(3.0, this.vx + 0.05);
        this.x += this.vx;
        this.animateBody();
        break;
      case PState.Exploding: {
        const f = Math.floor(this.stateT / 3);
        if (f > 7) {
          this.removed = true;
          if (this.struckDiver) host.onDiverStruckDone();
          return;
        }
        this.boom!.texture = frames('torpedo_explode', 8)[f];
        return;
      }
    }

    // Collision tick
    if (this.state === PState.Fleeing) {
      if (this.x <= -this.w || this.x + this.w >= WIDTH + this.w) this.removed = true;
      return;
    }
    if (this.vx < 0 && host.diverInFight()) {
      const dx = host.diverX();
      const dy = host.diverY();
      if (this.x <= dx + 29 && this.x + this.w >= dx && this.y + this.h > dy + 4 && this.y <= dy + 78) {
        this.struckDiver = true;
        this.setState(PState.Exploding);
        host.onDiverStruck(this);
        return;
      }
    }
    if (this.vx > 0 && boss.state !== BState.Dying && boss.hitTest(this)) {
      this.setState(PState.Exploding);
      boss.damage(10, host);
      return;
    }
    if (this.x < -this.w - 50 || this.x > WIDTH + 50) this.removed = true;
  }

  private animateBody() {
    if (this.cannon) this.body.texture = this.swim[Math.floor(this.t / this.animDelay) % 12];
    if (this.prop) this.prop.texture = frames('rotor_torpedo', 14)[Math.floor(this.t / 2) % 14];
  }

  /** Returning projectiles use a mirrored, slightly darkened copy. */
  private faceRight() {
    this.body.texture = this.swim[0];
    this.body.scale.x = -1;
    this.body.x = this.w;
    this.body.tint = 0xc8c8c8;
    if (this.prop) {
      this.prop.scale.x = -1;
      this.prop.x = 2;
    }
  }
}

export const enum BState {
  Entering = 0,
  Dying = 3,
  Pausing = 6,
  Fighting = 7,
  Hit = 8,
}

interface BossSpec {
  body: string;
  death: string;
  cannon: boolean;
  tubes: [number, number, number];
  minX: number;
  maxXExtra: number | 'half';
  minY: (h: number) => number;
  maxY: (h: number) => number;
  boxes: (x: number, y: number, w: number) => [number, number, number, number][];
  pings: boolean;
}

const SPECS: Record<string, BossSpec> = {
  Torpedo: {
    body: 'torpedo_boss_bobbing', death: 'torpedo_boss_dying', cannon: false, tubes: [65, 101, 135],
    minX: WIDTH - 265, maxXExtra: 'half', minY: (h) => HEIGHT - h - SB - 160, maxY: (h) => HEIGHT - h - SB - 50,
    boxes: (x, y) => [[x + 25, y + 53, x + 218, y + 153], [x + 80, y + 1, x + 155, y + 46]], pings: true,
  },
  MechaShark: {
    body: 'boss_mecha', death: 'boss_mecha_death', cannon: false, tubes: [98, 131, 165],
    minX: WIDTH - 265, maxXExtra: 'half', minY: (h) => HEIGHT - h - SB - 160, maxY: (h) => HEIGHT - h - SB - 50,
    boxes: (x, y) => [[x + 28, y + 65, x + 184, y + 210], [x + 111, y + 4, x + 156, y + 70]], pings: true,
  },
  GhostShip: {
    body: 'boss_galleon', death: 'boss_galleon_death', cannon: true, tubes: [220, 266, 266],
    minX: WIDTH - 265, maxXExtra: 'half', minY: () => 30, maxY: (h) => HEIGHT - SB - h - 50,
    boxes: (x, y) => [[x + 25, y + 33, x + 159, y + 324]], pings: false,
  },
  MechaSquid: {
    body: 'boss_squid', death: 'boss_squid_death', cannon: true, tubes: [7, 58, 120],
    minX: WIDTH - 275, maxXExtra: 50, minY: () => 100, maxY: (h) => HEIGHT - SB - h - 50,
    boxes: (x, y, w) => [[x + 32, y, x + 132, y + 144], [x + 120, y + 48, x + w, y + 106]], pings: false,
  },
};

export class Boss extends Container {
  state = BState.Entering;
  health: number;
  readonly maxHealth: number;
  projectiles: Projectile[] = [];
  removed = false;
  private spec: BossSpec;
  private body: Sprite;
  private extra?: Sprite;
  private extra2?: Sprite;
  private minX: number;
  private maxX: number;
  private minY: number;
  private maxY: number;
  private bobX: number;
  private bobY: number;
  private fireMs = 0;
  private pingMs = 0;
  private t = 0;
  private stateT = 0;
  private tubes = [false, false, false];
  private explosions: Explosion[] = [];
  private projLayer: Container;

  constructor(readonly type: EnemyType, private def: EnemyDef, private wordDef: EnemyDef, projLayer: Container) {
    super();
    this.spec = SPECS[type] ?? SPECS.Torpedo;
    this.projLayer = projLayer;
    this.body = new Sprite(tex(this.spec.body));
    this.addChild(this.body);
    const w = this.body.width;
    const h = this.body.height;
    this.minX = this.spec.minX;
    this.maxX = this.minX + (this.spec.maxXExtra === 'half' ? w / 2 : this.spec.maxXExtra);
    this.minY = this.spec.minY(h);
    this.maxY = this.spec.maxY(h);
    this.position.set(WIDTH, this.maxY);
    this.health = this.maxHealth = def.health || 200;
    this.bobX = this.bobY = def.bobSpeed || 0.2;

    if (type === 'Torpedo') {
      this.extra = new Sprite(frames('torpedo_boss_rotor', 14)[0]);
      this.extra.position.set(227, 54);
    } else if (type === 'MechaShark') {
      this.extra = new Sprite(frames('boss_mecha_fin', 10)[0]);
      this.extra.position.set(184, 60);
    } else if (type === 'GhostShip') {
      this.extra = new Sprite(frames('galleon_rudder', 5)[0]);
      this.extra.position.set(121, 300);
    } else if (type === 'MechaSquid') {
      this.extra = new Sprite(frames('boss_squid_fin', 10)[0]);
      this.extra.position.set(217, 60);
      this.extra2 = new Sprite(frames('boss_squid_eye', 5)[0]);
      this.extra2.position.set(133, 80);
    }
    if (this.extra) this.addChild(this.extra);
    if (this.extra2) this.addChild(this.extra2);
  }

  get w() {
    return this.body.width;
  }

  hitTest(p: Projectile): boolean {
    const px1 = p.x, py1 = p.y, px2 = p.x + p.w, py2 = p.y + p.h;
    return this.spec.boxes(this.x, this.y, this.w).some(
      ([x1, y1, x2, y2]) => px1 < x2 && px2 > x1 && py1 < y2 && py2 > y1,
    );
  }

  damage(n: number, host: BossHost) {
    this.health -= n;
    this.setState(BState.Hit);
    if (this.health < 1) {
      this.setState(BState.Dying);
      for (const p of this.projectiles) {
        if (p.state !== PState.Exploding) {
          p.vx = 1e-5;
          p.setState(PState.Exploding);
        }
      }
      host.onBossKilled(this);
    }
  }

  setState(s: BState) {
    this.state = s;
    this.stateT = 0;
    this.body.tint = s === BState.Hit ? 0xff8080 : 0xffffff;
    if (s === BState.Fighting || s === BState.Pausing) this.fireMs = 0;
    if (s === BState.Dying) {
      this.body.texture = tex(this.spec.death);
      if (this.extra) this.extra.visible = false;
      if (this.extra2) this.extra2.visible = false;
      this.addExplosion();
    }
  }

  private addExplosion() {
    const e = new Explosion(rand() % Math.max(1, Math.trunc(this.w - 75)) - 37, rand() % Math.max(1, Math.trunc(this.body.height - 75)) - 37);
    this.explosions.push(e);
    this.addChild(e);
  }

  private bob() {
    this.y += this.bobY;
    if (this.y < this.minY || this.y > this.maxY) this.bobY = -this.bobY;
    if (this.state === BState.Fighting) {
      if (this.x < this.minX || this.x > this.maxX) this.bobX = -this.bobX;
      this.x += this.bobX;
    }
  }

  update(host: BossHost) {
    this.t++;
    this.stateT++;
    switch (this.state) {
      case BState.Entering:
        this.bob();
        this.x -= 0.5;
        if (this.x < this.minX) {
          this.x = this.minX;
          this.setState(BState.Pausing);
        }
        break;
      case BState.Pausing:
        this.bob();
        this.fireMs += 10;
        if (this.fireMs >= 1000) this.setState(BState.Fighting);
        break;
      case BState.Fighting:
        this.bob();
        this.fire(host);
        break;
      case BState.Hit:
        this.bob();
        if (this.stateT > 6 && host.diverInFight()) this.setState(BState.Fighting);
        else if (this.stateT > 6) this.body.tint = 0xffffff;
        break;
      case BState.Dying:
        this.y -= 0.5;
        if (this.stateT % 7 === 0) this.addExplosion();
        if (this.stateT % 33 === 0) play('explosion');
        if (this.y <= -this.body.height && !this.removed) {
          this.removed = true;
          host.onBossGone(this); // destroys this boss
          return;
        }
        break;
    }
    if (this.state !== BState.Dying) {
      this.pingMs += 10;
      if (this.spec.pings && this.pingMs >= 2000) {
        this.pingMs = 0;
        play('sonarping1');
      }
      this.animateExtras();
    }
    this.explosions = this.explosions.filter((e) => e.step() || (e.destroy(), false));

    for (const p of this.projectiles) p.update(this, host);
    for (const p of this.projectiles.filter((p) => p.removed)) {
      this.tubes[p.tube] = false;
      p.destroy({ children: true });
    }
    this.projectiles = this.projectiles.filter((p) => !p.removed);
  }

  private animateExtras() {
    const t = this.t;
    if (this.type === 'Torpedo' && this.extra) this.extra.texture = frames('torpedo_boss_rotor', 14)[Math.floor(t / 10) % 14];
    if (this.type === 'MechaShark' && this.extra) this.extra.texture = frames('boss_mecha_fin', 10)[Math.floor(t / 10) % 10];
    if (this.type === 'GhostShip' && this.extra) {
      const i = Math.floor(t / 13) % 8;
      this.extra.texture = frames('galleon_rudder', 5)[i <= 4 ? i : 8 - i];
    }
    if (this.type === 'MechaSquid') {
      if (this.extra) this.extra.texture = frames('boss_squid_fin', 10)[Math.floor(t / 5) % 10];
      if (this.extra2) {
        const i = Math.floor(t / 8) % 8;
        this.extra2.texture = frames('boss_squid_eye', 5)[i <= 4 ? i : 8 - i];
      }
    }
  }

  /** TorpedoBoss firing logic. */
  private fire(host: BossHost) {
    this.fireMs += 10;
    if (this.fireMs < (this.def.timeToFire || 1000) || !host.diverInFight()) return;
    this.fireMs = 0;
    const incoming = this.projectiles.filter((p) => p.state === PState.Incoming).length;
    const want = Math.max(0, (this.def.maxMissiles || 3) - incoming);
    let launched = 0;
    for (let k = 0; k < want; k++) {
      const tube = this.tubes.findIndex((busy) => !busy);
      if (tube < 0) break;
      const word = this.spec.cannon ? this.cannonLetter() : host.pickWord(this.wordDef.minDiff, this.wordDef.maxDiff);
      if (!word) break;
      const p = new Projectile(word, this.spec.cannon);
      p.position.set(this.x - 100, this.y + this.spec.tubes[tube]);
      if (this.projectiles.some((o) => o.state === PState.Incoming && overlaps(o, p))) {
        p.destroy({ children: true });
        this.tubes[tube] = true; // try the next tube this volley
        const t2 = this.tubes.findIndex((busy) => !busy);
        this.tubes[tube] = false;
        if (t2 < 0) break;
        continue;
      }
      p.tube = tube;
      this.tubes[tube] = true;
      const range = Math.max(1, Math.trunc((this.def.maxMissileSpeed - this.def.minMissileSpeed) * 1000));
      p.setSpeed((this.def.minMissileSpeed || 0.6) + (rand() % range) * 0.001);
      if (launched++ === 0) play('torpedolaunch');
      for (let i = 0; i < 30; i++) host.addBubble(p.x + p.w - 20 + (rand() % 40), p.y + (rand() % 10));
      this.projectiles.push(p);
      this.projLayer.addChild(p);
    }
  }

  private cannonLetter(): string {
    let c: string;
    let guard = 0;
    do c = String.fromCharCode(65 + (rand() % 26));
    while (this.projectiles.some((p) => !p.removed && p.word === c) && ++guard < 100);
    return c;
  }

  /** A projectile hit the diver: every other projectile flees. */
  scatter(except: Projectile) {
    for (const p of this.projectiles) if (p !== except && p.state !== PState.Exploding) p.setState(PState.Fleeing);
  }

  freeTube(p: Projectile) {
    this.tubes[p.tube] = false;
  }

  destroyAll() {
    for (const p of this.projectiles) p.destroy({ children: true });
    this.projectiles = [];
  }
}

function overlaps(a: Projectile, b: Projectile) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Abyss bosses have no config; their stats scale with depth. */
export function abyssBossDefs(type: EnemyType, depth: number): { def: EnemyDef; wordDef: EnemyDef } {
  const base: EnemyDef = {
    type, minSpeed: 0, maxSpeed: 0, minDiff: 3, maxDiff: 4, minNumber: 1, maxNumber: 1, themeRandom: false,
    timeToFire: 1000, health: 200, minMissiles: 2, maxMissiles: 3, bobSpeed: 0.2,
    minMissileSpeed: 0.4, maxMissileSpeed: 0.5,
  };
  const set = (health: number, minDiff: number, maxDiff: number, lo: number, hi: number) =>
    Object.assign(base, { health, minDiff, maxDiff, minMissileSpeed: lo, maxMissileSpeed: hi });
  // TorpedoBoss table (MechaShark starts from it too).
  if (depth < 4000) set(200, 3, 4, 0.4, 0.5);
  else if (depth < 7000) set(200, 5, 6, 0.9, 1.0);
  else if (depth < 10000) set(300, 5, 7, 1.3, 1.4);
  else if (depth < 13000) set(300, 7, 7, 1.7, 1.8);
  else set(400, 7, 7, 2.1, 2.2);
  if (type === 'MechaShark') {
    base.maxMissileSpeed += 0.1;
    if (depth <= 5000) Object.assign(base, { health: 200, minDiff: 4, maxDiff: 5 });
    else if (depth < 8000) Object.assign(base, { health: 300, minDiff: 5, maxDiff: 7 });
    else if (depth < 11000) Object.assign(base, { health: 300, minDiff: 6, maxDiff: 7 });
    else Object.assign(base, { health: 400, minDiff: 7, maxDiff: 7 });
  } else if (type === 'GhostShip') {
    if (depth < 7000) set(250, 3, 4, 0.8, 0.9);
    else if (depth < 10000) set(300, 3, 4, 1.6, 1.7);
    else if (depth < 14000) set(350, 3, 4, 1.8, 1.9);
    else if (depth < 18000) set(350, 3, 4, 2.1, 2.2);
    else set(450, 3, 4, 2.4, 2.5);
  } else if (type === 'MechaSquid') {
    if (depth <= 4000) set(250, 3, 4, 0.7, 0.8);
    else if (depth < 6000) set(250, 3, 4, 1.5, 1.6);
    else if (depth < 9000) set(300, 3, 4, 1.6, 1.7);
    else if (depth < 12000) set(300, 3, 4, 2.0, 2.1);
    else set(400, 3, 4, 2.4, 2.5);
  }
  const extra = 0.08 * (Math.trunc(depth / 1000) - 1);
  base.minMissileSpeed += extra;
  base.maxMissileSpeed += extra;
  return { def: base, wordDef: base };
}
