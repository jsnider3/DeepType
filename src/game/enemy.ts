// Enemies: sharks (all variants), piranhas (incl. penalty "gumbo" fish) and bonus
// jellyfish. Coordinates are the sprite's
// top-left in 640x480 space; speeds are px per 10 ms tick.

import { BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { EnemyType } from '../data/config';
import { activeManifest, frames, tex } from '../engine/assets';
import { play } from '../engine/audio';
import { BitmapText, font } from '../engine/font';
import { WIDTH } from '../engine/app';
import { wordValue } from '../data/words';

export const enum EState {
  Swim = 0,
  Attack = 1,
  Dying = 3,
  Flee = 4,
  Zapped = 5,
  TypoFlash = 6,
}

export type EnemyKind = 'shark' | 'piranha' | 'jelly';

export interface EnemyHost {
  /** Diver's y (attacking sharks dash at the diver's height). */
  diverY(): number;
  onWordComplete(e: Enemy, points: number): void;
  onAttack(e: Enemy): void;
  onDiverHit(e: Enemy): void;
  onRemove(e: Enemy): void;
  onBubbleBurst(e: Enemy): void;
}

interface Art {
  swim: string;
  shock: string;
  death: string;
  deathFrames: number;
  glow?: string;
  glowDeath?: string;
  textOffset: number;
  typedColor: number;
  untypedColor: number;
  /** Word font: sharks MyriadCondensedWeb15, piranhas Courier, jellyfish 12ptfont. */
  font?: string;
}

const SHARK_ART: Record<string, Art> = {
  basic: { swim: 'shark_basic_swim', shock: 'sharkshock', death: 'shark_basic_death', deathFrames: 6, textOffset: 11, typedColor: 0xffff64, untypedColor: 0x000000 },
  black: { swim: 'shark_black_swim', shock: 'shark_black_shock', death: 'shark_black_death', deathFrames: 6, textOffset: 11, typedColor: 0xffff64, untypedColor: 0x000000 },
  red: { swim: 'shark_red_swim', shock: 'shark_red_shock', death: 'shark_red_death', deathFrames: 6, textOffset: 11, typedColor: 0xffff64, untypedColor: 0x000000 },
  toxic: { swim: 'toxic_basic_swim', shock: 'toxic_basic_shock', death: 'toxic_basic_death', deathFrames: 6, glow: 'toxic_glow_swim', glowDeath: 'toxic_glow_death', textOffset: 7, typedColor: 0xffffff, untypedColor: 0x000000 },
  ghost: { swim: 'shark_ghost_swim', shock: 'sharkshock', death: 'shark_ghost_death', deathFrames: 6, glow: 'shark_ghost_glow_swim', glowDeath: 'shark_ghost_glow_death', textOffset: 11, typedColor: 0xeb0000, untypedColor: 0x000000 },
  piranha: { swim: 'piranha_basic_swim', shock: 'piranhashock', death: 'piranha_basic_death', deathFrames: 10, textOffset: 0, typedColor: 0xffff64, untypedColor: 0x000000, font: 'CourierFinalDraft15Bold' },
  piranhaWhite: { swim: 'piranha_white_swim', shock: 'piranhashock', death: 'piranha_white_death', deathFrames: 10, textOffset: 0, typedColor: 0xffff64, untypedColor: 0x000000, font: 'CourierFinalDraft15Bold' },
  gumbo: { swim: 'gumbo_swim', shock: 'gumbo_shock', death: 'gumbo_die', deathFrames: 10, textOffset: 4, typedColor: 0xffff64, untypedColor: 0xffffff, font: 'CourierFinalDraft15Bold' },
};

const TYPO_TINT = 0xc80000;

export abstract class Enemy extends Container {
  abstract readonly kind: EnemyKind;
  state: EState = EState.Swim;
  vx = 0;
  vy = 0;
  /** Words still to type; words[0] is current. */
  words: string[];
  typed = 0;
  stealthed = false;
  /** Entity behind this one in its formation row, pulled in when this one's word completes. */
  next: Enemy | null = null;
  removed = false;
  silentKill = false;

  protected body = new Sprite();
  protected glow?: Sprite;
  protected text?: BitmapText;
  /** Optional backing behind the word (packs with wordPlates). */
  protected plate?: Graphics;
  protected tick = 0;
  protected frame = 0;
  protected animDelay = 8;
  protected numFrames = 20;
  protected stateTicks = 0;
  protected toggles = 0;
  protected swimFrames: Texture[];

  constructor(readonly type: EnemyType, words: string[], protected art: Art, frameCount: number) {
    super();
    this.words = words;
    this.swimFrames = frames(art.swim, frameCount);
    this.numFrames = frameCount;
    this.frame = Math.floor(Math.random() * frameCount);
    if (art.glow) {
      this.glow = new Sprite(frames(art.glow, frameCount)[this.frame]);
      this.glow.blendMode = 'add';
      this.glow.position.set(-10, -10);
      this.addChild(this.glow);
    }
    this.body.texture = this.swimFrames[this.frame];
    this.addChild(this.body);
    this.makeText();
  }

  get frameW() {
    return this.swimFrames[0].width;
  }
  get frameH() {
    return this.swimFrames[0].height;
  }
  get word() {
    return this.words[0] ?? '';
  }
  get nextChar() {
    return this.word[this.typed];
  }
  get isTargetable() {
    return (this.state === EState.Swim || this.state === EState.TypoFlash) && !this.removed;
  }
  get alive() {
    return this.state === EState.Swim || this.state === EState.TypoFlash || this.words.length > 1;
  }

  /** The word's untyped colour: the pack's, or this creature's own. */
  protected get untypedColor() {
    return activeManifest()?.wordColors?.[0] ?? this.art.untypedColor;
  }

  protected makeText() {
    this.text?.destroy();
    this.text = undefined;
    this.plate?.destroy();
    this.plate = undefined;
    if (!this.word) return;
    this.text = new BitmapText(font(this.art.font ?? 'MyriadCondensedWeb15'), this.word, this.untypedColor);
    if (activeManifest()?.wordPlates) {
      // A soft halo that lifts the word off a busy painted body: light under dark words,
      // dark under light ones.
      const dark = this.untypedColor === 0x000000;
      const pad = 3;
      this.plate = new Graphics()
        .roundRect(-pad, 2, this.text.textWidth + pad * 2, this.text.font.height - 4, 8)
        .fill({ color: dark ? 0xffffff : 0x000000, alpha: dark ? 0.5 : 0.45 });
      this.plate.filters = [new BlurFilter({ strength: 4, quality: 2 })];
      this.addChild(this.plate);
    }
    this.addChild(this.text);
    this.layoutText();
    this.refreshText();
  }

  protected layoutText() {
    if (!this.text) return;
    const t = this.text;
    t.position.set(
      Math.round((this.frameW - t.textWidth) / 2 + (activeManifest()?.wordOffsets?.[this.art.swim] ?? this.art.textOffset)),
      Math.round((this.frameH - t.font.height) / 2),
    );
    this.plate?.position.copyFrom(t.position);
  }

  protected refreshText() {
    if (!this.text) return;
    this.text.tint = this.untypedColor;
    this.text.tintRange(0, this.typed, activeManifest()?.wordColors?.[1] ?? this.art.typedColor);
    this.text.alpha = this.stealthed ? 50 / 255 : 1;
    const showText = this.state === EState.Swim || this.state === EState.TypoFlash || this.state === EState.Flee;
    this.text.visible = showText;
    if (this.plate) {
      this.plate.visible = showText;
      this.plate.alpha = this.text.alpha;
    }
  }

  /** Correct letter typed (TryLetter already matched). Returns true when the word completed. */
  typeLetter(): boolean {
    this.typed++;
    if (this.typed >= this.word.length) {
      this.pullNext();
      this.refreshText();
      return true;
    }
    this.refreshText();
    return false;
  }

  /** Linked-queue pull: an idle follower still off-screen jumps to the right edge. */
  protected pullNext() {
    const n = this.next;
    if (n && !n.removed && n.state === EState.Swim && n.x > WIDTH) n.x = WIDTH;
    this.next = null;
  }

  points(): number {
    return 15 * wordValue(this.word);
  }

  typo() {
    if (this.state === EState.Swim) this.setState(EState.TypoFlash);
  }

  setState(s: EState) {
    this.state = s;
    this.stateTicks = 0;
    this.toggles = 0;
    this.refreshText();
  }

  abstract update(host: EnemyHost): void;
  /** Hit by a completed word or the zapper. */
  abstract zap(): void;
  flee(): void {}

  protected animate() {
    if (++this.tick % this.animDelay === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }
  }

  protected setBody(t: Texture) {
    this.body.texture = t;
  }
}

// ----------------------------------------------------------------------------

function sharkArt(type: EnemyType): Art {
  switch (type) {
    case 'Black': case 'Purple': case 'BlackStealth': return SHARK_ART.black;
    case 'Red': case 'RedStealth': return SHARK_ART.red;
    case 'Toxic': case 'CrazyToxic': return SHARK_ART.toxic;
    case 'Ghost': return SHARK_ART.ghost;
    default: return SHARK_ART.basic;
  }
}

/** Shark family: Blue, Black (2 words), Red (3 words), stealth variants, Toxic, Ghost. */
export class Shark extends Enemy {
  readonly kind = 'shark';
  private dashed = false;
  private savedVx = 0;
  private bubbled = false;
  private hitDiver = false;
  private deathFrames: Texture[];
  private glowDeathFrames?: Texture[];
  private shockTex: Texture;
  private mutateMs = 0;
  private mutateTimer = 0;

  constructor(type: EnemyType, words: string[], speed: number, opts: { letterDelay?: number; mutateAfterType?: number } = {}) {
    const art = sharkArt(type);
    super(type, words, art, 20);
    this.deathFrames = frames(art.death, art.deathFrames);
    if (art.glowDeath) this.glowDeathFrames = frames(art.glowDeath, art.deathFrames);
    this.shockTex = tex(art.shock);
    this.vx = speed;
    this.stealthed = type === 'Stealth' || type === 'RedStealth' || type === 'BlackStealth';
    if (this.stealthed) {
      this.savedVx = speed;
      this.vx = 3.0;
      this.dashed = true; // stealth sharks use their own entry instead of the dash
      this.body.alpha = 0.5;
    }
    this.mutateMs = opts.letterDelay ?? 0;
    this.mutateAfterType = opts.mutateAfterType ?? 2000;
    this.refreshText();
  }

  private mutateAfterType: number;

  get isToxic() {
    return this.type === 'Toxic' || this.type === 'CrazyToxic';
  }

  typeLetter(): boolean {
    if (this.isToxic) {
      this.mutateMs = this.mutateAfterType;
      this.mutateTimer = 0;
    }
    return super.typeLetter();
  }

  /** Called by the board after scoring a completed word. */
  zap() {
    this.setState(EState.Zapped);
    if (!this.silentKill) play(this.words.length > 1 ? 'sharkhurt' : 'sharkdies');
  }

  update(host: EnemyHost) {
    this.stateTicks++;
    switch (this.state) {
      case EState.Swim:
      case EState.TypoFlash:
        this.swim(host);
        break;
      case EState.Zapped:
        // Toggle swim frame <-> shock image every 7 ticks, 6 toggles, then die.
        if (this.stateTicks % 7 === 0) this.toggles++;
        this.setBody(this.toggles % 2 ? this.shockTex : this.swimFrames[this.frame]);
        if (this.glow) this.glow.visible = this.toggles % 2 === 0;
        if (this.toggles >= 6) this.afterZap();
        break;
      case EState.Dying: {
        const f = Math.min(Math.floor(this.stateTicks / 6), this.deathFrames.length - 1);
        this.setBody(this.deathFrames[f]);
        if (this.glow && this.glowDeathFrames) {
          this.glow.visible = true;
          this.glow.texture = this.glowDeathFrames[f];
        }
        this.vy = 1.5;
        this.y -= this.vy;
        if (this.y < -70) this.remove(host);
        break;
      }
      case EState.Attack:
        this.animate();
        this.setBody(this.swimFrames[this.frame]);
        this.x += this.vx;
        if (!this.hitDiver && this.x >= -70) {
          this.hitDiver = true;
          play('playerdies');
          host.onDiverHit(this);
        }
        if (this.x > WIDTH) this.remove(host);
        break;
      case EState.Flee:
        this.animate();
        this.setBody(this.swimFrames[this.frame]);
        this.vx += 0.2;
        this.x -= this.vx;
        if (this.x < -this.frameW) this.remove(host);
        break;
    }
    if (this.glow && (this.state === EState.Swim || this.state === EState.TypoFlash || this.state === EState.Flee || this.state === EState.Attack)) {
      this.glow.texture = frames(this.art.glow!, 20)[this.frame];
    }
  }

  private afterZap() {
    if (this.words.length > 1 && !this.silentKill) {
      // Multi-word shark: next word, keep vx, resume swimming.
      this.words.shift();
      this.typed = 0;
      this.makeText();
      this.vy = 0;
      this.frame = Math.floor(Math.random() * 20);
      this.setState(EState.Swim);
      this.setBody(this.swimFrames[this.frame]);
      if (this.glow) this.glow.visible = true;
      return;
    }
    this.words = [];
    this.setState(EState.Dying);
  }

  private swim(host: EnemyHost) {
    this.animate();
    if (this.state === EState.TypoFlash) {
      if (this.stateTicks % 5 === 0) this.toggles++;
      this.body.tint = this.toggles % 2 ? TYPO_TINT : 0xffffff;
      if (this.toggles >= 10) {
        this.body.tint = 0xffffff;
        this.state = EState.Swim;
      }
    }
    this.setBody(this.swimFrames[this.frame]);

    if (this.stealthed) {
      if (!this.bubbled && this.x < 600) {
        this.bubbled = true;
        host.onBubbleBurst(this);
      }
      if (this.x < 400) {
        this.stealthed = false;
        this.body.alpha = 1;
        this.refreshText();
      }
    } else if (this.savedVx > 0 && this.vx > this.savedVx) {
      // Revealed stealth shark slows down to its configured speed.
      this.vx = Math.max(this.savedVx, this.vx - 0.02);
    }

    if (this.x <= 40) this.vx += 0.05;
    if (!this.dashed && this.x <= WIDTH && this.x > WIDTH - this.frameW / 2) {
      this.dashed = true;
      this.savedVx = this.vx;
      this.vx = 1.5;
    } else if (this.dashed && !this.stealthed && this.vx > this.savedVx && this.x > 40) {
      this.vx = Math.max(this.savedVx, this.vx - 0.009);
    }

    if (this.isToxic && this.mutateMs > 0) {
      this.mutateTimer += 10;
      if (this.mutateTimer >= this.mutateMs && this.word.length - this.typed >= 2) {
        this.mutateTimer = 0;
        this.scramble();
      }
    }

    this.x -= this.vx;
    if (this.x <= -this.frameW) {
      this.x = -this.frameW;
      this.y = host.diverY();
      this.vx = 5.0;
      this.body.scale.x = -1;
      this.body.x = this.frameW;
      if (this.glow) {
        this.glow.scale.x = -1;
        this.glow.x = this.frameW + 10;
      }
      this.setState(EState.Attack);
      host.onAttack(this);
    }
  }

  /** Toxic: permute the untyped letters; the first letter never changes. */
  private scramble() {
    const w = this.word;
    const start = Math.max(this.typed, 1);
    const tail = w.slice(start).split('');
    for (let i = tail.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tail[i], tail[j]] = [tail[j], tail[i]];
    }
    this.words[0] = w.slice(0, start) + tail.join('');
    const typed = this.typed;
    this.makeText();
    this.typed = typed;
    this.refreshText();
  }

  flee() {
    if (this.state === EState.Swim || this.state === EState.TypoFlash) {
      this.body.tint = 0xffffff;
      this.setState(EState.Flee);
    }
  }

  private remove(host: EnemyHost) {
    if (this.removed) return;
    this.removed = true;
    host.onRemove(this);
  }
}

// ----------------------------------------------------------------------------

/** Piranhas: single letters. White piranhas take two letters. Gumbo = penalty fish. */
export class Piranha extends Enemy {
  readonly kind = 'piranha';
  private dashed = false;
  private savedVx = 0;
  private bubbled = false;
  private hitDiver = false;
  private soundPlayed = false;
  private deathFrames: Texture[];
  private shockTex: Texture;

  constructor(type: EnemyType | 'Gumbo', letters: string[], speed: number) {
    const art = type === 'Gumbo' ? SHARK_ART.gumbo : type === 'White' || type === 'WhiteStealth' ? SHARK_ART.piranhaWhite : SHARK_ART.piranha;
    super(type === 'Gumbo' ? 'Blue' : type, letters, art, 20);
    this.gumbo = type === 'Gumbo';
    this.deathFrames = frames(art.death, art.deathFrames);
    this.shockTex = tex(art.shock);
    this.vx = speed;
    this.stealthed = type === 'Stealth' || type === 'WhiteStealth';
    if (this.stealthed) {
      this.savedVx = speed;
      this.vx = 3.0;
      this.dashed = true;
      this.body.alpha = 0.5;
    }
    if (this.gumbo) this.dashed = true;
    this.refreshText();
  }

  readonly gumbo: boolean;

  zap() {
    this.setState(EState.Zapped);
    if (!this.silentKill && this.words.length <= 1) play('piranhadies1');
    else if (!this.silentKill) play('sharkhurt');
  }

  update(host: EnemyHost) {
    this.stateTicks++;
    switch (this.state) {
      case EState.Swim:
      case EState.TypoFlash:
        this.swim(host);
        break;
      case EState.Zapped:
        if (this.stateTicks % 7 === 0) this.toggles++;
        this.setBody(this.toggles % 2 ? this.shockTex : this.swimFrames[this.frame]);
        if (this.toggles >= 6) {
          if (this.words.length > 1 && !this.silentKill) {
            this.words.shift();
            this.typed = 0;
            this.makeText();
            this.animDelay = 5;
            this.setState(EState.Swim);
          } else {
            this.words = [];
            this.setState(EState.Dying);
          }
        }
        break;
      case EState.Dying: {
        const f = Math.min(Math.floor(this.stateTicks / 5), this.deathFrames.length - 1);
        this.setBody(this.deathFrames[f]);
        this.y -= 1.5;
        if (this.y < -70) this.remove(host);
        break;
      }
      case EState.Attack:
        this.animate();
        this.setBody(this.swimFrames[this.frame]);
        this.x += this.vx;
        if (!this.soundPlayed && this.x >= 0) {
          this.soundPlayed = true;
          play('playerdies');
        }
        if (!this.hitDiver && this.x >= 20) {
          this.hitDiver = true;
          host.onDiverHit(this);
        }
        if (this.x > WIDTH) this.remove(host);
        break;
      case EState.Flee:
        this.animate();
        this.setBody(this.swimFrames[this.frame]);
        this.vx += 0.075;
        this.x -= this.vx;
        if (this.x < -this.frameW) this.remove(host);
        break;
    }
  }

  private swim(host: EnemyHost) {
    this.animate();
    if (this.state === EState.TypoFlash) {
      if (this.stateTicks % 5 === 0) this.toggles++;
      this.body.tint = this.toggles % 2 ? TYPO_TINT : 0xffffff;
      if (this.toggles >= 10) {
        this.body.tint = 0xffffff;
        this.state = EState.Swim;
      }
    }
    this.setBody(this.swimFrames[this.frame]);
    if (this.stealthed) {
      if (!this.bubbled && this.x < 610) {
        this.bubbled = true;
        host.onBubbleBurst(this);
      }
      if (this.x < 400) {
        this.stealthed = false;
        this.body.alpha = 1;
        this.refreshText();
      }
    } else if (this.savedVx > 0 && this.vx > this.savedVx) {
      this.vx = Math.max(this.savedVx, this.vx - 0.02);
    }
    if (this.x <= 40) this.vx += 0.05;
    if (!this.dashed && this.x <= WIDTH && this.x > WIDTH - this.frameW / 2) {
      this.dashed = true;
      this.savedVx = this.vx;
      this.vx = 1.5;
    } else if (this.dashed && !this.stealthed && this.vx > this.savedVx && this.x > 40) {
      this.vx = Math.max(this.savedVx, this.vx - 0.03);
    }
    this.x -= this.vx;
    if (this.x <= -this.frameW) {
      this.x = -this.frameW;
      this.y = host.diverY();
      this.vx = 5.0;
      this.body.scale.x = -1;
      this.body.x = this.frameW;
      this.setState(EState.Attack);
      host.onAttack(this);
    }
  }

  flee() {
    if (this.state === EState.Swim || this.state === EState.TypoFlash) {
      this.body.tint = 0xffffff;
      this.setState(EState.Flee);
    }
  }

  private remove(host: EnemyHost) {
    if (this.removed) return;
    this.removed = true;
    host.onRemove(this);
  }
}

// ----------------------------------------------------------------------------

const JELLY_ART: Art = {
  swim: 'bonus_creature_swim', shock: 'bonus_creature_swim', death: 'bonus_creature_death', deathFrames: 8,
  textOffset: 0, typedColor: 0xffff64, untypedColor: 0x000000, font: '12ptfont',
};

/** Bonus jellyfish: rises vertically; harmless. */
export class Jellyfish extends Enemy {
  readonly kind = 'jelly';
  private deathFrames: Texture[];
  private baseX = 0;
  private swayT = Math.random() * Math.PI * 2;

  constructor(word: string, vy: number) {
    super('Standard', [word], JELLY_ART, 20);
    this.deathFrames = frames('bonus_creature_death', 8);
    this.vy = vy;
  }

  place(x: number, y: number) {
    this.baseX = x;
    this.position.set(x, y);
  }

  points(): number {
    return 0; // jellyfish score 200 x running count, handled by the board
  }

  zap() {
    this.setState(EState.Dying);
    play('jellyfish');
    this.body.position.set(-12, -20);
  }

  update(host: EnemyHost) {
    this.stateTicks++;
    if (this.state === EState.Dying) {
      const f = Math.floor(this.stateTicks / 3);
      if (f >= this.deathFrames.length) {
        this.removed = true;
        host.onRemove(this);
        return;
      }
      this.setBody(this.deathFrames[f]);
      return;
    }
    this.animate();
    this.setBody(this.swimFrames[this.frame]);
    this.y -= this.vy;
    this.swayT += 0.02;
    this.x = this.baseX + Math.sin(this.swayT) * this.vy * 0.25 * 20;
    if (this.y < -this.frameH && !this.removed) {
      this.removed = true;
      host.onRemove(this);
    }
  }
}
