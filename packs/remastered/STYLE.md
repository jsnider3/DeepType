# Remastered pack: art style and rules

The remastered pack replaces every PopCap asset with our own work. Images are SVG drawn in
code (`packs/remastered/art/*.mjs`) and rendered to PNG at 2x by `tools/build-pack.mjs`.
`art/sharks.mjs` is the **style reference**; look at it (and render it) before drawing.

## Look

- Clean modern cartoon: chunky dark-navy ink outlines (`C.ink`, `STROKE` = 2 logical px on
  sprites; ~1-1.5 on small icons; little or none on big backgrounds), two-tone cel shading
  (base colour, darker back/shadow side, light highlight or belly), simple confident shapes.
- Colours come from `C` in `art/lib.mjs`. Saturated undersea blues/teals; warm accents
  (yellow diver, orange/gold treasure, red danger). Threats are toothy and grumpy but not gory.
- Light comes from above: lighter tops, darker undersides; caustic shimmer on water.
- Text inside art uses `text()` from lib (converted to paths) with `FONTS.display`
  (Luckiest Guy) for logos/banners and `FONTS.slab` (Arvo) for labels.

## Technical rules

- Each module `export default { imageName: () => svgString, ... }`. Every image's SVG must be
  exactly the logical size in `spec.json` (`w` x `h`); the build checks this.
- Animation strips follow the `frames` note in `spec.json` (e.g. `20 x 160x70 (H)` = twenty
  160x70 frames left to right; `(V)` = stacked; clams are a 10x4 grid). Use `strip()`/`grid()`.
  Frames loop: frame 0 should follow the last smoothly.
- Creatures face **left** (they swim right to left). Keep each frame inside its cell.
- Sprites have transparent backgrounds. Full-screen backgrounds are opaque.
- `*glow*` and `sparkle_large` images are drawn with **additive blending** in game: draw soft
  bright shapes; transparency is fine.
- Layout matters: the game positions things at fixed coordinates (menu button rects, keyboard
  keys, map dive sites, panel slots, HUD text). Positions are in `src/scenes/*`,
  `src/game/*` (including `src/game/mapdata.ts`) and `src/scenes/tutorlayout.ts`.
  Our art must put its interactive parts there.
- Be deterministic: use `rng(seed)` from lib, never `Math.random()`.
- Don't edit `lib.mjs`, `sharks.mjs` or `tools/build-pack.mjs`; put shared helpers for your
  modules in `art/<name>-lib.mjs` (files ending `-lib.mjs` are not loaded as image modules).

## Originality

Never trace, copy or closely reproduce PopCap's artwork. The originals in
`public/assets/original/images/` may be looked at **only** to understand what an image is for
and where its functional parts sit (e.g. which keys are where, where buttons are). Design
your own look. The game title shown in art comes from `GAME_TITLE` in lib.

## Workflow

```bash
node tools/build-pack.mjs --only name1,name2        # render specific images
node tools/build-pack.mjs --group "Map screen"      # render a spec group
node tools/build-pack.mjs --report                  # what's still a placeholder
```

Never run a full build (no flags) while others are working: it wipes the output folder.
Preview by composing PNGs from `public/assets/remastered/images/` with Python/PIL into a
sheet in your scratch directory and viewing it; check strips frame by frame and check
layout-coupled images against the coordinates they must match.
