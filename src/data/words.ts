// Word lists: twords.txt (#DIFF-n buckets, n = sum of key values), waves.txt
// (#LENGTH-n buckets), themes.txt (named #THEME ... #END groups).

export type Buckets = Map<number, string[]>;

function lines(src: string): string[] {
  return src.split(/\r\n|\r|\n/);
}

/** Parse a file of `#PREFIX-n` sections ending in `#END`. */
export function parseBuckets(src: string, prefix: string): Buckets {
  const out: Buckets = new Map();
  let cur: string[] | null = null;
  for (const raw of lines(src)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(`#${prefix}-`)) {
      cur = [];
      out.set(Number(line.slice(prefix.length + 2)), cur);
    } else if (line === '#END') {
      cur = null;
    } else if (cur && !line.startsWith('#')) {
      cur.push(line.toUpperCase());
    }
  }
  return out;
}

export interface Theme {
  name: string;
  words: string[];
}

export function parseThemes(src: string): Theme[] {
  const out: Theme[] = [];
  let lastName = '';
  let cur: Theme | null = null;
  for (const raw of lines(src)) {
    const line = raw.trim();
    if (line === '#THEME') {
      cur = { name: lastName, words: [] };
    } else if (line === '#END') {
      if (cur && cur.words.length) out.push(cur);
      cur = null;
    } else if (cur) {
      if (line) cur.words.push(line.toUpperCase());
    } else if (line) {
      lastName = line;
    }
  }
  return out;
}

export function parseNameList(src: string): string[] {
  return lines(src).map((l) => l.trim()).filter(Boolean);
}

/** Per-character value from the letter scoring table; twords #DIFF-n equals the sum. */
export function charValue(c: string): number {
  if ('ASDFGHJKLE'.includes(c)) return 1;
  if ('RTYUIMNVB'.includes(c)) return 2;
  if ('QZXCWPO0123456789'.includes(c)) return 3;
  return 4;
}

export function wordValue(w: string): number {
  let v = 0;
  for (const c of w.toUpperCase()) v += charValue(c);
  return v;
}
