// Audio settings: voice assistant (+ coach level), sound effects, music — each switchable on its own.
//  · <AudioSettings/> — rows for the Profile "me" tab
//  · <QuickAudio/>    — frameless glyph toggles in a small popover on the table

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useApp } from '../store';
import { LANGS } from '../i18n';
import { useMusic } from '../media/music';
import { sfx } from '../sound';
import { useStrings } from '../i18n/pick';
import { NEURAL_UI, VOICE_UI } from '../i18n/voice';
import { audioPrefs, useAudioPrefs } from './prefs';
import { narrator } from './speech';
import { speakSample, useNarratorRev, useSpeakLang } from './useNarrator';
import './voice.css';

/* ------------------------------------------------------------------ glyphs */
export const IconVoice = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M4 6.6A2.6 2.6 0 0 1 6.6 4h10.8A2.6 2.6 0 0 1 20 6.6v6.8a2.6 2.6 0 0 1-2.6 2.6H11l-4.6 4v-4A2.4 2.4 0 0 1 4 13.6z" />
    {on ? <><path d="M9 8.6v3.2" /><path d="M12 7v6.4" /><path d="M15 8.6v3.2" /></> : <path d="M3.5 3.5l17 17" className="slash" />}
  </svg>
);
export const IconTips = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M9.2 17.6h5.6M10.2 20.6h3.6" />
    <path d="M12 3.2a6 6 0 0 0-3.6 10.8c.7.6 1 1.2 1 2v.6h5.2v-.6c0-.8.3-1.4 1-2A6 6 0 0 0 12 3.2z" className={on ? 'glow' : ''} />
    {!on && <path d="M3.5 3.5l17 17" className="slash" />}
  </svg>
);
export const IconSfx = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className="fillme" />
    {on ? <><path d="M15.5 9a4.2 4.2 0 0 1 0 6" /><path d="M18 6.5a7.8 7.8 0 0 1 0 11" /></> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
  </svg>
);
export const IconMusic = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M9 17.5V5.2l10.5-2v12.3" />
    <circle cx="6.5" cy="17.5" r="2.6" className="fillme" /><circle cx="17" cy="15.5" r="2.6" className="fillme" />
    {!on && <path d="M3.5 3.5l17 17" className="slash" />}
  </svg>
);
/** Combined trigger glyph: a speaker with a small voice wave when the narrator is on. */
export const IconAudio = ({ sound, voice }: { sound: boolean; voice: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M3.5 9.5H7L11.5 5.5v13L7 14.5H3.5z" className="fillme" />
    {sound || voice ? <><path d="M15 9a4.2 4.2 0 0 1 0 6" /><path d="M17.6 6.5a7.8 7.8 0 0 1 0 11" /></> : <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />}
    {voice && <circle cx="20.6" cy="4.4" r="2" className="fillme dot" />}
  </svg>
);

/* ------------------------------------------------------------------ hooks */
function useVoiceNote() {
  const app = useApp();
  const ui = useStrings(VOICE_UI);
  const speakLang = useSpeakLang(app.lang);
  useNarratorRev();
  if (narrator().neuralOffer) return null;           // <NeuralOffer/> explains it instead
  if (!narrator().available) return ui.noVoice;
  if (speakLang && speakLang !== app.lang) return ui.fallback(LANGS.find(l => l.id === speakLang)?.label ?? speakLang);
  if (!speakLang) return ui.noVoice;
  return null;
}

/* ------------------------------------------------------------------ on-device neural voice */
/** Offer / progress / status of the downloadable natural voice for a language the device has no voice for. */
export function NeuralOffer({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const t = useStrings(NEURAL_UI);
  const n = narrator();
  useSpeakLang(app.lang);
  useNarratorRev();
  const st = useSyncExternalStore(n.neural.subscribe, () => n.neural.state, () => n.neural.state);
  const wanted = useRef(false);
  // the voice the player just downloaded says hello in their language
  useEffect(() => {
    if (wanted.current && st.status === 'ready') { wanted.current = false; setTimeout(() => speakSample(app.lang, app.t.botNames[1] ?? 'Marina'), 150); }
  }, [st.status, app.lang, app.t.botNames]);
  if (!n.neuralOffer) return null;
  const pct = st.total ? Math.min(100, Math.round((st.loaded / st.total) * 100)) : 0;
  const get = () => { wanted.current = true; n.downloadNeural(); sfx.tap(); };
  const mb = Math.round((st.total || 63_000_000) / 1e6);
  const ready = st.status === 'ready' && st.lang === app.lang;

  if (ready) {
    if (compact) return null;
    return (
      <div className="nvoice ready">
        <span className="nv-dot" aria-hidden />
        <span>{t.ready}</span>
        <button className="nv-link" onClick={() => { void n.neural.remove(); }}>{t.remove}</button>
      </div>
    );
  }
  if (st.status === 'downloading' || st.status === 'loading' || (st.status === 'checking' && wanted.current)) {
    return (
      <div className={`nvoice busy ${compact ? 'compact' : ''}`} role="status" aria-live="polite">
        <span>{st.status === 'loading' || st.status === 'checking' ? t.loading : t.downloading(pct)}</span>
        <div className="nv-bar"><motion.i animate={{ width: `${st.status === 'loading' ? 100 : pct}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} /></div>
      </div>
    );
  }
  return (
    <button className={`nvoice offer ${compact ? 'compact' : ''}`} onClick={get}>
      <span className="nv-ico" aria-hidden>
        <svg viewBox="0 0 24 24"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 18.5h14" /></svg>
      </span>
      <span className="nv-txt">
        <b>{st.status === 'error' ? t.error : t.get(mb)}</b>
        {!compact && <small>{t.sub}</small>}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ Profile rows */
export function AudioSettings({ music }: { music: ReactNode }) {
  const app = useApp();
  const ui = useStrings(VOICE_UI);
  const { voice, sfx: sp, level } = useAudioPrefs();
  const note = useVoiceNote();
  const sample = () => speakSample(app.lang, app.t.botNames[1] ?? 'Marina');
  const lastTick = useRef(0);

  return (
    <div className="aset">
      {/* voice assistant */}
      <div className="prow mrow" style={voice.on ? { borderBottom: 0 } : undefined}>
        <span>{ui.voice}{voice.on && <span className="meq" aria-hidden><i /><i /><i /></span>}<small>{ui.voiceSub}</small></span>
        <button className={`switch ${voice.on ? 'on' : ''}`} role="switch" aria-checked={voice.on} aria-label={ui.voice}
          onClick={() => { const on = !voice.on; audioPrefs.setVoice({ on }); if (on) sample(); else narrator().stop(); }}><i /></button>
      </div>
      <AnimatePresence initial={false}>
        {voice.on && (
          <motion.div className="vsub" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="vseg" role="radiogroup" aria-label={ui.voice}>
              {(['moves', 'tips'] as const).map(k => (
                <button key={k} role="radio" aria-checked={level === k} className={level === k ? 'on' : ''} onClick={() => { audioPrefs.setVoice({ coach: k }); sfx.tap(); }}>
                  {level === k && <motion.span layoutId="vsegpill" className="vsegpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <b>{k === 'tips' ? <><IconTips on /> {ui.tips}</> : <><IconVoice on /> {ui.moves}</>}</b>
                </button>
              ))}
            </div>
            <label className="mvol">
              <span>{ui.volume}</span>
              <input type="range" min={0.1} max={1} step={0.05} value={voice.vol} aria-label={`${ui.voice} — ${ui.volume}`}
                onChange={e => audioPrefs.setVoice({ vol: Number(e.target.value) })} onPointerUp={sample} onKeyUp={sample} />
              <button className="vtest" onClick={sample} aria-label={ui.test} title={ui.test}>▶</button>
            </label>
            {note && <div className="vnote">{note}</div>}
            <NeuralOffer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* sound effects (app.sound is the master switch) */}
      <div className="prow mrow" style={app.sound ? { borderBottom: 0 } : undefined}>
        <span>{ui.sfx}<small>{ui.sfxSub}</small></span>
        <button className={`switch ${app.sound ? 'on' : ''}`} role="switch" aria-checked={app.sound} aria-label={ui.sfx}
          onClick={() => app.set({ sound: !app.sound })}><i /></button>
      </div>
      <AnimatePresence initial={false}>
        {app.sound && (
          <motion.label className="mvol" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <span>{ui.volume}</span>
            <input type="range" min={0} max={1} step={0.05} value={sp.vol} aria-label={`${ui.sfx} — ${ui.volume}`}
              onChange={e => { audioPrefs.setSfx({ vol: Number(e.target.value) }); const t = Date.now(); if (t - lastTick.current > 120) { lastTick.current = t; sfx.play(); } }} />
          </motion.label>
        )}
      </AnimatePresence>

      {music}
    </div>
  );
}

/* ------------------------------------------------------------------ table quick toggles */
export function QuickAudio() {
  const app = useApp();
  const ui = useStrings(VOICE_UI);
  const m = useMusic();
  const { voice, level } = useAudioPrefs();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const note = useVoiceNote();
  const onOff = (on: boolean) => (on ? app.t.on : app.t.off);
  const say = (label: string, on: boolean) => setHint(`${label} · ${onOff(on)}`);

  const items = [
    {
      key: 'voice', label: ui.voice, on: voice.on, icon: <IconVoice on={voice.on} />,
      act: () => { const on = !voice.on; audioPrefs.setVoice({ on }); say(ui.voice, on); if (on) speakSample(app.lang, app.t.botNames[1] ?? 'Marina'); else narrator().stop(); },
    },
    {
      key: 'tips', label: ui.tips, on: level === 'tips', disabled: !voice.on, icon: <IconTips on={level === 'tips'} />,
      act: () => { const tips = level !== 'tips'; audioPrefs.setVoice({ coach: tips ? 'tips' : 'moves' }); say(ui.tips, tips); },
    },
    {
      key: 'sfx', label: ui.sfx, on: app.sound, icon: <IconSfx on={app.sound} />,
      act: () => { const on = !app.sound; app.set({ sound: on }); say(ui.sfx, on); },
    },
    {
      key: 'music', label: ui.music, on: m.on, icon: <IconMusic on={m.on} />,
      act: () => { m.toggle(); say(ui.music, !m.on); },
    },
  ];

  return (
    <div className="qa">
      <button className="glyph" aria-label={ui.quick} title={ui.quick} aria-expanded={open} aria-haspopup="true"
        onClick={() => { setOpen(o => !o); setHint(null); }}>
        <IconAudio sound={app.sound} voice={voice.on} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.button key="qascrim" className="qa-scrim" aria-label={ui.close} onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div key="qapop" className="qa-pop" role="group" aria-label={ui.quick}
              initial={{ opacity: 0, y: -8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
              <div className="qa-row">
                {items.map((it, i) => (
                  <motion.button key={it.key} className={`qa-btn ${it.on ? 'on' : 'off'}`} disabled={it.disabled} aria-pressed={it.on} aria-label={it.label} title={it.label}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: it.disabled ? 0.35 : 1, y: 0 }} transition={{ delay: 0.03 * i }}
                    whileTap={{ scale: 0.82 }} onClick={it.act} onFocus={() => setHint(`${it.label} · ${onOff(it.on)}`)} onPointerEnter={() => setHint(`${it.label} · ${onOff(it.on)}`)}>
                    {it.icon}
                  </motion.button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={hint ?? 'title'} className="qa-hint" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>
                  {hint ?? ui.quick}
                </motion.div>
              </AnimatePresence>
              {voice.on && note && <div className="qa-note">{note}</div>}
              {voice.on && <NeuralOffer compact />}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
