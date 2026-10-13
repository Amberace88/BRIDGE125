import { useId } from 'react';

/** Hub emblem: two fanned cards (a six under a trump ace) wearing the folded paper hat of the durak. */
export function DurakEmblem({ size = 64 }: { size?: number }) {
  const id = 'dk' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#e9dfc7" /></linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3de9c" /><stop offset=".5" stopColor="#c9a54c" /><stop offset="1" stopColor="#8c6e28" /></linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf6e8" /><stop offset="1" stopColor="#d9cfb6" /></linearGradient>
      </defs>
      <g transform="rotate(-14 32 40)">
        <rect x="15" y="22" width="24" height="34" rx="3" fill={`url(#${id}c)`} stroke={`url(#${id}g)`} strokeWidth="1.2" />
        <text x="19" y="31" fontSize="8" fontWeight="700" fill="#17181c" fontFamily="Georgia, serif">6</text>
        <text x="27" y="46" fontSize="13" fill="#17181c" textAnchor="middle">♣</text>
      </g>
      <g transform="rotate(12 32 40)">
        <rect x="25" y="22" width="24" height="34" rx="3" fill={`url(#${id}c)`} stroke={`url(#${id}g)`} strokeWidth="1.2" />
        <text x="29" y="31" fontSize="8" fontWeight="700" fill="#a31d35" fontFamily="Georgia, serif">A</text>
        <text x="37" y="47" fontSize="14" fill="#a31d35" textAnchor="middle">♥</text>
      </g>
      {/* folded newspaper hat */}
      <g transform="rotate(-8 32 14)">
        <path d="M14 22 L32 3 L50 22 Z" fill={`url(#${id}h)`} stroke="#8c6e28" strokeWidth="1" strokeLinejoin="round" />
        <path d="M11 21.5 H53 L51 26 H13 Z" fill={`url(#${id}g)`} />
        <path d="M21 14 H40 M24 11 H37 M19 17 H44" stroke="#9a9180" strokeWidth=".8" strokeLinecap="round" />
        <circle cx="32" cy="3" r="2.2" fill={`url(#${id}g)`} />
      </g>
    </svg>
  );
}

