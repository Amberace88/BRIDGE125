import { withFallback, type DeepPartial, type Strings } from '../../i18n/pick';
import type { Lang } from '../../i18n';
import type { LayoutId } from './core/layouts';
import { TAGLINE, TITLE } from './meta';

/**
 * Mahjong strings. en / lv / ru / uk are complete; the other 13 languages carry the title, tagline, the layout names
 * and the main buttons, and fall back to English key by key (withFallback) for the rest.
 */
export interface MahjongStrings {
  title: string;
  tagline: string;
  back: string;
  daily: string;
  dailySub: string;
  dailyNo: (n: number) => string;
  nextIn: (t: string) => string;
  units: { h: string; m: string };
  free: string;
  freeSub: string;
  newGame: string;
  continue: string;
  play: string;
  playFree: string;
  layouts: Record<LayoutId, string>;
  layoutInfo: Record<LayoutId, string>;
  tiles: (n: number) => string;
  left: (n: number) => string;
  pairs: (n: number) => string;
  streak: (n: number) => string;
  streakNone: string;
  best: string;
  cleared: string;
  clearedN: (n: number) => string;
  notCleared: string;
  time: string;
  score: string;
  hud: { tiles: string; moves: string };
  combo: (n: number) => string;
  tools: { undo: string; hint: string; shuffle: string; pause: string; settings: string; zoom: string };
  paused: string;
  resume: string;
  noMoves: { title: string; sub: string; shuffle: (n: number) => string; none: string; end: string; undo: string };
  shuffled: string;
  unsolvable: string;
  settings: { title: string; skin: string; classic: string; cards: string; dim: string; sound: string; restart: string; abandon: string; close: string };
  facts: { layout: string; hints: string; shuffles: string; combo: string };
  win: string;
  keys: string;
}

const ruPl = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
const lvPl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

const en: MahjongStrings = {
  title: TITLE.en,
  tagline: TAGLINE.en,
  back: 'Back',
  daily: 'Daily Mahjong',
  dailySub: 'Everyone plays the same board today',
  dailyNo: n => `No. ${n}`,
  nextIn: t => `New in ${t}`,
  units: { h: 'h', m: 'm' },
  free: 'Free play',
  freeSub: 'Pick a layout — every deal can be cleared',
  newGame: 'New game',
  continue: 'Continue',
  play: 'Play',
  playFree: 'Play this layout',
  layouts: { turtle: 'Turtle', fortress: 'Fortress', pyramid: 'Pyramid', dragon: 'Dragon', pagoda: 'Pagoda' },
  layoutInfo: { turtle: 'The classic', fortress: 'Walls and towers', pyramid: 'Five steep steps', dragon: 'A long winding body', pagoda: 'Tall and quick — made for phones' },
  tiles: n => `${n} tiles`,
  left: n => `${n} left`,
  pairs: n => `${n} ${n === 1 ? 'move' : 'moves'}`,
  streak: n => `${n}-day streak`,
  streakNone: 'Clear a daily to start a streak',
  best: 'Best',
  cleared: 'Cleared',
  clearedN: n => `${n} cleared`,
  notCleared: 'Not cleared',
  time: 'Time',
  score: 'Score',
  hud: { tiles: 'Tiles', moves: 'Moves' },
  combo: n => `Combo ×${n}`,
  tools: { undo: 'Undo', hint: 'Hint', shuffle: 'Shuffle', pause: 'Pause', settings: 'Settings', zoom: 'Zoom' },
  paused: 'Paused',
  resume: 'Resume',
  noMoves: {
    title: 'No more moves',
    sub: 'No free pair is left on the board.',
    shuffle: n => `Shuffle (${n} left)`,
    none: 'No shuffles left — take a move back, or end the game.',
    end: 'End game',
    undo: 'Undo',
  },
  shuffled: 'Shuffled — still clearable',
  unsolvable: 'Shuffled — these last tiles can’t all be cleared',
  settings: {
    title: 'Settings', skin: 'Tiles', classic: 'Classic', cards: 'Card suits', dim: 'Dim blocked tiles', sound: 'Sound',
    restart: 'Restart this deal', abandon: 'Abandon game', close: 'Close',
  },
  facts: { layout: 'Layout', hints: 'Hints', shuffles: 'Shuffles', combo: 'Best combo' },
  win: 'Board cleared!',
  keys: 'H hint · S shuffle · Z undo · Space pause',
};

const lv: MahjongStrings = {
  title: TITLE.lv,
  tagline: TAGLINE.lv,
  back: 'Atpakaļ',
  daily: 'Dienas madžongs',
  dailySub: 'Šodien visi spēlē vienu un to pašu galdu',
  dailyNo: n => `Nr. ${n}`,
  nextIn: t => `Jauns pēc ${t}`,
  units: { h: 'h', m: 'min' },
  free: 'Brīvā spēle',
  freeSub: 'Izvēlies izkārtojumu — katru dalījumu var atrisināt',
  newGame: 'Jauna spēle',
  continue: 'Turpināt',
  play: 'Spēlēt',
  playFree: 'Spēlēt šo izkārtojumu',
  layouts: { turtle: 'Bruņurupucis', fortress: 'Cietoksnis', pyramid: 'Piramīda', dragon: 'Pūķis', pagoda: 'Pagoda' },
  layoutInfo: { turtle: 'Klasika', fortress: 'Mūri un torņi', pyramid: 'Piecas stāvas pakāpes', dragon: 'Garš, līkumots ķermenis', pagoda: 'Augsta un ātra — telefonam' },
  tiles: n => `${n} ${lvPl(n, 'kauliņš', 'kauliņi')}`,
  left: n => `${n} ${lvPl(n, 'palicis', 'palikuši')}`,
  pairs: n => `${n} ${lvPl(n, 'gājiens', 'gājieni')}`,
  streak: n => `${n} ${lvPl(n, 'diena', 'dienas')} pēc kārtas`,
  streakNone: 'Atrisini dienas galdu, lai sāktu sēriju',
  best: 'Labākais',
  cleared: 'Notīrīts',
  clearedN: n => `${n} ${lvPl(n, 'notīrīts', 'notīrīti')}`,
  notCleared: 'Nav notīrīts',
  time: 'Laiks',
  score: 'Punkti',
  hud: { tiles: 'Kauliņi', moves: 'Gājieni' },
  combo: n => `Kombo ×${n}`,
  tools: { undo: 'Atsaukt', hint: 'Padoms', shuffle: 'Sajaukt', pause: 'Pauze', settings: 'Iestatījumi', zoom: 'Tuvināt' },
  paused: 'Pauze',
  resume: 'Turpināt',
  noMoves: {
    title: 'Vairs nav gājienu',
    sub: 'Uz galda nav palicis neviens brīvs pāris.',
    shuffle: n => `Sajaukt (atlikuši ${n})`,
    none: 'Sajaukšanas beigušās — atsauc gājienu vai beidz spēli.',
    end: 'Beigt spēli',
    undo: 'Atsaukt',
  },
  shuffled: 'Sajaukts — joprojām atrisināms',
  unsolvable: 'Sajaukts — šos pēdējos kauliņus visus notīrīt nevar',
  settings: {
    title: 'Iestatījumi', skin: 'Kauliņi', classic: 'Klasiskie', cards: 'Kāršu mastis', dim: 'Aptumšot bloķētos kauliņus', sound: 'Skaņa',
    restart: 'Sākt šo dalījumu no jauna', abandon: 'Pamest spēli', close: 'Aizvērt',
  },
  facts: { layout: 'Izkārtojums', hints: 'Padomi', shuffles: 'Sajaukšanas', combo: 'Labākais kombo' },
  win: 'Galds notīrīts!',
  keys: 'H padoms · S sajaukt · Z atsaukt · Atstarpe pauze',
};

const ru: MahjongStrings = {
  title: TITLE.ru,
  tagline: TAGLINE.ru,
  back: 'Назад',
  daily: 'Маджонг дня',
  dailySub: 'Сегодня все играют одну и ту же доску',
  dailyNo: n => `№ ${n}`,
  nextIn: t => `Новая через ${t}`,
  units: { h: 'ч', m: 'мин' },
  free: 'Свободная игра',
  freeSub: 'Выберите раскладку — любая раздача решаема',
  newGame: 'Новая игра',
  continue: 'Продолжить',
  play: 'Играть',
  playFree: 'Играть эту раскладку',
  layouts: { turtle: 'Черепаха', fortress: 'Крепость', pyramid: 'Пирамида', dragon: 'Дракон', pagoda: 'Пагода' },
  layoutInfo: { turtle: 'Классика', fortress: 'Стены и башни', pyramid: 'Пять крутых ступеней', dragon: 'Длинное извилистое тело', pagoda: 'Высокая и быстрая — для телефона' },
  tiles: n => `${n} ${ruPl(n, 'кость', 'кости', 'костей')}`,
  left: n => `осталось ${n}`,
  pairs: n => `${n} ${ruPl(n, 'ход', 'хода', 'ходов')}`,
  streak: n => `${n} ${ruPl(n, 'день', 'дня', 'дней')} подряд`,
  streakNone: 'Решите доску дня, чтобы начать серию',
  best: 'Рекорд',
  cleared: 'Разобрано',
  clearedN: n => `разобрано: ${n}`,
  notCleared: 'Не разобрано',
  time: 'Время',
  score: 'Очки',
  hud: { tiles: 'Кости', moves: 'Ходы' },
  combo: n => `Комбо ×${n}`,
  tools: { undo: 'Отменить', hint: 'Подсказка', shuffle: 'Перемешать', pause: 'Пауза', settings: 'Настройки', zoom: 'Масштаб' },
  paused: 'Пауза',
  resume: 'Продолжить',
  noMoves: {
    title: 'Ходов больше нет',
    sub: 'На доске не осталось ни одной свободной пары.',
    shuffle: n => `Перемешать (осталось ${n})`,
    none: 'Перемешиваний не осталось — отмените ход или завершите игру.',
    end: 'Завершить игру',
    undo: 'Отменить',
  },
  shuffled: 'Перемешано — всё ещё решаемо',
  unsolvable: 'Перемешано — эти последние кости все не убрать',
  settings: {
    title: 'Настройки', skin: 'Кости', classic: 'Классические', cards: 'Карточные масти', dim: 'Затемнять заблокированные', sound: 'Звук',
    restart: 'Начать эту раздачу заново', abandon: 'Бросить игру', close: 'Закрыть',
  },
  facts: { layout: 'Раскладка', hints: 'Подсказки', shuffles: 'Перемешивания', combo: 'Лучшее комбо' },
  win: 'Доска разобрана!',
  keys: 'H подсказка · S перемешать · Z отмена · Пробел пауза',
};

const uk: MahjongStrings = {
  title: TITLE.uk,
  tagline: TAGLINE.uk,
  back: 'Назад',
  daily: 'Маджонг дня',
  dailySub: 'Сьогодні всі грають ту саму дошку',
  dailyNo: n => `№ ${n}`,
  nextIn: t => `Нова через ${t}`,
  units: { h: 'год', m: 'хв' },
  free: 'Вільна гра',
  freeSub: 'Оберіть розкладку — кожну роздачу можна розібрати',
  newGame: 'Нова гра',
  continue: 'Продовжити',
  play: 'Грати',
  playFree: 'Грати цю розкладку',
  layouts: { turtle: 'Черепаха', fortress: 'Фортеця', pyramid: 'Піраміда', dragon: 'Дракон', pagoda: 'Пагода' },
  layoutInfo: { turtle: 'Класика', fortress: 'Мури й вежі', pyramid: 'П’ять крутих сходинок', dragon: 'Довге звивисте тіло', pagoda: 'Висока й швидка — для телефона' },
  tiles: n => `${n} ${ruPl(n, 'кістка', 'кістки', 'кісток')}`,
  left: n => `залишилось ${n}`,
  pairs: n => `${n} ${ruPl(n, 'хід', 'ходи', 'ходів')}`,
  streak: n => `${n} ${ruPl(n, 'день', 'дні', 'днів')} поспіль`,
  streakNone: 'Розберіть дошку дня, щоб почати серію',
  best: 'Рекорд',
  cleared: 'Розібрано',
  clearedN: n => `розібрано: ${n}`,
  notCleared: 'Не розібрано',
  time: 'Час',
  score: 'Очки',
  hud: { tiles: 'Кістки', moves: 'Ходи' },
  combo: n => `Комбо ×${n}`,
  tools: { undo: 'Скасувати', hint: 'Підказка', shuffle: 'Перемішати', pause: 'Пауза', settings: 'Налаштування', zoom: 'Масштаб' },
  paused: 'Пауза',
  resume: 'Продовжити',
  noMoves: {
    title: 'Ходів більше немає',
    sub: 'На дошці не лишилося жодної вільної пари.',
    shuffle: n => `Перемішати (лишилось ${n})`,
    none: 'Перемішувань не лишилось — скасуйте хід або завершіть гру.',
    end: 'Завершити гру',
    undo: 'Скасувати',
  },
  shuffled: 'Перемішано — досі можна розібрати',
  unsolvable: 'Перемішано — ці останні кістки всі не прибрати',
  settings: {
    title: 'Налаштування', skin: 'Кістки', classic: 'Класичні', cards: 'Карткові масті', dim: 'Затемнювати заблоковані', sound: 'Звук',
    restart: 'Почати цю роздачу знову', abandon: 'Покинути гру', close: 'Закрити',
  },
  facts: { layout: 'Розкладка', hints: 'Підказки', shuffles: 'Перемішування', combo: 'Найкраще комбо' },
  win: 'Дошку розібрано!',
  keys: 'H підказка · S перемішати · Z скасувати · Пробіл пауза',
};

type Main = Pick<MahjongStrings, 'back' | 'daily' | 'free' | 'newGame' | 'continue' | 'play' | 'resume' | 'layouts'> & { tools: Omit<MahjongStrings['tools'], 'settings' | 'zoom'> };
const main = (
  back: string, daily: string, free: string, newGame: string, cont: string, play: string, resume: string,
  layouts: [string, string, string, string, string], tools: [string, string, string, string],
): Main => ({
  back, daily, free, newGame, continue: cont, play, resume,
  layouts: { turtle: layouts[0], fortress: layouts[1], pyramid: layouts[2], dragon: layouts[3], pagoda: layouts[4] },
  tools: { undo: tools[0], hint: tools[1], shuffle: tools[2], pause: tools[3] },
});

const PARTIAL: Partial<Record<Lang, DeepPartial<MahjongStrings>>> = {
  lt: main('Atgal', 'Dienos madžongas', 'Laisvas žaidimas', 'Naujas žaidimas', 'Tęsti', 'Žaisti', 'Tęsti',
    ['Vėžlys', 'Tvirtovė', 'Piramidė', 'Drakonas', 'Pagoda'], ['Atšaukti', 'Užuomina', 'Sumaišyti', 'Pauzė']),
  et: main('Tagasi', 'Päeva mahjong', 'Vabamäng', 'Uus mäng', 'Jätka', 'Mängi', 'Jätka',
    ['Kilpkonn', 'Kindlus', 'Püramiid', 'Draakon', 'Pagood'], ['Võta tagasi', 'Vihje', 'Sega', 'Paus']),
  pl: main('Wstecz', 'Mahjong dnia', 'Gra swobodna', 'Nowa gra', 'Kontynuuj', 'Graj', 'Wznów',
    ['Żółw', 'Twierdza', 'Piramida', 'Smok', 'Pagoda'], ['Cofnij', 'Podpowiedź', 'Potasuj', 'Pauza']),
  de: main('Zurück', 'Tages-Mahjong', 'Freies Spiel', 'Neues Spiel', 'Weiterspielen', 'Spielen', 'Fortsetzen',
    ['Schildkröte', 'Festung', 'Pyramide', 'Drache', 'Pagode'], ['Rückgängig', 'Tipp', 'Mischen', 'Pause']),
  be: main('Назад', 'Маджонг дня', 'Вольная гульня', 'Новая гульня', 'Працягнуць', 'Гуляць', 'Працягнуць',
    ['Чарапаха', 'Крэпасць', 'Піраміда', 'Цмок', 'Пагада'], ['Адмяніць', 'Падказка', 'Перамяшаць', 'Паўза']),
  kk: main('Артқа', 'Күн маджонгы', 'Еркін ойын', 'Жаңа ойын', 'Жалғастыру', 'Ойнау', 'Жалғастыру',
    ['Тасбақа', 'Қамал', 'Пирамида', 'Айдаһар', 'Пагода'], ['Болдырмау', 'Кеңес', 'Араластыру', 'Үзіліс']),
  uz: main('Orqaga', 'Kun mahjongi', 'Erkin o‘yin', 'Yangi o‘yin', 'Davom etish', 'O‘ynash', 'Davom etish',
    ['Toshbaqa', 'Qal’a', 'Piramida', 'Ajdaho', 'Pagoda'], ['Bekor qilish', 'Maslahat', 'Aralashtirish', 'Pauza']),
  az: main('Geri', 'Günün mahjongu', 'Sərbəst oyun', 'Yeni oyun', 'Davam et', 'Oyna', 'Davam et',
    ['Tısbağa', 'Qala', 'Piramida', 'Əjdaha', 'Paqoda'], ['Geri al', 'İpucu', 'Qarışdır', 'Fasilə']),
  ka: main('უკან', 'დღის მაჯონგი', 'თავისუფალი თამაში', 'ახალი თამაში', 'გაგრძელება', 'თამაში', 'გაგრძელება',
    ['კუ', 'ციხესიმაგრე', 'პირამიდა', 'დრაკონი', 'პაგოდა'], ['გაუქმება', 'მინიშნება', 'არევა', 'პაუზა']),
  hy: main('Հետ', 'Օրվա մաջոնգ', 'Ազատ խաղ', 'Նոր խաղ', 'Շարունակել', 'Խաղալ', 'Շարունակել',
    ['Կրիա', 'Ամրոց', 'Բուրգ', 'Վիշապ', 'Պագոդա'], ['Հետարկել', 'Հուշում', 'Խառնել', 'Դադար']),
  ro: main('Înapoi', 'Mahjongul zilei', 'Joc liber', 'Joc nou', 'Continuă', 'Joacă', 'Reia',
    ['Broasca țestoasă', 'Fortăreața', 'Piramida', 'Dragonul', 'Pagoda'], ['Anulează', 'Indiciu', 'Amestecă', 'Pauză']),
  bg: main('Назад', 'Маджонг на деня', 'Свободна игра', 'Нова игра', 'Продължи', 'Играй', 'Продължи',
    ['Костенурка', 'Крепост', 'Пирамида', 'Дракон', 'Пагода'], ['Отмени', 'Подсказка', 'Разбъркай', 'Пауза']),
  es: main('Atrás', 'Mahjong del día', 'Juego libre', 'Nueva partida', 'Continuar', 'Jugar', 'Reanudar',
    ['Tortuga', 'Fortaleza', 'Pirámide', 'Dragón', 'Pagoda'], ['Deshacer', 'Pista', 'Barajar', 'Pausa']),
};

export const MAHJONG_STRINGS: Strings<MahjongStrings> = { en, lv, ru, uk };
for (const [lang, part] of Object.entries(PARTIAL) as [Lang, DeepPartial<MahjongStrings>][]) {
  MAHJONG_STRINGS[lang] = withFallback(en, { ...part, title: TITLE[lang], tagline: TAGLINE[lang] });
}
