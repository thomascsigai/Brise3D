import * as THREE from 'three';
import type { Engine, Vec3Like } from '../engine';
import { disposeObject, makeGround } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

const RADIUS = 0.35;
/** Height of the collision line above the ground grid. */
const HEIGHT = 1.5;

interface ThrownParticle {
  position: Vec3Like;
  /** 0 is infinite mass. */
  mass: number;
  velocity: Vec3Like;
}

/** One of the collision cases of the original 2D viewer; each is a fresh world. */
interface Scenario {
  name: string;
  key: string;
  restitution: number;
  particles: [ThrownParticle, ThrownParticle];
}

const onLine = (x: number, z = 0): Vec3Like => ({ x, y: HEIGHT, z });
const velocity = (x: number, y = 0, z = 0): Vec3Like => ({ x, y, z });

// Two particles on a collision course with gravity cancelled. The keys
// follow the Q, W, E... row of the 2D viewer, skipping R (Reset).
const SCENARIOS: Scenario[] = [
  {
    name: 'Simple collision',
    key: 'q',
    restitution: 1,
    particles: [
      { position: onLine(-3), mass: 3, velocity: velocity(2) },
      { position: onLine(3), mass: 3, velocity: velocity(-2) },
    ],
  },
  {
    name: 'Non-linear contact',
    key: 'w',
    restitution: 1,
    particles: [
      { position: onLine(-3, -1), mass: 3, velocity: velocity(2, 0, 1) },
      { position: onLine(3), mass: 3, velocity: velocity(-2) },
    ],
  },
  {
    name: 'Different speeds',
    key: 'e',
    restitution: 1,
    particles: [
      { position: onLine(-3), mass: 3, velocity: velocity(5) },
      { position: onLine(3), mass: 3, velocity: velocity(-1) },
    ],
  },
  {
    name: 'Different masses',
    key: 't',
    restitution: 1,
    particles: [
      { position: onLine(-3), mass: 1, velocity: velocity(5) },
      { position: onLine(3), mass: 10, velocity: velocity(0) },
    ],
  },
  {
    name: 'Zero restitution',
    key: 'y',
    restitution: 0,
    particles: [
      { position: onLine(-3), mass: 3, velocity: velocity(3) },
      { position: onLine(3), mass: 3, velocity: velocity(-3) },
    ],
  },
  {
    name: 'Mid restitution',
    key: 'u',
    restitution: 0.5,
    particles: [
      { position: onLine(-3), mass: 3, velocity: velocity(4) },
      { position: onLine(3), mass: 3, velocity: velocity(-4) },
    ],
  },
  {
    name: 'Infinite mass',
    key: 'i',
    restitution: 1,
    particles: [
      { position: onLine(-3), mass: 3, velocity: velocity(5) },
      { position: onLine(3), mass: 0, velocity: velocity(0) },
    ],
  },
  {
    name: 'Interpenetration',
    key: 'o',
    restitution: 1,
    particles: [
      { position: onLine(-0.2), mass: 3, velocity: velocity(0) },
      { position: onLine(0.2), mass: 3, velocity: velocity(0) },
    ],
  },
  {
    name: 'Stabilization',
    key: 'p',
    restitution: 1,
    particles: [
      { position: onLine(-1), mass: 3, velocity: velocity(0.5) },
      { position: onLine(1), mass: 3, velocity: velocity(-0.5) },
    ],
  },
];

/** Two particles thrown at each other, in the scenario picked from the overlay. */
export class CollisionDemo implements Demo {
  readonly name = 'Collision';
  readonly camera: CameraView = { position: { x: 0, y: 4, z: 9 }, target: { x: 0, y: HEIGHT, z: 0 } };
  readonly actions: DemoAction[] = SCENARIOS.map((scenario) => ({
    label: scenario.name,
    key: scenario.key,
    run: () => this.select(scenario),
  }));

  private engine!: Engine;
  private scene!: THREE.Scene;
  private ground = new THREE.Group();
  private scenario: Scenario = SCENARIOS[0]!;

  /** Names the running scenario; the overlay re-reads it after each action. */
  get hint(): string {
    return `${this.scenario.name}: pick another scenario above`;
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

  private select(scenario: Scenario): void {
    this.scenario = scenario;
    this.build();
  }

  /** A new world of two particles (same capacity, so the viewer's spheres stay valid). */
  private build(): void {
    this.engine.createWorld(2, 4);
    this.engine.enableParticleCollisions(this.scenario.restitution);
    for (const thrown of this.scenario.particles) {
      const p = this.engine.addParticle(thrown.position, thrown.mass, 0.99, RADIUS);
      this.engine.setAcceleration(p, { x: 0, y: 0, z: 0 });
      this.engine.setVelocity(p, thrown.velocity);
    }
  }
}
