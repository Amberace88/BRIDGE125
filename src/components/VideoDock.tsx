import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useStrings } from '../i18n/pick';
import { MEDIA } from '../i18n/media';
import type { MeshApi } from '../media/useMesh';
import type { PeerSnap } from '../media/mesh';
import { mediaSupported } from '../media/mesh';
import { watchLevel } from '../media/levels';
import { FaceAvatar } from '../media/UserAvatar';
import { IcoCam, IcoHide, IcoMic, IcoMicOffMini, IcoSpeaker } from '../media/icons';
import '../styles/media.css';

// ------------------------------------------------------------------ remote audio autoplay (iOS / strict autoplay)
const remoteEls = new Set<HTMLVideoElement>();
let blocked = false;
const bsubs = new Set<() => void>();
const setBlocked = (b: boolean) => { if (b !== blocked) { blocked = b; for (const f of bsubs) f(); } };
const useAudioBlocked = () => useSyncExternalStore(f => { bsubs.add(f); return () => { bsubs.delete(f); }; }, () => blocked);

function playRemote(v: HTMLVideoElement) {
  v.muted = false;
  v.play().catch(e => {
    if ((e as DOMException)?.name !== 'NotAllowedError') return;
    v.muted = true;                       // keep the picture moving; sound waits for a tap
    v.play().catch(() => {});
    setBlocked(true);
  });
}
function unblockAudio() {
  for (const v of remoteEls) { v.muted = false; v.play().catch(() => {}); }
  setBlocked(false);
}

// ------------------------------------------------------------------ tile
export interface TileProps {
  me?: boolean; stream: MediaStream | null; name: string; av?: string;
  cam: boolean; mic: boolean; showVideo: boolean; connecting?: boolean; className?: string;
}

export function Tile({ me = false, stream, name, av, cam, mic, showVideo, connecting, className = '' }: TileProps) {
  const vref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const s = useStrings(MEDIA);

  useEffect(() => {
    const v = vref.current; if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    if (!stream) return;
    if (me) { v.muted = true; v.play().catch(() => {}); return; }
    remoteEls.add(v); playRemote(v);
    return () => { remoteEls.delete(v); };
  }, [stream, me]);

  useEffect(() => watchLevel(mic ? stream : null, wrap.current), [stream, mic]);

  return (
    <div ref={wrap} className={`vtile ${me ? 'me' : ''} ${showVideo ? 'vid' : ''} ${className}`} data-seat-name={name}>
      <video ref={vref} playsInline autoPlay muted={me} disablePictureInPicture aria-hidden={!showVideo} className={showVideo ? '' : 'hidden'} />
      {!showVideo && <div className="vface"><FaceAvatar url={av} name={name} size={40} /></div>}
      <div className="vshade" />
      <div className="vname"><span>{me ? s.you : name}</span></div>
      {!mic && (cam || me) && <span className="vmute" title={s.micOff}><IcoMicOffMini /></span>}
      {connecting && <span className="vconn" aria-label={s.connecting}><i /></span>}
      <span className="vring" aria-hidden />
    </div>
  );
}

// ------------------------------------------------------------------ frameless control glyph
function Glyph({ on, label, onClick, children, busy, warn }: { on?: boolean; label: string; onClick: () => void; children: ReactNode; busy?: boolean; warn?: boolean }) {
  return (
    <motion.button type="button" className={`vglyph ${on ? 'on' : ''} ${busy ? 'busy' : ''} ${warn ? 'warn' : ''}`} aria-label={label} title={label} aria-pressed={on}
      whileTap={{ scale: 0.84 }} onClick={onClick}>
      {children}
    </motion.button>
  );
}

const peerTile = (p: PeerSnap, nameOf: (seat: number) => string) => (
  <Tile key={'p' + p.seat} stream={p.stream} name={nameOf(p.seat)} av={p.av} cam={p.cam} mic={p.mic}
    showVideo={p.cam && p.hasVideo} connecting={(p.cam || p.mic) && p.state !== 'connected'} />
);

function useErrorToast(err: string | null) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!err) return;
    setMsg(err);
    const id = setTimeout(() => setMsg(null), 4200);
    return () => clearTimeout(id);
  }, [err]);
  return msg;
}

// ------------------------------------------------------------------ the floating dock (table)
const POS_KEY = 'b125.dock';
const readPos = (k: string) => { try { const j = JSON.parse(localStorage.getItem(POS_KEY) ?? '{}')[k]; return j && Number.isFinite(j.x) ? j as { x: number; y: number } : { x: 0, y: 0 }; } catch { return { x: 0, y: 0 }; } };
const writePos = (k: string, p: { x: number; y: number }) => { try { const all = JSON.parse(localStorage.getItem(POS_KEY) ?? '{}'); all[k] = p; localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch { /* */ } };

function useWide() {
  const q = '(min-width: 900px) and (min-height: 560px)';
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return wide;
}

export function VideoDock({ api, nameOf, myAvatar }: { api: MeshApi; nameOf: (seat: number) => string; myAvatar: string }) {
  const s = useStrings(MEDIA);
  const reduce = useReducedMotion();
  const { snap } = api;
  const wide = useWide();
  const layout = wide ? 'd' : 'm';
  const [min, setMin] = useState(() => { try { return localStorage.getItem('b125.dock.min') === '1'; } catch { return false; } });
  const audioBlocked = useAudioBlocked();
  const toast = useErrorToast(snap.error ? s.err[snap.error] : null);

  const bounds = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const dragging = useRef(false);

  // restore the remembered spot for this layout, then keep it on-screen
  const clamp = useCallback(() => {
    const el = dock.current; if (!el) return;
    const r = el.getBoundingClientRect(), pad = 6;
    const vw = window.innerWidth, vh = window.innerHeight;
    let dx = 0, dy = 0;
    if (r.right > vw - pad) dx = vw - pad - r.right;
    if (r.left + dx < pad) dx = pad - r.left;
    if (r.bottom > vh - pad) dy = vh - pad - r.bottom;
    if (r.top + dy < pad) dy = pad - r.top;
    if (dx || dy) { x.set(x.get() + dx); y.set(y.get() + dy); }
  }, [x, y]);
  useLayoutEffect(() => { const p = readPos(layout); x.set(p.x); y.set(p.y); clamp(); }, [layout, x, y, clamp]);
  useEffect(() => { window.addEventListener('resize', clamp); return () => window.removeEventListener('resize', clamp); }, [clamp]);

  const guard = (fn: () => void) => () => { if (!dragging.current) fn(); };
  const toggleMin = () => { const n = !min; setMin(n); try { localStorage.setItem('b125.dock.min', n ? '1' : '0'); } catch { /* */ } requestAnimationFrame(clamp); };

  if (!mediaSupported()) return null;

  const livePeers = snap.peers.filter(p => p.cam || p.mic);
  const meOn = snap.cam || snap.mic;
  const tiles = [
    ...(meOn ? [<Tile key="me" me stream={snap.local} name={s.you} av={myAvatar} cam={snap.cam} mic={snap.mic} showVideo={snap.cam} />] : []),
    ...livePeers.map(p => peerTile(p, nameOf)),
  ];
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 30 };

  return (
    <>
      <div ref={bounds} className="vd-bounds" aria-hidden />
      <motion.div ref={dock} className={`vdock ${wide ? 'wide' : ''} ${min ? 'min' : ''}`} style={{ x, y }}
        drag dragConstraints={bounds} dragMomentum={false} dragElastic={0.06}
        onDragStart={() => { dragging.current = true; }}
        onDragEnd={() => { writePos(layout, { x: x.get(), y: y.get() }); setTimeout(() => { dragging.current = false; }, 60); }}
        initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
        role="region" aria-label="Video">
        <AnimatePresence initial={false}>
          {!min && tiles.length > 0 && (
            <motion.div className="vtiles" key="tiles" initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
              <AnimatePresence initial={false}>
                {tiles.map(t => (
                  <motion.div key={t.key} layout={!reduce} className="vtwrap" initial={reduce ? false : { opacity: 0, scale: 0.6, rotateX: -25 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={spring}>
                    {t}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="vctl">
          {min && livePeers.length + (meOn ? 1 : 0) > 0 && (
            <span className="vlive" aria-label={s.live(livePeers.length)}>
              {livePeers.slice(0, 3).map(p => <FaceAvatar key={p.seat} url={p.av} name={nameOf(p.seat)} size={20} />)}
              {meOn && <i className="vdot" />}
            </span>
          )}
          <Glyph on={snap.cam} busy={snap.busy.cam} label={snap.cam ? s.camOff : s.camOn} onClick={guard(() => api.setCam(!snap.cam))}><IcoCam off={!snap.cam} /></Glyph>
          <Glyph on={snap.mic} busy={snap.busy.mic} label={snap.mic ? s.micOff : s.micOn} onClick={guard(() => api.setMic(!snap.mic))}><IcoMic off={!snap.mic} /></Glyph>
          {audioBlocked && <Glyph warn label={s.tapToHear} onClick={guard(unblockAudio)}><IcoSpeaker /></Glyph>}
          {(tiles.length > 0 || min) && <Glyph label={min ? s.show : s.hide} onClick={guard(toggleMin)}><IcoHide open={min} /></Glyph>}
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div className="vtoast" role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{toast}</motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ------------------------------------------------------------------ lobby: "join with camera & mic" + live faces
export function LobbyMedia({ api, myAvatar, myName }: { api: MeshApi; myAvatar: string; myName: string }) {
  const s = useStrings(MEDIA);
  const { snap } = api;
  const audioBlocked = useAudioBlocked();
  const toast = useErrorToast(snap.error ? s.err[snap.error] : null);
  if (!mediaSupported()) return null;
  const meOn = snap.cam || snap.mic;
  return (
    <div className="lmedia">
      <div className="lmrow">
        <div className="lmself">
          {meOn
            ? <Tile me stream={snap.local} name={myName} av={myAvatar} cam={snap.cam} mic={snap.mic} showVideo={snap.cam} className="round" />
            : <div className="vtile round"><div className="vface"><FaceAvatar url={myAvatar} name={myName} size={40} /></div></div>}
        </div>
        <div className="lmtext">
          <b>{s.joinWith}</b>
          <span>{toast ?? s.joinSub}</span>
        </div>
        <div className="lmctl">
          <Glyph on={snap.cam} busy={snap.busy.cam} label={snap.cam ? s.camOff : s.camOn} onClick={() => api.setCam(!snap.cam)}><IcoCam off={!snap.cam} /></Glyph>
          <Glyph on={snap.mic} busy={snap.busy.mic} label={snap.mic ? s.micOff : s.micOn} onClick={() => api.setMic(!snap.mic)}><IcoMic off={!snap.mic} /></Glyph>
          {audioBlocked && <Glyph warn label={s.tapToHear} onClick={unblockAudio}><IcoSpeaker /></Glyph>}
        </div>
      </div>
    </div>
  );
}

/** Lobby seat-row face: a live round video/voice tile when that player shares media, otherwise null. */
export function SeatLive({ api, seat, name }: { api: MeshApi; seat: number; name: string }) {
  const p = api.snap.peers.find(x => x.seat === seat);
  if (!p || !(p.cam || p.mic)) return null;
  return <Tile stream={p.stream} name={name} av={p.av} cam={p.cam} mic={p.mic} showVideo={p.cam && p.hasVideo}
    connecting={p.state !== 'connected'} className="round seatlive" />;
}
