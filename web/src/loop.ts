/** Longest frame the world is asked to simulate; longer ones (a tab in the
 * background) are clamped so the world doesn't try to catch up. */
export const MAX_FRAME_DT = 0.1;

/** Frame-time policy of the viewer: how much simulated time one frame advances. */
export class Loop {
  paused = false;
  /** x2: the world runs at twice real time. */
  fast = false;

  togglePause(): void {
    this.paused = !this.paused;
  }

  toggleFast(): void {
    this.fast = !this.fast;
  }

  /** Simulated seconds to pass to the world for a frame that took frameDt seconds. */
  advance(frameDt: number): number {
    if (this.paused) return 0;
    return Math.min(frameDt, MAX_FRAME_DT) * (this.fast ? 2 : 1);
  }
}
