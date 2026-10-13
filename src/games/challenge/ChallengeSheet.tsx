import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS } from '../../i18n/arena';
import { sfx } from '../../sound';
import { track } from '../../analytics';
import { canvasBlob, shareImage } from '../../daily/shareCard';
import type { GameModule, GameResult } from '../types';
import { textOf } from '../hub/order';
import { ImageIcon, LinkIcon, ShareIcon, SwordsIcon } from '../tournament/icons';
import { challengeCreateRpc, type CreateResult } from './api';
import { challengeUrl, prettyUrl, resultMain, resultSub } from './compare';
import { drawChallengeCard } from './shareCard';

/** one server call per finished game, even if the sheet re-mounts */
const created = new WeakMap<GameResult, Promise<CreateResult | null>>();

/**
 * "Challenge a friend": creates the challenge for a finished game (challenge_create) and shares the link
 * bridge125.com/c/<code> — Web Share (text + link), the share image, or a copied link. Guests are asked to sign in.
 */
export function ChallengeSheet({ m, result, seed, sameDeal, code, onClose, onAuth }: {
  m: GameModule; result: GameResult; seed: string; sameDeal: boolean; onClose: () => void; onAuth: () => void;
  /** an existing challenge (the creator re-sharing /c/<code>): no new one is created */
  code?: string;
}) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const c = s.challenge;
  const signedIn = !!app.session;
  const [res, setRes] = useState<CreateResult | null | 'busy'>(code ? { ok: true, code } : signedIn ? 'busy' : null);
  const [note, setNote] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const title = textOf(m.title, app.lang);
  const E = m.Emblem;

  useEffect(() => {
    if (code || !signedIn) return;
    let live = true;
    setRes('busy');
    let p = created.get(result);
    if (!p || tries > 0) {
      p = challengeCreateRpc({ game: m.id, seed, level: result.level ?? null, won: result.won, score: result.score ?? null, seconds: result.seconds, sameDeal });
      created.set(result, p);
    }
    void p.then(r => { if (live) { setRes(r); if (r?.ok) track('challenge_create', { game: m.id, same: sameDeal }); } });
    return () => { live = false; };
  }, [signedIn, tries]); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = res && res !== 'busy' && res.ok && res.code ? res : null;
  const url = ok ? challengeUrl(ok.code!) : '';
  const shown = resultMain(result);
  const text = c.shareText(title, shown);
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(n => (n === t ? null : n)), 2200); };

  const send = async () => {
    if (!ok) return;
    sfx.tap();
    try {
      if (navigator.share) { await navigator.share({ title: c.prompt, text, url }); track('challenge_share', { game: m.id, via: 'share' }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`); flash(c.copied);
    } catch { /* dismissed */ }
  };
  const copy = async () => {
    if (!ok) return;
    sfx.tap();
    try { await navigator.clipboard.writeText(url); flash(c.copied); } catch { flash(url); }
  };
  const image = async () => {
    if (!ok) return;
    sfx.tap();
    const cv = await drawChallengeCard({
      game: title, kicker: `${c.card.kicker} · ${sameDeal ? c.sameDeal : c.ownDeal}`,
      a: { name: app.profile?.username || c.vs.you, main: shown, sub: resultSub(result), won: result.won },
      wonLabel: c.won, lostLabel: c.lost, vsLabel: c.card.vs, cta: c.card.cta, url: prettyUrl(url),
    });
    const blob = await canvasBlob(cv);
    if (!blob) return;
    const how = await shareImage(blob, { title: c.prompt, text, url, filename: `bridge125-challenge-${ok.code}.png` });
    if (how === 'saved') flash(c.saved);
    track('challenge_share', { game: m.id, via: 'image' });
  };

  return (
    <>
      <motion.div className="grs-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="grs-pos">
        <motion.div className="gc-sheet" role="dialog" aria-modal="true" aria-label={c.prompt}
          initial={{ y: 70, opacity: 0, scale: 0.94, rotateX: 16 }} animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }} exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
          <button className="gc-x" onClick={onClose} aria-label="×">×</button>
          <span className="ga-kick"><SwordsIcon />{c.prompt}</span>
          <div className="gc-plate">
            <span className="gc-plate-medal" aria-hidden><E size={34} /></span>
            <div className="gc-plate-tx">
              <small>{title} · {c.yourResult}</small>
              <b>{shown}</b>
              {resultSub(result) && <em>{resultSub(result)}</em>}
            </div>
            <span className={`gc-tag ${result.won ? 'won' : 'lost'}`}>{result.won ? c.won : c.lost}</span>
          </div>
          <span className={`gc-deal ${sameDeal ? 'same' : ''}`}>{sameDeal ? `♠ ${c.sameDeal}` : `◷ ${c.ownDeal}`}</span>

          <AnimatePresence mode="wait" initial={false}>
            {!signedIn && !code ? (
              <motion.div key="g" className="gc-guest" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <span>{c.signInSub}</span>
                <button className="btn acc" onClick={onAuth}>{c.signIn}</button>
              </motion.div>
            ) : res === 'busy' ? (
              <motion.div key="b" className="gc-busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <i className="shimmerbar" /><span>{c.creating}</span>
              </motion.div>
            ) : ok ? (
              <motion.div key="ok" className="gc-ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button className="gc-link" onClick={() => void copy()} aria-label={c.copy}>
                  <LinkIcon /><span>{prettyUrl(url)}</span><em>{c.copy}</em>
                </button>
                <motion.button className="btn acc gc-send" onClick={() => void send()} whileTap={{ scale: 0.96 }}>
                  <ShareIcon /><span>{c.share}</span>
                </motion.button>
                <button className="btn ghost gc-img" onClick={() => void image()}><ImageIcon /><span>{c.image}</span></button>
              </motion.div>
            ) : (
              <motion.div key="e" className="gc-err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span>{typeof res === 'object' && res?.error === 'limit' ? c.limit : c.error}</span>
                <button className="btn ghost sm" onClick={() => setTries(t => t + 1)}>↻ {c.retry}</button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>{note && <motion.span className="gc-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{note}</motion.span>}</AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
