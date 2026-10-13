import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { useApp } from '../store';
import { pick, useStrings } from '../i18n/pick';
import { SEASON_STRINGS, type SeasonStrings } from '../i18n/season';
import { ECO_STRINGS } from '../i18n/economy';
import { COS_STRINGS } from '../cosmetics/i18n';
import { cosName } from '../cosmetics/Badges';
import { ItemThumb } from '../cosmetics/Previews';
import { DiamondIcon } from '../social/GiftArt';
import { fmtBm } from '../shop/catalog';
import { buzz, sfx } from '../sound';
import { CoinBurst } from './Rewards';
import { Sheet } from './Sheets';
import { STAR_RULES, seasonPhase, seasonWeek, skipCost, tierProgress, trackTotals, type Reward, type TierRewards, type Track } from '../season/data';
import { seasonItem } from '../season/cosmetics';
import { bundledView, useSeason, type SeasonView } from '../season/store';
import type { Granted } from '../season/api';
import { Medallion, RewardArt, fmtLeft, rewardLabel, useNow } from '../season/parts';

type CardState = 'ready' | 'claimed' | 'locked' | 'plock' | 'wait';
const seasonNo = (id: string) => Number(id.replace(/\D/g, '')) || 1;

/* ================================================================== small pieces */

const LockSvg = ({ gold = false }: { gold?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={gold ? 'gold' : ''}>
    <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor" />
    <circle cx="12" cy="15" r="1.6" fill="rgba(0,0,0,.55)" /><path d="M12 15.6v2.3" stroke="rgba(0,0,0,.55)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

function RewardCard({ r, track, tier, st, s, lang, busy, onClick }: {
  r: Reward; track: Track; tier: number; st: CardState; s: SeasonStrings; lang: string; busy: boolean; onClick: () => void;
}) {
  const C = pick(COS_STRINGS, lang);
  const it = r.kind === 'item' ? seasonItem(r.item) : undefined;
  const label = rewardLabel(r, s, lang);
  const aria = `${s.tierN(tier)} · ${track === 'premium' ? s.premium : s.free} · ${label}`;
  return (
    <motion.button className={`ssc ${track} is-${st} ${it ? 'is-item' : ''} ${it?.rarity === 'legendary' ? 'legend' : ''}`} onClick={onClick} disabled={busy}
      whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} aria-label={aria} data-tier={tier} data-track={track}>
      <span className="ssc-in">
        <span className="ssc-deco" aria-hidden />
        {it && <span className="ssc-kind">{C.kind[it.kind]}</span>}
        <span className="ssc-art"><RewardArt r={r} size={it ? 40 : 46} /></span>
        <span className="ssc-lbl">{label}</span>
        {st === 'claimed' && <span className="ssc-done" aria-hidden><i>✓</i></span>}
        {st === 'locked' && <span className="ssc-lock" aria-hidden><LockSvg /></span>}
        {st === 'plock' && <span className="ssc-plock" aria-hidden><LockSvg gold /></span>}
        {st === 'ready' && <span className="ssc-claim">{busy ? '…' : s.claim}</span>}
        <span className="ssc-sheen" aria-hidden />
      </span>
      {st === 'ready' && <span className="ssc-glow" aria-hidden />}
    </motion.button>
  );
}

/* ================================================================== the reveal (claim animation) */

interface Reveal { items: Granted[]; key: number }

function SpinLine({ g, lang }: { g: Granted; lang: string }) {
  const E = pick(ECO_STRINGS, lang).wheel.prize;
  if (!g.spins?.length) return null;
  return (
    <span className="ssr-spins">
      {g.spins.map((x, i) => (
        <motion.em key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.25 }}>
          {x.kind === 'bm' ? E.bm(fmtBm(x.amount)) : x.kind === 'xp' ? E.xp(fmtBm(x.amount)) : x.kind === 'shards' ? E.shards(x.amount) : E[x.kind]}
        </motion.em>
      ))}
    </span>
  );
}

function RevealLayer({ rv, s, lang, onDone }: { rv: Reveal; s: SeasonStrings; lang: string; onDone: () => void }) {
  const one = rv.items.length === 1 ? rv.items[0] : null;
  const premium = rv.items.some(g => g.track === 'premium');
  const money = rv.items.some(g => g.kind === 'bm' || g.kind === 'dm');
  const item = rv.items.some(g => g.kind === 'item');
  useEffect(() => {
    sfx.fanfare(); buzz([20, 40, 30]);
    const a = setTimeout(() => (item ? sfx.prism() : sfx.coin()), 380);
    const b = money ? setTimeout(() => sfx.coin(), 760) : undefined;
    return () => { clearTimeout(a); if (b) clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div className={`ssr ${premium ? 'prem' : ''}`} role="dialog" aria-modal="true" aria-label={s.reveal.title} onClick={onDone}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <span className="ssr-rays" aria-hidden />
      <span className="ssr-glow" aria-hidden />
      <div className="ssr-stage" onClick={e => e.stopPropagation()}>
        <motion.small className="ssr-kick" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {one ? s.reveal.tierTrack(one.tier, one.track === 'premium' ? s.premium : s.free) : s.title}
        </motion.small>
        {one ? (
          <motion.div className={`ssr-card ${one.track}`} initial={{ scale: 0.3, rotateY: 200, opacity: 0 }} animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.1 }}>
            <span className="ssr-cardin">
              <span className="ssc-deco" aria-hidden />
              <RewardArt r={one} size={one.kind === 'item' ? 86 : 104} />
              <b className="serif">{rewardLabel(one, s, lang)}</b>
              {one.kind === 'item' && one.item && <small>{pick(COS_STRINGS, lang).kind[seasonItem(one.item)?.kind ?? 'title']}</small>}
              <SpinLine g={one} lang={lang} />
            </span>
            <span className="ssc-sheen" aria-hidden />
          </motion.div>
        ) : (
          <div className="ssr-grid">
            {rv.items.map((g, i) => (
              <motion.div key={`${g.tier}${g.track}`} className={`ssr-mini ${g.track}`} initial={{ scale: 0.2, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.15 + Math.min(i, 16) * 0.07 }}>
                <RewardArt r={g} size={g.kind === 'item' ? 30 : 36} />
                <span>{rewardLabel(g, s, lang)}</span>
                {g.spins?.length ? <em>{g.spins.map(x => (x.kind === 'bm' ? `+${fmtBm(x.amount)}` : x.kind === 'xp' ? `+${x.amount} XP` : '✦')).join(' ')}</em> : null}
              </motion.div>
            ))}
          </div>
        )}
        <motion.h2 className="serif ssr-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          {!one ? s.reveal.all(rv.items.length) : premium ? s.reveal.premiumTitle : s.reveal.title}
        </motion.h2>
        <motion.button className="btn acc ssr-go" onClick={onDone} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>{s.reveal.collect}</motion.button>
        {money && <CoinBurst n={26} spread={170} className="ssr-burst" />}
      </div>
    </motion.div>
  );
}

/* ================================================================== sheets */

function UnlockSheet({ v, s, lang, busy, diamonds, onBuy, onDiamonds, onClose }: {
  v: SeasonView; s: SeasonStrings; lang: string; busy: boolean; diamonds: number;
  onBuy: () => Promise<boolean>; onDiamonds?: () => void; onClose: () => void;
}) {
  const tot = useMemo(() => trackTotals('premium', v.rewards), [v.rewards]);
  const price = v.cfg.premiumPrice;
  const [done, setDone] = useState(false);
  const short = Math.max(0, price - diamonds);
  const name = s.seasonNames[v.cfg.id] ?? v.cfg.name;
  const buy = async () => { if (await onBuy()) { setDone(true); setTimeout(onClose, 1700); } };
  return (
    <Sheet onClose={onClose}>
      <div className="ssu">
        <div className="ssu-hero" aria-hidden>
          <span className="ssu-rays" />
          <motion.span className="ssu-ticket" initial={{ rotate: -8, y: 18, opacity: 0 }} animate={{ rotate: -4, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
            <i className="ssu-notch l" /><i className="ssu-notch r" />
            <span className="ssu-tk-kick">{s.kicker(seasonNo(v.cfg.id), name)}</span>
            <b className="serif">PREMIUM</b>
            <span className="ssu-tk-stars">★ ★ ★</span>
          </motion.span>
          {done && <CoinBurst n={24} spread={160} />}
        </div>
        <h2 className="serif ssu-title">{done ? s.sheet.done : s.sheet.title}</h2>
        <p className="ssu-sub">{done ? s.sheet.doneSub : s.unlockSub}</p>
        {!done && (
          <>
            <div className="ssu-label">{s.sheet.exclusive}</div>
            <div className="ssu-items">
              {tot.items.map((id, i) => {
                const it = seasonItem(id);
                return (
                  <motion.span key={id} className={`ssu-item ${it?.rarity ?? ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    <span className="ssu-th"><ItemThumb id={id} slot={it?.kind ?? 'title'} /></span>
                    <small>{cosName(lang, id)}</small>
                  </motion.span>
                );
              })}
            </div>
            <div className="ssu-label">{s.sheet.plus}</div>
            <div className="ssu-plus">
              <span><i className="coin" />{s.reward.bm(fmtBm(tot.bm))}</span>
              <span><DiamondIcon size={15} />{s.reward.dm(fmtBm(tot.dm))}</span>
              <span>✦ {s.reward.shards(tot.shards)}</span>
              <span>◎ {s.reward.spin(tot.spin)}</span>
            </div>
            <p className="ssu-retro">{s.sheet.retro}</p>
            {v.me?.privileged ? (
              <div className="ssu-note">👑 {s.premiumFree}</div>
            ) : (
              <div className="ssu-buy">
                <span className="ssu-bal">{s.sheet.balance(fmtBm(diamonds))}</span>
                {short > 0 ? (
                  <>
                    <span className="ssu-need">{s.sheet.need(fmtBm(short))}</span>
                    {onDiamonds && <button className="btn acc" onClick={onDiamonds}><DiamondIcon size={18} />{s.sheet.getDiamonds}</button>}
                  </>
                ) : (
                  <button className="btn acc big ssu-go" disabled={busy} onClick={buy}>{busy ? <span className="spinner" /> : s.sheet.buy(fmtBm(price))}</button>
                )}
              </div>
            )}
            <p className="ssu-legal">{s.sheet.legal}</p>
            <button className="btn ghost ssu-later" onClick={onClose}>{s.sheet.later}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function SkipSheet({ v, s, busy, tier, diamonds, onSkip, onDiamonds, onClose }: {
  v: SeasonView; s: SeasonStrings; busy: boolean; tier: number; diamonds: number;
  onSkip: (n: number) => Promise<boolean>; onDiamonds?: () => void; onClose: () => void;
}) {
  const left = v.cfg.tiers - tier;
  const opts = [1, 5, 10].filter(n => n <= Math.max(1, left));
  const [n, setN] = useState(1);
  const cost = v.me?.privileged ? 0 : skipCost(n, tier, v.cfg);
  const short = Math.max(0, cost - diamonds);
  return (
    <Sheet onClose={onClose}>
      <div className="ssu sss">
        <h2 className="serif ssu-title">{s.skipTitle}</h2>
        <p className="ssu-sub">{s.skipSub}</p>
        <div className="sss-row">
          <Medallion tier={tier} pct={1} size={64} />
          <span className="sss-arrow" aria-hidden>→</span>
          <Medallion tier={Math.min(v.cfg.tiers, tier + n)} pct={0} size={80} glow />
        </div>
        <div className="seg sss-seg" role="radiogroup">
          {opts.map(o => (
            <button key={o} role="radio" aria-checked={n === o} className={n === o ? 'on' : ''} onClick={() => { setN(o); sfx.tap(); }}>
              {n === o && <motion.div layoutId="sss-pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span>{s.skipN(o)}</span>
            </button>
          ))}
        </div>
        <div className="ssu-buy">
          <span className="ssu-bal">{s.sheet.balance(fmtBm(diamonds))}</span>
          {short > 0 ? (
            <>
              <span className="ssu-need">{s.sheet.need(fmtBm(short))}</span>
              {onDiamonds && <button className="btn acc" onClick={onDiamonds}><DiamondIcon size={18} />{s.sheet.getDiamonds}</button>}
            </>
          ) : (
            <button className="btn acc big ssu-go" disabled={busy} onClick={async () => { if (await onSkip(n)) onClose(); }}>
              {busy ? <span className="spinner" /> : s.skipBtn(n, fmtBm(cost))}
            </button>
          )}
        </div>
        <button className="btn ghost ssu-later" onClick={onClose}>{s.sheet.later}</button>
      </div>
    </Sheet>
  );
}

/* ================================================================== the track */

function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: RPointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: RPointerEvent) => {
    const d = drag.current, el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) { d.moved = true; el.classList.add('dragging'); }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const end = () => {
    const el = ref.current, d = drag.current;
    drag.current = null;
    if (el && d?.moved) {
      el.classList.remove('dragging');
      const block = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      el.addEventListener('click', block, { capture: true, once: true });
      setTimeout(() => el.removeEventListener('click', block, { capture: true }), 0);
    }
  };
  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerLeave: end } };
}

/* ================================================================== screen */

export function SeasonScreen({ onClose, onAuth, onDiamonds }: { onClose: () => void; onAuth?: () => void; onDiamonds?: () => void }) {
  const app = useApp();
  const s = useStrings(SEASON_STRINGS);
  const q = useSeason();
  const v = q.view ?? bundledView();
  const now = useNow() + v.skew;
  const phase = seasonPhase(v.cfg, now);
  const me = v.me;
  const signedIn = q.signedIn;
  const pr = tierProgress(me?.stars ?? 0, v.cfg);
  /** guests preview tier 1 (claiming asks them to sign in) */
  const tier = me ? pr.tier : 1;
  const open = phase === 'live' || phase === 'grace';
  const name = s.seasonNames[v.cfg.id] ?? v.cfg.name;
  const wk = seasonWeek(v.cfg, now);
  const diamonds = me?.diamonds ?? (app.profile as { diamonds?: number } | null)?.diamonds ?? 0;
  const claimedF = useMemo(() => new Set(me?.claimed.free ?? []), [me]);
  const claimedP = useMemo(() => new Set(me?.claimed.premium ?? []), [me]);

  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [sheet, setSheet] = useState<'unlock' | 'skip' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  useEffect(() => { void q.refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!err) return; const t = setTimeout(() => setErr(null), 3000); return () => clearTimeout(t); }, [err]);

  const fail = (e?: string) => setErr(
    e === 'funds' ? s.errors.funds : e === 'network' ? s.errors.network : e === 'locked' ? s.errors.locked : e === 'premium' ? s.errors.premium
      : e === 'none' ? s.errors.none : e === 'max' ? s.errors.max : e === 'banned' ? s.errors.banned : s.errors.generic);

  const stateOf = (t: number, track: Track): CardState => {
    const claimed = (track === 'free' ? claimedF : claimedP).has(t);
    if (claimed) return 'claimed';
    if (track === 'premium' && !v.premium) return t <= tier ? 'plock' : 'locked';
    if (t > tier) return 'locked';
    return open && signedIn ? 'ready' : 'wait';
  };

  const onCard = async (t: number, track: Track, st: CardState) => {
    if (!signedIn) { sfx.tap(); onAuth?.(); return; }
    if (st === 'plock' || (st === 'locked' && track === 'premium' && !v.premium)) { sfx.tap(); setSheet('unlock'); return; }
    if (st === 'locked') { buzz(10); setErr(s.reach(t)); return; }
    if (st === 'wait') { setErr(phase === 'upcoming' ? s.startsIn(fmtLeft(Date.parse(v.cfg.startsAt) - now, s.units)) : s.errors.none); return; }
    if (st !== 'ready') return;
    sfx.stamp(); buzz(18);
    const r = await q.claim(t, track);
    if (!r.ok) { fail(r.error); return; }
    if (r.reward) setReveal({ items: [r.reward], key: Date.now() });
  };
  const claimAll = async () => {
    sfx.stamp(); buzz(18);
    const r = await q.claimAll();
    if (!r.ok) { fail(r.error); return; }
    if (r.rewards.length) setReveal({ items: r.rewards, key: Date.now() });
  };
  const buy = async () => {
    const r = await q.unlock();
    if (!r.ok) { fail(r.error); return false; }
    sfx.big(); setTimeout(() => sfx.fanfare(), 250); buzz([30, 50, 40]);
    setJustUnlocked(true); setTimeout(() => setJustUnlocked(false), 2600);
    return true;
  };
  const skip = async (n: number) => {
    const r = await q.skip(n);
    if (!r.ok) { fail(r.error); return false; }
    sfx.whoosh(0.8); setTimeout(() => sfx.good(), 300);
    return true;
  };

  /* ---------------- track geometry + scrolling */
  const { ref: trackRef, handlers } = useDragScroll();
  const { scrollX } = useScroll({ container: trackRef });
  const bgX = useTransform(scrollX, x => -x * 0.22);
  const bgX2 = useTransform(scrollX, x => -x * 0.08);
  const focusTier = (t: number, smooth = true) => {
    const el = trackRef.current;
    const col = el?.querySelector<HTMLElement>(`[data-col="${t}"]`);
    if (!el || !col) return;
    el.scrollTo({ left: col.offsetLeft + col.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || q.loading) return;
    focused.current = true;
    const t0 = Math.max(1, q.ready[0]?.tier ?? tier);
    focusTier(t0, false);
    const t = setTimeout(() => focusTier(Math.max(1, q.ready[0]?.tier ?? tier)), 420);
    return () => clearTimeout(t);
  }, [q.loading]); // eslint-disable-line react-hooks/exhaustive-deps
  const page = (dir: number) => { const el = trackRef.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' }); };

  const fill = me ? Math.min(v.cfg.tiers - 1, pr.tier - 1 + (pr.maxed ? 0 : pr.pct)) : 0;
  const motes = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ l: (i * 67) % 100, t: (i * 41) % 100, d: (i * 1.7) % 11, s: 1.5 + (i % 4) })), []);
  const endsLeft = phase === 'upcoming' ? s.startsIn(fmtLeft(Date.parse(v.cfg.startsAt) - now, s.units))
    : phase === 'live' ? s.endsIn(fmtLeft(Date.parse(v.cfg.endsAt) - now, s.units))
    : phase === 'grace' ? s.claimUntil(fmtLeft(Date.parse(v.cfg.endsAt) + v.cfg.graceDays * 864e5 - now, s.units)) : s.over;
  const canSkip = signedIn && !!me && phase === 'live' && pr.tier < v.cfg.tiers;
  const busyKey = q.busy;

  return (
    <motion.div className="ssn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={s.title}>
      <div className="ssn-bg" aria-hidden>
        <i className="ssn-sun" /><i className="ssn-beam" /><i className="ssn-felt" />
        {motes.map((m, i) => <i key={i} className="mote" style={{ left: `${m.l}%`, top: `${m.t}%`, width: m.s, height: m.s, animationDelay: `-${m.d}s` }} />)}
      </div>

      <header className="ssn-head">
        <button className="ssn-back" onClick={() => { sfx.tap(); onClose(); }} aria-label={s.back}><span aria-hidden>‹</span></button>
        <div className="ssn-title">
          <small>{s.kicker(seasonNo(v.cfg.id), name)}</small>
          <h1 className="serif">{s.title}</h1>
        </div>
        {signedIn && (
          <button className="ssn-dm" onClick={onDiamonds} aria-label="Diamonds"><DiamondIcon size={18} /><b>{fmtBm(diamonds)}</b></button>
        )}
      </header>

      <div className="ssn-body">
        <div className="ssn-wrap">
          <div className="ssn-top">
          {/* ------------------------------------------------ hero */}
          <motion.section className="ssn-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 18 }}>
            <button className="ssn-medal" onClick={() => focusTier(Math.max(1, tier))} aria-label={s.tierN(Math.max(1, tier))}>
              <motion.span key={tier} style={{ display: 'grid' }} initial={tier > 1 ? { scale: 0.7, rotate: -20 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
                <Medallion tier={Math.max(1, tier)} pct={me ? pr.pct : 0} size={104} glow={q.ready.length > 0} />
              </motion.span>
            </button>
            <div className="ssn-info">
              <div className="ssn-tierline"><small>{s.tierShort}</small><b className="serif">{Math.max(1, tier)}</b><span>/ {v.cfg.tiers}</span>
                {v.premium && <em className="ssn-prem">♛ {s.premiumActive}</em>}
              </div>
              <div className="ssn-starbar" aria-hidden>
                <motion.i initial={{ width: 0 }} animate={{ width: `${(me ? pr.pct : 0) * 100}%` }} transition={{ duration: 1.1, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }} />
                {Array.from({ length: 9 }, (_, i) => <b key={i} style={{ left: `${(i + 1) * 10}%` }} />)}
              </div>
              <div className="ssn-starnums">
                <span className="star">★</span><b>{me ? (pr.maxed ? fmtBm(me.stars) : pr.into) : 0}</b>{!pr.maxed && <small>/ {pr.need}</small>}
                <span className="ssn-next">{me && pr.maxed ? s.maxed : s.next(Math.min(v.cfg.tiers, Math.max(1, tier) + 1))}</span>
              </div>
              <div className="ssn-chips">
                <span className={`ssn-chip ${phase}`}><i aria-hidden>◷</i>{endsLeft}</span>
                {phase === 'live' && <span className="ssn-chip">{s.week(wk.week, wk.weeks)}</span>}
              </div>
            </div>
          </motion.section>

          {/* ------------------------------------------------ premium + skip */}
          <div className="ssn-ctas">
            {!v.premium && phase !== 'over' && phase !== 'grace' && (
              <motion.button className="ssn-unlock" onClick={() => { sfx.tap(); if (!signedIn) onAuth?.(); else setSheet('unlock'); }} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <span className="ssn-ut" aria-hidden><b>♛</b></span>
                <span className="ssn-utx"><b>{s.unlock}</b><small>{s.unlockSub}</small></span>
                <span className="ssn-uprice"><DiamondIcon size={16} />{fmtBm(v.cfg.premiumPrice)}</span>
                <span className="ssn-usheen" aria-hidden />
              </motion.button>
            )}
            {canSkip && (
              <button className="ssn-skip" onClick={() => { sfx.tap(); setSheet('skip'); }}>
                <span aria-hidden>⤼</span>{s.skip}<em><DiamondIcon size={13} />{fmtBm(me?.privileged ? 0 : v.cfg.skipPrice)}</em>
              </button>
            )}
          </div>
          </div>

          {!signedIn && (
            <motion.div className="ssn-guest" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div><b>{s.guest}</b><span>{s.guestSub}</span></div>
              {onAuth && <button className="btn acc sm" onClick={onAuth}>{s.signIn}</button>}
            </motion.div>
          )}
          {q.failed && <div className="ssn-offline">{s.offline}</div>}
        </div>

        {/* ------------------------------------------------ the reward track */}
        <section className={`ssn-trackwrap ${justUnlocked ? 'unlocking' : ''} ${v.premium ? 'has-prem' : ''}`}>
          <motion.div className="ssn-trackbg" style={{ x: bgX }} aria-hidden />
          <motion.div className="ssn-trackbg2" style={{ x: bgX2 }} aria-hidden />
          <button className="ssn-page prev" onClick={() => page(-1)} aria-label="‹"><span aria-hidden>‹</span></button>
          <button className="ssn-page next" onClick={() => page(1)} aria-label="›"><span aria-hidden>›</span></button>
          <div className="ssn-track" ref={trackRef} {...handlers} style={{ ['--fill' as string]: fill } as CSSProperties}>
            <div className="ssn-lanes" aria-hidden>
              <span className="ssn-lane prem"><i>{s.premium}</i>{!v.premium && <LockSvg gold />}</span>
              <span className="ssn-lane node" />
              <span className="ssn-lane free"><i>{s.free}</i></span>
            </div>
            <div className="ssn-cols">
              <span className="ssn-rail" aria-hidden><i /></span>
              {v.rewards.map((row: TierRewards, i) => {
                const t = row.tier;
                const stP = stateOf(t, 'premium'), stF = stateOf(t, 'free');
                const mile = t % 5 === 0;
                return (
                  <motion.div key={t} className={`ssn-col ${t <= tier ? 'reached' : ''} ${t === tier ? 'current' : ''} ${mile ? 'mile' : ''} ${t === v.cfg.tiers ? 'final' : ''}`} data-col={t}
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, type: 'spring', stiffness: 160, damping: 20 }}>
                    <RewardCard r={row.premium} track="premium" tier={t} st={stP} s={s} lang={app.lang} busy={busyKey === `${t}:premium` || busyKey === 'all'} onClick={() => onCard(t, 'premium', stP)} />
                    <span className="ssn-node"><b>{t}</b></span>
                    <RewardCard r={row.free} track="free" tier={t} st={stF} s={s} lang={app.lang} busy={busyKey === `${t}:free` || busyKey === 'all'} onClick={() => onCard(t, 'free', stF)} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="ssn-wrap">
          {/* ------------------------------------------------ how to earn */}
          <section className="ssn-how">
            <h2 className="serif">{s.how.title}</h2>
            <div className="ssn-rules">
              {([
                ['♛', s.how.win, STAR_RULES.win], ['♣', s.how.loss, STAR_RULES.loss], ['☀', s.how.daily, STAR_RULES.questDaily],
                ['☾', s.how.weekly, STAR_RULES.questWeekly], ['▣', s.how.chest, STAR_RULES.chest], ['✦', s.how.challenge, STAR_RULES.challenge],
                ['🏅', s.how.medals, `${STAR_RULES.achievement.bronze}–${STAR_RULES.achievement.platinum}`],
              ] as [string, string, number | string][]).map(([ic, l, n], i) => (
                <motion.div key={l} className="ssn-rule" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <span className="ic" aria-hidden>{ic}</span><span className="l">{l}</span><b>+{n} <i>★</i></b>
                </motion.div>
              ))}
            </div>
            <p className="ssn-note">{s.how.note}</p>
          </section>

          {me?.privileged && (
            <section className="ssn-god">
              <b>👑 {s.god.title}</b>
              <button className="btn ghost sm" disabled={!!busyKey} onClick={() => void q.god('stars', 100)}>+100 ★</button>
              <button className="btn ghost sm" disabled={!!busyKey} onClick={() => void q.god('stars', 1000)}>+1000 ★</button>
              <button className="btn ghost sm" disabled={!!busyKey} onClick={() => void q.god('reset')}>{s.god.reset}</button>
            </section>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ claim all */}
      <AnimatePresence>
        {signedIn && q.ready.length > 1 && !reveal && (
          <motion.div className="ssn-claimbar" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <button className="btn acc big" disabled={!!busyKey} onClick={claimAll}>
              {busyKey === 'all' ? <span className="spinner" /> : <><span aria-hidden>★</span>{s.claimAll(q.ready.length)}</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{reveal && <RevealLayer key={reveal.key} rv={reveal} s={s} lang={app.lang} onDone={() => setReveal(null)} />}</AnimatePresence>
      <AnimatePresence>
        {sheet === 'unlock' && (
          <UnlockSheet key="u" v={v} s={s} lang={app.lang} busy={busyKey === 'unlock'} diamonds={diamonds} onBuy={buy}
            onDiamonds={onDiamonds ? () => { setSheet(null); onDiamonds(); } : undefined} onClose={() => setSheet(null)} />
        )}
        {sheet === 'skip' && me && (
          <SkipSheet key="k" v={v} s={s} busy={busyKey === 'skip'} tier={pr.tier} diamonds={diamonds} onSkip={skip}
            onDiamonds={onDiamonds ? () => { setSheet(null); onDiamonds(); } : undefined} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>{err && <motion.div className="ssn-err" role="alert" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{err}</motion.div>}</AnimatePresence>
    </motion.div>
  );
}
