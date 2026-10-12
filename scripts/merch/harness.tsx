// Dev-only: renders the merch screen on its own, for screenshots (not part of the app build).
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import '../../src/styles.css';
import { AppProvider, useApp } from '../../src/store';
import { MerchScreen } from '../../src/screens/Merch';

function Lang() {
  const { set } = useApp();
  useEffect(() => {
    const l = new URLSearchParams(location.search).get('lang');
    if (l === 'en' || l === 'lv' || l === 'ru' || l === 'uk') set({ lang: l });
  }, [set]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <Lang />
        <div className="app"><MerchScreen onClose={() => location.reload()} /></div>
      </AppProvider>
    </MotionConfig>
  </StrictMode>,
);
