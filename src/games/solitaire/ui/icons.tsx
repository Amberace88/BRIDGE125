// Frameless brass glyphs (stroke icons, currentColor).
import type { ReactNode } from 'react';

const I = ({ d, children }: { d?: string; children?: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">{d ? <path d={d} /> : children}</svg>
);

export const IconBack = () => <I d="M15 5l-7 7 7 7" />;
export const IconMenu = () => <I><path d="M4 7h16M4 12h16M4 17h10" /></I>;
export const IconClose = () => <I d="M6 6l12 12M18 6L6 18" />;
export const IconUndo = () => <I><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></I>;
export const IconHint = () => (
  <I><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" /></I>
);
export const IconNew = () => (
  <I><rect x="3.5" y="6" width="10" height="14" rx="1.8" transform="rotate(-10 8.5 13)" /><rect x="10.5" y="4" width="10" height="14" rx="1.8" transform="rotate(8 15.5 11)" /></I>
);
export const IconWand = () => (
  <I><path d="M4 20L15 9" /><path d="M14 4v3M18.5 5.5l-2 2M20 10h-3M12.5 5.5l1 1" /><path d="M15 9l1.5-1.5" /></I>
);
export const IconSun = () => (
  <I><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></I>
);
export const IconRestart = () => <I><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></I>;
export const IconCollect = () => <I><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" /></I>;
