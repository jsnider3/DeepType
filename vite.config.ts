import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
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
