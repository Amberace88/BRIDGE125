/** Only public files in our Supabase `avatars/<uid>/` bucket folder are ever used as an <img src>. */
const AV_OK = /^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/avatars\/[0-9a-f-]{36}\/[\w.-]{1,80}$/i;
export const safeAvatar = (u: string | null | undefined) => (u && AV_OK.test(u) ? u : '');
