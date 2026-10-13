/* Frameless brass line icons for the games hub's social layer (currentColor, 24 × 24). */

export const TrophyIcon = () => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <path d="M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0z M7.5 5.5H4.6c0 2.6 1.1 4.1 3.2 4.4 M16.5 5.5h2.9c0 2.6-1.1 4.1-3.2 4.4 M12 13v3.2 M8.8 20h6.4 M9.6 16.2h4.8l.6 3.8H9z"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export const SwordsIcon = () => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l9.5 9.5M4 4h3.2l8.6 8.6M4 4v3.2l8.6 8.6" />
      <path d="M20 4l-9.5 9.5M20 4h-3.2l-3.4 3.4M20 4v3.2l-3.4 3.4" />
      <path d="M13.2 15.8l2.8-2.8M8 13l2.8 2.8M15.2 17.8l2.6 2.6M8.8 17.8l-2.6 2.6M14 16.6l3.6-3.6M6.4 13l3.6 3.6" />
    </g>
  </svg>
);

export const ChestIcon = ({ open = false }: { open?: boolean }) => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      {open ? <path d="M4 10.5l2.2-5.3h11.6l2.2 5.3" /> : <path d="M4 10.5V8.2a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2.3" />}
      <path d="M4 10.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M10.5 10.5v3h3v-3 M8 5.2v5.3 M16 5.2v5.3" />
    </g>
  </svg>
);

export const SunIcon = () => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </g>
  </svg>
);

export const LinkIcon = () => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4L11.6 6M14 10a4.5 4.5 0 0 0-6.4 0l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const ShareIcon = () => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ImageIcon = () => (
  <svg className="ga-ic" viewBox="0 0 24 24" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5" /><circle cx="15.5" cy="9" r="1.6" />
    </g>
  </svg>
);
