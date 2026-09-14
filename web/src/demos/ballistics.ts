import * as THREE from 'three';
import type { Engine, Vec3Like } from '../engine';
import { disposeObject, makeGround, makeMarker } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

const CAPACITY = 64;
const MUZZLE: Vec3Like = { x: -9, y: 1.5, z: 0 };

interface Round {
  mass: number;
  radius: number;
  velocity: Vec3Like;
  /** Replaces the world gravity for this round. */
  acceleration: Vec3Like;
}

const PISTOL: Round = { mass: 2, radius: 0.1, velocity: { x: 35, y: 0, z: 0 }, acceleration: { x: 0, y: -1, z: 0 } };
const ARTILLERY: Round = { mass: 200, radius: 0.3, velocity: { x: 16, y: 12, z: 0 }, acceleration: { x: 0, y: -20, z: 0 } };
const FIREBALL: Round = { mass: 1, radius: 0.4, velocity: { x: 10, y: 0, z: 0 }, acceleration: { x: 0, y: 0.6, z: 0 } };
const LASER: Round = { mass: 0.1, radius: 0.05, velocity: { x: 100, y: 0, z: 0 }, acceleration: { x: 0, y: 0, z: 0 } };

/** Rounds of different mass, speed and gravity fired from a fixed muzzle. */
export class BallisticsDemo implements Demo {
  readonly name = 'Ballistics';
  readonly hint = 'Fire a round; Reset once the magazine is empty';
  readonly camera: CameraView = { position: { x: 0, y: 8, z: 22 }, target: { x: 0, y: 2, z: 0 } };
  readonly actions: DemoAction[] = [
    { label: 'Pistol', key: 'p', run: () => this.fire(PISTOL) },
    { label: 'Artillery', key: 'a', run: () => this.fire(ARTILLERY) },
    { label: 'Fireball', key: 'f', run: () => this.fire(FIREBALL) },
    { label: 'Laser', key: 'l', run: () => this.fire(LASER) },
  ];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, CAPACITY);
    engine.addGroundPlane(0, 0.2);

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(40));
    this.scenery.add(makeMarker(1.2, 0.4, 0.4, { x: MUZZLE.x - 0.6, y: MUZZLE.y, z: MUZZLE.z }));
    scene.add(this.scenery);
  }

  dispose(): void {
    this.scene.remove(this.scenery);
    disposeObject(this.scenery);
  }

  private fire(round: Round): void {
    const p = this.engine.addParticle(MUZZLE, round.mass, 0.99, round.radius);
    if (p < 0) return;
    this.engine.setVelocity(p, round.velocity);
    this.engine.setAcceleration(p, round.acceleration);
  }
}
