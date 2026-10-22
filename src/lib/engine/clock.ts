import type { ClockMode } from './constants';

const PPQN = 24;
/** Without a clock tick for this long, auto mode falls back to the internal BPM. */
const EXTERNAL_TIMEOUT_MS = 500;

/**
 * Musical position in beats, following the S-1's MIDI clock when it arrives
 * and free-running at the internal BPM otherwise.
 */
export class Clock {
  ticks = 0;
  running = false;
  lastTickAt = -1e9;
  bpmExt = 0;
  /** Current position in beats */
  pos = 0;
  external = false;
  private intervals: number[] = [];
  private intPos = 0;

  /** A MIDI clock (0xF8) message arrived at `now` (ms). */
  tick(now: number) {
    if (this.lastTickAt > 0) {
      const dt = now - this.lastTickAt;
      if (dt > 0 && dt < 200) {
        this.intervals.push(dt);
        if (this.intervals.length > 48) this.intervals.shift();
      }
    }
    this.lastTickAt = now;
    if (this.running) this.ticks++;
    const avg = this.intervals.reduce((a, b) => a + b, 0) / (this.intervals.length || 1);
    this.bpmExt = avg ? 60000 / (avg * PPQN) : 0;
  }

  start() {
    this.running = true;
    this.ticks = 0;
  }

  stop() {
    this.running = false;
  }

  /** Advance the position; `dt` in seconds. */
  update(now: number, dt: number, mode: ClockMode, bpm: number) {
    this.external = mode === 'auto' && now - this.lastTickAt < EXTERNAL_TIMEOUT_MS;
    if (this.external) {
      if (this.running) {
        const tickMs = this.bpmExt ? 60000 / (this.bpmExt * PPQN) : 20;
        this.pos = this.ticks / PPQN + Math.min((now - this.lastTickAt) / tickMs, 0.999) / PPQN;
      }
    } else {
      this.intPos += (dt * bpm) / 60;
      this.pos = this.intPos;
    }
  }

  /** The tempo in force: the S-1's while its clock arrives, otherwise the internal BPM. */
  tempo(internalBpm: number) {
    return this.external && this.bpmExt ? this.bpmExt : internalBpm;
  }

  get beat() {
    return Math.floor(this.pos);
  }
  get bar() {
    return Math.floor(this.beat / 4) + 1;
  }
  get beatInBar() {
    return (this.beat % 4) + 1;
  }
}
