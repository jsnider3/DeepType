import { rmSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      // public/assets/original holds assets imported from your own copy of the original game:
      // usable in dev, but never shipped in a build.
      name: 'drop-original-assets',
      apply: 'build',
      closeBundle() {
        rmSync(path.resolve('dist/assets/original'), { recursive: true, force: true });
      },
    },
  ],
  server: {
    port: 5173,
    watch: {
      // inotify doesn't fire for files on the Windows drive when running under WSL.
      usePolling: true,
      interval: 300,
      // Keep polling cheap: tooling, RE notes and the big original pack never need hot reload.
      // public/assets/remastered stays watched so Vite serves files added by build-pack.
      ignored: ['**/decomp/**', '**/.import-cache/**', '**/public/assets/original/**', '**/public/vendor/**', '**/docs/**'],
    },
  },
});
