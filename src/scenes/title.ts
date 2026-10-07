import { Graphics, Sprite } from 'pixi.js';
import { game, Scene } from '../engine/app';
import { tex } from '../engine/assets';
import { musicOrder } from '../engine/audio';
import { ImageButton } from '../engine/ui';
import { hasProfile } from '../game/profile';

let assetsLoaded = false;

/** Title screen: the gold bar fills as the game loads, then CONTINUE appears. */
export class TitleScene extends Scene {
  private goldMask = new Graphics();
  private gold!: Sprite;
  private cont!: ImageButton;
  private ready = assetsLoaded;

  enter() {
    this.addChild(new Sprite(tex('titlescreen')));
    const bar = new Sprite(tex('barandlogo'));
    bar.position.set(126, 354);
    this.gold = new Sprite(tex('goldbar'));
    this.gold.position.set(149, 369);
    this.gold.mask = this.goldMask;
    this.addChild(bar, this.gold, this.goldMask);
    this.cont = new ImageButton('title_continue', () => this.next(), { idle: 'title_continue' });
    this.cont.position.set(200, 432);
    this.cont.visible = false;
    this.addChild(this.cont);
    this.setProgress(this.ready ? 1 : 0);
    if (this.ready) this.loaded();
  }

  /** Loading progress 0..1: the bar shows int(progress * width) of goldbar. */
  setProgress(p: number) {
    if (!this.gold) return;
    const w = Math.floor(Math.max(0, Math.min(1, p)) * this.gold.width);
    this.goldMask.clear();
    if (w > 0) this.goldMask.rect(149, 369, w, this.gold.height).fill(0xffffff);
  }

  /** Loading finished: show CONTINUE and start the music. */
  loaded() {
    assetsLoaded = true;
    this.ready = true;
    if (!this.cont) return;
    this.setProgress(1);
    this.cont.visible = true;
    musicOrder(0x11);
  }

  onKey(key: string) {
    if (key === 'Enter' && this.ready) this.next();
  }

  private next() {
    // Imported lazily: the menus need fonts and data that finish loading after this screen appears.
    if (hasProfile()) void import('./selector').then(({ SelectorScene }) => game.set(new SelectorScene()));
    else void import('./profiles').then(({ ProfileScene }) => game.set(new ProfileScene()));
  }
}
