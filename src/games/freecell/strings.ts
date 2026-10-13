// FreeCell strings, complete in all 17 languages: en / lv / ru / uk here, the other 13 in ./lang/<code>.ts.
import type { Lang } from '../../i18n';
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

export interface FcStrings {
  title: string;
  tagline: string;
  rules: string;
  play: string;
  newGame: string;
  continue: string;
  daily: string;
  dailySub: string;
  dealNo: (n: number) => string;
  dealLabel: string;
  dealPlaceholder: string;
  playDeal: string;
  random: string;
  famous: string;
  undo: string;
  hint: string;
  auto: string;
  menu: string;
  exit: string;
  close: string;
  time: string;
  moves: string;
  undos: string;
  deal: string;
  best: string;
  thinking: string;
  noMoves: string;
  noMovesSub: string;
  noLine: string;
  tooMany: (n: number) => string;
  won: string;
  wonDaily: string;
  played: string;
  wins: string;
  streak: string;
  dailySolved: string;
  dailyBest: (time: string, moves: number) => string;
  tipTap: string;
  abandonTitle: string;
  abandonSub: string;
  abandonYes: string;
  keep: string;
  unsolvable: (n: number) => string;
  skip: string;
  shuffling: string;
}

const en: FcStrings = {
  title: TITLE.en,
  tagline: TAGLINE.en,
  rules: 'Build down in alternating colours. Send each suit home from Ace to King. Any card may rest in a free cell.',
  play: 'Play',
  newGame: 'New deal',
  continue: 'Continue',
  daily: 'Daily deal',
  dailySub: 'One deal for everyone today',
  dealNo: n => `Deal #${n}`,
  dealLabel: 'Deal number',
  dealPlaceholder: '1 – 1 000 000',
  playDeal: 'Play',
  random: 'Random deal',
  famous: 'Famous: #1 · #617 · #11982 (impossible)',
  undo: 'Undo',
  hint: 'Hint',
  auto: 'Gather home',
  menu: 'Menu',
  exit: 'Back to games',
  close: 'Close',
  time: 'Time',
  moves: 'Moves',
  undos: 'Undos',
  deal: 'Deal',
  best: 'Best',
  thinking: 'Thinking…',
  noMoves: 'No moves left',
  noMovesSub: 'Undo a few steps or start a new deal.',
  noLine: 'No winning line from here — try undoing.',
  tooMany: n => (n === 1 ? 'Only 1 card can move now — free a cell or a column' : `Only ${n} cards can move now — free a cell or a column`),
  won: 'Solved!',
  wonDaily: 'Daily deal solved!',
  played: 'Played',
  wins: 'Wins',
  streak: 'Streak',
  dailySolved: 'Solved',
  dailyBest: (t, m) => `${t} · ${m} moves`,
  tipTap: 'Tap a card to move it, drag a run to place it, double-tap to send a card home.',
  abandonTitle: 'Leave this deal?',
  abandonSub: 'It will count as a loss.',
  abandonYes: 'New deal',
  keep: 'Keep playing',
  unsolvable: n => `Deal #${n} is the famous impossible one — good luck!`,
  skip: 'Tap to skip',
  shuffling: 'Dealing…',
};

const lv: FcStrings = {
  title: TITLE.lv,
  tagline: TAGLINE.lv,
  rules: 'Kārto lejup, mainot krāsas. Katru mastu liec mājās no dūža līdz karalim. Jebkura kārts var atpūsties brīvajā šūnā.',
  play: 'Spēlēt',
  newGame: 'Jauna izdale',
  continue: 'Turpināt',
  daily: 'Dienas izdale',
  dailySub: 'Šodien viena izdale visiem',
  dealNo: n => `Izdale Nr. ${n}`,
  dealLabel: 'Izdales numurs',
  dealPlaceholder: '1 – 1 000 000',
  playDeal: 'Spēlēt',
  random: 'Nejauša izdale',
  famous: 'Slavenās: Nr. 1 · Nr. 617 · Nr. 11982 (neiespējamā)',
  undo: 'Atsaukt',
  hint: 'Padoms',
  auto: 'Savākt mājās',
  menu: 'Izvēlne',
  exit: 'Atpakaļ uz spēlēm',
  close: 'Aizvērt',
  time: 'Laiks',
  moves: 'Gājieni',
  undos: 'Atsaukumi',
  deal: 'Izdale',
  best: 'Labākais',
  thinking: 'Domāju…',
  noMoves: 'Gājienu vairs nav',
  noMovesSub: 'Atsauc dažus gājienus vai sāc jaunu izdali.',
  noLine: 'No šejienes uzvarēt nevar — mēģini atsaukt.',
  tooMany: n => `Tagad var pārvietot tikai ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'kārti' : 'kārtis'} — atbrīvo šūnu vai kolonnu`,
  won: 'Izlikts!',
  wonDaily: 'Dienas izdale izlikta!',
  played: 'Spēlēts',
  wins: 'Uzvaras',
  streak: 'Sērija',
  dailySolved: 'Izlikts',
  dailyBest: (t, m) => `${t} · ${m} ${m % 10 === 1 && m % 100 !== 11 ? 'gājiens' : 'gājieni'}`,
  tipTap: 'Pieskaries kārtij, lai to pārvietotu, velc virkni, lai to noliktu, dubultskāriens — kārts uz mājām.',
  abandonTitle: 'Pamest šo izdali?',
  abandonSub: 'Tā tiks ieskaitīta kā zaudējums.',
  abandonYes: 'Jauna izdale',
  keep: 'Spēlēt tālāk',
  unsolvable: n => `Izdale Nr. ${n} ir slavenā neiespējamā — veiksmi!`,
  skip: 'Pieskaries, lai izlaistu',
  shuffling: 'Dalu…',
};

const ruMoves = (m: number) => (m % 10 === 1 && m % 100 !== 11 ? 'ход' : m % 10 >= 2 && m % 10 <= 4 && (m % 100 < 12 || m % 100 > 14) ? 'хода' : 'ходов');
const ruCards = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'карту' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'карты' : 'карт');

const ru: FcStrings = {
  title: TITLE.ru,
  tagline: TAGLINE.ru,
  rules: 'Стройте по убыванию, чередуя цвета. Собирайте каждую масть в дом от туза до короля. Любая карта может отдохнуть в свободной ячейке.',
  play: 'Играть',
  newGame: 'Новая раздача',
  continue: 'Продолжить',
  daily: 'Раздача дня',
  dailySub: 'Сегодня одна раздача для всех',
  dealNo: n => `Раздача №${n}`,
  dealLabel: 'Номер раздачи',
  dealPlaceholder: '1 – 1 000 000',
  playDeal: 'Играть',
  random: 'Случайная раздача',
  famous: 'Знаменитые: №1 · №617 · №11982 (нерешаемая)',
  undo: 'Отменить',
  hint: 'Подсказка',
  auto: 'Собрать в дом',
  menu: 'Меню',
  exit: 'К играм',
  close: 'Закрыть',
  time: 'Время',
  moves: 'Ходы',
  undos: 'Отмены',
  deal: 'Раздача',
  best: 'Лучшее',
  thinking: 'Думаю…',
  noMoves: 'Ходов больше нет',
  noMovesSub: 'Отмените несколько ходов или начните новую раздачу.',
  noLine: 'Отсюда не выиграть — попробуйте отменить.',
  tooMany: n => `Сейчас можно переложить только ${n} ${ruCards(n)} — освободите ячейку или столбец`,
  won: 'Разложено!',
  wonDaily: 'Раздача дня разложена!',
  played: 'Сыграно',
  wins: 'Победы',
  streak: 'Серия',
  dailySolved: 'Разложено',
  dailyBest: (t, m) => `${t} · ${m} ${ruMoves(m)}`,
  tipTap: 'Коснитесь карты, чтобы переложить её, тяните цепочку, двойное касание — карта в дом.',
  abandonTitle: 'Бросить эту раздачу?',
  abandonSub: 'Она засчитается как поражение.',
  abandonYes: 'Новая раздача',
  keep: 'Играть дальше',
  unsolvable: n => `Раздача №${n} — та самая нерешаемая. Удачи!`,
  skip: 'Коснитесь, чтобы пропустить',
  shuffling: 'Раздаю…',
};

const ukMoves = (m: number) => (m % 10 === 1 && m % 100 !== 11 ? 'хід' : m % 10 >= 2 && m % 10 <= 4 && (m % 100 < 12 || m % 100 > 14) ? 'ходи' : 'ходів');
const ukCards = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'карту' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'карти' : 'карт');

const uk: FcStrings = {
  title: TITLE.uk,
  tagline: TAGLINE.uk,
  rules: 'Складайте за спаданням, чергуючи кольори. Збирайте кожну масть додому від туза до короля. Будь-яка карта може відпочити у вільній клітинці.',
  play: 'Грати',
  newGame: 'Нова роздача',
  continue: 'Продовжити',
  daily: 'Роздача дня',
  dailySub: 'Сьогодні одна роздача для всіх',
  dealNo: n => `Роздача №${n}`,
  dealLabel: 'Номер роздачі',
  dealPlaceholder: '1 – 1 000 000',
  playDeal: 'Грати',
  random: 'Випадкова роздача',
  famous: 'Відомі: №1 · №617 · №11982 (нерозв’язна)',
  undo: 'Скасувати',
  hint: 'Підказка',
  auto: 'Зібрати додому',
  menu: 'Меню',
  exit: 'До ігор',
  close: 'Закрити',
  time: 'Час',
  moves: 'Ходи',
  undos: 'Скасування',
  deal: 'Роздача',
  best: 'Найкраще',
  thinking: 'Думаю…',
  noMoves: 'Ходів більше немає',
  noMovesSub: 'Скасуйте кілька ходів або почніть нову роздачу.',
  noLine: 'Звідси не виграти — спробуйте скасувати.',
  tooMany: n => `Зараз можна перекласти лише ${n} ${ukCards(n)} — звільніть клітинку або стовпець`,
  won: 'Розкладено!',
  wonDaily: 'Роздачу дня розкладено!',
  played: 'Зіграно',
  wins: 'Перемоги',
  streak: 'Серія',
  dailySolved: 'Розкладено',
  dailyBest: (t, m) => `${t} · ${m} ${ukMoves(m)}`,
  tipTap: 'Торкніться карти, щоб перекласти її, тягніть ланцюжок, подвійний дотик — карта додому.',
  abandonTitle: 'Покинути цю роздачу?',
  abandonSub: 'Вона зарахується як поразка.',
  abandonYes: 'Нова роздача',
  keep: 'Грати далі',
  unsolvable: n => `Роздача №${n} — та сама нерозв’язна. Успіхів!`,
  skip: 'Торкніться, щоб пропустити',
  shuffling: 'Роздаю…',
};

const FULL: Record<Lang, FcStrings> = { en, lv, ru, uk, lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es };

/** Strings for a language — every app language is complete; an unknown code gets English. */
export function fcStrings(lang: string): FcStrings {
  return FULL[lang as Lang] ?? en;
}

/** for tests */
export const FC_LANGS = { full: Object.keys(FULL), en };
