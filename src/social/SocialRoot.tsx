import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { sfx } from '../sound';
import { useStrings } from '../i18n/pick';
import { SOCIAL_STRINGS } from '../i18n/social';
import { SHOP_STRINGS } from '../i18n/shop';
import { fmtBm } from '../shop/catalog';
import { getSupabase } from '../supabase';
import { giftInbox, loadWallet, markGiftsSeen, type InboxGift } from './api';
import { CoinIcon, DiamondIcon } from './GiftArt';
import '../styles/social.css';

interface Toast { id: string; text: string; kind: 'gift' | 'tip' | 'pay' | 'info' }

/**
 * Mount once near the root (App). Shows "Anna sent you Monte Carlo 🎁" / tip notifications (polled while signed in)
 * and handles the return from Stripe Checkout (`/?pay=ok|cancel`): toast + Diamonds balance refresh.
 */
export function SocialRoot() {
  const app = useApp();
  const S = useStrings(SOCIAL_STRINGS);
  const SS = useStrings(SHOP_STRINGS).shop;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const uid = app.session?.user.id;
  const patch = useRef(app.patchProfile);
  useEffect(() => { patch.current = app.patchProfile; }, [app.patchProfile]);

  const push = useCallback((t: Toast) => {
    setToasts(l => [...l.filter(x => x.id !== t.id).slice(-2), t]);
    setTimeout(() => setToasts(l => l.filter(x => x.id !== t.id)), 5200);
  }, []);

  const refreshWallet = useCallback(async () => {
    const w = await loadWallet();
    if (w) patch.current({ bm: w.bm, diamonds: w.diamonds } as never);
    return w;
  }, []);

  // gifts received while away / in another tab
  useEffect(() => {
    if (!uid) return;
    let dead = false;
    const itemName = (id: string | null) => (id ? SS.items[id] ?? id : '');
    const poll = async () => {
      const list: InboxGift[] = await giftInbox();
      if (dead || !list.length) return;
      for (const g of list.slice(0, 3).reverse()) {
        push(g.kind === 'tip'
          ? { id: 'g' + g.id, kind: 'tip', text: S.inbox.tip(g.from, fmtBm(g.bm)) }
          : { id: 'g' + g.id, kind: 'gift', text: S.inbox.item(g.from, itemName(g.gift)) });
      }
      sfx.good();
      await markGiftsSeen(list.map(g => g.id));
      if (list.some(g => g.kind === 'item')) {
        // the gifted style is now owned: refresh the profile row's `owned`
        const sb = await getSupabase();
        const { data } = sb ? await sb.from('profiles').select('owned, bm, diamonds').eq('id', uid).maybeSingle() : { data: null };
        if (data && !dead) patch.current(data as never);
      } else void refreshWallet();
    };
    void poll();
    const id = setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, 60_000);
    const vis = () => { if (document.visibilityState === 'visible') void poll(); };
    document.addEventListener('visibilitychange', vis);
    return () => { dead = true; clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // back from Stripe Checkout
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const pay = q.get('pay');
    if (!pay) return;
    q.delete('pay'); q.delete('sid');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
    if (pay === 'cancel') { push({ id: 'pay', kind: 'info', text: S.dm.payCancel }); return; }
    push({ id: 'pay', kind: 'pay', text: S.dm.payOk });
    sfx.fanfare();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the webhook may land a moment after the redirect: refresh a few times once signed in
  const payPending = useRef(new URLSearchParams(location.search).get('pay') === 'ok');
  useEffect(() => {
    if (!uid || !payPending.current) return;
    payPending.current = false;
    const timers = [0, 2500, 6000, 12000].map(ms => setTimeout(() => void refreshWallet(), ms));
    return () => timers.forEach(clearTimeout);
  }, [uid, refreshWallet]);

  return (
    <div className="soctoasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} className={`soctoast ${t.kind}`} role="status" layout
            initial={{ opacity: 0, y: -24, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={() => setToasts(l => l.filter(x => x.id !== t.id))}>
            <span className="soci">{t.kind === 'tip' ? <CoinIcon size={22} /> : t.kind === 'pay' ? <DiamondIcon size={22} /> : t.kind === 'gift' ? '🎁' : 'ℹ︎'}</span>
            <span>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default SocialRoot;
