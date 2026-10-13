import type { DeckTheme } from '../lib/cards.ts';
import { baltic } from './baltic.ts';
import { bauhaus } from './bauhaus.ts';
import { caucasus } from './caucasus.ts';
import { iberian } from './iberian.ts';
import { ivory } from './ivory.ts';
import { neon } from './neon.ts';
import { slavic } from './slavic.ts';
import { signature } from './signature.ts';

/** The collection, in store order. */
export const DECKS: DeckTheme[] = [signature, baltic, slavic, caucasus, iberian, bauhaus, neon, ivory];
