<script lang="ts">
  import type { Snippet } from 'svelte';
  import { app } from '../lib/state/app.svelte';
  import { DIVS, ENV_MODES, RETRIG, SHAPES, VEL_CURVES, type Division, type SourceId } from '../lib/engine/constants';
  import { defaultSettings } from '../lib/engine/settings';
  import Drawer from '../lib/ui/Drawer.svelte';
  import Knob from '../lib/ui/Knob.svelte';
  import Meter from '../lib/ui/Meter.svelte';
  import Select from '../lib/ui/Select.svelte';
  import Toggle from '../lib/ui/Toggle.svelte';
  import { fmt, optionsOf } from '../lib/ui/format';

  const s = $derived(app.settings);
  const live = $derived(app.live.src);
  const D = defaultSettings();
  const divOptions = (Object.keys(DIVS) as Division[]).map((d) => ({ value: d, label: d }));

  /** The two sync modes are exclusive: turning one on turns the other off. */
  function syncChanged(i: number, on: 'bpm' | 'clock' | false) {
    const l = s.lfos[i];
    if (on === 'bpm') l.sync = false;
    if (on === 'clock') l.bpmSync = false;
    app.engine.resetLfo(i);
  }
</script>

{#snippet group(label: string, n: number, knobs: Snippet)}
  <div class="kgroup" style="--n:{n}"><span class="lbl">{label}</span>{@render knobs()}</div>
{/snippet}

<Drawer bind:open={app.settings.view.modulators} title="Modulators" subtitle="the sources feeding the matrix">
  <div class="mods">
    {#each s.lfos as l, i (i)}
      <section style="grid-area: l{i + 1}">
        <h2>LFO {i + 1} <span class="mini"><Meter value={live[`lfo${i + 1}` as SourceId]} bipolar /></span></h2>
        <div class="msel">
          <Select label="Shape" bind:value={l.shape} options={optionsOf(SHAPES)} />
          <Select label="Retrigger" bind:value={l.retrig} options={optionsOf(RETRIG)} onchange={() => app.engine.resetLfo(i)} />
        </div>
        <div class="kgrid">
          {#if l.sync || l.bpmSync}
            <div class="kslot"><Select label="Division" bind:value={l.div} options={divOptions} /></div>
          {:else}
            <Knob label="Rate" bind:value={l.rate} log={[0.01, 50]} def={D.lfos[i].rate} format={fmt.hz} />
          {/if}
          <Knob label="Phase" bind:value={l.phase} min={0} max={359} def={0} format={fmt.deg} />
        </div>
        <div class="mfoot">
          <Toggle label="Sync to BPM" bind:checked={l.bpmSync} onchange={(on) => syncChanged(i, on && 'bpm')} />
          <Toggle label="Sync to clock" bind:checked={l.sync} onchange={(on) => syncChanged(i, on && 'clock')} />
        </div>
      </section>
    {/each}

    <section style="grid-area: vel">
      <h2>Velocity <span class="mini"><Meter value={live.vel} /></span></h2>
      <div class="msel"><Select label="Curve" bind:value={s.vel.curve} options={optionsOf(VEL_CURVES)} /></div>
      <div class="kgrid">
        {#snippet range()}
          <Knob label="Min" bind:value={s.vel.min} min={0} max={100} def={D.vel.min} format={fmt.pct} />
          <Knob label="Max" bind:value={s.vel.max} min={0} max={100} def={D.vel.max} format={fmt.pct} />
        {/snippet}
        {@render group('Range', 2, range)}
      </div>
      <div class="mfoot"><Toggle label="Invert" bind:checked={s.vel.invert} /></div>
    </section>

    <section style="grid-area: env">
      <h2>Note envelope <span class="mini"><Meter value={live.env} /></span></h2>
      <div class="msel"><Select label="Mode" bind:value={s.env.mode} options={optionsOf(ENV_MODES)} /></div>
      <div class="kgrid">
        {#snippet contour()}
          <Knob label="Attack" bind:value={s.env.attack} log={[1, 5000]} def={D.env.attack} format={fmt.ms} />
          <Knob label="Decay/Rel" bind:value={s.env.decay} log={[5, 10000]} def={D.env.decay} format={fmt.ms} />
          <Knob label="Vel amt" bind:value={s.env.velAmt} min={0} max={100} def={D.env.velAmt} format={fmt.pct} />
        {/snippet}
        {@render group('Contour', 3, contour)}
      </div>
      <div class="mfoot"></div>
    </section>

    <section style="grid-area: trig">
      <h2>Trig tools <span class="mini"><Meter value={live.trig} /></span></h2>
      <div class="msel"><Select label="Division" bind:value={s.trig.div} options={divOptions} /></div>
      <div class="kgrid">
        {#snippet timing()}
          <Knob label="Prob" bind:value={s.trig.prob} min={0} max={100} def={D.trig.prob} format={fmt.pct} />
          <Knob label="Swing" bind:value={s.trig.swing} min={50} max={75} def={D.trig.swing} format={fmt.pct} />
        {/snippet}
        {#snippet ratchet()}
          <Knob label="Count" bind:value={s.trig.ratchet} min={1} max={4} def={D.trig.ratchet} />
          <Knob label="Chance" bind:value={s.trig.ratchetProb} min={0} max={100} def={D.trig.ratchetProb} format={fmt.pct} />
        {/snippet}
        {#snippet accent()}
          <Knob label="Min" bind:value={s.trig.accMin} min={0} max={100} def={D.trig.accMin} format={fmt.pct} />
          <Knob label="Max" bind:value={s.trig.accMax} min={0} max={100} def={D.trig.accMax} format={fmt.pct} />
          <Knob label="Decay" bind:value={s.trig.decay} log={[5, 2000]} def={D.trig.decay} format={fmt.ms} />
        {/snippet}
        {@render group('Timing', 2, timing)}
        {@render group('Ratchet', 2, ratchet)}
        {@render group('Accent', 3, accent)}
      </div>
      <div class="mfoot">
        <p class="note">Feeds the "Trig pulse" (decaying accent) and "Trig S&amp;H" (new random value) matrix rows on each clocked step.</p>
      </div>
    </section>
  </div>
</Drawer>

<style>
  /* One shared 12-column grid for every modulator. Each area spans 4 rows (title / selectors / knobs / footer)
     so the module subgrids line up; areas change with the available width. */
  .mods {
    display: grid; gap: 12px 14px; grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-areas:
      "l1 l1 l1 l2 l2 l2 l3 l3 l3 l4 l4 l4" "l1 l1 l1 l2 l2 l2 l3 l3 l3 l4 l4 l4" "l1 l1 l1 l2 l2 l2 l3 l3 l3 l4 l4 l4" "l1 l1 l1 l2 l2 l2 l3 l3 l3 l4 l4 l4"
      "vel vel vel env env env trig trig trig trig trig trig" "vel vel vel env env env trig trig trig trig trig trig" "vel vel vel env env env trig trig trig trig trig trig" "vel vel vel env env env trig trig trig trig trig trig";
  }
  @media (max-width: 1100px) {
    .mods {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      grid-template-areas:
        "l1 l1 l1 l2 l2 l2" "l1 l1 l1 l2 l2 l2" "l1 l1 l1 l2 l2 l2" "l1 l1 l1 l2 l2 l2"
        "l3 l3 l3 l4 l4 l4" "l3 l3 l3 l4 l4 l4" "l3 l3 l3 l4 l4 l4" "l3 l3 l3 l4 l4 l4"
        "vel vel vel env env env" "vel vel vel env env env" "vel vel vel env env env" "vel vel vel env env env"
        "trig trig trig trig trig trig" "trig trig trig trig trig trig" "trig trig trig trig trig trig" "trig trig trig trig trig trig";
    }
  }
  @media (max-width: 600px) {
    .mods {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "l1" "l1" "l1" "l1" "l2" "l2" "l2" "l2" "l3" "l3" "l3" "l3" "l4" "l4" "l4" "l4"
        "vel" "vel" "vel" "vel" "env" "env" "env" "env" "trig" "trig" "trig" "trig";
    }
  }
  .mods > section { display: grid; grid-template-rows: subgrid; row-gap: 12px; }
  .mods > section > h2 { margin: 0; }
  .mini { width: 70px; display: inline-block; vertical-align: middle; }

  .msel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: end; }
  .msel > :global(:only-child) { grid-column: 1 / -1; }

  /* Knobs sit on fixed 62px columns inside each module */
  .kgrid { --kw: 62px; display: grid; grid-template-columns: repeat(auto-fill, var(--kw)); gap: 10px 8px; align-items: start; }
  .kslot { display: flex; flex-direction: column; align-items: center; }
  .kslot :global(.fld) { width: var(--kw); align-items: center; gap: 0; }
  .kslot :global(.lbl) { min-height: 11px; line-height: 1.1; }
  .kslot :global(select) { margin-top: 15px; padding: 5px 14px 5px 5px; background-position: right 4px center; font-size: 10.5px; }
  .kgroup { grid-column: span var(--n); display: grid; grid-template-columns: subgrid; row-gap: 6px; }
  .kgroup > .lbl { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; color: #9aa1ab; }
  .kgroup > .lbl::before, .kgroup > .lbl::after { content: ""; flex: 1; height: 5px; border-top: 1px solid var(--edge); }
  .kgroup > .lbl::before { border-left: 1px solid var(--edge); }
  .kgroup > .lbl::after { border-right: 1px solid var(--edge); }

  .mfoot { display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid #00000080; box-shadow: inset 0 1px 0 #ffffff08; }
  .mfoot:empty { border: 0; box-shadow: none; padding: 0; }
  .mfoot .note { margin: 0; }
</style>
