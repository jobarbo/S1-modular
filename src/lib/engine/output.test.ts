import { describe, expect, it } from 'vitest';
import { CcOutput } from './output';

describe('CcOutput', () => {
  it('only sends values that changed', () => {
    const sent: [number, number][] = [];
    const out = new CcOutput((cc, v) => sent.push([cc, v]));
    const vals = new Map([[74, 10]]);
    out.flush(vals, 1000, 0.01, 0);
    out.flush(vals, 1000, 0.01, 10);
    expect(sent).toEqual([[74, 10]]);
  });

  it('respects the rate budget and serves destinations round-robin', () => {
    const sent: number[] = [];
    const out = new CcOutput((cc) => sent.push(cc));
    const vals = new Map([[1, 1], [2, 1], [3, 1], [4, 1]]);
    // 100 msg/s for 20 ms = 2 messages
    out.flush(vals, 100, 0.02, 0);
    expect(sent).toHaveLength(2);
    out.flush(vals, 100, 0.02, 20);
    expect(new Set(sent)).toEqual(new Set([1, 2, 3, 4]));
  });

  it('recognises its own CCs coming back as echoes', () => {
    const out = new CcOutput(() => {});
    out.send(74, 80, 1000);
    expect(out.isEcho(74, 81, 1100)).toBe(true);
    expect(out.isEcho(74, 90, 1100)).toBe(false);
    expect(out.isEcho(74, 80, 1300)).toBe(false);
  });
});
