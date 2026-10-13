/** 75 → "1:15", 3725 → "1:02:05". */
export function fmtTime(sec: number): string {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "5h 07m" / "12m" for a duration. */
export function fmtLeft(ms: number, u: { h: string; m: string } = { h: 'h', m: 'm' }): string {
  const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60);
  return h ? `${h}${u.h} ${String(m % 60).padStart(2, '0')}${u.m}` : `${m}${u.m}`;
}
