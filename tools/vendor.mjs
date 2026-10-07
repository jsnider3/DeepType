// Copies runtime files that must be served as-is (AudioWorklet modules resolve
// sibling files relative to their own URL, which bundling would break).
import { cpSync, mkdirSync } from 'node:fs';

const dest = 'public/vendor/chiptune3';
mkdirSync(dest, { recursive: true });
for (const f of ['chiptune3.js', 'chiptune3.worklet.js', 'libopenmpt.worklet.js', 'LICENSE']) {
  cpSync(`node_modules/chiptune3/${f}`, `${dest}/${f}`);
}
