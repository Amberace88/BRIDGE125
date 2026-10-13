import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cardKeyDown } from './cardKeys';

// The bug: Enter on a focused, tappable CardView fired its tap twice — once from CardView's own onKeyDown and once
// from Motion's press gesture (which backs `onTap` and already answers Enter on a focused element).
// No DOM in these tests, so Motion's real `press()` runs on a tiny EventTarget standing in for the card element.

class FakeCard extends EventTarget {
  tagName = 'DIV';
  offsetHeight = 100;
  tabIndex = -1;
  hasAttribute() { return false; }
}

const g = globalThis as Record<string, unknown>;
const saved = { window: g.window, PointerEvent: g.PointerEvent };
beforeAll(() => {
  if (typeof g.PointerEvent === 'undefined') {
    g.PointerEvent = class extends Event {
      isPrimary: boolean; pointerType = '';
      constructor(type: string, init: EventInit & { isPrimary?: boolean } = {}) { super(type, init); this.isPrimary = init.isPrimary ?? true; }
    };
  }
});
afterEach(() => { g.window = saved.window; });

const key = (el: EventTarget, type: 'keydown' | 'keyup', k: string, repeat = false) => {
  const e = new Event(type, { cancelable: true }) as Event & { key: string; repeat: boolean };
  e.key = k; e.repeat = repeat;
  el.dispatchEvent(e);
  return e;
};

/** A card wired like CardView: Motion's press gesture (onTap) + CardView's onKeyDown. Returns the tap counter. */
async function mount() {
  const { press } = await import('motion-dom');
  const el = new FakeCard();
  // press() listens for the release on window; the card's own events stand in for the bubbled ones
  g.window = el;
  const taps = { n: 0 };
  const onTap = () => { taps.n += 1; };
  press(el as unknown as Element, () => (_e: unknown, info: { success: boolean }) => { if (info.success) onTap(); });
  el.addEventListener('keydown', e => cardKeyDown(e as unknown as KeyboardEvent, onTap));
  el.dispatchEvent(new Event('focus'));
  return { el, taps };
}

describe('CardView keyboard', () => {
  it('Enter on a focused card taps exactly once (Motion press only)', async () => {
    const { el, taps } = await mount();
    key(el, 'keydown', 'Enter');
    key(el, 'keyup', 'Enter');
    expect(taps.n).toBe(1);
    key(el, 'keydown', 'Enter');
    key(el, 'keyup', 'Enter');
    expect(taps.n).toBe(2);
  });

  it('Space taps exactly once, ignores auto-repeat and does not scroll', async () => {
    const { el, taps } = await mount();
    const e = key(el, 'keydown', ' ');
    key(el, 'keydown', ' ', true);
    key(el, 'keyup', ' ');
    expect(taps.n).toBe(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('other keys and untappable cards do nothing', () => {
    let n = 0;
    const ev = (k: string) => ({ key: k, repeat: false, prevented: false, preventDefault() { this.prevented = true; } });
    const tab = ev('Tab');
    cardKeyDown(tab, () => n++);
    cardKeyDown(ev('Enter'), () => n++);
    const sp = ev(' ');
    cardKeyDown(sp, undefined);
    expect(n).toBe(0);
    expect(tab.prevented).toBe(false);
    expect(sp.prevented).toBe(false);
  });

  it('the old handler (Enter in onKeyDown as well) would tap twice', async () => {
    const { press } = await import('motion-dom');
    const el = new FakeCard();
    g.window = el;
    let n = 0;
    press(el as unknown as Element, () => (_e: unknown, info: { success: boolean }) => { if (info.success) n++; });
    el.addEventListener('keydown', e => { const k = (e as unknown as KeyboardEvent).key; if (k === 'Enter' || k === ' ') n++; });
    el.dispatchEvent(new Event('focus'));
    key(el, 'keydown', 'Enter');
    key(el, 'keyup', 'Enter');
    expect(n).toBe(2);
  });
});
