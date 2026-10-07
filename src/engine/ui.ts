import { Container, Sprite, Texture } from 'pixi.js';
import { hasTex, tex } from './assets';
import { play } from './audio';

/**
 * Image button using PopCap's naming: `<base>` (optional idle image), `<base>_over`,
 * `<base>_down`. Many original buttons have no idle image (it's baked into the
 * background), so idle shows nothing unless provided.
 */
export class ImageButton extends Container {
  private sprite = new Sprite();
  private idle?: Texture;
  private over?: Texture;
  private down?: Texture;
  private hovering = false;
  private pressing = false;

  constructor(base: string, onClick: () => void, opts: { idle?: string; over?: string; down?: string } = {}) {
    super();
    const pick = (n?: string) => (n && hasTex(n) ? tex(n) : undefined);
    this.idle = pick(opts.idle ?? base);
    this.over = pick(opts.over ?? `${base}_over`);
    this.down = pick(opts.down ?? `${base}_down`) ?? this.over;
    this.addChild(this.sprite);
    const ref = this.over ?? this.idle!;
    this.hitArea = { contains: (x: number, y: number) => x >= 0 && y >= 0 && x < ref.width && y < ref.height };
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerover', () => ((this.hovering = true), this.refresh()));
    this.on('pointerout', () => ((this.hovering = false), (this.pressing = false), this.refresh()));
    this.on('pointerdown', () => ((this.pressing = true), this.refresh()));
    this.on('pointerup', () => {
      if (this.pressing) {
        play('buttonclick');
        onClick();
      }
      this.pressing = false;
      this.refresh();
    });
    this.refresh();
  }

  private refresh() {
    const t = this.pressing ? this.down : this.hovering ? this.over : this.idle;
    this.sprite.texture = t ?? Texture.EMPTY;
  }
}
