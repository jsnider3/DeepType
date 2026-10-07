// The level scene: waves, enemies, typing, the zapper, treasure dives and results.

import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { EnemyDef, WaveDef } from '../data/config';
import { game, HEIGHT, Scene, WIDTH } from '../engine/app';
import { data, frames, sub, tex } from '../engine/assets';
import { parseNameList } from '../data/words';
import { currentOrder, musicOrder, play } from '../engine/audio';
import { BitmapText, font, runs, textAt, wrap } from '../engine/font';
import { Dialog } from '../engine/dialog';
import { RippleFilter } from '../engine/ripple';
import { ImageButton } from '../engine/ui';
import { abyssBossDefs, Boss, PState, Projectile, type BossHost } from './boss';
import { addHighScore, profile, pushWpm, saveProfiles } from './profile';
import { ClamGame } from './clams';
import { Diver, DIVER_REST_Y, DIVER_X, DState } from './diver';
import { EState, Enemy, Jellyfish, Piranha, Shark, type EnemyHost } from './enemy';
import { rand, rollRange } from './rng';
import { rankFor, nextRankAt, Session } from './session';

const TOP_H = 119;
const STATUS_Y = 441;
const PLAY_H = 441;
const FLOOR_H = 300;
const FLOOR_STOP = 480 - 300 - 39 + 10; // 151
const AIR_MAX = 240;
const GEM_NAMES = ['Emerald', 'Topaz', 'Amethyst', 'Ruby', 'Diamond', 'Citrine']; // by gem colour
const GEM_IMAGES = ['gem_green', 'gem_orange', 'gem_purple', 'gem_red', 'gem_white', 'gem_yellow'];

type Phase = 'play' | 'airfill' | 'treasure' | 'results' | 'complete' | 'gameover' | 'paused';

class Bubble extends Sprite {
  vy = 1 + (rand() % 3000) * 0.001;
  t = 0;
  constructor(x: number, y: number) {
    super(tex(`bubble${1 + (rand() % 3)}`));
    this.position.set(x, y);
  }
  step() {
    this.y -= this.vy;
    if (++this.t % 200 === 0) this.x += ((rand() % 3) - 1) * 0.125;
    return this.y > -20;
  }
}

class FloatText extends Container {
  private t = 0;
  constructor(text: string, x: number, y: number) {
    super();
    const bt = new BitmapText(font('MyriadCondensedWeb14Bold'), text, 0xffff64);
    bt.x = -bt.textWidth / 2;
    this.addChild(bt);
    this.position.set(x, y);
  }
  step() {
    this.t++;
    this.y -= 0.5;
    if (this.t > 70) this.alpha -= 2 / 255;
    return this.alpha > 0 && this.y > -20;
  }
}

/** Background fish: swims right and drifts up; slower fish are farther away (bluer). */
class BgFish extends Sprite {
  private t = 0;
  private f = 0;
  private fr: Texture[];
  private rise: number;
  constructor(public vx: number) {
    super();
    this.fr = frames('smallgoldfish', 20);
    this.f = rand() % 20;
    this.texture = this.fr[this.f];
    this.position.set(-20, 100 + (rand() % (480 - 20 - 90)));
    this.rise = vx < 0.3 ? 0.05 : vx < 0.5 ? 0.2 : 0.3;
    this.tint = vx < 0.3 ? 0x3232ff : vx < 0.5 ? 0x8282c8 : 0xb9b99b;
  }
  step() {
    if (++this.t % 10 === 0) this.texture = this.fr[(this.f = (this.f + 1) % 20)];
    this.x += this.vx;
    this.y -= this.rise;
    return this.x < WIDTH + 30 && this.y > -30;
  }
}

/** In-game adjusted WPM feeds the recommended difficulty. */
function pushWpmIfMeaningful(s: Session) {
  if (s.typingMs > 30_000 && s.adjustedWpm) pushWpm(s.adjustedWpm);
}

export class BoardScene extends Scene implements EnemyHost, BossHost {
  private bg = new Container();
  private water = new Container();
  private ripple?: RippleFilter;
  private fishLayer = new Container();
  private ruler = new Container();
  private hintLayer = new Container();
  private mountainY: number[];
  private coral?: Sprite;
  private firstGame: boolean;
  private hintAlpha = 1;
  private startFade = 255;
  private fadeRect = new Graphics();
  private textover?: Sprite;
  private textoverMs = 0;
  private waterA: Sprite;
  private waterB: Sprite;
  private mountains: Sprite[] = [];
  private floor: Sprite;
  private top: Sprite;
  private fxLayer = new Container();
  private enemyLayer = new Container();
  private hud = new Container();
  private overlay = new Container();
  private diver: Diver;

  private sharks: Shark[] = [];
  private piranhas: Piranha[] = [];
  private jellies: Jellyfish[] = [];
  private bubbles: Bubble[] = [];
  private texts: FloatText[] = [];
  private fish: BgFish[] = [];

  private phase: Phase = 'play';
  private ticks = 0;
  private distance = 0;
  private lastScoreDist = 0;
  private floorY: number;
  private diverSpeed: number;

  // Waves
  private waveCleared = true;
  private waveIdx: number;
  private usedWaves = new Set<number>();
  private currentWave: WaveDef | null = null;
  private waveCorrect = 0;
  private waveTypos = 0;
  private wavePoints = 0;
  private zapperUsed = false;
  private jellyCount = 0;
  private nextWaveDelay = 0;
  private target: Enemy | Projectile | null = null;
  private boss: Boss | null = null;
  private bossDefeated = false;
  private bossMeter?: Container;
  private bossFill?: Sprite;
  private wordStart = 0;

  // Penalty fish
  private typoStreak = 0;
  private penaltyCount = 0;
  private penaltyMult = 1;

  // Zapper
  private chargeMs = 0;
  private empX = -1;
  private draining = false;
  private flash = new Graphics();

  // Treasure dive
  private air = 0;
  private treasureWord = '';
  private treasureTyped = 0;
  private treasureWords = 0;
  private treasurePoints = 0;
  private gem = 0;
  private clams?: ClamGame;
  private secretFound = false;

  // HUD
  private meter!: Sprite;
  private meterMask!: Graphics;
  private airFill?: Graphics;
  private panel?: Container;

  // Abyss
  private depthBase = 0;
  private bossPending = false;

  constructor(private session: Session, opts: { abyssBossDue?: boolean } = {}) {
    super();
    const level = session.level;
    this.diverSpeed = level.diverSpeed;
    this.floorY = level.oceanDepth < 0 ? Infinity : TOP_H + level.oceanDepth * 10 - FLOOR_H + TOP_H;
    this.depthBase = session.abyss ? session.depth : 0;
    this.levelLatch = this.depthBase;
    if (session.abyss && opts.abyssBossDue) {
      this.bossPending = true;
      session.abyssBossCount++;
    }
    this.waveIdx = level.firstWave;

    this.waterA = new Sprite(tex('water1'));
    this.waterB = new Sprite(tex('water1'));
    this.water.addChild(this.waterA, this.waterB);
    this.bg.addChild(this.water);
    if (profile().options.enableFx) {
      this.ripple = new RippleFilter();
      this.water.filters = [this.ripple];
    }
    // Ridges sit below the floor's top edge and catch up with parallax.
    this.mountainY = [this.floorY - 30, this.floorY + 120, this.floorY + 270];
    if (!level.bonusLevel) {
      for (const m of ['mountain3', 'mountain2', 'mountain1']) {
        const sp = new Sprite(tex(m));
        this.mountains.push(sp);
        this.bg.addChild(sp);
      }
    }
    this.floor = new Sprite(tex(level.bonusLevel ? 'sand' : 'oceanfloor'));
    this.bg.addChild(this.floor);
    if (level.bonusLevel) {
      this.coral = new Sprite(tex('coralshelf'));
      this.bg.addChild(this.coral);
    }
    this.top = new Sprite(tex(session.topBackground()));

    this.diver = new Diver(TOP_H);
    this.diver.onGone = () => this.lifeLost();
    this.firstGame = !profile().seenTutorial && !session.abyss;
    // Draw order: water, floor art, fish, depth ruler, hint, enemies,
    // diver, bubbles, surface, overlays, HUD, fades.
    this.addChild(this.bg, this.fishLayer, this.ruler, this.hintLayer, this.enemyLayer, this.diver, this.fxLayer, this.top);
    this.flash.rect(0, 0, WIDTH, HEIGHT).fill(0xffffff);
    this.flash.alpha = 0;
    this.fadeRect.rect(0, 0, WIDTH, HEIGHT).fill(0x000000);
    this.addChild(this.overlay, this.hud, this.flash, this.fadeRect);
    if (this.firstGame) {
      const f = font('Rockwell13');
      this.hintLayer.addChild(
        textAt(f, 'Type the word on a shark to stop it before it bites!', 0, 145, 0xffffff, 'center', WIDTH),
        textAt(f, 'Finish each word before you start on another one.', 0, 164, 0xffffff, 'center', WIDTH),
      );
    }
    this.buildHud();
    this.layoutBackground();
    session.onExtraLife = () => {
      play('extralife');
      this.extraLifePulses = 4;
      this.extraLifeAlpha = 0;
      this.extraLifeDir = 1;
    };
  }

  enter() {
    musicOrder(0);
    const s = this.session;
    if (s.abyss) {
      if (s.depth) this.showMessage(`Resuming your dive at ${s.depth} feet`);
      if (!s.depth && profile().options.hints) {
        this.showHint(
          'ABYSS MODE',
          'Welcome to the Abyss! This dive has no bottom, and the sea gets wilder the deeper you go. How deep will you get? Every 400ft you pass becomes a checkpoint.',
        );
      }
    } else {
      s.saveGame();
    }
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    const strip = new Graphics().rect(0, 0, WIDTH, 25).fill({ color: 0x000000, alpha: 0.5 });
    this.hud.addChild(strip, this.hudLeft, this.hudRight, this.extraLifeText);

    const bar = new Container();
    bar.y = STATUS_Y;
    const meterBg = new Graphics().rect(117, 8, 228, 22).fill(0x2b2b2b);
    this.meter = new Sprite(tex('statusbarmeter'));
    this.meter.position.set(117, 8);
    this.meterMask = new Graphics();
    this.meter.mask = this.meterMask;
    bar.addChild(meterBg, this.meter, this.meterMask, new Sprite(tex('statusbarX')), this.chargeText);
    // Status bar buttons.
    const btn = (name: string, x: number, action: () => void) => {
      const b = new ImageButton(`statusbarX_${name}`, action);
      b.position.set(x, 4);
      bar.addChild(b);
    };
    btn('pause', 380, () => this.togglePause());
    btn('options', 467, () => this.openOptions());
    btn('quit', 553, () => this.confirmQuit());
    this.hud.addChild(bar, this.message);
  }

  /** Message line: Rockwell13, centred at baseline 422; holds 2 s then fades. */
  private showMessage(text: string) {
    const f = font('Rockwell13');
    this.message.removeChildren().forEach((c) => c.destroy());
    this.message.addChild(textAt(f, text, 0, STATUS_Y - 19, 0xffffff, 'center', WIDTH));
    this.message.alpha = 1;
    this.messageMs = 0;
  }

  private updateHud() {
    const s = this.session;
    const f = font('Rockwell13');
    const W = 0xffffff;
    const G = 0xc8c8c8;
    const key = `${s.abyss}|${s.stage}|${s.depth}|${s.score}|${s.lives}`;
    if (key !== this.hudKey) {
      this.hudKey = key;
      this.hudLeft.removeChildren().forEach((c) => c.destroy({ children: true }));
      this.hudLeft.addChild(
        s.abyss
          ? runs(f, [['LEVEL: ', W], ['Abyss     ', G], ['Depth: ', G], [`${s.depth} `, W], ['feet     ', G], [`${s.score} `, W], ['Points', G]], 2, 17)
          : runs(f, [['LEVEL: ', W], [`${s.stage}     `, G], [`${s.score} `, W], ['Points', G]], 2, 17),
      );
      this.hudRight.removeChildren().forEach((c) => c.destroy({ children: true }));
      this.hudRight.addChild(textAt(f, s.lives >= 0 ? `Lives left: ${s.lives}` : 'Game Over!', -5, 17, G, 'right', WIDTH));
    }
    // "EXTRA LIFE!" pulses 4 times next to the level text.
    if (this.extraLifePulses > 0) {
      this.extraLifeAlpha += this.extraLifeDir * 2;
      if (this.extraLifeAlpha >= 255) this.extraLifeDir = -1;
      if (this.extraLifeAlpha <= 0) {
        this.extraLifeDir = 1;
        this.extraLifePulses--;
      }
      this.extraLifeText.alpha = Math.max(0, this.extraLifeAlpha) / 255;
      this.extraLifeText.x = 2 + this.hudLeft.width + 50;
    } else this.extraLifeText.alpha = 0;

    this.meterMask.clear().rect(117, 8, 228 * Math.min(1, s.charge), 22).fill(0xffffff);
    const charging = this.phase === 'play' || this.phase === 'paused';
    let txt = '';
    let x = 193;
    if (charging) {
      if (s.charge < 1) txt = 'CHARGING';
      else if (Math.floor(this.ticks / 1500) % 2 && this.diver.state !== DState.Boss) [txt, x] = ['HIT ENTER TO ZAP!', Math.round(223 - font('MyriadCondensedWeb15').measure('HIT ENTER TO ZAP!') / 2)];
      else [txt, x] = ['READY!', 204];
    }
    if (txt !== this.chargeKey) {
      this.chargeKey = txt;
      this.chargeText.removeChildren().forEach((c) => c.destroy());
      if (txt) this.chargeText.addChild(textAt(font('MyriadCondensedWeb15'), txt, x, 26, 0xffffff));
    }
    this.messageMs += 10;
    if (this.messageMs > 2000) this.message.alpha = Math.max(0, this.message.alpha - 2 / 255);
  }
  private hudLeft = new Container();
  private hudRight = new Container();
  private hudKey = '';
  private chargeText = Object.assign(new Container(), { alpha: 0.5 });
  private chargeKey = '';
  private message = new Container();
  private messageMs = 0;
  private extraLifeText = textAt(font('Rockwell13'), 'EXTRA LIFE!', 0, 17, 0x00ff00);
  private extraLifePulses = 0;
  private extraLifeAlpha = 0;
  private extraLifeDir = 1;

  /** Level-start fade from black; at 117 the "Prepare to Dive!" textover arms. */
  private updateFades() {
    if (this.startFade > 0) {
      if (this.ticks % 2 === 0) this.startFade = Math.max(0, this.startFade - 2);
      if (this.startFade === 117 || (this.startFade < 117 && !this.textover && this.textoverMs === 0)) this.armTextover();
    }
    this.fadeRect.alpha = this.startFade / 255;
    if (this.textover) {
      this.textoverMs += 10;
      if (this.textoverMs > 2000) {
        this.textover.alpha -= 3 / 255;
        if (this.textover.alpha <= 0) {
          this.textover.destroy();
          this.textover = undefined;
        }
      }
    }
  }

  private armTextover() {
    this.textoverMs = 1;
    if (this.firstGame) return;
    this.textover?.destroy();
    if (this.session.level.bonusLevel) {
      const t = textAt(font('SwissCheesed24'), 'HIDDEN BONUS DIVE!', 0, 240, 0xfda03d, 'center', WIDTH);
      this.textover = new Sprite();
      this.textover.addChild(t);
    } else {
      this.textover = new Sprite(sub('textovers', 0, 0, 400, 50));
      this.textover.position.set(120, 203);
    }
    this.textoverMs = 0;
    this.overlay.addChild(this.textover);
  }

  // ---------------------------------------------------------------- background

  private layoutBackground() {
    // Two water layers scroll up and wrap (y <= -480 => +960); skipped once the ridges cover them.
    const wy = -(this.distance % HEIGHT);
    this.waterA.y = wy;
    this.waterB.y = wy + HEIGHT;
    const waterVisible = this.session.level.bonusLevel || !Number.isFinite(this.floorY) || this.mountainY[0] > -70;
    this.waterA.visible = this.waterB.visible = waterVisible;
    this.top.y = -this.distance;
    this.top.visible = this.distance <= TOP_H;
    const onScreen = Number.isFinite(this.floorY) && this.floorY < HEIGHT;
    this.floor.visible = onScreen;
    if (onScreen) this.floor.position.set(0, this.floorY);
    if (this.coral) {
      this.coral.visible = onScreen;
      this.coral.position.set(126, this.floorY);
    }
    this.mountains.forEach((m, i) => {
      m.y = this.mountainY[i];
      m.visible = onScreen;
    });
    this.layoutRuler();
  }

  /** Depth ruler: a dash every 40 px, "- N" every 200 px (Myr12B, white, x = 0). */
  private layoutRuler() {
    const base = 319; // marker k passes the diver (y 235 + 84) at depth k
    const offset = this.depthBase;
    const first = Math.max(0, Math.ceil((this.distance - base - 20) / 40) * 4);
    const key = `${first}`;
    if (this.rulerKey !== key) {
      this.rulerKey = key;
      this.ruler.removeChildren().forEach((c) => c.destroy({ children: true }));
      const f = font('MyriadCondensedWeb12Bold');
      for (let k = first; k < first + 15 * 4; k += 4) {
        const t = textAt(f, k % 20 === 0 ? `- ${k + offset}` : '-', 0, 0, 0xffffff);
        t.label = String(k);
        this.ruler.addChild(t);
      }
    }
    const asc = font('MyriadCondensedWeb12Bold').ascent;
    for (const c of this.ruler.children) {
      const k = Number(c.label);
      c.y = base + 10 * k - this.distance - asc;
      c.visible = c.y < HEIGHT;
    }
  }
  private rulerKey = '';

  // ---------------------------------------------------------------- update

  update() {
    if (this.phase === 'paused' || this.modal) {
      this.updateHud();
      return;
    }
    this.ticks++;
    this.diver.update();
    const s = this.session;

    // Descent
    const descending =
      (this.phase === 'play' && this.diver.state === DState.Normal) && this.floorY > FLOOR_STOP;
    if (descending) {
      this.distance += this.diverSpeed;
      this.floorY -= this.diverSpeed;
      const sp = this.diverSpeed;
      if (this.mountainY[0] >= STATUS_Y) for (let i = 0; i < 3; i++) this.mountainY[i] -= sp;
      else {
        this.mountainY[2] -= 2 * sp;
        this.mountainY[1] -= 1.8 * sp;
        this.mountainY[0] -= 1.6 * sp;
      }
      if (this.firstGame && profile().seenTutorial && this.distance - this.lastScoreDist >= 8) {
        this.hintAlpha = Math.max(0, this.hintAlpha - 2 / 255);
        this.hintLayer.alpha = this.hintAlpha;
      }
      if (this.distance - this.lastScoreDist >= 8) {
        this.lastScoreDist += 8;
        s.addScore(1);
      }
    }
    this.layoutBackground();
    if (s.abyss) this.updateDepth();

    // Zapper charge
    if (this.phase === 'play' && s.charge < 1 && !s.level.bonusLevel && this.diver.state === DState.Normal) {
      this.chargeMs += 10;
      if (this.chargeMs >= (s.abyss ? 1250 : 2500)) {
        this.chargeMs = 0;
        s.charge = Math.min(1, s.charge + 0.01);
        if (s.charge >= 1) this.showMessage('ZAPPER CHARGED! Hit ENTER to unleash it');
      }
    }
    if (this.draining) {
      s.charge = Math.max(0, s.charge - 0.01);
      if (s.charge <= 0) this.draining = false;
    }
    this.updateEmp();
    this.updateFades();
    if (this.ripple) {
      this.ripple.tick(game.root.scale.x * game.app.renderer.resolution);
      this.ripple.enabled = this.startFade <= 170;
    }
    if (this.flash.alpha > 0) this.flash.alpha = Math.max(0, this.flash.alpha - 8 / 255);

    // Entities
    for (const e of [...this.sharks, ...this.piranhas, ...this.jellies]) e.update(this);
    this.boss?.update(this);
    this.updateBossMeter();
    this.bubbles = this.bubbles.filter((b) => b.step() || (b.destroy(), false));
    this.texts = this.texts.filter((t) => t.step() || (t.destroy(), false));
    this.fish = this.fish.filter((f) => f.step() || (f.destroy(), false));
    this.ambient();

    switch (this.phase) {
      case 'play':
        this.updatePlay();
        break;
      case 'airfill':
        this.air = Math.min(AIR_MAX, this.air + 0.96);
        this.drawAir();
        if (this.air >= AIR_MAX) {
          if (s.level.bonusLevel) this.startClams();
          else this.startTreasure();
        }
        break;
      case 'treasure':
        this.air -= s.level.bonusLevel ? 0.12 : 0.1;
        this.drawAir();
        this.clams?.update();
        if (this.air <= 0 || this.clams?.done) {
          if (this.clams) this.endClams();
          else this.endTreasure();
        }
        break;
      case 'results':
        this.clams?.update();
        this.updateResults();
        break;
      case 'complete':
        this.updateSonar();
        break;
    }
    if (this.panel) {
      this.panel.alpha -= 1 / 255;
      if (this.panel.alpha <= 0) {
        this.panel.destroy({ children: true });
        this.panel = undefined;
      }
    }
    this.updateHud();
  }

  private ambient() {
    // The diver's exhaust bubbles (x 20..59), and the occasional passing fish.
    if (this.ticks % 100 === 0 && this.diver.state !== DState.Hidden) this.addBubble(20 + (rand() % 40), 400 + (rand() % 25));
    if (this.ticks % 400 === 0 && this.fish.length < 8) {
      const n = rand() % 5;
      for (let i = 0; i < n; i++) {
        const f = new BgFish(((rand() % 6000) + 1000) * 0.0001);
        f.x -= i * 18;
        this.fish.push(f);
        this.fishLayer.addChild(f);
      }
    }
  }

  addBubble(x: number, y: number) {
    const b = new Bubble(x, y);
    this.bubbles.push(b);
    this.fxLayer.addChild(b);
  }

  private updatePlay() {
    const s = this.session;
    const level = s.level;

    this.dangerMusic();
    if (!this.waveCleared && this.waveDone()) this.finishWave();
    if (this.nextWaveDelay > 0) this.nextWaveDelay--;

    const floorOffscreen = this.floorY > HEIGHT;
    if (
      this.waveCleared &&
      this.nextWaveDelay === 0 &&
      this.diver.state === DState.Normal &&
      floorOffscreen &&
      this.distance > TOP_H / 2 &&
      !level.bonusLevel &&
      !this.boss
    ) {
      if (this.bossPending) this.spawnAbyssBoss();
      else this.spawnWave();
    }

    // At the floor: the boss fight if the level has one, otherwise land.
    if (
      this.floorY <= FLOOR_STOP &&
      this.diver.state === DState.Normal &&
      this.diver.dy >= DIVER_REST_Y &&
      this.waveCleared &&
      this.allGone() &&
      !this.boss
    ) {
      const bossWave = level.waves[level.waves.length - 1];
      if (bossWave?.type === 'Boss' && !this.bossDefeated) this.spawnBoss(bossWave);
      else if (this.bossDefeated) this.finishBossLevel();
      else {
        this.diver.setState(DState.Landed);
        this.startAirFill();
      }
    }
    if (this.boss && this.diver.state === DState.Normal && !this.bossDefeated) this.diver.setState(DState.Boss);
  }

  /** Abyss depth bookkeeping: levels, bosses, checkpoints. */
  private updateDepth() {
    const s = this.session;
    const depth = this.depthBase + Math.floor(this.distance / 10);
    if (depth === s.depth) return;
    const prev = s.depth;
    s.depth = depth;
    if (Math.floor(depth / 200) > Math.floor(this.levelLatch / 200) && this.waveCleared) {
      this.levelLatch = depth;
      s.nextAbyssLevel();
      this.usedWaves.clear();
      this.chooseNextWave();
    }
    if (Math.floor(depth / 1000) > Math.floor(prev / 1000) && !this.boss && !this.bossPending) {
      this.bossPending = true;
      s.abyssBossCount++;
    }
    if (Math.floor(depth / 400) > Math.floor(prev / 400)) {
      const a = profile().abyss;
      a.deepest = Math.max(a.deepest, Math.floor(depth / 400) * 400);
      a.savedCharge = s.charge;
      saveProfiles();
      this.showMessage(`CHECKPOINT REACHED: ${Math.floor(depth / 400) * 400} FEET`);
    }
  }
  private levelLatch = 0;

  private spawnAbyssBoss() {
    this.bossPending = false;
    const types = ['Torpedo', 'MechaShark', 'MechaSquid', 'GhostShip'] as const;
    const type = types[((this.session.abyssBossCount % 4) + 4) % 4];
    const { def, wordDef } = abyssBossDefs(type, this.session.depth);
    this.bossDefeated = false;
    this.spawnBossFrom(def, wordDef, false);
  }

  /** Music speeds up as enemies close in on the diver. */
  private dangerMusic() {
    if (this.boss) return;
    let nearest = Infinity;
    for (const e of [...this.sharks, ...this.piranhas]) {
      if (e.state === EState.Swim || e.state === EState.TypoFlash) nearest = Math.min(nearest, e.x);
    }
    const cur = currentOrder();
    if (nearest < 15 && cur !== 0x2b) musicOrder(0x2b);
    else if (nearest < 160 && cur !== 0x25 && cur !== 0x2b) musicOrder(0x25);
    else if (nearest >= 160 && (cur === 0x25 || cur === 0x2b) && this.calmTicks++ > 100) {
      this.calmTicks = 0;
      musicOrder(0);
    }
    if (nearest < 160) this.calmTicks = 0;
  }
  private calmTicks = 0;

  private allEnemies(): Enemy[] {
    return [...this.sharks, ...this.piranhas, ...this.jellies];
  }

  private allGone() {
    return this.allEnemies().every((e) => e.removed || e.state === EState.Dying);
  }

  private waveDone() {
    return this.allEnemies().every(
      (e) => e.removed || e.state === EState.Flee || (e.state === EState.Dying && !e.alive),
    );
  }

  // ---------------------------------------------------------------- waves

  private spawnWave() {
    const s = this.session;
    const level = s.level;
    const wave = level.waves[this.waveIdx];
    this.currentWave = wave;
    this.chooseNextWave();
    s.words.newWave();
    this.waveCorrect = 0;
    this.waveTypos = 0;
    this.wavePoints = 0;
    this.zapperUsed = false;
    this.jellyCount = 0;
    this.waveCleared = false;

    if (!wave || wave.type === 'Boss') {
      this.waveCleared = true;
      return;
    }
    if (wave.type === 'Bonus') {
      this.spawnJellies(wave);
      return;
    }
    if (!profile().seenTutorial && !s.abyss) {
      // The very first wave of a player's first game.
      profile().seenTutorial = true;
      saveProfiles();
      const def = wave.enemies[0];
      const tut = ['BEGIN', 'TYPING'].map((w) => new Shark('Blue', [w], def.maxSpeed));
      this.arrange(tut, [def, def], { ...wave, minCol: 2, maxCol: 2 });
      for (const e of tut) {
        this.sharks.push(e);
        this.enemyLayer.addChild(e);
      }
      return;
    }

    const spawned: Enemy[] = [];
    const defs: EnemyDef[] = [];
    for (const def of wave.enemies) {
      const n = rollRange(def.minNumber, def.maxNumber);
      for (let i = 0; i < n; i++) {
        const e = this.makeEnemy(def, wave.type === 'Piranhas');
        if (e) {
          spawned.push(e);
          defs.push(def);
        }
      }
    }
    this.arrange(spawned, defs, wave);
    for (const e of spawned) {
      if (e instanceof Shark) this.sharks.push(e);
      else if (e instanceof Piranha) this.piranhas.push(e);
      this.enemyLayer.addChild(e);
    }
    if (!spawned.length) this.waveCleared = true;
  }

  private chooseNextWave() {
    const waves = this.session.level.waves;
    const lastIsBoss = waves[waves.length - 1]?.type === 'Boss';
    if (this.usedWaves.size >= waves.length - (lastIsBoss ? 1 : 0)) this.usedWaves.clear();
    if (waves.every((w) => w.type === 'Boss')) return;
    let next: number;
    do next = rand() % waves.length;
    while (waves[next].type === 'Boss' || this.usedWaves.has(next));
    this.usedWaves.add(next);
    this.waveIdx = next;
  }

  private makeEnemy(def: EnemyDef, piranhaWave: boolean): Enemy | null {
    const words = this.session.words;
    const t = def.type;
    if (piranhaWave) {
      const letters = t === 'White' || t === 'WhiteStealth' ? [words.letter(), words.letter()] : [words.letter()];
      if (letters.some((l) => !l)) return null;
      const r = Math.trunc((def.maxSpeed - def.minSpeed) * 1000) || 2;
      return new Piranha(t, letters, def.minSpeed + (rand() % r) * 0.001);
    }
    let themed = false;
    const pickWord = () => {
      if (def.themeRandom) {
        const r = words.themeWord(def.minDiff, def.maxDiff);
        themed ||= r.themed;
        return r.word;
      }
      return words.word(def.minDiff, def.maxDiff);
    };
    let list: string[];
    if (t === 'Ghost') list = [words.gibberish(def.minDiff, def.maxDiff)];
    else if (t === 'Black' || t === 'Purple' || t === 'BlackStealth') list = [pickWord(), pickWord()];
    else if (t === 'Red' || t === 'RedStealth') list = [pickWord(), pickWord(), pickWord()];
    else list = [pickWord()];
    if (list.some((w) => !w)) return null;
    let r = Math.trunc((def.maxSpeed - def.minSpeed) * 1000);
    if (r === 0) r = 2;
    if (r > 500) r = 500;
    const speed = def.maxSpeed - (rand() % r) * 0.001 - (themed ? this.session.themePenalty() : 0);
    return new Shark(t, list, speed, {
      letterDelay: this.session.level.letterDelay,
      mutateAfterType: this.session.toxicDelay(),
    });
  }

  /** Wave layout: columns of `cols`, followers trail their row leader. */
  private arrange(list: Enemy[], defs: EnemyDef[], wave: WaveDef) {
    const cols = rollRange(wave.minCol, wave.maxCol) || 1;
    const fontH = font('MyriadCondensedWeb15').height;
    const avail = PLAY_H - fontH;
    const aWidth = font('MyriadCondensedWeb15').measure('A');
    list.forEach((e, i) => {
      const row = i % cols;
      const h = e.frameH;
      const spacing = (avail - h) / cols;
      e.y = Math.min(avail - h, row * spacing + (rand() % Math.max(1, Math.trunc(spacing - 40))) + 25);
      if (i < cols) {
        e.x = WIDTH + (rand() % 15);
        return;
      }
      const leader = list[i - cols];
      const def = defs[i];
      leader.next = e;
      const cap = Math.min(def.maxSpeed, leader.vx);
      let min = def.minSpeed;
      if (cap <= min) min = cap - 0.001;
      if (!e.stealthed) e.vx = min + (rand() % Math.max(1, Math.trunc((cap - min) * 1000))) * 0.001;
      let extra = 0;
      if (leader.type === 'Black' || leader.type === 'BlackStealth') extra = ((leader.words[1]?.length ?? 0) + 1) * aWidth;
      else if (leader.type === 'Red' || leader.type === 'RedStealth')
        extra = ((leader.words[1]?.length ?? 0) + (leader.words[2]?.length ?? 0) + 2) * aWidth;
      else if (leader.type === 'White' || leader.type === 'WhiteStealth') extra = 30;
      e.x = leader.x + leader.frameW + extra + 30 + (rand() % 20);
    });
  }

  /** Bonus wave: rows of 4-5 jellyfish below the screen, rising together. */
  private spawnJellies(wave: WaveDef) {
    const words = this.session.words;
    const vy = 0.6 + (rand() % 400) * 0.001 + (rand() % 70) * 0.001;
    const def = wave.enemies[0];
    const n = def ? rollRange(def.minNumber, def.maxNumber) : 12;
    let perRow = (rand() & 1) + 4;
    let rowIdx = 0;
    let inRow = 0;
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const word = def?.themeRandom ? words.themeWord(3, 4).word : words.word(3, 4);
      if (!word) break;
      const j = new Jellyfish(word, vy);
      if (inRow % perRow === 0) {
        if (i > 0) {
          perRow = (rand() & 1) + 4;
          rowIdx++;
        }
        x = DIVER_X + 50;
        y = j.frameH * rowIdx + 25 + HEIGHT;
        inRow = 0;
      }
      j.place(x, y + (rand() % 25));
      x += j.frameW + (rand() % 30);
      inRow++;
      this.jellies.push(j);
      this.enemyLayer.addChild(j);
    }
    if (!this.jellies.length) this.waveCleared = true;
  }

  private finishWave() {
    this.waveCleared = true;
    this.nextWaveDelay = 120;
    const s = this.session;
    if (this.zapperUsed) return;
    const total = this.waveCorrect + this.waveTypos;
    const acc = total ? Math.trunc((100 * this.waveCorrect) / total) : 0;
    if (acc >= 95) s.goldStreak++;
    else s.goldStreak = 0;
    if (acc === 0 || this.wavePoints === 0) return;
    let medal = 'medal_bronze';
    let sound = 'wave_bonus';
    let bonus = 0;
    if (acc >= 95) {
      medal = 'medal_gold';
      sound = 'wave_bonus3';
      bonus = s.waveBonus(acc, this.wavePoints);
      s.addScore(bonus);
    } else if (acc >= 80) {
      medal = 'medal_silver';
      sound = 'wave_bonus2';
    }
    play(sound);
    this.showPanel(medal, acc, bonus);
  }

  /** Wave-end panel: "Accuracy" line, medal and bonus line, fading out. */
  private showPanel(medal: string, acc: number, bonus: number) {
    this.panel?.destroy({ children: true });
    const f = font('Rockwell13');
    const p = new Container();
    const m = new Sprite(tex(medal));
    m.position.set(272, 150);
    p.addChild(
      textAt(f, `Accuracy: ${acc}%`, 0, 150, 0xffffff, 'center', WIDTH),
      m,
      textAt(f, bonus > 0 ? `Sharp typing! +${bonus} pts` : 'Under 95%: no reward this time', 0, 293, 0xffffff, 'center', WIDTH),
    );
    this.panel = p;
    this.overlay.addChild(p);
  }

  // ---------------------------------------------------------------- boss

  private spawnBoss(wave: WaveDef) {
    this.spawnBossFrom(wave.enemies[0], wave.enemies[wave.enemies.length - 1], true);
  }

  private spawnBossFrom(def: EnemyDef, wordDef: EnemyDef, hint: boolean) {
    this.boss = new Boss(def.type, def, wordDef, this.enemyLayer);
    musicOrder(0x30);
    this.enemyLayer.addChild(this.boss);
    this.diver.setState(DState.Boss);
    this.target = null;
    this.session.words.newWave();
    const hints: Record<string, string> = {
      Torpedo: 'Pirate sub ahead, and it wants the treasure for itself! Finish the word on a torpedo to reverse it into the sub.',
      GhostShip: 'A spectral galleon rises from the murk! Every cursed cannonball carries a letter: type it to return fire.',
      MechaShark: 'A clockwork shark the size of a whale! Spell out the word on each of its torpedoes to aim them back at it.',
      MechaSquid: 'A robot squid is hurling cannonballs! Type the letter on one to knock it back into those metal arms.',
    };
    if (hint && profile().options.hints) this.showHint('DANGER!', hints[def.type] ?? '');
    else this.showMessage('DANGER!');
    const meter = new Container();
    meter.addChild(new Sprite(tex('boss_meter')));
    this.bossFill = new Sprite(tex('boss_meter_fill'));
    this.bossFill.position.set(36, 10);
    meter.addChild(this.bossFill);
    meter.position.set(124, 38);
    this.bossMeter = meter;
    this.hud.addChild(meter);
  }

  /** HintDialog ("HINT"/"DANGER!"): pauses the board until dismissed with space or a click. */
  private showHint(title: string, body: string) {
    if (this.modal) return;
    const close = () => {
      this.modal?.destroy({ children: true });
      this.modal = null;
    };
    this.modal = new Dialog(title, [body, ''], [{ label: 'Got it! (click or press space)', key: ' ', action: close }], { align: 'left' });
    this.overlay.addChild(this.modal);
  }

  private updateBossMeter() {
    if (!this.bossMeter || !this.bossFill) return;
    const b = this.boss;
    this.bossMeter.visible = !!b && b.health > 0;
    if (b) this.bossFill.width = Math.max(0, Math.trunc((b.health / b.maxHealth) * 294));
  }

  /** Boss levels skip the treasure dive: land, then the results screen. */
  private finishBossLevel() {
    this.diver.setState(DState.Landed);
    this.gem = rand() % 6;
    this.startResults(true);
  }

  // BossHost
  diverX() {
    return DIVER_X;
  }
  diverInFight() {
    return this.diver.state === DState.Boss;
  }
  pickWord(minDiff: number, maxDiff: number) {
    const w = this.session.words;
    // Torpedo words also need unique first letters among live torpedoes.
    const live = this.boss?.projectiles.filter((p) => p.state === PState.Incoming).map((p) => p.word[0]) ?? [];
    for (let i = 0; i < 20; i++) {
      w.newWave();
      const word = w.word(minDiff, maxDiff);
      if (!live.includes(word[0])) return word;
    }
    return w.word(minDiff, maxDiff);
  }
  onProjectileReturned(p: Projectile) {
    this.boss?.freeTube(p);
    const pts = p.points * this.session.pointsMultiplier;
    this.session.addScore(pts);
    this.texts.push(new FloatText(`+${pts} PTS`, p.x + p.w / 2, p.y));
    this.overlay.addChild(this.texts[this.texts.length - 1]);
    if (this.target === p) this.target = null;
  }
  onDiverStruck(p: Projectile) {
    this.target = null;
    this.boss?.scatter(p);
    this.diver.setState(DState.Struck);
  }
  onDiverStruckDone() {
    if (this.diver.state === DState.Struck) this.diver.setState(DState.Hauled);
  }
  onBossKilled(b: Boss) {
    const bonus = this.session.bossBonus();
    this.session.addScore(bonus);
    this.texts.push(new FloatText(`+${bonus} PTS`, b.x + b.w / 2, b.y + 40));
    this.overlay.addChild(this.texts[this.texts.length - 1]);
    this.target = null;
    this.bossDefeated = true;
    const st = this.session.abyss ? profile().abyss : profile().adventure;
    st.bossesKilled++;
    if (this.session.abyss) profile().abyss.bossKills[b.type] = (profile().abyss.bossKills[b.type] ?? 0) + 1;
    saveProfiles();
    if (this.session.abyss) musicOrder(0);
    if (this.diver.state === DState.Boss) this.diver.setState(DState.Normal);
  }
  onBossGone(b: Boss) {
    b.destroyAll();
    b.destroy({ children: true });
    this.boss = null;
    this.bossMeter?.destroy({ children: true });
    this.bossMeter = undefined;
    if (this.session.abyss) {
      this.bossDefeated = false;
      this.waveCleared = true;
      this.nextWaveDelay = 100;
    }
  }

  // ---------------------------------------------------------------- EnemyHost

  diverY() {
    return this.diver.dy;
  }

  onWordComplete(e: Enemy, points: number) {
    const s = this.session;
    if (e instanceof Jellyfish) {
      this.jellyCount++;
      points = 200 * this.jellyCount;
      play(`tone${Math.min(this.jellyCount + 1, 13)}`);
      s.charge = Math.min(1, s.charge + 0.01);
    }
    points *= s.pointsMultiplier;
    s.addScore(points);
    this.wavePoints += points;
    if (!(e instanceof Piranha) && !this.zapperUsed) s.typingMs += this.ticks * 10 - this.wordStart;
    e.zap();
    if (!e.alive) this.countKill(e);
    this.spawnText(`+${points} PTS`, e);
    if (this.target === e) this.target = null;
    this.typoStreak = 0;
    this.penaltyMult = 1;
  }

  private countKill(e: Enemy) {
    const s = this.session;
    const st = s.abyss ? profile().abyss : profile().adventure;
    if (e instanceof Shark) {
      s.sharksKilled++;
      st.sharksKilled++;
    } else if (e instanceof Piranha) {
      s.piranhasKilled++;
      st.piranhasKilled++;
    }
  }

  private spawnText(text: string, e: Enemy) {
    const t = new FloatText(text, e.x + e.frameW / 2, e.y + e.frameH / 2 - 10);
    this.texts.push(t);
    this.overlay.addChild(t);
  }

  onAttack(e: Enemy) {
    if (e instanceof Shark) {
      for (const o of this.sharks) if (o !== e) o.flee();
    } else if (e instanceof Piranha) {
      for (const o of this.piranhas) if (o !== e && o.state === EState.Swim) o.flee();
    }
    if (this.target && this.target !== e) this.target = null;
  }

  onDiverHit(_e: Enemy) {
    if (this.diver.state === DState.Hauled || this.diver.state === DState.Eaten) return;
    this.target = null;
    this.diver.setState(DState.Eaten);
  }

  onRemove(e: Enemy) {
    if (this.target === e) this.target = null;
    this.sharks = this.sharks.filter((x) => x !== e);
    this.piranhas = this.piranhas.filter((x) => x !== e);
    this.jellies = this.jellies.filter((x) => x !== e);
    e.destroy({ children: true });
  }

  onBubbleBurst(e: Enemy) {
    for (let i = 0; i < 30; i++) this.addBubble(e.x + (rand() % 40) + 15, e.y + (rand() % 10) + e.frameH / 2);
    play('diverenters');
  }

  private lifeLost() {
    const s = this.session;
    s.lives--;
    if (s.lives >= 0) {
      this.diver.setState(DState.Entering);
      this.diver.visible = true;
      this.target = null;
      this.penaltyMult = 1;
      this.waveCleared = true;
      this.nextWaveDelay = 100;
      return;
    }
    this.gameOver();
  }

  private gameOver() {
    musicOrder(0x1e);
    this.phase = 'gameover';
    this.diver.setState(DState.Hidden);
    const s = this.session;
    const p = profile();
    let rank: number;
    if (s.abyss) {
      p.abyss.deepest = Math.max(p.abyss.deepest, s.depth);
      p.abyss.highScore = Math.max(p.abyss.highScore, s.score);
      p.abyss.savedCharge = 0;
      rank = addHighScore('abyss', { name: p.name, score: s.score, difficulty: 'abyss', level: s.depth });
    } else {
      p.adventure.highScore = Math.max(p.adventure.highScore, s.score);
      s.clearSave();
      rank = addHighScore('adventure', { name: p.name, score: s.score, difficulty: s.difficulty, level: s.stage });
    }
    if (s.adjustedWpm) pushWpmIfMeaningful(s);
    saveProfiles();
    this.showGameOver(rank);
  }

  /** Game over dialog: adventure 400x300 at (120,90), abyss 370x380 at (135,50). */
  private showGameOver(rank: number) {
    const s = this.session;
    const p = profile();
    const abyss = s.abyss;
    const [w, h, x, y] = abyss ? [370, 380, 135, 50] : [400, 300, 120, 90];
    const d = new Dialog('GAME OVER', [], [
      { label: 'PLAY AGAIN', key: 'P', action: () => this.playAgain() },
      { label: 'MAIN MENU', key: 'M', action: () => void this.quitToMenu() },
    ], { width: w, height: h, x, y });
    const fb = font('Rockwell13Bold');
    const f = font('Rockwell13');
    const cw = w - 80;
    const Hb = 21;
    const H = 19;
    const BLK = 0x000000;
    let y0: number;
    if (!abyss) {
      d.box.addChild(runs(fb, [['Score: ', BLK], [String(s.score), 0x494949]], 40, 80 + fb.ascent, 'center', cw));
      d.box.addChild(runs(fb, [['Rank: ', BLK], [rankFor(s.score), 0x2d63ff]], 40, 75 + Hb + fb.ascent, 'center', cw));
      y0 = 75 + 2 * Hb;
    } else {
      d.box.addChild(runs(fb, [['Your Score: ', BLK], [String(s.score), 0x3d56b0]], 0, 80 + fb.ascent, 'right', 240));
      d.box.addChild(runs(fb, [['Highest Score: ', 0x646464], [String(p.abyss.highScore), 0x6580d9]], 0, 80 + Hb + fb.ascent, 'right', 240));
      d.box.addChild(runs(fb, [['Your Depth: ', BLK], [String(s.depth), 0x3d56b0]], 0, 90 + 2 * Hb + fb.ascent, 'right', 240));
      d.box.addChild(runs(fb, [['Best Depth: ', 0x646464], [String(p.abyss.deepest), 0x6580d9]], 0, 90 + 3 * Hb + fb.ascent, 'right', 240));
      y0 = 105 + 4 * Hb;
    }
    const y1 = y0 - 10 + 2 * H;
    const noStats = abyss ? s.depth < 400 || s.typingMs < 25_000 : s.stage <= 1;
    const wpm = noStats ? null : s.adjustedWpm;
    const mins = Math.floor(s.typingMs / 60000);
    const secs = Math.floor(s.typingMs / 1000) % 60;
    const G = 0x575757;
    d.box.addChild(runs(f, [['WPM: ', BLK], [wpm === null ? 'N/A' : String(wpm), G]], 50, y1 + f.ascent, 'right', 128));
    d.box.addChild(runs(f, [['Level: ', BLK], [abyss ? 'Abyss' : String(s.stage), G]], 210, y1 + f.ascent));
    d.box.addChild(runs(f, [['Accuracy: ', BLK], [noStats ? 'N/A' : `${s.accuracy}%`, G]], 30, y1 + H + f.ascent, 'right', 148));
    d.box.addChild(runs(f, [['Time: ', BLK], [`${mins}:${String(secs).padStart(2, '0')}`, G]], 210, y1 + H + f.ascent));
    if (abyss) {
      wrap(f, 'A checkpoint is stored every 400 feet.', 200).forEach((l, i) =>
        d.box.addChild(textAt(f, l, 75, y1 + 2 * H + 20 + f.ascent + i * H, 0x646464)),
      );
    }
    if (rank >= 0) d.box.addChild(textAt(f, `New Hall of Fame entry: #${rank + 1}!`, 40, y1 + (abyss ? 5 : 3) * H + f.ascent, 0x2d63ff, 'center', cw));
    this.modal = d;
    this.overlay.addChild(d);
  }

  private playAgain() {
    const s = this.session;
    const n = new Session(s.abyss ? 'abyss' : s.difficulty);
    if (s.abyss) n.charge = 0;
    game.set(new BoardScene(n));
  }

  // ---------------------------------------------------------------- zapper

  private fireZapper() {
    const s = this.session;
    const st = this.diver.state;
    if (st === DState.Boss) {
      play('bad');
      this.showMessage('The zapper has no effect on bosses!');
      return;
    }
    if (st !== DState.Normal && st !== DState.Landed) return;
    if (this.empX >= 0) return;
    if (s.charge < 1) {
      play('bad');
      this.showMessage('The zapper is still charging up');
      return;
    }
    this.empX = DIVER_X + 50;
    this.draining = true;
    this.zapperUsed = true;
    musicOrder(0);
    this.flash.alpha = 1;
    play('emp');
    this.showMessage('Zapper fired! That costs you the bonus points');
    const wave = new Sprite(tex('empwave'));
    wave.label = 'emp';
    this.fxLayer.addChild(wave);
  }

  private updateEmp() {
    if (this.empX < 0) return;
    this.empX += 10;
    const w = this.fxLayer.getChildByLabel('emp') as Sprite | null;
    if (w) w.x = this.empX - w.width / 2;
    for (const e of this.allEnemies()) {
      if (!e.isTargetable || e.x >= this.empX + 16) continue;
      if (e instanceof Jellyfish && e.y >= HEIGHT) continue;
      e.silentKill = false;
      e.words = [e.word];
      const pts = (e instanceof Jellyfish ? 200 : e.points()) * this.session.pointsMultiplier;
      this.session.addScore(pts);
      this.countKill(e);
      e.zap();
      if (this.target === e) this.target = null;
    }
    if (this.empX > WIDTH) {
      this.empX = -1;
      w?.destroy();
    }
  }

  // ---------------------------------------------------------------- input

  onKey(key: string) {
    if (key === 'Enter' && this.modal) {
      this.modal.buttons[0]?.action();
      return;
    }
    if (key === 'Enter') {
      if (this.phase === 'play') this.fireZapper();
    } else if (key === 'Escape') {
      if (this.modal) {
        if (this.phase === 'gameover') return;
        const wasQuit = this.phase === 'paused';
        this.modal.destroy({ children: true });
        this.modal = null;
        if (wasQuit) this.togglePause();
        return;
      }
      this.togglePause();
    }
  }

  private openOptions() {
    if (this.phase === 'gameover') return;
    void import('../scenes/options').then(({ OptionsScene }) => game.push(new OptionsScene()));
  }

  private modal: Dialog | null = null;

  private confirmQuit() {
    if (this.modal) return;
    if (this.phase === 'gameover') {
      void this.quitToMenu();
      return;
    }
    if (this.phase !== 'paused') this.togglePause();
    const s = this.session;
    const text = s.abyss
      ? 'Stop diving now? Your depth is kept at every 400-foot checkpoint.'
      : s.stage > 1
        ? 'Stop playing now? Your game is kept, but this level will start over when you return.'
        : 'Stop playing now? Nothing is kept until you clear the first level.';
    this.modal = new Dialog('QUIT GAME?', text, [
      { label: 'Yes', key: 'Y', action: () => void this.quitToMenu() },
      {
        label: 'No',
        key: 'N',
        action: () => {
          this.modal?.destroy({ children: true });
          this.modal = null;
          this.togglePause();
        },
      },
    ]);
    this.overlay.addChild(this.modal);
  }

  private togglePause() {
    if (this.modal) return;
    if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
      this.overlay.getChildByLabel('pause')?.destroy({ children: true });
    } else if (this.phase !== 'gameover' && this.phase !== 'complete') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
      const p = new Container();
      p.label = 'pause';
      p.addChild(new Graphics().rect(0, 25, WIDTH, 455).fill({ color: 0x000000, alpha: 0.5 }));
      p.addChild(textAt(font('SwissCheesed24'), 'PAUSED', 0, 240, 0xffffff, 'center', WIDTH));
      const line = profile().options.spacePauses ? 'Press space or the pause button to dive back in' : 'Click the pause button to dive back in';
      p.addChild(textAt(font('Rockwell13'), line, 0, 281, 0xc8c8c8, 'center', WIDTH));
      this.overlay.addChild(p);
    }
  }
  private pausedFrom: Phase = 'play';

  onChar(raw: string) {
    const c = raw >= 'a' && raw <= 'z' ? raw.toUpperCase() : raw;
    if (this.modal) {
      this.modal.key(c);
      return;
    }
    if (this.phase === 'paused') {
      if (c === ' ' && profile().options.spacePauses) this.togglePause();
      return;
    }
    if (c === ' ' && profile().options.spacePauses && (this.phase === 'play' || this.phase === 'airfill')) {
      this.togglePause();
      return;
    }
    if (this.phase === 'gameover' || this.phase === 'complete') {
      if (c === ' ') void this.advance();
      return;
    }
    if (this.phase === 'treasure') {
      this.treasureKey(c);
      return;
    }
    if (c === ' ') return;
    if (this.phase !== 'play') return;
    const st = this.diver.state;
    if (st === DState.Boss) {
      this.bossKey(c);
      return;
    }
    if (st !== DState.Normal && !(st === DState.Landed && !this.waveCleared)) return;

    if (this.target instanceof Projectile) this.target = null;
    if (this.target) {
      if (!this.target.removed && this.target.isTargetable && this.target.nextChar === c) this.correct(this.target);
      else this.typo(c, true);
      return;
    }
    const candidates: Enemy[] = [
      ...this.sharks.filter((e) => e.x + 20 < WIDTH),
      ...this.piranhas.filter((e) => e.x + 20 < WIDTH),
      ...this.jellies.filter((e) => e.y + 20 < HEIGHT && !e.stealthed),
    ];
    const hit = candidates.find((e) => e.isTargetable && e.nextChar === c);
    if (hit) this.correct(hit);
    else this.typo(c, false);
  }

  private bossKey(c: string) {
    const b = this.boss;
    if (!b || b.health <= 0) return;
    const s = this.session;
    const counts = !b.projectiles[0]?.cannon && (b.type === 'Torpedo' || b.type === 'MechaShark');
    let t = this.target instanceof Projectile && !this.target.removed && this.target.state === PState.Incoming ? this.target : null;
    if (!t) {
      t = b.projectiles.find((p) => p.state === PState.Incoming && p.x + 20 < WIDTH && p.nextChar === c) ?? null;
      if (!t) {
        play('wrong');
        this.showMessage(`Oops! Nothing out there starts with "${c}"`);
        if (counts) s.typos++;
        return;
      }
    }
    if (t.nextChar !== c) {
      play('wrong');
      this.showMessage(`Oops! "${c}" isn't the next letter`);
      if (counts) s.typos++;
      return;
    }
    play(['type', 'type2', 'type3'][rand() % 3]);
    if (t.typed === 0) this.wordStart = this.ticks * 10;
    if (counts) s.correct++;
    this.target = t;
    if (t.typeLetter()) {
      if (counts) s.typingMs += this.ticks * 10 - this.wordStart;
      this.onProjectileReturned(t);
    }
  }

  private correct(e: Enemy) {
    const s = this.session;
    play(['type', 'type2', 'type3'][rand() % 3]);
    if (e.typed === 0) this.wordStart = this.ticks * 10;
    this.target = e;
    const piranhaWave = this.currentWave?.type === 'Piranhas';
    this.waveCorrect++;
    if (!piranhaWave) s.correct++;
    const done = e.typeLetter();
    if (this.currentWave?.type !== 'Bonus') e.x += this.currentWave?.knockBack ?? 0;
    if (done) this.onWordComplete(e, e.points());
    if (e instanceof Piranha) this.target = null;
  }

  private typo(c: string, locked: boolean) {
    const s = this.session;
    play('wrong');
    this.showMessage(locked ? `Oops! "${c}" isn't the next letter` : `Oops! Nothing out there starts with "${c}"`);
    const piranhaWave = this.currentWave?.type === 'Piranhas';
    this.waveTypos++;
    if (!piranhaWave) s.typos++;
    if (locked && this.target && !(this.target instanceof Projectile) && this.currentWave?.type !== 'Bonus') this.target.typo();
    if (piranhaWave && !this.waveCleared) {
      this.typoStreak++;
      if (this.typoStreak >= s.level.numForPenalty) {
        this.typoStreak = 0;
        this.spawnPenaltyFish();
      }
    }
  }

  /** Spawns a penalty piranha after too many typos in a piranha wave. */
  private spawnPenaltyFish() {
    if (!this.piranhas.some((p) => p.state !== EState.Dying && !p.removed)) return;
    const letter = this.session.words.letter();
    if (!letter) return;
    this.penaltyCount++;
    let speed = this.session.level.penaltySpeed * this.penaltyMult;
    if (this.penaltyCount >= 6) {
      this.penaltyMult *= 1.7;
      speed = 0.4 * this.penaltyMult;
    }
    const g = new Piranha('Gumbo', [letter], speed);
    g.position.set(WIDTH - 50, 25 + (rand() % (PLAY_H - 125)));
    this.piranhas.push(g);
    this.enemyLayer.addChild(g);
  }

  // ---------------------------------------------------------------- end of level

  private levelUi = new Container();
  private gaugeY = 157;
  private resultsMs = 0;
  private resultsAlpha = 1;
  private sonarStep = 0;
  private sonarT = 0;
  private sweep: (Sprite | null)[] = [];
  private secretItem = '';

  private clearLevelUi() {
    this.levelUi.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!this.levelUi.parent) this.overlay.addChildAt(this.levelUi, 0);
  }

  /** Air refill before the treasure dive. */
  private startAirFill() {
    musicOrder(0x22);
    this.phase = 'airfill';
    this.air = 0;
    this.gem = rand() % 6;
    this.drawLevelUi();
  }

  private drawLevelUi() {
    this.clearLevelUi();
    const f = font('Rockwell13');
    const bonus = this.session.level.bonusLevel;
    if (bonus) {
      this.levelUi.addChild(textAt(font('SwissCheesed24'), 'HIDDEN BONUS DIVE!', 0, 60, 0xfda03d, 'center', WIDTH));
      this.levelUi.addChild(textAt(f, 'Type the letter on a clam to pop it open. Hurry, the clock is ticking!', 0, 85, 0xffffff, 'center', WIDTH));
      if (this.phase === 'treasure') this.levelUi.addChild(textAt(f, 'Find two pearls of the same color to win the prize!', 0, 100, 0xffffff, 'center', WIDTH));
      this.gaugeY = 85 + 2 * f.ascent;
    } else {
      const banner = new Sprite(tex('shipwreckbonus'));
      banner.position.set(124, 50);
      this.levelUi.addChild(banner);
      this.levelUi.addChild(textAt(f, 'Grab treasure by typing words until your air is gone!', 0, TOP_H + 19, 0xffffff, 'center', WIDTH));
      this.gaugeY = TOP_H + 2 * 19;
    }
    const gauge = new Sprite(tex('airgauge'));
    gauge.position.set(175, this.gaugeY);
    this.airFill = new Graphics();
    this.levelUi.addChild(gauge, this.airFill);
    if (this.phase === 'airfill') {
      const t = textAt(f, 'REFILLING YOUR AIR!', 0, this.gaugeY + 45, 0xffffff);
      t.x = Math.round(175 + 145 - t.textWidth / 2);
      this.levelUi.addChild(t);
    }
    this.wordUi = new Container();
    this.levelUi.addChild(this.wordUi);
    this.drawAir();
  }
  private wordUi = new Container();

  /** Fill: green rect (gaugeX+19, gaugeY+7, air, 15); blinks below a third. */
  private drawAir() {
    if (!this.airFill) return;
    const f = Math.max(0, this.air / AIR_MAX);
    let alpha = 1;
    if (this.phase === 'treasure' && f < 1 / 3) {
      const rate = f < 1 / 6 ? 8 : 4;
      const period = (85 / rate) * 2;
      const ph = (this.ticks % period) / period;
      alpha = (170 + 85 * (ph < 0.5 ? ph * 2 : 2 - ph * 2)) / 255;
    }
    this.airFill.clear().rect(175 + 19, this.gaugeY + 7, Math.max(0, this.air), 15).fill({ color: 0x00ff00, alpha });
  }

  /** The shipwreck treasure dive. */
  private startTreasure() {
    play('treasure');
    this.phase = 'treasure';
    this.diver.setState(DState.Treasure);
    this.drawLevelUi();
    this.nextTreasureWord();
  }

  private nextTreasureWord() {
    const l = this.session.level;
    this.treasureWord = this.session.words.treasureWord(l.minEndDiff, l.maxEndDiff);
    this.treasureTyped = 0;
    this.drawTreasureWord();
  }

  /** "Word value: N pts" at 441-4H, then the word (typed part green) at 441-2*63. */
  private drawTreasureWord() {
    this.wordUi.removeChildren().forEach((c) => c.destroy({ children: true }));
    const f = font('Rockwell13');
    const value = this.session.treasureWordValue(this.treasureWords);
    this.wordUi.addChild(runs(f, [['Word value: ', 0x00ff00], [`${value} pts`, 0xffc200]], 0, STATUS_Y - 4 * 19, 'center', WIDTH));
    const big = font('MyriadCondensedWeb28Bold');
    const w = this.treasureWord;
    this.wordUi.addChild(runs(big, [[w.slice(0, this.treasureTyped), 0x00e600], [w.slice(this.treasureTyped), 0xffffff]], 0, STATUS_Y - 2 * 63 + big.ascent - 10, 'center', WIDTH));
  }

  private startClams() {
    play('treasure');
    this.phase = 'treasure';
    this.diver.setState(DState.Treasure);
    this.drawLevelUi();
    this.clams = new ClamGame((n) => this.session.addScore(n));
    this.enemyLayer.addChild(this.clams);
  }

  private endClams() {
    const pairs = this.clams?.pairs ?? 0;
    this.secretFound = pairs >= 1;
    // The item is credited even when time runs out.
    this.secretItem = ['crown', 'figurine', 'necklace', 'scepter'][rand() & 3];
    play('wingem');
    profile().adventure.secrets[['crown', 'figurine', 'necklace', 'scepter'].indexOf(this.secretItem)]++;
    saveProfiles();
    this.startResults(false);
  }

  private treasureKey(c: string) {
    const s = this.session;
    if (c === ' ') return;
    if (this.clams) {
      this.clams.key(c);
      return;
    }
    if (this.treasureWord[this.treasureTyped] === c) {
      play(['type', 'type2', 'type3'][rand() % 3]);
      if (this.treasureTyped === 0) this.wordStart = this.ticks * 10;
      this.treasureTyped++;
      s.correct++;
      if (this.treasureTyped >= this.treasureWord.length) {
        s.typingMs += this.ticks * 10 - this.wordStart;
        const v = s.treasureWordValue(this.treasureWords);
        s.addScore(v);
        this.treasurePoints += v;
        this.treasureWords++;
        play(`tone${Math.min(Math.floor((this.treasureWords - 1) / 2), 12) + 1}`);
        play('diverenters');
        for (let i = 0; i < 50; i++) this.addBubble(200 + (rand() % 240), 280);
        this.nextTreasureWord();
        return;
      }
      this.drawTreasureWord();
    } else {
      play('wrong');
      s.typos++;
      if (this.air > 5) this.air -= 5;
    }
  }

  private endTreasure() {
    play('wingem');
    const prof = profile().adventure;
    prof.gems[this.gem]++;
    prof.maxTreasureWords = Math.max(prof.maxTreasureWords, this.treasureWords);
    saveProfiles();
    this.startResults(false);
  }

  /** Results: the gem found (or the secret item) and the level bonus. */
  private startResults(afterBoss: boolean) {
    const s = this.session;
    this.phase = 'results';
    this.diver.setState(DState.Complete);
    this.resultsMs = 0;
    this.resultsAlpha = 1;
    musicOrder(0x2e);
    const levelBonus = s.levelBonus();
    s.addScore(levelBonus);
    this.clearLevelUi();
    const f = font('MyriadCondensedWeb14Bold');
    const A = f.ascent;
    if (s.level.bonusLevel) {
      if (this.secretFound) {
        this.levelUi.addChild(textAt(f, 'A hidden treasure is yours!', 0, 60, 0xffffff, 'center', WIDTH));
        const img = new Sprite(tex(`secret_${this.secretItem}_lrg`));
        img.position.set(Math.round((WIDTH - img.width) / 2), 75);
        this.levelUi.addChild(img);
      } else {
        this.levelUi.addChild(textAt(f, 'Out of time! The hidden treasure stays buried for now.', 0, 60, 0xffffff, 'center', WIDTH));
      }
      return;
    }
    this.levelUi.addChild(textAt(f, 'You found', 0, 65, 0xffffff, 'center', WIDTH));
    const gem = new Sprite(tex(GEM_IMAGES[this.gem]));
    gem.position.set(300, 65 + A);
    this.levelUi.addChild(gem);
    for (let i = 0; i < 3; i++) {
      const sp = new Sprite(frames('sparkle_large', 14)[rand() % 14]);
      sp.blendMode = 'add';
      sp.position.set(300 + (rand() % 30) - 10, 65 + A + (rand() % 30) - 10);
      sp.label = 'sparkle';
      this.levelUi.addChild(sp);
    }
    const adj = parseNameList(data('gemnames.txt'));
    const name = `the ${adj[rand() % adj.length]} ${GEM_NAMES[this.gem]}!`;
    this.levelUi.addChild(textAt(f, name, 0, 41 + A + 120, 0xffffff, 'center', WIDTH));
    this.levelUi.addChild(textAt(f, `+${levelBonus} pts`, 0, 41 + 2 * A + 120, 0x00ff00, 'center', WIDTH));
    if (afterBoss) {
      this.levelUi.addChild(textAt(f, `Bonus points: ${s.bossBonus()}`, 0, 41 + 3 * A + 120, 0xffffff, 'center', WIDTH));
    } else {
      this.levelUi.addChild(textAt(f, `Bonus words: ${this.treasureWords}`, 0, 41 + 3 * A + 120, 0xffffff, 'center', WIDTH));
      this.levelUi.addChild(textAt(f, `Bonus points: ${this.treasurePoints}`, 0, 41 + 4 * A + 120, 0xffffff, 'center', WIDTH));
    }
  }

  private updateResults() {
    this.resultsMs += 10;
    for (const c of this.levelUi.children) {
      if (c.label === 'sparkle' && this.ticks % 3 === 0) {
        const sp = c as Sprite;
        const fr = frames('sparkle_large', 14);
        sp.texture = fr[(fr.indexOf(sp.texture) + 1) % 14];
      }
    }
    if (this.resultsMs <= 3000) return;
    this.resultsAlpha -= 1 / 255;
    this.levelUi.alpha = Math.max(0, this.resultsAlpha);
    if (this.clams) this.clams.alpha = this.levelUi.alpha;
    if (this.resultsAlpha <= 0) this.showComplete();
  }

  /** Level-complete stats over the sonar sweep. */
  private showComplete() {
    const s = this.session;
    this.phase = 'complete';
    musicOrder(0x11);
    this.clearLevelUi();
    this.levelUi.alpha = 1;
    this.clams?.destroy({ children: true });
    this.clams = undefined;
    const acc = s.accuracy;
    let accBonus = 0;
    if (acc >= 95 && !s.level.bonusLevel) {
      s.levelsAt95++;
      accBonus = s.levelAccuracyBonus(s.levelsAt95);
      s.addScore(accBonus);
    }
    const ui = this.levelUi;
    ui.addChild(new Graphics().rect(0, 25, WIDTH, 455).fill({ color: 0x000000, alpha: 0.5 }));
    const bg = new Sprite(tex('sonar_bg'));
    bg.position.set(138, 23);
    ui.addChild(bg);
    this.sweep = [];
    for (const [x, y] of [[320, 50], [320, 205], [165, 205], [165, 50]]) {
      const sp = new Sprite();
      sp.position.set(x, y);
      ui.addChild(sp);
      this.sweep.push(sp);
    }
    this.sonarStep = 0;
    this.sonarT = 0;
    const f = font('MyriadCondensedWeb14Bold');
    const W = 0xffffff;
    const O = 0xffa324;
    const col = 190 + f.measure('Adjusted WPM: ');
    ui.addChild(textAt(f, 'Level Complete!', 245, 123, O));
    ui.addChild(textAt(f, 'Adjusted WPM:', 190, 149, W), textAt(f, String(s.adjustedWpm ?? 'N/A'), col, 149, O));
    ui.addChild(textAt(f, 'Accuracy:', 190, 175, W), textAt(f, `${acc}%`, col, 175, O));
    let y = 201;
    if (!s.level.bonusLevel) {
      const small = font('12ptfont');
      const g = 0x3ca078;
      if (accBonus) {
        ui.addChild(textAt(small, `Sharp typing! +${accBonus} points`, 190, y, g));
        if (s.levelsAt95 > 1) {
          y += 26;
          ui.addChild(textAt(small, `Levels at 95%+ accuracy: ${s.levelsAt95}`, 190, y, g));
        }
      } else ui.addChild(textAt(small, 'Reach 95% accuracy for a reward', 190, y, g));
      y += 26;
    }
    ui.addChild(runs(f, [['RANK: ', W], [rankFor(s.score), O]], 190, y));
    y += 26;
    const next = nextRankAt(s.score);
    ui.addChild(textAt(font('Rockwell13'), next ? `Next rank: ${next} points` : 'You reached the very top rank!', 190, y, W));
    ui.addChild(textAt(font('Rockwell13'), 'Press SPACE to continue', 0, 400, 0x9fe8ff, 'center', WIDTH));
  }

  /** One clockwise sonar sweep: a quadrant frame every 6 ticks, ping at the start. */
  private updateSonar() {
    if (++this.sonarT % 6 !== 0 || this.sonarStep > 16) return;
    if (this.sonarStep === 0) play('sonarping1');
    this.sonarStep++;
    const st = this.sonarStep;
    const q = Math.floor((st - 1) / 4);
    const fr = ((st - 1) % 4) + 1;
    this.sweep.forEach((sp, i) => {
      if (!sp) return;
      sp.visible = i === q && st <= 16;
      if (!sp.visible) return;
      // Quadrants 0/1 use the two sweep sets; 2/3 are mirrored copies of them.
      // Left quadrants are the right ones rotated 180 degrees, which keeps the sweep clockwise.
      const base = i === 0 || i === 2 ? 'sonar_sweep_' : 'sonar_sweep2_';
      sp.texture = tex(`${base}${fr}`);
      sp.scale.set(i >= 2 ? -1 : 1);
      sp.anchor.set(i >= 2 ? 1 : 0);
    });
  }

  private async advance() {
    if (this.phase === 'gameover') {
      void this.quitToMenu();
      return;
    }
    const s = this.session;
    s.markVisited();
    if (s.final && !s.uncharted && s.levelIndex === 35) {
      const { WinScene } = await import('../scenes/win');
      game.set(new WinScene(s));
      return;
    }
    const { MapScene } = await import('../scenes/map');
    game.set(new MapScene(s));
  }

  private async quitToMenu() {
    const s = this.session;
    if (s.abyss && this.phase !== 'gameover') {
      const a = profile().abyss;
      a.deepest = Math.max(a.deepest, s.depth);
      saveProfiles();
    }
    const { SelectorScene } = await import('../scenes/selector');
    game.set(new SelectorScene());
  }
}
