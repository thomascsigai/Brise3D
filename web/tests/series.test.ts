import { describe, expect, test } from 'vitest';
import { Series } from '../src/series';

describe('Series', () => {
  test('is empty before the first sample', () => {
    const series = new Series(3);
    expect(series.latest).toBe(0);
    expect(series.average).toBe(0);
    expect(series.max).toBe(0);
    expect(series.values()).toEqual([]);
  });

  test('summarises the samples it holds', () => {
    const series = new Series(3);
    series.push(4);
    series.push(1);

    expect(series.latest).toBe(1);
    expect(series.average).toBe(2.5);
    expect(series.max).toBe(4);
    expect(series.values()).toEqual([4, 1]);
  });

  test('forgets the oldest sample once full', () => {
    const series = new Series(3);
    [9, 2, 3, 5].forEach((v) => series.push(v));

    expect(series.values()).toEqual([2, 3, 5]);
    expect(series.max).toBe(5);
    expect(series.average).toBeCloseTo(10 / 3, 6);
  });
});
