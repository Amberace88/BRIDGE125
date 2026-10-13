/** "Needs internet" nudge: an online-only action was tapped while offline — the offline pill says why nothing happens. */
const subs = new Set<() => void>();
export function showNeedsNet() { subs.forEach(f => f()); }
export function onNeedsNet(f: () => void): () => void { subs.add(f); return () => { subs.delete(f); }; }
