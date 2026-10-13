import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { SOCIAL_STRINGS } from '../../i18n/social';
import { playerId } from '../../online/ids';
import { ChatGlyph, ChatPanel, useChatUi, useMutes } from '../../social/ChatDock';
import { sfx } from '../../sound';
import { track } from '../../analytics';
import { gameById } from '../registry';
import { textOf } from '../hub/order';
import { openRoom, roomLink } from './nav';
import { isQuickCode, type OnlineGameId, type RoomInfo } from './protocol';
import { ONLINE_STRINGS, type OnlineStrings } from './strings';
import { findGameMatch, useGameRoom, type GameRoomApi } from './useGameRoom';
import { RoomRules } from './RoomRules';
import '../../styles/social.css';
import './online.css';

const Tables = lazy(() => import('./tables'));

/**
 * /g/<game>/r/<CODE> — an online table of a card mini game. The lobby (seats, invite link, bots, rules, start) is
 * shared by every game; once the game runs, the game's own table is driven by the server's view (./tables.tsx).
 */
export default function OnlineGame({ game, code, onExit, onAuth }: { game: OnlineGameId; code: string; onExit: () => void; onAuth?: () => void }) {
  const app = useApp();
  const S = useStrings(ONLINE_STRINGS);
  const fallbackName = useMemo(() => `${app.t.guest} ${playerId().replace(/[^0-9]/g, '').slice(0, 3) || '7'}`, [app.t.guest]);
  const r = useGameRoom(game, code, app.name || fallbackName, app.session?.access_token);
  const quick = isQuickCode(code);
  const leave = () => { r.leave(); onExit(); };

  // a quick table that filled up or started before we arrived → quietly find another one
  const rematched = useRef(false);
  useEffect(() => {
    if (!quick || r.error !== 'full' || rematched.current) return;
    rematched.current = true;
    findGameMatch(game, code).then(c => openRoom(game, c, true)).catch(onExit);
  }, [quick, r.error, code, game, onExit]);

  // analytics: one start per game
  const started = useRef(0);
  useEffect(() => {
    const n = r.room?.gameNo ?? 0;
    if (r.room?.status === 'playing' && n > started.current) { started.current = n; track('minigame_start', { game, online: true, quick }); }
  }, [r.room?.status, r.room?.gameNo, game, quick]);

  if (r.error && !(quick && r.error === 'full')) {
    return (
      <div className="stage center gm-room">
        <div className="panel" style={{ padding: 24, textAlign: 'center', maxWidth: 360 }}>
          <div className="serif" style={{ fontSize: 28, fontWeight: 700 }}>{r.error === 'full' ? S.full : S.notFound}</div>
          <button className="btn acc" style={{ width: '100%', marginTop: 18 }} onClick={onExit}>{S.leave}</button>
        </div>
      </div>
    );
  }

  const playing = r.room?.status === 'playing' && r.view != null;
  return (
    <>
      {playing && r.you >= 0 ? (
        <Suspense fallback={<div className="stage center"><span className="spinner" /></div>}>
          <Tables game={game} r={r} onLeave={leave} onAuth={onAuth} />
        </Suspense>
      ) : playing ? (
        <Spectator r={r} S={S} onLeave={leave} />
      ) : (
        <WaitingRoom game={game} code={code} r={r} S={S} onLeave={leave} />
      )}
      {r.you >= 0 && <RoomChat r={r} />}
      <ConnBadge status={r.status} S={S} />
    </>
  );
}

/* ================================================================== waiting room */

function WaitingRoom({ game, code, r, S, onLeave }: { game: OnlineGameId; code: string; r: GameRoomApi; S: OnlineStrings; onLeave: () => void }) {
  const app = useApp();
  const m = gameById(game);
  const title = m ? textOf(m.title, app.lang) : game;
  const quick = isQuickCode(code);
  const [copied, setCopied] = useState(false);
  const link = roomLink(game, code);
  const room = r.room;
  const seats = room?.seats ?? [];
  const max = room?.maxSeats ?? 3;
  const min = room?.minSeats ?? 2;
  const hasBots = seats.some(s => s.bot);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!quick || !r.deadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [quick, r.deadline]);
  const left = quick && r.deadline ? Math.max(0, Math.ceil((r.deadline - now) / 1000)) : null;

  const invite = async () => {
    try { if (navigator.share) { await navigator.share({ title: `${title} · Bridge 125`, text: S.shareText(title), url: link }); return; } } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true); sfx.tap(); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  };

  return (
    <div className="stage lobby gm-room">
      <div className="lobbyhead">
        <button className="iconbtn" onClick={onLeave} aria-label={S.leave}>‹</button>
        <div className="gm-title">{m && <m.Emblem size={28} />}<b className="serif">{title}</b><span className="gm-live"><i />{S.online1}</span></div>
        <div style={{ width: 42 }} />
      </div>

      {quick ? (
        <div className="quickhead">
          <Ring left={left} total={20} />
          <h1 className="serif">{S.quickTitle}</h1>
          <p className="mute">{left === 0 ? S.starting : left != null ? S.startsIn(left) : S.waiting}</p>
        </div>
      ) : (
        <>
          <div className="mute gm-codecap">{S.code}</div>
          <div className="codetiles" aria-label={code}>
            {code.split('').map((ch, i) => (
              <motion.span key={i} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ delay: 0.08 * i, type: 'spring', stiffness: 260, damping: 18 }}>{ch}</motion.span>
            ))}
          </div>
          <button className="btn acc" style={{ width: '100%', marginTop: 16 }} onClick={invite}>
            <AnimatePresence mode="wait">
              <motion.span key={String(copied)} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}>{copied ? `✓ ${S.copied}` : `↗ ${S.invite}`}</motion.span>
            </AnimatePresence>
          </button>
          <div className="mute gm-link">{link.replace(/^https?:\/\//, '')}</div>
        </>
      )}

      <div className="label" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <span>{r.status === 'open' ? S.waiting : S.connecting}</span><span>{S.seatsOf(seats.length, max)}</span>
      </div>
      <SeatList room={room} you={r.you} S={S} max={max} />

      {!quick && room && <RoomRules game={game} rules={room.rules} seats={Math.max(seats.length, min)} editable={r.isHost} onChange={rules => r.send({ t: 'rules', rules })} />}

      <div style={{ flex: 1, minHeight: 14 }} />
      {quick ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="mute" style={{ fontSize: 12.5, textAlign: 'center' }}>{S.botsFill}</div>
          {r.isHost && <button className="btn acc big" onClick={() => { r.send({ t: 'start' }); sfx.shuffle(); }}>{S.startNow}</button>}
        </div>
      ) : r.isHost ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {max > min || seats.length < max ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn ghost" disabled={seats.length >= max} onClick={() => r.send({ t: 'addBot' })}>＋ {S.addBot}</button>
              <button className="btn ghost" disabled={!hasBots} onClick={() => r.send({ t: 'removeBot' })}>－ {S.removeBot}</button>
            </div>
          ) : null}
          <button className="btn acc big" onClick={() => { r.send({ t: 'start' }); sfx.shuffle(); }}>{seats.length < min ? S.startFill : S.start}</button>
        </div>
      ) : (
        <div className="panel" style={{ padding: 14, textAlign: 'center', fontWeight: 600 }}><span className="dots" style={{ marginRight: 8 }}><i /><i /><i /></span>{S.waitHost}</div>
      )}
    </div>
  );
}

function SeatList({ room, you, S, max, onSit }: { room: RoomInfo | null; you: number; S: OnlineStrings; max: number; onSit?: (seat: number, name: string) => void }) {
  const seats = room?.seats ?? [];
  return (
    <div className="seatlist">
      {Array.from({ length: max }).map((_, i) => {
        const s = seats[i];
        return (
          <motion.div key={i} layout className={`seatrow ${s ? '' : 'empty'}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            {s ? (
              <>
                <div className="avatar sm">{s.bot ? '🤖' : s.name.slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}{i === you ? ` (${S.you})` : ''}</div>
                  <div className="mute" style={{ fontSize: 12 }}>{s.bot ? S.bot : s.away ? S.away : s.host ? S.host : s.online ? S.online : S.offline}</div>
                </div>
                {onSit && s.bot ? <button className="btn ghost sm" onClick={() => onSit(i, s.name)}>{S.takeSeat(s.name)}</button> : <span className={`dot ${s.online ? 'on' : ''}`} />}
              </>
            ) : (
              <><div className="avatar sm ghostav">+</div><div className="mute shimmer">{S.waiting}</div></>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function Spectator({ r, S, onLeave }: { r: GameRoomApi; S: OnlineStrings; onLeave: () => void }) {
  const app = useApp();
  return (
    <div className="stage lobby gm-room">
      <div className="lobbyhead">
        <button className="iconbtn" onClick={onLeave} aria-label={S.leave}>‹</button>
        <div className="gm-title"><b className="serif">{S.spectating}</b></div>
        <div style={{ width: 42 }} />
      </div>
      <div style={{ height: 18 }} />
      <SeatList room={r.room} you={r.you} S={S} max={r.room?.seats.length ?? 3} onSit={seat => r.send({ t: 'sit', seat, name: app.name || 'Player' })} />
    </div>
  );
}

function Ring({ left, total }: { left: number | null; total: number }) {
  const R = 46, C = 2 * Math.PI * R;
  const frac = left == null ? 1 : Math.max(0, Math.min(1, left / total));
  return (
    <div className="qring">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={R} className="track" />
        <motion.circle cx="50" cy="50" r={R} className="bar" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - frac) }} transition={{ duration: 0.3, ease: 'linear' }} />
      </svg>
      <AnimatePresence mode="popLayout">
        <motion.b key={left ?? 'x'} initial={{ y: 12, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -12, opacity: 0 }}>{left ?? '…'}</motion.b>
      </AnimatePresence>
    </div>
  );
}

function ConnBadge({ status, S }: { status: string; S: OnlineStrings }) {
  return (
    <AnimatePresence>
      {(status === 'reconnecting' || status === 'connecting') && (
        <motion.div className="connbadge" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {status === 'connecting' ? S.connecting : S.reconnecting}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================== chat (the shared social dock) */

function RoomChat({ r }: { r: GameRoomApi }) {
  const app = useApp();
  const S = useStrings(SOCIAL_STRINGS);
  const mutes = useMutes();
  const ui = useChatUi(r.chat, r.chatBase, r.you, mutes, k => S.chat.quick[k]);
  const slowUntil = r.chatErr ? r.chatErr.at + r.chatErr.wait : 0;
  const desk = typeof window !== 'undefined' && window.innerWidth >= 760;
  return (
    <div className="gm-soc">
      <div className="gm-chatbtn"><ChatGlyph ui={ui} S={S} /></div>
      <AnimatePresence>
        {ui.open && (
          <ChatPanel key="dock" ui={ui} S={S} chat={r.chat} you={r.you} mutes={mutes} signedIn={!!app.session} slowUntil={slowUntil}
            style={desk ? { right: 16, top: 112, width: 330, height: 440 } : { left: 8, right: 8, bottom: 'calc(8px + var(--safe-b))', height: Math.min(window.innerHeight * 0.58, 450) }}
            desk={desk} sendChat={r.sendChat} sendQuick={r.sendQuick} report={r.report} />
        )}
      </AnimatePresence>
    </div>
  );
}
