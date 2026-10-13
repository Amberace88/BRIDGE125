import { memo } from 'react';
import { useApp } from '../store';
import { pick } from '../i18n/pick';
import { cosmetic } from '../shop/catalog';
import { titleOf } from './data';
import { seasonItem } from '../season/cosmetics';
import { tgItem } from '../games/tournament/cosmetics';
import { COS_STRINGS } from './i18n';

/** Translated display name of any item id (theme or cosmetic); English fallback, then the id. */
export function cosName(lang: string, id: string, fallback?: string): string {
  return pick(COS_STRINGS, lang).names[id] ?? COS_STRINGS.en.names[id] ?? fallback ?? id;
}

/**
 * Title badge next to a player's name.  <TitleBadge id={cos.equipped.title} />  — renders nothing for 't_none'.
 * size 'sm' for seats (9.5px), default for profile / leaderboard.
 */
export const TitleBadge = memo(function TitleBadge({ id, size }: { id: string | null | undefined; size?: 'sm' }) {
  const { lang } = useApp();
  const t = titleOf(id);
  if (!t) return null;
  const rarity = cosmetic(t.id)?.rarity ?? seasonItem(t.id)?.rarity ?? tgItem(t.id)?.rarity ?? 'rare';
  return <span className={`ttl r-${rarity} ${size ?? ''}`.trim()} data-title={t.id}><b aria-hidden>{t.glyph}</b>{cosName(lang, t.id, t.name)}</span>;
});

/** A player's name in their name colour.  <PlayerName name="Eddie" color={cos.equipped.namecolor} /> */
export const PlayerName = memo(function PlayerName({ name, color, className = '' }: { name: string; color: string | null | undefined; className?: string }) {
  return <span className={`nc nc-${color ?? 'nc_default'} ${className}`.trim()}>{name}</span>;
});
