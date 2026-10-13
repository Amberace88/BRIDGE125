// Navigation to online tables without threading callbacks through every game screen: push the URL and let the App's
// popstate listener route it (App.tsx parses /g/<id>/r/<CODE>).
import type { OnlineGameId } from './protocol';

export const roomPath = (game: OnlineGameId, code: string) => `/g/${game}/r/${code}`;
export const roomLink = (game: OnlineGameId, code: string) => `${location.origin}${roomPath(game, code)}`;

export function goTo(path: string, replace = false) {
  if (location.pathname === path) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const openRoom = (game: OnlineGameId, code: string, replace = false) => goTo(roomPath(game, code), replace);
