/* S-1 CC map, from the S-1 v1.02 MIDI implementation chart. */
export type CcKind = 'cont' | 'step';
export interface CcDef {
  group: string;
  cc: number;
  name: string;
  /** 'cont' = continuous, 'step' = stepped values (use small depths) */
  kind: CcKind;
}

const cc = (group: string, cc: number, name: string, kind: CcKind = 'cont'): CcDef => ({ group, cc, name, kind });
const STEPPED = 'Stepped (use small depths)';

export const CC_MAP: CcDef[] = [
  cc('Filter', 74, 'Cutoff'), cc('Filter', 71, 'Resonance'), cc('Filter', 24, 'Filter env depth'),
  cc('Filter', 25, 'Filter LFO depth'), cc('Filter', 26, 'Filter key follow'), cc('Filter', 27, 'Filter bend sens'),
  cc('Oscillator', 15, 'Pulse width'), cc('Oscillator', 13, 'Osc LFO depth'), cc('Oscillator', 19, 'Osc level 1'),
  cc('Oscillator', 20, 'Osc level 2'), cc('Oscillator', 21, 'Sub level'), cc('Oscillator', 23, 'Noise level'),
  cc('Oscillator', 76, 'Fine tune'), cc('Oscillator', 18, 'Osc bend sens'), cc('Oscillator', 102, 'Draw multiply'),
  cc('Oscillator', 103, 'Chop overtone'), cc('Oscillator', 104, 'Chop comb'),
  cc('Envelope', 73, 'Attack'), cc('Envelope', 75, 'Decay'), cc('Envelope', 30, 'Sustain'), cc('Envelope', 72, 'Release'),
  cc('LFO', 3, 'LFO rate'), cc('LFO', 17, 'LFO mod depth'),
  cc('Effects', 91, 'Reverb level'), cc('Effects', 89, 'Reverb time'), cc('Effects', 92, 'Delay level'), cc('Effects', 90, 'Delay time'),
  cc('Performance', 5, 'Portamento time'), cc('Performance', 1, 'Mod wheel'), cc('Performance', 11, 'Expression'), cc('Performance', 10, 'Pan'),
  cc(STEPPED, 12, 'LFO waveform', 'step'), cc(STEPPED, 14, 'Osc range', 'step'), cc(STEPPED, 16, 'PWM source', 'step'),
  cc(STEPPED, 22, 'Sub octave', 'step'), cc(STEPPED, 85, 'Chord v2 key shift', 'step'), cc(STEPPED, 86, 'Chord v3 key shift', 'step'),
  cc(STEPPED, 87, 'Chord v4 key shift', 'step'), cc(STEPPED, 93, 'Chorus', 'step'),
];
export const CC_NAME: Record<number, string> = Object.fromEntries(CC_MAP.map((d) => [d.cc, d.name]));

/* Modulation sources. Bipolar sources swing -1..1, unipolar ones 0..1. */
export const SOURCE_IDS = ['lfo1', 'lfo2', 'lfo3', 'lfo4', 'vel', 'env', 'rnd', 'key', 'gate', 'trig', 'trigsh'] as const;
export type SourceId = (typeof SOURCE_IDS)[number];
export interface SourceDef {
  id: SourceId;
  name: string;
  bipolar: boolean;
}
export const SOURCES: SourceDef[] = [
  { id: 'lfo1', name: 'LFO 1', bipolar: true },
  { id: 'lfo2', name: 'LFO 2', bipolar: true },
  { id: 'lfo3', name: 'LFO 3', bipolar: true },
  { id: 'lfo4', name: 'LFO 4', bipolar: true },
  { id: 'vel', name: 'Velocity', bipolar: false },
  { id: 'env', name: 'Note env', bipolar: false },
  { id: 'rnd', name: 'Random/note', bipolar: true },
  { id: 'key', name: 'Key track', bipolar: true },
  { id: 'gate', name: 'Gate', bipolar: false },
  { id: 'trig', name: 'Trig pulse', bipolar: false },
  { id: 'trigsh', name: 'Trig S&H', bipolar: true },
];
export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SourceId, SourceDef>;
export const isSourceId = (s: string): s is SourceId => (SOURCE_IDS as readonly string[]).includes(s);

/** Musical divisions, in beats (quarter notes). */
export const DIVS = {
  '4 bars': 16, '2 bars': 8, '1 bar': 4, '1/2': 2, '1/4D': 1.5, '1/4': 1, '1/4T': 2 / 3, '1/8D': 0.75, '1/8': 0.5,
  '1/8T': 1 / 3, '1/16D': 0.375, '1/16': 0.25, '1/16T': 1 / 6, '1/32': 0.125,
} as const;
export type Division = keyof typeof DIVS;

export const SHAPES = { sine: 'Sine', tri: 'Triangle', sawup: 'Saw up', sawdn: 'Saw down', square: 'Square', sh: 'S&H', walk: 'Random walk' } as const;
export type Shape = keyof typeof SHAPES;

export const RETRIG = { none: 'Free', note: 'Note on', beat: 'Every beat', bar: 'Every bar', bar2: 'Every 2 bars', bar4: 'Every 4 bars' } as const;
export type Retrig = keyof typeof RETRIG;
/** Clocked retrigger periods, in beats. */
export const RETRIG_BEATS: Partial<Record<Retrig, number>> = { beat: 1, bar: 4, bar2: 8, bar4: 16 };

export const VEL_CURVES = { lin: 'Linear', exp: 'Exponential', log: 'Logarithmic', s: 'S-curve' } as const;
export type VelCurve = keyof typeof VEL_CURVES;

export const ENV_MODES = { ad: 'AD (one-shot)', asr: 'ASR (hold while gate)' } as const;
export type EnvMode = keyof typeof ENV_MODES;

export const CLOCK_MODES = { auto: 'Follow S-1 (auto)', internal: 'Internal only' } as const;
export type ClockMode = keyof typeof CLOCK_MODES;
