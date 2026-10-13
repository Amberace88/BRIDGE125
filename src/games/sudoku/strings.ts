import type { Strings } from '../../i18n/pick';
import type { Level } from './core/grid';
import type { Technique } from './core/logic';
import { TAGLINE, TITLE } from './meta';
import lt from './lang/lt';
import et from './lang/et';
import pl from './lang/pl';
import de from './lang/de';
import be from './lang/be';
import kk from './lang/kk';
import uz from './lang/uz';
import az from './lang/az';
import ka from './lang/ka';
import hy from './lang/hy';
import ro from './lang/ro';
import bg from './lang/bg';
import es from './lang/es';

/** Sudoku strings, complete in all 17 languages: en / lv / ru / uk here, the other 13 in ./lang/<code>.ts. */
export interface SudokuStrings {
  title: string;
  tagline: string;
  back: string;
  daily: string;
  dailySub: string;
  dailyNo: (n: number) => string;
  nextIn: (t: string) => string;
  /** hours / minutes after a number ("5h 07m") */
  units: { h: string; m: string };
  classic: string;
  classicSub: string;
  newGame: string;
  continue: string;
  play: string;
  next: string;
  retry: string;
  levels: Record<Level, string>;
  levelInfo: Record<Level, string>;
  streak: (n: number) => string;
  streakNone: string;
  best: string;
  solvedN: (n: number) => string;
  generating: string;
  solvedIn: (t: string) => string;
  failed: string;
  mistakes: string;
  hints: string;
  time: string;
  score: string;
  pause: string;
  paused: string;
  resume: string;
  tools: { undo: string; redo: string; erase: string; notes: string; hint: string; settings: string };
  settings: {
    title: string; autoClear: string; conflicts: string; limit: string; sameDigits: string; sound: string;
    fillNotes: string; restart: string; abandon: string;
  };
  keys: string;
  hint: {
    title: string; reveal: string; close: string; first: string; more: (n: number) => string;
    wrong: string; revealed: string;
    tech: Record<Technique, string>;
    row: (n: number) => string; col: (n: number) => string; box: (n: number) => string;
    list: (ds: number[]) => string;
    text: {
      fullHouse: (u: string, d: number) => string;
      nakedSingle: (d: number) => string;
      hiddenSingle: (u: string, d: number) => string;
      pointing: (box: string, line: string, d: number) => string;
      claiming: (line: string, box: string, d: number) => string;
      naked: (u: string, ds: string) => string;
      hidden: (u: string, ds: string) => string;
      fish: (name: string, d: number) => string;
      wing: (name: string, d: number) => string;
      then: (d: number) => string;
    };
  };
  win: { title: string; daily: string; perfect: string; newBest: string; signIn: string; reward: (bm: number) => string };
  lost: { title: string; sub: string };
}

const TECH_EN: Record<Technique, string> = {
  fullHouse: 'Full house', nakedSingle: 'Naked single', hiddenSingle: 'Hidden single',
  pointing: 'Pointing', claiming: 'Box–line reduction', nakedPair: 'Naked pair', hiddenPair: 'Hidden pair',
  nakedTriple: 'Naked triple', hiddenTriple: 'Hidden triple', nakedQuad: 'Naked quad',
  xWing: 'X-Wing', swordfish: 'Swordfish', xyWing: 'XY-Wing', xyzWing: 'XYZ-Wing',
};

const listWith = (and: string) => (ds: number[]) => (ds.length < 2 ? ds.join('') : ds.slice(0, -1).join(', ') + ` ${and} ` + ds[ds.length - 1]);
const ruPl = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
const lvPl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

const en: SudokuStrings = {
  title: TITLE.en,
  tagline: TAGLINE.en,
  back: 'Back',
  daily: 'Daily Sudoku',
  dailySub: 'Everyone plays the same grids today',
  dailyNo: n => `No. ${n}`,
  nextIn: t => `New in ${t}`,
  units: { h: 'h', m: 'm' },
  classic: 'Free play',
  classicSub: 'A brand-new grid every time',
  newGame: 'New game',
  continue: 'Continue',
  play: 'Play',
  next: 'Next puzzle',
  retry: 'Try again',
  levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' },
  levelInfo: { easy: 'Singles, lots of givens', medium: 'Singles, sparse grid', hard: 'Pairs & pointing', expert: 'X-Wing & XY-Wing' },
  streak: n => `${n}-day streak`,
  streakNone: 'Solve a daily to start a streak',
  best: 'Best',
  solvedN: n => `${n} solved`,
  generating: 'Shuffling a fresh grid…',
  solvedIn: t => `Solved in ${t}`,
  failed: 'Not solved',
  mistakes: 'Mistakes',
  hints: 'Hints',
  time: 'Time',
  score: 'Score',
  pause: 'Pause',
  paused: 'Paused',
  resume: 'Resume',
  tools: { undo: 'Undo', redo: 'Redo', erase: 'Erase', notes: 'Notes', hint: 'Hint', settings: 'Settings' },
  settings: {
    title: 'Settings', autoClear: 'Auto-clear notes', conflicts: 'Show conflicts', limit: '3-mistake limit',
    sameDigits: 'Highlight same digits', sound: 'Sound', fillNotes: 'Fill in all notes', restart: 'Restart puzzle', abandon: 'Give up',
  },
  keys: '1–9 enter · Shift / N notes · ⌫ erase · Z undo · Y redo · H hint · Space pause',
  hint: {
    title: 'Hint', reveal: 'Fill it in', close: 'Got it', first: 'First', more: n => `+${n} more step${n === 1 ? '' : 's'}`,
    wrong: 'This digit was wrong — it’s cleared now.', revealed: 'No simple step here — the gold cell is revealed.',
    tech: TECH_EN,
    row: n => `Row ${n}`, col: n => `Column ${n}`, box: n => `Box ${n}`,
    list: listWith('and'),
    text: {
      fullHouse: (u, d) => `${u} has a single empty cell left — it must be ${d}.`,
      nakedSingle: d => `Every other digit already sits in this cell’s row, column or box. Only ${d} is left.`,
      hiddenSingle: (u, d) => `${u}: ${d} fits in just one cell.`,
      pointing: (b, l, d) => `${b}: ${d} can only go on ${l}, so the rest of ${l} can’t be ${d}.`,
      claiming: (l, b, d) => `${l}: ${d} can only go inside ${b}, so the rest of ${b} can’t be ${d}.`,
      naked: (u, ds) => `${u}: these cells can only hold ${ds} — so no other cell there can.`,
      hidden: (u, ds) => `${u}: ${ds} fit only in these cells — their other candidates go.`,
      fish: (name, d) => `${name} on ${d}: the marked lines lock every ${d} into their crossings — remove ${d} elsewhere on those lines.`,
      wing: (name, d) => `${name}: whatever the pivot becomes, one wing turns into ${d} — cells that see both wings can’t be ${d}.`,
      then: d => `Then the gold cell can only be ${d}.`,
    },
  },
  win: {
    title: 'Solved!', daily: 'Daily Sudoku solved', perfect: 'Flawless — no hints, no mistakes',
    newBest: 'New best time', signIn: 'Sign in to earn rewards and climb the leaderboard', reward: bm => `+${bm} BM`,
  },
  lost: { title: 'Out of mistakes', sub: 'Three mistakes — the grid wins this round.' },
};

const lv: SudokuStrings = {
  title: TITLE.lv,
  tagline: TAGLINE.lv,
  back: 'Atpakaļ',
  daily: 'Dienas Sudoku',
  dailySub: 'Šodien visiem vienas un tās pašas mīklas',
  dailyNo: n => `Nr. ${n}`,
  nextIn: t => `Jaunas pēc ${t}`,
  units: { h: 'h', m: 'min' },
  classic: 'Brīvā spēle',
  classicSub: 'Katru reizi pavisam jauns režģis',
  newGame: 'Jauna spēle',
  continue: 'Turpināt',
  play: 'Spēlēt',
  next: 'Nākamā mīkla',
  retry: 'Mēģināt vēlreiz',
  levels: { easy: 'Viegls', medium: 'Vidējs', hard: 'Grūts', expert: 'Eksperts' },
  levelInfo: { easy: 'Vieninieki, daudz doto', medium: 'Vieninieki, rets režģis', hard: 'Pāri un norādītāji', expert: 'X-Wing un XY-Wing' },
  streak: n => `${n} ${lvPl(n, 'dienas', 'dienu')} sērija`,
  streakNone: 'Atrisini dienas mīklu, lai sāktu sēriju',
  best: 'Labākais',
  solvedN: n => `${n} ${lvPl(n, 'atrisināta', 'atrisinātas')}`,
  generating: 'Jaucam jaunu režģi…',
  solvedIn: t => `Atrisināta ${t}`,
  failed: 'Nav atrisināta',
  mistakes: 'Kļūdas',
  hints: 'Padomi',
  time: 'Laiks',
  score: 'Punkti',
  pause: 'Pauze',
  paused: 'Pauze',
  resume: 'Turpināt',
  tools: { undo: 'Atsaukt', redo: 'Atkārtot', erase: 'Dzēst', notes: 'Piezīmes', hint: 'Padoms', settings: 'Iestatījumi' },
  settings: {
    title: 'Iestatījumi', autoClear: 'Automātiski tīrīt piezīmes', conflicts: 'Rādīt konfliktus', limit: '3 kļūdu limits',
    sameDigits: 'Izcelt vienādos ciparus', sound: 'Skaņa', fillNotes: 'Aizpildīt visas piezīmes', restart: 'Sākt mīklu no jauna', abandon: 'Padoties',
  },
  keys: '1–9 ievadīt · Shift / N piezīmes · ⌫ dzēst · Z atsaukt · Y atkārtot · H padoms · Atstarpe pauze',
  hint: {
    title: 'Padoms', reveal: 'Ierakstīt', close: 'Skaidrs', first: 'Vispirms', more: n => `+${n} ${lvPl(n, 'solis', 'soļi')}`,
    wrong: 'Šis cipars bija nepareizs — tas ir notīrīts.', revealed: 'Vienkārša soļa te nav — zelta šūna ir atklāta.',
    tech: {
      fullHouse: 'Pēdējā brīvā šūna', nakedSingle: 'Vienīgais kandidāts', hiddenSingle: 'Slēptais vieninieks',
      pointing: 'Norādītājs', claiming: 'Rindas–kvadrāta bloķēšana', nakedPair: 'Atklātais pāris', hiddenPair: 'Slēptais pāris',
      nakedTriple: 'Atklātais trijnieks', hiddenTriple: 'Slēptais trijnieks', nakedQuad: 'Atklātais četrinieks',
      xWing: 'X-Wing', swordfish: 'Swordfish', xyWing: 'XY-Wing', xyzWing: 'XYZ-Wing',
    },
    row: n => `${n}. rinda`, col: n => `${n}. kolonna`, box: n => `${n}. kvadrāts`,
    list: listWith('un'),
    text: {
      fullHouse: (u, d) => `${u}: palikusi tikai viena brīva šūna — tajā jābūt ${d}.`,
      nakedSingle: d => `Visi pārējie cipari jau ir šīs šūnas rindā, kolonnā vai kvadrātā. Paliek tikai ${d}.`,
      hiddenSingle: (u, d) => `${u}: ciparam ${d} der tikai viena šūna.`,
      pointing: (b, l, d) => `${b}: ${d} var būt tikai uz līnijas „${l}“, tāpēc pārējā līnijas daļā ${d} nevar būt.`,
      claiming: (l, b, d) => `${l}: ${d} var būt tikai kvadrātā „${b}“, tāpēc pārējās kvadrāta šūnās ${d} nevar būt.`,
      naked: (u, ds) => `${u}: šajās šūnās var būt tikai ${ds} — citās šūnās šie cipari nevar būt.`,
      hidden: (u, ds) => `${u}: ${ds} der tikai šajās šūnās — to pārējie kandidāti atkrīt.`,
      fish: (name, d) => `${name} ar ${d}: iezīmētās līnijas piesaista katru ${d} krustpunktiem — citur uz šīm līnijām ${d} nevar būt.`,
      wing: (name, d) => `${name}: lai kas būtu centrā, viens no spārniem kļūs par ${d} — šūnās, kas redz abus spārnus, ${d} nevar būt.`,
      then: d => `Tad zelta šūnā var būt tikai ${d}.`,
    },
  },
  win: {
    title: 'Atrisināts!', daily: 'Dienas Sudoku atrisināts', perfect: 'Nevainojami — bez padomiem un kļūdām',
    newBest: 'Jauns labākais laiks', signIn: 'Pieslēdzies, lai saņemtu balvas un kāptu topā', reward: bm => `+${bm} BM`,
  },
  lost: { title: 'Kļūdas beigušās', sub: 'Trīs kļūdas — šoreiz uzvarēja režģis.' },
};

const ru: SudokuStrings = {
  title: TITLE.ru,
  tagline: TAGLINE.ru,
  back: 'Назад',
  daily: 'Судоку дня',
  dailySub: 'Сегодня у всех одни и те же сетки',
  dailyNo: n => `№ ${n}`,
  nextIn: t => `Новые через ${t}`,
  units: { h: 'ч', m: 'мин' },
  classic: 'Свободная игра',
  classicSub: 'Каждый раз совершенно новая сетка',
  newGame: 'Новая игра',
  continue: 'Продолжить',
  play: 'Играть',
  next: 'Следующая',
  retry: 'Ещё раз',
  levels: { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный', expert: 'Эксперт' },
  levelInfo: { easy: 'Одиночки, много подсказок', medium: 'Одиночки, редкая сетка', hard: 'Пары и указатели', expert: 'X-Wing и XY-Wing' },
  streak: n => `${n} ${ruPl(n, 'день', 'дня', 'дней')} подряд`,
  streakNone: 'Решите судоку дня, чтобы начать серию',
  best: 'Рекорд',
  solvedN: n => `${n} ${ruPl(n, 'решена', 'решены', 'решено')}`,
  generating: 'Тасуем новую сетку…',
  solvedIn: t => `Решено за ${t}`,
  failed: 'Не решено',
  mistakes: 'Ошибки',
  hints: 'Подсказки',
  time: 'Время',
  score: 'Очки',
  pause: 'Пауза',
  paused: 'Пауза',
  resume: 'Продолжить',
  tools: { undo: 'Отменить', redo: 'Повторить', erase: 'Стереть', notes: 'Заметки', hint: 'Подсказка', settings: 'Настройки' },
  settings: {
    title: 'Настройки', autoClear: 'Автоочистка заметок', conflicts: 'Показывать конфликты', limit: 'Лимит 3 ошибки',
    sameDigits: 'Подсвечивать одинаковые цифры', sound: 'Звук', fillNotes: 'Заполнить все заметки', restart: 'Начать заново', abandon: 'Сдаться',
  },
  keys: '1–9 ввод · Shift / N заметки · ⌫ стереть · Z отменить · Y повторить · H подсказка · Пробел пауза',
  hint: {
    title: 'Подсказка', reveal: 'Вписать', close: 'Понятно', first: 'Сначала', more: n => `+${n} ${ruPl(n, 'шаг', 'шага', 'шагов')}`,
    wrong: 'Эта цифра была неверной — она стёрта.', revealed: 'Простого шага нет — золотая клетка открыта.',
    tech: {
      fullHouse: 'Последняя клетка', nakedSingle: 'Единственный кандидат', hiddenSingle: 'Скрытая одиночка',
      pointing: 'Указывающие кандидаты', claiming: 'Блокировка строка–блок', nakedPair: 'Открытая пара', hiddenPair: 'Скрытая пара',
      nakedTriple: 'Открытая тройка', hiddenTriple: 'Скрытая тройка', nakedQuad: 'Открытая четвёрка',
      xWing: 'X-Wing', swordfish: 'Swordfish', xyWing: 'XY-Wing', xyzWing: 'XYZ-Wing',
    },
    row: n => `Строка ${n}`, col: n => `Столбец ${n}`, box: n => `Блок ${n}`,
    list: listWith('и'),
    text: {
      fullHouse: (u, d) => `${u}: осталась одна пустая клетка — в ней должна быть ${d}.`,
      nakedSingle: d => `Все остальные цифры уже есть в строке, столбце или блоке этой клетки. Остаётся только ${d}.`,
      hiddenSingle: (u, d) => `${u}: цифре ${d} подходит только одна клетка.`,
      pointing: (b, l, d) => `${b}: ${d} может стоять только на линии «${l}», поэтому в остальной части линии ${d} быть не может.`,
      claiming: (l, b, d) => `${l}: ${d} может стоять только в блоке «${b}», поэтому в остальных клетках блока ${d} быть не может.`,
      naked: (u, ds) => `${u}: в этих клетках могут быть только ${ds} — в других клетках этих цифр быть не может.`,
      hidden: (u, ds) => `${u}: ${ds} помещаются только в эти клетки — остальные кандидаты в них уходят.`,
      fish: (name, d) => `${name} по цифре ${d}: отмеченные линии запирают каждую ${d} на пересечениях — уберите ${d} с остальных клеток этих линий.`,
      wing: (name, d) => `${name}: что бы ни оказалось в центре, одно из крыльев станет ${d} — клетки, видящие оба крыла, не могут быть ${d}.`,
      then: d => `Тогда в золотой клетке может быть только ${d}.`,
    },
  },
  win: {
    title: 'Решено!', daily: 'Судоку дня решено', perfect: 'Безупречно — без подсказок и ошибок',
    newBest: 'Новый рекорд', signIn: 'Войдите, чтобы получать награды и подниматься в рейтинге', reward: bm => `+${bm} BM`,
  },
  lost: { title: 'Ошибки закончились', sub: 'Три ошибки — на этот раз победила сетка.' },
};

const uk: SudokuStrings = {
  title: TITLE.uk,
  tagline: TAGLINE.uk,
  back: 'Назад',
  daily: 'Судоку дня',
  dailySub: 'Сьогодні в усіх однакові сітки',
  dailyNo: n => `№ ${n}`,
  nextIn: t => `Нові через ${t}`,
  units: { h: 'год', m: 'хв' },
  classic: 'Вільна гра',
  classicSub: 'Щоразу зовсім нова сітка',
  newGame: 'Нова гра',
  continue: 'Продовжити',
  play: 'Грати',
  next: 'Наступна',
  retry: 'Ще раз',
  levels: { easy: 'Легкий', medium: 'Середній', hard: 'Складний', expert: 'Експерт' },
  levelInfo: { easy: 'Одиночки, багато підказок', medium: 'Одиночки, рідка сітка', hard: 'Пари та вказівники', expert: 'X-Wing і XY-Wing' },
  streak: n => `${n} ${ruPl(n, 'день', 'дні', 'днів')} поспіль`,
  streakNone: 'Розв’яжіть судоку дня, щоб почати серію',
  best: 'Рекорд',
  solvedN: n => `${n} ${ruPl(n, 'розв’язана', 'розв’язані', 'розв’язано')}`,
  generating: 'Тасуємо нову сітку…',
  solvedIn: t => `Розв’язано за ${t}`,
  failed: 'Не розв’язано',
  mistakes: 'Помилки',
  hints: 'Підказки',
  time: 'Час',
  score: 'Очки',
  pause: 'Пауза',
  paused: 'Пауза',
  resume: 'Продовжити',
  tools: { undo: 'Скасувати', redo: 'Повторити', erase: 'Стерти', notes: 'Нотатки', hint: 'Підказка', settings: 'Налаштування' },
  settings: {
    title: 'Налаштування', autoClear: 'Автоочищення нотаток', conflicts: 'Показувати конфлікти', limit: 'Ліміт 3 помилки',
    sameDigits: 'Підсвічувати однакові цифри', sound: 'Звук', fillNotes: 'Заповнити всі нотатки', restart: 'Почати заново', abandon: 'Здатися',
  },
  keys: '1–9 введення · Shift / N нотатки · ⌫ стерти · Z скасувати · Y повторити · H підказка · Пробіл пауза',
  hint: {
    title: 'Підказка', reveal: 'Вписати', close: 'Зрозуміло', first: 'Спершу', more: n => `+${n} ${ruPl(n, 'крок', 'кроки', 'кроків')}`,
    wrong: 'Ця цифра була хибною — її стерто.', revealed: 'Простого кроку немає — золоту клітинку відкрито.',
    tech: {
      fullHouse: 'Остання клітинка', nakedSingle: 'Єдиний кандидат', hiddenSingle: 'Прихована одиночка',
      pointing: 'Вказівні кандидати', claiming: 'Блокування рядок–блок', nakedPair: 'Відкрита пара', hiddenPair: 'Прихована пара',
      nakedTriple: 'Відкрита трійка', hiddenTriple: 'Прихована трійка', nakedQuad: 'Відкрита четвірка',
      xWing: 'X-Wing', swordfish: 'Swordfish', xyWing: 'XY-Wing', xyzWing: 'XYZ-Wing',
    },
    row: n => `Рядок ${n}`, col: n => `Стовпець ${n}`, box: n => `Блок ${n}`,
    list: listWith('і'),
    text: {
      fullHouse: (u, d) => `${u}: лишилася одна порожня клітинка — у ній має бути ${d}.`,
      nakedSingle: d => `Усі інші цифри вже є в рядку, стовпці або блоці цієї клітинки. Лишається тільки ${d}.`,
      hiddenSingle: (u, d) => `${u}: цифрі ${d} підходить лише одна клітинка.`,
      pointing: (b, l, d) => `${b}: ${d} може стояти лише на лінії «${l}», тож в іншій частині лінії ${d} бути не може.`,
      claiming: (l, b, d) => `${l}: ${d} може стояти лише в блоці «${b}», тож в інших клітинках блоку ${d} бути не може.`,
      naked: (u, ds) => `${u}: у цих клітинках можуть бути лише ${ds} — в інших клітинках цих цифр бути не може.`,
      hidden: (u, ds) => `${u}: ${ds} вміщуються лише в ці клітинки — решта кандидатів у них відпадає.`,
      fish: (name, d) => `${name} за цифрою ${d}: позначені лінії замикають кожну ${d} на перетинах — приберіть ${d} з інших клітинок цих ліній.`,
      wing: (name, d) => `${name}: хоч що буде в центрі, одне з крил стане ${d} — клітинки, що бачать обидва крила, не можуть бути ${d}.`,
      then: d => `Тоді в золотій клітинці може бути лише ${d}.`,
    },
  },
  win: {
    title: 'Розв’язано!', daily: 'Судоку дня розв’язано', perfect: 'Бездоганно — без підказок і помилок',
    newBest: 'Новий рекорд', signIn: 'Увійдіть, щоб отримувати нагороди й підніматися в рейтингу', reward: bm => `+${bm} BM`,
  },
  lost: { title: 'Помилки скінчилися', sub: 'Три помилки — цього разу перемогла сітка.' },
};

/** All 17 languages, complete: en / lv / ru / uk here, the other 13 in ./lang/<code>.ts (checked in sudoku.test.ts). */
export const SUDOKU_STRINGS: Strings<SudokuStrings> = { en, lv, ru, uk, lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es };
