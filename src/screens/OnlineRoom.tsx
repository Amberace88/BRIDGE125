import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useRoom, playerId, isQuickCode } from '../online/useRoom';
import { Table } from './Table';
import { sfx } from '../sound';
import { track } from '../analytics';
import { useGameAchievements } from '../progress/useProgress';
import { HOME } from '../i18n/home';
import { useStrings } from '../i18n/pick';
import { useMesh } from '../media/useMesh';
import { useAvatarUrl } from '../media/avatar';
import { FaceAvatar } from '../media/UserAvatar';
import { VideoDock, LobbyMedia, SeatLive } from '../components/VideoDock';
import { initMusic } from '../media/music';
import { SocialGlyph, SocialOverlay, SocialSheets, useTableSocial } from '../social/TableSocial';

initMusic();

export function OnlineRoom({ code, onExit, onQuickAgain, onAuth }: { code: string; onExit: () => void; onQuickAgain: (skip: string) => void; onAuth?: () => void }) {
  const app = useApp();
  const { t } = app;
  const fallbackName = useMemo(() => `${t.guest} ${playerId().replace(/[^0-9]/g, '').slice(0, 3) || '7'}`, [t.guest]);
  const [name, setName] = useState(app.name || fallbackName);
  const r = useRoom(code, app.name || fallbackName, app.session?.access_token);
  const social = useTableSocial(r);
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/r/${code}`;
  const myAvatar = useAvatarUrl();
  const media = useMesh(r, myAvatar);
  const seatName = (seat: number) => r.room?.seats[seat]?.name ?? '?';
  const peerAv = (seat: number) => media.snap.peers.find(p => p.seat === seat)?.av ?? '';

  const leave = () => { r.leave(); onExit(); };
  const quick = isQuickCode(code);
  const hs = useStrings(HOME);
  useGameAchievements(r.game, r.you);

  // a quick table that filled up or started before we arrived → quietly find another one
  const rematched = useRef(false);
  useEffect(() => {
    if (quick && r.error === 'full' && !rematched.current) { rematched.current = true; onQuickAgain(code); }
  }, [quick, r.error, code, onQuickAgain]);

  // stats for signed-in players: one record per finished game
  const recorded = useRef(false);
  const started = useRef(false);
  const phase = r.game?.phase;
  useEffect(() => {
    if (phase === 'gameOver' && r.game && r.you >= 0 && !recorded.current) {
      recorded.current = true; app.recordGame(r.game.winners.includes(r.you), quick ? 'quick' : 'room');
      track('game_end', { mode: quick ? 'quick' : 'room', won: r.game.winners.includes(r.you), rounds: r.game.round, players: r.game.players.length });
    }
    if (phase === 'play' && r.game?.round === 1 && !started.current) { started.current = true; track('game_start', { mode: quick ? 'quick' : 'room', players: r.game.players.length }); }
    if (phase && phase !== 'gameOver') recorded.current = false;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // lobby countdown for quick tables
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!quick || r.room?.status !== 'lobby') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [quick, r.room?.status]);
  const left = r.deadline ? Math.max(0, Math.ceil((r.deadline - now) / 1000)) : null;

  const invite = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Bridge 125', text: t.room.shareText, url: link }); return; }
    } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true); sfx.tap(); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  };

  if (r.error && !(quick && r.error === 'full')) {
    return (
      <div className="stage center">
        <div className="panel" style={{ padding: 24, textAlign: 'center', maxWidth: 360 }}>
          <div className="serif" style={{ fontSize: 30, fontWeight: 700 }}>{r.error === 'full' ? t.room.full : t.room.notFound}</div>
          <button className="btn acc" style={{ width: '100%', marginTop: 18 }} onClick={onExit}>{t.home}</button>
        </div>
      </div>
    );
  }

  if (r.room?.status === 'playing' && r.game && r.you >= 0) {
    return (
      <>
        <Table g={r.game} me={r.you} onAct={r.act}
          onNextRound={() => r.send({ t: 'next' })}
          onRematch={() => r.send({ t: 'rematch' })}
          onExit={leave}
          deadline={r.deadline} turnMs={r.turnMs} offline={r.offline}
          emotes={r.emotes} onEmote={e => r.send({ t: 'emote', e })}
          topCenter={<div className="roomchip">{code}</div>}
          onSeatTap={seat => social.setSheet(seat)}
          myRowExtra={<SocialGlyph s={social} />}
          overlay={geo => <SocialOverlay geo={geo} r={r} s={social} />} />
        <SocialSheets r={r} s={social} onAuth={onAuth} />
        <VideoDock api={media} nameOf={seatName} myAvatar={myAvatar} />
        <ConnBadge status={r.status} t={t} />
      </>
    );
  }

  const seats = r.room?.seats ?? [];
  const max = r.room?.maxSeats ?? 4;
  const hasBots = seats.some(s => s.bot);

  return (
    <div className="stage lobby">
      <div className="lobbyhead">
        <button className="iconbtn" onClick={leave} aria-label={t.room.leave}>‹</button>
        <div className="mute" style={{ fontSize: 13, fontWeight: 600 }}>{quick ? '' : t.room.code}</div>
        <div style={{ width: 42 }} />
      </div>

      {quick ? (
        <div className="quickhead">
          <QuickRing left={left} total={20} />
          <h1 className="serif">{t.quick.title}</h1>
          <p className="mute">{left === 0 ? t.quick.starting : left != null ? t.quick.startsIn(left) : t.quick.finding}</p>
        </div>
      ) : (
        <div className="codetiles" aria-label={code}>
          {code.split('').map((ch, i) => (
            <motion.span key={i} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ delay: 0.08 * i, type: 'spring', stiffness: 260, damping: 18 }}>{ch}</motion.span>
          ))}
        </div>
      )}

      <button className={`btn ${quick ? 'ghost' : 'acc'}`} style={{ width: '100%', marginTop: 16 }} onClick={invite}>
        <AnimatePresence mode="wait">
          <motion.span key={String(copied)} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}>
            {copied ? `✓ ${t.room.copied}` : `↗ ${t.room.invite}`}
          </motion.span>
        </AnimatePresence>
      </button>
      <div className="mute" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 8, userSelect: 'text' }}>{link.replace(/^https?:\/\//, '')}</div>

      <div className="label" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
        <span>{r.status === 'open' ? t.room.waiting : t.room.connecting}</span><span>{t.room.seatsOf(seats.length, max)}</span>
      </div>
      <div className="seatlist">
        {Array.from({ length: max }).map((_, i) => {
          const s = seats[i];
          return (
            <motion.div key={i} layout className={`seatrow ${s ? '' : 'empty'}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              {s ? (
                <>
                  {i !== r.you && !s.bot && media.snap.peers.some(p => p.seat === i && (p.cam || p.mic))
                    ? <SeatLive api={media} seat={i} name={s.name} />
                    : !s.bot && (i === r.you ? myAvatar : peerAv(i))
                    ? <div className="avatar sm" style={{ padding: 0, overflow: 'hidden' }}><FaceAvatar url={i === r.you ? myAvatar : peerAv(i)} name={s.name} size={29} /></div>
                    : <div className="avatar sm">{s.bot ? '🤖' : s.name.slice(0, 1).toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}{i === r.you ? ` (${t.you})` : ''}</div>
                    <div className="mute" style={{ fontSize: 12 }}>{s.bot ? t.room.bot : s.host ? t.room.host : s.online ? t.room.online : '…'}</div>
                  </div>
                  <span className={`dot ${s.online ? 'on' : ''}`} />
                </>
              ) : (
                <><div className="avatar sm ghostav">+</div><div className="mute shimmer">{t.room.waiting}</div></>
              )}
            </motion.div>
          );
        })}
      </div>

      {r.you >= 0 && (
        <form className="renameform" onSubmit={e => { e.preventDefault(); const n = name.trim(); if (n) { app.saveProfile({ name: n }); r.send({ t: 'rename', name: n }); sfx.tap(); } }}>
          <input className="field" value={name} maxLength={20} onChange={e => setName(e.target.value)} aria-label={t.yourName} />
          <button className="btn ghost sm" type="submit" style={{ height: 50 }}>{t.save}</button>
        </form>
      )}

      {r.you >= 0 && <LobbyMedia api={media} myAvatar={myAvatar} myName={name || fallbackName} />}

      <div style={{ flex: 1, minHeight: 14 }} />
      {quick ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="mute" style={{ fontSize: 12.5, textAlign: 'center' }}>{t.quick.botsFill}</div>
          {r.isHost && <button className="btn acc big" onClick={() => { r.send({ t: 'start', bluff: false }); sfx.shuffle(); }}>{t.quick.startNow}</button>}
        </div>
      ) : r.isHost ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn ghost" disabled={seats.length >= max} onClick={() => r.send({ t: 'addBot' })}>＋ {t.room.addBot}</button>
            <button className="btn ghost" disabled={!hasBots} onClick={() => r.send({ t: 'removeBot' })}>－ {t.room.removeBot}</button>
          </div>
          <div className="prow" style={{ borderBottom: 0, padding: '4px 4px 6px' }}>
            <span>🃏 {hs.bluff} <small className="mute" style={{ fontWeight: 500, fontSize: 12 }}>· {hs.bluffHint}</small></span>
            <button className={`switch ${app.bluff ? 'on' : ''}`} role="switch" aria-checked={app.bluff} onClick={() => app.set({ bluff: !app.bluff })}><i /></button>
          </div>
          <button className="btn acc big" disabled={seats.length < 2} onClick={() => { r.send({ t: 'start', bluff: app.bluff }); sfx.shuffle(); }}>
            {seats.length < 2 ? t.room.needTwo : t.room.start}
          </button>
        </div>
      ) : (
        <div className="panel" style={{ padding: 14, textAlign: 'center', fontWeight: 600 }}><span className="dots" style={{ marginRight: 8 }}><i /><i /><i /></span>{t.room.waitHost}</div>
      )}
      <ConnBadge status={r.status} t={t} />
    </div>
  );
}

function QuickRing({ left, total }: { left: number | null; total: number }) {
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

function ConnBadge({ status, t }: { status: string; t: ReturnType<typeof useApp>['t'] }) {
  return (
    <AnimatePresence>
      {(status === 'reconnecting' || status === 'connecting') && (
        <motion.div className="connbadge" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {status === 'connecting' ? t.room.connecting : t.room.reconnecting}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
