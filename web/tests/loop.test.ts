import { describe, expect, test } from 'vitest';
import { Loop } from '../src/loop';

describe('Loop', () => {
  test('advances the world by the frame time', () => {
    const loop = new Loop();
    expect(loop.advance(1 / 60)).toBeCloseTo(1 / 60, 6);
  });

  test('clamps a long frame (tab in background) to 0.1 s', () => {
    const loop = new Loop();
    expect(loop.advance(2)).toBe(0.1);
  });

  test('advances nothing while paused, and resumes when toggled back', () => {
    const loop = new Loop();
    loop.togglePause();
    expect(loop.paused).toBe(true);
    expect(loop.advance(1 / 60)).toBe(0);

    loop.togglePause();
    expect(loop.advance(1 / 60)).toBeCloseTo(1 / 60, 6);
  });

  test('at x2 advances twice the (clamped) frame time', () => {
    const loop = new Loop();
    loop.toggleFast();
    expect(loop.fast).toBe(true);
    expect(loop.advance(1 / 60)).toBeCloseTo(2 / 60, 6);
    expect(loop.advance(2)).toBeCloseTo(0.2, 6);
  });
});
