import * as THREE from 'three';
import type { Engine } from '../engine';
import { disposeObject, makeGround } from '../render';
import type { Demo, DemoAction } from './demo';

const CAPACITY = 32;
const RADIUS = 0.33;
const STACK_X = 2;

/** Particles coming to rest on the ground and on each other, without bouncing. */
export class RestingDemo implements Demo {
  readonly name = 'Resting';
  readonly hint = 'Zero restitution: a single particle and a stack settle';
  readonly actions: DemoAction[] = [{ label: 'Stack one more', key: 's', run: () => this.stackOne() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private ground = new THREE.Group();
  private stacked = 0;

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, 2 * CAPACITY);
    engine.addGroundPlane(0, 0);
    engine.enableParticleCollisions(0);

    engine.addParticle({ x: -2, y: 5, z: 0 }, 1, 0.99, RADIUS);
    this.stacked = 0;
    for (let i = 0; i < 3; i++) this.stackOne();

    this.ground = makeGround(12);
    scene.add(this.ground);
  }

  dispose(): void {
    this.scene.remove(this.ground);
    disposeObject(this.ground);
  }

  /** Drops a particle above the stack; ignored at capacity. */
  private stackOne(): void {
    const p = this.engine.addParticle({ x: STACK_X, y: 3 + this.stacked, z: 0 }, 1, 0.99, RADIUS);
    if (p >= 0) this.stacked++;
  }
}
