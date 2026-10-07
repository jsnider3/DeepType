// Application shell: a 640x480 logical stage letterboxed into the window, a fixed
// 100 Hz update loop (the original game's update rate; config speeds are per update), and a
// scene stack that receives typed characters.

import { Application, Container, Graphics } from 'pixi.js';
import { resumeAudio } from './audio';

export const WIDTH = 640;
export const HEIGHT = 480;
export const TICK_MS = 10;

export abstract class Scene extends Container {
  /** Fixed-rate update; `dt` is always TICK_MS. */
  update(_dt: number): void {}
  /** Variable-rate hook for purely visual interpolation. */
  frame(_elapsedMs: number): void {}
  /** A printable character was typed. */
  onChar(_c: string): void {}
  /** Non-printable key (Enter, Escape, Backspace, arrows...). */
  onKey(_key: string, _e: KeyboardEvent): void {}
  enter(): void {}
  exit(): void {}
}

class Game {
  app = new Application();
  root = new Container();
  private stack: Scene[] = [];
  private acc = 0;
  paused = false;

  async init() {
    await this.app.init({
      background: 0x000000,
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: Math.max(1, window.devicePixelRatio || 1),
      preference: 'webgl',
    });
    document.getElementById('app')!.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    const mask = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill(0xffffff);
    this.root.addChild(mask);
    this.root.mask = mask;
    this.layout();
    window.addEventListener('resize', () => this.layout());

    this.app.ticker.add((t) => {
      const ms = Math.min(t.deltaMS, 250);
      if (!this.paused) {
        this.acc += ms;
        while (this.acc >= TICK_MS) {
          this.acc -= TICK_MS;
          this.top?.update(TICK_MS);
        }
      }
      this.top?.frame(ms);
    });

    window.addEventListener('keydown', (e) => {
      resumeAudio();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = this.top;
      if (!s) return;
      if (e.key.length === 1) {
        e.preventDefault();
        s.onChar(e.key);
      } else {
        if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
        s.onKey(e.key, e);
      }
    });
    window.addEventListener('pointerdown', resumeAudio);
  }

  private layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = Math.min(w / WIDTH, h / HEIGHT);
    this.root.scale.set(s);
    this.root.position.set(Math.round((w - WIDTH * s) / 2), Math.round((h - HEIGHT * s) / 2));
  }

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Replace the whole stack with one scene. */
  set(scene: Scene) {
    while (this.stack.length) this.pop();
    this.push(scene);
  }

  push(scene: Scene) {
    this.stack.push(scene);
    this.root.addChild(scene);
    scene.enter();
  }

  pop() {
    const s = this.stack.pop();
    if (s) {
      s.exit();
      this.root.removeChild(s);
      s.destroy({ children: true });
    }
  }
}

export const game = new Game();
