import { defineConfig } from 'vitest/config';

// Relative base so the built viewer works from any path (GitHub Pages
// serves it under /Brise3D/). brise.js and brise.wasm are served as-is
// from public/, where the WebAssembly build copies them.
export default defineConfig({
  base: './',
  // A new id per build: brise.js and brise.wasm keep their names across
  // builds (unlike the hashed bundles), so load-brise.ts appends this to
  // their URLs, or the browser would keep serving the previous build's.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
