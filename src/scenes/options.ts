// Options dialog: 420x474 at (110,3), pushed over the
// current scene (which stays paused underneath).

import { Container, NineSliceSprite, Sprite } from 'pixi.js';
import { game, Scene } from '../engine/app';
import { activePack, availablePacks, setPreferredPack, sub, tex } from '../engine/assets';
import { play, setVolumes } from '../engine/audio';
import { dbutton, Dialog, dialogFrame, DIALOG_TEXT } from '../engine/dialog';
import { font, textAt } from '../engine/font';
import { GAME_NAME } from '../game/brand';
import { hasProfile, profile, saveProfiles } from '../game/profile';

/** Apply stored options (volumes, cursors) to the running app. */
export function applyOptions() {
  if (!hasProfile()) return; // defaults until a player is chosen
  const o = profile().options;
  setVolumes(o.sfx, o.music);
  applyCursors(o.customCursor);
}

export function setFullscreen(on: boolean) {
  try {
    if (on && !document.fullscreenElement) void document.documentElement.requestFullscreen();
    else if (!on && document.fullscreenElement) void document.exitFullscreen();
  } catch {
    // fullscreen not available (e.g. embedded)
  }
}

/** Custom cursors: the pack's arrow and pointing hand, drawn at their logical (1x) size. */
export function applyCursors(on: boolean) {
  const events = game.app.renderer?.events;
  if (!events) return;
  if (!on) {
    events.cursorStyles.default = 'auto';
    events.cursorStyles.pointer = 'pointer';
    events.setCursor('default');
    return;
  }
  const set = (style: 'default' | 'pointer', image: string, hx: number, hy: number) => {
    const t = tex(image);
    const src = t.source.resource as CanvasImageSource;
    const c = document.createElement('canvas');
    c.width = t.width;
    c.height = t.height;
    c.getContext('2d')?.drawImage(src, 0, 0, t.width, t.height);
    events.cursorStyles[style] = `url(${c.toDataURL()}) ${hx} ${hy}, ${style === 'default' ? 'auto' : 'pointer'}`;
  };
  set('default', 'cursor1', 2, 2);
  set('pointer', 'pointer2', 10, 2);
  events.setCursor('default');
}

export class OptionsScene extends Scene {
  private credits: Dialog | null = null;
  private reloadNote?: ReturnType<typeof textAt>;

  constructor(private onClose?: () => void) {
    super();
  }

  enter() {
    const o = profile().options;
    const w = 420;
    const h = 474;
    const box = dialogFrame(w, h, 'OPTIONS');
    box.position.set(110, 3);
    const f = font('Rockwell13');
    box.addChild(textAt(f, 'Music', 48, 98, DIALOG_TEXT));
    box.addChild(this.slider(152, 78, 228, o.music, (v) => {
      o.music = v;
      setVolumes(o.sfx, o.music);
    }));
    box.addChild(textAt(f, 'Sound Fx', 48, 130, DIALOG_TEXT));
    box.addChild(
      this.slider(152, 110, 228, o.sfx, (v) => {
        o.sfx = v;
        setVolumes(o.sfx, o.music);
      }, () => play('wave_bonus')),
    );
    box.addChild(this.check('Fullscreen', 48, 148, !!document.fullscreenElement, (v) => setFullscreen(v)));
    box.addChild(this.check('Enable Fx', 48, 179, o.enableFx, (v) => (o.enableFx = v)));
    box.addChild(this.check('Themed cursors', 48, 213, o.customCursor, (v) => {
      o.customCursor = v;
      applyCursors(v);
    }));
    box.addChild(this.check('Pause with the space bar', 48, 247, o.spacePauses, (v) => (o.spacePauses = v)));
    box.addChild(this.check('Show hints', 48, 285, o.hints, (v) => (o.hints = v)));
    if (availablePacks().includes('original')) {
      // Art & sound pack: our remastered pack, or the original game's imported assets.
      box.addChild(
        this.check('Use original game art and sound', 48, 316, activePack() === 'original', (v) => {
          setPreferredPack(v ? 'original' : 'remastered');
          this.reloadNote ??= box.addChild(textAt(f, '(Takes effect when the game restarts)', 84, 360, DIALOG_TEXT));
        }),
      );
    }
    const doneY = h - 40 - 32;
    const credits = dbutton('Credits', () => this.showCredits(), w - 80, 36);
    credits.position.set(40, doneY - 42);
    const done = dbutton('DONE', () => this.close(), w - 80, 32);
    done.position.set(40, doneY);
    box.addChild(credits, done);
    this.addChild(box);
  }

  /** Slider: slider.gif 3-sliced track, slideranchor thumb at value*(w-20). */
  private slider(x: number, y: number, w: number, value: number, onChange: (v: number) => void, onRelease?: () => void) {
    const c = new Container();
    c.position.set(x, y);
    const track = new NineSliceSprite({ texture: tex('slider'), leftWidth: 57, rightWidth: 57, topHeight: 0, bottomHeight: 0 });
    track.width = w;
    track.position.set(0, 11);
    const knob = new Sprite(tex('slideranchor'));
    const setKnob = (v: number) => knob.position.set(v * (w - 20), 6);
    setKnob(value);
    c.addChild(track, knob);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = { contains: (px: number, py: number) => px >= -4 && px <= w + 4 && py >= 0 && py <= 32 };
    let dragging = false;
    const update = (gx: number, gy: number) => {
      const v = Math.max(0, Math.min(1, (c.toLocal({ x: gx, y: gy }).x - 10) / (w - 20)));
      setKnob(v);
      onChange(v);
    };
    c.on('pointerdown', (e) => {
      dragging = true;
      update(e.global.x, e.global.y);
    });
    c.on('globalpointermove', (e) => dragging && update(e.global.x, e.global.y));
    const stop = () => {
      if (dragging) onRelease?.();
      dragging = false;
    };
    c.on('pointerup', stop);
    c.on('pointerupoutside', stop);
    return c;
  }

  /** Checkbox: checked.gif left half = unchecked, right half = checked; label at (x+36, y+17). */
  private check(label: string, x: number, y: number, value: boolean, onChange: (v: boolean) => void) {
    const c = new Container();
    const off = sub('checked', 0, 0, 24, 25);
    const on = sub('checked', 24, 0, 24, 25);
    const box = new Sprite(value ? on : off);
    box.position.set(x, y);
    c.addChild(box, textAt(font('Rockwell13'), label, x + 36, y + 17, DIALOG_TEXT));
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = { contains: (px: number, py: number) => px >= x && px <= 380 && py >= y && py <= y + 30 };
    let state = value;
    c.on('pointertap', () => {
      state = !state;
      box.texture = state ? on : off;
      play('buttonclick');
      onChange(state);
    });
    return c;
  }

  private showCredits() {
    if (this.credits) return;
    this.credits = new Dialog(
      'CREDITS',
      activePack() === 'original'
        ? [
            GAME_NAME,
            'A fan remake, here using the art, sound and music of Typer Shark! Deluxe (PopCap Games, 2004; music by Purple Motion), loaded from your own copy of that game.',
          ]
        : [
            GAME_NAME,
            'A typing adventure inspired by Typer Shark! Deluxe (PopCap Games, 2004). Not affiliated with PopCap or EA.',
            '',
            'Art, sound, music and word lists made for this game. Fonts: Arvo, Barlow, Lato, Courier Prime and Luckiest Guy (SIL Open Font License / Apache 2.0).',
          ],
      [{ label: 'OK', key: ' ', action: () => this.closeCredits() }],
      { width: 380 },
    );
    this.addChild(this.credits);
  }

  private closeCredits() {
    this.credits?.destroy({ children: true });
    this.credits = null;
  }

  private close() {
    saveProfiles();
    if (this.reloadNote) {
      location.reload(); // the pack is chosen at load time
      return;
    }
    game.pop();
    this.onClose?.();
  }

  onChar(c: string) {
    if (this.credits) this.credits.key(c);
  }

  onKey(key: string) {
    if (key === 'Escape' || key === 'Enter') {
      if (this.credits) this.closeCredits();
      else this.close();
    }
  }
}
