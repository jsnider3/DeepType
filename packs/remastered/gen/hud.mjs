// HUD, treasure / secret level and sonar sources. raster/hud.mjs turns them into the game's
// images: the status bar is composited from separate pieces (panel, zapper plate, gauge,
// buttons) at board.ts's exact rects; gauges have their glass channel detected and mapped
// onto the rect the code fills. See the notes at the top of raster/hud.mjs.

const BTN = ['btn_options'];
const GEM = ['hud_gem_red'];
const SECRET = ['hud_secret_crown'];
const LETTERING = ['logo'];

const button = (word, face) => ({
  refs: BTN,
  refNote: 'same button style (brass frame, enamel face, white lettering), but a different shape and no icon',
  text: `"${word}"`,
  prompt: `A small game HUD button, front view, flat on, about 8:3 proportions (wider than tall): a rounded-rectangle frame of polished brass with four tiny corner rivets, a ${face} enamel face with a soft glossy highlight across its top half. The word "${word}" in big bold white letters with a thick dark navy outline fills most of the face, centred. No icon.`,
});

const gem = (desc) => ({
  shape: 'square',
  refs: GEM,
  refNote: 'match this gem rendering style, size in frame and lighting exactly; a different stone and cut',
  prompt: `A single game treasure icon: ${desc}, seen straight from the front, big and centred, filling most of the image. Crisp faceted cut with clear light and dark facets, a bright white glint at the upper left, rich saturated colour, a thin dark outline so it reads at small size.`,
});

export default {
  // ------------------------------------------------------------------ status bar
  hud_bar: {
    refs: ['loadbar'],
    refNote: 'match this brass and enamel finish',
    prompt:
      'A very long, short horizontal control-panel strip for the bottom edge of a game screen, front view, about 12:1 proportions, spanning the whole width of the image: a dark navy-teal enamelled steel plate with a polished brass rail along the top edge and a thinner brass rail along the bottom edge, small brass rivets evenly spaced along both rails, subtle brushed-metal texture and a soft highlight. It is plain and uniform along its whole length (no buttons, gauges, icons or panels), so it can be stretched.',
  },
  hud_zapper: {
    refs: ['btn_adventure'],
    refNote: 'same brass-and-enamel button style',
    text: '"SHARK" and "ZAPPER"',
    prompt:
      'A small rectangular game HUD nameplate, front view, flat on, about 7:2 proportions: a polished brass frame with tiny corner rivets around a dark sea-blue enamel face. At its left end a round brass porthole badge holding a glowing yellow lightning bolt. To the right of it, the word "SHARK" above the word "ZAPPER", two lines of bold letters with a thick dark navy outline: SHARK in white, ZAPPER in gold. The words fill the rest of the face.',
  },
  hud_gauge: {
    refs: ['loadbar'],
    refNote: 'same brass gauge style',
    prompt:
      'A long horizontal energy-meter frame for a game HUD, front view, about 9:1 proportions: a riveted polished-brass frame holding one long EMPTY rectangular glass window (dark navy, see-through, nothing inside) that takes up almost its entire length and about two thirds of its height. Both ends are short rounded brass caps, each with a small bolt. No porthole, no icons.',
  },
  hud_btn_pause: button('PAUSE', 'sea-blue'),
  hud_btn_options: button('OPTIONS', 'steel-blue'),
  hud_btn_quit: button('QUIT', 'red'),
  hud_meter: {
    refs: ['loadbar_fill'],
    refNote: 'same kind of glowing fill, but electric blue',
    prompt:
      'A plain horizontal bar of crackling electric energy as it would look filling the glass tube of a game power meter: bright electric-blue plasma with a jagged white-hot lightning thread running along its middle, a highlight along the top, a little brighter toward the right end, square ends. Very wide and short (about 10:1). Nothing else in the image.',
  },

  // ------------------------------------------------------------------ banners
  hud_prepare: {
    refs: LETTERING,
    refNote: 'match this lettering style',
    text: '"PREPARE TO DIVE!"',
    prompt:
      'Game banner lettering: the words "PREPARE TO DIVE!" on ONE line in big chunky bold letters, golden-yellow to warm orange gradient, thick dark navy outline, glossy highlight and a subtle drop shadow, with a few small bubbles rising off the letters. Very wide, centred, nothing else.',
  },
  hud_gameover: {
    refs: ['hud_prepare'],
    refNote: 'same lettering style, different colour',
    text: '"GAME OVER"',
    prompt:
      'Game banner lettering: the words "GAME OVER" on ONE line in big chunky bold letters, coral-red to deep red gradient, thick dark navy outline, glossy highlight and a subtle drop shadow. Wide, centred, nothing else.',
  },
  hud_shipwreck: {
    refs: ['hud_prepare'],
    refNote: 'same lettering style',
    text: '"SHIPWRECK BONUS!"',
    prompt:
      'Game banner lettering: the words "SHIPWRECK BONUS!" on ONE line in big chunky bold letters, golden-yellow to warm orange gradient, thick dark navy outline, glossy highlight and a subtle drop shadow, with a couple of tiny gold sparkles. Very wide (about 10:1), centred, nothing else.',
  },
  hud_airgauge: {
    refs: ['loadbar'],
    refNote: 'same brass-and-glass gauge style',
    prompt:
      "A long horizontal diver's air-tank gauge for a game HUD, front view, about 10:1 proportions: a slim steel compressed-air cylinder lying on its side with brass bands, with one long EMPTY rectangular glass window (dark navy, see-through, nothing inside) along almost its entire length and about half its height. The left end is a short rounded cylinder cap with a tiny round pressure dial; the right end has a short brass neck and a small red valve handwheel.",
  },

  // ------------------------------------------------------------------ clams (secret level)
  hud_clam_closed: {
    shape: 'square',
    prompt:
      'A single game sprite of a giant clam sitting on a small flat rock, CLOSED, seen from the front and slightly above, wider than tall: a chunky fluted shell in deep violet-purple with teal-tinted ridges and a pearly sheen on the edges, a wavy closed lip running across the middle. The front of the shell is a fairly dark mid-tone (white letters are printed on it). The clam is centred and fills most of the width.',
  },
  hud_clam_open: {
    shape: 'square',
    refs: ['hud_clam_closed'],
    refNote: 'this is the same clam',
    prompt:
      'The exact same giant clam on the same small flat rock, same colours, size, view and position, but wide OPEN: the top shell is hinged up and back above it, revealing a glossy pink-and-cream pearly lining and the soft inside of the bottom shell. The inside is EMPTY (no pearl). The bottom shell and the rock look exactly as in the reference.',
  },
  hud_pearls: {
    prompt:
      'Two lustrous round pearls side by side, far apart, same size: the LEFT one creamy white with a silver-blue sheen, the RIGHT one soft rose pink. Each has a bright specular highlight, gentle shading and a thin dark outline. Nothing else.',
  },

  // ------------------------------------------------------------------ gems
  hud_gem_red: {
    shape: 'square',
    prompt:
      'A single game treasure icon: a cushion-cut ruby (square with softly rounded corners), deep glowing red, seen straight from the front, big and centred, filling most of the image. Crisp faceted cut with clear light and dark facets, a bright white glint at the upper left, rich saturated colour, a thin dark outline so it reads at small size.',
  },
  hud_gem_green: gem('an emerald-cut emerald (an upright rectangle with clipped corners and stepped facets), vivid green'),
  hud_gem_orange: gem('a hexagonal-cut topaz, warm glowing orange'),
  hud_gem_purple: gem('an oval-cut amethyst (taller than wide), rich violet purple'),
  hud_gem_white: gem('a round brilliant-cut diamond, icy white with a faint blue tint and small flashes of rainbow fire'),
  hud_gem_yellow: gem('a pear-shaped (teardrop, point at the top) citrine, sunny golden yellow'),

  // ------------------------------------------------------------------ secret treasures
  hud_secret_crown: {
    shape: 'square',
    prompt:
      'A single game treasure item: a small ornate golden royal crown with five pointed tips topped with pearls, a band set with a big red ruby in the middle and blue and green jewels either side, front view, slightly from above. Gleaming gold, rich shading, a thin dark outline. Centred, filling most of the image.',
  },
  hud_secret_figurine: {
    shape: 'portrait',
    refs: SECRET,
    refNote: 'same treasure rendering style',
    prompt:
      'A single game treasure item: a small antique golden mermaid idol statuette standing upright on a round teal jade pedestal, a red ruby set in her crown, tail curled to one side, hands clasped. Front view. Gleaming gold, rich shading, a thin dark outline. Centred, filling most of the image height.',
  },
  hud_secret_necklace: {
    shape: 'portrait',
    refs: SECRET,
    refNote: 'same treasure rendering style',
    prompt:
      'A single game treasure item: a long necklace of round white pearls hanging in a narrow upright loop (much taller than wide), with a gold-set sapphire pendant at the bottom. Front view. Lustrous pearls, a thin dark outline. Centred, filling most of the image height.',
  },
  hud_secret_scepter: {
    shape: 'square',
    refs: SECRET,
    refNote: 'same treasure rendering style',
    prompt:
      'A single game treasure item: an ornate golden royal scepter lying diagonally from the lower LEFT to the upper RIGHT, with a purple velvet-wrapped grip, a jewelled golden head with a big red gem at the top-right end, and a small gold knob at the bottom-left end. Gleaming gold, rich shading, a thin dark outline. Filling the image corner to corner.',
  },

  // ------------------------------------------------------------------ stats panel + sonar
  hud_treasure_panel: {
    shape: 'portrait',
    refs: ['svg:tab_panel_treasure', 'btn_adventure'],
    layout: true,
    prompt:
      'A tall game UI panel for a treasure collection, front view, flat on. Keep every shape of the layout guide in place: an outer frame of polished brass with small rivets around a warm cream parchment face; two gold title bands (one at the top, one just below the middle) left completely blank; and ten rounded cells in two columns (six above the middle band, four below it), each holding a round recessed socket lined with dark navy velvet on its left half. The sockets are EMPTY and the right half of every cell is blank cream.',
  },
  hud_sonar: {
    shape: 'square',
    refs: ['svg:sonar_bg', 'loadbar'],
    layout: true,
    prompt:
      'A round sonar display console from a submarine, front view, flat on: a thick riveted gunmetal-and-brass bezel ring around a large circular glass screen. The screen is very dark green-black and calm, with faint dim-green concentric range rings, a faint crosshair and tick marks around its rim, and a soft glass reflection only along the upper-left edge (white text is printed over the middle). A small blank brass plate at the bottom of the bezel.',
  },
};
