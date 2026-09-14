import * as THREE from 'three';
import type { Engine } from '../engine';
import { SegmentLines, disposeObject, makeGround } from '../render';
import type { Demo, DemoAction } from './demo';

const CORNERS = 8;
/** Edge length of the cube. */
export const EDGE = 1.5;
const RADIUS = 0.12;
const START = new THREE.Vector3(0, 3, 0);
/** Tilted so the cube lands on a corner rather than flat on a face. */
const START_TILT = new THREE.Euler(0.4, 0.3, 0.5);

/** Corner i has x, y, z at +/- half the edge according to the bits of i. */
function corner(i: number): THREE.Vector3 {
  const half = EDGE / 2;
  return new THREE.Vector3(i & 1 ? half : -half, i & 2 ? half : -half, i & 4 ? half : -half);
}

function pairs(): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < CORNERS; i++) for (let j = i + 1; j < CORNERS; j++) result.push([i, j]);
  return result;
}

/** A cube of eight particles held rigid by rods, dropped onto the ground. */
export class CubeDemo implements Demo {
  /** The twelve edges: corner pairs that differ in exactly one coordinate. */
  static readonly EDGES: [number, number][] = pairs().filter(([i, j]) => [1, 2, 4].includes(i ^ j));

  readonly name = 'Cube';
  readonly hint = 'Every pair of corners is joined by a rod, so the cube is rigid';
  readonly actions: DemoAction[] = [{ label: 'Toss', key: 't', run: () => this.toss() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();
  private lines?: SegmentLines;

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CORNERS, 64);
    engine.addGroundPlane(0, 0.2);

    for (let i = 0; i < CORNERS; i++) {
      engine.addParticle(corner(i).applyEuler(START_TILT).add(START), 1, 0.99, RADIUS);
    }
    // Rods along the edges alone leave the cube free to shear; the face and
    // space diagonals make it rigid.
    for (const [i, j] of pairs()) engine.addRod(i, j, corner(i).distanceTo(corner(j)));

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(12));
    this.lines = new SegmentLines(CubeDemo.EDGES);
    this.scenery.add(this.lines.lines);
    scene.add(this.scenery);
  }

  update(): void {
    this.lines?.update(this.engine.positions());
  }

  dispose(): void {
    this.scene.remove(this.scenery);
    disposeObject(this.scenery);
    this.lines = undefined;
  }

  /** Throws the cube up with a spin: each corner gets v + omega x r. */
  private toss(): void {
    const positions = this.engine.positions();
    const centre = new THREE.Vector3();
    for (let i = 0; i < CORNERS; i++) centre.add(new THREE.Vector3().fromArray(positions, 3 * i));
    centre.divideScalar(CORNERS);

    const linear = new THREE.Vector3(THREE.MathUtils.randFloatSpread(2), 6, THREE.MathUtils.randFloatSpread(2));
    const spin = new THREE.Vector3().randomDirection().multiplyScalar(4);
    for (let i = 0; i < CORNERS; i++) {
      const arm = new THREE.Vector3().fromArray(positions, 3 * i).sub(centre);
      this.engine.setVelocity(i, arm.cross(spin).negate().add(linear));
    }
  }
}
