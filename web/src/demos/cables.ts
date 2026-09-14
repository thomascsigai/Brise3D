import * as THREE from 'three';
import type { Engine } from '../engine';
import { SegmentLines, disposeObject, makeGround, makeMarker } from '../render';
import type { Demo, DemoAction } from './demo';

const CAPACITY = 8;
const MAX_LENGTH = 3;
const RESTITUTION = 0.3;
const RADIUS = 0.2;

/** A pendulum on a cable, a free pair yanked along, and a hanging chain. */
export class CablesDemo implements Demo {
  readonly name = 'Cables';
  readonly hint = 'Cables only stop their particles from moving apart';
  readonly actions: DemoAction[] = [{ label: 'Kick', key: 'k', run: () => this.kick() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();
  private lines?: SegmentLines;
  private free: number[] = [];

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, 2 * CAPACITY);
    engine.addGroundPlane(0, 0.3);
    const segments: [number, number][] = [];
    const cable = (i: number, j: number) => {
      engine.addCable(i, j, MAX_LENGTH, RESTITUTION);
      segments.push([i, j]);
    };

    // Pendulum: released further from its pivot than the cable allows
    const pivot = engine.addParticle({ x: -5, y: 5, z: 0 }, 0, 1, 0.15);
    const bob = engine.addParticle({ x: -2, y: 2, z: 0 }, 1, 0.99, RADIUS);
    cable(pivot, bob);

    // Free pair with gravity cancelled: the leader drags the follower once taut
    const leader = engine.addParticle({ x: -5, y: 1, z: 3 }, 1, 0.99, RADIUS);
    const follower = engine.addParticle({ x: -2, y: 1, z: 5 }, 1, 0.99, RADIUS);
    engine.setAcceleration(leader, { x: 0, y: 0, z: 0 });
    engine.setAcceleration(follower, { x: 0, y: 0, z: 0 });
    engine.setVelocity(leader, { x: 3, y: 0, z: 0 });
    cable(leader, follower);

    // Chain from a fixed anchor
    const anchor = engine.addParticle({ x: 4, y: 5, z: 0 }, 0, 1, 0.15);
    const middle = engine.addParticle({ x: 6, y: 3, z: 0 }, 1, 0.99, RADIUS);
    const end = engine.addParticle({ x: 8, y: 5, z: 0 }, 1, 0.99, RADIUS);
    cable(anchor, middle);
    cable(middle, end);

    this.free = [bob, middle, end];

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(20));
    this.scenery.add(makeMarker(0.3, 0.3, 0.3, { x: -5, y: 5, z: 0 }));
    this.scenery.add(makeMarker(0.3, 0.3, 0.3, { x: 4, y: 5, z: 0 }));
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
    for (const p of this.free) {
      this.engine.setVelocity(p, {
        x: THREE.MathUtils.randFloatSpread(6),
        y: THREE.MathUtils.randFloat(2, 6),
        z: THREE.MathUtils.randFloatSpread(6),
      });
    }
  }
}
