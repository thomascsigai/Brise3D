# Brise3D

A simple 3D mass-aggregate physics engine written in C++20, translated from the 2D engine [Brise](https://github.com/thomascsigai/Brise). Bodies are point masses: no rigid bodies, no rotation, no broadphase.

The coordinate system is Y-up, right-handed, in metres.

## Status

The port from 2D is in progress. Done so far:

- **`Vec3`** — 3D vector math (dot, cross, normalize, project/reject)
- **`Particle`** — position, velocity, acceleration, inverse mass, damping and a radius
- **Unit tests** — [doctest](https://github.com/doctest/doctest), run through `ctest`

Still to come, tracked as GitHub issues: force generators, contacts and links, the `World`, a ground plane and particle collision, a flat C API compiled to WebAssembly, and a web viewer (Three.js) with the demos.

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
#include <Brise/Particle.h>

// Position, mass, damping, radius
Brise::Particle p({0.0f, 10.0f, 0.0f}, 1.0f, 0.99f, 0.1f);
p.velocity = {5.0f, 0.0f, 0.0f};
p.acceleration = {0.0f, -9.81f, 0.0f};

float dt = 1.0f / 120.0f;
while (running) {
    p.Integrate(dt);
}
```

## Architecture

```
include/Brise/
├── Vec3.h          # 3D vector math
├── Particle.h      # Core particle entity
├── PForceGen.h     # Force generator interfaces and implementations (2D, pending translation)
├── PContact.h      # Contact representation and resolution (2D, pending translation)
├── PLinks.h        # Cable and rod links (2D, pending translation)
└── World.h         # Main simulation container (2D, pending translation)
tests/              # doctest unit tests
```

See [CONTEXT.md](CONTEXT.md) for the project's vocabulary and [docs/adr/](docs/adr/) for design decisions.

## License

[MIT](LICENSE) © 2026 Thomas Csigai
