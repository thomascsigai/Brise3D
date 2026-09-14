import { beforeAll, describe, expect, test } from 'vitest';
import { Engine } from '../src/engine';
import { loadBrise } from './load-brise';

let engine: Engine;

beforeAll(async () => {
  engine = new Engine(await loadBrise());
});

describe('Engine', () => {
  test('a particle added to a new world falls under gravity', () => {
    engine.createWorld(10, 10);
    const p = engine.addParticle({ x: 0, y: 5, z: 0 }, 1, 0.99, 0.1);

    engine.update(0.5);

    expect(engine.particleCount()).toBe(1);
    // s = 5 - 0.5 * 9.81 * 0.5^2 ≈ 3.77 m, less the velocity damping
    expect(engine.positions()[3 * p + 1]).toBeLessThan(4);
    expect(engine.positions()[3 * p + 1]).toBeGreaterThan(3.5);
  });

  test('creating a world again starts empty and reads positions from the new world', () => {
    engine.createWorld(4, 4);
    engine.addParticle({ x: 9, y: 9, z: 9 }, 1, 0.99, 0.1);

    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 1, y: 2, z: 3 }, 1, 0.99, 0.1);

    expect(engine.particleCount()).toBe(1);
    expect(p).toBe(0);
    expect(Array.from(engine.positions().subarray(0, 3))).toEqual([1, 2, 3]);
    expect(engine.positions().length).toBe(3 * 4);
  });

  test('radii are readable per particle index', () => {
    engine.createWorld(4, 4);
    engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 0.99, 0.25);
    const p = engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 0.99, 0.5);

    expect(engine.radii()[p]).toBe(0.5);
    expect(engine.radii().length).toBe(4);
  });

  test('a particle with mass 0 has infinite mass and never moves', () => {
    engine.createWorld(4, 4);
    const pivot = engine.addParticle({ x: 0, y: 5, z: 0 }, 0, 0.99, 0.1);

    engine.update(1);

    expect(engine.positions()[3 * pivot + 1]).toBe(5);
  });

  test('setting the acceleration to zero cancels gravity', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: 5, z: 0 }, 1, 0.99, 0.1);
    engine.setAcceleration(p, { x: 0, y: 0, z: 0 });

    engine.update(1);

    expect(engine.positions()[3 * p + 1]).toBe(5);
  });

  test('a velocity set on a particle carries it along that axis', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 1, 0.1);
    engine.setAcceleration(p, { x: 0, y: 0, z: 0 });
    engine.setVelocity(p, { x: 2, y: 0, z: 0 });

    engine.update(1);

    expect(engine.positions()[3 * p]).toBeCloseTo(2, 3);
  });

  test('a spring pulls two stretched particles towards each other', () => {
    engine.createWorld(4, 4);
    const a = engine.addParticle({ x: -2, y: 0, z: 0 }, 1, 1, 0.1);
    const b = engine.addParticle({ x: 2, y: 0, z: 0 }, 1, 1, 0.1);
    engine.setAcceleration(a, { x: 0, y: 0, z: 0 });
    engine.setAcceleration(b, { x: 0, y: 0, z: 0 });
    engine.addSpring(a, b, 10, 1);

    engine.update(0.25);

    expect(engine.positions()[3 * a]).toBeGreaterThan(-2);
    expect(engine.positions()[3 * b]).toBeLessThan(2);
  });

  test('an anchored spring pulls a particle towards its anchor', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 1, 0.1);
    engine.setAcceleration(p, { x: 0, y: 0, z: 0 });
    engine.addAnchoredSpring(p, { x: 0, y: 3, z: 0 }, 10, 1);

    engine.update(0.25);

    expect(engine.positions()[3 * p + 1]).toBeGreaterThan(0);
  });

  test('a bungee only pulls once stretched past its rest length', () => {
    engine.createWorld(4, 4);
    const pivot = engine.addParticle({ x: 0, y: 3, z: 0 }, 0, 1, 0.1);
    const slack = engine.addParticle({ x: 0, y: 2.5, z: 0 }, 1, 1, 0.1);
    const taut = engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 1, 0.1);
    engine.setAcceleration(slack, { x: 0, y: 0, z: 0 });
    engine.setAcceleration(taut, { x: 0, y: 0, z: 0 });
    engine.addBungee(pivot, slack, 10, 1);
    engine.addBungee(pivot, taut, 10, 1);

    engine.update(0.25);

    expect(engine.positions()[3 * slack + 1]).toBe(2.5);
    expect(engine.positions()[3 * taut + 1]).toBeGreaterThan(0);
  });

  test('an extra gravity generator adds to the world gravity', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 1, 0.1);
    engine.setAcceleration(p, { x: 0, y: 0, z: 0 });
    engine.addGravity(p, { x: 0, y: 0, z: 4 });

    engine.update(1);

    // z = 0.5 * 4 * 1^2 = 2 (semi-implicit Euler over 120 steps overshoots a little)
    expect(engine.positions()[3 * p + 2]).toBeCloseTo(2, 1);
  });

  test('a rod returns a link id and keeps its particles at length', () => {
    engine.createWorld(4, 4);
    const pivot = engine.addParticle({ x: 0, y: 3, z: 0 }, 0, 1, 0.1);
    const bob = engine.addParticle({ x: 0, y: 2, z: 0 }, 1, 1, 0.1);
    const rod = engine.addRod(pivot, bob, 1);

    engine.update(1);

    expect(rod).toBeGreaterThanOrEqual(0);
    expect(engine.positions()[3 * bob + 1]).toBeCloseTo(2, 2);
  });

  test('a link on an unknown particle index has id -1', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: 0, z: 0 }, 1, 1, 0.1);

    expect(engine.addRod(p, 7, 1)).toBe(-1);
    expect(engine.addCable(p, 7, 1, 0.5)).toBe(-1);
  });

  test('a removed cable no longer holds its particle', () => {
    engine.createWorld(4, 4);
    const pivot = engine.addParticle({ x: 0, y: 3, z: 0 }, 0, 1, 0.1);
    const bob = engine.addParticle({ x: 0, y: 2, z: 0 }, 1, 1, 0.1);
    const cable = engine.addCable(pivot, bob, 1, 0);
    engine.update(0.5);
    expect(engine.positions()[3 * bob + 1]).toBeCloseTo(2, 1);

    engine.removeLink(cable);
    engine.update(0.5);

    expect(engine.positions()[3 * bob + 1]).toBeLessThan(1.5);
  });

  test('a ground plane keeps a falling particle above it', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: 1, z: 0 }, 1, 0.99, 0.2);
    engine.addGroundPlane(0, 0);

    engine.update(2);

    expect(engine.positions()[3 * p + 1]).toBeGreaterThanOrEqual(0.2 - 1e-4);
  });

  test('particle collisions push two overlapping particles apart', () => {
    engine.createWorld(4, 4);
    const a = engine.addParticle({ x: -0.1, y: 0, z: 0 }, 1, 1, 0.5);
    const b = engine.addParticle({ x: 0.1, y: 0, z: 0 }, 1, 1, 0.5);
    engine.setAcceleration(a, { x: 0, y: 0, z: 0 });
    engine.setAcceleration(b, { x: 0, y: 0, z: 0 });
    engine.enableParticleCollisions(0);

    engine.update(0.1);

    expect(engine.positions()[3 * b] - engine.positions()[3 * a]).toBeCloseTo(1, 3);
  });

  test('the contact counters report the busiest step of the last update', () => {
    engine.createWorld(4, 8);
    // Through the ground and rising: penetrating on the first step, clear on the second
    const p = engine.addParticle({ x: 0, y: 0.4, z: 0 }, 1, 1, 0.5);
    engine.setAcceleration(p, { x: 0, y: 0, z: 0 });
    engine.setVelocity(p, { x: 0, y: 10, z: 0 });
    engine.addGroundPlane(0, 0);

    engine.update(2 / 120);

    expect(engine.maxContacts()).toBe(8);
    expect(engine.lastSteps()).toBe(2);
    expect(engine.lastContacts()).toBe(1);
    expect(engine.lastIterationsUsed()).toBe(2);
    expect(engine.lastIterations()).toBe(2);

    engine.update(0.001);

    expect(engine.lastSteps()).toBe(0);
    expect(engine.lastContacts()).toBe(0);
    expect(engine.lastIterationsUsed()).toBe(0);
    expect(engine.lastIterations()).toBe(0);
  });

  test('buoyancy lifts a submerged particle', () => {
    engine.createWorld(4, 4);
    const p = engine.addParticle({ x: 0, y: -1, z: 0 }, 1, 1, 0.1);
    engine.addBuoyancy(p, 0.5, 0.01, 0, 1000);

    engine.update(0.5);

    expect(engine.positions()[3 * p + 1]).toBeGreaterThan(-1);
  });
});
