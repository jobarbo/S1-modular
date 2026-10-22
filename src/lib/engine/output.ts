/** How long an outgoing CC value counts as "ours" when the S-1 echoes it back. */
const ECHO_WINDOW_MS = 200;

/**
 * CC output bookkeeping: the last value sent per CC, a token-bucket rate limit
 * (messages per second across all destinations, served round-robin), and an echo
 * filter so our own CCs coming back from the S-1 are not mistaken for knob moves.
 */
export class CcOutput {
  readonly lastSent = new Map<number, number>();
  private history = new Map<number, { v: number; t: number }[]>();
  private tokens = 0;
  private rr = 0;

  constructor(private sendCC: (cc: number, value: number) => void) {}

  /** Forget what was sent (e.g. after switching ports) so everything is resent. */
  clear() {
    this.lastSent.clear();
  }

  send(cc: number, v: number, now: number) {
    this.sendCC(cc, v);
    this.lastSent.set(cc, v);
    const hist = this.history.get(cc) ?? [];
    hist.push({ v, t: now });
    while (hist.length && now - hist[0].t > ECHO_WINDOW_MS) hist.shift();
    this.history.set(cc, hist);
  }

  /** True if an incoming CC value is (within ±1) something we sent just now. */
  isEcho(cc: number, v: number, now: number) {
    const hist = this.history.get(cc) ?? [];
    return hist.some((h) => now - h.t < ECHO_WINDOW_MS && Math.abs(h.v - v) <= 1);
  }

  /** Send changed values within the rate budget; `rate` in messages/s, `dt` in seconds. */
  flush(values: Map<number, number>, rate: number, dt: number, now: number) {
    this.tokens = Math.min(this.tokens + rate * dt, Math.max(2, rate * 0.02));
    const list = [...values.keys()];
    for (let i = 0; i < list.length && this.tokens >= 1; i++) {
      const cc = list[(this.rr + i) % list.length];
      const val = values.get(cc)!;
      if (this.lastSent.get(cc) !== val) {
        this.send(cc, val, now);
        this.tokens--;
      }
    }
    this.rr = (this.rr + 1) % Math.max(1, list.length);
  }
}
