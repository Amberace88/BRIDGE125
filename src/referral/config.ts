/**
 * Invite friends. Keep in sync with `_referral_cfg()` in supabase/migration_014_daily_referrals.sql
 * (src/daily/daily.test.ts compares them).
 */
export const REFERRAL = {
  /** BM each — the new player and the friend who invited them */
  bm: 2000,
  /** games the new player must finish */
  games: 3,
  /** invite-only avatar frame (earned, never sold) */
  item: 'ach_fr_envoy',
  /** only accounts this young can be invited */
  max_age_days: 7,
  /** the inviter's BM stops after this many rewarded friends (the frame stays) */
  cap: 50,
  /** claims per inviter per day */
  daily_claims: 20,
} as const;

export const SITE = 'https://bridge125.com';
export const inviteLink = (code: string) => `${SITE}/?ref=${encodeURIComponent(code)}`;
export const dailyLink = (code?: string | null) => `${SITE}/daily${code ? `?ref=${encodeURIComponent(code)}` : ''}`;
/** Codes are 6–8 chars of A–Z / 2–9 (no 0/O/1/I). */
export const isRefCode = (s: string) => /^[A-Z2-9]{6,8}$/.test(s);
