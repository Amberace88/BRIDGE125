import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardView, type Flight, type Pose } from '../../components/CardView';
import { after } from '../../components/stageClock';
import { AvatarFrame } from '../../cosmetics/AvatarFrame';
import { PlayerName, TitleBadge } from '../../cosmetics/Badges';
import { botLook, type SeatLook } from '../../cosmetics/seatLooks';
import { useCosmetics } from '../../cosmetics/useCosmetics';
import { useStrings } from '../../i18n/pick';
import { dealTimeline } from '../../pace';
import { buzz, sfx } from '../../sound';
import { useApp } from '../../store';
import type { DurakLevel } from './bot';
import {
  type Action, type Card, type DurakState, SUIT_GLYPH, beats, canTransferWith, cardLabel, isRed, legalActions, sortHand,
} from './engine';
import { DURAK_STRINGS } from './strings';
import '../../styles/table.css';
import './durak.css';

export interface DurakTableProps {
  g: DurakState;
  me: number;
  level: DurakLevel;
  /** animation time multiplier (fast mode < 1) */
  tempo: number;
  fast: boolean;
  onToggleFast: () => void;
  onAct: (a: Action) => void;
  onMenu: () => void;
  onDealing: (on: boolean) => void;
  hints: string[];
  onHint: (id: string) => void;
  /** I am out and the bots finish the game */
  onSkipToEnd?: () => void;
}

interface Banner { id: number; text: string; tone: 'good' | 'bad' | 'info' }
interface Bubble { id: number; seat: number; text: string; tone: 'take' | 'bito' | 'pass' | 'transfer' }

const TILT = 12;
const hash = (id: string, k = 1) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0) * k) % 9973, 7);
const jit = (id: string, k: number, span: number) => ((hash(id, k) % 1000) / 1000 - 0.5) * span;

/* ---------- glyphs ---------- */
const IconMenu = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4 7h16M4 12h11M4 17h16" /></svg>);
const IconFast = () => (<svg viewBox="0 0 24 24" aria-hidden><path className="ch1" d="M5.5 6.5L11 12l-5.5 5.5" /><path className="ch2" d="M12.5 6.5L18 12l-5.5 5.5" /></svg>);
const IconSword = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M19.5 4.5l-9.6 9.6M19.5 4.5v3.2l-8.2 8.2M19.5 4.5h-3.2l-8.2 8.2" /><path d="M6.6 11.8l5.6 5.6M8.4 15.6l-3.9 3.9" /></svg>);
const IconShield = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M12 3.5l7 2.6v5.3c0 4.4-3 7.7-7 9.1-4-1.4-7-4.7-7-9.1V6.1z" /></svg>);
const IconTake = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M5 19.5h14" /></svg>);
const IconDone = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4.5 12.5l4.8 4.8L19.5 7" /></svg>);
const IconPass = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M5 5l8 7-8 7M13 5l6 7-6 7" /></svg>);
const IconTransfer = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" /></svg>);

/* ---------- » fast mode ---------- */
function FastGlyph({ fast, onToggle }: { fast: boolean; onToggle: () => void }) {
  const s = useStrings(DURAK_STRINGS);
  const [tip, setTip] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!tip) return;
    const id = tip.id;
    const tm = setTimeout(() => setTip(x => (x?.id === id ? null : x)), 1500);
    return () => clearTimeout(tm);
  }, [tip]);
  return (
    <div className="pacewrap">
      <button className={`glyph pace ${fast ? 'on' : ''}`} aria-pressed={fast} aria-label={s.fast} title={s.fast}
        onClick={() => { sfx.tap(); onToggle(); setTip({ id: Date.now(), text: `${s.fast} · ${fast ? s.off : s.on}` }); }}>
        <IconFast />
      </button>
      <AnimatePresence>
        {tip && (
          <motion.div key={tip.id} className="pacetip" role="status" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {tip.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- a seat ---------- */
function Seat({ name, face, look, mine, frame, nameColor, title, avSize, count, role, turn, out, place }: {
  name: string; face: string; look?: SeatLook | null; mine?: boolean; frame?: string; nameColor?: string; title?: string; avSize: number;
  count: number; role: 'att' | 'def' | null; turn: boolean; out: boolean; place: number | null;
}) {
  const fr = frame ?? look?.frame;
  const av = <div className="av">{face}</div>;
  const nc = nameColor ?? look?.nameColor;
  const ttl = title ?? look?.title;
  return (
    <div className={`sbadge dkseat ${mine ? 'mine' : ''} ${turn ? 'turn' : ''} ${out ? 'isout' : ''}`}>
      <div className="avwrap">
        {fr && fr !== 'fr_none' ? <AvatarFrame id={fr} size={avSize}>{av}</AvatarFrame> : av}
        {!mine && count > 0 && <span className="cnt">{count}</span>}
        <AnimatePresence>
          {role && !out && (
            <motion.span key={role} className={`dkrole ${role}`} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
              {role === 'att' ? <IconSword /> : <IconShield />}
            </motion.span>
          )}
        </AnimatePresence>
        {out && place != null && <span className="dkplace serif">{place}</span>}
      </div>
      <div className="meta">
        <div className="nm">{nc ? <PlayerName name={name} color={nc} /> : name}{ttl && ttl !== 't_none' && <TitleBadge id={ttl} size="sm" />}</div>
      </div>
    </div>
  );
}

/* =================================================================================== */

export function DurakTable({ g, me, level, tempo, fast, onToggleFast, onAct, onMenu, onDealing, hints, onHint, onSkipToEnd }: DurakTableProps) {
  const app = useApp();
  const { lang, t } = app;
  const s = useStrings(DURAK_STRINGS);
  const cos = useCosmetics();
  const reduce = !!useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({ w: window.innerWidth || 390, h: window.innerHeight || 800 }));
  useLayoutEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const n = g.players.length;
  const mine = g.players[me];
  const looks = useMemo(() => g.players.map((p, i) => (p.bot ? botLook(level, i) : null)), [n, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const nameOf = (i: number) => (i === me ? s.you : g.players[i].name);

  /* ---------- the deal ---------- */
  type Deal = { skip: boolean; tempo: number; home: boolean };
  const [dealing, setDealing] = useState<Deal | null>(() => (g.seq === 0 && !reduce ? { skip: false, tempo, home: false } : null));
  useLayoutEffect(() => { onDealing(!!dealing); }, [!!dealing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onDealing(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  const skipDeal = () => { if (dealing && !dealing.skip) setDealing({ ...dealing, skip: true }); };

  /* ---------- previous state (card flights between zones) ---------- */
  const hist = useRef<{ cur: DurakState; prev: DurakState }>({ cur: g, prev: g });
  if (hist.current.cur !== g) hist.current = { cur: g, prev: hist.current.cur };
  const prev = hist.current.prev;

  /* ---------- selection (defender with several targets) ---------- */
  const [sel, setSel] = useState<string | null>(null);
  const [dragPt, setDragPt] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => { setSel(null); }, [g.seq]);

  /* ---------- layout ---------- */
  const W = size.w, H = size.h;
  const desk = W >= 760 && H >= 560;
  const cw = Math.round(Math.min(desk ? 116 : 96, W * 0.235, H * (desk ? 0.132 : 0.118)));
  const ch = Math.round(cw * 1.43);
  const hs = desk ? 1 : 0.9;
  const tsc = desk ? 0.8 : 0.74;
  const tw = cw * tsc, th = ch * tsc;
  const oppScale = desk ? 0.42 : 0.3;
  const cx = W / 2;
  const m = n - 1;
  const crowd = !desk && m >= 4;
  const seatTop = desk ? 66 : 58;
  const seats = useMemo(() => {
    const y = seatTop;
    if (desk) {
      const sp = Math.min(560, W * 0.38);
      const rows: Record<number, [number, number][]> = {
        1: [[0, 0]], 2: [[-0.5, 12], [0.5, 12]], 3: [[-0.85, 64], [0, 0], [0.85, 64]],
        4: [[-0.95, 80], [-0.34, 4], [0.34, 4], [0.95, 80]], 5: [[-1, 96], [-0.52, 18], [0, 0], [0.52, 18], [1, 96]],
      };
      return (rows[m] ?? rows[1]).map(([k, dy]) => ({ x: cx + k * sp, y: y + dy }));
    }
    const rows: Record<number, [number, number][]> = {
      1: [[0.5, 0]], 2: [[0.27, 0], [0.73, 0]], 3: [[0.15, 30], [0.5, 0], [0.85, 30]],
      4: [[0.11, 44], [0.37, 0], [0.63, 0], [0.89, 44]], 5: [[0.1, 62], [0.3, 8], [0.5, 0], [0.7, 8], [0.9, 62]],
    };
    return (rows[m] ?? rows[1]).map(([k, dy]) => ({ x: W * k, y: y + dy }));
  }, [m, W, cx, desk, seatTop]);
  const rel = (pi: number) => (pi - me + n) % n;
  const seatOf = (pi: number) => seats[rel(pi) - 1] ?? seats[0];
  const avSize = desk ? 46 : crowd ? 34 : 40;
  const fanDY = (desk ? 86 : crowd ? 62 : 68) + (ch * oppScale) / 2;
  const seatsBottom = Math.max(...seats.map(p => p.y)) + fanDY + (ch * oppScale) / 2;

  const sorted = sortHand(mine.hand, g.trump);
  const hn = sorted.length;
  const twoRows = hn > (desk ? 18 : 12);
  const hsc = twoRows ? hs * 0.86 : hs;
  const handY = H - 12 - (ch * hs) / 2 - (desk ? 20 : 4);
  const myRowY = handY - (ch * hs) / 2 - (desk ? 40 : 40) - (twoRows ? 26 : 0);
  const statusY = myRowY - 48;
  const battleTop = seatsBottom + 6, battleBot = statusY - 16;
  const by = Math.round((battleTop + battleBot) / 2);

  const deckX = desk ? cx - Math.min(540, W * 0.37) : Math.round(tw * 0.2);
  const deckY = by;
  const trumpPos = { x: deckX + tw * 0.52, y: deckY };
  const discX = desk ? cx + Math.min(540, W * 0.37) : W - Math.round(tw * 0.16);
  const centre = { x: cx, y: by };

  /* ---------- whose move, what is legal ---------- */
  const playing = g.phase === 'play';
  const live = !dealing;
  const myTurn = live && playing && g.turn === me;
  const legal = myTurn ? legalActions(g, me) : [];
  const defending = myTurn && legal.some(a => a.type === 'take');
  const throwing = myTurn && !defending && g.table.length > 0;
  const leading = myTurn && !g.table.length;
  const attackIds = new Set(legal.flatMap(a => (a.type === 'attack' && a.cards.length === 1 ? a.cards : [])));
  const defendIds = new Set(legal.flatMap(a => (a.type === 'defend' || a.type === 'transfer' ? [a.card] : [])));
  const legalIds = defending ? defendIds : attackIds;
  const cardById = (id: string) => mine.hand.find(c => c.id === id);
  const targetsFor = (c: Card) => g.table.map((p, i) => ({ p, i })).filter(x => !x.p.d && beats(c, x.p.a, g.trump)).map(x => x.i);
  const selCard = sel ? cardById(sel) : undefined;
  const selTargets = selCard && defending ? targetsFor(selCard) : [];
  const selTransfer = !!selCard && defending && canTransferWith(g, selCard);
  const anyTransfer = defending && legal.some(a => a.type === 'transfer');

  const act = (a: Action) => { setSel(null); onAct(a); };
  const playCard = (c: Card) => {
    if (!myTurn || !legalIds.has(c.id)) { buzz(12); return; }
    if (!defending) { act({ type: 'attack', cards: [c.id] }); return; }
    const tg = targetsFor(c);
    const tr = canTransferWith(g, c);
    if (tg.length === 1 && !tr) { act({ type: 'defend', card: c.id, target: tg[0] }); return; }
    if (!tg.length && tr) { act({ type: 'transfer', card: c.id }); return; }
    if (sel === c.id) { setSel(null); return; }
    setSel(c.id); sfx.tap();
  };

  /* ---------- battle grid ---------- */
  const ghost = selTransfer || (anyTransfer && !!dragPt);
  const slots = Math.max(1, g.table.length + (ghost ? 1 : 0));
  const cols = desk ? Math.min(6, slots) : Math.min(2, slots);
  const rowsN = Math.ceil(slots / cols);
  const colStep = desk ? tw * 1.5 : tw * 1.46;
  const rowStep = desk ? th * 1.24 : th * 1.18;
  const gridCx = desk ? cx : cx + Math.round(tw * 0.14);
  const slotPos = (k: number) => {
    const r = Math.floor(k / cols), c = k % cols;
    const inRow = Math.min(cols, slots - r * cols);
    return { x: gridCx + (c - (inRow - 1) / 2) * colStep - tw * 0.1, y: by + (r - (rowsN - 1) / 2) * rowStep - th * 0.07 };
  };
  const battleRect = {
    x0: desk ? cx - colStep * 3.3 : deckX + tw * 1.1, x1: desk ? cx + colStep * 3.3 : W - tw * 0.5,
    y0: by - rowStep * (desk ? 1.25 : 1.75), y1: by + rowStep * (desk ? 1.25 : 1.75),
  };

  /* ---------- poses ---------- */
  const poses = new Map<string, Pose>();
  const talonPose = (i: number, at = { x: deckX, y: deckY }): Pose => {
    const k = Math.min(i, 14) * 0.38;
    return { x: at.x - k * 0.45, y: at.y - k, rot: -1.5, scale: tsc, z: 80 - Math.min(i, 40), up: false, rx: TILT };
  };
  const trumpPose: Pose = { x: trumpPos.x, y: trumpPos.y, rot: 90, scale: tsc, z: 24, up: true, rx: 0 };
  g.talon.forEach((c, i) => {
    const isTrump = c.id === g.trumpCard.id && i === g.talon.length - 1;
    poses.set(c.id, isTrump ? trumpPose : talonPose(i));
  });
  g.discard.forEach((c, i) => {
    poses.set(c.id, { x: discX + jit(c.id, 3, 16), y: by + jit(c.id, 5, 30), rot: jit(c.id, 7, 70), scale: tsc, z: 30 + i, up: false, rx: TILT });
  });
  g.table.forEach((p, k) => {
    const sp = slotPos(k);
    poses.set(p.a.id, { x: sp.x, y: sp.y, rot: jit(p.a.id, 11, 8), scale: tsc, z: 200 + k * 2, up: true, rx: TILT });
    if (p.d) poses.set(p.d.id, { x: sp.x + tw * 0.24, y: sp.y + th * 0.15, rot: 13 + jit(p.d.id, 13, 7), scale: tsc, z: 201 + k * 2, up: true, rx: TILT });
  });
  const oppPose = (pi: number, i: number, cnt: number): Pose => {
    const st = seatOf(pi);
    const spread = Math.min(desk ? 14 : crowd ? 7 : 10, (desk ? 130 : crowd ? 46 : 84) / Math.max(1, cnt));
    const k = i - (cnt - 1) / 2;
    return { x: st.x + k * spread, y: st.y + fanDY + Math.abs(k) * 0.7, rot: k * Math.min(4, 40 / Math.max(1, cnt)), scale: oppScale, z: 100 + i, up: false, rx: 10 };
  };
  g.players.forEach((p, pi) => {
    if (pi === me) return;
    p.hand.forEach((c, i) => poses.set(c.id, oppPose(pi, i, p.hand.length)));
  });
  const hcw = cw * hsc;
  const handPose = (i: number): Pose => {
    let row = 0, idx = i, cnt = hn;
    if (twoRows) { const half = Math.ceil(hn / 2); row = i < half ? 0 : 1; idx = row ? i - half : i; cnt = row ? hn - half : half; }
    const avail = Math.min(W - 40, desk ? 900 : W) - hcw;
    const step = cnt > 1 ? Math.min(hcw * (desk ? 0.66 : 0.6), avail / (cnt - 1)) : 0;
    const k = idx - (cnt - 1) / 2;
    const y = handY + (twoRows ? (row ? 16 : -30) : 0) + k * k * (cnt > 8 ? 0.4 : 1.3);
    return { x: cx + k * step, y, rot: k * Math.min(4, 26 / Math.max(1, cnt)), scale: hsc, z: 300 + (row ? 50 : 0) + idx, up: true, rx: 6 };
  };
  sorted.forEach((c, i) => poses.set(c.id, handPose(i)));

  /* ---------- flights ---------- */
  const flights = new Map<string, Flight>();
  const tl = dealing ? dealTimeline(n, 6, dealing.tempo) : null;
  if (dealing && tl) {
    const from: Pose = { ...talonPose(0, centre), z: 5 };
    const lift = Math.round(cw * 0.1);
    g.players.forEach((p, pi) => {
      p.hand.forEach((c, i) => {
        if (dealing.skip) { flights.set(c.id, { key: 'skip', instant: true }); return; }
        const delay = tl.t0 + (i * n + pi) * tl.iv;
        if (pi === me) {
          const idx = sorted.findIndex(x => x.id === c.id);
          const k = idx - (p.hand.length - 1) / 2;
          const via: Pose = { x: cx + k * cw * 0.2, y: handY + 4, rot: k * 0.8, scale: hs * 0.94, z: 300 + idx, up: false, rx: 9 };
          const settleAt = tl.lastLand + 0.06 * dealing.tempo + idx * tl.fanStep;
          flights.set(c.id, { key: 'deal', glide: true, from, delay, dur: tl.fly, lift, via, settleAt, settleDur: tl.fanDur, flipAt: settleAt, flipDur: tl.fanDur * 0.9, flipLift: Math.round(cw * 0.16) });
        } else flights.set(c.id, { key: 'deal', glide: true, from, delay, dur: tl.fly, lift: Math.round(lift * 0.7) });
      });
    });
    g.talon.forEach((c, i) => {
      const isTrump = c.id === g.trumpCard.id;
      if (dealing.skip) { flights.set(c.id, { key: 'skip', instant: true }); return; }
      if (isTrump) {
        flights.set(c.id, { key: 'deal', glide: true, from, delay: tl.starterAt, dur: tl.fly, lift, flipAt: tl.starterFlip, flipDur: 0.46 * Math.max(0.75, dealing.tempo), flipLift: Math.round(cw * 0.22) });
      } else if (!dealing.home) {
        poses.set(c.id, talonPose(i, centre));
      } else {
        flights.set(c.id, { key: 'home', glide: true, delay: Math.min(i, 20) * 0.006, dur: 0.5 * Math.max(0.75, dealing.tempo) });
      }
    });
  } else if (prev !== g) {
    // where every card was before this step
    const zone = (st: DurakState) => {
      const z = new Map<string, string>();
      st.talon.forEach(c => z.set(c.id, 'T'));
      st.discard.forEach(c => z.set(c.id, 'D'));
      st.table.forEach(p => { z.set(p.a.id, 'B'); if (p.d) z.set(p.d.id, 'B'); });
      st.players.forEach((p, i) => p.hand.forEach(c => z.set(c.id, 'H' + i)));
      return z;
    };
    const z0 = zone(prev), z1 = zone(g);
    const cleared = g.events.some(e => e.t === 'beaten' || e.t === 'took');
    let nb = 0;
    const drawEv = g.events.find(e => e.t === 'draw');
    const drawOrder = drawEv && drawEv.t === 'draw' ? drawEv.draws.flatMap(d => d.ids) : [];
    for (const [id, a] of z0) {
      const b = z1.get(id);
      if (!b || a === b) continue;
      if (a === 'B' && (b === 'D' || b[0] === 'H')) flights.set(id, { key: `c${g.seq}`, delay: (nb++) * 0.045 * tempo });
      else if (a === 'T' && b[0] === 'H') {
        const k = drawOrder.indexOf(id);
        flights.set(id, { key: `d${g.seq}`, delay: ((cleared ? 0.42 : 0) + Math.max(0, k) * 0.1) * tempo });
      }
    }
  }

  // deal: sounds, the deck going home, the end
  useEffect(() => {
    if (!dealing) return;
    if (dealing.skip) { const tm = setTimeout(() => setDealing(null), 380); return () => clearTimeout(tm); }
    const T = dealTimeline(n, 6, dealing.tempo);
    const ticks: (() => void)[] = [];
    const at = (sec: number, f: () => void) => { ticks.push(after(Math.max(0, sec * 1000), f)); };
    sfx.shuffle();
    for (let r = 0; r < 6; r++) for (let j = 0; j < n; j++) {
      const sx = j === me ? cx : seatOf(j).x;
      at(T.t0 + (r * n + j) * T.iv + 0.02, () => sfx.deal((sx - cx) / Math.max(1, W / 2)));
    }
    at(T.starterAt, () => { sfx.deal(-0.6); setDealing(d => (d ? { ...d, home: true } : d)); });
    at(T.starterFlip + 0.12, () => sfx.flip());
    for (let i = 0; i < hn; i++) at(T.lastLand + 0.06 * dealing.tempo + i * T.fanStep + T.fanDur * 0.35, () => sfx.flip());
    at(T.end, () => setDealing(null));
    return () => { ticks.forEach(c => c()); };
  }, [dealing?.skip, !!dealing]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- events → sound, banners, bubbles ---------- */
  const [banner, setBanner] = useState<Banner | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const ids = useRef(0);
  const say = (text: string, tone: Banner['tone']) => setBanner({ id: ++ids.current, text, tone });
  const bubble = (seat: number, text: string, tone: Bubble['tone']) => {
    const id = ++ids.current;
    setBubbles(list => [...list.filter(b => b.seat !== seat), { id, seat, text, tone }]);
    setTimeout(() => setBubbles(list => list.filter(b => b.id !== id)), 1500);
  };
  const startShown = useRef(false);
  useEffect(() => {
    if (dealing || startShown.current) return;
    startShown.current = true;
    if (g.seq !== 0) return;
    const ev = g.events.find(e => e.t === 'start');
    if (ev && ev.t === 'start') {
      if (ev.card) say(ev.p === me ? s.ev.lowTrumpYou(cardLabel(ev.card)) : s.ev.lowTrump(nameOf(ev.p), cardLabel(ev.card)), 'info');
      else say(s.ev.firstMove(nameOf(ev.p)), 'info');
    }
  }, [dealing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prev === g) return;
    // one banner per step: the most important event wins
    let best: { text: string; tone: Banner['tone']; pri: number } | null = null;
    const pick = (text: string, tone: Banner['tone'], pri: number) => { if (!best || pri > best.pri) best = { text, tone, pri }; };
    for (const e of g.events) {
      switch (e.t) {
        case 'attack': case 'defend': sfx.play(); break;
        case 'transfer':
          sfx.mirror(); bubble(e.p, s.bubble.transfer, 'transfer');
          if (e.to === me) { buzz([30, 40, 30]); pick(s.ev.transferYou, 'bad', 3); } else pick(s.ev.transfer(nameOf(e.to)), 'info', 3);
          break;
        case 'take': sfx.alert(); bubble(e.p, s.bubble.take, 'take'); if (e.p !== me) buzz(10); break;
        case 'pass': bubble(e.p, e.bito ? s.bubble.bito : s.bubble.pass, e.bito ? 'bito' : 'pass'); sfx.tap(); break;
        case 'beaten': sfx.whoosh(1); pick(s.ev.beaten, 'good', 2); break;
        case 'took': sfx.draw(); if (e.p === me) pick(s.ev.tookYou, 'bad', 2); else pick(s.ev.took(nameOf(e.p)), 'info', 2); break;
        case 'draw': {
          const all = e.draws.flatMap(d => d.ids.map(() => d.p));
          all.forEach((p, k) => setTimeout(() => sfx.deal((p === me ? 0 : (seatOf(p).x - cx) / Math.max(1, W / 2))), (420 + k * 100) * tempo));
          if (prev.talon.length && !g.talon.length) setTimeout(() => say(s.ev.talonEmpty, 'info'), 900 * tempo);
          break;
        }
        case 'out': sfx.good(); pick(e.p === me ? s.ev.outYou : s.ev.out(nameOf(e.p)), e.p === me ? 'good' : 'info', e.p === me ? 6 : 5); break;
        default: break;
      }
    }
    const b = best as { text: string; tone: Banner['tone'] } | null;
    if (b) say(b.text, b.tone);
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!banner) return;
    const id = banner.id;
    const tm = setTimeout(() => setBanner(x => (x?.id === id ? null : x)), 1900);
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
  const feltRY = useTransform(spx, v => v * 2.2);
  const feltRX = useTransform(spy, v => 15 - v * 1.5);
  const layerX = useTransform(spx, v => v * -5), layerY = useTransform(spy, v => v * -3);

  /* ---------- drag & drop ---------- */
  const toStage = (pt: { x: number; y: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    return r ? { x: pt.x - r.left, y: pt.y - r.top } : pt;
  };
  const inBattle = (p: { x: number; y: number }) => p.x > battleRect.x0 && p.x < battleRect.x1 && p.y > battleRect.y0 && p.y < battleRect.y1;
  const targetAt = (p: { x: number; y: number }, c: Card) => {
    let best = -1, bd = Infinity;
    for (const i of targetsFor(c)) {
      const sp = slotPos(i);
      const d = Math.hypot(p.x - sp.x, p.y - sp.y);
      if (d < tw * 0.95 && d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const onDrop = (c: Card) => (pt: { x: number; y: number }) => {
    if (!myTurn) return false;
    const p = toStage(pt);
    if (!defending) {
      if (!inBattle(p) || !attackIds.has(c.id)) return false;
      act({ type: 'attack', cards: [c.id] }); return true;
    }
    const tg = targetAt(p, c);
    if (tg >= 0) { act({ type: 'defend', card: c.id, target: tg }); return true; }
    if (canTransferWith(g, c)) {
      const gp = slotPos(g.table.length);
      if (Math.hypot(p.x - gp.x, p.y - gp.y) < tw * 1.1 || inBattle(p)) {
        // inside the zone but not on a beatable card: transfer only if the card cannot beat anything there
        if (Math.hypot(p.x - gp.x, p.y - gp.y) < tw * 1.1 || !targetsFor(c).length) { act({ type: 'transfer', card: c.id }); return true; }
      }
    }
    const t1 = targetsFor(c);
    if (inBattle(p) && t1.length === 1) { act({ type: 'defend', card: c.id, target: t1[0] }); return true; }
    buzz(12);
    return false;
  };
  const dragStage = dragPt ? toStage(dragPt) : null;
  const dragOver = !!dragStage && inBattle(dragStage);

  /* ---------- hints ---------- */
  const hintId = !myTurn ? null : defending ? (anyTransfer && !hints.includes('transfer') ? 'transfer' : 'defend') : leading ? 'attack' : g.taking ? 'taking' : 'throwIn';
  const showHint = !!hintId && !hints.includes(hintId);
  const hintText = hintId ? s.hints[hintId as keyof typeof s.hints] : '';
  useEffect(() => { if (showHint && hintId) return () => onHint(hintId); }, [showHint ? hintId : null]); // eslint-disable-line react-hooks/exhaustive-deps
  // (a hint counts as seen once the moment passes — the player acted)

  /* ---------- status + button ---------- */
  const meOut = mine.out;
  let status = '';
  if (dealing) status = s.st.dealing;
  else if (meOut && playing) status = s.st.youOut;
  else if (myTurn) status = defending ? (sel ? s.st.selectTarget : s.st.defend) : leading ? s.st.attack : g.taking ? s.st.throwTaking : s.st.throwIn;
  else if (playing) status = s.st.waiting(nameOf(g.turn));
  type Btn = { kind: 'take' | 'bito' | 'pass'; label: string; icon: ReactNode };
  const btn: Btn | null = !myTurn ? null
    : defending ? { kind: 'take', label: s.take, icon: <IconTake /> }
    : throwing ? (me === g.attacker && !g.taking ? { kind: 'bito', label: s.bito, icon: <IconDone /> } : { kind: 'pass', label: s.pass, icon: <IconPass /> })
    : null;

  /* ---------- render ---------- */
  const allCards: Card[] = [...g.talon, ...g.discard, ...g.table.flatMap(p => (p.d ? [p.a, p.d] : [p.a])), ...g.players.flatMap(p => p.hand)];
  const ownerOf = new Map<string, number>();
  // a card leaving an opponent's hand keeps their back while it flies (it turns face up on the way)
  if (prev !== g) prev.players.forEach((p, pi) => { if (pi !== me) p.hand.forEach(c => ownerOf.set(c.id, pi)); });
  g.players.forEach((p, pi) => { if (pi !== me) p.hand.forEach(c => ownerOf.set(c.id, pi)); });
  const roleOf = (pi: number): 'att' | 'def' | null => (!playing && g.phase !== 'resolve') || dealing ? null : pi === g.defender ? 'def' : pi === g.attacker ? 'att' : null;
  const myLeft = desk ? Math.max(18, cx - 400) : 10;
  const seatPt = (i: number) => (i === me ? { x: myLeft + avSize / 2, y: myRowY } : { x: seatOf(i).x, y: seatOf(i).y + avSize / 2 });
  const feltTop = desk ? 96 : seatTop + 60;
  const feltBottom = desk ? H - 56 : H - 6;
  const feltW = desk ? Math.min(W - 110, 1280) : W - 12;
  const feltH = feltBottom - feltTop;
  const feltR = Math.min(feltW, feltH) / 2;
  const variant = `${g.rules.transfer ? s.perevodnoy : s.podkidnoy} · ${g.rules.deck}`;

  return (
    <div ref={stageRef} className={`stage tbl dk ${desk ? 'desk' : ''} ${crowd ? 'crowd' : ''} ${dealing ? 'is-dealing' : ''}`} onPointerMove={onPointerMove}
      onPointerDownCapture={() => { if (dealing) skipDeal(); }} style={{ ['--cw' as string]: `${cw}px` }}>
      <div className="room" aria-hidden />
      <motion.div className="tableplane" aria-hidden
        style={{ left: (W - feltW) / 2, top: feltTop, width: feltW, height: feltH, borderRadius: feltR, rotateX: reduce ? 15 : feltRX, rotateY: reduce ? 0 : feltRY, transformPerspective: 1300 }}>
        <div className="rail" style={{ borderRadius: feltR }} />
        <div className="felt" style={{ borderRadius: Math.max(0, feltR - 14) }} />
      </motion.div>
      <div className="spot" aria-hidden />
      <div className="feltclick" onClick={() => setSel(null)} aria-hidden />

      {/* top bar */}
      <div className="tbar has-pace">
        <button className="glyph" aria-label={s.menu} title={s.menu} onClick={onMenu}><IconMenu /></button>
        <div className="tcenter">
          <div className="rnd serif">{s.title}</div>
          <div className="rules dkvariant"><span>{variant}</span></div>
        </div>
        <div className="tright"><FastGlyph fast={fast} onToggle={onToggleFast} /></div>
      </div>

      {/* opponents */}
      <div className="seats">
        {g.players.map((p, pi) => pi === me ? null : (
          <div key={p.id} className="seatpos" style={{ left: seatOf(pi).x, top: seatOf(pi).y - 6 }}>
            <Seat name={p.name} face={p.name.slice(0, 1).toUpperCase()} look={looks[pi]} avSize={avSize} count={p.hand.length}
              role={roleOf(pi)} turn={g.turn === pi && !dealing} out={p.out} place={p.place} />
          </div>
        ))}
      </div>

      {/* talon furniture: count + trump medallion */}
      <div className="dkfurn" aria-hidden={false}>
        <AnimatePresence>
          {!dealing && g.talon.length > 0 && (
            <motion.div key="cnt" className="dkcount serif" style={{ left: deckX + tw * 0.08, top: deckY - th / 2 - 14 }}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} aria-label={s.talon(g.talon.length)}>
              {g.talon.length}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div className={`dktrump ${isRed(g.trump) ? 'red' : ''} ${g.talon.length ? '' : 'alone'}`} title={s.trump} aria-label={`${s.trump}: ${SUIT_GLYPH[g.trump]}`}
          style={{ left: g.talon.length ? Math.max(28, deckX) : Math.max(36, deckX + tw * 0.25), top: g.talon.length ? deckY + th / 2 + 32 : deckY }}
          initial={{ scale: 0, rotateY: 180 }} animate={{ scale: dealing && !dealing.home ? 0 : 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 17 }}>
          <span>{SUIT_GLYPH[g.trump]}</span>
        </motion.div>
      </div>

      {/* battle zone glow while dragging */}
      <div className={`dkzone ${dragOver ? 'over' : ''} ${myTurn && !defending && !dealing ? 'invite' : ''}`}
        style={{ left: battleRect.x0, top: battleRect.y0, width: battleRect.x1 - battleRect.x0, height: battleRect.y1 - battleRect.y0 }} aria-hidden />

      {/* cards */}
      <motion.div className="cards" style={{ x: layerX, y: layerY }}>
        {allCards.map(c => {
          const pose = poses.get(c.id)!;
          const isMine = mine.hand.some(h => h.id === c.id);
          const owner = ownerOf.get(c.id) ?? -1;
          const onTable = g.table.findIndex(p => p.a.id === c.id && !p.d);
          const isTarget = onTable >= 0 && selTargets.includes(onTable);
          const lg = isMine && myTurn && !sel && legalIds.has(c.id);
          const canDrag = isMine && myTurn && !reduce && legalIds.has(c.id);
          return (
            <CardView key={c.id} card={c} lang={lang} w={cw} pose={pose} flight={flights.get(c.id)} tempo={tempo}
              legal={lg || isTarget} sel={sel === c.id}
              dim={isMine && myTurn && !legalIds.has(c.id)}
              onTap={isMine && myTurn ? () => playCard(c) : isTarget ? () => act({ type: 'defend', card: sel!, target: onTable }) : undefined}
              draggable={canDrag} onDrop={canDrag ? onDrop(c) : undefined} onDragMove={canDrag ? setDragPt : undefined}
              back={owner >= 0 ? looks[owner]?.back : undefined} />
          );
        })}
        {/* transfer slot */}
        <AnimatePresence>
          {ghost && (() => {
            const gp = slotPos(g.table.length);
            return (
              <motion.button key="ghost" className="dkghost" style={{ left: gp.x - tw / 2, top: gp.y - th / 2, width: tw, height: th }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                aria-label={s.transfer} onClick={() => { if (selCard && selTransfer) act({ type: 'transfer', card: selCard.id }); }}>
                <IconTransfer /><span>{s.transfer}</span>
              </motion.button>
            );
          })()}
        </AnimatePresence>
      </motion.div>

      {/* bubbles */}
      <AnimatePresence>
        {bubbles.map(b => {
          const sp = seatPt(b.seat);
          const mineB = b.seat === me;
          return (
            <motion.div key={b.id} className={`dkbubble ${b.tone} ${mineB ? 'me' : ''}`} style={{ left: mineB ? sp.x + 30 : sp.x, top: mineB ? sp.y - 52 : sp.y + avSize / 2 + 18 }}
              initial={{ opacity: 0, scale: 0.5, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -6 }}
              transition={{ type: 'spring', stiffness: 460, damping: 22 }}>
              {b.text}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* banner */}
      <AnimatePresence mode="wait">
        {banner && (
          <motion.div key={banner.id} className="banner dkbanner" style={{ top: Math.max(battleTop - 8, by - rowStep * 1.1 - 30) }}
            initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
            <div className={`pill ${banner.tone}`}>{banner.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* status */}
      <div className="statusline" style={{ top: statusY }}>
        <AnimatePresence mode="wait">
          <motion.div key={status} className={`st ${myTurn ? 'mine' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {status}
            {dealing && <span className="skiphint">{s.st.tapToSkip}</span>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* hint */}
      <AnimatePresence>
        {showHint && !dealing && (
          <motion.div key={hintId} className="dkhint" style={{ top: statusY - 96 }} role="note"
            initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ delay: 0.35 }}>
            <span>{hintText}</span>
            <button onClick={() => hintId && onHint(hintId)}>{s.hints.gotIt}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* my row */}
      <div className="myrow" style={{ top: myRowY - 24, left: myLeft, right: myLeft }}>
        <Seat mine name={app.name || t.you} face={app.avatar || (app.name || t.you).slice(0, 1).toUpperCase()} frame={cos.equipped.frame}
          nameColor={cos.equipped.namecolor} title={cos.equipped.title} avSize={avSize} count={hn} role={roleOf(me)} turn={myTurn} out={meOut} place={mine.place} />
        <div className="dkacts">
          <AnimatePresence mode="popLayout">
            {btn && (
              <motion.button key={btn.kind} className={`dkbtn ${btn.kind}`} onClick={() => { buzz(10); act({ type: btn.kind === 'take' ? 'take' : 'pass' }); }}
                initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.7 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}>
                {btn.icon}<span>{btn.label}</span>
              </motion.button>
            )}
            {meOut && g.phase !== 'over' && onSkipToEnd && (
              <motion.button key="skip" className="dkbtn pass" onClick={onSkipToEnd} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <IconPass /><span>{s.end.skip}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
