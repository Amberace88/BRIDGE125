import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, GameState } from '../engine/engine';
import type { Emote } from '../screens/Table';

export interface RoomSeat { name: string; bot: boolean; online: boolean; host: boolean }
export interface RoomInfo { code: string; status: 'lobby' | 'playing'; maxSeats: number; seats: RoomSeat[]; quick?: boolean }

export const isQuickCode = (code: string) => code.length === 6 && code[0] === 'Q';

/** Ask the matchmaker for a public table. `skip` avoids being sent back to a table that just turned us away. */
export async function findQuickMatch(skip = ''): Promise<string> {
  const r = await fetch(`/api/quick?pid=${encodeURIComponent(playerId())}&skip=${encodeURIComponent(skip)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('quick ' + r.status);
  const j = await r.json() as { code?: string };
  if (!j.code) throw new Error('quick: no code');
  return j.code;
}

export function playerId(): string {
  try {
    let id = localStorage.getItem('b125.pid');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('b125.pid', id); }
    return id;
  } catch { return 'anon-' + Math.random().toString(36).slice(2); }
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRoomCode(): string {
  const a = new Uint32Array(5); crypto.getRandomValues(a);
  return [...a].map(n => ALPHA[n % ALPHA.length]).join('');
}

export function useRoom(code: string, name: string) {
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
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef(0);
  const closedByUs = useRef(false);
  const skew = useRef(0);

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/api/room/${code}/ws?pid=${encodeURIComponent(playerId())}&name=${encodeURIComponent(name)}`;
    const sock = new WebSocket(url);
    ws.current = sock;
    sock.onopen = () => { setStatus('open'); retry.current = 0; };
    sock.onmessage = ev => {
      let m: any; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'state') {
        setRoom(m.room); setYou(m.you); setIsHost(m.isHost); setTurnMs(m.turnMs); setOffline(m.offline ?? []);
        setDeadline(m.deadline ? m.deadline - skew.current : null);
        setGame(m.game);
      } else if (m.t === 'emote') {
        setEmotes(list => [...list.slice(-8), { id: m.id, seat: m.seat, e: m.e }]);
        setTimeout(() => setEmotes(list => list.filter(x => x.id !== m.id)), 2600);
      } else if (m.t === 'error') {
        setError(m.code); closedByUs.current = true;
      }
    };
    sock.onclose = () => {
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
  const leave = useCallback(() => { send({ t: 'leave' }); closedByUs.current = true; }, [send]);

  return { room, game, you, isHost, deadline, turnMs, offline, emotes, status, error, send, act, leave };
}
