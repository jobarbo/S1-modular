/** Value formatters for knob readouts. */
export const fmt = {
  int: (v: number) => String(Math.round(v)),
  hz: (v: number) => (v < 1 ? v.toFixed(2) : v.toFixed(1)) + ' Hz',
  ms: (v: number) => Math.round(v) + ' ms',
  pct: (v: number) => Math.round(v) + '%',
  deg: (v: number) => Math.round(v) + '°',
  signed: (v: number) => (v > 0 ? '+' : '') + Math.round(v),
};

export interface Option<V> {
  value: V;
  label: string;
  group?: string;
}

/** Turn a { key: label } record into Select options. */
export const optionsOf = <K extends string>(o: Record<K, string>) => (Object.entries(o) as [K, string][]).map(([value, label]) => ({ value, label }));
