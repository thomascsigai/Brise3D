# Brise3D

A simple 3D mass-aggregate physics engine in C++, translated from the 2D engine Brise. Bodies are point masses; there are no rigid bodies, no rotation, no broadphase.

## Language

### Simulation

**World**:
The simulation container: owns the particles, the force registry and the contact generators, and advances the simulation by fixed steps.
_Avoid_: Scene, simulation, physics world

**Step**:
One advance of the world by the fixed timestep: apply forces, integrate, generate contacts, resolve contacts.
_Avoid_: Tick, frame

**Particle**:
A point mass with position, velocity, acceleration, inverse mass, damping and a radius. The only kind of body in the engine.
_Avoid_: Body, point, node, mass, sphere

**Radius**:
The extent of a particle used only for contact generation (ground plane, particle collision) and rendering; it plays no role in forces or integration.
_Avoid_: Size, extent

**Capacity**:
The maximum number of particles a world can hold, fixed when the world is created. Adding beyond it fails.
_Avoid_: Limit, pool size

**Infinite mass**:
A particle whose inverse mass is zero: it is never moved by forces or contacts.
_Avoid_: Static, fixed, kinematic, anchored

### Forces

**Force generator**:
An object that applies a force to a registered particle every step (gravity, spring, anchored spring, bungee, buoyancy).
_Avoid_: Force, effector, actor

**Force registry**:
The list of (particle, force generator) pairs the world updates every step.
_Avoid_: Force list

### Contacts

**Contact**:
A record that two particles (or one particle and the scenery) are touching or interpenetrating: normal, penetration depth and restitution. Resolved by exchanging impulses and separating the particles.
_Avoid_: Collision, hit, overlap

**Contact generator**:
An object that produces contacts each step by examining the world (links, ground plane, sphere-sphere).
_Avoid_: Collider, detector

**Contact resolver**:
The iterative procedure that resolves the most urgent contacts first within an iteration budget.
_Avoid_: Solver

**Link**:
A contact generator that constrains the distance between two particles.
_Avoid_: Constraint, joint, connection

**Cable**:
A link that only prevents two particles from moving further apart than a maximum length.
_Avoid_: Rope, string

**Rod**:
A link that keeps two particles at a fixed distance.
_Avoid_: Bar, stick, beam

**Ground plane**:
A contact generator that keeps every particle above a horizontal plane at a given height.
_Avoid_: Floor, terrain, boundary

**Particle collision**:
A contact generator, enabled per world, that produces a contact whenever two particles overlap by their radii. Tests every pair.
_Avoid_: Sphere collision, broadphase, collider

### Bridge and web

**Particle index**:
The integer identifying a particle across the bridge; assigned at creation and stable for the life of the world.
_Avoid_: Handle, id, pointer

**Link id**:
The integer identifying a link across the bridge, used to remove it.
_Avoid_: Handle, constraint id

**Viewer**:
The web page that builds demos, steps the world and renders it.
_Avoid_: Sandbox, app, client, frontend

**Demo**:
A scene defined in the viewer that exercises one feature of the engine, selectable from the viewer.
_Avoid_: Example, sample, test scene

**Frame**:
One browser animation frame of the viewer: it advances the world by zero or more steps, then renders it.
_Avoid_: Tick, step, render pass

**Profiler**:
The panel of the viewer that shows how long a frame, the engine and the rendering take, and the engine's per-step counters.
_Avoid_: Stats, HUD, metrics, perf panel, debug overlay
