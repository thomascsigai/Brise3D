/** The last `window` samples of one profiler measurement, oldest first. */
export class Series {
  private readonly samples: number[] = [];

  constructor(readonly window: number) {}

  push(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.window) this.samples.shift();
  }

  get latest(): number {
    return this.samples.length ? this.samples[this.samples.length - 1]! : 0;
  }

  get average(): number {
    if (!this.samples.length) return 0;
    return this.samples.reduce((sum, v) => sum + v, 0) / this.samples.length;
  }

  get max(): number {
    return this.samples.length ? Math.max(...this.samples) : 0;
  }

  values(): readonly number[] {
    return this.samples;
  }
}
