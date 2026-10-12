import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DICTS, type Dict, type Lang } from './i18n';
import { EXTRA, type Extra } from './i18n2';
import { applyTheme } from './theme';
import { setSound } from './sound';
import { supabase, type Profile } from './supabase';
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
  t: Dict & Extra;
  set: (patch: Partial<Prefs>) => void;
  session: Session | null;
  profile: Profile | null;
  online: boolean;              // supabase configured
  canPersonalize: boolean;
  saveProfile: (patch: Partial<Pick<Prefs, 'name' | 'accent' | 'table' | 'lang'>>) => Promise<boolean>;
  signIn: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recordGame: (won: boolean) => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const set = useCallback((patch: Partial<Prefs>) => {
    setPrefs(p => { const n = { ...p, ...patch }; persist(n); return n; });
  }, []);

  useEffect(() => { applyTheme(prefs.accent, prefs.table); }, [prefs.accent, prefs.table]);
  useEffect(() => { setSound(prefs.sound); }, [prefs.sound]);
  useEffect(() => { document.documentElement.lang = prefs.lang; }, [prefs.lang]);

  // auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) { setProfile(null); return; }
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setProfile(data as Profile);
      const patch: Partial<Prefs> = {};
      if (data.username) patch.name = data.username;
      if (data.accent) patch.accent = data.accent;
      if (data.background) patch.table = data.background;
      if (data.lang) patch.lang = data.lang as Lang;
      set(patch);
    });
  }, [session, set]);

  const saveProfile: Ctx['saveProfile'] = async (patch) => {
    set(patch);
    if (!supabase || !session) return false;
    const row: Record<string, string> = {};
    if (patch.name !== undefined) row.username = patch.name.slice(0, 24);
    if (patch.accent) row.accent = patch.accent;
    if (patch.table) row.background = patch.table;
    if (patch.lang) row.lang = patch.lang;
    const { error } = await supabase.from('profiles').update(row).eq('id', session.user.id);
    return !error;
  };

  const signIn: Ctx['signIn'] = async (email) => {
    if (!supabase) return 'offline';
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    return error ? error.message : null;
  };
  const verifyCode: Ctx['verifyCode'] = async (email, code) => {
    if (!supabase) return 'offline';
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    return error ? error.message : null;
  };
  const signOut = async () => { await supabase?.auth.signOut(); setProfile(null); };

  const recordGame = (won: boolean) => {
    if (!supabase || !session) return;
    supabase.rpc('record_game', { won }).then(({ data }) => { if (data) setProfile(p => (p ? { ...p, ...(data as object) } : p)); });
  };

  const value = useMemo<Ctx>(() => ({
    ...prefs, t: { ...DICTS[prefs.lang], ...EXTRA[prefs.lang] }, set, session, profile, online: !!supabase,
    canPersonalize: !!session, saveProfile, signIn, verifyCode, signOut, recordGame,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [prefs, session, profile]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
