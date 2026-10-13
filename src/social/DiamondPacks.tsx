import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { sfx } from '../sound';
import { CONTACT_EMAIL } from '../i18n3';
import { useStrings } from '../i18n/pick';
import { SOCIAL_STRINGS, type SocialStrings } from '../i18n/social';
import { DiamondIcon } from './GiftArt';
import { DIAMOND_PACKS, fmtCents, fmtDm, type DiamondPack } from './gifts';
import { paymentsEnabled, startCheckout } from './api';
import { diamondsOf } from './PlayerSheet';
import { WithdrawalConsent } from '../legal/WithdrawalConsent';
import '../styles/social.css';

/** A heap of gems that grows with the pack (deterministic layout, pure CSS 3D). */
function GemPile({ n }: { n: number }) {
  const gems = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(Math.sqrt(i * 1.6));
    const inRow = i - Math.round(row * row / 1.6);
    const w = row + 1;
    return { x: (inRow - (w - 1) / 2) * 17 + (row % 2 ? 4 : -4), y: -row * 11 + 8, r: ((i * 37) % 40) - 20, s: 0.8 + ((i * 13) % 5) / 14, z: 20 - row };
  });
  return (
    <span className="gempile" aria-hidden>
      {gems.map((g, i) => (
        <i key={i} style={{ transform: `translate(${g.x}px, ${g.y}px) rotate(${g.r}deg) scale(${g.s})`, zIndex: g.z, animationDelay: `${(i % 5) * 0.6}s` }}>
          <DiamondIcon size={26} />
        </i>
      ))}
    </span>
  );
}

function PackCard({ p, i, lang, enabled, busy, onBuy, S }: { p: DiamondPack; i: number; lang: string; enabled: boolean; busy: boolean; onBuy: () => void; S: SocialStrings }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(my, { stiffness: 200, damping: 18 }), ry = useSpring(mx, { stiffness: 200, damping: 18 });
  const gx = useMotionValue(50), gy = useMotionValue(30);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.28), transparent 55%)`;
  return (
    <motion.article className={`dmpack ${p.best ? 'best' : ''} ${p.popular ? 'pop' : ''}`} style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
      onPointerMove={e => { if (e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height; mx.set((u - 0.5) * 12); my.set((0.5 - v) * 12); gx.set(u * 100); gy.set(v * 100); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}>
      <span className="dmglow" aria-hidden />
      <div className="dmstage">
        <GemPile n={[3, 6, 10, 15, 21][i] ?? 6} />
        <motion.span className="dmglare" style={{ background: glare }} aria-hidden />
        {p.bonusPct > 0 && <span className="dmbonus">{S.dm.bonus(p.bonusPct)}</span>}
        {(p.best || p.popular) && <span className="dmtag">{p.best ? S.dm.best : S.dm.popular}</span>}
      </div>
      <div className="dminfo">
        <div className="dmnum"><DiamondIcon size={20} /><b className="serif">{fmtDm(p.diamonds)}</b></div>
        <div className="dmprice">{fmtCents(p.cents, lang)}</div>
        {enabled
          ? <button className="btn acc sm dmbuy" disabled={busy} onClick={onBuy}>{busy ? S.dm.buying : S.dm.buy}</button>
          : <em className="soonchip">{S.dm.comingSoon}</em>}
      </div>
    </motion.article>
  );
}

/**
 * Diamonds tab content for the Shop (drop-in: `<DiamondPacks onAuth={onAuth} />`).
 * Live checkout only when the Worker reports payments enabled; otherwise every card says "Payments coming soon".
 */
export function DiamondPacks({ onAuth, compact = false }: { onAuth?: () => void; compact?: boolean }) {
  const app = useApp();
  const S = useStrings(SOCIAL_STRINGS);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // EU withdrawal-right waiver: required before every checkout (see src/legal/WithdrawalConsent.tsx)
  const [consent, setConsent] = useState(false);
  const [needConsent, setNeedConsent] = useState(false);
  useEffect(() => { let dead = false; paymentsEnabled().then(v => { if (!dead) setEnabled(v); }); return () => { dead = true; }; }, []);

  const buy = async (p: DiamondPack) => {
    if (!app.session) { onAuth?.(); return; }
    if (!consent) { setNeedConsent(true); return; }
    setBusy(p.id); setErr(null); sfx.tap();
    const r = await startCheckout(p.id, app.session.access_token, app.lang, consent);
    if ('url' in r) { location.assign(r.url); return; }
    setBusy(null);
    if (r.error === 'unavailable') setEnabled(false);
    setErr(r.error === 'auth' ? S.gift.errors.auth : r.error === 'network' ? S.gift.errors.network : r.error === 'unavailable' ? S.dm.soonNote : S.gift.errors.generic);
  };

  return (
    <div className={`dmwrap ${compact ? 'compact' : ''}`}>
      <div className="dmhero">
        <span className="dmherogem" aria-hidden><DiamondIcon size={compact ? 40 : 54} /></span>
        <div>
          <b className="serif">{S.dm.title}</b>
          <span>{S.dm.sub}</span>
          {app.session && <span className="dmhave"><DiamondIcon size={14} /> {fmtDm(diamondsOf(app.profile))}</span>}
        </div>
      </div>
      {!compact && <ul className="dmuses">{S.dm.uses.map(u => <li key={u}>{u}</li>)}</ul>}
      {!enabled && <div className="dmsoon"><DiamondIcon size={16} /> {S.dm.soonNote}</div>}
      {enabled && <div className="dmconsent"><WithdrawalConsent checked={consent} onChange={v => { setConsent(v); if (v) setNeedConsent(false); }} need={needConsent} /></div>}
      <div className="dmgrid">
        {DIAMOND_PACKS.map((p, i) => <PackCard key={p.id} p={p} i={i} lang={app.lang} enabled={enabled} busy={busy === p.id} onBuy={() => void buy(p)} S={S} />)}
      </div>
      {err && <div className="pmsg bad" role="status">{err}</div>}
      {enabled && !app.session && <button className="btn ghost dmsign" onClick={onAuth}>{S.dm.signIn}</button>}
      <footer className="dmlegal">
        <p>✓ {S.dm.noLoot}</p>
        <p>✓ {S.dm.vat} {enabled ? S.dm.secure : ''}</p>
        <p>{S.dm.refunds(CONTACT_EMAIL)}</p>
      </footer>
    </div>
  );
}

/** Diamonds as a bottom sheet (used from the table's player card). */
export function DiamondSheet({ onClose, onAuth }: { onClose: () => void; onAuth?: () => void }) {
  return (
    <>
      <motion.div className="scrim psheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="psheet dmsheet" role="dialog" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 33 }}>
        <div className="grab" />
        <DiamondPacks onAuth={onAuth} compact />
      </motion.div>
    </>
  );
}

export default DiamondPacks;
