import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardFace } from '../../components/CardFace';
import { CardView, type Flight, type Pose } from '../../components/CardView';
import type { Lang } from '../../i18n';
import { after } from '../../components/stageClock';
import { AvatarFrame } from '../../cosmetics/AvatarFrame';
import { PlayerName, TitleBadge } from '../../cosmetics/Badges';
import { botLook, type SeatLook } from '../../cosmetics/seatLooks';
import { useCosmetics } from '../../cosmetics/useCosmetics';
import { useStrings } from '../../i18n/pick';
import { FAST_TEMPO, dealTimeline, prefersReducedMotion } from '../../pace';
import { buzz, sfx } from '../../sound';
import { useApp } from '../../store';
import { QuickAudio } from '../../voice/AudioControls';
import { CountUp } from './CountUp';
import {
  type Action, type Play, type Suit, type TCard, type TState, GLYPH, MARRIAGE, N, actor, bidOptions, canDeclare, contractOptions, firstHand,
  lastBid, legalCards, nextSeat, sortHand, sumPoints, takenBy, trickWinnerIndex, makeRng,
} from './engine';
import { botAction, suggestBid, type TLevel } from './bot';
import { THOUSAND } from './strings';
import { TITLES } from './titles';
import { bumpDeals, dealsSeen, markTip, tipSeen } from './save';
import { ScoreSheet } from './ScoreSheet';
import { Barrel, Bolt } from './icons';
import { RulesSheet } from './RulesSheet';
import '../../styles/table.css';
import './thousand.css';

/* ------------------------------------------------------------------ glyphs */
const IconMenu = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4 7h16M4 12h11M4 17h16" /></svg>);
const IconFast = () => (<svg viewBox="0 0 24 24" aria-hidden><path className="ch1" d="M5.5 6.5L11 12l-5.5 5.5" /><path className="ch2" d="M12.5 6.5L18 12l-5.5 5.5" /></svg>);
const IconBook = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M5 5.5c2.4-1 4.6-1 7 .6 2.4-1.6 4.6-1.6 7-.6v13c-2.4-1-4.6-1-7 .6-2.4-1.6-4.6-1.6-7-.6z" /><path d="M12 6.1v13" /></svg>);
const IconPeek = () => (<svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="6.5" width="8" height="11.5" rx="1.6" transform="rotate(-12 8 12)" /><rect x="11" y="5.5" width="8" height="11.5" rx="1.6" transform="rotate(10 15 11)" /></svg>);
const IconSheet = () => (<svg viewBox="0 0 24 24" aria-hidden><rect x="5" y="3.5" width="14" height="17" rx="2.2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></svg>);
/* ------------------------------------------------------------------ timing */
const HOLD_MS = 1050;             // a finished trick rests in the middle this long, then flies to its winner
const REVEAL_MS = 1700;           // the talon lies face up in the middle before the declarer takes it
const MARRIAGE_MS = 1900;         // the marriage show
const BOT_MS = { bid: 900, give: 1300, contract: 1100, play: 820, jitter: 420 };

/** One card at a time from the dealer's left; the talon's 3 cards go down after the first round. */
function dealOrder(g: TState): Map<string, number> {
  const fh = firstHand(g);
  const order = new Map<string, number>();
  g.hands.forEach((h, p) => {
    const j = (p - fh + N) % N;
    h.forEach((c, r) => order.set(c.id, r === 0 ? j : 6 + (r - 1) * N + j));
  });
  g.talon.forEach((c, i) => order.set(c.id, N + i));
  return order;
}
const isFreshDeal = (g: TState) => g.phase === 'bid' && g.bids.length === 1 && g.hands.every(h => h.length === 7);

export interface ThousandGameProps {
  g: TState;
  level: TLevel;
  fast: boolean;
  onToggleFast: () => void;
  onAct: (a: Action) => void;
  onBot: (seq: number, p: number, a: Action) => void;
  /** online table (src/games/online): the server plays the bots — no local bot timers */
  remote?: boolean;
  onExit: () => void;
  onNewGame: () => void;
  /** game over: open the shared result sheet */
  onResults: () => void;
}

export function ThousandGame({ g, level, fast, onToggleFast, onAct, onBot, onExit, onNewGame, onResults, remote }: ThousandGameProps) {
  const app = useApp();
  const { t, lang } = app;
  const s = useStrings(THOUSAND);
  const cos = useCosmetics();
  const reduce = useReducedMotion();
  const me = 0;
  const tempo = fast ? FAST_TEMPO : 1;
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({ w: window.innerWidth || 390, h: window.innerHeight || 800 }));
  useLayoutEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const names = useMemo(() => g.players.map((p, i) => (i === me ? (app.name || t.you) : p.name)), [g.players, app.name, t.you]);
  const nameOf = useCallback((p: number) => (p === me ? s.you : names[p] ?? '?'), [names, s.you]);
  const who0 = (p: number) => (p === me ? null : names[p]);
  const looks: (SeatLook | null)[] = useMemo(() => g.players.map((p, i) => (p.bot ? botLook(level, i) : null)), [level, g.players]);

  /* ---------- the deal show ---------- */
  const animDeal = !reduce && !prefersReducedMotion();
  const [dealt, setDealt] = useState(() => (isFreshDeal(g) && animDeal ? g.dealNo - 1 : g.dealNo));
  const [skipDeal, setSkipDeal] = useState(-1);
  const dealing = animDeal && dealt !== g.dealNo && isFreshDeal(g);
  const dealTempo = useRef(tempo);
  if (!dealing) dealTempo.current = tempo;

  /* ---------- the talon reveal (face up in the middle, then into the declarer's hand) ---------- */
  const [revealed, setRevealed] = useState(() => (g.phase === 'bid' ? -1 : g.dealNo));
  const revealing = g.talonShown.length > 0 && revealed !== g.dealNo && (g.phase === 'give' || g.phase === 'contract');
  useEffect(() => {
    if (!revealing) return;
    const deal = g.dealNo;
    sfx.flip();
    const tm = after(REVEAL_MS * tempo, () => { setRevealed(deal); sfx.draw(); });
    return () => tm();
  }, [revealing, g.dealNo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- trick collection ---------- */
  const [collected, setCollected] = useState(() => ({ deal: g.dealNo, n: g.tricks.length }));
  const doneN = collected.deal === g.dealNo ? collected.n : 0;
  const collectIdx = g.tricks.length > doneN ? g.tricks.length - 1 : null;
  useEffect(() => {
    if (collectIdx == null) return;
    const deal = g.dealNo, n = g.tricks.length;
    const tm = after(HOLD_MS * tempo, () => { setCollected({ deal, n }); sfx.draw(); });
    return () => tm();
  }, [collectIdx, g.dealNo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- the marriage show ---------- */
  const [mar, setMar] = useState<{ id: number; p: number; s: Suit } | null>(null);

  /* ---------- overlays ---------- */
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPeek, setSheetPeek] = useState(false);
  const [peek, setPeek] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [ask, setAsk] = useState<string | null>(null);
  const over = g.phase === 'dealOver' || g.phase === 'gameOver';
  const busy = dealing || collectIdx != null || revealing || !!mar;
  useEffect(() => {
    if (!over) { setSheetOpen(false); return; }
    if (busy) return;
    const tm = setTimeout(() => setSheetOpen(true), 800 * tempo);
    return () => clearTimeout(tm);
  }, [over, busy, g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSel([]); setAsk(null); }, [g.phase, g.dealNo]);

  /* ---------- bots ---------- */
  const who = actor(g);
  const paused = menu || rules || sheetPeek;
  useEffect(() => {
    if (remote || who == null || !g.players[who]?.bot || busy || paused) return;
    const base = g.phase === 'bid' ? BOT_MS.bid : g.phase === 'give' ? BOT_MS.give : g.phase === 'contract' ? BOT_MS.contract : BOT_MS.play + (g.trick.length === 0 ? 180 : 0);
    const delay = (base + Math.random() * BOT_MS.jitter) * (fast ? 0.5 : 1);
    const seq = g.seq, p = who;
    // the bots' choices come from the deal's generator too: a seeded challenge replays the same way on every device
    const tm = setTimeout(() => { const a = botAction(g, p, level, makeRng((g.rng ^ Math.imul(seq + 1, 0x9e3779b1) ^ Math.imul(p + 1, 0x85ebca6b)) >>> 0)); if (a) onBot(seq, p, a); }, delay);
    return () => clearTimeout(tm);
  }, [g.seq, busy, paused, fast]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- sounds, banners ---------- */
  const [banner, setBanner] = useState<{ id: number; text: string; sub?: string; tone: 'good' | 'info' | 'bad' } | null>(null);
  const prev = useRef(g);
  useEffect(() => {
    const p = prev.current; prev.current = g;
    if (p === g || p.dealNo !== g.dealNo) return;
    if (g.trick.length > p.trick.length || g.tricks.length > p.tricks.length) {
      sfx.play();
      // a marriage is always a lead: it is the first card of the trick in progress
      const played = g.trick.length > p.trick.length ? g.trick[g.trick.length - 1] : null;
      if (played?.m) {
        sfx.big(); buzz([14, 30, 14]);
        setMar({ id: Date.now(), p: played.p, s: played.c.s });
      }
    }
    if (g.bids.length > p.bids.length) {
      const b = g.bids[g.bids.length - 1];
      if (b.bid === 0) sfx.tap(); else { sfx.good(); buzz(8); }
    }
    if (p.phase === 'bid' && g.phase === 'give') {
      setBanner({ id: Date.now(), text: s.takes(who0(g.declarer), g.high), tone: g.declarer === me ? 'good' : 'info' });
    }
    if (p.phase === 'contract' && g.phase === 'play') {
      sfx.stamp();
      setBanner({ id: Date.now(), text: s.plays(who0(g.declarer), g.contract), sub: g.contract > g.high ? `${g.high} → ${g.contract}` : undefined, tone: g.declarer === me ? 'good' : 'info' });
    }
    if ((g.phase === 'dealOver' || g.phase === 'gameOver') && p.phase === 'play') bumpDeals();
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!banner) return;
    const id = banner.id;
    const tm = setTimeout(() => setBanner(b => (b?.id === id ? null : b)), 2100);
    return () => clearTimeout(tm);
  }, [banner]);
  useEffect(() => {
    if (!mar) return;
    const id = mar.id;
    const tm = after(MARRIAGE_MS * tempo, () => setMar(m => (m?.id === id ? null : m)));
    return () => tm();
  }, [mar]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- parallax ---------- */
  const px = useMotionValue(0), py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 50, damping: 16 }), spy = useSpring(py, { stiffness: 50, damping: 16 });
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

  /* ---------- layout ---------- */
  const { w: W, h: H } = size;
  const desk = W >= 760 && H >= 560;
  const cw = Math.round(Math.min(desk ? 116 : 94, W * 0.23, H * (desk ? 0.13 : 0.116)));
  const ch = Math.round(cw * 1.43);
  const hs = desk ? 1 : 0.92;
  const cx = W / 2;
  const TILT = 14;
  const handY = H - 16 - (ch * hs) / 2 - 26;
  const myRowY = handY - (ch * hs) / 2 - (desk ? 40 : 32);
  const seatTop = desk ? 72 : 66;
  const seatPos = [
    { x: cx, y: myRowY },
    { x: desk ? cx - Math.min(330, W * 0.3) : W * 0.2, y: seatTop },
    { x: desk ? cx + Math.min(330, W * 0.3) : W * 0.8, y: seatTop },
  ];
  const oppScale = desk ? 0.46 : 0.34;
  const fanY = seatTop + (desk ? 108 : 100) + (ch * oppScale) / 2;
  const fanBottom = fanY + (ch * oppScale) / 2;
  const tableY = Math.round(Math.max(fanBottom + ch * 0.62, (fanBottom + myRowY) / 2 - (desk ? 4 : 10)));
  const feltTop = desk ? 100 : seatTop + 64;
  const feltBottom = desk ? H - 56 : H - 6;
  const feltW = desk ? Math.min(W - 120, 1180) : W - 14;
  const feltH = feltBottom - feltTop;
  const feltR = Math.min(feltW, feltH) / 2;
  const trickAt = (p: number): Pose => {
    const r = (p - me + N) % N;
    if (r === 0) return { x: cx, y: tableY + ch * 0.3, rot: 2, scale: 1, z: 0, up: true, rx: TILT };
    const side = r === 1 ? -1 : 1;
    return { x: cx + side * cw * 0.68, y: tableY - ch * 0.17, rot: side * 9, scale: 1, z: 0, up: true, rx: TILT };
  };
  const pileAt = (p: number) => {
    if (p === me) return { x: W - (desk ? Math.max(70, cx - 380) : 34), y: myRowY - (desk ? 2 : 4) };
    const st = seatPos[p];
    const side = p === 1 ? -1 : 1;
    return { x: st.x + side * (desk ? 104 : 52), y: st.y + (desk ? 26 : 16) };
  };
  const pileScale = desk ? 0.4 : 0.32;

  /* ---------- poses ---------- */
  const poses = new Map<string, Pose>();
  const shownHand = sortHand(g.hands[me], g.trump);
  const hn = shownHand.length;
  const hcw = cw * hs;
  const avail = Math.min(W - 24, desk ? 900 : W) - hcw;
  const step = hn > 1 ? Math.min(hcw * (desk ? 0.7 : 0.64), avail / (hn - 1)) : 0;
  const rotStep = Math.min(4, 30 / Math.max(1, hn));
  shownHand.forEach((c, i) => {
    const k = i - (hn - 1) / 2;
    poses.set(c.id, { x: cx + k * step, y: handY + k * k * (hn > 8 ? 0.55 : 0.9), rot: k * rotStep, scale: hs, z: 100 + i, up: true, rx: 7 });
  });
  const oppPose = (p: number, i: number, cnt: number): Pose => {
    const st = seatPos[p];
    const spread = Math.min(desk ? 15 : 11, 104 / Math.max(1, cnt));
    const k = i - (cnt - 1) / 2;
    return { x: st.x + k * spread, y: fanY + Math.abs(k) * 0.8, rot: k * 4, scale: oppScale, z: 30 + i, up: false, rx: 12 };
  };
  for (const p of [1, 2]) g.hands[p].forEach((c, i) => poses.set(c.id, oppPose(p, i, g.hands[p].length)));
  // the talon: face down in the middle while bidding, face up while it is shown
  const talonPose = (i: number, up: boolean): Pose => ({ x: cx + (i - 1) * cw * (up ? 0.74 : 0.5), y: tableY - (up ? ch * 0.06 : 0), rot: (i - 1) * (up ? 5 : 4), scale: up ? 1.04 : 1, z: up ? 260 + i : 15 + i, up, rx: TILT });
  g.talon.forEach((c, i) => poses.set(c.id, talonPose(i, false)));
  if (revealing) g.talonShown.forEach((c, i) => poses.set(c.id, talonPose(i, true)));
  // tricks
  g.tricks.forEach((tr, ti) => {
    const resting = ti === collectIdx;
    const wi = trickWinnerIndex(tr.plays, g.trump);
    tr.plays.forEach((pl, k) => {
      if (resting) { const ps = trickAt(pl.p); poses.set(pl.c.id, { ...ps, z: 200 + k + (k === wi ? 5 : 0) }); return; }
      const at = pileAt(tr.winner);
      const j = ti * 3 + k;
      poses.set(pl.c.id, { x: at.x + ((j * 7) % 5) - 2, y: at.y - ti * 1.2, rot: 86 + ((j * 13) % 9) - 4, scale: pileScale, z: 40 + j, up: false, rx: 8 });
    });
  });
  g.trick.forEach((pl, k) => { const ps = trickAt(pl.p); poses.set(pl.c.id, { ...ps, z: 200 + k }); });

  /* ---------- flights: the deal ---------- */
  const flights = new Map<string, Flight>();
  const deckAt = { x: cx, y: tableY };
  if (dealing) {
    const tl = dealTimeline(N, 8, dealTempo.current);
    const order = dealOrder(g);
    const skip = skipDeal === g.dealNo;
    const from: Pose = { x: deckAt.x, y: deckAt.y, rot: -2, scale: 1, z: 5, up: false, rx: TILT };
    const key = 'deal' + g.dealNo + (skip ? 's' : '');
    const lift = Math.round(cw * 0.1);
    const last = tl.t0 + 23 * tl.iv + tl.fly;
    for (const [id, k] of order) {
      if (skip) { flights.set(id, { key, instant: true }); continue; }
      const delay = tl.t0 + k * tl.iv;
      const mine = g.hands[me].some(c => c.id === id);
      if (mine) {
        const i = shownHand.findIndex(c => c.id === id);
        const kk = i - (hn - 1) / 2;
        const via: Pose = { x: cx + kk * cw * 0.2, y: handY + 4, rot: kk * 0.8, scale: hs * 0.94, z: 100 + i, up: false, rx: 9 };
        const settleAt = last + 0.06 * dealTempo.current + i * tl.fanStep;
        flights.set(id, { key, glide: true, from, delay, dur: tl.fly, lift, via, settleAt, settleDur: tl.fanDur, flipAt: settleAt, flipDur: tl.fanDur * 0.9, flipLift: Math.round(cw * 0.16) });
      } else flights.set(id, { key, glide: true, from, delay, dur: tl.fly, lift: Math.round(lift * 0.7) });
    }
  }
  useEffect(() => {
    if (!dealing) return;
    const deal = g.dealNo;
    if (skipDeal === deal) { const tm = setTimeout(() => setDealt(deal), 380); return () => clearTimeout(tm); }
    const tl = dealTimeline(N, 8, dealTempo.current);
    const order = dealOrder(g);
    const ticks: (() => void)[] = [];
    const at = (sec: number, f: () => void) => { ticks.push(after(Math.max(0, sec * 1000), f)); };
    sfx.shuffle();
    const seatOfCard = new Map<string, number>();
    g.hands.forEach((h, p) => h.forEach(c => seatOfCard.set(c.id, p)));
    for (const [id, k] of order) {
      const p = seatOfCard.get(id);
      const sx = p == null || p === me ? cx : seatPos[p].x;
      at(tl.t0 + k * tl.iv + 0.02, () => sfx.deal((sx - cx) / Math.max(1, W / 2)));
    }
    const last = tl.t0 + 23 * tl.iv + tl.fly;
    for (let i = 0; i < 7; i++) at(last + 0.06 * dealTempo.current + i * tl.fanStep + tl.fanDur * 0.35, () => sfx.flip());
    at(last + 0.06 * dealTempo.current + 6 * tl.fanStep + tl.fanDur + 0.12, () => setDealt(deal));
    return () => ticks.forEach(c => c());
  }, [dealing, g.dealNo, skipDeal]); // eslint-disable-line react-hooks/exhaustive-deps
  const onStageDown = () => { if (dealing && skipDeal !== g.dealNo) setSkipDeal(g.dealNo); };

  /* ---------- my options ---------- */
  const live = !busy && !over;
  const myTurn = live && who === me;
  const legal = myTurn && g.phase === 'play' ? legalCards(g, me) : [];
  const legalIds = new Set(legal.map(c => c.id));
  const bidOpts = myTurn && g.phase === 'bid' ? bidOptions(g, me) : [];
  const bidding = myTurn && g.phase === 'bid';
  const giving = myTurn && g.phase === 'give';
  const contracting = myTurn && g.phase === 'contract';
  const conOpts = contracting ? contractOptions(g, me) : [];
  const received = g.gives.find(x => x.to === me)?.c.id;
  const suggestion = useMemo(() => (bidding ? suggestBid(g, me) : -1), [bidding, g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const showSuggest = bidding && dealsSeen() < 6;

  const tapCard = (c: TCard) => {
    if (giving) {
      setSel(cur => (cur.includes(c.id) ? cur.filter(x => x !== c.id) : cur.length >= 2 ? [cur[1], c.id] : [...cur, c.id]));
      sfx.tap();
      return;
    }
    if (!legalIds.has(c.id)) { buzz(15); return; }
    if (canDeclare(g, me, c)) { setAsk(c.id); sfx.tap(); return; }
    onAct({ type: 'play', id: c.id });
  };
  const play = (id: string, marriage: boolean) => { setAsk(null); buzz(10); onAct({ type: 'play', id, marriage }); };
  const giveTo = [nextSeat(me), nextSeat(nextSeat(me))];

  /* ---------- status ---------- */
  let status = '';
  if (dealing) status = s.status.dealing;
  else if (!over && collectIdx == null && !revealing && who != null) {
    if (who === me) status = g.phase === 'bid' ? s.status.yourBid : g.phase === 'give' ? s.status.yourGive : g.phase === 'contract' ? s.status.yourContract : g.trick.length === 0 ? s.status.yourLead : s.status.yourTurn;
    else status = g.phase === 'bid' ? s.status.bidding(nameOf(who)) : g.phase === 'give' ? s.status.giving(nameOf(who)) : g.phase === 'contract' ? s.status.contracting(nameOf(who)) : s.status.thinking(nameOf(who));
  }

  /* ---------- coach (first-timer tips, each once) ---------- */
  const [, bumpCoach] = useState(0);
  let tip: { k: string; text: string } | null = null;
  if (live && who === me && !banner && !ask) {
    const mates = [1, 2].filter(p => p !== g.declarer);
    const cand: [string, () => string][] = g.phase === 'bid' ? [['bid', () => s.coach.bid]]
      : g.phase === 'give' ? [['give', () => s.coach.give]]
      : g.phase === 'contract' ? [['contract', () => s.coach.contract]]
      : [
        ['barrel', () => (g.barrel[me] != null ? s.coach.barrel : '')],
        ['marriage', () => (g.trick.length === 0 && g.hands[me].some(c => canDeclare(g, me, c)) ? s.coach.marriage : '')],
        ['lead', () => (g.trick.length === 0 && g.declarer === me && g.tricks.length === 0 ? s.coach.lead : '')],
        ['defend', () => (g.declarer > 0 ? s.coach.defend(nameOf(mates[0] ?? 1), nameOf(g.declarer)) : '')],
        ['follow', () => (g.trick.length > 0 && legal.length < g.hands[me].length ? s.coach.follow : '')],
      ];
    for (const [k, f] of cand) { if (tipSeen(k)) continue; const text = f(); if (text) { tip = { k, text }; break; } }
  }

  /* ---------- live points ---------- */
  const tk = takenBy(g);
  const declPts = g.declarer >= 0 ? tk.pts[g.declarer] : 0;
  const defPts = tk.pts.reduce((a, b) => a + b, 0) - declPts;
  const lastTrick = g.tricks.length ? g.tricks[g.tricks.length - 1] : null;
  const canPeek = !!lastTrick && collectIdx == null && !dealing;
  useEffect(() => { if (!peek) return; const tm = setTimeout(() => setPeek(false), 3200); return () => clearTimeout(tm); }, [peek]);

  const allCards: { c: TCard; owner: number }[] = [
    ...g.hands.flatMap((h, p) => h.map(c => ({ c, owner: p }))),
    ...g.talon.map(c => ({ c, owner: -1 })),
    ...g.tricks.flatMap(tr => tr.plays.map(pl => ({ c: pl.c, owner: -1 }))),
    ...g.trick.map(pl => ({ c: pl.c, owner: -1 })),
  ];
  const avSize = desk ? 46 : 40;
  const winnerOfCollect = collectIdx != null ? g.tricks[collectIdx] : null;
  const winCardId = winnerOfCollect ? winnerOfCollect.plays[trickWinnerIndex(winnerOfCollect.plays, g.trump)].c.id : null;

  const roleTag = (p: number) => {
    if (g.phase === 'bid') {
      const b = lastBid(g, p);
      if (!b) return null;
      return <span className={`ksaid ${b.bid === 0 ? '' : 'gold'} ${g.highBy === p ? 'top' : ''}`}>{b.bid === 0 ? s.said.pass : b.forced ? s.said.forced(b.bid) : s.said.bid(b.bid)}</span>;
    }
    if (g.declarer < 0) return null;
    if (p === g.declarer) return <span className="ktag gold">{g.contract || g.high}</span>;
    return <span className="ktag">{s.role.defender}</span>;
  };
  const marks = (p: number) => (
    <>
      {g.rules.barrel && g.barrel[p] != null && <span className="kmk barrel" title={s.barrel}><Barrel tries={g.barrel[p]!} /></span>}
      {g.rules.bolts && g.bolts[p] > 0 && <span className="kmk bolt" title={s.bolts}><Bolt />{g.bolts[p]}</span>}
    </>
  );
  const seatBadge = (p: number) => {
    const mine = p === me;
    const look = looks[p];
    const frame = mine ? cos.equipped.frame : look?.frame;
    const face = mine ? (app.avatar || names[me].slice(0, 1).toUpperCase()) : (look?.avatar ?? (g.players[p]?.bot === false ? names[p].slice(0, 1).toUpperCase() : '🤖'));
    const av = <div className="av">{face}</div>;
    const turn = live && who === p;
    const nameColor = mine ? cos.equipped.namecolor : look?.nameColor;
    const title = mine ? cos.equipped.title : look?.title;
    return (
      <div className={`sbadge kseat ${mine ? 'mine' : ''} ${turn ? 'turn' : ''} ${g.barrel[p] != null ? 'onbarrel' : ''}`}>
        <div className="avwrap">
          {frame && frame !== 'fr_none' ? <AvatarFrame id={frame} size={avSize}>{av}</AvatarFrame> : av}
          {g.phase === 'play' && tk.tricks[p] > 0 && <span className="cnt" aria-label={s.trickN(tk.tricks[p])}>{tk.tricks[p]}</span>}
        </div>
        <div className="meta">
          <div className="nm">
            {turn && !mine ? <span className="dots"><i /><i /><i /></span> : nameColor ? <PlayerName name={names[p]} color={nameColor} /> : names[p]}
            {!turn && title && title !== 't_none' && <TitleBadge id={title} size="sm" />}
          </div>
          <div className="scrow">
            <span className={`num serif ${g.scores[p] < 0 ? 'neg' : ''}`}>{g.scores[p] < 0 ? '−' : ''}<CountUp value={Math.abs(g.scores[p])} /></span>
            {marks(p)}
            {mine && <span className="krole inl">{roleTag(p)}</span>}
          </div>
          {!mine && <div className="krole">{roleTag(p)}</div>}
        </div>
      </div>
    );
  };

  /* ---------- the bid / contract stepper ---------- */
  const opts = bidding ? bidOpts : conOpts;
  const [pick, setPick] = useState(0);
  useEffect(() => { setPick(0); }, [g.seq]);
  const amount = opts.length ? opts[Math.min(pick, opts.length - 1)] : 0;
  const stepBtn = (d: number) => { sfx.tap(); setPick(i => Math.max(0, Math.min(opts.length - 1, i + d))); };

  const trumpGlyph = g.trump ? GLYPH[g.trump] : null;
  const red = (x: Suit | null) => x === 'H' || x === 'D';

  return (
    <div className={`stage tbl thou ${desk ? 'desk' : ''} ${dealing ? 'is-dealing' : ''} ${g.trump ? 'tr-' + g.trump : ''}`} ref={stageRef} onPointerMove={onPointerMove}
      onPointerDownCapture={onStageDown} style={{ ['--cw' as string]: `${cw}px` }}>
      <div className="room" aria-hidden />
      <motion.div className="tableplane" aria-hidden
        style={{ left: (W - feltW) / 2, top: feltTop, width: feltW, height: feltH, borderRadius: feltR, rotateX: reduce ? 15 : feltRX, rotateY: reduce ? 0 : feltRY, transformPerspective: 1300 }}>
        <div className="rail" style={{ borderRadius: feltR }} />
        <div className="felt" style={{ borderRadius: Math.max(0, feltR - 14) }}>
          <AnimatePresence mode="wait">
            {trumpGlyph ? (
              <motion.div key={'tr' + g.trump} className={`kmark glyph ${red(g.trump) ? 'red' : ''}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.3 }} transition={{ duration: 0.6 }}>{trumpGlyph}</motion.div>
            ) : g.phase === 'play' || over ? (
              <motion.div key="brand" className="kmark serif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>1000</motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
      <motion.div className="spot" aria-hidden style={{ x: spotX, y: spotY }} />
      <div className="feltclick" aria-hidden onClick={() => { setPeek(false); setAsk(null); }} />

      {/* top bar */}
      <div className="tbar has-pace">
        <div className="tleft">
          <button className="glyph" aria-label={s.menu.title} title={s.menu.title} onClick={() => setMenu(true)}><IconMenu /></button>
          <button className="glyph" aria-label={s.sheet.title} title={s.sheet.title} onClick={() => setSheetPeek(true)}><IconSheet /></button>
        </div>
        <div className="tcenter">
          <div className="kbrand">{TITLES[lang] ?? 'Thousand'}</div>
          <div className="rnd serif">{s.deal(g.dealNo)}</div>
          <AnimatePresence mode="wait">
            <motion.div key={g.trump ?? 'none'} className={`ktrump ${g.trump ? 'on' : ''} ${red(g.trump) ? 'red' : ''}`} initial={{ opacity: 0, y: -4, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }}>
              {g.trump ? <><span className="lb">{s.trump}</span><b>{GLYPH[g.trump]}</b></> : <span className="lb">{g.phase === 'play' ? s.noTrump : g.phase === 'bid' ? `${s.talon} · ${g.high}` : `${s.contractWord} · ${g.contract || g.high}`}</span>}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="tright">
          <PaceGlyph fast={fast} onToggle={onToggleFast} label={s.fast} on={s.fastOn} off={s.fastOff} />
          <button className="glyph" aria-label={s.menu.rules} title={s.menu.rules} onClick={() => setRules(true)}><IconBook /></button>
          <QuickAudio />
        </div>
      </div>

      {/* live points: the declarer vs his contract, and the defenders */}
      <AnimatePresence>
        {g.phase === 'play' && g.declarer >= 0 && (
          <motion.div key="pts" className="kpoints" style={{ top: tableY - ch * 0.17 - ch / 2 - (desk ? 62 : 54) }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className={`kp-side ${g.declarer === me ? 'me' : ''}`}><em>{nameOf(g.declarer)}</em><b className="serif"><CountUp value={declPts} duration={0.6} /></b><small>/{g.contract}</small></span>
            <span className={`kp-bar ${declPts >= g.contract ? 'made' : ''}`} aria-hidden>
              <i className="fill" style={{ width: `${Math.min(100, (declPts / Math.max(1, g.contract)) * 100)}%` }} />
            </span>
            <span className={`kp-side r ${g.declarer !== me ? 'me' : ''}`}><b className="serif"><CountUp value={defPts} duration={0.6} /></b><em>{s.role.defender}</em></span>
            {canPeek && <button className="glyph kpeekbtn" aria-label={s.lastTrick} title={s.lastTrick} aria-expanded={peek} onClick={() => setPeek(v => !v)}><IconPeek /></button>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* opponents */}
      <motion.div className="seats" style={{ x: seatX, y: seatY }}>
        {[1, 2].map(p => <div key={p} className="seatpos" style={{ left: seatPos[p].x, top: seatPos[p].y - 6 }}>{seatBadge(p)}</div>)}
      </motion.div>

      {/* cards */}
      <motion.div className="cards" style={{ x: layerX, y: layerY }}>
        <AnimatePresence>
          {dealing && skipDeal !== g.dealNo && (
            <motion.div key={'deck' + g.dealNo} className="deckbody kdeck" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}
              style={{ left: deckAt.x - cw / 2, top: deckAt.y - ch / 2, width: cw, height: ch, ['--depth' as string]: 6 }} />
          )}
        </AnimatePresence>
        {allCards.map(({ c, owner }) => {
          const pose = poses.get(c.id);
          if (!pose) return null;
          const mine = owner === me;
          const can = mine && (giving || (myTurn && g.phase === 'play'));
          const isLegal = mine && myTurn && g.phase === 'play' && legalIds.has(c.id);
          const fromTalon = revealing && g.talonShown.some(x => x.id === c.id);
          return (
            <CardView key={g.dealNo + ':' + c.id} card={c} lang={lang} w={cw} pose={pose} flight={flights.get(c.id)} tempo={tempo}
              legal={isLegal || c.id === winCardId || fromTalon} sel={(giving && sel.includes(c.id)) || ask === c.id || (g.phase === 'contract' && c.id === received)}
              dim={mine && myTurn && g.phase === 'play' && !isLegal}
              onTap={can ? () => tapCard(c) : undefined}
              back={owner > 0 ? looks[owner]?.back : undefined} />
          );
        })}
      </motion.div>

      {/* the talon caption */}
      <AnimatePresence>
        {revealing && (
          <motion.div key={'tc' + g.dealNo} className="ktaloncap up" style={{ left: cx, top: tableY - ch * 0.06 - ch * 0.52 - 30 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {s.talon} · {nameOf(g.declarer)}<b> +{sumPoints(g.talonShown)}</b>
          </motion.div>
        )}
      </AnimatePresence>

      {/* trick winner */}
      <AnimatePresence>
        {winnerOfCollect && (
          <motion.div key={'tw' + collectIdx} className="floatlabel ktw" style={{ left: cx, top: tableY + ch * 0.3 + ch / 2 + 22 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>
            {nameOf(winnerOfCollect.winner)} · +{sumPoints(winnerOfCollect.plays.map(x => x.c))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* last-trick peek */}
      <AnimatePresence>
        {peek && lastTrick && (
          <motion.div className="kpeek" style={desk ? { left: cx + cw * 1.45, top: tableY - ch * 0.62, translate: '0 0' } : { top: tableY - ch * 0.17 - ch / 2 - 6 }} onClick={() => setPeek(false)}
            initial={{ opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            <div className="ttl">{s.lastTrick} · {s.lastTrickBy(nameOf(lastTrick.winner))}</div>
            <div className="row">
              {lastTrick.plays.map((pl: Play) => (
                <div key={pl.c.id} className={`kpk ${pl.p === lastTrick.winner ? 'win' : ''}`}>
                  <MiniCard c={pl.c} lang={lang} w={desk ? 46 : 40} />
                  <span>{nameOf(pl.p)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the marriage */}
      <AnimatePresence>
        {mar && (
          <motion.div key={mar.id} className={`kmar ${red(mar.s) ? 'red' : ''}`} style={{ top: tableY - ch * 0.62 }} aria-live="polite"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -14, transition: { duration: 0.35 } }}>
            <motion.div className="kmar-glow" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: [0.3, 1.25, 1], opacity: [0, 1, 0.85] }} transition={{ duration: 0.9 * tempo, ease: 'easeOut' }} />
            <div className="kmar-cards">
              {(['K', 'Q'] as const).map((r, i) => (
                <motion.span key={r} className="kmar-card" style={{ ['--cw' as string]: `${Math.round(cw * 0.74)}px`, width: Math.round(cw * 0.74), height: Math.round(cw * 0.74 * 1.43) }}
                  initial={{ y: 30, rotate: 0, opacity: 0, scale: 0.7 }} animate={{ y: 0, rotate: i ? 11 : -11, opacity: 1, scale: 1 }} transition={{ delay: 0.12 + i * 0.08, type: 'spring', stiffness: 260, damping: 17 }}>
                  <CardFace card={{ r, s: mar.s }} lang={lang as Lang} />
                </motion.span>
              ))}
            </div>
            <motion.div className="kmar-t serif" initial={{ y: 10, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}>
              {s.marriage} <b>{GLYPH[mar.s]}</b> <em>+{MARRIAGE[mar.s]}</em>
            </motion.div>
            <motion.div className="kmar-s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>{nameOf(mar.p)} · {s.trump} {GLYPH[mar.s]}</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* banners */}
      <AnimatePresence>
        {banner && !sheetOpen && !mar && (
          <motion.div key={banner.id} className="banner" style={{ top: g.phase === 'play' ? tableY - ch * 0.67 - (desk ? 62 : 54) - (desk ? 58 : 50) : tableY - ch / 2 - (desk ? 96 : 84) }}
            initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
            <div className={`pill ${banner.tone}`}>{banner.text}</div>
            {banner.sub && <div className="sub">{banner.sub}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* bidding / contract: an amount stepper */}
      <AnimatePresence>
        {(bidding || contracting) && (
          <motion.div key={'bid' + g.dealNo + g.phase} className="kbidpanel" style={{ top: tableY + ch / 2 + (desk ? 18 : 8) }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
            <div className="kbp-h">
              {bidding ? s.bid.high(g.high, nameOf(g.highBy)) : s.contract.sub(sumPoints(g.talonShown))}
            </div>
            {opts.length > 0 ? (
              <div className="kstep">
                <button className="ks-b" aria-label="−" disabled={pick <= 0} onClick={() => stepBtn(-1)}>−</button>
                <motion.span key={amount} className="ks-v serif" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18 }}>{amount}</motion.span>
                <button className="ks-b" aria-label="+" disabled={pick >= opts.length - 1} onClick={() => stepBtn(1)}>+</button>
              </div>
            ) : null}
            <div className="kbp-cta">
              {bidding && <button className="kbtn ghost" onClick={() => { buzz(8); onAct({ type: 'bid', amount: 0 }); }}>{s.bid.pass}{showSuggest && suggestion === 0 && <i className="kstar" aria-label={s.coach.suggestPass}>★</i>}</button>}
              {opts.length > 0 && (
                <button className="kbtn gold" onClick={() => { buzz(10); onAct(bidding ? { type: 'bid', amount } : { type: 'contract', amount }); }}>
                  {bidding ? s.bid.bid(amount) : s.contract.play(amount)}{showSuggest && suggestion === amount && <i className="kstar" aria-label={s.coach.suggest(amount)}>★</i>}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* give confirm */}
      <AnimatePresence>
        {giving && (
          <motion.div key="give" className="kgivebar" style={{ top: tableY - (desk ? 70 : 64) }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="kbp-h">{s.give.title}</div>
            <div className="kgive-to">
              {giveTo.map((p, i) => {
                const id = sel[i];
                const c = id ? g.hands[me].find(x => x.id === id) : null;
                return (
                  <span key={p} className={`slot ${c ? 'full' : ''}`}>
                    <span className="nm">{nameOf(p)}</span>
                    {c ? <MiniCard c={c} lang={lang} w={30} /> : <i className="ph" />}
                  </span>
                );
              })}
            </div>
            <button className="kbtn gold" disabled={sel.length !== 2} onClick={() => { if (sel.length === 2) { buzz(10); sfx.whoosh(); onAct({ type: 'give', ids: sel }); } }}>
              {sel.length === 2 ? s.give.confirm : s.give.pick}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* marriage question */}
      <AnimatePresence>
        {ask && myTurn && (() => {
          const c = g.hands[me].find(x => x.id === ask);
          const ps = poses.get(ask);
          if (!c || !ps) return null;
          return (
            <motion.div key={'ask' + ask} className="kask" style={{ left: Math.max(130, Math.min(W - 130, ps.x)), top: ps.y - (ch * hs) / 2 - 92 }}
              initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <button className={`kbtn gold ${red(c.s) ? 'red' : ''}`} onClick={() => play(c.id, true)}>{s.declare(MARRIAGE[c.s])} <b>{GLYPH[c.s]}</b></button>
              <button className="kbtn ghost sm" onClick={() => play(c.id, false)}>{s.plainPlay}</button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* status */}
      <div className="statusline" style={{ top: myRowY - 52 }}>
        <AnimatePresence mode="wait">
          {!bidding && !contracting && !giving && !ask && (
            <motion.div key={status} className={`st ${myTurn ? 'mine' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {status}
              {dealing && <span className="skiphint">{s.status.tapToSkip}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* coach */}
      <AnimatePresence mode="wait">
        {tip && !menu && !rules && (
          <motion.div key={tip.k} className="kcoach" style={desk ? { left: cx + cw * 1.55, top: tableY - ch * 0.55, translate: '0 0' } : g.phase !== 'play' ? { top: fanBottom + 8 } : { bottom: H - (myRowY - 58) }}
            initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ delay: 0.35 }}>
            <p>{tip.text}{showSuggest && g.phase === 'bid' ? <><br /><b>{suggestion > 0 ? s.coach.suggest(suggestion) : s.coach.suggestPass}</b></> : null}</p>
            <button onClick={() => { markTip(tip!.k); bumpCoach(x => x + 1); sfx.tap(); }}>{s.coach.ok}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* my seat */}
      <div className="myrow" style={{ top: myRowY - 24, left: desk ? Math.max(18, cx - 430) : 12, right: desk ? Math.max(18, cx - 430) : 12 }}>
        {seatBadge(me)}
        <div className="kmytricks">{g.phase === 'play' ? `${s.trickN(tk.tricks[me])}${tk.mar[me] ? ` · +${tk.mar[me]}` : ''}` : ''}</div>
      </div>

      <AnimatePresence>
        {((sheetOpen && over) || sheetPeek) && (
          <ScoreSheet key={'sheet' + g.dealNo + g.phase + (sheetPeek ? 'p' : '')} g={g} names={names} me={me} peek={sheetPeek && !(sheetOpen && over)}
            onClose={() => setSheetPeek(false)}
            onNext={() => { setSheetOpen(false); setSheetPeek(false); onAct({ type: 'next' }); }}
            onResults={onResults} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <MenuSheet key="menu" onClose={() => setMenu(false)} onRules={() => { setMenu(false); setRules(true); }} onExit={onExit}
            onNew={onNewGame} onFinish={g.phase !== 'gameOver' ? () => { setMenu(false); onAct({ type: 'finish' }); } : undefined} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rules && <RulesSheet key="rules" rules={g.rules} onClose={() => setRules(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ small parts */

export function MiniCard({ c, lang, w }: { c: { r: TCard['r']; s: Suit; id?: string }; lang: string; w: number }) {
  return (
    <span className="kmini" style={{ ['--cw' as string]: `${w}px`, width: w, height: Math.round(w * 1.43) }}>
      <CardFace card={c} lang={lang as Lang} />
    </span>
  );
}

function PaceGlyph({ fast, onToggle, label, on, off }: { fast: boolean; onToggle: () => void; label: string; on: string; off: string }) {
  const [tip, setTip] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!tip) return;
    const id = tip.id;
    const tm = setTimeout(() => setTip(x => (x?.id === id ? null : x)), 1500);
    return () => clearTimeout(tm);
  }, [tip]);
  return (
    <div className="pacewrap">
      <button className={`glyph pace ${fast ? 'on' : ''}`} aria-pressed={fast} aria-label={label} title={label}
        onClick={() => { sfx.tap(); onToggle(); setTip({ id: Date.now(), text: `${label} · ${fast ? off : on}` }); }}>
        <IconFast />
      </button>
      <AnimatePresence>
        {tip && (
          <motion.div key={tip.id} className="pacetip" role="status" initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {tip.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuSheet({ onClose, onRules, onExit, onNew, onFinish }: { onClose: () => void; onRules: () => void; onExit: () => void; onNew: () => void; onFinish?: () => void }) {
  const s = useStrings(THOUSAND);
  const [sure, setSure] = useState(false);
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet kmenu" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
        <div className="grab" />
        <div className="kmenu-t serif">{s.menu.title}</div>
        <button className="btn acc" onClick={onClose}>{s.menu.resume}</button>
        <div className="kmenu-list">
          <MenuRow label={s.menu.rules} onClick={onRules} />
          {onFinish && <MenuRow label={s.menu.finish} sub={s.menu.finishSub} onClick={onFinish} />}
          <MenuRow label={sure ? s.menu.newGameSure : s.menu.newGame} danger={sure} onClick={() => { if (sure) onNew(); else setSure(true); }} />
          <MenuRow label={s.menu.exit} sub={s.menu.exitSub} onClick={onExit} />
        </div>
      </motion.div>
    </>
  );
}
function MenuRow({ label, sub, onClick, danger }: { label: string; sub?: string; onClick: () => void; danger?: boolean }): ReactNode {
  return (
    <button className={`krow ${danger ? 'danger' : ''}`} onClick={() => { sfx.tap(); onClick(); }}>
      <span className="l">{label}</span>
      {sub && <span className="s">{sub}</span>}
      <svg viewBox="0 0 24 24" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );
}
