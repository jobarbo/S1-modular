import { describe, expect, it } from 'vitest';
import { TrigGenerator } from './trig';
import { defaultSettings } from './settings';

const base = { ...defaultSettings().trig, div: '1/4' as const, prob: 100, swing: 50, ratchetProb: 0, accMin: 100, accMax: 100, decay: 1e9 };

describe('TrigGenerator', () => {
  it('fires on every step at 100% probability', () => {
    const g = new TrigGenerator(() => 0);
    g.update(base, 0.01, 0.001, 0.01);
    expect(g.val).toBeCloseTo(1);
    g.val = 0;
    g.update(base, 1.01, 0.001, 1);
    expect(g.val).toBeCloseTo(1);
  });

  it('never fires at 0% probability', () => {
    const g = new TrigGenerator(() => 0.5);
    for (let p = 0.1; p < 4; p += 0.1) g.update({ ...base, prob: 0 }, p, 0.01, 0.1);
    expect(g.val).toBe(0);
  });

  it('delays odd steps with swing', () => {
    const g = new TrigGenerator(() => 0);
    g.update({ ...base, swing: 75 }, 1.01, 0.001, 1.01);
    expect(g.pending).toEqual([1.5]);
  });

  it('splits a step into ratchets', () => {
    const g = new TrigGenerator(() => 0);
    g.update({ ...base, ratchet: 4, ratchetProb: 100 }, 0, 0.001, 0.001);
    expect(g.pending.sort()).toEqual([0.25, 0.5, 0.75]);
  });
});
