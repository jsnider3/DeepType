// UI sources: dialog frame, dialog buttons, edit box, checkbox, slider, cursors, the title
// screen's continue button, medals, the statistics screen's panels/tabs and the Hall of
// Fame. All in the nautical language of the approved main menu: varnished wood, polished
// brass with rivets, glossy enamel, cream parchment. packs/remastered/raster/ui.mjs cuts
// and fits them (most are nine-sliced in game, so prompts ask for plain, even middles).

const UI = ["btn_adventure", "menu_plaque"];
const PLAIN =
  "Keep the long middle stretch completely plain and even (no rivets, marks or ornaments there); all decoration stays near the ends and corners.";

export default {
  // ------------------------------------------------------------------ dialogs
  // Nine-sliced 30/64/30/24 in game, so it is repainted onto our SVG layout (thin rim,
  // nameplate reaching right to the rim) with every ornament inside the corners.
  ui_dialog: {
    shape: "square",
    layout: true,
    refs: ["svg:dialog", "menu_plaque", "btn_adventure"],
    refNote:
      "the other attachments are the signboard and a button from our main menu; match their wood, brass and enamel exactly",
    prompt:
      "A blank square dialog window for a game, front view, flat on, filling the whole image exactly like the layout guide. Repaint the guide's blue outer rim as a THIN frame of varnished warm-brown wood with a slim polished brass edge, with a small brass corner cap and one small rivet tucked right into each of the four corners (keep them small, inside the rounded corners). Repaint the guide's yellow bar as a smooth polished golden-brass nameplate, exactly the same size and position (its rounded ends nearly touching the rim, its two tiny screw heads right at the ends, as in the guide); it must be light enough that black text printed on it reads clearly. Repaint the grey body as smooth, light cream parchment (very light, nearly plain, the faintest paper texture). Apart from the four corners and the two plate ends, every edge is plain and even (no rivets, knots or marks along the sides). Everything is blank.",
  },
  ui_button: {
    refs: ["btn_adventure", "ui_dialog"],
    refNote: "same brass and enamel as our menu button and dialog",
    prompt:
      "A blank rectangular game dialog button, front view, flat on, very wide and short (about 4:1), centred with margin: a slim polished brass frame with a tiny rivet at each end, and a glossy warm amber-orange enamel face (a medium tone, not too light and not too dark, so that both black and white text read on it) with a soft glossy highlight along the top. No icon. The long middle is completely plain and even; only the ends have rivets. Completely blank.",
  },
  ui_button_hi: {
    refs: ["ui_button"],
    refNote: "this is the same button",
    prompt:
      "The exact same button as the reference, same shape, size, proportions, brass frame and rivets, but its enamel face is a glossy bright emerald sea-green (medium tone, white text reads on it) with a slightly stronger glossy highlight, as if lit up. Completely blank.",
  },
  // A white text field is drawn over all but a 4 px rim, so the bezel is a near-square
  // rectangle (round ends would show under the field's corners).
  ui_editbox: {
    refs: ["ui_button"],
    refNote: "same brass as this button",
    prompt:
      "A blank text-entry box for a game, front view, flat on, very wide and short (about 5:1), centred with margin: a RECTANGULAR polished brass bezel frame with only very slightly rounded corners (nearly square corners, not rounded ends), the frame thin (about an eighth of the height on each side), and inside it a flat recessed dark navy rectangle. Plain and even all along; no rivets or screws anywhere. Completely blank.",
  },
  ui_checkboxes: {
    refs: ["ui_button"],
    refNote: "same brass and enamel style",
    prompt:
      "Two small square game checkboxes side by side with a wide gap between them, front view: each is a chunky square with rounded corners, a polished brass rim, and a light cream enamel inset. The LEFT one is empty. The RIGHT one is identical but holds a big bold glossy green tick mark with a dark outline, slightly overflowing the box at the top right.",
  },
  ui_slider: {
    refs: ["ui_button"],
    refNote: "same brass style",
    prompt:
      "A very long thin horizontal slider track for a game volume control, front view (about 16:1, spanning most of the image width, centred): a narrow recessed groove of dark navy enamel framed by a slim polished brass rim with rounded ends, a small rivet at each end. Plain and even all along the middle. Nothing else in the image.",
  },
  ui_knob: {
    shape: "square",
    refs: ["ui_button"],
    refNote: "same brass and enamel style",
    prompt:
      "A round slider knob for a game, front view, filling most of the image: a chunky polished brass disc with a raised rim and a glossy sea-blue enamel centre with a bright highlight, like a little porthole button. Bold and simple so it reads at very small sizes.",
  },

  // ------------------------------------------------------------------ cursors + icon
  ui_cursor: {
    shape: "square",
    refs: ["ui_knob"],
    refNote: "same brass style",
    prompt:
      "A game mouse cursor: a classic arrow pointer, tip at the top-left, pointing up-left, the standard cursor shape with a short tail at the lower right. Polished golden brass with a bright highlight, a bold dark navy outline all around (thick, so it reads at very small sizes). Simple, bold and clean. The arrow fills most of the image.",
  },
  ui_pointer: {
    shape: "square",
    refs: ["ui_cursor"],
    refNote: "same cursor style",
    prompt:
      "A game mouse cursor: a cartoon hand in a white glove with a yellow cuff, pointing STRAIGHT UP with the index finger (the fingertip at the very top, slightly left of centre), other fingers curled, thumb tucked. Bold dark navy outline all around, thick so it reads at very small sizes. Simple, bold and clean. Fills most of the image.",
  },
  ui_favicon: {
    shape: "square",
    refs: ["loadbar"],
    refNote: "the porthole badge on the right end of this bar is our emblem",
    prompt:
      "An app icon: a round polished brass porthole badge with chunky rivets, through its glass a bold dark shark fin cutting through a bright blue cresting wave. Very bold, simple shapes and strong contrast so it reads at 16 pixels. Fills the image.",
  },

  // ------------------------------------------------------------------ title screen
  ui_continue: {
    refs: ["loadbar", "btn_adventure"],
    refNote:
      "this loading bar and button sit right above it; match their brass and enamel",
    text: '"CLICK HERE TO CONTINUE"',
    prompt:
      'An extremely long, short game button, front view (about 9:1, spanning most of the image width), centred: a slim polished brass frame with rounded ends and a rivet at each end, a glossy deep sea-blue enamel face, and the words "CLICK HERE TO CONTINUE" on one line in bold white capital letters with a dark outline, filling most of the height of the face. The words take only the middle 70% of the button\'s length; the enamel on either side of them, between the words and the rivets, is plain and empty.',
  },

  // ------------------------------------------------------------------ medals
  ui_medal_gold: {
    shape: "portrait",
    refs: ["btn_adventure"],
    refNote: "match this brass, enamel and rendering",
    prompt:
      "A gold award medal hanging from a short ribbon, front view: at the top a short V-shaped folded ribbon in sea-blue with a golden stripe, below it a big round shiny gold medal with a raised rim, embossed with a shark fin cutting through a wave. Gleaming highlights. The ribbon takes the top third, the medal disc the bottom two thirds.",
  },
  ui_medal_silver: {
    shape: "portrait",
    refs: ["ui_medal_gold"],
    refNote: "this is the gold medal of the same set",
    prompt:
      "The exact same medal and ribbon as the reference, same shape, size, pose and design, but the medal is polished SILVER instead of gold (cool white-grey metal), and the ribbon is the same sea-blue with a silver stripe.",
  },
  ui_medal_bronze: {
    shape: "portrait",
    refs: ["ui_medal_gold"],
    refNote: "this is the gold medal of the same set",
    prompt:
      "The exact same medal and ribbon as the reference, same shape, size, pose and design, but the medal is polished BRONZE instead of gold (warm coppery brown metal), and the ribbon is the same sea-blue with a bronze-orange stripe.",
  },

  // ------------------------------------------------------------------ statistics screen
  ui_panel: {
    refs: ["ui_dialog", "menu_plaque"],
    refNote: "same wood, brass and parchment as these",
    prompt: `A large blank notice board for a game's statistics screen, front view, flat on, filling almost the whole image: a thin frame of varnished wooden planks with slim polished brass trim and brass corner brackets with rivets, around one big smooth light cream parchment panel (very light, nearly plain, faint paper texture) where dark text is printed. ${PLAIN} Completely blank.`,
  },
  ui_paper: {
    shape: "square",
    refs: ["ui_panel"],
    refNote: "this board; the sheet is pinned onto it",
    prompt:
      "A blank sheet of clean white paper for drawing a chart, front view, flat on, filling almost the whole image (slightly wider than tall): crisp near-white paper with a very slim polished brass edging and a tiny brass rivet at each corner. Completely plain and blank.",
  },
  ui_question: {
    shape: "portrait",
    refs: ["ui_knob"],
    refNote: "same brass style",
    text: '"?"',
    prompt:
      'A single big bold question mark "?" in polished brass with a thick dark navy outline and a bright highlight, filling the image. Nothing else.',
  },
  ui_tab: {
    refs: ["ui_panel"],
    refNote: "the tab sits on top of this board and uses the same materials",
    prompt:
      "A blank file-folder tab for a game screen, front view, very wide and short (about 4:1), centred with margin: rounded upper corners, flat bottom edge (open at the bottom where it joins a board below), a frame of varnished wood with slim polished brass trim along the top and sides, and a light cream parchment face. Plain and even across the middle. Completely blank.",
  },
  ui_radio: {
    refs: ["ui_button"],
    refNote: "same brass and enamel as this button",
    prompt:
      "A blank wide game option button, front view (about 5:1), centred with margin: slim polished brass frame with rounded ends, a light golden-cream enamel face with a soft glossy highlight, and near the LEFT end a small round indicator lamp set in a brass bezel, glowing bright green (switched on). Plain and even across the middle. No text.",
  },
  ui_radio_off: {
    refs: ["ui_radio"],
    refNote: "this is the same button switched on",
    prompt:
      "The exact same button as the reference, same shape, size and proportions, but switched off: the round lamp on the left is dark and unlit (dark glass), and the enamel face is a duller, slightly greyer pale beige. No text.",
  },

  // ------------------------------------------------------------------ hall of fame
  hall_scene: {
    opaque: true,
    refs: ["title_scene", "menu_scene"],
    refNote: "scenes from our game; keep the same painting style",
    prompt:
      "Background for a game's hall-of-fame screen: a sunken treasure vault on the sea floor, softly lit by god rays from above. Old stone pillars at the far left and far right edges, heaps of gold coins, a couple of trophies and treasure chests along the bottom edge, kelp and bubbles. The large middle of the picture is calm, slightly darker blue water with little detail (big score boards cover it). Deep blues and teals with warm gold accents.",
  },
  hall_title: {
    refs: ["btn_adventure", "menu_plaque"],
    refNote: "match this brass, wood and lettering",
    text: '"HALL OF FAME"',
    prompt:
      'A wide game title sign, front view (about 5:1), centred with margin: a varnished wooden plank sign with a polished brass frame, rivets, and a small brass trophy cup emblem at each end; across the middle the words "HALL OF FAME" in big bold golden-yellow letters with a thick dark outline and a glossy highlight.',
  },
  hall_board: {
    shape: "square",
    refs: ["ui_panel", "btn_adventure"],
    refNote: "same wood, brass, parchment and enamel",
    prompt: `A blank high-score board for a game, front view, flat on, filling almost the whole image (slightly wider than tall): a thin varnished wooden frame with slim polished brass trim and brass corner brackets with rivets; inside, across the top, a horizontal glossy enamel title band in deep sea blue taking the top 13% (white text goes on it), and below it the rest is one smooth light cream parchment panel (nearly plain) where dark text is printed. ${PLAIN} Completely blank.`,
  },
};
