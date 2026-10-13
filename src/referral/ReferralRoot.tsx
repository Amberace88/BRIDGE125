import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { INVITE_STRINGS } from '../i18n/invite';
import { AvatarFrame } from '../cosmetics/AvatarFrame';
import { getSupabase } from '../supabase';
import { pushProfile } from '../progress/store';
import { track } from '../analytics';
import { sfx } from '../sound';
import { referralClaimRpc, referralPeekRpc } from '../daily/api';
import { REFERRAL } from './config';
import { captureRefFromUrl, deviceId, readRef, writeRef } from './ref';
import { loadReferral, useReferral } from './store';
import '../daily/daily-mini.css';

type Card =
  | { kind: 'welcome'; name: string; bm: number; games: number; progress: number | null }
  | { kind: 'reward'; title: string; body: string };

/** Errors that will never succeed later: forget the stored code. */
const FINAL = new Set(['claimed', 'unknown', 'self', 'old', 'device', 'banned']);

/**
 * Invite links, app-wide (one line in App.tsx):
 *  - `?ref=CODE` is captured from any URL and kept until the visitor signs up;
 *  - a guest sees "X invited you — play 3 games and you both get …" with a sign-in button;
 *  - after sign-in the code is claimed once (referral_claim) and the welcome shows the 0/3 progress;
 *  - when the reward lands (the 3rd game, server-side trigger) both players get a celebration card.
 */
export function ReferralRoot({ onAuth }: { onAuth: () => void }) {
  const app = useApp();
  const s = useStrings(INVITE_STRINGS);
  const uid = app.session?.user.id ?? null;
  const [card, setCard] = useState<Card | null>(null);
  const ref = useReferral(uid);
  const info = ref.info;
  const uidRef = useRef(uid);
  useEffect(() => { uidRef.current = uid; }, [uid]);

  // 1) capture + welcome a guest
  useEffect(() => {
    const code = captureRefFromUrl();
    const st = readRef();
    if (!code || !st || st.welcomed) return;
    track('referral_visit');
    void referralPeekRpc(code).then(p => {
      if (!p?.ok || !p.name) return;
      writeRef({ ...st, welcomed: true });
      // signed-in visitors are handled by the claim below
      if (!uidRef.current) setCard({ kind: 'welcome', name: p.name, bm: p.reward?.bm ?? REFERRAL.bm, games: p.reward?.games ?? REFERRAL.games, progress: null });
    });
  }, []);

  // 2) claim once after sign-in
  useEffect(() => {
    if (!uid) return;
    const st = readRef();
    if (!st || st.tried === uid) return;
    writeRef({ ...st, tried: uid });
    void referralClaimRpc(st.code, deviceId()).then(r => {
      if (!r) { const cur = readRef(); if (cur) writeRef({ ...cur, tried: undefined }); return; }   // offline: retry next time
      if (r.ok) {
        writeRef(null);
        track('referral_claim');
        setCard({ kind: 'welcome', name: r.name ?? '', bm: r.reward?.bm ?? REFERRAL.bm, games: r.target ?? REFERRAL.games, progress: r.games ?? 0 });
        void loadReferral(uid, true);
      } else if (FINAL.has(r.error ?? '')) {
        writeRef(null);
        // an existing account (or the inviter) opened the link: the guest invitation does not apply
        setCard(c => (c?.kind === 'welcome' && c.progress === null ? null : c));
        track('referral_reject', { why: r.error ?? '' });
      }
    });
  }, [uid]);

  // 3) the invitee's game count reached the target → re-read the status (the reward is paid server-side)
  const gp = app.profile?.games_played;
  useEffect(() => {
    if (!uid || gp == null || info?.invited_by?.status !== 'pending') return;
    if (gp >= info.invited_by.target) setTimeout(() => void loadReferral(uid, true), 1200);
  }, [gp]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4) celebrate new rewards (once per account and device)
  useEffect(() => {
    if (!uid || !info) return;
    const key = 'b125.ref.seen.' + uid;
    let seen: { inv: string | null; n: number | null } = { inv: null, n: null };
    try { seen = { ...seen, ...JSON.parse(localStorage.getItem(key) ?? '{}') }; } catch { /* */ }
    const bm = info.reward?.bm ?? REFERRAL.bm;
    let reward = false;
    if (info.invited_by?.status === 'rewarded' && seen.inv !== 'rewarded') {
      setCard({ kind: 'reward', title: s.reward.title, body: s.reward.body(bm) });
      reward = true;
    } else if (seen.n !== null && (info.rewarded ?? 0) > seen.n) {
      const f = info.friends?.find(x => x.status === 'rewarded');
      setCard({ kind: 'reward', title: s.reward.title, body: s.reward.friend(f?.name ?? '', bm) });
      reward = true;
    }
    try { localStorage.setItem(key, JSON.stringify({ inv: info.invited_by?.status ?? null, n: info.rewarded ?? 0 })); } catch { /* */ }
    if (reward) {
      sfx.coin();
      track('referral_reward_seen');
      // BM + the frame were paid server-side: pull them into the app
      void getSupabase().then(sb => sb?.from('profiles').select('bm, owned').eq('id', uid).maybeSingle().then(({ data }) => {
        if (!data) return;
        app.patchProfile({ bm: data.bm, owned: data.owned });
        pushProfile({ bm: data.bm, owned: data.owned });
      }));
    }
  }, [info]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => setCard(null);
  return (
    <AnimatePresence>
      {card && (
        <motion.div key={card.kind} className={`refpop ${card.kind}`} role="dialog" aria-live="polite"
          initial={{ y: 80, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 80, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.4 }}>
          <span className="sheen" aria-hidden />
          <span className="ref-pv" aria-hidden>
            <AvatarFrame id={REFERRAL.item} size={44}><span className="seal">{card.kind === 'reward' ? '✦' : '♥'}</span></AvatarFrame>
          </span>
          <div className="tx">
            {card.kind === 'welcome' ? (
              <>
                <small>{s.welcome.kicker}</small>
                <b className="serif">{s.welcome.title(card.name)}</b>
                <span>{s.welcome.body(card.bm, card.games)}</span>
                {card.progress !== null && (
                  <span className="pg"><i style={{ width: `${(card.progress / card.games) * 100}%` }} /><em>{s.welcome.progress(card.progress, card.games)}</em></span>
                )}
              </>
            ) : (
              <>
                <small>✦</small>
                <b className="serif">{card.title}</b>
                <span>{card.body}</span>
              </>
            )}
            <div className="acts">
              {card.kind === 'welcome' && !uid
                ? <><button className="btn acc sm" onClick={() => { sfx.tap(); close(); onAuth(); }}>{s.welcome.signIn}</button><button className="btn ghost sm" onClick={close}>{s.welcome.later}</button></>
                : <button className="btn acc sm" onClick={() => { sfx.tap(); close(); }}>{s.welcome.ok}</button>}
            </div>
          </div>
          <button className="x" aria-label="×" onClick={close}>×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
