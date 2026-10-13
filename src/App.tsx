import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, useApp } from './store';
import { Home } from './screens/Home';
import { loadSavedGame, savedStakeIdOf } from './screens/savedGame';
import type { LegalKind } from './screens/Legal';
import { CosmeticsSync } from './cosmetics/useCosmetics';
import type { ActiveStake } from './economy/api';
import { Sheet } from './screens/Sheets';
import { Deferred, lazyNamed, whenIdle } from './lazy';
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
// everything below loads after the first Home paint (tables are prefetched on idle; sheets / layers on demand)
const LocalGame = lazyNamed(() => import('./screens/LocalGame'), 'LocalGame');
const OnlineRoom = lazyNamed(() => import('./screens/OnlineRoom'), 'OnlineRoom');
const ProfileSheet = lazyNamed(() => import('./screens/Profile'), 'ProfileSheet');
const AuthSheet = lazyNamed(() => import('./screens/AuthSheet'), 'AuthSheet');
const StakePicker = lazyNamed(() => import('./economy/StakePicker'), 'StakePicker');
const RewardsLayer = lazyNamed(() => import('./screens/Rewards'), 'RewardsLayer');
const SocialRoot = lazyNamed(() => import('./social/SocialRoot'), 'SocialRoot');
const QuestToasts = lazyNamed(() => import('./campaign/QuestToasts'), 'QuestToasts');
const Daily = lazyNamed(() => import('./daily/Daily'), 'Daily');
const ReferralRoot = lazyNamed(() => import('./referral/ReferralRoot'), 'ReferralRoot');
const SeasonScreen = lazyNamed(() => import('./screens/Season'), 'SeasonScreen');
const SeasonToast = lazyNamed(() => import('./season/parts'), 'SeasonToast');
import { findQuickMatch, newRoomCode } from './online/ids';
import { startHeartbeat, track } from './analytics';
import { detectPlatform, isStandalone } from './install';
import type { GameState } from './engine/engine';
import { gameById } from './games/registry';

type Route =
  | { name: 'home' }
  | { name: 'local'; resume: GameState | null; key: number; stake?: ActiveStake }
  | { name: 'room'; code: string }
  /** the Journey campaign: map → city → match (it runs LocalGame in campaign mode itself) */
  | { name: 'journey' }
  /** the Daily challenge: same seeded deal for everyone (it runs LocalGame in daily mode itself) */
  | { name: 'daily' }
  /** a mini game from src/games/registry.ts (/g/<id>) */
  | { name: 'game'; id: string };
type Overlay = 'rules' | 'admin' | 'shop' | 'merch' | 'god' | 'quests' | 'achievements' | 'vault' | 'season' | LegalKind | null;

/** /g/<id>: the registered mini game, or back home for an unknown id. */
function MiniGame({ id, onExit, onAuth }: { id: string; onExit: () => void; onAuth: () => void }) {
  const m = gameById(id);
  useEffect(() => { if (!m) onExit(); }, [m]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return null;
  const S = m.Screen;
  return <S onExit={onExit} onAuth={onAuth} />;
}

function parse(): { route: Route; overlay: Overlay } {
  const p = location.pathname;
  const m = p.match(/^\/r\/([A-Za-z0-9]{4,6})\/?$/);
  if (m) return { route: { name: 'room', code: m[1].toUpperCase() }, overlay: null };
  if (/^\/journey\/?$/.test(p)) return { route: { name: 'journey' }, overlay: null };
  if (/^\/daily\/?$/.test(p)) return { route: { name: 'daily' }, overlay: null };
  const gm = p.match(/^\/g\/([a-z0-9-]{2,24})\/?$/);
  if (gm) return { route: { name: 'game', id: gm[1] }, overlay: null };
  const o = p.match(/^\/(rules|privacy|terms|admin|shop|merch|god|quests|achievements|vault|season)\/?$/);
  return { route: { name: 'home' }, overlay: o ? (o[1] as Overlay) : null };
}

function Shell() {
  const [route, setRoute] = useState<Route>(() => parse().route);
  const [overlay, setOverlay] = useState<Overlay>(() => parse().overlay);
  const [sheet, setSheet] = useState<'profile' | 'auth' | 'leaders' | 'install' | 'stakes' | null>(null);
  const [shopTab, setShopTab] = useState<ShopTab | undefined>(undefined);
  const app = useApp();
  // the very first screen appears without the route cross-fade (it would only hold back the first paint)
  const [navs, setNavs] = useState(0);
  useEffect(() => { whenIdle(() => LocalGame.preload(), 4000, 4000); }, []);
  // arriving from a password-reset email → open the sheet on the "new password" step
  useEffect(() => { if (app.recovery) setSheet('auth'); }, [app.recovery]);

  useEffect(() => {
    const f = () => { const p = parse(); setNavs(n => n + 1); setRoute(r => (r.name === 'local' && p.route.name === 'home' ? r : p.route)); setOverlay(p.overlay); };
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, []);

  const go = (r: Route, path = '/', replace = false) => {
    if (location.pathname !== path) history[replace ? 'replaceState' : 'pushState'](null, '', path);
    setNavs(n => n + 1); setRoute(r); setOverlay(null);
  };
  const home = () => go({ name: 'home' }, '/');
  const openOverlay = (o: Exclude<Overlay, null>) => { history.pushState(null, '', '/' + o); setOverlay(o); };
  const closeOverlay = () => { if (route.name === 'home' && location.pathname !== '/') history.pushState(null, '', '/'); setOverlay(null); };
  const saved = route.name === 'home' ? loadSavedGame() : null;
  const auth = () => setSheet('auth');
  const openShop = (tab?: ShopTab) => { setShopTab(tab); openOverlay('shop'); };
  /** a stake table: the entry is already paid (StakePicker) → a hard 4-seat bot table that carries the stake id */
  const playStake = (stake: ActiveStake) => go({ name: 'local', resume: null, key: Date.now(), stake });
  const savedStake = savedStakeIdOf(saved) != null ? saved : null;

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
          <motion.div key="home" style={{ position: 'absolute', inset: 0 }} initial={navs === 0 ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.3 }}>
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
              onSeason={() => openOverlay('season')}
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
            <Suspense fallback={null}><LocalGame resume={route.resume} stake={route.stake} onExit={home} /></Suspense>
          </motion.div>
        )}
        {route.name === 'room' && (
          <motion.div key={'room' + route.code} style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Suspense fallback={null}><OnlineRoom code={route.code} onExit={home} onQuickAgain={skip => quick(skip).catch(home)} onAuth={auth} /></Suspense>
          </motion.div>
        )}
        {route.name === 'journey' && (
          <motion.div key="journey" style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Suspense fallback={null}><Journey onExit={home} onAuth={auth} /></Suspense>
          </motion.div>
        )}
        {route.name === 'game' && (
          <motion.div key={'game' + route.id} style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Suspense fallback={null}><MiniGame id={route.id} onExit={home} onAuth={auth} /></Suspense>
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
        {overlay === 'shop' && <ShopScreen key="shop" initialTab={shopTab} onClose={closeOverlay} onAuth={() => { closeOverlay(); setSheet('auth'); }} onSeason={() => openOverlay('season')} />}
        {overlay === 'season' && <SeasonScreen key="season" onClose={closeOverlay} onAuth={auth} onDiamonds={() => openShop('diamonds')} />}
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
          onDiamonds={() => { setSheet(null); openShop('diamonds'); }} onAchievements={() => { setSheet(null); openOverlay('achievements'); }} onVault={() => { setSheet(null); openOverlay('vault'); }} onSeason={() => { setSheet(null); openOverlay('season'); }} />}
        {sheet === 'auth' && <AuthSheet key="a" onClose={() => setSheet(null)} onLegal={k => { setSheet(null); openOverlay(k); }} />}
        {sheet === 'leaders' && <Leaderboard key="lb" onClose={() => setSheet(null)} onAuth={() => setSheet('auth')} />}
        {sheet === 'install' && <InstallSheet key="in" onClose={() => setSheet(null)} />}
        {sheet === 'stakes' && (
          <Sheet key="st" onClose={() => setSheet(null)}>
            <StakePicker onAuth={() => setSheet('auth')}
              onStart={st => { setSheet(null); playStake(st); }}
              resumeStakeId={savedStakeIdOf(savedStake)}
              onResume={savedStake ? () => { setSheet(null); go({ name: 'local', resume: savedStake, key: Date.now() }); } : undefined} />
          </Sheet>
        )}
      </AnimatePresence>
      </Suspense>
      <CosmeticsSync />
      <Deferred delay={2500}>
        <SocialRoot />
        <QuestToasts />
        <ReferralRoot onAuth={auth} />
        <SeasonToast muted={overlay === 'season'} onOpen={() => { setSheet(null); openOverlay('season'); }} />
        <RewardsLayer autoDaily={route.name === 'home' && !overlay && !sheet} onAuth={() => setSheet('auth')} />
      </Deferred>
    </div>
  );
}

export default function App() {
  return <MotionConfig reducedMotion="user"><AppProvider><Shell /></AppProvider></MotionConfig>;
}
