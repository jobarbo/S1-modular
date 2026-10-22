<script lang="ts">
  import { app } from '../lib/state/app.svelte';
  import Drawer from '../lib/ui/Drawer.svelte';
  import Toggle from '../lib/ui/Toggle.svelte';

  let box: HTMLDivElement | undefined = $state();

  // Stick to the bottom while the user has not scrolled up
  $effect.pre(() => {
    void app.monitor.lines;
    if (!box) return;
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 20;
    if (atBottom) queueMicrotask(() => box && (box.scrollTop = box.scrollHeight));
  });
</script>

<Drawer bind:open={app.settings.view.monitor} title="MIDI monitor" subtitle="incoming and outgoing messages">
  <section>
    <div class="btns">
      <Toggle label="clock" bind:checked={app.monitor.showClock} />
      <Toggle label="outgoing" bind:checked={app.monitor.showOut} />
      <button onclick={() => app.clearLog()}>Clear</button>
    </div>
    <div class="log" bind:this={box}>
      {#each app.monitor.lines as line (line.id)}
        <div class={line.dir}>{line.t} {line.dir === 'in' ? '<-' : '->'} {line.text}</div>
      {/each}
    </div>
  </section>
</Drawer>

<style>
  .btns { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .log {
    font: 11px/1.4 var(--mono); height: 220px; overflow: auto; margin-top: 10px; padding: 8px; white-space: pre;
    background: var(--lcd-bg); border: 1px solid #000; border-radius: 3px; color: var(--lcd-dim); box-shadow: inset 0 2px 8px #000;
  }
  .in { color: var(--lcd); }
  .out { color: var(--accent); }
</style>
