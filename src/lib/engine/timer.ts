/**
 * Call `fn` every `ms` from a Worker, so background tabs are not throttled
 * (a plain setInterval drops to 1 Hz when the tab is hidden).
 * Returns a stop function.
 */
export function startTimer(fn: () => void, ms = 2): () => void {
  try {
    const src = 'let id;onmessage=e=>{clearInterval(id);if(e.data)id=setInterval(()=>postMessage(0),e.data)}';
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = fn;
    w.postMessage(ms);
    return () => {
      w.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = setInterval(fn, 4);
    return () => clearInterval(id);
  }
}
