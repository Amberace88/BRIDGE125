import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS } from '../../i18n/arena';
import { AvatarImg } from '../../components/AvatarImg';
import { AvatarFrame } from '../../cosmetics/AvatarFrame';
import { TitleBadge } from '../../cosmetics/Badges';
import { sfx } from '../../sound';
import { track } from '../../analytics';
import { gameById } from '../registry';
import { textOf } from '../hub/order';
import { SwordsIcon } from '../tournament/icons';
import { challengeGetRpc, type Challenge } from './api';
import { CODE_RE, resultMain, resultSub } from './compare';
import { GameSession } from './GameSession';
import { ChallengeSheet } from './ChallengeSheet';
import '../hub/games.css';
import '../hub/arena.css';
import '../result.css';
import './challenge.css';

/**
 * /c/<code> — a friend's challenge. Readable without an account: who sent it, the game, the score to beat, whether it
 * is the very same deal, who has taken it on. "Accept & play" runs the game in challenge mode (GameSession 'accept');
 * the result is compared — and stored on the challenge board when signed in.
 */
export function ChallengeLanding({ code, onExit, onGames, onAuth }: { code: string; onExit: () => void; onGames: () => void; onAuth: () => void }) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const c = s.challenge;
  const [ch, setCh] = useState<Challenge | null | 'loading' | 'offline'>('loading');
  const [playing, setPlaying] = useState(false);
  const [share, setShare] = useState(false);
  const valid = CODE_RE.test(code);

  const load = useCallback(async () => {
    if (!valid) { setCh(null); return; }
    if (!app.online) { setCh('offline'); return; }
    const r = await challengeGetRpc(code);
    setCh(r ? r : 'offline');
  }, [code, valid, app.online]);
  useEffect(() => { void load(); }, [load, app.session?.user.id]);
  useEffect(() => { track('challenge_open', { code: valid ? code : 'bad' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const motes = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ l: (i * 61) % 100, t: (i * 37) % 100, d: (i * 1.7) % 11, s: 1.5 + (i % 4) })), []);
  const data = ch && ch !== 'loading' && ch !== 'offline' && ch.ok ? ch : null;
  const m = data ? gameById(data.game) : undefined;

  if (playing && data && m) {
    return (
      <div className="gs-stage">
        <GameSession m={m} mode="accept" challenge={data} onExit={() => { setPlaying(false); void load(); }} onAuth={onAuth} />
      </div>
    );
  }

  const E = m?.Emblem;
  const title = m ? textOf(m.title, app.lang) : data?.game ?? '';
  const state = ch === 'loading' ? 'loading' : ch === 'offline' ? 'offline' : !data ? 'unknown' : data.expired ? 'expired' : !m ? 'nothere' : 'ok';

  return (
    <motion.div className="gh gc-land" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="gh-bg" aria-hidden>
        <i className="beam" />
        {motes.map((x, i) => <i key={i} className="mote" style={{ left: `${x.l}%`, top: `${x.t}%`, width: x.s, height: x.s, animationDelay: `-${x.d}s` }} />)}
      </div>
      <header className="gh-head">
        <motion.button className="gh-back" onClick={() => { sfx.tap(); onExit(); }} aria-label="‹" whileTap={{ scale: 0.9 }}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.button>
        <div className="gh-title"><span className="gh-kicker">Bridge 125</span><h1 className="serif">{c.landing.kicker}</h1></div>
      </header>

      <div className="gh-body">
        <div className="gh-wrap gc-land-wrap">
          <AnimatePresence mode="wait">
            {state === 'loading' && (
              <motion.div key="l" className="gc-land-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="gc-shuffle" aria-hidden>{[0, 1, 2].map(i => <motion.i key={i} animate={{ x: [0, (i - 1) * 26, 0], rotate: [0, (i - 1) * 12, 0] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.08 }} />)}</div>
                <p>{c.landing.loading}</p>
              </motion.div>
            )}
            {(state === 'unknown' || state === 'expired' || state === 'offline' || state === 'nothere') && (
              <motion.div key="x" className="gc-land-state" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <span className="gc-land-ic" aria-hidden><SwordsIcon /></span>
                <p>{state === 'expired' ? c.landing.expired : state === 'offline' ? c.landing.offline : state === 'nothere' ? c.landing.notHere : c.landing.unknown}</p>
                <button className="btn acc" onClick={onGames}>{c.landing.home} →</button>
              </motion.div>
            )}
            {state === 'ok' && data && E && (
              <motion.div key="ok" className="gc-card-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.section className="gc-hero" initial={{ y: 30, opacity: 0, rotateX: -14 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 18 }}>
                  <div className="gc-hero-felt" aria-hidden><i /></div>
                  <div className="gc-from">
                    <AvatarFrame id={data.creator.frame} size={56}><AvatarImg url={data.creator.avatar_url} emoji={data.creator.avatar} name={data.creator.username} size={56} /></AvatarFrame>
                    <div>
                      <span className="ga-kick sm"><SwordsIcon />{c.landing.kicker}</span>
                      <b className="serif">{data.mine ? c.landing.mine : c.landing.from(data.creator.username)}</b>
                      {data.creator.title && <TitleBadge id={data.creator.title} size="sm" />}
                    </div>
                  </div>
                  <div className="gc-game">
                    <span className="gc-game-medal" aria-hidden><E size={46} /></span>
                    <h2 className="serif">{title}</h2>
                  </div>
                  <div className="gc-beat">
                    <small>{c.landing.toBeat}</small>
                    <motion.b initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 14 }}>{resultMain(data.result)}</motion.b>
                    <em>{resultSub(data.result) || ' '}</em>
                    <span className={`gc-tag ${data.result.won ? 'won' : 'lost'}`}>{data.result.won ? c.won : c.lost}</span>
                  </div>
                  <span className={`gc-deal ${data.same_deal && m?.seeded ? 'same' : ''}`}>{data.same_deal && m?.seeded ? `♠ ${c.landing.sameDeal}` : `◷ ${c.landing.ownDeal}`}</span>
                  {data.me ? (
                    <div className={`gc-mine ${data.me.vs > 0 ? 'win' : data.me.vs < 0 ? 'lose' : ''}`}>
                      <small>{c.vs.you}</small><b>{resultMain(data.me)}</b>
                      <em>{data.me.vs > 0 ? c.vs.win : data.me.vs < 0 ? c.vs.lose : c.vs.tie}</em>
                    </div>
                  ) : data.mine ? (
                    <motion.button className="btn acc gc-play" onClick={() => { sfx.tap(); setShare(true); }} whileTap={{ scale: 0.96 }}>
                      <SwordsIcon /><span>{c.share}</span>
                    </motion.button>
                  ) : (
                    <motion.button className="btn acc gc-play" onClick={() => { sfx.tap(); setPlaying(true); }} whileTap={{ scale: 0.96 }} whileHover={{ y: -2 }}>
                      <span className="suitspin" aria-hidden>♠</span><span>{c.landing.play}</span><span className="arr" aria-hidden>→</span>
                    </motion.button>
                  )}
                  {!app.session && !data.mine && <p className="gc-guestline">{c.landing.guest} <button className="gc-inline" onClick={onAuth}>{c.signIn}</button></p>}
                </motion.section>

                {data.results.length > 0 && (
                  <motion.section className="gc-board" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <span className="ga-kick sm">{c.landing.board} · {data.answers}</span>
                    <ol>
                      {data.results.map((r, i) => (
                        <motion.li key={r.rk + r.username} className={`${r.is_me ? 'me' : ''} ${r.vs > 0 ? 'beat' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                          <span className="rk">{r.rk}</span>
                          <AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={30} />
                          <span className="nm">{r.username}</span>
                          <span className="vs" aria-hidden>{r.vs > 0 ? '▲' : r.vs < 0 ? '▼' : '='}</span>
                          <b>{resultMain(r)}</b>
                        </motion.li>
                      ))}
                    </ol>
                  </motion.section>
                )}
                <button className="gc-inline gc-more" onClick={onGames}>{c.landing.home} →</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {share && data && m && (
          <ChallengeSheet key="sh" m={m} result={{ game: data.game, won: data.result.won, score: data.result.score ?? undefined, seconds: data.result.seconds }}
            seed={data.seed} sameDeal={data.same_deal} code={data.code} onClose={() => setShare(false)} onAuth={onAuth} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
