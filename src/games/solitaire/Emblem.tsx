/** Hub tile emblem: a cascade of three ivory cards, the ace of spades in front, brass edges. Inline SVG only. */
export default function SolitaireEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="solEmIv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFAF0" /><stop offset=".6" stopColor="#F7F1E3" /><stop offset="1" stopColor="#E6DBC2" />
        </linearGradient>
        <linearGradient id="solEmAu" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EBD38E" /><stop offset=".5" stopColor="#C9A54C" /><stop offset="1" stopColor="#8C6E28" />
        </linearGradient>
        <filter id="solEmSh" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>
      <g filter="url(#solEmSh)">
        <g transform="rotate(-16 22 40)">
          <rect x="9" y="17" width="26" height="37" rx="3.4" fill="url(#solEmIv)" stroke="url(#solEmAu)" strokeWidth="1.2" />
          <text x="13" y="27" fontFamily="Georgia, serif" fontWeight="700" fontSize="9" fill="#A31D35">K</text>
          <text x="22" y="44" fontFamily="Georgia, serif" fontSize="13" fill="#A31D35" textAnchor="middle">♥</text>
        </g>
        <g transform="rotate(14 42 40)">
          <rect x="29" y="17" width="26" height="37" rx="3.4" fill="url(#solEmIv)" stroke="url(#solEmAu)" strokeWidth="1.2" />
          <text x="33" y="27" fontFamily="Georgia, serif" fontWeight="700" fontSize="9" fill="#17181C">Q</text>
          <text x="42" y="44" fontFamily="Georgia, serif" fontSize="13" fill="#17181C" textAnchor="middle">♣</text>
        </g>
        <rect x="18.5" y="11" width="27" height="39" rx="3.6" fill="url(#solEmIv)" stroke="url(#solEmAu)" strokeWidth="1.4" />
        <rect x="21" y="13.5" width="22" height="34" rx="2.4" fill="none" stroke="#C9A54C" strokeOpacity=".45" strokeWidth=".8" />
        <text x="22.5" y="21.5" fontFamily="Georgia, serif" fontWeight="700" fontSize="8.5" fill="#17181C">A</text>
        <text x="32" y="39" fontFamily="Georgia, serif" fontSize="19" fill="#17181C" textAnchor="middle">♠</text>
      </g>
    </svg>
  );
}
