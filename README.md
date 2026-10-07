# Deep Type

A typing game for the browser: dive to the sea floor, type the words on sharks before they
reach you, zap piranhas, fight bosses and salvage sunken treasure. Built with TypeScript and
PixiJS. It's a fan remake inspired by PopCap's *Typer Shark! Deluxe* (2004), with its own
art, music, sounds, word lists and text.

## Setup

```bash
npm install      # also builds the asset pack into public/assets/remastered
npm run dev      # then open http://localhost:5173
```

`npm run build-pack` rebuilds the pack after editing `packs/remastered/` (a full build takes
about 30 s; `-- --only name1,name2` builds single images, `-- --report` lists gaps).

### Optional: play with the original game's art and sound

If you own *Typer Shark! Deluxe*, you can use its art, sound and music instead: Options >
"Use original game art and sound" (anything missing falls back to the remastered pack).
Import them from your installed copy; they stay on your machine and are never committed.

1. Install the game (e.g. from Steam).
2. `npm run import-assets` (finds the Steam install automatically; pass
   `-- --game-dir "<path>"` otherwise). Images are upscaled 2x with
   [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) when available, Lanczos otherwise
   (`-- --no-upscale` to skip). The importer looks for `realesrgan-ncnn-vulkan.exe` in
   `$REALESRGAN_DIR`, then on `PATH`, then in `%LOCALAPPDATA%\Programs\realesrgan-ncnn-vulkan`,
   and installs it there if it's missing. Upscales are cached in `.import-cache/`.

## The asset pack

- Images are painted: `packs/remastered/raw/` holds the painted source pictures, generated
  with OpenAI's image model through Codex (`tools/gen-art.mjs`, prompts in
  `packs/remastered/gen/`), and `packs/remastered/raster/*.mjs` cut, fit and animate them into
  the game's images at 2x. `PAINTED.md` explains the pipeline. `spec.json` lists the 243
  images the game needs (sizes, animation frame layouts).
- `packs/remastered/art/*.mjs` - SVG art drawn in code, used for a few effects (bubbles,
  sparkles, sonar sweeps) and as exact layout guides for the painted art.
- `packs/remastered/fonts/` - open fonts (Arvo, Barlow, Lato, Courier Prime under the SIL OFL;
  Luckiest Guy under Apache 2.0), turned into bitmap fonts at build time.
- `packs/remastered/audio/` - sound effects synthesised to WAV (`sfx.mjs`) and music as note
  data played by a small WebAudio synth (`music.mjs`, `src/engine/synth.ts`).
- `packs/remastered/data/` - word lists, themes, ship and gem names, difficulty configs and
  typing lessons, written for this game.

The game's name is set in one place for the art (`GAME_TITLE` in `art/lib.mjs`) and one for
the UI (`src/game/brand.ts`).

## What's in it

- **Adventure**: 36 dive sites on a branching sea chart, five difficulties, bosses,
  shipwreck treasure dives, secret clam levels, gems and secret items, uncharted waters.
- **Abyss**: endless dive with checkpoints every 400 ft and a boss every 1000 ft.
- **Typing Tutor**: 18 lessons plus a typing test, with an on-screen finger guide.
- Player profiles, saved games, statistics, Hall of Fame and options (volumes,
  fullscreen, water ripple effect, custom cursors, space-bar pause, hints).
- Music that changes with the action.

Progress is stored in the browser's local storage.

## Testing

`npm test` runs the Vitest suite (`npm run test:watch` to keep it running). It covers the
data-file parsers, the config rules (inheritance, load-time speed adjustments), word
picking, scoring, saves, the map graph, the tutor key mapping and profiles, using small
inline fixtures. `tests/remastered-data.test.ts` checks the pack's data;
`tests/gamedata.test.ts` checks imported original data and runs only when it's present.

## Controls

- Type the words/letters on enemies. Enter fires the Shark Zapper when charged.
- Esc pauses (Q quits to the menu while paused). Space continues on result screens.

## Layout

- `src/engine` - app shell (640x480 logical stage, 100 Hz fixed update), assets, fonts, audio
- `src/data` - parsers for the config/word/theme/font data formats
- `src/game` - gameplay: board, enemies, bosses, diver, map data, clams, session
- `src/scenes` - title, menus, map, tutor, stats, win screen
- `packs/remastered` - the asset pack sources
- `tools/build-pack.mjs` - builds the asset pack
- `tools/gen-art.mjs` - generates painted source pictures
- `tools/import_assets.py` - optional importer for your own copy of the original game

*Typer Shark* is a trademark of its owner; this project is not affiliated with or endorsed by
PopCap or Electronic Arts.
