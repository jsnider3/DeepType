// Core sources: the sharks' style anchor, diver, title, main menu, torpedo sub and dive
// scenery. Each entry is one picture; packs/remastered/raster/*.mjs turns sources into the
// game's images. Every gen/*.mjs except style.mjs adds entries (names must be unique).
//
//   shape:   'landscape' (3:2, default) | 'portrait' (2:3) | 'square'
//   opaque:  true for full-bleed scenes; otherwise transparent background
//   refs:    other sources attached as style references (generated first)
//   text:    the exact text the image may contain (otherwise none)
//   layout:  true when refs[0] is 'svg:<image>', a layout guide to repaint exactly
//
// Describe what the game needs, never PopCap's pictures: our art must be our own design.

const SHARK = ['shark_basic'];

export default {
  // ------------------------------------------------------------------ sharks
  shark_basic: {
    prompt:
      'A game sprite of a menacing great white shark, full body, strict side view, swimming to the LEFT (head on the left, tail on the right), mouth slightly open showing rows of teeth, angry eyes. Lighter back, pale belly. The whole shark fits inside the frame with a little margin.',
  },
  shark_basic_dead: {
    refs: SHARK,
    refNote: 'this is the same shark',
    prompt:
      'The exact same great white shark as the reference, same colours, proportions and pose (strict side view, head on the LEFT), but knocked out: eyes are dazed white crosses, jaw hanging slack with tongue lolling, fins limp. Comedic, not gory, no blood.',
  },

  // ------------------------------------------------------------------ diver
  diver: {
    shape: 'portrait',
    refs: SHARK,
    prompt:
      'A game sprite of a heroic but slightly comedic deep-sea diver in an old-fashioned brass diving suit: round brass helmet with a round glass faceplate (a friendly face visible inside), bulky canvas-and-brass suit painted bright yellow, heavy boots, an air tank on the back. Full body, side view facing RIGHT, standing upright, holding a chunky retro-futuristic electric zapper pistol pointed forward to the right at chest height. An air-hose fitting sticks up from the top-left of the helmet.',
  },

  // ------------------------------------------------------------------ title screen
  title_scene: {
    opaque: true,
    refs: ['shark_basic', 'diver'],
    refNote: 'the shark and the diver are our characters; keep their designs',
    prompt:
      'Title-screen illustration, dramatic and inviting. Deep underwater by a sunken pirate shipwreck on the right, with god rays from the surface. Our yellow brass-helmet diver (from the reference) clutches a huge glittering gem and creeps along the wreck, unaware that our great white shark (from the reference) looms out of the dark water on the left, grinning with too many teeth. Keep the top third of the image as open water (a logo goes there) and the bottom sixth fairly calm and dark (a loading bar goes there).',
  },
  logo: {
    refs: ['title_scene'],
    text: '"DEEP TYPE"',
    prompt:
      'A game logo: the words "DEEP TYPE" in big chunky bold letters on one line, golden-yellow with a warm orange gradient, thick dark navy outline, a glossy highlight and a subtle drop shadow; a stylized shark fin cuts through the top of the letters. Wide horizontal logo centred in the image.',
  },

  loadbar: {
    refs: ['title_scene'],
    prompt:
      'A game loading-bar frame, front view, very wide (about 4:1): a long horizontal tube of polished brass with rivets holding an EMPTY clear glass channel (dark, see-through, nothing inside), and on the right end a round brass porthole badge showing a stylized shark fin cutting through a wave. The glass channel takes up most of the length and height of the tube.',
  },
  loadbar_fill: {
    refs: ['loadbar'],
    prompt:
      'A plain horizontal bar of glowing golden-amber liquid as it would look filling a glass tube in a game loading bar: rounded ends, bright highlight along the top, a few tiny bubbles, warm inner glow. Very wide and short (about 6:1). Nothing else in the image.',
  },

  // ------------------------------------------------------------------ main menu
  menu_scene: {
    opaque: true,
    refs: ['diver', 'title_scene'],
    prompt:
      'Main-menu background. The back deck of a small, cheerful dive boat on a sunny day, sea and sky behind. Our yellow brass-helmet diver (from the reference) stands on the deck in the LOWER-LEFT part of the picture, waving at the viewer, a coil of air hose by his feet. He is fairly small: the top of his helmet is no higher than 40% of the way down the image, and he stays within the left 40% of the width. The upper-left area above him is empty bright sky (a welcome sign is placed there). The RIGHT half of the picture is calm open sky and sea with nothing important in it (menu buttons go there).',
  },
  menu_plaque: {
    refs: ['menu_scene'],
    prompt:
      'A blank signboard for a game menu, front view, flat on, a little wider than 2:1: a frame of varnished wooden planks with a thin polished brass trim and brass corner rivets. Inside the frame, the UPPER 55% is a smooth dark-navy enamel panel (white text will be printed on it) and the LOWER 45% is a light cream parchment label (dark text will be printed on it). Both areas are completely blank.',
  },
  btn_adventure: {
    refs: ['menu_plaque'],
    text: '"ADVENTURE"',
    prompt:
      'A large rectangular game menu button, front view, about 3:1 proportions: a brass-framed panel with a sea-blue enamel face and a soft glossy highlight. On its left a round porthole-style icon showing a ship\'s wheel; on the right the word "ADVENTURE" in bold white letters with a dark outline.',
  },
  btn_abyss: {
    refs: ['btn_adventure'],
    refNote: 'same button design, different icon, word and colour',
    text: '"ABYSS"',
    prompt:
      'The same style of large rectangular game menu button as the reference, about 3:1 proportions, but with a deep purple enamel face. On its left a round porthole-style icon showing a brass depth gauge; on the right the word "ABYSS" in bold white letters with a dark outline.',
  },
  btn_tutor: {
    refs: ['btn_adventure'],
    refNote: 'same button design, different icon, word and colour',
    text: '"TYPING TUTOR"',
    prompt:
      'The same style of large rectangular game menu button as the reference, about 3:1 proportions, but with a sea-green enamel face. On its left a round porthole-style icon showing an old typewriter key; on the right the words "TYPING TUTOR" in bold white letters with a dark outline.',
  },
  btn_hall: {
    refs: ['btn_adventure'],
    refNote: 'same button design, smaller and simpler',
    text: '"HALL OF FAME"',
    prompt:
      'A small, very wide game menu button in the same style as the reference, about 5:1 proportions: brass frame, golden-amber enamel face, glossy highlight, a tiny trophy icon on the left and the words "HALL OF FAME" in bold white letters with a dark outline.',
  },
  btn_options: {
    refs: ['btn_adventure'],
    refNote: 'same button design, smaller and simpler',
    text: '"OPTIONS"',
    prompt:
      'A small, very wide game menu button in the same style as the reference, about 5:1 proportions: brass frame, steel-blue enamel face, glossy highlight, a tiny gear icon on the left and the word "OPTIONS" in bold white letters with a dark outline.',
  },
  btn_quit: {
    shape: 'square',
    refs: ['btn_adventure'],
    refNote: 'same button design',
    text: '"QUIT"',
    prompt:
      'A chunky game menu button in the same style as the reference, slightly wider than tall (about 6:5): brass frame, red enamel face, glossy highlight, a small life-ring icon above the word "QUIT" in bold white letters with a dark outline.',
  },

  // ------------------------------------------------------------------ boss
  torpedo_boss: {
    refs: SHARK,
    prompt:
      'A game boss sprite: a villainous one-man pirate mini-submarine, side view facing LEFT, chunky riveted gunmetal hull with a shark-tooth grin painted on the nose, a glowing red porthole eye, a skull-and-crossbones emblem on the side, a periscope and a small conning tower. Torpedo tubes on the nose. Wider than tall. Leave the rear end clean (a spinning propeller is added separately).',
  },
  torpedo_boss_wreck: {
    refs: ['torpedo_boss'],
    refNote: 'this is the same submarine',
    prompt:
      'The exact same pirate mini-submarine as the reference, same side view facing LEFT, but defeated: dented and scorched, the red eye dark and cracked, periscope bent, a few plates hanging loose, wisps of bubbles leaking out. Comedic, not grim.',
  },

  // ------------------------------------------------------------------ dive scenery
  ridge_far: {
    opaque: false,
    refs: ['title_scene'],
    prompt:
      'A very wide horizontal strip of distant underwater rocky ridges for a parallax background: a soft jagged ridgeline across the top part, solid below it down to the bottom edge, in hazy deep ocean blue, low contrast, gentle light from above. Transparent above the ridgeline. The left and right edges should line up so it can tile.',
  },
  ridge_mid: {
    refs: ['ridge_far'],
    prompt:
      'A very wide horizontal strip of mid-distance underwater rock ridges for a parallax background: a craggier ridgeline across the top part with a few clumps of kelp and coral silhouettes, solid below it down to the bottom edge, in deep ocean blue a little darker and more detailed than the reference. Transparent above the ridgeline. The left and right edges should line up so it can tile.',
  },
  ridge_near: {
    refs: ['ridge_mid'],
    prompt:
      'A very wide horizontal strip of near underwater rock ridges for a parallax background: a bold rocky ridgeline across the top part with kelp, sponges and coral, solid below it down to the bottom edge, rich dark blues and teals with more detail and contrast than the reference. Transparent above the ridgeline. The left and right edges should line up so it can tile.',
  },
  seafloor: {
    refs: ['ridge_near'],
    prompt:
      'The sandy ocean floor at the bottom of a dive, seen from the side for a game: a wide strip of rippled sand and rocks with a half-buried, broken wooden shipwreck hull in the middle, a scattering of shells, starfish and sea grass. The sand runs across the bottom part of the image; above it is transparent. Moody deep-water lighting.',
  },
};
