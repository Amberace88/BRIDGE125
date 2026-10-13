import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useApp } from '../store';
import { buzz, sfx } from '../sound';
import { useStrings } from '../i18n/pick';
import { SOCIAL_STRINGS } from '../i18n/social';
import { cosmetic } from '../shop/catalog';
import { giftItem } from './api';
import { DiamondIcon } from './GiftArt';
import { fmtDm, itemDiamondPrice } from './gifts';
import { diamondsOf } from './PlayerSheet';
import '../styles/social.css';

/**
 * "Gift to a friend" for a shop style: the friend (by nickname) gets it in their collection with a
 * "gift from X" notification; paid in Diamonds (free for admin / god testers). Drop into the Shop's detail modal:
 *   {giftFor && <GiftItemSheet itemId={giftFor} name={displayName} onClose={() => setGiftFor(null)} onAuth={onAuth} onDiamonds={…} />}
 */
export function GiftItemSheet({ itemId, name, onClose, onAuth, onDiamonds }: { itemId: string; name: string; onClose: () => void; onAuth?: () => void; onDiamonds?: () => void }) {
  const app = useApp();
  const S = useStrings(SOCIAL_STRINGS);
  const c = cosmetic(itemId);
  const price = app.isPrivileged ? 0 : itemDiamondPrice(c?.priceBm ?? 0);
  const [nick, setNick] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const short = !app.isPrivileged && diamondsOf(app.profile) < price;

  const send = async () => {
    if (!app.session) { onAuth?.(); return; }
    if (!nick.trim()) return;
    setBusy(true); setMsg(null);
    const r = await giftItem(itemId, nick.trim());
    setBusy(false);
    if (r.ok) {
      if (r.diamonds != null) app.patchProfile({ diamonds: r.diamonds } as never);
      setMsg({ text: S.giftItem.done(r.to_name ?? nick.trim()), ok: true }); sfx.fanfare(); setNick('');
    } else {
      buzz(20);
      setMsg({ text: r.error === 'funds' ? S.gift.fundsDm(fmtDm(r.need ?? price)) : r.error === 'owned' ? S.giftItem.owned : S.gift.errors[r.error ?? 'generic'], ok: false });
    }
  };

  return (
    <>
      <motion.div className="scrim psheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="psheet gisheet" role="dialog" aria-label={S.giftItem.title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 33 }}>
        <div className="grab" />
        <div className="gihead">
          <motion.span className="gibox" aria-hidden initial={{ rotate: -8, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>🎁</motion.span>
          <div><b className="serif">{S.giftItem.title}</b><span>{name}</span></div>
        </div>
        <p className="pnote">{S.giftItem.sub}</p>
        {!app.session ? (
          <button className="btn acc psend" onClick={onAuth}>{S.giftItem.signIn}</button>
        ) : (
          <form onSubmit={e => { e.preventDefault(); void send(); }}>
            <input className="field" value={nick} maxLength={24} onChange={e => setNick(e.target.value)} placeholder={S.giftItem.nick} aria-label={S.giftItem.nick} autoComplete="off" />
            <button className="btn acc psend" type="submit" disabled={busy || !nick.trim() || short}>
              {busy ? S.giftItem.sending : <span className="pprice">{S.giftItem.send(fmtDm(price))}</span>}
            </button>
            {short && <button type="button" className="alink gidm" onClick={onDiamonds}><DiamondIcon size={14} /> {S.gift.fundsDm(fmtDm(price - diamondsOf(app.profile)))} · {S.gift.getDiamonds} →</button>}
          </form>
        )}
        <AnimatePresence>
          {msg && <motion.div className={`pmsg ${msg.ok ? 'good' : 'bad'}`} role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg.text}</motion.div>}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default GiftItemSheet;
