# Brise3D

[![CI](https://github.com/thomascsigai/Brise3D/actions/workflows/ci.yml/badge.svg)](https://github.com/thomascsigai/Brise3D/actions/workflows/ci.yml)
[![Deploy viewer](https://github.com/thomascsigai/Brise3D/actions/workflows/deploy.yml/badge.svg)](https://github.com/thomascsigai/Brise3D/actions/workflows/deploy.yml)

A simple 3D mass-aggregate physics engine written in C++20, translated from the 2D engine [Brise](https://github.com/thomascsigai/Brise). Bodies are point masses: no rigid bodies, no rotation, no broadphase.

**Live viewer: [thomascsigai.github.io/Brise3D](https://thomascsigai.github.io/Brise3D/)**

The coordinate system is Y-up, right-handed, in metres.

## Status

The port from 2D is in progress. Done so far:

- **`Vec3`** — 3D vector math (dot, cross, normalize, project/reject)
- **`Particle`** — position, velocity, acceleration, inverse mass, damping and a radius
- **Force generators** — gravity, spring, anchored spring, bungee, buoyancy, and the force registry
- **Contacts** — impulse exchange and interpenetration correction, with an iterative resolver
- **Links** — cable and rod
- **Ground plane and particle collision** — contact generators that keep particles above a plane and push overlapping particles apart (every pair is tested: no broadphase)
- **`World`** — fixed-step simulation container that owns its particles, force generators, links and contact generators
- **Flat C API** — `extern "C"` functions addressing particles by index and links by id, compiled to WebAssembly with Emscripten for the web viewer (see [ADR-0001](docs/adr/0001-flat-c-api-over-wasm.md))
- **Unit tests** — [doctest](https://github.com/doctest/doctest), run through `ctest`
- **Web viewer** — Vite + TypeScript + [Three.js](https://threejs.org/) in [web/](web/), with the ten demos of the 2D viewer ported to 3D: **Particles**, **Ballistics**, **Springs**, **Buoyancy**, **Collision**, **Resting**, **Cables**, **Rods**, **Cube** (a real cube of rods) and **Bridge**

Further demos are tracked as GitHub issues.

## Getting Started

### Prerequisites

- CMake 3.16+
- A C++20-compatible compiler; MSVC 2019+ is the one tested natively
- For the WebAssembly build only: the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (see below)

### Native build and test

```bash
git clone https://github.com/thomascsigai/Brise3D.git
cd Brise3D
cmake -B build
cmake --build build
ctest --test-dir build
```

doctest is fetched automatically at configure time. To build the engine without the tests:

```bash
cmake -B build -DBRISE_BUILD_TESTS=OFF
cmake --build build
```

### WebAssembly build

The engine is compiled to WebAssembly for the web viewer, through the flat C API in [CApi.h](include/Brise/CApi.h). This needs the Emscripten SDK installed once, globally:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest     # emsdk.bat on Windows
./emsdk activate latest
```

Then, in every shell that builds the WASM target, put `emcc`/`emcmake` on the `PATH` (`source ./emsdk_env.sh`, or `emsdk_env.bat` on Windows; `emsdk activate --permanent` on Windows writes it to the user environment instead).

Configure with `emcmake` into a separate build directory; the native `build/` is untouched:

```bash
emcmake cmake -B build-wasm -DCMAKE_BUILD_TYPE=Release -G Ninja
cmake --build build-wasm
```

`emcmake` cannot drive the Visual Studio generator, so on Windows install [Ninja](https://ninja-build.org/) (`winget install Ninja-build.Ninja`) and pass `-G Ninja` as above; on Linux/macOS the default Makefile generator works too.

This produces `build-wasm/brise.js` (an ES module, `-sMODULARIZE -sEXPORT_ES6`) and `build-wasm/brise.wasm`, and copies both to `web/public/` for the viewer. Every `world_*` function is exported; `cwrap` and `HEAPF32` are the exported runtime methods. The tests are not built under Emscripten: they run natively.

From JavaScript:

```js
import createBrise from './brise.js';

const brise = await createBrise();
const world = brise._world_create(100, 200);           // capacity, max contacts per step
const p = brise._world_add_particle(world, 0, 5, 0, 1, 0.99, 0.1);
brise._world_add_ground_plane(world, 0, 0.3);

// One view over the whole positions buffer, valid for the life of the world
const positions = new Float32Array(
    brise.HEAPF32.buffer, brise._world_positions_ptr(world), 3 * 100);

brise._world_update(world, 1 / 60);
console.log(positions[3 * p + 1]);                      // y of particle p
```

### Web viewer

The viewer in [web/](web/) needs the WebAssembly build above (it loads `web/public/brise.js` and `brise.wasm`) and Node 20+:

```bash
cd web
npm install
npm run dev        # Vite dev server with hot reload
npm test           # Vitest: the Engine wrapper against the real brise.wasm, and the frame loop
npm run build      # typecheck + static site in web/dist/, deployable as-is (relative base)
```

The viewer is deployed to [GitHub Pages](https://thomascsigai.github.io/Brise3D/) on every push to `main` by [deploy.yml](.github/workflows/deploy.yml), which rebuilds the WebAssembly with Emscripten, runs the viewer tests and publishes `web/dist`; the native tests run on Linux and Windows through [ci.yml](.github/workflows/ci.yml). Neither `brise.js` nor `brise.wasm` is committed.

Pick a demo from the overlay (or keys 1–0), Pause (Space), ×2 (Tab) and Reset (R); each demo adds its own actions as buttons with a key. Demos live in [web/src/demos/](web/src/demos/) and implement the `Demo` interface: `create(engine, scene)` builds a new world through the [Engine](web/src/engine.ts) wrapper, `update()` runs after every `world_update`, `dispose()` removes the demo's scenery. Reset destroys and recreates the world, since particles are never removed.

### Integrate into your project

Add Brise3D as a subdirectory in your `CMakeLists.txt`:

```cmake
add_subdirectory(Brise3D)
target_link_libraries(your_target PRIVATE brise)
```

## Usage

```cpp
#include <Brise/World.h>

// Capacity of 100 particles, up to 50 contacts per step
Brise::World world(100, 50);

// Position, mass, damping, radius; returns nullptr once the world is at capacity
Brise::Particle* pivot = world.AddParticle({0.0f, 5.0f, 0.0f}, 1.0f, 0.99f, 0.1f);
pivot->SetInfiniteMass();
Brise::Particle* bob = world.AddParticle({2.0f, 5.0f, 0.0f}, 1.0f, 0.99f, 0.1f);

// The world owns its links and force generators
Brise::LinkId rod = world.AddLink(std::make_unique<Brise::ParticleRod>(pivot, bob, 2.0f));

// Contact generators: a ground plane at y = 0, and particle-particle
// collisions (off by default); both take a restitution
world.AddGroundPlane(0.0f, 0.3f);
world.EnableParticleCollisions(0.5f);

while (running) {
    world.Update(frameTime); // advances by fixed 1/120 s steps
}

world.RemoveLink(rod);
```

## Architecture

```
include/Brise/
├── Vec3.h          # 3D vector math
├── Particle.h      # Core particle entity
├── PForceGen.h     # Force generator interfaces and implementations
├── PContact.h      # Contact representation and resolution
├── PLinks.h        # Cable and rod links
├── PCollision.h    # Ground plane and particle collision contact generators
├── World.h         # Main simulation container
└── CApi.h          # Flat C API over World, the WebAssembly surface
tests/              # doctest unit tests
web/
├── public/         # brise.js + brise.wasm, written by the WebAssembly build (+ hand-written brise.d.ts)
├── src/
│   ├── engine.ts   # Engine: thin wrapper over the C API, positions()/radii() views
│   ├── loop.ts     # Frame-time policy: clamp, pause, x2
│   ├── render.ts   # Particle spheres (InstancedMesh), segment lines, ground, markers
│   ├── overlay.ts  # Demo select, Pause / x2 / Reset, demo actions, keyboard
│   ├── main.ts     # Viewer bootstrap and frame loop
│   └── demos/      # One file per demo
└── tests/          # Vitest, run under Node against the real brise.wasm
```

See [CONTEXT.md](CONTEXT.md) for the project's vocabulary and [docs/adr/](docs/adr/) for design decisions.

## License

[MIT](LICENSE) © 2026 Thomas Csigai
