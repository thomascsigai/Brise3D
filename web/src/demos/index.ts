import { BallisticsDemo } from './ballistics';
import { BridgeDemo } from './bridge';
import { BuoyancyDemo } from './buoyancy';
import { CablesDemo } from './cables';
import { ClothDemo } from './cloth';
import { CollisionDemo } from './collision';
import { CubeDemo } from './cube';
import type { Demo } from './demo';
import { ParticlesDemo } from './particles';
import { PileDemo } from './pile';
import { RestingDemo } from './resting';
import { RodsDemo } from './rods';
import { SpringsDemo } from './springs';

/** In overlay order; keys 1-0 select the first ten by position. */
export const demos: Demo[] = [
  new ParticlesDemo(),
  new BallisticsDemo(),
  new SpringsDemo(),
  new BuoyancyDemo(),
  new CollisionDemo(),
  new RestingDemo(),
  new CablesDemo(),
  new RodsDemo(),
  new CubeDemo(),
  new BridgeDemo(),
  new ClothDemo(),
  new PileDemo(),
];
