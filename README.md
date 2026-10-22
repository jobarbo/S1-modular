# S-1 ModHub

A browser modulation hub for the Roland S-1. Four LFOs, a note envelope, velocity, key tracking and clocked trig tools are routed through a mod matrix to the S-1's MIDI CCs. Output is rate-limited, and it follows the S-1's MIDI clock.

The modulation runs in the page. The S-1 only receives the resulting CC stream, so the page has to stay open and connected over MIDI. It needs a browser with Web MIDI (Chrome or Edge; Safari doesn't support it).

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev        # local dev server with hot reload
pnpm test       # engine unit tests (Vitest)
pnpm check      # type check (svelte-check)
pnpm build      # production build in dist/
pnpm verify     # check + test + build: what Netlify runs
```

## Structure

```
src/
  lib/engine/     Modulation engine: pure TypeScript, no DOM or Svelte, unit tested
    constants.ts    S-1 CC map, sources, divisions, shapes
    settings.ts     Settings types, defaults, merging of old/partial saves, preset export
    clock.ts        Musical position, following the S-1's MIDI clock or the internal BPM
    lfo.ts          LFO waveforms and runtime
    notes.ts        Held notes, velocity curve, AD/ASR note envelope
    trig.ts         Clocked trigs with probability, swing, ratchets
    matrix.ts       Source x destination sums
    output.ts       CC output: change detection, rate limit, echo filter
    engine.ts       Ties it together: onMidi(bytes), tick(now)
    midi-io.ts      Web MIDI ports
    timer.ts        Worker timer (keeps running in background tabs)
  lib/state/      Reactive app state (Svelte 5 runes), persistence, engine wiring
  lib/ui/         Knob, Toggle, Select, Meter, Drawer
  sections/       Header, Setup, ModMatrix, Modulators, Monitor
```

The engine reads the settings on every tick (every 2 ms, from a Worker). The UI copies live engine values into reactive state once per animation frame.

Settings are saved in `localStorage` under `s1-modhub-v1`. Preset files contain every setting except the MIDI ports.

## Deployment

Netlify builds the app from `netlify.toml` and publishes `dist/`. The build fails, and nothing is published, if the type check or a test fails.
