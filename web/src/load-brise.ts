import type { BriseModule, CreateBrise } from '../public/brise.js';

/**
 * Loads brise.js from the site root (Vite serves public/ as-is). The import
 * is left to the browser, so Vite must not rewrite it. Both files are
 * fetched with the build id as a query string: their names never change,
 * so without it a browser that cached one deploy keeps using it under the
 * next deploy's bundle, and calls exports that build did not have.
 */
export async function loadBrise(): Promise<BriseModule> {
  const root = new URL(import.meta.env.BASE_URL, document.baseURI);
  const versioned = (file: string) => new URL(`${file}?v=${__BUILD_ID__}`, root).href;
  const { default: createBrise } = (await import(/* @vite-ignore */ versioned('brise.js'))) as {
    default: CreateBrise;
  };
  return createBrise({ locateFile: (path) => versioned(path) });
}
