import { useId } from 'react';

/** The durak's folded newspaper hat (end screen). */
export function PaperHat({ size = 120 }: { size?: number }) {
  const id = 'ph' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" aria-hidden className="paperhat">
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdf9ee" /><stop offset=".6" stopColor="#ece4cf" /><stop offset="1" stopColor="#cfc4a8" /></linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d8cdb2" /><stop offset="1" stopColor="#b9ad8f" /></linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3de9c" /><stop offset=".5" stopColor="#c9a54c" /><stop offset="1" stopColor="#8c6e28" /></linearGradient>
      </defs>
      {/* back flap */}
      <path d="M50 4 L88 52 L12 52 Z" fill={`url(#${id}s)`} />
      {/* front triangle with newsprint */}
      <path d="M50 2 L84 52 L16 52 Z" fill={`url(#${id}p)`} stroke="#a89a78" strokeWidth=".8" strokeLinejoin="round" />
      <g stroke="#a59c88" strokeWidth="1.1" strokeLinecap="round" opacity=".8">
        <path d="M40 22 H60" /><path d="M36 28 H52 M55 28 H64" /><path d="M32 34 H47 M50 34 H68" /><path d="M28 40 H60 M63 40 H72" /><path d="M25 46 H43 M46 46 H75" />
      </g>
      <text x="50" y="18" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#6c624d" fontFamily="Georgia, serif" letterSpacing=".6">NEWS</text>
      {/* brim band */}
      <path d="M8 51 H92 L89 61 H11 Z" fill={`url(#${id}g)`} stroke="#7a5d1e" strokeWidth=".6" />
      <path d="M11 61 H89" stroke="#fff3c4" strokeWidth=".8" opacity=".6" />
      <circle cx="50" cy="3" r="3.2" fill={`url(#${id}g)`} />
    </svg>
  );
}

/** Gold epaulettes ("pogony") for the durak beaten with sixes. */
export function Epaulette({ flip = false, size = 64 }: { flip?: boolean; size?: number }) {
  const id = 'ep' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 80 48" aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset=".45" stopColor="#d9b55a" /><stop offset="1" stopColor="#8c6e28" /></linearGradient></defs>
      <path d="M6 10 Q6 4 12 4 H62 Q76 4 76 18 Q76 26 66 26 H12 Q6 26 6 20 Z" fill={`url(#${id})`} stroke="#6b4d17" strokeWidth="1" />
      <circle cx="16" cy="15" r="4" fill="#fff6d6" stroke="#8c6e28" />
      <path d="M30 15 L34 11 L38 15 L34 19 Z M46 15 L50 11 L54 15 L50 19 Z" fill="#7a1424" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${12 + i * 5} 26 q-1 9 1 18`} stroke={`url(#${id})`} strokeWidth="2.6" fill="none" strokeLinecap="round" />)}
    </svg>
  );
}
