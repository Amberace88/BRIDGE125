import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { pick } from '../i18n/pick';
import { isOnline, onNetChange, useOnline } from './net';
import { onNeedsNet } from './nudge';
import { OFFLINE } from './strings';
import { onPending, pendingCount, startOfflineSync } from './sync';
import { registerProfileSink } from './sink';
import { applyUpdate, dismissUpdate, useUpdateReady } from './sw';
import './offline.css';

/**
 * App-wide offline UI, mounted once by App: the frameless status pill (offline · back online · syncing n), the
 * "New version — tap to update" toast, and the wiring of the result queue (src/offline/sync.ts) to the app store.
 */
export function OfflineLayer() {
  const app = useApp();
  const s = pick(OFFLINE, app.lang);
  const online = useOnline();
  const pending = useSyncExternalStore(onPending, pendingCount, () => 0);
  const update = useUpdateReady();

  useEffect(() => { startOfflineSync(); }, []);
  const patchProfile = app.patchProfile;
  useEffect(() => { registerProfileSink(p => patchProfile(p)); return () => registerProfileSink(null); }, [patchProfile]);

  // "Back online" after the connection returns: stays while queued results go out, then a moment longer
  const [back, setBack] = useState(false);
  // offline the pill speaks up for a few seconds (going offline, starting offline, an online-only tap), then only the
  // hairline along the top edge stays — nothing sits on top of the game's own header
  const [loud, setLoud] = useState(() => !isOnline());
  useEffect(() => onNetChange(() => { setBack(isOnline()); setLoud(!isOnline()); }), []);
  useEffect(() => { if (!loud) return; const t = setTimeout(() => setLoud(false), 4500); return () => clearTimeout(t); }, [loud]);
  const syncing = online && pending > 0 && !!app.session;
  useEffect(() => {
    if (!back || syncing) return;
    const t = setTimeout(() => setBack(false), 2400);
    return () => clearTimeout(t);
  }, [back, syncing]);
  // the queue keeps working in the background; the pill doesn't need to say so for long (Bridge games go 30 s apart)
  useEffect(() => { if (!back) return; const t = setTimeout(() => setBack(false), 20_000); return () => clearTimeout(t); }, [back]);
  // an online-only action tapped while offline: the pill says why nothing happens
  const [nudged, setNudged] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = onNeedsNet(() => { setNudged(true); clearTimeout(t); t = setTimeout(() => setNudged(false), 2200); });
    return () => { off(); clearTimeout(t); };
  }, []);

  const mode: 'offline' | 'back' | 'sync' | null = !online ? (loud || nudged ? 'offline' : null) : back && syncing ? 'sync' : back ? 'back' : null;
  const text = mode === 'offline' ? (nudged ? s.needsNet : s.offline) : mode === 'sync' ? s.syncing(pending) : mode === 'back' ? s.back : '';

  return (
    <>
      <AnimatePresence>
        {!online && <motion.div key="netline" className="netline" aria-hidden initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />}
      </AnimatePresence>
      <AnimatePresence>
        {mode && (
          <motion.div key="netpill" className={`netpill is-${mode}${nudged && mode === 'offline' ? ' is-nudge' : ''}`} role="status" aria-live="polite"
            initial={{ opacity: 0, y: -14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            <i className="netdot" aria-hidden />
            <motion.span key={text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>{text}</motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {update && (
          <motion.div key="swupd" className="swupdate" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <button className="swupdate-go" onClick={applyUpdate}>
              <span className="swupdate-ic" aria-hidden>↻</span><span>{s.update}</span>
            </button>
            <button className="swupdate-x" aria-label={s.later} title={s.later} onClick={dismissUpdate}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
