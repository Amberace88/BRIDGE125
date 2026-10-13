import { useId } from 'react';

/**
 * Hand-drawn gift art (SVG, 48×48 viewBox): layered gradients + a specular highlight so every gift reads as a small
 * lit object on the felt. No emoji — identical on every platform.
 */
export function GiftArt({ id, size = 48, className }: { id: string; size?: number; className?: string }) {
  const u = useId().replace(/:/g, '');
  const g = (n: string) => `${n}${u}`;
  const url = (n: string) => `url(#${g(n)})`;
  const common = { width: size, height: size, viewBox: '0 0 48 48', className: `giftart ${className ?? ''}`, 'aria-hidden': true } as const;

  switch (id) {
    case 'clover':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={g('l')} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#C9FFB8" /><stop offset=".45" stopColor="#52D272" /><stop offset="1" stopColor="#13703A" /></radialGradient>
          </defs>
          <path d="M24 26c2 6 3 11 8 16" stroke="#1F7A3A" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          {[0, 90, 180, 270].map(r => (
            <path key={r} transform={`rotate(${r + 45} 24 24)`} fill={url('l')} stroke="#0F5A2B" strokeWidth=".8"
              d="M24 24c-1.5-4-6.5-7.5-9.5-5s-1 7 2.5 7.5c-3.5.5-3.5 5 0 5.5 3 .4 6-3 7-8z" />
          ))}
          <circle cx="24" cy="24" r="2.2" fill="#E9FFD8" opacity=".8" />
          <ellipse cx="17" cy="15" rx="3" ry="1.6" fill="#fff" opacity=".45" transform="rotate(-35 17 15)" />
        </svg>
      );
    case 'rose':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={g('p')} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#FF9AAE" /><stop offset=".5" stopColor="#E3224A" /><stop offset="1" stopColor="#7A0620" /></radialGradient>
            <linearGradient id={g('s')} x1="0" x2="1"><stop offset="0" stopColor="#2E9A4E" /><stop offset="1" stopColor="#13602D" /></linearGradient>
          </defs>
          <path d="M24 26v19" stroke={url('s')} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M24 37c-6-1-9-5-9-8 4 0 8 3 9 8z" fill="#2E9A4E" />
          <path d="M24 33c5-.5 8-3.5 8.5-6.5-4 .2-7.5 2.6-8.5 6.5z" fill="#1F7A3A" />
          <path d="M12 15c0-6 6-10 12-10s12 4 12 10c0 7-5 12-12 12S12 22 12 15z" fill={url('p')} />
          <path d="M16 14c2-4 6-5 9-3-3 0-6 2-7 6M32 13c-2-4-6-5-9-2 3-.3 6 2 6.5 6" stroke="#8C0A27" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M19 18c1.5 3 4.5 4 7 3 2-1 3-3.5 2-5.5-1.5 2-4 2.6-6 1.4" stroke="#8C0A27" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <ellipse cx="18" cy="10" rx="3.2" ry="1.6" fill="#fff" opacity=".45" transform="rotate(-30 18 10)" />
        </svg>
      );
    case 'cigar':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('b')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C68A55" /><stop offset=".45" stopColor="#7A4722" /><stop offset="1" stopColor="#3B1E0B" /></linearGradient>
            <linearGradient id={g('gd')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF0B8" /><stop offset=".5" stopColor="#D7A940" /><stop offset="1" stopColor="#7C5A12" /></linearGradient>
            <radialGradient id={g('e')}><stop offset="0" stopColor="#FFF4C2" /><stop offset=".4" stopColor="#FF8A2A" /><stop offset="1" stopColor="#B3260A" /></radialGradient>
          </defs>
          <g transform="rotate(-24 24 26)">
            <rect x="6" y="22" width="36" height="9" rx="4.5" fill={url('b')} />
            <rect x="13" y="21.6" width="6" height="9.8" rx="1.5" fill={url('gd')} />
            <rect x="38" y="22" width="5" height="9" rx="2.5" fill={url('e')} />
            <rect x="8" y="23.4" width="28" height="1.6" rx=".8" fill="#fff" opacity=".28" />
          </g>
          <path d="M39 12c-3-2 1-4-1-7M43 14c-2-2 1-3.5-.5-6" stroke="#E8E2D6" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />
        </svg>
      );
    case 'champagne':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('gl')} x1="0" x2="1"><stop offset="0" stopColor="#0B3B22" /><stop offset=".35" stopColor="#2F8A55" /><stop offset=".6" stopColor="#145C35" /><stop offset="1" stopColor="#06210F" /></linearGradient>
            <linearGradient id={g('f')} x1="0" x2="1"><stop offset="0" stopColor="#8C6E28" /><stop offset=".5" stopColor="#FFE9A6" /><stop offset="1" stopColor="#8C6E28" /></linearGradient>
          </defs>
          <g transform="rotate(18 24 28)">
            <path d="M20 46V27c0-4 2-6 2-9v-6h4v6c0 3 2 5 2 9v19z" fill={url('gl')} />
            <path d="M21.6 11h4.8v8.5c0 2 .6 3 1.4 4.5h-7.6c.8-1.5 1.4-2.5 1.4-4.5z" fill={url('f')} />
            <rect x="20" y="31" width="8" height="8" rx="1" fill="#F7F1E3" />
            <rect x="21.2" y="33.5" width="5.6" height="1.2" fill="#C9A54C" />
            <rect x="21.4" y="29" width="1.6" height="15" rx=".8" fill="#fff" opacity=".25" />
          </g>
          <ellipse cx="31" cy="5.5" rx="2.6" ry="3.2" fill="#D9B98A" transform="rotate(30 31 5.5)" />
          {[[24, 6, 1.4], [20, 9, 1], [35, 11, 1.2], [28, 3, .9], [37, 4, .8]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#FFF7DA" opacity=".9" />)}
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('t')} x1="0" x2="1"><stop offset="0" stopColor="#8C6E28" /><stop offset=".3" stopColor="#FFF0B8" /><stop offset=".55" stopColor="#E0B54E" /><stop offset="1" stopColor="#6E5214" /></linearGradient>
          </defs>
          <path d="M14 9h20v7c0 7-4 12-10 12s-10-5-10-12z" fill={url('t')} />
          <path d="M14 11H8c0 7 4 10 7 10M34 11h6c0 7-4 10-7 10" stroke={url('t')} strokeWidth="2.6" fill="none" />
          <rect x="21.5" y="27" width="5" height="8" fill={url('t')} />
          <path d="M15 42c0-5 4-7 9-7s9 2 9 7z" fill={url('t')} />
          <rect x="14" y="41" width="20" height="4" rx="1" fill="#3B2A06" />
          <path d="M24 13l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#FFF7DA" opacity=".9" />
          <rect x="17" y="10" width="2.2" height="12" rx="1.1" fill="#fff" opacity=".4" />
        </svg>
      );
    case 'fireworks':
      return (
        <svg {...common}>
          {[['#FF5B7A', 0], ['#5BC8FF', 30], ['#FFE08A', 60], ['#9D7BFF', 90], ['#7BE38A', 120], ['#FF5B7A', 150], ['#5BC8FF', 180], ['#FFE08A', 210], ['#9D7BFF', 240], ['#7BE38A', 270], ['#FF9A3C', 300], ['#FFE08A', 330]].map(([c, a]) => (
            <g key={a as number} transform={`rotate(${a} 24 22)`}>
              <path d="M24 16V6" stroke={c as string} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="24" cy="4.4" r="1.6" fill={c as string} />
            </g>
          ))}
          <circle cx="24" cy="22" r="3.4" fill="#FFF7DA" />
          <path d="M24 30c-1 6 0 10 1 15" stroke="#C9A54C" strokeWidth="1.6" strokeDasharray="2 2.4" fill="none" />
        </svg>
      );
    case 'crown':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('c')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF4C2" /><stop offset=".45" stopColor="#E9BC4C" /><stop offset="1" stopColor="#7A5810" /></linearGradient>
          </defs>
          <path d="M6 16l9 9 9-15 9 15 9-9-4 22H10z" fill={url('c')} stroke="#5E430A" strokeWidth=".8" strokeLinejoin="round" />
          <rect x="9.5" y="35" width="29" height="6" rx="1.5" fill={url('c')} stroke="#5E430A" strokeWidth=".8" />
          {[[6, 15.5], [24, 9.5], [42, 15.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#FFE08A" stroke="#5E430A" strokeWidth=".6" />)}
          <path d="M24 26l3 4-3 4-3-4z" fill="#FF3D63" />
          <circle cx="15" cy="38" r="1.7" fill="#5BC8FF" /><circle cx="24" cy="38" r="1.7" fill="#7BE38A" /><circle cx="33" cy="38" r="1.7" fill="#5BC8FF" />
          <path d="M12 20l3 3 5-8" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".55" strokeLinecap="round" />
        </svg>
      );
    case 'ring':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('r')} x1="0" x2="1"><stop offset="0" stopColor="#8C6E28" /><stop offset=".3" stopColor="#FFF0B8" /><stop offset=".7" stopColor="#C9A54C" /><stop offset="1" stopColor="#6E5214" /></linearGradient>
            <linearGradient id={g('d')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".45" stopColor="#9EE7FF" /><stop offset="1" stopColor="#3C8FD0" /></linearGradient>
          </defs>
          <ellipse cx="24" cy="32" rx="13" ry="11" fill="none" stroke={url('r')} strokeWidth="4" />
          <path d="M18 17h12l-6 8z" fill="#D7A940" />
          <path d="M16 13l4-6h8l4 6-8 9z" fill={url('d')} stroke="#2B6A9E" strokeWidth=".6" />
          <path d="M16 13h16M20 7l-1 6 5 9 5-9-1-6" stroke="#2B6A9E" strokeWidth=".5" fill="none" opacity=".7" />
          <path d="M21 8.5l-2 3.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M37 6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff" />
        </svg>
      );
    default:
      return <svg {...common}><circle cx="24" cy="24" r="14" fill="#C9A54C" /></svg>;
  }
}

/** The Diamond (💎) currency mark: a faceted gem, frameless. */
export function DiamondIcon({ size = 18, className }: { size?: number; className?: string }) {
  const u = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`dmicon ${className ?? ''}`} aria-hidden>
      <defs>
        <linearGradient id={`dg${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F2FCFF" /><stop offset=".4" stopColor="#8FE3FF" /><stop offset="1" stopColor="#2A7FC4" /></linearGradient>
      </defs>
      <path d="M2.5 9 7 3.5h10L21.5 9 12 21z" fill={`url(#dg${u})`} stroke="#1F5E93" strokeWidth=".7" strokeLinejoin="round" />
      <path d="M2.5 9h19M7 3.5 9.5 9 12 21l2.5-12L17 3.5M9.5 9 12 3.5 14.5 9" stroke="#1F5E93" strokeWidth=".55" fill="none" opacity=".65" />
      <path d="M6 8.6 8 5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** The BM coin mark used next to prices (matches the Shop's 3D coin, small and frameless). */
export function CoinIcon({ size = 16 }: { size?: number }) {
  const u = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="bmicon" aria-hidden>
      <defs>
        <radialGradient id={`cg${u}`} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#FFF4C2" /><stop offset=".5" stopColor="#E0B54E" /><stop offset="1" stopColor="#7A5810" /></radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#cg${u})`} stroke="#5E430A" strokeWidth=".8" />
      <circle cx="12" cy="12" r="6.6" fill="none" stroke="#7A5810" strokeWidth=".8" opacity=".7" />
      <text x="12" y="15.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#5E430A" fontFamily="system-ui, sans-serif">B</text>
    </svg>
  );
}
