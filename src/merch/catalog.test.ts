/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MERCH_STRINGS } from '../i18n/merch';
import { PRODUCTS, isEmail, priceFor, variantLabel } from './catalog';
import { MERCH_CHECKOUT, checkoutUrl } from './config';

const pub = (p: string) => join(process.cwd(), 'public', p.replace(/^\//, ''));

describe('merch catalogue', () => {
  it('has unique ids that the SQL accepts', () => {
    const ids = PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{2,40}$/);
    expect(PRODUCTS.filter(p => p.hero).map(p => p.id)).toEqual(['deck']);
  });

  it('every mockup and print design exists in public/merch', () => {
    for (const p of PRODUCTS) {
      expect(p.colours.length).toBeGreaterThan(0);
      for (const c of p.colours) for (const img of c.images) expect(existsSync(pub(img)), img).toBe(true);
      expect(existsSync(pub(`/merch/designs/${p.design}.svg`)), p.design).toBe(true);
    }
  });

  it('has copy for every product in every language', () => {
    for (const lang of ['en', 'lv', 'ru', 'uk']) {
      const s = MERCH_STRINGS[lang]!;
      for (const p of PRODUCTS) {
        expect(s.products[p.id]?.name, `${lang}:${p.id}`).toBeTruthy();
        for (const c of p.colours) expect(s.colours[c.id], `${lang}:${c.id}`).toBeTruthy();
      }
    }
  });

  it('prices sizes and labels variants', () => {
    const tee = PRODUCTS.find(p => p.id === 'tee-queen')!;
    expect(priceFor(tee, 'M')).toBe(32);
    expect(priceFor(tee, '3XL')).toBe(35);
    expect(variantLabel(tee, 'forest', 'L')).toBe('forest / L');
    const mug = PRODUCTS.find(p => p.id === 'mug-seven')!;
    expect(variantLabel(mug, 'white', null)).toBe('');
  });

  it('validates email like the RPC', () => {
    expect(isEmail('eddie@example.com')).toBe(true);
    expect(isEmail(' Eddie.Web+cards@mail.example.lv ')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('x@y.z')).toBe(false);
  });
});

describe('checkout hook', () => {
  it('stays in notify mode while no link is configured', () => {
    for (const p of PRODUCTS) expect(p.id in MERCH_CHECKOUT, p.id).toBe(true);
    expect(checkoutUrl('deck')).toBeNull();
  });

  it('picks the most specific https link and fills placeholders', () => {
    const t = {
      'tee-queen': 'https://shop.example/queen?size={size}',
      'tee-queen:forest': 'https://shop.example/queen-forest',
      'tee-queen:ink:XL': 'https://shop.example/queen-ink-xl',
      'mug-seven': 'javascript:alert(1)',
    };
    expect(checkoutUrl('tee-queen', 'ink', 'XL', t)).toBe('https://shop.example/queen-ink-xl');
    expect(checkoutUrl('tee-queen', 'forest', 'M', t)).toBe('https://shop.example/queen-forest');
    expect(checkoutUrl('tee-queen', 'ink', '2XL', t)).toBe('https://shop.example/queen?size=2XL');
    expect(checkoutUrl('mug-seven', null, null, t)).toBeNull();
  });
});
