import type { Lang } from '../../i18n';

/** Hub tile: title + tagline in all 17 languages (kept tiny: the registry loads this with the app shell). */
export const TITLES: Record<Lang, string> = {
  en: 'Thousand', lv: 'Tūkstotis', ru: 'Тысяча', uk: 'Тисяча', lt: 'Tūkstantis', et: 'Tuhat', pl: 'Tysiąc', de: 'Tausend',
  be: 'Тысяча', kk: 'Мың', uz: 'Ming', az: 'Min', ka: 'ათასი', hy: 'Հազար', ro: 'O mie', bg: 'Хиляда', es: 'Mil',
};
export const TAGLINES: Record<Lang, string> = {
  en: 'Bid, take the talon, declare marriages — race to 1000',
  lv: 'Solī, ņem pirkumu, piesaki mariāžas — pirmais līdz 1000',
  ru: 'Торгуйся, бери прикуп, объявляй марьяжи — кто первым до 1000',
  uk: 'Торгуйся, бери прикуп, оголошуй мар’яжі — хто першим до 1000',
  lt: 'Varžykis, imk talioną, skelbk santuokas — iki 1000',
  et: 'Pakkumine, talong ja abielud — esimesena 1000 punktini',
  pl: 'Licytuj, bierz musik, meldunki — kto pierwszy do 1000',
  de: 'Reizen, Stock aufnehmen, Paare melden — wer erreicht 1000?',
  be: 'Таргуйся, бяры прыкуп, абвяшчай мар’яжы — хто першы да 1000',
  kk: 'Сауда, прикуп, марьяж — 1000 ұпайға кім бірінші жетеді',
  uz: 'Savdo, prikup va maryajlar — 1000 ochkoga birinchi bo‘l',
  az: 'Hərrac, prikup, maryaj — 1000-ə ilk çatan qalib',
  ka: 'ვაჭრობა, პრიკუპი, მარიაჟი — ვინ მიაღწევს 1000-ს პირველი',
  hy: 'Սակարկիր, վերցրու պրիկուպը, հայտարարիր մարյաժ — մինչև 1000',
  ro: 'Licitează, ia talonul, anunță mariaje — primul la 1000',
  bg: 'Наддавай, вземи прикупа, обявявай женитби — първият до 1000',
  es: 'Puja, toma el talón, canta matrimonios — el primero a 1000',
};
