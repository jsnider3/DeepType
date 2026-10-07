// Tolerant parser for PopCap's pseudo-XML (configs, lessons).
//
// The shipped files are not well-formed: leaf values are padded with whitespace,
// abyss.xml closes leaves with the wrong tag (`<MinDiff> 4 </MaxDiff>`), lessons use
// numeric tag names (`<1>`), and flags are written as empty open/close pairs.
// Rules: an open tag followed by text and then any close tag is a leaf; an open tag
// followed directly by a close tag is an empty flag; otherwise it's a container and a
// close tag pops to the nearest open element with that name.

export interface PNode {
  tag: string;
  attrs: Record<string, string>;
  children: PNode[];
  text: string; // trimmed text content for leaves, '' otherwise
}

const ENTITIES: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(\w+);/g, (m, e) => ENTITIES[e] ?? m);
}

export function parsePXml(src: string): PNode {
  src = src.replace(/<!--[\s\S]*?-->/g, '');
  const tokens = src.split(/(<[^>]*>)/);
  const root: PNode = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack: PNode[] = [root];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok.startsWith('<')) continue;
    if (tok.startsWith('</')) {
      const name = tok.slice(2, -1).trim();
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tag === name) {
          stack.length = j;
          break;
        }
      }
      continue;
    }
    if (tok.startsWith('<?') || tok.startsWith('<!')) continue;

    const selfClosing = tok.endsWith('/>');
    const body = tok.slice(1, selfClosing ? -2 : -1).trim();
    const nameMatch = /^[^\s=]+/.exec(body);
    if (!nameMatch) continue;
    const node: PNode = { tag: nameMatch[0], attrs: {}, children: [], text: '' };
    for (const m of body.slice(nameMatch[0].length).matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) {
      node.attrs[m[1]] = m[2];
    }
    stack[stack.length - 1].children.push(node);
    if (selfClosing) continue;

    // Leaf or flag: next tag token is a close tag (of any name).
    const text = tokens[i + 1] ?? '';
    const next = tokens[i + 2] ?? '';
    if (next.startsWith('</')) {
      node.text = decodeEntities(text.trim());
      i += 2;
      continue;
    }
    stack.push(node);
  }
  return root;
}

export function child(n: PNode, tag: string): PNode | undefined {
  return n.children.find((c) => c.tag === tag);
}

export function childrenOf(n: PNode, tag: string): PNode[] {
  return n.children.filter((c) => c.tag === tag);
}
