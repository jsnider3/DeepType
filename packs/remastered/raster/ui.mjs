// Menus, dialogs, widgets and the meta screens, from the painted sources in gen/ui.mjs.
//
//   dialog            nine-sliced 30/64/30/24 by src/engine/dialog.ts; the black title sits
//                     at baseline ~37 on the brass nameplate (y ~10..50), body is light
//                     parchment. Repainted onto svg:dialog so every ornament sits in the
//                     fixed corners.
//   dbutton(_hilight) nine-sliced 38/10 (label black, white on hover; white on the
//                     difficulty dialog, where _hilight marks the recommended level: green).
//                     tab_button is the same button (stats screen).
//   editbox           3-sliced 32/32 (profiles.ts); a white field covers all but a 4 px rim.
//   checked           2 frames 24x25: unchecked, checked (options.ts).
//   slider            3-sliced 57/57, thumb slideranchor 20x20 drawn at y-5 of the track.
//   cursor1 / pointer2  CSS cursors drawn at logical size; hotspots (2,2) and (10,2).
//   favicon           64x64 porthole badge.
//   title_continue(_over)  235x28 at (200,432) under the title screen's loading bar;
//                     baked text, lengthened by stretching the plain enamel beside it.
//   medal_*           97x133 (shown at 66x90 on the win dialog and stats screen).
//   tab_*             statistics screen (stats.ts): tab_panel at (0,38) holds black and
//                     brown text on its parchment; tabs are 3-sliced 54/54 and their bottom
//                     8 px hide under the panel; tab_panel_white is the graph sheet (black
//                     grid and labels); tab_radiobtn_* carry a centred black label.
//   high_score_bg     Hall of Fame (hall.ts): painted vault + title sign + two boards at
//                     (20,86,322,272) and (358,86,254,272) whose parchment starts at y 124;
//                     rows at baseline 165 + 19i (names x 49/389, scores right at 264/581),
//                     column headings baked in at y ~141; the code's close button
//                     sits at (221,443,193,27).

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  SCALE as S,
  source,
  paste,
  blank,
  resize,
  crop,
  bbox,
  darken,
  tint,
  place,
  strip,
  repaint,
  svgArt,
} from "./lib.mjs";
import { svg, text, FONTS } from "../art/lib.mjs";

const px = (a) => a.map((v) => v * S);

/** The source trimmed harder than source() does (drops faint shadows and haze). */
async function solid(name, threshold = 60) {
  const img = await source(name);
  return crop(img, bbox(img, threshold));
}

/**
 * Horizontal 3-slice rebuild: scale img uniformly to height h, keep `cap` px of each end
 * (output px) and stretch the plain middle to make the width w.
 */
async function hstretch(img, w, h, cap) {
  const k = h / img.h;
  const r = await resize(img, img.w * k, h);
  const out = blank(w, h);
  paste(out, crop(r, [0, 0, cap, h]), 0, 0);
  paste(out, crop(r, [r.w - cap, 0, cap, h]), w - cap, 0);
  const mid = await resize(crop(r, [cap, 0, r.w - 2 * cap, h]), w - 2 * cap, h);
  return paste(out, mid, cap, 0);
}

/**
 * Nine-slice rebuild: img (already at the scale wanted) keeps its corners [l, t, r, b]
 * (output px); edges and centre are stretched to make w x h.
 */
async function nine(img, w, h, [l, t, r, b]) {
  const out = blank(w, h);
  const mw = img.w - l - r,
    mh = img.h - t - b;
  const W = w - l - r,
    H = h - t - b;
  const piece = async (sx, sy, sw, sh, dx, dy, dw, dh) => {
    const p = crop(img, [sx, sy, sw, sh]);
    paste(out, sw === dw && sh === dh ? p : await resize(p, dw, dh), dx, dy);
  };
  await piece(0, 0, l, t, 0, 0, l, t);
  await piece(img.w - r, 0, r, t, w - r, 0, r, t);
  await piece(0, img.h - b, l, b, 0, h - b, l, b);
  await piece(img.w - r, img.h - b, r, b, w - r, h - b, r, b);
  await piece(l, 0, mw, t, l, 0, W, t);
  await piece(l, img.h - b, mw, b, l, h - b, W, b);
  await piece(0, t, l, mh, 0, t, l, H);
  await piece(img.w - r, t, r, mh, w - r, t, r, H);
  await piece(l, t, mw, mh, l, t, W, H);
  return out;
}

/** SVG markup (logical coordinates) rendered as an overlay image of w x h logical px. */
async function overlay(w, h, body, defs = "") {
  const png = new Resvg(svg(w, h, body, defs), {
    fitTo: { mode: "width", value: w * S },
  })
    .render()
    .asPng();
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

// ------------------------------------------------------------------ dialog

async function dialog() {
  // The painted corners and nameplate ends fall inside the 30/64/30/24 borders; the bands
  // between them are plain wood, brass and paper, so stretching them is clean.
  return repaint("ui_dialog", await svgArt("dialog"));
}

// ------------------------------------------------------------------ buttons and widgets

const button = async (w, h) =>
  hstretch(await solid("ui_button"), w * S, h * S, 30 * S);
const dbutton = () => button(115, 32);
const dbuttonHilight = async () =>
  hstretch(await solid("ui_button_hi"), 115 * S, 32 * S, 30 * S);

async function editbox() {
  return hstretch(await solid("ui_editbox"), 96 * S, 32 * S, 24 * S);
}

/** Two checkbox frames at one scale: the empty box sets it; the ticked box is aligned
 *  by its bottom-left corner (the tick overflows up and right). */
async function checked() {
  const img = await solid("ui_checkboxes");
  // Split at the widest empty column run in the middle.
  const colEmpty = (x) => {
    for (let y = 0; y < img.h; y++)
      if (img.data[(y * img.w + x) * 4 + 3] > 60) return false;
    return true;
  };
  let gap = [0, 0];
  for (let x = Math.floor(img.w * 0.2), s = -1; x < img.w * 0.8; x++) {
    if (colEmpty(x)) {
      if (s < 0) s = x;
      if (x - s > gap[1] - gap[0]) gap = [s, x];
    } else s = -1;
  }
  const left = crop(img, [0, 0, gap[0], img.h]);
  const right = crop(img, [gap[1] + 1, 0, img.w - gap[1] - 1, img.h]);
  const lb = bbox(left, 60),
    rb = bbox(right, 60);
  const off = crop(left, lb),
    on = crop(right, rb);
  const k = (21 * S) / off.w;
  const frame = async (im) => {
    const r = await resize(im, im.w * k, im.h * k);
    const f = blank(24 * S, 25 * S);
    // box bottom-left at (1.5, 23.5) logical
    return paste(f, r, 1.5 * S, 23.5 * S - r.h);
  };
  return strip([await frame(off), await frame(on)]);
}

async function slider() {
  return hstretch(await solid("ui_slider"), 172 * S, 10 * S, 12 * S);
}

async function slideranchor() {
  return place(await solid("ui_knob"), 20 * S, 20 * S, {
    box: px([1, 1, 18, 18]),
  });
}

// ------------------------------------------------------------------ cursors + favicon

/** The arrow's tip goes to the hotspot (2,2); about 22 x 30 logical. */
async function cursor1() {
  const img = await solid("ui_cursor", 100);
  const k = (30 * S) / img.h;
  const r = await resize(img, img.w * k, img.h * k);
  return paste(blank(54 * S, 54 * S), r, 1 * S, 1 * S);
}

/** Fingertip at the hotspot (10,2). */
async function pointer2() {
  const img = await solid("ui_pointer", 100);
  const k = (32 * S) / img.h;
  const r = await resize(img, img.w * k, img.h * k);
  // Fingertip: middle of the opaque run on the top rows.
  let sx = 0,
    n = 0;
  for (let y = 0; y < 3 * S; y++) {
    for (let x = 0; x < r.w; x++)
      if (r.data[(y * r.w + x) * 4 + 3] > 128) ((sx += x), n++);
  }
  const tip = n ? sx / n : r.w / 2;
  return paste(blank(58 * S, 58 * S), r, 10 * S - tip, 1 * S);
}

async function favicon() {
  return place(await solid("ui_favicon"), 64 * S, 64 * S, {
    box: px([1, 1, 62, 62]),
  });
}

// ------------------------------------------------------------------ title screen

/**
 * The continue button, lengthened to match the bar above it: scaled to the slot's height,
 * then the plain enamel between each end cap and the lettering is stretched (the
 * lettering itself keeps its shape).
 */
async function cont() {
  const src = await solid("ui_continue");
  const h = 26 * S;
  const r = await resize(src, (src.w * h) / src.h, h);
  const white = (x) => {
    for (let y = Math.floor(h * 0.3); y < h * 0.7; y++) {
      const o = (y * r.w + x) * 4;
      if (
        r.data[o] > 215 &&
        r.data[o + 1] > 215 &&
        r.data[o + 2] > 215 &&
        r.data[o + 3] > 200
      )
        return true;
    }
    return false;
  };
  const cap = Math.round(h * 0.6);
  let a = cap,
    b = r.w - cap - 1;
  while (a < b && !white(a)) a++;
  while (b > a && !white(b)) b--;
  a = Math.max(cap + 2, a - 2 * S);
  b = Math.min(r.w - cap - 2, b + 2 * S);
  const W = 214 * S;
  const gap = (W - cap * 2 - (b - a)) / 2;
  const out = blank(W, h);
  paste(out, crop(r, [0, 0, cap, h]), 0, 0);
  paste(out, await resize(crop(r, [cap, 0, a - cap, h]), gap, h), cap, 0);
  paste(out, crop(r, [a, 0, b - a, h]), cap + Math.round(gap), 0);
  paste(
    out,
    await resize(crop(r, [b, 0, r.w - cap - b, h]), gap, h),
    cap + Math.round(gap) + (b - a),
    0,
  );
  paste(out, crop(r, [r.w - cap, 0, cap, h]), W - cap, 0);
  return paste(blank(235 * S, 28 * S), out, ((235 - 214) / 2) * S, 1 * S);
}
/** Hover: the enamel lights up (brighter, more turquoise); brass and lettering stay. */
const contOver = async () =>
  tint(await cont(), (r, g, b, a) => {
    const k = Math.max(0, Math.min(1, (b - r - 30) / 60));
    return [r + 10 * k, g + (g * 0.35 + 30) * k, b + (b * 0.25 + 25) * k, a];
  });

// ------------------------------------------------------------------ medals

const medal = (src) => async () =>
  place(await solid(src), 97 * S, 133 * S, { box: px([1, 1, 95, 131]) });

// ------------------------------------------------------------------ statistics screen

/** Stretch a whole source to w x h logical (for panels whose aspect is close already). */
async function fitAll(src, w, h) {
  return resize(await solid(src), w * S, h * S);
}

/**
 * The stats board, scaled down before nine-slicing so its frame stays slim (~12 px): the
 * Close button (y 420..447) and the text at x 35 must sit on the parchment.
 */
async function tabPanel() {
  const src = await solid("ui_panel");
  const k = (0.5 * 637 * S) / src.w;
  const r = await resize(src, src.w * k, src.h * k);
  const c = 28 * S;
  return nine(r, 637 * S, 429 * S, [c, c, c, c]);
}

const tabTop = async () =>
  hstretch(await solid("ui_tab"), 162 * S, 38 * S, 40 * S);
const tabTopShadow = async () =>
  darken(
    tint(await tabTop(), (r, g, b, a) => {
      const m = (r + g + b) / 3;
      return [r + (m - r) * 0.35, g + (m - g) * 0.35, b + (m - b) * 0.35, a];
    }),
    0.22,
  );

const radio = (src) => async () =>
  hstretch(await solid(src), 169 * S, 36 * S, 50 * S);

async function question() {
  return place(await solid("ui_question"), 17 * S, 29 * S, {
    box: px([0, 0, 17, 29]),
  });
}

// ------------------------------------------------------------------ hall of fame

const TABLES = [
  {
    x: 20,
    w: 322,
    title: "ADVENTURE",
    hue: null,
    heads: [
      ["PLAYER", 49, "start"],
      ["SCORE", 264, "end"],
      ["DIFF.", 300, "middle"],
    ],
    rank: 45,
    rule: 272,
  },
  {
    x: 358,
    w: 254,
    title: "ABYSS",
    hue: "purple",
    heads: [
      ["PLAYER", 389, "start"],
      ["DEPTH", 581, "end"],
    ],
    rank: 384,
  },
];
const TY = 86,
  TH = 272; // the Adventure board reaches a little left of the SVG's rect so the rank numbers clear its frame

/** Blue enamel to royal purple (the Abyss colour on the main menu). */
const purple = (img) =>
  tint(img, (r, g, b, a) => {
    if (b < r + 25) return [r, g, b, a];
    return [r * 0.55 + b * 0.5, g * 0.55, b * 0.95, a];
  });

/**
 * A score board fitted to its table rect: scaled so the frame + enamel title band end at
 * y 124 (the column headings at y ~141 and the rows sit on the parchment), then rebuilt as
 * a nine-slice so the corner brackets keep their shape and only plain bands stretch.
 */
async function board(t) {
  let img = await solid("hall_board");
  // The band: the run of blue down the middle column.
  const cx = Math.floor(img.w / 2);
  const blue = (y) => {
    const o = (y * img.w + cx) * 4;
    return img.data[o + 2] > img.data[o] + 40;
  };
  let y = 0;
  while (y < img.h && !blue(y)) y++;
  while (y < img.h && blue(y)) y++;
  const k = ((124 - TY) * S) / (y + 4);
  if (t.hue === "purple") img = purple(img);
  const r = await resize(img, img.w * k, img.h * k);
  const c = 25 * S;
  return nine(r, t.w * S, TH * S, [c, (124 - TY) * S, c, c]);
}

async function high_score_bg() {
  const out = await place(
    await source("hall_scene", { trim: false }),
    640 * S,
    480 * S,
    { mode: "cover" },
  );
  paste(
    out,
    await place(await solid("hall_title"), 640 * S, 86 * S, {
      box: px([120, 4, 400, 78]),
    }),
    0,
    0,
  );
  for (const t of TABLES) paste(out, await board(t), t.x * S, TY * S);
  let o = "";
  for (const t of TABLES) {
    const cx = t.x + t.w / 2;
    o += text(t.title, {
      x: cx,
      y: TY + 30,
      size: 22,
      file: FONTS.slab,
      anchor: "middle",
      fill: "#16233a",
      stroke: "#16233a",
      strokeWidth: 5,
    });
    o += text(t.title, {
      x: cx,
      y: TY + 30,
      size: 22,
      file: FONTS.slab,
      anchor: "middle",
      fill: "#fff8e6",
    });
    // headings strip and alternate row shading on the parchment
    o += `<rect x="${t.x + 14}" y="126" width="${t.w - 28}" height="21" rx="3" fill="#8a6a34" fill-opacity="0.22"/>`;
    for (const [s, hx, anchor] of t.heads)
      o += text(s, {
        x: hx,
        y: 141,
        size: 11.5,
        file: FONTS.slab,
        anchor,
        fill: "#4f3c1a",
        letterSpacing: 0.5,
      });
    for (let i = 1; i < 10; i += 2)
      o += `<rect x="${t.x + 14}" y="${150 + 19 * i}" width="${t.w - 28}" height="19" fill="#8a6a34" fill-opacity="0.09"/>`;
    for (let i = 0; i < 10; i++)
      o += text(String(i + 1), {
        x: t.rank,
        y: 163 + 19 * i,
        size: 9,
        file: FONTS.slab,
        anchor: "end",
        fill: "#a8915c",
      });
    if (t.rule)
      o += `<path d="M${t.rule},150 V346" stroke="#8a6a34" stroke-opacity="0.3" stroke-width="1"/>`;
  }
  return paste(out, await overlay(640, 480, o), 0, 0);
}

export default {
  dialog,
  dbutton,
  dbutton_hilight: dbuttonHilight,
  tab_button: () => button(121, 37),
  editbox,
  checked,
  slider,
  slideranchor,
  cursor1,
  pointer2,
  favicon,
  title_continue: cont,
  title_continue_over: contOver,
  medal_gold: medal("ui_medal_gold"),
  medal_silver: medal("ui_medal_silver"),
  medal_bronze: medal("ui_medal_bronze"),
  tab_panel: tabPanel,
  tab_panel_white: () => fitAll("ui_paper", 377, 316),
  tab_panel_question: question,
  tab_top: tabTop,
  tab_top_shadow: tabTopShadow,
  tab_radiobtn_active: radio("ui_radio"),
  tab_radiobtn_inactive: radio("ui_radio_off"),
  high_score_bg,
};
