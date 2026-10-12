import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DICTS, type Dict, type Lang } from './i18n';
import { EXTRA, type Extra } from './i18n2';
import { EXTRA2, type Extra2 } from './i18n3';
import { applyTheme } from './theme';
import { setSound } from './sound';
import { getSupabase, hasSupabase, type Profile } from './supabase';
import type { BotLevel } from './engine/bot';

interface Prefs { lang: Lang; accent: string; table: string; sound: boolean; name: string; level: BotLevel; opponents: number }
const DEFAULTS: Prefs = { lang: 'en', accent: 'brass', table: 'malachite', sound: true, name: '', level: 'normal', opponents: 1 };
const KEY = 'pikovaya.prefs.v1';

function load(): Prefs {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }; } catch { /* */ }
  return DEFAULTS;
}
function persist(p: Prefs) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* */ } }

interface Ctx extends Prefs {
  t: Dict & Extra & Extra2;
  set: (patch: Partial<Prefs>) => void;
  session: Session | null;
  profile: Profile | null;
  online: boolean;              // supabase configured
  canPersonalize: boolean;
  saveProfile: (patch: Partial<Pick<Prefs, 'name' | 'accent' | 'table' | 'lang'>>) => Promise<boolean>;
  signIn: (email: string) => Promise<string | null>;
  signInPassword: (email: string, password: string) => Promise<AuthErr | null>;
  signUpPassword: (email: string, password: string, name: string) => Promise<AuthErr | null>;
  resetPassword: (email: string) => Promise<AuthErr | null>;
  updatePassword: (password: string) => Promise<AuthErr | null>;
  recovery: boolean;
  endRecovery: () => void;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recordGame: (won: boolean) => void;
}

export type AuthErr = 'wrong' | 'exists' | 'weak' | 'notConfirmed' | 'tooMany' | 'network' | 'generic';

/** Supabase error → a short code the UI can translate into a friendly sentence. */
function authErr(e: { message?: string; status?: number; code?: string } | null): AuthErr | null {
  if (!e) return null;
  const m = (e.message ?? '').toLowerCase(), c = e.code ?? '';
  if (c === 'invalid_credentials' || m.includes('invalid login')) return 'wrong';
  if (c === 'user_already_exists' || c === 'email_exists' || m.includes('already registered')) return 'exists';
  if (c === 'weak_password' || m.includes('password should')) return 'weak';
  if (c === 'email_not_confirmed' || m.includes('not confirmed')) return 'notConfirmed';
  if (e.status === 429 || m.includes('rate limit') || c.includes('rate_limit')) return 'tooMany';
  if (m.includes('fetch') || m.includes('network')) return 'network';
  return 'generic';
}

const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovery, setRecovery] = useState(false);

  const set = useCallback((patch: Partial<Prefs>) => {
    setPrefs(p => { const n = { ...p, ...patch }; persist(n); return n; });
  }, []);

  useEffect(() => { applyTheme(prefs.accent, prefs.table); }, [prefs.accent, prefs.table]);
  useEffect(() => { setSound(prefs.sound); }, [prefs.sound]);
  useEffect(() => { document.documentElement.lang = prefs.lang; }, [prefs.lang]);

  // auth
  useEffect(() => {
    let unsub: (() => void) | null = null, dead = false;
    getSupabase().then(sb => {
      if (!sb || dead) return;
      sb.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: sub } = sb.auth.onAuthStateChange((ev, s) => { setSession(s); if (ev === 'PASSWORD_RECOVERY') setRecovery(true); });
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => { dead = true; unsub?.(); };
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    getSupabase().then(sb => sb?.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setProfile(data as Profile);
      const patch: Partial<Prefs> = {};
      if (data.username) patch.name = data.username;
      if (data.accent) patch.accent = data.accent;
      if (data.background) patch.table = data.background;
      if (data.lang) patch.lang = data.lang as Lang;
      set(patch);
    }));
  }, [session, set]);

  const saveProfile: Ctx['saveProfile'] = async (patch) => {
    set(patch);
    const sb = await getSupabase();
    if (!sb || !session) return false;
    const row: Record<string, string> = {};
    if (patch.name !== undefined) row.username = patch.name.slice(0, 24);
    if (patch.accent) row.accent = patch.accent;
    if (patch.table) row.background = patch.table;
    if (patch.lang) row.lang = patch.lang;
    const { error } = await sb.from('profiles').update(row).eq('id', session.user.id);
    return !error;
  };

  const signIn: Ctx['signIn'] = async (email) => {
    const sb = await getSupabase();
    if (!sb) return 'offline';
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    return error ? error.message : null;
  };
  const verifyCode: Ctx['verifyCode'] = async (email, code) => {
    const sb = await getSupabase();
    if (!sb) return 'offline';
    const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
    return error ? error.message : null;
  };
  const signInPassword: Ctx['signInPassword'] = async (email, password) => {
    const sb = await getSupabase(); if (!sb) return 'network';
    try { const { error } = await sb.auth.signInWithPassword({ email, password }); return authErr(error); } catch { return 'network'; }
  };
  const signUpPassword: Ctx['signUpPassword'] = async (email, password, name) => {
    const sb = await getSupabase(); if (!sb) return 'network';
    try {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username: name }, emailRedirectTo: window.location.origin } });
      if (error) return authErr(error);
      // Supabase hides "already registered" behind an empty identities list
      if (data.user && (data.user.identities?.length ?? 0) === 0) return 'exists';
      if (data.session && data.user) {
        await sb.from('profiles').update({ username: name.slice(0, 24) }).eq('id', data.user.id);
        set({ name });
        return null;
      }
      return 'notConfirmed';
    } catch { return 'network'; }
  };
  const resetPassword: Ctx['resetPassword'] = async (email) => {
    const sb = await getSupabase(); if (!sb) return 'network';
    try { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/' }); return authErr(error); } catch { return 'network'; }
  };
  const updatePassword: Ctx['updatePassword'] = async (password) => {
    const sb = await getSupabase(); if (!sb) return 'network';
    try { const { error } = await sb.auth.updateUser({ password }); if (!error) setRecovery(false); return authErr(error); } catch { return 'network'; }
  };

  const signOut = async () => { await (await getSupabase())?.auth.signOut(); setProfile(null); };

  const recordGame = (won: boolean) => {
    if (!session) return;
    getSupabase().then(sb => sb?.rpc('record_game', { won }).then(({ data }) => { if (data) setProfile(p => (p ? { ...p, ...(data as object) } : p)); }));
  };

  const value = useMemo<Ctx>(() => ({
    ...prefs, t: { ...DICTS[prefs.lang], ...EXTRA[prefs.lang], ...EXTRA2[prefs.lang] }, set, session, profile, online: hasSupabase,
    canPersonalize: !!session, saveProfile, signIn, verifyCode, signOut, recordGame,
    signInPassword, signUpPassword, resetPassword, updatePassword, recovery, endRecovery: () => setRecovery(false),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [prefs, session, profile, recovery]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
