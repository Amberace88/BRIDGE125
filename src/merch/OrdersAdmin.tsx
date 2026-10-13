import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MERCH_STRINGS } from '../i18n/merch';
import {
  adminCatalog, adminFulfilmentAction, adminLoadOrders, adminProviders, adminRegisterHooks, adminRunQueue, fmtMoney, safeUrl,
  type AdminFulfilment, type AdminOrder, type FulfilmentStatus, type OrderStatus, type ProvidersReport,
} from './orders';
import '../styles/merch-orders.css';

/**
 * Admin → "Pasūtījumi": merch orders (filter, retry, mark resolved, cancel) and the print-provider set-up check
 * (brand guard, webhook URLs, catalogue lookup for src/merch/fulfillment.ts). Latvian, like the rest of the panel.
 */
const ST: Record<OrderStatus, string> = {
  paid: 'Apmaksāts', processing: 'Ražošanā', partially_shipped: 'Daļēji nosūtīts', shipped: 'Nosūtīts', delivered: 'Piegādāts', canceled: 'Atcelts', refunded: 'Atmaksāts',
};
const FST: Record<FulfilmentStatus, string> = {
  queued: 'Rindā', submitting: 'Sūta…', submitted: 'Nosūtīts piegādātājam', in_production: 'Ražošanā', partially_shipped: 'Daļēji nosūtīts', shipped: 'Nosūtīts',
  delivered: 'Piegādāts', failed: 'Kļūda', canceled: 'Atcelts', manual: 'Atrisināts manuāli',
};
const PROV: Record<string, string> = { printful: 'Printful', gelato: 'Gelato', prodigi: 'Prodigi', printify: 'Printify' };
const nf = (n: number) => n.toLocaleString('lv-LV');
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'tikko'; if (m < 60) return `pirms ${m} min`; const h = Math.round(m / 60); if (h < 48) return `pirms ${h} h`;
  return new Date(iso).toLocaleDateString('lv-LV', { day: 'numeric', month: 'short' });
};
const productName = (id: string, title?: string | null) => MERCH_STRINGS.lv?.products[id]?.name ?? MERCH_STRINGS.en.products[id]?.name ?? title ?? id;

export function OrdersAdmin() {
  const [view, setView] = useState<'orders' | 'providers'>('orders');
  return (
    <div className="oadm">
      <div className="oaseg" role="tablist">
        {(['orders', 'providers'] as const).map(k => (
          <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
            {view === k && <motion.span layoutId="oaseg" className="oapill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <b>{k === 'orders' ? 'Pasūtījumi' : 'Piegādātāji'}</b>
          </button>
        ))}
      </div>
      {view === 'orders' ? <Orders /> : <Providers />}
    </div>
  );
}

function Orders() {
  const [rows, setRows] = useState<AdminOrder[] | null | undefined>(undefined);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [attention, setAttention] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => { setRows(await adminLoadOrders({ status, attention })); }, [status, attention]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const all = useMemo(() => rows ?? [], [rows]);
  const kpi = useMemo(() => {
    const paid = all.filter(o => o.status !== 'refunded' && o.status !== 'canceled');
    return {
      n: all.length, revenue: paid.reduce((a, o) => a + o.total_cents, 0), attention: all.filter(o => o.needs_attention).length,
      open: all.filter(o => o.status === 'paid' || o.status === 'processing' || o.status === 'partially_shipped').length,
      shipped: all.filter(o => o.status === 'shipped' || o.status === 'delivered').length,
    };
  }, [all]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter(o => (o.email ?? '').toLowerCase().includes(s) || o.id.replace(/-/g, '').startsWith(s.replace(/-/g, '')) || o.fulfilments.some(f => (f.external_id ?? '').includes(s) || (f.provider_order_id ?? '').includes(s)));
  }, [all, q]);

  const act = async (f: AdminFulfilment, action: 'retry' | 'resolve' | 'cancel') => {
    let note: string | undefined;
    if (action === 'resolve') { const n = window.prompt('Piezīme (piem. “pasūtīts manuāli Printful, #12345”):', f.admin_note ?? ''); if (n === null) return; note = n; }
    if (action === 'cancel' && !window.confirm(f.provider_order_id ? `Atcelt? Pasūtījums jau ir pie ${PROV[f.provider ?? ''] ?? f.provider} (${f.provider_order_id}) — atcel to arī tur.` : 'Atcelt šo sūtījumu?')) return;
    setBusy(`${f.id}:${action}`);
    const ok = await adminFulfilmentAction(f.id, action, note);
    setBusy(null);
    setToast(ok ? (action === 'retry' ? 'Nosūtīts atkārtoti' : 'Saglabāts') : 'Neizdevās — skaties kļūdu sūtījuma kartītē');
    void load();
  };
  const runNow = async () => {
    setBusy('run');
    const r = await adminRunQueue();
    setBusy(null);
    setToast(r?.ok ? `Rinda apstrādāta: ${r.submitted?.length ?? 0} sūtīti, ${r.polled ?? 0} statusi atjaunoti` : 'Neizdevās palaist rindu');
    void load();
  };

  if (rows === null) {
    return (
      <div className="admiss">
        <b>Vajag datubāzes atjauninājumu</b>
        <span>Tabulas <code>merch_orders</code> vēl nav. Palaid <code>supabase/migration_021_merch_orders.sql</code> Supabase SQL redaktorā un atjauno šo cilni.</span>
      </div>
    );
  }
  if (rows === undefined) return <div className="adskel">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 80 }} />)}</div>;

  return (
    <>
      <div className="kpis">
        <OKpi i={0} label="Pasūtījumi" value={nf(kpi.n)} sub={`${nf(kpi.open)} procesā · ${nf(kpi.shipped)} nosūtīti`} />
        <OKpi i={1} label="Apgrozījums" value={fmtMoney(kpi.revenue, 'eur', 'lv')} sub="bez atmaksātajiem" />
        <OKpi i={2} label="Jāpievērš uzmanība" value={nf(kpi.attention)} alert={kpi.attention > 0} sub={kpi.attention ? 'kļūda / aizturēts / atmaksāts pēc nosūtīšanas' : 'viss kārtībā'} />
      </div>

      <div className="adtool" style={{ marginTop: 14 }}>
        <div className="adsearch"><span>⌕</span><input value={q} onChange={e => setQ(e.target.value)} placeholder="E-pasts, pasūtījuma vai piegādātāja nr.…" /></div>
        <select className="field adselect" value={status} onChange={e => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">Visi statusi</option>
          {(Object.keys(ST) as OrderStatus[]).map(k => <option key={k} value={k}>{ST[k]}</option>)}
        </select>
        <label className="oachk"><input type="checkbox" checked={attention} onChange={e => setAttention(e.target.checked)} /> Tikai problēmas</label>
        <button className="btn ghost sm" onClick={() => void load()}>↻ Atjaunot</button>
        <button className="btn acc sm" onClick={runNow} disabled={busy === 'run'}>{busy === 'run' ? 'Apstrādā…' : '▶ Apstrādāt rindu tagad'}</button>
      </div>

      <div className="oalist">
        {filtered.length === 0 && <div className="mute oaempty">Nav pasūtījumu</div>}
        {filtered.slice(0, 200).map((o, i) => {
          const isOpen = open === o.id;
          const a = o.shipping_address ?? {};
          return (
            <motion.div key={o.id} className={`oarow ${o.needs_attention ? 'warn' : ''} ${isOpen ? 'open' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }}>
              <button className="oahead" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen}>
                <span className="oaid"><b>#{o.id.replace(/-/g, '').slice(0, 8).toUpperCase()}</b><em title={new Date(o.created_at).toLocaleString('lv-LV')}>{ago(o.created_at)}</em></span>
                <span className="oawho">{o.email ?? '—'}<em>{o.ship_country ?? ''}{o.user_id ? ' · spēlētājs' : ' · viesis'}</em></span>
                <span className="oaprov">{[...new Set(o.fulfilments.map(f => PROV[f.provider ?? ''] ?? '—'))].join(' + ')}</span>
                <span className="oasum">{fmtMoney(o.total_cents, o.currency, 'lv')}</span>
                <span className={`mochip ${o.needs_attention ? 'bad' : o.status === 'delivered' || o.status === 'shipped' ? 'done' : o.status === 'refunded' || o.status === 'canceled' ? 'off' : ''}`}>{o.needs_attention ? '⚠ ' : ''}{ST[o.status] ?? o.status}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div className="oabody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <div className="oagrid">
                      <div>
                        <div className="oalbl">Preces</div>
                        <ul className="oaitems">{o.items.map((it, k) => <li key={k}><span>{productName(it.product_id, it.title)} <em>{[it.colour, it.size].filter(Boolean).join(' / ')}</em></span><b>×{it.qty}</b><i>{it.unit_cents !== undefined ? fmtMoney(it.unit_cents * it.qty, o.currency, 'lv') : ''}</i></li>)}</ul>
                        <div className="oatot">Starpsumma {fmtMoney(o.subtotal_cents, o.currency, 'lv')} · piegāde {fmtMoney(o.shipping_cents, o.currency, 'lv')} · PVN {fmtMoney(o.tax_cents, o.currency, 'lv')} · <b>{fmtMoney(o.total_cents, o.currency, 'lv')}</b></div>
                      </div>
                      <div>
                        <div className="oalbl">Piegādes adrese</div>
                        <address className="oaaddr">{a.name}<br />{a.line1}{a.line2 ? <>, {a.line2}</> : null}<br />{a.postal_code} {a.city}{a.state ? `, ${a.state}` : ''}<br />{a.country}{a.phone ? <> · {a.phone}</> : null}</address>
                        <div className="oameta">Stripe: <code>{o.stripe_session_id.slice(0, 24)}…</code>{o.refunded_at && <> · <b>atmaksāts {ago(o.refunded_at)}</b></>}</div>
                      </div>
                    </div>
                    <div className="oalbl">Sūtījumi pie piegādātājiem</div>
                    {o.fulfilments.map(f => (
                      <div key={f.id} className={`oaful ${f.status === 'failed' || f.attention ? 'warn' : ''}`}>
                        <div className="oafhead">
                          <b>{PROV[f.provider ?? ''] ?? 'Nav piegādātāja'}</b>
                          <span className="cchip">{FST[f.status] ?? f.status}</span>
                          {f.provider_status && <span className="mute">({f.provider_status})</span>}
                          <code>{f.external_id ?? '—'}</code>
                          {f.provider_order_id && <code>↗ {f.provider_order_id}</code>}
                          <span className="mute">mēģ. {f.attempts}{f.tried?.length ? ` · iepriekš: ${f.tried.join(', ')}` : ''}</span>
                        </div>
                        {f.attention && <div className="oaerr">⚠ {f.attention}</div>}
                        {f.last_error && <div className="oaerr soft">{f.last_error}{f.status === 'queued' && <> · nākamais mēģinājums {ago(f.next_attempt_at).replace('pirms', 'pēc')}</>}</div>}
                        {f.admin_note && <div className="oanote">📝 {f.admin_note}</div>}
                        {f.tracking.length > 0 && <div className="oatrk">{f.tracking.map((t, k) => { const u = safeUrl(t.url); return u ? <a key={k} className="alink" href={u} target="_blank" rel="noopener noreferrer">📦 {t.carrier ?? ''} {t.number ?? 'izsekot'}</a> : <span key={k}>📦 {t.carrier ?? ''} {t.number}</span>; })}</div>}
                        <div className="oaacts">
                          {(f.status === 'failed' || f.status === 'queued' || f.status === 'canceled') && f.provider && <button className="btn acc sm" disabled={!!busy} onClick={() => act(f, 'retry')}>{busy === `${f.id}:retry` ? 'Sūta…' : '↻ Mēģināt vēlreiz'}</button>}
                          {(f.status === 'failed' || f.attention || f.status === 'queued') && <button className="btn ghost sm" disabled={!!busy} onClick={() => act(f, 'resolve')}>✓ Atrisināts</button>}
                          {f.status !== 'shipped' && f.status !== 'delivered' && f.status !== 'canceled' && <button className="btn ghost sm" disabled={!!busy} onClick={() => act(f, 'cancel')}>Atcelt</button>}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>{toast && <motion.div className="oatoast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>{toast}</motion.div>}</AnimatePresence>
    </>
  );
}

function OKpi({ label, value, sub, i, alert }: { label: string; value: string; sub?: string; i: number; alert?: boolean }) {
  return (
    <motion.div className={`kpi ${alert ? 'oaalert' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
      <div className="kl">{label}</div>
      <div className="kv">{value}</div>
      {sub && <div className="ks">{sub}</div>}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- providers / set-up check */

const LOOKUP: Record<string, { key: string; label: string; hint: string }[]> = {
  printful: [{ key: 'product', label: 'Kataloga produkta ID', hint: 'piem. 71 (T-krekls) — tukšs = produktu saraksts' }],
  gelato: [{ key: 'catalog', label: 'Kataloga UID', hint: 'piem. t-shirts, mugs, posters — tukšs = katalogi' }],
  prodigi: [{ key: 'sku', label: 'SKU', hint: 'piem. GLOBAL-MUG-11OZ' }],
  printify: [
    { key: 'blueprint', label: 'Blueprint ID', hint: 'tukšs = visi blueprinti' },
    { key: 'print_provider', label: 'Print provider ID', hint: 'ar blueprint → varianti' },
    { key: 'products', label: 'Veikala produkti (1)', hint: '1 = tava Bridge 125 veikala produkti (kāršu kava)' },
  ],
};

function Providers() {
  const [rep, setRep] = useState<ProvidersReport | null | undefined>(undefined);
  const [lookup, setLookup] = useState<{ provider: string; params: Record<string, string> }>({ provider: 'printful', params: {} });
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setRep(undefined); setRep(await adminProviders()); }, []);
  useEffect(() => { void load(); }, [load]);

  const runLookup = async () => {
    setBusy(true);
    const params = Object.fromEntries(Object.entries(lookup.params).filter(([, v]) => v.trim()));
    const r = await adminCatalog(lookup.provider, params);
    setResult(JSON.stringify(r, null, 1).slice(0, 40_000));
    setBusy(false);
  };
  const register = async (p: string) => {
    if (!window.confirm(`Izveidot ${PROV[p]} webhookus uz šo Worker adresi?`)) return;
    const r = await adminRegisterHooks(p);
    setResult(JSON.stringify(r, null, 1).slice(0, 40_000));
  };

  if (rep === undefined) return <div className="adskel">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 90 }} />)}</div>;
  if (!rep || rep.error) {
    return <div className="admiss"><b>Worker neatbild</b><span>{rep?.reason === 'not_configured' ? 'Nav SUPABASE_SERVICE_ROLE_KEY — skat. docs/PAYMENTS.md un docs/MERCH.md.' : 'Pārbaudi, vai esi pieslēdzies kā administrators un Worker ir izvietots.'}</span></div>;
  }
  return (
    <>
      <div className="oaflags">
        <span className={`cchip ${rep.stripe ? 'ok' : ''}`}>{rep.stripe ? '✓' : '✗'} Stripe</span>
        <span className={`cchip ${rep.store ? 'ok' : ''}`}>{rep.store ? '✓' : '✗'} Supabase service key</span>
        <span className={`cchip ${rep.enabled ? 'ok' : ''}`}>{rep.enabled ? '✓ Pārdošana ieslēgta' : '✗ Pārdošana izslēgta'}</span>
        {rep.draftOrders && <span className="cchip">MERCH_DRAFT_ORDERS=1 (melnraksti)</span>}
        {rep.liveShipping && <span className="cchip">Dzīvie piegādes tarifi</span>}
        <button className="btn ghost sm" onClick={() => void load()}>↻ Pārbaudīt vēlreiz</button>
      </div>
      <div className="oaprovs">
        {rep.providers.map((p, i) => (
          <motion.div key={p.id} className={`oaprovc ${!p.configured ? 'off' : p.brand?.ok ? 'ok' : 'bad'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="oaph"><b>{p.label}</b><span className={`mochip ${!p.configured ? 'off' : p.brand?.ok ? 'done' : 'bad'}`}>{!p.configured ? 'Nav iestatīts' : p.brand?.ok ? 'Zīmols pārbaudīts' : 'BLOĶĒTS'}</span></div>
            {p.configured ? (
              <>
                <div className="oapl">Veikals: <b>{p.brand?.storeName ?? '—'}</b>{p.expectedStoreId && <> · ID <code>{p.expectedStoreId}</code></>}</div>
                {p.brand && !p.brand.ok && <div className="oaerr">⛔ {p.brand.reason}</div>}
                {p.brand?.warnings.map((w, k) => <div key={k} className="oaerr soft">{w}</div>)}
                <div className="oapl">Kartēti varianti: <b>{p.mapping.mapped}</b> / {p.mapping.total}</div>
                {p.missingPrintFiles.length > 0 && <div className="oaerr soft">Trūkst drukas failu: {p.missingPrintFiles.join(', ')}</div>}
                {p.webhookUrl && (
                  <div className="oahook">
                    <span>Webhook URL</span>
                    <code>{p.webhookUrl}</code>
                    <button className="btn ghost sm" onClick={() => void navigator.clipboard?.writeText(p.webhookUrl!)}>Kopēt</button>
                    {p.canRegisterHooks && <button className="btn ghost sm" onClick={() => register(p.id)}>Izveidot webhookus</button>}
                  </div>
                )}
              </>
            ) : <div className="mute oapl">Pievieno noslēpumus ar <code>wrangler secret put</code> — skat. docs/MERCH.md.</div>}
          </motion.div>
        ))}
      </div>

      <div className="oalook">
        <div className="oalbl">Kataloga meklēšana (variantu ID → src/merch/fulfillment.ts)</div>
        <div className="adtool">
          <select className="field adselect" value={lookup.provider} onChange={e => setLookup({ provider: e.target.value, params: {} })}>
            {rep.providers.filter(p => p.configured).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            {!rep.providers.some(p => p.configured) && <option value="">— nav neviena piegādātāja —</option>}
          </select>
          {(LOOKUP[lookup.provider] ?? []).map(f => (
            <input key={f.key} className="field oainp" placeholder={`${f.label} — ${f.hint}`} value={lookup.params[f.key] ?? ''}
              onChange={e => setLookup(l => ({ ...l, params: { ...l.params, [f.key]: e.target.value } }))} />
          ))}
          <button className="btn acc sm" disabled={busy || !rep.providers.some(p => p.configured && p.id === lookup.provider)} onClick={runLookup}>{busy ? 'Meklē…' : 'Meklēt'}</button>
        </div>
        {result && <pre className="oapre">{result}</pre>}
      </div>
    </>
  );
}
