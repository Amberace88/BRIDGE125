import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { MERCH_STRINGS } from '../i18n/merch';
import { MERCH_ORDER_STRINGS } from '../i18n/merchOrders';
import { CONTACT_EMAIL } from '../i18n3';
import { fmtMoney, loadMyOrders, safeUrl, timelineStep, type MyOrder } from './orders';
import '../styles/merch-orders.css';

/**
 * Profile section: the player's merch orders with a status timeline and tracking links.
 * Drop-in: `<MyOrders />` — renders nothing for guests or players without orders.
 */
export function MyOrders() {
  const app = useApp();
  const s = useStrings(MERCH_ORDER_STRINGS);
  const uid = app.session?.user.id;
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    let dead = false;
    loadMyOrders().then(o => { if (!dead) setOrders(o); });
    return () => { dead = true; };
  }, [uid]);
  if (!uid || !orders?.length) return null;
  return (
    <section className="morders" aria-label={s.title}>
      <div className="mohead"><b className="serif">{s.title}</b><span>{s.sub}</span></div>
      <div className="molist">
        {orders.map((o, i) => <OrderCard key={o.id} o={o} i={i} />)}
      </div>
      <div className="mohelp">{s.help} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
    </section>
  );
}

function OrderCard({ o, i }: { o: MyOrder; i: number }) {
  const { lang } = useApp();
  const s = useStrings(MERCH_ORDER_STRINGS);
  const m = useStrings(MERCH_STRINGS);
  const [open, setOpen] = useState(i === 0);
  const step = timelineStep(o.status);
  const qty = o.items.reduce((a, it) => a + it.qty, 0);
  const date = new Date(o.created_at).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const tracking = o.shipments.flatMap(f => f.tracking.map(t => ({ ...t, url: safeUrl(t.url) }))).filter(t => t.url || t.number);
  const name = (id: string, title?: string | null) => m.products[id]?.name ?? title ?? id;
  const colour = (c: string | null) => (c ? (m.colours as Record<string, string>)[c] ?? c : null);

  return (
    <motion.article className={`mocard st-${o.status}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
      <button className="motop" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className="moid"><b>{s.order(o.id.replace(/-/g, '').slice(0, 8).toUpperCase())}</b><small>{date} · {s.items(qty)} · {fmtMoney(o.total_cents, o.currency, lang)}</small></span>
        <span className={`mochip ${step < 0 ? 'off' : step === 3 ? 'done' : ''}`}>{s.status[o.status] ?? o.status}</span>
      </button>

      {step >= 0 && (
        <div className="moline" role="list" aria-label={s.status[o.status]}>
          <span className="motrack" aria-hidden><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: step / 3 }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} /></span>
          {s.steps.map((label, k) => (
            <span key={k} role="listitem" className={`mostep ${k <= step ? 'on' : ''} ${k === step ? 'now' : ''}`} aria-current={k === step ? 'step' : undefined}>
              <motion.span className="modot" initial={{ scale: 0.6 }} animate={{ scale: k === step ? 1.15 : 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: k * 0.08 }} />
              <em>{label}</em>
            </span>
          ))}
        </div>
      )}

      {tracking.length > 0 && (
        <div className="motracks">
          {tracking.map((t, k) => t.url
            ? <a key={k} className="btn acc sm motrk" href={t.url} target="_blank" rel="noopener noreferrer">📦 {s.track}{t.carrier ? ` · ${t.carrier}` : ''}</a>
            : <span key={k} className="motrkno">{s.trackNo} <b>{t.number}</b>{t.carrier ? ` · ${t.carrier}` : ''}</span>)}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul className="moitems" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {o.items.map((it, k) => (
              <li key={k}><span>{name(it.product_id, it.title)}<small>{[colour(it.colour), it.size].filter(Boolean).join(' · ')}</small></span><b>×{it.qty}</b></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
