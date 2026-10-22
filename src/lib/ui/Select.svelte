<script lang="ts" generics="T extends string | number">
  import type { Option } from './format';

  /** Labelled LCD dropdown. Options may carry a `group` to render optgroups. */
  interface Props {
    value: T;
    options: Option<T>[];
    label?: string;
    class?: string;
    onchange?: (v: T) => void;
  }
  let { value = $bindable(), options, label = '', class: cls = '', onchange }: Props = $props();

  const groups = $derived.by(() => {
    const out: { name: string; items: Option<T>[] }[] = [];
    for (const o of options) {
      const name = o.group ?? '';
      let g = out.find((x) => x.name === name);
      if (!g) out.push((g = { name, items: [] }));
      g.items.push(o);
    }
    return out;
  });
</script>

{#snippet opts(items: Option<T>[])}
  {#each items as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
{/snippet}

{#snippet control()}
  <select class={cls} bind:value onchange={() => onchange?.(value)} aria-label={label || undefined}>
    {#each groups as g (g.name)}
      {#if g.name}<optgroup label={g.name}>{@render opts(g.items)}</optgroup>{:else}{@render opts(g.items)}{/if}
    {/each}
  </select>
{/snippet}

{#if label}
  <label class="fld"><span class="lbl">{label}</span>{@render control()}</label>
{:else}
  {@render control()}
{/if}

<style>
  .fld { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
</style>
