import { CC_NAME } from './constants';

/** Human-readable description of a MIDI message, for the monitor. */
export function describe(d: ArrayLike<number>): string {
  const st = d[0] & 0xf0;
  const ch = (d[0] & 0x0f) + 1;
  if (st === 0x90) return `ch${ch} note on  ${d[1]} vel ${d[2]}`;
  if (st === 0x80) return `ch${ch} note off ${d[1]}`;
  if (st === 0xb0) return `ch${ch} CC ${d[1]} = ${d[2]}${CC_NAME[d[1]] ? ' (' + CC_NAME[d[1]] + ')' : ''}`;
  if (d[0] === 0xf8) return 'clock';
  if (d[0] === 0xfa) return 'START';
  if (d[0] === 0xfc) return 'STOP';
  if (d[0] === 0xfb) return 'CONTINUE';
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join(' ');
}
