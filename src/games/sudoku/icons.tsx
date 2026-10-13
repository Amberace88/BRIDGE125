import type { ReactNode } from 'react';

// Line icons in one style (24px grid, 1.8 stroke, round caps) — they take the current colour.

const I = ({ children, size = 24 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

export const IcBack = () => <I><path d="M15 5l-7 7 7 7" /></I>;
export const IcUndo = () => <I><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></I>;
export const IcRedo = () => <I><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 000 11H13" /></I>;
export const IcErase = () => <I><path d="M8.5 19.5h11" /><path d="M5.2 14.8l9.6-9.6a2 2 0 012.8 0l2 2a2 2 0 010 2.8l-8.4 8.4a3 3 0 01-2.1.9H7.4L5.2 17.6a2 2 0 010-2.8z" /><path d="M10 10l5 5" /></I>;
export const IcNotes = () => <I><path d="M4 20l1-4.2L15.6 5.2a2.1 2.1 0 013 0l.2.2a2.1 2.1 0 010 3L8.2 19 4 20z" /><path d="M13.5 7.3l3.2 3.2" /></I>;
export const IcHint = () => <I><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0012 3z" /></I>;
export const IcPause = () => <I><path d="M9 6v12M15 6v12" strokeWidth="2.4" /></I>;
export const IcPlay = ({ size }: { size?: number }) => <I size={size}><path d="M8 5.5v13l10.5-6.5L8 5.5z" fill="currentColor" /></I>;
export const IcGear = () => <I><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></I>;
export const IcFlame = () => <I size={16}><path d="M12 22c4 0 7-2.7 7-6.6 0-3.1-1.9-5.3-3.6-7.1-.4 1.6-1.3 2.8-2.6 3.3.4-3.6-1.2-6.9-4.3-9.1.2 3.2-1.6 5.3-3.1 7.3C4.3 11.2 5 13 5 15.4 5 19.3 8 22 12 22z" fill="currentColor" stroke="none" /></I>;
export const IcCheck = ({ size }: { size?: number }) => <I size={size}><path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.4" /></I>;
export const IcClock = () => <I size={14}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>;
export const IcClose = () => <I><path d="M6 6l12 12M18 6L6 18" /></I>;
export const IcSpark = () => <I size={16}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" fill="currentColor" stroke="none" /></I>;
export const IcGrid = () => <I><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" /></I>;
export const IcRestart = () => <I><path d="M4 12a8 8 0 102.3-5.6" /><path d="M4 4v4.5h4.5" /></I>;
export const IcFlag = () => <I><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></I>;
export const IcSound = () => <I><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11" /></I>;
