import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { captureInstallPrompt } from './install';
import { adoptUrlLang, localeReady } from './store';
import { whenIdle } from './lazy';

adoptUrlLang();   // /de/… landing-page links → German UI, plain path for the router
captureInstallPrompt();
// background music is opt-in: its synth engine is only fetched for players who switched it on (it then starts on the
// first tap, as before); everyone else loads it when they open the audio controls
try { if ((JSON.parse(localStorage.getItem('b125.music') ?? '{}') as { on?: unknown }).on === true) whenIdle(() => { void import('./media/music').then(m => m.initMusic()); }, 1500); } catch { /* */ }

// A lazily loaded language (one small chunk) is fetched before the first paint so the UI never flashes English;
// bundled languages resolve immediately, and a slow network falls back to rendering after 2.5 s.
const render = () => createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
Promise.race([localeReady(), new Promise(r => setTimeout(r, 2500))]).then(render, render);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
