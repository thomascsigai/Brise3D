---
status: accepted
---

# Expose the engine to the web through a flat C API over WebAssembly

The viewer renders the engine with Three.js in the browser, so the C++ engine is compiled to WebAssembly with Emscripten. Rather than exposing the `World`/`Particle` classes through embind, the engine exports a small `extern "C"` API where particles are addressed by integer index and links by integer id, and per-frame state (positions) is read through a zero-copy `Float32Array` view on the WASM heap. Demos are written in TypeScript in the viewer, not in C++.

## Considered options

- **Native process + WebSocket streaming positions to the page**: keeps MSVC debugging, but two processes and a protocol to maintain; rejected because a static WASM build is deployable to GitHub Pages and is what "test the engine in the browser" means.
- **embind exposing the C++ classes**: lets JS use the engine object-per-object, but raw `Particle*` held by force generators and links make ownership across the JS/WASM boundary a real hazard, and per-particle accessors called every frame allocate one JS object per particle per frame.
- **Demos in C++, viewer as a pure display**: the smallest bridge, but every scene change needs a WASM rebuild, the viewer has to be told what to draw, and interactions (click to spawn) need an input channel. Rejected in favour of fast iteration with Vite hot reload.

## Consequences

- The `World` owns its force generators and links (the 2D engine left ownership to the caller), so the C API can create and remove them by id.
- A world has a fixed particle capacity set at creation; particles are never removed (recreate the world instead), so indices stay stable and links never dangle.
- Per-frame cost across the bridge is one `world_update` call plus one buffer read, regardless of particle count. Do not add per-particle accessors to the hot path.
- Native demos disappear; doctest unit tests are the native way to exercise the engine.
