import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  type Action, type Card, type GameEvent, type GameState, type Suit, SUITS, SUIT_GLYPH, isQS, is6S, isRed, options, validatePlay,
} from '../engine/engine';
import { CardView, type Pose } from '../components/CardView';
import { useApp } from '../store';
import { buzz, sfx } from '../sound';
import { Results } from './Results';

interface Banner { id: number; text: string; sub?: string; tone: 'bad' | 'good' | 'info' }
export interface Emote { id: number; seat: number; e: string }
export const EMOTES = ['👍', '😂', '😮', '😡', '🔥', '🙏'];

export interface TableProps {
  g: GameState;
  me: number;
  onAct: (a: Action) => void;
  onNextRound: () => void;
  onRematch?: () => void;
  onExit: () => void;
  deadline?: number | null;          // epoch ms for current turn (online)
  turnMs?: number;
  topCenter?: ReactNode;              // replaces round/deck label
  emotes?: Emote[];
  onEmote?: (e: string) => void;
  offline?: number[];                 // seats currently disconnected
}

export function Table({ g, me, onAct, onNextRound, onRematch, onExit, deadline, turnMs = 30000, topCenter, emotes = [], onEmote, offline = [] }: TableProps) {
  const app = useApp();
  const { t, lang } = app;
  const [sel, setSel] = useState<string[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [menu, setMenu] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 800 });

  useLayoutEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => { setSel([]); }, [g.seq]);

  const nameOf = useCallback((i: number) => (i === me ? t.you : g.players[i]?.name ?? '?'), [g.players, t.you, me]);

  // events → sound, haptics, banners
  const bannerId = useRef(0);
  useEffect(() => {
    const ev = g.events;
    if (!ev?.length) return;
    let b: Omit<Banner, 'id'> | null = null;
    const cur = { p: 0 };
    const pick = (cand: Omit<Banner, 'id'>, pri: number) => { if (pri > cur.p) { b = cand; cur.p = pri; } };
    for (const e of ev as GameEvent[]) {
      switch (e.t) {
        case 'play': sfx.play(); break;
        case 'draw': sfx.draw(); break;
        case 'reshuffle': sfx.shuffle(); pick({ text: t.ev.reshuffle, tone: 'info' }, 1); break;
        case 'queen': sfx.alert(); if (e.target === me) buzz([30, 40, 30]); pick({ text: e.target === me ? t.ev.queenYou : t.ev.queen(nameOf(e.target)), sub: t.ev.queenSub, tone: 'bad' }, 8); break;
        case 'transfer': sfx.alert(); if (e.target === me) buzz([30, 40, 30]); pick({ text: e.target === me ? t.ev.transferYou : t.ev.transfer(nameOf(e.target)), tone: 'bad' }, 9); break;
        case 'eight': sfx.alert(); pick({ text: '8 · ' + (e.target === me ? t.ev.youTake(e.amount) : t.ev.eight(nameOf(e.target), e.amount)), tone: 'bad' }, 6); break;
        case 'seven': pick({ text: '7 · ' + (e.target === me ? t.ev.youTake(e.amount) : t.ev.seven(nameOf(e.target), e.amount)), tone: 'info' }, 4); break;
        case 'skip': pick({ text: e.p === me ? t.ev.youSkip : t.ev.skip(nameOf(e.p)), tone: 'info' }, 3); break;
        case 'suit': pick({ text: t.ev.suit(nameOf(e.p), `${SUIT_GLYPH[e.s]} ${t.suitNames[e.s]}`), tone: 'info' }, 5); break;
        case 'kings': sfx.big(); buzz(80); pick({ text: t.ev.kings, sub: t.ev.kingsSub, tone: 'good' }, 10); break;
        case 'reset125': sfx.big(); pick({ text: t.ev.reset125(nameOf(e.p)), tone: 'good' }, 10); break;
        case 'roundEnd': if (e.winner === me) sfx.good(); break;
        default: break;
      }
    }
    if (b) {
      const id = ++bannerId.current;
      setBanner({ ...(b as Omit<Banner, 'id'>), id });
      const tm = setTimeout(() => setBanner(x => (x?.id === id ? null : x)), 1900);
      return () => clearTimeout(tm);
    }
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (g.phase === 'roundOver' || g.phase === 'gameOver') {
      const tm = setTimeout(() => setShowResult(true), 1100);
      return () => clearTimeout(tm);
    }
    setShowResult(false);
  }, [g.phase, g.seq]);

  const o = options(g, me);
  const mine = g.players[me];
  const act = (a: Action) => { setSel([]); onAct(a); };

  const onTap = (c: Card) => {
    if (!o.mine) return;
    const legalIds = new Set(o.legal.map(x => x.id));
    if (sel.length) {
      if (sel.includes(c.id)) { setSel(sel.filter(i => i !== c.id)); sfx.tap(); return; }
      const first = mine.hand.find(h => h.id === sel[0])!;
      if (c.r === first.r || (isQS(first) && is6S(c) && sel.length === 1)) { setSel([...sel, c.id]); sfx.tap(); return; }
      if (legalIds.has(c.id)) setSel([]);
      else return;
    }
    if (!legalIds.has(c.id)) { buzz(15); return; }
    const sameRank = mine.hand.filter(h => h.id !== c.id && h.r === c.r);
    const comboable = isQS(c) && o.combo;
    if (!sameRank.length && !comboable) { act({ type: 'play', cardIds: [c.id] }); return; }
    setSel([c.id]); sfx.tap();
  };

  // ---------- layout ----------
  const { w: W, h: H } = size;
  const n = g.players.length;
  const rel = (pi: number) => (pi - me + n) % n;
  const cw = Math.round(Math.min(96, W * 0.235));
  const ch = Math.round(cw * 1.43);
  const handScale = 0.8;
  const oppScale = 0.36;
  const actionY = H - 14 - 52;
  const handY = actionY - 14 - (ch * handScale) / 2;
  const tableY = Math.max(250, Math.min(H * 0.47, handY - ch * 0.8 - 70));
  const deckPos = { x: W * 0.3, y: tableY };
  const pilePos = { x: W * 0.6, y: tableY };

  const seats = useMemo(() => {
    const top = 64;
    if (n === 2) return [{ x: W / 2, y: top }];
    if (n === 3) return [{ x: W * 0.25, y: top }, { x: W * 0.75, y: top }];
    return [{ x: W * 0.17, y: top + 36 }, { x: W * 0.5, y: top }, { x: W * 0.83, y: top + 36 }];
  }, [n, W]);
  const seatOf = (pi: number) => seats[rel(pi) - 1];

  const poses = new Map<string, Pose>();
  const deckFrom: Pose = { x: deckPos.x, y: deckPos.y, rot: 0, scale: 1, z: 5, up: false };
  const fromMap = new Map<string, Pose>();
  for (const e of g.events ?? []) {
    if (e.t === 'play' && e.p !== me) {
      const s = seatOf(e.p);
      if (s) for (const c of e.cards) fromMap.set(c.id, { x: s.x, y: s.y + 108, rot: 0, scale: oppScale, z: 50, up: false });
    }
  }
  g.deck.slice(0, 3).forEach((c, i) => poses.set(c.id, { x: deckPos.x - i * 1.5, y: deckPos.y - i * 1.5, rot: 0, scale: 1, z: 10 - i, up: false }));
  const pileShown = g.pile.slice(-6);
  pileShown.forEach((c, i) => {
    const h = [...c.id].reduce((a, ch2) => a + ch2.charCodeAt(0), 0);
    poses.set(c.id, { x: pilePos.x + ((h * 13) % 10) - 5, y: pilePos.y + ((h * 7) % 8) - 4, rot: ((h * 37) % 26) - 13, scale: 1, z: 20 + i, up: true });
  });
  g.players.forEach((p, pi) => {
    if (pi === me) return;
    const s = seatOf(pi);
    const cnt = p.hand.length;
    const spread = Math.min(12, 110 / Math.max(1, cnt));
    p.hand.forEach((c, i) => {
      const k = i - (cnt - 1) / 2;
      poses.set(c.id, { x: s.x + k * spread, y: s.y + 108, rot: k * 4, scale: oppScale, z: 30 + i, up: false });
    });
  });
  const mh = mine.hand;
  const hn = mh.length;
  const avail = W - 28 - cw * handScale;
  const step = hn > 1 ? Math.min(cw * handScale * 0.66, avail / (hn - 1)) : 0;
  const rotStep = Math.min(5, 34 / Math.max(1, hn));
  mh.forEach((c, i) => {
    const k = i - (hn - 1) / 2;
    poses.set(c.id, { x: W / 2 + k * step, y: handY + Math.abs(k) * Math.abs(k) * (hn > 8 ? 0.6 : 1.6), rot: k * rotStep, scale: handScale, z: 100 + i, up: true });
  });

  const allCards: Card[] = [...g.deck.slice(0, 3), ...pileShown, ...g.players.flatMap(p => p.hand)];
  const legalSet = new Set(o.legal.map(c => c.id));
  const selValid = sel.length ? validatePlay(g, me, sel) === null : false;
  const selFirst = mine.hand.find(h => h.id === sel[0]);
  const isCombo = sel.length === 2 && !!selFirst && isQS(selFirst) && is6S(mine.hand.find(h => h.id === sel[1])!);
  const topCard = g.pile[g.pile.length - 1];
  const suitChanged = !!topCard && topCard.r === 'J';
  const playing = g.phase === 'play' || g.phase === 'chooseSuit';

  let status = '';
  if (o.mine) {
    const p = g.pending;
    if (p?.kind === 'queen') status = t.ev.queenYou;
    else if (p?.kind === 'queen6') status = t.ev.transferYou;
    else if (p) status = t.take(p.amount);
    else if (g.mustCover) status = t.coverSix;
    else status = t.yourTurn;
  } else if (playing) {
    status = t.waiting(nameOf(g.current));
  }

  const remaining = deadline ? Math.max(0, deadline - Date.now()) : 0;
  const Ring = ({ size: s }: { size: number }) => deadline && playing ? (
    <svg key={deadline} width={s + 10} height={s + 10} style={{ position: 'absolute', left: -5, top: -5, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
      <circle cx={(s + 10) / 2} cy={(s + 10) / 2} r={s / 2 + 2} fill="none" stroke="var(--acc-hi)" strokeWidth="3"
        strokeDasharray={Math.PI * (s + 4)} strokeDashoffset={Math.PI * (s + 4) * (1 - remaining / turnMs)}
        style={{ animation: `ringdown ${remaining}ms linear forwards`, ['--len' as string]: `${Math.PI * (s + 4)}` }} />
    </svg>
  ) : null;

  return (
    <div className="stage" ref={stageRef}>
      <div style={{ position: 'absolute', left: 14, right: 14, top: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 8 }}>
        <button className="iconbtn" aria-label={t.menuQuit} onClick={() => setMenu(true)}>‹</button>
        <div style={{ textAlign: 'center' }}>
          {topCenter ?? null}
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.round(g.round)}</div>
          <div className="mute" style={{ fontSize: 12, marginTop: 2 }}>{t.deckLeft(g.deck.length)}</div>
        </div>
        <button className="iconbtn" aria-label={t.sound} onClick={() => app.set({ sound: !app.sound })}>{app.sound ? '♪' : '·'}</button>
      </div>

      {g.players.map((p, pi) => pi === me ? null : (
        <div key={p.id} className="seat" style={{ left: seatOf(pi).x, top: seatOf(pi).y - 8, opacity: offline.includes(pi) ? 0.5 : 1 }}>
          <div style={{ position: 'relative' }}>
            <div className={`avatar ${g.current === pi && playing ? 'turn' : ''}`}>{p.bot ? '🤖' : p.name.slice(0, 1).toUpperCase()}</div>
            {g.current === pi && <Ring size={46} />}
            <AnimatePresence>
              {emotes.filter(x => x.seat === pi).slice(-1).map(x => (
                <motion.div key={x.id} initial={{ scale: 0, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
                  style={{ position: 'absolute', right: -26, top: -14, fontSize: 28, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.5))' }}>{x.e}</motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="nm">{p.name}</div>
          <div className="sc">{g.current === pi && playing ? <span className="dots"><i /><i /><i /></span> : t.points(p.score)}</div>
        </div>
      ))}

      <motion.div key={g.activeSuit + String(suitChanged)}
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        style={{ position: 'absolute', left: Math.min(W - 40, pilePos.x + cw * 0.95), top: tableY - 26, width: 52, height: 52, borderRadius: '50%', background: 'var(--lacquer)', border: `1.5px solid ${suitChanged ? 'var(--acc-hi)' : 'var(--line)'}`, display: 'grid', placeItems: 'center', zIndex: 6, boxShadow: suitChanged ? '0 0 22px color-mix(in srgb, var(--acc-hi) 45%, transparent)' : 'none' }}>
        <span style={{ fontSize: 24, color: isRed(g.activeSuit) ? '#ff6b80' : '#fff' }}>{SUIT_GLYPH[g.activeSuit]}</span>
      </motion.div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 7 }}>
        {allCards.map(c => {
          const pose = poses.get(c.id)!;
          const isMine = mh.some(h => h.id === c.id);
          const legal = isMine && o.mine && !sel.length && legalSet.has(c.id);
          const selected = sel.includes(c.id);
          const addable = isMine && sel.length > 0 && !selected && !!selFirst && (c.r === selFirst.r || (isQS(selFirst) && is6S(c) && sel.length === 1));
          return (
            <CardView key={c.id} card={c} lang={lang} w={cw} pose={pose} from={fromMap.get(c.id) ?? deckFrom}
              legal={legal || addable} sel={selected}
              dim={isMine && o.mine && !legal && !selected && !addable && !o.forcedDraw}
              onTap={isMine ? () => onTap(c) : undefined} />
          );
        })}
      </div>

      {g.deck.length === 0 && (
        <div style={{ position: 'absolute', left: deckPos.x - cw / 2, top: tableY - ch / 2, width: cw, height: ch, borderRadius: 9, border: '1.5px dashed var(--line)', zIndex: 4 }} />
      )}

      <AnimatePresence>
        {banner && (
          <motion.div key={banner.id} className="banner" style={{ top: tableY - ch / 2 - 74 }}
            initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
            <div className={`pill ${banner.tone}`}>{banner.text}</div>
            {banner.sub && <div className="sub">{banner.sub}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'absolute', left: 16, right: 16, top: handY - (ch * handScale) / 2 - 58, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div className={`avatar ${o.mine ? 'turn' : ''}`} style={{ width: 38, height: 38, fontSize: 15 }}>{(mine.name || t.you).slice(0, 1).toUpperCase()}</div>
            {g.current === me && <Ring size={38} />}
            <AnimatePresence>
              {emotes.filter(x => x.seat === me).slice(-1).map(x => (
                <motion.div key={x.id} initial={{ scale: 0, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
                  style={{ position: 'absolute', right: -24, top: -18, fontSize: 26 }}>{x.e}</motion.div>
              ))}
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={status} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.18 }}
              style={{ fontWeight: 700, fontSize: 15, color: o.mine ? 'var(--acc-hi)' : 'var(--text)' }}>{status}</motion.div>
          </AnimatePresence>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onEmote && (
            <div style={{ position: 'relative' }}>
              <button className="iconbtn" style={{ width: 36, height: 36, fontSize: 17 }} aria-label="Emote" onClick={() => setEmoteOpen(v => !v)}>☺</button>
              <AnimatePresence>
                {emoteOpen && (
                  <motion.div className="panel" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    style={{ position: 'absolute', right: 0, bottom: 44, display: 'flex', gap: 2, padding: 6, zIndex: 20 }}>
                    {EMOTES.map(e => (
                      <motion.button key={e} whileTap={{ scale: 0.8 }} style={{ fontSize: 24, width: 38, height: 38 }} onClick={() => { onEmote(e); setEmoteOpen(false); }}>{e}</motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="chip">{t.points(mine.score)}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 14, right: 14, top: actionY, display: 'flex', gap: 10, zIndex: 9 }}>
        {sel.length > 0 ? (
          <>
            <button className="btn ghost" style={{ flex: 0.7 }} onClick={() => setSel([])}>✕</button>
            <button className="btn acc" style={{ flex: 1.3 }} disabled={!selValid} onClick={() => act({ type: 'play', cardIds: sel })}>
              {isCombo ? t.comboQ6 : t.playN(sel.length)}
            </button>
          </>
        ) : o.mine ? (
          <>
            {o.canAccept && <button className={`btn ${o.forcedDraw ? 'acc' : 'ghost'}`} style={{ flex: 1 }} onClick={() => act({ type: 'accept' })}>{t.take(g.pending!.amount)}</button>}
            {o.canDraw && <button className="btn ghost" style={{ flex: 1 }} onClick={() => act({ type: 'draw' })}>{t.draw}</button>}
            {o.canPass && <button className="btn acc" style={{ flex: 1 }} onClick={() => act({ type: 'pass' })}>{t.pass}</button>}
          </>
        ) : null}
      </div>

      <AnimatePresence>
        {g.phase === 'chooseSuit' && g.current === me && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="serif" style={{ fontSize: 34, fontWeight: 700, marginBottom: 18 }}>{t.chooseSuit}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 120px)', gap: 14 }}>
                {SUITS.map((s: Suit, i) => (
                  <motion.button key={s} className="panel" onClick={() => act({ type: 'suit', suit: s })}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 320, damping: 20 }}
                    whileTap={{ scale: 0.94 }} style={{ height: 120, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 46, color: isRed(s) ? '#ff6b80' : '#fff', lineHeight: 1 }}>{SUIT_GLYPH[s]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.suitNames[s]}</span>
                    <span className="mute" style={{ fontSize: 11 }}>{mine.hand.filter(c => c.s === s).length}×</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && g.lastResult && (
          <Results g={g} me={me}
            onNext={() => { setShowResult(false); onNextRound(); sfx.shuffle(); }}
            onRematch={onRematch ? () => { setShowResult(false); onRematch(); sfx.shuffle(); } : undefined}
            onHome={onExit} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
              <div className="grab" />
              <button className="btn danger" style={{ width: '100%' }} onClick={onExit}>{t.menuQuit}</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setMenu(false)}>{t.back}</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
