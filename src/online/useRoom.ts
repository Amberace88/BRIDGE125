import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, GameState } from '../engine/engine';
import type { Emote } from '../screens/Table';
import type { ChatMsg, QuickKey } from '../social/sanitize';
import type { GiftEvent, SeatGift, SocialError, TipEvent } from '../social/gifts';
import { playerId } from './ids';

/**
 * `acct` = the seat is signed in to an account (can receive tips / gifted styles).
 * `uid` = that account's user id, verified by the room from the seat's own Supabase token (`hello`) — never a value a
 * client claimed. Used only to show the seat's public cosmetics (public_cosmetics RPC); emails never reach clients.
 */
export interface RoomSeat { name: string; bot: boolean; online: boolean; host: boolean; acct?: boolean; uid?: string }
export interface RoomInfo { code: string; status: 'lobby' | 'playing'; maxSeats: number; seats: RoomSeat[]; quick?: boolean }

/** Media/WebRTC traffic is handed to subscribers instead of React state (see src/media/mesh.ts). */
export type MediaMsg = { t: 'open' | 'rtc' | 'media' | 'mediaAll'; [k: string]: unknown };
const MEDIA_T = new Set(['rtc', 'media', 'mediaAll']);

/** Result of a server-checked social action (gift / tip / report). */
export interface SocialResult { ok: boolean; error?: SocialError; bm?: number; diamonds?: number; need?: number; cur?: 'bm' | 'dm'; left?: number }

export { findQuickMatch, isQuickCode, newRoomCode, playerId } from './ids';

/**
 * @param token the player's Supabase access token (optional). Sent as `{t:'hello'}` so the room knows the seat has an
 *              account (gift / tip target); sent again with every gift / tip / report so the server charges *this* player.
 */
export function useRoom(code: string, name: string, token?: string | null) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [you, setYou] = useState(-1);
  const [isHost, setIsHost] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [turnMs, setTurnMs] = useState(30000);
  const [offline, setOffline] = useState<number[]>([]);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'reconnecting' | 'closed'>('connecting');
  const [error, setError] = useState<string | null>(null);
  // social layer
  const [chat, setChat] = useState<ChatMsg[]>([]);
  /** id of the last message that arrived as history (on connect) — those count as read and get no seat bubble */
  const [chatBase, setChatBase] = useState(0);
  const [chatErr, setChatErr] = useState<{ at: number; wait: number } | null>(null);
  const [seatGifts, setSeatGifts] = useState<SeatGift[]>([]);
  const [giftFx, setGiftFx] = useState<GiftEvent[]>([]);
  const [tipFx, setTipFx] = useState<TipEvent[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef(0);
  const closedByUs = useRef(false);
  const skew = useRef(0);
  const mediaSubs = useRef(new Set<(m: MediaMsg) => void>());
  const toMedia = (m: MediaMsg) => { for (const fn of mediaSubs.current) { try { fn(m); } catch { /* */ } } };
  const tokenRef = useRef(token ?? null);
  useEffect(() => { tokenRef.current = token ?? null; }, [token]);
  const pending = useRef(new Map<string, (r: SocialResult) => void>());
  const ridSeq = useRef(0);

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/api/room/${code}/ws?pid=${encodeURIComponent(playerId())}&name=${encodeURIComponent(name)}`;
    const sock = new WebSocket(url);
    ws.current = sock;
    sock.onopen = () => {
      setStatus('open'); retry.current = 0; toMedia({ t: 'open' });
      if (tokenRef.current) { try { sock.send(JSON.stringify({ t: 'hello', token: tokenRef.current })); } catch { /* */ } }
    };
    sock.onmessage = ev => {
      let m: any; try { m = JSON.parse(ev.data); } catch { return; }
      if (MEDIA_T.has(m.t)) { toMedia(m); return; }
      if (m.t === 'state') {
        setRoom(m.room); setYou(m.you); setIsHost(m.isHost); setTurnMs(m.turnMs); setOffline(m.offline ?? []);
        setDeadline(m.deadline ? m.deadline - skew.current : null);
        setGame(m.game);
        if (Array.isArray(m.chat)) { setChat(m.chat); setChatBase(m.chat.length ? m.chat[m.chat.length - 1].id : 0); }
      } else if (m.t === 'emote') {
        setEmotes(list => [...list.slice(-8), { id: m.id, seat: m.seat, e: m.e }]);
        setTimeout(() => setEmotes(list => list.filter(x => x.id !== m.id)), 2600);
      } else if (m.t === 'chat') {
        const { t: _t, ...msg } = m;
        setChat(list => (list.some(x => x.id === msg.id) ? list : [...list.slice(-49), msg as ChatMsg]));
      } else if (m.t === 'chatErr') {
        setChatErr({ at: Date.now(), wait: Number(m.wait) || 0 });
      } else if (m.t === 'gifts') {
        setSeatGifts(Array.isArray(m.list) ? m.list : []);
      } else if (m.t === 'gift') {
        const g: GiftEvent = { id: m.id, from: m.from, to: m.to, gift: m.gift, fromName: m.fromName };
        setGiftFx(list => [...list.slice(-5), g]);
      } else if (m.t === 'tip') {
        const tp: TipEvent = { id: m.id, from: m.from, to: m.to, amount: m.amount, fromName: m.fromName };
        setTipFx(list => [...list.slice(-5), tp]);
      } else if (m.t === 'giftResult' || m.t === 'tipResult' || m.t === 'reportResult') {
        const fn = pending.current.get(String(m.rid));
        if (fn) { pending.current.delete(String(m.rid)); fn(m as SocialResult); }
      } else if (m.t === 'error') {
        setError(m.code); closedByUs.current = true;
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
  }, [code, name]);

  useEffect(() => {
    closedByUs.current = false;
    connect();
    const ping = setInterval(() => { try { ws.current?.readyState === 1 && ws.current.send('{"t":"ping"}'); } catch { /* */ } }, 25000);
    const vis = () => { if (document.visibilityState === 'visible' && ws.current && ws.current.readyState > 1 && !closedByUs.current) connect(); };
    document.addEventListener('visibilitychange', vis);
    return () => { closedByUs.current = true; clearInterval(ping); document.removeEventListener('visibilitychange', vis); ws.current?.close(); };
  }, [connect]);

  const send = useCallback((m: object) => { try { ws.current?.send(JSON.stringify(m)); } catch { /* */ } }, []);
  const act = useCallback((a: Action) => send({ t: 'act', a }), [send]);
  const onMedia = useCallback((fn: (m: MediaMsg) => void) => { mediaSubs.current.add(fn); return () => { mediaSubs.current.delete(fn); }; }, []);
  const leave = useCallback(() => { send({ t: 'leave' }); closedByUs.current = true; }, [send]);

  // sign in / out while seated → tell the room (the token itself refreshes hourly; only the account matters here)
  const signedIn = !!token;
  useEffect(() => {
    if (ws.current?.readyState === 1) send({ t: 'hello', token: tokenRef.current });
  }, [signedIn, send]);

  /** Send with a request id; resolves with the server's verdict (or a network error after 12 s). */
  const request = useCallback((m: Record<string, unknown>): Promise<SocialResult> => new Promise(resolve => {
    if (ws.current?.readyState !== 1) { resolve({ ok: false, error: 'network' }); return; }
    if (!tokenRef.current) { resolve({ ok: false, error: 'auth' }); return; }
    const rid = `${Date.now().toString(36)}${++ridSeq.current}`;
    pending.current.set(rid, resolve);
    setTimeout(() => { const fn = pending.current.get(rid); if (fn) { pending.current.delete(rid); fn({ ok: false, error: 'network' }); } }, 12000);
    send({ ...m, rid, token: tokenRef.current });
  }), [send]);

  const sendChat = useCallback((text: string) => send({ t: 'chat', text }), [send]);
  const sendQuick = useCallback((q: QuickKey) => send({ t: 'chat', q }), [send]);
  const sendGift = useCallback((to: number, gift: string) => request({ t: 'gift', to, gift }), [request]);
  const sendTip = useCallback((to: number, amount: number) => request({ t: 'tip', to, amount }), [request]);
  const report = useCallback((id: number) => request({ t: 'report', id }), [request]);
  /** A gift's flight finished: it now sits on the receiver's seat for the rest of the game. */
  const giftFxRef = useRef(giftFx);
  useEffect(() => { giftFxRef.current = giftFx; }, [giftFx]);
  const doneGift = useCallback((id: number) => {
    const g = giftFxRef.current.find(x => x.id === id);
    if (g) setSeatGifts(sg => [...sg.slice(-39), [g.to, g.gift]]);
    setGiftFx(list => list.filter(x => x.id !== id));
  }, []);
  const doneTip = useCallback((id: number) => setTipFx(list => list.filter(x => x.id !== id)), []);

  return {
    room, game, you, isHost, deadline, turnMs, offline, emotes, status, error, send, act, leave, onMedia,
    chat, chatBase, chatErr, seatGifts, giftFx, tipFx, sendChat, sendQuick, sendGift, sendTip, report, doneGift, doneTip,
  };
}

export type RoomApi = ReturnType<typeof useRoom>;
