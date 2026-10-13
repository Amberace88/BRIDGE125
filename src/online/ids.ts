// Room / player identifiers and matchmaking. React-free and tiny, so Home, App and analytics can use them without
// loading the room hook (src/online/useRoom.ts re-exports everything here).

export const isQuickCode = (code: string) => code.length === 6 && code[0] === 'Q';

export function playerId(): string {
  try {
    let id = localStorage.getItem('b125.pid');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('b125.pid', id); }
    return id;
  } catch { return 'anon-' + Math.random().toString(36).slice(2); }
}

/** Ask the matchmaker for a public table. `skip` avoids being sent back to a table that just turned us away. */
export async function findQuickMatch(skip = ''): Promise<string> {
  const r = await fetch(`/api/quick?pid=${encodeURIComponent(playerId())}&skip=${encodeURIComponent(skip)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('quick ' + r.status);
  const j = await r.json() as { code?: string };
  if (!j.code) throw new Error('quick: no code');
  return j.code;
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRoomCode(): string {
  const a = new Uint32Array(5); crypto.getRandomValues(a);
  return [...a].map(n => ALPHA[n % ALPHA.length]).join('');
}
