// Tutor keyboard layout: top-left of each
// glo_* key highlight over tutor_bg, and the finger overlay positions over hands.gif.

export const KEY_GLOW: Record<string, [number, number]> = {
  tilde: [36, 171], '1': [64, 171], '2': [91, 171], '3': [117, 171], '4': [141, 171], '5': [166, 171],
  '6': [190, 171], '7': [215, 171], '8': [237, 171], '9': [264, 171], '0': [289, 171], hyphen: [315, 171],
  plus: [342, 171],
  q: [67, 197], w: [94, 197], e: [122, 197], r: [148, 197], t: [174, 197], y: [198, 197], u: [223, 197],
  i: [248, 197], o: [274, 197], p: [300, 197], lbrace: [328, 197], rbrace: [356, 197], backslash: [383, 197],
  a: [75, 224], s: [104, 224], d: [133, 224], f: [160, 224], g: [188, 224], h: [213, 224], j: [238, 224],
  k: [265, 224], l: [292, 224], colon: [321, 224], apostrophe: [350, 224],
  z: [83, 252], x: [113, 252], c: [143, 252], v: [171, 252], b: [201, 252], n: [227, 252], m: [254, 252],
  comma: [283, 252], period: [310, 252], forslash: [341, 252],
  space: [119, 278], lshift: [20, 252], rshift: [372, 252],
};

/** Finger overlay top-left, index 0 (left pinky) .. 8 (right pinky). */
export const FINGER_POS: [number, number][] = [
  [26, 358], [53, 352], [88, 349], [135, 353], [248, 430], [255, 351], [291, 347], [334, 348], [374, 355],
];

/** Glow ring position per finger (fingers 6 and 7 are nudged right). */
export const RING_POS: [number, number][] = [
  [26, 358], [53, 352], [88, 349], [135, 353], [248, 430], [255, 351], [299, 347], [339, 348], [374, 355],
];

/** Finger per character (lower-cased char); -1 = none. */
export function fingerFor(raw: string): number {
  const c = raw.toLowerCase();
  if (c === '\n') return 8;
  if ('!1`aqz~'.includes(c)) return 0;
  if ('2@swx'.includes(c)) return 1;
  if ('#3cde'.includes(c)) return 2;
  if ('$%45^bfgrtv'.includes(c)) return 3;
  if (c === ' ') return 4;
  if ('&67hjmnuy'.includes(c)) return 5;
  if ('*,8<ik'.includes(c)) return 6;
  if ('(.9>lo'.includes(c)) return 7;
  if ('"\')+-/0:;=?[]p{}'.includes(c)) return 8;
  return -1; // quirk: _ \ | have no finger
}

/** glo_* key for a char (switch on the lower-cased char). */
export function keyFor(raw: string): string | null {
  const c = raw.toLowerCase();
  if (/[a-z0-9]/.test(c)) return c === '8' ? '9' : c; // quirk: 8 lights the glo_9 image
  const map: Record<string, string> = {
    '`': 'tilde', '~': 'tilde', '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '9',
    '(': '9', ')': '0', '-': 'hyphen', _: 'hyphen', '=': 'plus', '+': 'plus', '[': 'lbrace', '{': 'lbrace',
    ']': 'rbrace', '}': 'rbrace', '\\': 'backslash', '|': 'backslash', ';': 'colon', ':': 'colon',
    "'": 'apostrophe', '"': 'apostrophe', ',': 'comma', '<': 'comma', '.': 'period', '>': 'period',
    '/': 'forslash', '?': 'forslash', ' ': 'space',
  };
  return map[c] ?? null;
}

/** Shift side: right shift for left-hand chars, left shift otherwise, null if unshifted. */
export function shiftSide(c: string): 'rshift' | 'lshift' | null {
  if (!(/[A-Z]/.test(c) || '~!@#$%^&*()+<>:"?'.includes(c))) return null;
  return /[A-GQ-TV-XZ]/.test(c) || '!#$%@^~'.includes(c) ? 'rshift' : 'lshift';
}
