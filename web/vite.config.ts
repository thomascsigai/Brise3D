import { defineConfig } from 'vitest/config';

// Relative base so the built viewer works from any path (GitHub Pages
// serves it under /Brise3D/). brise.js and brise.wasm are served as-is
// from public/, where the WebAssembly build copies them.
export default defineConfig({
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
