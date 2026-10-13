import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';

/**
 * Code-splitting helpers. The first Home paint ships only what Home shows; everything else (tables, sheets, toast
 * layers, progress / quest / economy / social stores) is fetched after it — on idle, or the moment it is needed.
 */

type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };

/**
 * Run `fn` once the page has loaded, `delay` ms have passed (lets Home's entrance animation play undisturbed) and the
 * browser is idle — but never more than `timeout` ms after that.
 */
export function whenIdle(fn: () => void, timeout = 2000, delay = 0) {
  if (typeof window === 'undefined') return;
  const idle = () => {
    const w = window as IdleWin;
    if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout });
    else setTimeout(fn, Math.min(timeout, 300));
  };
  const go = () => { if (delay > 0) setTimeout(idle, delay); else idle(); };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

/** Mounts its children only after the first paint, when the browser is idle (layers that render nothing at start). */
export function Deferred({ children, timeout = 2000, delay = 0 }: { children: ReactNode; timeout?: number; delay?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { let live = true; whenIdle(() => { if (live) setOn(true); }, timeout, delay); return () => { live = false; }; }, [timeout, delay]);
  return on ? <Suspense fallback={null}>{children}</Suspense> : null;
}

/**
 * `lazy()` for a named export, plus `preload()` so a likely next screen can be fetched ahead of the tap.
 *   const Table = lazyNamed(() => import('./Table'), 'Table');  …  Table.preload();
 */
export function lazyNamed<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  let p: Promise<M> | null = null;
  const get = () => (p ??= load().catch(e => { p = null; throw e; }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = lazy(() => get().then(m => ({ default: m[name] as unknown as ComponentType<any> })));
  return Object.assign(C, { preload: () => { void get().catch(() => {}); } }) as unknown as M[K] & { preload: () => void };
}

/**
 * A lazily loaded component that renders `fallback` (default: nothing) until its chunk is in.
 * `idleDelay` (ms): don't even start fetching before the page is idle that long after load (below-the-fold pieces).
 */
export function lazySlot<P extends object>(load: () => Promise<ComponentType<P>>, fallback: ReactNode = null, idleDelay?: number) {
  const C = lazy(() => load().then(c => ({ default: c })));
  function Slot(props: P) {
    const [go, setGo] = useState(idleDelay == null);
    useEffect(() => { if (go) return; let live = true; whenIdle(() => { if (live) setGo(true); }, 3000, idleDelay); return () => { live = false; }; }, [go]);
    return go ? <Suspense fallback={fallback}><C {...props} /></Suspense> : <>{fallback}</>;
  }
  return Slot;
}
