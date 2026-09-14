import type { Demo, DemoAction } from './demos/demo';
import type { Loop } from './loop';

export interface OverlayHandlers {
  selectDemo(index: number): void;
  reset(): void;
}

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Overlay: missing #${id}`);
  return el as T;
}

/** The controls over the canvas: demo select, Pause, x2, Reset, demo actions. */
export class Overlay {
  private readonly select = element<HTMLSelectElement>('demo');
  private readonly pause = element<HTMLButtonElement>('pause');
  private readonly fast = element<HTMLButtonElement>('fast');
  private readonly actions = element<HTMLDivElement>('actions');
  private readonly hint = element<HTMLDivElement>('hint');
  private demo?: Demo;

  constructor(
    demos: Demo[],
    private readonly loop: Loop,
    handlers: OverlayHandlers,
  ) {
    demos.forEach((demo, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `${i + 1}. ${demo.name}`;
      this.select.append(option);
    });
    this.select.addEventListener('change', () => {
      handlers.selectDemo(Number(this.select.value));
      this.select.blur();
    });
    this.pause.addEventListener('click', () => this.togglePause());
    this.fast.addEventListener('click', () => this.toggleFast());
    element<HTMLButtonElement>('reset').addEventListener('click', handlers.reset);
    // A clicked button would otherwise keep focus and also activate on Space.
    element<HTMLDivElement>('overlay').addEventListener('click', (event) => {
      if (event.target instanceof HTMLButtonElement) event.target.blur();
    });

    // Desktop shortcuts; the overlay buttons are the touch path.
    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLSelectElement) return;
      if (/^[0-9]$/.test(event.key)) {
        const index = event.key === '0' ? 9 : Number(event.key) - 1;
        if (index < demos.length) handlers.selectDemo(index);
      } else if (event.key === ' ') {
        event.preventDefault();
        this.togglePause();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        this.toggleFast();
      } else if (event.key === 'r') {
        handlers.reset();
      } else {
        const action = this.demo?.actions?.find((action) => action.key === event.key);
        if (action) this.runAction(action);
      }
    });
  }

  /** Runs a demo action and re-reads the hint, which may describe the new state. */
  private runAction(action: DemoAction): void {
    action.run();
    this.hint.textContent = this.demo?.hint ?? '';
  }

  showDemo(index: number, demo: Demo): void {
    this.demo = demo;
    this.select.value = String(index);
    this.hint.textContent = demo.hint ?? '';
    this.actions.replaceChildren(
      ...(demo.actions ?? []).map((action) => {
        const button = document.createElement('button');
        button.textContent = action.key ? `${action.label} (${action.key.toUpperCase()})` : action.label;
        button.addEventListener('click', () => this.runAction(action));
        return button;
      }),
    );
  }

  private togglePause(): void {
    this.loop.togglePause();
    this.pause.textContent = this.loop.paused ? 'Play' : 'Pause';
    this.pause.classList.toggle('active', this.loop.paused);
  }

  private toggleFast(): void {
    this.loop.toggleFast();
    this.fast.classList.toggle('active', this.loop.fast);
  }
}
