import { AnimatePresence, motion, useAnimate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { getSupabase, type Profile } from '../supabase';
import { useStrings } from '../i18n/pick';
import { GOD, type GodStrings } from '../i18n/god';
import { RoleBadge } from '../components/RoleBadge';
import { useProgress, type ProgressProfile } from '../progress/useProgress';
import { levelProgress } from '../progress/levels';
import { ACHIEVEMENTS } from '../progress/achievements';
import { COSMETICS } from '../shop/catalog';
import { useGodFlags } from '../god/flags';
import { buzz, sfx } from '../sound';
import '../styles/god.css';

export { useGodFlags, getGodFlags, type GodFlags } from '../god/flags';

/* GOD MODE — owner (admin) + co-author/main tester (god) test tools.
   Every action goes through the server RPC god_tools() (supabase/migration_007_god.sql), which re-checks the role
   and only ever touches the caller's own profile. */

type Action = 'topup' | 'set_bm' | 'unlock_all' | 'reset_owned' | 'add_xp' | 'reset_daily' | 'reset_progress' | 'unlock_achievements';
interface GodResult { bm: number; xp: number; level: number; owned: string[]; achievements: string[]; streak: number }
type Burst = { id: number; kind: 'coin' | 'xp' | 'spark' | 'reset'; title: string; icon: string };

/** Session flag read by components/Intro.tsx (shouldShowIntro). */
const INTRO_FLAG = 'b125.intro.v1';
const MAX_TOPUP = 1_000_000;
const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');

/** Count from the previous value to the new one (not from zero) so changes read as a change. */
function Tween({ to, dur = 900 }: { to: number; dur?: number }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    const a = from.current; if (a === to) return;
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur); const cur = a + (to - a) * (1 - Math.pow(1 - k, 4));
      setV(cur); from.current = cur;
      if (k < 1) raf = requestAnimationFrame(step); else from.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{fmt(v)}</>;
}

/** A readout value that pulses whenever it changes. */
function Pulse({ k, children, className = '' }: { k: string | number; children: ReactNode; className?: string }) {
  const first = useRef(true);
  const [scope, animate] = useAnimate<HTMLElement>();
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (scope.current) animate(scope.current, { scale: [1.16, 1], filter: ['brightness(1.9)', 'brightness(1)'] }, { duration: 0.7, ease: [0.2, 0.9, 0.3, 1] });
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return <b ref={scope} className={className}>{children}</b>;
}

export function GodPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const s = useStrings(GOD);
  const prog = useProgress();
  const flags = useGodFlags();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [amt, setAmt] = useState('');
  const burstTm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errTm = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (confirm) setConfirm(false); else onClose(); } };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [confirm, onClose]);
  useEffect(() => () => { if (burstTm.current) clearTimeout(burstTm.current); if (errTm.current) clearTimeout(errTm.current); }, []);

  const celebrate = useCallback((b: Omit<Burst, 'id'>) => {
    setBurst({ ...b, id: Date.now() });
    if (burstTm.current) clearTimeout(burstTm.current);
    burstTm.current = setTimeout(() => setBurst(null), 1700);
    if (b.kind === 'coin' || b.kind === 'xp') sfx.big(); else sfx.good();
    buzz(b.kind === 'reset' ? [30, 40, 30] : 18);
  }, []);
  const fail = useCallback((m: string) => {
    setErr(m); sfx.alert(); buzz([40, 30, 40]);
    if (errTm.current) clearTimeout(errTm.current);
    errTm.current = setTimeout(() => setErr(null), 3200);
  }, []);

  const run = async (action: Action, amount: number, key: string, ok: Omit<Burst, 'id'>) => {
    if (busy) return;
    setBusy(key); setErr(null); sfx.tap();
    try {
      const sb = await getSupabase();
      if (!sb) throw Object.assign(new Error('offline'), { code: 'offline' });
      const { data, error } = await sb.rpc('god_tools', { action, amount });
      if (error) throw error;
      const r = data as GodResult;
      app.patchProfile(r as unknown as Partial<Profile>);
      void prog.refresh();                       // daily chest state, level floor/next, streak
      celebrate(ok);
      return true;
    } catch (e) {
      const x = e as { code?: string; message?: string };
      fail(x.code === '42501' || /forbidden/i.test(x.message ?? '') ? s.err.forbidden
        : x.code === 'offline' || /fetch|network/i.test(x.message ?? '') ? s.err.network : s.err.generic);
      return false;
    } finally { setBusy(null); }
  };

  const prof = app.profile as ProgressProfile | null;

  // ---------------------------------------------------------------- guard
  if (!app.isPrivileged) {
    const loading = !!app.session && !app.profile;
    return (
      <motion.div className="godp" role="dialog" aria-modal="true" aria-label="GOD MODE" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <GodBackdrop />
        <div className="goddenied">
          {loading ? <span className="godspin" aria-label="…" /> : (
            <>
              <div className="goddlock" aria-hidden>✦</div>
              <h2>{s.noAccess}</h2>
              <p>{app.session ? s.noAccessSub : s.signInFirst}</p>
              <button className="btn ghost" onClick={onClose}>{s.back}</button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  const bm = prof?.bm ?? 0;
  const xp = prof?.xp ?? 0;
  const lp = levelProgress(xp, prof?.level ?? undefined);
  const ownedIds = new Set(prof?.owned ?? []);
  const ownedN = COSMETICS.filter(c => ownedIds.has(c.id)).length;
  const achN = (prof?.achievements ?? []).filter(c => ACHIEVEMENTS.some(a => a.code === c)).length;
  const role = prof?.role ?? (app.isAdmin ? 'admin' : 'god');

  const custom = () => {
    const n = parseInt(amt.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
  };
  const topCustom = async (mode: 'add' | 'set') => {
    const n = custom();
    if (mode === 'add' ? !(n >= 1 && n <= MAX_TOPUP) : !(n >= 0 && n <= 999_999_999)) { fail(s.badAmount); return; }
    const ok = mode === 'add'
      ? await run('topup', n, 'custom', { kind: 'coin', icon: '◉', title: s.done.topup(fmt(n)) })
      : await run('set_bm', n, 'set', { kind: 'coin', icon: '◉', title: s.done.set_bm(fmt(n)) });
    if (ok) setAmt('');
  };

  const replayIntro = () => {
    try { sessionStorage.removeItem(INTRO_FLAG); } catch { /* */ }
    celebrate({ kind: 'spark', icon: '▶', title: s.replayIntro });
    setTimeout(() => location.assign('/'), 650);
  };

  const toggle = (k: 'xray' | 'fastBots', label: string) => {
    const v = !flags[k];
    flags.set(k, v);
    celebrate({ kind: 'spark', icon: k === 'xray' ? '◐' : 'ϟ', title: `${label} · ${v ? s.done.on : s.done.off}` });
  };

  return (
    <motion.div className="godp" role="dialog" aria-modal="true" aria-label="GOD MODE"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <GodBackdrop />
      <div className="godscroll">
        <div className="godwrap">
          <header className="godhead">
            <div className="godtop">
              <RoleBadge role={role} />
              <span className="godwho">{role === 'god' ? s.who.god : s.who.admin}</span>
              <button className="godx" onClick={onClose} aria-label={s.close}>✕</button>
            </div>
            <GodTitle text={s.title} />
            <motion.p className="godsub" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>{s.sub}</motion.p>
          </header>

          {/* ---------------- live readout */}
          <motion.section className="godread" aria-live="polite" initial="h" animate="v" variants={{ v: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}>
            <motion.div className="gtile bm" variants={TILE}>
              <span className="gtl">{s.readout.bm}</span>
              <Pulse k={bm} className="gtv"><i className="gcoin" aria-hidden /><Tween to={bm} /></Pulse>
            </motion.div>
            <motion.div className="gtile lvl" variants={TILE}>
              <LevelRing pct={lp.pct} level={lp.level} />
              <div>
                <span className="gtl">{s.readout.level}</span>
                <Pulse k={lp.level} className="gtv sm">{lp.level}</Pulse>
                <span className="gts"><b className="gxpn">{fmt(xp)} XP</b> · {s.readout.xpTo(fmt(Math.max(0, lp.next - xp)))}</span>
              </div>
            </motion.div>
            <motion.div className="gtile" variants={TILE}>
              <span className="gtl">{s.readout.owned}</span>
              <Pulse k={ownedN} className="gtv sm">{ownedN}<em>/{COSMETICS.length}</em></Pulse>
              <span className="gbar"><motion.i animate={{ width: `${(ownedN / COSMETICS.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></span>
            </motion.div>
            <motion.div className="gtile" variants={TILE}>
              <span className="gtl">{s.readout.ach}</span>
              <Pulse k={achN} className="gtv sm">{achN}<em>/{ACHIEVEMENTS.length}</em></Pulse>
              <span className="gts">{s.readout.streak}: {prof?.streak ?? 0}</span>
            </motion.div>
          </motion.section>

          {/* ---------------- money */}
          <Section i={0} icon="◉" title={s.sec.money} sub={s.sec.moneySub} className="money">
            <div className="gcoins">
              {[1_000, 10_000, 100_000].map((n, i) => (
                <motion.button key={n} className={`gcoinbtn t${i}`} disabled={!!busy} whileHover={{ y: -3 }} whileTap={{ scale: 0.94, y: 2 }}
                  onClick={() => run('topup', n, 'top' + n, { kind: 'coin', icon: '◉', title: s.done.topup(fmt(n)) })}>
                  <span className="gstack" aria-hidden>{Array.from({ length: i + 2 }, (_, k) => <i key={k} style={{ ['--k' as string]: k }} />)}</span>
                  <b>{busy === 'top' + n ? <span className="godspin sm" /> : `+${fmt(n)}`}</b>
                  <small>BM · {s.topup}</small>
                </motion.button>
              ))}
            </div>
            <form className="gcustom" onSubmit={e => { e.preventDefault(); void topCustom('add'); }}>
              <label className="gfield">
                <span>{s.custom}</span>
                <input inputMode="numeric" autoComplete="off" placeholder={s.amountHint} value={amt}
                  onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 9); setAmt(d ? Number(d).toLocaleString('fr-FR') : ''); }} />
              </label>
              <motion.button type="submit" className="gbtn gold" disabled={!!busy || !amt} whileTap={{ scale: 0.95 }}>{busy === 'custom' ? <span className="godspin sm" /> : `+ ${s.add}`}</motion.button>
              <motion.button type="button" className="gbtn" disabled={!!busy || !amt} whileTap={{ scale: 0.95 }} onClick={() => void topCustom('set')}>{busy === 'set' ? <span className="godspin sm" /> : `= ${s.setExact}`}</motion.button>
            </form>
          </Section>

          <div className="godcols">
            {/* ---------------- progress */}
            <Section i={1} icon="★" title={s.sec.progress} sub={s.sec.progressSub}>
              <div className="gxp">
                {[500, 5_000].map(n => (
                  <motion.button key={n} className="gbtn xp" disabled={!!busy} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => run('add_xp', n, 'xp' + n, { kind: 'xp', icon: '★', title: s.done.add_xp(fmt(n)) })}>
                    {busy === 'xp' + n ? <span className="godspin sm" /> : s.addXp(fmt(n))}
                  </motion.button>
                ))}
              </div>
              <Tool icon="◷" title={s.resetDaily} sub={s.resetDailySub} busy={busy === 'daily'} disabled={!!busy}
                onClick={() => run('reset_daily', 0, 'daily', { kind: 'spark', icon: '◷', title: s.done.reset_daily })} />
              <Tool icon="🏅" title={s.unlockAch} sub={s.unlockAchSub} busy={busy === 'ach'} disabled={!!busy}
                onClick={() => run('unlock_achievements', 0, 'ach', { kind: 'spark', icon: '🏅', title: s.done.unlock_achievements })} />
            </Section>

            {/* ---------------- collection */}
            <Section i={2} icon="♛" title={s.sec.collection} sub={s.sec.collectionSub}>
              <Tool icon="🔓" title={s.unlockAll} sub={s.unlockAllSub} busy={busy === 'unlock'} disabled={!!busy} accent
                onClick={() => run('unlock_all', 0, 'unlock', { kind: 'spark', icon: '♛', title: s.done.unlock_all })} />
              <Tool icon="↺" title={s.resetOwned} sub={s.resetOwnedSub} busy={busy === 'owned'} disabled={!!busy}
                onClick={() => run('reset_owned', 0, 'owned', { kind: 'reset', icon: '↺', title: s.done.reset_owned })} />
            </Section>
          </div>

          {/* ---------------- local switches */}
          <Section i={3} icon="⚙" title={s.sec.testing} sub={s.sec.testingSub}>
            <div className="gswitches">
              <Switch on={flags.xray} icon="◐" title={s.xray} sub={s.xraySub} onToggle={() => toggle('xray', s.xray)} />
              <Switch on={flags.fastBots} icon="ϟ" title={s.fast} sub={s.fastSub} onToggle={() => toggle('fastBots', s.fast)} />
            </div>
            <Tool icon="▶" title={s.replayIntro} sub={s.replayIntroSub} disabled={!!busy} onClick={replayIntro} />
          </Section>

          {/* ---------------- danger */}
          <Section i={4} icon="⚠" title={s.sec.danger} className="danger">
            <Tool icon="⟲" title={s.resetProgress} sub={s.resetProgressSub} busy={busy === 'reset'} disabled={!!busy} danger onClick={() => { sfx.tap(); setConfirm(true); }} />
          </Section>

          <p className="godfoot">{s.footer}</p>
        </div>
      </div>

      <AnimatePresence>{burst && <BurstFx key={burst.id} b={burst} />}</AnimatePresence>
      <AnimatePresence>
        {err && (
          <motion.div className="goderr" role="alert" initial={{ y: 30, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 30, opacity: 0, x: '-50%' }}>
            ⚠ {err}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirm && <Confirm s={s} busy={busy === 'reset'} onCancel={() => setConfirm(false)}
          onYes={async () => { const ok = await run('reset_progress', 0, 'reset', { kind: 'reset', icon: '⟲', title: s.done.reset_progress }); if (ok) setConfirm(false); }} />}
      </AnimatePresence>
    </motion.div>
  );
}

const TILE = { h: { opacity: 0, y: 14, scale: 0.97 }, v: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } } };

/* ---------------------------------------------------------------- pieces */

function GodBackdrop() {
  return (
    <div className="godbg" aria-hidden>
      <i className="gaur a" /><i className="gaur b" /><i className="gaur c" />
      <i className="ggrid" />
      {MOTES.map((m, i) => <i key={i} className="gmote" style={{ left: `${m.x}%`, top: `${m.y}%`, ['--d' as string]: `${m.d}s`, ['--s' as string]: m.s, animationDelay: `${-m.o}s` }} />)}
      <i className="gvig" />
    </div>
  );
}
const MOTES = Array.from({ length: 22 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 61 + 13) % 100, d: 9 + ((i * 7) % 9), s: 0.5 + ((i * 13) % 10) / 12, o: (i * 1.7) % 12 }));

/** Molten-gold title with a holographic sheen; tilts toward the pointer. */
function GodTitle({ text }: { text: string }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-14, 14]), { stiffness: 150, damping: 18 });
  const shine = useTransform(mx, [-1, 1], ['0%', '100%']);
  return (
    <div className="godtitlewrap"
      onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}>
      <motion.h1 className="godtitle" style={{ rotateX: rx, rotateY: ry, ['--shine' as string]: shine }}
        initial={{ opacity: 0, scale: 0.86, letterSpacing: '0.42em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.06em' }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>
        <span className="gt-depth" aria-hidden>{text}</span>
        <span className="gt-gold">{text}</span>
        <span className="gt-holo" aria-hidden>{text}</span>
      </motion.h1>
      <motion.i className="godflare" aria-hidden initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }} />
    </div>
  );
}

function LevelRing({ pct, level }: { pct: number; level: number }) {
  const R = 26, C = 2 * Math.PI * R;
  return (
    <svg className="gring" viewBox="0 0 64 64" width="64" height="64" aria-hidden>
      <defs>
        <linearGradient id="gringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset=".5" stopColor="#e8b84a" /><stop offset="1" stopColor="#9a6a12" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r={R} className="gr-bg" />
      <motion.circle key={level} cx="32" cy="32" r={R} className="gr-fg" stroke="url(#gringg)" strokeDasharray={C}
        initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - Math.max(0.02, pct)) }} transition={{ type: 'spring', stiffness: 60, damping: 16 }} />
    </svg>
  );
}

function Section({ i, icon, title, sub, children, className = '' }: { i: number; icon: string; title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section className={`gsec ${className}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.07, type: 'spring', stiffness: 220, damping: 24 }}>
      <div className="gsech"><span className="gsi" aria-hidden>{icon}</span><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div></div>
      {children}
    </motion.section>
  );
}

function Tool({ icon, title, sub, onClick, busy, disabled, danger, accent }: { icon: string; title: string; sub: string; onClick: () => void; busy?: boolean; disabled?: boolean; danger?: boolean; accent?: boolean }) {
  return (
    <motion.button className={`gtool ${danger ? 'danger' : ''} ${accent ? 'accent' : ''}`} disabled={disabled} onClick={onClick} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}>
      <span className="gti" aria-hidden>{icon}</span>
      <span className="gtt"><b>{title}</b><small>{sub}</small></span>
      <span className="gtgo" aria-hidden>{busy ? <span className="godspin sm" /> : '›'}</span>
    </motion.button>
  );
}

function Switch({ on, icon, title, sub, onToggle }: { on: boolean; icon: string; title: string; sub: string; onToggle: () => void }) {
  return (
    <button className={`gswitch ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={onToggle}>
      <span className="gti" aria-hidden>{icon}</span>
      <span className="gtt"><b>{title}</b><small>{sub}</small></span>
      <span className="gsw" aria-hidden><motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} /></span>
    </button>
  );
}

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.2; const d = 110 + ((i * 41) % 70);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: (i * 47) % 360, s: 0.6 + ((i * 17) % 10) / 14, del: (i % 5) * 0.02 };
});

/** The confirmation moment: medallion + rays + a burst of coins/sparks. Pointer-transparent. */
function BurstFx({ b }: { b: Burst }) {
  return (
    <motion.div className={`gburst k-${b.kind}`} role="status" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <motion.div className="gbflash" initial={{ opacity: 0.55, scale: 0.4 }} animate={{ opacity: 0, scale: 2.4 }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      <motion.div className="gbrays" initial={{ rotate: -30, scale: 0.3, opacity: 0 }} animate={{ rotate: 30, scale: 1, opacity: [0, 1, 0.7] }} transition={{ duration: 1.5, ease: 'easeOut' }}>
        {RAYS.map(r => <i key={r} style={{ transform: `rotate(${r}deg)` }} />)}
      </motion.div>
      <motion.div className="gbring" initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      {SPARKS.map((p, i) => (
        <motion.i key={i} className="gbp" initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: [0, p.y - 40, p.y + 70], scale: [0, p.s, p.s * 0.7], rotate: p.r, opacity: [1, 1, 0] }}
          transition={{ duration: 1.2, delay: p.del, ease: 'easeOut', times: [0, 0.45, 1] }} />
      ))}
      <motion.div className="gbmedal" initial={{ scale: 0, rotateY: -180 }} animate={{ scale: [0, 1.15, 1], rotateY: 0 }} transition={{ duration: 0.6, ease: [0.2, 1.4, 0.4, 1] }}>
        <span>{b.icon}</span><i className="gbcheck">✓</i>
      </motion.div>
      <motion.div className="gbtitle" initial={{ y: 16, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 320, damping: 20 }}>{b.title}</motion.div>
    </motion.div>
  );
}

function Confirm({ s, busy, onCancel, onYes }: { s: GodStrings; busy: boolean; onCancel: () => void; onYes: () => void }) {
  return (
    <motion.div className="gconfirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
      <motion.div className="gcbox" role="alertdialog" aria-modal="true" aria-labelledby="gct" onClick={e => e.stopPropagation()}
        initial={{ y: 40, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
        <div className="gcicon" aria-hidden>⟲</div>
        <h3 id="gct">{s.confirmTitle}</h3>
        <p>{s.confirmBody}</p>
        <div className="gcbtns">
          <button className="btn ghost" onClick={onCancel} autoFocus>{s.cancel}</button>
          <button className="btn danger" onClick={onYes} disabled={busy}>{busy ? <span className="godspin sm" /> : s.confirmYes}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
