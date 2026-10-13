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
import { SocialRoot } from './social/SocialRoot';
import { QuestToasts } from './campaign/QuestToasts';
import type { ActiveStake } from './economy/api';
import { StakePicker } from './economy/StakePicker';
import { Sheet } from './screens/Sheets';
import type { ShopTab } from './screens/Shop';

const Guide = lazy(() => import('./screens/Guide').then(m => ({ default: m.Guide })));
const Legal = lazy(() => import('./screens/Legal').then(m => ({ default: m.Legal })));
const Leaderboard = lazy(() => import('./screens/Leaderboard').then(m => ({ default: m.Leaderboard })));
const AdminPanel = lazy(() => import('./screens/Admin').then(m => ({ default: m.AdminPanel })));
const GodPanel = lazy(() => import('./screens/GodPanel').then(m => ({ default: m.GodPanel })));
const ShopScreen = lazy(() => import('./screens/Shop').then(m => ({ default: m.ShopScreen })));
const MerchScreen = lazy(() => import('./screens/Merch').then(m => ({ default: m.MerchScreen })));
const InstallSheet = lazy(() => import('./screens/InstallSheet').then(m => ({ default: m.InstallSheet })));
const Journey = lazy(() => import('./screens/Journey').then(m => ({ default: m.Journey })));
const QuestsScreen = lazy(() => import('./screens/Quests').then(m => ({ default: m.QuestsScreen })));
const AchievementsHall = lazy(() => import('./screens/Achievements').then(m => ({ default: m.AchievementsHall })));
const VaultScreen = lazy(() => import('./screens/Wheel').then(m => ({ default: m.VaultScreen })));
const Daily = lazy(() => import('./daily/Daily').then(m => ({ default: m.Daily })));
import { ReferralRoot } from './referral/ReferralRoot';
import { findQuickMatch, newRoomCode } from './online/useRoom';
import { startHeartbeat, track } from './analytics';
import { detectPlatform, isStandalone } from './install';
import type { GameState } from './engine/engine';

type Route =
  | { name: 'home' }
  | { name: 'local'; resume: GameState | null; key: number; stake?: ActiveStake }
  | { name: 'room'; code: string }
  /** the Journey campaign: map → city → match (it runs LocalGame in campaign mode itself) */
  | { name: 'journey' }
  /** the Daily challenge: same seeded deal for everyone (it runs LocalGame in daily mode itself) */
  | { name: 'daily' };
type Overlay = 'rules' | 'admin' | 'shop' | 'merch' | 'god' | 'quests' | 'achievements' | 'vault' | LegalKind | null;

function parse(): { route: Route; overlay: Overlay } {
  const p = location.pathname;
  const m = p.match(/^\/r\/([A-Za-z0-9]{4,6})\/?$/);
  if (m) return { route: { name: 'room', code: m[1].toUpperCase() }, overlay: null };
  if (/^\/journey\/?$/.test(p)) return { route: { name: 'journey' }, overlay: null };
  if (/^\/daily\/?$/.test(p)) return { route: { name: 'daily' }, overlay: null };
  const o = p.match(/^\/(rules|privacy|terms|admin|shop|merch|god|quests|achievements|vault)\/?$/);
  return { route: { name: 'home' }, overlay: o ? (o[1] as Overlay) : null };
}

function Shell() {
  const [route, setRoute] = useState<Route>(() => parse().route);
  const [overlay, setOverlay] = useState<Overlay>(() => parse().overlay);
  const [sheet, setSheet] = useState<'profile' | 'auth' | 'leaders' | 'install' | 'stakes' | null>(null);
  const [shopTab, setShopTab] = useState<ShopTab | undefined>(undefined);
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
  const auth = () => setSheet('auth');
  const openShop = (tab?: ShopTab) => { setShopTab(tab); openOverlay('shop'); };
  /** a stake table: the entry is already paid (StakePicker) → a hard 4-seat bot table that carries the stake id */
  const playStake = (stake: ActiveStake) => go({ name: 'local', resume: null, key: Date.now(), stake });
  const savedStake = saved && (saved as GameState & { stakeId?: number }).stakeId != null ? saved : null;

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
              onShop={() => openShop()}
              onMerch={() => openOverlay('merch')}
              onJourney={() => go({ name: 'journey' }, '/journey')}
              onDaily={() => go({ name: 'daily' }, '/daily')}
              onQuests={() => openOverlay('quests')}
              onAchievements={() => openOverlay('achievements')}
              onVault={() => openOverlay('vault')}
              onStakes={() => setSheet('stakes')}
              onProfile={() => setSheet('profile')}
              onAuth={() => setSheet('auth')}
              onCreateRoom={() => { const c = newRoomCode(); track('room_create'); go({ name: 'room', code: c }, `/r/${c}`); }}
              onJoinRoom={c => go({ name: 'room', code: c }, `/r/${c}`)} />
          </motion.div>
        )}
        {route.name === 'local' && (
          <motion.div key={'local' + route.key} style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <LocalGame resume={route.resume} stake={route.stake} onExit={home} />
          </motion.div>
        )}
        {route.name === 'room' && (
          <motion.div key={'room' + route.code} style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <OnlineRoom code={route.code} onExit={home} onQuickAgain={skip => quick(skip).catch(home)} onAuth={auth} />
          </motion.div>
        )}
        {route.name === 'journey' && (
          <motion.div key="journey" style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Suspense fallback={null}><Journey onExit={home} onAuth={auth} /></Suspense>
          </motion.div>
        )}
        {route.name === 'daily' && (
          <motion.div key="daily" style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Suspense fallback={null}><Daily onExit={home} onAuth={auth} /></Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      <Suspense fallback={null}>
      <AnimatePresence>
        {overlay === 'rules' && <Guide key="g" onClose={closeOverlay} onPractice={() => go({ name: 'local', resume: null, key: Date.now() })} />}
        {overlay === 'admin' && <AdminPanel key="adm" onClose={closeOverlay} />}
        {overlay === 'shop' && <ShopScreen key="shop" initialTab={shopTab} onClose={closeOverlay} onAuth={() => { closeOverlay(); setSheet('auth'); }} />}
        {overlay === 'quests' && <QuestsScreen key="quests" onClose={closeOverlay} onAuth={auth} />}
        {overlay === 'achievements' && <AchievementsHall key="ach" onClose={closeOverlay} onAuth={auth} />}
        {overlay === 'vault' && <VaultScreen key="vault" onClose={closeOverlay} onAuth={auth} />}
        {overlay === 'merch' && <MerchScreen key="merch" onClose={closeOverlay} />}
        {overlay === 'god' && <GodPanel key="god" onClose={closeOverlay} />}
        {(overlay === 'privacy' || overlay === 'terms') && (
          <Legal key="l" kind={overlay} onClose={closeOverlay} onSwitch={k => { history.replaceState(null, '', '/' + k); setOverlay(k); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === 'profile' && <ProfileSheet key="p" onClose={() => setSheet(null)} onAuth={() => setSheet('auth')} onLegal={k => { setSheet(null); openOverlay(k); }} onInstall={() => setSheet('install')} onAdmin={() => { setSheet(null); openOverlay('admin'); }} onShop={() => { setSheet(null); openShop(); }} onGod={() => { setSheet(null); openOverlay('god'); }}
          onDiamonds={() => { setSheet(null); openShop('diamonds'); }} onAchievements={() => { setSheet(null); openOverlay('achievements'); }} onVault={() => { setSheet(null); openOverlay('vault'); }} />}
        {sheet === 'auth' && <AuthSheet key="a" onClose={() => setSheet(null)} onLegal={k => { setSheet(null); openOverlay(k); }} />}
        {sheet === 'leaders' && <Leaderboard key="lb" onClose={() => setSheet(null)} onAuth={() => setSheet('auth')} />}
        {sheet === 'install' && <InstallSheet key="in" onClose={() => setSheet(null)} />}
        {sheet === 'stakes' && (
          <Sheet key="st" onClose={() => setSheet(null)}>
            <StakePicker onAuth={() => setSheet('auth')}
              onStart={st => { setSheet(null); playStake(st); }}
              onResume={savedStake ? () => { setSheet(null); go({ name: 'local', resume: savedStake, key: Date.now() }); } : undefined} />
          </Sheet>
        )}
      </AnimatePresence>
      </Suspense>
      <CosmeticsSync />
      <SocialRoot />
      <QuestToasts />
      <ReferralRoot onAuth={auth} />
      <RewardsLayer autoDaily={route.name === 'home' && !overlay && !sheet} onAuth={() => setSheet('auth')} />
    </div>
  );
}

export default function App() {
  return <MotionConfig reducedMotion="user"><AppProvider><Shell /></AppProvider></MotionConfig>;
}
