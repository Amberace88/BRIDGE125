import { describe, expect, it } from 'vitest';
import sql10 from '../../supabase/migration_010_social.sql?raw';
import { CHAT_MAX, RateLimiter, isQuickKey, maskProfanity, sanitizeChat } from './sanitize';
import { DIAMOND_PACKS, GIFTS, itemDiamondPrice } from './gifts';
import { hmacSha256Hex, parseStripeSignature, timingSafeEqualHex, verifyStripeSignature } from '../../worker/pay';
import { SOCIAL_STRINGS } from '../i18n/social';
import { missingKeys } from '../i18n/pick';

describe('chat sanitizer', () => {
  it('strips control / bidi / zero-width characters and collapses whitespace', () => {
    expect(sanitizeChat('  hi\u0000\u0007 \n\n there‮​  ')!.text).toBe('hi there');
    expect(sanitizeChat('a\tb\r\nc')!.text).toBe('a b c');
  });
  it('keeps emoji ZWJ sequences intact', () => {
    expect(sanitizeChat('👨‍👩‍👧 gg')!.text).toBe('👨‍👩‍👧 gg');
  });
  it('rejects empty and non-string input', () => {
    expect(sanitizeChat('   ​ ')).toBeNull();
    expect(sanitizeChat(42)).toBeNull();
    expect(sanitizeChat(null)).toBeNull();
  });
  it('caps length at CHAT_MAX code points (emoji count as one)', () => {
    expect(Array.from(sanitizeChat('x'.repeat(500))!.text.replace(/x{8,}/g, m => m)).length).toBeLessThanOrEqual(CHAT_MAX);
    expect(Array.from(sanitizeChat('ab '.repeat(100))!.text).length).toBeLessThanOrEqual(CHAT_MAX);
    const emo = sanitizeChat('🔥 '.repeat(100))!.text;
    expect(Array.from(emo).length).toBeLessThanOrEqual(CHAT_MAX);
    expect(emo.endsWith('\uD83D')).toBe(false);   // never cuts a surrogate pair
  });
  it('limits long character runs and replaces links', () => {
    expect(sanitizeChat('noooooooooooooooo!')!.text).toBe('nooooooo!');
    const l = sanitizeChat('free BM at https://evil.example/x or bm-gift.xyz now')!;
    expect(l.links).toBe(true);
    expect(l.text).not.toMatch(/evil|xyz/);
  });
  it('masks profanity in en / lv / ru / uk / de / pl', () => {
    for (const w of ['fuck', 'Fucking', 'sh1t', 'pizdec', 'pimpis', 'сука', 'блять', 'пиздец', 'нахуй', 'курва', 'scheiße', 'Arschloch', 'kurwa', 'spierdalaj', 'dick']) {
      const r = maskProfanity(`oh ${w}!`);
      expect(r.masked, w).toBe(true);
      expect(r.text, w).not.toContain(w.slice(1));
    }
  });
  it('does not mask innocent words', () => {
    for (const w of ['рубля', 'Херсон', 'fickle', 'Dickens', 'assassin', 'class', 'Fukushima', 'Scunthorpe?', 'cocktail', 'skuce', 'суккулент']) {
      expect(maskProfanity(w).masked, w).toBe(false);
    }
  });
  it('quick phrase keys are whitelisted', () => {
    expect(isQuickKey('gl')).toBe(true);
    expect(isQuickKey('<script>')).toBe(false);
  });
});

describe('chat rate limit', () => {
  it('allows 5 messages per 10 s per player, then blocks until the window slides', () => {
    const rl = new RateLimiter(5, 10_000);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rl.allow('p1', t0 + i * 100)).toBe(true);
    expect(rl.allow('p1', t0 + 600)).toBe(false);
    expect(rl.allow('p2', t0 + 600)).toBe(true);           // other players unaffected
    expect(rl.waitMs('p1', t0 + 600)).toBe(9_400);
    expect(rl.allow('p1', t0 + 10_001)).toBe(true);         // the first hit left the window
    expect(rl.allow('p1', t0 + 10_050)).toBe(false);
  });
});

describe('Stripe webhook signature (Web Crypto HMAC-SHA256)', () => {
  const secret = 'whsec_test_123';
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });
  const now = 1_760_000_000;
  const header = async (t: number, b = body, s = secret) => `t=${t},v1=${await hmacSha256Hex(s, `${t}.${b}`)}`;

  it('matches a known HMAC-SHA256 vector', async () => {
    // RFC 4231 test case 2
    expect(await hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
  it('accepts a valid signature', async () => {
    expect(await verifyStripeSignature(body, await header(now), secret, now)).toBe('ok');
  });
  it('accepts when any of several v1 signatures matches (secret rotation)', async () => {
    const good = await header(now);
    const bad = `v1=${'0'.repeat(64)}`;
    expect(await verifyStripeSignature(body, `${good.split(',')[0]},${bad},${good.split(',')[1]}`, secret, now)).toBe('ok');
  });
  it('rejects a tampered body, a wrong secret, a stale timestamp and junk headers', async () => {
    expect(await verifyStripeSignature(body + ' ', await header(now), secret, now)).toBe('mismatch');
    expect(await verifyStripeSignature(body, await header(now, body, 'whsec_other'), secret, now)).toBe('mismatch');
    expect(await verifyStripeSignature(body, await header(now - 301), secret, now)).toBe('stale');
    expect(await verifyStripeSignature(body, await header(now + 301), secret, now)).toBe('stale');
    expect(await verifyStripeSignature(body, await header(now - 299), secret, now)).toBe('ok');
    expect(await verifyStripeSignature(body, null, secret, now)).toBe('missing');
    expect(await verifyStripeSignature(body, 'garbage', secret, now)).toBe('malformed');
    expect(await verifyStripeSignature(body, `t=${now},v0=abc`, secret, now)).toBe('malformed');
  });
  it('parses headers and compares in constant time', () => {
    expect(parseStripeSignature(`t=12,v1=${'a'.repeat(64)},v0=zz`)).toEqual({ t: 12, v1: ['a'.repeat(64)] });
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false);
  });
});

describe('catalogues match migration_010', () => {
  it('gift prices', () => {
    const block = sql10.slice(sql10.indexOf('insert into public.gift_catalog'), sql10.indexOf('on conflict', sql10.indexOf('insert into public.gift_catalog')));
    const rows = [...block.matchAll(/\('(\w+)',\s*(null|\d+),\s*(null|\d+),/g)].map(m => ({ id: m[1], bm: m[2] === 'null' ? null : +m[2], dm: m[3] === 'null' ? null : +m[3] }));
    expect(rows.map(r => r.id)).toEqual(GIFTS.map(g => g.id));
    for (const g of GIFTS) {
      const r = rows.find(x => x.id === g.id)!;
      expect(g.cur === 'bm' ? r.bm : r.dm, g.id).toBe(g.price);
      expect(g.cur === 'bm' ? r.dm : r.bm, g.id).toBeNull();
    }
  });
  it('diamond packs', () => {
    const block = sql10.slice(sql10.indexOf('insert into public.diamond_packs'), sql10.indexOf('on conflict', sql10.indexOf('insert into public.diamond_packs')));
    const rows = [...block.matchAll(/\('(\w+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*'eur'/g)].map(m => ({ id: m[1], d: +m[2], bonus: +m[3], cents: +m[4] }));
    expect(rows).toEqual(DIAMOND_PACKS.map(p => ({ id: p.id, d: p.diamonds, bonus: p.bonusPct, cents: p.cents })));
  });
  it('gifted style price formula', () => {
    expect(sql10).toContain('greatest(10, (ceil(greatest(price_bm, 0) / 250.0) * 10)::int)');
    expect(itemDiamondPrice(6000)).toBe(240);
    expect(itemDiamondPrice(1500)).toBe(60);
    expect(itemDiamondPrice(3)).toBe(10);
    expect(itemDiamondPrice(27900)).toBe(1120);
  });
  it('payment functions are service_role only', () => {
    expect(sql10).toMatch(/revoke execute on function public\.credit_diamonds\([^)]*\) from public, anon, authenticated;/);
    expect(sql10).toMatch(/grant execute on function public\.credit_diamonds\([^)]*\) to service_role;/);
    expect(sql10).toMatch(/revoke execute on function public\.refund_payment\([^)]*\) from public, anon, authenticated;/);
  });
});

describe('social strings', () => {
  it('lv / ru / uk are complete', () => {
    for (const l of ['lv', 'ru', 'uk']) expect(missingKeys(SOCIAL_STRINGS.en, SOCIAL_STRINGS[l]), l).toEqual([]);
  });
  it('every gift has a name in every language', () => {
    for (const l of ['en', 'lv', 'ru', 'uk']) for (const g of GIFTS) expect(SOCIAL_STRINGS[l]!.gift.names[g.id], `${l} ${g.id}`).toBeTruthy();
  });
});
