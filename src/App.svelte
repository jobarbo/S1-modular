<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/state/app.svelte';
  import Header from './sections/Header.svelte';
  import Setup from './sections/Setup.svelte';
  import ModMatrix from './sections/ModMatrix.svelte';
  import Modulators from './sections/Modulators.svelte';
  import Monitor from './sections/Monitor.svelte';

  onMount(() => app.start());
</script>

{#if app.banner}<div class="banner" role="alert">{app.banner}</div>{/if}
<Header />
<main>
  <Setup />
  <ModMatrix />
  <Modulators />
  <Monitor />
</main>

<style>
  main { display: flex; flex-direction: column; gap: 22px; padding: 16px 16px 40px; max-width: 1480px; margin: 0 auto; }
  @media (max-width: 520px) {
    main { padding: 12px 16px 32px; }
  }
  .banner { background: #3a1d22; border: 1px solid var(--bad); color: #ffd0d8; padding: 8px 16px; }
</style>
