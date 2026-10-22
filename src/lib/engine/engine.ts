import { SOURCE_IDS, type SourceId } from './constants';
import { Clock } from './clock';
import { Lfo, type Rng } from './lfo';
import { NoteEnvelope, Notes, velocitySource } from './notes';
import { TrigGenerator } from './trig';
import { clampCC, matrixSums } from './matrix';
import { CcOutput } from './output';
import { describe } from './midi-messages';
import { baseOf, type Settings } from './settings';

export type LogDir = 'in' | 'out';
export interface EngineHooks {
  /** Raw MIDI bytes to the S-1 (no-op in monitor-only mode) */
  send(bytes: number[]): void;
  /** Human-readable traffic for the monitor */
  log?(dir: LogDir, text: string, isClock: boolean): void;
}

/** Longest step the engine integrates at once, so a stalled timer does not jump. */
const MAX_DT = 0.05;

/**
 * The modulation engine: MIDI in -> sources -> matrix -> rate-limited CC out.
 * Pure TypeScript, driven by `tick(now)`; `settings()` is read on every tick.
 */
export class Engine {
  readonly clock = new Clock();
  readonly notes: Notes;
  readonly env = new NoteEnvelope();
  readonly trig: TrigGenerator;
  readonly lfos: Lfo[];
  /** Current value of every source */
  readonly src = Object.fromEntries(SOURCE_IDS.map((k) => [k, 0])) as Record<SourceId, number>;
  /** cc -> value being driven (modulated, or returning to its base) */
  readonly outVals = new Map<number, number>();
  readonly output: CcOutput;
  private active = new Set<number>();
  private lastTick: number | null = null;

  constructor(
    private settings: () => Settings,
    private hooks: EngineHooks,
    rng: Rng = Math.random,
  ) {
    this.notes = new Notes(rng);
    this.trig = new TrigGenerator(rng);
    this.lfos = [0, 1, 2, 3].map(() => new Lfo(rng));
    this.output = new CcOutput((cc, v) => this.sendRaw([0xb0 | (this.settings().midi.ch - 1), cc, v]));
  }

  private sendRaw(bytes: number[]) {
    this.hooks.send(bytes);
    this.hooks.log?.('out', describe(bytes), false);
  }

  /** Incoming MIDI message from the S-1 at `now` (ms). */
  onMidi(d: ArrayLike<number>, now: number) {
    const st = d[0];
    const log = (text: string, isClock = false) => this.hooks.log?.('in', text, isClock);
    if (st === 0xf8) {
      this.clock.tick(now);
      log('clock', true);
      return;
    }
    if (st === 0xfa) {
      this.clock.start();
      this.onTransportStart();
      log('START');
      return;
    }
    if (st === 0xfc) {
      this.clock.stop();
      log('STOP');
      return;
    }
    if (st >= 0xf0) return;
    const s = this.settings();
    const kind = st & 0xf0;
    const ch = (st & 0x0f) + 1;
    if (ch !== s.midi.ch) {
      log(describe(d) + '  (other channel)');
      return;
    }
    log(describe(d));
    if (kind === 0x90 && d[2] > 0) this.noteOn(d[1], d[2]);
    else if (kind === 0x80 || (kind === 0x90 && d[2] === 0)) this.noteOff(d[1]);
    else if (kind === 0xb0) this.onCC(d[1], d[2], now);
  }

  private noteOn(n: number, v: number) {
    const s = this.settings();
    this.notes.on(n, v);
    this.env.trigger(s.env, v);
    s.lfos.forEach((l, i) => {
      if (l.retrig === 'note') this.lfos[i].reset();
    });
  }

  private noteOff(n: number) {
    this.notes.off(n);
    if (this.notes.held.size === 0) this.env.release(this.settings().env);
  }

  /** A knob moved on the S-1: it becomes the base the modulation is added to. */
  private onCC(cc: number, v: number, now: number) {
    if (this.output.isEcho(cc, v, now)) return;
    const s = this.settings();
    s.bases[cc] = v;
    s.captured[cc] = true;
  }

  private onTransportStart() {
    this.trig.reset();
    this.settings().lfos.forEach((l, i) => {
      if (l.sync) this.lfos[i].reset();
    });
  }

  resetLfo(i: number) {
    this.lfos[i].reset();
  }

  /** Advance everything to `now` (ms) and send what changed. */
  tick(now: number) {
    const s = this.settings();
    const dt = this.lastTick === null ? 0 : Math.min((now - this.lastTick) / 1000, MAX_DT);
    this.lastTick = now;

    const prevPos = this.clock.pos;
    this.clock.update(now, dt, s.clock.mode, s.clock.bpm);
    let dBeat = this.clock.pos - prevPos;
    if (dBeat < 0) {
      this.onTransportStart();
      dBeat = 0;
    }
    this.updateSources(s, dt, dBeat, prevPos);

    const sums = matrixSums(s.grid, this.src);
    const modulated = new Set(sums.keys());
    // Destinations no longer modulated go back to their knob value
    for (const cc of this.active) if (!sums.has(cc)) sums.set(cc, 0);
    const next = new Set<number>();
    for (const [cc, sum] of sums) {
      const val = clampCC(baseOf(s, cc) + sum);
      this.outVals.set(cc, val);
      if (modulated.has(cc) || this.output.lastSent.get(cc) !== val) next.add(cc);
    }
    this.active = next;
    for (const cc of this.outVals.keys()) if (!next.has(cc)) this.outVals.delete(cc);

    this.output.flush(this.outVals, s.midi.rate, dt, now);
  }

  private updateSources(s: Settings, dt: number, dBeat: number, prevPos: number) {
    const pos = this.clock.pos;
    const bpm = this.clock.tempo(s.clock.bpm);
    s.lfos.forEach((l, i) => {
      this.src[`lfo${i + 1}` as SourceId] = this.lfos[i].update(l, dt, dBeat, pos, prevPos, bpm);
    });
    this.src.vel = velocitySource(s.vel, this.notes.lastVel);
    this.src.env = this.env.update(s.env, dt);
    this.src.rnd = this.notes.rnd;
    this.src.key = this.notes.key;
    this.src.gate = this.notes.gate;
    this.trig.update(s.trig, pos, dt, dBeat);
    this.src.trig = this.trig.val;
    this.src.trigsh = this.trig.sh;
  }

  /** Send the base (knob) value of every CC we touched, e.g. before leaving the page. */
  restoreKnobs(now: number) {
    const s = this.settings();
    const ccs = new Set([...this.active, ...s.grid.cols]);
    for (const cc of ccs) if (this.output.lastSent.has(cc)) this.output.send(cc, baseOf(s, cc), now);
  }
}
