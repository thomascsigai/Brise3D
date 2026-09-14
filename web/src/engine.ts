import type { BriseModule } from '../public/brise.js';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

type WorldFn = (...args: number[]) => number;

/**
 * Thin wrapper over the flat C API (include/Brise/CApi.h) through cwrap.
 * Holds the current world: a demo creates one with createWorld, which
 * destroys the previous one (particles are never removed, so reset means
 * a new world). Particles are addressed by particle index, links by link id.
 */
export class Engine {
  private readonly fn: Record<string, WorldFn> = {};
  private world = 0;
  private worldCapacity = 0;
  private worldMaxContacts = 0;
  private positionsView = new Float32Array(0);
  private radiiView = new Float32Array(0);

  constructor(private readonly module: BriseModule) {
    const bind = (name: string, returns: boolean, argCount: number) => {
      this.fn[name] = module.cwrap(name, returns ? 'number' : null, Array(argCount).fill('number'));
    };
    bind('world_create', true, 2);
    bind('world_destroy', false, 1);
    bind('world_update', false, 2);
    bind('world_add_particle', true, 7);
    bind('world_particle_count', true, 1);
    bind('world_set_velocity', false, 5);
    bind('world_set_acceleration', false, 5);
    bind('world_add_gravity', false, 5);
    bind('world_add_spring', false, 5);
    bind('world_add_anchored_spring', false, 7);
    bind('world_add_bungee', false, 5);
    bind('world_add_buoyancy', false, 6);
    bind('world_add_rod', true, 4);
    bind('world_add_cable', true, 5);
    bind('world_remove_link', false, 2);
    bind('world_add_ground_plane', false, 3);
    bind('world_enable_particle_collisions', false, 2);
    bind('world_last_steps', true, 1);
    bind('world_last_contacts', true, 1);
    bind('world_last_iterations_used', true, 1);
    bind('world_last_iterations', true, 1);
    bind('world_positions_ptr', true, 1);
    bind('world_radii_ptr', true, 1);
  }

  private call(name: string, ...args: number[]): number {
    const fn = this.fn[name];
    if (!fn) throw new Error(`Engine: ${name} is not bound`);
    if (this.world === 0) throw new Error(`Engine: ${name} called before createWorld`);
    return fn(this.world, ...args);
  }

  /** Destroys the current world (if any) and creates an empty one. */
  createWorld(capacity: number, maxContacts: number): void {
    this.destroyWorld();
    this.world = this.fn['world_create']!(capacity, maxContacts);
    if (this.world === 0) throw new Error(`Engine: world_create(${capacity}, ${maxContacts}) failed`);
    this.worldCapacity = capacity;
    this.worldMaxContacts = maxContacts;
    // The positions buffer is float[3 * capacity] at a pointer that is stable
    // for the life of the world, so one view is enough.
    this.positionsView = new Float32Array(
      this.module.HEAPF32.buffer,
      this.call('world_positions_ptr'),
      3 * capacity,
    );
    this.radiiView = new Float32Array(this.module.HEAPF32.buffer, this.call('world_radii_ptr'), capacity);
  }

  destroyWorld(): void {
    if (this.world === 0) return;
    this.call('world_destroy');
    this.world = 0;
    this.worldCapacity = 0;
    this.worldMaxContacts = 0;
    this.positionsView = new Float32Array(0);
    this.radiiView = new Float32Array(0);
  }

  update(dt: number): void {
    this.call('world_update', dt);
  }

  /** Returns the particle index, or -1 at capacity. mass <= 0 is infinite mass. */
  addParticle(position: Vec3Like, mass: number, damping: number, radius: number): number {
    return this.call('world_add_particle', position.x, position.y, position.z, mass, damping, radius);
  }

  setVelocity(index: number, v: Vec3Like): void {
    this.call('world_set_velocity', index, v.x, v.y, v.z);
  }

  /** Every particle starts with the world gravity; zero cancels it. */
  setAcceleration(index: number, a: Vec3Like): void {
    this.call('world_set_acceleration', index, a.x, a.y, a.z);
  }

  // Force generators act on their particles every step for the life of the
  // world. Springs and bungees act on both ends.

  /** An extra gravity on top of the world gravity (cancel that one first). */
  addGravity(index: number, g: Vec3Like): void {
    this.call('world_add_gravity', index, g.x, g.y, g.z);
  }

  addSpring(i: number, j: number, springConstant: number, restLength: number): void {
    this.call('world_add_spring', i, j, springConstant, restLength);
  }

  addAnchoredSpring(index: number, anchor: Vec3Like, springConstant: number, restLength: number): void {
    this.call('world_add_anchored_spring', index, anchor.x, anchor.y, anchor.z, springConstant, restLength);
  }

  addBungee(i: number, j: number, springConstant: number, restLength: number): void {
    this.call('world_add_bungee', i, j, springConstant, restLength);
  }

  /** Liquid surface at waterHeight, fully submerged maxDepth below it; density in kg/m^3. */
  addBuoyancy(index: number, maxDepth: number, volume: number, waterHeight: number, liquidDensity: number): void {
    this.call('world_add_buoyancy', index, maxDepth, volume, waterHeight, liquidDensity);
  }

  // Links return a link id, or -1 if either particle index is invalid.

  addRod(i: number, j: number, length: number): number {
    return this.call('world_add_rod', i, j, length);
  }

  addCable(i: number, j: number, maxLength: number, restitution: number): number {
    return this.call('world_add_cable', i, j, maxLength, restitution);
  }

  removeLink(id: number): void {
    this.call('world_remove_link', id);
  }

  /** Keeps every particle above the horizontal plane at height y. */
  addGroundPlane(y: number, restitution: number): void {
    this.call('world_add_ground_plane', y, restitution);
  }

  /** Off by default; every pair is tested, so keep the capacity modest. */
  enableParticleCollisions(restitution: number): void {
    this.call('world_enable_particle_collisions', restitution);
  }

  particleCount(): number {
    return this.call('world_particle_count');
  }

  capacity(): number {
    return this.worldCapacity;
  }

  /** The contact budget of a step, fixed at createWorld. */
  maxContacts(): number {
    return this.worldMaxContacts;
  }

  // Steps run by the last update, and the counters of the busiest of them
  // (the step that generated the most contacts); all zero after an update
  // that ran no step.

  lastSteps(): number {
    return this.call('world_last_steps');
  }

  lastContacts(): number {
    return this.call('world_last_contacts');
  }

  lastIterationsUsed(): number {
    return this.call('world_last_iterations_used');
  }

  /** The resolver's iteration budget for that step. */
  lastIterations(): number {
    return this.call('world_last_iterations');
  }

  /** x, y, z per particle over the whole capacity; refreshed by update. */
  positions(): Float32Array {
    return this.positionsView;
  }

  /** One radius per particle over the whole capacity; written on addParticle. */
  radii(): Float32Array {
    return this.radiiView;
  }
}
