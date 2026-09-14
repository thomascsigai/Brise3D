import * as THREE from 'three';
import type { Engine } from '../engine';
import { SegmentLines, disposeObject, makeGround, makeMarker, type SegmentEnd } from '../render';
import type { Demo, DemoAction } from './demo';
import { kickRandom } from './kick';

const CAPACITY = 16;
const TOP = 5;
const SPRING_CONSTANT = 15;
const BOB_DAMPING = 0.9;
const ANCHOR = { x: 0, y: TOP, z: 0 };

/** A spring chain, an anchored spring and a bungee hanging side by side. */
export class SpringsDemo implements Demo {
  readonly name = 'Springs';
  readonly hint = 'Spring chain, anchored spring, bungee';
  readonly actions: DemoAction[] = [{ label: 'Kick', key: 'k', run: () => this.kick() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();
  private lines?: SegmentLines;
  private bobs: number[] = [];

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, 2 * CAPACITY);
    engine.addGroundPlane(0, 0.3);
    const segments: [SegmentEnd, SegmentEnd][] = [];

    // Spring: pivot -> bob -> bob, each spring acting on both ends
    const pivot = engine.addParticle({ x: -3, y: TOP, z: 0 }, 0, 1, 0.15);
    const upper = engine.addParticle({ x: -3, y: TOP - 1.5, z: 0 }, 1, BOB_DAMPING, 0.2);
    const lower = engine.addParticle({ x: -3, y: TOP - 3, z: 0 }, 1, BOB_DAMPING, 0.2);
    engine.addSpring(pivot, upper, SPRING_CONSTANT, 1);
    engine.addSpring(upper, lower, SPRING_CONSTANT, 1);
    segments.push([pivot, upper], [upper, lower]);

    // Anchored spring: the anchor is a point, not a particle
    const hanging = engine.addParticle({ x: 0, y: TOP - 2.5, z: 0 }, 1, BOB_DAMPING, 0.2);
    engine.addAnchoredSpring(hanging, ANCHOR, SPRING_CONSTANT, 1);
    segments.push([ANCHOR, hanging]);

    // Bungee: slack until stretched past its rest length, then pulls back
    const hook = engine.addParticle({ x: 3, y: TOP, z: 0 }, 0, 1, 0.15);
    const jumper = engine.addParticle({ x: 3, y: TOP - 0.5, z: 0 }, 1, BOB_DAMPING, 0.2);
    engine.addBungee(hook, jumper, SPRING_CONSTANT, 1.5);
    segments.push([hook, jumper]);

    this.bobs = [upper, lower, hanging, jumper];

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(16));
    this.scenery.add(makeMarker(0.3, 0.3, 0.3, ANCHOR));
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
    kickRandom(this.engine, this.bobs, 6, 2, 6);
  }
}
