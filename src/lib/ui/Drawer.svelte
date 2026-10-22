<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Collapsible page zone with an engraved title bar. */
  interface Props {
    open: boolean;
    title: string;
    subtitle?: string;
    children: Snippet;
  }
  let { open = $bindable(), title, subtitle = '', children }: Props = $props();
</script>

<details class="zone" bind:open>
  <summary>{title} {#if subtitle}<span>{subtitle}</span>{/if}</summary>
  <div class="body">{@render children()}</div>
</details>

<style>
  .zone { display: flex; flex-direction: column; min-width: 0; }
  summary {
    display: flex; align-items: baseline; gap: 12px; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
    color: #c9ced6; padding-bottom: 6px; border-bottom: 1px solid var(--line); list-style: none; cursor: pointer; user-select: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: "\25B8"; color: var(--accent); transition: transform 0.15s; }
  details[open] > summary::before { transform: rotate(90deg); }
  summary span { font-size: 11px; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--dim); }
  .body { margin-top: 12px; min-width: 0; }
</style>
