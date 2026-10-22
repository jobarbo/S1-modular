import { DIVS, RETRIG_BEATS, type Shape } from './constants';
import type { LfoSettings } from './settings';

export type Rng = () => number;

/** Runtime state of one LFO. `prev`/`cur` are the random targets used by S&H and random walk. */
export class Lfo {
  phase = 0;
  prev = 0;
  cur: number;
  val = 0;

  constructor(private rng: Rng = Math.random) {
    this.cur = this.rnd();
  }

  private rnd() {
    return this.rng() * 2 - 1;
  }

  reset() {
    this.phase = 0;
    this.prev = this.cur;
    this.cur = this.rnd();
  }

  /**
   * Advance by `dt` seconds / `dBeat` beats and return the new value (-1..1).
   * `pos`/`prevPos` are the clock positions, used for clocked retriggers; `bpm` is the current tempo.
   *
   * - sync to BPM: the division sets the rate from the tempo, free-running (moves while stopped, like the S-1's LFO sync)
   * - sync to clock: locked to the clock position, so it only moves while the transport runs
   * - neither: free rate in Hz
   */
  update(l: LfoSettings, dt: number, dBeat: number, pos: number, prevPos: number, bpm: number) {
    const rb = RETRIG_BEATS[l.retrig];
    if (rb && dBeat > 0 && Math.floor(pos / rb) !== Math.floor(prevPos / rb)) this.reset();
    this.phase += l.bpmSync ? (dt * bpm) / 60 / DIVS[l.div] : l.sync ? Math.max(dBeat, 0) / DIVS[l.div] : l.rate * dt;
    if (this.phase >= 1) {
      this.phase %= 1;
      this.prev = this.cur;
      this.cur = this.rnd();
    }
    this.val = lfoShape(l.shape, (this.phase + l.phase / 360) % 1, this);
    return this.val;
  }
}

/** Waveform value (-1..1) at phase `p` (0..1). */
export function lfoShape(shape: Shape, p: number, r: Pick<Lfo, 'phase' | 'prev' | 'cur'>) {
  switch (shape) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'tri':
      return p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4;
    case 'sawup':
      return 2 * p - 1;
    case 'sawdn':
      return 1 - 2 * p;
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'sh':
      return r.cur;
    case 'walk': {
      const t = (1 - Math.cos(Math.PI * r.phase)) / 2;
      return r.prev + (r.cur - r.prev) * t;
    }
  }
}
