// Hub tile texts in all 17 languages (kept tiny: the hub loads this eagerly; the game itself is lazy).
import type { Lang } from '../../i18n';

export const TITLE: Record<Lang, string> = {
  en: 'Solitaire', lv: 'Pasjanss', ru: 'Пасьянс', uk: 'Пасьянс', lt: 'Pasjansas', et: 'Pasjanss', pl: 'Pasjans',
  de: 'Solitär', be: 'Пасьянс', kk: 'Пасьянс', uz: 'Pasyans', az: 'Pasyans', ka: 'პასიანსი', hy: 'Պասյանս',
  ro: 'Pasiență', bg: 'Пасианс', es: 'Solitario',
};

export const TAGLINE: Record<Lang, string> = {
  en: 'Klondike and Spider — calm, classic, beautifully dealt.',
  lv: 'Klondaika un Zirneklis — mierīgi, klasiski, skaisti izdalīts.',
  ru: 'Косынка и Паук — спокойно, классически, красиво разложено.',
  uk: 'Косинка і Павук — спокійно, класично, красиво розкладено.',
  lt: 'Klondaikas ir Voras — ramu, klasikinė, gražiai išdalinta.',
  et: 'Klondike ja Ämblik — rahulik, klassikaline, kaunilt jagatud.',
  pl: 'Klondike i Pająk — spokojnie, klasycznie, pięknie rozdane.',
  de: 'Klondike und Spider — ruhig, klassisch, schön gegeben.',
  be: 'Касынка і Павук — спакойна, класічна, прыгожа раскладзена.',
  kk: 'Клондайк пен Өрмекші — сабырлы, классикалық, әдемі таратылған.',
  uz: 'Klondayk va O‘rgimchak — sokin, klassik, chiroyli tarqatilgan.',
  az: 'Klondayk və Hörümçək — sakit, klassik, gözəl paylanmış.',
  ka: 'კლონდაიკი და ობობა — მშვიდი, კლასიკური, ლამაზად დარიგებული.',
  hy: 'Կլոնդայկ և Սարդ — հանգիստ, դասական, գեղեցիկ բաժանված։',
  ro: 'Klondike și Păianjen — calm, clasic, frumos împărțit.',
  bg: 'Клондайк и Паяк — спокойно, класически, красиво раздадено.',
  es: 'Klondike y Spider: tranquilo, clásico, bellamente repartido.',
};
