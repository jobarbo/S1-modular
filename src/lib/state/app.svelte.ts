import { SOURCE_IDS, type SourceId } from '../engine/constants';
import { Engine, type LogDir } from '../engine/engine';
import { MidiIO, choosePort, type PortInfo } from '../engine/midi-io';
import { defaultSettings, loadSettings, mergeDefaults, MONITOR_ONLY, STORE_KEY, toPreset, type Settings } from '../engine/settings';
import { startTimer } from '../engine/timer';

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
})();

export interface LogLine {
  id: number;
  t: string;
  dir: LogDir;
  text: string;
}
const LOG_MAX = 200;

/**
 * Application state: the persisted settings (reactive), plus everything the UI
 * shows live. The engine reads `settings` on every tick; the UI copies engine
 * values into `live` once per animation frame.
 */
class AppState {
  settings = $state<Settings>(loadSettings(storage));
  ports = $state<{ ins: PortInfo[]; outs: PortInfo[] }>({ ins: [], outs: [] });
  banner = $state('');
  /** Matrix cursor (not persisted) */
  sel = $state<{ src: SourceId; cc: number }>({ src: 'lfo1', cc: 74 });
  live = $state({
    src: Object.fromEntries(SOURCE_IDS.map((k) => [k, 0])) as Record<SourceId, number>,
    out: {} as Record<number, number>,
    inName: '',
    outName: '',
    external: false,
    running: false,
    bpm: 0,
    bar: 1,
    beat: 1,
    vel: { count: 0, min: 0, max: 0, distinct: 0 },
  });
  monitor = $state({ lines: [] as LogLine[], showClock: false, showOut: true });

  readonly midi = new MidiIO();
  readonly engine = new Engine(() => this.settings, {
    send: (bytes) => this.midi.send(bytes),
    log: (dir, text, isClock) => this.pushLog(dir, text, isClock),
  });

  private logBuf: LogLine[] = [];
  private logDirty = false;
  private logId = 0;

  /** Start MIDI, the engine timer, the UI frame loop and persistence. Returns a cleanup. */
  start() {
    const stopTimer = startTimer(() => this.engine.tick(performance.now()));
    let raf = 0;
    const loop = () => {
      this.frame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onUnload = () => this.engine.restoreKnobs(performance.now());
    window.addEventListener('beforeunload', onUnload);

    const stopEffects = $effect.root(() => {
      // Persist settings (debounced)
      $effect(() => {
        const json = JSON.stringify(this.settings);
        const id = setTimeout(() => {
          try {
            storage?.setItem(STORE_KEY, json);
          } catch {
            /* storage full or unavailable */
          }
        }, 300);
        return () => clearTimeout(id);
      });
      // Rebind ports when the selection changes
      $effect(() => {
        const { inId, outId } = this.settings.midi;
        this.bindPorts(inId, outId);
      });
    });

    this.midi.listen((data, now) => this.engine.onMidi(data, now));
    void this.initMidi();

    return () => {
      stopTimer();
      cancelAnimationFrame(raf);
      window.removeEventListener('beforeunload', onUnload);
      stopEffects();
    };
  }

  private async initMidi() {
    // Settle the port selection (monitor-only) even if MIDI never becomes available
    this.refreshPorts();
    if (!MidiIO.supported) {
      this.banner = 'Web MIDI is not available in this browser. Use Chrome or Edge (Safari does not support Web MIDI). The engine still runs in monitor-only mode.';
      return;
    }
    try {
      await this.midi.init(() => this.refreshPorts());
      this.refreshPorts();
    } catch (e) {
      this.banner = `MIDI access was refused: ${(e as Error).message}. Allow MIDI for this page and reload.`;
    }
  }

  /** Re-read the port lists and keep (or auto-pick) the selected ports. */
  refreshPorts() {
    const ins = this.midi.inputs;
    const outs = this.midi.outputs;
    this.ports = { ins, outs };
    const m = this.settings.midi;
    m.inId = choosePort(ins, m.inId, '');
    m.outId = choosePort(outs, m.outId, MONITOR_ONLY);
    // The ids may be unchanged (so the effect above does not rerun) while the ports just appeared
    this.bindPorts(m.inId, m.outId);
  }

  private bindPorts(inId: string, outId: string) {
    this.midi.bind(inId, outId === MONITOR_ONLY ? '' : outId);
    this.engine.output.clear();
  }

  private pushLog(dir: LogDir, text: string, isClock: boolean) {
    if (dir === 'out' && !this.monitor.showOut) return;
    if (isClock && !this.monitor.showClock) return;
    const t = (performance.now() / 1000).toFixed(3).padStart(9);
    this.logBuf.push({ id: this.logId++, t, dir, text });
    if (this.logBuf.length > LOG_MAX) this.logBuf.splice(0, this.logBuf.length - LOG_MAX);
    this.logDirty = true;
  }

  clearLog() {
    this.logBuf = [];
    this.logDirty = true;
  }

  /** Copy engine values into reactive state, once per animation frame. */
  private frame() {
    const e = this.engine;
    const live = this.live;
    for (const k of SOURCE_IDS) live.src[k] = e.src[k];
    const out: Record<number, number> = {};
    for (const [cc, v] of e.outVals) out[cc] = v;
    live.out = out;
    live.inName = this.midi.input?.name ?? '';
    live.outName = this.midi.output?.name ?? '';
    live.external = e.clock.external;
    live.running = e.clock.running;
    live.bpm = e.clock.external ? e.clock.bpmExt : this.settings.clock.bpm;
    live.bar = e.clock.bar;
    live.beat = e.clock.beatInBar;
    const st = e.notes.stats;
    if (st.count !== live.vel.count) live.vel = { count: st.count, min: st.min, max: st.max, distinct: st.distinct.size };
    if (this.logDirty) {
      this.logDirty = false;
      this.monitor.lines = this.logBuf.slice();
    }
  }

  /* ---- actions ---- */

  restoreKnobs() {
    this.engine.restoreKnobs(performance.now());
  }

  allOff() {
    this.settings.grid.cells = {};
    this.restoreKnobs();
  }

  reset() {
    this.settings = defaultSettings();
    this.refreshPorts();
  }

  /** Replace the settings with a preset file, keeping the current ports. */
  importPreset(json: unknown) {
    const { inId, outId } = this.settings.midi;
    const next = mergeDefaults(json);
    next.midi.inId = inId;
    next.midi.outId = outId;
    this.settings = next;
  }

  exportPreset() {
    const blob = new Blob([JSON.stringify(toPreset(this.settings), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 's1-modhub-preset.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}

export const app = new AppState();
