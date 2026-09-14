#pragma once

// Flat C API over the engine, the surface the web viewer talks to through
// WebAssembly (see docs/adr/0001-flat-c-api-over-wasm.md). Particles are
// addressed by their particle index, links by their link id. It compiles
// natively too, so it is covered by the doctest suite.

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define BRISE_API EMSCRIPTEN_KEEPALIVE
#else
#define BRISE_API
#endif

#ifdef __cplusplus
extern "C" {
#endif

// Opaque world handle; every other function takes one.
typedef struct BriseWorld BriseWorld;

// The world holds at most maxParticles particles and resolves at most
// maxContacts contacts per step. Returns NULL if either is negative.
BRISE_API BriseWorld* world_create(int maxParticles, int maxContacts);
BRISE_API void world_destroy(BriseWorld* world);

// Advances the world by whole fixed steps (see World::Update) and refreshes
// the positions buffer.
BRISE_API void world_update(BriseWorld* world, float dt);

// Returns the particle index, or -1 once the world is at capacity.
// A mass <= 0 creates an infinite-mass particle (never moved by forces or
// contacts).
BRISE_API int world_add_particle(BriseWorld* world, float x, float y, float z, float mass, float damping, float radius);
BRISE_API int world_particle_count(const BriseWorld* world);

// Setters on a particle; ignored for an index that was never returned by
// world_add_particle. Every particle starts with the world gravity as its
// acceleration; set it to zero to cancel gravity.
BRISE_API void world_set_velocity(BriseWorld* world, int index, float x, float y, float z);
BRISE_API void world_set_acceleration(BriseWorld* world, int index, float x, float y, float z);

// Force generators, applied to their particles every step for the life of
// the world. Each is ignored for an invalid particle index. Springs and
// bungees between two particles act on both ends.
BRISE_API void world_add_gravity(BriseWorld* world, int i, float gx, float gy, float gz);
BRISE_API void world_add_spring(BriseWorld* world, int i, int j, float springConstant, float restLength);
BRISE_API void world_add_anchored_spring(BriseWorld* world, int i, float ax, float ay, float az, float springConstant, float restLength);
BRISE_API void world_add_bungee(BriseWorld* world, int i, int j, float springConstant, float restLength);
// The liquid surface is the horizontal plane at waterHeight; the particle is
// fully submerged maxDepth below it. liquidDensity is in kg/m^3 (water: 1000).
BRISE_API void world_add_buoyancy(BriseWorld* world, int i, float maxDepth, float volume, float waterHeight, float liquidDensity);

// Links constrain the distance between two particles; each returns a link
// id, or -1 if either particle index is invalid.
BRISE_API int world_add_rod(BriseWorld* world, int i, int j, float length);
BRISE_API int world_add_cable(BriseWorld* world, int i, int j, float maxLength, float restitution);
// Ignored for an id that is not a live link.
BRISE_API void world_remove_link(BriseWorld* world, int id);

// Keeps every particle above the horizontal plane at height y.
BRISE_API void world_add_ground_plane(BriseWorld* world, float y, float restitution);
// Particle-particle collisions are off by default; calling again only
// updates the restitution.
BRISE_API void world_enable_particle_collisions(BriseWorld* world, float restitution);

// Contiguous float[3 * count] of particle positions (x, y, z per particle),
// refreshed by world_update and world_add_particle. The pointer is stable
// for the life of the world, so it can be viewed as a Float32Array once.
BRISE_API const float* world_positions_ptr(const BriseWorld* world);
// Contiguous float[count] of particle radii, written by world_add_particle.
BRISE_API const float* world_radii_ptr(const BriseWorld* world);

#ifdef __cplusplus
}
#endif
