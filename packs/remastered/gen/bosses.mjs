// Boss sources: mecha-shark, robo-squid and ghost galleon (with their moving parts and
// wrecks), the projectiles (torpedo, propeller, cannonball), effects (launch wake,
// explosion), the HUD boss meter and the abyss trophy card. raster/bosses.mjs turns them
// into the game's images. The pirate sub (torpedo_boss, torpedo_boss_wreck) is in core.mjs
// and is the style anchor for every boss here.
//
// Layout-critical bodies repaint our SVG layout guides ('svg:<image>', layout: true) so
// hit boxes, torpedo tubes and part joints from src/game/boss.ts line up.

const SUB = ['torpedo_boss'];

export default {
  // ------------------------------------------------------------------ propellers
  boss_propeller: {
    shape: 'square',
    refs: SUB,
    refNote: 'the propeller belongs on the stern of this submarine; match its metal and rendering',
    prompt:
      'A single ship propeller seen exactly FACE-ON (looking straight down its shaft): three broad curved blades of polished aged brass evenly spaced around a round riveted gunmetal hub with a bolt cap in the centre. Light from above. The propeller is centred and fills most of the image.',
  },

  // ------------------------------------------------------------------ torpedo
  boss_torpedo: {
    refs: SUB,
    refNote: 'this submarine fires the torpedo; match its metal, rivets and rendering',
    prompt:
      'A game sprite of a single torpedo, strict side view, nose pointing LEFT, long and slim: a cylinder about 4 times longer than it is tall. Rounded red-painted warhead nose on the left, gunmetal riveted body, and a wide clean CREAM-WHITE painted label band wrapping the middle 70% of the body (completely blank, it must be plain and light so a black word can be printed on it). Small tail fins above and below at the right end, ending in a short stubby shaft at the far right (no propeller: it is added separately). Wider than tall, horizontally centred.',
  },

  // ------------------------------------------------------------------ effects
  boss_wake: {
    refs: SUB,
    prompt:
      'An underwater launch wake for a game effect: a churning horizontal plume of white foam and many round, glossy, see-through air bubbles of various sizes, dense and bright at its LEFT end and spreading out and thinning toward the RIGHT, like the bubbly wash behind a torpedo that has just fired to the left. Pale whites and light aqua only. About 2:1, nothing else in the image.',
  },
  boss_fireball: {
    shape: 'square',
    refs: SUB,
    prompt:
      'A game effect sprite: a punchy cartoon underwater explosion seen at its peak, a round billowing fireball of bright yellow-white core, orange and red flames with dark smoky edges, a few fragments and bubbles flying out. Roughly circular, centred, fills most of the image.',
  },
  boss_smoke: {
    shape: 'square',
    refs: ['boss_fireball'],
    refNote: 'this is the same explosion a moment later',
    prompt:
      'A game effect sprite: the aftermath of an underwater explosion, a loose ring-shaped cloud of soft grey-blue smoke puffs mixed with lots of glossy round air bubbles of all sizes, a faint warm glow left in the middle. Roughly circular, centred, fills most of the image, soft wispy edges.',
  },

  // ------------------------------------------------------------------ cannonball
  boss_cannonball: {
    shape: 'square',
    refs: SUB,
    prompt:
      'A game sprite of a single haunted cannonball, front view: a perfectly round iron ball, but pale silvery-grey and very light in tone (a dark letter will be printed across its middle, so the middle of the ball must stay light and evenly lit), with a soft glossy highlight at the top left, a few faint rivet-like dimples and scratches, and a thin cold spectral blue-green glow around the rim. Centred, fills most of the image, perfectly circular.',
  },
  boss_wisp: {
    refs: ['boss_cannonball'],
    prompt:
      'A game effect sprite: a horizontal ghostly comet tail of glowing pale blue-green spectral mist and a few tiny sparkles, wide and bright at its LEFT end and tapering into wisps toward the RIGHT end. About 2:1, nothing else in the image.',
  },

  // ------------------------------------------------------------------ mecha-shark
  boss_mecha_src: {
    shape: 'portrait',
    refs: ['svg:boss_mecha', 'torpedo_boss', 'shark_basic'],
    layout: true,
    prompt:
      'A game boss sprite: a huge villainous clockwork robot shark, side view facing LEFT. It is the front two thirds of a shark built from riveted steel plates: an enormous gaping mechanical jaw on the LEFT with rows of sharp steel teeth and a glowing furnace-red throat, a menacing slit eye glowing red, a tall steel dorsal fin on top, cooling vents and yellow-and-black hazard stripes at the cut-off rear (right) edge, small torpedo tube nozzles at the mouth. Brushed silver-grey and gunmetal with brass rivets.',
  },
  boss_mecha_tail: {
    shape: 'portrait',
    refs: ['boss_mecha_src'],
    refNote: 'this is the robot shark; paint its missing tail',
    prompt:
      'A game sprite part: just the TAIL FIN of the robot shark in the reference, side view: a crescent-shaped steel shark tail fin made of riveted plates (upper lobe a little larger than the lower), with a short round mechanical hinge joint at its LEFT edge where it attaches to the body. Same metal, rivets and rendering as the reference. Taller than wide, nothing else in the image.',
  },
  boss_mecha_wreck: {
    shape: 'portrait',
    refs: ['svg:boss_mecha_death', 'boss_mecha_src', 'boss_mecha_tail'],
    layout: true,
    prompt:
      'The same clockwork robot shark as the other attachments (body and tail fin), side view facing LEFT, but defeated and listing: plates dented, scorched and hanging loose, jaw hanging open crookedly, the eye dark and cracked, sparks and wisps of smoke, the tail fin drooping. Comedic, not grim.',
  },

  // ------------------------------------------------------------------ robo-squid
  boss_squid_src: {
    refs: ['svg:boss_squid', 'torpedo_boss'],
    layout: true,
    prompt:
      'A game boss sprite: a giant mechanical robot squid, side view facing LEFT. Its body (the mantle) is a sleek riveted armoured capsule of purple-enamelled steel lying horizontally on the right, with a round armoured head at its left end. Three thick segmented mechanical tentacles curve to the LEFT and each ends in a big brass-rimmed jet-thruster cannon pointing LEFT, stacked top, middle and bottom. Purple and gunmetal with brass trim. Leave the very tip of the mantle at the right plain (a fin is added separately) and put a round empty dark socket on the head where an eye goes.',
  },
  boss_squid_tail: {
    refs: ['boss_squid_src'],
    refNote: 'this is the robot squid; paint its tail fin',
    prompt:
      'A game sprite part: just the arrowhead-shaped TAIL FIN at the rear tip of the robot squid in the reference, side view, pointing RIGHT: a broad flat diamond/arrowhead fin of purple-enamelled riveted steel with a brass edge, its LEFT end narrowing to a round socket joint where it attaches to the body. Same rendering as the reference. Wider than tall, nothing else in the image.',
  },
  boss_squid_wreck: {
    refs: ['svg:boss_squid_death', 'boss_squid_src'],
    layout: true,
    prompt:
      'The same mechanical robot squid as the second attachment, side view facing LEFT, but defeated: limp and tilted, tentacles sagging, thruster cannons dented and smoking, armour scorched and cracked, the eye dark, a few loose bolts and bubbles. Comedic, not grim.',
  },

  // ------------------------------------------------------------------ ghost galleon
  boss_galleon_src: {
    shape: 'portrait',
    refs: ['svg:boss_galleon', 'torpedo_boss'],
    layout: true,
    prompt:
      'A game boss sprite: a haunted ghost pirate galleon sailing underwater, side view facing LEFT (bow on the left), tall and narrow: a rotting dark wooden hull with glowing ghostly green portholes and two black cannons poking out of the LEFT side, tattered translucent pale-green ghostly sails on two masts, a small torn black pirate flag at the top, an eerie spectral glow and wisps around it. Leave the bottom of the stern plain (a rudder is added separately).',
  },
  boss_galleon_rudder: {
    shape: 'portrait',
    refs: ['boss_galleon_src'],
    refNote: 'this is the ghost ship; paint its rudder',
    prompt:
      'A game sprite part: just the RUDDER of the ghost ship in the reference, side view: a tall narrow rudder blade of old dark weathered wooden planks bound with rusty iron straps and hinges along its LEFT edge, slightly wider at the bottom. Same wood colour and rendering as the reference. Much taller than wide (about 1:2.5), nothing else in the image.',
  },
  boss_galleon_wreck: {
    shape: 'portrait',
    refs: ['svg:boss_galleon_death', 'boss_galleon_src'],
    layout: true,
    prompt:
      'The same haunted ghost pirate galleon as the second attachment, side view facing LEFT, but defeated: hull cracked open with planks splintered, masts snapped and sails in shreds, the ghostly glow fading and leaking away in wisps. Comedic, not grim.',
  },

  // ------------------------------------------------------------------ HUD meter
  boss_meter_src: {
    refs: ['svg:boss_meter', 'torpedo_boss'],
    layout: true,
    text: '"BOSS"',
    prompt:
      'A game HUD health-bar frame, front view, very wide (about 9.5:1): a riveted dark gunmetal plate with brass trim. On the left a round red enamel badge with a white skull and crossbones; in the middle a long EMPTY recessed channel that is plain dark, almost black (a red health fill is drawn into it); on the right the word "BOSS" in bold red letters with a dark outline.',
  },
  boss_meter_liquid: {
    refs: ['boss_meter_src'],
    prompt:
      'A plain horizontal bar of glossy glowing crimson-red liquid as it would look filling a game health bar: bright highlight along the top, darker red at the bottom, a faint inner glow, perfectly even along its length (no bubbles, no ends visible: it runs off both sides). Very wide and short (about 8:1). Nothing else in the image.',
  },

  // ------------------------------------------------------------------ abyss trophy card
  boss_trophy_card: {
    shape: 'portrait',
    refs: SUB,
    prompt:
      'A blank trophy card for a game stats screen, front view, flat on, portrait (about 6:7): a rounded rectangle of aged cream parchment with a thin brass border and small corner rivets. At the top a narrow dark-navy name strip (blank). Below it a large rectangular picture window showing an empty deep-blue underwater scene with soft light rays and a little sand at the bottom (no creatures or objects). Below the window a blank cream footer strip. No text anywhere.',
  },
};
