// Line icons for media controls (24px grid, currentColor). Frameless by design: the glyph is the button.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IcoCam = ({ off = false }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...P}>
    <rect x="2.8" y="6.2" width="12.6" height="11.6" rx="3" />
    <path d="M15.4 10.2 20.2 7.4c.5-.3 1 .1 1 .6v8c0 .5-.5.9-1 .6l-4.8-2.8" />
    {off && <path d="M3.5 3.5 20.5 20.5" className="slash" />}
  </svg>
);

export const IcoMic = ({ off = false }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...P}>
    <rect x="8.6" y="2.8" width="6.8" height="11.6" rx="3.4" />
    <path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0M12 17.8v3.4M8.8 21.2h6.4" />
    {off && <path d="M3.5 3.5 20.5 20.5" className="slash" />}
  </svg>
);

export const IcoHide = ({ open = false }: { open?: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...P}>
    {open
      ? <><rect x="3.2" y="5.2" width="17.6" height="13.6" rx="3.2" /><path d="M8 12h8M12 8v8" /></>
      : <><rect x="3.2" y="5.2" width="17.6" height="13.6" rx="3.2" /><path d="M8 12h8" /></>}
  </svg>
);

export const IcoSpeaker = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...P}>
    <path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" />
    <path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.2 6.6a7.8 7.8 0 0 1 0 10.8" />
  </svg>
);

export const IcoMicOffMini = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden {...P} strokeWidth={2.2}>
    <rect x="8.6" y="2.8" width="6.8" height="11.6" rx="3.4" />
    <path d="M5.4 11.2a6.6 6.6 0 0 0 9.6 5.9M12 17.8v3.4M4 4l16 16" />
  </svg>
);

export const IcoCamera = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}>
    <path d="M4 8.2c0-1 .8-1.8 1.8-1.8h2l1.4-2h5.6l1.4 2h2c1 0 1.8.8 1.8 1.8v9.6c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8z" />
    <circle cx="12" cy="13" r="3.6" />
  </svg>
);
