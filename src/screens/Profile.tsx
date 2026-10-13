import { AnimatePresence, motion } from 'motion/react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { LangPicker } from '../components/LangPicker';
import { useInstall } from '../install';
import { Sheet } from './Sheets';
import { AchievementsList, LevelBar } from './Rewards';
import { sfx } from '../sound';
import { CONTACT_EMAIL } from '../i18n3';
import { UserAvatar } from '../media/UserAvatar';
import { AvatarPhotoOption } from '../components/AvatarUpload';
import { removeAvatar, useAvatarUrl } from '../media/avatar';
import { initMusic, useMusic } from '../media/music';
import { useStrings } from '../i18n/pick';
import { MEDIA } from '../i18n/media';
import { RoleBadge } from '../components/RoleBadge';
import { AvatarFrame } from '../cosmetics/AvatarFrame';
import { PlayerName, TitleBadge } from '../cosmetics/Badges';
import { useCosmetics } from '../cosmetics/useCosmetics';
import { bannerCss } from '../cosmetics/data';
import { AudioSettings } from '../voice/AudioControls';
import { WalletPanel } from '../social/WalletPanel';
import { HOME } from '../i18n/home';
import { InviteCard } from '../referral/InviteCard';
import { SeasonProfileCard } from '../season/parts';

initMusic();

/** The wardrobe (previews, victory effects, all item art) loads on first visit to the Style tab. */
const Wardrobe = lazy(() => import('../cosmetics/Wardrobe').then(m => ({ default: m.Wardrobe })));
/** Merch orders (status timeline + tracking) — renders nothing for players without orders. */
const MyOrders = lazy(() => import('../merch/MyOrders').then(m => ({ default: m.MyOrders })));

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

/** Profile header avatar: photo → emoji → initial (see media/UserAvatar). */
export function AvatarBadge({ size = 64, ring = true }: { size?: number; ring?: boolean }) {
  return <UserAvatar size={size} ring={ring} />;
}

function MusicRows() {
  const m = useMusic();
  const s = useStrings(MEDIA);
  return (
    <>
      <div className="prow mrow" style={m.on ? { borderBottom: 0 } : undefined}>
        <span>{s.music}{m.on && <span className="meq" aria-hidden><i /><i /><i /></span>}<small>{s.musicSub}</small></span>
        <button className={`switch ${m.on ? 'on' : ''}`} role="switch" aria-checked={m.on} aria-label={s.music} onClick={m.toggle}><i /></button>
      </div>
      <AnimatePresence initial={false}>
        {m.on && (
          <motion.label className="mvol" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <span>{s.volume}</span>
            <input type="range" min={0} max={1} step={0.01} value={m.vol} onChange={e => m.setVol(Number(e.target.value))} aria-label={s.volume} />
          </motion.label>
        )}
      </AnimatePresence>
    </>
  );
}

export function ProfileSheet({ onClose, onAuth, onLegal, onInstall, onAdmin, onShop, onGod, onDiamonds, onAchievements, onVault, onSeason }: {
  onClose: () => void; onAuth: () => void; onLegal: (k: 'privacy' | 'terms') => void; onInstall: () => void; onAdmin: () => void; onShop?: (itemId?: string) => void;
  /** Opens the GOD MODE panel (admin + god only). */
  onGod?: () => void;
  /** Shop → Diamonds tab (from the wallet). */
  onDiamonds?: () => void;
  /** The achievements hall (/achievements). */
  onAchievements?: () => void;
  /** The vault (/vault): wheel, boosts, collections, prestige. */
  onVault?: () => void;
  /** Season Pass (/season). */
  onSeason?: () => void;
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
  const photo = useAvatarUrl();

  const cos = useCosmetics();
  const hs = useStrings(HOME);
  const flash = (m: string) => { setToast(m); if (toastTm.current) clearTimeout(toastTm.current); toastTm.current = setTimeout(() => setToast(null), 2600); };

  const winRate = prof && prof.games_played ? Math.round((prof.wins / prof.games_played) * 100) : 0;
  const since = prof?.created_at ? new Date(prof.created_at).toLocaleDateString(app.lang === 'uk' ? 'uk-UA' : app.lang, { month: 'long', year: 'numeric' }) : null;

  return (
    <Sheet onClose={onClose} closeLabel={t.close}>
      {/* ---------- header ---------- */}
      <div className="phead pcos">
        <span className="pbanner" style={{ background: bannerCss(cos.equipped.banner) }} aria-hidden />
        <AvatarFrame id={cos.equipped.frame} size={68}><AvatarBadge size={68} ring={cos.equipped.frame === 'fr_none'} /></AvatarFrame>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="pname">
            <h2 className="serif"><PlayerName name={app.name || t.guest} color={cos.equipped.namecolor} /></h2>
            <RoleBadge role={prof?.role} />
          </div>
          {cos.equipped.title !== 't_none' && <div className="ptitle"><TitleBadge id={cos.equipped.title} /></div>}
          <div className="mute pemail">{app.session?.user.email ?? p.guestTitle}</div>
          {since && <div className="psince">{p.since(since)}</div>}
        </div>
        {app.isPrivileged && onGod && <GodModeButton onClick={onGod} />}
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

      {prof && <LevelBar />}
      {onSeason && <SeasonProfileCard onOpen={onSeason} />}

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
                <AvatarPhotoOption onToast={flash} />
                {AVATARS.map(a => (
                  <motion.button key={a || 'init'} whileTap={{ scale: 0.88 }} className={`avopt ${app.avatar === a && !photo ? 'on' : ''}`} onClick={() => { app.saveProfile({ avatar: a }); if (photo) removeAvatar().catch(() => {}); sfx.tap(); }} aria-label={a || 'initial'}>
                    {app.avatar === a && !photo && <motion.span layoutId="avsel" className="avsel" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
                    <span className="avch">{a || (app.name || '?').slice(0, 1).toUpperCase()}</span>
                  </motion.button>
                ))}
              </div>

              <div className="label">{t.language}</div>
              <LangPicker variant="field" />

              <AudioSettings music={<MusicRows />} />
              {signedIn && <><div className="label">🏅</div><AchievementsList onOpenHall={onAchievements} /></>}
              {signedIn && onVault && (
                <button className="prow pvault" onClick={() => { sfx.tap(); onVault(); }}>
                  <span><span aria-hidden>◎</span> {hs.dock.vault}</span><span aria-hidden>›</span>
                </button>
              )}
            </div>
          )}

          {tab === 'look' && (
            <div className="psec">
              <Suspense fallback={<div className="wstage wskel" style={{ marginTop: 12 }} />}><Wardrobe onShop={onShop} /></Suspense>
            </div>
          )}

          {tab === 'account' && (
            <div className="psec">
              {signedIn ? (
                <>
                  <div className="prow"><span>{p.email}</span><b className="mute" style={{ fontWeight: 600 }}>{app.session?.user.email}</b></div>
                  <InviteCard />
                  <WalletPanel onDiamonds={onDiamonds} />
                  <Suspense fallback={null}><MyOrders /></Suspense>
                  <ChangePassword />
                  {app.isAdmin && <button className="btn acc" style={{ width: '100%', marginTop: 14 }} onClick={onAdmin}>📊 {p.adminPanel}</button>}
                  {ins.available && <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onInstall}>⬇ {t.install.button}</button>}
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
                  {ins.available && <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onInstall}>⬇ {t.install.button}</button>}
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
      {/* sticky footer: close + sign out are always one tap away */}
      <div className="pfoot">
        {signedIn && <button className="btn ghost pfoot-out" onClick={() => { void app.signOut(); onClose(); }}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></svg>{t.signOut}
        </button>}
        <button className="btn acc pfoot-close" onClick={onClose}>{t.close}</button>
      </div>
    </Sheet>
  );
}

/** Header shortcut into GOD MODE (admin + god only). Styles: styles/role.css (.godbtn). */
function GodModeButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button className="godbtn" onClick={() => { sfx.tap(); onClick(); }} whileHover={{ y: -2 }} whileTap={{ scale: 0.93 }} aria-label="GOD MODE" title="GOD MODE">
      <span className="godbtn-ico" aria-hidden>✦</span>
      <span className="godbtn-txt"><b>GOD</b><b>MODE</b></span>
    </motion.button>
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
