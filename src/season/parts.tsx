import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type CSSProperties } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { SEASON_STRINGS, type SeasonStrings } from '../i18n/season';
import { ItemThumb } from '../cosmetics/Previews';
import { cosName } from '../cosmetics/Badges';
import { DiamondIcon } from '../social/GiftArt';
import { fmtBm } from '../shop/catalog';
import { sfx } from '../sound';
import { tierProgress, type Reward } from './data';
import { seasonItem } from './cosmetics';
import { dismissTierToast, useSeason } from './store';
import '../styles/season.css';

/* ================================================================== helpers */

/** "34 d 5 h" · "5 h 12 min" · "12 min" in the player's language. */
export function fmtLeft(ms: number, u: SeasonStrings['units']) {
  const m = Math.floor(Math.max(0, ms) / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d} ${u.d} ${h % 24} ${u.h}`;
  if (h > 0) return `${h} ${u.h} ${m % 60} ${u.m}`;
  return `${Math.max(1, m)} ${u.m}`;
}

/** Ticks once a minute (countdowns). */
export function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), every); return () => clearInterval(t); }, [every]);
  return now;
}

/** Card label of a reward ("1 200 BM", "Jazz Club" …). */
export function rewardLabel(r: Reward, s: SeasonStrings, lang: string): string {
  switch (r.kind) {
    case 'bm': return s.reward.bm(fmtBm(r.amount));
    case 'dm': return s.reward.dm(fmtBm(r.amount));
    case 'shards': return s.reward.shards(r.amount);
    case 'spin': return s.reward.spin(r.amount);
    case 'boost_xp': return s.reward.boost(r.amount);
    case 'item': return cosName(lang, r.item ?? '', r.item);
  }
}

/* ================================================================== art */

const useUid = () => 's' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

function CoinStack({ size }: { size: number }) {
  const g = useUid();
  const coin = (y: number, k: number) => (
    <g key={k} transform={`translate(0 ${y})`}>
      <ellipse cx="32" cy="40" rx="20" ry="7" fill="#5e430a" />
      <rect x="12" y="34" width="40" height="6" fill={`url(#${g}e)`} />
      <ellipse cx="32" cy="34" rx="20" ry="7" fill={`url(#${g})`} stroke="#7a5810" strokeWidth=".8" />
      <ellipse cx="32" cy="34" rx="12.5" ry="4.2" fill="none" stroke="#8c6e28" strokeWidth=".9" opacity=".8" />
    </g>
  );
  return (
    <svg className="ssa-coins" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id={g} cx="38%" cy="30%" r="80%"><stop offset="0" stopColor="#fff6d0" /><stop offset=".5" stopColor="#e6bf5a" /><stop offset="1" stopColor="#8c6418" /></radialGradient>
        <linearGradient id={`${g}e`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7a5810" /><stop offset=".3" stopColor="#e9c977" /><stop offset=".6" stopColor="#a37a26" /><stop offset="1" stopColor="#5e430a" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="54" rx="24" ry="5" fill="#000" opacity=".35" />
      {coin(12, 0)}{coin(4, 1)}{coin(-4, 2)}
      <text x="32" y="33.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#6b4d12" fontFamily="system-ui, sans-serif" transform="translate(0 -4)">BM</text>
    </svg>
  );
}

function Shards({ size }: { size: number }) {
  const g = useUid();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3e8ff" /><stop offset=".45" stopColor="#b98cff" /><stop offset="1" stopColor="#4b2a8f" /></linearGradient>
        <linearGradient id={`${g}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e3fbff" /><stop offset=".5" stopColor="#6fd6ff" /><stop offset="1" stopColor="#1d5e8f" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="20" ry="4" fill="#000" opacity=".35" />
      <path d="M30 6 40 26 34 54 22 30Z" fill={`url(#${g})`} stroke="#2c1660" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M30 6 34 54 22 30Z" fill="#fff" opacity=".18" />
      <path d="M44 22 52 34 46 54 38 36Z" fill={`url(#${g}b)`} stroke="#123f63" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M16 30 22 40 20 54 12 42Z" fill={`url(#${g})`} stroke="#2c1660" strokeWidth=".8" strokeLinejoin="round" opacity=".9" />
      <path d="M31 12 33 22" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

function Wheel({ size }: { size: number }) {
  const g = useUid();
  const seg = Array.from({ length: 10 }, (_, i) => {
    const a0 = (i / 10) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 10) * Math.PI * 2 - Math.PI / 2;
    const p = (a: number, r: number) => `${32 + Math.cos(a) * r} ${34 + Math.sin(a) * r}`;
    return <path key={i} d={`M32 34 L${p(a0, 22)} A22 22 0 0 1 ${p(a1, 22)}Z`} fill={i % 2 ? '#7a1424' : i % 4 === 0 ? '#f7f1e3' : '#0b3e33'} />;
  });
  return (
    <svg className="ssa-wheel" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset=".5" stopColor="#c9a54c" /><stop offset="1" stopColor="#7d5d1c" /></linearGradient></defs>
      <ellipse cx="32" cy="59" rx="18" ry="3.5" fill="#000" opacity=".35" />
      <circle cx="32" cy="34" r="25" fill={`url(#${g})`} />
      <g className="spin">{seg}</g>
      <circle cx="32" cy="34" r="22" fill="none" stroke="#3b2a08" strokeWidth="1" opacity=".6" />
      <circle cx="32" cy="34" r="5" fill={`url(#${g})`} stroke="#5e430a" strokeWidth=".8" />
      <path d="M32 4 37 12 27 12Z" fill="#d2334f" stroke="#5a0b19" strokeWidth=".8" strokeLinejoin="round" />
    </svg>
  );
}

function Boost({ size }: { size: number }) {
  const g = useUid();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id={g} cx="40%" cy="30%" r="75%"><stop offset="0" stopColor="#2a6e8f" /><stop offset="1" stopColor="#081c26" /></radialGradient>
        <linearGradient id={`${g}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d0" /><stop offset=".5" stopColor="#ffd36b" /><stop offset="1" stopColor="#e08a1e" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#000" opacity=".35" />
      <circle cx="32" cy="31" r="23" fill={`url(#${g})`} stroke="#c9a54c" strokeWidth="2" />
      <path d="M35 10 20 34h11l-4 18 17-26H33z" fill={`url(#${g}b)`} stroke="#7a4a08" strokeWidth="1" strokeLinejoin="round" />
      <text x="47" y="51" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff2c4" stroke="#3b2a08" strokeWidth=".6" fontFamily="system-ui, sans-serif">×2</text>
    </svg>
  );
}

/** The art for one reward. Items show their real cosmetic preview. */
export function RewardArt({ r, size = 56 }: { r: Reward; size?: number }) {
  switch (r.kind) {
    case 'bm': return <CoinStack size={size} />;
    case 'dm': return <span className="ssa-dm" style={{ width: size, height: size }}><DiamondIcon size={Math.round(size * 0.82)} /></span>;
    case 'shards': return <Shards size={size} />;
    case 'spin': return <Wheel size={size} />;
    case 'boost_xp': return <Boost size={size} />;
    case 'item': {
      const it = seasonItem(r.item);
      return <span className="ssa-item" style={{ width: size * 1.28, height: size * 1.06 }}><ItemThumb id={r.item!} slot={it?.kind ?? 'title'} /></span>;
    }
  }
}

/* ================================================================== emblem */

/** Brass art-deco medallion with the tier number and a star-progress ring. */
export function Medallion({ tier, pct, size = 96, glow = false }: { tier: number; pct: number; size?: number; glow?: boolean }) {
  const g = useUid();
  const R = 41, C = 2 * Math.PI * R;
  return (
    <span className={`ssm ${glow ? 'glow' : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.32) } as CSSProperties}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6d8" /><stop offset=".35" stopColor="#e2bd62" /><stop offset=".7" stopColor="#8c6e28" /><stop offset="1" stopColor="#f3de9c" /></linearGradient>
          <radialGradient id={`${g}e`} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#173f49" /><stop offset="1" stopColor="#06141a" /></radialGradient>
        </defs>
        <g className="ssm-rays">
          {Array.from({ length: 32 }, (_, i) => <path key={i} transform={`rotate(${i * 11.25} 50 50)`} d={i % 2 ? 'M50 3 51.2 12 48.8 12Z' : 'M50 0 51.8 12 48.2 12Z'} fill={`url(#${g})`} opacity={i % 2 ? 0.55 : 0.9} />)}
        </g>
        <circle cx="50" cy="50" r="38" fill={`url(#${g})`} />
        <circle cx="50" cy="50" r="33.5" fill={`url(#${g}e)`} stroke="#3b2a08" strokeWidth="1" />
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="3.4" />
        <circle className="ssm-ring" cx="50" cy="50" r={R} fill="none" stroke="#fff2c4" strokeWidth="3.4" strokeLinecap="round"
          strokeDasharray={`${C * Math.max(0.001, Math.min(1, pct))} ${C}`} transform="rotate(-90 50 50)" />
        <path d="M30 41h40M30 59h40" stroke={`url(#${g})`} strokeWidth=".8" opacity=".55" />
        <text x="50" y="36.5" textAnchor="middle" className="ssm-star">★</text>
      </svg>
      <b className="ssm-n serif">{tier}</b>
    </span>
  );
}

/** Frameless ticket glyph for the Home dock and small entry points. */
export const PassIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden>
    <path d="M4 8.2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.7a3 3 0 0 0 0 6.2v2.7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.7a3 3 0 0 0 0-6.2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M18.5 7v14" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.6 1.8" />
    <path d="m11.5 9.6 1.15 2.35 2.6.38-1.88 1.83.44 2.58-2.31-1.21-2.31 1.21.44-2.58-1.88-1.83 2.6-.38z" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

/* ================================================================== entry points */

/** Home dock button (same anatomy as Home's DockBtn): ticket glyph + "Pass" + claimable badge. */
export function SeasonDockBtn({ onClick }: { onClick: () => void }) {
  const s = useStrings(SEASON_STRINGS);
  const q = useSeason();
  const n = q.ready.length;
  return (
    <motion.button className={`h5-dockbtn ssn-dock ${n ? 'hot' : ''}`} onClick={() => { sfx.tap(); onClick(); }} whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }}
      aria-label={n ? `${s.title} · ${s.toast.claim(n)}` : s.title}>
      <span className="di" aria-hidden><PassIcon /></span>
      <span className="dl">{s.dock}</span>
      {n > 0 ? <span className="db ssn-dockbadge">{n}</span> : q.view?.me ? <span className="db ssn-docktier">{q.view.me.tier}</span> : null}
    </motion.button>
  );
}

/** Profile → "me" tab: medallion, tier, star bar, ready count. */
export function SeasonProfileCard({ onOpen }: { onOpen: () => void }) {
  const app = useApp();
  const s = useStrings(SEASON_STRINGS);
  const q = useSeason();
  const v = q.view;
  if (!v) return null;
  const pr = tierProgress(v.me?.stars ?? 0, v.cfg);
  const name = s.seasonNames[v.cfg.id] ?? v.cfg.name;
  return (
    <button className={`ssn-pcard ${q.ready.length ? 'hot' : ''}`} onClick={() => { sfx.tap(); onOpen(); }}>
      <Medallion tier={v.me ? pr.tier : 1} pct={v.me ? pr.pct : 0} size={52} glow={q.ready.length > 0} />
      <span className="ssn-pctx">
        <b>{s.title}{v.premium && <i className="ssn-crown" aria-hidden>♛</i>}</b>
        <small>{s.kicker(Number(v.cfg.id.replace(/\D/g, '')) || 1, name)}{app.session && v.me ? ` · ${s.profile.sub(pr.tier)}` : ''}</small>
        <span className="ssn-pbar" aria-hidden><i style={{ width: `${(v.me ? pr.pct : 0) * 100}%` }} /></span>
      </span>
      {q.ready.length > 0 ? <em className="ssn-pready">{s.profile.ready(q.ready.length)}</em> : <span className="ssn-pgo" aria-hidden>›</span>}
    </button>
  );
}

/**
 * "Tier N reached" ribbon. Mounted once in App: after a game (games_played / achievements / BM change) it re-reads
 * season_state() and celebrates a new tier.
 */
export function SeasonToast({ onOpen, muted = false }: { onOpen: () => void; muted?: boolean }) {
  const app = useApp();
  const s = useStrings(SEASON_STRINGS);
  const q = useSeason();
  const prof = app.profile as (typeof app.profile & { achievements?: string[] }) | null;
  const key = `${prof?.games_played ?? -1}|${prof?.achievements?.length ?? -1}|${prof?.bm ?? -1}`;
  const refresh = q.refresh;
  useEffect(() => {
    if (!app.session || !prof) return;
    const t = setTimeout(() => { void refresh(); }, 1600);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  // back from another tab / app (a game on another device, a quest claimed elsewhere)
  useEffect(() => {
    if (!app.session) return;
    const f = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [app.session, refresh]);
  // on the pass itself the hero celebrates the new tier — no ribbon on top of it
  const toast = muted ? null : q.toast;
  useEffect(() => { if (muted && q.toast) dismissTierToast(); }, [muted, q.toast]);
  useEffect(() => {
    if (!toast) return;
    sfx.fanfare();
    const t = setTimeout(dismissTierToast, 5600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className="ssn-toastwrap" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="ssn-toast" initial={{ y: -90, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -70, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
            <Medallion tier={toast.tier} pct={1} size={46} glow />
            <span className="ssn-toasttx"><b className="serif">{s.toast.tier(toast.tier)}</b><small>{s.toast.claim(toast.ready)}</small></span>
            <button className="btn acc sm" onClick={() => { dismissTierToast(); onOpen(); }}>{s.toast.open}</button>
            <button className="ssn-toastx" onClick={dismissTierToast} aria-label="×">×</button>
            <span className="ssn-toastsheen" aria-hidden />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
