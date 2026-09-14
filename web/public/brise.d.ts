// Hand-written types for the Emscripten output brise.js (built by the
// WebAssembly target in the root CMakeLists.txt). Sits next to brise.js so
// `import createBrise from '../public/brise.js'` resolves to it.

/** The runtime methods the build exports (-sEXPORTED_RUNTIME_METHODS). */
export interface BriseModule {
  cwrap(
    name: string,
    returnType: 'number' | null,
    argTypes: 'number'[],
  ): (...args: number[]) => number;
  /** View over the whole WASM heap; memory growth is off, so never detached. */
  HEAPF32: Float32Array<ArrayBuffer>;
}

export interface BriseModuleOptions {
  /**
   * The loader is built with -sENVIRONMENT=web and fetches brise.wasm next
   * to brise.js. Outside a browser, supply the instance yourself: call
   * `onInstantiated` with a WebAssembly.Instance built from `imports`.
   */
  instantiateWasm?(
    imports: WebAssembly.Imports,
    onInstantiated: (instance: WebAssembly.Instance) => void,
  ): Record<string, never>;
  locateFile?(path: string, scriptDirectory: string): string;
}

export type CreateBrise = (options?: BriseModuleOptions) => Promise<BriseModule>;

declare const createBrise: CreateBrise;
export default createBrise;
