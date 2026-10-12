import '../styles/role.css';

export type Role = 'player' | 'admin' | 'god' | string | null | undefined;

/**
 * Role chip for the profile header, leaderboard rows and the admin users table.
 *   admin → "ADMIN" (brass gold) · god → "GOD MODE" (iridescent) · player / unknown → nothing.
 * `size="xs"` is the compact variant for dense lists.
 */
export function RoleBadge({ role, size = 'md', className = '' }: { role: Role; size?: 'xs' | 'md'; className?: string }) {
  if (role !== 'admin' && role !== 'god') return null;
  const god = role === 'god';
  return (
    <span className={`rbadge ${god ? 'god' : 'admin'} ${size} ${className}`.trim()} title={god ? 'GOD MODE · co-author & main tester' : 'Admin · owner'}>
      <i aria-hidden>{god ? '✦' : '♛'}</i>
      <span>{god ? 'GOD MODE' : 'ADMIN'}</span>
    </span>
  );
}
