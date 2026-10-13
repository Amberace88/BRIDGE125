// Profile photo: storage upload, the `profiles.avatar_url` column, and a tiny store so every avatar on screen
// updates the moment a photo is uploaded or removed (the app store only re-reads the profile on sign-in).

import { useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { getSupabase } from '../supabase';
import { safeAvatar } from './safeAvatar';

export const AVATAR_PX = 256;
const BUCKET = 'avatars';
const CACHE = 'b125.avatar';

export type AvatarErr = 'signin' | 'setup' | 'size' | 'type' | 'network' | 'denied' | 'generic';
export class AvatarError extends Error { readonly code: AvatarErr; constructor(code: AvatarErr) { super(code); this.code = code; } }

// ------------------------------------------------------------------ store
type Override = { uid: string; url: string } | null;
let override: Override = null;                // set by an upload/remove in this session (wins over the profile row)
const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getOverride = () => override;

function cacheGet(uid: string): string {
  try { const j = JSON.parse(localStorage.getItem(CACHE) ?? 'null'); return j?.uid === uid ? safeAvatar(j.url) : ''; } catch { return ''; }
}
function cacheSet(uid: string, url: string) { try { localStorage.setItem(CACHE, JSON.stringify({ uid, url })); } catch { /* */ } }

function setOverride(uid: string, url: string) { override = { uid, url }; cacheSet(uid, url); emit(); }

/** The signed-in player's photo url ('' when none / signed out). */
export function useAvatarUrl(): string {
  const app = useApp();
  const ov = useSyncExternalStore(subscribe, getOverride);
  const uid = app.session?.user.id;
  if (!uid) return '';
  if (ov && ov.uid === uid) return ov.url;
  const prof = app.profile as (typeof app.profile & { avatar_url?: string | null }) | null;
  if (prof && prof.id === uid) {
    const u = safeAvatar(prof.avatar_url);
    if (u !== cacheGet(uid)) cacheSet(uid, u);
    return u;
  }
  return cacheGet(uid);                       // instant paint before the profile row arrives
}

// ------------------------------------------------------------------ image → 256² blob
/** k = displayed px per image px, (x, y) = image centre offset from the circle centre (displayed px), d = circle diameter. */
export interface Crop { k: number; x: number; y: number; d: number }

/** Render what is inside the crop circle into a square 256×256 WebP (JPEG fallback). */
export async function renderAvatar(img: HTMLImageElement, crop: Crop): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  const c = document.createElement('canvas');
  c.width = c.height = AVATAR_PX;
  const g = c.getContext('2d');
  if (!g) throw new AvatarError('generic');
  const f = AVATAR_PX / crop.d;
  const w = img.naturalWidth * crop.k * f, h = img.naturalHeight * crop.k * f;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.fillStyle = '#0b1512'; g.fillRect(0, 0, AVATAR_PX, AVATAR_PX);
  g.drawImage(img, AVATAR_PX / 2 + crop.x * f - w / 2, AVATAR_PX / 2 + crop.y * f - h / 2, w, h);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>(res => c.toBlob(res, type, q));
  const webp = await toBlob('image/webp', 0.86);
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpg = await toBlob('image/jpeg', 0.88);                          // Safari < 17 cannot encode WebP
  if (!jpg) throw new AvatarError('generic');
  return { blob: jpg, ext: 'jpg' };
}

/** Load a picked file into an <img>. Browsers apply EXIF orientation for us. */
export function loadImage(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  return new Promise((res, rej) => {
    if (!file.type.startsWith('image/')) { rej(new AvatarError('type')); return; }
    if (file.size > 40 * 1024 * 1024) { rej(new AvatarError('size')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); rej(new AvatarError('type')); };   // e.g. HEIC on desktop Chrome
    img.src = url;
  });
}

// ------------------------------------------------------------------ supabase
function mapErr(e: unknown): AvatarError {
  if (e instanceof AvatarError) return e;
  const m = String((e as { message?: string })?.message ?? e).toLowerCase();
  const code = String((e as { code?: string; statusCode?: string })?.code ?? (e as { statusCode?: string })?.statusCode ?? '');
  if (m.includes('bucket not found') || m.includes('avatar_url') || code === 'PGRST204' || code === '42703') return new AvatarError('setup');
  if (m.includes('maximum allowed size') || m.includes('too large') || code === '413') return new AvatarError('size');
  if (m.includes('mime') || m.includes('invalid_mime')) return new AvatarError('type');
  if (m.includes('row-level security') || m.includes('unauthorized') || code === '403' || code === '42501') return new AvatarError('denied');
  if (m.includes('fetch') || m.includes('network')) return new AvatarError('network');
  return new AvatarError('generic');
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new AvatarError('setup');
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new AvatarError('signin');
  return { sb, uid };
}

async function sweep(sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>, uid: string, keep: string) {
  try {
    const { data } = await sb.storage.from(BUCKET).list(uid, { limit: 50 });
    const old = (data ?? []).map(f => `${uid}/${f.name}`).filter(p => p !== keep);
    if (old.length) await sb.storage.from(BUCKET).remove(old);
  } catch { /* best effort */ }
}

export async function uploadAvatar(blob: Blob, ext: 'webp' | 'jpg'): Promise<string> {
  try {
    const { sb, uid } = await client();
    const path = `${uid}/avatar-${Date.now()}.${ext}`;
    const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (up.error) throw up.error;
    const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from('profiles').update({ avatar_url: url }).eq('id', uid);
    if (error) { await sb.storage.from(BUCKET).remove([path]).catch(() => {}); throw error; }
    setOverride(uid, safeAvatar(url) || url);
    void sweep(sb, uid, path);
    return url;
  } catch (e) { throw mapErr(e); }
}

export async function removeAvatar(): Promise<void> {
  try {
    const { sb, uid } = await client();
    const { error } = await sb.from('profiles').update({ avatar_url: null }).eq('id', uid);
    if (error) throw error;
    setOverride(uid, '');
    void sweep(sb, uid, '');
  } catch (e) { throw mapErr(e); }
}
