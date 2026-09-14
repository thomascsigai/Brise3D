import type * as THREE from 'three';
import type { Engine } from '../engine';

/** A button in the overlay (and a key on desktop) that acts on the demo. */
export interface DemoAction {
  label: string;
  /** Single lowercase character, matched against KeyboardEvent.key. */
  key?: string;
  run(): void;
}

/** Where the viewer puts the camera when the demo is selected. */
export interface CameraView {
  position: THREE.Vector3Like;
  target: THREE.Vector3Like;
}

/**
 * A scene that exercises one feature of the engine. `create` builds a new
 * world in the engine and adds the demo's scenery to the scene; the viewer
 * draws every particle as a sphere. Reset disposes and creates again.
 */
export interface Demo {
  readonly name: string;
  /** One line shown in the overlay. */
  readonly hint?: string;
  readonly camera?: CameraView;
  readonly actions?: DemoAction[];

  create(engine: Engine, scene: THREE.Scene): void;
  /** Called every frame after the world has been updated. */
  update?(): void;
  dispose(): void;
  /** A tap or click on the ground plane at y = 0 (not a drag). */
  onGroundPick?(point: THREE.Vector3): void;
}
