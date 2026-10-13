import { pick } from '../i18n/pick';
import { JOURNEY_STRINGS } from '../i18n/journey';
import { MERCH_STRINGS, type DesignCopy, type DesignKey, type MerchStrings, type ProductCopy } from '../i18n/merch';
import * as DECKS from './decks';
import { kindOf, type CityId, type Product } from './catalog';

/**
 * Product copy = design story (what is printed) + kind (what it is printed on), in the visitor's language.
 * Deck products may bring their own copy through an optional DECK_STRINGS export of src/merch/decks
 * (lang → product id → ProductCopy, or product id → lang → ProductCopy); that wins over the composed copy.
 */
type CopyTable = Record<string, Record<string, Partial<ProductCopy>> | undefined>;
/** Optional export, read by name so bundlers don't warn while the deck module doesn't have it yet. */
const deckStrings = Reflect.get(DECKS, ['DECK', 'STRINGS'].join('_')) as CopyTable | undefined;

function deckCopy(id: string, lang: string): Partial<ProductCopy> | null {
  if (!deckStrings) return null;
  const byLang = (l: string) => {
    const pack = deckStrings[l] as (Record<string, Partial<ProductCopy>> & { decks?: Record<string, Partial<ProductCopy>> }) | undefined;
    return pack?.decks?.[id] ?? pack?.[id] ?? (deckStrings[id] as Record<string, Partial<ProductCopy>> | undefined)?.[l];
  };
  return byLang(lang) ?? byLang('en') ?? null;
}

/** The City edition's city name in the visitor's language (Journey strings), e.g. "Rīga", "Тбилиси". */
export function cityName(city: CityId, lang: string): string {
  const j = pick(JOURNEY_STRINGS, lang).cities as Record<string, { name: string } | undefined>;
  return j[city]?.name ?? JOURNEY_STRINGS.en.cities[city as keyof typeof JOURNEY_STRINGS.en.cities]?.name ?? city;
}

export function designCopy(p: Product, s: MerchStrings, lang: string): DesignCopy {
  if (p.city && p.id.startsWith('city-')) {
    const name = cityName(p.city, lang);
    return { name: s.salon(name), tag: s.cityLine, story: `${s.cityStory(name)} ${s.cities[p.city]}` };
  }
  const key = (p.story ?? p.design.replace(/-wrap$/, '')) as DesignKey;
  return s.designs[key] ?? MERCH_STRINGS.en.designs[key]
    // a deck without copy of its own (DECK_STRINGS) still reads as the Bridge 125 deck
    ?? (kindOf(p) === 'deck' ? s.designs.deck : { name: p.id, tag: '', story: '' });
}

export function productCopy(p: Product, s: MerchStrings, lang: string): ProductCopy {
  const kind = s.kinds[kindOf(p)];
  const d = designCopy(p, s, lang);
  const composed: ProductCopy = {
    name: s.named(kind.name, d.name),
    tagline: d.tag, desc: d.story, details: kind.details,
  };
  const own = deckCopy(p.id, lang);
  return own ? { ...composed, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v !== undefined && v !== '')) } as ProductCopy : composed;
}
