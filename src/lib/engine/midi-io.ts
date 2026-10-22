export interface PortInfo {
  id: string;
  name: string;
}

const isS1 = (p: PortInfo) => /s-?1\b/i.test(p.name);

/** Pick the saved port if it still exists, otherwise the first port named like an S-1. */
export function choosePort(ports: PortInfo[], saved: string, fallback: string): string {
  if (saved && (saved === fallback || ports.some((p) => p.id === saved))) return saved;
  return ports.find(isS1)?.id ?? fallback;
}

/** Thin wrapper over Web MIDI: port lists, the bound input/output, and sending. */
export class MidiIO {
  private access: MIDIAccess | null = null;
  input: MIDIInput | null = null;
  output: MIDIOutput | null = null;
  private onMessage: (data: Uint8Array, now: number) => void = () => {};

  static get supported() {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  /** Throws if access is refused. `onPorts` fires whenever devices come and go. */
  async init(onPorts: () => void) {
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.onstatechange = onPorts;
  }

  get inputs(): PortInfo[] {
    return this.access ? [...this.access.inputs.values()].map((p) => ({ id: p.id, name: p.name ?? p.id })) : [];
  }

  get outputs(): PortInfo[] {
    return this.access ? [...this.access.outputs.values()].map((p) => ({ id: p.id, name: p.name ?? p.id })) : [];
  }

  listen(fn: (data: Uint8Array, now: number) => void) {
    this.onMessage = fn;
  }

  /** Bind ports by id; an unknown id (or the monitor-only sentinel) leaves that side unbound. */
  bind(inId: string, outId: string) {
    if (this.input) this.input.onmidimessage = null;
    this.input = (inId && this.access?.inputs.get(inId)) || null;
    this.output = (outId && this.access?.outputs.get(outId)) || null;
    // Stamp with performance.now(): the engine compares it with its own tick times.
    if (this.input) this.input.onmidimessage = (e) => e.data && this.onMessage(e.data, performance.now());
  }

  send(bytes: number[]) {
    this.output?.send(bytes);
  }
}
