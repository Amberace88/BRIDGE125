import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { GameState } from '../engine/engine';
import type { Lang } from '../i18n';
import { music } from '../media/music';
import { setDuckHandler } from '../sound';
import { coachTip, narrateEvents, newMemo, samplePhrase, PRI } from './narrate';
import { audioPrefs, useAudioPrefs } from './prefs';
import { narrator } from './speech';

// Cinematic sound effects and the narrator both dip the music.
setDuckHandler(() => music.duck());
let duckTimer: ReturnType<typeof setInterval> | null = null;
narrator().be.onActive = on => {
  if (duckTimer) { clearInterval(duckTimer); duckTimer = null; }
  if (on) { music.duck(); duckTimer = setInterval(() => music.duck(), 420); }
};

/** The language the narrator really speaks for `lang` on this device (null = no usable voice yet). */
export function useSpeakLang(lang: Lang): Lang | null {
  const n = narrator();
  useEffect(() => { n.setLang(lang); }, [n, lang]);
  return useSyncExternalStore(n.subscribe, () => n.speakLang, () => null);
}

/** Speak one sample line right away (settings "Hear it", switching the voice on). */
export function speakSample(lang: Lang, name: string) {
  const n = narrator();
  n.setLang(lang);
  n.setVolume(audioPrefs.voice.vol);
  n.stop();
  const l = n.speakLang;
  if (l) n.say([{ text: samplePhrase(l, name), pri: PRI.big, kind: 'big' }]);
}

/**
 * Narrates the displayed game state: every move with its consequence, round / game results, and — at the
 * "Moves + tips" level — what the player should do now. `ready` is false while the deal animation runs.
 */
export function useNarrator(g: GameState, me: number, ready: boolean, lang: Lang) {
  const { level, voice } = useAudioPrefs();
  const n = narrator();
  const speakLang = useSpeakLang(lang);
  const memo = useRef(newMemo());
  const seen = useRef(-1);
  const counted = useRef(-1);

  useEffect(() => { n.setVolume(voice.vol); }, [n, voice.vol]);
  useEffect(() => { if (level === 'off') n.stop(); }, [n, level]);
  useEffect(() => () => n.stop(), [n]);

  useEffect(() => {
    // a finished game counts toward the automatic "tips → moves only" switch, voice on or not
    if (g.events?.some(e => e.t === 'gameOver') && counted.current !== g.seq) { counted.current = g.seq; audioPrefs.gameFinished(); }
    if (g.round < memo.current.round) memo.current = newMemo();
    const fresh = seen.current !== g.seq;
    if (!ready) return;
    seen.current = g.seq;
    if (level === 'off' || !speakLang) return;
    const ctx = { me, lang: speakLang, level, name: (i: number) => g.players[i]?.name ?? '' };
    const lines = fresh ? narrateEvents(g, ctx) : [];
    const tip = coachTip(g, ctx, memo.current);
    if (tip) lines.push(tip);
    n.say(lines);
  }, [g.seq, ready, level, speakLang]); // eslint-disable-line react-hooks/exhaustive-deps
}
