import * as THREE from 'three';
import type { Engine } from '../engine';
import { SegmentLines, disposeObject, makeGround, makeMarker } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

const SEGMENTS = 10;
const SEGMENT_LENGTH = 1.2;
const DECK_HEIGHT = 4;
const RESTITUTION = 0.2;
const RADIUS = 0.15;
const START_X = (-(SEGMENTS - 1) * SEGMENT_LENGTH) / 2;

interface Cable {
  id: number;
  segment: [number, number];
}

/** A deck of particles hung between two towers by cables that can be broken. */
export class BridgeDemo implements Demo {
  readonly name = 'Bridge';
  readonly hint = 'Break a cable and watch the deck drop';
  readonly camera: CameraView = { position: { x: 2, y: 5, z: 12 }, target: { x: 0, y: 2.5, z: 0 } };
  readonly actions: DemoAction[] = [{ label: 'Break cable', key: 'b', run: () => this.breakCable() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();
  private lines?: SegmentLines;
  private cables: Cable[] = [];

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(SEGMENTS, 2 * SEGMENTS);
    engine.addGroundPlane(0, 0.2);

    // The two ends are the towers: infinite mass
    const deck: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const isTower = i === 0 || i === SEGMENTS - 1;
      deck.push(engine.addParticle({ x: START_X + i * SEGMENT_LENGTH, y: DECK_HEIGHT, z: 0 }, isTower ? 0 : 1, 0.99, RADIUS));
    }
    this.cables = [];
    for (let i = 0; i < SEGMENTS - 1; i++) {
      const segment: [number, number] = [deck[i]!, deck[i + 1]!];
      this.cables.push({ id: engine.addCable(segment[0], segment[1], SEGMENT_LENGTH, RESTITUTION), segment });
    }

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(16));
    for (const x of [START_X, -START_X]) {
      this.scenery.add(makeMarker(0.4, DECK_HEIGHT, 0.4, { x, y: DECK_HEIGHT / 2, z: 0 }));
    }
    this.rebuildLines();
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

  /** Removes the cable in the middle of those left; nothing once they are all gone. */
  private breakCable(): void {
    if (this.cables.length === 0) return;
    const [broken] = this.cables.splice(Math.floor(this.cables.length / 2), 1);
    this.engine.removeLink(broken!.id);
    this.rebuildLines();
  }

  /** The drawn segments are the live cables, so the lines are rebuilt on a break. */
  private rebuildLines(): void {
    if (this.lines) {
      this.scenery.remove(this.lines.lines);
      this.lines.dispose();
    }
    this.lines = new SegmentLines(this.cables.map((cable) => cable.segment));
    this.lines.update(this.engine.positions());
    this.scenery.add(this.lines.lines);
  }
}
