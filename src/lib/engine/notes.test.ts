import { describe, expect, it } from 'vitest';
import { NoteEnvelope, Notes, velocitySource } from './notes';
import { defaultSettings } from './settings';

describe('velocitySource', () => {
  const v = defaultSettings().vel;
  it('maps linearly by default', () => {
    expect(velocitySource(v, 127)).toBeCloseTo(1);
    expect(velocitySource(v, 0)).toBe(0);
  });
  it('applies curve, range and invert', () => {
    expect(velocitySource({ ...v, curve: 'exp' }, 63.5)).toBeCloseTo(0.25);
    expect(velocitySource({ ...v, min: 20, max: 60 }, 127)).toBeCloseTo(0.6);
    expect(velocitySource({ ...v, invert: true }, 127)).toBeCloseTo(0);
  });
});

describe('Notes', () => {
  it('tracks gate, key and velocity stats', () => {
    const n = new Notes(() => 0.75);
    n.on(84, 90);
    n.on(60, 30);
    expect(n.gate).toBe(1);
    expect(n.key).toBe(0);
    expect(n.rnd).toBeCloseTo(0.5);
    expect(n.stats).toMatchObject({ count: 2, min: 30, max: 90 });
    n.off(84);
    n.off(60);
    expect(n.gate).toBe(0);
  });
});

describe('NoteEnvelope', () => {
  const e = { ...defaultSettings().env, attack: 10, decay: 100 };

  it('runs attack then decay in AD mode', () => {
    const env = new NoteEnvelope();
    env.trigger(e, 127);
    env.update(e, 0.005);
    expect(env.level).toBeCloseTo(0.5);
    env.update(e, 0.01);
    expect(env.stage).toBe('d');
    env.update(e, 0.05);
    expect(env.level).toBeCloseTo(0.5);
    env.update(e, 0.1);
    expect(env.stage).toBe('idle');
  });

  it('holds in ASR mode until release', () => {
    const asr = { ...e, mode: 'asr' as const };
    const env = new NoteEnvelope();
    env.trigger(asr, 127);
    env.update(asr, 0.02);
    env.update(asr, 1);
    expect(env.stage).toBe('s');
    expect(env.level).toBe(1);
    env.release(asr);
    expect(env.stage).toBe('r');
  });

  it('scales the peak with velocity amount', () => {
    const env = new NoteEnvelope();
    env.trigger({ ...e, velAmt: 100 }, 0);
    expect(env.peak).toBe(0);
  });
});
