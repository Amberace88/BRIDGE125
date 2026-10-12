import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { SHOP_STRINGS } from '../i18n/shop';
import { ACHIEVEMENTS, achDef } from '../progress/achievements';
import { DAILY_ITEM, DAILY_REWARDS } from '../progress/levels';
import { openDailyReward, syncAppProfile, useProgress, type Toast } from '../progress/useProgress';
import type { DailyResult } from '../progress/api';
import { fmtBm } from '../shop/catalog';
import { sfx, buzz } from '../sound';
import '../styles/shop.css';

/* ================================================================== small building blocks */

/** Count-up number that animates whenever `to` changes. */
export function Ticker({ to, dur = 0.9, from }: { to: number; dur?: number; from?: number }) {
  const v = useMotionValue(from ?? to);
  const txt = useTransform(v, x => fmtBm(x));
  useEffect(() => { const c = animate(v, to, { duration: dur, ease: [0.2, 0.8, 0.2, 1] }); return () => c.stop(); }, [to, dur, v]);
  return <motion.span>{txt}</motion.span>;
}

/** Deterministic 0..1 noise so renders stay pure. */
const noise = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Radial burst of brass coins (purchase, chest, level-up). Re-mount (change `key`) to replay. */
export function CoinBurst({ n = 16, spread = 150, className = '' }: { n?: number; spread?: number; className?: string }) {
  const coins = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + noise(i, 1) * 0.5;
    const r = spread * (0.5 + noise(i, 2) * 0.5);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75 - 30, rot: noise(i, 3) * 720 - 360, d: noise(i, 4) * 0.12, s: 0.75 + noise(i, 5) * 0.55 };
  }), [n, spread]);
  return (
    <div className={`cburst ${className}`} aria-hidden>
      {coins.map((c, i) => (
        <motion.i key={i} className="cbcoin" initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
          animate={{ x: c.x, y: [0, c.y, c.y + 80], scale: [0.2, c.s, c.s * 0.85], opacity: [1, 1, 0], rotate: c.rot }}
          transition={{ duration: 1.3, delay: c.d, ease: [0.15, 0.8, 0.3, 1], times: [0, 0.55, 1] }} />
      ))}
    </div>
  );
}

/** Achievement medallion: brass ring, engraved glyph. */
export function Medal({ code, size = 52, locked = false }: { code: string; size?: number; locked?: boolean }) {
  const d = achDef(code);
  return (
    <span className={`medal ${locked ? 'locked' : ''}`} style={{ width: size, height: size, fontSize: size * ((d?.glyph.length ?? 1) > 2 ? 0.26 : 0.36) }} aria-hidden>
      <span className="medalin">{d?.glyph ?? '★'}</span>
    </span>
  );
}

function Flame({ on = true, size = 22 }: { on?: boolean; size?: number }) {
  return (
    <svg className={`flame ${on ? 'on' : ''}`} width={size} height={size * 1.3} viewBox="0 0 24 32" aria-hidden>
      <defs>
        <linearGradient id="flg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF4D1A" /><stop offset=".55" stopColor="#FFA42E" /><stop offset="1" stopColor="#FFE8A0" />
        </linearGradient>
      </defs>
      <path d="M12 1C14 7 21 11 21 19.5a9 9 0 0 1-18 0C3 14.5 6 11.5 8.2 8.2c.2 3.6 1.7 5 3 5.3C10 9 10.8 4.5 12 1Z" fill={on ? 'url(#flg)' : '#59615d'} />
      <path d="M12 15c1.1 2.7 4 3.9 4 7a4 4 0 0 1-8 0c0-2.6 2.6-3.9 4-7Z" fill={on ? '#FFF4CC' : '#7c8580'} opacity=".9" />
    </svg>
  );
}

/** A brass-bound chest built from CSS; `open` lifts the lid. */
function Chest({ open, shaking, size = 1 }: { open: boolean; shaking: boolean; size?: number }) {
  return (
    <motion.div className="chest" style={{ scale: size }}
      animate={shaking ? { rotate: [0, -5, 5, -4, 4, -2, 2, 0], y: [0, -2, 0, -3, 0, -2, 0, 0] } : { rotate: 0, y: 0 }}
      transition={shaking ? { duration: 0.75, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}>
      <motion.div className="chestglow" animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.6 }} transition={{ duration: 0.5 }} />
      <div className="chestbase"><i className="chestlock" /></div>
      <motion.div className="chestlid" initial={false} animate={{ rotateX: open ? -118 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 13 }} />
    </motion.div>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
};

/* ================================================================== level */

/** Small XP ring with the level number — for the top nav / profile header. Renders nothing for guests. */
export function LevelBadge({ size = 38, onClick, className = '' }: { size?: number; onClick?: () => void; className?: string }) {
  const p = useProgress();
  const S = useStrings(SHOP_STRINGS);
  if (!p.signedIn || !p.ready) return null;
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  const label = `${S.level.level(p.level)} · ${S.level.xp(fmtBm(p.xpInto), fmtBm(p.xpNeed))}`;
  const body = (
    <>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="lvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--acc-hi)" /><stop offset="1" stopColor="var(--acc)" /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} className="lvtrack" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} className="lvarc" stroke="url(#lvg)" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p.xpPct) }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <b style={{ fontSize: size * (p.level >= 10 ? 0.36 : 0.42) }}>{p.level}</b>
    </>
  );
  return onClick
    ? <button className={`lvbadge ${className}`} style={{ width: size, height: size }} onClick={onClick} title={label} aria-label={label}>{body}</button>
    : <span className={`lvbadge ${className}`} style={{ width: size, height: size }} title={label} role="img" aria-label={label}>{body}</span>;
}

/** Level + XP bar row for the profile sheet. */
export function LevelBar() {
  const p = useProgress();
  const S = useStrings(SHOP_STRINGS);
  if (!p.signedIn || !p.ready) return null;
  return (
    <div className="lvbar">
      <LevelBadge size={46} />
      <div className="lvbarmain">
        <div className="lvbartop"><b>{S.level.level(p.level)}</b><span>{S.level.xp(fmtBm(p.xpInto), fmtBm(p.xpNeed))}</span></div>
        <div className="lvtrackbar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(3, p.xpPct * 100)}%` }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} /></div>
        <div className="lvbarsub">{S.level.toNext(fmtBm(p.xpNeed - p.xpInto))}</div>
      </div>
    </div>
  );
}

/* ================================================================== daily reward */

type Phase = 'idle' | 'opening' | 'opened' | 'error';

export function DailyRewardModal({ open, onClose, onAuth }: { open: boolean; onClose: () => void; onAuth?: () => void }) {
  return (
    <AnimatePresence>
      {open && <DailyInner key="daily" onClose={onClose} onAuth={onAuth} />}
    </AnimatePresence>
  );
}

function DailyInner({ onClose, onAuth }: { onClose: () => void; onAuth?: () => void }) {
  const app = useApp();
  const S = useStrings(SHOP_STRINGS);
  const p = useProgress();
  const d = p.data;
  const [phase, setPhase] = useState<Phase>('idle');
  const [res, setRes] = useState<DailyResult | null>(null);
  const now = useNow();

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const claimedToday = d ? !d.can_claim : false;
  const day = res?.day ?? d?.claim_day ?? 1;
  const streak = res?.streak ?? d?.streak ?? 0;
  const firstCycle = (res?.streak ?? d?.claim_streak ?? 1) <= 7;
  const showItem = firstCycle && (!!res?.item || !(d?.owned ?? []).includes(DAILY_ITEM));
  const nextMs = d ? new Date(d.next_reset).getTime() - now : 0;

  const claim = async () => {
    if (phase === 'opening' || !d?.can_claim) return;
    setPhase('opening'); sfx.tap(); buzz(12);
    const [r] = await Promise.all([p.claimDaily(), new Promise(r => setTimeout(r, 900))]);
    if (!r.ok) { setPhase('error'); return; }
    setRes(r); setPhase('opened'); sfx.big(); buzz([20, 40, 30]);
    if (r.claimed) void syncAppProfile(app, { bm: r.bm, owned: r.owned });
  };

  const isOpen = phase === 'opened' || (claimedToday && phase === 'idle');

  return (
    <>
      <motion.div className="dscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="dwrap" role="dialog" aria-modal="true" aria-label={S.daily.title}>
        <motion.div className="dmodal" initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
          <button className="dclose" onClick={onClose} aria-label={S.daily.close}>×</button>
          <div className="dhead">
            <div className={`dstreak ${streak > 0 ? 'on' : ''}`}><Flame on={streak > 0} size={16} /><span>{streak > 0 ? S.daily.streak(streak) : S.daily.streakNone}</span></div>
            <h2 className="serif">{S.daily.title}</h2>
            <p>{S.daily.sub}</p>
          </div>

          {!p.signedIn ? (
            <div className="dguest">
              <Chest open={false} shaking={false} size={0.9} />
              <p>{S.daily.signIn}</p>
              {onAuth && <button className="btn acc" onClick={() => { onClose(); onAuth(); }}>{S.shop.signIn}</button>}
            </div>
          ) : (
            <>
              <div className={`dstage ${isOpen ? 'open' : ''} ${phase === 'opening' ? 'charging' : ''}`}>
                <div className="drays" />
                <Chest open={isOpen} shaking={phase === 'opening'} />
                <AnimatePresence>
                  {phase === 'opened' && res?.claimed && (
                    <motion.div key="won" className="dwon" initial={{ x: '-50%', y: 10, opacity: 0, scale: 0.6 }} animate={{ x: '-50%', y: -6, opacity: 1, scale: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 14 }}>
                      <i className="coin" />+<Ticker from={0} to={res.reward_bm ?? 0} dur={1.1} /> BM
                    </motion.div>
                  )}
                </AnimatePresence>
                {phase === 'opened' && res?.claimed && <CoinBurst key="burst" n={20} spread={170} />}
              </div>
              {phase === 'opened' && res?.item && (
                <motion.div className="ditem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                  <span className="ditemsw" />{S.daily.itemUnlocked(S.shop.items[res.item] ?? res.item)}
                </motion.div>
              )}

              <div className="dgrid">
                {DAILY_REWARDS.map((bm, i) => {
                  const n = i + 1;
                  const done = n < day || (n === day && (claimedToday || phase === 'opened'));
                  const today = n === day && !done;
                  return (
                    <motion.div key={n} className={`dday ${done ? 'done' : ''} ${today ? 'today' : ''} ${n === 7 ? 'big' : ''}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                      <span className="ddn">{n === day ? S.daily.today : S.daily.day(n)}</span>
                      <span className="ddcoins">{n === 7 ? <i className="dchestmini" /> : <i className="coin" />}</span>
                      <b>{fmtBm(bm)}</b>
                      {n === 7 && showItem && <span className="ddplus"><span className="ditemsw sm" />+ {S.shop.items[DAILY_ITEM] ?? S.daily.plusItem}</span>}
                      {done && <motion.span className="ddcheck" initial={n === day ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 14 }}>✓</motion.span>}
                    </motion.div>
                  );
                })}
              </div>

              {phase === 'error' && <div className="autherr" style={{ marginTop: 12 }}>{S.daily.error}</div>}

              {d?.can_claim && phase !== 'opened' ? (
                <button className="btn acc big dclaim" onClick={claim} disabled={phase === 'opening' || !p.ready}>
                  {phase === 'opening' ? <span className="spinner" /> : <>{S.daily.claim} · <i className="coin" />{fmtBm(DAILY_REWARDS[day - 1])}</>}
                </button>
              ) : (
                <div className="dnext">
                  <b>{phase === 'opened' ? S.daily.claimed : S.daily.comeBack}</b>
                  {d && nextMs > 0 && <span>{S.daily.nextIn(hms(nextMs))}</span>}
                </div>
              )}
              {(phase === 'opened' || claimedToday) && <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>{S.daily.close}</button>}
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}

/** Nav button that opens the daily reward (with a pulse dot when it is ready). Renders nothing for guests. */
export function DailyRewardButton({ className = '' }: { className?: string }) {
  const p = useProgress();
  const S = useStrings(SHOP_STRINGS);
  if (!p.signedIn || !p.ready) return null;
  return (
    <button className={`dailybtn ${p.canClaim ? 'ready' : ''} ${className}`} onClick={openDailyReward} aria-label={S.daily.title} title={S.daily.title}>
      <i className="dchestmini" />
      {p.canClaim && <span className="dailydot" />}
    </button>
  );
}

/* ================================================================== toasts */

function ToastCard({ t, onDone }: { t: Toast; onDone: () => void }) {
  const S = useStrings(SHOP_STRINGS);
  useEffect(() => {
    if (t.kind === 'level') { sfx.big(); buzz([30, 40, 30]); } else if (t.kind === 'ach') { sfx.good(); buzz(25); }
    const tm = setTimeout(onDone, t.kind === 'xp' ? 2600 : t.kind === 'level' ? 4400 : 4000);
    return () => clearTimeout(tm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (t.kind === 'xp') {
    return (
      <motion.button layout className="rtoast xp" onClick={onDone} initial={{ y: -24, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -16, opacity: 0, scale: 0.95 }}>
        {t.won && <span className="rxwin">{S.level.win}</span>}
        <b>{S.level.xpGain(t.xp)}</b>
        {t.bm > 0 && <><span className="rxdot" /><span className="rxbm"><i className="coin" />+{fmtBm(t.bm)}</span></>}
      </motion.button>
    );
  }
  if (t.kind === 'level') {
    return (
      <motion.button layout className="rtoast level" onClick={onDone} initial={{ y: -40, opacity: 0, scale: 0.85 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
        <span className="rlvring">
          <span className="rlvrays" />
          <motion.b className="serif" initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 320, damping: 11 }}>{t.level}</motion.b>
        </span>
        <span className="rtxt">
          <small>{S.level.levelUp}</small>
          <strong className="serif">{S.level.level(t.level)}</strong>
          {t.bm > 0 && <span className="rbm"><i className="coin" />+{fmtBm(t.bm)} BM</span>}
        </span>
        <span className="rsheen" />
      </motion.button>
    );
  }
  const a = S.ach.list[t.code];
  return (
    <motion.button layout className="rtoast achv" onClick={onDone} initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
      <motion.span initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 13 }}><Medal code={t.code} size={48} /></motion.span>
      <span className="rtxt">
        <small>{S.ach.unlocked}</small>
        <strong>{a?.name ?? t.code}</strong>
        <em>{a?.desc}</em>
      </span>
      {t.bm > 0 && <span className="rbm side"><i className="coin" />+{fmtBm(t.bm)}</span>}
      <span className="rsheen" />
    </motion.button>
  );
}

export function RewardToasts() {
  const p = useProgress();
  return (
    <div className="rtoasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {p.toasts.map(t => <ToastCard key={t.id} t={t} onDone={() => p.dismissToast(t.id)} />)}
      </AnimatePresence>
    </div>
  );
}

/**
 * Mount once at the app root: level-up / achievement / XP toasts + the daily reward modal.
 * `autoDaily` opens the daily reward once per Riga day when it is ready (pass `route.name === 'home'`).
 */
export function RewardsLayer({ autoDaily = true, onAuth }: { autoDaily?: boolean; onAuth?: () => void }) {
  const p = useProgress();
  const today = p.data?.today;
  useEffect(() => {
    if (!autoDaily || !p.ready || !p.canClaim || !today) return;
    let seen: string | null = null;
    try { seen = localStorage.getItem('b125.daily.auto'); } catch { /* */ }
    if (seen === today) return;
    const tm = setTimeout(() => { try { localStorage.setItem('b125.daily.auto', today); } catch { /* */ } openDailyReward(); }, 1400);
    return () => clearTimeout(tm);
  }, [autoDaily, p.ready, p.canClaim, today]);
  return (
    <>
      <RewardToasts />
      <DailyRewardModal open={p.dailyOpen} onClose={p.closeDaily} onAuth={onAuth} />
    </>
  );
}

/* ================================================================== achievements list */

export function AchievementsList() {
  const p = useProgress();
  const S = useStrings(SHOP_STRINGS);
  const have = new Set(p.achievements);
  const d = p.data;
  const stat = (k: 'games_played' | 'wins' | 'level' | 'streak' | 'best_win_streak') => (d ? (k === 'level' ? p.level : d[k]) : 0);
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(have.has(b.code)) - Number(have.has(a.code)));
  return (
    <div className="achlist">
      <div className="achhead">
        <b>{S.ach.title}</b>
        <span>{S.ach.count(have.size, ACHIEVEMENTS.length)}</span>
      </div>
      <div className="achmeter"><motion.i initial={{ width: 0 }} animate={{ width: `${(have.size / ACHIEVEMENTS.length) * 100}%` }} transition={{ duration: 0.9 }} /></div>
      <div className="achgrid">
        {sorted.map((a, i) => {
          const got = have.has(a.code);
          const s = S.ach.list[a.code];
          const cur = a.goal ? Math.min(a.goal.n, stat(a.goal.stat)) : 0;
          return (
            <motion.div key={a.code} className={`achcard ${got ? 'got' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <Medal code={a.code} size={44} locked={!got} />
              <div className="achtxt">
                <b>{s?.name ?? a.code}</b>
                <span>{s?.desc}</span>
                {!got && a.goal && a.goal.n > 1 && (
                  <div className="achprog"><i style={{ width: `${(cur / a.goal.n) * 100}%` }} /><em>{cur}/{a.goal.n}</em></div>
                )}
              </div>
              <span className={`achbm ${got ? 'got' : ''}`}>{got ? '✓' : <><i className="coin" />{fmtBm(a.bm)}</>}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
