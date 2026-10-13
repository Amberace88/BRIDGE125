import { useId } from 'react';

/** Hub tile emblem: two ivory tiles stacked with brass edges — a red 中 on top, a dot below. Pure SVG. */
export function MahjongEmblem({ size = 64 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  const tile = (x: number, y: number, rot: number, face: 'zhong' | 'dot', key: string) => (
    <g key={key} transform={`rotate(${rot} ${x + 15} ${y + 20})`}>
      <rect x={x + 3.5} y={y + 4.5} width="30" height="40" rx="6" fill="#000" opacity=".35" />
      <rect x={x + 2.4} y={y + 2.4} width="30" height="40" rx="6" fill={`url(#b${id})`} />
      <rect x={x + 1.2} y={y + 1.2} width="30" height="40" rx="6" fill="#d9c79c" />
      <rect x={x} y={y} width="30" height="40" rx="6" fill={`url(#i${id})`} stroke={`url(#b${id})`} strokeWidth="1" />
      {face === 'zhong' ? (
        <g fill="none" stroke="#b8232f" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${x + 7} ${y + 14}h16v11.5h-16z`} strokeWidth="2.8" />
          <path d={`M${x + 15} ${y + 5}v30`} strokeWidth="3" />
        </g>
      ) : (
        <g>
          <circle cx={x + 15} cy={y + 20} r="9" fill="#fffaf0" stroke="#1c7a4f" strokeWidth="2.4" />
          <circle cx={x + 15} cy={y + 20} r="4.6" fill="#1f4f93" />
          <circle cx={x + 15} cy={y + 20} r="1.6" fill="#fffaf0" />
        </g>
      )}
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden role="img">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--acc-hi, #EBD38E)" />
          <stop offset=".5" stopColor="var(--acc, #C9A54C)" />
          <stop offset="1" stopColor="var(--acc-lo, #8C6E28)" />
        </linearGradient>
        <linearGradient id={`i${id}`} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset=".6" stopColor="#f4ecd8" />
          <stop offset="1" stopColor="#e5d6b2" />
        </linearGradient>
      </defs>
      {tile(26, 16, 9, 'dot', 'a')}
      {tile(6, 6, -8, 'zhong', 'b')}
    </svg>
  );
}
