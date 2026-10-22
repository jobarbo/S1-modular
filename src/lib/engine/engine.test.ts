import { describe, expect, it } from 'vitest';
import { Engine } from './engine';
import { defaultSettings, type Settings } from './settings';

function setup(edit: (s: Settings) => void = () => {}) {
  const s = defaultSettings();
  s.lfos[0] = { ...s.lfos[0], shape: 'square', sync: false, rate: 0.001 };
  edit(s);
  const sent: number[][] = [];
  const e = new Engine(() => s, { send: (b) => sent.push(b) }, () => 0.5);
  return { s, e, sent };
}

describe('Engine', () => {
  it('sends the modulated CC on the configured channel', () => {
    const { e, sent } = setup((s) => (s.grid.cells['lfo1|74'] = 50));
    e.tick(0);
    e.tick(10);
    // square LFO at +1, depth 50% of ±63.5 on a base of 64
    expect(sent).toContainEqual([0xb2, 74, 96]);
  });

  it('captures knob moves from the S-1 as the new base, but ignores its echoes', () => {
    const { s, e } = setup((s) => (s.grid.cells['lfo1|74'] = 50));
    e.tick(0);
    e.tick(10);
    e.onMidi([0xb2, 74, 96], 20); // echo of what we just sent
    expect(s.captured[74]).toBeUndefined();
    e.onMidi([0xb2, 74, 20], 30);
    expect(s.bases[74]).toBe(20);
    expect(s.captured[74]).toBe(true);
  });

  it('ignores other channels', () => {
    const { s, e } = setup();
    e.onMidi([0xb0, 74, 20], 0);
    expect(s.bases[74]).toBeUndefined();
  });

  it('returns a destination to its base when the routing is cleared', () => {
    const { s, e, sent } = setup((s) => (s.grid.cells['lfo1|74'] = 50));
    e.tick(0);
    e.tick(10);
    s.grid.cells['lfo1|74'] = 0;
    e.tick(20);
    expect(sent.at(-1)).toEqual([0xb2, 74, 64]);
    e.tick(30);
    expect(e.outVals.size).toBe(0);
  });

  it('restores knobs on demand', () => {
    const { e, sent } = setup((s) => (s.grid.cells['lfo1|74'] = 50));
    e.tick(0);
    e.tick(10);
    e.restoreKnobs(20);
    expect(sent.at(-1)).toEqual([0xb2, 74, 64]);
  });

  it('feeds notes into gate, velocity and envelope', () => {
    const { e } = setup();
    e.onMidi([0x92, 60, 127], 0);
    e.tick(0);
    e.tick(10);
    expect(e.src.gate).toBe(1);
    expect(e.src.vel).toBeCloseTo(1);
    expect(e.src.env).toBeGreaterThan(0);
    e.onMidi([0x82, 60, 0], 20);
    e.tick(30);
    expect(e.src.gate).toBe(0);
  });

  it('logs traffic in both directions', () => {
    const lines: string[] = [];
    const s = defaultSettings();
    const e = new Engine(() => s, { send: () => {}, log: (dir, text) => lines.push(`${dir} ${text}`) });
    e.onMidi([0x92, 60, 100], 0);
    expect(lines).toEqual(['in ch3 note on  60 vel 100']);
  });
});
