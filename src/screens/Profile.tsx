import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { ACCENTS, BACKS, TABLES, backCss } from '../theme';
import { LangPicker } from '../components/LangPicker';
import { CardFace } from '../components/CardView';
import { useInstall } from '../install';
import { Sheet } from './Sheets';
import { sfx } from '../sound';
import { CONTACT_EMAIL } from '../i18n3';
import type { Card } from '../engine/engine';

const AVATARS = ['', '♠', '♥', '♦', '♣', '👑', '🃏', '🎩', '🦊', '🐺', '🦉', '🐻', '🌙', '⭐', '🔥', '💎'];
type Tab = 'me' | 'look' | 'account';

function CountUp({ to, dur = 900 }: { to: number; dur?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{v.toLocaleString('fr-FR')}</>;
}

export function AvatarBadge({ size = 64, ring = true }: { size?: number; ring?: boolean }) {
  const app = useApp();
  const label = app.avatar || (app.name || app.session?.user.email || '?').slice(0, 1).toUpperCase();
  return (
    <div className={`pavatar ${ring ? 'ring' : ''}`} style={{ width: size, height: size, fontSize: size * (app.avatar ? 0.46 : 0.4) }}>
      <span>{label}</span>
    </div>
  );
}

const DEMO: Card[] = [{ id: 'AS', r: 'A', s: 'S' }, { id: 'QH', r: 'Q', s: 'H' }, { id: 'JD', r: 'J', s: 'D' }];

function LivePreview({ table, accent, back }: { table: string; accent: string; back: string }) {
  const app = useApp();
  const tb = TABLES.find(x => x.id === table) ?? TABLES[0];
  const ac = ACCENTS.find(x => x.id === accent) ?? ACCENTS[0];
  const bk = backCss(back, table);
  const vars = { ['--acc' as string]: ac.base, ['--acc-hi' as string]: ac.hi, ['--acc-lo' as string]: ac.lo, ['--acc-ink' as string]: ac.ink };
  return (
    <div className="lpv" style={vars}>
      <AnimatePresence initial={false}>
        <motion.div key={tb.id} className="lpvbg" style={{ background: tb.css, backgroundColor: tb.tone }} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
      </AnimatePresence>
      <div className="lpvdeck">
        {[0, 1, 2].map(i => (
          <motion.div key={back + i} className="lpvback" style={{ background: bk, rotate: -4 + i * 3, x: i * 2, y: -i * 2 }}
            initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 220, damping: 18 }}>
            <i />
          </motion.div>
        ))}
      </div>
      <div className="lpvhand">
        {DEMO.map((c, i) => (
          <motion.div key={c.id} className="card" style={{ width: 54, height: 77, ['--cw' as string]: '54px', position: 'absolute', left: `calc(50% - 27px + ${(i - 1) * 34}px)`, top: 104 }}
            initial={{ y: 40, rotate: 0, opacity: 0 }} animate={{ y: i === 1 ? -6 : 0, rotate: (i - 1) * 9, opacity: 1 }} transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 200, damping: 17 }}>
            <CardFace card={c} lang={app.lang} />
          </motion.div>
        ))}
      </div>
      <motion.div key={ac.id} className="lpvbtn" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}>♠ {app.t.nav.play}</motion.div>
      <div className="lpvchip"><i className="coin" />{(app.profile?.bm ?? 5000).toLocaleString('fr-FR')}</div>
    </div>
  );
}

export function ProfileSheet({ onClose, onAuth, onLegal, onInstall, onAdmin }: {
  onClose: () => void; onAuth: () => void; onLegal: (k: 'privacy' | 'terms') => void; onInstall: () => void; onAdmin: () => void;
}) {
  const app = useApp();
  const { t } = app;
  const p = t.prof;
  const ins = useInstall();
  const [tab, setTab] = useState<Tab>('me');
  const [name, setName] = useState(app.name);
  const [savedFlash, setSavedFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prof = app.profile;
  const signedIn = !!app.session;

  // preview state (what the live preview shows) vs saved state (what the app uses)
  const [pv, setPv] = useState({ table: app.table, accent: app.accent, back: app.cardBack });
  const trying = pv.table !== app.table || pv.accent !== app.accent || pv.back !== app.cardBack;

  const flash = (m: string) => { setToast(m); if (toastTm.current) clearTimeout(toastTm.current); toastTm.current = setTimeout(() => setToast(null), 2600); };
  const pick = (kind: 'table' | 'accent' | 'back', id: string) => {
    setPv(v => ({ ...v, [kind]: id }));
    sfx.tap();
    if (!signedIn) { flash(p.guestLock); return; }
    if (!app.canUse(id)) { flash(p.locked); return; }
    app.saveProfile(kind === 'table' ? { table: id } : kind === 'accent' ? { accent: id } : { cardBack: id });
  };
  const revert = () => setPv({ table: app.table, accent: app.accent, back: app.cardBack });

  const winRate = prof && prof.games_played ? Math.round((prof.wins / prof.games_played) * 100) : 0;
  const since = prof?.created_at ? new Date(prof.created_at).toLocaleDateString(app.lang === 'uk' ? 'uk-UA' : app.lang, { month: 'long', year: 'numeric' }) : null;

  return (
    <Sheet onClose={onClose}>
      {/* ---------- header ---------- */}
      <div className="phead">
        <AvatarBadge size={68} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="pname">
            <h2 className="serif">{app.name || t.guest}</h2>
            {app.isAdmin && <span className="pbadge admin">{p.admin}</span>}
          </div>
          <div className="mute pemail">{app.session?.user.email ?? p.guestTitle}</div>
          {since && <div className="psince">{p.since(since)}</div>}
        </div>
      </div>

      {prof && (
        <div className="pstats">
          {[{ l: t.auth.stats.games, v: prof.games_played }, { l: t.auth.stats.wins, v: prof.wins }, { l: p.winRate, v: winRate, suf: '%' }, { l: 'BM', v: prof.bm, coin: true }].map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <b>{s.coin && <i className="coin" />}<CountUp to={s.v} />{s.suf}</b><span>{s.l}</span>
            </motion.div>
          ))}
        </div>
      )}

      {!signedIn && app.online && (
        <div className="pguest">
          <div><b>{p.guestTitle}</b><span>{p.guestSub}</span></div>
          <button className="btn acc sm" onClick={onAuth}>{t.nav.signIn}</button>
        </div>
      )}

      {/* ---------- tabs ---------- */}
      <div className="ptabs" role="tablist">
        {(['me', 'look', 'account'] as const).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {tab === k && <motion.span layoutId="ptab" className="ptabpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <b>{p.tabs[k]}</b>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

          {tab === 'me' && (
            <div className="psec">
              <div className="label">{t.yourName}</div>
              <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); const n = name.trim(); if (!n) return; app.saveProfile({ name: n }); setSavedFlash(true); sfx.good(); setTimeout(() => setSavedFlash(false), 1500); }}>
                <input className="field" value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder={t.guest} autoComplete="nickname" />
                <button className="btn acc sm" style={{ height: 50, minWidth: 104 }} type="submit">
                  <AnimatePresence mode="wait"><motion.span key={String(savedFlash)} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}>{savedFlash ? `✓ ${p.saved}` : t.save}</motion.span></AnimatePresence>
                </button>
              </form>

              <div className="label">{p.avatar}</div>
              <div className="avgrid">
                {AVATARS.map(a => (
                  <motion.button key={a || 'init'} whileTap={{ scale: 0.88 }} className={`avopt ${app.avatar === a ? 'on' : ''}`} onClick={() => { app.saveProfile({ avatar: a }); sfx.tap(); }} aria-label={a || 'initial'}>
                    {app.avatar === a && <motion.span layoutId="avsel" className="avsel" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
                    <span className="avch">{a || (app.name || '?').slice(0, 1).toUpperCase()}</span>
                  </motion.button>
                ))}
              </div>

              <div className="label">{t.language}</div>
              <LangPicker variant="field" />

              <div className="prow">
                <span>{t.sound}</span>
                <button className={`switch ${app.sound ? 'on' : ''}`} role="switch" aria-checked={app.sound} onClick={() => app.set({ sound: !app.sound })}><i /></button>
              </div>
            </div>
          )}

          {tab === 'look' && (
            <div className="psec">
              <LivePreview table={pv.table} accent={pv.accent} back={pv.back} />
              <AnimatePresence>
                {trying && (
                  <motion.div className="tryon" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <span>👁 {p.tryOn}</span><button className="alink" onClick={revert}>↺</button>
                  </motion.div>
                )}
              </AnimatePresence>
              {app.isAdmin && <div className="adminnote">👑 {p.adminFree}</div>}

              <div className="label">{p.table}</div>
              <div className="tilegrid">
                {TABLES.map((tb, i) => {
                  const lock = !app.canUse(tb.id);
                  return (
                    <motion.button key={tb.id} className={`ttile ${pv.table === tb.id ? 'on' : ''} ${tb.premium ? 'prem' : ''}`} style={{ background: tb.css, backgroundColor: tb.tone }}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }} whileTap={{ scale: 0.96 }} onClick={() => pick('table', tb.id)}>
                      <span className="tname">{tb.name}</span>
                      {tb.premium && <span className={`pchip ${lock ? 'lock' : ''}`}>{lock ? '🔒' : '👑'} {p.premium}</span>}
                      {app.table === tb.id && <motion.span layoutId="tcheck" className="tcheck">✓</motion.span>}
                    </motion.button>
                  );
                })}
              </div>

              <div className="label">{p.accent}</div>
              <div className="swgrid">
                {ACCENTS.map(a => (
                  <motion.button key={a.id} whileTap={{ scale: 0.88 }} aria-label={a.name} title={a.name}
                    className={`swatch2 ${pv.accent === a.id ? 'on' : ''}`} onClick={() => pick('accent', a.id)}
                    style={{ background: `radial-gradient(circle at 35% 30%, ${a.hi}, ${a.base} 55%, ${a.lo})` }}>
                    {a.premium && <span className="swcrown">{app.canUse(a.id) ? '👑' : '🔒'}</span>}
                    {app.accent === a.id && <motion.span layoutId="swsel" className="swsel" />}
                  </motion.button>
                ))}
              </div>

              <div className="label">{p.backs}</div>
              <div className="backgrid">
                {BACKS.map(b => {
                  const lock = !app.canUse(b.id);
                  return (
                    <motion.button key={b.id} className={`btile ${pv.back === b.id ? 'on' : ''}`} whileTap={{ scale: 0.92 }} onClick={() => pick('back', b.id)}>
                      <span className="bcard" style={{ background: backCss(b.id, pv.table) }}><i /></span>
                      <span className="bname">{b.id === 'match' ? p.matchBack : b.name}</span>
                      {b.premium && <span className="bcrown">{lock ? '🔒' : '👑'}</span>}
                      {app.cardBack === b.id && <motion.span layoutId="bsel" className="bsel" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="psec">
              {signedIn ? (
                <>
                  <div className="prow"><span>{p.email}</span><b className="mute" style={{ fontWeight: 600 }}>{app.session?.user.email}</b></div>
                  <ChangePassword />
                  {app.isAdmin && <button className="btn acc" style={{ width: '100%', marginTop: 14 }} onClick={onAdmin}>📊 {p.adminPanel}</button>}
                  {!ins.installed && <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onInstall}>⬇ {t.install.button}</button>}
                  <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => app.signOut()}>{t.signOut}</button>
                  <div className="dzone">
                    <div className="label" style={{ marginTop: 0 }}>{p.danger}</div>
                    <a className="btn ghost dbtn" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Delete my Bridge 125 account')}&body=${encodeURIComponent('Please delete the account for ' + (app.session?.user.email ?? ''))}`}>{p.deleteAcc}</a>
                    <div className="mute" style={{ fontSize: 12, marginTop: 6 }}>{p.deleteHint}</div>
                  </div>
                </>
              ) : (
                <>
                  <button className="btn acc big" onClick={onAuth}>{t.nav.signIn}</button>
                  {!ins.installed && <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onInstall}>⬇ {t.install.button}</button>}
                </>
              )}
              <div className="homefoot insheet">
                <button onClick={() => onLegal('privacy')}>{t.legal.privacy}</button><span>·</span>
                <button onClick={() => onLegal('terms')}>{t.legal.terms}</button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="ptoast" role="status" initial={{ y: 30, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 30, opacity: 0, x: '-50%' }}>{toast}</motion.div>
        )}
      </AnimatePresence>
      <button className="btn ghost" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}

function ChangePassword() {
  const app = useApp();
  const { t } = app;
  const a = t.acct;
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    if (pw.length < 8) { setMsg({ ok: false, text: a.err.short }); return; }
    if (pw !== pw2) { setMsg({ ok: false, text: a.mismatch }); return; }
    setBusy(true);
    const r = await app.updatePassword(pw);
    setBusy(false);
    if (r) { setMsg({ ok: false, text: a.err[r] }); return; }
    setMsg({ ok: true, text: t.prof.pwChanged }); sfx.good(); setPw(''); setPw2(''); setTimeout(() => { setOpen(false); setMsg(null); }, 1600);
  };

  return (
    <div className="pwbox">
      <button className="prow pwtoggle" onClick={() => { setOpen(o => !o); setMsg(null); }} aria-expanded={open}>
        <span>🔑 {t.prof.changePw}</span><motion.span animate={{ rotate: open ? 90 : 0 }}>›</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
            onSubmit={e => { e.preventDefault(); save(); }}>
            <div style={{ display: 'grid', gap: 10, paddingTop: 10 }}>
              <input className="field" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder={a.newPw} value={pw} onChange={e => setPw(e.target.value)} />
              <input className="field" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder={a.repeatPw} value={pw2} onChange={e => setPw2(e.target.value)} />
              <label className="mute" style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> {a.show}</label>
              {msg && <div className={msg.ok ? 'okmsg' : 'autherr'}>{msg.text}</div>}
              <button className="btn acc" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : a.savePw}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
