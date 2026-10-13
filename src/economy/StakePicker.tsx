import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/pick';
import { ECO_STRINGS } from '../i18n/economy';
import { fmtBm } from '../shop/catalog';
import { sfx, buzz } from '../sound';
import { STAKE_DAILY_GAMES } from './config';
import type { ActiveStake } from './api';
import { useStakes } from './useEconomy';
import { clearSavedStakeGame } from '../screens/savedGame';
import '../styles/economy.css';

/**
 * High-stakes picker for the home quick-start.
 *   <StakePicker onStart={stake => startStakeGame(stake)} onResume={…} onAuth={…} />
 * `onStart` gets the server's stake row once the entry is paid — start a LocalGame with STAKE_TABLE settings and
 * `markStakeGame(newGame(...), stake)`. `onResume` (optional) resumes the saved stake game `resumeStakeId`: it is only
 * offered while that very stake is the open one on the server. A saved game of a stake that was settled, forfeited,
 * abandoned or has expired is dropped instead (it must never settle — or show the pot of — another stake).
 */
export function StakePicker({ onStart, onResume, resumeStakeId = null, onAuth, compact = false }: {
  onStart: (stake: ActiveStake) => void; onResume?: () => void; resumeStakeId?: number | null; onAuth?: () => void; compact?: boolean;
}) {
  const E = useStrings(ECO_STRINGS);
  const st = useStakes();
  const live = st.active && !st.active.expired ? st.active : null;
  const canResume = !!onResume && resumeStakeId != null && live?.id === resumeStakeId;
  useEffect(() => {
    if (st.ready && resumeStakeId != null && live?.id !== resumeStakeId) clearSavedStakeGame(resumeStakeId);
  }, [st.ready, resumeStakeId, live?.id]);
  // until the player picks: the Private Room once it is unlocked, otherwise the Salon (never preselect a locked tier)
  const [picked, setSel] = useState<1 | 2 | 3 | null>(null);
  const sel: 1 | 2 | 3 = picked ?? (st.tiers.some(t => t.tier === 2 && !t.locked) ? 2 : 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [askForfeit, setAskForfeit] = useState(false);
  const tier = st.tiers.find(t => t.tier === sel) ?? st.tiers[0];
  const limit = st.today.games >= STAKE_DAILY_GAMES;

  const sit = async () => {
    if (!st.signedIn) { onAuth?.(); return; }
    if (busy || tier.locked || !tier.affordable || limit) return;
    setBusy(true); setErr(null); sfx.tap(); buzz(12);
    const r = await st.start(tier.tier);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error === 'funds' ? E.err.funds(fmtBm(r.need ?? 0)) : r.error === 'level' ? E.err.level(r.need ?? tier.minLevel) : r.error === 'limit' ? E.err.limit : E.err.network);
      buzz(30); return;
    }
    sfx.coin();
    onStart(r.stake);
  };

  return (
    <div className={`stakepick ${compact ? 'compact' : ''}`}>
      <div className="sphead">
        <span className="spchips" aria-hidden><i /><i /><i /></span>
        <div><b className="serif">{E.stakes.title}</b><small>{E.stakes.sub}</small></div>
      </div>

      <AnimatePresence initial={false}>
        {live && (
          <motion.div className="spactive" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <span className="spdot" />
            <span className="sptxt"><b>{E.stakes.active}</b><em>{E.stakes.tiers[live.tier - 1]} · {E.stakes.pot} {fmtBm(live.pot)} BM</em></span>
            {canResume && <button className="btn acc sm" onClick={onResume}>{E.stakes.resume}</button>}
            {!askForfeit
              ? <button className="btn ghost sm" onClick={() => setAskForfeit(true)}>{E.stakes.forfeit}</button>
              : <button className="btn danger sm" onClick={() => { setAskForfeit(false); void st.forfeit(); }}>{E.stakes.forfeitConfirm}</button>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sptiers" role="radiogroup" aria-label={E.stakes.pick}>
        {st.tiers.map(t => (
          <button key={t.tier} role="radio" aria-checked={sel === t.tier} className={`sptier tier${t.tier} ${sel === t.tier ? 'on' : ''} ${t.locked ? 'locked' : ''}`}
            onClick={() => { setSel(t.tier); setErr(null); sfx.tap(); }}>
            {sel === t.tier && <motion.span layoutId="sptierpick" className="sptierring" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
            <span className="spstack" aria-hidden>{Array.from({ length: t.tier + 1 }, (_, i) => <i key={i} style={{ bottom: i * 4 }} />)}</span>
            <small>{E.stakes.tiers[t.tier - 1]}</small>
            <b className="serif">{fmtBm(t.entry)}</b>
            <em>{E.stakes.pot} {fmtBm(t.pot)}</em>
            {t.locked && <span className="splock"><i className="splockic" />{E.stakes.level(t.minLevel)}</span>}
          </button>
        ))}
      </div>

      <button className="btn acc big spgo" onClick={sit} disabled={busy || (st.signedIn && (tier.locked || !tier.affordable || limit))}>
        {busy ? E.stakes.starting
          : tier.locked ? E.stakes.locked(tier.minLevel)
          : st.signedIn && !tier.affordable ? E.stakes.funds
          : st.signedIn && limit ? E.err.limit
          : E.stakes.sit(`${fmtBm(tier.entry)} BM`)}
      </button>
      {err && <div className="sperr">{err}</div>}
      {!compact && (
        <ul className="sprules">
          {E.stakes.rules.map(r => <li key={r}>{r}</li>)}
          <li className="spmeta">{E.stakes.today(st.today.games, STAKE_DAILY_GAMES)}{st.shields > 0 ? ` · ${E.stakes.shield(st.shields)}` : ''}{st.luckyActive ? ` · ${E.stakes.lucky}` : ''}</li>
        </ul>
      )}
    </div>
  );
}

/**
 * Small HUD chip for a running stake match (place it over the table, e.g. top-centre).
 *   {stake.isStake && <StakeHud pot={stake.active?.pot} shield={stake.armed} shielded={stake.shielded} />}
 */
export function StakeHud({ pot, shield, shielded }: { pot?: number; shield?: boolean; shielded?: boolean }) {
  const E = useStrings(ECO_STRINGS);
  if (!pot) return null;
  return (
    <motion.div className="stakehud" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <span className="spchips mini" aria-hidden><i /><i /></span>
      <span>{E.stakes.pot} <b className="serif">{fmtBm(pot)}</b></span>
      {(shield || shielded) && <span className={`shud ${shielded ? 'used' : ''}`} title={E.boosts.shield.name}>⛨</span>}
    </motion.div>
  );
}
