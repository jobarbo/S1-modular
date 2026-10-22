import type { Settings } from './settings';
import type { Rng } from './lfo';

/** Notes received from the S-1, and the per-note sources derived from them. */
export class Notes {
  held = new Set<number>();
  lastVel = 100;
  lastNote = 60;
  /** Random value drawn on each note on (-1..1) */
  rnd = 0;
  stats = { count: 0, min: 127, max: 0, distinct: new Set<number>() };

  constructor(private rng: Rng = Math.random) {}

  on(note: number, vel: number) {
    this.held.add(note);
    this.lastVel = vel;
    this.lastNote = note;
    this.rnd = this.rng() * 2 - 1;
    const s = this.stats;
    s.count++;
    s.min = Math.min(s.min, vel);
    s.max = Math.max(s.max, vel);
    s.distinct.add(vel);
  }

  off(note: number) {
    this.held.delete(note);
  }

  get gate() {
    return this.held.size ? 1 : 0;
  }

  /** Key tracking around middle C, ±2 octaves -> -1..1 */
  get key() {
    return Math.max(-1, Math.min(1, (this.lastNote - 60) / 24));
  }
}

/** Velocity source (0..1) with curve, range and invert. */
export function velocitySource(v: Settings['vel'], vel: number) {
  const x = vel / 127;
  const c = v.curve === 'exp' ? x * x : v.curve === 'log' ? Math.sqrt(x) : v.curve === 's' ? x * x * (3 - 2 * x) : x;
  const out = (v.min + (v.max - v.min) * c) / 100;
  return v.invert ? 1 - out : out;
}

/** AD / ASR note envelope (0..1), times in ms. */
export class NoteEnvelope {
  stage: 'idle' | 'a' | 's' | 'd' | 'r' = 'idle';
  level = 0;
  peak = 1;

  trigger(e: Settings['env'], vel: number) {
    this.peak = 1 - (e.velAmt / 100) * (1 - vel / 127);
    this.stage = 'a';
  }

  /** All notes released */
  release(e: Settings['env']) {
    if (e.mode === 'asr' && this.stage !== 'idle') this.stage = 'r';
  }

  update(e: Settings['env'], dt: number) {
    if (this.stage === 'a') {
      this.level += (dt * 1000) / Math.max(1, e.attack);
      if (this.level >= this.peak) {
        this.level = this.peak;
        this.stage = e.mode === 'ad' ? 'd' : 's';
      }
    } else if (this.stage === 's') {
      this.level = this.peak;
    } else if (this.stage === 'd' || this.stage === 'r') {
      this.level -= (dt * 1000) / Math.max(1, e.decay);
      if (this.level <= 0) {
        this.level = 0;
        this.stage = 'idle';
      }
    }
    return this.level;
  }
}
