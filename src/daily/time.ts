import { useEffect, useState } from 'react';
import type { DailyStrings } from '../i18n/daily';

const locale = (lang: string) => (lang === 'uk' ? 'uk-UA' : lang);

/** A 'YYYY-MM-DD' day in the player's language (the calendar date itself, independent of the device time zone). */
export function dateLabel(day: string, lang: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const [y, m, d] = day.split('-').map(Number);
  try { return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d))); } catch { return day; }
}

/** "5h 07m" until `target`; under an hour "12m 09s" (ticks every second then, else every 20 s). */
export function useLeft(target: number, s: Pick<DailyStrings, 'time'>) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, target - now);
  const fast = left < 3600_000;
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), fast ? 1000 : 20_000); return () => clearInterval(t); }, [fast]);
  const m = Math.floor(left / 60000), h = Math.floor(m / 60);
  if (h > 0) return { left, text: `${h}${s.time.h} ${String(m % 60).padStart(2, '0')}${s.time.m}` };
  return { left, text: `${Math.max(0, m)}${s.time.m} ${String(Math.floor(left / 1000) % 60).padStart(2, '0')}s` };
}
