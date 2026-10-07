// Remastered soundtrack: original songs for the synth sequencer in src/engine/synth.ts.
// tools/build-pack.mjs writes the default export to music/music.json. Keys are the original
// module's order positions (musicOrder(n)); values follow the Song format in synth.ts:
//   { bpm, stepsPerBeat, steps, loop, loopStart, tracks: [{ inst, vol, notes: [[step, midi, len, vel]] }] }
//
// One soundtrack, one hook: "B-E-G-B, A-G-F#" (rising minor arpeggio, stepping back down). The
// dive theme states it in E minor; danger/extreme/boss push it faster and darker; menus, map,
// treasure and the level-complete fanfare turn it major (D-G-B-D, C-B-A); game over sighs it
// downward.
//
// Authoring helpers below turn compact text into note lists. Each bar is a string of
// whitespace-separated tokens, one per step: a note name ("F#5") starts a note, "-" holds the
// previous note, "." is a rest. A trailing "!" accents a note, "?" softens it.

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

const QUALITY = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 14],
};

function parseChord(name) {
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  const q = QUALITY[m[2]];
  if (!q) throw new Error(`bad chord ${name}`);
  return { root: midi(`${m[1]}0`) % 12, iv: q };
}

/** Lowest MIDI note with pitch class `pc` at or above `lo`. */
const fromLow = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;

function tokens(bar, per, where) {
  const t = bar.trim().split(/\s+/);
  if (t.length !== per) throw new Error(`${where}: ${t.length} steps, expected ${per}: "${bar}"`);
  return t;
}

/** Chord in effect at a step: chords[bar] is a name or an array splitting the bar evenly. */
function chordAt(chords, bar, i, per) {
  const c = chords[bar % chords.length];
  if (typeof c === 'string') return parseChord(c);
  return parseChord(c[Math.floor((i * c.length) / per)]);
}

/** Generic token walker: `pick(token, bar, i)` returns a MIDI note, or null for hold/rest. */
function walk(bars, per, vel, where, pick, offset = 0) {
  const notes = [];
  let cur = null;
  bars.forEach((bar, b) => {
    tokens(bar, per, `${where} bar ${b + 1}`).forEach((tk, i) => {
      const step = (offset + b) * per + i;
      if (tk === '-') {
        if (cur) cur[2]++;
        return;
      }
      if (tk === '.') {
        cur = null;
        return;
      }
      let v = vel;
      if (tk.endsWith('!')) v = Math.min(1, vel * 1.25);
      if (tk.endsWith('?')) v = vel * 0.6;
      const name = tk.replace(/[!?]$/, '');
      cur = [step, pick(name, b, i), 1, round(v)];
      notes.push(cur);
    });
  });
  return notes;
}

const round = (v) => Math.round(v * 100) / 100;

/** Melody from note-name tokens. */
const mel = (bars, { per = 16, vel = 1, offset = 0, transpose = 0 } = {}) =>
  walk(bars, per, vel, 'melody', (n) => midi(n) + transpose, offset);

/**
 * Bass from chord-relative tokens: R root, 3 third, 5 fifth, 7 seventh, 8 octave, or a note
 * name. Roots sit between D2 and C#3.
 */
function bass(chords, pattern, { per = 16, vel = 1, lo = 38 } = {}) {
  const bars = chords.map((_, b) => (Array.isArray(pattern) ? pattern[b % pattern.length] : pattern));
  return walk(bars, per, vel, 'bass', (tk, b, i) => {
    if (/^[A-G]/.test(tk)) return midi(tk);
    const c = chordAt(chords, b, i, per);
    const r = fromLow(c.root, lo);
    const iv = { R: 0, 3: c.iv[1], 5: 7, 7: c.iv[3] ?? 10, 8: 12 }[tk];
    if (iv === undefined) throw new Error(`bad bass token ${tk}`);
    return r + iv;
  });
}

/** Arpeggio: digit k = k-th chord tone upward from the root near `lo` (wrapping octaves). */
function arp(chords, pattern, { per = 16, vel = 1, lo = 60 } = {}) {
  const bars = chords.map((_, b) => (Array.isArray(pattern) ? pattern[b % pattern.length] : pattern));
  return walk(bars, per, vel, 'arp', (tk, b, i) => {
    const c = chordAt(chords, b, i, per);
    const k = Number(tk) - 1;
    if (!(k >= 0)) throw new Error(`bad arp token ${tk}`);
    const tones = c.iv.filter((x) => x < 12);
    return fromLow(c.root, lo) + tones[k % tones.length] + 12 * Math.floor(k / tones.length);
  });
}

/** Sustained chords: "X" starts the chord in effect, "-" holds, "." rests. Voiced from `lo`. */
function pad(chords, pattern = null, { per = 16, vel = 1, lo = 52 } = {}) {
  const pat = pattern ?? ['X', ...Array(per - 1).fill('-')].join(' ');
  const notes = [];
  chords.forEach((_, b) => {
    const toks = tokens(Array.isArray(pat) ? pat[b % pat.length] : pat, per, `pad bar ${b + 1}`);
    let cur = [];
    toks.forEach((tk, i) => {
      const step = b * per + i;
      if (tk === '-') return cur.forEach((n) => n[2]++);
      cur = [];
      if (tk === '.') return;
      const c = chordAt(chords, b, i, per);
      const r = fromLow(c.root, lo);
      for (const iv of c.iv) {
        const n = [step, r + iv, 1, vel];
        cur.push(n);
        notes.push(n);
      }
    });
  });
  return notes;
}

const DR = { k: 36, r: 37, s: 38, sh: 39, h: 42, tl: 45, o: 46, c: 49, th: 50 };
const DVEL = { X: 1, x: 0.7, ',': 0.4 };

/**
 * Drums: { k: kick, s: snare, h: hat, o: open hat, c: crash, r: rim, sh: shaker, tl/th: toms },
 * each a per-step character string (X loud, x medium, "," soft, "." rest), one bar, or an
 * array of bars cycled over `bars`.
 */
function drums(lines, bars, { per = 16, vel = 1 } = {}) {
  const notes = [];
  for (const [k, line] of Object.entries(lines)) {
    for (let b = 0; b < bars; b++) {
      const s = Array.isArray(line) ? line[b % line.length] : line;
      if (s.length !== per) throw new Error(`drums ${k} bar ${b + 1}: ${s.length} != ${per}`);
      [...s].forEach((ch, i) => {
        if (DVEL[ch]) notes.push([b * per + i, DR[k], 1, round(DVEL[ch] * vel)]);
      });
    }
  }
  return notes.sort((a, b) => a[0] - b[0]);
}

const shift = (notes, steps) => notes.map(([s, p, l, v]) => [s + steps, p, l, v]);
const cat = (...parts) => parts.flat();
const repeat = (arr, n) => Array.from({ length: n }, () => arr).flat();

function song({ title, bpm, spb = 4, bars, loop = true, loopStartBar = 0, tracks }) {
  const per = spb * 4;
  return {
    title,
    bpm,
    stepsPerBeat: spb,
    steps: bars * per,
    loop,
    loopStart: loopStartBar * per,
    tracks: Object.entries(tracks)
      .filter(([, t]) => t.notes.length)
      .map(([, t]) => ({ inst: t.inst, vol: t.vol ?? 1, notes: t.notes })),
  };
}

// ================================================================== 0: dive (E minor, 124)

function dive() {
  const A = ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'];
  const B = ['C', 'D', 'G', 'Em', 'C', 'D7', 'B7', 'B7'];
  const chords = [...A, ...B];
  const lead = mel([
    'B4 - E5 - G5 - B5 - - - A5 - G5 - F#5 -',
    'G5 - - - E5 - - - . . E5 - G5 - E5 -',
    'D5 - - - B4 - D5 - G5 - - - F#5 - G5 -',
    'A5 - - - F#5 - - - D5 - E5 - F#5 - A5 -',
    'B4 - E5 - G5 - B5 - - - A5 - G5 - F#5 -',
    'G5 - - - E5 - G5 - C6 - - - B5 - G5 -',
    'A5 - - - E5 - A5 - C6 - B5 - A5 - G5 -',
    'F#5 - - - D#5 - - - B4 - - - . . . .',
    'G5 - - - - - E5 - - - G5 - - - C6 -',
    'B5 - A5 - - - F#5 - - - D5 - - - A5 -',
    'B5 - - - - - G5 - - - D5 - - - G5 -',
    'F#5 - E5 - - - - - . . . . B4 - E5 -',
    'G5 - - - - - E5 - - - G5 - - - C6 -',
    'A5 - B5 - C6 - - - B5 - A5 - F#5 - D5 -',
    'D#5 - - - F#5 - - - B5 - - - A5 - - -',
    'F#5 - - - - - - - D#5 - - - B4 - - -',
  ]);
  const bassA = 'R - . R - . R - 8 . R . 5 - R .';
  const bassB = 'R . R . R . R . R . R . 5 . 8 .';
  return song({
    title: 'Into the Blue',
    bpm: 124,
    bars: 16,
    tracks: {
      lead: { inst: 'lead', notes: lead },
      bass: { inst: 'bass', notes: bass(chords, [...repeat([bassA], 8), ...repeat([bassB], 8)]) },
      pad: { inst: 'pad', vol: 0.8, notes: pad(chords) },
      bellA: { inst: 'bell', vol: 0.7, notes: arp(A, '. . 1 . . . 2 . . . 3 . . . 2 .', { lo: 64 }) },
      arpB: { inst: 'arp', vol: 0.8, notes: shift(arp(B, '1 2 3 4 3 2 1 2 1 2 3 4 5 4 3 2', { lo: 60 }), 128) },
      drums: {
        inst: 'drums',
        notes: drums(
          {
            k: 'X.....X...X.....',
            s: ['....X.......X...', '....X.......X...', '....X.......X...', '....X.......X.xx',
                '....X.......X...', '....X.......X...', '....X.......X...', '....X.......XxXX'],
            h: ',.x.,.x.,.x.,.x.',
            o: ['................', '................', '................', '..............x.'],
            c: ['X...............', '................', '................', '................',
                '................', '................', '................', '................'],
          },
          16,
        ),
      },
    },
  });
}

// ================================================================== 0x25: danger (E minor, 140)

function danger() {
  const chords = ['Em', 'Em', 'C', 'C', 'Em', 'Em', 'D7', 'B7'];
  const lead = mel([
    'B4 - E5 - G5 - B5 - - - . . . . . .',
    'A5 - G5 - F#5 - E5 - - - . . B4 - . .',
    'C5 - E5 - G5 - C6 - - - . . . . . .',
    'B5 - A5 - G5 - E5 - - - . . . . . .',
    'B4 - E5 - G5 - B5 - - - . . E6 - . .',
    'D6 - B5 - G5 - E5 - - - . . . . . .',
    'F#5 - A5 - D6 - - - C6 - - - A5 - - -',
    'B5 - - - A5 - - - F#5 - - - D#5 - - -',
  ], { vel: 0.9 });
  // Ticking semitone ostinato: the tension engine of the danger cues.
  const tE = 'B5 C6 B5 . B5 C6 B5 . B5 C6 B5 . B5 C6 B5 .';
  const tC = 'C6 D6 C6 . C6 D6 C6 . C6 D6 C6 . C6 D6 C6 .';
  const tick = mel([tE, tE, tC, tC, tE, tE,
    'A5 B5 A5 . A5 B5 A5 . A5 B5 A5 . A5 B5 A5 .',
    'B5 C6 B5 . A5 B5 A5 . F#5 G5 F#5 . D#5 E5 D#5 .'], { vel: 0.7 });
  return song({
    title: 'Something Big',
    bpm: 140,
    bars: 8,
    tracks: {
      lead: { inst: 'lead', notes: lead },
      tick: { inst: 'arp', vol: 1, notes: tick },
      bass: { inst: 'bass', notes: bass(chords, 'R . 8 . R . 8 . R . 8 . R . 8 .') },
      pad: { inst: 'pad', vol: 0.9, notes: pad(chords, 'X - - - - - - - X - - - - - - -') },
      drums: {
        inst: 'drums',
        notes: drums(
          {
            k: 'X...X...X...X...',
            s: ['....X.......X...', '....X.......X...', '....X.......X...', '....X.......X.XX'],
            h: 'x,x,x,x,x,x,x,x,',
            c: ['X...............', '................', '................', '................',
                '................', '................', '................', '................'],
          },
          8,
        ),
      },
    },
  });
}

// ================================================================== 0x2b: extreme danger (E phrygian, 156)

function extreme() {
  const chords = ['Em', 'F', 'Em', 'F', 'C', 'B7', 'Em', 'F'];
  const lead = mel([
    'E6 - - - B5 - - - E6 - - - B5 - - -',
    'F6 - - - C6 - - - F6 - - - C6 - - -',
    'E6 - G6 - F#6 - E6 - B5 - - - G5 - - -',
    'A5 - C6 - F6 - - - C6 - - - A5 - - -',
    'G5 - C6 - E6 - - - G6 - - - E6 - - -',
    'F#6 - - - D#6 - - - B5 - - - A5 - - -',
    'G5 - B5 - E6 - - - B5 - G5 - E5 - - -',
    'F5 - A5 - C6 - - - F6 - - - E6 - - -',
  ], { vel: 0.85 });
  return song({
    title: 'Teeth!',
    bpm: 156,
    bars: 8,
    tracks: {
      lead: { inst: 'lead', notes: lead },
      arp: { inst: 'arp', vol: 0.7, notes: arp(chords, '1 2 3 2 1 2 3 2 1 2 3 2 1 2 3 2', { lo: 64 }) },
      bass: { inst: 'bass', notes: bass(chords, 'R R 8 R R R 8 R R R 8 R 5 R 8 R', { vel: 0.85 }) },
      pad: { inst: 'pad', vol: 0.8, notes: pad(chords) },
      drums: {
        inst: 'drums',
        notes: drums(
          {
            k: 'X..xX...X..xX...',
            s: ['....X..,....X...', '....X..,....X.XX'],
            h: 'xxXxxxXxxxXxxxXx',
            c: ['X...............', '................', '................', '................'],
          },
          8,
        ),
      },
    },
  });
}

// ================================================================== 0x30: boss (E minor, 132)

function boss() {
  const riff = (t) => mel(['E2 - E2 E2 G2 - E2 - Bb2 - A2 - G2 - D2 -'], { transpose: t });
  const turn = mel(['B2 - B2 B2 D#3 - B2 - F#3 - F#3 - A2 - A2 -']);
  const plan = [0, 0, 0, 'turn', 0, 0, -4, 'turn', 5, 5, 0, 0, -4, -2, 'turn', 'turn'];
  const bassNotes = plan.flatMap((p, b) => shift(p === 'turn' ? turn : riff(p), b * 16));
  const chords = ['Em', 'Em', 'Em', 'B', 'Em', 'Em', 'C', 'B', 'Am', 'Am', 'Em', 'Em', 'C', 'D7', 'B', 'B7'];
  const lead = mel([
    'E5 - - - - - - - B4 - - - E5 - G5 -',
    'F#5 - - - - - - - E5 - D5 - E5 - - -',
    'G5 - - - - - - - F#5 - - - E5 - G5 -',
    'B5 - - - - - - - A5 - - - F#5 - D#5 -',
    'E5 - - - - - - - B4 - - - E5 - G5 -',
    'B5 - - - - - - - A5 - G5 - F#5 - E5 -',
    'G5 - - - - - E5 - G5 - - - C6 - - -',
    'B5 - - - - - - - - - - - . . . .',
    'A5 - - - C6 - - - E6 - - - D6 - C6 -',
    'B5 - - - - - - - A5 - - - E5 - - -',
    'G5 - - - B5 - - - E6 - - - D6 - B5 -',
    'G5 - - - - - - - . . . . E5 - G5 -',
    'A5 - - - G5 - - - E5 - - - G5 - - -',
    'F#5 - - - A5 - - - D6 - - - C6 - - -',
    'B5 - - - D#6 - - - F#6 - - - - - - -',
    'F#6 - - - D#6 - - - B5 - - - A5 - F#5 -',
  ]);
  return song({
    title: 'Jaws of the Deep',
    bpm: 132,
    bars: 16,
    tracks: {
      lead: { inst: 'lead', notes: lead },
      bass: { inst: 'bass', notes: bassNotes },
      pad: { inst: 'pad', vol: 0.9, notes: pad(chords) },
      bell: { inst: 'bell', vol: 0.45, notes: arp(chords, '1 . 3 . 2 . 3 . 1 . 3 . 2 . 3 .', { lo: 64 }) },
      drums: {
        inst: 'drums',
        notes: drums(
          {
            k: 'X.....X.X.....x.',
            s: ['....X.......X...', '....X.......X...', '....X.......X...', '....X.......X...',
                '....X.......X...', '....X.......X...', '....X.......X...', '....X...X.X.XXXX'],
            h: 'x.x.x.x.x.x.x.x.',
            tl: ['................', '................', '................', '................',
                 '................', '................', '................', '.............x..'],
            th: ['................', '................', '................', '................',
                 '................', '................', '................', '............x...'],
            c: ['X...............', ...repeat(['................'], 7)],
          },
          16,
        ),
      },
    },
  });
}

// ================================================================== 0x11: menus (G major, 96)

function menus() {
  const chords = ['G', 'Bm', 'Cmaj7', 'D', 'G', 'Bm', 'Cmaj7', 'D', 'Em', 'C', 'G', 'D7', 'Em', 'C', 'Am', 'D'];
  const tune = mel([
    'D5 - G5 - B5 - D6 - - - C6 - B5 - A5 -',
    'B5 - - - F#5 - - - D5 - - - F#5 - - -',
    'E5 - G5 - C6 - - - B5 - - - G5 - - -',
    'A5 - - - - - - - F#5 - - - . . . .',
    'D5 - G5 - B5 - D6 - - - C6 - B5 - A5 -',
    'B5 - - - D6 - - - F#6 - - - E6 - D6 -',
    'E6 - - - D6 - C6 - B5 - - - G5 - A5 -',
    'A5 - - - - - - - - - - - . . . .',
    'G5 - - - - - B5 - - - E5 - - - - -',
    'G5 - - - - - E5 - - - C5 - - - - -',
    'D5 - - - G5 - - - B5 - - - D6 - - -',
    'C6 - - - A5 - - - F#5 - - - A5 - - -',
    'G5 - - - - - B5 - - - E6 - - - D6 -',
    'E6 - - - - - C6 - - - G5 - - - - -',
    'A5 - - - C6 - - - E6 - - - D6 - C6 -',
    'A5 - - - F#5 - - - E5 - - - F#5 - - -',
  ]);
  return song({
    title: 'Harbour Lights',
    bpm: 96,
    bars: 16,
    tracks: {
      tune: { inst: 'bell', vol: 1, notes: tune },
      echo: { inst: 'lead', vol: 0.35, notes: tune.filter((n) => n[2] >= 4) },
      bass: { inst: 'bass', vol: 0.8, notes: bass(chords, 'R - - - - - - - 5 - - - - - 8 -') },
      pad: { inst: 'pad', vol: 0.9, notes: pad(chords) },
      arp: { inst: 'arp', vol: 0.6, notes: arp(chords, '1 . 2 . 3 . 2 . 1 . 2 . 3 . 4 .', { lo: 55 }) },
      drums: {
        inst: 'drums',
        notes: drums({ k: 'x.......,.......', r: '....,.......,...', sh: ',.x.,.x.,.x.,.x.' }, 16, { vel: 0.8 }),
      },
    },
  });
}

// ================================================================== 0x14: map travel (G major, lilting 12/8, 104)

function map() {
  const per = 12;
  const chords = ['G', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'];
  const tune = mel([
    'D5 - G5 B5 - - D6 - - B5 - -',
    'C6 - - G5 - - E5 - - G5 - -',
    'B5 - - D6 - - G5 - - B5 - -',
    'A5 - - - - - F#5 - - D5 - -',
    'E5 - G5 B5 - - E6 - - D6 - -',
    'C6 - - E6 - - G5 - - E5 - -',
    'F#5 - - A5 - - D6 - - A5 - -',
    'B5 - - - - - - - - . . .',
  ], { per, vel: 0.9 });
  return song({
    title: 'Fair Winds',
    bpm: 104,
    spb: 3,
    bars: 8,
    tracks: {
      tune: { inst: 'lead', vol: 0.8, notes: tune },
      bell: { inst: 'bell', vol: 0.5, notes: tune },
      bass: { inst: 'bass', vol: 0.85, notes: bass(chords, 'R - - . . . 5 - - . . 8', { per }) },
      pad: { inst: 'pad', vol: 0.8, notes: pad(chords, null, { per }) },
      arp: { inst: 'arp', vol: 0.5, notes: arp(chords, '1 . 2 3 . 2 1 . 2 3 . 2', { per, lo: 60 }) },
      drums: { inst: 'drums', notes: drums({ k: 'x.....,.....', r: '...,.....,..', sh: 'x,,x,,x,,x,,' }, 8, { per, vel: 0.8 }) },
    },
  });
}

// ================================================================== 0x22: air refill -> treasure (G major, 140)

function airRefill() {
  // Two-bar build (~3.4 s): climbing arpeggio, snare roll, then the treasure loop.
  const intro = mel([
    'D4 G4 A4 D5 G4 A4 D5 G5 A4 D5 G5 A5 D5 G5 A5 D6',
    'D5 F#5 A5 D6 F#5 A5 D6 F#6 A5 D6 F#6 A6 D6 - - -',
  ], { vel: 0.8 });
  const introBass = mel(['D3 . D3 . D3 . D3 . D3 . D3 . D3 . D3 .', 'D3 D3 D3 D3 D3 D3 D3 D3 D3 D3 D3 D3 D2 - - -'], { vel: 0.8 });
  const introPad = pad(['Dsus4', 'D'], null);
  const introDrums = drums({ s: [',.,.,.,.x.x.x.x.', 'x,x,xxxxXxXxXXXX'], k: ['X.......X.......', 'X...X...X...X...'] }, 2);

  const chords = ['G', 'Bm', 'Em', 'C', 'G', 'Bm', 'Am', 'D'];
  const tune = mel([
    'G5 - B5 - D6 - - - B5 - D6 - G6 - - -',
    'F#6 - - - D6 - - - B5 - - - D6 - - -',
    'E6 - - - B5 - G5 - E5 - G5 - B5 - - -',
    'C6 - - - - - E6 - - - D6 - C6 - - -',
    'G5 - B5 - D6 - - - B5 - D6 - G6 - - -',
    'F#6 - - - A6 - - - F#6 - - - D6 - - -',
    'E6 - - - C6 - - - A5 - - - C6 - E6 -',
    'D6 - - - - - - - A5 - - - F#5 - - -',
  ]);
  const o = 32; // intro steps
  return song({
    title: 'Pieces of Eight',
    bpm: 140,
    bars: 10,
    loopStartBar: 2,
    tracks: {
      intro: { inst: 'arp', vol: 0.9, notes: intro },
      tune: { inst: 'lead', vol: 0.85, notes: shift(tune, o) },
      bell: { inst: 'bell', vol: 0.55, notes: shift(arp(chords, '1 2 3 4 1 2 3 4 1 2 3 4 1 2 3 4', { lo: 72 }), o) },
      bass: { inst: 'bass', notes: cat(introBass, shift(bass(chords, 'R . 8 . R . 8 . R . 8 . R . 8 .'), o)) },
      pad: { inst: 'pad', vol: 0.8, notes: cat(introPad, shift(pad(chords), o)) },
      drums: {
        inst: 'drums',
        notes: cat(
          introDrums,
          shift(
            drums(
              {
                k: 'X...X...X...X...',
                s: '....X.......X...',
                h: 'x.,.x.,.x.,.x.,.',
                o: '..x...x...x...x.',
                c: ['X...............', ...repeat(['................'], 7)],
              },
              8,
            ),
            o,
          ),
        ),
      },
    },
  });
}

// ================================================================== 0x2e: level complete (G major, 120)

function levelComplete() {
  // Two-bar fanfare (IV-V-I), then a gentle pad that loops until the next cue.
  const fanfare = mel([
    'E5 - G5 - C6 - - - F#5 - A5 - D6 - - -',
    'B5 - D6 - G6 - - - - - - - - - - -',
  ]);
  const chords = [['C', 'D'], 'G', 'Gmaj7', 'Cmaj7', 'Gmaj7', 'Cmaj7'];
  const glow = mel([
    '. . . . . . . . D6 - - - B5 - - -',
    '. . . . . . . . E6 - - - G5 - - -',
    '. . . . . . . . D6 - - - B5 - - -',
    '. . . . . . . . E6 - - - B5 - - -',
  ], { vel: 0.5, offset: 2 });
  return song({
    title: 'Treasure Found',
    bpm: 120,
    bars: 6,
    loopStartBar: 2,
    tracks: {
      lead: { inst: 'lead', notes: fanfare },
      bell: { inst: 'bell', vol: 0.7, notes: cat(fanfare, glow) },
      bass: { inst: 'bass', notes: mel(['C3 - - - - - - - D3 - - - - - - -', 'G2 - - - - - - - - - - - - - - -']) },
      pad: { inst: 'pad', notes: pad(chords, ['X - - - - - - - X - - - - - - -', 'X - - - - - - - - - - - - - - -'], { vel: 1 }).map((n) => (n[0] >= 32 ? [n[0], n[1], n[2], 0.8] : n)) },
      drums: { inst: 'drums', notes: drums({ s: ['x.x.x.x.xxxxXXXX', '................'], k: ['X.......X.......', 'X...............'], c: ['................', 'X...............'] }, 2) },
    },
  });
}

// ================================================================== 0x1e: game over (E minor, 96, once)

function gameOver() {
  const tune = mel([
    'C6 - - - B5 - - - A5 - - - E5 - - -',
    'F#5 - - - D#5 - - - B4 - - - - - - -',
    'E5 - - - - - - - . . . . . . . .',
  ], { vel: 0.8 });
  const chords = ['Am', 'B7', 'Em'];
  const song1 = song({
    title: 'Down Among the Fishes',
    bpm: 96,
    bars: 3,
    loop: false,
    tracks: {
      lead: { inst: 'lead', vol: 0.8, notes: tune },
      bell: { inst: 'bell', vol: 0.6, notes: tune },
      bass: { inst: 'bass', vol: 0.8, notes: bass(chords, ['R - - - - - - - - - - - - - - -', 'R - - - - - - - - - - - - - - -', 'R - - - - - - - . . . . . . . .']) },
      pad: { inst: 'pad', notes: pad(chords, ['X - - - - - - - - - - - - - - -', 'X - - - - - - - - - - - - - - -', 'X - - - - - - - . . . . . . . .']) },
    },
  });
  song1.steps = 40; // stop scheduling once the last chord has been struck and released
  return song1;
}

export default {
  [0x00]: dive(),
  [0x11]: menus(),
  [0x14]: map(),
  [0x1e]: gameOver(),
  [0x22]: airRefill(),
  [0x25]: danger(),
  [0x2b]: extreme(),
  [0x2e]: levelComplete(),
  [0x30]: boss(),
};
