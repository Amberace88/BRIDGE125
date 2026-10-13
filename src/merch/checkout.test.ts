import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSellable, merchCheckoutAvailable, merchStatus, startMerchCheckout, type MerchStatus } from './checkout';
import { safeUrl, timelineStep } from './orders';

afterEach(() => vi.unstubAllGlobals());

const ST: MerchStatus = { enabled: true, providers: ['gelato'], sellable: { 'tee-queen': ['ink/L'], 'mug-seven': ['white/*'] }, zones: [] };

describe('merch checkout client', () => {
  it('knows which exact variants are sellable', () => {
    expect(isSellable(ST, { productId: 'tee-queen', colour: 'ink', size: 'L' })).toBe(true);
    expect(isSellable(ST, { productId: 'tee-queen', colour: 'ink', size: 'M' })).toBe(false);
    expect(isSellable(ST, { productId: 'mug-seven', colour: null, size: null })).toBe(true);   // single colour defaults
    expect(isSellable({ ...ST, enabled: false }, { productId: 'mug-seven', colour: null, size: null })).toBe(false);
  });

  it('is unavailable when the Worker says so (or is unreachable)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ enabled: false, providers: [], sellable: {}, zones: [] })));
    await merchStatus(true);
    expect(await merchCheckoutAvailable()).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await merchStatus(true);
    expect(await merchCheckoutAvailable()).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(ST)));
    await merchStatus(true);
    expect(await merchCheckoutAvailable()).toBe(true);
    expect(await merchCheckoutAvailable([{ productId: 'tee-queen', colour: 'ink', size: 'L', qty: 1 }])).toBe(true);
    expect(await merchCheckoutAvailable([{ productId: 'tee-queen', colour: 'ink', size: 'XS', qty: 1 }])).toBe(false);
  });

  it('maps Worker answers to checkout errors and only follows Stripe URLs', async () => {
    const reply = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
    const item = [{ productId: 'mug-seven', colour: null, size: null, qty: 1 }];
    expect(await startMerchCheckout(item, { lang: 'lv', consent: false })).toEqual({ ok: false, error: 'consent' });
    reply(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    expect(await startMerchCheckout(item, { lang: 'lv', consent: true })).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    reply(200, { url: 'https://evil.example/pay' });
    expect(await startMerchCheckout(item, { lang: 'lv', consent: true })).toEqual({ ok: false, error: 'unavailable' });
    reply(503, { error: 'unavailable', reason: 'not_configured' });
    expect(await startMerchCheckout(item, { lang: 'lv', consent: true })).toEqual({ ok: false, error: 'unavailable' });
    reply(400, { error: 'region' });
    expect(await startMerchCheckout(item, { lang: 'lv', consent: true, country: 'KP' })).toEqual({ ok: false, error: 'region' });
    reply(400, { error: 'invalid' });
    expect(await startMerchCheckout(item, { lang: 'lv', consent: true })).toEqual({ ok: false, error: 'invalid' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await startMerchCheckout(item, { lang: 'lv', consent: true })).toEqual({ ok: false, error: 'network' });
  });

  it('order timeline + safe tracking links', () => {
    expect(['paid', 'processing', 'partially_shipped', 'shipped', 'delivered', 'refunded'].map(s => timelineStep(s as never))).toEqual([0, 1, 2, 2, 3, -1]);
    expect(safeUrl('https://track.example/1')).toBe('https://track.example/1');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('http://insecure.example')).toBeNull();
  });
});
