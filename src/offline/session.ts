/**
 * The signed-in account id as persisted by supabase-js (`sb-<project>-auth-token`), read without the network.
 * Offline, an access token that expired can't be refreshed, so `getSession()` may answer "no session" although the
 * player is signed in on this device — results are still queued for that account and sent once the session is back.
 */
export function storedUid(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/^sb-.+-auth-token$/.test(k)) continue;
      const o = JSON.parse(localStorage.getItem(k) ?? 'null') as { user?: { id?: unknown }; currentSession?: { user?: { id?: unknown } } } | null;
      const id = o?.user?.id ?? o?.currentSession?.user?.id;
      if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) return id;
    }
  } catch { /* */ }
  return null;
}
