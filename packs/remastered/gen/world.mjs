// World sources: the open-water backdrop, the clam-level sand and coral shelf, the dive boat
// and the six surface backdrops, the sea chart (map screen) with its rock arch, chests and
// ship, and the typing tutor's keyboard parts, panel parts, hands and finger.
// packs/remastered/raster/world.mjs cuts, fits and assembles them. Field notes are at the top
// of gen/core.mjs.

const DEEP = ['ridge_far', 'title_scene'];
const SURFACE = ['menu_scene'];

// Shared composition rules for the surface backdrops: they are cropped to a thin strip
// (640x119 in game, about 5.4:1) whose waterline sits 80% of the way down.
const SPLIT =
  'A split-level view right at the sea surface, as if the camera floats half in the water. IMPORTANT composition (the picture will be cropped to a thin horizontal strip): the wavy waterline runs straight across the whole image at exactly 72% of the image height; below it is clear sunlit shallow water seen from underneath (blue, with soft light rays and the silvery underside of the surface), nothing else under the water. Above the waterline: open sea out to a flat horizon just above the waterline (at about 66% of the image height), then sky. All scenery (landmarks, clouds) sits in the band between 50% and 72% of the image height; above 50% only plain sky. The LEFT third of the image stays open sea and sky with no landmark (a boat is added there).';

export default {
  // ------------------------------------------------------------------ playfield
  water_open: {
    opaque: true,
    refs: DEEP,
    refNote: 'the ridges and the title scene are from the same dive; match their water colour',
    prompt:
      'A calm open-water underwater backdrop for a game: nothing but deep blue sea water seen from inside, mid-depth, with no surface, no floor, no creatures, no bubbles in the foreground and no objects. Soft, low-contrast painterly variations of deep ocean blue, a few very faint slanted light shafts and the subtlest suspended particles. Evenly lit from top to bottom (no brighter top, no darker bottom: it must tile vertically), gentle and quiet so white text reads clearly on top of it.',
  },
  sand_floor: {
    refs: ['seafloor', 'ridge_near'],
    refNote: 'the shipwreck sea floor and the rock ridge are from the same game',
    prompt:
      'A wide strip of smooth sandy sea floor seen from the side and a little above, for the bottom of a game screen: soft rippled pale sand in cool underwater light, a gently undulating top edge across the upper 15% of the image, and solid sand from there all the way down to the bottom edge, filling the whole width. Only a little dressing near the far LEFT and far RIGHT ends (a few small rocks, shells, a starfish, short sea grass); the middle is plain sand. Transparent above the sand line.',
  },
  coral_shelf: {
    refs: ['seafloor', 'ridge_near'],
    refNote: 'the shipwreck sea floor and the rock ridge are from the same game',
    prompt:
      'A broad, flat-topped underwater rock shelf for a mini-game where giant clams sit on it in four rows: seen from the front and a little above, a wide mound of layered dark blue-grey rock with four shallow horizontal ledges stepping up its face, the central three-quarters of the face fairly plain and evenly lit (the clams cover it), colourful corals, sea fans, anemones and sponges growing on the LEFT and RIGHT flanks and in a thin fringe along the top edge. About 3:2, filling most of the image. Soft shadow at its base.',
  },

  // ------------------------------------------------------------------ dive boat and surface
  dive_boat: {
    refs: SURFACE,
    refNote: 'the deck of this boat is seen in the main menu: same boat, same cheerful colours',
    prompt:
      'A small cheerful dive-support boat, strict side view, bow pointing to the RIGHT, stern on the LEFT. White hull with a red bottom stripe and a blue band, a little yellow wheelhouse with windows, a short mast with a radar bar and a red pennant, railings on the aft deck and a winch drum. On the stern at the far LEFT stands a sturdy red steel A-frame crane that leans back out over the water past the stern, with a pulley wheel at its top: the pulley is the left-most part of the boat. No hose, rope or cable hangs from the pulley. The hull is shown down to just below its waterline (flat cut there).',
  },
  surf_sunny: {
    opaque: true,
    refs: SURFACE,
    prompt: `${SPLIT} A bright sunny morning: deep blue sky with a few puffy white clouds low in the sky, the sun glow in the upper right, a small low tropical island with two palm trees on the horizon towards the right, a couple of distant gulls.`,
  },
  surf_iceberg: {
    opaque: true,
    refs: ['surf_sunny'],
    refNote: 'same strip layout and waterline; only the place and weather change',
    prompt: `${SPLIT} Arctic waters on a crisp pale day: pale blue sky with thin cloud, a distant white glacier line on the horizon, a big jagged iceberg rising from the sea towards the right (its huge pale-blue underwater mass visible below the waterline), a few small ice floes drifting on the surface, light snow flurries.`,
  },
  surf_lighthouse: {
    opaque: true,
    refs: ['surf_sunny'],
    refNote: 'same strip layout and waterline; only the place and time change',
    prompt: `${SPLIT} A clear night: dark navy starry sky, a crescent moon with its reflection glittering on the water, a dark rocky point on the right with a red-and-white striped lighthouse whose lamp shines a broad soft beam sweeping out to the left across the sky. The underwater part is dark night-time blue.`,
  },
  surf_shipwreck: {
    opaque: true,
    refs: ['surf_sunny'],
    refNote: 'same strip layout and waterline; only the place and weather change',
    prompt: `${SPLIT} An overcast grey-blue day: soft grey clouds, the two broken wooden masts of a sunken sailing ship sticking up out of the water at an angle towards the right, with a torn sail, dangling rigging and a tattered black flag, a gull perched on a yard-arm; the dark shape of the sunken hull shows faintly under the water below them.`,
  },
  surf_storm: {
    opaque: true,
    refs: ['surf_sunny'],
    refNote: 'same strip layout and waterline; only the weather changes',
    prompt: `${SPLIT} A wild storm: heavy dark slate storm clouds, a bright forked lightning bolt striking down to the sea towards the right with a glow around it, driving diagonal rain, choppy sea with whitecaps, dark grey-green churned water below the waterline.`,
  },
  surf_volcano: {
    opaque: true,
    refs: ['surf_sunny'],
    refNote: 'same strip layout and waterline; only the place and time change',
    prompt: `${SPLIT} A tropical sunset: warm orange-to-golden sky, a low hazy sun on the left-centre, and towards the right a volcanic island with a smoking cone (a thin glowing lava trickle, a plume of smoke drifting right), a sandy beach with palm trees at its foot. Turquoise water.`,
  },

  // ------------------------------------------------------------------ map screen
  map_chart: {
    opaque: true,
    layout: true,
    refs: ['svg:mapbg', 'title_scene'],
    prompt:
      'A hand-painted adventure sea chart for the level map of a game, seen from straight above: the same coastlines, islands, rocks, sunken wreck icons, whirlpool, sea serpent, factory, volcano isle, compass rose, wave marks and murky / warm patches of water as the layout guide, each in exactly the same place and size, repainted as a rich illustrated map: aged parchment-tinted turquoise sea with soft depth shading and painted shallows around the coasts, sandy beaches, green hills, forests and rocky peaks on the land, little houses and a pier at the top-left port, a faint latitude/longitude grid. The open water between the features stays calm and fairly plain (route dots and treasure-chest markers are drawn on top). Fill the whole frame edge to edge, stretching the layout to fit.',
  },
  map_arch: {
    shape: 'square',
    layout: true,
    refs: ['svg:mapscreen_arch', 'title_scene'],
    prompt:
      'A natural sandstone rock arch as an illustrated map landmark seen from above at a slight angle, exactly the shape of the layout guide: two rocky legs joined by a curved span with an open gap underneath, warm tan and ochre rock with darker strata, cracks and a shadowed underside, small grass tufts on top and at its feet.',
  },
  map_chest: {
    shape: 'square',
    refs: ['title_scene'],
    prompt:
      'A small treasure chest icon for a game map, front view, closed: wide and squat (about 4:3), dark polished wood planks, a rounded domed lid, two brass straps running over the lid and down the front near the left and right ends, brass corner caps, a small brass lock plate at the top centre of the front. The middle of the front is plain wood (a big letter is printed over it).',
  },
  map_chest_open: {
    shape: 'square',
    refs: ['map_chest'],
    refNote: 'this is the same chest',
    prompt:
      'The exact same treasure chest as the reference, same front view, size and proportions, but with the lid flipped open backwards and a heap of glittering gold coins and a gem or two mounded up inside. The middle of the front stays plain wood.',
  },
  map_ship: {
    shape: 'square',
    refs: ['title_scene'],
    prompt:
      'A small sailing ship icon for an illustrated game map, side view, bow pointing to the RIGHT: a chunky little wooden hull, one mast with a full cream square sail bellied by the wind, a small jib at the front and a red pennant at the masthead. Cute and readable at a tiny size, with a hint of white wake at the waterline.',
  },

  // ------------------------------------------------------------------ typing tutor
  tut_keycap: {
    shape: 'square',
    refs: ['menu_plaque'],
    prompt:
      'One single blank keyboard key cap seen from directly above, square, centred: a glossy off-white plastic top with a gently dished face and soft rounded corners, surrounded by a slightly wider cool blue-grey sloped skirt (the key sides) that shows evenly on all four sides and a little more at the bottom, light from the top-left with a soft highlight. No letter or symbol on it.',
  },
  tut_keycap_lit: {
    shape: 'square',
    refs: ['tut_keycap'],
    refNote: 'this is the same key cap',
    prompt:
      'The exact same key cap as the reference, same size, shape and view, but lit up as the key to press: the top glows a warm golden yellow that deepens to orange at the bottom, the skirt turns hot pink-magenta, with a bright glossy highlight. No glow outside the key itself. No letter or symbol on it.',
  },
  tut_case: {
    refs: ['menu_plaque'],
    prompt:
      'An empty computer-keyboard housing seen from directly above, flat on: a very wide rounded-rectangle chassis (about 2.7:1, filling the whole width of the image) of blue-grey brushed metal with a polished chrome rim, a small screw in each corner and two tiny green and amber status lights near the bottom-right corner. Almost the whole top is one large recessed rectangular tray in dark navy where the keys sit; the tray is completely EMPTY (no keys), with a soft inner shadow along its top edge. The rim around the tray is narrow and even.',
  },
  tut_side: {
    shape: 'portrait',
    refs: ['menu_plaque'],
    prompt:
      'A tall, narrow vertical control-console panel seen straight on, filling the whole image: brushed blue-grey steel with fine VERTICAL brushing grain, a polished bevelled edge along the left side, a single small rivet in each of the four corners, evenly lit from above. Plain everywhere else (labels and screens are added on top).',
  },
  tut_plaque: {
    refs: ['menu_plaque'],
    prompt:
      'A blank wide nameplate for a game panel, front view, flat on, about 4:1: a polished brass frame with rounded corners and a brass rivet at the left and right ends, around a smooth glossy deep-blue enamel face that is completely blank (bold gold letters will be printed on it).',
  },
  tut_card: {
    shape: 'portrait',
    refs: ['menu_plaque'],
    prompt:
      'A blank tall information card for a game panel, front view, flat on: a smooth matte cream-white enamel face with softly rounded corners, a thin polished brass bezel around it and a faint inner shadow along the top edge. The face is completely blank and evenly lit (black text will be printed on it).',
  },
  tut_hands: {
    shape: 'landscape',
    layout: true,
    refs: ['svg:hands', 'tut_finger3'],
    refNote: 'the second attachment is one finger of these same gloves: same yellow rubber',
    prompt:
      'A pair of thick yellow rubber diving gloves seen from above (backs of the hands), resting at the bottom of the picture as if over a keyboard, exactly the silhouette of the layout guide: two broad gloved hands with the fingers cut off at the knuckles (rounded knuckle bumps along the top edge), each thumb reaching in towards the middle, and a ribbed darker-yellow cuff across the wrists along the bottom edge. Glossy rubber shading, soft wrinkles over the knuckles, light from above.',
  },
  tut_finger3: {
    shape: 'portrait',
    layout: true,
    refs: ['svg:finger3'],
    prompt:
      'One finger of a thick yellow rubber diving glove, exactly the shape and pose of the layout guide, painted with soft glossy rubber shading, subtle seams and wrinkles at the knuckle, light from above.',
  },
  tut_finger: {
    shape: 'portrait',
    refs: ['tut_finger3', 'tut_hands'],
    refNote: 'the same yellow rubber diving glove: match its material exactly',
    prompt:
      'One straight finger of a thick yellow rubber diving glove, seen from above (the back of the finger), pointing straight UP and perfectly vertical, centred: a long even tube with a rounded fingertip at the top and cut straight across at the bottom, a soft knuckle crease a little below the middle, glossy rubber shading with a highlight down its left side, light from above.',
  },
};
