import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { captureInstallPrompt } from './install';
import { initMusic } from './media/music';
import { localeReady } from './store';

captureInstallPrompt();
initMusic();

// A lazily loaded language (one small chunk) is fetched before the first paint so the UI never flashes English;
// bundled languages resolve immediately, and a slow network falls back to rendering after 2.5 s.
const render = () => createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
Promise.race([localeReady(), new Promise(r => setTimeout(r, 2500))]).then(render, render);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
