import * as THREE from 'three';
import type { Engine } from '../engine';
import { SegmentLines, disposeObject, makeGround, makeMarker } from '../render';
import type { Demo, DemoAction } from './demo';
import { kickRandom } from './kick';

const CAPACITY = 8;
const LENGTH = 3;
const RADIUS = 0.2;
const PIVOT = { x: 0, y: 4, z: 0 };
const HOOK = { x: 6, y: 4, z: 0 };

/** A free pair tumbling in space, a pendulum on a rod, and a double pendulum. */
export class RodsDemo implements Demo {
  readonly name = 'Rods';
  readonly hint = 'Rods keep their particles at a fixed distance';
  readonly actions: DemoAction[] = [{ label: 'Kick', key: 'k', run: () => this.kick() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();
  private lines?: SegmentLines;
  private kicked: number[] = [];

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, 2 * CAPACITY);
    engine.addGroundPlane(0, 0.3);
    const segments: [number, number][] = [];
    const rod = (i: number, j: number) => {
      engine.addRod(i, j, LENGTH);
      segments.push([i, j]);
    };

    // Free pair with gravity cancelled: one end is pushed, the rod turns the pair
    const head = engine.addParticle({ x: -6, y: 4, z: 0 }, 1, 0.99, RADIUS);
    const tail = engine.addParticle({ x: -7, y: 1, z: 0 }, 1, 0.99, RADIUS);
    engine.setAcceleration(head, { x: 0, y: 0, z: 0 });
    engine.setAcceleration(tail, { x: 0, y: 0, z: 0 });
    engine.setVelocity(tail, { x: 0, y: -1, z: 0 });
    rod(head, tail);

    // Pendulum released horizontally
    const pivot = engine.addParticle(PIVOT, 0, 1, 0.15);
    const bob = engine.addParticle({ x: 3, y: 4, z: 0 }, 1, 0.99, RADIUS);
    rod(pivot, bob);

    // Double pendulum from an infinite-mass hook
    const hook = engine.addParticle(HOOK, 0, 1, 0.15);
    const upper = engine.addParticle({ x: 8, y: 6, z: 1 }, 0.5, 0.99, RADIUS);
    const lower = engine.addParticle({ x: 8, y: 9, z: 1 }, 0.5, 0.99, RADIUS);
    rod(hook, upper);
    rod(upper, lower);

    this.kicked = [head, tail, bob, upper, lower];

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(20));
    this.scenery.add(makeMarker(0.3, 0.3, 0.3, PIVOT));
    this.scenery.add(makeMarker(0.3, 0.3, 0.3, HOOK));
    this.lines = new SegmentLines(segments);
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

  private kick(): void {
    kickRandom(this.engine, this.kicked, 4, 1, 4);
  }
}
