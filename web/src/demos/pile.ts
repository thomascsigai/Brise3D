import * as THREE from 'three';
import type { Engine } from '../engine';
import { disposeObject, makeGround } from '../render';
import type { CameraView, Demo, DemoAction } from './demo';

export const CAPACITY = 2000;
/** Particles added by the initial drop and by each +BATCH. */
export const BATCH = 100;
export const RADIUS = 0.2;
/** Particles per side of a layer of the column. */
const SIDE = 4;
const SPACING = 2.2 * RADIUS;
/** Height of the bottom layer of a dropped batch above the ground. */
const DROP_HEIGHT = 6;
/** The x and z of the column's first grid point, so the column is centred. */
const GRID_START = (-(SIDE - 1) * SPACING) / 2;
/**
 * Damping is per second (velocity × damping^dt), so 0.1 stops a sliding
 * particle within a second or so; at the usual 0.99 the particles skate
 * away over the ground plane for good.
 */
const DAMPING = 0.1;
/** The centre of the ground, which every particle's anchored spring pulls it to. */
const ANCHOR = { x: 0, y: 0, z: 0 };
const ANCHOR_SPRING = 1;

function jitter(): number {
  return (Math.random() - 0.5) * RADIUS;
}

/**
 * A pile of colliding particles that grows in batches, there to load the
 * engine while the Profiler is open: the pair test of particle collision
 * is O(n²), and the contact budget of 2 × capacity saturates well before
 * the world is full.
 *
 * The engine has no friction, so a heap of particles would flatten into a
 * single layer; a weak anchored spring per particle towards the centre of
 * the ground stands in for it and keeps the pile a mound.
 */
export class PileDemo implements Demo {
  readonly name = 'Pile';
  readonly camera: CameraView = { position: { x: 0, y: 7, z: 14 }, target: { x: 0, y: 1, z: 0 } };
  readonly actions: DemoAction[] = [{ label: `+${BATCH}`, key: 'x', run: () => this.drop() }];

  private engine!: Engine;
  private scene!: THREE.Scene;
  private ground = new THREE.Group();

  /** The count against the capacity; the overlay re-reads it after each action. */
  get hint(): string {
    return `${this.engine.particleCount()} / ${this.engine.capacity()} particles; +${BATCH} drops another batch`;
  }

  create(engine: Engine, scene: THREE.Scene): void {
    this.engine = engine;
    this.scene = scene;
    engine.createWorld(CAPACITY, 2 * CAPACITY);
    engine.addGroundPlane(0, 0);
    engine.enableParticleCollisions(0);
    this.drop();

    this.ground = makeGround(12);
    scene.add(this.ground);
  }

  dispose(): void {
    this.scene.remove(this.ground);
    disposeObject(this.ground);
  }

  /**
   * Drops a batch in a column above the pile, layer by layer, each particle
   * nudged off its grid point so the column tumbles into a heap instead of
   * landing as a stack. Stops at capacity.
   */
  private drop(): void {
    for (let i = 0; i < BATCH; i++) {
      const layer = Math.floor(i / (SIDE * SIDE));
      const row = Math.floor(i / SIDE) % SIDE;
      const col = i % SIDE;
      const position = {
        x: GRID_START + col * SPACING + jitter(),
        y: DROP_HEIGHT + layer * SPACING,
        z: GRID_START + row * SPACING + jitter(),
      };
      const p = this.engine.addParticle(position, 1, DAMPING, RADIUS);
      if (p < 0) return;
      this.engine.addAnchoredSpring(p, ANCHOR, ANCHOR_SPRING, 0);
    }
  }
}
