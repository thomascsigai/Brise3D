import * as THREE from 'three';
import type { Engine } from '../engine';
import { SegmentLines, disposeObject, makeGround } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

/** Particles per side of the sheet. */
export const SIZE = 10;
/** Distance between neighbouring particles along a row or a column. */
const SPACING = 0.4;
const RADIUS = 0.08;
const PIN_HEIGHT = 4;
const RESTITUTION = 0.1;
const START_X = (-(SIZE - 1) * SPACING) / 2;
const GUST = new THREE.Vector3(0, 1, 4);

export interface Rod {
  segment: [number, number];
  length: number;
  /** A diagonal of a cell, there to stop shearing; not drawn. */
  shear: boolean;
}

/** A rod of this world, removed by its link id when its pin is released. */
interface PlacedRod extends Rod {
  id: number;
}

/** Particle index of the sheet's row r, column c; row 0 is the pinned edge. */
function particle(row: number, col: number): number {
  return row * SIZE + col;
}

/**
 * Rods between neighbours along rows and columns hold the sheet together;
 * the two diagonals of every cell stop it from shearing into a rhombus.
 */
function buildRods(): Rod[] {
  const rods: Rod[] = [];
  const rod = (a: number, b: number, length: number, shear: boolean) => rods.push({ segment: [a, b], length, shear });
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE) rod(particle(r, c), particle(r, c + 1), SPACING, false);
      if (r + 1 < SIZE) rod(particle(r, c), particle(r + 1, c), SPACING, false);
      if (r + 1 < SIZE && c + 1 < SIZE) {
        rod(particle(r, c), particle(r + 1, c + 1), SPACING * Math.SQRT2, true);
        rod(particle(r, c + 1), particle(r + 1, c), SPACING * Math.SQRT2, true);
      }
    }
  }
  return rods;
}

/**
 * A sheet of particles held together by rods, pinned along its top edge over
 * the ground. Hanging from the two corners alone would load six rods with
 * the whole sheet, more than the contact resolver holds within its budget.
 */
export class ClothDemo implements Demo {
  static readonly RODS: Rod[] = buildRods();
  /** Row 0, at infinite mass: the edge the sheet hangs from. */
  static readonly PINS: number[] = Array.from({ length: SIZE }, (_, c) => particle(0, c));

  readonly name = 'Cloth';
  readonly hint = 'A sheet of rods pinned along its top edge; particle collisions are off';
  readonly camera: CameraView = { position: { x: 5, y: 4.5, z: 8 }, target: { x: 0, y: 2, z: 1 } };
  readonly actions: DemoAction[] = [
    { label: 'Unpin', key: 'u', run: () => this.unpin() },
    { label: 'Gust', key: 'g', run: () => this.gust() },
  ];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private scenery = new THREE.Group();
  private lines?: SegmentLines;
  /** The rods still in place: unpinning removes the ones on the released pin. */
  private rods: PlacedRod[] = [];
  private pinned: number[] = [];

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    // One contact per rod plus one per particle on the ground; no particle
    // collisions, which would test every pair.
    engine.createWorld(SIZE * SIZE, ClothDemo.RODS.length + SIZE * SIZE);
    engine.addGroundPlane(0, RESTITUTION);

    // The sheet starts flat at pin height and swings down as it falls. It
    // hangs clear of the ground: rods crumpled on the ground stay stretched
    // for seconds at a time, more than the contact resolver's budget mends.
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const mass = r === 0 ? 0 : 1;
        engine.addParticle({ x: START_X + c * SPACING, y: PIN_HEIGHT, z: r * SPACING }, mass, 0.98, RADIUS);
      }
    }
    this.rods = ClothDemo.RODS.map((rod) => ({ ...rod, id: engine.addRod(rod.segment[0], rod.segment[1], rod.length) }));
    this.pinned = [...ClothDemo.PINS];

    this.scenery = new THREE.Group();
    this.scenery.add(makeGround(12));
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

  /** Removes every rod on the last pin still holding the sheet, which peels off from that end. */
  private unpin(): void {
    const pin = this.pinned.pop();
    if (pin === undefined) return;
    for (const rod of this.rods) {
      if (rod.segment.includes(pin)) this.engine.removeLink(rod.id);
    }
    this.rods = this.rods.filter((rod) => !rod.segment.includes(pin));
    this.rebuildLines();
  }

  /** A puff of wind: every free particle is sent the same way, give or take. */
  private gust(): void {
    for (let i = SIZE; i < SIZE * SIZE; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.5).add(GUST);
      this.engine.setVelocity(i, v);
    }
  }

  /** The drawn segments are the rods still in place, so the lines are rebuilt on an unpin. */
  private rebuildLines(): void {
    if (this.lines) {
      this.scenery.remove(this.lines.lines);
      this.lines.dispose();
    }
    this.lines = new SegmentLines(this.rods.filter((rod) => !rod.shear).map((rod) => rod.segment));
    this.lines.update(this.engine.positions());
    this.scenery.add(this.lines.lines);
  }
}
