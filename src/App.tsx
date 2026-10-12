import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, useApp } from './store';
import { Home } from './screens/Home';
import { LocalGame, loadSavedGame } from './screens/LocalGame';
import { OnlineRoom } from './screens/OnlineRoom';
import { ProfileSheet } from './screens/Profile';
import { AuthSheet } from './screens/AuthSheet';
import type { LegalKind } from './screens/Legal';
import { RewardsLayer } from './screens/Rewards';
import { CosmeticsSync } from './cosmetics/useCosmetics';

const Guide = lazy(() => import('./screens/Guide').then(m => ({ default: m.Guide })));
const Legal = lazy(() => import('./screens/Legal').then(m => ({ default: m.Legal })));
const Leaderboard = lazy(() => import('./screens/Leaderboard').then(m => ({ default: m.Leaderboard })));
const AdminPanel = lazy(() => import('./screens/Admin').then(m => ({ default: m.AdminPanel })));
const GodPanel = lazy(() => import('./screens/GodPanel').then(m => ({ default: m.GodPanel })));
const ShopScreen = lazy(() => import('./screens/Shop').then(m => ({ default: m.ShopScreen })));
const MerchScreen = lazy(() => import('./screens/Merch').then(m => ({ default: m.MerchScreen })));
const InstallSheet = lazy(() => import('./screens/InstallSheet').then(m => ({ default: m.InstallSheet })));
import { findQuickMatch, newRoomCode } from './online/useRoom';
import { startHeartbeat, track } from './analytics';
import { detectPlatform, isStandalone } from './install';
import type { GameState } from './engine/engine';

type Route = { name: 'home' } | { name: 'local'; resume: GameState | null; key: number } | { name: 'room'; code: string };
type Overlay = 'rules' | 'admin' | 'shop' | 'merch' | 'god' | LegalKind | null;

function parse(): { route: Route; overlay: Overlay } {
  const p = location.pathname;
  const m = p.match(/^\/r\/([A-Za-z0-9]{4,6})\/?$/);
  if (m) return { route: { name: 'room', code: m[1].toUpperCase() }, overlay: null };
  const o = p.match(/^\/(rules|privacy|terms|admin|shop|merch|god)\/?$/);
  return { route: { name: 'home' }, overlay: o ? (o[1] as Overlay) : null };
}

function Shell() {
  const [route, setRoute] = useState<Route>(() => parse().route);
  const [overlay, setOverlay] = useState<Overlay>(() => parse().overlay);
  const [sheet, setSheet] = useState<'profile' | 'auth' | 'leaders' | 'install' | null>(null);
  const app = useApp();
  // arriving from a password-reset email → open the sheet on the "new password" step
  useEffect(() => { if (app.recovery) setSheet('auth'); }, [app.recovery]);

  useEffect(() => {
    const f = () => { const p = parse(); setRoute(r => (r.name === 'local' && p.route.name === 'home' ? r : p.route)); setOverlay(p.overlay); };
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, []);

  const go = (r: Route, path = '/', replace = false) => {
    if (location.pathname !== path) history[replace ? 'replaceState' : 'pushState'](null, '', path);
    setRoute(r); setOverlay(null);
  };
  const home = () => go({ name: 'home' }, '/');
  const openOverlay = (o: Exclude<Overlay, null>) => { history.pushState(null, '', '/' + o); setOverlay(o); };
  const closeOverlay = () => { if (route.name === 'home' && location.pathname !== '/') history.pushState(null, '', '/'); setOverlay(null); };
  const saved = route.name === 'home' ? loadSavedGame() : null;

  // app-icon shortcuts and deep links: /?play=bots, /?play=online, /?install=1
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    track('app_open', { lang: app.lang, platform: detectPlatform(), standalone: isStandalone(), source: q.get('source'), path: location.pathname.slice(0, 40) });
    startHeartbeat();
    const play = q.get('play');
    if (q.has('play') || q.has('install') || q.has('source')) history.replaceState(null, '', location.pathname);
    if (play === 'bots') go({ name: 'local', resume: null, key: Date.now() }, '/', true);
    else if (play === 'online') quick().catch(() => {});
    else if (q.get('install') === '1') setSheet('install');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Matchmaking: resolves when we are on our way to a table; rejects so the button can show an error. */
  const quick = async (skip = '') => {
    const code = await findQuickMatch(skip);
    if (!skip) track('quick_match');
    go({ name: 'room', code }, `/r/${code}`, route.name === 'room');
  };

  return (
    <div className={`app ${route.name === 'home' ? 'is-home' : ''}`}>
      <AnimatePresence mode="wait">
        {route.name === 'home' && (
          <motion.div key="home" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.3 }}>
            <Home
              onPlay={() => go({ name: 'local', resume: null, key: Date.now() })}
              onResume={saved ? () => go({ name: 'local', resume: saved, key: Date.now() }) : null}
              onQuick={() => quick()}
              onRules={() => openOverlay('rules')}
              onLegal={k => openOverlay(k)}
              onLeaders={() => setSheet('leaders')}
              onInstall={() => setSheet('install')}
              onAdmin={() => openOverlay('admin')}
              onShop={() => openOverlay('shop')}
              onMerch={() => openOverlay('merch')}
              onProfile={() => setSheet('profile')}
              onAuth={() => setSheet('auth')}
              onCreateRoom={() => { const c = newRoomCode(); track('room_create'); go({ name: 'room', code: c }, `/r/${c}`); }}
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
            <OnlineRoom code={route.code} onExit={home} onQuickAgain={skip => quick(skip).catch(home)} />
          </motion.div>
        )}
      </AnimatePresence>
      <Suspense fallback={null}>
      <AnimatePresence>
        {overlay === 'rules' && <Guide key="g" onClose={closeOverlay} onPractice={() => go({ name: 'local', resume: null, key: Date.now() })} />}
        {overlay === 'admin' && <AdminPanel key="adm" onClose={closeOverlay} />}
        {overlay === 'shop' && <ShopScreen key="shop" onClose={closeOverlay} onAuth={() => { closeOverlay(); setSheet('auth'); }} />}
        {overlay === 'merch' && <MerchScreen key="merch" onClose={closeOverlay} />}
        {overlay === 'god' && <GodPanel key="god" onClose={closeOverlay} />}
        {(overlay === 'privacy' || overlay === 'terms') && (
          <Legal key="l" kind={overlay} onClose={closeOverlay} onSwitch={k => { history.replaceState(null, '', '/' + k); setOverlay(k); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === 'profile' && <ProfileSheet key="p" onClose={() => setSheet(null)} onAuth={() => setSheet('auth')} onLegal={k => { setSheet(null); openOverlay(k); }} onInstall={() => setSheet('install')} onAdmin={() => { setSheet(null); openOverlay('admin'); }} onShop={() => { setSheet(null); openOverlay('shop'); }} onGod={() => { setSheet(null); openOverlay('god'); }} />}
        {sheet === 'auth' && <AuthSheet key="a" onClose={() => setSheet(null)} onLegal={k => { setSheet(null); openOverlay(k); }} />}
        {sheet === 'leaders' && <Leaderboard key="lb" onClose={() => setSheet(null)} onAuth={() => setSheet('auth')} />}
        {sheet === 'install' && <InstallSheet key="in" onClose={() => setSheet(null)} />}
      </AnimatePresence>
      </Suspense>
      <CosmeticsSync />
      <RewardsLayer autoDaily={route.name === 'home' && !overlay && !sheet} onAuth={() => setSheet('auth')} />
    </div>
  );
}

export default function App() {
  return <MotionConfig reducedMotion="user"><AppProvider><Shell /></AppProvider></MotionConfig>;
}
