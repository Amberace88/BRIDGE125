import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  type Action, type Card, type GameEvent, type GameState, type Suit, RESET_AT, SUITS, SUIT_GLYPH, isQS, is6S, isRed, options, validatePlay,
} from '../engine/engine';
import { CardView, type Flight, type Pose } from '../components/CardView';
import { useApp } from '../store';
import { buzz, sfx } from '../sound';
import { QuickAudio } from '../voice/AudioControls';
import { StageFx, type Fx, type FxItem, type P as FxP } from '../voice/StageFx';
import { useNarrator } from '../voice/useNarrator';
import { CountUp, Results, ScoreBar, scoreTone } from './Results';
import { useStrings } from '../i18n/pick';
import { TABLE_STRINGS } from '../i18n/table';
import '../styles/table.css';

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
  topCenter?: ReactNode;              // shown above the round label
  emotes?: Emote[];
  onEmote?: (e: string) => void;
  offline?: number[];                 // seats currently disconnected
  /** Play the dealing show at the start of each round (default true). */
  dealAnimation?: boolean;
  /** Delay before the round summary opens after the last card (ms, default 1500). */
  resultsDelayMs?: number;
}

/* ---------- forward-compatible engine shapes (bluff mode is optional) ---------- */
type Opts = ReturnType<typeof options> & { canChallenge?: boolean };
type LooseEvent = { t: string; p?: number; by?: number };
const bluffOn = (s: GameState) => !!(s as GameState & { rules?: { bluff?: boolean } }).rules?.bluff;

/** A played card reaches the pile about this long after the state changes — strong-card effects start then. */
const LAND_MS = 300;
const HINT_KEY = 'b125.deckHint';
const readHint = () => { try { return Number(localStorage.getItem(HINT_KEY) || 0); } catch { return 9; } };
const bumpHint = () => { try { localStorage.setItem(HINT_KEY, String(readHint() + 1)); } catch { /* */ } };
const isReal = (c: Card) => c.id === c.r + c.s; // online hides other hands behind fake ids

function isFreshDeal(s: GameState) {
  const h0 = s.players[0]?.hand.length ?? 0;
  return s.phase === 'play' && s.pile.length === 1 && s.events.length === 0 && h0 > 0 && s.players.every(p => p.hand.length === h0);
}
const dealSig = (s: GameState) => `${s.round}:${s.pile[0]?.id}:${s.players.map(p => p.id).join(',')}:${s.players.map(p => p.hand.map(c => c.id).join('')).join('|')}`;

/* ---------- glyphs (no frames, just the mark) ---------- */
const IconMenu = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4 7h16M4 12h11M4 17h16" /></svg>);
const IconSmile = () => (<svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.2c1.9 2.2 5.1 2.2 7 0" /><circle cx="9.2" cy="10" r=".9" className="fillme" /><circle cx="14.8" cy="10" r=".9" className="fillme" /></svg>);
const IconClose = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M7 7l10 10M17 7L7 17" /></svg>);
const IconTap = () => (
  <svg viewBox="0 0 40 48" aria-hidden className="tapicon">
    <circle cx="16" cy="12" r="9" className="ripple" />
    <path d="M14 12.5v15.5l-3.2-3.3a2.6 2.6 0 0 0-3.8 3.6l7.6 8.6c1.6 1.9 3.6 2.8 6 2.8h3.4c4.4 0 7.6-3.4 7.6-7.8v-8c0-1.5-1.1-2.6-2.5-2.6s-2.5 1.1-2.5 2.6v-1.4c0-1.5-1.1-2.6-2.5-2.6s-2.5 1.1-2.5 2.6v-1.2c0-1.5-1.1-2.6-2.5-2.6S19 19.2 19 20.6v-8.1c0-1.4-1.1-2.5-2.5-2.5S14 11.1 14 12.5z" />
  </svg>
);

/* ---------- seat badge ---------- */
interface SeatProps {
  name: string; face: string; score: number; turn: boolean; thinking?: boolean; offline?: boolean; mine?: boolean;
  ring?: ReactNode; emote?: ReactNode; burned?: boolean; count: number; ptsLabel: string;
}
function SeatBadge({ name, face, score, turn, thinking, offline, mine, ring, emote, burned, count, ptsLabel }: SeatProps) {
  const prev = useRef(score);
  const [delta, setDelta] = useState<{ id: number; d: number; burn: boolean } | null>(null);
  useEffect(() => {
    const d = score - prev.current; prev.current = score;
    if (d > 0 || (burned && score === 0)) {
      const id = Date.now() + Math.random();
      setDelta({ id, d, burn: !!burned && score === 0 });
      const tm = setTimeout(() => setDelta(x => (x?.id === id ? null : x)), 2600);
      return () => clearTimeout(tm);
    }
  }, [score, burned]);
  const tone = scoreTone(score);
  return (
    <div className={`sbadge ${mine ? 'mine' : ''} ${turn ? 'turn' : ''} ${offline ? 'off' : ''} t-${tone}`}>
      <div className="avwrap">
        <div className="av">{face}</div>
        {ring}
        {emote}
        {!mine && count > 0 && <span className="cnt" aria-label={`${count}`}>{count}</span>}
      </div>
      <div className="meta">
        <div className="nm">{thinking ? <span className="dots"><i /><i /><i /></span> : name}</div>
        <div className="scrow">
          <span className="num serif"><CountUp value={score} /></span>
          <span className="unit">{ptsLabel}</span>
        </div>
        <ScoreBar score={score} />
      </div>
      <AnimatePresence>
        {delta && (
          <motion.div key={delta.id} className={`delta ${delta.burn ? 'burn' : ''}`}
            initial={{ opacity: 0, y: 8, scale: 0.7 }} animate={{ opacity: 1, y: -26, scale: 1 }} exit={{ opacity: 0, y: -46 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            {delta.burn ? `${RESET_AT} → 0` : `+${delta.d}`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =================================================================================== */

export function Table({ g, me, onAct, onNextRound, onRematch, onExit, deadline, turnMs = 30000, topCenter, emotes = [], onEmote, offline = [], dealAnimation = true, resultsDelayMs = 1500 }: TableProps) {
  const app = useApp();
  const { t, lang } = app;
  const s = useStrings(TABLE_STRINGS);
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<string[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [menu, setMenu] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [dragPt, setDragPt] = useState<{ x: number; y: number } | null>(null);
  const [hintCount, setHintCount] = useState(readHint);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({ w: Math.min(window.innerWidth, 4000) || 390, h: window.innerHeight || 800 }));

  useLayoutEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  /* ---------- displayed state: holds new states while the deal is playing, then replays them ---------- */
  const animDeal = dealAnimation && !reduce;
  const [shown, setShown] = useState<GameState>(g);
  const queue = useRef<GameState[]>([]);
  const [qTick, setQTick] = useState(0);
  const dealtSig = useRef<string | null>(null);
  type Deal = { sig: string; skip: boolean };
  const [dealing, setDealing] = useState<Deal | null>(() => {
    if (!animDeal || !isFreshDeal(g)) return null;
    dealtSig.current = dealSig(g);
    return { sig: dealtSig.current, skip: false };
  });
  const hold = !!dealing;

  useEffect(() => {
    if (g === shown) return;
    if (hold || queue.current.length) {
      queue.current.push(g);
      if (queue.current.length > 8) queue.current.splice(0, queue.current.length - 8);
      setQTick(x => x + 1);
    } else setShown(g);
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hold || !queue.current.length) return;
    const tm = setTimeout(() => {
      const nx = queue.current.shift();
      if (nx) setShown(nx);
      setQTick(x => x + 1);
    }, 420);
    return () => clearTimeout(tm);
  }, [hold, shown, qTick]);

  const vg = shown;
  const live = vg === g && !dealing;

  // new round → deal
  useLayoutEffect(() => {
    if (!animDeal || !isFreshDeal(vg)) return;
    const sig = dealSig(vg);
    if (dealtSig.current === sig) return;
    dealtSig.current = sig;
    setDealing({ sig, skip: false });
  }, [vg, animDeal]);

  useEffect(() => { setSel([]); }, [vg.seq]);

  const nameOf = useCallback((i: number) => (i === me ? t.you : vg.players[i]?.name ?? '?'), [vg.players, t.you, me]);

  /* ---------- voice assistant ---------- */
  useNarrator(vg, me, !dealing, lang);

  /* ---------- cinematic effects (positions come from the layout computed below, via a ref) ---------- */
  const [fx, setFx] = useState<FxItem[]>([]);
  const [shake, setShake] = useState<{ id: number; lvl: 1 | 2 } | null>(null);
  const fxId = useRef(0);
  const geo = useRef<{ pile: FxP; deck: FxP; suit: FxP; center: FxP; seat: (i: number) => FxP }>({
    pile: { x: 0, y: 0 }, deck: { x: 0, y: 0 }, suit: { x: 0, y: 0 }, center: { x: 0, y: 0 }, seat: () => ({ x: 0, y: 0 }),
  });
  const fxDone = useCallback((id: number) => setFx(list => list.filter(f => f.id !== id)), []);
  const quake = useCallback((lvl: 1 | 2) => { if (!reduce) setShake({ id: ++fxId.current, lvl }); }, [reduce]);
  useEffect(() => {
    if (!shake) return;
    const id = shake.id;
    const tm = setTimeout(() => setShake(x => (x?.id === id ? null : x)), shake.lvl === 2 ? 470 : 340);
    return () => clearTimeout(tm);
  }, [shake]);

  /* ---------- events → sound, haptics, banners ---------- */
  const bannerId = useRef(0);
  useEffect(() => {
    const ev = vg.events;
    if (!ev?.length) return;
    let b: Omit<Banner, 'id'> | null = null;
    const cur = { p: 0 };
    const G = geo.current;
    const add: Fx[] = [];
    const pend: (() => void)[] = [];
    const later = (f: () => void) => { pend.push(f); };
    const playEv = (ev as GameEvent[]).find((e): e is Extract<GameEvent, { t: 'play' }> => e.t === 'play');
    const last = playEv?.cards[playEv.cards.length - 1];
    const has = (k: GameEvent['t']) => (ev as GameEvent[]).some(e => e.t === k);
    if (playEv && last) {
      if ((last.r === 'J' || last.r === '9') && !has('roundEnd')) { add.push({ k: 'wild', at: G.pile, suit: last.s }); later(() => sfx.prism()); }
      if (last.r === '6' && has('mustCover') && !has('transfer')) { add.push({ k: 'six', at: G.pile }); later(() => sfx.shield()); }
      if (last.r === 'A') {
        const targets = (ev as GameEvent[]).filter((e): e is Extract<GameEvent, { t: 'skip' }> => e.t === 'skip').map(e => G.seat(e.p));
        if (targets.length) { add.push({ k: 'ace', from: G.seat(playEv.p), targets }); later(() => sfx.whoosh(playEv.p === me ? 1 : -1)); }
      }
    }
    const pick = (cand: Omit<Banner, 'id'>, pri: number) => { if (pri > cur.p) { b = cand; cur.p = pri; } };
    for (const e of ev as GameEvent[]) {
      const le = e as unknown as LooseEvent;
      if (le.t === 'bluffCaught') {
        later(() => sfx.reveal(le.p !== me)); buzz([40, 30, 40]); add.push({ k: 'bluff', at: G.pile, good: le.p !== me }); later(() => quake(1));
        const by = le.by ?? -1, p = le.p ?? -1;
        pick({ text: s.bluffCaught, sub: s.bluffCaughtSub(by === me ? t.you : nameOf(by), p === me ? t.you : nameOf(p)), tone: p === me ? 'bad' : 'good' }, 11);
        continue;
      }
      if (le.t === 'bluffWrong') {
        later(() => sfx.reveal(le.p !== me)); if (le.p === me) buzz([30, 40, 30]); add.push({ k: 'bluff', at: G.pile, good: le.p !== me });
        pick({ text: s.bluffWrong, sub: s.bluffWrongSub, tone: 'bad' }, 11);
        continue;
      }
      switch (e.t) {
        case 'play': sfx.play(); break;
        case 'draw': sfx.draw(); break;
        case 'reshuffle': sfx.shuffle(); pick({ text: t.ev.reshuffle, tone: 'info' }, 1); break;
        case 'queen': later(() => sfx.slam()); later(() => quake(2)); add.push({ k: 'queen', at: G.pile, target: G.seat(e.target) }); if (e.target === me) buzz([30, 40, 60]); pick({ text: e.target === me ? t.ev.queenYou : t.ev.queen(nameOf(e.target)), sub: t.ev.queenSub, tone: 'bad' }, 8); break;
        case 'transfer': later(() => sfx.mirror()); later(() => quake(1)); add.push({ k: 'transfer', at: G.pile, from: G.seat(e.p), target: G.seat(e.target) }); if (e.target === me) buzz([30, 40, 30]); pick({ text: e.target === me ? t.ev.transferYou : t.ev.transfer(nameOf(e.target)), tone: 'bad' }, 9); break;
        case 'eight': {
          const lvl = Math.max(1, Math.round(e.amount / 2));
          later(() => sfx.chain(lvl)); if (lvl >= 2) later(() => quake(1)); if (e.target === me) buzz(20 + lvl * 10);
          add.push({ k: 'eight', at: G.pile, target: G.seat(e.target), amount: e.amount, level: lvl });
          pick({ text: '8 · ' + (e.target === me ? t.ev.youTake(e.amount) : t.ev.eight(nameOf(e.target), e.amount)), tone: 'bad' }, 6); break;
        }
        case 'seven': later(() => sfx.flick()); add.push({ k: 'seven', from: G.deck, target: G.seat(e.target), amount: e.amount }); pick({ text: '7 · ' + (e.target === me ? t.ev.youTake(e.amount) : t.ev.seven(nameOf(e.target), e.amount)), tone: 'info' }, 4); break;
        case 'skip': pick({ text: e.p === me ? t.ev.youSkip : t.ev.skip(nameOf(e.p)), tone: 'info' }, 3); break;
        case 'suit': later(() => sfx.good()); add.push({ k: 'bloom', at: G.pile, suit: e.s }); pick({ text: t.ev.suit(nameOf(e.p), `${SUIT_GLYPH[e.s]} ${t.suitNames[e.s]}`), tone: 'info' }, 5); break;
        case 'kings': later(() => sfx.fanfare()); later(() => quake(2)); buzz(80); add.push({ k: 'kings', at: G.pile, seats: vg.players.map((_, i) => G.seat(i)) }); pick({ text: t.ev.kings, sub: t.ev.kingsSub, tone: 'good' }, 10); break;
        case 'reset125': later(() => sfx.burn()); add.push({ k: 'burn', at: G.seat(e.p) }); pick({ text: t.ev.reset125(nameOf(e.p)), tone: 'good' }, 10); break;
        case 'roundEnd':
          if (e.mult > 1) { later(() => sfx.slam()); later(() => quake(2)); add.push({ k: 'mult', at: G.center, mult: e.mult }); later(() => setTimeout(() => sfx.coin(), 380)); }
          else if (e.winner === me) later(() => sfx.coin());
          break;
        default: break;
      }
    }
    if (b) setBanner({ ...(b as Omit<Banner, 'id'>), id: ++bannerId.current });
    // the strong-card moment lands with the card: wait for its flight to the pile
    const fire = () => {
      pend.forEach(f => f());
      if (add.length) setFx(list => [...list.slice(-6), ...add.map(f => ({ ...f, id: ++fxId.current }) as FxItem)]);
    };
    if (!pend.length && !add.length) return;
    if (playEv && !reduce) { const tm = setTimeout(fire, LAND_MS); return () => { clearTimeout(tm); fire(); }; }
    fire();
  }, [vg.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!banner) return;
    const id = banner.id;
    const tm = setTimeout(() => setBanner(x => (x?.id === id ? null : x)), 2000);
    return () => clearTimeout(tm);
  }, [banner]);
  useEffect(() => { if (dealing) setBanner(null); }, [dealing]);

  useEffect(() => {
    if (vg.phase === 'roundOver' || vg.phase === 'gameOver') {
      const tm = setTimeout(() => setShowResult(true), resultsDelayMs);
      return () => clearTimeout(tm);
    }
    setShowResult(false);
  }, [vg.phase, vg.seq, resultsDelayMs]);

  /* ---------- parallax: pointer on desktop, device tilt where the browser allows it ---------- */
  const px = useMotionValue(0), py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 50, damping: 16 }), spy = useSpring(py, { stiffness: 50, damping: 16 });
  useEffect(() => {
    if (reduce) return;
    let base: number | null = null;
    const onOri = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (base == null) base = e.beta;
      px.set(Math.max(-1, Math.min(1, e.gamma / 25)));
      py.set(Math.max(-1, Math.min(1, (e.beta - base) / 25)));
    };
    window.addEventListener('deviceorientation', onOri);
    return () => window.removeEventListener('deviceorientation', onOri);
  }, [reduce, px, py]);
  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = stageRef.current?.getBoundingClientRect(); if (!r) return;
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const feltRY = useTransform(spx, v => v * 2.4);
  const feltRX = useTransform(spy, v => 15 - v * 1.6);
  const layerX = useTransform(spx, v => v * -6), layerY = useTransform(spy, v => v * -4);
  const seatX = useTransform(spx, v => v * -3), seatY = useTransform(spy, v => v * -2);
  const spotX = useTransform(spx, v => v * 26), spotY = useTransform(spy, v => v * 12);

  /* ---------- options ---------- */
  const o = options(vg, me) as Opts;
  const bluff = bluffOn(vg);
  const mine = vg.players[me];
  const act = (a: Action) => { setSel([]); onAct(a); };

  const onTapCard = (c: Card) => {
    if (!live || !o.mine) return;
    const legalIds = new Set(o.legal.map(x => x.id));
    if (sel.length) {
      if (sel.includes(c.id)) {
        if (sel.length === 1 && validatePlay(vg, me, sel) === null) { act({ type: 'play', cardIds: sel }); return; }
        setSel(sel.filter(i => i !== c.id)); sfx.tap(); return;
      }
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

  /* ---------- layout ---------- */
  const { w: W, h: H } = size;
  const desk = W >= 760 && H >= 560;
  const n = vg.players.length;
  const rel = (pi: number) => (pi - me + n) % n;
  const cw = Math.round(Math.min(desk ? 128 : 100, W * 0.24, H * (desk ? 0.14 : 0.125)));
  const ch = Math.round(cw * 1.43);
  const hs = desk ? 1 : 0.9;
  const oppScale = desk ? 0.5 : 0.36;
  const cx = W / 2;
  const TILT = 16;
  const handY = H - 14 - (ch * hs) / 2 - (desk ? 22 : 8);
  const myRowY = handY - (ch * hs) / 2 - (desk ? 40 : 34);
  const seatTop = desk ? 66 : 62;
  const seats = useMemo(() => {
    const top = seatTop;
    if (n === 2) return [{ x: cx, y: top }];
    if (n === 3) return desk ? [{ x: cx - 250, y: top + 10 }, { x: cx + 250, y: top + 10 }] : [{ x: W * 0.27, y: top }, { x: W * 0.73, y: top }];
    return desk
      ? [{ x: cx - 400, y: top + 70 }, { x: cx, y: top }, { x: cx + 400, y: top + 70 }]
      : [{ x: W * 0.17, y: top + 30 }, { x: cx, y: top }, { x: W * 0.83, y: top + 30 }];
  }, [n, W, cx, desk, seatTop]);
  const seatOf = (pi: number) => seats[rel(pi) - 1] ?? seats[0];
  const fanDY = (desk ? 118 : 104) + (ch * oppScale) / 2;
  const seatsBottom = Math.max(...seats.map(p => p.y)) + fanDY + (ch * oppScale) / 2;
  const tableY = Math.round(Math.max(seatsBottom + ch / 2 + 50, Math.min((seatsBottom + myRowY) / 2 + 6, myRowY - ch / 2 - (desk ? 128 : 96))));
  const deckPos = { x: cx - cw * (desk ? 0.95 : 0.78), y: tableY };
  const pilePos = { x: cx + cw * (desk ? 0.75 : 0.62), y: tableY };

  const feltTop = desk ? 100 : seatTop + 66;
  const feltBottom = desk ? H - 60 : H - 6;
  const feltW = desk ? Math.min(W - 120, 1240) : W - 14;
  const feltH = feltBottom - feltTop;
  const feltR = Math.min(feltW, feltH) / 2;

  const poses = new Map<string, Pose>();
  const deckPose = (i = 0): Pose => ({ x: deckPos.x - i * 1.4, y: deckPos.y - i * 1.8, rot: -2, scale: 1, z: 10 - i, up: false, rx: TILT });
  vg.deck.slice(0, 3).forEach((c, i) => poses.set(c.id, deckPose(i)));
  const pileShown = vg.pile.slice(-7);
  const pilePose = (c: Card, i: number): Pose => {
    const hh = [...c.id].reduce((a, ch2) => a + ch2.charCodeAt(0) * 31, 7);
    return { x: pilePos.x + ((hh * 13) % 14) - 7, y: pilePos.y + ((hh * 7) % 10) - 5, rot: ((hh * 37) % 34) - 17, scale: 1, z: 20 + i, up: true, rx: TILT };
  };
  pileShown.forEach((c, i) => poses.set(c.id, pilePose(c, i)));
  const reveal = vg.phase === 'roundOver' || vg.phase === 'gameOver';
  const oppPose = (pi: number, i: number, cnt: number): Pose => {
    const st = seatOf(pi);
    const spread = Math.min(desk ? 15 : 12, 120 / Math.max(1, cnt));
    const k = i - (cnt - 1) / 2;
    return { x: st.x + k * spread, y: st.y + fanDY + Math.abs(k) * 0.8, rot: k * 4, scale: oppScale, z: 30 + i, up: false, rx: 12 };
  };
  vg.players.forEach((p, pi) => {
    if (pi === me) return;
    p.hand.forEach((c, i) => {
      const ps = oppPose(pi, i, p.hand.length);
      poses.set(c.id, reveal && isReal(c) ? { ...ps, up: true, scale: oppScale * 1.35, y: ps.y + 6, x: seatOf(pi).x + (i - (p.hand.length - 1) / 2) * Math.min(desk ? 34 : 26, 150 / Math.max(1, p.hand.length)) } : ps);
    });
  });
  const mh = mine.hand;
  const hn = mh.length;
  const hcw = cw * hs;
  const avail = Math.min(W - 24, desk ? 820 : W) - hcw;
  const step = hn > 1 ? Math.min(hcw * (desk ? 0.7 : 0.62), avail / (hn - 1)) : 0;
  const rotStep = Math.min(5, 36 / Math.max(1, hn));
  const handPose = (i: number): Pose => {
    const k = i - (hn - 1) / 2;
    return { x: cx + k * step, y: handY + k * k * (hn > 8 ? 0.55 : 1.5), rot: k * rotStep, scale: hs, z: 100 + i, up: true, rx: 7 };
  };
  mh.forEach((c, i) => poses.set(c.id, handPose(i)));

  /* ---------- flights: dealing show, cards appearing from the deck or another seat ---------- */
  const flights = new Map<string, Flight>();
  const seen = useRef<Set<string>>(new Set());
  const ready = useRef(false);
  const kround = vg.round;
  const keyOf = (c: Card) => `${kround}:${c.id}`;
  let dealEnd = 0;
  if (dealing) {
    const total = vg.players.reduce((a, p) => a + p.hand.length, 0);
    const iv = Math.max(0.06, Math.min(0.12, 1.25 / Math.max(1, total)));
    const t0 = 0.32, fd = 0.5;
    const from = deckPose(0);
    const lastLand = t0 + (total - 1) * iv + fd;
    vg.players.forEach((p, pi) => {
      const j = (pi - vg.starter + n + 1) % n;
      p.hand.forEach((c, i) => {
        const delay = t0 + (i * n + j) * iv;
        if (dealing.skip) { flights.set(c.id, { key: 'skip' + dealing.sig, instant: true }); return; }
        if (pi === me) {
          const k = i - (p.hand.length - 1) / 2;
          const via: Pose = { x: cx + k * 2.5, y: handY + 4, rot: k * 1.2, scale: hs, z: 100 + i, up: false, rx: 7 };
          const settleAt = lastLand + 0.08 + i * 0.045;
          flights.set(c.id, { key: 'deal' + dealing.sig, from, delay, dur: fd, via, settleAt, flipAt: settleAt + 0.12 + i * 0.03, spin: 360 });
          dealEnd = Math.max(dealEnd, settleAt + 0.7);
        } else {
          flights.set(c.id, { key: 'deal' + dealing.sig, from, delay, dur: fd, spin: 360 });
        }
      });
    });
    const top = vg.pile[vg.pile.length - 1];
    if (top) {
      const d = t0 + total * iv + 0.05;
      flights.set(top.id, dealing.skip ? { key: 'skip' + dealing.sig, instant: true } : { key: 'deal' + dealing.sig, from, delay: d, dur: 0.55, flipAt: Math.max(d + 0.55, lastLand + 0.15), flourish: true });
      dealEnd = Math.max(dealEnd, Math.max(d + 0.55, lastLand + 0.15) + 0.9);
    }
    dealEnd = Math.max(dealEnd, lastLand + 0.3);
  } else if (ready.current) {
    const fromSeat = new Map<string, Pose>();
    for (const e of vg.events ?? []) if (e.t === 'play' && e.p !== me) for (const c of e.cards) fromSeat.set(c.id, { ...oppPose(e.p, 0, 1), up: false });
    for (const [id, ps] of poses) {
      if (seen.current.has(`${kround}:${id}`)) continue;
      if (ps.z >= 100 || (ps.z >= 30 && ps.z < 100)) flights.set(id, { key: 'in', from: { ...deckPose(0), z: 400 } });
      else if (fromSeat.has(id)) flights.set(id, { key: 'in', from: fromSeat.get(id) });
    }
  }
  const allCards: Card[] = [...vg.deck.slice(0, 3), ...pileShown, ...vg.players.flatMap(p => p.hand)];
  useLayoutEffect(() => { seen.current = new Set(allCards.map(keyOf)); ready.current = true; });

  // deal timeline: sounds, end, skip
  useEffect(() => {
    if (!dealing) return;
    if (dealing.skip) { const tm = setTimeout(() => setDealing(null), 380); return () => clearTimeout(tm); }
    sfx.shuffle();
    const total = vg.players.reduce((a, p) => a + p.hand.length, 0);
    const iv = Math.max(0.06, Math.min(0.12, 1.25 / Math.max(1, total)));
    const ticks: number[] = [];
    for (let i = 0; i < total; i++) ticks.push(window.setTimeout(() => sfx.draw(), (0.32 + i * iv + 0.42) * 1000));
    ticks.push(window.setTimeout(() => sfx.play(), (dealEnd - 0.9) * 1000));
    const tm = setTimeout(() => setDealing(null), dealEnd * 1000);
    return () => { clearTimeout(tm); ticks.forEach(clearTimeout); };
  }, [dealing]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipDeal = () => { if (dealing && !dealing.skip) setDealing({ ...dealing, skip: true }); };

  /* ---------- derived UI state ---------- */
  const legalSet = new Set(o.legal.map(c => c.id));
  const selValid = sel.length ? validatePlay(vg, me, sel) === null : false;
  const selFirst = mine.hand.find(h => h.id === sel[0]);
  const isCombo = sel.length === 2 && !!selFirst && isQS(selFirst) && is6S(mine.hand.find(h => h.id === sel[1])!);
  const topCard = vg.pile[vg.pile.length - 1];
  const suitChanged = !!topCard && topCard.r === 'J';
  const playing = vg.phase === 'play' || vg.phase === 'chooseSuit';
  const canAct = live && o.mine;

  const deckAction: 'accept' | 'draw' | 'pass' | null = !canAct ? null : o.canAccept ? 'accept' : o.canDraw ? 'draw' : o.canPass ? 'pass' : null;
  const deckLabel = deckAction === 'accept' ? s.deckTake(vg.pending?.amount ?? 0) : deckAction === 'draw' ? s.deckDraw : deckAction === 'pass' ? s.deckPass : '';
  const lastDeck = useRef(0);
  const onDeck = () => {
    if (dealing) { skipDeal(); return; }
    if (!deckAction) return;
    const now = Date.now();
    if (now - lastDeck.current < 550) return;
    lastDeck.current = now;
    if (deckAction === 'draw') { bumpHint(); setHintCount(c => c + 1); }
    buzz(10);
    act({ type: deckAction });
  };
  const showTapHint = deckAction === 'draw' && hintCount < 2 && (o.legal.length === 0 || vg.round === 1);

  const pileHit = (pt: { x: number; y: number }) => {
    const r = stageRef.current?.getBoundingClientRect(); if (!r) return false;
    const lx = pt.x - r.left, ly = pt.y - r.top;
    return Math.abs(lx - pilePos.x) < cw * 0.95 && Math.abs(ly - pilePos.y) < ch * 0.85;
  };
  const dropOnPile = (c: Card) => (pt: { x: number; y: number }) => {
    if (!canAct || !pileHit(pt)) return false;
    const ids = sel.includes(c.id) && selValid ? sel : [c.id];
    if (validatePlay(vg, me, ids) !== null) { buzz(15); return false; }
    act({ type: 'play', cardIds: ids });
    return true;
  };
  const dragOverPile = !!dragPt && pileHit(dragPt);
  const pileTarget = canAct && (sel.length > 0 && selValid);

  let status = '';
  if (dealing) status = s.dealing;
  else if (o.mine) {
    const p = vg.pending;
    if (p?.kind === 'queen') status = t.ev.queenYou;
    else if (p?.kind === 'queen6') status = t.ev.transferYou;
    else if (p) status = t.take(p.amount);
    else if (vg.mustCover) status = t.coverSix;
    else status = t.yourTurn;
  } else if (playing && vg.current !== me) {
    status = t.waiting(nameOf(vg.current));
  }

  const avSize = desk ? 46 : 40;
  const remaining = deadline ? Math.max(0, deadline - Date.now()) : 0;
  const ring = (sz: number) => deadline && playing ? (
    <svg key={deadline} className="tring" width={sz + 10} height={sz + 10} style={{ position: 'absolute', left: -5, top: -5, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
      <circle cx={(sz + 10) / 2} cy={(sz + 10) / 2} r={sz / 2 + 2} fill="none" stroke="var(--acc-hi)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={Math.PI * (sz + 4)} strokeDashoffset={Math.PI * (sz + 4) * (1 - remaining / turnMs)}
        style={{ animation: `ringdown ${remaining}ms linear forwards`, ['--len' as string]: `${Math.PI * (sz + 4)}` }} />
    </svg>
  ) : null;
  const emoteBubble = (seat: number) => (
    <AnimatePresence>
      {emotes.filter(x => x.seat === seat).slice(-1).map(x => (
        <motion.div key={x.id} className="emo" initial={{ scale: 0, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}>{x.e}</motion.div>
      ))}
    </AnimatePresence>
  );
  const myLeft = desk ? Math.max(18, cx - 430) : 12;
  geo.current = {
    pile: { x: pilePos.x, y: tableY }, deck: { x: deckPos.x, y: tableY },
    suit: { x: Math.min(W - 34, pilePos.x + cw * 0.98), y: tableY },
    center: { x: cx, y: tableY - ch * 0.15 },
    seat: (i: number) => (i === me ? { x: myLeft + avSize / 2, y: myRowY + 2 } : { x: seatOf(i).x, y: seatOf(i).y - 6 + avSize / 2 }),
  };
  const lr = vg.lastResult;
  const burnedSet = new Set(reveal && lr ? lr.rows.filter(r => r.reset).map(r => r.p) : []);

  return (
    <div className={`stage tbl ${desk ? 'desk' : ''} ${dealing ? 'is-dealing' : ''} ${shake ? `fxshake-${shake.lvl}` : ''}`} ref={stageRef} onPointerMove={onPointerMove}
      onPointerDownCapture={() => { if (dealing) skipDeal(); }}
      style={{ ['--cw' as string]: `${cw}px` }}>

      {/* room + table plane */}
      <div className="room" aria-hidden />
      <motion.div className="tableplane" aria-hidden
        style={{ left: (W - feltW) / 2, top: feltTop, width: feltW, height: feltH, borderRadius: feltR, rotateX: reduce ? 15 : feltRX, rotateY: reduce ? 0 : feltRY, transformPerspective: 1300 }}>
        <div className="rail" style={{ borderRadius: feltR }} />
        <div className="felt" style={{ borderRadius: Math.max(0, feltR - 14) }}>
        </div>
      </motion.div>
      <motion.div className="spot" aria-hidden style={{ x: spotX, y: spotY }} />
      <div className="feltclick" onClick={() => setSel([])} aria-hidden />

      {/* top bar */}
      <div className="tbar">
        <button className="glyph" aria-label={s.menu} title={s.menu} onClick={() => setMenu(true)}><IconMenu /></button>
        <div className="tcenter">
          {topCenter ?? null}
          <div className="rnd serif">{t.round(vg.round)}</div>
          <div className="rules">
            <span><i className="lg125" />{s.rule125}</span>
            <span><i className="lg130" />{s.rule130}</span>
          </div>
        </div>
        <QuickAudio />
      </div>

      {/* opponents */}
      <motion.div className="seats" style={{ x: seatX, y: seatY }}>
        {vg.players.map((p, pi) => pi === me ? null : (
          <div key={p.id} className="seatpos" style={{ left: seatOf(pi).x, top: seatOf(pi).y - 6 }}>
            <SeatBadge name={p.name} face={p.bot ? '🤖' : p.name.slice(0, 1).toUpperCase()} score={p.score} count={p.hand.length}
              turn={vg.current === pi && playing && !dealing} thinking={vg.current === pi && playing && !dealing} offline={offline.includes(pi)}
              ring={vg.current === pi && !dealing ? ring(avSize) : null} emote={emoteBubble(pi)} burned={burnedSet.has(pi)} ptsLabel={s.pts} />
          </div>
        ))}
      </motion.div>

      {/* active suit */}
      <motion.div key={vg.activeSuit + String(suitChanged)} className={`suitmed ${suitChanged ? 'hot' : ''}`}
        initial={{ scale: 0.4, opacity: 0, rotateY: 180 }} animate={{ scale: 1, opacity: dealing ? 0 : 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 17 }}
        style={{ left: Math.min(W - 34, pilePos.x + cw * 0.98) - 26, top: tableY - 26 }} aria-label={t.suitNames[vg.activeSuit]}>
        <span style={{ color: isRed(vg.activeSuit) ? '#ff7a8c' : '#f4f1e6' }}>{SUIT_GLYPH[vg.activeSuit]}</span>
      </motion.div>

      {/* cards */}
      <motion.div className="cards" style={{ x: layerX, y: layerY }}>
        {/* deck body + inviting halo */}
        <div className={`deckbody ${vg.deck.length === 0 ? 'empty' : ''}`} style={{ left: deckPos.x - cw / 2, top: tableY - ch / 2, width: cw, height: ch, ['--depth' as string]: Math.min(10, Math.ceil(vg.deck.length / 3)) }} />
        <div className={`halo deckhalo ${deckAction ? 'on' : ''} ${deckAction === 'accept' ? 'bad' : ''}`} style={{ left: deckPos.x - cw / 2, top: tableY - ch / 2, width: cw, height: ch }} />
        <div className={`halo pilehalo ${pileTarget || dragOverPile ? 'on' : ''} ${dragOverPile ? 'over' : ''}`} style={{ left: pilePos.x - cw / 2, top: tableY - ch / 2, width: cw, height: ch }} />

        {allCards.map(c => {
          const pose = poses.get(c.id)!;
          const isMine = mine.hand.some(h => h.id === c.id);
          const legal = isMine && canAct && !bluff && !sel.length && legalSet.has(c.id);
          const selected = sel.includes(c.id);
          const addable = isMine && sel.length > 0 && !selected && !!selFirst && (c.r === selFirst.r || (isQS(selFirst) && is6S(c) && sel.length === 1));
          const canDrag = isMine && canAct && !reduce && (legalSet.has(c.id) || selected) && !o.forcedDraw;
          return (
            <CardView key={keyOf(c)} card={c} lang={lang} w={cw} pose={pose} flight={flights.get(c.id)}
              legal={legal || addable} sel={selected}
              dim={isMine && canAct && !bluff && !legal && !selected && !addable && !o.forcedDraw && !sel.length}
              onTap={isMine && canAct ? () => onTapCard(c) : undefined}
              draggable={canDrag} onDrop={canDrag ? dropOnPile(c) : undefined} onDragMove={canDrag ? setDragPt : undefined} />
          );
        })}

        <button className={`hit deckhit ${deckAction ? 'on' : ''}`} style={{ left: deckPos.x - cw / 2 - 10, top: tableY - ch / 2 - 10, width: cw + 20, height: ch + 20 }}
          aria-label={deckLabel ? `${s.deckAria}: ${deckLabel}` : s.deckAria} aria-disabled={!deckAction} onClick={onDeck} />
        {pileTarget && (
          <button className="hit pilehit" style={{ left: pilePos.x - cw / 2 - 10, top: tableY - ch / 2 - 10, width: cw + 20, height: ch + 20 }}
            aria-label={isCombo ? s.comboHere : s.playHere(sel.length)} onClick={() => act({ type: 'play', cardIds: sel })} />
        )}
      </motion.div>

      {/* labels that float over the deck / pile */}
      <AnimatePresence>
        {deckAction && !dealing && (
          <motion.div key={'dl' + deckAction} className={`floatlabel ${deckAction === 'accept' ? 'bad' : ''}`} style={{ left: deckPos.x, top: tableY - ch / 2 - 30 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            {deckLabel}
          </motion.div>
        )}
        {(pileTarget || dragOverPile) && (
          <motion.div key="pl" className="floatlabel" style={{ left: pilePos.x, top: tableY - ch / 2 - 30 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            {dragOverPile ? s.dropHere : isCombo ? t.comboQ6 : t.playN(sel.length)}
          </motion.div>
        )}
        {showTapHint && !dealing && (
          <motion.div key="tap" className="taphint" style={{ left: deckPos.x, top: tableY + ch / 2 - 18 }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.5 }}>
            <IconTap />
            <span>{s.tapDeck}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {sel.length > 0 && canAct && (
        <button className="glyph cancelsel" style={{ left: pilePos.x + cw / 2 + 6, top: tableY + ch / 2 - 12 }} aria-label={s.cancel} title={s.cancel} onClick={() => setSel([])}><IconClose /></button>
      )}

      {/* cinematic effects for strong cards */}
      <StageFx items={fx} reduce={!!reduce} cw={cw} w={W} h={H} onDone={fxDone} />

      {/* bluff call-out */}
      <AnimatePresence>
        {live && o.canChallenge && (
          <motion.button key="bluff" className="bluffbtn" style={{ left: (deckPos.x + pilePos.x) / 2, top: tableY - 42 }}
            aria-label={s.bluffAria} onClick={() => { buzz([20, 30, 20]); sfx.alert(); onAct({ type: 'challenge' } as unknown as Action); }}
            initial={{ opacity: 0, scale: 0.4, rotate: -14 }} animate={{ opacity: 1, scale: 1, rotate: -4 }} exit={{ opacity: 0, scale: 0.6 }}
            whileHover={{ scale: 1.08, rotate: 0 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 360, damping: 14 }}>
            <svg className="bluffring" viewBox="0 0 100 100" aria-hidden><circle cx="50" cy="50" r="46" /></svg>
            <span className="serif">{s.bluff}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* banners */}
      <AnimatePresence>
        {banner && !showResult && !(vg.phase === 'chooseSuit' && vg.current === me) && (
          <motion.div key={banner.id} className="banner" style={{ top: tableY - ch / 2 - 92 }}
            initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
            <div className={`pill ${banner.tone}`}>{banner.text}</div>
            {banner.sub && <div className="sub">{banner.sub}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* status line */}
      <div className="statusline" style={{ top: myRowY - 52 }}>
        <AnimatePresence mode="wait">
          <motion.div key={status} className={`st ${o.mine && !dealing ? 'mine' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {status}
            {dealing && <span className="skiphint">{s.tapToSkip}</span>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* my seat */}
      <div className="myrow" style={{ top: myRowY - 24, left: myLeft, right: myLeft }}>
        <SeatBadge mine name={app.name || t.you} face={app.avatar || (mine.name || t.you).slice(0, 1).toUpperCase()} score={mine.score} count={hn}
          turn={o.mine && !dealing} offline={false} ring={vg.current === me && !dealing ? ring(avSize) : null} emote={emoteBubble(me)}
          burned={burnedSet.has(me)} ptsLabel={s.pts} />
        {onEmote && (
          <div className="emotewrap">
            <button className="glyph" aria-label={s.emote} title={s.emote} aria-expanded={emoteOpen} onClick={() => setEmoteOpen(v => !v)}><IconSmile /></button>
            <AnimatePresence>
              {emoteOpen && (
                <motion.div className="emotes" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.9 }}>
                  {EMOTES.map((e, i) => (
                    <motion.button key={e} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      whileHover={{ scale: 1.2, y: -3 }} whileTap={{ scale: 0.8 }} aria-label={e} onClick={() => { onEmote(e); setEmoteOpen(false); }}>{e}</motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* suit chooser */}
      <AnimatePresence>
        {live && vg.phase === 'chooseSuit' && vg.current === me && (
          <motion.div className="scrim suitpick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="suitpick-in">
              <div className="serif ttl">{t.chooseSuit}</div>
              <div className="suitgrid">
                {SUITS.map((su: Suit, i) => (
                  <motion.button key={su} className={`suitbtn ${isRed(su) ? 'red' : ''}`} onClick={() => act({ type: 'suit', suit: su })}
                    initial={{ opacity: 0, y: 24, rotateX: -60 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 18 }}
                    whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.92 }} aria-label={t.suitNames[su]}>
                    <span className="g">{SUIT_GLYPH[su]}</span>
                    <span className="nm">{t.suitNames[su]}</span>
                    <span className="ct">{mine.hand.filter(c => c.s === su).length}×</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && vg.lastResult && (
          <Results g={vg} me={me}
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
