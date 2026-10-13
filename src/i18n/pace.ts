import type { Strings } from './pick';

/** Fast mode against bots (the » glyph in the table's top bar) — short, in all 17 languages. */
export interface PaceStrings {
  /** label / aria of the glyph */
  fast: string;
  /** first-use hint under the glyph */
  hint: string;
  /** long-press: the bots play on until it is my turn */
  skipping: string;
  /** on / off agreeing with "mode" where the app-wide word does not (falls back to the app's on/off) */
  on?: string; off?: string;
}

export const PACE: Strings<PaceStrings> = {
  en: { fast: 'Fast mode', hint: 'Tap to speed up the bots · hold to skip to your turn', skipping: 'Skipping to your turn' },
  lv: { fast: 'Ātrais režīms', hint: 'Pieskaries — boti spēlē ātrāk · turi — uzreiz līdz tavam gājienam', skipping: 'Tinam līdz tavam gājienam', on: 'ieslēgts', off: 'izslēgts' },
  ru: { fast: 'Быстрый режим', hint: 'Нажмите — боты ходят быстрее · удерживайте — сразу к вашему ходу', skipping: 'Перематываем к вашему ходу' },
  uk: { fast: 'Швидкий режим', hint: 'Торкніться — боти ходять швидше · утримуйте — одразу до вашого ходу', skipping: 'Перемотуємо до вашого ходу' },
  lt: { fast: 'Greitas režimas', hint: 'Bakstelėk — robotai žais greičiau · palaikyk — iškart iki tavo ėjimo', skipping: 'Peršokame iki tavo ėjimo' },
  et: { fast: 'Kiirrežiim', hint: 'Puuduta — robotid mängivad kiiremini · hoia — kohe sinu käiguni', skipping: 'Kerime sinu käiguni' },
  pl: { fast: 'Tryb szybki', hint: 'Stuknij — boty grają szybciej · przytrzymaj — od razu do twojego ruchu', skipping: 'Przewijamy do twojego ruchu' },
  de: { fast: 'Schnellmodus', hint: 'Tippen — Bots spielen schneller · halten — direkt zu deinem Zug', skipping: 'Weiter bis zu deinem Zug' },
  be: { fast: 'Хуткі рэжым', hint: 'Націсніце — боты ходзяць хутчэй · утрымлівайце — адразу да вашага ходу', skipping: 'Перамотваем да вашага ходу' },
  kk: { fast: 'Жылдам режим', hint: 'Түртіңіз — боттар жылдамырақ ойнайды · басып тұрыңыз — бірден сіздің жүрісіңізге', skipping: 'Сіздің жүрісіңізге өтудеміз' },
  uz: { fast: 'Tezkor rejim', hint: 'Bosing — botlar tezroq oʻynaydi · bosib turing — darhol sizning yurishingizga', skipping: 'Yurishingizgacha oʻtkazyapmiz' },
  az: { fast: 'Sürətli rejim', hint: 'Toxunun — botlar daha sürətli oynayır · basılı saxlayın — dərhal sizin gedişinizə', skipping: 'Sizin gedişinizə keçirik' },
  ka: { fast: 'სწრაფი რეჟიმი', hint: 'შეეხეთ — ბოტები უფრო სწრაფად ითამაშებენ · დააჭირეთ და გააჩერეთ — პირდაპირ თქვენს სვლამდე', skipping: 'გადავდივართ თქვენს სვლამდე' },
  hy: { fast: 'Արագ ռեժիմ', hint: 'Հպեք՝ բոտերը կխաղան ավելի արագ · պահեք՝ անմիջապես ձեր քայլին', skipping: 'Անցնում ենք ձեր քայլին' },
  ro: { fast: 'Mod rapid', hint: 'Atinge — boții joacă mai repede · ține apăsat — direct la mutarea ta', skipping: 'Derulăm până la mutarea ta' },
  bg: { fast: 'Бърз режим', hint: 'Докосни — ботовете играят по-бързо · задръж — направо до твоя ход', skipping: 'Превъртаме до твоя ход' },
  es: { fast: 'Modo rápido', hint: 'Toca: los bots juegan más rápido · mantén: salta a tu turno', skipping: 'Saltando a tu turno' },
};
