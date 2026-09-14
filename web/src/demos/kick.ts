import * as THREE from 'three';
import type { Engine } from '../engine';

/** Sets a random velocity on each particle: sideways within +/- spread, upwards between the lifts. */
export function kickRandom(engine: Engine, particles: number[], spread: number, minLift: number, maxLift: number): void {
  for (const p of particles) {
    engine.setVelocity(p, {
      x: THREE.MathUtils.randFloatSpread(spread),
      y: THREE.MathUtils.randFloat(minLift, maxLift),
      z: THREE.MathUtils.randFloatSpread(spread),
    });
  }
}
