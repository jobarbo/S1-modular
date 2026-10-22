<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../lib/state/app.svelte';
  import { CC_MAP, CC_NAME, SOURCES, SOURCE_BY_ID, type SourceId } from '../lib/engine/constants';
  import { cellKey } from '../lib/engine/settings';
  import Drawer from '../lib/ui/Drawer.svelte';
  import Knob from '../lib/ui/Knob.svelte';
  import Meter from '../lib/ui/Meter.svelte';
  import Select from '../lib/ui/Select.svelte';
  import { fmt } from '../lib/ui/format';

  const s = $derived(app.settings);
  const cols = $derived(s.grid.cols);
  const dstOptions = CC_MAP.map((d) => ({ value: d.cc, label: `${d.name} (CC${d.cc})`, group: d.group }));

  const depth = (src: SourceId, cc: number) => s.grid.cells[cellKey(src, cc)] ?? 0;
  const setDepth = (src: SourceId, cc: number, v: number) => (s.grid.cells[cellKey(src, cc)] = v);
  const routed = $derived(new Set(SOURCES.filter((src) => cols.some((cc) => depth(src.id, cc))).map((src) => src.id)));

  // Keep the cursor on a visible column
  $effect(() => {
    if (!cols.includes(app.sel.cc)) app.sel.cc = cols[0];
  });
  const sel = $derived(app.sel);
  const selDepth = $derived(depth(sel.src, sel.cc));

  /** Click: move the cursor there; an empty cell gets routed at +50. */
  function pick(src: SourceId, cc: number, create = true) {
    app.sel = { src, cc };
    if (create && !depth(src, cc)) setDepth(src, cc, 50);
  }

  /** Arrow keys move the cursor like the MATRIX encoder; +/- nudge the amount. */
  async function onkeydown(e: KeyboardEvent, row: number, col: number) {
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (e.key in moves) {
      const [dr, dc] = moves[e.key];
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= SOURCES.length || c < 0 || c >= cols.length) return;
      e.preventDefault();
      pick(SOURCES[r].id, cols[c], false);
      await tick();
      document.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`)?.focus();
    } else if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault();
      setDepth(sel.src, sel.cc, Math.max(-100, Math.min(100, selDepth + (e.key === '-' ? -5 : 5))));
    }
  }

  const baseValue = (cc: number) => s.bases[cc] ?? 64;
  /** Moving a base knob here overrides what was captured from the S-1. */
  function setBase(cc: number, v: number) {
    s.bases[cc] = v;
    s.captured[cc] = false;
  }
</script>

<Drawer bind:open={app.settings.view.matrix} title="Mod matrix" subtitle="sources × destinations">
  <section>
    <div class="mxwrap">
      <div class="table-scroll mxgrid">
        <table class="matrix">
          <colgroup><col class="c0" />{#each cols as _, i (i)}<col />{/each}</colgroup>
          <tbody>
            <tr class="top">
              <th class="rowh">SRC / DST</th>
              {#each cols as _, i (i)}
                <th><Select class="cs" bind:value={s.grid.cols[i]} options={dstOptions} /></th>
              {/each}
            </tr>
            {#each SOURCES as src, r (src.id)}
              <tr class="scr">
                <th class="rowh">
                  <div class="rh">
                    <span class="rled" class:on={routed.has(src.id)}></span>
                    <span class="rn">{src.name}</span>
                    <Meter class="mm" value={app.live.src[src.id]} bipolar={src.bipolar} />
                  </div>
                </th>
                {#each cols as cc, c (c)}
                  {@const d = depth(src.id, cc)}
                  <td>
                    <button
                      class="pad"
                      class:on={d !== 0}
                      class:neg={d < 0}
                      class:sel={sel.src === src.id && sel.cc === cc}
                      style="--l:{50 + Math.min(0, d) / 2}%;--w:{Math.abs(d) / 2}%;--m:{Math.abs(d) / 100}"
                      data-cell="{r}-{c}"
                      aria-label="{src.name} to {CC_NAME[cc]}"
                      title="{src.name} to {CC_NAME[cc]}: {fmt.signed(d)}"
                      onclick={() => pick(src.id, cc)}
                      ondblclick={() => setDepth(src.id, cc, 0)}
                      onkeydown={(e) => onkeydown(e, r, c)}>{d ? fmt.signed(d) : '·'}</button
                    >
                  </td>
                {/each}
              </tr>
            {/each}
            <tr class="sep">
              <th class="rowh">S-1 knob</th>
              {#each cols as cc, c (c)}
                <td>
                  <Knob size="sm" value={baseValue(cc)} onchange={(v) => setBase(cc, v)} def={64} />
                  <span class="cap" class:ok={s.captured[cc]}>{s.captured[cc] ? 'captured' : 'not captured'}</span>
                </td>
              {/each}
            </tr>
            <tr>
              <th class="rowh">Output</th>
              {#each cols as cc, c (c)}
                {@const v = app.live.out[cc]}
                <td class="out">
                  <Meter variant="out" value={v === undefined ? 0 : v / 127} />
                  <span>{v ?? 'idle'}</span>
                </td>
              {/each}
            </tr>
          </tbody>
        </table>
      </div>

      <div class="enc">
        <div class="lcd screen">
          <span>{SOURCE_BY_ID[sel.src].name}</span>
          <span>▶ {CC_NAME[sel.cc]}</span>
          <b>{fmt.signed(selDepth)}</b>
          <small>CC{sel.cc} · {selDepth ? 'ROUTED' : 'OFF'}</small>
        </div>
        <Knob
          size="lg"
          bipolar
          showValue={false}
          min={-100}
          max={100}
          def={0}
          bind:value={() => selDepth, (v) => setDepth(sel.src, sel.cc, v)}
        />
        <span class="lbl">Matrix</span>
        <button onclick={() => setDepth(sel.src, sel.cc, 0)}>Clear routing</button>
      </div>
    </div>
    <p class="note">
      Click a cell to route it, then turn MATRIX. Arrows move the cursor, +/- nudge, double-click clears. Output = S-1 knob + sum of (source × amount).
      The knob row follows the S-1 panel once you turn a knob there ("captured"); until then it assumes 64.
    </p>
  </section>
</Drawer>

<style>
  .mxwrap { display: flex; flex-wrap: wrap; gap: 14px; align-items: stretch; }
  .mxgrid, .enc { border-radius: 6px; background: linear-gradient(180deg, #17191c, #131417); box-shadow: inset 0 2px 5px #000c, 0 1px 0 #ffffff10; }
  .mxgrid { flex: 1 1 640px; min-width: 0; padding: 10px 12px 8px; }

  .matrix { width: 100%; min-width: 660px; table-layout: fixed; border-collapse: separate; border-spacing: 6px 5px; }
  .c0 { width: 152px; }
  th { padding: 0; font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--dim); text-shadow: 0 1px 0 #000; vertical-align: middle; }
  .rowh { text-align: left; white-space: nowrap; }
  .scr .rowh { color: #b4bac3; }
  .top > * { padding-bottom: 5px; vertical-align: bottom; }
  .top .rowh { font-size: 8.5px; color: #5f6670; padding-bottom: 11px; }
  td { padding: 0; text-align: center; vertical-align: middle; }
  .sep > * {
    padding-top: 12px;
    background: linear-gradient(#000, #000) top / 100% 1px no-repeat, linear-gradient(#ffffff0c, #ffffff0c) 0 1px / 100% 1px no-repeat;
  }
  .matrix :global(select.cs) { width: 100%; font-size: 10px; padding: 5px 16px 5px 6px; background-position: right 5px center; }
  .rh { display: flex; align-items: center; gap: 8px; }
  .rn { flex: 1; overflow: hidden; text-overflow: ellipsis; }
  .rh :global(.mm) { flex: none; width: 34px; height: 6px; }
  .rled { flex: none; width: 7px; height: 7px; border-radius: 50%; background: #3a1d12; box-shadow: inset 0 0 0 1px #000, inset 0 1px 2px #000; }
  .rled.on { background: var(--accent); box-shadow: 0 0 6px var(--accent), inset 0 0 0 1px #0005; }

  /* Backlit rubber pads: orange for positive depth, teal for negative, brighter with |depth| */
  .pad {
    --led: var(--accent);
    position: relative; display: block; width: 100%; height: 30px; padding: 0 0 5px; cursor: pointer;
    font: 10.5px/1 var(--mono); letter-spacing: 0; text-transform: none; color: #5f6670;
    border: 1px solid #000; border-radius: 5px; background: linear-gradient(180deg, #30333a, #222429);
    box-shadow: inset 0 1px 0 #ffffff1c, 0 2px 3px #0009;
  }
  .pad.neg { --led: var(--accent2); }
  .pad.on {
    color: #fff; text-shadow: 0 0 4px var(--led);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--led) calc(28% + var(--m) * 45%), #30333a),
      color-mix(in srgb, var(--led) calc(16% + var(--m) * 35%), #1d1f23)
    );
    box-shadow: inset 0 1px 0 #ffffff26, 0 2px 3px #0009, 0 0 calc(4px + var(--m) * 10px) color-mix(in srgb, var(--led) 45%, transparent);
  }
  .pad::before { content: ""; position: absolute; left: 16%; right: 16%; bottom: 5px; height: 2px; border-radius: 1px; background: #0008; }
  .pad::after {
    content: ""; position: absolute; bottom: 5px; height: 2px; border-radius: 1px;
    left: calc(16% + var(--l) * 0.68); width: calc(var(--w) * 0.68); background: var(--led); box-shadow: 0 0 4px var(--led);
  }
  .pad.on::after { background: #fff; }
  .pad:hover { box-shadow: inset 0 1px 0 #ffffff26, 0 2px 3px #0009, 0 0 0 1px #4a505a; color: var(--text); }
  .pad:active, .pad.sel { transform: translateY(1px); }
  .pad.sel { box-shadow: inset 0 2px 4px #0008, 0 0 0 1px #000, 0 0 0 3px var(--warn); }
  .pad:focus-visible { outline: none; }

  .out { font: 10.5px var(--mono); color: var(--lcd); }
  .out :global(.meter) { margin: 0 4px 3px; }
  td :global(.knob) { margin: 0 auto; }
  .cap { display: block; text-align: center; font-size: 9px; color: var(--warn); letter-spacing: 0.3px; }
  .cap.ok { color: var(--lcd); }

  /* MATRIX encoder */
  .enc { flex: 0 0 190px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 14px 12px; }
  .screen {
    display: flex; flex-direction: column; align-items: center; gap: 1px; width: 100%; padding: 8px 6px;
    font: 10.5px var(--mono); color: var(--lcd); text-align: center; text-transform: uppercase;
  }
  .screen > span:first-child { color: var(--lcd-dim); }
  .screen b { font-size: 24px; font-weight: 400; margin: 4px 0 1px; text-shadow: 0 0 8px #7dffb066; }
  .screen small { color: var(--lcd-dim); font-size: 9px; letter-spacing: 1px; }
  .enc > .lbl { font-size: 10px; letter-spacing: 2.5px; color: #b4bac3; }
  .enc button { width: 100%; }
  @media (max-width: 1100px) {
    .enc { flex: 1 1 100%; flex-direction: row; flex-wrap: wrap; gap: 18px; }
    .screen { width: 180px; }
    .enc button { width: auto; }
  }
</style>
