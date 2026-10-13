// Hub tile texts in all 17 languages (kept tiny: the hub loads this eagerly; the game itself is lazy).
// The names follow what players call the game there: Windows gave it "Свободная ячейка" in Russian and
// "Carta Blanca" in Spanish; elsewhere (Latvian included) it has always simply been "FreeCell".
import type { Lang } from '../../i18n';

export const TITLE: Record<Lang, string> = {
  en: 'FreeCell', lv: 'FreeCell', ru: 'Свободная ячейка', uk: 'FreeCell', lt: 'FreeCell', et: 'FreeCell', pl: 'FreeCell',
  de: 'FreeCell', be: 'FreeCell', kk: 'FreeCell', uz: 'FreeCell', az: 'FreeCell', ka: 'FreeCell', hy: 'FreeCell',
  ro: 'FreeCell', bg: 'FreeCell', es: 'Carta Blanca',
};

export const TAGLINE: Record<Lang, string> = {
  en: 'Four free cells, every card in sight — pure skill.',
  lv: 'Četras brīvās šūnas, visas kārtis redzamas — tīra prasme.',
  ru: 'Четыре свободные ячейки, все карты открыты — чистое мастерство.',
  uk: 'Чотири вільні клітинки, усі карти відкриті — чиста майстерність.',
  lt: 'Keturi laisvi langeliai, visos kortos matomos — grynas meistriškumas.',
  et: 'Neli vaba lahtrit, kõik kaardid näha — puhas oskus.',
  pl: 'Cztery wolne komórki, wszystkie karty odkryte — czysta umiejętność.',
  de: 'Vier freie Zellen, alle Karten offen — reines Können.',
  be: 'Чатыры вольныя ячэйкі, усе карты адкрытыя — чыстае майстэрства.',
  kk: 'Төрт бос ұяшық, барлық карта ашық — таза шеберлік.',
  uz: 'To‘rtta bo‘sh katak, barcha kartalar ochiq — sof mahorat.',
  az: 'Dörd boş xana, bütün kartlar açıq — saf ustalıq.',
  ka: 'ოთხი თავისუფალი უჯრა, ყველა კარტი ჩანს — სუფთა ოსტატობა.',
  hy: 'Չորս ազատ բջիջ, բոլոր խաղաքարտերը բաց են — մաքուր վարպետություն։',
  ro: 'Patru celule libere, toate cărțile la vedere — îndemânare pură.',
  bg: 'Четири свободни клетки, всички карти открити — чисто майсторство.',
  es: 'Cuatro celdas libres, todas las cartas a la vista: pura habilidad.',
};
