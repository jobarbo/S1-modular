<script lang="ts">
  import { app } from '../lib/state/app.svelte';

  let fileInput: HTMLInputElement;

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      app.importPreset(JSON.parse(await f.text()));
    } catch (err) {
      alert('Invalid preset file: ' + (err as Error).message);
    }
    input.value = '';
  }

  function onReset() {
    if (confirm('Reset all settings to defaults?')) app.reset();
  }

  const live = $derived(app.live);
</script>

<header>
  <div class="brand"><b>S-1</b><span>MODHUB</span></div>
  <div class="status lcd">
    <span class:on={live.inName}>IN {live.inName || 'none'}</span>
    <span class:on={live.outName}>OUT {live.outName || 'monitor only'}</span>
    <span class:on={live.external}>{live.external ? 'EXT ' + live.bpm.toFixed(1) : 'INT ' + live.bpm} BPM</span>
    <span>{live.bar}.{live.beat}</span>
  </div>
  <div class="spacer"></div>
  <div class="btngroup">
    <span class="lbl">Preset</span>
    <button onclick={() => app.exportPreset()}>Export</button>
    <button onclick={() => fileInput.click()}>Import</button>
    <button onclick={onReset}>Reset</button>
  </div>
  <div class="btngroup">
    <button onclick={() => app.restoreKnobs()} title="Send the base (knob) value of every modulated CC">Restore knobs</button>
    <button class="danger" onclick={() => app.allOff()} title="Clear every matrix routing and restore knobs">All off</button>
  </div>
  <input bind:this={fileInput} type="file" accept="application/json" hidden onchange={onImport} />
</header>

<style>
  header {
    display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding: 10px 16px; position: sticky; top: 0; z-index: 2;
    background: linear-gradient(180deg, #24272c, #17191d); border-bottom: 1px solid #000; box-shadow: 0 4px 12px #000a, inset 0 1px 0 #ffffff14;
  }
  .brand { display: flex; align-items: baseline; gap: 8px; }
  .brand b { font-size: 20px; letter-spacing: 1px; color: var(--accent); text-shadow: 0 0 10px #ff6a2a66; }
  .brand span { font-size: 11px; letter-spacing: 4px; color: #aab0b9; }
  .status { font-family: var(--mono); font-size: 12px; color: var(--lcd-dim); display: flex; gap: 16px; flex-wrap: wrap; text-transform: uppercase; }
  .status .on { color: var(--lcd); text-shadow: 0 0 6px #7dffb088; }
  .spacer { flex: 1; }
  .btngroup { display: flex; align-items: center; gap: 6px; padding-left: 12px; border-left: 1px solid #000; box-shadow: -1px 0 0 #ffffff10; }
  .btngroup .lbl { margin-right: 2px; }
</style>
