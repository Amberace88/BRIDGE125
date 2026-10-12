import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { captureInstallPrompt } from './install';

captureInstallPrompt();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
