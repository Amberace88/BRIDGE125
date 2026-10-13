import { memo, useId, type CSSProperties } from 'react';
import { achDef, type AchTier } from './achievements';

/**
 * Tiered metal medallion (bronze / silver / gold / platinum) with an engraved glyph.
 *   <TierMedal code="exact_125" size={64} />                 unlocked: polished metal + travelling sheen
 *   <TierMedal code="exact_125" size={64} locked />          locked: dark silhouette of the same medal
 *   <TierMedal code="s_ghost" size={64} locked secret />     secret: obsidian disc with a "?"
 * `ring` (0..1) draws a progress ring around a locked medal.
 * Styles: src/styles/achievements.css (loaded by Rewards.tsx, i.e. globally).
 */
export const TierMedal = memo(function TierMedal({ code, size = 56, locked = false, secret = false, ring, glow = false, className = '', style }: {
  code: string; size?: number; locked?: boolean; secret?: boolean; ring?: number; glow?: boolean; className?: string; style?: CSSProperties;
}) {
  const d = achDef(code);
  const tier: AchTier = d?.tier ?? 'bronze';
  const hidden = locked && secret;
  const glyph = hidden ? '?' : d?.glyph ?? '★';
  const fs = size * (glyph.length >= 4 ? 0.2 : glyph.length === 3 ? 0.25 : glyph.length === 2 ? 0.32 : 0.4);
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const r = size / 2 + 5, c = 2 * Math.PI * r;
  return (
    <span className={`tmedal t-${tier} ${locked ? 'locked' : 'got'} ${hidden ? 'hidden' : ''} ${glow ? 'glow' : ''} ${size < 40 ? 'sm' : ''} ${className}`.trim()}
      style={{ width: size, height: size, ['--ms' as string]: `${size}px`, ...style }} aria-hidden>
      {ring !== undefined && locked && !hidden && ring > 0 && (
        <svg className="tmring" width={size + 14} height={size + 14} viewBox={`0 0 ${size + 14} ${size + 14}`}>
          <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--tm-hi)' }} /><stop offset="1" style={{ stopColor: 'var(--tm-lo)' }} /></linearGradient></defs>
          <circle cx={size / 2 + 7} cy={size / 2 + 7} r={r} className="tmring-track" />
          <circle cx={size / 2 + 7} cy={size / 2 + 7} r={r} className="tmring-arc" stroke={`url(#${id})`} strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, Math.max(0, ring)))} transform={`rotate(-90 ${size / 2 + 7} ${size / 2 + 7})`} />
        </svg>
      )}
      <span className="tmrim" />
      <span className="tmface"><b style={{ fontSize: fs }}>{glyph}</b></span>
      {!locked && <span className="tmsheen" />}
      {locked && !hidden && <span className="tmlock" />}
    </span>
  );
});
