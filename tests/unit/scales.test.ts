import { describe, expect, it } from 'vitest';
import { BLUE_RAMP, MARGIN_EDGES, NEUTRAL_COLOR, RED_RAMP, binColor, binIndex, colorFor, marginBins } from '../../src/domain/scales.ts';

describe('margin scale', () => {
  it('puts zero and small values in the neutral bin', () => {
    expect(binIndex(0)).toBe(0);
    expect(binIndex(0.99)).toBe(0);
    expect(binIndex(-0.99)).toBe(0);
    expect(colorFor(0)).toBe(NEUTRAL_COLOR);
  });
  it('is symmetric: v and -v land in mirrored bins', () => {
    for (const v of [0.5, 1, 2.9, 3, 5.99, 6, 12, 15, 24.9, 25, 60]) {
      expect(binIndex(-v)).toBe(0 - binIndex(v));
    }
  });
  it('sends edge values to the larger bin', () => {
    expect(binIndex(1)).toBe(1);
    expect(binIndex(25)).toBe(6);
    expect(binIndex(-25)).toBe(-6);
  });
  it('puts +23.18 (Collin) in the +15 to +25 bin', () => {
    expect(binIndex(23.18)).toBe(5);
    expect(colorFor(23.18)).toBe(BLUE_RAMP[4]);
  });
  it('uses blue for positive and red for negative', () => {
    expect(binColor(1)).toBe(BLUE_RAMP[0]);
    expect(binColor(-1)).toBe(RED_RAMP[0]);
  });
  it('builds 13 symmetric legend bins with distinct colors', () => {
    const bins = marginBins();
    expect(bins).toHaveLength(2 * MARGIN_EDGES.length + 1);
    expect(new Set(bins.map((b) => b.color)).size).toBe(bins.length);
    expect(bins[0]!.label).toBe('−25 or more');
    expect(bins[6]!.label).toBe('−1 to +1');
    expect(bins[12]!.label).toBe('+25 or more');
    expect(bins[1]!.label).toBe('−25 to −15');
    expect(bins[11]!.label).toBe('+15 to +25');
  });
});
