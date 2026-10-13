import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
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
  BUNDLES, COLLECTIBLES, COSMETICS, PACKS, RARITIES, accentOf, cosmetic, featuredToday, fmtBm, fmtEur, forSlot, isNew, packPrice, packSavePct, packWorth, themeName,
  type Bundle, type Cosmetic, type Rarity, type Slot,
} from '../shop/catalog';
import { COS_KINDS, bannerCss, type CosKind } from '../cosmetics/data';
import { COS_STRINGS, type CosStrings } from '../cosmetics/i18n';
import { cosName } from '../cosmetics/Badges';
import { BackCard, CosmeticStage } from '../cosmetics/Previews';
import { useCosmetics } from '../cosmetics/useCosmetics';
import { takeShopFocus } from '../cosmetics/shopFocus';
import { CoinBurst, Ticker } from './Rewards';
import { DiamondPacks } from '../social/DiamondPacks';
import { GiftItemSheet } from '../social/GiftItemSheet';
import { DiamondIcon } from '../social/GiftArt';
import { SOCIAL_STRINGS } from '../i18n/social';
import { SEASON_STRINGS } from '../i18n/season';
import { SEASON_S1 } from '../season/data';
import '../styles/shop.css';

type Tab = 'featured' | 'diamonds' | 'sets' | 'tables' | 'backs' | 'faces' | 'frames' | 'victory' | 'emotes' | 'titles' | 'colours' | 'bundles';
const TABS: Tab[] = ['featured', 'diamonds', 'sets', 'tables', 'backs', 'faces', 'frames', 'victory', 'emotes', 'titles', 'colours', 'bundles'];
/** Item tabs list one or two slots (second one = a sub-section, e.g. Frames + Banners). */
const TAB_SLOTS: Record<Tab, Slot[] | null> = {
  featured: null, diamonds: null, sets: null, bundles: null,
  tables: ['table'], backs: ['back'], faces: ['face'], frames: ['frame', 'banner'], victory: ['victory'], emotes: ['emotes'], titles: ['title', 'namecolor'], colours: ['accent'],
};
const tabOf = (c: Cosmetic): Tab => {
  if (c.kind === 'pack') return 'sets';
  const s = c.slots[0];
  return (Object.keys(TAB_SLOTS) as Tab[]).find(t => TAB_SLOTS[t]?.includes(s)) ?? 'featured';
};
type S = ShopStrings['shop'];

const NOTIFY_KEY = 'b125.shop.notify';
const isCosSlot = (s: Slot): s is CosKind => (COS_KINDS as string[]).includes(s);

/* ================================================================== helpers */

const nameOf = (S: S, lang: string, c: Cosmetic) => S.items[c.id] ?? cosName(lang, c.id, c.kind === 'pack' ? c.id : themeName(c.id, c.slots[0]));
const kindLabel = (S: S, C: CosStrings, c: Cosmetic) =>
  c.kind === 'set' ? S.setOf(c.slots.map(s => (s in S.kinds ? S.kinds[s as keyof S['kinds']] : C.kind[s])).join(' + ')) : C.kind[c.kind];
const accentVars = (id: string): CSSProperties => {
  const a = accentOf(id);
  return { ['--acc' as string]: a.base, ['--acc-hi' as string]: a.hi, ['--acc-lo' as string]: a.lo, ['--acc-ink' as string]: a.ink };
};
/** The single most representative background of an item (used by the flying clone). */
function swatchCss(c: Cosmetic, tableId: string): string {
  const g = c.kind === 'pack' ? cosmetic(c.grants?.[0] ?? '') ?? c : c;
  if (g.slots.includes('table')) return (TABLES.find(t => t.id === g.id) ?? TABLES[0]).css;
  if (g.slots.includes('back') && !g.slots.includes('accent')) return backCss(g.id, tableId);
  if (g.slots.includes('banner')) return bannerCss(g.id);
  if (g.slots.includes('accent')) { const a = accentOf(g.id); return `radial-gradient(circle at 35% 30%, ${a.hi}, ${a.base} 55%, ${a.lo})`; }
  return 'radial-gradient(circle at 35% 30%, #fff6d8, #e2bd62 50%, #8c6e28)';
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

function TablePreview({ id, back }: { id: string; back: string }) {
  const tb = TABLES.find(t => t.id === id) ?? TABLES[0];
  return (
    <div className="pv pvtable" style={{ background: tb.css, backgroundColor: tb.tone }}>
      <span className="pvrim" />
      <div className="pvfan">
        <BackCard id={back} table={id} w={50} className="pvcard" style={{ transform: 'translate(-34px, 6px) rotate(-14deg)' }} />
        <BackCard id={back} table={id} w={50} className="pvcard" style={{ transform: 'translate(0, -2px) rotate(0deg)' }} />
        <BackCard id={back} table={id} w={50} className="pvcard" style={{ transform: 'translate(34px, 6px) rotate(14deg)' }} />
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
        <BackCard id={id} table={app.table} w={62} className="pvcard" />
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
      {back && <BackCard id={back} table={app.table} w={38} style={{ position: 'absolute', right: 12, top: '50%', marginTop: -27, transform: 'rotate(10deg)', zIndex: 1 }} />}
    </div>
  );
}

function ItemPreview({ c, slot }: { c: Cosmetic; slot: Slot | null }) {
  if (c.kind === 'pack') return <CosmeticStage c={c} slot="pack" />;
  const s: Slot = slot && c.slots.includes(slot) ? slot : c.slots.includes('table') ? 'table' : c.slots.includes('accent') ? 'accent' : c.slots[0];
  if (isCosSlot(s)) return <CosmeticStage c={c} slot={s} />;
  if (s === 'table') return <TablePreview id={c.id} back={c.slots.includes('back') ? c.id : 'match'} />;
  if (s === 'back') return <BackPreview id={c.id} />;
  return <AccentPreview id={c.id} back={c.slots.includes('back') ? c.id : undefined} />;
}

/* ================================================================== item card */

interface CardCtx {
  S: S; C: CosStrings; lang: string; guest: boolean; admin: boolean;
  owned: (c: Cosmetic) => boolean; bought: (id: string) => boolean; equipped: (c: Cosmetic, slot: Slot | null) => boolean;
  price: (c: Cosmetic) => number;
  onBuy: (c: Cosmetic, slot: Slot | null) => void; onEquip: (c: Cosmetic, slot: Slot | null) => void; onAuth: () => void; onOpen: (c: Cosmetic, slot: Slot | null) => void;
  /** "Gift to a friend" (paid in Diamonds, social module); null = not giftable */
  onGift: ((c: Cosmetic) => void) | null; giftLabel: string;
}

function PriceTag({ bm }: { bm: number }) {
  return <span className="sprice"><i className="scoin" />{fmtBm(bm)}</span>;
}

function ActionButton({ c, slot, ctx }: { c: Cosmetic; slot: Slot | null; ctx: CardCtx }) {
  const { S } = ctx;
  const own = ctx.owned(c);
  const eq = own && ctx.equipped(c, slot);
  if (ctx.guest) return <button className="sact ghost" onClick={ctx.onAuth}>🔒 {S.signInToBuy}</button>;
  if (eq) return <span className="sact on">✓ {S.equipped}</span>;
  if (own) return <button className="sact equip" onClick={() => ctx.onEquip(c, slot)}>{!slot && (c.slots.length > 1 || c.kind === 'pack') ? S.equipAll : S.equip}</button>;
  return <button className="sact buy" onClick={() => ctx.onBuy(c, slot)}><PriceTag bm={ctx.price(c)} /></button>;
}

function ItemCard({ c, slot, ctx, i = 0, hero = false, blurb }: { c: Cosmetic; slot: Slot | null; ctx: CardCtx; i?: number; hero?: boolean; blurb?: string }) {
  const { S, C } = ctx;
  const tilt = useTilt(hero ? 6 : 10);
  const own = ctx.owned(c);
  const eq = own && ctx.equipped(c, slot);
  const fresh = !own && isNew(c);
  const pack = c.kind === 'pack';
  return (
    <motion.div className={`scell ${hero ? 'shero' : ''}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.035 * Math.min(i, 12), type: 'spring', stiffness: 220, damping: 24 }}>
      <motion.article className={`sitem r-${c.rarity} ${own ? 'own' : ''} ${eq ? 'eq' : ''}`} style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
        whileTap={{ scale: 0.985 }}>
        <span className="sglow" aria-hidden />
        <div className="sframe">
          <button className="sprev" data-shop-preview={c.id} onClick={() => ctx.onOpen(c, slot)} aria-label={`${C.details}: ${nameOf(S, ctx.lang, c)}`}>
            <ItemPreview c={c} slot={slot} />
            <motion.span className="sglare" style={{ background: tilt.glare }} aria-hidden />
            <span className={`srar r-${c.rarity}`}>{S.rarity[c.rarity]}</span>
            {!own && pack && <span className="stag save">{C.save(packSavePct(c))}</span>}
            {!own && !pack && (fresh || c.tag) && <span className={`stag ${fresh ? 'new' : c.tag}`}>{fresh ? S.tags.new : S.tags[c.tag!]}</span>}
            {own && <span className="sown" title={eq ? S.equipped : S.owned} aria-label={eq ? S.equipped : S.owned}>{ctx.bought(c.id) || (pack && !ctx.admin) ? '✓' : '👑'}</span>}
          </button>
          <div className="sinfo">
            <div className="stitle">
              <b className={hero ? 'serif' : ''}>{nameOf(S, ctx.lang, c)}</b>
              <small>{kindLabel(S, C, c)}{pack && !own && <> · <s>{fmtBm(packWorth(c))}</s></>}</small>
            </div>
            {hero && blurb && <p className="sblurb">{blurb}</p>}
            <div className="sfoot">
              {ctx.admin && !ctx.bought(c.id) && <span className="sadmin">👑 {S.adminFree}</span>}
              <ActionButton c={c} slot={slot} ctx={ctx} />
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

/* ================================================================== item detail (big 3D preview) */

function DetailModal({ c, slot, ctx, onClose }: { c: Cosmetic; slot: Slot | null; ctx: CardCtx; onClose: () => void }) {
  const { S, C } = ctx;
  const tilt = useTilt(7);
  const pack = c.kind === 'pack';
  const own = ctx.owned(c);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const about = S.blurbs[c.id] ?? C.about[c.kind];
  const full = pack ? packWorth(c, g => { const gc = cosmetic(g); return !!gc && ctx.owned(gc); }) : 0;
  const price = ctx.price(c);
  const savePct = full ? Math.round((1 - price / full) * 100) : 0;
  return (
    <>
      <motion.div className="sscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="smwrap" role="dialog" aria-modal="true" aria-label={nameOf(S, ctx.lang, c)}>
        <motion.div className={`sdetail r-${c.rarity}`} initial={{ opacity: 0, y: 60, scale: 0.9, rotateX: 14 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }} transition={{ type: 'spring', stiffness: 250, damping: 24 }}>
          <button className="sdclose" onClick={onClose} aria-label={S.cancel}>×</button>
          <div className="sdstage" style={{ perspective: 1000 }}>
            <motion.div className="sdtilt" style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
              animate={{ y: [0, -6, 0] }} transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}>
              <span className="sdglow" aria-hidden />
              <div className="sdprev"><ItemPreview c={c} slot={slot} /><motion.span className="sglare" style={{ background: tilt.glare }} aria-hidden /></div>
            </motion.div>
            <span className={`srar r-${c.rarity}`}>{S.rarity[c.rarity]}</span>
          </div>
          <div className="sdbody">
            <div className="sdtitle">
              <small>{kindLabel(S, C, c)}</small>
              <b className="serif">{nameOf(S, ctx.lang, c)}</b>
            </div>
            <p className="sdabout">{about}</p>
            {(pack || c.kind === 'set') && (
              <div className="sdinc">
                <span className="sdlabel">{C.includes}</span>
                <ul>
                  {pack ? (c.grants ?? []).map(g => {
                    const gc = cosmetic(g);
                    return gc && <li key={g} className={`r-${gc.rarity}`}><i aria-hidden />{nameOf(S, ctx.lang, gc)}<small>{kindLabel(S, C, gc)}</small>{ctx.owned(gc) && <em>✓</em>}</li>;
                  }) : c.slots.map(s => <li key={s} className={`r-${c.rarity}`}><i aria-hidden />{s in S.kinds ? S.kinds[s as keyof S['kinds']] : C.kind[s]}</li>)}
                </ul>
              </div>
            )}
            {pack && !own && price < c.priceBm && <p className="sdnote">{C.partOwned}</p>}
            <div className="sdbuy">
              {!own && (pack || c.priceEur != null) && <div className="sdprice">
                <PriceTag bm={price} />
                {pack && <s>{fmtBm(full)}</s>}
                {pack && savePct > 0 && <em className="sdsave">{C.save(savePct)}</em>}
                {c.priceEur != null && <small>{C.orEur(fmtEur(c.priceEur, ctx.lang))}</small>}
              </div>}
              <ActionButton c={c} slot={slot} ctx={ctx} />
            </div>
            {ctx.admin && !ctx.bought(c.id) && <div className="sadmin" style={{ marginTop: 8 }}>👑 {S.adminFree}</div>}
            {ctx.onGift && !pack && c.priceBm > 0 && (
              <button className="alink sdgift" onClick={() => ctx.onGift?.(c)}><span aria-hidden>🎁</span> {ctx.giftLabel}</button>
            )}
          </div>
        </motion.div>
      </div>
    </>
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

function PassCard({ S, onSeason }: { S: S; lang: string; notify: string[]; onToggle: (id: string) => void; onSeason?: () => void }) {
  const tilt = useTilt(4);
  const ss = useStrings(SEASON_STRINGS);
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
        <span className="seur" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><DiamondIcon size={20} />{fmtBm(SEASON_S1.premiumPrice)}</span>
        {onSeason && <button className="btn acc sm" onClick={onSeason}>{ss.toast.open} ›</button>}
      </div>
    </motion.article>
  );
}

/* ================================================================== buy modal */

type BuyState = 'confirm' | 'busy' | 'done' | 'funds' | 'error';

function BuyModal({ c, slot, S, C, lang, price, bm, admin, onClose, onBought, onEquip, canDaily }: {
  c: Cosmetic; slot: Slot | null; S: S; C: CosStrings; lang: string; price: number; bm: number; admin: boolean; canDaily: boolean;
  onClose: () => void; onBought: (from: DOMRect | null) => void; onEquip: () => void;
}) {
  const app = useApp();
  const [st, setSt] = useState<BuyState>(() => (!admin && bm < price ? 'funds' : 'confirm'));
  const [need, setNeed] = useState(Math.max(0, price - bm));
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
      if (r.ok) track('shop_buy', { item: c.id, price: r.price ?? price, admin: !!r.admin, kind: c.kind });
      setSt('done'); sfx.big(); buzz([20, 40, 30]);
      onBought(prevRef.current?.getBoundingClientRect() ?? null);
      void syncAppProfile(app, { ...(r.bm !== undefined ? { bm: r.bm } : {}), ...(r.owned ? { owned: r.owned } : {}) });
      return;
    }
    if (r.error === 'funds') { setNeed(r.need ?? need); setSt('funds'); if (r.bm !== undefined) void syncAppProfile(app, { bm: r.bm }); return; }
    setErr(S.errors[(r.error ?? 'generic') as keyof S['errors']] ?? S.errors.generic);
    setSt('error'); sfx.alert();
  };

  const after = bm - (admin ? 0 : price);
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
              <b className="serif">{nameOf(S, lang, c)}</b>
              <small>{kindLabel(S, C, c)}</small>
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
                  <div className="smbar"><i style={{ width: `${Math.min(100, (bm / price) * 100)}%` }} /></div>
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
                  <div><span>{S.confirmTitle}</span>{admin ? <b className="sadmin">👑 {S.adminFree}</b> : <PriceTag bm={price} />}</div>
                  {!admin && <div className="mute"><span>{S.balanceAfter}</span><span className="smafter"><i className="coin" />{fmtBm(after)}</span></div>}
                </div>
                {st === 'error' && <div className="autherr" style={{ marginTop: 10 }}>{err}</div>}
                <div className="smacts">
                  <button className="btn acc" onClick={buy} disabled={st === 'busy'}>
                    {st === 'busy' ? <><span className="spinner" />{S.buying}</> : admin ? S.equipNow : <>{S.confirmBuy('')}<PriceTag bm={price} /></>}
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

export function ShopScreen({ onClose, onAuth, initialTab = 'featured', initialItem, onSeason }: { onClose: () => void; onAuth: () => void; initialTab?: Tab; initialItem?: string; onSeason?: () => void }) {
  const app = useApp();
  const Sall = useStrings(SHOP_STRINGS);
  const S = Sall.shop;
  const C = useStrings(COS_STRINGS);
  const SOC = useStrings(SOCIAL_STRINGS);
  const p = useProgress();
  const cos = useCosmetics();
  const [focus] = useState(() => cosmetic(initialItem ?? takeShopFocus() ?? ''));
  const [tab, setTab] = useState<Tab>(focus ? tabOf(focus) : initialTab);
  const [rar, setRar] = useState<Rarity | 'all'>('all');
  const [detail, setDetail] = useState<{ c: Cosmetic; slot: Slot | null } | null>(focus ? { c: focus, slot: null } : null);
  const [buying, setBuying] = useState<{ c: Cosmetic; slot: Slot | null; price: number } | null>(null);
  const [giftFor, setGiftFor] = useState<Cosmetic | null>(null);
  const [fly, setFly] = useState<{ from: DOMRect; to: DOMRect; bg: string } | null>(null);
  const [pop, setPop] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [notify, toggleNotify] = useNotify();
  const bagRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const toastTm = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guest = !app.session;
  const admin = app.isPrivileged;
  const ownedSet = new Set(p.owned);
  const ownId = (id: string) => admin || ownedSet.has(id);
  const owned = (c: Cosmetic) => (c.kind === 'pack' ? (c.grants ?? []).every(ownId) : ownId(c.id));
  const price = (c: Cosmetic) => (c.kind === 'pack' ? packPrice(c, id => ownedSet.has(id)) ?? c.priceBm : c.priceBm);
  const ownedCount = COLLECTIBLES.filter(c => ownId(c.id)).length;
  const daily = useMemo(() => featuredToday(), []);

  useEffect(() => { track('shop_view', { signed_in: !guest, admin, focus: focus?.id ?? null }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !buying && !detail && !giftFor) onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose, buying, detail, giftFor]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => { tabsRef.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [tab]);

  const flash = (m: string) => { setToast(m); if (toastTm.current) clearTimeout(toastTm.current); toastTm.current = setTimeout(() => setToast(null), 2400); };

  const themeVal = (s: Slot) => (s === 'table' ? app.table : s === 'accent' ? app.accent : s === 'back' ? app.cardBack : cos.equipped[s as CosKind]);
  const equipped = (c: Cosmetic, slot: Slot | null): boolean => {
    if (c.kind === 'pack') return (c.grants ?? []).every(g => { const gc = cosmetic(g); return !!gc && equipped(gc, null); });
    const parts = slot && c.slots.includes(slot) ? [slot] : c.slots;
    return parts.every(s => themeVal(s) === c.id);
  };
  const equip = async (c: Cosmetic, slot: Slot | null) => {
    const items: { c: Cosmetic; parts: Slot[] }[] = c.kind === 'pack'
      ? (c.grants ?? []).map(g => cosmetic(g)).filter((x): x is Cosmetic => !!x).map(g => ({ c: g, parts: g.slots }))
      : [{ c, parts: slot && c.slots.includes(slot) ? [slot] : c.slots }];
    const patch: { table?: string; accent?: string; cardBack?: string } = {};
    const cosJobs: Promise<boolean>[] = [];
    for (const it of items) for (const s of it.parts) {
      if (s === 'table') patch.table = it.c.id; else if (s === 'accent') patch.accent = it.c.id; else if (s === 'back') patch.cardBack = it.c.id;
      else if (isCosSlot(s)) cosJobs.push(cos.equip(s, it.c.id));
    }
    sfx.good(); buzz(15);
    flash(S.equippedToast(nameOf(S, app.lang, c)));
    if (Object.keys(patch).length) await app.saveProfile(patch);
    await Promise.all(cosJobs);
    track('shop_equip', { item: c.id });
  };

  const ctx: CardCtx = {
    S, C, lang: app.lang, guest, admin, owned, bought: id => ownedSet.has(id), equipped, price,
    onBuy: (c, slot) => { sfx.tap(); setDetail(null); setBuying({ c, slot, price: price(c) }); },
    onEquip: (c, slot) => { void equip(c, slot); },
    onOpen: (c, slot) => { sfx.tap(); setDetail({ c, slot }); track('shop_detail', { item: c.id }); },
    onAuth,
    onGift: c => { sfx.tap(); setGiftFor(c); track('shop_gift_open', { item: c.id }); },
    giftLabel: SOC.giftItem.action,
  };

  const onBought = (from: DOMRect | null) => {
    const to = bagRef.current?.getBoundingClientRect();
    if (from && to && buying) setTimeout(() => setFly({ from, to, bg: swatchCss(buying.c, app.table) }), 350);
  };

  const slots = TAB_SLOTS[tab];
  const byRarity = (list: Cosmetic[]) => (rar === 'all' ? list : list.filter(c => c.rarity === rar));
  const tabLabel = (k: Tab): string => {
    switch (k) {
      case 'sets': return C.cats.pack;
      case 'faces': return C.cats.face;
      case 'frames': return C.cats.frame;
      case 'victory': return C.cats.victory;
      case 'emotes': return C.cats.emotes;
      case 'titles': return C.cats.title;
      case 'diamonds': return SOC.dm.title;
      default: return S.tabs[k];
    }
  };
  const newIn = COSMETICS.filter(c => c.kind !== 'pack' && isNew(c) && !owned(c) && (c.rarity === 'legendary' || c.rarity === 'epic')).slice(0, 8);
  const toggleN = (id: string) => { if (toggleNotify(id)) flash(S.notifyToast); };

  const RarityBar = (
    <div className="srarbar" role="radiogroup">
      {(['all', ...RARITIES] as const).map(r => (
        <button key={r} role="radio" aria-checked={rar === r} className={`${rar === r ? 'on' : ''} ${r !== 'all' ? `r-${r}` : ''}`} onClick={() => { setRar(r); sfx.tap(); }}>
          {r !== 'all' && <i aria-hidden />}{r === 'all' ? C.all : S.rarity[r]}
        </button>
      ))}
    </div>
  );

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
            <motion.div ref={bagRef} key={'bag' + pop} className="sbag" title={S.collection(ownedCount, COLLECTIBLES.length)}
              initial={pop ? { scale: 1.35 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 12 }}>
              <span className="sbagicon" aria-hidden><i /><i /></span>
              <b>{ownedCount}<small>/{COLLECTIBLES.length}</small></b>
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
        <nav className="stabs" role="tablist" ref={tabsRef}>
          {TABS.map(k => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); sfx.tap(); }}>
              {tab === k && <motion.span layoutId="stab" className="stabpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{k === 'diamonds' && <DiamondIcon size={13} className="stabdm" />}{tabLabel(k)}</span>
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
                  <div className="ssec"><b className="serif">{C.featuredToday}</b><span>{C.featuredSub}</span></div>
                  <div className="sgrid one"><ItemCard c={daily.hero} slot={null} ctx={ctx} hero blurb={S.blurbs[daily.hero.id] ?? C.about[daily.hero.kind]} /></div>
                  <div className="sgrid sfour">
                    {daily.picks.map((c, i) => <ItemCard key={c.id} c={c} slot={null} ctx={ctx} i={i + 1} />)}
                  </div>

                  {!guest && p.ready && (
                    p.canClaim ? (
                      <motion.button className="sdaily" onClick={openDailyReward} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileTap={{ scale: 0.98 }}>
                        <span className="sdchest"><i className="dchestmini big" /></span>
                        <span className="sdtxt"><b>{S.dailyCta}</b><span>{S.dailyCtaSub}</span></span>
                        <span className="sdgo" aria-hidden>→</span>
                      </motion.button>
                    ) : <div className="sdailydone">✓ {S.dailyDone}</div>
                  )}

                  <div className="ssec"><b className="serif">{C.sets}</b><button className="alink" onClick={() => setTab('sets')}>{S.seeAll} →</button></div>
                  <div className="sgrid">
                    {PACKS.filter(c => c.id !== daily.hero.id).slice(0, 4).map((c, i) => <ItemCard key={c.id} c={c} slot={null} ctx={ctx} i={i} />)}
                  </div>

                  {newIn.length > 0 && <>
                    <div className="ssec"><b className="serif">{C.newIn}</b></div>
                    <div className="sgrid">{newIn.map((c, i) => <ItemCard key={c.id} c={c} slot={null} ctx={ctx} i={i} />)}</div>
                  </>}

                  <div className="ssec"><b className="serif">{S.passTitle}</b></div>
                  <PassCard S={S} lang={app.lang} notify={notify} onToggle={toggleN} onSeason={onSeason} />

                  <div className="ssec"><b className="serif">{S.bundlesTitle}</b><button className="alink" onClick={() => setTab('bundles')}>{S.seeAll} →</button></div>
                  <div className="sgrid">
                    {BUNDLES.slice(1, 3).map((b, i) => <BundleCard key={b.id} b={b} i={i + 1} S={S} lang={app.lang} notify={notify} onToggle={toggleN} />)}
                  </div>
                </>
              )}

              {tab === 'sets' && (
                <>
                  <div className="ssec col"><b className="serif">{C.sets}</b><span>{C.setsSub}</span></div>
                  <div className="sgrid">{PACKS.map((c, i) => <ItemCard key={c.id} c={c} slot={null} ctx={ctx} i={i} />)}</div>
                </>
              )}

              {slots && (
                <>
                  {RarityBar}
                  {slots.map((sl, si) => {
                    const list = byRarity(forSlot(sl));
                    return (
                      <div key={sl}>
                        {(slots.length > 1 || si > 0) && <div className="ssec"><b className="serif">{C.cats[sl]}</b><span>{C.about[sl]}</span></div>}
                        {slots.length === 1 && <p className="sabout">{C.about[sl]}</p>}
                        <div className="sgrid">
                          {list.map((c, i) => <ItemCard key={c.id} c={c} slot={sl} ctx={ctx} i={i} />)}
                        </div>
                        {list.length === 0 && <div className="sempty">—</div>}
                      </div>
                    );
                  })}
                </>
              )}

              {tab === 'diamonds' && <DiamondPacks onAuth={onAuth} />}
              {tab === 'bundles' && (
                <>
                  <div className="ssec col"><b className="serif">{S.bundlesTitle}</b><span>{S.bundlesSub}</span></div>
                  <div className="sgrid">
                    {BUNDLES.map((b, i) => <BundleCard key={b.id} b={b} i={i} S={S} lang={app.lang} notify={notify} onToggle={toggleN} />)}
                  </div>
                  <div className="ssec"><b className="serif">{S.passTitle}</b></div>
                  <PassCard S={S} lang={app.lang} notify={notify} onToggle={toggleN} onSeason={onSeason} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {detail && !buying && <DetailModal key={'d' + detail.c.id} c={detail.c} slot={detail.slot} ctx={ctx} onClose={() => setDetail(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {giftFor && (
          <GiftItemSheet key={'gift' + giftFor.id} itemId={giftFor.id} name={nameOf(S, app.lang, giftFor)} onClose={() => setGiftFor(null)}
            onAuth={() => { setGiftFor(null); setDetail(null); onAuth(); }}
            onDiamonds={() => { setGiftFor(null); setDetail(null); setTab('diamonds'); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {buying && (
          <BuyModal key={buying.c.id} c={buying.c} slot={buying.slot} S={S} C={C} lang={app.lang} price={buying.price} bm={p.bm} admin={admin} canDaily={p.canClaim}
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

/** Exported for the wardrobe / tests: which shop tab shows an item. */
export const shopTabOf = (id: string): Tab | null => { const c = cosmetic(id); return c ? tabOf(c) : null; };
export type { Tab as ShopTab };
