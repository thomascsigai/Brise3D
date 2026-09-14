import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import createBrise from '../public/brise.js';
import type { BriseModule } from '../public/brise.js';

// The loader targets the browser (-sENVIRONMENT=web); under Node it needs
// the .wasm bytes handed to it through instantiateWasm.
const wasmPath = fileURLToPath(new URL('../public/brise.wasm', import.meta.url));

export function loadBrise(): Promise<BriseModule> {
  const bytes = readFileSync(wasmPath);
  return createBrise({
    instantiateWasm(imports, onInstantiated) {
      WebAssembly.instantiate(bytes, imports).then(({ instance }) => onInstantiated(instance));
      return {};
    },
  });
}
