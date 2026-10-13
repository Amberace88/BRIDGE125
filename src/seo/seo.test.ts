import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGS } from '../i18n';
import { LEGAL_DOCS, BINDING_NOTE } from '../legal/docs';
import { consentText } from '../legal/consent';
import { ORIGIN, alternates, renderAll, sitemapXml } from './render';
import { SEO } from './strings';

const pages = renderAll({ ogLangs: ['en', 'lv'] });
const attr = (html: string, re: RegExp) => html.match(re)?.[1];

describe('pre-rendered SEO pages', () => {
  it('one landing + one rules page per UI language', () => {
    expect(pages).toHaveLength(LANGS.length * 2);
    expect(new Set(pages.map(p => p.file)).size).toBe(pages.length);
  });

  for (const p of pages) {
    it(`${p.lang} ${p.kind}: head tags, hreflang, structured data`, () => {
      const h = p.html;
      expect(attr(h, /<html lang="([^"]+)"/)).toBe(p.lang);
      const title = attr(h, /<title>([^<]+)<\/title>/)!;
      expect(title.length).toBeGreaterThan(20);
      expect(title.length).toBeLessThanOrEqual(70);
      const desc = attr(h, /<meta name="description" content="([^"]+)"/)!;
      expect(desc.length).toBeGreaterThan(80);
      expect(desc.length).toBeLessThanOrEqual(175);
      expect(attr(h, /<link rel="canonical" href="([^"]+)"/)).toBe(p.url);
      expect(attr(h, /<meta property="og:url" content="([^"]+)"/)).toBe(p.url);
      expect(attr(h, /<meta property="og:image" content="([^"]+)"/)).toMatch(/^https:\/\/bridge125\.com\/og(\/(en|lv))?\.jpg$/);

      const alts = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => [m[1], m[2]]);
      expect(alts).toHaveLength(LANGS.length + 1);
      expect(alts).toContainEqual([p.lang, p.url]);                 // self-referencing
      expect(alts.map(a => a[0])).toContain('x-default');

      const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      expect(blocks).toHaveLength(1);
      const graph = JSON.parse(blocks[0][1])['@graph'] as Record<string, unknown>[];
      const types = graph.flatMap(n => ([] as unknown[]).concat(n['@type']));
      expect(types).toEqual(expect.arrayContaining(['VideoGame', 'WebApplication', 'FAQPage', 'BreadcrumbList']));
      const game = graph.find(n => ([] as unknown[]).concat(n['@type']).includes('VideoGame'))!;
      expect((game.offers as { price: string }).price).toBe('0');
      const faq = graph.find(n => n['@type'] === 'FAQPage')! as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
      expect(faq.mainEntity.length).toBe(4);
      for (const q of faq.mainEntity) { expect(q.name.length).toBeGreaterThan(5); expect(q.acceptedAnswer.text.length).toBeGreaterThan(20); }
      // every FAQ answer is also visible on the page
      for (const q of faq.mainEntity) expect(h).toContain(q.acceptedAnswer.text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

      expect(h).toMatch(/<h1[^>]*>/);
      expect(h).toContain(`href="/${p.lang}/play?source=seo"`);
      expect(h).not.toMatch(/undefined|NaN|\[object/);
      expect(h).not.toMatch(/<script(?! type="application\/ld\+json")/);   // zero JS on the SEO pages
    });
  }

  it('hreflang clusters point at real pages', () => {
    const urls = new Set(pages.map(p => p.url));
    for (const kind of ['home', 'rules'] as const)
      for (const a of alternates(kind)) expect(a.hreflang === 'x-default' && kind === 'home' ? a.href === `${ORIGIN}/` : urls.has(a.href)).toBe(true);
  });

  it('public/sitemap.xml is up to date (regenerate with `npm run build`, then copy dist/sitemap.xml)', () => {
    expect(readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8')).toBe(sitemapXml());
  });

  it('the app shell lists the same hreflang cluster', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)" \/>/g)].map(m => [m[1], m[2]]);
    expect(alts).toEqual(alternates('home').map(a => [a.hreflang, a.href]));
  });

  it('SEO copy exists for every language', () => {
    for (const { id } of LANGS) {
      const s = SEO[id];
      for (const [k, v] of Object.entries(s)) expect(typeof v === 'string' ? v.trim().length : (v as unknown[]).length, `${id}.${k}`).toBeGreaterThan(0);
    }
  });
});

describe('legal texts', () => {
  it('Latvian translation mirrors the English structure', () => {
    for (const kind of ['privacy', 'terms'] as const) {
      const en = LEGAL_DOCS.en[kind], lv = LEGAL_DOCS.lv[kind];
      expect(lv.sections.length).toBe(en.sections.length);
      en.sections.forEach((s, i) => {
        expect(lv.sections[i].p.length, `${kind} ${i}`).toBe(s.p.length);
        expect(lv.sections[i].list?.length, `${kind} ${i} list`).toBe(s.list?.length);
        expect(lv.sections[i].after?.length, `${kind} ${i} after`).toBe(s.after?.length);
      });
    }
  });

  it('covers what paid features need', () => {
    const terms = JSON.stringify(LEGAL_DOCS.en.terms), privacy = JSON.stringify(LEGAL_DOCS.en.privacy);
    for (const w of ['withdrawal', '2011/83/EU', 'Refunds', 'no cash value', '16 years', 'under 18', 'Fair play', 'Delete my account', '[COMPANY NAME]', 'hello@bridge125.com']) expect(terms).toContain(w);
    for (const w of ['Cloudflare', 'Supabase', 'Stripe', 'Hugging Face', 'pikovaya.prefs.v1', 'b125-voice-v1', 'events', 'GDPR', '[REGISTRATION NO.]', '[REGISTERED ADDRESS]']) expect(privacy).toContain(w);
  });

  it('every non-English language says which version is binding, and has the checkout consent line', () => {
    for (const { id } of LANGS) {
      if (id !== 'en') expect(BINDING_NOTE[id], id).toBeTruthy();
      expect(consentText(id).text).toMatch(/14/);
    }
  });
});

describe('language links (adoptUrlLang)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  async function open(url: string, stored?: Record<string, unknown>) {
    const u = new URL(url, 'https://bridge125.com');
    const mem = new Map<string, string>(stored ? [['pikovaya.prefs.v1', JSON.stringify(stored)]] : []);
    const loc = { pathname: u.pathname, search: u.search, hash: u.hash };
    vi.stubGlobal('location', loc);
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
    vi.stubGlobal('navigator', { languages: ['en-US'], language: 'en-US' });
    vi.stubGlobal('history', { state: null, replaceState: (_s: unknown, _t: string, to: string) => { const n = new URL(to, 'https://bridge125.com'); Object.assign(loc, { pathname: n.pathname, search: n.search, hash: n.hash }); } });
    const { adoptUrlLang } = await import('../store');
    adoptUrlLang();
    return { loc, prefs: JSON.parse(mem.get('pikovaya.prefs.v1') ?? 'null') as Record<string, unknown> | null };
  }

  it('/de/play → German, plain "/" for the router', async () => {
    const { loc, prefs } = await open('/de/play?source=seo');
    expect(prefs?.lang).toBe('de');
    expect(loc.pathname + loc.search).toBe('/?source=seo');
  });

  it('keeps the other stored prefs and the rest of the path', async () => {
    const { loc, prefs } = await open('/lv/r/ABCD', { lang: 'ru', accent: 'ruby', sound: false });
    expect(prefs).toMatchObject({ lang: 'lv', accent: 'ruby', sound: false });
    expect(loc.pathname).toBe('/r/ABCD');
  });

  it('?lang= works too; unknown codes and app routes are left alone', async () => {
    expect((await open('/?lang=uk')).prefs?.lang).toBe('uk');
    vi.resetModules();
    const r = await open('/journey', { lang: 'ru' });
    expect(r.loc.pathname).toBe('/journey');
    expect(r.prefs?.lang).toBe('ru');
    vi.resetModules();
    expect((await open('/xx/play')).prefs).toBeNull();
  });
});
