import * as THREE from 'three';
import type { Engine, Vec3Like } from '../engine';
import { disposeObject, makeGround } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

const RADIUS = 0.35;
/** Height of the collision line above the ground grid. */
const HEIGHT = 1.5;

interface Body {
  position: Vec3Like;
  /** 0 is infinite mass. */
  mass: number;
  velocity: Vec3Like;
}

interface CollisionTest {
  name: string;
  key: string;
  restitution: number;
  bodies: [Body, Body];
}

const at = (x: number, z = 0): Vec3Like => ({ x, y: HEIGHT, z });
const v = (x: number, y = 0, z = 0): Vec3Like => ({ x, y, z });

// Two particles on a collision course with gravity cancelled. The keys
// follow the Q, W, E... row of the original sandbox, skipping R (Reset).
const TESTS: CollisionTest[] = [
  {
    name: 'Simple collision',
    key: 'q',
    restitution: 1,
    bodies: [
      { position: at(-3), mass: 3, velocity: v(2) },
      { position: at(3), mass: 3, velocity: v(-2) },
    ],
  },
  {
    name: 'Non-linear contact',
    key: 'w',
    restitution: 1,
    bodies: [
      { position: at(-3, -1), mass: 3, velocity: v(2, 0, 1) },
      { position: at(3), mass: 3, velocity: v(-2) },
    ],
  },
  {
    name: 'Different speeds',
    key: 'e',
    restitution: 1,
    bodies: [
      { position: at(-3), mass: 3, velocity: v(5) },
      { position: at(3), mass: 3, velocity: v(-1) },
    ],
  },
  {
    name: 'Different masses',
    key: 't',
    restitution: 1,
    bodies: [
      { position: at(-3), mass: 1, velocity: v(5) },
      { position: at(3), mass: 10, velocity: v(0) },
    ],
  },
  {
    name: 'Zero restitution',
    key: 'y',
    restitution: 0,
    bodies: [
      { position: at(-3), mass: 3, velocity: v(3) },
      { position: at(3), mass: 3, velocity: v(-3) },
    ],
  },
  {
    name: 'Mid restitution',
    key: 'u',
    restitution: 0.5,
    bodies: [
      { position: at(-3), mass: 3, velocity: v(4) },
      { position: at(3), mass: 3, velocity: v(-4) },
    ],
  },
  {
    name: 'Infinite mass',
    key: 'i',
    restitution: 1,
    bodies: [
      { position: at(-3), mass: 3, velocity: v(5) },
      { position: at(3), mass: 0, velocity: v(0) },
    ],
  },
  {
    name: 'Interpenetration',
    key: 'o',
    restitution: 1,
    bodies: [
      { position: at(-0.2), mass: 3, velocity: v(0) },
      { position: at(0.2), mass: 3, velocity: v(0) },
    ],
  },
  {
    name: 'Stabilization',
    key: 'p',
    restitution: 1,
    bodies: [
      { position: at(-1), mass: 3, velocity: v(0.5) },
      { position: at(1), mass: 3, velocity: v(-0.5) },
    ],
  },
];

/** Two particles thrown at each other; each test is a fresh world. */
export class CollisionDemo implements Demo {
  readonly name = 'Collision';
  readonly camera: CameraView = { position: { x: 0, y: 4, z: 9 }, target: { x: 0, y: HEIGHT, z: 0 } };
  readonly actions: DemoAction[] = TESTS.map((test) => ({
    label: test.name,
    key: test.key,
    run: () => this.select(test),
  }));

  private engine!: Engine;
  private scene!: THREE.Scene;
  private ground = new THREE.Group();
  private test: CollisionTest = TESTS[0]!;

  /** Names the running test; the overlay re-reads it after each action. */
  get hint(): string {
    return `${this.test.name}: pick another test above`;
  }

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    this.build();

    this.ground = makeGround(12);
    scene.add(this.ground);
  }

  dispose(): void {
    this.scene.remove(this.ground);
    disposeObject(this.ground);
  }

  private select(test: CollisionTest): void {
    this.test = test;
    this.build();
  }

  /** A new world of two particles (same capacity, so the viewer's spheres stay valid). */
  private build(): void {
    this.engine.createWorld(2, 4);
    this.engine.enableParticleCollisions(this.test.restitution);
    for (const body of this.test.bodies) {
      const p = this.engine.addParticle(body.position, body.mass, 0.99, RADIUS);
      this.engine.setAcceleration(p, { x: 0, y: 0, z: 0 });
      this.engine.setVelocity(p, body.velocity);
    }
  }
}
