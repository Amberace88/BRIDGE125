import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS, type ArenaStrings } from '../../i18n/arena';
import { LB } from '../../i18n/leaderboard';
import { GAMES_STRINGS } from '../../i18n/games';
import { AvatarImg } from '../../components/AvatarImg';
import { RoleBadge } from '../../components/RoleBadge';
import { AvatarFrame } from '../../cosmetics/AvatarFrame';
import { TitleBadge } from '../../cosmetics/Badges';
import { Sheet } from '../../screens/Sheets';
import { pushProfile } from '../../progress/store';
import { sfx, buzz } from '../../sound';
import { gameById } from '../registry';
import { clock, fmtNum, textOf } from '../hub/order';
import { patchArena, tournamentBoardRpc, tournamentClaimRpc, type ArenaState, type TourRow, type TourTier, type TourUnclaimed } from './api';
import { Countdown } from './TournamentBanner';
import { TrophyIcon } from './icons';
import '../../styles/leaderboard.css';
import '../result.css';

const MEDAL = ['#F3DE9C', '#D9DEE6', '#E0A878'];
const TIER_GLYPH: Record<TourTier, string> = { gold: '♔', silver: '◆', bronze: '◆', top10: '✦' };

const valueOf = (t: ArenaState, r: Pick<TourRow, 'points' | 'best_seconds' | 'eligible' | 'played'>, s: ArenaStrings) => ({
  main: fmtNum(r.points),
  sub: `${s.tour.points[t.metric]}${r.best_seconds != null ? ` · ${clock(r.best_seconds)}` : ''}`,
});

/** Standings of this week's tournament + the prize table + last week's podium. */
export function TournamentSheet({ t, onClose, onAuth, onPlay }: { t: ArenaState; onClose: () => void; onAuth: () => void; onPlay?: (game: string) => void }) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const lvl = useStrings(LB).lvl;
  const gs = useStrings(GAMES_STRINGS);
  const m = gameById(t.game);
  const E = m?.Emblem;
  const [rows, setRows] = useState<TourRow[] | null>(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const req = useRef(0);

  const load = useCallback(async () => {
    const id = ++req.current;
    setLoading(true); setErr(false);
    try { const r = await tournamentBoardRpc(t.week, 50); if (id === req.current) setRows(r); }
    catch { if (id === req.current) setErr(true); }
    finally { if (id === req.current) setLoading(false); }
  }, [t.week]);
  useEffect(() => { void load(); }, [load]);

  const shown = rows?.filter(r => r.rank <= 50) ?? [];
  const me = rows?.find(r => r.is_me) ?? null;
  const top = [shown.find(r => r.rank === 2), shown.find(r => r.rank === 1), shown.find(r => r.rank === 3)];
  const rest = shown.filter(r => r.rank > 3);
  const title = m ? textOf(m.title, app.lang) : t.game;
  const lastM = t.last ? gameById(t.last.game) : undefined;

  return (
    <Sheet onClose={onClose}>
      <div className="lb2 gb ga-ts">
        <div className="lb2head">
          <span className="gb-emblem ga-ts-emblem" aria-hidden>{E ? <E size={30} /> : <TrophyIcon />}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="ga-kick sm"><TrophyIcon />{s.tour.kicker}</span>
            <h2 className="serif">{title}</h2>
          </div>
          <button className="lb2ref" onClick={() => { sfx.tap(); void load(); }} aria-label={s.tour.retry} disabled={loading}>
            <motion.svg viewBox="0 0 24 24" width="18" height="18" animate={{ rotate: loading ? 360 : 0 }} transition={loading ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0.3 }} aria-hidden>
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </button>
        </div>

        <Countdown ends={Date.parse(t.ends_at)} s={s} compact />

        <div className="ga-prizes" aria-label={s.tour.prizes}>
          {t.prizes.map((p, i) => (
            <motion.div key={p.tier} className={`ga-prize ${p.tier}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 260, damping: 22 }}>
              <span className="g" aria-hidden>{TIER_GLYPH[p.tier]}</span>
              <small>{s.tour.tiers[p.tier]}</small>
              <b><i className="coin" />{fmtNum(p.bm)}</b>
              <em>{p.items.length ? s.tour.prizeLine : s.tour.items.badge}</em>
            </motion.div>
          ))}
        </div>
        <p className="ga-rules">{s.tour.rules(title)} <b>{s.tour.qualify}</b></p>

        {!rows && !err && (
          <div aria-busy="true" className="lb2list">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 58, animationDelay: `${i * 0.08}s` }} />)}</div>
        )}
        {err && !rows && (
          <div className="lb2state err">
            <div className="lb2icon" aria-hidden>⚠</div>
            <p>{s.tour.error}</p>
            <button className="btn ghost sm" onClick={() => void load()}>↻ {s.tour.retry}</button>
          </div>
        )}
        {rows && shown.length === 0 && (
          <div className="lb2state"><div className="lb2icon" aria-hidden>🏆</div><p>{s.tour.empty}</p></div>
        )}
        {rows && shown.length > 0 && (
          <>
            <div className="lb2pod">
              {top.map((r, i) => r ? <Podium key={r.rank} r={r} i={i} t={t} s={s} /> : <div key={'e' + i} />)}
            </div>
            {rest.length > 0 && <div className="lb2list">{rest.map((r, i) => <Row key={r.rank + r.username} r={r} i={i} t={t} s={s} lvl={lvl} />)}</div>}
            {me && me.rank > 50 && (
              <>
                <div className="lb2gap" aria-hidden><i /><i /><i /></div>
                <div className="lb2list"><Row r={me} i={0} t={t} s={s} lvl={lvl} /></div>
              </>
            )}
          </>
        )}

        {t.last && t.last.podium.length > 0 && (
          <div className="ga-last">
            <span className="ga-kick sm">{s.tour.lastWeek} · {lastM ? textOf(lastM.title, app.lang) : t.last.game}</span>
            <div className="ga-last-row">
              {t.last.podium.map(p => (
                <span key={p.rank} className={`ga-last-p ${p.tier}`}>
                  <AvatarImg url={p.avatar_url} emoji={p.avatar} name={p.username} size={30} />
                  <b>{p.username}</b><i aria-hidden>{TIER_GLYPH[p.tier]}</i>
                </span>
              ))}
            </div>
          </div>
        )}

        {!app.session && app.online && (
          <div className="lb2guest">
            <div className="lb2gicon" aria-hidden>♠</div>
            <div style={{ flex: 1, minWidth: 0 }}><b>{s.tour.guest}</b></div>
            <button className="btn acc sm" onClick={onAuth}>{s.tour.signIn}</button>
          </div>
        )}
        <div className="ga-ts-cta">
          {onPlay && m && !m.hidden && <button className="btn acc" onClick={() => { sfx.tap(); onPlay(t.game); }}>{s.tour.play} →</button>}
          <button className="btn ghost" onClick={onClose}>{gs.close}</button>
        </div>
      </div>
    </Sheet>
  );
}

function Podium({ r, i, t, s }: { r: TourRow; i: number; t: ArenaState; s: ArenaStrings }) {
  const delay = [0.12, 0, 0.24][i];
  const v = valueOf(t, r, s);
  return (
    <motion.div className={`lb2spot p${r.rank} ${r.is_me ? 'me' : ''}`} style={{ ['--medal' as string]: MEDAL[r.rank - 1] }}
      initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, type: 'spring', stiffness: 200, damping: 17 }}>
      {r.rank === 1 && <motion.span className="lb2crown" aria-hidden initial={{ y: -14, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 12 }}>♛</motion.span>}
      <div className="lb2face">
        <AvatarFrame id={r.frame} size={r.rank === 1 ? 66 : 54}><AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={r.rank === 1 ? 66 : 54} /></AvatarFrame>
        <i className="lb2medal">{r.rank}</i>
      </div>
      <div className="lb2pname">{r.username}{r.is_me && <em> · {s.tour.you}</em>}</div>
      {r.role && r.role !== 'player' && <RoleBadge role={r.role} size="xs" />}
      <div className="lb2pval"><b>{v.main}</b></div>
      <div className="lb2psub">{v.sub}</div>
      <div className="lb2plinth"><span /></div>
    </motion.div>
  );
}

function Row({ r, i, t, s, lvl }: { r: TourRow; i: number; t: ArenaState; s: ArenaStrings; lvl: (n: number) => string }) {
  const v = valueOf(t, r, s);
  return (
    <motion.div className={`lb2row ${r.is_me ? 'me' : ''} ${r.eligible ? '' : 'ga-dim'}`}
      initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + Math.min(i, 14) * 0.035, type: 'spring', stiffness: 300, damping: 26 }}>
      <span className="lb2rk">{r.rank}</span>
      <AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={38} />
      <div className="lb2who">
        <div className="lb2nm"><span>{r.username}</span>{r.is_me && <em>{s.tour.you}</em>}{r.role && r.role !== 'player' && <RoleBadge role={r.role} size="xs" />}{r.title && <TitleBadge id={r.title} size="sm" />}</div>
        <div className="lb2sub"><span className="lb2lv">{lvl(r.level)}</span><span>{v.sub}</span></div>
      </div>
      <b className="lb2v">{v.main}</b>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ the prize ceremony (tournament_claim) */

export function ClaimReveal({ prize, onClose }: { prize: TourUnclaimed; onClose: () => void }) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const m = gameById(prize.game);
  const title = m ? textOf(m.title, app.lang) : prize.game;
  const frame = prize.items.find(i => i.includes('_fr_'));
  const ttl = prize.items.find(i => i.includes('_t_'));

  const collect = async () => {
    setPhase('busy');
    const r = await tournamentClaimRpc();
    if (r?.ok) {
      sfx.fanfare(); buzz([20, 50, 20]);
      pushProfile({ bm: r.bm, owned: r.owned });
      patchArena({ unclaimed: [] });
      setPhase('done');
    } else if (r?.error === 'none') { patchArena({ unclaimed: [] }); setPhase('done'); }
    else setPhase('error');
  };

  return (
    <>
      <motion.div className="grs-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={phase === 'busy' ? undefined : onClose} />
      <div className="grs-pos">
        <motion.div className={`ga-claim ${prize.tier}`} role="dialog" aria-modal="true" aria-label={s.tour.claim.title}
          initial={{ y: 60, opacity: 0, scale: 0.9, rotateX: 20 }} animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
          <i className="ga-claim-rays" aria-hidden />
          <motion.span className="ga-claim-cup" aria-hidden initial={{ scale: 0.2, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 11, delay: 0.15 }}>
            <TrophyIcon /><em>{prize.rank}</em>
          </motion.span>
          <span className="ga-kick">{s.tour.claim.title}</span>
          <h2 className="serif">{s.tour.tiers[prize.tier]}</h2>
          <p>{s.tour.claim.sub(title)}</p>
          <div className="ga-claim-loot">
            <motion.span className="ga-loot bm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <i className="coin" /><b>+{fmtNum(prize.bm)}</b><small>BM</small>
            </motion.span>
            {frame && (
              <motion.span className="ga-loot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <AvatarFrame id={frame} size={40}><span className="ga-loot-av">♠</span></AvatarFrame><small>{s.tour.items.frame}</small>
              </motion.span>
            )}
            {ttl && (
              <motion.span className="ga-loot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                <TitleBadge id={ttl} /><small>{ttl === 'tg_t_champion' ? s.tour.items.champion : s.tour.items.podium}</small>
              </motion.span>
            )}
            {prize.tier === 'top10' && (
              <motion.span className="ga-loot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <span className="ga-badge10" aria-hidden>10%</span><small>{s.tour.items.badge}</small>
              </motion.span>
            )}
          </div>
          {phase === 'done' ? (
            <>
              <motion.p className="ga-claim-ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ {prize.items.length ? `${s.tour.claim.done} · ${s.tour.claim.equip}` : s.tour.claim.done}</motion.p>
              <button className="btn ghost" onClick={onClose}>OK</button>
            </>
          ) : (
            <motion.button className="btn acc ga-claim-btn" disabled={phase === 'busy'} onClick={() => void collect()} whileTap={{ scale: 0.96 }}>
              {phase === 'busy' ? s.tour.claim.collecting : phase === 'error' ? `↻ ${s.tour.retry}` : s.tour.claim.collect}
            </motion.button>
          )}
        </motion.div>
      </div>
    </>
  );
}
