/**
 * Static, crawlable landing (/<lang>/) and rules (/<lang>/rules) pages for every UI language.
 *
 * Build time only: scripts/prerender.mjs loads this module through Vite after `vite build` and writes the HTML into
 * dist/. The pages are zero-JS static documents (fast, fully indexable); their "Play" buttons go to /<lang>/play,
 * which the SPA fallback serves to the app — the app reads the language from the path (src/store.tsx adoptUrlLang).
 * All game copy comes from the app's own locale packs; only the SEO wording lives in ./strings.ts.
 */
import { DICTS, LANGS, rankLabel, type Dict, type Lang } from '../i18n';
import type { Rank } from '../engine/engine';
import { EXTRA, type Extra } from '../i18n2';
import { CONTACT_EMAIL, EXTRA2, type Extra2 } from '../i18n3';
import type { LocalePack } from '../locales/types';
import lt from '../locales/lt';
import et from '../locales/et';
import pl from '../locales/pl';
import de from '../locales/de';
import be from '../locales/be';
import kk from '../locales/kk';
import uz from '../locales/uz';
import az from '../locales/az';
import ka from '../locales/ka';
import hy from '../locales/hy';
import ro from '../locales/ro';
import bg from '../locales/bg';
import es from '../locales/es';
import { SEO, type SeoStrings } from './strings';

export const ORIGIN = 'https://bridge125.com';
/** <lastmod> in the sitemap — bump when the page copy changes meaningfully. */
export const SEO_UPDATED = '2026-10-13';

const PACKS: Partial<Record<Lang, LocalePack>> = { lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es };

export type PageKind = 'home' | 'rules';
export interface Copy { lang: Lang; dict: Dict; extra: Extra; extra2: Extra2; seo: SeoStrings }

export function copyFor(lang: Lang): Copy {
  const p = PACKS[lang];
  return { lang, dict: p?.dict ?? DICTS[lang], extra: p?.extra ?? EXTRA[lang], extra2: p?.extra2 ?? EXTRA2[lang], seo: SEO[lang] };
}

export const pagePath = (lang: Lang, kind: PageKind) => (kind === 'home' ? `/${lang}/` : `/${lang}/rules`);
export const pageUrl = (lang: Lang, kind: PageKind) => ORIGIN + pagePath(lang, kind);
/** The file in dist/ that Cloudflare static assets serves at pagePath() (auto-trailing-slash html handling). */
export const pageFile = (lang: Lang, kind: PageKind) => (kind === 'home' ? `${lang}/index.html` : `${lang}/rules.html`);
/** x-default: the app's root for the landing cluster, English rules for the rules cluster. */
const xDefault = (kind: PageKind) => (kind === 'home' ? `${ORIGIN}/` : pageUrl('en', 'rules'));
/** Open Graph locale: en_GB, lv_LV, uz_UZ (script subtag dropped). */
export const ogLocale = (lang: Lang) => { const p = (LANGS.find(l => l.id === lang)?.intl ?? lang).split('-'); return `${p[0]}_${p[p.length - 1]}`; };

/** Every page in the hreflang cluster lists all languages, itself included, plus x-default. */
export function alternates(kind: PageKind): { hreflang: string; href: string }[] {
  return [...LANGS.map(l => ({ hreflang: l.id, href: pageUrl(l.id, kind) })), { hreflang: 'x-default', href: xDefault(kind) }];
}

// ------------------------------------------------------------------ helpers

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON-LD inside <script>: escape "<" so no string can close the tag. */
const ld = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');
const SUIT: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const VS15 = '︎';   // text presentation: keep ♠♥♦♣ from turning into emoji on iOS

/** A small ivory playing card in pure HTML/CSS, with the language's own corner letters (Д, B, W…). */
function card(id: string, lang: Lang, style = '') {
  const r = id.slice(0, -1) as Rank, s = id.slice(-1);
  const red = s === 'H' || s === 'D';
  return `<span class="pc${red ? ' red' : ''}"${style ? ` style="${style}"` : ''}><b${/\d/.test(r) ? ' class="n"' : ''}>${esc(rankLabel(r, lang))}<small>${SUIT[s]}${VS15}</small></b><i>${SUIT[s]}${VS15}</i></span>`;
}

/** Serif headings: wrap digits so they use the sans face (Cormorant's old-style figures make 125 read as I25). */
const numify = (html: string) => html.replace(/(<h2[^>]*>)(.*?)(<\/h2>)/g, (_m, a: string, t: string, c: string) => a + t.replace(/\d+/g, '<span class="num">$&</span>') + c);

const LOGO = '<img src="/logo-mark.svg" width="34" height="34" alt="">';

export interface BuildAssets {
  /** App entry script + styles, prefetched at idle so "Play" opens instantly. */
  prefetch?: { href: string; as: 'script' | 'style' }[];
  /** @font-face rules lifted from the built app CSS (same hashed font files, already cached by the app). */
  fontCss?: string;
  /** Languages that have /og/<lang>.jpg (public/og); others use /og.jpg. */
  ogLangs?: readonly Lang[];
}

// ------------------------------------------------------------------ page chrome

function head(c: Copy, kind: PageKind, a: BuildAssets, jsonld: unknown): string {
  const { seo, lang } = c;
  const title = kind === 'home' ? seo.title : seo.rulesTitle;
  const desc = kind === 'home' ? seo.desc : seo.rulesDesc;
  const url = pageUrl(lang, kind);
  const og = a.ogLangs?.includes(lang) ? `${ORIGIN}/og/${lang}.jpg` : `${ORIGIN}/og.jpg`;
  const alts = alternates(kind).map(x => `<link rel="alternate" hreflang="${x.hreflang}" href="${x.href}">`).join('\n');
  const ogAlts = LANGS.filter(l => l.id !== lang).map(l => `<meta property="og:locale:alternate" content="${ogLocale(l.id)}">`).join('\n');
  const pre = (a.prefetch ?? []).map(p => `<link rel="prefetch" href="${esc(p.href)}" as="${p.as}" crossorigin>`).join('\n');
  return `<!doctype html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${alts}
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0B3E33">
<meta name="color-scheme" content="dark">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bridge 125">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`Bridge 125 — ${seo.ogLine}`)}">
<meta property="og:locale" content="${ogLocale(lang)}">
${ogAlts}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${og}">
<style>${a.fontCss ?? ''}${CSS}</style>
<script type="application/ld+json">${ld(jsonld)}</script>
${pre}
</head>`;
}

function langMenu(c: Copy, kind: PageKind) {
  const cur = LANGS.find(l => l.id === c.lang)!;
  const items = LANGS.map(l => `<li><a href="${pagePath(l.id, kind)}" hreflang="${l.id}" lang="${l.id}"${l.id === c.lang ? ' aria-current="page"' : ''}>${esc(l.label)}</a></li>`).join('');
  return `<details class="langs"><summary title="${esc(c.dict.language)}: ${esc(cur.label)}"><span aria-hidden="true">🌐${VS15}</span>${c.lang.toUpperCase()}<span class="sr"> — ${esc(c.dict.language)}</span></summary><ul>${items}</ul></details>`;
}

function header(c: Copy, kind: PageKind) {
  return `<header class="top"><div class="wrap">
<a class="brand" href="${pagePath(c.lang, 'home')}">${LOGO}<span>Bridge <b>125</b></span></a>
<nav aria-label="Bridge 125">
${kind === 'home' ? `<a class="navlink" href="${pagePath(c.lang, 'rules')}">${esc(c.dict.howToPlay)}</a>` : ''}
${langMenu(c, kind)}
<a class="hplay" href="/${c.lang}/play?source=seo">${esc(c.extra.nav.play)}</a>
</nav></div></header>`;
}

function footer(c: Copy, kind: PageKind) {
  const langs = LANGS.map(l => `<li><a href="${pagePath(l.id, kind)}" hreflang="${l.id}" lang="${l.id}"${l.id === c.lang ? ' aria-current="page"' : ''}>${esc(l.label)}</a></li>`).join('');
  return `<footer><div class="wrap">
<p class="flabel">${esc(c.dict.language)}</p>
<ul class="langlist">${langs}</ul>
<p class="flinks"><a href="${pagePath(c.lang, 'home')}">Bridge 125</a> · <a href="${pagePath(c.lang, 'rules')}">${esc(c.dict.howToPlay)}</a> · <a href="/${c.lang}/privacy">${esc(c.extra2.legal.privacy)}</a> · <a href="/${c.lang}/terms">${esc(c.extra2.legal.terms)}</a> · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
<p class="fcopy">© 2026 Bridge 125</p>
</div></footer>`;
}

const band = (c: Copy) => `<section class="band"><h2>${esc(c.seo.readyH)}</h2><p>${esc(c.seo.noSignup)}</p><a class="btn gold big" href="/${c.lang}/play?source=seo">♠${VS15} ${esc(c.seo.playNow)}</a></section>`;

const faqHtml = (c: Copy, items: { q: string; a: string }[]) =>
  `<section aria-labelledby="faq"><h2 id="faq">${esc(c.seo.faqH)}</h2><div class="faq">${items.map((x, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div></section>`;

const faqLd = (items: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
});

const crumbLd = (list: { name: string; item: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: list.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.item })),
});

function gameLd(c: Copy, kind: PageKind, a: BuildAssets) {
  return {
    '@type': ['VideoGame', 'WebApplication'],
    '@id': `${ORIGIN}/#game`,
    name: 'Bridge 125',
    alternateName: ['Бридж', 'Bridge card game'],
    url: pageUrl(c.lang, 'home'),
    mainEntityOfPage: pageUrl(c.lang, kind),
    description: c.seo.desc,
    inLanguage: c.lang,
    availableLanguage: LANGS.map(l => l.id),
    image: a.ogLangs?.includes(c.lang) ? `${ORIGIN}/og/${c.lang}.jpg` : `${ORIGIN}/og.jpg`,
    screenshot: `${ORIGIN}/screens/game-m.jpg`,
    genre: ['Card game', 'Shedding game'],
    gamePlatform: ['Web browser', 'Android', 'iOS', 'Windows', 'macOS'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (web browser)',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4 },
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: `${ORIGIN}/` },
    publisher: { '@type': 'Organization', name: 'Bridge 125', url: `${ORIGIN}/`, logo: `${ORIGIN}/icon-512.png`, email: CONTACT_EMAIL },
  };
}

// ------------------------------------------------------------------ shared sections

const SPECIALS: { cards: string[]; tag: keyof Extra['guide']['tags']; rule: number; tone: 'acc' | 'bad' | 'info' }[] = [
  { cards: ['AH'], tag: 'A', rule: 2, tone: 'info' },
  { cards: ['6D'], tag: '6', rule: 3, tone: 'info' },
  { cards: ['7C'], tag: '7', rule: 4, tone: 'bad' },
  { cards: ['8H'], tag: '8', rule: 5, tone: 'bad' },
  { cards: ['9S'], tag: '9', rule: 6, tone: 'acc' },
  { cards: ['JD'], tag: 'J', rule: 7, tone: 'acc' },
  { cards: ['QS'], tag: 'QS', rule: 8, tone: 'bad' },
  { cards: ['KS', 'KH', 'KC', 'KD'], tag: 'K', rule: 9, tone: 'acc' },
];

function specials(c: Copy, h: 'h2' | 'h3' = 'h3') {
  const r = c.dict.rules, g = c.extra.guide;
  return `<div class="specs">${SPECIALS.map(s => `<article class="spec"><div class="cards${s.cards.length > 1 ? ' multi' : ''}">${s.cards.map(id => card(id, c.lang)).join('')}</div><div><${h}>${esc(r[s.rule].h)} <span class="tag ${s.tone}">${esc(g.tags[s.tag])}</span></${h}><p>${esc(r[s.rule].p)}</p></div></article>`).join('')}</div>`;
}

const steps = (c: Copy) => `<ol class="steps">${c.extra.guide.steps.map(s => `<li><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></li>`).join('')}</ol>`;

function scoreLine(c: Copy) {
  const l = c.extra.guide.line;
  const at = (n: number) => `${((n / 140) * 100).toFixed(2)}%`;
  return `<div class="line" role="img" aria-label="0 · 125 · 130"><div class="nums"><span style="left:0">0</span><span class="n125" style="left:${at(125)}">125</span><span class="n130" style="left:${at(130)}">130</span></div><div class="track"><span class="fill"></span><span class="tick" style="left:0"></span><span class="tick burn" style="left:${at(125)}"></span><span class="tick end" style="left:${at(130)}"></span></div></div><ul class="legend"><li><i class="lg start"></i>${esc(l.start)}</li><li><i class="lg burn"></i>${esc(l.burn)}</li><li><i class="lg end"></i>${esc(l.end)}</li></ul>`;
}

// ------------------------------------------------------------------ pages

export function renderHome(c: Copy, a: BuildAssets = {}): string {
  const { seo, dict, extra, lang } = c;
  const fan = [['JH', -24, 26], ['6S', -12, 8], ['QS', 0, 0], ['JD', 12, 8], ['AC', 24, 26]] as const;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    gameLd(c, 'home', a),
    faqLd(seo.faq),
    crumbLd([{ name: 'Bridge 125', item: `${ORIGIN}/` }, { name: LANGS.find(l => l.id === lang)!.label, item: pageUrl(lang, 'home') }]),
  ] };
  return numify(`${head(c, 'home', a, jsonld)}
<body>
${header(c, 'home')}
<main id="main" class="wrap">
<section class="hero">
<div class="copy">
<h1><span class="wm">Bridge <em class="num">125</em></span><span class="sub">${esc(dict.tagline)}</span></h1>
<p class="lead">${esc(extra.heroLine)}</p>
<div class="ctas"><a class="btn gold big" href="/${lang}/play?source=seo">♠${VS15} ${esc(seo.playNow)}</a><a class="btn ghost" href="${pagePath(lang, 'rules')}">${esc(dict.howToPlay)}</a></div>
<p class="fine">${esc(seo.noSignup)}</p>
<ul class="chips">${extra.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
</div>
<div class="fan" aria-hidden="true">${fan.map(([id, r, y], i) => card(id, lang, `--r:${r}deg;--y:${y}px;--d:${0.08 * i}s`)).join('')}<span class="coin">125</span></div>
</section>
<section aria-labelledby="what"><h2 id="what">${esc(seo.whatH)}</h2><p class="prose">${esc(seo.whatP)}</p></section>
<section aria-labelledby="how" class="split">
<div><h2 id="how">${esc(extra.guide.title)}</h2><p class="prose">${esc(extra.guide.intro)}</p>${steps(c)}</div>
<figure class="phone"><img src="/screens/game-m-600.webp" width="600" height="1298" loading="lazy" decoding="async" alt="${esc(seo.shotAlt)}"></figure>
</section>
<section aria-labelledby="special"><h2 id="special">${esc(extra.guide.tabs.special)}</h2>${specials(c)}<p class="more"><a href="${pagePath(lang, 'rules')}">${esc(seo.fullRules)} →</a></p></section>
${faqHtml(c, seo.faq)}
${band(c)}
</main>
${footer(c, 'home')}
</body>
</html>
`);
}

export function renderRules(c: Copy, a: BuildAssets = {}): string {
  const { seo, dict, extra, lang } = c;
  const r = dict.rules, g = extra.guide;
  const rulesFaq = seo.rq.map((q, i) => ({ q, a: r[[0, 8, 7, 9][i]].p }));
  const h1 = seo.rulesTitle.split(' — ')[0];
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    gameLd(c, 'rules', a),
    faqLd(rulesFaq),
    crumbLd([{ name: 'Bridge 125', item: pageUrl(lang, 'home') }, { name: dict.howToPlay, item: pageUrl(lang, 'rules') }]),
  ] };
  const combos = [['QS', '6S'], ['8H', '8C', '8S'], ['JS', 'JH', 'JC', 'JD']];
  const points = [['AS', 15], ['KH', 10], ['QD', 10], ['JC', 10], ['10S', 10], ['6S', 5], ['9H', 0], ['8D', 0], ['7C', 0], ['6H', 0]] as const;
  return numify(`${head(c, 'rules', a, jsonld)}
<body>
${header(c, 'rules')}
<main id="main" class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${pagePath(lang, 'home')}">Bridge 125</a></li><li aria-current="page">${esc(dict.howToPlay)}</li></ol></nav>
<header class="rhead">
<h1 class="rh1">${esc(h1).replace(/\d+/g, '<span class="num">$&</span>')}</h1>
<p class="lead">${esc(g.intro)}</p>
${scoreLine(c)}
<div class="ctas"><a class="btn gold big" href="/${lang}/play?source=seo">♠${VS15} ${esc(g.cta)}</a></div>
<nav class="toc" aria-label="${esc(g.title)}"><a href="#basics">${esc(g.tabs.basics)}</a><a href="#special">${esc(g.tabs.special)}</a><a href="#combos">${esc(g.tabs.combos)}</a><a href="#scoring">${esc(g.tabs.scoring)}</a></nav>
</header>
<section id="basics" aria-labelledby="h-basics"><h2 id="h-basics">${esc(g.tabs.basics)}</h2>${steps(c)}
<div class="rule"><h3>${esc(r[0].h)}</h3><p>${esc(r[0].p)}</p></div>
<div class="rule"><h3>${esc(r[1].h)}</h3><p>${esc(r[1].p)}</p></div>
</section>
<section id="special" aria-labelledby="h-special"><h2 id="h-special">${esc(g.tabs.special)}</h2>${specials(c)}</section>
<section id="combos" aria-labelledby="h-combos"><h2 id="h-combos">${esc(g.tabs.combos)}</h2><div class="combos">${g.combos.map((x, i) => `<article class="combo"><div class="cards row">${combos[i].map(id => card(id, lang)).join('')}<span class="tag ${i === 2 ? 'acc' : 'bad'}">${i === 2 ? '×5' : '+6'}</span></div><h3>${esc(x.h)}</h3><p>${esc(x.p)}</p></article>`).join('')}</div></section>
<section id="scoring" aria-labelledby="h-scoring"><h2 id="h-scoring">${esc(g.tabs.scoring)}</h2><p class="prose">${esc(g.pointsTitle)}</p>
<ul class="points">${points.map(([id, p]) => `<li>${card(id, lang)}<strong${p ? '' : ' class="zero"'}>${p}</strong></li>`).join('')}</ul>
<div class="rule"><h3>${esc(r[10].h)}</h3><p>${esc(r[10].p)}</p></div>
</section>
${faqHtml(c, rulesFaq)}
${band(c)}
</main>
${footer(c, 'rules')}
</body>
</html>
`);
}

export interface Page { file: string; url: string; lang: Lang; kind: PageKind; html: string }

export function renderAll(a: BuildAssets = {}): Page[] {
  return LANGS.flatMap(({ id }) => {
    const c = copyFor(id);
    return [
      { file: pageFile(id, 'home'), url: pageUrl(id, 'home'), lang: id, kind: 'home' as const, html: renderHome(c, a) },
      { file: pageFile(id, 'rules'), url: pageUrl(id, 'rules'), lang: id, kind: 'rules' as const, html: renderRules(c, a) },
    ];
  });
}

/** sitemap.xml with hreflang alternates (public/sitemap.xml must equal this — see seo.test.ts). */
export function sitemapXml(): string {
  const entry = (loc: string, kind: PageKind, priority: string) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${SEO_UPDATED}</lastmod>
    <changefreq>${kind === 'home' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>
${alternates(kind).map(x => `    <xhtml:link rel="alternate" hreflang="${x.hreflang}" href="${x.href}"/>`).join('\n')}
  </url>`;
  const urls = [
    entry(`${ORIGIN}/`, 'home', '1.0'),
    ...LANGS.map(l => entry(pageUrl(l.id, 'home'), 'home', l.id === 'en' ? '0.9' : '0.8')),
    ...LANGS.map(l => entry(pageUrl(l.id, 'rules'), 'rules', '0.7')),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

// ------------------------------------------------------------------ styles (inlined into every page; no JS at all)

const CSS = `
:root{--felt:#0B3E33;--felt2:#072A22;--gold-hi:#EBD38E;--gold:#C9A54C;--gold-lo:#8C6E28;--ink:#17181C;--ivory:#F7F1E3;--text:#EEF3EF;--mute:rgba(232,240,236,.74);--line:rgba(201,165,76,.32);--claret:#A31D35;--claret-hi:#D2334F;--panel:rgba(5,18,16,.42);--serif:'Cormorant Garamond','Noto Sans Georgian','Noto Sans Armenian',Georgia,serif;--sans:'Golos Text','Noto Sans Georgian','Noto Sans Armenian',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:76px}
body{background:var(--felt2);color:var(--text);font:400 16px/1.6 var(--sans);min-height:100vh;overflow-x:hidden}
/* Cormorant's figures are old-style (125 reads as I25): numbers use the sans face */
.num,.coin,.nums,.points strong,.steps li::before{font-family:var(--sans)!important;font-variant-numeric:lining-nums}
.wm .num{font-weight:700;font-size:.8em;letter-spacing:-.01em}.rh1 .num,h2 .num{font-weight:700;font-size:.82em}
body::before{content:'';position:fixed;inset:0;z-index:-1;background:radial-gradient(110% 60% at 70% -5%,#17614D 0%,rgba(11,62,51,.9) 40%,var(--felt2) 100%)}
a{color:var(--gold-hi)}a:hover{color:#fff}
:focus-visible{outline:2px solid var(--gold-hi);outline-offset:3px;border-radius:8px}
.wrap{width:min(1120px,100% - 32px);margin-inline:auto}
.top{position:sticky;top:0;z-index:20;background:rgba(7,42,34,.95);border-bottom:1px solid rgba(201,165,76,.18)}
.top .wrap{display:flex;align-items:center;gap:8px;height:64px}
.brand{display:flex;align-items:center;gap:10px;color:var(--ivory);text-decoration:none;font:700 17px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;margin-right:auto;white-space:nowrap}
.brand b,.wm em{background:linear-gradient(180deg,#F3DE9C,#D4B160 55%,#A27E2C);-webkit-background-clip:text;background-clip:text;color:transparent}
.top nav{display:flex;align-items:center;gap:8px}
.navlink{display:none;color:var(--text);text-decoration:none;font-size:15px;font-weight:500;padding:10px 12px;border-radius:10px}
.navlink:hover{background:rgba(255,255,255,.06);color:#fff}
.hplay{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:12px;background:linear-gradient(180deg,var(--gold-hi),var(--gold) 55%,var(--gold-lo));color:#2B1E03;font-weight:700;font-size:15px;text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
.hplay:hover{color:#2B1E03;filter:brightness(1.06)}
.langs{position:relative}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.langs summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--text)}
.langs summary::-webkit-details-marker{display:none}
.langs ul{position:absolute;right:-60px;top:calc(100% + 10px);list-style:none;background:#0A3229;border:1px solid var(--line);border-radius:16px;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:2px;width:min(320px,calc(100vw - 32px));box-shadow:0 24px 60px rgba(0,0,0,.55)}
.langs a,.langlist a{text-decoration:none}
.langs a{display:block;padding:10px 12px;border-radius:10px;color:var(--text);font-size:15px}
.langs a:hover,.langs a[aria-current]{background:rgba(201,165,76,.14);color:var(--gold-hi)}
.hero{display:grid;gap:12px;padding:36px 0 8px;align-items:center}
h1{color:var(--ivory)}
.wm{display:block;font:700 clamp(58px,17vw,112px)/.9 var(--serif);letter-spacing:-.01em}
.wm em{font-style:normal}
.sub{display:block;margin-top:14px;font:600 clamp(23px,6vw,32px)/1.15 var(--serif);color:var(--gold-hi)}
.lead{font-size:clamp(17px,4.5vw,20px);color:var(--mute);max-width:34em;margin-top:16px}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 26px;border-radius:16px;font:700 17px/1.1 var(--sans);text-decoration:none;text-align:center;transition:transform .15s,filter .2s,background .2s}
.btn.gold{background:linear-gradient(180deg,var(--gold-hi),var(--gold) 48%,var(--gold-lo));color:#2B1E03;box-shadow:0 12px 30px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.5)}
.btn.gold:hover{transform:translateY(-2px);filter:brightness(1.06);color:#2B1E03}
.btn.big{min-height:62px;font-size:19px;padding:0 32px;flex:1 1 100%}
.btn.ghost{border:1px solid var(--line);color:var(--ivory);background:var(--panel);flex:1 1 100%}
.btn.ghost:hover{background:rgba(255,255,255,.07)}
.fine{margin-top:12px;font-size:14px;color:var(--mute)}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.chips li{font-size:14px;padding:7px 13px;border-radius:999px;background:var(--panel);border:1px solid rgba(201,165,76,.22)}
.chips li::before{content:'✓';color:var(--gold);margin-right:7px;font-weight:700}
.fan{position:relative;height:250px;width:100%;max-width:440px;margin:8px auto 0}
.fan .pc{--w:112px;position:absolute;left:50%;bottom:6px;margin-left:calc(var(--w) / -2);transform-origin:50% 135%;transform:rotate(var(--r)) translateY(var(--y));animation:deal .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d)}
.coin{position:absolute;right:4%;top:2%;width:78px;height:78px;border-radius:50%;display:grid;place-items:center;font:700 28px/1 var(--serif);color:#2B1E03;background:radial-gradient(circle at 34% 28%,#FBF0C6,#D9B862 45%,#8C6E28 100%);box-shadow:0 14px 34px rgba(0,0,0,.45),inset 0 -3px 0 rgba(0,0,0,.2),0 0 0 3px rgba(235,211,142,.25);animation:pop .7s .5s cubic-bezier(.2,1.4,.4,1) both}
@keyframes deal{from{opacity:0;transform:rotate(0deg) translateY(70px)}}
@keyframes pop{from{opacity:0;transform:scale(.4) rotate(-30deg)}}
.pc{--w:54px;position:relative;display:inline-block;flex:none;width:var(--w);height:calc(var(--w) * 1.4);border-radius:calc(var(--w) * .1);background:linear-gradient(180deg,#FFFBF1,#EDE3CC);color:var(--ink);box-shadow:0 10px 24px rgba(0,0,0,.38),0 0 0 1px rgba(201,165,76,.55)}
.pc b{position:absolute;left:8%;top:5%;display:flex;flex-direction:column;align-items:center;font:700 calc(var(--w) * .3)/1 var(--serif)}
.pc b.n{font-family:var(--sans);font-size:calc(var(--w) * .26);letter-spacing:-.04em}
.pc small{font:400 calc(var(--w) * .2)/1.1 var(--sans)}
.pc i{position:absolute;inset:0;display:grid;place-items:center;font:400 calc(var(--w) * .46)/1 var(--sans);font-style:normal}
.pc.red{color:var(--claret)}
section{padding:40px 0}
h2{font:700 clamp(34px,9vw,50px)/1.05 var(--serif);color:var(--ivory);margin-bottom:14px}
h2::after{content:'';display:block;width:56px;height:2px;margin-top:14px;background:linear-gradient(90deg,var(--gold),transparent)}
h3{font:600 18px/1.3 var(--sans);color:var(--ivory);margin-bottom:6px}
.prose{color:var(--mute);font-size:17px;max-width:44em}
.steps{list-style:none;display:grid;gap:12px;counter-reset:s;margin-top:24px}
.steps li{position:relative;padding:18px 18px 18px 72px;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.12));border:1px solid rgba(201,165,76,.18)}
.steps li::before{counter-increment:s;content:counter(s);position:absolute;left:18px;top:18px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font:700 22px/1 var(--serif);color:#2B1E03;background:linear-gradient(180deg,var(--gold-hi),var(--gold))}
.steps p,.spec p,.combo p,.rule p{color:var(--mute);font-size:15.5px}
.split{display:grid;gap:32px;align-items:center}
.phone{width:min(290px,76vw);margin:0 auto;border-radius:40px;padding:10px;background:linear-gradient(160deg,#22332e,#05100d);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(201,165,76,.35)}
.phone img{display:block;width:100%;height:auto;border-radius:31px}
.specs{display:grid;gap:12px;margin-top:24px}
.spec{display:flex;gap:16px;align-items:flex-start;padding:16px;border-radius:18px;background:var(--panel);border:1px solid rgba(201,165,76,.16)}
.cards{display:flex;flex:none;width:62px;justify-content:center;padding-top:2px}
.cards.multi .pc{--w:38px}.cards.multi .pc+.pc{margin-left:-30px}
.cards.row{width:auto;justify-content:flex-start;align-items:center;gap:0;margin-bottom:14px}.cards.row .pc+.pc{margin-left:-18px}.cards.row .tag{margin-left:14px}
.tag{display:inline-block;font:700 12px/1.3 var(--sans);padding:3px 9px;border-radius:999px;vertical-align:2px;white-space:nowrap}
.tag.acc{background:rgba(201,165,76,.2);color:var(--gold-hi)}.tag.bad{background:rgba(210,51,79,.2);color:#FFA7B6}.tag.info{background:rgba(120,190,255,.16);color:#B4DAFF}
.more{margin-top:20px;font-weight:600;font-size:17px}
.faq{display:grid;gap:10px;margin-top:22px;max-width:820px}
.faq details{border-radius:16px;background:var(--panel);border:1px solid rgba(201,165,76,.16)}
.faq summary{cursor:pointer;list-style:none;padding:18px 54px 18px 20px;font-weight:600;font-size:16.5px;position:relative;color:var(--ivory)}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:26px;line-height:1;color:var(--gold);transition:transform .2s}
.faq details[open] summary::after{transform:translateY(-50%) rotate(45deg)}
.faq details p{padding:0 20px 18px;color:var(--mute)}
.band{margin:32px 0 0;padding:44px 22px;border-radius:28px;text-align:center;background:radial-gradient(120% 140% at 50% 0%,rgba(201,165,76,.24),rgba(5,18,16,.55) 62%);border:1px solid var(--line)}
.band h2::after{margin-inline:auto}.band p{color:var(--mute);margin-bottom:22px}.band .btn{flex:none;width:100%;max-width:420px}
footer{border-top:1px solid rgba(201,165,76,.18);padding:30px 0 48px;margin-top:48px;font-size:14px;color:var(--mute)}
.flabel{font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:var(--gold)}
.langlist{list-style:none;display:flex;flex-wrap:wrap;gap:4px 6px;margin:10px 0 20px}
.langlist a{display:inline-block;padding:6px 8px;border-radius:8px;color:var(--text)}
.langlist a:hover,.langlist a[aria-current]{color:var(--gold-hi);background:rgba(201,165,76,.12)}
.flinks{line-height:2.2}.flinks a{color:var(--text);padding:6px 2px}.fcopy{margin-top:8px;opacity:.7}
.crumbs{font-size:14px;color:var(--mute);padding-top:20px}.crumbs ol{list-style:none;display:flex;gap:8px;flex-wrap:wrap}.crumbs li+li::before{content:'›';margin-right:8px;color:var(--gold)}.crumbs a{color:var(--text)}
.rhead{padding:18px 0 8px}
.rh1{font:700 clamp(46px,12vw,84px)/.95 var(--serif)}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.toc a{padding:9px 14px;border-radius:999px;border:1px solid var(--line);color:var(--text);text-decoration:none;font-size:14.5px;font-weight:500;background:var(--panel)}
.toc a:hover{color:var(--gold-hi)}
.rule{margin-top:22px;max-width:48em}
.combos{display:grid;gap:12px;margin-top:20px}
.combo{padding:18px;border-radius:18px;background:var(--panel);border:1px solid rgba(201,165,76,.16)}
.points{list-style:none;display:grid;grid-template-columns:repeat(5,1fr);gap:16px 8px;margin-top:20px;max-width:520px}
.points li{display:flex;flex-direction:column;align-items:center;gap:8px}
.points .pc{--w:46px}.points strong{font:700 22px/1 var(--serif);color:var(--gold-hi)}.points strong.zero{color:var(--mute)}
.line{margin:26px 0 4px;max-width:620px}
.nums{position:relative;height:24px;font:700 18px/1 var(--serif)}
.nums span{position:absolute}
.nums .n125{color:var(--gold-hi);transform:translateX(calc(-100% - 6px))}.nums .n130{color:#FF8FA2;left:auto!important;right:0}
.track{position:relative;height:10px;border-radius:99px;background:rgba(255,255,255,.08)}
.track .fill{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,#2E8B6E,var(--gold) 86%,var(--claret-hi))}
.tick{position:absolute;top:-5px;width:4px;height:20px;margin-left:-2px;border-radius:2px;background:var(--ivory)}.tick.burn{background:var(--gold-hi)}.tick.end{background:var(--claret-hi)}
.legend{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:12px;font-size:14px;color:var(--mute)}
.lg{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px}.lg.start{background:#2E8B6E}.lg.burn{background:var(--gold-hi)}.lg.end{background:var(--claret-hi)}
@media (min-width:640px){.navlink{display:inline-flex}.btn.big,.btn.ghost{flex:0 0 auto}.langs ul{right:0}}
@media (min-width:860px){
.hero{grid-template-columns:1.05fr .95fr;padding:72px 0 32px}
.fan{height:360px}.fan .pc{--w:150px}.coin{width:96px;height:96px;font-size:34px}
.specs{grid-template-columns:1fr 1fr}
.split{grid-template-columns:1.2fr .8fr}
.combos{grid-template-columns:repeat(3,1fr)}
section{padding:56px 0}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}
`.trim();
