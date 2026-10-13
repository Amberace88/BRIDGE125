/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MERCH_STRINGS, type DesignKey } from '../i18n/merch';
import {
  CITY_IDS, COLLECTIONS, PRODUCTS, SIZE_GUIDE, collectionOf, completeTheSet, flagship, forYou, fromPrice, isEmail, kindOf, marketScore, priceFor,
  productById, variantLabel,
} from './catalog';
import { MERCH_CHECKOUT, checkoutUrl } from './config';
import { productCopy } from './copy';
import { DECK_PRODUCTS } from './decks';

const root = (p: string) => join(process.cwd(), p.replace(/^\//, ''));
const pub = (p: string) => root(`public/${p.replace(/^\//, '')}`);

describe('merch catalogue', () => {
  it('has unique ids that the SQL accepts', () => {
    const ids = PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{2,40}$/);
  });

  it('leads with playing cards: the flagship is a deck, decks come first', () => {
    expect(flagship().category).toBe('cards');
    expect(kindOf(flagship())).toBe('deck');
    expect(PRODUCTS[0].category).toBe('cards');
    if (!DECK_PRODUCTS.length) expect(PRODUCTS.filter(p => p.hero).map(p => p.id)).toEqual(['deck']);
  });

  it('every mockup and print design exists', () => {
    for (const p of PRODUCTS) {
      expect(p.colours.length, p.id).toBeGreaterThan(0);
      for (const c of p.colours) for (const img of c.images) expect(existsSync(pub(img)), img).toBe(true);
      const design = existsSync(root(`merch-print/designs/${p.design}.svg`)) || existsSync(pub(`/merch/designs/${p.design}.svg`));
      expect(design, `${p.id}: ${p.design}`).toBe(true);
    }
  });

  it('has a City edition (poster, tee, mug) for every Journey home city', () => {
    for (const c of CITY_IDS) {
      for (const kind of ['poster', 'tee', 'mug']) {
        const p = productById(`city-${kind}-${c}`);
        expect(p, `${kind} ${c}`).toBeDefined();
        expect(collectionOf(p!)).toBe('cities');
      }
    }
    for (const col of COLLECTIONS) expect(PRODUCTS.some(p => collectionOf(p) === col), col).toBe(true);
  });

  it('has copy for every product in en / lv / ru / uk', () => {
    for (const lang of ['en', 'lv', 'ru', 'uk']) {
      const s = MERCH_STRINGS[lang]!;
      for (const p of PRODUCTS) {
        const c = productCopy(p, s, lang);
        expect(c.name.trim(), `${lang}:${p.id}`).toBeTruthy();
        expect(c.name, `${lang}:${p.id}`).not.toMatch(/undefined|city-|badge-/);
        expect(c.tagline.trim(), `${lang}:${p.id} tagline`).toBeTruthy();
        expect(c.desc.trim().length, `${lang}:${p.id} desc`).toBeGreaterThan(20);
        expect(c.details.length, `${lang}:${p.id}`).toBeGreaterThan(0);
        for (const col of p.colours) expect(s.colours[col.id], `${lang}:${col.id}`).toBeTruthy();
        if (!p.city || !p.id.startsWith('city-')) {
          const key = (p.story ?? p.design.replace(/-wrap$/, '')) as DesignKey;
          if (!DECK_PRODUCTS.includes(p)) expect(s.designs[key], `${lang}: design story ${key} (${p.id})`).toBeDefined();
        }
      }
    }
  });

  it('City editions use the localised city name', () => {
    const p = productById('city-poster-riga')!;
    expect(productCopy(p, MERCH_STRINGS.lv!, 'lv').name).toContain('Rīga');
    expect(productCopy(p, MERCH_STRINGS.ru!, 'ru').name).toContain('Рига');
    expect(productCopy(p, MERCH_STRINGS.en, 'en').name).toBe('Riga Salon Poster');
  });

  it('sorts "For you" by the visitor’s language: home city first', () => {
    expect(forYou('lv')[0].city).toBe('riga');
    expect(forYou('es')[0].city).toBe('madrid');
    expect(forYou('ka')[0].city).toBe('tbilisi');
    expect(forYou('lv').some(p => p.id === 'tee-lielais')).toBe(true);
    expect(marketScore(productById('city-poster-riga')!, 'lv')).toBe(3);
    expect(marketScore(productById('city-poster-riga')!, 'es')).toBe(0);
    expect(marketScore(productById('tee-lady')!, 'es')).toBe(1);
    for (const lang of ['en', 'ru', 'be', 'de']) expect(forYou(lang).length, lang).toBeGreaterThan(3);
  });

  it('prices sizes, frames and labels variants', () => {
    const tee = productById('tee-queen')!;
    expect(priceFor(tee, 'M')).toBe(32);
    expect(priceFor(tee, '3XL')).toBe(35);
    expect(variantLabel(tee, 'forest', 'L')).toBe('forest / L');
    const mug = productById('mug-seven')!;
    expect(variantLabel(mug, 'white', null)).toBe('');
    const poster = productById('poster-lady')!;
    expect(priceFor(poster, '30x40', 'paper')).toBe(29);
    expect(priceFor(poster, '50x70', 'oak')).toBe(29 + 20 + 25);
    expect(fromPrice(poster)).toBe(29);
  });

  it('size guides cover every apparel size on sale', () => {
    for (const p of PRODUCTS) {
      const g = SIZE_GUIDE[kindOf(p)];
      if (!g) continue;
      for (const z of p.sizes ?? []) expect(g.sizes, `${p.id} ${z.id}`).toContain(z.id);
      expect(g.chest.length).toBe(g.sizes.length);
      expect(g.length.length).toBe(g.sizes.length);
    }
  });

  it('cross-sells the same design / city, never the product itself', () => {
    for (const p of PRODUCTS) {
      const set = completeTheSet(p);
      expect(set.length, p.id).toBeLessThanOrEqual(4);
      expect(set.some(q => q.id === p.id), p.id).toBe(false);
      expect(new Set(set.map(q => q.id)).size).toBe(set.length);
    }
    const ids = completeTheSet(productById('tee-lady')!).map(p => p.id);
    expect(ids).toEqual(expect.arrayContaining(['poster-lady', 'mug-lady']));
    expect(completeTheSet(productById('city-tee-riga')!).map(p => p.id)).toEqual(expect.arrayContaining(['city-poster-riga', 'city-mug-riga']));
  });

  it('validates email like the RPC', () => {
    expect(isEmail('eddie@example.com')).toBe(true);
    expect(isEmail(' Eddie.Web+cards@mail.example.lv ')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('x@y.z')).toBe(false);
  });
});

describe('external checkout links (fallback while the cart checkout is off)', () => {
  it('ships with no live links, and only https links are ever used', () => {
    for (const v of Object.values(MERCH_CHECKOUT)) expect(v === '' || /^https:\/\//.test(v)).toBe(true);
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
