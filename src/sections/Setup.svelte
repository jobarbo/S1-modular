<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import { CLOCK_MODES } from '../lib/engine/constants';
  import { MONITOR_ONLY } from '../lib/engine/settings';
  import Drawer from '../lib/ui/Drawer.svelte';
  import Knob from '../lib/ui/Knob.svelte';
  import Select from '../lib/ui/Select.svelte';
  import { optionsOf } from '../lib/ui/format';

  const s = $derived(app.settings);
  const live = $derived(app.live);
  const channels = Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Ch ${i + 1}` }));
  const inputs = $derived([{ value: '', label: '(none)' }, ...app.ports.ins.map((p) => ({ value: p.id, label: p.name }))]);
  const outputs = $derived([{ value: MONITOR_ONLY, label: 'Monitor only (no MIDI out)' }, ...app.ports.outs.map((p) => ({ value: p.id, label: p.name }))]);

  const velHint = $derived(
    live.vel.count === 0
      ? 'Play the S-1 sequencer to see whether it sends varying velocity.'
      : live.vel.count < 8
        ? 'Keep playing to collect more notes.'
        : live.vel.distinct === 1
          ? 'The S-1 sends a fixed velocity here: use Random/note or Trig tools for per-note variation.'
          : 'The S-1 sends varying velocity: the Velocity source is usable.',
  );
</script>

<Drawer bind:open={app.settings.view.setup} title="Setup" subtitle="MIDI ports, channel, clock">
  <div class="row">
    <section>
      <h2>MIDI</h2>
      <div class="fields">
        <Select label="From S-1" bind:value={s.midi.inId} options={inputs} />
        <Select label="To S-1" bind:value={s.midi.outId} options={outputs} />
        <Select label="Channel" bind:value={s.midi.ch} options={channels} />
      </div>
      <div class="knobrow">
        <Knob label="Max rate" bind:value={s.midi.rate} min={50} max={1000} step={10} def={300} />
        <p class="note">CC messages per second, all destinations. The S-1 synth listens on channel 3 by default.</p>
      </div>
    </section>

    <section>
      <h2>Clock</h2>
      <div class="fields"><Select label="Source" bind:value={s.clock.mode} options={optionsOf(CLOCK_MODES)} /></div>
      <div class="knobrow">
        <Knob label="Int. BPM" bind:value={s.clock.bpm} min={40} max={240} def={120} />
        <dl class="info">
          <dt>Source</dt><dd>{live.external ? 'S-1 MIDI clock' : 'internal'}</dd>
          <dt>Transport</dt><dd>{live.external ? (live.running ? 'running' : 'stopped') : 'free running'}</dd>
          <dt>Position</dt><dd>bar {live.bar} beat {live.beat}</dd>
        </dl>
      </div>
    </section>

    <section>
      <h2>Velocity check</h2>
      <p class="note">
        {live.vel.count ? `${live.vel.count} notes, velocity ${live.vel.min} to ${live.vel.max}, ${live.vel.distinct} distinct values.` : 'No notes received yet.'}
      </p>
      <p class="note">{velHint}</p>
    </section>
  </div>
</Drawer>

<style>
  .row { display: grid; gap: 14px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.8fr); }
  @media (max-width: 1100px) {
    .row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .row > :last-child { grid-column: 1 / -1; }
  }
  @media (max-width: 600px) {
    .row { grid-template-columns: minmax(0, 1fr); }
  }
  .knobrow { display: flex; align-items: flex-start; gap: 14px; }
  .knobrow .note, .info { flex: 1; margin-top: 18px; }
  .info { display: grid; grid-template-columns: 78px 1fr; gap: 6px 10px; align-items: center; font-size: 11px; margin-bottom: 0; }
  .info dt { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--dim); }
  .info dd { margin: 0; }
</style>
