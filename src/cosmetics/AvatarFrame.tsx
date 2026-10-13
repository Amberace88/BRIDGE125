import { memo, useId, type CSSProperties, type ReactNode } from 'react';

/**
 * Animated ring around any avatar.
 *   <AvatarFrame id="fr_laurel" size={64}><UserAvatar size={64} /></AvatarFrame>
 * `size` is the avatar's diameter; decorations overflow it by ~20 % on each side (keep some room around it).
 * Unknown / 'fr_none' ids render the children untouched.
 */
export const AvatarFrame = memo(function AvatarFrame({ id, size, children, className = '', style }: { id: string | null | undefined; size: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  const kind = (id ?? '').replace(/^fr_/, '');
  if (!kind || kind === 'none' || !DECOR[kind]) return <>{children}</>;
  return (
    <span className={`afr afr-${kind} ${className}`.trim()} style={{ ['--afs' as string]: `${size}px`, ...style }} data-frame={id}>
      {DECOR[kind].back}
      <span className="afr-in">{children}</span>
      <span className="afr-ring" aria-hidden />
      {DECOR[kind].front}
    </span>
  );
});

/** useId() → a string that is safe inside url(#…) */
export const useSvgId = () => 'g' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

const Laurel = () => {
  const g = useSvgId();
  // one branch (left), mirrored for the right — leaves along an arc around the lower 2/3 of the ring
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const a = (200 - i * 17) * Math.PI / 180, r = 60;
    const x = 70 + Math.cos(a) * r, y = 70 - Math.sin(a) * r;
    const rot = 90 - (200 - i * 17) + 30;
    return <ellipse key={i} cx={x} cy={y} rx="5.2" ry="11" transform={`rotate(${rot} ${x} ${y})`} fill={`url(#${g})`} stroke="#6b4d17" strokeWidth=".8" />;
  });
  return (
    <svg className="laurel" viewBox="0 0 140 140" aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset=".45" stopColor="#e2bd62" /><stop offset="1" stopColor="#8c6e28" /></linearGradient>
      </defs>
      <path d="M70 130 C40 128 14 104 12 72" fill="none" stroke="#a37a26" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M70 130 C100 128 126 104 128 72" fill="none" stroke="#a37a26" strokeWidth="2.2" strokeLinecap="round" />
      <g>{leaves}</g>
      <g transform="translate(140 0) scale(-1 1)">{leaves}</g>
      <path d="M62 128 L70 136 L78 128 L70 124Z" fill={`url(#${g})`} stroke="#6b4d17" strokeWidth=".8" />
    </svg>
  );
};

const IceCrystals = () => {
  const g = useSvgId();
  return (
  <svg className="ice" viewBox="0 0 148 148" aria-hidden>
    <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#7cc7ff" stopOpacity=".7" /></linearGradient></defs>
    {Array.from({ length: 8 }, (_, i) => (
      <g key={i} transform={`rotate(${i * 45} 74 74)`}>
        <path d={i % 2 ? 'M74 2 L78 16 L74 22 L70 16Z' : 'M74 0 L79 14 L74 24 L69 14Z'} fill={`url(#${g})`} />
        {i % 2 === 0 && <path d="M74 8 L80 4 M74 8 L68 4" stroke="#e9f8ff" strokeWidth="1.2" strokeLinecap="round" />}
      </g>
    ))}
  </svg>
  );
};

const Crown = () => {
  const g = useSvgId();
  return (
  <svg className="crown" viewBox="0 0 62 44" aria-hidden>
    <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d8" /><stop offset=".4" stopColor="#e9c46a" /><stop offset="1" stopColor="#8c6e28" /></linearGradient></defs>
    <path d="M5 38 L2 10 L17 22 L31 3 L45 22 L60 10 L57 38Z" fill={`url(#${g})`} stroke="#5c430f" strokeWidth="1.4" strokeLinejoin="round" />
    <rect x="5" y="35" width="52" height="7" rx="2" fill={`url(#${g})`} stroke="#5c430f" strokeWidth="1.2" />
    <circle cx="31" cy="25" r="4" fill="#e8344f" stroke="#5c430f" /><circle cx="16" cy="29" r="2.6" fill="#5aa8ff" /><circle cx="46" cy="29" r="2.6" fill="#5aa8ff" />
    <circle cx="2" cy="10" r="2.6" fill="#fff2c4" /><circle cx="31" cy="3" r="3" fill="#fff2c4" /><circle cx="60" cy="10" r="2.6" fill="#fff2c4" />
  </svg>
  );
};

/** Season 1 "Jazz Age Halo": an art-deco sunburst behind the ring and a cut brass gem on top. */
const DecoRays = () => {
  const g = useSvgId();
  return (
    <svg className="s1-rays" viewBox="0 0 172 172" aria-hidden>
      <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d8" /><stop offset=".5" stopColor="#e2bd62" /><stop offset="1" stopColor="#8c6e28" stopOpacity=".2" /></linearGradient></defs>
      {Array.from({ length: 24 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 15} 86 86)`} d={i % 2 ? 'M86 14 L89 40 L83 40Z' : 'M86 2 L90.5 40 L81.5 40Z'} fill={`url(#${g})`} opacity={i % 2 ? 0.7 : 1} />
      ))}
    </svg>
  );
};
const DecoGem = () => {
  const g = useSvgId();
  return (
    <svg className="s1-gem" viewBox="0 0 40 40" aria-hidden>
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6d8" /><stop offset=".45" stopColor="#e2bd62" /><stop offset="1" stopColor="#7d5d1c" /></linearGradient></defs>
      <path d="M20 2 L34 20 L20 38 L6 20Z" fill={`url(#${g})`} stroke="#4a3608" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 9 L28 20 L20 31 L12 20Z" fill="#0b2a33" stroke="#fff2c4" strokeWidth="1" strokeLinejoin="round" />
      <path d="M20 13 L24 20 L20 27 L16 20Z" fill="#5fd0c2" opacity=".8" />
    </svg>
  );
};

const glint = (top: string, left: string, delay = '0s') => <span className="afr-glint" style={{ top, left, animationDelay: delay }} aria-hidden />;

const DECOR: Record<string, { back?: ReactNode; front?: ReactNode }> = {
  brass: {},
  neon: { back: <span className="afr-glow" aria-hidden /> },
  laurel: { front: <><Laurel />{glint('-6%', '74%', '.4s')}</> },
  flames: {
    back: <>
      <span className="afr-glow" aria-hidden />
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="afr-flame" aria-hidden style={{ transform: `rotate(${i * 30}deg) translateY(calc(var(--afs) * -.3))` }}>
          <i style={{ ['--fd' as string]: `${0.7 + (i % 4) * 0.12}s`, ['--fdl' as string]: `${-(i * 0.17)}s` }} />
        </span>
      ))}
    </>,
  },
  ice: { back: <span className="afr-glow" aria-hidden />, front: <><IceCrystals />{glint('4%', '78%', '1s')}</> },
  crown: {
    front: <>
      <span className="afr-gems" aria-hidden>
        {[45, 90, 135, 225, 270, 315].map((a, i) => <i key={i} style={{ transform: `rotate(${a + 90}deg) translateX(calc(var(--afs) * .575)) rotate(${-a - 90}deg)` }} />)}
      </span>
      <Crown />
    </>,
  },
  diamond: {
    back: <span className="afr-glow" aria-hidden />,
    front: <>{glint('-4%', '72%')}{glint('70%', '-6%')}{glint('80%', '82%')}{glint('-2%', '6%')}</>,
  },
  // earned frames (migration 012): the ring itself is CSS (.afr-ach_fr_* in styles/cosmetics.css)
  ach_fr_veteran: { front: <>{glint('-4%', '74%', '.6s')}</> },
  ach_fr_prestige: { back: <span className="afr-glow" aria-hidden />, front: <>{glint('70%', '-6%')}{glint('-2%', '70%', '1.2s')}</> },
  ach_fr_obsidian: { back: <span className="afr-glow" aria-hidden /> },
  // invite-only (migration 014): two gems — you and your friend — circling the ring
  ach_fr_envoy: { back: <span className="afr-glow" aria-hidden />, front: <span className="afr-orbit" aria-hidden><i /><i /></span> },
  // Season Pass frames (migration 016): ring CSS in styles/season-cosmetics.css
  s1_fr_gilded: { back: <><span className="afr-glow" aria-hidden /><DecoRays /></>, front: <><DecoGem />{glint('62%', '84%', '.8s')}</> },
};

/** Frame ids with decor: 'fr_<k>' for the shop frames, the earned 'ach_fr_*' / season 's1_fr_*' ids as they are. */
export const FRAME_IDS = Object.keys(DECOR).map(k => (/^(ach|s\d+)_/.test(k) ? k : `fr_${k}`));
