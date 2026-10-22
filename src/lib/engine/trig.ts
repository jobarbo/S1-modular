import { DIVS } from './constants';
import type { Settings } from './settings';
import type { Rng } from './lfo';

/**
 * Trig tools: clocked pulses with probability, swing and ratchets.
 * Each fired trig sets `val` to a random accent (then decays) and draws a new S&H value.
 */
export class TrigGenerator {
  /** Decaying accent pulse (0..1) */
  val = 0;
  /** Sample & hold value, new on each trig (-1..1) */
  sh = 0;
  private lastStep: number | null = null;
  /** Clock positions (beats) of trigs still to fire */
  pending: number[] = [];

  constructor(private rng: Rng = Math.random) {}

  reset() {
    this.pending = [];
    this.lastStep = null;
  }

  update(t: Settings['trig'], pos: number, dt: number, dBeat: number) {
    const L = DIVS[t.div];
    if (dBeat > 0) {
      const k = Math.floor(pos / L);
      if (this.lastStep === null) this.lastStep = k - 1;
      // Catch up at most 4 steps if the timer stalled
      for (let step = Math.max(this.lastStep + 1, k - 3); step <= k; step++) {
        if (this.rng() * 100 >= t.prob) continue;
        const delay = step % 2 ? L * ((2 * t.swing) / 100 - 1) : 0;
        const n = t.ratchet > 1 && this.rng() * 100 < t.ratchetProb ? t.ratchet : 1;
        const span = (L - delay) / n;
        for (let r = 0; r < n; r++) this.pending.push(step * L + delay + r * span);
      }
      this.lastStep = k;
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (pos >= this.pending[i]) {
        this.pending.splice(i, 1);
        this.val = (t.accMin + this.rng() * (t.accMax - t.accMin)) / 100;
        this.sh = this.rng() * 2 - 1;
      }
    }
    this.val *= Math.exp((-dt * 1000) / Math.max(1, t.decay));
  }
}
