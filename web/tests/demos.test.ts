import * as THREE from 'three';
import { beforeAll, describe, expect, test } from 'vitest';
import { BridgeDemo } from '../src/demos/bridge';
import { BuoyancyDemo, WATER_HEIGHT } from '../src/demos/buoyancy';
import { CablesDemo } from '../src/demos/cables';
import { ClothDemo, SIZE } from '../src/demos/cloth';
import { CollisionDemo } from '../src/demos/collision';
import { CubeDemo, EDGE } from '../src/demos/cube';
import type { Demo } from '../src/demos/demo';
import { demos } from '../src/demos';
import { RestingDemo } from '../src/demos/resting';
import { RodsDemo } from '../src/demos/rods';
import { Engine } from '../src/engine';
import { loadBrise } from './load-brise';

let engine: Engine;

beforeAll(async () => {
  engine = new Engine(await loadBrise());
});

function run(seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) engine.update(1 / 60);
}

function position(index: number): THREE.Vector3 {
  const p = engine.positions();
  return new THREE.Vector3(p[3 * index], p[3 * index + 1], p[3 * index + 2]);
}

function distance(i: number, j: number): number {
  return position(i).distanceTo(position(j));
}

function action(demo: Demo, label: string): void {
  const found = demo.actions?.find((a) => a.label === label);
  if (!found) throw new Error(`${demo.name} has no action "${label}"`);
  found.run();
}

describe('demos', () => {
  test('the ported demos and the cloth are selectable after the first three', () => {
    expect(demos.map((d) => d.name)).toEqual([
      'Particles',
      'Ballistics',
      'Springs',
      'Buoyancy',
      'Collision',
      'Resting',
      'Cables',
      'Rods',
      'Cube',
      'Bridge',
      'Cloth',
    ]);
  });

  test('every demo leaves the scene empty once disposed', () => {
    for (const demo of demos) {
      const scene = new THREE.Scene();
      demo.create(engine, scene);
      run(0.5);
      demo.update?.();
      demo.dispose();
      expect(scene.children, demo.name).toHaveLength(0);
    }
  });
});

describe('Buoyancy', () => {
  test('the light particle floats at the surface and the heavy one sinks to the floor', () => {
    const demo = new BuoyancyDemo();
    demo.create(engine, new THREE.Scene());

    run(6);

    // Particle indices follow creation order: light, medium, heavy
    expect(position(0).y).toBeGreaterThan(WATER_HEIGHT - 0.5);
    expect(position(1).y).toBeGreaterThan(WATER_HEIGHT - 0.5);
    expect(position(2).y).toBeLessThan(1);
    demo.dispose();
  });
});

describe('Collision', () => {
  test('two equal particles bounce back in a simple collision', () => {
    const demo = new CollisionDemo();
    demo.create(engine, new THREE.Scene());

    run(3);

    expect(position(0).x).toBeLessThan(-1);
    expect(position(1).x).toBeGreaterThan(1);
    demo.dispose();
  });

  test('selecting a test rebuilds the world and names it in the hint', () => {
    const demo = new CollisionDemo();
    demo.create(engine, new THREE.Scene());
    run(1);

    action(demo, 'Zero restitution');

    expect(demo.hint).toContain('Zero restitution');
    expect(engine.particleCount()).toBe(2);
    expect(position(0).x).toBe(-3);

    run(3);
    // No bounce: the particles stay in contact
    expect(distance(0, 1)).toBeLessThan(0.8);
    demo.dispose();
  });
});

describe('Resting', () => {
  test('the single particle rests on the ground and the stack holds', () => {
    const demo = new RestingDemo();
    demo.create(engine, new THREE.Scene());

    run(5);

    const [single, bottom, middle, top] = [0, 1, 2, 3].map((i) => position(i).y);
    expect(single).toBeGreaterThan(0.2);
    expect(single).toBeLessThan(0.5);
    expect(bottom).toBeLessThan(middle);
    expect(middle).toBeLessThan(top);
    expect(top).toBeGreaterThan(1.3);
    demo.dispose();
  });
});

describe('Cables', () => {
  test('the pendulum bob never gets further from its pivot than the cable length', () => {
    const demo = new CablesDemo();
    demo.create(engine, new THREE.Scene());

    let furthest = 0;
    for (let i = 0; i < 180; i++) {
      engine.update(1 / 60);
      furthest = Math.max(furthest, distance(0, 1));
    }

    expect(furthest).toBeLessThan(3.1);
    demo.dispose();
  });
});

describe('Rods', () => {
  test('the pendulum bob stays at rod length from its pivot', () => {
    const demo = new RodsDemo();
    demo.create(engine, new THREE.Scene());

    run(3);

    // Creation order: free pair (0, 1), pendulum (2, 3), double pendulum (4, 5, 6)
    expect(distance(2, 3)).toBeCloseTo(3, 1);
    expect(distance(4, 5)).toBeCloseTo(3, 1);
    expect(distance(5, 6)).toBeCloseTo(3, 1);
    demo.dispose();
  });
});

describe('Cube', () => {
  test('the cube keeps its edge lengths after landing on the ground', () => {
    const demo = new CubeDemo();
    demo.create(engine, new THREE.Scene());

    run(4);

    for (const [i, j] of CubeDemo.EDGES) expect(distance(i, j)).toBeCloseTo(EDGE, 1);
    for (let i = 0; i < 8; i++) expect(position(i).y).toBeGreaterThan(0);
    demo.dispose();
  });

  test('a tossed cube lands intact', () => {
    const demo = new CubeDemo();
    demo.create(engine, new THREE.Scene());
    run(3);

    action(demo, 'Toss');
    run(5);

    for (const [i, j] of CubeDemo.EDGES) expect(distance(i, j)).toBeCloseTo(EDGE, 1);
    demo.dispose();
  });
});

describe('Bridge', () => {
  test('the deck sags but holds, then drops where a cable is broken', () => {
    const demo = new BridgeDemo();
    demo.create(engine, new THREE.Scene());
    run(4);

    const count = engine.particleCount();
    const before = Array.from({ length: count }, (_, i) => position(i).y);
    // Every deck particle hangs below the towers and above the ground
    for (let i = 1; i < count - 1; i++) {
      expect(before[i]).toBeLessThan(before[0]);
      expect(before[i]).toBeGreaterThan(0.5);
    }

    action(demo, 'Break cable');
    run(4);

    const lowest = Math.min(...Array.from({ length: count }, (_, i) => position(i).y));
    expect(lowest).toBeLessThan(Math.min(...before) - 1);
    demo.dispose();
  });
});

describe('Cloth', () => {
  /** The y of every particle that is not a pin. */
  function freeHeights(): number[] {
    return Array.from({ length: engine.particleCount() }, (_, i) => i)
      .filter((i) => !ClothDemo.PINS.includes(i))
      .map((i) => position(i).y);
  }

  /**
   * Every rod within 8% of its length. The resolver holds the pinned sheet
   * within 3% at rest and 5% for a few seconds after a gust; hanging it from
   * two corners instead measured 10% and more, which this must catch.
   */
  function expectRodsToHold(): void {
    for (const rod of ClothDemo.RODS) {
      expect(Math.abs(distance(...rod.segment) - rod.length) / rod.length, `rod ${rod.segment}`).toBeLessThan(0.08);
    }
  }

  test('the rods hold their lengths once the sheet hangs below its pins', () => {
    const demo = new ClothDemo();
    demo.create(engine, new THREE.Scene());

    run(6);

    expectRodsToHold();
    const pinHeight = position(ClothDemo.PINS[0]!).y;
    for (const y of freeHeights()) {
      expect(y).toBeLessThan(pinHeight);
      expect(y).toBeGreaterThan(0);
    }
    demo.dispose();
  });

  test('unpinning every pin drops the sheet onto the ground', () => {
    const demo = new ClothDemo();
    demo.create(engine, new THREE.Scene());
    run(6);

    action(demo, 'Unpin');
    run(2);
    // Still hanging from the other pins
    expect(Math.max(...freeHeights())).toBeGreaterThan(1);

    for (let i = 1; i < SIZE; i++) action(demo, 'Unpin');
    run(6);

    expect(Math.max(...freeHeights())).toBeLessThan(0.5);
    expect(Math.min(...freeHeights())).toBeGreaterThan(0);
    demo.dispose();
  });

  test('a gust swings the sheet and the rods still hold once it settles', () => {
    const demo = new ClothDemo();
    demo.create(engine, new THREE.Scene());
    run(6);
    // The far corner of the bottom row is free
    const corner = SIZE * SIZE - 1;
    const before = position(corner).z;

    action(demo, 'Gust');
    run(0.5);

    expect(Math.abs(position(corner).z - before)).toBeGreaterThan(0.1);
    run(4);
    expectRodsToHold();
    demo.dispose();
  });
});
