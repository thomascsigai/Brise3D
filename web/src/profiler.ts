import { Series } from './series';

/** What one frame cost and what the engine did in it. Times are in ms. */
export interface FrameSample {
  /** Interval between this frame and the previous one. */
  frame: number;
  /** Time spent in world_update. */
  engine: number;
  /** CPU time spent submitting the render (GPU time is not measurable). */
  render: number;
  steps: number;
  particles: number;
  contacts: number;
  maxContacts: number;
  iterationsUsed: number;
  iterations: number;
}

/** Samples kept for the averages, the maxima and the graph (~2 s at 60 fps). */
export const WINDOW = 120;
/** The text is refreshed this often (ms); every frame would be unreadable. */
export const TEXT_INTERVAL = 250;
/** Top of the graph (ms); taller frames are clipped, the rolling max still reports them. */
export const GRAPH_MAX = 50;
const GUIDES = [1000 / 60, 1000 / 30];

const COLORS = { engine: '#f2a541', render: '#5aa9e6', rest: '#3a4250', guide: '#6b7280' };

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Profiler: missing #${id}`);
  return el as T;
}

const ms = (series: Series) => `${series.latest.toFixed(1)} / ${series.average.toFixed(1)} / ${series.max.toFixed(1)}`;

/**
 * The profiler panel: a stacked graph of engine + render + rest per frame,
 * fill bars for the contact and iteration budgets, and the numbers as text.
 * Samples are recorded whether or not the panel is shown, so it is up to
 * date the moment it appears.
 */
export class Profiler {
  visible = false;

  private readonly panel = element<HTMLDivElement>('profiler');
  private readonly canvas = element<HTMLCanvasElement>('profiler-graph');
  private readonly context = this.canvas.getContext('2d')!;
  private readonly timing = element<HTMLDivElement>('profiler-timing');
  private readonly counts = element<HTMLDivElement>('profiler-counts');
  private readonly contacts = element<HTMLDivElement>('profiler-contacts');
  private readonly iterations = element<HTMLDivElement>('profiler-iterations');

  private readonly frame = new Series(WINDOW);
  private readonly engine = new Series(WINDOW);
  private readonly render = new Series(WINDOW);
  private textAt = -Infinity;

  toggle(): void {
    this.visible = !this.visible;
    this.panel.hidden = !this.visible;
    if (this.visible) this.textAt = -Infinity;
  }

  /** Records the frame that just ran; `now` is the frame timestamp (ms). */
  record(sample: FrameSample, now: number): void {
    this.frame.push(sample.frame);
    this.engine.push(sample.engine);
    this.render.push(sample.render);
    if (!this.visible) return;

    this.drawGraph();
    if (now - this.textAt >= TEXT_INTERVAL) {
      this.textAt = now;
      this.writeText(sample);
    }
  }

  private writeText(sample: FrameSample): void {
    const fps = this.frame.average > 0 ? Math.round(1000 / this.frame.average) : 0;
    this.timing.textContent = [
      `${fps} fps`,
      `frame  ${ms(this.frame)} ms`,
      `engine ${ms(this.engine)} ms`,
      `render ${ms(this.render)} ms`,
    ].join('\n');
    this.counts.textContent = `${sample.steps} steps · ${sample.particles} particles`;
    fill(this.contacts, 'contacts', sample.contacts, sample.maxContacts);
    fill(this.iterations, 'iterations', sample.iterationsUsed, sample.iterations);
  }

  private drawGraph(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    const scale = height / GRAPH_MAX;
    const column = width / WINDOW;
    const frames = this.frame.values();
    const engines = this.engine.values();
    const renders = this.render.values();

    // Newest sample on the right, so the graph fills in from the right
    const offset = WINDOW - frames.length;
    for (let i = 0; i < frames.length; i++) {
      const x = (offset + i) * column;
      const frame = Math.min(frames[i]!, GRAPH_MAX);
      const engine = Math.min(engines[i]!, frame);
      const render = Math.min(renders[i]!, frame - engine);
      let y = height;
      for (const [value, color] of [
        [engine, COLORS.engine],
        [render, COLORS.render],
        [frame - engine - render, COLORS.rest],
      ] as const) {
        const h = value * scale;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - h, Math.ceil(column), h);
        y -= h;
      }
    }

    ctx.strokeStyle = COLORS.guide;
    ctx.lineWidth = dpr;
    for (const guide of GUIDES) {
      const y = Math.round(height - guide * scale) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}

/** A labelled fill bar: "<label> used / budget" over a bar filled to that ratio. */
function fill(bar: HTMLDivElement, label: string, used: number, budget: number): void {
  const ratio = budget > 0 ? Math.min(used / budget, 1) : 0;
  bar.style.setProperty('--fill', `${(ratio * 100).toFixed(1)}%`);
  bar.classList.toggle('full', budget > 0 && used >= budget);
  bar.textContent = `${label} ${used} / ${budget}`;
}
