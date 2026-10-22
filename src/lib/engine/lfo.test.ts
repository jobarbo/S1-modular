import { describe, expect, it } from 'vitest';
import { Lfo, lfoShape } from './lfo';
import type { LfoSettings } from './settings';

const rt = { phase: 0, prev: -0.5, cur: 0.5 };
const lfo = (o: Partial<LfoSettings> = {}): LfoSettings => ({ shape: 'sine', sync: false, bpmSync: false, rate: 1, div: '1/4', phase: 0, retrig: 'none', ...o });

describe('lfoShape', () => {
  it('produces the classic waveforms', () => {
    expect(lfoShape('sine', 0.25, rt)).toBeCloseTo(1);
    expect(lfoShape('tri', 0.25, rt)).toBeCloseTo(1);
    expect(lfoShape('tri', 0.75, rt)).toBeCloseTo(-1);
    expect(lfoShape('sawup', 0, rt)).toBe(-1);
    expect(lfoShape('sawdn', 0, rt)).toBe(1);
    expect(lfoShape('square', 0.2, rt)).toBe(1);
    expect(lfoShape('square', 0.7, rt)).toBe(-1);
  });

  it('holds the random target for S&H and glides for random walk', () => {
    expect(lfoShape('sh', 0.9, rt)).toBe(0.5);
    expect(lfoShape('walk', 0, { ...rt, phase: 0 })).toBeCloseTo(-0.5);
    expect(lfoShape('walk', 0, { ...rt, phase: 1 })).toBeCloseTo(0.5);
  });
});

describe('Lfo', () => {
  it('advances by rate in free mode', () => {
    const l = new Lfo(() => 0.5);
    l.update(lfo({ shape: 'sawup', rate: 2 }), 0.125, 0, 0, 0, 120);
    expect(l.phase).toBeCloseTo(0.25);
  });

  it('advances by beats when synced to the clock, and stays put while the transport is stopped', () => {
    const l = new Lfo(() => 0.5);
    l.update(lfo({ sync: true, div: '1 bar' }), 0.1, 1, 1, 0, 120);
    expect(l.phase).toBeCloseTo(0.25);
    l.update(lfo({ sync: true, div: '1 bar' }), 0.5, 0, 1, 1, 120);
    expect(l.phase).toBeCloseTo(0.25);
  });

  it('runs at the tempo when synced to BPM, even with the transport stopped', () => {
    const l = new Lfo(() => 0.5);
    // 120 BPM = 2 beats/s; a 1/4 division cycles twice per second
    l.update(lfo({ bpmSync: true, div: '1/4' }), 0.125, 0, 0, 0, 120);
    expect(l.phase).toBeCloseTo(0.25);
    l.update(lfo({ bpmSync: true, div: '1 bar' }), 0.5, 0, 0, 0, 90);
    expect(l.phase).toBeCloseTo(0.25 + 0.1875);
  });

  it('applies the phase offset', () => {
    const l = new Lfo(() => 0.5);
    expect(l.update(lfo({ shape: 'sine', phase: 90, rate: 0 }), 0, 0, 0, 0, 120)).toBeCloseTo(1);
  });

  it('retriggers on bar boundaries', () => {
    const l = new Lfo(() => 0.5);
    l.phase = 0.6;
    l.update(lfo({ rate: 0, retrig: 'bar' }), 0.01, 0.1, 4.05, 3.95, 120);
    expect(l.phase).toBe(0);
  });
});
