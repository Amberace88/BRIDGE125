import { useState } from 'react';
import { safeAvatar } from '../media/safeAvatar';
import '../styles/role.css';

/**
 * Any player's avatar from leaderboard / admin rows: photo url → emoji → initial.
 * The url is validated (only our Supabase avatars bucket) before it is used as an <img src>.
 */
export function AvatarImg({ url, emoji, name, size = 36, className = '' }: { url?: string | null; emoji?: string | null; name?: string | null; size?: number; className?: string }) {
  const src = safeAvatar(url);
  const [broken, setBroken] = useState('');
  const photo = !!src && broken !== src;
  const em = (emoji ?? '').trim();
  const label = em || (name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span className={`avi ${photo ? 'photo' : em ? 'emoji' : 'init'} ${className}`.trim()} style={{ width: size, height: size, fontSize: size * (em ? 0.5 : 0.42) }}>
      {photo
        ? <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} onError={() => setBroken(src)} />
        : <span>{label}</span>}
    </span>
  );
}
