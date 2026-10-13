import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { QUEST_STRINGS, type QuestStrings } from '../i18n/journey';
import { useQuests } from '../campaign/questStore';
import { isReady, type QuestRow } from '../campaign/quests';
import { QuestBar, QuestGlyph, useCountdown } from '../campaign/QuestTracker';
import { syncAppProfile, useProgress } from '../progress/useProgress';
import { fmtBm } from '../shop/catalog';
import { buzz, sfx } from '../sound';
import { CoinBurst } from './Rewards';
import { QuestToasts } from '../campaign/QuestToasts';
import '../styles/journey.css';

/* ================================================================== pieces */

/** Claret wax seal button: press it to claim. Breaks in two on success. */
function WaxSeal({ label, busy, onClaim }: { label: string; busy: boolean; onClaim: () => Promise<boolean> }) {
  const [broken, setBroken] = useState(false);
  return (
    <motion.button className={`wax ${broken ? 'broken' : ''}`} disabled={busy || broken} whileHover={{ rotate: -4, scale: 1.04 }} whileTap={{ scale: 0.9 }}
      onClick={async () => { sfx.stamp(); buzz(20); if (await onClaim()) { setBroken(true); sfx.coin(); } }} aria-label={label}>
      <svg viewBox="0 0 80 80" aria-hidden>
        <defs>
          <radialGradient id="wax-g" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stopColor="#ec6a7d" /><stop offset="0.45" stopColor="#b02239" /><stop offset="1" stopColor="#5a0b19" /></radialGradient>
        </defs>
        <g className="half l"><path d="M40 4C30 3 23 8 16 11C9 15 5 23 5 31C4 39 2 46 6 53C10 61 16 68 24 72C30 75 35 77 40 76Z" fill="url(#wax-g)" /></g>
        <g className="half r"><path d="M40 4C49 3 57 6 63 11C70 16 75 23 76 31C77 39 79 47 75 54C71 62 65 69 57 73C51 76 45 77 40 76Z" fill="url(#wax-g)" /></g>
        <circle cx="40" cy="40" r="23" fill="none" stroke="#3d0611" strokeOpacity="0.55" strokeWidth="2.5" />
        <circle cx="40" cy="40" r="23" fill="none" stroke="#ff9aa8" strokeOpacity="0.25" strokeWidth="1" transform="translate(-0.8 -0.8)" />
        <text x="40" y="49" textAnchor="middle" className="wsuit">♠</text>
      </svg>
      <span className="wlbl">{busy ? '…' : label}</span>
      {broken && <CoinBurst n={12} spread={80} />}
    </motion.button>
  );
}

function QuestCard({ r, s, i, canSwap, busy, local, onClaim, onSwap }: {
  r: QuestRow; s: QuestStrings; i: number; canSwap: boolean; busy: string | null; local: boolean;
  onClaim: (id: string) => Promise<boolean>; onSwap: (id: string) => void;
}) {
  const ready = isReady(r);
  return (
    <motion.li layout className={`qcard ${ready ? 'ready' : ''} ${r.claimed ? 'claimed' : ''}`}
      initial={{ opacity: 0, y: 18, rotateX: -12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ delay: 0.06 * i, type: 'spring', stiffness: 170, damping: 20 }}>
      <span className="qsheen" aria-hidden />
      <QuestGlyph metric={r.metric} />
      <span className="qtx">
        <b className="serif">{s.names[r.id] ?? r.id}</b>
        <span className="qdesc">{s.desc[r.metric]?.(r.goal) ?? ''}</span>
        <span className="qprog"><QuestBar v={r.progress} max={r.goal} /><span className="qn">{r.progress}<small>/{r.goal}</small></span></span>
        <span className="qrw"><span><i className="coin" />{fmtBm(r.bm)}</span><span className="xp">{r.xp} XP</span></span>
      </span>
      <span className="qact">
        {r.claimed ? <span className="qstamp">{s.claimed}</span>
          : ready && !local ? <WaxSeal label={s.claim} busy={busy === r.id} onClaim={() => onClaim(r.id)} />
          : ready ? <span className="qstamp ready">{s.ready}</span>
          : canSwap ? <button className="qswap" disabled={!!busy} onClick={() => onSwap(r.id)} title={s.swap}><span aria-hidden>⇄</span>{s.swap}</button>
          : null}
      </span>
    </motion.li>
  );
}

function Chest({ n, max, claimed, can, busy, s, onOpen }: { n: number; max: number; claimed: boolean; can: boolean; busy: boolean; s: QuestStrings; onOpen: () => void }) {
  const [burst, setBurst] = useState(0);
  return (
    <div className={`qchest ${can ? 'can' : ''} ${claimed ? 'open' : ''}`}>
      <div className="qchest-art" aria-hidden>
        <svg viewBox="0 0 120 96">
          <defs>
            <linearGradient id="ch-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2416" /><stop offset="1" stopColor="#170d07" /></linearGradient>
            <linearGradient id="ch-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset=".35" stopColor="#d9b25c" /><stop offset=".7" stopColor="#8a6420" /><stop offset="1" stopColor="#e9c977" /></linearGradient>
          </defs>
          <ellipse cx="60" cy="90" rx="46" ry="5" fill="#000" opacity=".45" />
          <rect x="14" y="44" width="92" height="44" rx="5" fill="url(#ch-wood)" stroke="url(#ch-brass)" strokeWidth="2.5" />
          <rect x="28" y="44" width="7" height="44" fill="url(#ch-brass)" /><rect x="85" y="44" width="7" height="44" fill="url(#ch-brass)" />
          <g className="lid">
            <path d="M14 46V34C14 18 34 10 60 10C86 10 106 18 106 34V46Z" fill="url(#ch-wood)" stroke="url(#ch-brass)" strokeWidth="2.5" />
            <path d="M28 46V22M92 46V22" stroke="url(#ch-brass)" strokeWidth="7" />
          </g>
          <rect x="52" y="40" width="16" height="20" rx="3" fill="url(#ch-brass)" />
          <circle cx="60" cy="49" r="2.6" fill="#2b1d06" /><rect x="59" y="50" width="2" height="5" fill="#2b1d06" />
        </svg>
        {burst > 0 && <CoinBurst key={burst} n={22} spread={150} />}
      </div>
      <div className="qchest-tx">
        <b className="serif">{s.chest.title}</b>
        <small>{s.chest.sub(n, max)}</small>
        <span className="qnotches" aria-hidden>{Array.from({ length: max }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>
      </div>
      <div className="qchest-act">
        {claimed ? <span className="qstamp">{s.chest.opened}</span>
          : <button className={`btn ${can ? 'acc' : 'ghost'} sm`} disabled={!can || busy} onClick={() => { onOpen(); setBurst(b => b + 1); }}>{can ? s.chest.open : s.chest.locked}</button>}
      </div>
    </div>
  );
}

/* ================================================================== the quest log */

export function QuestsScreen({ onClose, onAuth }: { onClose: () => void; onAuth?: () => void }) {
  const app = useApp();
  const s = useStrings(QUEST_STRINGS);
  const q = useQuests();
  const p = useProgress();
  const b = q.board;
  const daily = useCountdown(b?.nextDaily, s);
  const weekly = useCountdown(b?.nextWeekly, s);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void q.refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!err) return; const t = setTimeout(() => setErr(null), 3200); return () => clearTimeout(t); }, [err]);

  const fail = (e?: string) => setErr(e === 'funds' ? s.errors.funds : e === 'network' ? s.errors.network : e === 'ready' ? s.errors.ready : s.errors.generic);
  const sync = (bm?: number) => { if (typeof bm === 'number') void syncAppProfile(app, { bm }); };
  const claim = async (id: string) => { const r = await q.claim(id); if (!r.ok) { fail(r.error); return false; } sync(r.bm); return true; };
  const swap = async (id: string) => { sfx.whoosh(0.5); const r = await q.reroll(id); if (!r.ok) fail(r.error); else sync(r.bm); };
  const openChest = async () => { sfx.fanfare(); const r = await q.claimChest(); if (!r.ok) fail(r.error); else sync(r.bm); };

  const weeklyClaimed = b?.weekly.filter(r => r.claimed).length ?? 0;
  const motes = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ l: (i * 61) % 100, t: (i * 37) % 100, d: (i * 1.3) % 9, s: 1.5 + (i % 4) })), []);

  return (
    <motion.div className="qlog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={s.title}>
      <div className="qlog-bg" aria-hidden>
        <i className="beam" />
        {motes.map((m, i) => <i key={i} className="mote" style={{ left: `${m.l}%`, top: `${m.t}%`, width: m.s, height: m.s, animationDelay: `-${m.d}s` }} />)}
      </div>
      <header className="qlog-head">
        <button className="jback" onClick={onClose} aria-label={s.title}><span aria-hidden>‹</span></button>
        <div className="qlog-title">
          <h1 className="serif">{s.title}</h1>
          <span>{s.sub}</span>
        </div>
        {p.signedIn && <span className="sbal qbal"><i className="coin" /><b>{fmtBm(p.bm)}</b></span>}
      </header>

      <div className="qlog-body">
        <div className="qlog-wrap">
          {b?.local && (
            <motion.div className="qguest" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div><b>{s.guest}</b><span>{s.guestSub}</span></div>
              {onAuth && <button className="btn acc sm" onClick={onAuth}>{s.signIn}</button>}
            </motion.div>
          )}
          {!b ? <div className="qloading"><span className="spinner" /></div> : (
            <div className="qcols">
              <section className="qsec">
                <div className="qsec-head">
                  <h2 className="serif">{s.daily}</h2>
                  <span className="qtimer"><i aria-hidden>◷</i>{s.resetsIn(daily)}</span>
                </div>
                {!b.local && <div className="qhint">{b.rerollAvailable ? s.swapHint(b.rerollCost) : s.swapUsed}</div>}
                <ol className="qlist">
                  <AnimatePresence initial={false}>
                    {b.daily.map((r, i) => (
                      <QuestCard key={r.id} r={r} s={s} i={i} local={b.local} busy={q.busy}
                        canSwap={!b.local && b.rerollAvailable && !r.claimed && !isReady(r)} onClaim={claim} onSwap={swap} />
                    ))}
                  </AnimatePresence>
                </ol>
              </section>
              <section className="qsec">
                <div className="qsec-head">
                  <h2 className="serif">{s.weekly}</h2>
                  <span className="qtimer"><i aria-hidden>◷</i>{s.resetsIn(weekly)}</span>
                </div>
                <Chest n={weeklyClaimed} max={b.weekly.length || 5} claimed={b.chest.claimed} s={s}
                  can={!b.local && !b.chest.claimed && b.weekly.length > 0 && weeklyClaimed === b.weekly.length} busy={q.busy === 'chest'} onOpen={openChest} />
                <ol className="qlist">
                  {b.weekly.map((r, i) => (
                    <QuestCard key={r.id} r={r} s={s} i={i + 3} local={b.local} busy={q.busy} canSwap={false} onClaim={claim} onSwap={swap} />
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>{err && <motion.div className="qerr2" role="alert" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{err}</motion.div>}</AnimatePresence>
      <QuestToasts />
    </motion.div>
  );
}

export { QuestTracker } from '../campaign/QuestTracker';
