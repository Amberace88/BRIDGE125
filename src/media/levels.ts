// Voice activity for the video tiles. One shared AudioContext + an AnalyserNode per audio track; a single 10 Hz
// timer writes the level straight into a CSS variable (`--lvl`, 0..1) and a `data-speaking` attribute, so React
// never re-renders for it. The timer only runs while at least one meter is attached.

interface Meter { src: MediaStreamAudioSourceNode; an: AnalyserNode; buf: Uint8Array<ArrayBuffer>; els: Set<HTMLElement>; smooth: number; hold: number }

let ctx: AudioContext | null = null;
const meters = new Map<string, Meter>();
let timer: ReturnType<typeof setInterval> | null = null;

function audioCtx(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function tick() {
  for (const m of meters.values()) {
    m.an.getByteTimeDomainData(m.buf);
    let sum = 0;
    for (let i = 0; i < m.buf.length; i++) { const v = (m.buf[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / m.buf.length);
    const lvl = Math.min(1, rms * 6);
    m.smooth = lvl > m.smooth ? lvl : m.smooth * 0.72 + lvl * 0.28;
    m.hold = m.smooth > 0.12 ? 4 : Math.max(0, m.hold - 1);
    for (const el of m.els) {
      el.style.setProperty('--lvl', m.smooth.toFixed(3));
      if (m.hold > 0) el.dataset.speaking = ''; else delete el.dataset.speaking;
    }
  }
}

/** Start metering the first audio track of `stream` onto `el`. Returns a detach function. */
export function watchLevel(stream: MediaStream | null, el: HTMLElement | null): () => void {
  const track = stream?.getAudioTracks()[0];
  if (!track || !el) return () => {};
  const id = track.id;
  let m = meters.get(id);
  if (!m) {
    const c = audioCtx(); if (!c) return () => {};
    try {
      const src = c.createMediaStreamSource(new MediaStream([track]));
      const an = c.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.3;
      src.connect(an);                                  // analyser is a sink; nothing reaches the speakers
      m = { src, an, buf: new Uint8Array(new ArrayBuffer(an.fftSize)), els: new Set(), smooth: 0, hold: 0 };
      meters.set(id, m);
    } catch { return () => {}; }
  }
  m.els.add(el);
  timer ??= setInterval(tick, 100);
  const meter = m;
  return () => {
    meter.els.delete(el);
    el.style.removeProperty('--lvl'); delete el.dataset.speaking;
    if (!meter.els.size) {
      try { meter.src.disconnect(); } catch { /* */ }
      meters.delete(id);
    }
    if (!meters.size && timer) { clearInterval(timer); timer = null; ctx?.suspend().catch(() => {}); }
  };
}

/** Call from a user gesture (e.g. tapping the mic) so iOS lets the analysis context run. */
export function primeLevels() { audioCtx(); }
