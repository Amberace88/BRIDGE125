// Per-player audio preferences that live next to (not inside) the app store.
//
//   b125.voice  { on, coach: 'auto' | 'moves' | 'tips', games, vol }
//   b125.sfx    { vol }
//
// The sound-effects on/off switch stays the app-wide `app.sound` (store.tsx → setSound); this module only adds the
// volume. Music keeps its own `b125.music` key in media/music.ts.

import { useSyncExternalStore } from 'react';
import { setSfxVolume } from '../sound';

export type Coach = 'auto' | 'moves' | 'tips';
/** What the narrator actually does right now. */
export type CoachLevel = 'off' | 'moves' | 'tips';

export interface VoicePref { on: boolean; coach: Coach; games: number; vol: number }
export interface SfxPref { vol: number }

const VKEY = 'b125.voice';
const SKEY = 'b125.sfx';
/** "Moves + tips" for the first few finished games, then "Moves only" — unless the player picked a level. */
export const TIP_GAMES = 3;

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

function readJson(key: string): Record<string, unknown> {
  try { const j = JSON.parse(localStorage.getItem(key) ?? '{}'); return j && typeof j === 'object' ? j : {}; } catch { return {}; }
}
function readVoice(): VoicePref {
  const j = readJson(VKEY);
  const coach: Coach = j.coach === 'moves' || j.coach === 'tips' ? j.coach : 'auto';
  return { on: j.on !== false, coach, games: typeof j.games === 'number' && j.games >= 0 ? Math.floor(j.games) : 0, vol: clamp01(j.vol, 1) };
}
function readSfx(): SfxPref { return { vol: clamp01(readJson(SKEY).vol, 0.8) }; }

const hasLS = typeof localStorage !== 'undefined';
let voice: VoicePref = hasLS ? readVoice() : { on: true, coach: 'auto', games: 0, vol: 1 };
let sfxP: SfxPref = hasLS ? readSfx() : { vol: 0.8 };
setSfxVolume(sfxP.vol);

const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

export function effectiveLevel(v: VoicePref): CoachLevel {
  if (!v.on) return 'off';
  if (v.coach === 'auto') return v.games < TIP_GAMES ? 'tips' : 'moves';
  return v.coach;
}

export const audioPrefs = {
  get voice() { return voice; },
  get sfx() { return sfxP; },
  get level(): CoachLevel { return effectiveLevel(voice); },
  setVoice(p: Partial<VoicePref>) { voice = { ...voice, ...p }; write(VKEY, voice); emit(); },
  setSfx(p: Partial<SfxPref>) { sfxP = { ...sfxP, ...p }; setSfxVolume(sfxP.vol); write(SKEY, sfxP); emit(); },
  /** A finished game — counts toward switching the automatic coach from tips to moves only. */
  gameFinished() { if (voice.games < 99) audioPrefs.setVoice({ games: voice.games + 1 }); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};

interface Snap { voice: VoicePref; sfx: SfxPref; level: CoachLevel }
let snap: Snap = { voice, sfx: sfxP, level: effectiveLevel(voice) };
const getSnap = () => {
  if (snap.voice !== voice || snap.sfx !== sfxP) snap = { voice, sfx: sfxP, level: effectiveLevel(voice) };
  return snap;
};

/** React view of the audio preferences (re-renders on change, across components). */
export function useAudioPrefs(): Snap {
  return useSyncExternalStore(audioPrefs.subscribe, getSnap, getSnap);
}
