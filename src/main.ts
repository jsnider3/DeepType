import { game } from './engine/app';
import { loadAll, loadBoot } from './engine/assets';
import * as audio from './engine/audio';
import { TitleScene } from './scenes/title';
import { applyOptions } from './scenes/options';

const boot = document.getElementById('boot')!;

async function start() {
  try {
    await loadBoot();
  } catch (e) {
    if ((e as Error).message === 'missing-assets') {
      boot.innerHTML =
        'Game assets not found.<br>Run <code>npm run build-pack</code> to build them.';
      return;
    }
    throw e;
  }
  // Like the original, the title screen shows while the rest loads, filling its gold bar.
  await game.init();
  boot.remove();
  const title = new TitleScene();
  game.set(title);
  await loadAll((p) => title.setProgress(p * 0.85));
  await audio.loadSounds((p) => title.setProgress(0.85 + p * 0.15));
  applyOptions();
  title.loaded();
  if (import.meta.env.DEV) Object.assign(window, { game, audio });
}

void start();
