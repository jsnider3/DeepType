import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom provides localStorage and the DOM globals PixiJS expects at import time.
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
