import { describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings, mergeDefaults, STORE_KEY, toPreset } from './settings';

describe('mergeDefaults', () => {
  it('fills missing keys and keeps saved values', () => {
    const s = mergeDefaults({ clock: { bpm: 90 }, lfos: [{ shape: 'square' }], grid: { cells: { 'lfo1|74': 40 } } });
    expect(s.clock).toEqual({ mode: 'auto', bpm: 90 });
    expect(s.lfos[0].shape).toBe('square');
    expect(s.lfos[0].div).toBe('1/4');
    expect(s.lfos).toHaveLength(4);
    expect(s.grid.cols).toEqual(defaultSettings().grid.cols);
    expect(s.grid.cells).toEqual({ 'lfo1|74': 40 });
  });

  it('keeps the sync mode of saves from before "sync to BPM"', () => {
    const s = mergeDefaults({ lfos: [{ sync: true }, { sync: false }] });
    expect(s.lfos[0]).toMatchObject({ sync: true, bpmSync: false });
    expect(s.lfos[1]).toMatchObject({ sync: false, bpmSync: false });
    expect(s.lfos[2]).toMatchObject({ sync: false, bpmSync: true });
  });

  it('never leaves both sync modes on', () => {
    const s = mergeDefaults({ lfos: [{ sync: true, bpmSync: true }] });
    expect(s.lfos[0]).toMatchObject({ sync: false, bpmSync: true });
  });

  it('drops the old slot matrix and adds new drawer keys', () => {
    const s = mergeDefaults({ matrix: [{ on: true }], view: { setup: false, monitor: true } });
    expect('matrix' in s).toBe(false);
    expect(s.view).toEqual({ setup: false, matrix: true, modulators: true, monitor: true });
  });

  it('survives garbage', () => {
    expect(mergeDefaults(null)).toEqual(defaultSettings());
    expect(mergeDefaults({ lfos: 'x', clock: 3 })).toEqual(defaultSettings());
  });
});

describe('toPreset', () => {
  it('excludes the machine-specific ports', () => {
    const s = defaultSettings();
    s.midi.inId = 'in-1';
    s.grid.cells['lfo1|74'] = 30;
    const p = toPreset(s);
    expect(p.midi).toEqual({ ch: 3, rate: 300 });
    expect(p.grid.cells).toEqual({ 'lfo1|74': 30 });
  });
});

describe('loadSettings', () => {
  it('reads the saved settings, or defaults when storage fails', () => {
    expect(loadSettings({ getItem: (k) => (k === STORE_KEY ? '{"clock":{"bpm":100}}' : null) }).clock.bpm).toBe(100);
    expect(loadSettings({ getItem: () => '{not json' })).toEqual(defaultSettings());
    expect(loadSettings(undefined)).toEqual(defaultSettings());
  });
});
