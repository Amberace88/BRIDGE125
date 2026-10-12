// WebRTC full mesh for up to 4 players at an online table.
//
// Signalling rides on the room WebSocket:
//   out  { t: 'rtc', to: seat, data }            → server relays to that seat only as { t: 'rtc', from, data }
//   out  { t: 'media', cam, mic, sid, av }       → server tells the others { t: 'media', seat, ... } and replies
//                                                  to us with { t: 'mediaAll', states: [...] }
// `data` = { sid, g, to?, d?: RTCSessionDescriptionInit, c?: RTCIceCandidateInit }
//   sid  random id of the sender's page session (a reload = new sid → the peer connection is rebuilt)
//   g    id of the sender's RTCPeerConnection; an offer from a new `g` means "start over" (watchdog re-dial)
//   to   the receiver's sid when known, so messages meant for a previous session of that seat are dropped
//
// Signalling messages sent while the socket is reconnecting are lost, so a watchdog re-dials any connection that
// has not come up within WATCHDOG_MS. Exactly one side re-dials: the impolite one, unless it has nothing to send.
//
// Negotiation uses the "perfect negotiation" pattern: the higher seat index is polite (rolls back on glare).
// A peer connection only exists once one side actually shares media, so a table where nobody opts in costs nothing.

import { getIceServers, STUN } from './ice';

export interface RemoteMedia { cam: boolean; mic: boolean; sid: string; av: string }
export type MediaError = 'denied' | 'nodevice' | 'unsupported' | 'busy' | 'generic';

export interface PeerSnap {
  seat: number;
  stream: MediaStream | null;
  state: RTCPeerConnectionState | 'new';
  cam: boolean;            // what the peer says it shares
  mic: boolean;
  av: string;              // peer's avatar photo url (validated)
  hasVideo: boolean;       // a live remote video track has arrived
}

export interface MeshSnap {
  self: number;
  cam: boolean;
  mic: boolean;
  local: MediaStream | null;
  busy: { cam: boolean; mic: boolean };
  error: MediaError | null;
  peers: PeerSnap[];
}

interface Peer {
  seat: number;
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  remoteSid: string;
  stream: MediaStream | null;
  senders: { audio?: RTCRtpSender; video?: RTCRtpSender };
  queue: Promise<void>;
  restarts: number;
  gen: string;             // our pc id
  remoteGen: string;       // their pc id
  since: number;           // last time this connection was (re)started or dropped out of 'connected'
}

interface SignalData { sid?: string; g?: string; to?: string; d?: RTCSessionDescriptionInit; c?: RTCIceCandidateInit | null }
const WATCHDOG_MS = 12_000;

const VIDEO: MediaTrackConstraints = { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 24 } };
const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const VIDEO_KBPS = 280;

const AV_OK = /^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/avatars\/[0-9a-f-]{36}\/[\w.-]{1,80}$/i;
export const safeAvatar = (u: string | null | undefined) => (u && AV_OK.test(u) ? u : '');

const rid = () => {
  try { return crypto.randomUUID().replace(/-/g, '').slice(0, 16); } catch { return Math.random().toString(36).slice(2, 14); }
};

export const mediaSupported = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== 'undefined';

export class Mesh {
  readonly sid = rid();
  private send: (m: object) => void = () => {};
  private self = -1;
  private eligible = new Set<number>();
  private peers = new Map<number, Peer>();
  private remote = new Map<number, RemoteMedia>();
  private local: MediaStream | null = null;
  private audio: MediaStreamTrack | null = null;
  private video: MediaStreamTrack | null = null;
  private ice: RTCIceServer[] = STUN;
  private av = '';
  private busy = { cam: false, mic: false };
  private error: MediaError | null = null;
  private dead = false;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private snap: MeshSnap = { self: -1, cam: false, mic: false, local: null, busy: { cam: false, mic: false }, error: null, peers: [] };

  constructor() {
    getIceServers().then(list => { this.ice = list; });
  }

  // ------------------------------------------------------------------ store plumbing (useSyncExternalStore)
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;
  private emit() {
    if (this.dead) return;
    const peers: PeerSnap[] = [];
    const seats = new Set<number>([...this.remote.keys(), ...this.peers.keys()]);
    for (const seat of [...seats].sort((a, b) => a - b)) {
      if (seat === this.self || !this.eligible.has(seat)) continue;
      const r = this.remote.get(seat), p = this.peers.get(seat);
      const v = p?.stream?.getVideoTracks()[0];
      peers.push({
        seat, stream: p?.stream ?? null, state: p?.pc.connectionState ?? 'new',
        cam: !!r?.cam, mic: !!r?.mic, av: safeAvatar(r?.av),
        hasVideo: !!v && v.readyState === 'live' && !v.muted,
      });
    }
    this.snap = { self: this.self, cam: !!this.video, mic: !!this.audio, local: this.local, busy: { ...this.busy }, error: this.error, peers };
    for (const fn of this.listeners) fn();
  }

  // ------------------------------------------------------------------ wiring
  setSend(fn: (m: object) => void) { this.send = fn; }
  setAvatar(url: string) { const u = safeAvatar(url); if (u !== this.av) { this.av = u; this.hello(); } }

  /** Announce our media state; the server answers with everybody else's. Called on every socket (re)open. */
  hello() {
    if (this.dead || this.self < 0) return;
    this.send({ t: 'media', cam: !!this.video, mic: !!this.audio, sid: this.sid, av: this.av });
  }

  /** Who we are and which seats are online humans (everyone else is ignored). */
  setRoster(self: number, humans: number[]) {
    if (this.dead) return;
    const selfChanged = self !== this.self;
    if (selfChanged) { for (const s of [...this.peers.keys()]) this.closePeer(s); this.self = self; }
    this.eligible = new Set(humans.filter(s => s !== self && s >= 0));
    for (const s of [...this.peers.keys()]) if (!this.eligible.has(s)) this.closePeer(s);
    for (const s of [...this.remote.keys()]) if (!this.eligible.has(s)) this.remote.delete(s);
    if (selfChanged) this.hello();
    this.ensurePeers();
    this.emit();
  }

  onMessage(m: { t: string; [k: string]: unknown }) {
    if (this.dead) return;
    switch (m.t) {
      case 'open': this.hello(); return;
      case 'media': this.applyRemote(m.seat as number, m as unknown as RemoteMedia); this.emit(); return;
      case 'mediaAll': {
        const list = (m.states as (RemoteMedia & { seat: number })[]) ?? [];
        const seen = new Set<number>();
        for (const x of list) { seen.add(x.seat); this.applyRemote(x.seat, x); }
        for (const s of [...this.remote.keys()]) if (!seen.has(s)) this.remote.delete(s);
        this.emit();
        return;
      }
      case 'rtc': this.onSignal(m.from as number, (m.data ?? {}) as SignalData); return;
    }
  }

  private applyRemote(seat: number, x: RemoteMedia) {
    if (!Number.isInteger(seat) || seat === this.self) return;
    const prev = this.remote.get(seat);
    const next: RemoteMedia = { cam: !!x.cam, mic: !!x.mic, sid: String(x.sid ?? ''), av: String(x.av ?? '') };
    this.remote.set(seat, next);
    const p = this.peers.get(seat);
    // the player behind this seat reloaded (or seats shifted in the lobby): rebuild from scratch
    if (p && ((prev && prev.sid && prev.sid !== next.sid) || (p.remoteSid && p.remoteSid !== next.sid))) {
      this.closePeer(seat);
      this.ensurePeers();
    }
  }

  // ------------------------------------------------------------------ local media
  async setCam(on: boolean) { return this.toggle('video', on); }
  async setMic(on: boolean) { return this.toggle('audio', on); }

  private async toggle(kind: 'audio' | 'video', on: boolean) {
    const bk = kind === 'audio' ? 'mic' : 'cam';
    if (this.dead || this.busy[bk]) return;
    const cur = kind === 'audio' ? this.audio : this.video;
    if (on === !!cur) return;
    this.error = null;
    if (on) {
      if (!mediaSupported()) { this.error = 'unsupported'; this.emit(); return; }
      this.busy[bk] = true; this.emit();
      try {
        const s = await navigator.mediaDevices.getUserMedia(kind === 'audio' ? { audio: AUDIO } : { video: VIDEO });
        const track = s.getTracks()[0];
        if (this.dead) { track.stop(); return; }
        track.onended = () => { if ((kind === 'audio' ? this.audio : this.video) === track) void this.toggle(kind, false); };
        if (kind === 'audio') this.audio = track; else this.video = track;
      } catch (e) {
        const n = (e as DOMException)?.name;
        this.error = n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'nodevice' : n === 'NotReadableError' ? 'busy' : 'generic';
      } finally { this.busy[bk] = false; }
    } else {
      cur!.onended = null; cur!.stop();
      if (kind === 'audio') this.audio = null; else this.video = null;
    }
    const tracks = [this.audio, this.video].filter(Boolean) as MediaStreamTrack[];
    this.local = tracks.length ? new MediaStream(tracks) : null;
    const now = kind === 'audio' ? this.audio : this.video;
    for (const p of this.peers.values()) this.attach(p, kind, now);
    this.hello();
    this.ensurePeers();
    this.emit();
  }

  private attach(p: Peer, kind: 'audio' | 'video', track: MediaStreamTrack | null) {
    const sender = p.senders[kind];
    if (sender) { sender.replaceTrack(track).catch(() => {}); return; }
    if (!track) return;
    try {
      p.senders[kind] = p.pc.addTrack(track, this.local ?? new MediaStream([track]));
      if (kind === 'video') this.capBitrate(p.senders.video!);
    } catch { /* closed */ }
  }

  private capBitrate(sender: RTCRtpSender) {
    // wait until the sender has parameters (after negotiation) — then keep a small mesh-friendly budget
    setTimeout(() => {
      try {
        const prm = sender.getParameters();
        if (!prm.encodings?.length) prm.encodings = [{}];
        prm.encodings[0].maxBitrate = VIDEO_KBPS * 1000;
        sender.setParameters(prm).catch(() => {});
      } catch { /* */ }
    }, 1500);
  }

  // ------------------------------------------------------------------ peers
  /** We only dial out when we have something to share; peers who share dial us. */
  private ensurePeers() {
    if (this.self < 0 || !this.local) return;
    for (const seat of this.eligible) if (!this.peers.has(seat)) this.createPeer(seat);
  }

  private createPeer(seat: number): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.ice, bundlePolicy: 'max-bundle' });
    const p: Peer = {
      seat, pc, polite: this.self > seat, makingOffer: false, ignoreOffer: false, remoteSid: this.remote.get(seat)?.sid ?? '',
      stream: null, senders: {}, queue: Promise.resolve(), restarts: 0, gen: rid(), remoteGen: '', since: Date.now(),
    };
    this.peers.set(seat, p);
    this.watchdog ??= setInterval(() => this.checkPeers(), 3000);

    pc.onnegotiationneeded = async () => {
      try {
        p.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) this.signal(p, { d: pc.localDescription.toJSON() });
      } catch { /* superseded */ } finally { p.makingOffer = false; }
    };
    pc.onicecandidate = e => { if (e.candidate) this.signal(p, { c: e.candidate.toJSON() }); };
    pc.ontrack = e => {
      const t = e.track;
      const keep = (p.stream?.getTracks() ?? []).filter(x => x.kind !== t.kind && x.readyState === 'live');
      p.stream = new MediaStream([...keep, t]);   // fresh identity → <video> re-binds reliably (Safari)
      const upd = () => { if (this.peers.get(seat) === p) this.emit(); };
      t.onmute = upd; t.onunmute = upd; t.onended = upd;
      upd();
    };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(seat) !== p) return;
      const st = pc.connectionState;
      if (st === 'failed' && p.restarts < 3) { p.restarts++; try { pc.restartIce(); } catch { /* */ } }
      if (st === 'connected') { p.restarts = 0; p.since = Infinity; }
      else if (p.since === Infinity) p.since = Date.now();        // dropped out of 'connected' → start the clock
      this.emit();
    };

    if (this.audio) this.attach(p, 'audio', this.audio);
    if (this.video) this.attach(p, 'video', this.video);
    return p;
  }

  /** Re-dial connections that never came up (lost signalling, dead ICE). Deterministic: one side only. */
  private checkPeers() {
    const now = Date.now();
    for (const p of [...this.peers.values()]) {
      if (p.pc.connectionState === 'connected') { p.since = Infinity; continue; }
      if (p.since === Infinity) p.since = now;                  // just dropped out of 'connected'
      if (now - p.since < WATCHDOG_MS || !this.local) continue;
      const r = this.remote.get(p.seat);
      if (p.polite && (r?.cam || r?.mic)) continue;              // the impolite side will re-dial us
      this.closePeer(p.seat);
      this.createPeer(p.seat);                                   // fresh gen → the peer starts over too
      this.emit();
    }
    if (!this.peers.size && this.watchdog) { clearInterval(this.watchdog); this.watchdog = null; }
  }

  private closePeer(seat: number) {
    const p = this.peers.get(seat);
    if (!p) return;
    this.peers.delete(seat);
    p.pc.onnegotiationneeded = p.pc.onicecandidate = p.pc.ontrack = p.pc.onconnectionstatechange = null;
    try { p.pc.close(); } catch { /* */ }
  }

  private signal(p: Peer, payload: SignalData) {
    this.send({ t: 'rtc', to: p.seat, data: { sid: this.sid, g: p.gen, ...(p.remoteSid ? { to: p.remoteSid } : {}), ...payload } });
  }

  private onSignal(from: number, data: SignalData) {
    if (!Number.isInteger(from) || from === this.self || from < 0 || this.self < 0) return;
    if (data.to && data.to !== this.sid) return;                 // meant for a previous session of ours
    const sid = typeof data.sid === 'string' ? data.sid : '';
    let p = this.peers.get(from);
    const g = typeof data.g === 'string' ? data.g : '';
    if (p && ((p.remoteSid && sid && p.remoteSid !== sid) || (p.remoteGen && g && p.remoteGen !== g))) {
      if (data.d?.type !== 'offer') return;                       // stale tail of an old session / connection
      this.closePeer(from); p = undefined;                        // they started over → so do we
    }
    if (!p) {
      if (data.d?.type !== 'offer') return;                       // only an offer may open a connection
      if (!this.eligible.has(from)) this.eligible.add(from);      // roster may lag a moment behind signalling
      p = this.createPeer(from);
    }
    if (sid) p.remoteSid = sid;
    if (g) p.remoteGen = g;
    const peer = p;
    peer.queue = peer.queue.then(() => this.process(peer, data)).catch(() => {});
  }

  private async process(p: Peer, data: SignalData) {
    const pc = p.pc;
    if (this.peers.get(p.seat) !== p) return;
    if (data.d) {
      const d = data.d;
      const collision = d.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
      p.ignoreOffer = !p.polite && collision;
      if (p.ignoreOffer) return;
      await pc.setRemoteDescription(d);                           // polite side rolls back implicitly
      if (d.type === 'offer') {
        await pc.setLocalDescription();
        if (pc.localDescription) this.signal(p, { d: pc.localDescription.toJSON() });
      }
    } else if (data.c) {
      try { await pc.addIceCandidate(data.c); } catch (e) { if (!p.ignoreOffer) throw e; }
    }
  }

  // ------------------------------------------------------------------ teardown
  /** Stop camera + mic and drop every connection. */
  stopAll() {
    for (const s of [...this.peers.keys()]) this.closePeer(s);
    for (const t of [this.audio, this.video]) if (t) { t.onended = null; t.stop(); }
    this.audio = this.video = null; this.local = null;
    this.hello();
    this.emit();
  }

  destroy() {
    if (this.dead) return;
    this.stopAll();
    if (this.watchdog) { clearInterval(this.watchdog); this.watchdog = null; }
    this.dead = true;
    this.listeners.clear();
  }
}
