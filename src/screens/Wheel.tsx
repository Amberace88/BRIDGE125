import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStrings } from '../i18n/pick';
import { ECO_STRINGS, type EcoStrings } from '../i18n/economy';
import { ACH_STRINGS } from '../i18n/achievements';
import { useEconomy } from '../economy/useEconomy';
import {
  BOOSTS, COLLECTIONS, JACKPOT_IDX, PRESTIGE_LEVEL, SPIN_PRICES, WHEEL_PRIZES, WHEEL_TOTAL, collectionCost, relicId,
  type BoostKind, type PrizeKind, type WheelPrize,
} from '../economy/config';
import type { SpinResult } from '../economy/api';
import { useProgress } from '../progress/useProgress';
import { fmtBm } from '../shop/catalog';
import { CoinBurst, Ticker } from './Rewards';
import { track } from '../analytics';
import { sfx, buzz } from '../sound';
import '../styles/economy.css';

export type VaultTab = 'wheel' | 'boosts' | 'collections' | 'prestige';
const TABS: VaultTab[] = ['wheel', 'boosts', 'collections', 'prestige'];

const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
};
const hm = (ms: number) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };

function errText(E: EcoStrings, r: { error: string; need?: number }) {
  switch (r.error) {
    case 'funds': return E.err.funds(fmtBm(r.need ?? 0));
    case 'limit': return E.err.limit;
    case 'used': return E.err.used;
    case 'level': return E.err.level(r.need ?? 0);
    case 'network': return E.err.network;
    case 'max': return E.err.max;
    case 'owned': return E.err.owned;
    default: return E.err.generic;
  }
}

/* ================================================================== Vault overlay */

/**
 * The Vault — full-screen overlay with the Fortune Wheel, Boosts, Collections and Prestige.
 *   <VaultScreen onClose={…} onAuth={…} initialTab="wheel" />
 */
export function VaultScreen({ onClose, onAuth, initialTab = 'wheel' }: { onClose: () => void; onAuth?: () => void; initialTab?: VaultTab }) {
  const E = useStrings(ECO_STRINGS);
  const eco = useEconomy();
  const p = useProgress();
  const [tab, setTab] = useState<VaultTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { track('vault_view', { tab: initialTab }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose, busy]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2600); return () => clearTimeout(t); }, [note]);
  const bm = eco.state?.bm ?? p.bm;

  return (
    <motion.div className="vault" role="dialog" aria-modal="true" aria-label={E.vault.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="vaultbg" aria-hidden />
      <header className="vhead">
        <div className="vrow">
          <div className="vtitle"><h1 className="serif">{E.vault.title}</h1><span>{E.vault.sub}</span></div>
          <div className="vbal" title="Bridge Money"><span className="scoin3d"><i /></span><b><Ticker to={bm} /></b></div>
          <div className="vshards" title={E.vault.shards}><i className="shardi" /><b>{eco.shards}</b></div>
          <button className="iconbtn" onClick={onClose} aria-label={E.vault.close} disabled={busy}>×</button>
        </div>
        <nav className="vtabs">
          {TABS.map(t => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => { if (!busy) { setTab(t); sfx.tap(); } }}>
              {tab === t && <motion.span layoutId="vtabpill" className="vtabpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{E.vault.tabs[t]}</span>
            </button>
          ))}
        </nav>
      </header>
      <div className="vbody">
        <div className="vwrap">
          {!eco.signedIn && (
            <div className="vguest"><p>{E.vault.signIn}</p>{onAuth && <button className="btn acc" onClick={onAuth}>{E.vault.signInBtn}</button>}</div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {tab === 'wheel' && <WheelTab E={E} setBusy={setBusy} flash={setNote} />}
              {tab === 'boosts' && <BoostsTab E={E} flash={setNote} />}
              {tab === 'collections' && <CollectionsTab E={E} flash={setNote} />}
              {tab === 'prestige' && <PrestigeTab E={E} flash={setNote} />}
            </motion.div>
          </AnimatePresence>
          <p className="vfoot">{E.vault.noCash}</p>
        </div>
      </div>
      <AnimatePresence>
        {note && <motion.div className="achnote" initial={{ y: 20, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 10, opacity: 0, x: '-50%' }}>{note}</motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================== the wheel */

const SEG = 360 / WHEEL_PRIZES.length;
const pct = (w: number) => { const v = (w / WHEEL_TOTAL) * 100; return v < 1 ? `${v.toFixed(1)} %` : `${Number.isInteger(v) ? v : v.toFixed(1)} %`; };

function prizeLabel(E: EcoStrings, p: Pick<WheelPrize, 'kind' | 'amount'>): string {
  switch (p.kind) {
    case 'bm': return E.wheel.prize.bm(fmtBm(p.amount));
    case 'xp': return E.wheel.prize.xp(fmtBm(p.amount));
    case 'shards': return E.wheel.prize.shards(p.amount);
    case 'boost_xp': return E.wheel.prize.boost_xp;
    case 'boost_luck': return E.wheel.prize.boost_luck;
    default: return E.wheel.prize.shield;
  }
}

/** Two short lines engraved on a segment. */
function segFace(p: WheelPrize): [string, string] {
  switch (p.kind) {
    case 'bm': return [p.amount >= 1000 ? `${p.amount / 1000}K` : String(p.amount), p.idx === JACKPOT_IDX ? 'JACKPOT' : 'BM'];
    case 'xp': return [String(p.amount), 'XP'];
    case 'shards': return [`×${p.amount}`, '◆'];
    case 'boost_xp': return ['XP×2', '1 h'];
    case 'boost_luck': return ['+10%', '24 h'];
    default: return ['⛨', '−2'];
  }
}

const SEG_FILL = (p: WheelPrize) => (p.idx === JACKPOT_IDX ? 'url(#wjack)' : p.kind === 'bm' ? 'url(#wgreen)' : p.kind === 'xp' ? 'url(#wink)' : p.kind === 'shards' ? 'url(#wviolet)' : 'url(#wclaret)');

const arc = (i: number, r: number) => {
  const a0 = ((i * SEG - 90) * Math.PI) / 180, a1 = (((i + 1) * SEG - 90) * Math.PI) / 180;
  return `M200 200 L${200 + r * Math.cos(a0)} ${200 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${200 + r * Math.cos(a1)} ${200 + r * Math.sin(a1)} Z`;
};

function WheelFace({ rot, flap, win, spinning }: { rot: MotionValue<number>; flap: MotionValue<number>; win: number | null; spinning: boolean }) {
  const transform = useTransform(rot, r => `rotate(${r}deg)`);
  const flapT = useTransform(flap, f => `rotate(${f}deg)`);
  const bulbs = 24;
  return (
    <div className={`wheel3d ${spinning ? 'spinning' : ''}`}>
      <div className="wheeltilt">
        <svg className="wheelsvg" viewBox="0 0 400 400" aria-hidden>
          <defs>
            <radialGradient id="wgreen" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#1b5a47" /><stop offset="1" stopColor="#0a2a20" /></radialGradient>
            <radialGradient id="wink" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#1c2a33" /><stop offset="1" stopColor="#0a1116" /></radialGradient>
            <radialGradient id="wclaret" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#7a1b30" /><stop offset="1" stopColor="#3a0a15" /></radialGradient>
            <radialGradient id="wviolet" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#4d2a78" /><stop offset="1" stopColor="#1e0f33" /></radialGradient>
            <linearGradient id="wjack" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c8" /><stop offset=".45" stopColor="#e2ba54" /><stop offset="1" stopColor="#7a5917" /></linearGradient>
            <linearGradient id="wrim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset=".3" stopColor="#c9a54c" /><stop offset=".55" stopColor="#7a5917" /><stop offset=".8" stopColor="#e2bd62" /><stop offset="1" stopColor="#8c6e28" /></linearGradient>
            <radialGradient id="whub" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#fff6d8" /><stop offset=".35" stopColor="#e2bd62" /><stop offset="1" stopColor="#6b4d17" /></radialGradient>
            <radialGradient id="wshade" cx="50%" cy="50%" r="50%"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".55" /></radialGradient>
          </defs>
          {/* rim + bulbs (static) */}
          <circle cx="200" cy="200" r="197" fill="url(#wrim)" />
          <circle cx="200" cy="200" r="186" fill="#120c04" />
          {Array.from({ length: bulbs }, (_, i) => {
            const a = ((i * 360) / bulbs - 90) * Math.PI / 180;
            return <circle key={i} className="wbulb" style={{ animationDelay: `${(i % 4) * -0.18}s` }} cx={200 + 191.5 * Math.cos(a)} cy={200 + 191.5 * Math.sin(a)} r="3.4" />;
          })}
          {/* the rotating disc */}
          <motion.g style={{ transform, transformOrigin: '200px 200px' }}>
            {WHEEL_PRIZES.map(p => <path key={p.idx} d={arc(p.idx, 182)} fill={SEG_FILL(p)} className={win === p.idx ? 'wseg win' : 'wseg'} />)}
            {WHEEL_PRIZES.map(p => {
              const [a, b] = segFace(p);
              const jack = p.idx === JACKPOT_IDX;
              return (
                <g key={'t' + p.idx} transform={`rotate(${p.idx * SEG + SEG / 2} 200 200)`}>
                  <text x="200" y="64" className={`wtxt ${jack ? 'jack' : ''}`} textAnchor="middle">{a}</text>
                  <text x="200" y="86" className={`wsub ${jack ? 'jack' : ''}`} textAnchor="middle">{b}</text>
                  {p.kind === 'bm' && !jack && <circle cx="200" cy="106" r="5.5" className="wcoin" />}
                </g>
              );
            })}
            {WHEEL_PRIZES.map(p => {
              const a = ((p.idx * SEG - 90) * Math.PI) / 180;
              return (
                <g key={'s' + p.idx}>
                  <line x1="200" y1="200" x2={200 + 182 * Math.cos(a)} y2={200 + 182 * Math.sin(a)} className="wsep" />
                  <circle cx={200 + 176 * Math.cos(a)} cy={200 + 176 * Math.sin(a)} r="4.2" className="wpeg" />
                </g>
              );
            })}
            <circle cx="200" cy="200" r="182" fill="url(#wshade)" pointerEvents="none" />
          </motion.g>
          {/* hub */}
          <circle cx="200" cy="200" r="44" fill="url(#wrim)" />
          <circle cx="200" cy="200" r="37" fill="url(#whub)" />
          <circle cx="200" cy="200" r="30" fill="none" stroke="rgba(60,40,10,.35)" strokeWidth="1" />
          <text x="200" y="210" textAnchor="middle" className="whubtxt">125</text>
        </svg>
        <span className="wgloss" aria-hidden />
        {/* pointer / flapper */}
        <motion.svg className="wpointer" viewBox="0 0 60 80" style={{ transform: flapT }} aria-hidden>
          <defs><linearGradient id="wptr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6d8" /><stop offset=".4" stopColor="#e2bd62" /><stop offset="1" stopColor="#6b4d17" /></linearGradient></defs>
          <path d="M30 76 L12 26 A20 20 0 1 1 48 26 Z" fill="url(#wptr)" stroke="#4a3410" strokeWidth="1.5" />
          <circle cx="30" cy="22" r="8" fill="#a31d35" stroke="#4a3410" strokeWidth="1.5" />
          <circle cx="27.5" cy="19.5" r="2.4" fill="rgba(255,255,255,.7)" />
        </motion.svg>
      </div>
      <div className="wstand" aria-hidden><i /></div>
    </div>
  );
}

function WheelTab({ E, setBusy, flash }: { E: EcoStrings; setBusy: (b: boolean) => void; flash: (m: string) => void }) {
  const eco = useEconomy();
  const rot = useMotionValue(0);
  const flapRaw = useMotionValue(0);
  const flap = useSpring(flapRaw, { stiffness: 900, damping: 18 });
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<number | null>(null);
  const [result, setResult] = useState<Extract<SpinResult, { ok: true }> | null>(null);
  const [odds, setOdds] = useState(false);
  const lastTick = useRef(Math.floor(0 / SEG));
  const lastSound = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  // peg ticks: every time a segment border passes the pointer
  useEffect(() => rot.on('change', r => {
    const k = Math.floor(r / SEG);
    if (k === lastTick.current) return;
    lastTick.current = k;
    flapRaw.set(-24); requestAnimationFrame(() => flapRaw.set(0));
    const t = performance.now();
    if (t - lastSound.current > 55) { lastSound.current = t; sfx.flick(); }
  }), [rot, flapRaw]);

  const w = eco.wheel;
  const free = !!w?.free;
  const paidLeft = w ? w.max_paid - w.paid : SPIN_PRICES.length;
  const price = w?.next_price ?? SPIN_PRICES[0];
  const nextMs = eco.nextReset ? new Date(eco.nextReset).getTime() - now : 0;

  const spin = async () => {
    if (spinning || !eco.signedIn || !w) return;
    const paid = !free;
    if (paid && paidLeft <= 0) return;
    setSpinning(true); setBusy(true); setWin(null); setResult(null);
    sfx.whoosh(); buzz(15);
    // wind-up, then free-spin while the server decides
    const omega = 1080; // deg/s
    await animate(rot, rot.get() - 14, { duration: 0.22, ease: 'easeOut' });
    let alive = true, last = performance.now();
    const loop = (t: number) => { if (!alive) return; const dt = (t - last) / 1000; last = t; rot.set(rot.get() + omega * Math.min(dt, 0.05)); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const [r] = await Promise.all([eco.spin(paid), new Promise(res => setTimeout(res, 650))]);
    alive = false;
    if (!r.ok) {
      await animate(rot, rot.get() + 240, { duration: 1.2, ease: [0.1, 0.6, 0.2, 1] });
      setSpinning(false); setBusy(false);
      flash(errText(E, r));
      return;
    }
    // decelerate onto the prize (continuous velocity: cubic-bezier(.12,.64,.1,1) starts at ~5.33 × D/T)
    const R = rot.get();
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    const want = -(r.idx * SEG + SEG / 2 + jitter);
    const base = 1100;
    let F = R + base;
    F += (((want - F) % 360) + 360) % 360;
    const D = F - R, T = Math.min(7, Math.max(4.2, (5.33 * D) / omega));
    await animate(rot, F, { duration: T, ease: [0.12, 0.64, 0.1, 1] });
    setWin(r.idx); setResult(r);
    if (r.idx === JACKPOT_IDX) { sfx.fanfare(); buzz([40, 60, 40, 60, 80]); } else { sfx.big(); buzz([20, 40, 30]); }
    setSpinning(false); setBusy(false);
  };

  const collect = () => { if (result) eco.settleSpin(result); setResult(null); sfx.coin(); };

  return (
    <div className="wtab">
      <div className="wleft">
        <WheelFace rot={rot} flap={flap} win={win} spinning={spinning} />
      </div>
      <div className="wright">
        <h2 className="serif vh2">{E.wheel.title}</h2>
        <p className="vsub">{E.wheel.sub}</p>
        <div className="wstatus">
          {free ? <span className="wfree"><i />{E.wheel.free}</span>
            : paidLeft > 0 ? <span>{E.wheel.paidLeft(paidLeft)}</span> : <span>{E.wheel.limit}</span>}
          {!free && nextMs > 0 && <span className="wnext">{E.wheel.nextFree(hms(nextMs))}</span>}
        </div>
        <button className={`btn acc big wspin ${free ? 'free' : ''}`} onClick={spin} disabled={spinning || !eco.ready || (!free && paidLeft <= 0)}>
          {spinning ? E.wheel.spinning : free ? E.wheel.spinFree : <>{E.wheel.spinPaid(`${fmtBm(price)} BM`)}</>}
        </button>
        <div className="wladder" aria-hidden>
          {SPIN_PRICES.map((pr, i) => <span key={i} className={w && i < w.paid ? 'used' : w && i === w.paid && !free ? 'next' : ''}>{fmtBm(pr)}</span>)}
        </div>
        <button className="wodds" onClick={() => setOdds(o => !o)}>{E.wheel.odds} {odds ? '▴' : '▾'}</button>
        <AnimatePresence initial={false}>
          {odds && (
            <motion.div className="woddsbox" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <p>{E.wheel.oddsSub}</p>
              <table>
                <tbody>
                  {[...WHEEL_PRIZES].sort((a, b) => b.weight - a.weight).map(p => (
                    <tr key={p.idx} className={p.idx === JACKPOT_IDX ? 'jack' : ''}><td>{prizeLabel(E, p)}</td><td>{pct(p.weight)}</td></tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div className="wprize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={collect}>
            <motion.div className={`wprizecard k-${result.kind} ${result.idx === JACKPOT_IDX ? 'jack' : ''}`} onClick={e => e.stopPropagation()}
              initial={{ y: 60, scale: 0.7, rotateX: 40 }} animate={{ y: 0, scale: 1, rotateX: 0 }} exit={{ y: 30, scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
              {result.kind === 'bm' && <CoinBurst n={result.idx === JACKPOT_IDX ? 30 : 18} spread={result.idx === JACKPOT_IDX ? 220 : 150} />}
              <small>{result.idx === JACKPOT_IDX ? E.wheel.jackpot : E.wheel.won}</small>
              <PrizeIcon kind={result.kind} />
              <b className="serif">{prizeLabel(E, result)}</b>
              <button className="btn acc" onClick={collect}>{E.wheel.collect}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrizeIcon({ kind }: { kind: PrizeKind }) {
  if (kind === 'bm') return <span className="scoin3d big"><i /></span>;
  if (kind === 'shards') return <span className="picon"><i className="shardi big" /></span>;
  if (kind === 'xp') return <span className="picon xp">XP</span>;
  if (kind === 'boost_xp') return <span className="picon xp">×2</span>;
  if (kind === 'boost_luck') return <span className="picon luck">♣</span>;
  return <span className="picon shield">⛨</span>;
}

/* ================================================================== boosts */

const BOOST_GLYPH: Record<BoostKind, string> = { xp2: '×2', lucky: '♣', shield: '⛨' };

function BoostsTab({ E, flash }: { E: EcoStrings; flash: (m: string) => void }) {
  const eco = useEconomy();
  const [busy, setBusy] = useState<BoostKind | null>(null);
  const [pop, setPop] = useState<BoostKind | null>(null);
  const buy = async (k: BoostKind) => {
    if (busy) return;
    setBusy(k); sfx.tap();
    const r = await eco.buyBoost(k);
    setBusy(null);
    if (!r.ok) { flash(errText(E, r)); buzz(30); return; }
    setPop(k); setTimeout(() => setPop(null), 1400);
    sfx.shield(); buzz([15, 30, 15]);
  };
  return (
    <div className="vbtab">
      <h2 className="serif vh2">{E.boosts.title}</h2>
      <p className="vsub">{E.boosts.sub}</p>
      <div className="vbgrid">
        {BOOSTS.map((b, i) => {
          const left = b.kind === 'xp2' ? eco.boosts.xp2 : b.kind === 'lucky' ? eco.boosts.lucky : 0;
          const active = left > 0 || (b.kind === 'shield' && eco.shields > 0);
          const maxed = b.kind === 'shield' ? eco.shields >= b.maxCount : left > (b.maxMinutes - b.minutes) * 60_000;
          const S = E.boosts[b.kind];
          return (
            <motion.div key={b.kind} className={`vbcard k-${b.kind} ${active ? 'on' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <span className="vbglow" />
              <motion.span className="vbicon" animate={pop === b.kind ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : {}} transition={{ duration: 0.6 }}>{BOOST_GLYPH[b.kind]}</motion.span>
              <b className="serif">{S.name}</b>
              <p>{S.desc}</p>
              <span className="vbstate">
                {b.kind === 'shield' ? E.boosts.owned(eco.shields) : left > 0 ? E.boosts.active(hm(left)) : ' '}
              </span>
              {left > 0 && b.maxMinutes > 0 && <span className="vbmeter"><i style={{ width: `${Math.min(100, (left / (b.maxMinutes * 60_000)) * 100)}%` }} /></span>}
              <button className="btn acc" disabled={!eco.ready || !!busy || maxed} onClick={() => buy(b.kind)}>
                {busy === b.kind ? <span className="spinner" /> : maxed ? E.boosts.max : E.boosts.buy(`${fmtBm(b.price)} BM`)}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== collections */

function CollectionsTab({ E, flash }: { E: EcoStrings; flash: (m: string) => void }) {
  const eco = useEconomy();
  const A = useStrings(ACH_STRINGS);
  const [busy, setBusy] = useState<string | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const owned = useMemo(() => new Set(eco.relics), [eco.relics]);
  const forge = async (col: string, piece: number) => {
    if (busy) return;
    const id = relicId(col, piece);
    setBusy(id); sfx.tap();
    const r = await eco.forge(col, piece);
    setBusy(null);
    if (!r.ok) { flash(errText(E, r)); buzz(30); return; }
    setBurst(id); setTimeout(() => setBurst(null), 1300);
    sfx.stamp(); buzz([20, 30, 20]);
    if (r.completed) setTimeout(() => sfx.fanfare(), 400);
  };
  return (
    <div className="ctab">
      <h2 className="serif vh2">{E.collections.title}</h2>
      <p className="vsub">{E.collections.sub}</p>
      <div className="cgrid">
        {COLLECTIONS.map((c, ci) => {
          const n = c.costs.filter((_, i) => owned.has(relicId(c.id, i + 1))).length;
          const done = n === 4;
          return (
            <motion.section key={c.id} className={`ccard col-${c.id} ${done ? 'done' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.06 }}>
              <div className="chead">
                <b className="serif">{E.collections.names[c.id] ?? c.id}</b>
                <span>{done ? E.collections.complete : E.collections.progress(n)}</span>
              </div>
              <div className="crelics">
                {c.costs.map((cost, i) => {
                  const id = relicId(c.id, i + 1);
                  const have = owned.has(id);
                  const short = Math.max(0, cost - eco.shards);
                  return (
                    <div key={id} className={`crelic ${have ? 'have' : ''}`}>
                      <motion.span className="crcard" animate={burst === id ? { rotateY: [180, 0], scale: [0.8, 1.08, 1] } : {}} transition={{ duration: 0.7 }}>
                        <i className="serif">{c.glyphs[i]}</i>
                      </motion.span>
                      {have ? <small className="crok">✓ {E.collections.forged}</small> : (
                        <button className="crforge" disabled={!eco.ready || !!busy || short > 0} onClick={() => forge(c.id, i + 1)} title={short > 0 ? E.collections.need(short) : undefined}>
                          {busy === id ? <span className="spinner" /> : <><i className="shardi" />{cost}</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="creward">
                <small>{E.collections.reward}</small>
                <b>✦ {A.items[c.item] ?? ACH_STRINGS.en.items[c.item] ?? c.item}</b>
                <em><i className="shardi" />{collectionCost(c)}</em>
              </div>
              {done && <span className="cdone serif">{E.collections.complete}</span>}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== prestige */

function PrestigeTab({ E, flash }: { E: EcoStrings; flash: (m: string) => void }) {
  const eco = useEconomy();
  const p = useProgress();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const level = p.level;
  const can = level >= PRESTIGE_LEVEL;
  const stars = eco.prestigeLevel;
  const go = async () => {
    setBusy(true);
    const r = await eco.prestige();
    setBusy(false); setConfirm(false);
    if (!r.ok) { flash(errText(E, r)); return; }
    setDone(r.prestige); sfx.fanfare(); buzz([40, 60, 40, 60]);
    void p.refresh();
  };
  return (
    <div className="ptab">
      <div className={`pemblem ${can ? 'ready' : ''}`}>
        <span className="prays" />
        <motion.span className="pstar" animate={done ? { rotate: [0, 360], scale: [1, 1.3, 1] } : {}} transition={{ duration: 1.2 }}>✵</motion.span>
        {stars > 0 && <b className="serif">{stars}</b>}
      </div>
      <h2 className="serif vh2">{done ? E.prestige.done(done) : E.prestige.title}</h2>
      <p className="vsub">{E.prestige.sub}</p>
      <div className="plevel">
        <div className="plbar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (level / PRESTIGE_LEVEL) * 100)}%` }} transition={{ duration: 1 }} /></div>
        <span>{Math.min(level, PRESTIGE_LEVEL)} / {PRESTIGE_LEVEL}</span>
      </div>
      <ul className="pperks">{E.prestige.perks.map(x => <li key={x}>{x}</li>)}</ul>
      <p className="pnote">{E.prestige.keeps} · {E.prestige.resets}</p>
      {!confirm ? (
        <button className="btn acc big pgo" disabled={!can || !eco.ready} onClick={() => setConfirm(true)}>{can ? E.prestige.go : E.prestige.need(PRESTIGE_LEVEL)}</button>
      ) : (
        <div className="pconfirm">
          <p>{E.prestige.confirm}</p>
          <div><button className="btn ghost" onClick={() => setConfirm(false)} disabled={busy}>{E.prestige.no}</button><button className="btn acc" onClick={go} disabled={busy}>{busy ? <span className="spinner" /> : E.prestige.yes}</button></div>
        </div>
      )}
    </div>
  );
}
