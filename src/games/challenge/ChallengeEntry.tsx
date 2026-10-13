import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS } from '../../i18n/arena';
import { Sheet } from '../../screens/Sheets';
import { sfx } from '../../sound';
import type { GameModule } from '../types';
import { clock, fmtNum, textOf } from '../hub/order';
import { SwordsIcon } from '../tournament/icons';
import { challengeMineRpc, type MyChallenge } from './api';
import { challengeUrl } from './compare';

/** The hub's "Challenge a friend" card: crossed swords, two cards squaring up; opens the game picker. */
export function ChallengeCard({ onOpen }: { onOpen: () => void }) {
  const s = useStrings(ARENA_STRINGS);
  return (
    <motion.button className="ga-duelcard" onClick={() => { sfx.tap(); onOpen(); }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, type: 'spring', stiffness: 190, damping: 20 }}
      whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
      <span className="ga-duel-art" aria-hidden>
        <motion.i className="c1" animate={{ rotate: [-16, -12, -16] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.i className="c2" animate={{ rotate: [16, 12, 16] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} />
        <span className="sw"><SwordsIcon /></span>
      </span>
      <span className="ga-duel-tx">
        <b className="serif">{s.challenge.cta}</b>
        <small>{s.challenge.ctaSub}</small>
      </span>
      <span className="arr" aria-hidden>→</span>
    </motion.button>
  );
}

/** Pick the game to challenge with (plays it first with a fresh seed) + the player's recent challenges. */
export function ChallengePicker({ list, onPick, onClose }: { list: readonly GameModule[]; onPick: (id: string) => void; onClose: () => void }) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const c = s.challenge;
  const [mine, setMine] = useState<MyChallenge[] | null>(null);
  useEffect(() => { if (app.session) void challengeMineRpc(8).then(setMine); }, [app.session]);
  return (
    <Sheet onClose={onClose}>
      <div className="ga-pick">
        <span className="ga-kick"><SwordsIcon />{c.cta}</span>
        <h2 className="serif">{c.pick}</h2>
        <p>{c.pickSub}</p>
        <div className="ga-pick-grid">
          {list.map((m, i) => {
            const E = m.Emblem;
            return (
              <motion.button key={m.id} className="ga-pick-g" onClick={() => { sfx.tap(); onPick(m.id); }}
                initial={{ opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.05 + i * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
                whileTap={{ scale: 0.94 }}>
                <span className="gh-medal" aria-hidden><span className="gh-medal-in"><E size={30} /></span></span>
                <b className="serif">{textOf(m.title, app.lang)}</b>
                <small>{m.seeded ? `♠ ${c.sameDeal}` : `◷ ${c.ownDeal}`}</small>
              </motion.button>
            );
          })}
        </div>
        {app.session && (
          <div className="ga-mine">
            <span className="ga-kick sm">{c.mine}</span>
            {mine && mine.length === 0 && <p className="ga-mine-empty">{c.noneYet}</p>}
            {mine && mine.length > 0 && (
              <ul>
                {mine.map(x => {
                  const m = list.find(g => g.id === x.game);
                  return (
                    <li key={x.code} className={x.expired ? 'old' : ''}>
                      <a href={challengeUrl(x.code)}>
                        <span className="g">{m ? textOf(m.title, app.lang) : x.game}</span>
                        <b>{x.score != null ? fmtNum(x.score) : clock(x.seconds)}</b>
                        <span className="n">{x.answers} {c.answers}{x.beaten > 0 ? ` · ${x.beaten} ${c.beaten}` : ''}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
