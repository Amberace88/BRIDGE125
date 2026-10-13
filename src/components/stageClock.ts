/**
 * A stall-tolerant scheduler for table choreography (the deal, card flights).
 *
 * setTimeout keeps wall-clock time: when the main thread stalls (a round mounting twenty cards, a lazy chunk, a GC),
 * every pending cue fires at once afterwards — three cards leave the deck together and the rhythm is gone.
 * This clock only advances with painted frames, at most MAX_STEP ms per frame (15 fps and up run in real time),
 * so cues keep their spacing:
 * after a 150 ms hitch the deal simply resumes where it was. It also rests while the tab is hidden (no frames).
 */
const MAX_STEP = 70;

interface Job { at: number; fn: () => void }
let vnow = 0;
let last = 0;
let raf = 0;
let seq = 0;
const jobs = new Map<number, Job>();

function tick(t: number) {
  const dt = last ? Math.min(Math.max(0, t - last), MAX_STEP) : 16;
  last = t;
  vnow += dt;
  const due = [...jobs.entries()].filter(([, j]) => j.at <= vnow).sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
  for (const [id, j] of due) {
    if (!jobs.delete(id)) continue; // cancelled by an earlier job this frame
    try { j.fn(); } catch (e) { console.error(e); }
  }
  if (jobs.size) raf = requestAnimationFrame(tick);
  else { raf = 0; last = 0; }
}

/** Run `fn` after `ms` of stage time. Returns a cancel function. */
export function after(ms: number, fn: () => void): () => void {
  if (typeof requestAnimationFrame !== 'function') {
    const tm = setTimeout(fn, ms);
    return () => clearTimeout(tm);
  }
  const id = ++seq;
  jobs.set(id, { at: vnow + Math.max(0, ms), fn });
  if (!raf) raf = requestAnimationFrame(tick);
  return () => { jobs.delete(id); };
}
