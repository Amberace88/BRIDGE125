import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { MediaMsg, RoomInfo } from '../online/useRoom';
import { Mesh, type MeshSnap } from './mesh';
import { primeLevels } from './levels';

const EMPTY: MeshSnap = { self: -1, cam: false, mic: false, local: null, busy: { cam: false, mic: false }, error: null, peers: [] };
const PREF = 'b125.media';

interface RoomLike { room: RoomInfo | null; you: number; send: (m: object) => void; onMedia: (fn: (m: MediaMsg) => void) => () => void; status: string }

/** "Join with camera / mic" — remembered per device, but re-applied only when the browser already has permission. */
export function loadMediaPref(): { cam: boolean; mic: boolean } {
  try { const j = JSON.parse(localStorage.getItem(PREF) ?? '{}'); return { cam: !!j.cam, mic: !!j.mic }; } catch { return { cam: false, mic: false }; }
}
function saveMediaPref(p: { cam: boolean; mic: boolean }) { try { localStorage.setItem(PREF, JSON.stringify(p)); } catch { /* */ } }

async function granted(name: 'camera' | 'microphone'): Promise<boolean> {
  try { return (await navigator.permissions.query({ name: name as PermissionName })).state === 'granted'; } catch { return false; }
}

/** One mesh per room screen. Lives across lobby → table → rematch, torn down when the room screen unmounts. */
export function useMesh(r: RoomLike, avatarUrl: string) {
  const [mesh, setMesh] = useState<Mesh | null>(null);
  useEffect(() => { const m = new Mesh(); setMesh(m); return () => m.destroy(); }, []);

  const snap = useSyncExternalStore(
    useCallback(fn => mesh?.subscribe(fn) ?? (() => {}), [mesh]),
    () => mesh?.getSnapshot() ?? EMPTY,
  );

  // signalling in/out
  useEffect(() => {
    if (!mesh) return;
    mesh.setSend(r.send);
    const off = r.onMedia(m => mesh.onMessage(m));
    if (r.status === 'open') mesh.hello();
    return off;
  }, [mesh, r.send, r.onMedia]); // eslint-disable-line react-hooks/exhaustive-deps

  // roster: online humans only (bots never get a connection)
  const humans = useMemo(() => (r.room?.seats ?? []).map((s, i) => (!s.bot && s.online ? i : -1)).filter(i => i >= 0).join(','), [r.room?.seats]);
  const seatSig = useMemo(() => (r.room?.seats ?? []).map(s => (s.bot ? '*' : s.name)).join('|'), [r.room?.seats]);
  useEffect(() => { mesh?.setRoster(r.you, humans ? humans.split(',').map(Number) : []); }, [mesh, r.you, humans]);
  // seats can shift in the lobby when someone leaves → re-announce so everybody re-maps seat ⇄ session
  useEffect(() => { mesh?.hello(); }, [mesh, seatSig]);
  useEffect(() => { mesh?.setAvatar(avatarUrl); }, [mesh, avatarUrl]);

  // remembered "join with camera / mic": only when permission is already granted (never a surprise prompt)
  useEffect(() => {
    if (!mesh || r.you < 0) return;
    const pref = loadMediaPref();
    if (!pref.cam && !pref.mic) return;
    let dead = false;
    (async () => {
      if (pref.mic && await granted('microphone') && !dead) await mesh.setMic(true);
      if (pref.cam && await granted('camera') && !dead) await mesh.setCam(true);
    })();
    return () => { dead = true; };
  }, [mesh, r.you >= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCam = useCallback(async (on: boolean) => {
    if (!mesh) return; primeLevels();
    await mesh.setCam(on);
    const s = mesh.getSnapshot(); saveMediaPref({ cam: s.cam, mic: s.mic });
  }, [mesh]);
  const setMic = useCallback(async (on: boolean) => {
    if (!mesh) return; primeLevels();
    await mesh.setMic(on);
    const s = mesh.getSnapshot(); saveMediaPref({ cam: s.cam, mic: s.mic });
  }, [mesh]);
  const stop = useCallback(() => mesh?.stopAll(), [mesh]);

  return { snap, setCam, setMic, stop };
}

export type MeshApi = ReturnType<typeof useMesh>;
