import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { SHOP_STRINGS, type ShopStrings } from '../i18n/shop';
import { TABLES, backCss } from '../theme';
import { CardFace } from '../components/CardView';
import { track } from '../analytics';
import { sfx, buzz } from '../sound';
import { buyItemRpc } from '../progress/api';
import { openDailyReward, syncAppProfile, useProgress } from '../progress/useProgress';
import {
  BUNDLES, COSMETICS, FEATURED_ID, PASS, TRENDING_IDS, accentOf, cosmetic, fmtBm, fmtEur, forSlot, themeName,
  type Bundle, type Cosmetic, type Slot,
} from '../shop/catalog';
import { CoinBurst, Ticker } from './Rewards';
import '../styles/shop.css';

type Tab = 'featured' | 'tables' | 'backs' | 'colours' | 'bundles';
const TABS: Tab[] = ['featured', 'tables', 'backs', 'colours', 'bundles'];
const TAB_SLOT: Record<Tab, Slot | null> = { featured: null, tables: 'table', backs: 'back', colours: 'accent', bundles: null };
type S = ShopStrings['shop'];

const NOTIFY_KEY = 'b125.shop.notify';

/* ================================================================== helpers */

const nameOf = (S: S, c: Cosmetic) => S.items[c.id] ?? themeName(c.id, c.slots[0]);
const kindLabel = (S: S, c: Cosmetic) => (c.kind === 'set' ? S.setOf(c.slots.map(s => S.kinds[s]).join(' + ')) : S.kinds[c.kind]);
const accentVars = (id: string): CSSProperties => {
  const a = accentOf(id);
  return { ['--acc' as string]: a.base, ['--acc-hi' as string]: a.hi, ['--acc-lo' as string]: a.lo, ['--acc-ink' as string]: a.ink };
};
/** The single most representative background of an item (used by the flying clone). */
function swatchCss(c: Cosmetic, tableId: string): string {
  if (c.slots.includes('table')) return (TABLES.find(t => t.id === c.id) ?? TABLES[0]).css;
  if (c.slots.includes('back') && !c.slots.includes('accent')) return backCss(c.id, tableId);
  const a = accentOf(c.id);
  return `radial-gradient(circle at 35% 30%, ${a.hi}, ${a.base} 55%, ${a.lo})`;
}

function useNotify(): [string[], (id: string) => boolean] {
  const [ids, setIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(NOTIFY_KEY) ?? '[]') as string[]; } catch { return []; } });
  const toggle = (id: string) => {
    const on = !ids.includes(id);
    const next = on ? [...ids, id] : ids.filter(x => x !== id);
    setIds(next);
    try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(next)); } catch { /* */ }
    track('shop_notify', { item: id, on });
    return on;
  };
  return [ids, toggle];
}

/** Pointer-driven 3D tilt + moving glare (mouse only; touch gets a press effect instead). */
function useTilt(max = 9) {
  const rx = useMotionValue(0), ry = useMotionValue(0), gx = useMotionValue(50), gy = useMotionValue(30);
  const srx = useSpring(rx, { stiffness: 220, damping: 20 }), sry = useSpring(ry, { stiffness: 220, damping: 20 });
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.20), rgba(255,255,255,0) 55%)`;
  const onPointerMove = (e: RPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max); rx.set(-(py - 0.5) * 2 * max); gx.set(px * 100); gy.set(py * 100);
  };
  const onPointerLeave = () => { rx.set(0); ry.set(0); gx.set(50); gy.set(30); };
  return { style: { rotateX: srx, rotateY: sry }, glare, onPointerMove, onPointerLeave };
}

/* ================================================================== live previews */

function MiniBack({ css, style }: { css: string; style?: CSSProperties }) {
  return <span className="pvcard" style={{ background: css, ...style }}><i /></span>;
}

function TablePreview({ id, back }: { id: string; back: string }) {
  const tb = TABLES.find(t => t.id === id) ?? TABLES[0];
  const bk = backCss(back, id);
  return (
    <div className="pv pvtable" style={{ background: tb.css, backgroundColor: tb.tone }}>
      <span className="pvrim" />
      <div className="pvfan">
        <MiniBack css={bk} style={{ transform: 'translate(-34px, 6px) rotate(-14deg)' }} />
        <MiniBack css={bk} style={{ transform: 'translate(0, -2px) rotate(0deg)' }} />
        <MiniBack css={bk} style={{ transform: 'translate(34px, 6px) rotate(14deg)' }} />
      </div>
      <span className="pvchips"><i /><i /><i /></span>
    </div>
  );
}

function BackPreview({ id }: { id: string }) {
  const app = useApp();
  const tb = TABLES.find(t => t.id === app.table) ?? TABLES[0];
  return (
    <div className="pv pvback" style={{ background: tb.css, backgroundColor: tb.tone }}>
      <span className="pvrim" />
      <div className="pvduo">
        <div className="card pvface" style={{ width: 58, height: 83, ['--cw' as string]: '58px' }}><CardFace card={{ id: 'AS', r: 'A', s: 'S' }} lang={app.lang} /></div>
        <MiniBack css={backCss(id, app.table)} style={{ width: 62, height: 89 }} />
      </div>
    </div>
  );
}

function AccentPreview({ id, back }: { id: string; back?: string }) {
  const app = useApp();
  const tb = TABLES.find(t => t.id === app.table) ?? TABLES[0];
  return (
    <div className="pv pvaccent" style={{ background: tb.css, backgroundColor: tb.tone, ...accentVars(id) }}>
      <span className="pvrim" />
      <span className="pvgem"><i /></span>
      <span className="pv125 serif">125</span>
      <span className="pvbtn">♠ {app.t.nav.play}</span>
      {back && <MiniBack css={backCss(back, app.table)} style={{ position: 'absolute', right: 12, top: '50%', marginTop: -32, width: 38, height: 54, transform: 'rotate(10deg)', zIndex: 1 }} />}
    </div>
  );
}

function ItemPreview({ c, slot }: { c: Cosmetic; slot: Slot | null }) {
  const s: Slot = slot && c.slots.includes(slot) ? slot : c.slots.includes('table') ? 'table' : c.slots.includes('accent') ? 'accent' : 'back';
  if (s === 'table') return <TablePreview id={c.id} back={c.slots.includes('back') ? c.id : 'match'} />;
  if (s === 'back') return <BackPreview id={c.id} />;
  return <AccentPreview id={c.id} back={c.slots.includes('back') ? c.id : undefined} />;
}

/* ================================================================== item card */

interface CardCtx {
  S: S; guest: boolean; admin: boolean; owned: (id: string) => boolean; bought: (id: string) => boolean; equipped: (c: Cosmetic, slot: Slot | null) => boolean;
  onBuy: (c: Cosmetic, slot: Slot | null) => void; onEquip: (c: Cosmetic, slot: Slot | null) => void; onAuth: () => void;
}

function PriceTag({ bm }: { bm: number }) {
  return <span className="sprice"><i className="scoin" />{fmtBm(bm)}</span>;
}

function ItemCard({ c, slot, ctx, i = 0, hero = false, blurb }: { c: Cosmetic; slot: Slot | null; ctx: CardCtx; i?: number; hero?: boolean; blurb?: string }) {
  const { S } = ctx;
  const tilt = useTilt(hero ? 6 : 10);
  const own = ctx.owned(c.id);
  const eq = own && ctx.equipped(c, slot);
  let action: ReactNode;
  if (ctx.guest) action = <button className="sact ghost" onClick={ctx.onAuth}>🔒 {S.signInToBuy}</button>;
  else if (eq) action = <span className="sact on">✓ {S.equipped}</span>;
  else if (own) action = <button className="sact equip" onClick={() => ctx.onEquip(c, slot)}>{!slot && c.slots.length > 1 ? S.equipAll : S.equip}</button>;
  else action = <button className="sact buy" onClick={() => ctx.onBuy(c, slot)}><PriceTag bm={c.priceBm} /></button>;

  return (
    <motion.div className={`scell ${hero ? 'shero' : ''}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, type: 'spring', stiffness: 220, damping: 24 }}>
      <motion.article className={`sitem r-${c.rarity} ${own ? 'own' : ''} ${eq ? 'eq' : ''}`} style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
        whileTap={{ scale: 0.985 }}>
        <span className="sglow" aria-hidden />
        <div className="sframe">
          <div className="sprev" data-shop-preview={c.id}>
            <ItemPreview c={c} slot={slot} />
            <motion.span className="sglare" style={{ background: tilt.glare }} aria-hidden />
            <span className={`srar r-${c.rarity}`}>{S.rarity[c.rarity]}</span>
            {c.tag && !own && <span className={`stag ${c.tag}`}>{S.tags[c.tag]}</span>}
            {own && <span className="sown" title={eq ? S.equipped : S.owned} aria-label={eq ? S.equipped : S.owned}>{ctx.bought(c.id) ? '✓' : '👑'}</span>}
          </div>
          <div className="sinfo">
            <div className="stitle">
              <b className={hero ? 'serif' : ''}>{nameOf(S, c)}</b>
              <small>{kindLabel(S, c)}</small>
            </div>
            {hero && blurb && <p className="sblurb">{blurb}</p>}
            <div className="sfoot">
              {ctx.admin && !ctx.bought(c.id) && <span className="sadmin">👑 {S.adminFree}</span>}
              {action}
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

/* ================================================================== BM bundles & pass */

function CoinPile({ n }: { n: number }) {
  const coins = Array.from({ length: n }, (_, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    return { x: (col - 1) * 22 + (row % 2 ? 11 : 0), y: -row * 7 - (col === 1 ? 4 : 0), z: row * 3 + col };
  });
  return (
    <span className="cpile" aria-hidden>
      {coins.map((c, i) => <i key={i} style={{ transform: `translate(${c.x}px, ${c.y}px)`, zIndex: c.z }} />)}
    </span>
  );
}

function NotifyRow({ id, on, onToggle, S }: { id: string; on: boolean; onToggle: (id: string) => void; S: S }) {
  return (
    <button className={`snotify ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => onToggle(id)}>
      <span>{on ? `🔔 ${S.notifyOn}` : S.notifyMe}</span>
      <span className={`switch ${on ? 'on' : ''}`}><i /></span>
    </button>
  );
}

function BundleCard({ b, i, S, lang, notify, onToggle }: { b: Bundle; i: number; S: S; lang: string; notify: string[]; onToggle: (id: string) => void }) {
  const tilt = useTilt(8);
  return (
    <motion.div className="scell" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
      <motion.article className={`sitem sbundle r-${b.rarity}`} style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
        <span className="sglow" aria-hidden />
        <div className="sframe">
          <div className="sprev bprev">
            <span className="bshine" />
            <CoinPile n={[4, 7, 10, 14][i] ?? 6} />
            <motion.span className="sglare" style={{ background: tilt.glare }} aria-hidden />
            {b.bonusPct > 0 && <span className="bbonus">{S.bundleBonus(b.bonusPct)}</span>}
            {b.best && <span className="stag best">{S.bestValue}</span>}
          </div>
          <div className="sinfo">
            <div className="stitle bnum"><b className="serif">{fmtBm(b.bm)}</b><small>Bridge Money</small></div>
            <div className="sfoot col">
              <div className="bprice"><span className="seur">{fmtEur(b.priceEur, lang)}</span><em className="soonchip">{S.comingSoon}</em></div>
              <NotifyRow id={b.id} on={notify.includes(b.id)} onToggle={onToggle} S={S} />
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

function PassCard({ S, lang, notify, onToggle }: { S: S; lang: string; notify: string[]; onToggle: (id: string) => void }) {
  const tilt = useTilt(4);
  return (
    <motion.article className="spass" style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <span className="passbg" aria-hidden />
      <motion.span className="sglare" style={{ background: tilt.glare }} aria-hidden />
      <div className="passmain">
        <span className="passseason">{S.passSeason}</span>
        <h3 className="serif">{S.passTitle}</h3>
        <p>{S.passSub}</p>
        <ul>{S.passPerks.map(x => <li key={x}>{x}</li>)}</ul>
      </div>
      <div className="passside">
        <div className="passticket" aria-hidden><span className="serif">B</span><i /></div>
        <span className="seur">{fmtEur(PASS.priceEur, lang)}</span>
        <em className="soonchip">{S.comingSoon}</em>
        <NotifyRow id={PASS.id} on={notify.includes(PASS.id)} onToggle={onToggle} S={S} />
      </div>
    </motion.article>
  );
}

/* ================================================================== buy modal */

type BuyState = 'confirm' | 'busy' | 'done' | 'funds' | 'error';

function BuyModal({ c, slot, S, bm, admin, onClose, onBought, onEquip, canDaily }: {
  c: Cosmetic; slot: Slot | null; S: S; bm: number; admin: boolean; canDaily: boolean;
  onClose: () => void; onBought: (from: DOMRect | null) => void; onEquip: () => void;
}) {
  const app = useApp();
  const [st, setSt] = useState<BuyState>(() => (!admin && bm < c.priceBm ? 'funds' : 'confirm'));
  const [need, setNeed] = useState(Math.max(0, c.priceBm - bm));
  const [err, setErr] = useState('');
  const prevRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && st !== 'busy') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose, st]);

  const buy = async () => {
    setSt('busy'); sfx.tap();
    const [r] = await Promise.all([buyItemRpc(c.id), new Promise(res => setTimeout(res, 450))]);
    if (r.ok || r.error === 'owned') {
      if (r.ok) track('shop_buy', { item: c.id, price: r.price ?? c.priceBm, admin: !!r.admin, kind: c.kind });
      setSt('done'); sfx.big(); buzz([20, 40, 30]);
      onBought(prevRef.current?.getBoundingClientRect() ?? null);
      void syncAppProfile(app, { ...(r.bm !== undefined ? { bm: r.bm } : {}), ...(r.owned ? { owned: r.owned } : {}) });
      return;
    }
    if (r.error === 'funds') { setNeed(r.need ?? need); setSt('funds'); if (r.bm !== undefined) void syncAppProfile(app, { bm: r.bm }); return; }
    setErr(S.errors[(r.error ?? 'generic') as keyof S['errors']] ?? S.errors.generic);
    setSt('error'); sfx.alert();
  };

  const after = bm - (admin ? 0 : c.priceBm);
  return (
    <>
      <motion.div className="sscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => st !== 'busy' && onClose()} />
      <div className="smwrap" role="dialog" aria-modal="true" aria-label={S.confirmTitle}>
        <motion.div className={`smodal r-${c.rarity} ${st}`} initial={{ opacity: 0, y: 50, scale: 0.92, rotateX: 12 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
          <div className="smprev" ref={prevRef}>
            <ItemPreview c={c} slot={slot} />
            <span className={`srar r-${c.rarity}`}>{S.rarity[c.rarity]}</span>
            <AnimatePresence>
              {st === 'done' && (
                <motion.div key="ok" className="smunlocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.span className="smseal" initial={{ scale: 2.4, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}>
                    {S.unlocked}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
            {st === 'done' && <CoinBurst n={22} spread={190} />}
          </div>
          <div className="smbody">
            <div className="smtitle">
              <b className="serif">{nameOf(S, c)}</b>
              <small>{kindLabel(S, c)}</small>
            </div>

            {st === 'done' ? (
              <>
                <p className="smsub">{S.unlockedSub}</p>
                <div className="smacts">
                  <button className="btn acc" onClick={onEquip}>{S.equipNow}</button>
                  <button className="btn ghost" onClick={onClose}>{S.keepShopping}</button>
                </div>
              </>
            ) : st === 'funds' ? (
              <>
                <div className="smfunds">
                  <b>{S.notEnough(fmtBm(need))}</b>
                  <div className="smbar"><i style={{ width: `${Math.min(100, (bm / c.priceBm) * 100)}%` }} /></div>
                  <span>{S.earnHint}</span>
                </div>
                <div className="smacts">
                  {canDaily && <button className="btn acc" onClick={() => { onClose(); openDailyReward(); }}>{S.getDaily}</button>}
                  <button className="btn ghost" onClick={onClose}>{S.cancel}</button>
                </div>
              </>
            ) : (
              <>
                <div className="smrows">
                  <div><span>{S.confirmTitle}</span>{admin ? <b className="sadmin">👑 {S.adminFree}</b> : <PriceTag bm={c.priceBm} />}</div>
                  {!admin && <div className="mute"><span>{S.balanceAfter}</span><span className="smafter"><i className="coin" />{fmtBm(after)}</span></div>}
                </div>
                {st === 'error' && <div className="autherr" style={{ marginTop: 10 }}>{err}</div>}
                <div className="smacts">
                  <button className="btn acc" onClick={buy} disabled={st === 'busy'}>
                    {st === 'busy' ? <><span className="spinner" />{S.buying}</> : admin ? S.equipNow : <>{S.confirmBuy('')}<PriceTag bm={c.priceBm} /></>}
                  </button>
                  <button className="btn ghost" onClick={onClose} disabled={st === 'busy'}>{S.cancel}</button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

/** A clone of the bought item that arcs from the modal into the collection badge. */
function FlyItem({ from, to, bg, onDone }: { from: DOMRect; to: DOMRect; bg: string; onDone: () => void }) {
  const w = Math.min(from.width, 220), h = w * 0.62;
  const x0 = from.left + from.width / 2 - w / 2, y0 = from.top + from.height / 2 - h / 2;
  const dx = to.left + to.width / 2 - (x0 + w / 2), dy = to.top + to.height / 2 - (y0 + h / 2);
  const k = Math.max(0.08, to.width / w);
  return (
    <motion.div className="sfly" style={{ left: x0, top: y0, width: w, height: h, background: bg }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 0, rotate: 0 }}
      animate={{ x: [0, dx * 0.35, dx], y: [0, dy * 0.35 - 90, dy], scale: [1, 0.72, k], opacity: [0, 1, 0.9], rotate: [0, -10, 8] }}
      transition={{ duration: 0.95, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
      onAnimationComplete={onDone} />
  );
}

/* ================================================================== screen */

export function ShopScreen({ onClose, onAuth, initialTab = 'featured' }: { onClose: () => void; onAuth: () => void; initialTab?: Tab }) {
  const app = useApp();
  const Sall = useStrings(SHOP_STRINGS);
  const S = Sall.shop;
  const p = useProgress();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [buying, setBuying] = useState<{ c: Cosmetic; slot: Slot | null } | null>(null);
  const [fly, setFly] = useState<{ from: DOMRect; to: DOMRect; bg: string } | null>(null);
  const [pop, setPop] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [notify, toggleNotify] = useNotify();
  const bagRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const toastTm = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guest = !app.session;
  const admin = app.isAdmin;
  const ownedSet = new Set(p.owned);
  const owned = (id: string) => admin || ownedSet.has(id);
  const ownedCount = COSMETICS.filter(c => owned(c.id)).length;

  useEffect(() => { track('shop_view', { signed_in: !guest, admin }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !buying) onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose, buying]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [tab]);

  const flash = (m: string) => { setToast(m); if (toastTm.current) clearTimeout(toastTm.current); toastTm.current = setTimeout(() => setToast(null), 2400); };

  const equipped = (c: Cosmetic, slot: Slot | null) => {
    const parts = slot && c.slots.includes(slot) ? [slot] : c.slots;
    return parts.every(s => (s === 'table' ? app.table : s === 'accent' ? app.accent : app.cardBack) === c.id);
  };
  const equip = async (c: Cosmetic, slot: Slot | null) => {
    const parts = slot && c.slots.includes(slot) ? [slot] : c.slots;
    const patch: { table?: string; accent?: string; cardBack?: string } = {};
    for (const s of parts) { if (s === 'table') patch.table = c.id; else if (s === 'accent') patch.accent = c.id; else patch.cardBack = c.id; }
    sfx.good(); buzz(15);
    flash(S.equippedToast(nameOf(S, c)));
    await app.saveProfile(patch);
    track('shop_equip', { item: c.id });
  };

  const ctx: CardCtx = {
    S, guest, admin, owned, bought: id => ownedSet.has(id), equipped,
    onBuy: (c, slot) => { sfx.tap(); setBuying({ c, slot }); },
    onEquip: (c, slot) => { void equip(c, slot); },
    onAuth,
  };

  const onBought = (from: DOMRect | null) => {
    const to = bagRef.current?.getBoundingClientRect();
    if (from && to && buying) setTimeout(() => setFly({ from, to, bg: swatchCss(buying.c, app.table) }), 350);
  };

  const slot = TAB_SLOT[tab];
  const featured = cosmetic(FEATURED_ID)!;

  return (
    <motion.div className="shop" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <span className="shopbg" aria-hidden />
      <header className="shophead">
        <div className="shoprow">
          <button className="iconbtn" onClick={onClose} aria-label={Sall.daily.close}>‹</button>
          <div className="shoptitle">
            <h1 className="serif">{S.title}</h1>
            <span>{S.sub}</span>
          </div>
          {!guest && (
            <motion.div ref={bagRef} key={'bag' + pop} className="sbag" title={S.collection(ownedCount, COSMETICS.length)}
              initial={pop ? { scale: 1.35 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 12 }}>
              <span className="sbagicon" aria-hidden><i /><i /></span>
              <b>{ownedCount}<small>/{COSMETICS.length}</small></b>
            </motion.div>
          )}
          {guest ? (
            <button className="btn acc sm" onClick={onAuth}>{S.signIn}</button>
          ) : (
            <div className="sbal" aria-label={`${S.balance}: ${fmtBm(p.bm)} BM`}>
              <span className="scoin3d" aria-hidden><i /></span>
              <b><Ticker to={p.bm} /></b>
            </div>
          )}
        </div>
        <nav className="stabs" role="tablist">
          {TABS.map(k => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); sfx.tap(); }}>
              {tab === k && <motion.span layoutId="stab" className="stabpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{S.tabs[k]}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="shopbody" ref={bodyRef}>
        <div className="shopwrap">
          {guest && (
            <motion.div className="sguest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span className="scoin3d big" aria-hidden><i /></span>
              <div><b>{S.guestTitle}</b><span>{S.guestSub}</span></div>
              <button className="btn acc sm" onClick={onAuth}>{S.signIn}</button>
            </motion.div>
          )}
          {admin && <div className="adminnote" style={{ marginTop: 0, marginBottom: 14 }}>👑 {S.adminFree}</div>}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}>
              {tab === 'featured' && (
                <>
                  <div className="ssec"><b className="serif">{S.featured}</b><span>{S.featuredSub}</span></div>
                  <div className="sgrid one"><ItemCard c={featured} slot={null} ctx={ctx} hero blurb={S.blurbs[featured.id]} /></div>

                  {!guest && p.ready && (
                    p.canClaim ? (
                      <motion.button className="sdaily" onClick={openDailyReward} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileTap={{ scale: 0.98 }}>
                        <span className="sdchest"><i className="dchestmini big" /></span>
                        <span className="sdtxt"><b>{S.dailyCta}</b><span>{S.dailyCtaSub}</span></span>
                        <span className="sdgo" aria-hidden>→</span>
                      </motion.button>
                    ) : <div className="sdailydone">✓ {S.dailyDone}</div>
                  )}

                  <div className="ssec"><b className="serif">{S.trending}</b></div>
                  <div className="sgrid">
                    {TRENDING_IDS.map((id, i) => <ItemCard key={id} c={cosmetic(id)!} slot={null} ctx={ctx} i={i} />)}
                  </div>

                  <div className="ssec"><b className="serif">{S.passTitle}</b></div>
                  <PassCard S={S} lang={app.lang} notify={notify} onToggle={id => { if (toggleNotify(id)) flash(S.notifyToast); }} />

                  <div className="ssec"><b className="serif">{S.bundlesTitle}</b><button className="alink" onClick={() => setTab('bundles')}>{S.seeAll} →</button></div>
                  <div className="sgrid">
                    {BUNDLES.slice(1, 3).map((b, i) => <BundleCard key={b.id} b={b} i={i + 1} S={S} lang={app.lang} notify={notify} onToggle={id => { if (toggleNotify(id)) flash(S.notifyToast); }} />)}
                  </div>
                </>
              )}

              {slot && (
                <div className="sgrid">
                  {forSlot(slot).map((c, i) => <ItemCard key={c.id} c={c} slot={slot} ctx={ctx} i={i} />)}
                </div>
              )}

              {tab === 'bundles' && (
                <>
                  <div className="ssec col"><b className="serif">{S.bundlesTitle}</b><span>{S.bundlesSub}</span></div>
                  <div className="sgrid">
                    {BUNDLES.map((b, i) => <BundleCard key={b.id} b={b} i={i} S={S} lang={app.lang} notify={notify} onToggle={id => { if (toggleNotify(id)) flash(S.notifyToast); }} />)}
                  </div>
                  <div className="ssec"><b className="serif">{S.passTitle}</b></div>
                  <PassCard S={S} lang={app.lang} notify={notify} onToggle={id => { if (toggleNotify(id)) flash(S.notifyToast); }} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {buying && (
          <BuyModal key={buying.c.id} c={buying.c} slot={buying.slot} S={S} bm={p.bm} admin={admin} canDaily={p.canClaim}
            onClose={() => setBuying(null)} onBought={onBought}
            onEquip={() => { const b = buying; setBuying(null); void equip(b.c, b.slot); }} />
        )}
      </AnimatePresence>
      {fly && <FlyItem from={fly.from} to={fly.to} bg={fly.bg} onDone={() => { setFly(null); setPop(n => n + 1); sfx.tap(); }} />}
      <AnimatePresence>
        {toast && <motion.div className="ptoast" role="status" initial={{ y: 30, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 30, opacity: 0, x: '-50%' }}>{toast}</motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

export default ShopScreen;
