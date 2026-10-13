import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { track } from '../../analytics';
import { useStrings } from '../../i18n/pick';
import { newRoomCode } from '../../online/ids';
import { useOnline } from '../../offline/net';
import { sfx } from '../../sound';
import { openRoom } from './nav';
import type { OnlineGameId } from './protocol';
import { ONLINE_STRINGS } from './strings';
import { findGameMatch } from './useGameRoom';
import './online.css';

type Mode = 'bots' | 'online' | 'friends';
const KEY = (g: string) => `b125.${g}.mode`;

const ICONS: Record<Mode, ReactNode> = {
  bots: <svg viewBox="0 0 24 24" aria-hidden><rect x="4.5" y="7.5" width="15" height="11" rx="3.5" /><circle cx="9.5" cy="13" r="1.3" className="f" /><circle cx="14.5" cy="13" r="1.3" className="f" /><path d="M12 7.5V4.5M10 4.5h4" /></svg>,
  online: <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.4 2.4 2.4 13.6 0 16M12 4c-2.4 2.4-2.4 13.6 0 16" /></svg>,
  friends: <svg viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.5" /><path d="M3.5 19c.8-3.2 3-4.8 5.5-4.8s4.7 1.6 5.5 4.8M14.5 14.6c2.6-.4 4.9.9 5.9 3.9" /></svg>,
};

/**
 * Bots / Online / Friends — the same three ways to play as Bridge's Home panel, for a mini game's lobby. `children`
 * is the game's own bots setup (level, rules, Start); Online and Friends lead to /g/<game>/r/<CODE>.
 */
export function PlayModes({ game, children }: { game: OnlineGameId; children: ReactNode }) {
  const S = useStrings(ONLINE_STRINGS);
  const net = useOnline();
  const [mode, setModeRaw] = useState<Mode>(() => { try { const v = localStorage.getItem(KEY(game)); return v === 'online' || v === 'friends' ? v : 'bots'; } catch { return 'bots'; } });
  const setMode = (m: Mode) => { setModeRaw(m); sfx.tap(); try { localStorage.setItem(KEY(game), m); } catch { /* */ } };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [code, setCode] = useState('');

  const quick = async () => {
    if (busy) return;
    setBusy(true); setErr(false);
    try { const c = await findGameMatch(game); track('minigame_quick', { game }); openRoom(game, c); } catch { setErr(true); setBusy(false); }
  };
  const create = () => { sfx.shuffle(); track('minigame_room', { game }); openRoom(game, newRoomCode()); };
  const join = () => { const c = code.trim().toUpperCase(); if (c.length >= 4) openRoom(game, c); };

  return (
    <>
      <div className="gm-modes" role="radiogroup">
        {(['bots', 'online', 'friends'] as Mode[]).map(id => (
          <button key={id} role="radio" aria-checked={mode === id} className={mode === id ? 'on' : ''} onClick={() => setMode(id)}>
            {mode === id && <motion.span layoutId={`gm-mode-${game}`} className="pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="ic">{ICONS[id]}</span>
            <span className="tx">{S.modes[id]}</span>
            {id === 'online' && <i className="live" aria-hidden />}
          </button>
        ))}
      </div>
      {mode === 'bots' ? children : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} className="gm-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {mode === 'online' ? (
              <>
                <p className="gm-note"><span className="gm-qdot" aria-hidden><i /></span>{S.onlineNote}</p>
                <button className="btn big gm-go live" disabled={busy || !net} aria-busy={busy} onClick={() => void quick()}>
                  <span className="gm-qdot" aria-hidden><i /></span><span className="lbl">{busy ? S.finding : S.findTable}</span>
                  {busy ? <span className="spinner" /> : <span className="arr" aria-hidden>→</span>}
                </button>
                {err && <div className="gm-err" role="alert">{S.quickError}</div>}
              </>
            ) : (
              <>
                <p className="gm-note">{S.friendsNote}</p>
                <form className="gm-join" onSubmit={e => { e.preventDefault(); join(); }}>
                  <input className="field code" value={code} maxLength={6} placeholder={S.enterCode} aria-label={S.enterCode} autoCapitalize="characters"
                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                  <button className="btn ghost sm" type="submit" disabled={code.length < 4 || !net}>{S.join}</button>
                </form>
                <button className="btn acc big gm-go" disabled={!net} onClick={create}>
                  <span className="suit" aria-hidden>♥</span><span className="lbl">{S.createRoom}</span><span className="arr" aria-hidden>→</span>
                </button>
              </>
            )}
            {!net && <div className="gm-err">{S.needsNet}</div>}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
