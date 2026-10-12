import type { Dict } from '../i18n';
import type { Extra } from '../i18n2';
import type { Extra2, LegalDoc } from '../i18n3';

/**
 * Everything one language needs. Typed against the same interfaces as the bundled
 * en/lv/ru/uk strings, so TypeScript rejects a pack that misses or misspells any key.
 */
export interface LocalePack {
  dict: Dict;
  extra: Extra;
  extra2: Extra2;
  privacy: LegalDoc;
  terms: LegalDoc;
}
