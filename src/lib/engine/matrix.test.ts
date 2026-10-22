import { describe, expect, it } from 'vitest';
import { clampCC, matrixSums } from './matrix';
import { SOURCE_IDS, type SourceId } from './constants';

const src = (o: Partial<Record<SourceId, number>>) => ({ ...Object.fromEntries(SOURCE_IDS.map((k) => [k, 0])), ...o }) as Record<SourceId, number>;

describe('matrixSums', () => {
  it('scales bipolar sources to ±63.5 and unipolar to 0..127', () => {
    const sums = matrixSums({ cols: [74, 71], cells: { 'lfo1|74': 100, 'vel|71': 50 } }, src({ lfo1: 1, vel: 1 }));
    expect(sums.get(74)).toBeCloseTo(63.5);
    expect(sums.get(71)).toBeCloseTo(63.5);
  });

  it('adds several sources on one destination, with negative depths', () => {
    const sums = matrixSums({ cols: [74], cells: { 'lfo1|74': 100, 'lfo2|74': -100 } }, src({ lfo1: 1, lfo2: 0.5 }));
    expect(sums.get(74)).toBeCloseTo(31.75);
  });

  it('ignores zero cells, hidden columns and unknown sources', () => {
    const sums = matrixSums({ cols: [74], cells: { 'lfo1|74': 0, 'lfo1|71': 100, 'nope|74': 100 } }, src({ lfo1: 1 }));
    expect(sums.size).toBe(0);
  });
});

describe('clampCC', () => {
  it('rounds and clamps to 0..127', () => {
    expect(clampCC(-5)).toBe(0);
    expect(clampCC(200)).toBe(127);
    expect(clampCC(63.6)).toBe(64);
  });
});
