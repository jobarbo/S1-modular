<script lang="ts">
  /**
   * Rotary knob. Drag vertically (shift = fine), double-click resets to `def`,
   * arrow keys / PageUp / PageDown / Home / End when focused.
   * With `log`, the travel is logarithmic between log[0] and log[1] (min/max are ignored).
   */
  interface Props {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    log?: [number, number];
    def?: number;
    label?: string;
    format?: (v: number) => string;
    size?: 'md' | 'sm' | 'lg';
    bipolar?: boolean;
    showValue?: boolean;
    onchange?: (v: number) => void;
  }
  let {
    value = $bindable(),
    min = 0,
    max = 127,
    step = 1,
    log,
    def,
    label = '',
    format = (v: number) => String(Math.round(v)),
    size = 'md',
    bipolar = false,
    showValue = true,
    onchange,
  }: Props = $props();

  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const toNorm = (v: number) => clamp(log ? Math.log(v / log[0]) / Math.log(log[1] / log[0]) : (v - min) / (max - min));
  const fromNorm = (p: number) => {
    p = clamp(p);
    if (log) return log[0] * Math.pow(log[1] / log[0], p);
    return Math.round((min + p * (max - min)) / step) * step;
  };

  const norm = $derived(toNorm(value));
  let dragging = $state(false);
  let start = { y: 0, p: 0 };

  function set(v: number) {
    if (v === value) return;
    value = v;
    onchange?.(v);
  }

  function onpointerdown(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    e.preventDefault();
    el.focus({ preventScroll: true });
    el.setPointerCapture(e.pointerId);
    start = { y: e.clientY, p: norm };
    dragging = true;
  }
  function onpointermove(e: PointerEvent) {
    if (!dragging) return;
    set(fromNorm(start.p + (start.y - e.clientY) / (e.shiftKey ? 600 : 150)));
  }
  function endDrag() {
    dragging = false;
  }

  function onkeydown(e: KeyboardEvent) {
    const fine = log ? 0.01 : step / (max - min);
    const moves: Record<string, number> = { ArrowUp: fine, ArrowRight: fine, ArrowDown: -fine, ArrowLeft: -fine, PageUp: 0.1, PageDown: -0.1 };
    if (e.key in moves) set(fromNorm(norm + moves[e.key]));
    else if (e.key === 'Home') set(fromNorm(0));
    else if (e.key === 'End') set(fromNorm(1));
    else return;
    e.preventDefault();
  }

  function ondblclick() {
    if (def !== undefined) set(def);
  }
</script>

<div
  class="knob {size}"
  class:bi={bipolar}
  class:drag={dragging}
  style="--p:{norm}"
  role="slider"
  tabindex="0"
  aria-label={label || undefined}
  aria-valuemin={log ? log[0] : min}
  aria-valuemax={log ? log[1] : max}
  aria-valuenow={value}
  aria-valuetext={format(value)}
  {onpointerdown}
  {onpointermove}
  onpointerup={endDrag}
  onpointercancel={endDrag}
  {onkeydown}
  {ondblclick}
>
  {#if label}<span class="lbl">{label}</span>{/if}
  <div class="dial"><i></i></div>
  {#if showValue}<output>{format(value)}</output>{/if}
</div>

<style>
  .knob {
    --a: 0deg;
    --b: calc(var(--p) * 270deg);
    position: relative; width: 62px; display: flex; flex-direction: column; align-items: center; gap: 5px;
    touch-action: none; cursor: ns-resize; user-select: none; outline: none;
  }
  .knob.bi { --a: calc(min(var(--p), 0.5) * 270deg); --b: calc(max(var(--p), 0.5) * 270deg); }
  .lbl { text-align: center; line-height: 1.1; min-height: 11px; }
  .dial {
    position: relative; width: 40px; height: 40px; margin: 5px 0; border-radius: 50%;
    background: radial-gradient(circle at 35% 28%, #5a5f69, #2a2d33 55%, #1b1d21);
    border: 1px solid #000; box-shadow: 0 3px 5px #000c, inset 0 1px 0 #ffffff30;
  }
  .dial::before {
    content: ""; position: absolute; inset: -6px; border-radius: 50%; pointer-events: none;
    background:
      conic-gradient(from -135deg, transparent 0 var(--a), var(--accent) var(--a) var(--b), transparent var(--b) 360deg),
      conic-gradient(from -135deg, #2d3138 0 270deg, transparent 270deg);
    -webkit-mask: radial-gradient(circle closest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
    mask: radial-gradient(circle closest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
  }
  .dial i { position: absolute; inset: 0; transform: rotate(calc(-135deg + var(--p) * 270deg)); }
  .dial i::before {
    content: ""; position: absolute; left: 50%; top: 3px; width: 3px; height: 13px; margin-left: -1.5px; border-radius: 2px;
    background: var(--accent); box-shadow: 0 0 5px #ff6a2a99;
  }
  .knob:hover .dial { background: radial-gradient(circle at 35% 28%, #666b76, #30343b 55%, #1d2024); }
  .knob.drag .dial::before, .knob:focus-visible .dial::before { filter: drop-shadow(0 0 4px var(--accent)); }
  output {
    display: block; width: 100%; text-align: center; font: 10px/1.5 var(--mono); color: var(--lcd); background: var(--lcd-bg);
    border: 1px solid #000; border-radius: 2px; box-shadow: inset 0 1px 3px #000; white-space: nowrap;
  }

  .sm { width: 46px; gap: 3px; }
  .sm .dial { width: 28px; height: 28px; margin: 4px 0; }
  .sm .dial::before { inset: -4px; }
  .sm .dial i::before { height: 9px; top: 2px; width: 2px; margin-left: -1px; }
  .sm output { font-size: 9.5px; }

  /* Large ridged encoder (the MATRIX knob) */
  .lg { width: 100px; }
  .lg .dial { width: 64px; height: 64px; margin: 9px 0; background: repeating-conic-gradient(from 0deg, #2c3036 0 6deg, #3b4048 6deg 12deg); }
  .lg .dial::after {
    content: ""; position: absolute; inset: 9px; border-radius: 50%;
    background: radial-gradient(circle at 35% 28%, #5a5f69, #2a2d33 60%, #1b1d21); box-shadow: 0 1px 3px #000c, inset 0 1px 0 #ffffff30;
  }
  .lg .dial i { z-index: 1; }
  .lg .dial::before {
    inset: -8px;
    -webkit-mask: radial-gradient(circle closest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
    mask: radial-gradient(circle closest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
  }
  .lg .dial i::before { height: 16px; width: 3px; margin-left: -1.5px; top: 11px; }
</style>
