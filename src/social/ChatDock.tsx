import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '../sound';
import type { SocialStrings } from '../i18n/social';
import { CHAT_EMOJI, CHAT_MAX, QUICK_KEYS, type ChatMsg, type QuickKey } from './sanitize';
import type { SocialResult } from '../online/useRoom';

/* ---------- glyphs (frameless marks) ---------- */
export const IconChat = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4.5 6.8c0-1.6 1.3-2.8 2.9-2.8h9.2c1.6 0 2.9 1.2 2.9 2.8v6.3c0 1.6-1.3 2.8-2.9 2.8H11l-4.2 3.6v-3.6h0c-1.3-.2-2.3-1.3-2.3-2.8z" /><circle cx="9" cy="10" r=".95" className="fillme" /><circle cx="12" cy="10" r=".95" className="fillme" /><circle cx="15" cy="10" r=".95" className="fillme" /></svg>);
const IconSend = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M4.5 12 19.5 5l-4.2 14.5-3.6-5.6zM11.7 13.9 19.5 5" /></svg>);
const IconClose = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M7 7l10 10M17 7L7 17" /></svg>);
const IconSmile = () => (<svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.2c1.9 2.2 5.1 2.2 7 0" /><circle cx="9.2" cy="10" r=".9" className="fillme" /><circle cx="14.8" cy="10" r=".9" className="fillme" /></svg>);

/** One colour per seat — the same in the dock, the bubbles and the gift labels. */
export const SEAT_COLORS = ['#EBD38E', '#8FE3FF', '#FF9AAE', '#B6F09C'];

/* ---------- per-player mute (kept on this device, by nickname) ---------- */
const MUTE_KEY = 'b125.mutes';
const readMutes = (): string[] => { try { const v = JSON.parse(localStorage.getItem(MUTE_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 200) : []; } catch { return []; } };
export function useMutes() {
  const [list, setList] = useState<string[]>(readMutes);
  const set = useMemo(() => new Set(list), [list]);
  const toggle = useCallback((name: string) => {
    const k = name.trim().toLowerCase();
    setList(l => {
      const n = l.includes(k) ? l.filter(x => x !== k) : [...l, k];
      try { localStorage.setItem(MUTE_KEY, JSON.stringify(n)); } catch { /* */ }
      return n;
    });
  }, []);
  const isMuted = useCallback((name: string) => set.has(name.trim().toLowerCase()), [set]);
  return { isMuted, toggle };
}
export type Mutes = ReturnType<typeof useMutes>;

/* ---------- dock state shared by the glyph, the panel and the seat bubbles ---------- */
export interface Bubble { id: number; seat: number; text: string }
export function useChatUi(chat: ChatMsg[], chatBase: number, you: number, mutes: Mutes, quick: (k: QuickKey) => string) {
  const [open, setOpen] = useState(false);
  const [seenId, setSeenId] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const last = chat.length ? chat[chat.length - 1].id : 0;
  const seen = Math.max(seenId, chatBase);
  useEffect(() => { if (open) setSeenId(last); }, [open, last]);
  const unread = open ? 0 : chat.filter(m => m.id > seen && m.seat !== you && !mutes.isMuted(m.name)).length;

  // newest live line → bubble over the sender's seat for a few seconds (history and muted players never bubble)
  const bubbled = useRef(0);
  const timers = useRef(new Set<number>());
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => {
    const fresh = chat.filter(m => m.id > Math.max(bubbled.current, chatBase) && !mutes.isMuted(m.name));
    if (!chat.length) return;
    bubbled.current = Math.max(bubbled.current, last);
    if (!fresh.length) return;
    if (!open && fresh.some(m => m.seat !== you)) sfx.tap();
    const add = fresh.map(m => ({ id: m.id, seat: m.seat, text: m.q ? quick(m.q) : m.text }));
    setBubbles(b => [...b.filter(x => !add.some(a => a.seat === x.seat)), ...add.filter((a, i, arr) => arr.findLastIndex(z => z.seat === a.seat) === i)]);
    const ids = add.map(a => a.id);
    const tm = window.setTimeout(() => { timers.current.delete(tm); setBubbles(b => b.filter(x => !ids.includes(x.id))); }, 4200);
    timers.current.add(tm);
  }, [last]); // eslint-disable-line react-hooks/exhaustive-deps

  return { open, setOpen, unread, bubbles };
}
export type ChatUi = ReturnType<typeof useChatUi>;

/** Frameless chat glyph with the unread badge (sits next to the emote glyph). */
export function ChatGlyph({ ui, S }: { ui: ChatUi; S: SocialStrings }) {
  return (
    <button className="glyph chatglyph" aria-label={ui.unread ? `${S.chat.open} · ${S.chat.unread(ui.unread)}` : S.chat.open} title={S.chat.open}
      aria-expanded={ui.open} onClick={() => { ui.setOpen(!ui.open); sfx.tap(); }}>
      <IconChat />
      <AnimatePresence>
        {ui.unread > 0 && (
          <motion.span key="b" className="chatbadge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            {ui.unread > 9 ? '9+' : ui.unread}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ---------- the dock panel ---------- */
interface PanelProps {
  ui: ChatUi; S: SocialStrings; chat: ChatMsg[]; you: number; mutes: Mutes; signedIn: boolean;
  slowUntil: number; style: CSSProperties; desk: boolean;
  sendChat: (t: string) => void; sendQuick: (k: QuickKey) => void; report: (id: number) => Promise<SocialResult>;
}
export function ChatPanel({ ui, S, chat, you, mutes, signedIn, slowUntil, style, desk, sendChat, sendQuick, report }: PanelProps) {
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [act, setAct] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visible = chat.filter(m => !mutes.isMuted(m.name) || m.seat === you);
  const hidden = chat.length - visible.length;
  const slowLeft = Math.max(0, Math.ceil((slowUntil - now) / 1000));
  useEffect(() => { if (slowUntil <= Date.now()) return; const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, [slowUntil]);
  useLayoutEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [visible.length, ui.open]);
  useEffect(() => { if (!note) return; const tm = setTimeout(() => setNote(null), 2400); return () => clearTimeout(tm); }, [note]);

  const submit = () => {
    const v = text.trim();
    if (!v || slowLeft) return;
    sendChat(v); setText(''); setEmoji(false); sfx.tap();
  };
  const onReport = async (m: ChatMsg) => {
    setAct(null);
    if (!signedIn) { setNote(S.chat.reportSignIn); return; }
    const r = await report(m.id);
    setNote(r.ok ? S.chat.reported : S.gift.errors[r.error ?? 'generic']);
  };

  return (
    <motion.section className={`chatdock ${desk ? 'desk' : 'mob'}`} style={style} role="dialog" aria-label={S.chat.title}
      initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <span className="chatsheen" aria-hidden />
      <header className="chathead">
        <span className="chatttl"><IconChat /><b className="serif">{S.chat.title}</b></span>
        <button className="sglyph" aria-label={S.chat.close} onClick={() => ui.setOpen(false)}><IconClose /></button>
      </header>

      <div className="chatlist" ref={listRef} aria-live="polite">
        {visible.length === 0 && <div className="chatempty">{S.chat.empty}</div>}
        {visible.map(m => {
          const mine = m.seat === you;
          return (
            <div key={m.id} className={`chatline ${mine ? 'mine' : ''}`}>
              {!mine && <span className="chatname" style={{ color: SEAT_COLORS[m.seat % 4] }}>{m.name}</span>}
              <motion.button type="button" className={`chatmsg ${m.q ? 'quick' : ''}`} disabled={mine}
                initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}
                onClick={() => setAct(a => (a === m.id ? null : m.id))}>
                {m.q ? S.chat.quick[m.q] : m.text}
                {m.masked && <small className="chatfilt"> · {S.chat.filtered}</small>}
              </motion.button>
              <AnimatePresence>
                {act === m.id && !mine && (
                  <motion.div className="chatacts" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <button onClick={() => { mutes.toggle(m.name); setAct(null); setNote(S.chat.muted(m.name)); }}>{S.chat.mute} {m.name}</button>
                    <button className="warn" onClick={() => void onReport(m)}>{S.chat.report}</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {hidden > 0 && <div className="chathidden">{S.chat.hidden(hidden)}</div>}
      </div>

      <AnimatePresence>
        {note && <motion.div className="chatnote" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{note}</motion.div>}
      </AnimatePresence>

      <div className="chatquick" role="list">
        {QUICK_KEYS.map(k => (
          <motion.button key={k} role="listitem" whileTap={{ scale: 0.92 }} disabled={slowLeft > 0}
            onClick={() => { sendQuick(k); sfx.tap(); if (!desk) ui.setOpen(false); }}>{S.chat.quick[k]}</motion.button>
        ))}
      </div>

      <AnimatePresence>
        {emoji && (
          <motion.div className="chatemoji" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {CHAT_EMOJI.map(e => <button key={e} type="button" aria-label={e} onClick={() => { setText(t => (Array.from(t).length < CHAT_MAX ? t + e : t)); inputRef.current?.focus(); }}>{e}</button>)}
          </motion.div>
        )}
      </AnimatePresence>

      <form className="chatform" onSubmit={e => { e.preventDefault(); submit(); }}>
        <button type="button" className={`sglyph ${emoji ? 'on' : ''}`} aria-label={S.chat.emoji} aria-expanded={emoji} onClick={() => setEmoji(v => !v)}><IconSmile /></button>
        <input ref={inputRef} className="chatinput" value={text} maxLength={CHAT_MAX * 2} enterKeyHint="send" autoComplete="off"
          placeholder={slowLeft ? S.chat.slow(slowLeft) : S.chat.placeholder} aria-label={S.chat.placeholder}
          onChange={e => setText(Array.from(e.target.value).slice(0, CHAT_MAX).join(''))} />
        <motion.button type="submit" className="sglyph send" aria-label={S.chat.send} disabled={!text.trim() || slowLeft > 0} whileTap={{ scale: 0.85, rotate: -12 }}><IconSend /></motion.button>
      </form>
    </motion.section>
  );
}

/* ---------- bubbles that pop beside / above the sender's seat ---------- */
export function SeatBubbles({ bubbles, seat, me, W, minY, avSize }: { bubbles: Bubble[]; seat: (i: number) => { x: number; y: number }; me: number; W: number; minY: number; avSize: number }) {
  return (
    <AnimatePresence>
      {bubbles.map(b => {
        const p = seat(b.seat);
        const mine = b.seat === me;
        // mine: above my avatar (never down into the hand, never up into the pile).
        // others: beside the seat badge at name height, on the side with more room (clear of the rules line and the card fan)
        const half = avSize >= 46 ? 70 : 56;
        const roomR = W - 8 - (p.x + half), roomL = p.x - half - 8;
        const left = mine || roomR >= roomL;
        const maxW = mine ? Math.min(200, W * 0.5) : Math.max(104, Math.min(190, left ? roomR : roomL));
        const x = mine ? Math.min(Math.max(8, p.x - 22), W - maxW - 8) : Math.min(Math.max(8, left ? p.x + half : p.x - half - maxW), W - maxW - 8);
        const y = mine ? Math.max(minY, p.y - avSize / 2 - 14) : p.y + avSize / 2 + 8;
        return (
          <motion.div key={b.id} className={`seatbubble ${mine ? 'up' : left ? 'l' : 'r'}`}
            style={{ left: x, top: y, maxWidth: maxW, ['--sc' as string]: SEAT_COLORS[b.seat % 4], justifyContent: !mine && !left ? 'flex-end' : 'flex-start', width: maxW }}
            initial={{ opacity: 0, scale: 0.5, y: mine ? 10 : 0 }} animate={{ opacity: 1, scale: 1, y: mine ? '-100%' : '-50%' }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }} aria-hidden>
            <span>{b.text}</span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
