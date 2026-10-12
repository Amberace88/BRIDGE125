import { DurableObject } from 'cloudflare:workers';
import type { Env } from './room';

/** How long a quick-match table waits for strangers before bots fill the empty seats. */
export const QUICK_WAIT_MS = 20_000;
/** Stop sending new players to a table this close to its start, so they don't arrive as it fills. */
const CUTOFF_MS = 4_000;
const SEATS = 4;
const ALPHA = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789';

interface Open { code: string; at: number; pids: string[] }

/** Quick-match codes are 6 characters starting with Q; private codes are 5, so the two never collide. */
export const isQuickCode = (code: string) => code.length === 6 && code[0] === 'Q';

function quickCode(): string {
  const a = new Uint32Array(5); crypto.getRandomValues(a);
  return 'Q' + [...a].map(n => ALPHA[n % ALPHA.length]).join('');
}

/** Single global matchmaker: hands everybody who presses "Play online" the same open table until it is full or about to start. */
export class Lobby extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pid = (url.searchParams.get('pid') ?? '').slice(0, 40);
    const skip = (url.searchParams.get('skip') ?? '').toUpperCase();
    if (!pid) return Response.json({ error: 'pid required' }, { status: 400 });

    const now = Date.now();
    let open = await this.ctx.storage.get<Open>('open');
    const usable = open && open.code !== skip && now < open.at + QUICK_WAIT_MS - CUTOFF_MS && open.pids.length < SEATS;
    if (open && usable && open.pids.includes(pid)) return Response.json({ code: open.code, startAt: open.at + QUICK_WAIT_MS });
    if (!open || !usable) open = { code: quickCode(), at: now, pids: [] };
    open.pids.push(pid);
    if (open.pids.length >= SEATS) await this.ctx.storage.delete('open');
    else await this.ctx.storage.put('open', open);
    return Response.json({ code: open.code, startAt: open.at + QUICK_WAIT_MS }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
