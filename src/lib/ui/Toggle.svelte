<script lang="ts">
  /** LED push-switch bound to a boolean. */
  interface Props {
    checked: boolean;
    label?: string;
    onchange?: (v: boolean) => void;
  }
  let { checked = $bindable(), label = '', onchange }: Props = $props();
</script>

<label class="tog" class:solo={!label}>
  <input type="checkbox" bind:checked onchange={() => onchange?.(checked)} aria-label={label || undefined} />
  <span class="led"></span>{label}
</label>

<style>
  .tog {
    display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; position: relative;
    padding: 5px 9px; border: 1px solid #000; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--dim);
    background: linear-gradient(180deg, #34383e, #23262b); box-shadow: inset 0 1px 0 #ffffff1c, 0 2px 3px #0008;
  }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .led { flex: none; width: 9px; height: 9px; border-radius: 50%; background: #3a1d12; box-shadow: inset 0 0 0 1px #000, inset 0 1px 2px #000; }
  .tog:has(input:checked) { color: var(--text); }
  input:checked + .led { background: var(--accent); box-shadow: 0 0 8px var(--accent), inset 0 0 0 1px #0005; }
  .tog:has(input:focus-visible) { box-shadow: 0 0 0 1px var(--accent); }
  .solo { padding: 6px; }
</style>
