import { AnimatePresence, motion } from 'motion/react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { getSupabase } from '../supabase';
import { RoleBadge } from '../components/RoleBadge';
import { AvatarImg } from '../components/AvatarImg';
import { adminInterest, type InterestRow } from '../merch/api';
import { MERCH_STRINGS } from '../i18n/merch';
import { SHOP_STRINGS } from '../i18n/shop';
import '../styles/admin2.css';
import { LANGS, isLang } from '../i18n';
import { Flag } from '../components/Flag';

/* Admin panel — owner-only (Latvian UI). Every RPC re-checks is_admin() on the server. */

interface Overview {
  users_total: number; users_today: number; users_7d: number; online_now: number; dau: number; wau: number; mau: number;
  games_today: number; games_total: number; installs: number; standalone_30d: number; bm_total: number; admins: number; banned: number;
  daily: { day: string; active: number; signups: number; games: number }[];
  modes: Record<string, number>; langs: Record<string, number>; platforms: Record<string, number>; top_events: Record<string, number>;
}
type Role = 'player' | 'admin' | 'god';
interface UserRow {
  id: string; email: string; username: string | null; role: Role; banned: boolean; bm: number; games_played: number; wins: number;
  created_at: string; last_sign_in_at: string | null; last_seen_at: string | null; total: number;
  /** migration 007: email confirmed, level, avatar emoji / photo url */
  confirmed?: boolean; level?: number; avatar?: string | null; avatar_url?: string | null;
}
interface EventRow { at: string; name: string; who: string; props: Record<string, unknown> }

type Tab = 'overview' | 'users' | 'shop' | 'merch' | 'orders' | 'events';
const OrdersAdmin = lazy(() => import('../merch/OrdersAdmin').then(m => ({ default: m.OrdersAdmin })));
const nf = (n: number) => (n ?? 0).toLocaleString('lv-LV');
const ago = (iso: string | null) => {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'tikko';
  if (s < 3600) return `pirms ${Math.floor(s / 60)} min`;
  if (s < 86400) return `pirms ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `pirms ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('lv-LV');
};
const dfmt = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString('lv-LV', d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }); };

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = await getSupabase();
  if (!sb) throw new Error('offline');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

function useCount(to: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now(); const from = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 800); setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to]);
  return v;
}

function Kpi({ label, value, sub, live, i }: { label: string; value: number; sub?: string; live?: boolean; i: number }) {
  const v = useCount(value);
  return (
    <motion.div className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
      <div className="kl">{live && <span className="livedot" />}{label}</div>
      <div className="kv">{nf(v)}</div>
      {sub && <div className="ks">{sub}</div>}
    </motion.div>
  );
}

/** One measure per chart (no dual axes): a 30-day sparkline-style column/area chart with a hover tooltip. */
function DayChart({ title, data, kind }: { title: string; data: { day: string; v: number }[]; kind: 'area' | 'bars' }) {
  const [hi, setHi] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const max = Math.max(1, ...data.map(d => d.v));
  const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
  const H = 170, P = { l: Math.max(34, 12 + nf(nice).length * 6.2), r: 8, t: 12, b: 22 };   // room for "25 000"-wide ticks
  const x = (i: number) => P.l + (i + 0.5) * ((W - P.l - P.r) / data.length);
  const y = (v: number) => H - P.b - (v / nice) * (H - P.t - P.b);
  const bw = Math.max(3, (W - P.l - P.r) / data.length - 4);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${H - P.b} L${x(0).toFixed(1)} ${H - P.b} Z`;
  const total = data.reduce((s, d) => s + d.v, 0);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round((px - P.l) / ((W - P.l - P.r) / data.length) - 0.5);
    setHi(i >= 0 && i < data.length ? i : null);
  };
  return (
    <div className="achart">
      <div className="ach"><b>{title}</b><span>{nf(total)} · 30 d</span></div>
      <div className="acw" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerLeave={() => setHi(null)} role="img" aria-label={title}>
          {[0, 0.5, 1].map(f => (
            <g key={f}>
              <line x1={P.l} x2={W - P.r} y1={y(nice * f)} y2={y(nice * f)} className="grid" />
              <text x={P.l - 6} y={y(nice * f) + 4} className="tick" textAnchor="end">{nf(Math.round(nice * f))}</text>
            </g>
          ))}
          {data.map((d, i) => ((i % 7 === 0 && i < data.length - 4) || i === data.length - 1) && (
            <text key={d.day} x={x(i)} y={H - 6} className="tick" textAnchor="middle">{new Date(d.day).toLocaleDateString('lv-LV', { day: 'numeric', month: 'numeric' })}</text>
          ))}
          {kind === 'area' ? (
            <>
              <path d={area} className="areaf" />
              <motion.path d={line} className="areal" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
            </>
          ) : data.map((d, i) => (
            <motion.rect key={d.day} x={x(i) - bw / 2} width={bw} rx={Math.min(4, bw / 2)} className={`bar ${hi === i ? 'hi' : ''}`}
              initial={{ y: H - P.b, height: 0 }} animate={{ y: y(d.v), height: Math.max(0, H - P.b - y(d.v)) }} transition={{ delay: i * 0.012, duration: 0.5 }} />
          ))}
          {hi != null && (
            <g>
              <line x1={x(hi)} x2={x(hi)} y1={P.t} y2={H - P.b} className="cross" />
              {kind === 'area' && <circle cx={x(hi)} cy={y(data[hi].v)} r={5} className="dot" />}
            </g>
          )}
        </svg>
        {hi != null && (
          <div className="atip" style={{ left: `${(x(hi) / W) * 100}%` }}>
            <span>{new Date(data[hi].day).toLocaleDateString('lv-LV', { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>{nf(data[hi].v)}</b>
          </div>
        )}
      </div>
    </div>
  );
}

function Breakdown({ title, data, labels, flags }: { title: string; data: Record<string, number>; labels?: Record<string, string>; flags?: boolean }) {
  const rows = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(r => r[1]));
  const sum = rows.reduce((s, r) => s + r[1], 0) || 1;
  return (
    <div className="abreak">
      <b className="abt">{title}</b>
      {rows.length === 0 && <div className="mute" style={{ fontSize: 13, padding: '10px 0' }}>Vēl nav datu</div>}
      {rows.map(([k, v], i) => (
        <div key={k} className="abrow" title={`${k}: ${v}`}>
          <span className="abk">{flags && isLang(k) && <Flag lang={k} size={12} className="abflag" />}{flags && isLang(k) && ' '}{labels?.[k] ?? k}</span>
          <span className="abbar"><motion.i initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} /></span>
          <span className="abv">{nf(v)} <em>{Math.round((v / sum) * 100)}%</em></span>
        </div>
      ))}
    </div>
  );
}

const MODE_LV: Record<string, string> = { bots: 'Pret botiem', quick: 'Ātrā online', room: 'Privāts galds' };
const LANG_LV: Record<string, string> = Object.fromEntries(LANGS.map(l => [l.id, l.label]));   // native names, all 17
const PLAT_LV: Record<string, string> = { ios: 'iPhone / iPad', android: 'Android', desktop: 'Dators' };
const EV_LV: Record<string, string> = {
  app_open: 'Atvēra', ping: 'Aktīvs', game_start: 'Sāka spēli', game_end: 'Pabeidza spēli', quick_match: 'Ātrā spēle', room_create: 'Izveidoja galdu',
  signup: 'Reģistrācija', login: 'Ienāca', app_installed: 'Instalēja', install_prompt: 'Instalēšanas logs', admin_action: 'Admina darbība',
  shop_view: 'Atvēra veikalu', shop_buy: 'Nopirka veikalā', shop_equip: 'Uzlika preci', shop_notify: 'Gaida preci', daily_claim: 'Dienas balva',
  achievement: 'Sasniegums', level_up: 'Jauns līmenis', god_tool: 'GOD MODE rīks', merch_view: 'Atvēra merch', merch_product: 'Skatīja merch preci',
  merch_interest: 'Merch interese', merch_buy: 'Merch pirkums',
};

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [ov, setOv] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stamp, setStamp] = useState(0);

  const loadOv = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setOv(await rpc<Overview>('admin_overview')); setStamp(Date.now()); } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => { if (app.isAdmin) loadOv(); }, [app.isAdmin, loadOv]);
  useEffect(() => { if (!app.isAdmin || tab !== 'overview') return; const id = setInterval(loadOv, 60_000); return () => clearInterval(id); }, [app.isAdmin, tab, loadOv]);

  if (!app.isAdmin) {
    return (
      <motion.div className="adpanel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="adenied"><div className="serif" style={{ fontSize: 34 }}>Nav piekļuves</div><p className="mute">Šī lapa ir pieejama tikai administratoriem.</p>
          <button className="btn acc" onClick={onClose}>Uz sākumu</button></div>
      </motion.div>
    );
  }

  return (
    <motion.div className="adpanel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <header className="adhead">
        <div className="adbrand"><img src="/logo-mark.svg" alt="" width={34} height={34} /><div><b>BRIDGE 125</b><span>Admina panelis</span></div></div>
        <nav className="adtabs" role="tablist">
          {([['overview', 'Pārskats'], ['users', 'Spēlētāji'], ['shop', 'Veikals'], ['merch', 'Merch'], ['orders', 'Pasūtījumi'], ['events', 'Notikumi']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {tab === k && <motion.span layoutId="adtab" className="adpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <b>{l}</b>
            </button>
          ))}
        </nav>
        <div className="adact">
          {tab === 'overview' && <button className="iconbtn" onClick={loadOv} aria-label="Atjaunot" title="Atjaunot"><motion.span animate={{ rotate: loading ? 360 : 0 }} transition={{ repeat: loading ? Infinity : 0, duration: 0.8, ease: 'linear' }}>↻</motion.span></button>}
          <button className="iconbtn" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>
      </header>

      <main className="adbody">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === 'overview' && (
              err ? <div className="aderr">Neizdevās ielādēt: {err}</div> :
              !ov ? <div className="adskel">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 96 }} />)}</div> : (
                <>
                  <div className="adsub">Atjaunots {new Date(stamp).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })} · automātiski ik minūti</div>
                  <div className="kpis">
                    <Kpi i={0} label="Online tagad" value={ov.online_now} live sub="pēdējās 6 min" />
                    <Kpi i={1} label="Aktīvi 24 h" value={ov.dau} sub={`7 d: ${nf(ov.wau)} · 30 d: ${nf(ov.mau)}`} />
                    <Kpi i={2} label="Reģistrēti spēlētāji" value={ov.users_total} sub={`+${nf(ov.users_today)} šodien · +${nf(ov.users_7d)} 7 d`} />
                    <Kpi i={3} label="Spēles šodien" value={ov.games_today} sub={`kopā ${nf(ov.games_total)}`} />
                    <Kpi i={4} label="Instalācijas" value={ov.installs} sub={`${nf(ov.standalone_30d)} atver kā lietotni (30 d)`} />
                    <Kpi i={5} label="BM apritē" value={ov.bm_total} sub="visu kontu bilance" />
                    <Kpi i={6} label="Administratori" value={ov.admins} />
                    <Kpi i={7} label="Bloķēti" value={ov.banned} />
                  </div>
                  <div className="acharts">
                    <DayChart title="Aktīvie spēlētāji dienā" kind="area" data={ov.daily.map(d => ({ day: d.day, v: d.active }))} />
                    <DayChart title="Pabeigtās spēles dienā" kind="bars" data={ov.daily.map(d => ({ day: d.day, v: d.games }))} />
                    <DayChart title="Jaunas reģistrācijas dienā" kind="bars" data={ov.daily.map(d => ({ day: d.day, v: d.signups }))} />
                  </div>
                  <div className="abreaks">
                    <Breakdown title="Spēles pēc režīma · 30 d" data={ov.modes} labels={MODE_LV} />
                    <Breakdown title="Valodas · 30 d" data={ov.langs} labels={LANG_LV} flags />
                    <Breakdown title="Ierīces · 30 d" data={ov.platforms} labels={PLAT_LV} />
                    <Breakdown title="Notikumi · 7 d" data={ov.top_events} labels={EV_LV} />
                  </div>
                </>
              )
            )}
            {tab === 'users' && <Users />}
            {tab === 'shop' && <ShopStats />}
            {tab === 'merch' && <MerchInterest />}
            {tab === 'orders' && <Suspense fallback={<div className="adskel"><div className="shimmerbar" style={{ height: 96 }} /></div>}><OrdersAdmin /></Suspense>}
            {tab === 'events' && <Events />}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

function Users() {
  const app = useApp();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [page, setPage] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<UserRow | null>(null);
  const [sort, setSort] = useState<{ k: keyof UserRow; dir: 1 | -1 }>({ k: 'created_at', dir: -1 });
  const PAGE = 50;

  const load = useCallback(async (qq: string, pg: number) => {
    setErr(null);
    try { setRows(await rpc<UserRow[]>('admin_users', { q: qq, lim: PAGE, off: pg * PAGE })); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { const tm = setTimeout(() => load(q.trim(), page), 250); return () => clearTimeout(tm); }, [q, page, load]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const k = sort.k;
    return [...rows].sort((a, b) => {
      const av = a[k] ?? '', bv = b[k] ?? '';
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
  }, [rows, sort]);
  const total = rows?.[0]?.total ?? 0;

  const exportCsv = async () => {
    try {
      const all = await rpc<UserRow[]>('admin_users', { q: q.trim(), lim: 500, off: 0 });
      const head = ['email', 'username', 'role', 'confirmed', 'banned', 'level', 'bm', 'games_played', 'wins', 'created_at', 'last_sign_in_at', 'last_seen_at'] as const;
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [head.join(','), ...all.map(r => head.map(h => esc(r[h])).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `bridge125-speletaji-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { setErr((e as Error).message); }
  };

  const th = (k: keyof UserRow, l: string, right = false) => (
    <th className={right ? 'r' : ''} onClick={() => setSort(s => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {l}{sort.k === k && <span className="sarr">{sort.dir === 1 ? '▲' : '▼'}</span>}
    </th>
  );

  return (
    <div>
      <div className="adtool">
        <div className="adsearch"><span>⌕</span><input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Meklēt pēc e-pasta vai segvārda…" /></div>
        <span className="mute" style={{ fontSize: 13 }}>{nf(total)} spēlētāji</span>
        <button className="btn ghost sm" onClick={exportCsv}>⤓ Eksportēt CSV</button>
      </div>
      {err && <div className="aderr">{err}</div>}
      <div className="adtablewrap">
        <table className="adtable">
          <thead><tr>{th('username', 'Spēlētājs')}{th('role', 'Loma')}{th('confirmed', 'E-pasts')}{th('level', 'Līm.', true)}{th('games_played', 'Spēles', true)}{th('wins', 'Uzv.', true)}{th('bm', 'BM', true)}{th('created_at', 'Reģistrējies')}{th('last_seen_at', 'Pēdējo reizi')}</tr></thead>
          <tbody>
            {!rows && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={9}><div className="shimmerbar" style={{ height: 26 }} /></td></tr>)}
            {sorted.map((r, i) => (
              <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }} onClick={() => setSel(r)} className={r.banned ? 'banned' : ''}>
                <td><div className="ucell"><AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username || r.email} size={34} /><div><b>{r.username || '—'}{r.id === app.session?.user.id && <em> (tu)</em>}</b><span>{r.email}</span></div></div></td>
                <td><RoleCell r={r} /></td>
                <td><ConfirmChip ok={r.confirmed} /></td>
                <td className="r"><span className="lvchip">{r.level ?? 1}</span></td>
                <td className="r">{nf(r.games_played)}</td><td className="r">{nf(r.wins)}</td><td className="r">{nf(r.bm)}</td>
                <td>{dfmt(r.created_at)}</td><td>{ago(r.last_seen_at ?? r.last_sign_in_at)}</td>
              </motion.tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={9} className="mute" style={{ textAlign: 'center', padding: 30 }}>Nav atrasts neviens spēlētājs</td></tr>}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="adpager">
          <button className="btn ghost sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Iepriekšējie</button>
          <span>{page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} no {nf(total)}</span>
          <button className="btn ghost sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>Nākamie ›</button>
        </div>
      )}
      <AnimatePresence>{sel && <UserDrawer key={sel.id} u={sel} onClose={() => setSel(null)} onChanged={() => load(q.trim(), page)} />}</AnimatePresence>
    </div>
  );
}

const ROLE_LV: Record<Role, string> = { player: 'Spēlētājs', god: 'GOD MODE', admin: 'Admins' };
const ROLE_HINT: Record<Role, string> = {
  player: 'Parasts spēlētājs — nekādu privilēģiju.',
  god: 'Līdzautors / galvenais testētājs: visas preces bez maksas + GOD MODE testa rīki (bez admina paneļa).',
  admin: 'Pilna piekļuve: admina panelis, spēlētāju pārvaldība + GOD MODE.',
};

function RoleCell({ r }: { r: UserRow }) {
  return (
    <span className="rolecell">
      {r.role === 'player' ? <span className="rchip">Spēlētājs</span> : <RoleBadge role={r.role} size="xs" />}
      {r.banned && <span className="rchip ban">Bloķēts</span>}
    </span>
  );
}

function ConfirmChip({ ok }: { ok?: boolean }) {
  if (ok === undefined) return <span className="mute">—</span>;
  return ok ? <span className="cchip ok" title="E-pasts apstiprināts">✓ Apstiprināts</span> : <span className="cchip no" title="E-pasts nav apstiprināts">⏳ Nav apstiprināts</span>;
}

function UserDrawer({ u, onClose, onChanged }: { u: UserRow; onClose: () => void; onChanged: () => void }) {
  const app = useApp();
  const [cur, setCur] = useState(u);
  const [amt, setAmt] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; id: number } | null>(null);
  const self = u.id === app.session?.user.id;

  const say = (ok: boolean, text: string) => setMsg({ ok, text, id: Date.now() });
  const act = async (args: Record<string, unknown>, ok: string, key: string) => {
    setBusy(key); setMsg(null);
    try {
      const r = await rpc<{ bm: number; banned: boolean; role: Role }>('admin_update_user', { uid: u.id, ...args });
      setCur(c => ({ ...c, ...r })); say(true, ok); onChanged();
    } catch (e) { say(false, 'Kļūda: ' + (e as Error).message); }
    setBusy(null);
  };
  const confirmEmail = async () => {
    setBusy('confirm'); setMsg(null);
    try {
      await rpc<boolean>('admin_confirm_email', { uid: u.id });
      setCur(c => ({ ...c, confirmed: true })); say(true, 'E-pasts apstiprināts — spēlētājs var ienākt'); onChanged();
    } catch (e) { say(false, 'Kļūda: ' + (e as Error).message); }
    setBusy(null);
  };
  const setRole = (r: Role) => {
    if (r === cur.role || busy) return;
    void act({ set_role: r }, r === 'admin' ? 'Piešķirtas admina tiesības' : r === 'god' ? 'Piešķirts GOD MODE (testētājs)' : 'Privilēģijas noņemtas', 'role');
  };
  const winRate = cur.games_played ? Math.round((cur.wins / cur.games_played) * 100) : 0;

  return (
    <>
      <motion.div className="scrim" style={{ position: 'fixed', zIndex: 95 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside className="udrawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
        <div className="udhead">
          <AvatarImg url={cur.avatar_url} emoji={cur.avatar} name={cur.username || cur.email} size={56} />
          <div style={{ minWidth: 0 }}>
            <h3>{cur.username || '—'}</h3>
            <div className="mute" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur.email}</div>
            <div className="udbadges"><RoleCell r={cur} /><span className="lvchip">Līm. {cur.level ?? 1}</span></div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>
        <div className="udstats">
          {[['Spēles', cur.games_played], ['Uzvaras', cur.wins], ['Uzvaru %', winRate], ['BM', cur.bm]].map(([l, v]) => <div key={l as string}><b>{nf(v as number)}</b><span>{l}</span></div>)}
        </div>

        {cur.confirmed === false && (
          <motion.div className="udconfirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div><b>⏳ E-pasts nav apstiprināts</b><span>Spēlētājs nevar ienākt, kamēr nav atvēris apstiprinājuma saiti. Vari apstiprināt manuāli.</span></div>
            <button className="btn acc sm" disabled={!!busy} onClick={confirmEmail}>{busy === 'confirm' ? <span className="spinner" /> : '✓ Apstiprināt e-pastu'}</button>
          </motion.div>
        )}

        <dl className="udmeta">
          <div><dt>E-pasts</dt><dd><ConfirmChip ok={cur.confirmed} /></dd></div>
          <div><dt>Reģistrējies</dt><dd>{dfmt(cur.created_at)}</dd></div>
          <div><dt>Pēdējā ienākšana</dt><dd>{ago(cur.last_sign_in_at)}</dd></div>
          <div><dt>Pēdējā aktivitāte</dt><dd>{ago(cur.last_seen_at)}</dd></div>
          <div><dt>ID</dt><dd className="mono">{cur.id}</dd></div>
        </dl>

        <div className="label">Loma</div>
        <div className={`rolesel ${self ? 'locked' : ''}`} role="radiogroup" aria-label="Loma">
          {(['player', 'god', 'admin'] as const).map(r => (
            <button key={r} role="radio" aria-checked={cur.role === r} className={`r-${r} ${cur.role === r ? 'on' : ''}`} disabled={self || !!busy} onClick={() => setRole(r)}>
              {cur.role === r && <motion.span layoutId="rolepill" className="rolepill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              <b>{r === 'player' ? '👤' : r === 'god' ? '✦' : '♛'} {ROLE_LV[r]}</b>
            </button>
          ))}
        </div>
        <div className="rolehint">{busy === 'role' ? <span className="spinner" /> : ROLE_HINT[cur.role] ?? ''}</div>
        {self && <div className="mute" style={{ fontSize: 12, marginTop: 4 }}>Sev lomu mainīt nevar.</div>}

        <div className="label">Bridge Money</div>
        <div className="udbm">
          {[100, 1000, 5000].map(n => <button key={n} className="btn ghost sm" disabled={!!busy} onClick={() => act({ add_bm: n }, `+${nf(n)} BM pievienoti`, 'bm')}>+{nf(n)}</button>)}
          <form onSubmit={e => { e.preventDefault(); const n = parseInt(amt, 10); if (!Number.isFinite(n) || n === 0) return; void act({ add_bm: n }, `${n > 0 ? '+' : ''}${nf(n)} BM`, 'bm'); setAmt(''); }}>
            <input className="field" inputMode="numeric" placeholder="± summa" value={amt} onChange={e => setAmt(e.target.value.replace(/[^\d-]/g, ''))} />
            <button className="btn acc sm" disabled={!!busy} type="submit">OK</button>
          </form>
        </div>

        <div className="label">Darbības</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button className={`btn ${cur.banned ? 'ghost' : 'danger'}`} disabled={!!busy || self} onClick={() => act({ set_banned: !cur.banned }, cur.banned ? 'Atbloķēts' : 'Bloķēts', 'ban')}>
            {cur.banned ? '✓ Atbloķēt spēlētāju' : '⛔ Bloķēt spēlētāju'}
          </button>
          {self && <div className="mute" style={{ fontSize: 12 }}>Sevi nevar bloķēt.</div>}
        </div>
        <AnimatePresence>{msg && <motion.div key={msg.id} className={msg.ok ? 'okmsg' : 'autherr'} initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>{msg.text}</motion.div>}</AnimatePresence>
      </motion.aside>
    </>
  );
}

function Events() {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [filter, setFilter] = useState('');
  const seen = useRef<Set<string>>(new Set());
  const load = useCallback(async () => {
    try { setRows(await rpc<EventRow[]>('admin_events', { lim: 200 })); setErr(null); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!live) return; const id = setInterval(load, 10_000); return () => clearInterval(id); }, [live, load]);
  const shown = (rows ?? []).filter(r => !filter || r.name === filter).filter(r => r.name !== 'ping' || filter === 'ping');
  const names = Array.from(new Set((rows ?? []).map(r => r.name)));

  return (
    <div>
      <div className="adtool">
        <button className={`livechip ${live ? 'on' : ''}`} onClick={() => setLive(l => !l)}><span className="livedot" />{live ? 'Tiešraide' : 'Pauze'}</button>
        <select className="field adselect" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Visi notikumi (bez “Aktīvs”)</option>
          {names.map(n => <option key={n} value={n}>{EV_LV[n] ?? n}</option>)}
        </select>
      </div>
      {err && <div className="aderr">{err}</div>}
      <div className="evlist">
        {!rows && Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 44 }} />)}
        <AnimatePresence initial={false}>
          {shown.map(r => {
            const key = r.at + r.name + r.who;
            const fresh = !seen.current.has(key); seen.current.add(key);
            return (
              <motion.div key={key} className="evrow" layout initial={fresh ? { opacity: 0, x: -12, backgroundColor: 'rgba(235,211,142,.18)' } : false} animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,.03)' }} transition={{ duration: 0.6 }}>
                <span className="evt">{ago(r.at)}</span>
                <span className={`evn n-${r.name}`}>{EV_LV[r.name] ?? r.name}</span>
                <span className="evw">{r.who}</span>
                <span className="evp">{Object.entries(r.props ?? {}).filter(([, v]) => v !== null && v !== '').slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {rows && shown.length === 0 && <div className="mute" style={{ textAlign: 'center', padding: 30 }}>Vēl nav notikumu</div>}
      </div>
    </div>
  );
}

/* ================================================================ v2: CSV, shop analytics, merch interest */

function downloadCsv(name: string, head: string[], rows: unknown[][]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [head.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const ITEM_LV = SHOP_STRINGS.lv?.shop.items ?? SHOP_STRINGS.en.shop.items;
const itemName = (id: string) => {
  if (ITEM_LV[id]) return ITEM_LV[id];
  const k = id.match(/^bm_(\d+)k$/);
  if (k) return `${k[1]} 000 BM paka`;
  return id === 'pass_s1' ? 'Sezonas caurlaide (S1)' : id;
};
const productName = (id: string) => (MERCH_STRINGS.lv ?? MERCH_STRINGS.en).products[id]?.name ?? MERCH_STRINGS.en.products[id]?.name ?? id;
const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

interface ShopStatsData {
  days: number; purchases_total: number; purchases_period: number; purchases_7d: number; purchases_today: number; admin_grants: number;
  bm_spent_total: number; bm_spent_period: number; buyers_total: number; buyers_period: number; players_total: number; bm_balance_total: number;
  claims_today: number; claims_7d: number; claims_period: number; claim_streak_7: number;
  shop_viewers: number; shop_buyers_ev: number; notify_clicks: number; equips: number;
  top_items: { id: string; cnt: number; bm: number; buyers: number; last_at: string }[];
  notify_items: Record<string, number>;
  daily: { day: string; purchases: number; bm: number; claims: number }[];
  recent: { at: string; item_id: string; price_bm: number; admin: boolean; who: string }[];
}

function MissingRpc({ fn, file }: { fn: string; file: string }) {
  return (
    <div className="admiss">
      <b>Vajag datubāzes atjauninājumu</b>
      <span>Funkcija <code>{fn}</code> vēl nav datubāzē. Palaid <code>{file}</code> Supabase SQL redaktorā un atjauno šo cilni.</span>
    </div>
  );
}
const isMissing = (e: string) => /could not find the function|does not exist|PGRST202/i.test(e);

function ShopStats() {
  const [d, setD] = useState<ShopStatsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setD(await rpc<ShopStatsData>('admin_shop_stats', { days: 30 })); } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (err) return isMissing(err) ? <MissingRpc fn="admin_shop_stats" file="supabase/migration_009_admin2.sql" /> : <div className="aderr">Neizdevās ielādēt: {err} <button className="alink" onClick={load}>Mēģināt vēlreiz</button></div>;
  if (!d) return <div className="adskel">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 96 }} />)}</div>;

  const maxN = Math.max(1, ...d.top_items.map(t => t.cnt));
  const conv = pctOf(d.shop_buyers_ev, d.shop_viewers);
  return (
    <>
      <div className="adtool">
        <div className="adsub" style={{ margin: 0, flex: 1 }}>Pēdējās {d.days} dienas · admina/GOD bezmaksas “pirkumi” netiek skaitīti</div>
        <button className="btn ghost sm" onClick={load} disabled={loading}>{loading ? <span className="spinner" /> : '↻ Atjaunot'}</button>
        <button className="btn ghost sm" onClick={() => downloadCsv('bridge125-veikals', ['item_id', 'nosaukums', 'pirkumi', 'bm', 'pirceji', 'pedejais'], d.top_items.map(t => [t.id, itemName(t.id), t.cnt, t.bm, t.buyers, t.last_at]))}>⤓ CSV</button>
      </div>
      <div className="kpis">
        <Kpi i={0} label="Pirkumi · 30 d" value={d.purchases_period} sub={`šodien ${nf(d.purchases_today)} · 7 d ${nf(d.purchases_7d)} · kopā ${nf(d.purchases_total)}`} />
        <Kpi i={1} label="BM iztērēti · 30 d" value={d.bm_spent_period} sub={`kopā ${nf(d.bm_spent_total)} BM`} />
        <Kpi i={2} label="Pircēji · 30 d" value={d.buyers_period} sub={`${pctOf(d.buyers_total, d.players_total)}% no ${nf(d.players_total)} spēlētājiem (kopā)`} />
        <Kpi i={3} label="Konversija, %" value={conv} sub={`${nf(d.shop_buyers_ev)} pirka no ${nf(d.shop_viewers)} skatītājiem`} />
        <Kpi i={4} label="Dienas balvas šodien" value={d.claims_today} live sub={`7 d: ${nf(d.claims_7d)} · 30 d: ${nf(d.claims_period)}`} />
        <Kpi i={5} label="7+ dienu sērijā" value={d.claim_streak_7} sub="spēlētāji ar aktīvu 7 dienu sēriju" />
        <Kpi i={6} label="BM apritē" value={d.bm_balance_total} sub="visu aktīvo kontu bilance" />
        <Kpi i={7} label="Testa piešķīrumi" value={d.admin_grants} sub={`admin/GOD · ${nf(d.equips)} uzlikšanas · ${nf(d.notify_clicks)} “paziņot”`} />
      </div>
      <div className="acharts">
        <DayChart title="Pirkumi dienā" kind="bars" data={d.daily.map(x => ({ day: x.day, v: x.purchases }))} />
        <DayChart title="Iztērētie BM dienā" kind="area" data={d.daily.map(x => ({ day: x.day, v: x.bm }))} />
        <DayChart title="Dienas balvas dienā" kind="bars" data={d.daily.map(x => ({ day: x.day, v: x.claims }))} />
      </div>
      <div className="shopgrid">
        <div className="abreak">
          <b className="abt">Populārākās preces · visu laiku</b>
          {d.top_items.length === 0 && <div className="mute" style={{ fontSize: 13, padding: '10px 0' }}>Vēl neviens nav nopircis</div>}
          {d.top_items.slice(0, 12).map((t, i) => (
            <div key={t.id} className="toprow">
              <span className="toprk">{i + 1}</span>
              <span className="topnm"><b>{itemName(t.id)}</b><em>{nf(t.buyers)} pircēji · {ago(t.last_at)}</em></span>
              <span className="abbar"><motion.i initial={{ width: 0 }} animate={{ width: `${(t.cnt / maxN) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} /></span>
              <span className="topv"><b>{nf(t.cnt)}</b><em>{nf(t.bm)} BM</em></span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <Breakdown title="“Paziņot, kad pieejams” · 30 d" data={d.notify_items} labels={Object.fromEntries(Object.keys(d.notify_items).map(k => [k, itemName(k)]))} />
          <div className="abreak">
            <b className="abt">Pēdējie pirkumi</b>
            {d.recent.length === 0 && <div className="mute" style={{ fontSize: 13, padding: '10px 0' }}>Vēl nav pirkumu</div>}
            <div className="recent">
              {d.recent.map((r, i) => (
                <motion.div key={r.at + r.item_id + i} className="recrow" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                  <span className="evt">{ago(r.at)}</span>
                  <span className="recwho">{r.who}</span>
                  <span className="recit">{itemName(r.item_id)}</span>
                  <span className="recp">{r.admin ? <span className="rchip">tests</span> : `${nf(r.price_bm)} BM`}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MerchInterest() {
  const [rows, setRows] = useState<InterestRow[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState('');
  const [prod, setProd] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(async () => {
    setErr(false);
    try { const r = await adminInterest(); if (r) setRows(r); else setErr(true); } catch { setErr(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const by = new Map<string, { n: number; variants: Map<string, number>; emails: Set<string>; last: string }>();
    const langs: Record<string, number> = {};
    const week = Date.now() - 7 * 86400_000;
    for (const r of all) {
      let p = by.get(r.product_id);
      if (!p) { p = { n: 0, variants: new Map(), emails: new Set(), last: r.at }; by.set(r.product_id, p); }
      p.n++; p.emails.add(r.email); if (r.at > p.last) p.last = r.at;
      const v = r.variant || '—'; p.variants.set(v, (p.variants.get(v) ?? 0) + 1);
      const l = r.lang || '?'; langs[l] = (langs[l] ?? 0) + 1;
    }
    const products = [...by.entries()].map(([id, p]) => ({ id, ...p, variants: [...p.variants.entries()].sort((a, b) => b[1] - a[1]) })).sort((a, b) => b.n - a.n);
    return {
      total: all.length, emails: new Set(all.map(r => r.email)).size, week: all.filter(r => new Date(r.at).getTime() >= week).length,
      signedIn: all.filter(r => r.user_id).length, products, langs,
    };
  }, [rows]);

  const filtered = useMemo(() => (rows ?? []).filter(r => (!prod || r.product_id === prod) && (!q || r.email.includes(q.toLowerCase().trim()))), [rows, prod, q]);
  const maxN = Math.max(1, ...stats.products.map(p => p.n));
  const exportCsv = () => downloadCsv('bridge125-merch-interese', ['at', 'email', 'product_id', 'product', 'variant', 'lang', 'user_id'],
    filtered.map(r => [r.at, r.email, r.product_id, productName(r.product_id), r.variant, r.lang, r.user_id]));

  if (err) return <MissingRpc fn="admin_merch_interest" file="supabase/migration_005_merch.sql" />;
  if (!rows) return <div className="adskel">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 96 }} />)}</div>;

  return (
    <>
      <div className="kpis">
        <Kpi i={0} label="Pieteikumi kopā" value={stats.total} sub="“paziņot / priekšpasūtīt”" />
        <Kpi i={1} label="Unikāli e-pasti" value={stats.emails} sub={`${nf(stats.signedIn)} no reģistrētiem spēlētājiem`} />
        <Kpi i={2} label="Pēdējās 7 d" value={stats.week} live />
        <Kpi i={3} label="Preces ar interesi" value={stats.products.length} sub={stats.products[0] ? `Top: ${productName(stats.products[0].id)}` : undefined} />
      </div>

      <div className="shopgrid" style={{ marginTop: 12 }}>
        <div className="abreak">
          <b className="abt">Interese pēc preces un varianta</b>
          {stats.products.length === 0 && <div className="mute" style={{ fontSize: 13, padding: '10px 0' }}>Vēl nav pieteikumu</div>}
          {stats.products.map((p, i) => (
            <div key={p.id} className={`mprod ${open === p.id ? 'open' : ''}`}>
              <button className="toprow" onClick={() => setOpen(o => (o === p.id ? null : p.id))} aria-expanded={open === p.id}>
                <span className="toprk">{i + 1}</span>
                <span className="topnm"><b>{productName(p.id)}</b><em>{p.variants.length} varianti · {nf(p.emails.size)} e-pasti · {ago(p.last)}</em></span>
                <span className="abbar"><motion.i initial={{ width: 0 }} animate={{ width: `${(p.n / maxN) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} /></span>
                <span className="topv"><b>{nf(p.n)}</b><em>{open === p.id ? '▲ slēpt' : '▼ varianti'}</em></span>
              </button>
              <AnimatePresence initial={false}>
                {open === p.id && (
                  <motion.div className="mvars" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    {p.variants.map(([v, n]) => <span key={v} className="mvar"><b>{v}</b><em>{nf(n)}</em></span>)}
                    <button className="alink" onClick={() => setProd(p.id)}>Rādīt pieteikumus ↓</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <Breakdown title="Valoda" data={stats.langs} />
      </div>

      <div className="adtool" style={{ marginTop: 16 }}>
        <div className="adsearch"><span>⌕</span><input value={q} onChange={e => setQ(e.target.value)} placeholder="Meklēt e-pastu…" /></div>
        <select className="field adselect" value={prod} onChange={e => setProd(e.target.value)}>
          <option value="">Visas preces</option>
          {stats.products.map(p => <option key={p.id} value={p.id}>{productName(p.id)} ({p.n})</option>)}
        </select>
        <span className="mute" style={{ fontSize: 13 }}>{nf(filtered.length)} pieteikumi</span>
        <button className="btn ghost sm" onClick={exportCsv} disabled={!filtered.length}>⤓ Eksportēt CSV</button>
      </div>
      <div className="adtablewrap">
        <table className="adtable plain">
          <thead><tr><th>Laiks</th><th>E-pasts</th><th>Prece</th><th>Variants</th><th>Valoda</th><th>Konts</th></tr></thead>
          <tbody>
            {filtered.slice(0, 300).map((r, i) => (
              <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }}>
                <td title={new Date(r.at).toLocaleString('lv-LV')}>{ago(r.at)}</td>
                <td><a className="alink" href={`mailto:${r.email}`}>{r.email}</a></td>
                <td>{productName(r.product_id)}</td><td>{r.variant || '—'}</td><td>{(r.lang || '—').toUpperCase()}</td>
                <td>{r.user_id ? <span className="cchip ok">✓ spēlētājs</span> : <span className="mute">viesis</span>}</td>
              </motion.tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="mute" style={{ textAlign: 'center', padding: 30 }}>Nav pieteikumu</td></tr>}
          </tbody>
        </table>
      </div>
      {filtered.length > 300 && <div className="adsub" style={{ marginTop: 8 }}>Rādīti 300 jaunākie — CSV satur visus {nf(filtered.length)}.</div>}
    </>
  );
}
