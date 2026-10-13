import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { INVITE_STRINGS } from '../i18n/invite';
import { AvatarFrame } from '../cosmetics/AvatarFrame';
import { AvatarImg } from '../components/AvatarImg';
import { UserAvatar } from '../media/UserAvatar';
import { track } from '../analytics';
import { sfx } from '../sound';
import { REFERRAL, inviteLink } from './config';
import { useReferral } from './store';
import '../daily/daily-mini.css';

const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

const GiftIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden><rect x="4.5" y="11" width="19" height="13" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 7.5h21v3.5h-21zM14 7.5V24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 7.5c-1.6-3.6-6.4-4.2-6.4-1.3 0 1.6 2.6 1.3 6.4 1.3zM14 7.5c1.6-3.6 6.4-4.2 6.4-1.3 0 1.6-2.6 1.3-6.4 1.3z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
);

/**
 * "Invite friends": personal link, copy, native share, how many friends joined and what it earned.
 * Profile (account tab) and the Daily screen. Signed-in players only (the code lives on the server).
 */
export function InviteCard({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const s = useStrings(INVITE_STRINGS);
  const uid = app.session?.user.id ?? null;
  const r = useReferral(uid);
  const [copied, setCopied] = useState(false);
  const tm = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!uid) return null;
  const info = r.info;
  const link = info?.code ? inviteLink(info.code) : '';
  const bm = info?.reward?.bm ?? REFERRAL.bm, games = info?.reward?.games ?? REFERRAL.games;

  const copy = async () => {
    if (!link) return;
    sfx.tap();
    if (await copyText(link)) {
      setCopied(true); track('invite_copy');
      if (tm.current) clearTimeout(tm.current);
      tm.current = setTimeout(() => setCopied(false), 1800);
    }
  };
  const share = async () => {
    if (!link) return;
    sfx.tap();
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: s.shareTitle, text: s.shareText, url: link }); track('invite_share', { how: 'native' }); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    await copy();
  };

  return (
    <section className={`inv ${compact ? 'compact' : ''}`}>
      <div className="inv-head">
        <span className="inv-ico"><GiftIcon /></span>
        <div className="inv-tt"><b className="serif">{s.title}</b><small>{s.sub(bm, games)}</small></div>
      </div>

      <div className="inv-prize">
        <span className="inv-pv"><AvatarFrame id={REFERRAL.item} size={46}><UserAvatar size={46} /></AvatarFrame></span>
        <span className="tx"><b>{s.frame}</b><small>{s.frameNote}</small></span>
        <span className="bm"><em className="coin" />+{fmt(bm)}</span>
      </div>

      <div className="inv-label">{s.link}</div>
      <div className={`inv-link ${link ? '' : 'loading'}`}>
        <span className="url">{link ? link.replace(/^https:\/\//, '') : r.status === 'error' ? s.error : <i className="shimmerbar" />}</span>
        <button className="inv-copy" onClick={copy} disabled={!link} aria-label={s.copy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={String(copied)} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.15 }}>
              {copied ? `✓ ${s.copied}` : s.copy}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      {r.status === 'error' && !link && <button className="btn ghost sm inv-retry" onClick={() => void r.refresh()}>↻ {s.retry}</button>}
      <motion.button className="btn acc inv-share" onClick={share} disabled={!link} whileTap={{ scale: 0.97 }}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        {s.share}
      </motion.button>

      <div className="inv-stats">
        <span><b>{fmt(info?.joined ?? 0)}</b><small>{s.stats.joined}</small></span>
        <span><b>{fmt(info?.rewarded ?? 0)}</b><small>{s.stats.rewarded}</small></span>
        <span><b><em className="coin" />{fmt(info?.bm_earned ?? 0)}</b><small>{s.stats.earned}</small></span>
      </div>

      {info?.invited_by && (
        <div className="inv-by">
          <span>{s.invitedBy(info.invited_by.name)}</span>
          {info.invited_by.status === 'rewarded'
            ? <b className="ok">✓ {s.rewardedTag}</b>
            : <b>{s.welcome.progress(info.invited_by.games, info.invited_by.target)}</b>}
        </div>
      )}

      {!compact && !!info?.friends?.length && (
        <div className="inv-friends">
          <div className="inv-label">{s.friends}</div>
          {info.friends.map((f, i) => (
            <motion.div key={f.at + f.name} className={`inv-f ${f.status}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <AvatarImg url={f.avatar_url} emoji={f.avatar} name={f.name} size={32} />
              <span className="nm">{f.name}</span>
              {f.status === 'rewarded'
                ? <b className="ok">✓ {s.rewardedTag}</b>
                : <span className="pg"><i style={{ width: `${(f.games / games) * 100}%` }} /><small>{s.progress(f.games, games)}</small></span>}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

/** One-line invite for the Daily result: native share of the invite link (copy as fallback). */
export function InviteMini() {
  const app = useApp();
  const s = useStrings(INVITE_STRINGS);
  const uid = app.session?.user.id ?? null;
  const r = useReferral(uid);
  const [copied, setCopied] = useState(false);
  const code = r.info?.code;
  if (!uid || !code) return null;
  const link = inviteLink(code);
  const bm = r.info?.reward?.bm ?? REFERRAL.bm;
  const go = async () => {
    sfx.tap();
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: s.shareTitle, text: s.shareText, url: link }); track('invite_share', { how: 'daily' }); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    if (await copyText(link)) { setCopied(true); track('invite_copy', { from: 'daily' }); setTimeout(() => setCopied(false), 1800); }
  };
  return (
    <button className="inv-mini" onClick={go}>
      <span className="inv-ico sm"><GiftIcon /></span>
      <span className="tx"><b>{s.title}</b><small>{copied ? `✓ ${s.copied}` : `+${fmt(bm)} BM · ${s.frame}`}</small></span>
      <span className="go" aria-hidden>›</span>
    </button>
  );
}
