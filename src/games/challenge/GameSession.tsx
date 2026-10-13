import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS } from '../../i18n/arena';
import { sfx } from '../../sound';
import { track } from '../../analytics';
import type { GameModule, GameResult } from '../types';
import { onGameRecorded } from '../useGameStats';
import { SwordsIcon } from '../tournament/icons';
import { challengeSubmitRpc, type Challenge } from './api';
import { compareResults, newSeed, resultMain } from './compare';
import { ChallengeSheet } from './ChallengeSheet';
import { CompareSheet } from './CompareSheet';
import '../hub/arena.css';
import '../result.css';
import './challenge.css';

export type SessionMode = 'play' | 'create' | 'accept';

/**
 * Every mini game runs inside this wrapper (App → /g/<id>, and the challenge page /c/<code>). It renders the game's
 * Screen with the optional seed / level (see the seed contract in ../types.ts) and listens for finished games
 * (useGameStats `onGameRecorded`, fired by reportGame for every game in the registry — no change in the games):
 *   play    after any game a "Challenge a friend" pill slides in (beat my score — or the same deal when the game reports its seed);
 *   create  started from the hub's "Challenge a friend": the first game's result opens the share sheet at once;
 *   accept  a challenge link: the first result is compared (and stored when signed in) → "You 2:41 vs Anna 3:05".
 */
export function GameSession({ m, seed, level, mode = 'play', challenge, onExit, onAuth }: {
  m: GameModule; seed?: string; level?: string; mode?: SessionMode; challenge?: Challenge; onExit: () => void; onAuth: () => void;
}) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const c = s.challenge;
  const S = m.Screen;
  const [result, setResult] = useState<GameResult | null>(null);
  const [pill, setPill] = useState(false);
  const [sheet, setSheet] = useState<'share' | 'compare' | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [again, setAgain] = useState(false);
  const [vs, setVs] = useState(0);
  const count = useRef(0);
  const shareFor = useRef<{ r: GameResult; seed: string; same: boolean } | null>(null);

  useEffect(() => onGameRecorded(r => {
    if (r.game !== m.id) return;
    count.current += 1;
    const first = count.current === 1;
    if ((mode === 'create' || mode === 'accept') && !first) { setResult(r); setPill(true); return; }
    setResult(r);
    if (mode === 'create') { setTimeout(() => openShare(r, true), 1400); return; }
    if (mode === 'accept' && challenge) { void settle(r); return; }
    setTimeout(() => setPill(true), 1600);
  }), [m.id, mode, challenge]); // eslint-disable-line react-hooks/exhaustive-deps

  // the pill folds itself away after a while (it stays as a small button until the next game)
  const [wide, setWide] = useState(true);
  useEffect(() => { if (!pill) return; setWide(true); const t = setTimeout(() => setWide(false), 9000); return () => clearTimeout(t); }, [pill, result]);

  function openShare(r: GameResult, first: boolean) {
    // same deal when the game reports the seed it dealt from, or (seeded games) for the first game of a seeded start
    const sd = r.seed ?? (first && seed && m.seeded ? seed : undefined);
    shareFor.current = { r, seed: sd ?? newSeed(), same: !!sd };
    setPill(false);
    setSheet('share');
  }

  async function settle(r: GameResult) {
    if (!challenge) return;
    const local = compareResults(r, challenge.result);
    setVs(local);
    track('challenge_play', { game: m.id, vs: local });
    if (!app.session) { setSaved(false); setTimeout(() => setSheet('compare'), 1300); return; }
    setSaved(null);
    setTimeout(() => setSheet('compare'), 1300);
    const x = await challengeSubmitRpc(challenge.code, r);
    if (x?.ok) {
      setSaved(true); setAgain(!!x.again);
      if (typeof x.vs === 'number') setVs(x.vs);
    } else setSaved(x?.error === 'own' ? true : false);
  }

  const screenSeed = mode === 'play' ? seed : seed ?? challenge?.seed;
  const screenLevel = level ?? challenge?.level ?? undefined;

  return (
    <>
      <S onExit={onExit} onAuth={onAuth} seed={screenSeed} level={screenLevel} />

      {/* the duel bar while playing a challenge */}
      <AnimatePresence>
        {mode === 'accept' && challenge && !result && (
          <motion.div className="gs-duel" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 22 }}>
            <SwordsIcon /><span>{challenge.creator.username}</span><b>{resultMain(challenge.result)}</b><small>{c.landing.toBeat}</small>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pill && result && !sheet && (
          <motion.div className={`gs-pill ${wide ? '' : 'mini'}`} initial={{ y: -60, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }} layout>
            <button className="gs-pill-go" onClick={() => { sfx.tap(); openShare(result, count.current === 1); }} aria-label={c.prompt}>
              <span className="gs-pill-ic"><SwordsIcon /></span>
              {wide && <span className="gs-pill-tx"><b>{c.prompt}</b><small>{result.seed || (count.current === 1 && seed && m.seeded) ? c.sameDeal : c.ownDeal} · {resultMain(result)}</small></span>}
            </button>
            {wide && <button className="gs-pill-x" onClick={() => setPill(false)} aria-label="×">×</button>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === 'share' && shareFor.current && (
          <ChallengeSheet key="share" m={m} result={shareFor.current.r} seed={shareFor.current.seed} sameDeal={shareFor.current.same}
            onClose={() => setSheet(null)} onAuth={onAuth} />
        )}
        {sheet === 'compare' && challenge && result && (
          <CompareSheet key="cmp" m={m} code={challenge.code} vs={vs} saved={saved} again={again}
            me={{ name: app.profile?.username || c.vs.you, avatar: app.avatar, r: result }}
            them={{ name: challenge.creator.username, avatar: challenge.creator.avatar, avatar_url: challenge.creator.avatar_url, r: challenge.result }}
            onRevenge={() => { shareFor.current = { r: result, seed: challenge.seed, same: challenge.same_deal }; setSheet('share'); }}
            onBack={onExit} onAuth={onAuth} />
        )}
      </AnimatePresence>
    </>
  );
}
