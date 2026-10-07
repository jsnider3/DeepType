// The diver. Fixed at x=30; the world scrolls past.

import { Container, Sprite, type Texture } from 'pixi.js';
import { frames, tex } from '../engine/assets';
import { play } from '../engine/audio';

export const enum DState {
  Normal = 0,
  Entering = 1,
  Hauled = 2,
  Eaten = 3,
  Landed = 4,
  Treasure = 5,
  Complete = 6,
  Hidden = 8,
  Boss = 9,
  Struck = 10,
}

export const DIVER_X = 30;
export const DIVER_REST_Y = 235;

export class Diver extends Container {
  state = DState.Entering;
  /** World y of the diver sprite's top. */
  dy = 0;
  private body = new Sprite();
  private hose = new Container();
  private hoseSegs: Sprite[] = [];
  private cloud = new Sprite();
  private idle: Texture[];
  private hoseFrames: Texture[];
  private cloudFrames: Texture[];
  private tick = 0;
  private frame = 0;
  private frameDelay = 25;
  private hoseFrame = 0;
  private hoseDir = 1;
  private stateTicks = 0;
  private savedY = DIVER_REST_Y;
  /** Called when the hauled-up diver leaves the top of the screen. */
  onGone?: () => void;
  /** Called when the entering diver reaches rest position. */
  onReady?: () => void;

  constructor(private topHeight: number) {
    super();
    this.idle = frames('diver_idle', 8);
    this.hoseFrames = frames('upper_hose', 8);
    this.cloudFrames = frames('rumblecloud', 7);
    for (let i = 0; i < 3; i++) {
      const seg = new Sprite(this.hoseFrames[0]);
      seg.y = i * 210;
      this.hoseSegs.push(seg);
      this.hose.addChild(seg);
    }
    this.addChild(this.hose, this.body, this.cloud);
    this.cloud.visible = false;
    this.setState(DState.Entering);
  }

  get frameH() {
    return 84;
  }

  setState(s: DState) {
    const prev = this.state;
    this.state = s;
    this.stateTicks = 0;
    this.body.alpha = 1;
    this.body.visible = true;
    this.cloud.visible = false;
    this.hose.visible = true;
    this.body.x = DIVER_X;
    switch (s) {
      case DState.Entering:
        this.dy = 0;
        play('diverenters');
        break;
      case DState.Eaten:
        this.savedY = this.dy;
        this.cloud.visible = true;
        this.cloud.alpha = 1;
        this.body.visible = false;
        if (prev !== DState.Landed) this.dy -= 25;
        break;
      case DState.Hauled:
        this.dy = this.savedY;
        this.body.texture = tex('diver_beaten');
        this.body.x = 21;
        break;
      case DState.Hidden:
        this.visible = false;
        break;
      case DState.Struck:
        this.savedY = this.dy;
        this.body.x = 21;
        break;
      case DState.Normal:
      case DState.Boss:
        this.visible = true;
        break;
    }
  }

  update() {
    this.stateTicks++;
    this.tick++;
    if (this.tick % 22 === 0) {
      this.hoseFrame += this.hoseDir;
      if (this.hoseFrame >= 7 || this.hoseFrame <= 0) this.hoseDir = -this.hoseDir;
    }
    switch (this.state) {
      case DState.Entering:
        this.dy += this.dy <= this.topHeight ? 2 : 1;
        if (this.dy >= DIVER_REST_Y) {
          this.dy = DIVER_REST_Y;
          this.frameDelay = 22;
          this.setState(DState.Normal);
          this.onReady?.();
        }
        break;
      case DState.Eaten: {
        const f = Math.floor(this.stateTicks / 4);
        this.cloud.texture = this.cloudFrames[f % 7];
        if (f > 3 * 7) {
          this.cloud.alpha -= 8 / 255;
          if (this.cloud.alpha <= 128 / 255) this.setState(DState.Hauled);
        }
        break;
      }
      case DState.Hauled:
        this.dy -= 1.0;
        if (this.dy < -this.frameH) {
          this.state = DState.Hidden;
          this.onGone?.();
        }
        break;
      case DState.Landed:
        if (this.dy < 325) this.dy += 0.5;
        break;
    }
    if (this.state !== DState.Hauled && this.tick % this.frameDelay === 0) this.frame = (this.frame + 1) % 8;
    this.draw();
  }

  private draw() {
    if (this.state !== DState.Hauled) this.body.texture = this.idle[this.frame];
    this.body.y = this.dy;
    this.cloud.position.set(-25 + 0, this.dy - 20);
    // Air hose runs from above the screen down to the helmet (segments end at the helmet).
    for (const seg of this.hoseSegs) seg.texture = this.hoseFrames[this.hoseFrame];
    this.hose.x = 40;
    this.hose.y = this.dy + 20 - 630;
    this.hose.visible = this.state !== DState.Eaten && this.state !== DState.Hidden;
  }
}
