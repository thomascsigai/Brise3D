import * as THREE from 'three';
import type { Engine } from '../engine';
import { disposeObject, makeGround } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

const CAPACITY = 8;
const POOL_SIZE = 12;
/** The liquid surface; the ground plane at y = 0 is the pool floor. */
export const WATER_HEIGHT = 1.5;
const RADIUS = 0.4;
const DROP_HEIGHT = 4;

interface Floater {
  x: number;
  mass: number;
  /** Displaced volume in m^3; the upthrust is liquidDensity * volume once submerged. */
  volume: number;
}

// Water at 1000 kg/m^3: the light one floats high, the medium one half out,
// the heavy one (49 N of weight against 10 N of upthrust) sinks.
const FLOATERS: Floater[] = [
  { x: -3, mass: 0.5, volume: 0.006 },
  { x: 0, mass: 1, volume: 0.02 },
  { x: 3, mass: 5, volume: 0.01 },
];

/** Three particles of different mass and volume dropped into a pool. */
export class BuoyancyDemo implements Demo {
  readonly name = 'Buoyancy';
  readonly hint = 'Light, medium and heavy particles dropped into water';
  readonly camera: CameraView = { position: { x: 4, y: 4, z: 10 }, target: { x: 0, y: 1.5, z: 0 } };
  readonly actions: DemoAction[] = [{ label: 'Dunk', key: 'd', run: () => this.dunk() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, CAPACITY);
    engine.addGroundPlane(0, 0.2);

    for (const floater of FLOATERS) {
      const p = engine.addParticle({ x: floater.x, y: DROP_HEIGHT, z: 0 }, floater.mass, 0.6, RADIUS);
      engine.addBuoyancy(p, RADIUS, floater.volume, WATER_HEIGHT, 1000);
    }

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(POOL_SIZE));
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(POOL_SIZE, POOL_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x3a86c8, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = WATER_HEIGHT;
    this.scenery.add(water);
    scene.add(this.scenery);
  }

  dispose(): void {
    this.scene.remove(this.scenery);
    disposeObject(this.scenery);
  }

  /** Pushes every particle down so the floaters bob back up. */
  private dunk(): void {
    for (let i = 0; i < this.engine.particleCount(); i++) this.engine.setVelocity(i, { x: 0, y: -6, z: 0 });
  }
}
