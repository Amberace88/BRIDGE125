/**
 * Keyboard for a tappable CardView (Bridge, Zole, Durak, Thousand …).
 *
 * Enter is deliberately NOT handled here: the card's `onTap` is Motion's press gesture, which already turns Enter on a
 * focused element into a tap (keydown → press start, keyup → tap). Handling Enter here as well fired every keyboard
 * tap twice — a played card plus a second action on whatever was legal next. Space, which Motion ignores, taps once
 * per press (auto-repeat ignored) and never scrolls the page.
 */
export function cardKeyDown(e: { key: string; repeat?: boolean; preventDefault: () => void }, onTap?: () => void): void {
  if (!onTap || e.key !== ' ') return;
  e.preventDefault();
  if (!e.repeat) onTap();
}
