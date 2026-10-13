import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { HeroCards } from '../components/HeroCards';
import { Backdrop } from '../components/Backdrop';
import { Intro, shouldShowIntro } from '../components/Intro';
import { LangPicker } from '../components/LangPicker';
import { DailyRewardButton, LevelBadge, QuestTracker, RulesPanel } from './homeLazy';
import { UserAvatar } from '../media/UserAvatar';
import { useInstall } from '../install';
import { useStrings } from '../i18n/pick';
import { HOME } from '../i18n/home';
import type { BotLevel } from '../engine/bot';
import { DailyCard } from '../daily/DailyCard';
import { useJourney } from '../campaign/journeyStore';
import { TOTAL_STARS, totalStars } from '../campaign/data';
import { sfx } from '../sound';
import { SeasonDockBtn } from '../season/parts';
import '../styles/home.css';

interface Props {
  onPlay: () => void; onResume: (() => void) | null; onRules: () => void; onProfile: () => void; onAuth: () => void;
  onCreateRoom: () => void; onJoinRoom: (code: string) => void; onQuick: () => Promise<void>;
  onLegal: (k: 'privacy' | 'terms') => void; onLeaders: () => void; onInstall: () => void; onAdmin: () => void;
  /** Cosmetics & bonuses store. Falls back to the profile's "look" section when not provided. */
  onShop?: () => void;
  /** Physical merch store. The entry is hidden when not provided. */
  onMerch?: () => void;
  /** The Journey campaign (/journey). */
  onJourney?: () => void;
  /** Quest log overlay (/quests) — opened from the compact quest tracker. */
  onQuests?: () => void;
  /** Achievements hall (/achievements). */
  onAchievements?: () => void;
  /** The vault: fortune wheel, boosts, collections, prestige (/vault). */
  onVault?: () => void;
  /** High-stakes tables: opens the StakePicker sheet. */
  onStakes?: () => void;
  /** The Daily challenge (/daily). */
  onDaily?: () => void;
  /** Season Pass (/season). */
  onSeason?: () => void;
}

// typed locally so it compiles before the engine adds hard/expert to BotLevel
type Level = 'easy' | 'normal' | 'hard' | 'expert';
type Mode = 'bots' | 'online' | 'friends';

function useViewport() {
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return vw;
}

export function Home({ onPlay, onResume, onRules, onProfile, onAuth, onCreateRoom, onJoinRoom, onQuick, onLegal, onLeaders, onInstall, onAdmin, onShop, onMerch,
  onJourney, onQuests, onAchievements, onVault, onStakes, onDaily, onSeason }: Props) {
  const ins = useInstall();
  const [bannerOff, setBannerOff] = useState(() => { try { return localStorage.getItem('b125.installBanner') === 'off'; } catch { return false; } });
  const hideBanner = () => { setBannerOff(true); try { localStorage.setItem('b125.installBanner', 'off'); } catch { /* */ } };
  const app = useApp();
  const { t, lang } = app;
  const h = useStrings(HOME);
  const vw = useViewport();
  const wide = vw >= 920;
  const cw = wide ? 150 : Math.round(Math.min(104, vw * 0.235));
  const [intro, setIntro] = useState(shouldShowIntro);
  const journey = useJourney();
  const jStars = totalStars(journey.stars);
  const scroller = useRef<HTMLDivElement>(null);

  // pointer → tilt (springs); idle drift when the pointer is still or on touch devices
  const rawX = useMotionValue(0), rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 90, damping: 16, mass: 0.6 });
  const my = useSpring(rawY, { stiffness: 90, damping: 16, mass: 0.6 });
  const lastMove = useRef(0);
  const [spread, setSpread] = useState(false);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      lastMove.current = performance.now();
      rawX.set((e.clientX / window.innerWidth) * 2 - 1);
      rawY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      lastMove.current = performance.now();
      rawX.set(Math.max(-1, Math.min(1, e.gamma / 25)));
      rawY.set(Math.max(-1, Math.min(1, (e.beta - 45) / 25)));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('deviceorientation', onOrient);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('deviceorientation', onOrient); };
  }, [rawX, rawY]);
  useAnimationFrame(time => {
    if (performance.now() - lastMove.current < 2500) return;
    rawX.set(Math.sin(time / 2600) * 0.45);
    rawY.set(Math.cos(time / 3300) * 0.3);
  });

  // quick start state
  const mode: Mode = app.mode ?? 'bots';
  const level = (app.level ?? 'normal') as Level;
  const [code, setCode] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [qErr, setQErr] = useState(false);
  const quick = async () => {
    if (qBusy) return;
    setQBusy(true); setQErr(false);
    try { await onQuick(); } catch { setQErr(true); setQBusy(false); }
  };
  const start = () => {
    if (mode === 'online') void quick();
    else if (mode === 'friends') onCreateRoom();
    else onPlay();
  };
  const startLabel = mode === 'online' ? (qBusy ? t.quick.finding : t.quick.play) : mode === 'friends' ? t.room.create : t.vsBots;
  const join = () => { if (code.trim().length >= 4) onJoinRoom(code.trim().toUpperCase()); };
  const toRules = () => scroller.current?.querySelector('#rules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // title tilts a touch less than the cards → depth between layers
  const tRotY = useTransform(mx, [-1, 1], [-7, 7]);
  const tRotX = useTransform(my, [-1, 1], [5, -5]);
  const tX = useTransform(mx, [-1, 1], [-6, 6]);

  const title = (
    <motion.h1 className="serif brand" initial="h" animate="s" style={{ fontSize: wide ? 104 : Math.min(60, vw * 0.15), rotateX: tRotX, rotateY: tRotY, x: tX }}
      variants={{ s: { transition: { staggerChildren: 0.045, delayChildren: 0.55 } } }}>
      {'Bridge'.split('').map((ch, i) => (
        <motion.span key={i} style={{ display: 'inline-block' }} variants={{ h: { y: 30, opacity: 0, rotateX: -60 }, s: { y: 0, opacity: 1, rotateX: 0 } }}>{ch}</motion.span>
      ))}
      <motion.span className="gold" style={{ display: 'inline-block', marginLeft: '0.22em' }} variants={{ h: { scale: 0.6, opacity: 0 }, s: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 14 } } }}>125</motion.span>
    </motion.h1>
  );


  const shop = onShop ?? onProfile;

  return (
    <div className="home h5" ref={scroller}>
      <Backdrop mx={mx} my={my} />
      <Atmosphere mx={mx} my={my} dense={wide} />

      <AnimatePresence>{intro && <Intro key="intro" onDone={() => setIntro(false)} />}</AnimatePresence>

      <header className="topnav">
        <a className="logo" href="/" aria-label="Bridge 125" onClick={e => e.preventDefault()}><img className="mark" src="/logo-mark.svg" alt="" width="40" height="40" fetchPriority="high" /><span className="word">BRIDGE <b>125</b></span></a>
        <nav>
          {wide && <button className="navlink" onClick={onRules}>{t.nav.howToPlay}</button>}
          {wide && <button className="navlink" onClick={onLeaders}>{t.lb.open}</button>}
          {wide && <button className="navlink" onClick={shop}>{h.shop.title}</button>}
          {app.isAdmin && wide && <button className="adminpill" onClick={onAdmin} title="Admin">📊<span>Admin</span></button>}
          {wide && ins.available && <button className="installpill" onClick={onInstall}><span aria-hidden>⬇</span>{t.install.button}</button>}
          {wide && <LangPicker />}
          <DailyRewardButton />
          {wide && <LevelBadge size={34} onClick={onProfile} />}
          {app.session ? (
            <button className="who" onClick={onProfile}>
              <UserAvatar size={32} className="avatar sm" />
              <span className="whoname">{app.name || t.profile}</span>
              {app.profile && <span className="chip bm"><i className="coin" />{app.profile.bm.toLocaleString('fr-FR')}</span>}
            </button>
          ) : (
            <button className="btn acc sm" onClick={onAuth}>{t.nav.signIn}</button>
          )}
          {!wide && <button className="iconbtn" aria-label={t.settings} onClick={onProfile}>⚙</button>}
        </nav>
      </header>

      {!intro && (
        <main className={`homegrid ${wide ? 'wide' : ''}`}>
          <section className="hero h5-hero" onPointerEnter={() => setSpread(true)} onPointerLeave={() => setSpread(false)}>
            <Felt cw={cw} mx={mx} />
            <HeroCards cw={cw} lang={lang} mx={mx} my={my} spread={spread} />
            <div className="herotext" style={{ marginTop: wide ? 18 : -2 }}>
              {title}
              <motion.p className="heroline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>{t.heroLine}</motion.p>
              {wide && (
                <motion.button className="h5-cue" onClick={toRules} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
                  {h.rulesCue}<span aria-hidden>↓</span>
                </motion.button>
              )}
            </div>
          </section>

          <motion.section className="panel playcard h5-play" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, type: 'spring', stiffness: 120, damping: 18 }}>
            {onResume && <button className="btn ghost h5-resume" onClick={onResume}><span aria-hidden>↺</span>{t.continueGame}</button>}

            <ModeTabs mode={mode} labels={h.modes} onChange={m => { setQErr(false); app.set({ mode: m }); }} />

            <div className="h5-opts">
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'bots' && (
                  <motion.div key="bots" className="h5-optset" {...swap}>
                    <div className="h5-row">
                      <div className="h5-field">
                        <div className="label">{h.players}</div>
                        <Seg value={app.opponents + 1} options={[2, 3, 4].map(n => ({ v: n, l: String(n) }))} onChange={v => app.set({ opponents: v - 1 })} />
                      </div>
                      <button className="h5-bluff" role="switch" aria-checked={app.bluff} onClick={() => app.set({ bluff: !app.bluff })} title={h.bluffHint}>
                        <span className="txt"><b>{h.bluff}</b><small>{h.bluffHint}</small></span>
                        <span className={`switch ${app.bluff ? 'on' : ''}`}><i /></span>
                      </button>
                    </div>
                    <div className="label">{h.level}</div>
                    <Seg value={level} options={(['easy', 'normal', 'hard', 'expert'] as Level[]).map(v => ({ v, l: h.levels[v] }))}
                      onChange={v => app.set({ level: v as BotLevel })} />
                  </motion.div>
                )}
                {mode === 'online' && (
                  <motion.div key="online" className="h5-optset h5-note" {...swap}>
                    <span className="qdot" aria-hidden><i /></span>
                    <p>{h.onlineNote}</p>
                  </motion.div>
                )}
                {mode === 'friends' && (
                  <motion.div key="friends" className="h5-optset" {...swap}>
                    <p className="h5-sub">{h.friendsNote}</p>
                    <form className="joinform" onSubmit={e => { e.preventDefault(); join(); }}>
                      <input className="field code" value={code} maxLength={6} placeholder={t.room.enterCode} aria-label={t.room.code}
                        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                      <button className="btn ghost sm" disabled={code.length < 4} type="submit">{t.room.join}</button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className={`btn big h5-start ${mode === 'online' ? 'live' : 'acc'}`} onClick={start} disabled={qBusy} aria-busy={qBusy}>
              {mode === 'online' ? <span className="qdot" aria-hidden><i /></span> : <span className="suitspin" aria-hidden>{mode === 'friends' ? '♥' : '♠'}</span>}
              <span className="lbl">{startLabel}</span>
              {qBusy ? <span className="spinner" /> : <span className="arr" aria-hidden>→</span>}
            </button>
            {qErr && <div className="qerr" role="alert">{t.quick.error}</div>}

            <nav className="h5-dock" aria-label="Bridge 125">
              {onJourney && <DockBtn icon={<JourneyIcon />} label={h.dock.journey} badge={jStars > 0 ? `${jStars}/${TOTAL_STARS}` : undefined} hot onClick={onJourney} />}
              {onSeason && <SeasonDockBtn onClick={onSeason} />}
              {onStakes && <DockBtn icon={<ChipsIcon />} label={h.dock.stakes} onClick={onStakes} />}
              {onAchievements && <DockBtn icon={<TrophyIcon />} label={h.dock.trophies} onClick={onAchievements} />}
              {onVault && <DockBtn icon={<VaultIcon />} label={h.dock.vault} onClick={onVault} />}
            </nav>

            {onQuests && <QuestTracker className="h5-quests" onOpen={onQuests} />}
            {onDaily && <DailyCard onOpen={onDaily} />}

            <div className={`h5-store ${onMerch ? '' : 'one'}`}>
              <StoreTile icon={<GemIcon />} title={h.shop.title} sub={h.shop.sub} onClick={shop} />
              {onMerch && <StoreTile icon={<BagIcon />} title={h.merch.title} sub={h.merch.sub} onClick={onMerch} />}
            </div>

            {!wide && (
              <div className="h5-links">
                <button className="btn ghost" onClick={onRules}>{t.howToPlay}</button>
                <button className="btn ghost" onClick={onLeaders}><span aria-hidden style={{ fontSize: 15 }}>🏆</span>{t.lb.open}</button>
              </div>
            )}
            {!wide && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}><LangPicker variant="pill" /></div>}
          </motion.section>

          <AnimatePresence>
            {!wide && ins.available && !bannerOff && (
              <motion.div className="installbanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: -14 }} transition={{ delay: 1.2 }}>
                <img src="/icon-192.png" alt="" width={40} height={40} />
                <button className="ibtext" onClick={onInstall}><b>Bridge 125</b><span>{t.install.banner}</span></button>
                <button className="btn acc sm" onClick={onInstall}>{t.install.button}</button>
                <button className="ibx" aria-label={t.close} onClick={hideBanner}>×</button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}

      {!intro && (
        <div className="h5-rules">
          <RulesPanel onGuide={onRules} onPractice={onPlay} />
        </div>
      )}

      <footer className="homefoot">
        <button onClick={() => onLegal('privacy')}>{t.legal.privacy}</button><span>·</span>
        <button onClick={() => onLegal('terms')}>{t.legal.terms}</button><span>·</span>
        <span>© {new Date().getFullYear()} Bridge 125</span>
      </footer>
    </div>
  );
}

const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
};

/* ---------- pieces ---------- */

const MODE_ICONS: Record<Mode, ReactNode> = {
  bots: (
    <svg viewBox="0 0 24 24" aria-hidden><rect x="4.5" y="7.5" width="15" height="11" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="9.5" cy="13" r="1.4" fill="currentColor" /><circle cx="14.5" cy="13" r="1.4" fill="currentColor" /><path d="M12 7.5V4.5M10 4.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  ),
  online: (
    <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4 12h16M12 4c2.4 2.4 2.4 13.6 0 16M12 4c-2.4 2.4-2.4 13.6 0 16" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  friends: (
    <svg viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="16.5" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 19c.8-3.2 3-4.8 5.5-4.8s4.7 1.6 5.5 4.8M14.5 14.6c2.6-.4 4.9.9 5.9 3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  ),
};

function ModeTabs({ mode, labels, onChange }: { mode: Mode; labels: Record<Mode, string>; onChange: (m: Mode) => void }) {
  const ids: Mode[] = ['bots', 'online', 'friends'];
  return (
    <div className="h5-modes" role="radiogroup">
      {ids.map(id => (
        <button key={id} role="radio" aria-checked={mode === id} className={mode === id ? 'on' : ''} onClick={() => onChange(id)}>
          {mode === id && <motion.span layoutId="h5-mode" className="pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="ic">{MODE_ICONS[id]}</span>
          <span className="tx">{labels[id]}</span>
          {id === 'online' && <i className="live" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

function StoreTile({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button className="h5-tile" onClick={onClick}>
      <span className="ico">{icon}</span>
      <span className="tt"><b>{title}</b><small>{sub}</small></span>
      <span className="go" aria-hidden>›</span>
    </button>
  );
}

/** Frameless icon link (Home quick row): brass glyph, small caption, optional badge. */
function DockBtn({ icon, label, badge, hot = false, onClick }: { icon: ReactNode; label: string; badge?: string; hot?: boolean; onClick: () => void }) {
  return (
    <motion.button className={`h5-dockbtn ${hot ? 'hot' : ''}`} onClick={() => { sfx.tap(); onClick(); }} whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }}>
      <span className="di" aria-hidden>{icon}</span>
      <span className="dl">{label}</span>
      {badge && <span className="db">{badge}</span>}
    </motion.button>
  );
}

const JourneyIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden><circle cx="14" cy="14" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M14 2.5v3M14 22.5v3M2.5 14h3M22.5 14h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M17.8 10.2 12.4 12.4 10.2 17.8 15.6 15.6z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><circle cx="14" cy="14" r="1.2" fill="currentColor" /></svg>
);
const ChipsIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden><ellipse cx="14" cy="8.5" rx="8.5" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5.5 8.5v3.6c0 1.8 3.8 3.2 8.5 3.2s8.5-1.4 8.5-3.2V8.5M5.5 12.1v3.6c0 1.8 3.8 3.2 8.5 3.2s8.5-1.4 8.5-3.2v-3.6M5.5 15.7v3.6c0 1.8 3.8 3.2 8.5 3.2s8.5-1.4 8.5-3.2v-3.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M11 8.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const TrophyIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden><path d="M8.5 4.5h11v5.5a5.5 5.5 0 0 1-11 0z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8.5 6.5H5.2c0 3.2 1.4 5 3.9 5.4M19.5 6.5h3.3c0 3.2-1.4 5-3.9 5.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M14 15.5v4M10 23.5h8M11 19.5h6l.8 4h-7.6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /><path d="m14 6.6.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z" fill="currentColor" /></svg>
);
const VaultIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden><rect x="3.5" y="4.5" width="21" height="19" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="14" cy="14" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M14 8.8v2.2M14 17v2.2M8.8 14h2.2M17 14h2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="14" cy="14" r="1.4" fill="currentColor" /><path d="M6.5 23.5v1.5M21.5 23.5v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

const GemIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden><path d="M6.5 4h11l3.5 5-9 11L3 9z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
);
const BagIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden><path d="M5 8h14l-1 12H6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
);

/** Reflective felt under the hero cards: a lit oval of table cloth with a specular streak that slides against the pointer. */
function Felt({ cw, mx }: { cw: number; mx: MotionValue<number> }) {
  const sx = useTransform(mx, [-1, 1], [cw * 0.9, -cw * 0.9]);
  const gx = useTransform(mx, [-1, 1], [cw * 0.25, -cw * 0.25]);
  return (
    <div className="h5-felt" aria-hidden style={{ width: cw * 5.2, height: cw * 1.55, marginLeft: -cw * 2.6, top: cw * 1.43 * 1.18 - cw * 0.78 }}>
      <div className="cloth" />
      <motion.div className="glow" style={{ x: gx }} />
      <motion.div className="streak" style={{ x: sx }} />
    </div>
  );
}

/** Extra depth layers: far bokeh, a light that follows the pointer, near dust motes. Transform-only so it stays cheap. */
function Atmosphere({ mx, my, dense }: { mx: MotionValue<number>; my: MotionValue<number>; dense: boolean }) {
  const lx = useTransform(mx, v => ((v + 1) / 2) * (typeof window !== 'undefined' ? window.innerWidth : 1000));
  const ly = useTransform(my, v => ((v + 1) / 2) * (typeof window !== 'undefined' ? window.innerHeight : 800));
  const fx = useTransform(mx, v => v * -18), fy = useTransform(my, v => v * -12);
  const nx = useTransform(mx, v => v * 34), ny = useTransform(my, v => v * 24);
  const motes = useMemo(() => Array.from({ length: dense ? 34 : 18 }, (_, i) => {
    const r = (k: number) => (((i + 1) * 9301 * (k + 3) + 49297) % 233280) / 233280;
    return { left: r(1) * 100, top: r(2) * 100, s: 1.5 + r(3) * 3, dur: 9 + r(4) * 12, del: -r(5) * 20, o: 0.25 + r(6) * 0.5 };
  }), [dense]);
  return (
    <div className="h5-atmos" aria-hidden>
      <motion.div className="far" style={{ x: fx, y: fy }}>
        <i className="orb o1" /><i className="orb o2" /><i className="orb o3" /><i className="orb o4" />
      </motion.div>
      <motion.div className="lamp" style={{ x: lx, y: ly }} />
      <motion.div className="near" style={{ x: nx, y: ny }}>
        {motes.map((m, i) => (
          <i key={i} className="mote" style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.s, height: m.s, opacity: m.o, animationDuration: `${m.dur}s`, animationDelay: `${m.del}s` }} />
        ))}
      </motion.div>
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(o => (
        <button key={String(o.v)} className={o.v === value ? 'on' : ''} role="radio" aria-checked={o.v === value} onClick={() => onChange(o.v)}>
          {o.v === value && <motion.div layoutId={'seg-' + options.map(x => x.v).join('')} className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span>{o.l}</span>
        </button>
      ))}
    </div>
  );
}
