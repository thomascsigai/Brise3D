import type { BriseModule, CreateBrise } from '../public/brise.js';

/**
 * Loads brise.js from the site root (Vite serves public/ as-is). The import
 * is left to the browser so brise.js can find brise.wasm next to itself
 * through import.meta.url; Vite must not rewrite it.
 */
export async function loadBrise(): Promise<BriseModule> {
  const url = new URL('brise.js', new URL(import.meta.env.BASE_URL, document.baseURI)).href;
  const { default: createBrise } = (await import(/* @vite-ignore */ url)) as { default: CreateBrise };
  return createBrise();
}
