import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMsg, QuickKey } from '../../social/sanitize';
import type { SocialResult } from '../../online/useRoom';
import { playerId } from '../../online/ids';
import type { OnlineGameId, RoomInfo, StateMsg } from './protocol';

export interface RoomEmote { id: number; seat: number; e: string }

/**
 * One online mini-game table (worker/gameroom.ts). The server is the authority: this hook only sends intents
 * (`act`, `next`, `rematch` …) and renders whatever view the server sends for my seat. Reconnects with backoff;
 * the server gives the seat back by player id.
 */
export function useGameRoom(game: OnlineGameId, code: string, name: string, token?: string | null) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [view, setView] = useState<unknown | null>(null);
  const [you, setYou] = useState(-1);
  const [isHost, setIsHost] = useState(false);
  const [actor, setActor] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [turnMs, setTurnMs] = useState(30_000);
  const [status, setStatus] = useState<'connecting' | 'open' | 'reconnecting' | 'closed'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [emotes, setEmotes] = useState<RoomEmote[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatBase, setChatBase] = useState(0);
  const [chatErr, setChatErr] = useState<{ at: number; wait: number } | null>(null);
  /** bumps when the server turned an action down (the table re-renders from the server's state) */
  const [rejects, setRejects] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef(0);
  const closedByUs = useRef(false);
  const tokenRef = useRef(token ?? null);
  useEffect(() => { tokenRef.current = token ?? null; }, [token]);
  const pending = useRef(new Map<string, (r: SocialResult) => void>());
  const ridSeq = useRef(0);
  const nameRef = useRef(name);
  nameRef.current = name;

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/api/g/${game}/room/${code}/ws?pid=${encodeURIComponent(playerId())}&name=${encodeURIComponent(nameRef.current)}`;
    const sock = new WebSocket(url);
    ws.current = sock;
    sock.onopen = () => { setStatus('open'); retry.current = 0; };
    sock.onmessage = ev => {
      let m: StateMsg & { t: string; chat?: ChatMsg[]; [k: string]: unknown };
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'state') {
        const skew = Date.now() - m.now;
        setRoom(m.room); setYou(m.you); setIsHost(m.isHost); setActor(m.actor); setTurnMs(m.turnMs);
        setDeadline(m.deadline ? m.deadline + skew : null);
        setView(m.view);
        if (Array.isArray(m.chat)) { setChat(m.chat); setChatBase(m.chat.length ? m.chat[m.chat.length - 1].id : 0); }
      } else if (m.t === 'emote') {
        const e = { id: Number(m.id), seat: Number(m.seat), e: String(m.e) };
        setEmotes(list => [...list.slice(-8), e]);
        setTimeout(() => setEmotes(list => list.filter(x => x.id !== e.id)), 2600);
      } else if (m.t === 'chat') {
        const { t: _t, ...line } = m;
        setChat(list => (list.some(x => x.id === line.id) ? list : [...list.slice(-49), line as unknown as ChatMsg]));
      } else if (m.t === 'chatErr') {
        setChatErr({ at: Date.now(), wait: Number(m.wait) || 0 });
      } else if (m.t === 'reject') {
        setRejects(n => n + 1);
      } else if (m.t === 'reportResult') {
        const fn = pending.current.get(String(m.rid));
        if (fn) { pending.current.delete(String(m.rid)); fn(m as unknown as SocialResult); }
      } else if (m.t === 'error') {
        setError(String(m.code)); closedByUs.current = true;
      }
    };
    sock.onclose = () => {
      for (const fn of pending.current.values()) fn({ ok: false, error: 'network' });
      pending.current.clear();
      if (closedByUs.current) { setStatus('closed'); return; }
      setStatus('reconnecting');
      const d = Math.min(8000, 500 * 2 ** retry.current++);
      setTimeout(() => { if (!closedByUs.current) connect(); }, d);
    };
  }, [game, code]);

  useEffect(() => {
    closedByUs.current = false;
    setError(null);
    connect();
    const ping = setInterval(() => { try { if (ws.current?.readyState === 1) ws.current.send('{"t":"ping"}'); } catch { /* */ } }, 25_000);
    const vis = () => { if (document.visibilityState === 'visible' && ws.current && ws.current.readyState > 1 && !closedByUs.current) connect(); };
    document.addEventListener('visibilitychange', vis);
    return () => { closedByUs.current = true; clearInterval(ping); document.removeEventListener('visibilitychange', vis); ws.current?.close(); };
  }, [connect]);

  const send = useCallback((m: object) => { try { if (ws.current?.readyState === 1) ws.current.send(JSON.stringify(m)); } catch { /* */ } }, []);
  const act = useCallback((a: unknown) => send({ t: 'act', a }), [send]);
  const leave = useCallback(() => { send({ t: 'leave' }); closedByUs.current = true; }, [send]);
  const sendChat = useCallback((text: string) => send({ t: 'chat', text }), [send]);
  const sendQuick = useCallback((q: QuickKey) => send({ t: 'chat', q }), [send]);
  const report = useCallback((id: number): Promise<SocialResult> => new Promise(resolve => {
    if (ws.current?.readyState !== 1) { resolve({ ok: false, error: 'network' }); return; }
    if (!tokenRef.current) { resolve({ ok: false, error: 'auth' }); return; }
    const rid = `${Date.now().toString(36)}${++ridSeq.current}`;
    pending.current.set(rid, resolve);
    setTimeout(() => { const fn = pending.current.get(rid); if (fn) { pending.current.delete(rid); fn({ ok: false, error: 'network' }); } }, 12_000);
    send({ t: 'report', id, rid, token: tokenRef.current });
  }), [send]);

  return { room, view, you, isHost, actor, deadline, turnMs, status, error, emotes, chat, chatBase, chatErr, rejects, send, act, leave, sendChat, sendQuick, report };
}

export type GameRoomApi = ReturnType<typeof useGameRoom>;

/** Ask the game's matchmaker for a public table. `skip` avoids being sent back to a table that just turned us away. */
export async function findGameMatch(game: OnlineGameId, skip = ''): Promise<string> {
  const r = await fetch(`/api/g/${game}/quick?pid=${encodeURIComponent(playerId())}&skip=${encodeURIComponent(skip)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('quick ' + r.status);
  const j = await r.json() as { code?: string };
  if (!j.code) throw new Error('quick: no code');
  return j.code;
}
