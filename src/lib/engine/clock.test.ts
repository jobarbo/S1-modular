import { describe, expect, it } from 'vitest';
import { Clock } from './clock';

describe('Clock', () => {
  it('free-runs at the internal BPM', () => {
    const c = new Clock();
    c.update(0, 0.5, 'internal', 120);
    expect(c.pos).toBeCloseTo(1);
    expect(c.external).toBe(false);
  });

  it('follows an external MIDI clock and estimates its tempo', () => {
    const c = new Clock();
    const tickMs = 60000 / (120 * 24);
    c.start();
    let t = 1000;
    for (let i = 0; i < 48; i++) c.tick((t += tickMs));
    c.update(t, 0.001, 'auto', 90);
    expect(c.external).toBe(true);
    expect(c.bpmExt).toBeCloseTo(120, 1);
    expect(c.pos).toBeCloseTo(2, 1);
    expect(c.bar).toBe(1);
    expect(c.beatInBar).toBe(3);
  });

  it('reports the S-1 tempo while its clock arrives, even with the transport stopped', () => {
    const c = new Clock();
    const tickMs = 60000 / (100 * 24);
    let t = 1000;
    for (let i = 0; i < 48; i++) c.tick((t += tickMs));
    c.update(t, 0.001, 'auto', 120);
    expect(c.running).toBe(false);
    expect(c.tempo(120)).toBeCloseTo(100, 1);
    c.update(t + 1000, 0.001, 'auto', 120);
    expect(c.tempo(120)).toBe(120);
  });

  it('falls back to internal when the clock stops arriving', () => {
    const c = new Clock();
    c.tick(1000);
    c.update(2000, 0.01, 'auto', 120);
    expect(c.external).toBe(false);
  });
});
