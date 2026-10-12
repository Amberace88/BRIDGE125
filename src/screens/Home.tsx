import { motion, useAnimationFrame, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { HeroCards } from '../components/HeroCards';
import { Backdrop } from '../components/Backdrop';
import { LANGS } from '../i18n';

interface Props {
  onPlay: () => void; onResume: (() => void) | null; onRules: () => void; onProfile: () => void; onAuth: () => void;
  onCreateRoom: () => void; onJoinRoom: (code: string) => void;
}

function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 920);
  useEffect(() => { const f = () => setWide(window.innerWidth >= 920); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return wide;
}

export function Home({ onPlay, onResume, onRules, onProfile, onAuth, onCreateRoom, onJoinRoom }: Props) {
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
        <div className="logo"><span className="mark">♠</span><span className="serif">Bridge <b>125</b></span></div>
        <nav>
          {wide && <button className="navlink" onClick={onRules}>{t.nav.howToPlay}</button>}
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
          <div style={{ textAlign: wide ? 'left' : 'center', marginTop: wide ? 8 : -6, position: 'relative', zIndex: 2 }}>
            {title}
            <motion.p className="heroline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>{t.heroLine}</motion.p>
          </div>
        </section>

        <motion.section className="panel playcard" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: 120, damping: 18 }}>
          {onResume && <button className="btn ghost" style={{ width: '100%', marginBottom: 10 }} onClick={onResume}>↺ {t.continueGame}</button>}
          <button className="btn acc big" onClick={onPlay}><span className="suitspin">♠</span>{t.vsBots}</button>
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

          {!wide && <button className="btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={onRules}>{t.howToPlay}</button>}
          <ul className="features">
            {t.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          {!wide && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>{langPills}</div>}
        </motion.section>
      </main>
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
