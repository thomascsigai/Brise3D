import * as THREE from 'three';
import type { Engine } from '../engine';
import { disposeObject, makeGround } from '../render';
import type { Demo, DemoAction } from './demo';

const CAPACITY = 200;

/** Particles dropped onto a ground plane, colliding with each other. */
export class ParticlesDemo implements Demo {
  readonly name = 'Particles';
  readonly hint = 'Click or tap the ground to drop a particle';
  readonly actions: DemoAction[] = [{ label: 'Drop', key: 'd', run: () => this.dropRandom() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private ground = new THREE.Group();

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, 2 * CAPACITY);
    engine.addGroundPlane(0, 0.4);
    engine.enableParticleCollisions(0.5);

    this.ground = makeGround(20);
    scene.add(this.ground);

    for (let i = 0; i < 12; i++) this.dropRandom();
  }

  dispose(): void {
    this.scene.remove(this.ground);
    disposeObject(this.ground);
  }

  onGroundPick(point: THREE.Vector3): void {
    this.drop(point.x, point.z);
  }

  private dropRandom(): void {
    this.drop(THREE.MathUtils.randFloatSpread(6), THREE.MathUtils.randFloatSpread(6));
  }

  /** Ignored once the world is at capacity (addParticle returns -1). */
  private drop(x: number, z: number): void {
    const radius = THREE.MathUtils.randFloat(0.15, 0.4);
    this.engine.addParticle({ x, y: 6 + Math.random() * 2, z }, radius * 10, 0.99, radius);
  }
}
