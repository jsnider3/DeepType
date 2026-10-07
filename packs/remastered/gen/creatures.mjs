// Creature sources: the shark family (hammerhead "black", tiger "red", ghost, toxic, the
// shock poses), piranhas, the gumbo anglerfish, the bonus jellyfish, the dazed diver, the
// fight cloud and the tiny background fish. packs/remastered/raster/creatures.mjs animates
// them. Field notes are at the top of gen/core.mjs.
//
// Poses of one creature (dead, shocked) ref the base so the silhouette stays the same: the
// game swaps the shock image with the swim frame in place, so both must line up.

const SAME = 'this is the same creature';
const SIDE = 'strict side view, swimming to the LEFT (head on the left, tail on the right)';
const KO = 'but knocked out: eyes are dazed white crosses, jaw hanging slack with the tongue lolling, fins limp. Comedic, not gory, no blood.';
const SHOCK =
  'but in the middle of a comic electrocution, X-ray style: the whole body flashes a glowing electric blue, semi-see-through, revealing a bright white cartoon skeleton inside (skull, long spine, ribs, fin bones), eyes wide white with tiny pupils, teeth bared in shock. Small white-blue crackles of electricity hug the outline. Keep EXACTLY the same pose, size, proportions and silhouette as the reference; nothing sticks out more than a few pixels beyond the outline.';

export default {
  // ------------------------------------------------------------------ shark poses
  shark_basic_shock: {
    refs: ['shark_basic'],
    refNote: 'this is the same shark',
    prompt: `The exact same great white shark as the reference, same ${SIDE}, ${SHOCK}`,
  },

  shark_hammer: {
    refs: ['shark_basic'],
    refNote: 'a sibling enemy: match its rendering, lighting and level of detail',
    prompt:
      `A game sprite of a menacing hammerhead shark, full body, ${SIDE}. The wide flattened hammer-shaped head seen from the side (a broad blade at the front with the eye at its tip), mouth slightly open showing teeth, angry eye. Very dark charcoal-slate back with a faint purple-blue sheen, pale grey-white belly, tall sickle-shaped first dorsal fin, long upper tail lobe. The whole shark fits inside the frame with a little margin.`,
  },
  shark_hammer_dead: {
    refs: ['shark_hammer'],
    refNote: SAME,
    prompt: `The exact same hammerhead shark as the reference, same colours, proportions and pose (${SIDE}), ${KO}`,
  },
  shark_hammer_shock: {
    refs: ['shark_hammer'],
    refNote: SAME,
    prompt: `The exact same hammerhead shark as the reference, same ${SIDE}, ${SHOCK}`,
  },

  shark_tiger: {
    refs: ['shark_basic'],
    refNote: 'a sibling enemy: match its rendering, lighting and level of detail',
    prompt:
      `A game sprite of a big mean tiger shark, full body, ${SIDE}. Blunt broad snout, mouth open showing jagged serrated teeth, fierce eye. Rusty reddish-brown back covered with bold darker tiger stripes and blotches, warm cream belly, a few battle scars. The whole shark fits inside the frame with a little margin.`,
  },
  shark_tiger_dead: {
    refs: ['shark_tiger'],
    refNote: SAME,
    prompt: `The exact same tiger shark as the reference, same colours, stripes, proportions and pose (${SIDE}), ${KO}`,
  },
  shark_tiger_shock: {
    refs: ['shark_tiger'],
    refNote: SAME,
    prompt: `The exact same tiger shark as the reference, same ${SIDE}, ${SHOCK}`,
  },

  shark_ghost: {
    refs: ['shark_basic'],
    refNote: 'a sibling enemy: same body shape and pose, match its rendering quality',
    prompt:
      `A game sprite of a spectral ghost shark, full body, ${SIDE}, same build as the reference shark. Its body is pale misty blue-white and ethereal, softly luminous from within, with faint wispy trails streaming off the fins and tail tip, hollow glowing cyan eyes and a toothy grin. Painted as a solid opaque sprite (the game adds the transparency); keep it bright and pale but with clear shading so its form reads. The whole shark fits inside the frame with a little margin.`,
  },
  shark_ghost_dead: {
    refs: ['shark_ghost'],
    refNote: SAME,
    prompt: `The exact same ghost shark as the reference, same colours, proportions and pose (${SIDE}), ${KO} Its glow is fading.`,
  },

  shark_toxic: {
    refs: ['shark_basic'],
    refNote: 'a sibling enemy: same body shape and pose, match its rendering quality',
    prompt:
      `A game sprite of a toxic mutant shark, full body, ${SIDE}, same build as the reference shark. Sickly acid-green and murky olive skin with glowing radioactive lime-green blotches and veins, a few bubbling pustules, dripping green slime from the jaw, glowing yellow-green eyes, crooked teeth. Menacing but cartoonish, not gross. The whole shark fits inside the frame with a little margin.`,
  },
  shark_toxic_dead: {
    refs: ['shark_toxic'],
    refNote: SAME,
    prompt: `The exact same toxic shark as the reference, same colours, proportions and pose (${SIDE}), ${KO} Its glowing blotches have dimmed.`,
  },
  shark_toxic_shock: {
    refs: ['shark_toxic'],
    refNote: SAME,
    prompt: `The exact same toxic shark as the reference, same ${SIDE}, ${SHOCK}`,
  },

  // ------------------------------------------------------------------ piranhas
  piranha: {
    shape: 'square',
    refs: ['shark_basic'],
    refNote: 'a sibling enemy: match its rendering, lighting and level of detail',
    prompt:
      `A game sprite of a chunky, aggressive cartoon piranha, full body, ${SIDE}. Deep rounded body almost as tall as long, big underbite jaw packed with sharp triangular teeth, angry eye with a heavy brow. Steel-blue back with metallic scales, fiery orange-red throat and belly, a large calm pale silver-white patch in the middle of the flank, small spiky fins and a forked tail. The whole fish fits inside the frame with a little margin.`,
  },
  piranha_dead: {
    shape: 'square',
    refs: ['piranha'],
    refNote: SAME,
    prompt: `The exact same piranha as the reference, same colours, proportions and pose (${SIDE}), ${KO}`,
  },
  piranha_shock: {
    shape: 'square',
    refs: ['piranha'],
    refNote: SAME,
    prompt: `The exact same piranha as the reference, same ${SIDE}, ${SHOCK}`,
  },
  piranha_white: {
    shape: 'square',
    refs: ['piranha'],
    refNote: 'the same piranha species: same shape, size and pose',
    prompt:
      `The same chunky piranha as the reference, same ${SIDE}, same shape and pose, but a tougher pale variant: bone-white and pearly silver all over with cool grey-blue shading, thick armoured plate-like scales with small ridges, pale icy-blue eye, the same big teeth. The middle of the flank stays a smooth plain pale patch.`,
  },
  piranha_white_dead: {
    shape: 'square',
    refs: ['piranha_white'],
    refNote: SAME,
    prompt: `The exact same pale armoured piranha as the reference, same colours, proportions and pose (${SIDE}), ${KO}`,
  },

  // ------------------------------------------------------------------ gumbo
  gumbo: {
    shape: 'square',
    refs: ['piranha'],
    refNote: 'a sibling enemy: match its rendering, lighting and level of detail',
    prompt:
      `A game sprite of a grumpy deep-sea anglerfish, full body, ${SIDE}. Round squat body, very DARK: deep navy-black and dark purple-brown skin with only subtle cool rim light, a huge grumpy frowning mouth with crooked needle teeth, small beady scowling eyes, a stalk on its forehead ending in a softly glowing yellow-green lure bulb dangling in front of its face, ragged little fins. The middle of the body is a large calm dark area (white text is printed there). The whole fish fits inside the frame with a little margin.`,
  },
  gumbo_dead: {
    shape: 'square',
    refs: ['gumbo'],
    refNote: SAME,
    prompt: `The exact same anglerfish as the reference, same colours, proportions and pose (${SIDE}), ${KO} Its lure light is out.`,
  },
  gumbo_shock: {
    shape: 'square',
    refs: ['gumbo'],
    refNote: SAME,
    prompt: `The exact same anglerfish as the reference, same ${SIDE}, ${SHOCK}`,
  },

  // ------------------------------------------------------------------ bonus jellyfish
  jellyfish: {
    shape: 'portrait',
    refs: ['shark_basic'],
    refNote: 'same game: match its rendering, lighting and level of detail',
    prompt:
      'A game sprite of a cute, friendly glowing jellyfish, front-side view, upright. A plump round dome-shaped bell in soft translucent pink-magenta-violet with a light lavender-pink inner glow and glossy highlights; the bell is large and its middle is a calm smooth light area (black text is printed there). Below it a short ruffled frill and a few short wavy translucent tentacles, no longer than the bell is tall. A few tiny sparkles. Do not use pure magenta (#FF00FF) anywhere; keep the pinks soft and pastel.',
  },
  jelly_splash: {
    shape: 'square',
    refs: ['jellyfish'],
    refNote: 'the jellyfish that pops into this splash',
    prompt:
      'A game effect sprite: a bright cheerful burst splash, seen front on, as a pink jellyfish pops. A ring of glossy translucent pink and lavender droplets and blobs flying outward from the centre, little white star sparkles and tiny bubbles between them, the centre mostly empty. Do not use pure magenta (#FF00FF); keep the pinks soft and pastel.',
  },

  // ------------------------------------------------------------------ diver
  diver_dazed: {
    shape: 'portrait',
    refs: ['svg:diver_beaten', 'diver'],
    layout: true,
    refNote: 'the second attachment is our diver: keep his design exactly',
    prompt:
      'Our yellow brass-helmet diver, beaten and dazed, being hauled straight up by his air hose: he dangles limply from the hose fitting on top of his helmet, head lolling, arms and legs hanging down loosely, boots pointing down, a sticking-plaster cross and a small dent on the helmet, dizzy eyes behind the faceplate, little gold stars circling his head. No zapper in his hands. Do not draw the hose itself, only the fitting on the helmet where it attaches.',
  },

  // ------------------------------------------------------------------ fight cloud
  fight_cloud: {
    shape: 'square',
    refs: ['shark_basic', 'diver'],
    refNote: 'the shark and the diver are our characters',
    prompt:
      'A classic comic-strip brawl cloud, front view: a big round billowing dust cloud of white and pale blue-grey puffs with soft painted shading and swirling motion lines, little stars, a few bubbles. Poking out around its edge: a grey shark tail fin, a grey shark dorsal fin, a yellow diving-suit leg with a heavy boot and a brown glove of our diver. The cloud is centred and fills most of the image; the poking parts stay inside the image.',
  },
  fight_cloud_b: {
    shape: 'square',
    refs: ['fight_cloud'],
    refNote: 'the same brawl cloud, a moment later',
    prompt:
      'The same comic brawl cloud as the reference, same size, style and colours, a moment later in the scuffle: the puffs are rearranged, and different things poke out of it: the brass diving helmet tumbling, a grey shark nose with teeth, a yellow arm with a brown glove, a shark tail. A few stars and swirl lines. The cloud is centred and fills most of the image.',
  },

  // ------------------------------------------------------------------ background fish
  goldfish: {
    shape: 'square',
    refs: ['shark_basic'],
    refNote: 'same game: match its rendering quality',
    prompt:
      'A game sprite of a small simple sleek reef fish, full body, strict side view, swimming to the RIGHT (head on the right, tail on the left). Very light colours: pale cream-gold body with soft white belly and soft grey shading, a forked tail, small fins, a clear dark eye. Simple clean shapes that still read when tiny. The fish fills the frame width with a little margin.',
  },
};
