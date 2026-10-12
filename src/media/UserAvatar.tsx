import { useState } from 'react';
import { useApp } from '../store';
import { useAvatarUrl } from './avatar';

/**
 * The signed-in player's avatar: profile photo → chosen emoji → initial.
 * Drop-in for the Home nav chip:  <UserAvatar size={32} className="avatar sm" />
 */
export function UserAvatar({ size = 32, className = '', ring = false }: { size?: number; className?: string; ring?: boolean }) {
  const app = useApp();
  const url = useAvatarUrl();
  const [broken, setBroken] = useState('');
  const label = app.avatar || (app.name || app.session?.user.email || '?').slice(0, 1).toUpperCase();
  const photo = url && broken !== url;
  return (
    <span className={`uav ${ring ? 'ring' : ''} ${photo ? 'photo' : ''} ${className}`.trim()}
      style={{ width: size, height: size, fontSize: size * (app.avatar ? 0.46 : 0.4) }}>
      {photo
        ? <img src={url} alt="" width={size} height={size} draggable={false} decoding="async" onError={() => setBroken(url)} />
        : <span>{label}</span>}
    </span>
  );
}

/** Any player's face for media UI: photo url if given, otherwise an initial on felt. */
export function FaceAvatar({ url, name, size }: { url?: string; name: string; size: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="uav face" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {url && !broken
        ? <img src={url} alt="" draggable={false} decoding="async" onError={() => setBroken(true)} />
        : <span>{(name || '?').slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}
