import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AppProvider } from './store';
import { Home } from './screens/Home';
import { LocalGame, loadSavedGame } from './screens/LocalGame';
import { OnlineRoom } from './screens/OnlineRoom';
import { ProfileSheet } from './screens/Sheets';
import { AuthSheet } from './screens/AuthSheet';
import { Guide } from './screens/Guide';
import { newRoomCode } from './online/useRoom';
import type { GameState } from './engine/engine';

type Route = { name: 'home' } | { name: 'local'; resume: GameState | null; key: number } | { name: 'room'; code: string };

function parse(): Route {
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9]{4,6})\/?$/);
  if (m) return { name: 'room', code: m[1].toUpperCase() };
  return { name: 'home' };
}

function Shell() {
  const [route, setRoute] = useState<Route>(parse);
  const [sheet, setSheet] = useState<'profile' | 'auth' | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const f = () => setRoute(parse());
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, []);

  const go = (r: Route, path = '/') => {
    if (location.pathname !== path) history.pushState(null, '', path);
    setRoute(r);
  };
  const home = () => go({ name: 'home' }, '/');
  const saved = route.name === 'home' ? loadSavedGame() : null;

  return (
    <div className={`app ${route.name === 'home' ? 'is-home' : ''}`}>
      <AnimatePresence mode="wait">
        {route.name === 'home' && (
          <motion.div key="home" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.3 }}>
            <Home
              onPlay={() => go({ name: 'local', resume: null, key: Date.now() })}
              onResume={saved ? () => go({ name: 'local', resume: saved, key: Date.now() }) : null}
              onRules={() => setGuide(true)}
              onProfile={() => setSheet('profile')}
              onAuth={() => setSheet('auth')}
              onCreateRoom={() => { const c = newRoomCode(); go({ name: 'room', code: c }, `/r/${c}`); }}
              onJoinRoom={c => go({ name: 'room', code: c }, `/r/${c}`)} />
          </motion.div>
        )}
        {route.name === 'local' && (
          <motion.div key={'local' + route.key} style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <LocalGame resume={route.resume} onExit={home} />
          </motion.div>
        )}
        {route.name === 'room' && (
          <motion.div key={'room' + route.code} style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <OnlineRoom code={route.code} onExit={home} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {guide && <Guide key="g" onClose={() => setGuide(false)} onPractice={() => { setGuide(false); go({ name: 'local', resume: null, key: Date.now() }); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === 'profile' && <ProfileSheet key="p" onClose={() => setSheet(null)} onAuth={() => setSheet('auth')} />}
        {sheet === 'auth' && <AuthSheet key="a" onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
