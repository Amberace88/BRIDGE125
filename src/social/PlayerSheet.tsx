import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useApp } from '../store';
import { buzz, sfx } from '../sound';
import { fmtBm } from '../shop/catalog';
import type { SocialStrings } from '../i18n/social';
import type { RoomSeat, SocialResult } from '../online/useRoom';
import { CoinIcon, DiamondIcon, GiftArt } from './GiftArt';
import { GIFTS, TIP_PRESETS, fmtDm, type Gift } from './gifts';
import { SEAT_COLORS } from './ChatDock';

const IconMute = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden><path d="M4.5 6.8c0-1.6 1.3-2.8 2.9-2.8h9.2c1.6 0 2.9 1.2 2.9 2.8v6.3c0 1.6-1.3 2.8-2.9 2.8H11l-4.2 3.6v-3.6c-1.3-.2-2.3-1.3-2.3-2.8z" />{off && <path d="M4 4l16 16" />}</svg>
);

export const diamondsOf = (p: unknown) => Number((p as { diamonds?: number } | null)?.diamonds ?? 0);

/**
 * Player card for a seat: throw a gift, tip BM, mute their chat. Every price and limit is enforced on the server;
 * the sheet only explains and shows the result.
 */
export function PlayerSheet({ seat, info, S, muted, onToggleMute, onClose, onGift, onTip, onGetDiamonds, onAuth }: {
  seat: number; info: RoomSeat; S: SocialStrings; muted: boolean; onToggleMute: () => void; onClose: () => void;
  onGift: (gift: string) => Promise<SocialResult>; onTip: (amount: number) => Promise<SocialResult>; onGetDiamonds: () => void; onAuth?: () => void;
}) {
  const app = useApp();
  const signedIn = !!app.session;
  const bm = Number(app.profile?.bm ?? 0), dm = diamondsOf(app.profile);
  const free = app.isPrivileged;
  const [tab, setTab] = useState<'gifts' | 'tip'>('gifts');
  const [pick, setPick] = useState<Gift>(GIFTS[1]);
  const [amount, setAmount] = useState(TIP_PRESETS[1]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const tag = info.bot ? S.gift.botTag : info.acct ? S.gift.account : S.gift.guestTag;
  const canTip = signedIn && info.acct && !info.bot;

  const explain = (r: SocialResult): string => {
    if (r.error === 'funds') return r.cur === 'dm' ? S.gift.fundsDm(fmtDm(r.need ?? 0)) : S.gift.fundsBm(fmtBm(r.need ?? 0));
    if (r.error === 'games') return S.gift.games(Math.max(1, r.need ?? 3));
    if (r.error === 'limit' && r.left != null) return `${S.gift.errors.limit} ${S.gift.tipLeft(fmtBm(r.left))}`;
    return S.gift.errors[r.error ?? 'generic'] ?? S.gift.errors.generic;
  };
  const afford = (g: Gift) => free || (g.cur === 'bm' ? bm >= g.price : dm >= g.price);

  const sendGift = async () => {
    if (!signedIn) { onAuth?.(); return; }
    setBusy(true); setMsg(null);
    const r = await onGift(pick.id);
    setBusy(false);
    if (r.ok) {
      app.patchProfile({ ...(r.bm != null ? { bm: r.bm } : {}), ...(r.diamonds != null ? { diamonds: r.diamonds } : {}) } as never);
      sfx.tap(); onClose();
    } else { setMsg({ text: explain(r), bad: true }); buzz(20); }
  };
  const sendTip = async () => {
    setBusy(true); setMsg(null);
    const r = await onTip(amount);
    setBusy(false);
    if (r.ok) {
      if (r.bm != null) app.patchProfile({ bm: r.bm });
      sfx.coin(); onClose();
    } else { setMsg({ text: explain(r), bad: true }); buzz(20); }
  };

  return (
    <>
      <motion.div className="scrim psheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="psheet" role="dialog" aria-label={`${S.gift.title} ${S.gift.to(info.name)}`}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 33 }}>
        <span className="psheen" aria-hidden />
        <div className="grab" />
        <header className="phead">
          <div className="pav" style={{ ['--sc' as string]: SEAT_COLORS[seat % 4] }}>{info.bot ? '🤖' : info.name.slice(0, 1).toUpperCase()}</div>
          <div className="pwho">
            <b className="serif">{info.name}</b>
            <span>{tag}</span>
          </div>
          {!info.bot && (
            <button className={`sglyph ${muted ? 'on' : ''}`} aria-pressed={muted} aria-label={muted ? S.gift.unmute : S.gift.mute} title={muted ? S.gift.unmute : S.gift.mute} onClick={onToggleMute}>
              <IconMute off={muted} />
            </button>
          )}
        </header>

        <div className="pbal">
          <span><CoinIcon size={17} /><b>{fmtBm(bm)}</b></span>
          <span><DiamondIcon size={17} /><b>{fmtDm(dm)}</b></span>
          <button className="alink" onClick={onGetDiamonds}>{S.gift.getDiamonds} →</button>
        </div>

        <nav className="ptabs" role="tablist" style={{ ['--n' as string]: 2, ['--i' as string]: tab === 'gifts' ? 0 : 1 }}>
          <span className="ptabpill" aria-hidden />
          {(['gifts', 'tip'] as const).map(k => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null); }}>
              <span>{k === 'gifts' ? S.gift.tabGifts : S.gift.tabTip}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          {tab === 'gifts' ? (
            <motion.div key="g" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.16 }}>
              <div className="ggrid" role="listbox" aria-label={S.gift.tabGifts}>
                {GIFTS.map((g, i) => (
                  <motion.button key={g.id} role="option" aria-selected={pick.id === g.id} className={`gtile tier${g.tier} ${pick.id === g.id ? 'on' : ''} ${afford(g) ? '' : 'poor'}`}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.93 }}
                    onClick={() => { setPick(g); setMsg(null); sfx.tap(); }}>
                    <span className="gstage"><GiftArt id={g.id} size={44} /></span>
                    <span className="gname">{S.gift.names[g.id] ?? g.id}</span>
                    <span className="gprice">{g.cur === 'bm' ? <CoinIcon size={13} /> : <DiamondIcon size={13} />}{g.cur === 'bm' ? fmtBm(g.price) : fmtDm(g.price)}</span>
                  </motion.button>
                ))}
              </div>
              {(info.bot || !info.acct) && <p className="pnote">{info.bot ? S.gift.bot : S.gift.guest(info.name)}</p>}
              <button className="btn acc psend" disabled={busy} onClick={() => void sendGift()}>
                {!signedIn ? S.gift.signIn : busy ? S.gift.sending : <>{S.gift.send} · {S.gift.names[pick.id]} <span className="pprice">{free ? '0' : pick.cur === 'bm' ? fmtBm(pick.price) : fmtDm(pick.price)}{pick.cur === 'bm' ? <CoinIcon size={15} /> : <DiamondIcon size={15} />}</span></>}
              </button>
            </motion.div>
          ) : (
            <motion.div key="t" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}>
              <div className="tipgrid">
                {TIP_PRESETS.map(v => (
                  <motion.button key={v} className={`tipchip ${amount === v ? 'on' : ''}`} disabled={!canTip} whileTap={{ scale: 0.92 }} onClick={() => { setAmount(v); sfx.tap(); }}>
                    <CoinIcon size={15} />{fmtBm(v)}
                  </motion.button>
                ))}
              </div>
              <p className="pnote">{canTip ? S.gift.tipNote : !signedIn ? S.gift.signIn : S.gift.tipNoAcct}</p>
              <button className="btn acc psend" disabled={busy || !canTip} onClick={() => void sendTip()}>
                {busy ? S.gift.sending : S.gift.tipSend(fmtBm(amount))}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {msg && <motion.div className={`pmsg ${msg.bad ? 'bad' : ''}`} role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg.text}</motion.div>}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
