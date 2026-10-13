import type { DeepPartial } from '../pick';
import type { HomeStrings } from '../home';
import type { TableStrings } from '../table';
import type { ShopStrings } from '../shop';
import type { MediaStrings } from '../media';
import type { MerchStrings } from '../merch';
import type { SocialStrings } from '../social';
import type { JourneyStrings, QuestStrings } from '../journey';
import type { AchStrings } from '../achievements';
import type { EcoStrings } from '../economy';
import type { CosStrings } from '../../cosmetics/i18n';

/**
 * Feature strings for one lazily loaded language — one chunk per language, fetched together with the core
 * pack in src/locales/<lang>.ts. Every module is DeepPartial: keys added to English later fall back to
 * English (see `withFallback` in ../pick.ts) until someone translates them here.
 */
export interface FeaturePack {
  home: DeepPartial<HomeStrings>;
  table: DeepPartial<TableStrings>;
  shop: DeepPartial<ShopStrings>;
  media: DeepPartial<MediaStrings>;
  merch: DeepPartial<MerchStrings>;
  social: DeepPartial<SocialStrings>;
  journey: DeepPartial<JourneyStrings>;
  quests: DeepPartial<QuestStrings>;
  achievements: DeepPartial<AchStrings>;
  economy: DeepPartial<EcoStrings>;
  /** Wardrobe / shop cosmetic names (src/cosmetics/i18n.ts). Optional: a pack without it shows English. */
  cosmetics?: DeepPartial<CosStrings>;
}
