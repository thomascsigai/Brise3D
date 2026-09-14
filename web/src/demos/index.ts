import { BallisticsDemo } from './ballistics';
import type { Demo } from './demo';
import { ParticlesDemo } from './particles';
import { SpringsDemo } from './springs';

/** In overlay order; keys 1-0 select by position. */
export const demos: Demo[] = [new ParticlesDemo(), new BallisticsDemo(), new SpringsDemo()];
