import { memo } from 'react';

/** Prestige star next to a player's name: ✵ with the prestige number (renders nothing at prestige 0). */
export const PrestigeStar = memo(function PrestigeStar({ n, size = 13 }: { n: number | null | undefined; size?: number }) {
  if (!n || n < 1) return null;
  return (
    <span className="pstarb" title={`Prestige ${n}`} style={{ fontSize: size }}>
      <i aria-hidden>✵</i>{n > 1 && <b>{n}</b>}
    </span>
  );
});
