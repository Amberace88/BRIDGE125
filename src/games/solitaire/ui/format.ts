/** 75 → "1:15", 3725 → "1:02:05". */
export function fmtTime(sec: number): string {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** A Riga day (YYYY-MM-DD) as "13 Oct" in the player's language. */
export function dayLabel(day: string, locale: string): string {
  const [y, m, d] = day.split('-').map(Number);
  try { return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d))); } catch { return day; }
}
