import { SOURCE_BY_ID, isSourceId, type SourceId } from './constants';
import type { Settings } from './settings';

/**
 * Sum the matrix contributions per destination CC, in CC units.
 * Only cells on a visible column count. A bipolar source at full depth swings ±63.5,
 * a unipolar one adds 0..127.
 */
export function matrixSums(grid: Settings['grid'], src: Record<SourceId, number>) {
  const sums = new Map<number, number>();
  for (const [key, depth] of Object.entries(grid.cells)) {
    if (!depth) continue;
    const [s, c] = key.split('|');
    const cc = Number(c);
    if (!isSourceId(s) || !grid.cols.includes(cc)) continue;
    const scale = SOURCE_BY_ID[s].bipolar ? 63.5 : 127;
    sums.set(cc, (sums.get(cc) ?? 0) + (src[s] * scale * depth) / 100);
  }
  return sums;
}

export const clampCC = (v: number) => Math.max(0, Math.min(127, Math.round(v)));
