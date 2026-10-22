import type { ClockMode, Division, EnvMode, Retrig, Shape, SourceId, VelCurve } from './constants';

export interface LfoSettings {
  shape: Shape;
  /** Locked to the clock position: only moves while the transport runs */
  sync: boolean;
  /** Rate from the tempo and division, free-running (like the S-1's own LFO sync) */
  bpmSync: boolean;
  /** Free-running rate in Hz */
  rate: number;
  div: Division;
  /** Phase offset in degrees */
  phase: number;
  retrig: Retrig;
}

export interface Settings {
  midi: { inId: string; outId: string; ch: number; rate: number };
  clock: { mode: ClockMode; bpm: number };
  lfos: LfoSettings[];
  vel: { curve: VelCurve; min: number; max: number; invert: boolean };
  env: { mode: EnvMode; attack: number; decay: number; velAmt: number };
  trig: { div: Division; prob: number; swing: number; ratchet: number; ratchetProb: number; accMin: number; accMax: number; decay: number };
  /** cols: the CC shown in each matrix column. cells: 'src|cc' -> depth (-100..100) */
  grid: { cols: number[]; cells: Record<string, number> };
  /** cc -> knob position on the S-1 panel (the value modulation is added to) */
  bases: Record<number, number>;
  /** cc -> true once the base was read from the S-1 itself */
  captured: Record<number, boolean>;
  /** Which drawers are open */
  view: { setup: boolean; matrix: boolean; modulators: boolean; monitor: boolean };
}

/** Same key as the single-file version, so saved settings carry over. */
export const STORE_KEY = 's1-modhub-v1';
export const MONITOR_ONLY = '__monitor__';

const lfoDefault = (i: number): LfoSettings => ({
  shape: (['sine', 'tri', 'sh', 'walk'] as const)[i],
  sync: false,
  bpmSync: i % 2 === 0,
  rate: [2, 0.5, 6, 0.2][i],
  div: (['1/4', '1 bar', '1/8', '2 bars'] as const)[i],
  phase: 0,
  retrig: 'none',
});

export function defaultSettings(): Settings {
  return {
    midi: { inId: '', outId: '', ch: 3, rate: 300 },
    clock: { mode: 'auto', bpm: 120 },
    lfos: [0, 1, 2, 3].map(lfoDefault),
    vel: { curve: 'lin', min: 0, max: 100, invert: false },
    env: { mode: 'ad', attack: 5, decay: 250, velAmt: 0 },
    trig: { div: '1/16', prob: 50, swing: 50, ratchet: 2, ratchetProb: 0, accMin: 40, accMax: 100, decay: 120 },
    grid: { cols: [74, 71, 24, 15, 13, 73, 72, 92], cells: {} },
    bases: {},
    captured: {},
    view: { setup: true, matrix: true, modulators: true, monitor: false },
  };
}

/**
 * Fill a partial / older settings object with defaults, one level deep.
 * Unknown keys (e.g. the pre-grid `matrix` slots) are dropped.
 */
export function mergeDefaults(saved: unknown): Settings {
  const d = defaultSettings() as unknown as Record<string, unknown>;
  if (!saved || typeof saved !== 'object') return d as unknown as Settings;
  const s = saved as Record<string, unknown>;
  for (const k of Object.keys(d)) {
    const sv = s[k];
    if (sv === undefined || sv === null) continue;
    const dv = d[k];
    if (Array.isArray(dv)) {
      const arr = Array.isArray(sv) ? sv : [];
      d[k] = dv.map((v, i) => ({ ...v, ...(arr[i] ?? {}) }));
    } else if (typeof dv === 'object' && typeof sv === 'object') {
      d[k] = { ...(dv as object), ...(sv as object) };
    }
  }
  const out = d as unknown as Settings;
  const savedLfos = Array.isArray(s.lfos) ? (s.lfos as Record<string, unknown>[]) : [];
  out.lfos.forEach((l, i) => {
    // Saves from before "sync to BPM" keep the mode they had
    if (savedLfos[i] && typeof savedLfos[i] === 'object' && !('bpmSync' in savedLfos[i])) l.bpmSync = false;
    // The two sync modes are exclusive; BPM wins
    if (l.bpmSync) l.sync = false;
  });
  return out;
}

export const cellKey = (src: SourceId, cc: number) => `${src}|${cc}`;

/** The base (knob) value of a CC: the S-1 panel position, 64 until known. */
export const baseOf = (s: Settings, cc: number) => s.bases[cc] ?? 64;

/** Preset file contents: everything except the machine-specific MIDI ports. */
export function toPreset(s: Settings) {
  // JSON round trip rather than structuredClone: it also accepts reactive proxies.
  const { midi, ...rest } = JSON.parse(JSON.stringify(s)) as Settings;
  return { ...rest, midi: { ch: midi.ch, rate: midi.rate } };
}

export function loadSettings(storage: Pick<Storage, 'getItem'> | undefined): Settings {
  try {
    const raw = storage?.getItem(STORE_KEY);
    if (raw) return mergeDefaults(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupt: start from defaults */
  }
  return defaultSettings();
}
