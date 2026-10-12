import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { HeroCards } from '../components/HeroCards';
import { Backdrop } from '../components/Backdrop';
import { LANGS } from '../i18n';
import { useInstall } from '../install';

interface Props {
  onPlay: () => void; onResume: (() => void) | null; onRules: () => void; onProfile: () => void; onAuth: () => void;
  onCreateRoom: () => void; onJoinRoom: (code: string) => void; onQuick: () => Promise<void>;
  onLegal: (k: 'privacy' | 'terms') => void; onLeaders: () => void; onInstall: () => void;
}

function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 920);
  useEffect(() => { const f = () => setWide(window.innerWidth >= 920); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return wide;
}

export function Home({ onPlay, onResume, onRules, onProfile, onAuth, onCreateRoom, onJoinRoom, onQuick, onLegal, onLeaders, onInstall }: Props) {
  const ins = useInstall();
  const [bannerOff, setBannerOff] = useState(() => { try { return localStorage.getItem('b125.installBanner') === 'off'; } catch { return false; } });
  const hideBanner = () => { setBannerOff(true); try { localStorage.setItem('b125.installBanner', 'off'); } catch { /* */ } };
  const app = useApp();
  const { t, lang } = app;
  const wide = useWide();
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const cw = wide ? 150 : Math.round(Math.min(104, vw * 0.235));

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

  const [code, setCode] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [qErr, setQErr] = useState(false);
  const quick = async () => {
    if (qBusy) return;
    setQBusy(true); setQErr(false);
    try { await onQuick(); } catch { setQErr(true); setQBusy(false); }
  };

  const title = (
    <motion.h1 className="serif brand" initial="h" animate="s" style={{ fontSize: wide ? 104 : Math.min(60, vw * 0.15) }}
      variants={{ s: { transition: { staggerChildren: 0.045, delayChildren: 0.55 } } }}>
      {'Bridge'.split('').map((ch, i) => (
        <motion.span key={i} style={{ display: 'inline-block' }} variants={{ h: { y: 30, opacity: 0, rotateX: -60 }, s: { y: 0, opacity: 1, rotateX: 0 } }}>{ch}</motion.span>
      ))}
      <motion.span className="gold" style={{ display: 'inline-block', marginLeft: '0.22em' }} variants={{ h: { scale: 0.6, opacity: 0 }, s: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 14 } } }}>125</motion.span>
    </motion.h1>
  );

  const langPills = (
    <div className="langs" role="radiogroup" aria-label={t.language}>
      {LANGS.map(l => (
        <button key={l.id} role="radio" aria-checked={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => app.saveProfile({ lang: l.id })}>{l.id.toUpperCase()}</button>
      ))}
    </div>
  );

  return (
    <div className="home">
      <Backdrop mx={mx} my={my} />

      <header className="topnav">
        <a className="logo" href="/" aria-label="Bridge 125" onClick={e => e.preventDefault()}><img className="mark" src="/logo-mark.svg" alt="" width="40" height="40" /><span className="word">BRIDGE <b>125</b></span></a>
        <nav>
          {wide && <button className="navlink" onClick={onRules}>{t.nav.howToPlay}</button>}
          {wide && <button className="navlink" onClick={onLeaders}>{t.lb.open}</button>}
          {wide && !ins.installed && <button className="installpill" onClick={onInstall}><span aria-hidden>⬇</span>{t.install.button}</button>}
          {wide && langPills}
          {app.session ? (
            <button className="who" onClick={onProfile}>
              <span className="avatar sm">{(app.name || app.session.user.email || '?').slice(0, 1).toUpperCase()}</span>
              <span className="whoname">{app.name || t.profile}</span>
              {app.profile && <span className="chip bm"><i className="coin" />{app.profile.bm.toLocaleString('fr-FR')}</span>}
            </button>
          ) : (
            <button className="btn acc sm" onClick={onAuth}>{t.nav.signIn}</button>
          )}
          {!wide && <button className="iconbtn" aria-label={t.settings} onClick={onProfile}>⚙</button>}
        </nav>
      </header>

      <main className={`homegrid ${wide ? 'wide' : ''}`}>
        <section className="hero" onPointerEnter={() => setSpread(true)} onPointerLeave={() => setSpread(false)}>
          <HeroCards cw={cw} lang={lang} mx={mx} my={my} spread={spread} />
          <div className="herotext" style={{ marginTop: wide ? 18 : -6 }}>
            {title}
            <motion.p className="heroline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>{t.heroLine}</motion.p>
          </div>
        </section>

        <AnimatePresence>
          {!wide && !ins.installed && !bannerOff && (
            <motion.div className="installbanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: -14 }} transition={{ delay: 1.2 }}>
              <img src="/icon-192.png" alt="" width={40} height={40} />
              <button className="ibtext" onClick={onInstall}><b>Bridge 125</b><span>{t.install.banner}</span></button>
              <button className="btn acc sm" onClick={onInstall}>{t.install.button}</button>
              <button className="ibx" aria-label={t.close} onClick={hideBanner}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section className="panel playcard" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: 120, damping: 18 }}>
          {onResume && <button className="btn ghost" style={{ width: '100%', marginBottom: 10 }} onClick={onResume}>↺ {t.continueGame}</button>}
          <button className="btn quickbtn" onClick={quick} disabled={qBusy} aria-busy={qBusy}>
            <span className="qdot" aria-hidden><i /></span>
            <span className="qtxt"><b>{qBusy ? t.quick.finding : t.quick.play}</b><small>{t.quick.sub}</small></span>
            {qBusy ? <span className="spinner" /> : <span className="qarrow" aria-hidden>→</span>}
          </button>
          {qErr && <div className="qerr" role="alert">{t.quick.error}</div>}
          <button className="btn acc big" style={{ marginTop: 10 }} onClick={onPlay}><span className="suitspin">♠</span>{t.vsBots}</button>
          <div className="opts">
            <div>
              <div className="label">{t.opponents}</div>
              <Seg value={app.opponents} options={[1, 2, 3].map(n => ({ v: n, l: String(n) }))} onChange={v => app.set({ opponents: v })} />
            </div>
            <div>
              <div className="label">{t.level}</div>
              <Seg value={app.level} options={[{ v: 'easy', l: t.easy }, { v: 'normal', l: t.normal }]} onChange={v => app.set({ level: v as 'easy' | 'normal' })} />
            </div>
          </div>

          <div className="divider"><span>{t.playFriends}</span></div>
          <div className="friends">
            <button className="btn ghost" onClick={onCreateRoom}>＋ {t.room.create}</button>
            <form className="joinform" onSubmit={e => { e.preventDefault(); if (code.trim().length >= 4) onJoinRoom(code.trim().toUpperCase()); }}>
              <input className="field code" value={code} maxLength={6} placeholder={t.room.enterCode} aria-label={t.room.code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
              <button className="btn acc sm" disabled={code.length < 4} type="submit">{t.room.join}</button>
            </form>
          </div>

          {!wide && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <button className="btn ghost" style={{ whiteSpace: 'nowrap' }} onClick={onRules}>{t.howToPlay}</button>
              <button className="btn ghost" style={{ whiteSpace: 'nowrap' }} onClick={onLeaders}><span aria-hidden style={{ fontSize: 15 }}>🏆</span>{t.lb.open}</button>
            </div>
          )}
          <ul className="features">
            {t.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          {!wide && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>{langPills}</div>}
        </motion.section>
      </main>
      <footer className="homefoot">
        <button onClick={() => onLegal('privacy')}>{t.legal.privacy}</button><span>·</span>
        <button onClick={() => onLegal('terms')}>{t.legal.terms}</button><span>·</span>
        <span>© {new Date().getFullYear()} Bridge 125</span>
      </footer>
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
