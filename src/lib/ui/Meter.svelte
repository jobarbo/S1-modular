<script lang="ts">
  /**
   * Segmented LED meter. Unipolar: 0..1 fills from the left.
   * Bipolar: -1..1 fills from the centre line.
   */
  interface Props {
    value: number;
    bipolar?: boolean;
    variant?: 'src' | 'out';
    class?: string;
  }
  let { value, bipolar = false, variant = 'src', class: cls = '' }: Props = $props();

  const v = $derived(Math.max(bipolar ? -1 : 0, Math.min(1, value || 0)));
  const left = $derived(bipolar ? 50 + Math.min(0, v) * 50 : 0);
  const width = $derived(bipolar ? Math.abs(v) * 50 : v * 100);
</script>

<span class="meter {variant} {cls}" class:bi={bipolar}><i style="left:{left}%;width:{width}%"></i></span>

<style>
  .meter {
    display: block; height: 8px; background: var(--lcd-bg); border: 1px solid #000; border-radius: 2px;
    position: relative; overflow: hidden; box-shadow: inset 0 1px 3px #000;
  }
  i { position: absolute; top: 0; bottom: 0; background: var(--accent2); box-shadow: 0 0 6px var(--accent2); }
  .out i { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
  .meter::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 4px, var(--lcd-bg) 4px 5px); }
  .bi::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #5a6a63; z-index: 1; }
</style>
