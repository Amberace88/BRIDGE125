import { AnimatePresence, motion, useDragControls, useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from 'react';
import { track } from '../analytics';
import { MERCH_STRINGS, type MerchStrings } from '../i18n/merch';
import { useStrings } from '../i18n/pick';
import { addInterest, rememberInterest, rememberedInterest, type InterestResult } from '../merch/api';
import { CATEGORIES, PRODUCTS, formatEUR, isEmail, priceFor, variantLabel, type Category, type ColourId, type Product } from '../merch/catalog';
import { MERCH_SHIPPING_DAYS, checkoutUrl } from '../merch/config';
import { useApp } from '../store';
import '../styles/merch.css';

const DECK = (n: string) => `/merch/web/deck/${n}.webp`;
const fine = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** Full-screen merch store overlay (same shell pattern as the Guide). */
export function MerchScreen({ onClose }: { onClose: () => void }) {
  const s = useStrings(MERCH_STRINGS);
  const { lang } = useApp();
  const [cat, setCat] = useState<Category | 'all'>('all');
  // deep link: …?item=<product id> opens that product's sheet (handy for sharing a single product)
  const [openId, setOpenId] = useState<string | null>(() => {
    try { const id = new URLSearchParams(location.search).get('item'); return id && PRODUCTS.some(p => p.id === id) ? id : null; } catch { return null; }
  });
  const [listed, setListed] = useState<string[]>(rememberedInterest);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { track('merch_view'); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (openId) setOpenId(null); else onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, onClose]);

  const items = useMemo(() => PRODUCTS.filter(p => cat === 'all' || p.category === cat), [cat]);
  const open = PRODUCTS.find(p => p.id === openId) ?? null;
  const show = (id: string) => { setOpenId(id); track('merch_product', { product: id }); };
  const browse = () => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <motion.div className="mx" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }} role="dialog" aria-label={s.title}>
      <div className="mx-head">
        <button className="iconbtn" onClick={onClose} aria-label={s.back}>‹</button>
        <div className="mx-brand"><img src="/logo-mark.svg" alt="" width="26" height="26" /><span>{s.titleA} <b>{s.titleB}</b></span></div>
        <span className="mx-count">{s.items(PRODUCTS.length)}</span>
      </div>

      <div className="mx-body">
        <Hero s={s} onDeck={() => show('deck')} onBrowse={browse} />

        <div className="mx-filters" ref={gridRef} role="tablist" aria-label={s.title}>
          {(['all', ...CATEGORIES] as const).map(c => (
            <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
              {cat === c && <motion.span layoutId="mxpill" className="mx-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{c === 'all' ? s.all : s.cats[c]}</span>
            </button>
          ))}
        </div>

        <motion.div className="mx-grid" layout>
          <AnimatePresence mode="popLayout">
            {items.map((p, i) => (
              <ProductCard key={p.id} p={p} i={i} s={s} lang={lang} listed={listed.includes(p.id)} onOpen={() => show(p.id)} />
            ))}
          </AnimatePresence>
        </motion.div>

        <section className="mx-band">
          <div className="mx-band-art" aria-hidden>
            {['QS', 'JD', 'AS'].map((n, i) => <img key={n} src={DECK(n)} alt="" style={{ transform: `rotate(${(i - 1) * 12}deg) translateY(${Math.abs(i - 1) * 8}px)` }} loading="lazy" />)}
          </div>
          <div>
            <h2 className="serif">{s.bandTitle}</h2>
            <p>{s.bandText}</p>
            <button className="btn acc" onClick={() => show('deck')}>♠ {s.bandCta}</button>
          </div>
        </section>
        <p className="mx-foot">{s.originals} {s.pod(MERCH_SHIPPING_DAYS)}</p>
      </div>

      <AnimatePresence>
        {open && <ProductSheet key={open.id} p={open} s={s} lang={lang} listed={listed.includes(open.id)}
          onClose={() => setOpenId(null)} onListed={() => { rememberInterest(open.id); setListed(rememberedInterest()); }} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ hero: a 3D deck box
function Hero({ s, onDeck, onBrowse }: { s: MerchStrings; onDeck: () => void; onBrowse: () => void }) {
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
        <motion.p className="mx-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 }}>{s.eyebrow}</motion.p>
        <motion.h1 className="serif" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>
          {s.titleA} <span className="mx-gold">{s.titleB}</span><br /><em>Merch</em>
        </motion.h1>
        <motion.p className="mx-lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .26 }}>{s.lede}</motion.p>
        <motion.div className="mx-hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .34 }}>
          <button className="btn acc" onClick={onDeck}>♠ {s.ctaHero}</button>
          <button className="btn ghost" onClick={onBrowse}>{s.ctaBrowse}</button>
        </motion.div>
        <ul className="mx-perks">{s.perks.map(p => <li key={p}>{p}</li>)}</ul>
      </div>
      <DeckStage x={sx} y={sy} onClick={onDeck} label={s.ctaHero} />
    </section>
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

// ------------------------------------------------------------------------------------------------ grid card with tilt + glare
function ProductCard({ p, i, s, lang, listed, onOpen }: { p: Product; i: number; s: MerchStrings; lang: string; listed: boolean; onOpen: () => void }) {
  const copy = s.products[p.id] ?? MERCH_STRINGS.en.products[p.id];
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
  return (
    <motion.article layout className={`mx-card ${p.hero ? 'hero' : ''}`}
      initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .94 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: Math.min(i, 8) * .04 }}>
      <motion.button className="mx-card-btn" onClick={onOpen} onPointerMove={move} onPointerLeave={leave}
        style={{ rotateX: srx, rotateY: sry }} whileTap={{ scale: .98 }} aria-label={`${copy.name} — ${s.viewDetails}`}>
        <div className="mx-card-img">
          <img src={img} alt={copy.name} width={1200} height={1200} loading={p.hero ? 'eager' : 'lazy'} decoding="async" />
          <motion.span className="mx-glare" style={{ background: glare, opacity: sgo }} aria-hidden />
          {(p.hero || p.badge) && <span className={`mx-badge ${p.hero ? 'hero' : p.badge}`}>{p.hero ? s.badges.hero : s.badges[p.badge!]}</span>}
          {listed && <span className="mx-listed">✓ {s.onList}</span>}
        </div>
        <div className="mx-card-info">
          <div>
            <h3>{copy.name}</h3>
            <p>{copy.tagline}</p>
          </div>
          <b className="mx-price">{formatEUR(p.price, lang)}</b>
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

// ------------------------------------------------------------------------------------------------ detail sheet
function ProductSheet({ p, s, lang, listed, onClose, onListed }: {
  p: Product; s: MerchStrings; lang: string; listed: boolean; onClose: () => void; onListed: () => void;
}) {
  const copy = s.products[p.id] ?? MERCH_STRINGS.en.products[p.id];
  const [colour, setColour] = useState<ColourId>(p.colours[0].id);
  const [size, setSize] = useState<string | null>(p.sizes && p.sizes.length <= 2 ? p.sizes[0].id : null);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(0);
  const images = p.colours.find(c => c.id === colour)!.images;
  const price = formatEUR(priceFor(p, size), lang);
  const buyUrl = checkoutUrl(p.id, p.colours.length > 1 ? colour : null, size);
  const go = (d: number) => { if (images.length < 2) return; setDir(d); setIdx(i => (i + d + images.length) % images.length); };
  const pickColour = (c: ColourId) => { setColour(c); setIdx(0); };
  const drag = useDragControls();

  return (
    <>
      <motion.div className="mx-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className="mx-sheet" role="dialog" aria-modal="true" aria-label={copy.name}
        initial={{ y: '100%', opacity: .6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: .6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .7 }}
        onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}>
        <div className="mx-grab" onPointerDown={e => drag.start(e)} aria-hidden><i /></div>
        <button className="iconbtn mx-x" onClick={onClose} aria-label={s.close}>✕</button>
        <div className="mx-sheet-grid">
          <div className="mx-gallery">
            <div className="mx-main">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.img key={images[idx]} src={images[idx]} alt={copy.name} width={1200} height={1200} custom={dir}
                  initial={{ opacity: 0, x: dir * 60, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: dir * -60, scale: .96 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag={images.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.4}
                  onDragEnd={(_, info) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); }} draggable={false} />
              </AnimatePresence>
              {images.length > 1 && <>
                <button className="mx-nav l" onClick={() => go(-1)} aria-label={s.prev}>‹</button>
                <button className="mx-nav r" onClick={() => go(1)} aria-label={s.next}>›</button>
              </>}
            </div>
            {images.length > 1 && (
              <div className="mx-thumbs">
                {images.map((src, k) => (
                  <button key={src} className={k === idx ? 'on' : ''} onClick={() => { setDir(k > idx ? 1 : -1); setIdx(k); }} aria-label={`${k + 1} / ${images.length}`}>
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mx-info">
            <p className="mx-eyebrow">{s.cats[p.category]}{p.badge ? ` · ${s.badges[p.badge]}` : ''}</p>
            <h2 className="serif">{copy.name}</h2>
            <p className="mx-tag">{copy.tagline}</p>
            <motion.p key={price} className="mx-bigprice" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>{price}</motion.p>

            {p.colours.length > 1 && (
              <div className="mx-opt">
                <span className="mx-label">{s.colour} · <b>{s.colours[colour]}</b></span>
                <div className="mx-swatches" role="radiogroup" aria-label={s.colour}>
                  {p.colours.map(c => (
                    <button key={c.id} role="radio" aria-checked={c.id === colour} className={c.id === colour ? 'on' : ''}
                      style={{ ['--sw' as string]: c.swatch }} onClick={() => pickColour(c.id)} aria-label={s.colours[c.id]} />
                  ))}
                </div>
              </div>
            )}
            {p.sizes && (
              <div className="mx-opt">
                <span className="mx-label">{s.size}{size ? <> · <b>{p.sizes.find(z => z.id === size)?.label}</b></> : null}</span>
                <div className="mx-sizes" role="radiogroup" aria-label={s.size}>
                  {p.sizes.map(z => (
                    <button key={z.id} role="radio" aria-checked={z.id === size} className={z.id === size ? 'on' : ''} onClick={() => setSize(z.id)}>
                      {z.label}{z.priceDelta ? <small>+{z.priceDelta}</small> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mx-desc">{copy.desc}</p>
            <ul className="mx-details">{copy.details.map(d => <li key={d}>{d}</li>)}</ul>
            <p className="mx-pod"><span aria-hidden>◷</span> {s.pod(MERCH_SHIPPING_DAYS)}</p>

            {buyUrl ? (
              <a className={`btn acc big mx-buy ${p.sizes && !size ? 'disabled' : ''}`} href={p.sizes && !size ? undefined : buyUrl} target="_blank" rel="noopener"
                onClick={e => { if (p.sizes && !size) e.preventDefault(); else track('merch_buy', { product: p.id }); }}
                aria-disabled={!!(p.sizes && !size)}>{p.sizes && !size ? s.pickSize : s.buy(price)}</a>
            ) : (
              <NotifyForm s={s} lang={lang} productId={p.id} variant={variantLabel(p, colour, size)} needSize={!!p.sizes && !size} listed={listed} onListed={onListed} />
            )}
          </div>
        </div>
      </motion.div>
    </>
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
          <motion.button key="b" className="btn acc big" onClick={() => setState('open')} exit={{ opacity: 0, y: -6 }}>
            ♠ {s.notify}
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
