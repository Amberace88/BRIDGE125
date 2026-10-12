import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useRoom, playerId } from '../online/useRoom';
import { Table } from './Table';
import { sfx } from '../sound';

export function OnlineRoom({ code, onExit }: { code: string; onExit: () => void }) {
  const app = useApp();
  const { t } = app;
  const fallbackName = useMemo(() => `${t.guest} ${playerId().replace(/[^0-9]/g, '').slice(0, 3) || '7'}`, [t.guest]);
  const [name, setName] = useState(app.name || fallbackName);
  const r = useRoom(code, app.name || fallbackName);
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/r/${code}`;

  const leave = () => { r.leave(); onExit(); };

  const invite = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Bridge 125', text: t.room.shareText, url: link }); return; }
    } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true); sfx.tap(); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  };

  if (r.error) {
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
          topCenter={<div className="roomchip">{code}</div>} />
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
        <div className="mute" style={{ fontSize: 13, fontWeight: 600 }}>{t.room.code}</div>
        <div style={{ width: 42 }} />
      </div>

      <div className="codetiles" aria-label={code}>
        {code.split('').map((ch, i) => (
          <motion.span key={i} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ delay: 0.08 * i, type: 'spring', stiffness: 260, damping: 18 }}>{ch}</motion.span>
        ))}
      </div>

      <button className="btn acc" style={{ width: '100%', marginTop: 16 }} onClick={invite}>
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
                  <div className="avatar sm">{s.bot ? '🤖' : s.name.slice(0, 1).toUpperCase()}</div>
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

      <div style={{ flex: 1 }} />
      {r.isHost ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn ghost" disabled={seats.length >= max} onClick={() => r.send({ t: 'addBot' })}>＋ {t.room.addBot}</button>
            <button className="btn ghost" disabled={!hasBots} onClick={() => r.send({ t: 'removeBot' })}>－ {t.room.removeBot}</button>
          </div>
          <button className="btn acc big" disabled={seats.length < 2} onClick={() => { r.send({ t: 'start' }); sfx.shuffle(); }}>
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
