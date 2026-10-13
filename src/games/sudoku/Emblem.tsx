import { useId } from 'react';

/** Hub tile emblem: a brass-rimmed 3×3 slab with a few ivory digits and one gold one. Pure SVG, follows the accent. */
export function SudokuEmblem({ size = 64 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  const cells: [number, number, string, boolean][] = [[0, 0, '5', false], [2, 0, '3', false], [1, 1, '9', true], [0, 2, '7', false], [2, 2, '1', false]];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden role="img">
      <defs>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--acc-hi, #EBD38E)" />
          <stop offset=".45" stopColor="var(--acc, #C9A54C)" />
          <stop offset="1" stopColor="var(--acc-lo, #8C6E28)" />
        </linearGradient>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13241f" />
          <stop offset="1" stopColor="#07110e" />
        </linearGradient>
      </defs>
      <rect x="3" y="5" width="58" height="58" rx="13" fill="#000" opacity=".35" />
      <rect x="3" y="2" width="58" height="58" rx="13" fill={`url(#r${id})`} />
      <rect x="6.5" y="5.5" width="51" height="51" rx="10" fill={`url(#f${id})`} />
      <path d="M23.5 6v50M40.5 6v50M7 22.5h50M7 39.5h50" stroke={`url(#r${id})`} strokeWidth="1.6" opacity=".75" />
      {cells.map(([c, r, d, gold]) => (
        <text key={`${c}${r}`} x={15 + c * 17} y={20.5 + r * 17} textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700"
          fontSize="14" fill={gold ? 'var(--acc-hi, #EBD38E)' : '#F7F1E3'}>{d}</text>
      ))}
      <path d="M10 8.5h30" stroke="#fff" strokeOpacity=".22" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
