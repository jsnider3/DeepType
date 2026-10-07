# Painted art: how the remastered pack's images are made

The bar: every image must be **at least as good as the original PopCap art** at its in-game
size. The SVG art in `art/` was rejected as too plain; it stays only as a fallback and as
layout guides. Final images come from painted sources:

1. **Sources** are single pictures painted by Codex's built-in image tool (the user's
   ChatGPT plan, no API cost), described in `gen/*.mjs` (one file per area; entry names are
   globally unique). `node tools/gen-art.mjs name1,name2 [--variants 2] [--jobs 2]` writes
   `raw/<name>.webp` (keyed, trimmed, alpha kept). About a minute per image.
2. **Raster modules** `raster/*.mjs` turn sources into the game's images (exact spec size x2):
   fit, cut, composite, animate. Helpers are in `raster/lib.mjs` (`source`, `place`, `paste`,
   `resize`, `warp`, `rotate`, `swim`, `strip`, `brighten`/`darken`/`fade`/`tint`, `svgArt`,
   `repaint`, `bbox`, `cut`). A raster image overrides the SVG of the same name; if its source
   isn't generated yet the build falls back to the SVG.
3. `node tools/build-pack.mjs --only a,b` builds images. **Never run a full build (no flags)**
   while others are working: it wipes the output folder.

## Prompting

- `gen/style.mjs` holds the shared style line; gen-art adds it to every prompt.
- Describe what the game needs, in our own design. **Never attach or describe PopCap's
  images.** Looking at `public/assets/original/images/` to learn what an image is *for*
  (purpose, layout, where functional parts sit) is fine; copying its look is not.
- Use `refs` to keep things consistent: attach the source a variant is based on ("the exact
  same shark, but knocked out"), or a sibling for style (all buttons ref one button).
- Transparent sprites are the default (gen-art keys out a magenta fallback); `opaque: true`
  for full scenes. Say "side view, facing LEFT" etc. explicitly; creatures swim right-to-left.
- Text in images only when needed (`text: '"EXACT WORDS"'`); otherwise the prompt forbids it.
  Check spelling in the result. Prefer drawing words with the game's fonts in code when a
  label must change (the game name may be rebranded: avoid baking it in beyond the logo).
- Layout-critical pictures (shapes that must line up with game coordinates): put
  `'svg:<image>'` first in `refs` and set `layout: true`; Codex repaints our SVG layout, then
  `repaint(source, await svgArt(image))` fits it to the SVG's bounds and silhouette.
- Generate `--variants 2` when a result matters a lot; keep the best as `<name>.webp` and move
  the others to `.art-cache/variants/`.

## Animation

Image generators can't draw matching frame sequences, so animate in code from one picture:
`swim()` bends a body (travelling wave, tail swings most); rolls, tilts, squash (a spinning
propeller is a horizontal squash), bobbing, fades, and glows built from a silhouette
(blur + tint) for the additive `*glow*` images. Separate poses (knocked out, shocked,
wrecked) are separate sources made with the base as a ref. Frame 0 must follow the last
frame smoothly.

## Checking your work

Look at every result at in-game size (2x output) on a representative background, frame by
frame for strips (compose sheets with Python/PIL in your scratch dir). Check layout-coupled
images against the coordinates in `src/` (and the notes at the top of the matching
`art/*.mjs`). Redo anything that looks wrong, smudged, mis-spelled, off-model or cheap.
Keep a short notes block at the top of each raster module saying what each image is and any
layout constraint it satisfies.
