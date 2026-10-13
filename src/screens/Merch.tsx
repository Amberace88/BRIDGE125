import { AnimatePresence, LayoutGroup, motion, useDragControls, useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from 'react';
import { track } from '../analytics';
import { BackCard } from '../cosmetics/Previews';
import { MERCH_STRINGS, type MerchStrings } from '../i18n/merch';
import { useStrings } from '../i18n/pick';
import { addInterest, rememberInterest, rememberedInterest, type InterestResult } from '../merch/api';
import { addToCart, cartCount, cartSubtotal, clearCart, freeShippingLeft, lineTotal, removeLine, setQty, toCheckoutItems, useCart } from '../merch/cart';
import {
  CITY_IDS, COLLECTIONS, LANG_HOME, PRODUCTS, SIZE_GUIDE, collectionOf, completeTheSet, flagship, formatEUR, forYou, fromPrice, isEmail, kindOf,
  marketScore, priceFor, productById, variantLabel, type CityId, type Collection, type ColourId, type Kind, type Product,
} from '../merch/catalog';
import { merchCheckoutAvailable, startMerchCheckout, type CheckoutError } from '../merch/checkout';
import { FREE_SHIPPING_EUR, LANG_COUNTRY, MERCH_MAX_QTY, MERCH_SHIPPING_DAYS, SHIPPING_FROM_EUR, SHIP_COUNTRIES, checkoutUrl } from '../merch/config';
import { cityName, productCopy } from '../merch/copy';
import { useApp } from '../store';
import '../styles/merch.css';

const DECK = (n: string) => `/merch/web/deck/${n}.webp`;
const fine = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
const spring = { type: 'spring', stiffness: 320, damping: 30 } as const;

/** Soft studio backdrop behind each mockup, keyed by design story / city — keeps the grid colourful. */
const TINT: Record<string, [string, string]> = {
  'pop-lady': ['#FFF1B8', '#FFC94D'], 'bluff-riso': ['#FFE6F3', '#F7A8D2'], 'burn-synth': ['#F5D3FF', '#B06BE0'], 'never-durak': ['#FFE3CC', '#F39A5B'],
  'lielais': ['#FFF2DC', '#E9B867'], 'lucky-jack': ['#FFE2D6', '#E9806A'], 'seven-two': ['#FDF5E6', '#E9D5B0'], 'sudoku-nines': ['#EAF0FF', '#9DB1F0'],
  'patience': ['#E3F6F1', '#86CDBE'], 'four-suits': ['#E6F6FF', '#8ACFF3'], 'cap-125': ['#FFF0D4', '#E8B85C'], 'the-table': ['#DDF3E8', '#6FBF98'],
  'whole-table': ['#FFF4D9', '#F5C55A'],
};
const CITY_TINT: Record<CityId, [string, string]> = {
  riga: ['#E3F4F0', '#7CC0B4'], tallinn: ['#E6F0FB', '#8DB5DE'], vilnius: ['#F6E6F0', '#C99AC0'], warsaw: ['#FFF3DE', '#F3C177'], berlin: ['#EEE6FF', '#9C7FDB'],
  kyiv: ['#EFEAFB', '#B9A3D6'], bucharest: ['#FBE6EA', '#E39AA6'], sofia: ['#E6F4EC', '#86C1A4'], tbilisi: ['#FDEBDD', '#E59C6A'], yerevan: ['#FDE6DC', '#E9785D'],
  baku: ['#FFE9D4', '#F28F3B'], almaty: ['#E6F2FF', '#6FA8DC'], tashkent: ['#E0F4F5', '#3FA7B5'], madrid: ['#FFE6E3', '#E25A5A'], london: ['#E7ECF6', '#7E95C2'],
  vienna: ['#FBF0DE', '#E2B66F'], montecarlo: ['#E1F3FD', '#5FC1EC'],
};
function tintOf(p: Product): CSSProperties {
  const t = (p.city ? CITY_TINT[p.city] : TINT[p.story ?? p.design.replace(/-wrap$/, '')]) ?? ['#F4EEDF', '#C9B78F'];
  return { ['--t1' as string]: t[0], ['--t2' as string]: t[1] };
}

/** "Wear your deck": the card back you play with → merch in the same spirit. */
const WEAR: Record<string, string[]> = {
  neon: ['hoodie-burn', 'mat-table', 'hoodie-bluff'], bk_holo: ['tee-bluff', 'canvas-suits', 'stickers-pop'],
  jugend: ['poster-riga', 'city-poster-riga', 'tee-queen'], bk_riga: ['city-poster-riga', 'poster-riga', 'city-tee-riga'],
  crimson: ['tee-lucky', 'mug-lucky', 'tee-queen'], bk_damask: ['tee-queen', 'tee-lucky', 'poster-lady'],
  gold: ['tee-queen', 'cap-logo', 'tee-lady'], royal: ['tee-lady', 'poster-lady', 'tee-queen'], bk_deco: ['tee-queen', 'tee-lady', 'phone-lady'],
  bk_onyx: ['cap-125', 'tee-queen', 'phone-jacks'], midnight: ['city-poster-montecarlo', 'hoodie-burn', 'notebook-nines'],
  carbon: ['cap-125', 'phone-lucky', 'hoodie-burn'], bk_racing: ['cap-125', 'tee-seven', 'mug-sevens'],
};
const WEAR_DEFAULT = ['mat-table', 'tee-queen', 'coasters-suits'];

/** The colourful collection in motion: two endless rows (designs · City editions). */
const MARQUEE_A = ['tee-lady', 'poster-bluff', 'hoodie-burn', 'canvas-suits', 'tee-lucky', 'notebook-nines', 'mug-sevens', 'sweat-durak', 'phone-lady',
  'coasters-suits', 'poster-patience', 'tee-lielais'];

type SortId = 'featured' | 'priceUp' | 'priceDown' | 'new';
type OrderState = 'success' | 'cancel' | null;

// ================================================================================================ screen
/** Full-screen merch store overlay (same shell pattern as the Guide). `onAuth` opens sign-in when checkout needs it. */
export function MerchScreen({ onClose, onAuth }: { onClose: () => void; onAuth?: () => void }) {
  const s = useStrings(MERCH_STRINGS);
  const { lang } = useApp();
  const q = useMemo(() => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } }, []);
  const [col, setCol] = useState<Collection | 'all'>('all');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [sort, setSort] = useState<SortId>('featured');
  // deep link: …?item=<product id> opens that product's sheet (handy for sharing a single product)
  const [openId, setOpenId] = useState<string | null>(() => { const id = q.get('item'); return id && productById(id) ? id : null; });
  const [cartOpen, setCartOpen] = useState(() => q.get('cart') === '1');
  const [order, setOrder] = useState<OrderState>(() => { const o = q.get('order'); return o === 'success' || o === 'cancel' ? o : null; });
  const [listed, setListed] = useState<string[]>(rememberedInterest);
  const [available, setAvailable] = useState(false);
  const [bump, setBump] = useState(0);
  const lines = useCart();
  const gridRef = useRef<HTMLDivElement>(null);
  const cartBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { track('merch_view'); }, []);
  useEffect(() => { let on = true; merchCheckoutAvailable().then(v => { if (on) setAvailable(v); }, () => {}); return () => { on = false; }; }, []);
  // Stripe return: /merch?order=success|cancel → banner, clear the cart on success, tidy the URL
  useEffect(() => {
    if (!order) return;
    track('merch_order_return', { result: order });
    if (order === 'success') clearCart();
    try { q.delete('order'); q.delete('session_id'); history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : '')); } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (openId) setOpenId(null); else if (cartOpen) setCartOpen(false); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, cartOpen, onClose]);

  const inCol = useMemo(() => PRODUCTS.filter(p => col === 'all' || collectionOf(p) === col), [col]);
  const kinds = useMemo(() => [...new Set(inCol.map(kindOf))], [inCol]);
  const items = useMemo(() => {
    const list = inCol.filter(p => kind === 'all' || kindOf(p) === kind);
    if (sort === 'priceUp') return [...list].sort((a, b) => fromPrice(a) - fromPrice(b));
    if (sort === 'priceDown') return [...list].sort((a, b) => fromPrice(b) - fromPrice(a));
    if (sort === 'new') return [...list].sort((a, b) => Number(b.badge === 'new') - Number(a.badge === 'new'));
    // featured: cards first, then this visitor's markets, then the catalogue order
    return list.map((p, i) => ({ p, i, r: (p.category === 'cards' ? 100 : 0) + marketScore(p, lang) * 10 }))
      .sort((a, b) => b.r - a.r || a.i - b.i).map(x => x.p);
  }, [inCol, kind, sort, lang]);
  const picks = useMemo(() => forYou(lang, 10), [lang]);
  const open = openId ? productById(openId) ?? null : null;
  const show = (id: string) => { setOpenId(id); track('merch_product', { product: id }); };
  const browse = (c?: Collection) => { if (c) { setCol(c); setKind('all'); } gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const n = cartCount(lines);

  return (
    <motion.div className="mx" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }} role="dialog" aria-label={s.title}>
      <div className="mx-head">
        <button className="mx-glyph" onClick={onClose} aria-label={s.back}><Icon name="back" /></button>
        <div className="mx-brand"><img src="/logo-mark.svg" alt="" width="26" height="26" /><span>{s.titleA} <b>{s.titleB}</b></span></div>
        <span className="mx-count">{s.items(PRODUCTS.length)}</span>
        <motion.button ref={cartBtn} key={bump} className={`mx-glyph mx-cartbtn ${n ? 'has' : ''}`} onClick={() => setCartOpen(true)}
          aria-label={`${available ? s.cart : s.preorderList}${n ? ` · ${s.cartCount(n)}` : ''}`}
          initial={bump ? { scale: 1.3, rotate: -8 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
          <Icon name="bag" />
          <AnimatePresence>{n > 0 && <motion.b key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>{n}</motion.b>}</AnimatePresence>
        </motion.button>
      </div>

      <div className="mx-body">
        <AnimatePresence>{order && <OrderBanner key="ob" s={s} state={order} onClose={() => setOrder(null)} />}</AnimatePresence>
        <Hero s={s} lang={lang} onOpen={show} onBrowse={() => browse()} />
        <Marquee s={s} lang={lang} onOpen={show} />

        {picks.length > 0 && (
          <Rail title={s.forYou} sub={s.forYouSub}>
            {picks.map((p, i) => <MiniCard key={p.id} p={p} i={i} s={s} lang={lang} onOpen={() => show(p.id)} />)}
          </Rail>
        )}

        <CityStrip s={s} lang={lang} onOpen={show} onAll={() => browse('cities')} />

        <div className="mx-filters" ref={gridRef}>
          <LayoutGroup id="mxcol">
            <div className="mx-tabs" role="tablist" aria-label={s.title}>
              {(['all', ...COLLECTIONS] as const).map(c => (
                <button key={c} role="tab" aria-selected={col === c} className={col === c ? 'on' : ''} onClick={() => { setCol(c); setKind('all'); }}>
                  {col === c && <motion.span layoutId="mxpill" className="mx-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span>{c === 'all' ? s.all : s.cats[c]}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div className="mx-subbar">
            {kinds.length > 1 && (
              <div className="mx-chips" role="group" aria-label={s.allTypes}>
                {(['all', ...kinds] as const).map(k => (
                  <button key={k} className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>
                    {k === 'all' ? s.allTypes : s.kinds[k].name}
                  </button>
                ))}
              </div>
            )}
            <label className="mx-sort">
              <span className="sr">{s.sort}</span>
              <Icon name="sort" />
              <select value={sort} onChange={e => setSort(e.target.value as SortId)} aria-label={s.sort}>
                {(Object.keys(s.sorts) as SortId[]).map(k => <option key={k} value={k}>{s.sorts[k]}</option>)}
              </select>
            </label>
          </div>
        </div>

        {col === 'cities' && <p className="mx-colnote">{s.citySub}</p>}
        <motion.div className="mx-grid" layout>
          <AnimatePresence mode="popLayout">
            {items.map((p, i) => (
              <ProductCard key={p.id} p={p} i={i} s={s} lang={lang} listed={listed.includes(p.id)} onOpen={() => show(p.id)} />
            ))}
          </AnimatePresence>
        </motion.div>

        <WearYourDeck s={s} lang={lang} onOpen={show} />
        <p className="mx-foot">{s.originals} {s.pod(MERCH_SHIPPING_DAYS)}</p>
      </div>

      <AnimatePresence>
        {open && <ProductSheet key={open.id} p={open} s={s} lang={lang} listed={listed.includes(open.id)} available={available} cartBtn={cartBtn}
          onClose={() => setOpenId(null)} onOpen={show} onAdded={() => setBump(b => b + 1)} onCart={() => { setOpenId(null); setCartOpen(true); }}
          onListed={() => { rememberInterest(open.id); setListed(rememberedInterest()); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {cartOpen && <CartDrawer key="cart" s={s} lang={lang} available={available} onAuth={onAuth} onClose={() => setCartOpen(false)}
          onOpen={id => { setCartOpen(false); show(id); }} onShopDecks={() => { setCartOpen(false); browse('cards'); }}
          onListed={ids => { ids.forEach(rememberInterest); setListed(rememberedInterest()); }} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ================================================================================================ icons (frameless)
function Icon({ name }: { name: 'back' | 'bag' | 'sort' | 'close' | 'zoom' | 'minus' | 'plus' | 'ruler' | 'truck' | 'lock' | 'arrow' | 'trash' }) {
  const d: Record<string, ReactNode> = {
    back: <path d="M15 5l-7 7 7 7" />,
    bag: <><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></>,
    sort: <><path d="M7 5v14M4 16l3 3 3-3" /><path d="M17 19V5M14 8l3-3 3 3" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    zoom: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M11 8v6M8 11h6" /></>,
    minus: <path d="M6 12h12" />, plus: <path d="M12 6v12M6 12h12" />,
    ruler: <><path d="M3 15l12-12 6 6-12 12z" /><path d="M7 11l2 2M10 8l2 2M13 5l2 2" /></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    trash: <><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></>,
  };
  return <svg className="mx-ico" viewBox="0 0 24 24" aria-hidden>{d[name]}</svg>;
}

// ================================================================================================ hero: the flagship deck
function Hero({ s, lang, onOpen, onBrowse }: { s: MerchStrings; lang: string; onOpen: (id: string) => void; onBrowse: () => void }) {
  const deck = flagship();
  const decks = PRODUCTS.filter(p => p.category === 'cards' && kindOf(p) === 'deck');
  const legacy = deck.id === 'deck' && deck.design === 'deck/QS';
  const copy = productCopy(deck, s, lang);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 }), sy = useSpring(my, { stiffness: 90, damping: 18 });
  const move = (e: RPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - .5); my.set((e.clientY - r.top) / r.height - .5);
  };
  const leave = () => { mx.set(0); my.set(0); };
  return (
    <section className="mx-hero" onPointerMove={move} onPointerLeave={leave}>
      <div className="mx-hero-copy">
        <motion.p className="mx-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 }}>
          {s.flagship}{decks.length > 1 ? ` · ${s.decks(decks.length)}` : ''}
        </motion.p>
        <motion.h1 className="serif" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>
          {s.titleA} <span className="mx-gold">{s.titleB}</span><br /><em>Merch</em>
        </motion.h1>
        <motion.p className="mx-lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .26 }}>{s.lede}</motion.p>
        <motion.div className="mx-hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .34 }}>
          <button className="btn acc" onClick={() => onOpen(deck.id)}>♠ {s.ctaHero}</button>
          <button className="btn ghost" onClick={onBrowse}>{s.ctaBrowse}</button>
        </motion.div>
        <ul className="mx-perks">{s.perks.map(p => <li key={p}>{p}</li>)}</ul>
      </div>
      {legacy ? <DeckStage x={sx} y={sy} onClick={() => onOpen(deck.id)} label={copy.name} />
        : <DeckPhoto p={deck} x={sx} y={sy} label={copy.name} price={formatEUR(fromPrice(deck), lang)} onClick={() => onOpen(deck.id)} />}
      {decks.length > 1 && (
        <div className="mx-deckrail" role="list">
          {decks.map((d, i) => (
            <motion.button key={d.id} role="listitem" className="mx-deckchip" onClick={() => onOpen(d.id)} style={tintOf(d)}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4 + i * .05, ...spring }} whileHover={{ y: -4 }} whileTap={{ scale: .96 }}>
              <img src={d.colours[0].images[0]} alt="" loading="lazy" />
              <span>{productCopy(d, s, lang).name}</span>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}

/** A deck from the deck collection: its first mockup on a lit, tilting stage. */
function DeckPhoto({ p, x, y, label, price, onClick }: { p: Product; x: MotionValue<number>; y: MotionValue<number>; label: string; price: string; onClick: () => void }) {
  const rY = useTransform(x, v => v * 18), rX = useTransform(y, v => -v * 12);
  const glareX = useTransform(x, v => `${50 + v * 70}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} 25%, rgba(255,250,230,.28), rgba(255,250,230,0) 50%)`;
  return (
    <button className="mx-stage mx-photo" onClick={onClick} aria-label={label}>
      <span className="mx-spot" aria-hidden />
      <motion.div className="mx-photo-tilt" style={{ rotateX: rX, rotateY: rY }} initial={{ opacity: 0, scale: .9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .2, ...spring }}>
        <img src={p.colours[0].images[0]} alt="" width={1200} height={1200} />
        <motion.span className="mx-photo-glare" style={{ background: glare }} />
      </motion.div>
      <span className="mx-photo-tag"><b>{label}</b><i>{price}</i></span>
      <span className="mx-floor" aria-hidden />
    </button>
  );
}

function DeckStage({ x, y, onClick, label }: { x: MotionValue<number>; y: MotionValue<number>; onClick: () => void; label: string }) {
  const tiltY = useTransform(x, v => v * 26);
  const tiltX = useTransform(y, v => -v * 16);
  const fanX = useTransform(x, v => v * -26);
  const fanY = useTransform(y, v => v * -14);
  const glareX = useTransform(x, v => `${50 + v * 80}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} 30%, rgba(255,250,230,.35), rgba(255,250,230,0) 55%)`;
  return (
    <button className="mx-stage" onClick={onClick} aria-label={label}>
      <span className="mx-spot" aria-hidden />
      <motion.div className="mx-fan" style={{ x: fanX, y: fanY }} aria-hidden>
        {['KH', 'AS', 'QS'].map((n, i) => (
          <motion.img key={n} src={DECK(n)} alt="" className="mx-fancard" width={360} height={504}
            initial={{ rotate: 0, x: 0, opacity: 0 }} animate={{ rotate: (i - 1) * 14 + 10, x: i * 26 - 10, opacity: 1 }}
            transition={{ delay: .3 + i * .1, type: 'spring', stiffness: 120, damping: 14 }} />
        ))}
      </motion.div>
      <motion.div className="mx-box-tilt" style={{ rotateX: tiltX, rotateY: tiltY }}>
        <motion.div className="mx-box" animate={{ rotateY: [-46, -22, -46] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
          <img className="f front" src={DECK('box-front')} alt="" />
          <img className="f back" src={DECK('box-back')} alt="" />
          <img className="f right" src={DECK('box-side')} alt="" />
          <img className="f left" src={DECK('box-side')} alt="" />
          <img className="f top" src={DECK('box-top')} alt="" />
          <motion.span className="f front glare" style={{ background: glare }} />
        </motion.div>
      </motion.div>
      <span className="mx-floor" aria-hidden />
    </button>
  );
}

// ================================================================================================ marquee
function Marquee({ s, lang, onOpen }: { s: MerchStrings; lang: string; onOpen: (id: string) => void }) {
  const rows = useMemo(() => {
    const a = MARQUEE_A.map(id => productById(id)).filter((p): p is Product => !!p);
    const home = LANG_HOME[lang];
    const cities = [...CITY_IDS].sort((x, y) => Number(y === home) - Number(x === home)).map(c => productById(`city-poster-${c}`)!).filter(Boolean);
    return [a, cities];
  }, [lang]);
  return (
    <section className="mx-marquee" aria-label={s.ctaBrowse}>
      {rows.map((row, r) => (
        <div key={r} className={`mx-mq-row ${r ? 'rev' : ''}`}>
          <div className="mx-mq-track" style={{ animationDuration: `${row.length * 4.2}s` }}>
            {[...row, ...row].map((p, i) => {
              const dup = i >= row.length;
              return (
                <button key={`${p.id}-${i}`} className="mx-mq-item" style={tintOf(p)} onClick={() => onOpen(p.id)} tabIndex={dup ? -1 : 0} aria-hidden={dup || undefined}
                  aria-label={dup ? undefined : productCopy(p, s, lang).name}>
                  <img src={p.colours[0].images[0]} alt="" decoding="async" {...{ fetchpriority: 'low' }} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

// ================================================================================================ rails
function Rail({ title, sub, children, action }: { title: string; sub?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mx-rail">
      <div className="mx-rail-head">
        <div><h2 className="serif">{title}</h2>{sub && <p>{sub}</p>}</div>
        {action}
      </div>
      <div className="mx-rail-track">{children}</div>
    </section>
  );
}

function MiniCard({ p, i, s, lang, onOpen }: { p: Product; i: number; s: MerchStrings; lang: string; onOpen: () => void }) {
  const copy = productCopy(p, s, lang);
  return (
    <motion.button className="mx-mini" onClick={onOpen} style={tintOf(p)}
      initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ delay: Math.min(i, 6) * .05, ...spring }} whileHover={{ y: -5 }} whileTap={{ scale: .97 }}>
      <span className="mx-mini-img"><img src={p.colours[0].images[0]} alt="" loading="lazy" decoding="async" /></span>
      <span className="mx-mini-txt"><b>{copy.name}</b><i>{formatEUR(fromPrice(p), lang)}</i></span>
    </motion.button>
  );
}

function CityStrip({ s, lang, onOpen, onAll }: { s: MerchStrings; lang: string; onOpen: (id: string) => void; onAll: () => void }) {
  const home = LANG_HOME[lang];
  const order = useMemo(() => {
    const ids = [...CITY_IDS];
    // home city first, then the cities this language's players travel through, Monte Carlo last
    return ids.sort((a, b) => {
      const sc = (c: CityId) => (c === home ? 100 : 0) + marketScore(productById(`city-poster-${c}`)!, lang) * 10 - (c === 'montecarlo' ? 5 : 0);
      return sc(b) - sc(a);
    });
  }, [home, lang]);
  return (
    <Rail title={s.cityTitle} sub={s.citySub} action={<button className="mx-textbtn" onClick={onAll}>{s.all} <Icon name="arrow" /></button>}>
      {order.map((c, i) => (
        <motion.button key={c} className={`mx-city ${c === home ? 'home' : ''}`} onClick={() => onOpen(`city-poster-${c}`)} style={tintOf(productById(`city-poster-${c}`)!)}
          initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true }}
          transition={{ delay: Math.min(i, 8) * .04, ...spring }} whileHover={{ y: -8, rotate: i % 2 ? 1.5 : -1.5 }} whileTap={{ scale: .97 }}>
          <img src={`/merch/mockups/cposter-${c}-paper.webp`} alt="" loading="lazy" decoding="async" />
          <span>{cityName(c, lang)}</span>
        </motion.button>
      ))}
    </Rail>
  );
}

// ================================================================================================ grid card with tilt + glare
function ProductCard({ p, i, s, lang, listed, onOpen }: { p: Product; i: number; s: MerchStrings; lang: string; listed: boolean; onOpen: () => void }) {
  const copy = productCopy(p, s, lang);
  const rx = useMotionValue(0), ry = useMotionValue(0), gx = useMotionValue(50), gy = useMotionValue(30), go = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 20 }), sry = useSpring(ry, { stiffness: 220, damping: 20 });
  const sgo = useSpring(go, { stiffness: 200, damping: 30 });
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,248,225,.32), rgba(255,248,225,0) 52%)`;
  const move = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse' || !fine()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    ry.set((px - .5) * 14); rx.set(-(py - .5) * 12); gx.set(px * 100); gy.set(py * 100); go.set(1);
  };
  const leave = () => { rx.set(0); ry.set(0); go.set(0); };
  const [ci, setCi] = useState(0);
  const img = p.colours[ci].images[0];
  const hero = p.category === 'cards' && kindOf(p) === 'deck' && p.hero;
  const multi = p.colours.length > 1 && p.colours.some(c => c.priceDelta) || p.sizes?.some(z => z.priceDelta);
  return (
    <motion.article layout className={`mx-card ${hero ? 'hero' : ''}`} style={tintOf(p)}
      initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .94 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: Math.min(i, 8) * .035 }}>
      <motion.button className="mx-card-btn" onClick={onOpen} onPointerMove={move} onPointerLeave={leave}
        style={{ rotateX: srx, rotateY: sry }} whileTap={{ scale: .98 }} aria-label={`${copy.name} — ${s.viewDetails}`}>
        <div className="mx-card-img">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.img key={img} src={img} alt={copy.name} width={1200} height={1200} loading={hero || i < 4 ? 'eager' : 'lazy'} decoding="async"
              initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: .3 }} />
          </AnimatePresence>
          <motion.span className="mx-glare" style={{ background: glare, opacity: sgo }} aria-hidden />
          {(hero || p.badge) && <span className={`mx-badge ${hero ? 'hero' : p.badge}`}>{hero ? s.badges.hero : s.badges[p.badge!]}</span>}
          {p.city && collectionOf(p) === 'cities' && <span className="mx-citytag">{cityName(p.city, lang)}</span>}
          {listed && <span className="mx-listed">✓ {s.onList}</span>}
        </div>
        <div className="mx-card-info">
          <div>
            <h3>{copy.name}</h3>
            <p>{copy.tagline}</p>
          </div>
          <b className="mx-price">{multi ? s.from(formatEUR(fromPrice(p), lang)) : formatEUR(p.price, lang)}</b>
        </div>
      </motion.button>
      {p.colours.length > 1 && (
        <div className="mx-dots" role="radiogroup" aria-label={s.colour}>
          {p.colours.map((c, k) => (
            <button key={c.id} role="radio" aria-checked={k === ci} aria-label={s.colours[c.id]} className={k === ci ? 'on' : ''}
              style={{ ['--sw' as string]: c.swatch }} onClick={() => setCi(k)} />
          ))}
        </div>
      )}
    </motion.article>
  );
}

// ================================================================================================ "Wear your deck"
function WearYourDeck({ s, lang, onOpen }: { s: MerchStrings; lang: string; onOpen: (id: string) => void }) {
  const { cardBack } = useApp();
  const ids = (WEAR[cardBack] ?? WEAR_DEFAULT).filter(id => productById(id));
  const deck = flagship();
  const show = [...new Set([deck.id, ...ids])].slice(0, 4).map(id => productById(id)!);
  return (
    <section className="mx-band mx-wear">
      <div className="mx-wear-back" aria-hidden>
        <motion.div initial={{ rotate: -14, y: 20, opacity: 0 }} whileInView={{ rotate: -8, y: 0, opacity: 1 }} viewport={{ once: true }} transition={spring}>
          <BackCard id={cardBack} w={92} />
        </motion.div>
        <motion.div initial={{ rotate: 14, y: 20, opacity: 0 }} whileInView={{ rotate: 7, y: -6, opacity: 1 }} viewport={{ once: true }} transition={{ ...spring, delay: .08 }}>
          <BackCard id={cardBack} w={92} />
        </motion.div>
        <small>{s.yourBack}</small>
      </div>
      <div>
        <h2 className="serif">{s.wearTitle}</h2>
        <p>{s.wearText}</p>
        <div className="mx-wear-row">
          {show.map(p => (
            <motion.button key={p.id} className="mx-wear-item" style={tintOf(p)} onClick={() => onOpen(p.id)} whileHover={{ y: -4 }} whileTap={{ scale: .96 }}
              aria-label={productCopy(p, s, lang).name}>
              <img src={p.colours[0].images[0]} alt="" loading="lazy" />
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ================================================================================================ order return banner
function OrderBanner({ s, state, onClose }: { s: MerchStrings; state: 'success' | 'cancel'; onClose: () => void }) {
  const ok = state === 'success';
  return (
    <motion.div className={`mx-order ${ok ? 'ok' : 'cancel'}`} role="status" initial={{ opacity: 0, y: -16, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} transition={spring}>
      <div className="mx-order-in">
        {ok && <div className="mx-burst" aria-hidden>{['♠', '♥', '♦', '♣', '♠', '♥', '♦', '♣'].map((g, i) => (
          <motion.i key={i} initial={{ x: 0, y: 0, opacity: 0, scale: .4 }}
            animate={{ x: Math.cos(i * Math.PI / 4) * 70, y: Math.sin(i * Math.PI / 4) * 46, opacity: [0, 1, 0], scale: 1.1, rotate: i * 40 }}
            transition={{ duration: 1.4, delay: .15 + i * .03, ease: 'easeOut' }} className={i % 4 === 1 || i % 4 === 2 ? 'r' : ''}>{g}</motion.i>
        ))}</div>}
        <motion.svg viewBox="0 0 52 52" width="44" height="44" aria-hidden>
          <motion.circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .5 }} />
          {ok ? <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .35, duration: .35 }} />
            : <motion.path d="M18 18l16 16M34 18L18 34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .35, duration: .35 }} />}
        </motion.svg>
        <div><b>{ok ? s.orderOk : s.orderCancel}</b><p>{ok ? s.orderOkSub : s.orderCancelSub}</p></div>
        <button className="mx-glyph" onClick={onClose} aria-label={s.close}><Icon name="close" /></button>
      </div>
    </motion.div>
  );
}

// ================================================================================================ detail sheet
function ProductSheet({ p, s, lang, listed, available, cartBtn, onClose, onOpen, onAdded, onCart, onListed }: {
  p: Product; s: MerchStrings; lang: string; listed: boolean; available: boolean; cartBtn: RefObject<HTMLButtonElement | null>;
  onClose: () => void; onOpen: (id: string) => void; onAdded: () => void; onCart: () => void; onListed: () => void;
}) {
  const copy = productCopy(p, s, lang);
  const [colour, setColour] = useState<ColourId>(p.colours[0].id);
  const [size, setSize] = useState<string | null>(p.sizes && p.sizes.length <= 2 ? p.sizes[0].id : null);
  const [qty, setQ] = useState(1);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [guide, setGuide] = useState(false);
  const [fly, setFly] = useState<{ src: string; from: DOMRect; to: DOMRect } | null>(null);
  const [added, setAdded] = useState(false);
  const images = p.colours.find(c => c.id === colour)!.images;
  const unit = priceFor(p, size, colour);
  const price = formatEUR(unit * qty, lang);
  const extUrl = !available ? checkoutUrl(p.id, p.colours.length > 1 ? colour : null, size) : null;
  const needSize = !!p.sizes && !size;
  const go = (d: number) => { if (images.length < 2) return; setDir(d); setIdx(i => (i + d + images.length) % images.length); };
  const pickColour = (c: ColourId) => { setColour(c); setIdx(0); };
  const drag = useDragControls();
  const mainRef = useRef<HTMLDivElement>(null);
  const sg = SIZE_GUIDE[kindOf(p)];
  const set = useMemo(() => completeTheSet(p, 4), [p]);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => { sheetRef.current?.scrollTo({ top: 0 }); }, [p.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && zoom) { e.preventDefault(); setZoom(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [zoom]);

  const add = () => {
    if (needSize) return;
    addToCart({ productId: p.id, colour, size, qty });
    track('merch_add', { product: p.id, qty });
    const from = mainRef.current?.getBoundingClientRect(), to = cartBtn.current?.getBoundingClientRect();
    if (from && to) setFly({ src: images[idx], from, to });
    setAdded(true); setTimeout(() => setAdded(false), 1600);
    setTimeout(onAdded, 520);
  };

  return (
    <>
      <motion.div className="mx-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div ref={sheetRef} className="mx-sheet" role="dialog" aria-modal="true" aria-label={copy.name}
        initial={{ y: '100%', opacity: .6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: .6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .7 }}
        onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}>
        <div className="mx-grab" onPointerDown={e => drag.start(e)} aria-hidden><i /></div>
        <button className="mx-glyph mx-x" onClick={onClose} aria-label={s.close}><Icon name="close" /></button>
        <div className="mx-sheet-grid">
          <div className="mx-gallery">
            <div className="mx-main" ref={mainRef} style={tintOf(p)}>
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.img key={images[idx]} src={images[idx]} alt={copy.name} width={1200} height={1200} custom={dir}
                  initial={{ opacity: 0, x: dir * 60, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: dir * -60, scale: .96 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag={images.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.4}
                  onDragEnd={(_, info) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); }}
                  onClick={() => setZoom(true)} draggable={false} />
              </AnimatePresence>
              <button className="mx-zoombtn mx-glyph" onClick={() => setZoom(true)} aria-label={s.zoom}><Icon name="zoom" /></button>
              {images.length > 1 && <>
                <button className="mx-nav l" onClick={() => go(-1)} aria-label={s.prev}>‹</button>
                <button className="mx-nav r" onClick={() => go(1)} aria-label={s.next}>›</button>
                <div className="mx-pips" aria-hidden>{images.map((_, k) => <i key={k} className={k === idx ? 'on' : ''} />)}</div>
              </>}
            </div>
            {images.length > 1 && (
              <div className="mx-thumbs">
                {images.map((src, k) => (
                  <button key={src} className={k === idx ? 'on' : ''} style={tintOf(p)} onClick={() => { setDir(k > idx ? 1 : -1); setIdx(k); }} aria-label={`${k + 1} / ${images.length}`}>
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mx-info">
            <p className="mx-eyebrow">{s.cats[collectionOf(p)]}{p.badge ? ` · ${s.badges[p.badge]}` : ''}{p.city ? ` · ${cityName(p.city, lang)}` : ''}</p>
            <h2 className="serif">{copy.name}</h2>
            <p className="mx-tag">{copy.tagline}</p>
            <motion.p key={price} className="mx-bigprice" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>{price}</motion.p>

            {p.colours.length > 1 && (
              <div className="mx-opt">
                <span className="mx-label">{s.colour} · <b>{s.colours[colour]}</b></span>
                <div className="mx-swatches" role="radiogroup" aria-label={s.colour}>
                  {p.colours.map(c => (
                    <button key={c.id} role="radio" aria-checked={c.id === colour} className={c.id === colour ? 'on' : ''}
                      style={{ ['--sw' as string]: c.swatch }} onClick={() => pickColour(c.id)} aria-label={s.colours[c.id]}>
                      {c.priceDelta ? <small>+{c.priceDelta}</small> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {p.sizes && (
              <div className="mx-opt">
                <span className="mx-label">{s.size}{size ? <> · <b>{p.sizes.find(z => z.id === size)?.label}</b></> : null}
                  {sg && <button className="mx-textbtn" onClick={() => setGuide(g => !g)} aria-expanded={guide}><Icon name="ruler" /> {s.sizeGuide}</button>}
                </span>
                <div className="mx-sizes" role="radiogroup" aria-label={s.size}>
                  {p.sizes.map(z => (
                    <button key={z.id} role="radio" aria-checked={z.id === size} className={z.id === size ? 'on' : ''} onClick={() => setSize(z.id)}>
                      {z.label}{z.priceDelta ? <small>+{z.priceDelta}</small> : null}
                    </button>
                  ))}
                </div>
                <AnimatePresence initial={false}>
                  {guide && sg && (
                    <motion.div className="mx-guide" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
                      <table>
                        <thead><tr><th>{s.size}</th>{sg.sizes.map(z => <th key={z} className={z === size ? 'on' : ''}>{z}</th>)}</tr></thead>
                        <tbody>
                          <tr><th>{s.chest}</th>{sg.chest.map((v, k) => <td key={k} className={sg.sizes[k] === size ? 'on' : ''}>{v}</td>)}</tr>
                          <tr><th>{s.length}</th>{sg.length.map((v, k) => <td key={k} className={sg.sizes[k] === size ? 'on' : ''}>{v}</td>)}</tr>
                        </tbody>
                      </table>
                      <p>{s.sizeGuideNote}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="mx-buyrow">
              <Stepper s={s} value={qty} onChange={setQ} />
              <motion.button className={`btn acc big mx-add ${needSize ? 'disabled' : ''}`} onClick={add} aria-disabled={needSize} whileTap={needSize ? undefined : { scale: .97 }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={added ? 'a' : needSize ? 'n' : 'b'} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: .18 }}>
                    {added ? `✓ ${s.added}` : needSize ? s.pickSize : <><em>{available ? s.addToCart : s.addToList}</em><b>{price}</b></>}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
            <AnimatePresence>{added && (
              <motion.button className="mx-textbtn mx-gocart" onClick={onCart} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {s.viewCart} <Icon name="arrow" />
              </motion.button>
            )}</AnimatePresence>
            {extUrl && (
              <a className="btn ghost mx-buy" href={needSize ? undefined : extUrl} target="_blank" rel="noopener" aria-disabled={needSize}
                onClick={e => { if (needSize) e.preventDefault(); else track('merch_buy', { product: p.id }); }}>{s.buy(formatEUR(unit, lang))}</a>
            )}

            <p className="mx-desc">{copy.desc}</p>
            <ul className="mx-details">{copy.details.map(d => <li key={d}>{d}</li>)}</ul>
            <p className="mx-pod"><Icon name="truck" /> {s.pod(MERCH_SHIPPING_DAYS)}</p>

            {!available && !extUrl && (
              <NotifyForm s={s} lang={lang} productId={p.id} variant={variantLabel(p, colour, size)} needSize={needSize} listed={listed} onListed={onListed} />
            )}
          </div>
        </div>

        {set.length > 0 && (
          <section className="mx-set">
            <h3 className="serif">{s.completeSet}</h3>
            <div className="mx-rail-track">
              {set.map((q, i) => <MiniCard key={q.id} p={q} i={i} s={s} lang={lang} onOpen={() => onOpen(q.id)} />)}
            </div>
          </section>
        )}
      </motion.div>

      <AnimatePresence>
        {zoom && <Lightbox key="zoom" images={images} start={idx} alt={copy.name} s={s} tint={tintOf(p)} onClose={i => { setZoom(false); setIdx(i); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {fly && (
          <motion.img key="fly" className="mx-fly" src={fly.src} alt="" aria-hidden
            initial={{ left: fly.from.left + fly.from.width * .25, top: fly.from.top + fly.from.height * .25, width: fly.from.width * .5, height: fly.from.width * .5, opacity: 1, rotate: 0 }}
            animate={{ left: fly.to.left + fly.to.width / 2 - 14, top: fly.to.top + fly.to.height / 2 - 14, width: 28, height: 28, opacity: .4, rotate: 18 }}
            exit={{ opacity: 0 }} transition={{ duration: .55, ease: [.5, 0, .3, 1] }} onAnimationComplete={() => setFly(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

function Stepper({ s, value, onChange }: { s: MerchStrings; value: number; onChange: (n: number) => void }) {
  return (
    <div className="mx-step" role="group" aria-label={s.qty}>
      <button onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label={s.less}><Icon name="minus" /></button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.output key={value} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: .15 }} aria-live="polite">{value}</motion.output>
      </AnimatePresence>
      <button onClick={() => onChange(Math.min(MERCH_MAX_QTY, value + 1))} disabled={value >= MERCH_MAX_QTY} aria-label={s.more}><Icon name="plus" /></button>
    </div>
  );
}

/** Full-screen gallery: swipe between images, tap / click to zoom 2.4× and pan by pointer. */
function Lightbox({ images, start, alt, s, tint, onClose }: { images: string[]; start: number; alt: string; s: MerchStrings; tint: CSSProperties; onClose: (i: number) => void }) {
  const [i, setI] = useState(start);
  const [z, setZ] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const go = (d: number) => { setZ(false); setI(k => (k + d + images.length) % images.length); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const pan = (e: RMouseEvent<HTMLDivElement>) => {
    if (!z) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <motion.div className="mx-lightbox" role="dialog" aria-modal="true" aria-label={alt} style={tint} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mx-lb-stage" onPointerMove={pan} onClick={e => { pan(e); setZ(v => !v); }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img key={images[i]} src={images[i]} alt={alt} draggable={false} style={{ transformOrigin: origin }}
            initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: z ? 2.4 : 1 }} exit={{ opacity: 0, scale: .92 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            drag={!z && images.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.5}
            onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }} />
        </AnimatePresence>
      </div>
      <button className="mx-glyph mx-lb-x" onClick={() => onClose(i)} aria-label={s.close}><Icon name="close" /></button>
      {images.length > 1 && <>
        <button className="mx-nav l" onClick={() => go(-1)} aria-label={s.prev}>‹</button>
        <button className="mx-nav r" onClick={() => go(1)} aria-label={s.next}>›</button>
      </>}
    </motion.div>
  );
}

// ================================================================================================ cart drawer
function CartDrawer({ s, lang, available, onAuth, onClose, onOpen, onShopDecks, onListed }: {
  s: MerchStrings; lang: string; available: boolean; onAuth?: () => void; onClose: () => void; onOpen: (id: string) => void; onShopDecks: () => void;
  onListed: (ids: string[]) => void;
}) {
  const { t } = useApp();
  const lines = useCart();
  const subtotal = cartSubtotal(lines);
  const left = freeShippingLeft(subtotal);
  const [country, setCountry] = useState(() => LANG_COUNTRY[lang] ?? 'LV');
  const [consent, setConsent] = useState(false);
  const [need, setNeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<CheckoutError | null>(null);
  const names = useMemo(() => regionNamer(lang), [lang]);
  const countries = useMemo(() => [...SHIP_COUNTRIES].sort((a, b) => names(a).localeCompare(names(b), lang)), [names, lang]);
  const drag = useDragControls();

  const checkout = async () => {
    if (!consent) { setNeed(true); return; }
    setBusy(true); setErr(null);
    track('merch_checkout', { items: lines.length, subtotal });
    const r = await startMerchCheckout(toCheckoutItems(lines), { lang, consent, country }).catch(() => ({ ok: false as const, error: 'network' as const }));
    if (r.ok) { window.location.assign(r.url); return; }
    setBusy(false); setErr(r.error);
    if (r.error === 'auth') onAuth?.();
  };

  return (
    <>
      <motion.div className="mx-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="mx-cart" role="dialog" aria-modal="true" aria-label={available ? s.cart : s.preorderList}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 36 }}
        drag="x" dragControls={drag} dragListener={false} dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0, right: .6 }}
        onDragEnd={(_, info) => { if (info.offset.x > 100 || info.velocity.x > 600) onClose(); }}>
        <header className="mx-cart-head" onPointerDown={e => drag.start(e)}>
          <h2 className="serif">{available ? s.cart : s.preorderList}</h2>
          {lines.length > 0 && <span className="mx-count">{s.items(cartCount(lines))}</span>}
          <button className="mx-glyph" onClick={onClose} aria-label={s.close}><Icon name="close" /></button>
        </header>

        {lines.length === 0 ? (
          <div className="mx-cart-empty">
            <motion.div className="mx-empty-fan" aria-hidden initial="a" animate="b">
              {['AS', 'QS', 'KH'].map((n, i) => (
                <motion.img key={n} src={DECK(n)} alt="" variants={{ a: { rotate: 0, y: 30, opacity: 0 }, b: { rotate: (i - 1) * 16, y: 0, opacity: 1 } }}
                  transition={{ delay: .1 + i * .08, ...spring }} />
              ))}
            </motion.div>
            <h3 className="serif">{s.cartEmpty}</h3>
            <p>{s.cartEmptySub}</p>
            <button className="btn acc" onClick={onShopDecks}>♠ {s.cartEmptyCta}</button>
          </div>
        ) : (
          <>
            <div className="mx-ship">
              <div className="mx-ship-bar"><motion.i initial={false} animate={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_EUR) * 100)}%` }} transition={spring} /></div>
              <p>{left > 0 ? s.freeShipLeft(formatEUR(left, lang)) : `✓ ${s.freeShipDone}`}</p>
            </div>
            <ul className="mx-lines">
              <AnimatePresence initial={false}>
                {lines.map(l => {
                  const p = productById(l.productId)!;
                  const copy = productCopy(p, s, lang);
                  const img = p.colours.find(c => c.id === l.colour)?.images[0] ?? p.colours[0].images[0];
                  const variant = [p.colours.length > 1 && l.colour ? s.colours[l.colour] : '', p.sizes?.find(z => z.id === l.size)?.label ?? ''].filter(Boolean).join(' · ');
                  return (
                    <motion.li key={l.key} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }} transition={spring}>
                      <button className="mx-line-img" style={tintOf(p)} onClick={() => onOpen(p.id)} aria-label={copy.name}><img src={img} alt="" /></button>
                      <div className="mx-line-txt">
                        <b>{copy.name}</b>
                        {variant && <span>{variant}</span>}
                        <div className="mx-line-row">
                          <Stepper s={s} value={l.qty} onChange={v => setQty(l.key, v)} />
                          <button className="mx-glyph mx-rm" onClick={() => removeLine(l.key)} aria-label={s.remove}><Icon name="trash" /></button>
                        </div>
                      </div>
                      <b className="mx-line-price">{formatEUR(lineTotal(l), lang)}</b>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            <div className="mx-cart-foot">
              <div className="mx-sum"><span>{s.subtotal}</span><motion.b key={subtotal} initial={{ opacity: .4, y: -4 }} animate={{ opacity: 1, y: 0 }}>{formatEUR(subtotal, lang)}</motion.b></div>
              <div className="mx-sum small"><span>{s.shipping}</span><span>{left > 0 ? s.shippingNote(formatEUR(SHIPPING_FROM_EUR, lang)) : s.freeShipDone}</span></div>
              {available ? (
                <>
                  <label className="mx-country">
                    <span>{s.shipTo}</span>
                    <select value={country} onChange={e => setCountry(e.target.value)}>
                      {countries.map(c => <option key={c} value={c}>{names(c)}</option>)}
                    </select>
                  </label>
                  <label className={`mx-consent ${need && !consent ? 'need' : ''}`}>
                    <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setNeed(false); }} />
                    <span>{s.consent} <a href={`/${lang}/terms`} target="_blank" rel="noopener">{t.legal.terms}</a></span>
                  </label>
                  {need && !consent && <p className="mx-hint err" role="alert">{s.consentNeed}</p>}
                  <p className="mx-withdraw">{s.withdrawal(MERCH_SHIPPING_DAYS)}</p>
                  <motion.button className="btn acc big mx-checkout" onClick={checkout} disabled={busy} whileTap={{ scale: .98 }}>
                    <Icon name="lock" /> {busy ? s.checkingOut : `${s.checkout} · ${formatEUR(subtotal, lang)}`}
                  </motion.button>
                  {err && <p className="mx-hint err" role="alert">{s.checkoutErrors[err]}</p>}
                  <p className="mx-secure">{s.secure}</p>
                </>
              ) : (
                <PreorderForm s={s} lang={lang} onListed={onListed} />
              )}
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}

/** Country names in the visitor's language (Intl), falling back to the ISO code. */
function regionNamer(lang: string): (code: string) => string {
  try { const dn = new Intl.DisplayNames([lang, 'en'], { type: 'region' }); return c => dn.of(c) ?? c; } catch { return c => c; }
}

/** Checkout is not live yet: one email puts every line of the cart on the pre-order interest list. */
function PreorderForm({ s, lang, onListed }: { s: MerchStrings; lang: string; onListed: (ids: string[]) => void }) {
  const { session } = useApp();
  const lines = useCart();
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState<InterestResult | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) { setErr('invalid'); return; }
    setState('sending'); setErr(null);
    let last: InterestResult = 'ok';
    const ok: string[] = [];
    for (const l of lines) {
      const p = productById(l.productId);
      if (!p) continue;
      const r = await addInterest(email, p.id, [variantLabel(p, l.colour, l.size), l.qty > 1 ? `×${l.qty}` : ''].filter(Boolean).join(' '), lang);
      if (r === 'ok' || r === 'rate_limited') ok.push(p.id); else last = r;
    }
    if (ok.length) { setState('done'); onListed(ok); track('merch_interest', { product: 'cart', items: ok.length }); }
    else { setState('idle'); setErr(last); }
  };
  if (state === 'done') return <div className="mx-done" role="status"><b>{s.thanks}</b><p>{s.preorderDone}</p></div>;
  return (
    <form className="mx-preorder" onSubmit={submit} noValidate>
      <b>{s.preorderTitle}</b>
      <p className="mx-lead">{s.preorderLead}</p>
      <div className="mx-field">
        <input type="email" inputMode="email" autoComplete="email" placeholder={s.email} aria-label={s.email} value={email}
          onChange={e => { setEmail(e.target.value); setErr(null); }} maxLength={254} aria-invalid={err === 'invalid'} />
      </div>
      <button className="btn acc big mx-checkout" type="submit" disabled={state === 'sending'}>{state === 'sending' ? s.sending : s.preorderSend}</button>
      <p className={`mx-hint ${err ? 'err' : ''}`} role={err ? 'alert' : undefined}>{err ? s.errors[err === 'ok' ? 'error' : err] : s.privacy}</p>
    </form>
  );
}

function NotifyForm({ s, lang, productId, variant, needSize, listed, onListed }: {
  s: MerchStrings; lang: string; productId: string; variant: string; needSize: boolean; listed: boolean; onListed: () => void;
}) {
  const { session } = useApp();
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [state, setState] = useState<'idle' | 'open' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState<InterestResult | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state === 'open') input.current?.focus({ preventScroll: true }); }, [state]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) { setErr('invalid'); return; }
    setState('sending'); setErr(null);
    const r = await addInterest(email, productId, variant, lang);
    if (r === 'ok') { setState('done'); onListed(); track('merch_interest', { product: productId }); }
    else { setState('open'); setErr(r); }
  };

  if (state === 'done') {
    return (
      <motion.div className="mx-done" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} role="status">
        <motion.svg viewBox="0 0 52 52" width="52" height="52" aria-hidden>
          <motion.circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .5 }} />
          <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .35, duration: .35 }} />
        </motion.svg>
        <div><b>{s.thanks}</b><p>{s.thanksSub}</p></div>
        <button className="mx-link" onClick={() => setState('open')}>{s.another}</button>
      </motion.div>
    );
  }
  return (
    <div className="mx-notify">
      {listed && state === 'idle' && <p className="mx-onlist">✓ {s.onList}</p>}
      <AnimatePresence initial={false} mode="wait">
        {state === 'idle' ? (
          <motion.button key="b" className="mx-textbtn mx-notifybtn" onClick={() => setState('open')} exit={{ opacity: 0, y: -6 }}>
            ✉ {s.notify}
          </motion.button>
        ) : (
          <motion.form key="f" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} noValidate>
            <p className="mx-lead">{s.notifyLead}</p>
            <div className="mx-field">
              <input ref={input} type="email" inputMode="email" autoComplete="email" placeholder={s.email} aria-label={s.email}
                value={email} onChange={e => { setEmail(e.target.value); setErr(null); }} maxLength={254} aria-invalid={err === 'invalid'} />
              <button className="btn acc" type="submit" disabled={state === 'sending' || needSize}>{state === 'sending' ? s.sending : needSize ? s.pickSize : s.send}</button>
            </div>
            <p className={`mx-hint ${err ? 'err' : ''}`} role={err ? 'alert' : undefined}>{err ? s.errors[err === 'ok' ? 'error' : err] : s.privacy}</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MerchScreen;
