# Brise3D

A simple 3D mass-aggregate physics engine written in C++20, translated from the 2D engine [Brise](https://github.com/thomascsigai/Brise). Bodies are point masses: no rigid bodies, no rotation, no broadphase.

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
- **Unit tests** — [doctest](https://github.com/doctest/doctest), run through `ctest`

Still to come, tracked as GitHub issues: a flat C API compiled to WebAssembly, and a web viewer (Three.js) with the demos.

## Getting Started

### Prerequisites

- CMake 3.16+
- A C++20-compatible compiler; MSVC 2019+ is the one tested (`BR_ASSERT` currently relies on the MSVC `__debugbreak` intrinsic)

### Build and test

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
└── World.h         # Main simulation container
tests/              # doctest unit tests
```

See [CONTEXT.md](CONTEXT.md) for the project's vocabulary and [docs/adr/](docs/adr/) for design decisions.

## License

[MIT](LICENSE) © 2026 Thomas Csigai
