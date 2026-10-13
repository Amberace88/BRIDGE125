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
  type Action, type Bid, type Play, type ZCard, type ZState, N, actor, firstHand, isTrump, legalBids, legalCards, sidePoints, sortHand,
  sumPoints, takenBy, teamOf, trickWinnerIndex,
} from './engine';
import { botAction, suggestBid, type ZLevel } from './bot';
import { ZOLE } from './strings';
import { TITLES } from './titles';
import { bumpDeals, dealsSeen, markTip, tipSeen } from './save';
import { ScoreSheet } from './ScoreSheet';
import { RulesSheet } from './RulesSheet';
import '../../styles/table.css';
import './zole.css';

/* ------------------------------------------------------------------ glyphs */
const IconMenu = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4 7h16M4 12h11M4 17h16" /></svg>);
const IconFast = () => (<svg viewBox="0 0 24 24" aria-hidden><path className="ch1" d="M5.5 6.5L11 12l-5.5 5.5" /><path className="ch2" d="M12.5 6.5L18 12l-5.5 5.5" /></svg>);
const IconBook = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M5 5.5c2.4-1 4.6-1 7 .6 2.4-1.6 4.6-1.6 7-.6v13c-2.4-1-4.6-1-7 .6-2.4-1.6-4.6-1.6-7-.6z" /><path d="M12 6.1v13" /></svg>);
const IconPeek = () => (<svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="6.5" width="8" height="11.5" rx="1.6" transform="rotate(-12 8 12)" /><rect x="11" y="5.5" width="8" height="11.5" rx="1.6" transform="rotate(10 15 11)" /></svg>);

/* ------------------------------------------------------------------ helpers */
const HOLD_MS = 1050;           // a finished trick stays in the middle this long, then flies to its winner
const BOT_MS = { bid: 950, discard: 1250, play: 820, jitter: 420 };

/** The Zole deal: 4 to each from the dealer's left, 2 to the table, 4 more — dealt here one card at a time. */
function dealOrder(g: ZState): Map<string, number> {
  const fh = firstHand(g);
  const order = new Map<string, number>();
  g.hands.forEach((h, p) => {
    const j = (p - fh + N) % N;
    h.forEach((c, i) => order.set(c.id, i < 4 ? i * N + j : 4 * N + 2 + (i - 4) * N + j));
  });
  g.galds.forEach((c, i) => order.set(c.id, 4 * N + i));
  return order;
}
const isFreshDeal = (g: ZState) => g.phase === 'bid' && g.bids.length === 0 && g.hands.every(h => h.length === 8);

export interface ZoleGameProps {
  g: ZState;
  level: ZLevel;
  fast: boolean;
  onToggleFast: () => void;
  /** a human action (seat 0) */
  onAct: (a: Action) => void;
  /** a bot's action, applied only if the state did not move on (seq) */
  onBot: (seq: number, p: number, a: Action) => void;
  /** online table (src/games/online): the server plays the bots — no local bot timers */
  remote?: boolean;
  onExit: () => void;
  onNewSession: () => void;
}

export function ZoleGame({ g, level, fast, onToggleFast, onAct, onBot, onExit, onNewSession, remote }: ZoleGameProps) {
  const app = useApp();
  const { t, lang } = app;
  const s = useStrings(ZOLE);
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
  const looks: (SeatLook | null)[] = useMemo(() => g.players.map((p, i) => (p.bot ? botLook(level, i) : null)), [level, g.players]);

  /* ---------- the deal show ---------- */
  const animDeal = !reduce && !prefersReducedMotion();
  const [dealt, setDealt] = useState<{ deal: number; skip: boolean }>(() => ({ deal: isFreshDeal(g) && animDeal ? g.dealNo - 1 : g.dealNo, skip: false }));
  const [skipDeal, setSkipDeal] = useState(-1);
  const dealing = animDeal && dealt.deal !== g.dealNo && isFreshDeal(g);
  const dealTempo = useRef(tempo);
  if (!dealing) dealTempo.current = tempo;

  /* ---------- trick collection: a finished trick rests in the middle, then flies to its winner ---------- */
  const [collected, setCollected] = useState(() => ({ deal: g.dealNo, n: g.tricks.length }));
  const doneN = collected.deal === g.dealNo ? collected.n : 0;
  const collectIdx = g.tricks.length > doneN ? g.tricks.length - 1 : null;
  useEffect(() => {
    if (collectIdx == null) return;
    const deal = g.dealNo, n = g.tricks.length;
    const tm = after(HOLD_MS * tempo, () => { setCollected({ deal, n }); sfx.draw(); });
    return () => tm();
  }, [collectIdx, g.dealNo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- overlays ---------- */
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const over = g.phase === 'dealOver' || g.phase === 'sessionOver';
  const busy = dealing || collectIdx != null;
  useEffect(() => {
    if (!over) { setSheetOpen(false); return; }
    if (busy) return;
    const tm = setTimeout(() => setSheetOpen(true), (g.result?.contract === 'pule' ? 1500 : 900) * tempo);
    return () => clearTimeout(tm);
  }, [over, busy, g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSel([]); }, [g.phase, g.dealNo]);

  /* ---------- bots ---------- */
  const who = actor(g);
  const paused = menu || rules;
  useEffect(() => {
    if (remote || who == null || !g.players[who]?.bot || busy || paused) return;
    const base = g.phase === 'bid' ? BOT_MS.bid : g.phase === 'discard' ? BOT_MS.discard : BOT_MS.play + (g.trick.length === 0 ? 180 : 0);
    const delay = (base + Math.random() * BOT_MS.jitter) * (fast ? 0.5 : 1);
    const seq = g.seq, p = who;
    const tm = setTimeout(() => { const a = botAction(g, p, level); if (a) onBot(seq, p, a); }, delay);
    return () => clearTimeout(tm);
  }, [g.seq, busy, paused, fast]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- sounds, banners ---------- */
  const [banner, setBanner] = useState<{ id: number; text: string; sub?: string; tone: 'good' | 'info' | 'bad' } | null>(null);
  const prev = useRef(g);
  useEffect(() => {
    const p = prev.current; prev.current = g;
    if (p === g) return;
    if (p.dealNo !== g.dealNo) return;
    if (g.trick.length > p.trick.length || g.tricks.length > p.tricks.length) sfx.play();
    if (g.bids.length > p.bids.length) {
      const b = g.bids[g.bids.length - 1];
      if (b.bid === 'pass') sfx.tap();
      else {
        sfx.good(); buzz(12);
        setBanner({ id: Date.now(), text: b.p === me ? s.playsYou(g.contract!) : s.plays(names[b.p], g.contract!), sub: s.contract[g.contract!], tone: 'good' });
      }
      if (g.contract === 'galdins' || g.result?.contract === 'pule') {
        sfx.alert();
        setBanner({ id: Date.now(), text: g.contract === 'galdins' ? s.allPassGaldins : s.allPassPule, tone: 'info' });
      }
    }
    if (g.phase === 'dealOver' && p.phase !== 'dealOver') bumpDeals();
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!banner) return;
    const id = banner.id;
    const tm = setTimeout(() => setBanner(b => (b?.id === id ? null : b)), 2100);
    return () => clearTimeout(tm);
  }, [banner]);

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
  const cw = Math.round(Math.min(desk ? 118 : 96, W * 0.235, H * (desk ? 0.132 : 0.118)));
  const ch = Math.round(cw * 1.43);
  const hs = desk ? 1 : 0.92;
  const cx = W / 2;
  const TILT = 14;
  const handY = H - 16 - (ch * hs) / 2 - (desk ? 26 : 26);
  const myRowY = handY - (ch * hs) / 2 - (desk ? 40 : 32);
  const seatTop = desk ? 72 : 66;
  const seatPos = [
    { x: cx, y: myRowY },
    { x: desk ? cx - Math.min(330, W * 0.3) : W * 0.2, y: seatTop },
    { x: desk ? cx + Math.min(330, W * 0.3) : W * 0.8, y: seatTop },
  ];
  const oppScale = desk ? 0.46 : 0.34;
  const fanY = seatTop + (desk ? 104 : 96) + (ch * oppScale) / 2;
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
    if (p === me) return { x: W - (desk ? Math.max(70, cx - 380) : 34) , y: myRowY - (desk ? 2 : 4) };
    const st = seatPos[p];
    // taken tricks lie on the outer side of the seat (the table between the seats stays for the galds)
    const side = p === 1 ? -1 : 1;
    return { x: st.x + side * (desk ? 104 : 52), y: st.y + (desk ? 26 : 16) };
  };
  const pileScale = desk ? 0.4 : 0.32;

  /* ---------- poses ---------- */
  const poses = new Map<string, Pose>();
  const shownHand = sortHand(g.hands[me]);
  const hn = shownHand.length;
  const hcw = cw * hs;
  const avail = Math.min(W - 28, desk ? 860 : W) - hcw;
  const step = hn > 1 ? Math.min(hcw * (desk ? 0.7 : 0.64), avail / (hn - 1)) : 0;
  const rotStep = Math.min(4, 30 / Math.max(1, hn));
  shownHand.forEach((c, i) => {
    const k = i - (hn - 1) / 2;
    poses.set(c.id, { x: cx + k * step, y: handY + k * k * (hn > 8 ? 0.6 : 0.9), rot: k * rotStep, scale: hs, z: 100 + i, up: true, rx: 7 });
  });
  const reveal = over;
  const oppPose = (p: number, i: number, cnt: number): Pose => {
    const st = seatPos[p];
    const spread = Math.min(desk ? 15 : 11.5, 110 / Math.max(1, cnt));
    const k = i - (cnt - 1) / 2;
    return { x: st.x + k * spread, y: fanY + Math.abs(k) * 0.8, rot: k * 4, scale: oppScale, z: 30 + i, up: false, rx: 12 };
  };
  for (const p of [1, 2]) {
    const h = reveal ? sortHand(g.hands[p]) : g.hands[p];
    h.forEach((c, i) => {
      const ps = oppPose(p, i, h.length);
      poses.set(c.id, reveal ? { ...ps, up: true, scale: oppScale * 1.3, x: seatPos[p].x + (i - (h.length - 1) / 2) * Math.min(desk ? 30 : 22, 120 / h.length) } : ps);
    });
  }
  // the table: big in the middle while bidding; parked between the opponents while it waits (zole / galdiņš / mazā)
  const galdsBig = g.phase === 'bid' || dealing;
  g.galds.forEach((c, i) => {
    const side = i === 0 ? -1 : 1;
    if (galdsBig) poses.set(c.id, { x: cx + side * cw * 0.56, y: tableY, rot: side * 4, scale: 1, z: 15 + i, up: false, rx: TILT });
    else if (reveal) poses.set(c.id, { x: cx + side * cw * 0.3, y: seatTop + (desk ? 18 : 34), rot: side * 5, scale: desk ? 0.52 : 0.42, z: 15 + i, up: true, rx: 8 });
    else poses.set(c.id, { x: cx + side * cw * 0.16, y: seatTop + (desk ? 18 : 34), rot: side * 7, scale: desk ? 0.46 : 0.36, z: 15 + i, up: false, rx: 8 });
  });
  // the lielais' buried cards: under his pile
  g.discards.forEach((c, i) => {
    const pl = pileAt(g.declarer);
    // mine lie beside my pile; an opponent's go under his tricks
    const at = g.declarer === me ? { x: pl.x - cw * 0.42 + (i ? 8 : -8), y: pl.y, rot: i ? 12 : -10 } : { x: pl.x + (i ? 4 : -4), y: pl.y + 5 + i * 2, rot: 80 + i * 8 };
    poses.set(c.id, { ...at, scale: pileScale * (reveal ? 1.1 : 0.92), z: 12 + i, up: reveal, rx: 8 });
  });
  // tricks: collected ones in their winner's pile, the one being collected still in the middle
  g.tricks.forEach((tr, ti) => {
    const resting = ti === collectIdx;
    const wi = trickWinnerIndex(tr.plays);
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
    const last = tl.t0 + 25 * tl.iv + tl.fly;
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
      } else {
        flights.set(id, { key, glide: true, from, delay, dur: tl.fly, lift: Math.round(lift * 0.7) });
      }
    }
  }
  // deal timeline: sounds + end
  useEffect(() => {
    if (!dealing) return;
    const deal = g.dealNo;
    if (skipDeal === deal) { const tm = setTimeout(() => setDealt({ deal, skip: true }), 380); return () => clearTimeout(tm); }
    const tl = dealTimeline(N, 8, dealTempo.current);
    const order = dealOrder(g);
    const ticks: (() => void)[] = [];
    const at = (sec: number, f: () => void) => { ticks.push(after(Math.max(0, sec * 1000), f)); };
    sfx.shuffle();
    const seatOfCard = new Map<string, number>();
    g.hands.forEach((h, p) => h.forEach(c => seatOfCard.set(c.id, p)));
    for (const [id, k] of order) {
      const p = seatOfCard.get(id);
      const sx = p == null ? cx : p === me ? cx : seatPos[p].x;
      at(tl.t0 + k * tl.iv + 0.02, () => sfx.deal((sx - cx) / Math.max(1, W / 2)));
    }
    const last = tl.t0 + 25 * tl.iv + tl.fly;
    for (let i = 0; i < 8; i++) at(last + 0.06 * dealTempo.current + i * tl.fanStep + tl.fanDur * 0.35, () => sfx.flip());
    const end = last + 0.06 * dealTempo.current + 7 * tl.fanStep + tl.fanDur + 0.12;
    at(end, () => setDealt({ deal, skip: false }));
    return () => ticks.forEach(c => c());
  }, [dealing, g.dealNo, skipDeal]); // eslint-disable-line react-hooks/exhaustive-deps
  const onStageDown = () => { if (dealing && skipDeal !== g.dealNo) setSkipDeal(g.dealNo); };

  /* ---------- my options ---------- */
  const live = !busy && !over;
  const myTurn = live && who === me;
  const legal = myTurn && g.phase === 'play' ? legalCards(g, me) : [];
  const legalIds = new Set(legal.map(c => c.id));
  const bids = myTurn && g.phase === 'bid' ? legalBids(g, me) : [];
  const discarding = myTurn && g.phase === 'discard';
  const showSuggest = bids.length > 0 && dealsSeen() < 6;
  const suggestion = useMemo(() => (bids.length ? suggestBid(g, me) : null), [bids.length, g.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapCard = (c: ZCard) => {
    if (discarding) {
      setSel(cur => cur.includes(c.id) ? cur.filter(x => x !== c.id) : cur.length >= 2 ? [cur[1], c.id] : [...cur, c.id]);
      sfx.tap();
      return;
    }
    if (!legalIds.has(c.id)) { buzz(15); return; }
    onAct({ type: 'play', id: c.id });
  };
  const doBid = (b: Bid) => { buzz(10); onAct({ type: 'bid', bid: b }); };
  const doDiscard = () => { if (sel.length === 2) { buzz(10); onAct({ type: 'discard', ids: sel }); } };
  const selPts = sumPoints(g.hands[me].filter(c => sel.includes(c.id)));

  /* ---------- status line ---------- */
  let status = '';
  if (dealing) status = s.status.dealing;
  else if (!over && collectIdx == null && who != null) {
    if (who === me) status = g.phase === 'bid' ? s.status.yourBid : g.phase === 'discard' ? s.status.yourDiscard : g.trick.length === 0 ? s.status.yourLead : s.status.yourTurn;
    else status = g.phase === 'bid' ? s.status.bidding(nameOf(who)) : g.phase === 'discard' ? s.status.discarding(nameOf(who)) : s.status.thinking(nameOf(who));
  }

  /* ---------- coach (first-timer tips, each once) ---------- */
  const [, bumpCoach] = useState(0);
  let tip: { k: string; text: string } | null = null;
  if (live && who === me && !banner) {
    const tr = g.hands[me].filter(isTrump).length;
    const mates = [1, 2].filter(p => p !== g.declarer);
    const cand: [string, () => string][] = g.phase === 'bid' ? [['bid', () => s.coach.bid(tr)]]
      : g.phase === 'discard' ? [['discard', () => s.coach.discard]]
      : [
        ['galdins', () => (g.contract === 'galdins' ? s.coach.galdins : '')],
        ['maza', () => (g.contract === 'maza' ? s.coach.maza : '')],
        ['declarer', () => (g.declarer === me && g.contract !== 'maza' ? s.coach.declarer : '')],
        ['mazie', () => (g.declarer > 0 && g.contract !== 'maza' && g.contract !== 'galdins' ? s.coach.mazie(nameOf(mates[0] ?? 1), nameOf(g.declarer)) : '')],
        ['follow', () => (g.trick.length > 0 && legal.length < g.hands[me].length ? s.coach.follow : '')],
        ['lead', () => (g.trick.length === 0 && g.declarer === me && g.contract !== 'maza' ? s.coach.lead : '')],
      ];
    for (const [k, f] of cand) { if (tipSeen(k)) continue; const text = f(); if (text) { tip = { k, text }; break; } }
  }

  /* ---------- live points ---------- */
  const tk = takenBy(g);
  const sp = sidePoints(g);
  const myDeclKnown = g.declarer === me && g.contract === 'lielais' ? sumPoints(g.discards) : 0;
  const declShown = sp.decl - (g.contract === 'lielais' ? sumPoints(g.discards) : 0) + myDeclKnown;
  const lastTrick = g.tricks.length ? g.tricks[g.tricks.length - 1] : null;
  const canPeek = !!lastTrick && collectIdx == null && !dealing;
  useEffect(() => { if (!peek) return; const tm = setTimeout(() => setPeek(false), 3200); return () => clearTimeout(tm); }, [peek]);

  const allCards: { c: ZCard; owner: number }[] = [
    ...g.hands.flatMap((h, p) => h.map(c => ({ c, owner: p }))),
    ...g.galds.map(c => ({ c, owner: -1 })),
    ...g.discards.map(c => ({ c, owner: -1 })),
    ...g.tricks.flatMap(tr => tr.plays.map(pl => ({ c: pl.c, owner: -1 }))),
    ...g.trick.map(pl => ({ c: pl.c, owner: -1 })),
  ];
  const avSize = desk ? 46 : 40;
  const winnerOfCollect = collectIdx != null ? g.tricks[collectIdx] : null;
  const contractTag = (p: number) => {
    if (g.phase === 'bid' || !g.contract) return null;
    const tm = teamOf(g, p);
    if (g.contract === 'galdins') return null;
    if (tm === 'decl') return <span className="ztag gold">{g.contract === 'lielais' ? s.role.lielais : s.contract[g.contract]}</span>;
    return <span className="ztag">{s.role.mazais}</span>;
  };
  const bidSaid = (p: number) => {
    if (g.phase !== 'bid') return null;
    const b = [...g.bids].reverse().find(x => x.p === p);
    return b ? <span className={`zsaid ${b.bid === 'pass' ? '' : 'gold'}`}>{s.said[b.bid]}</span> : null;
  };
  const seatBadge = (p: number) => {
    const mine = p === me;
    const look = looks[p];
    const frame = mine ? cos.equipped.frame : look?.frame;
    const face = mine ? (app.avatar || names[me].slice(0, 1).toUpperCase()) : (look?.avatar ?? (g.players[p]?.bot === false ? names[p].slice(0, 1).toUpperCase() : '🤖'));
    const av = <div className="av">{face}</div>;
    const turn = live && who === p;
    return (
      <div className={`sbadge zseat ${mine ? 'mine' : ''} ${turn ? 'turn' : ''}`}>
        <div className="avwrap">
          {frame && frame !== 'fr_none' ? <AvatarFrame id={frame} size={avSize}>{av}</AvatarFrame> : av}
          {g.contract === 'galdins' || g.contract === 'maza' ? (tk.tricks[p] > 0 && <span className="cnt" aria-label={s.trickN(tk.tricks[p])}>{tk.tricks[p]}</span>) : null}
        </div>
        <div className="meta">
          <div className="nm">
            {turn && !mine ? <span className="dots"><i /><i /><i /></span>
              : (mine ? cos.equipped.namecolor : look?.nameColor) ? <PlayerName name={names[p]} color={(mine ? cos.equipped.namecolor : look?.nameColor)!} /> : names[p]}
            {!turn && (mine ? cos.equipped.title : look?.title) && (mine ? cos.equipped.title : look?.title) !== 't_none' && <TitleBadge id={(mine ? cos.equipped.title : look?.title)!} size="sm" />}
          </div>
          <div className="scrow">
            <span className={`num serif ${g.scores[p] > 0 ? 'pos' : g.scores[p] < 0 ? 'neg' : ''}`}>{g.scores[p] > 0 ? '+' : g.scores[p] < 0 ? '−' : ''}<CountUp value={Math.abs(g.scores[p])} /></span>
            {mine && <span className="zrole inl">{bidSaid(p) ?? contractTag(p)}</span>}
          </div>
          {!mine && <div className="zrole">{bidSaid(p) ?? contractTag(p)}</div>}
        </div>
      </div>
    );
  };

  const total = g.rules.deals;
  const pulesOpen = g.pules.common + g.pules.personal.reduce((a, b) => a + b, 0);

  return (
    <div className={`stage tbl zole ${desk ? 'desk' : ''} ${dealing ? 'is-dealing' : ''}`} ref={stageRef} onPointerMove={onPointerMove}
      onPointerDownCapture={onStageDown} style={{ ['--cw' as string]: `${cw}px` }}>
      <div className="room" aria-hidden />
      <motion.div className="tableplane" aria-hidden
        style={{ left: (W - feltW) / 2, top: feltTop, width: feltW, height: feltH, borderRadius: feltR, rotateX: reduce ? 15 : feltRX, rotateY: reduce ? 0 : feltRY, transformPerspective: 1300 }}>
        <div className="rail" style={{ borderRadius: feltR }} />
        <div className="felt" style={{ borderRadius: Math.max(0, feltR - 14) }}>
          <div className="zmark serif" aria-hidden>{TITLES[lang] ?? 'Zole'}</div>
        </div>
      </motion.div>
      <motion.div className="spot" aria-hidden style={{ x: spotX, y: spotY }} />
      <div className="feltclick" aria-hidden onClick={() => setPeek(false)} />

      {/* top bar */}
      <div className="tbar has-pace">
        <button className="glyph" aria-label={s.menu.title} title={s.menu.title} onClick={() => setMenu(true)}><IconMenu /></button>
        <div className="tcenter">
          <div className="zbrand">{TITLES[lang] ?? 'Zole'}</div>
          <div className="rnd serif">{s.deal(g.dealNo, total)}</div>
          {pulesOpen > 0 && <div className="zpules" aria-label={s.sheet.pules(pulesOpen)}>{Array.from({ length: Math.min(6, pulesOpen) }, (_, i) => <i key={i} />)}<span>{s.sheet.pules(pulesOpen)}</span></div>}
        </div>
        <div className="tright">
          <PaceGlyph fast={fast} onToggle={onToggleFast} label={s.fast} on={s.fastOn} off={s.fastOff} />
          <button className="glyph" aria-label={s.menu.rules} title={s.menu.rules} onClick={() => setRules(true)}><IconBook /></button>
          <QuickAudio />
        </div>
      </div>

      {/* live points (lielais / zole) or the declarer's tricks (mazā zole) */}
      <AnimatePresence>
        {g.contract && g.phase !== 'bid' && g.phase !== 'discard' && g.contract !== 'galdins' && (
          <motion.div key="pts" className="zpoints" style={{ top: tableY - ch * 0.17 - ch / 2 - (desk ? 62 : 54) }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {g.contract === 'maza' ? (
              <span className="zp-one"><b className="serif">{tk.tricks[g.declarer]}</b> {s.tricks} · {nameOf(g.declarer)}</span>
            ) : (<>
              <span className={`zp-side ${g.declarer === me ? 'me' : ''}`}><em>{g.contract === 'zole' ? s.contract.zole : s.role.lielais}</em><b className="serif"><CountUp value={declShown} duration={0.6} /></b></span>
              <span className="zp-bar" aria-hidden>
                <i className="fill" style={{ width: `${Math.min(100, (declShown / 120) * 100)}%` }} />
                <i className="mk m30" /><i className="mk m61" /><i className="mk m91" />
              </span>
              <span className={`zp-side r ${g.declarer !== me ? 'me' : ''}`}><b className="serif"><CountUp value={sp.opp} duration={0.6} /></b><em>{s.role.mazais}</em></span>
            </>)}
            {canPeek && (
              <button className="glyph zpeekbtn" aria-label={s.lastTrick} title={s.lastTrick} aria-expanded={peek} onClick={() => setPeek(v => !v)}><IconPeek /></button>
            )}
          </motion.div>
        )}
        {g.contract === 'galdins' && canPeek && !over && (
          <motion.button key="pk" className="glyph zpeekbtn solo" style={{ top: tableY - ch * 0.17 - ch / 2 - (desk ? 58 : 50) }} aria-label={s.lastTrick} onClick={() => setPeek(v => !v)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><IconPeek /></motion.button>
        )}
      </AnimatePresence>

      {/* opponents */}
      <motion.div className="seats" style={{ x: seatX, y: seatY }}>
        {[1, 2].map(p => (
          <div key={p} className="seatpos" style={{ left: seatPos[p].x, top: seatPos[p].y - 6 }}>{seatBadge(p)}</div>
        ))}
      </motion.div>

      {/* cards */}
      <motion.div className="cards" style={{ x: layerX, y: layerY }}>
        <AnimatePresence>
          {dealing && skipDeal !== g.dealNo && (
            <motion.div key={'deck' + g.dealNo} className="deckbody zdeck" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}
              style={{ left: deckAt.x - cw / 2, top: deckAt.y - ch / 2, width: cw, height: ch, ['--depth' as string]: 6 }} />
          )}
        </AnimatePresence>
        {allCards.map(({ c, owner }) => {
          const pose = poses.get(c.id);
          if (!pose) return null;
          const mine = owner === me;
          const can = mine && (discarding || (myTurn && g.phase === 'play'));
          const isLegal = mine && myTurn && g.phase === 'play' && legalIds.has(c.id);
          const win = winnerOfCollect && trickWinnerIndex(winnerOfCollect.plays) >= 0 && winnerOfCollect.plays[trickWinnerIndex(winnerOfCollect.plays)].c.id === c.id;
          return (
            <CardView key={g.dealNo + ':' + c.id} card={c} lang={lang} w={cw} pose={pose} flight={flights.get(c.id)} tempo={tempo}
              legal={isLegal || !!win} sel={discarding && sel.includes(c.id)}
              dim={mine && myTurn && g.phase === 'play' && !isLegal}
              onTap={can ? () => tapCard(c) : undefined}
              back={owner > 0 ? looks[owner]?.back : undefined} />
          );
        })}
      </motion.div>

      {/* the parked table cards get a caption */}
      {g.galds.length > 0 && !galdsBig && !reveal && !dealing && (
        <div className="zgaldscap" style={{ left: cx, top: seatTop + (desk ? 18 : 34) + ch * (desk ? 0.46 : 0.36) / 2 + 6 }}>{s.table}</div>
      )}

      {/* trick winner: +points over the collecting trick */}
      <AnimatePresence>
        {winnerOfCollect && (
          <motion.div key={'tw' + collectIdx} className="floatlabel ztw" style={{ left: cx, top: tableY + ch * 0.3 + ch / 2 + 22 }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>
            {nameOf(winnerOfCollect.winner)} · +{sumPoints(winnerOfCollect.plays.map(x => x.c))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* last-trick peek */}
      <AnimatePresence>
        {peek && lastTrick && (
          <motion.div className="zpeek" style={desk ? { left: cx + cw * 1.45, top: tableY - ch * 0.62, translate: '0 0' } : { top: tableY - ch * 0.17 - ch / 2 - 6 }} onClick={() => setPeek(false)}
            initial={{ opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            <div className="ttl">{s.lastTrick} · {s.lastTrickBy(nameOf(lastTrick.winner))}</div>
            <div className="row">
              {lastTrick.plays.map((pl: Play) => (
                <div key={pl.c.id} className={`zpk ${pl.p === lastTrick.winner ? 'win' : ''}`}>
                  <MiniCard c={pl.c} lang={lang} w={desk ? 46 : 40} />
                  <span>{nameOf(pl.p)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* banners */}
      <AnimatePresence>
        {banner && !sheetOpen && (
          <motion.div key={banner.id} className="banner" style={{ top: tableY - ch / 2 - (desk ? 96 : 84) }}
            initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
            <div className={`pill ${banner.tone}`}>{banner.text}</div>
            {banner.sub && <div className="sub">{banner.sub}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* bidding: elegant frameless choices */}
      <AnimatePresence>
        {bids.length > 0 && (
          <motion.div key={'bid' + g.dealNo} className="zbids" style={{ top: tableY + ch / 2 + (desk ? 22 : 12), bottom: H - myRowY + (desk ? 34 : 30) }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {bids.map((b, i) => (
              <motion.button key={b} className={`zbid ${b}`} onClick={() => doBid(b)}
                initial={{ opacity: 0, y: 16, rotateX: -50 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.05 + i * 0.06, type: 'spring', stiffness: 320, damping: 22 }}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.94 }}>
                <span className="bl serif">{s.bid[b]}</span>
                <span className="bs">{s.bidSub[b]}</span>
                {showSuggest && suggestion === b && <span className="zstar" aria-label={s.coach.suggest(s.bid[b])}>★</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* discard confirm */}
      <AnimatePresence>
        {discarding && sel.length === 2 && (
          <motion.button key="disc" className="zconfirm" style={{ left: cx, top: myRowY - 48 }} onClick={doDiscard}
            initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.94 }}>
            <span className="serif">{s.discardBtn(selPts)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* status */}
      <div className="statusline" style={{ top: myRowY - 52 }}>
        <AnimatePresence mode="wait">
          {!(discarding && sel.length === 2) && !bids.length && (
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
          <motion.div key={tip.k} className="zcoach" style={desk ? { left: cx + cw * 1.35, top: tableY - ch * 0.55, translate: '0 0' } : g.phase !== 'play' ? { top: fanBottom + 10 } : { bottom: H - (myRowY - 58) }}
            initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ delay: 0.35 }}>
            <p>{tip.text}{showSuggest && g.phase === 'bid' && suggestion ? <><br /><b>{s.coach.suggest(s.bid[suggestion])}</b></> : null}</p>
            <button onClick={() => { markTip(tip!.k); bumpCoach(x => x + 1); sfx.tap(); }}>{s.coach.ok}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* my seat */}
      <div className="myrow" style={{ top: myRowY - 24, left: desk ? Math.max(18, cx - 430) : 12, right: desk ? Math.max(18, cx - 430) : 12 }}>
        {seatBadge(me)}
        <div className="zmytricks">{(g.contract === 'galdins' || g.contract === 'maza') && g.phase === 'play' ? s.trickN(tk.tricks[me]) : ''}</div>
      </div>

      <AnimatePresence>
        {sheetOpen && over && (
          <ScoreSheet key={'sheet' + g.dealNo + g.phase} g={g} names={names} me={me}
            onNext={() => { setSheetOpen(false); onAct({ type: 'next' }); }}
            onFinish={() => onAct({ type: 'finish' })}
            onAgain={onNewSession} onExit={onExit} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <MenuSheet key="menu" onClose={() => setMenu(false)} onRules={() => { setMenu(false); setRules(true); }} onExit={onExit}
            onNew={onNewSession} onFinish={g.phase !== 'sessionOver' ? () => { setMenu(false); onAct({ type: 'finish' }); } : undefined} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rules && <RulesSheet key="rules" rules={g.rules} onClose={() => setRules(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ small parts */

export function MiniCard({ c, lang, w, down }: { c: ZCard; lang: string; w: number; down?: boolean }) {
  return (
    <span className={`zmini ${down ? 'down' : ''}`} style={{ ['--cw' as string]: `${w}px`, width: w, height: Math.round(w * 1.43) }}>
      {down ? <span className="zbk" /> : <MiniFace c={c} lang={lang} />}
    </span>
  );
}
function MiniFace({ c, lang }: { c: ZCard; lang: string }) {
  return <CardFace card={c} lang={lang as Lang} />;
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
  const s = useStrings(ZOLE);
  const [sure, setSure] = useState(false);
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet zmenu" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
        <div className="grab" />
        <div className="zmenu-t serif">{s.menu.title}</div>
        <button className="btn acc" onClick={onClose}>{s.menu.resume}</button>
        <div className="zmenu-list">
          <MenuRow label={s.menu.rules} onClick={onRules} />
          {onFinish && <MenuRow label={s.menu.finish} sub={s.sheet.finishSub} onClick={onFinish} />}
          <MenuRow label={sure ? s.menu.newGameSure : s.menu.newGame} danger={sure} onClick={() => { if (sure) onNew(); else setSure(true); }} />
          <MenuRow label={s.menu.exit} sub={s.menu.exitSub} onClick={onExit} />
        </div>
      </motion.div>
    </>
  );
}
function MenuRow({ label, sub, onClick, danger }: { label: string; sub?: string; onClick: () => void; danger?: boolean }): ReactNode {
  return (
    <button className={`zrow ${danger ? 'danger' : ''}`} onClick={() => { sfx.tap(); onClick(); }}>
      <span className="l">{label}</span>
      {sub && <span className="s">{sub}</span>}
      <svg viewBox="0 0 24 24" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );
}
