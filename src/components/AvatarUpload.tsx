import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { MEDIA } from '../i18n/media';
import { AvatarError, loadImage, removeAvatar, renderAvatar, uploadAvatar, useAvatarUrl } from '../media/avatar';
import { IcoCamera } from '../media/icons';
import { sfx } from '../sound';
import '../styles/media.css';

/**
 * The "Photo" option at the head of the avatar grid: pick (camera or library) → frame in a circle → upload.
 * Selected state uses the same `avsel` layoutId as the emoji grid so the highlight glides between them.
 */
export function AvatarPhotoOption({ onToast }: { onToast: (m: string) => void }) {
  const app = useApp();
  const s = useStrings(MEDIA);
  const url = useAvatarUrl();
  const input = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<{ img: HTMLImageElement; revoke: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = () => {
    sfx.tap();
    if (!app.session) { onToast(s.photoSignin); return; }
    input.current?.click();
  };
  const onFile = async (f: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!f) return;
    try { setImg(await loadImage(f)); } catch (e) { onToast(s.avErr[e instanceof AvatarError ? e.code : 'generic']); }
  };
  const close = useCallback(() => { setImg(cur => { cur?.revoke(); return null; }); }, []);
  const remove = async () => {
    setBusy(true);
    try { await removeAvatar(); onToast(s.photoRemoved); sfx.tap(); }
    catch (err) { onToast(s.avErr[err instanceof AvatarError ? err.code : 'generic']); }
    finally { setBusy(false); }
  };

  return (
    <div className="avcell">
      <motion.button type="button" whileTap={{ scale: 0.88 }} className={`avopt photo ${url ? 'on' : ''}`} onClick={choose}
        aria-label={url ? s.changePhoto : s.addPhoto} title={url ? s.changePhoto : s.addPhoto}>
        {url && <motion.span layoutId="avsel" className="avsel" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
        {url
          ? <span className="uav photo"><img src={url} alt="" draggable={false} /></span>
          : <span className="avcam"><IcoCamera /></span>}
        {busy && <span className="avbusy"><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /></span>}
      </motion.button>
      {url && !busy && <button type="button" className="avx" aria-label={s.removePhoto} title={s.removePhoto} onClick={remove}>×</button>}
      <input ref={input} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
      {createPortal(
        <AnimatePresence>{img && <Cropper key="crop" src={img.img} onClose={close} onDone={() => { close(); onToast(s.photoSaved); sfx.good(); }} />}</AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

// ------------------------------------------------------------------ cropper
const MAX_ZOOM = 5;

function Cropper({ src, onClose, onDone }: { src: HTMLImageElement; onClose: () => void; onDone: () => void }) {
  const s = useStrings(MEDIA);
  const reduce = useReducedMotion();
  const view = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(300);
  const [z, setZ] = useState(1);                 // zoom (1 = image just covers the circle)
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());

  useLayoutEffect(() => {
    const el = view.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize(el.clientWidth));
    ro.observe(el); setSize(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const d = size * 0.84;                                         // circle diameter
  const nw = src.naturalWidth, nh = src.naturalHeight;
  const k = (d / Math.min(nw, nh)) * z;                          // displayed px per image px
  const clampPos = useCallback((p: { x: number; y: number }, zz = z) => {
    const kk = (d / Math.min(nw, nh)) * zz;
    const mx = Math.max(0, (nw * kk - d) / 2), my = Math.max(0, (nh * kk - d) / 2);
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }, [d, nw, nh, z]);
  const zoomTo = (nz: number) => { const zz = Math.max(1, Math.min(MAX_ZOOM, nz)); setZ(zz); setPos(p => clampPos(p, zz)); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // wheel zoom needs a non-passive listener to stop page scroll
  useEffect(() => {
    const el = view.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setZ(cur => { const zz = Math.max(1, Math.min(MAX_ZOOM, cur * Math.exp(-e.deltaY * 0.0016))); setPos(p => clampPos(p, zz)); return zz; }); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampPos]);

  const down = (e: RPointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const move = (e: RPointerEvent) => {
    const prev = pts.current.get(e.pointerId); if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pts.current.size >= 2) {
      const other = [...pts.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
      pts.current.set(e.pointerId, cur);
      if (!other) return;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y), after = Math.hypot(cur.x - other.x, cur.y - other.y);
      if (before > 4) zoomTo(z * (after / before));
      return;
    }
    pts.current.set(e.pointerId, cur);
    setPos(p => clampPos({ x: p.x + cur.x - prev.x, y: p.y + cur.y - prev.y }));
  };
  const up = (e: RPointerEvent) => { pts.current.delete(e.pointerId); };

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const { blob, ext } = await renderAvatar(src, { k, x: pos.x, y: pos.y, d });
      await uploadAvatar(blob, ext);
      onDone();
    } catch (e) {
      setErr(s.avErr[e instanceof AvatarError ? e.code : 'generic']);
      setBusy(false);
    }
  };

  return (
    <motion.div className="cropwrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()}>
      <motion.div className="crop" role="dialog" aria-modal="true" aria-label={s.cropTitle} onClick={e => e.stopPropagation()}
        initial={reduce ? false : { y: 30, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
        <h3>{s.cropTitle}</h3>
        <div className="hint">{s.cropHint}</div>
        <div ref={view} className="cropview" style={{ ['--r' as string]: `${d / 2}px` }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <img src={src.src} alt="" draggable={false}
            style={{ width: nw * k, height: nh * k, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }} />
          <div className="cropmask" />
          <div className="cropring" />
        </div>
        <label className="zoomrow">
          <span>{s.zoom}</span>
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={z} onChange={e => zoomTo(Number(e.target.value))} />
        </label>
        {err && <div className="autherr avmsg">{err}</div>}
        <div className="cropbtns">
          <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>{s.cancel}</button>
          <button className="btn acc" type="button" onClick={save} disabled={busy}>{busy ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {s.uploading}</> : s.usePhoto}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
