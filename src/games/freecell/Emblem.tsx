/** Hub tile emblem: four brass free cells above an ivory run (red–black–red), the ace resting in one cell. Inline SVG only. */
export default function FreeCellEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="fcEmIv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFAF0" /><stop offset=".6" stopColor="#F7F1E3" /><stop offset="1" stopColor="#E6DBC2" />
        </linearGradient>
        <linearGradient id="fcEmAu" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EBD38E" /><stop offset=".5" stopColor="#C9A54C" /><stop offset="1" stopColor="#8C6E28" />
        </linearGradient>
        <filter id="fcEmSh" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.3" floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>
      {/* the four cells */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={5 + i * 14} y="5" width="12" height="16" rx="2" fill="rgba(0,0,0,.18)" stroke="url(#fcEmAu)" strokeWidth="1.1" strokeDasharray={i === 1 ? undefined : '2.2 1.6'} />
      ))}
      <g filter="url(#fcEmSh)">
        <rect x="19" y="5" width="12" height="16" rx="2" fill="url(#fcEmIv)" stroke="url(#fcEmAu)" strokeWidth="1" />
        <text x="25" y="16.6" fontFamily="Georgia, serif" fontSize="9" fill="#A31D35" textAnchor="middle">♥</text>
        {/* the run */}
        <rect x="18" y="25" width="28" height="22" rx="3" fill="url(#fcEmIv)" stroke="url(#fcEmAu)" strokeWidth="1.2" />
        <text x="21.5" y="33" fontFamily="Georgia, serif" fontWeight="700" fontSize="7.5" fill="#17181C">K</text>
        <text x="40" y="33" fontFamily="Georgia, serif" fontSize="7.5" fill="#17181C" textAnchor="middle">♠</text>
        <rect x="18" y="32" width="28" height="22" rx="3" fill="url(#fcEmIv)" stroke="url(#fcEmAu)" strokeWidth="1.2" />
        <text x="21.5" y="40" fontFamily="Georgia, serif" fontWeight="700" fontSize="7.5" fill="#A31D35">Q</text>
        <text x="40" y="40" fontFamily="Georgia, serif" fontSize="7.5" fill="#A31D35" textAnchor="middle">♦</text>
        <rect x="18" y="39" width="28" height="21" rx="3" fill="url(#fcEmIv)" stroke="url(#fcEmAu)" strokeWidth="1.3" />
        <rect x="20.2" y="41.2" width="23.6" height="16.6" rx="2" fill="none" stroke="#C9A54C" strokeOpacity=".45" strokeWidth=".7" />
        <text x="22" y="48" fontFamily="Georgia, serif" fontWeight="700" fontSize="7.5" fill="#17181C">J</text>
        <text x="32" y="55.5" fontFamily="Georgia, serif" fontSize="12" fill="#17181C" textAnchor="middle">♣</text>
      </g>
    </svg>
  );
}
