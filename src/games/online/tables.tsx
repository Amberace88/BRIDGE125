// The games' own tables, driven by the server. Each table already takes `g` + `onAct`; online they get the server's
// view of my seat (rotated so that my seat is seat 0 where the table expects it) and `onAct` sends the intent to the
// room instead of applying it locally. `remote` switches the tables' local bot timers off (the server plays the bots).
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStrings } from '../../i18n/pick';
import { FAST_TEMPO, useFastMode } from '../../pace';
import { GameResultSheet } from '../GameResultSheet';
import { reportGame } from '../session';
import type { GameResult } from '../types';
import { DurakTable } from '../durak/DurakTable';
import { type Action as DAction, type DurakState, durakScore } from '../durak/engine';
import { RulesSheet as DurakRulesSheet } from '../durak/Lobby';
import { ThousandGame } from '../thousand/ThousandGame';
import { type Action as TAction, type TState, gameDetails } from '../thousand/engine';
import { ZoleGame } from '../zole/ZoleGame';
import { type Action as ZAction, type ZState, isWin } from '../zole/engine';
import { rotateThousand } from './adapters/thousand';
import { rotateZole } from './adapters/zole';
import type { OnlineGameId } from './protocol';
import { ONLINE_STRINGS } from './strings';
import type { GameRoomApi } from './useGameRoom';
import '../durak/durak.css';

const noop = () => {};

export default function Tables({ game, r, onLeave, onAuth }: { game: OnlineGameId; r: GameRoomApi; onLeave: () => void; onAuth?: () => void }) {
  const key = `${game}-${r.room?.gameNo ?? 0}`;
  if (game === 'zole') return <ZoleOnline key={key} r={r} onLeave={onLeave} onAuth={onAuth} />;
  if (game === 'thousand') return <ThousandOnline key={key} r={r} onLeave={onLeave} onAuth={onAuth} />;
  return <DurakOnline key={key} r={r} onLeave={onLeave} onAuth={onAuth} />;
}

interface Props { r: GameRoomApi; onLeave: () => void; onAuth?: () => void }

/* ================================================================== Zole */

function ZoleOnline({ r, onLeave, onAuth }: Props) {
  const pace = useFastMode();
  const g = useMemo(() => rotateZole(r.view as ZState, r.you), [r.view, r.you]);
  const over = g.phase === 'sessionOver';
  const onAct = useCallback((a: ZAction) => {
    if (a.type === 'next') r.send({ t: 'next' });
    else if (a.type !== 'finish') r.act(a);
  }, [r]);
  const result = useOnlineResult(r, over, () => {
    const best = Math.max(...g.scores);
    const mine = g.sheet.filter(x => x.declarer === 0 && x.contract !== 'final');
    const won = mine.filter(x => isWin(x.outcome));
    return {
      game: 'zole', won: g.scores[0] > 0 && g.scores[0] === best, score: Math.max(0, g.scores[0]),
      details: {
        online: true, deals: g.sheet.filter(x => x.contract !== 'final').length, place: [...g.scores].sort((a, b) => b - a).indexOf(g.scores[0]) + 1,
        zole_big: won.length, zole_solo: won.filter(x => x.contract === 'zole').length, jani: won.filter(x => x.outcome === 'jani').length,
      },
    };
  });
  return (
    <>
      <ZoleGame g={g} level="hard" fast={pace.fast} onToggleFast={pace.toggle} remote onAct={onAct} onBot={noop}
        onExit={onLeave} onNewSession={over ? () => r.send({ t: 'rematch' }) : onLeave} />
      <Hud r={r} />
      <ResultLayer res={result} r={r} onLeave={onLeave} onAuth={onAuth} />
    </>
  );
}

/* ================================================================== Thousand */

function ThousandOnline({ r, onLeave, onAuth }: Props) {
  const pace = useFastMode();
  const g = useMemo(() => rotateThousand(r.view as TState, r.you), [r.view, r.you]);
  const over = g.phase === 'gameOver';
  const onAct = useCallback((a: TAction) => {
    if (a.type === 'next') r.send({ t: 'next' });
    else if (a.type !== 'finish') r.act(a);
  }, [r]);
  const result = useOnlineResult(r, over, () => ({
    game: 'thousand', won: g.winner === 0, score: Math.max(0, g.scores[0]), details: { ...gameDetails(g), online: true },
  }));
  return (
    <>
      <ThousandGame g={g} level="hard" fast={pace.fast} onToggleFast={pace.toggle} remote onAct={onAct} onBot={noop}
        onExit={onLeave} onNewGame={over ? () => r.send({ t: 'rematch' }) : onLeave} onResults={result.open} />
      <Hud r={r} />
      <ResultLayer res={result} r={r} onLeave={onLeave} onAuth={onAuth} />
    </>
  );
}

/* ================================================================== Durak */

function DurakOnline({ r, onLeave, onAuth }: Props) {
  const pace = useFastMode();
  const S = useStrings(ONLINE_STRINGS);
  const g = r.view as DurakState;
  const me = r.you;
  const [hints, setHints] = useState<string[]>([]);
  const [menu, setMenu] = useState<null | 'menu' | 'rules'>(null);
  // pick-ups count against the score (as offline)
  const takes = useRef(0);
  useEffect(() => { if (g.events.some(e => e.t === 'take' && e.p === me)) takes.current++; }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const over = g.phase === 'over';
  const result = useOnlineResult(r, over, () => {
    const isDurak = g.durak === me;
    return {
      game: 'durak', won: !isDurak, score: durakScore(g, me, takes.current),
      details: {
        online: true, durak: isDurak, place: isDurak ? g.players.length : g.players[me].place ?? g.players.length, players: g.players.length,
        variant: g.rules.transfer ? 'perevodnoy' : 'podkidnoy', deck: g.rules.deck, pogony: isDurak && g.pogony,
      },
    };
  });
  return (
    <div className="dkroot" style={{ position: 'absolute', inset: 0 }}>
      <DurakTable g={g} me={me} level="hard" tempo={pace.fast ? FAST_TEMPO : 1} fast={pace.fast} onToggleFast={pace.toggle}
        onAct={(a: DAction) => r.act(a)} onMenu={() => setMenu('menu')} onDealing={noop}
        hints={hints} onHint={id => setHints(h => (h.includes(id) ? h : [...h, id]))} />
      <Hud r={r} />
      <ResultLayer res={result} r={r} onLeave={onLeave} onAuth={onAuth} />
      <AnimatePresence>
        {menu === 'rules' && <DurakRulesSheet key="rules" onClose={() => setMenu(null)} />}
        {menu === 'menu' && (
          <>
            <motion.div key="mscrim" className="scrim" style={{ zIndex: 80 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(null)} />
            <motion.div key="msheet" className="sheet dkmenu" style={{ zIndex: 81 }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
              <div className="grab" />
              <button className="btn ghost" style={{ width: '100%' }} onClick={() => setMenu('rules')}>{S.rules}</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onLeave}>{S.leave}</button>
              <button className="btn acc" style={{ width: '100%', marginTop: 10 }} onClick={() => setMenu(null)}>✓</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== shared: turn clock, ready / rematch, result */

/**
 * The server's clock, kept small so it never covers a table: a thin countdown bar along the top edge and a compact
 * ring chip under the title (gold on my move). The tables' own status lines already say whose move it is; the chip
 * carries it as its label. Also: ready / rematch counts and the autopilot notice.
 */
function Hud({ r }: { r: GameRoomApi }) {
  const S = useStrings(ONLINE_STRINGS);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const room = r.room;
  if (!room) return null;
  const me = r.you;
  const humans = room.seats.filter(s => !s.bot && !s.away && s.online).length;
  const msLeft = r.deadline ? Math.max(0, r.deadline - now) : null;
  const left = msLeft != null ? Math.ceil(msLeft / 1000) : null;
  const who = r.actor;
  const away = me >= 0 && room.seats[me]?.away;
  let label: string | null = null, count: string | null = null, mine = false, clock = false;
  if (room.rematch.length) { label = S.rematchWaiting(room.rematch.length, humans); count = `${room.rematch.length}/${humans}`; }
  else if (room.ready.length) { label = S.ready(room.ready.length, humans); count = `${room.ready.length}/${humans}`; }
  else if (who != null && who >= 0) {
    const seat = room.seats[who];
    mine = who === me;
    clock = !!seat && !seat.bot && !seat.away && left != null;
    label = mine ? S.yourTurn : `${S.turnOf(seat?.name ?? '?')}${seat && !seat.bot && !seat.online ? ` · ${S.offline}` : ''}`;
  }
  const frac = clock && msLeft != null ? msLeft / r.turnMs : 0;
  return (
    <>
      {clock && <div className={`gm-bar ${mine ? 'mine' : ''} ${left! <= 5 ? 'hot' : ''}`} aria-hidden><i style={{ transform: `scaleX(${Math.min(1, frac)})` }} /></div>}
      <div className="gm-hud">
        <AnimatePresence mode="wait">
          {(clock || count) && (
            <motion.div key={count ? 'count' : mine ? 'mine' : 'other'} className={`gm-turn ${mine ? 'mine' : ''} ${clock && left! <= 5 ? 'hot' : ''}`}
              role="status" aria-label={label ?? undefined} title={label ?? undefined}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.18 }}>
              {count ? <><span aria-hidden>✓</span><b>{count}</b></> : (
                <><svg viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="10" r="8" /><path d={arc(frac)} /></svg><b>{left}</b></>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {away && (
            <motion.div key="away" className="gm-away" role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{S.autopilot}</motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/** SVG arc path for a countdown ring (fraction 0…1 left). */
function arc(f: number): string {
  const a = Math.max(0, Math.min(0.9999, f)) * Math.PI * 2;
  const x = 10 + 8 * Math.sin(a), y = 10 - 8 * Math.cos(a);
  return `M10 2 A8 8 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

interface OnlineResult { result: GameResult | null; report: Promise<Record<string, unknown> | null> | null; shown: boolean; open: () => void; close: () => void }

/**
 * Report a finished online game once (details.online = true) and open the shared result sheet after a moment.
 * Server-side verification of online results is not wired yet: the room knows the true outcome, a later step can let
 * the Worker call record_minigame itself instead of trusting the client.
 */
function useOnlineResult(r: GameRoomApi, over: boolean, build: () => Omit<GameResult, 'seconds'>): OnlineResult {
  const t0 = useRef(Date.now());
  const [res, setRes] = useState<{ result: GameResult; report: Promise<Record<string, unknown> | null> } | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!over || res || r.you < 0) return;
    const result: GameResult = { ...build(), seconds: Math.round((Date.now() - t0.current) / 1000), level: 'online' };
    setRes({ result, report: reportGame(result) });
    const tm = setTimeout(() => setShown(true), 2600);
    return () => clearTimeout(tm);
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  return { result: res?.result ?? null, report: res?.report ?? null, shown, open: () => setShown(true), close: () => setShown(false) };
}

function ResultLayer({ res, r, onLeave, onAuth }: { res: OnlineResult; r: GameRoomApi; onLeave: () => void; onAuth?: () => void }) {
  const S = useStrings(ONLINE_STRINGS);
  const room = r.room;
  const voted = !!room && r.you >= 0 && room.rematch.includes(r.you);
  return (
    <AnimatePresence>
      {res.shown && res.result && (
        <GameResultSheet key="res" result={res.result} report={res.report}
          headline={voted && room ? S.rematchWaiting(room.rematch.length, room.seats.filter(s => !s.bot && !s.away && s.online).length) : undefined}
          onAgain={() => { r.send({ t: 'rematch' }); res.close(); }} onExit={onLeave} onAuth={onAuth} />
      )}
    </AnimatePresence>
  );
}
