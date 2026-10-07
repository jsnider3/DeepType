#!/usr/bin/env node
// Publishes dist/ (from `npm run build`) to the gh-pages branch of origin, which GitHub Pages
// serves. The branch holds only the latest build: one commit, force-pushed each time.
//
//   npm run deploy        build, then publish

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/ is missing: run npm run build first');
// Assets imported from the original game must never be published.
if (existsSync(path.join(DIST, 'assets', 'original'))) throw new Error('dist/ contains assets/original: refusing to publish');

const remote = git(['remote', 'get-url', 'origin']);
const rev = git(['rev-parse', '--short', 'HEAD']);
const dirty = git(['status', '--porcelain']) ? ' (with uncommitted changes)' : '';
const work = mkdtempSync(path.join(os.tmpdir(), 'deploy-pages-'));
try {
  cpSync(DIST, work, { recursive: true });
  writeFileSync(path.join(work, '.nojekyll'), ''); // serve files as-is
  git(['init', '-q', '-b', 'gh-pages'], work);
  git(['add', '-A'], work);
  const who = ['-c', `user.name=${git(['config', 'user.name'])}`, '-c', `user.email=${git(['config', 'user.email'])}`];
  git([...who, 'commit', '-q', '-m', `Build of ${rev}${dirty}`], work);
  git(['push', '-q', '-f', remote, 'gh-pages'], work);
  console.log(`Published build of ${rev}${dirty} to gh-pages. GitHub Pages updates in a minute or so.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
