import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { SOCIAL_STRINGS } from '../i18n/social';
import { SHOP_STRINGS } from '../i18n/shop';
import { CONTACT_EMAIL } from '../i18n3';
import { fmtBm } from '../shop/catalog';
import { loadWallet, type Wallet } from './api';
import { CoinIcon, DiamondIcon, GiftArt } from './GiftArt';
import { fmtCents, fmtDm, isGiftId } from './gifts';
import '../styles/social.css';

/**
 * Profile section: balances, real-money purchase history (with refunds), Diamond activity and gifts.
 * Drop-in for the Profile sheet: `<WalletPanel />` (renders nothing for guests).
 */
export function WalletPanel({ onDiamonds }: { onDiamonds?: () => void }) {
  const app = useApp();
  const S = useStrings(SOCIAL_STRINGS);
  const SS = useStrings(SHOP_STRINGS).shop;
  const [w, setW] = useState<Wallet | null>(null);
  const [tab, setTab] = useState<'buys' | 'gifts' | 'ledger'>('buys');
  const uid = app.session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let dead = false;
    loadWallet().then(x => { if (!dead && x) { setW(x); app.patchProfile({ diamonds: x.diamonds } as never); } });
    return () => { dead = true; };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!uid) return null;
  const date = (s: string) => new Date(s).toLocaleDateString(app.lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const what = (g: string | null) => (g ? (isGiftId(g) ? S.gift.names[g] : SS.items[g] ?? g) : '');

  return (
    <section className="wallet">
      <div className="wbal">
        <div><CoinIcon size={22} /><b className="serif">{fmtBm(w?.bm ?? app.profile?.bm ?? 0)}</b><small>BM</small></div>
        <div><DiamondIcon size={22} /><b className="serif">{fmtDm(w?.diamonds ?? 0)}</b><small>{S.dm.name}</small></div>
        {onDiamonds && <button className="btn acc sm" onClick={onDiamonds}>{S.gift.getDiamonds}</button>}
      </div>
      <nav className="ptabs" role="tablist" style={{ ['--n' as string]: 3, ['--i' as string]: ['buys', 'gifts', 'ledger'].indexOf(tab) }}>
        <span className="ptabpill" aria-hidden />
        {(['buys', 'gifts', 'ledger'] as const).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span>{k === 'buys' ? S.wallet.history : k === 'gifts' ? S.wallet.sent : S.wallet.ledger}</span>
          </button>
        ))}
      </nav>
      <div className="wlist">
        {tab === 'buys' && (w?.payments.length ? w.payments.map((p, i) => (
          <div key={i} className="wrow">
            <DiamondIcon size={18} />
            <span className="wmain">{fmtDm(p.diamonds)} {S.dm.name}<small>{date(p.at)}</small></span>
            <span className={`wamt ${p.status === 'refunded' ? 'ref' : ''}`}>{fmtCents(p.amount_cents, app.lang)}{p.status === 'refunded' && <small>{S.wallet.refunded}</small>}</span>
          </div>
        )) : <div className="wempty">{S.wallet.none}</div>)}
        {tab === 'gifts' && ([...(w?.sent ?? []).map(g => ({ ...g, dir: 'out' as const })), ...(w?.received ?? []).map(g => ({ ...g, dir: 'in' as const }))]
          .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40).map((g, i) => (
            <div key={i} className="wrow">
              {g.kind === 'table' && g.gift ? <GiftArt id={g.gift} size={22} /> : g.kind === 'tip' ? <CoinIcon size={18} /> : <span className="wico">🎁</span>}
              <span className="wmain">{g.kind === 'tip' ? S.wallet.tip(fmtBm(g.bm)) : what(g.gift)}<small>{g.dir === 'out' ? `→ ${g.to ?? '—'}` : `← ${g.from ?? '—'}`} · {date(g.at)}</small></span>
              <span className="wamt">{g.dir === 'out' ? (g.diamonds ? `−${fmtDm(g.diamonds)} 💎` : g.bm ? `−${fmtBm(g.bm)} BM` : '') : g.bm ? `+${fmtBm(g.bm)} BM` : ''}</span>
            </div>
          ))) }
        {tab === 'gifts' && !(w?.sent.length || w?.received.length) && <div className="wempty">—</div>}
        {tab === 'ledger' && (w?.ledger.length ? w.ledger.map((l, i) => (
          <div key={i} className="wrow">
            <DiamondIcon size={16} />
            <span className="wmain">{S.wallet.reasons[l.reason] ?? l.reason}<small>{date(l.at)}</small></span>
            <span className={`wamt ${l.delta < 0 ? 'neg' : 'pos'}`}>{l.delta > 0 ? '+' : '−'}{fmtDm(Math.abs(l.delta))}</span>
          </div>
        )) : <div className="wempty">—</div>)}
      </div>
      <p className="wnote">{S.dm.refunds(CONTACT_EMAIL)}</p>
    </section>
  );
}

export default WalletPanel;
