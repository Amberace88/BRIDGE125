// Solitaire strings, complete in all 17 languages: en / lv / ru / uk here, the other 13 in ./lang/<code>.ts.
import type { Lang } from '../../i18n';
import { useApp } from '../../store';
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

export interface SolStrings {
  title: string;
  tagline: string;
  klondike: string;
  spider: string;
  draw: (n: number) => string;
  suits: (n: number) => string;
  scoring: string;
  standard: string;
  vegas: string;
  play: string;
  newGame: string;
  continue: string;
  restart: string;
  daily: string;
  dailySub: string;
  undo: string;
  hint: string;
  auto: string;
  menu: string;
  exit: string;
  close: string;
  score: string;
  time: string;
  moves: string;
  best: string;
  dealNo: (n: number) => string;
  winnable: string;
  shuffling: string;
  noMoves: string;
  noMovesSub: string;
  won: string;
  wonDaily: string;
  newBest: string;
  played: string;
  wins: string;
  streak: string;
  dailySolved: string;
  dailyOpen: string;
  dailyBest: (time: string, moves: number) => string;
  signIn: string;
  tipTap: string;
  tipDrag: string;
  abandonTitle: string;
  abandonSub: string;
  abandonYes: string;
  keep: string;
  undoCost: (n: number) => string;
  vegasNote: string;
  spiderNote: string;
  rewards: string;
  skip: string;
}

const en: SolStrings = {
  title: TITLE.en,
  tagline: TAGLINE.en,
  klondike: 'Klondike',
  spider: 'Spider',
  draw: n => `Draw ${n}`,
  suits: n => (n === 1 ? '1 suit' : `${n} suits`),
  scoring: 'Scoring',
  standard: 'Standard',
  vegas: 'Vegas',
  play: 'Play',
  newGame: 'New deal',
  continue: 'Continue',
  restart: 'Restart deal',
  daily: 'Daily deal',
  dailySub: 'One deal for everyone today',
  undo: 'Undo',
  hint: 'Hint',
  auto: 'Auto-complete',
  menu: 'Menu',
  exit: 'Back',
  close: 'Close',
  score: 'Score',
  time: 'Time',
  moves: 'Moves',
  best: 'Best',
  dealNo: n => `Deal #${n}`,
  winnable: 'Winnable deal',
  shuffling: 'Shuffling a winnable deal…',
  noMoves: 'No more moves',
  noMovesSub: 'Undo a few moves or start a new deal.',
  won: 'Solved!',
  wonDaily: 'Daily deal solved!',
  newBest: 'New best',
  played: 'Played',
  wins: 'Won',
  streak: 'Streak',
  dailySolved: 'Solved today',
  dailyOpen: 'Not solved yet',
  dailyBest: (t, m) => `Best ${t} · ${m} moves`,
  signIn: 'Sign in to earn rewards and climb the leaderboard',
  tipTap: 'Tap a card to move it. Double-tap the felt to send cards home.',
  tipDrag: 'Or drag cards — a stack moves together.',
  abandonTitle: 'Start a new deal?',
  abandonSub: 'The game in progress counts as a loss.',
  abandonYes: 'New deal',
  keep: 'Keep playing',
  undoCost: n => `Undo costs ${n} points`,
  vegasNote: 'Vegas: −52 to start, +5 per card home, limited passes.',
  spiderNote: 'Build down in any suit; a full K–A run of one suit clears.',
  rewards: 'Rewards',
  skip: 'Tap to skip',
};

const lv: SolStrings = {
  title: TITLE.lv,
  tagline: TAGLINE.lv,
  klondike: 'Klondaika',
  spider: 'Zirneklis',
  draw: n => `Pa ${n}`,
  suits: n => (n === 1 ? '1 masts' : `${n} masti`),
  scoring: 'Punktu skaitīšana',
  standard: 'Standarta',
  vegas: 'Vegasa',
  play: 'Spēlēt',
  newGame: 'Jauna dalīšana',
  continue: 'Turpināt',
  restart: 'Sākt šo dalīšanu no jauna',
  daily: 'Dienas dalīšana',
  dailySub: 'Šodien visiem viena un tā pati',
  undo: 'Atsaukt',
  hint: 'Padoms',
  auto: 'Pabeigt automātiski',
  menu: 'Izvēlne',
  exit: 'Atpakaļ',
  close: 'Aizvērt',
  score: 'Punkti',
  time: 'Laiks',
  moves: 'Gājieni',
  best: 'Labākais',
  dealNo: n => `Dalīšana #${n}`,
  winnable: 'Uzvarama dalīšana',
  shuffling: 'Jaucam uzvaramu dalīšanu…',
  noMoves: 'Gājienu vairs nav',
  noMovesSub: 'Atsauc dažus gājienus vai sāc jaunu dalīšanu.',
  won: 'Atrisināts!',
  wonDaily: 'Dienas dalīšana atrisināta!',
  newBest: 'Jauns rekords',
  played: 'Spēlēts',
  wins: 'Uzvaras',
  streak: 'Sērija',
  dailySolved: 'Šodien atrisināts',
  dailyOpen: 'Vēl nav atrisināts',
  dailyBest: (t, m) => `Labākais ${t} · ${m} gājieni`,
  signIn: 'Pieslēdzies, lai saņemtu balvas un kāptu līderu tabulā',
  tipTap: 'Pieskaries kārtij, lai to pārvietotu. Dubultskāriens uz galda sūta kārtis mājās.',
  tipDrag: 'Vai velc kārtis — kaudzīte pārvietojas kopā.',
  abandonTitle: 'Sākt jaunu dalīšanu?',
  abandonSub: 'Iesāktā spēle tiks ieskaitīta kā zaudējums.',
  abandonYes: 'Jauna dalīšana',
  keep: 'Spēlēt tālāk',
  undoCost: n => `Atsaukšana maksā ${n} punktus`,
  vegasNote: 'Vegasa: −52 sākumā, +5 par katru kārti mājās, ierobežotas kavas caurskates.',
  spiderNote: 'Liec dilstošā secībā jebkurā mastā; pilna viena masta K–A rinda aiziet.',
  rewards: 'Balvas',
  skip: 'Pieskaries, lai izlaistu',
};

const ru: SolStrings = {
  title: TITLE.ru,
  tagline: TAGLINE.ru,
  klondike: 'Косынка',
  spider: 'Паук',
  draw: n => `По ${n}`,
  suits: n => (n === 1 ? '1 масть' : `${n} масти`),
  scoring: 'Подсчёт очков',
  standard: 'Стандарт',
  vegas: 'Вегас',
  play: 'Играть',
  newGame: 'Новая раздача',
  continue: 'Продолжить',
  restart: 'Начать раздачу заново',
  daily: 'Раздача дня',
  dailySub: 'Сегодня одна раздача для всех',
  undo: 'Отменить',
  hint: 'Подсказка',
  auto: 'Доиграть',
  menu: 'Меню',
  exit: 'Назад',
  close: 'Закрыть',
  score: 'Очки',
  time: 'Время',
  moves: 'Ходы',
  best: 'Рекорд',
  dealNo: n => `Раздача №${n}`,
  winnable: 'Решаемая раздача',
  shuffling: 'Тасуем решаемую раздачу…',
  noMoves: 'Ходов больше нет',
  noMovesSub: 'Отмените несколько ходов или начните новую раздачу.',
  won: 'Разложено!',
  wonDaily: 'Раздача дня разложена!',
  newBest: 'Новый рекорд',
  played: 'Сыграно',
  wins: 'Победы',
  streak: 'Серия',
  dailySolved: 'Сегодня разложено',
  dailyOpen: 'Ещё не разложено',
  dailyBest: (t, m) => `Рекорд ${t} · ${m} ходов`,
  signIn: 'Войдите, чтобы получать награды и попасть в таблицу лидеров',
  tipTap: 'Нажмите на карту, чтобы переложить её. Двойное нажатие по столу отправит карты в дом.',
  tipDrag: 'Или перетаскивайте — стопка двигается целиком.',
  abandonTitle: 'Начать новую раздачу?',
  abandonSub: 'Текущая игра будет засчитана как поражение.',
  abandonYes: 'Новая раздача',
  keep: 'Играть дальше',
  undoCost: n => `Отмена хода стоит ${n} очков`,
  vegasNote: 'Вегас: −52 в начале, +5 за каждую карту в доме, ограниченные проходы колоды.',
  spiderNote: 'Кладите по убыванию любой масти; полный ряд К–Т одной масти уходит.',
  rewards: 'Награды',
  skip: 'Нажмите, чтобы пропустить',
};

const uk: SolStrings = {
  title: TITLE.uk,
  tagline: TAGLINE.uk,
  klondike: 'Косинка',
  spider: 'Павук',
  draw: n => `По ${n}`,
  suits: n => (n === 1 ? '1 масть' : `${n} масті`),
  scoring: 'Підрахунок очок',
  standard: 'Стандарт',
  vegas: 'Вегас',
  play: 'Грати',
  newGame: 'Нова роздача',
  continue: 'Продовжити',
  restart: 'Почати роздачу знову',
  daily: 'Роздача дня',
  dailySub: 'Сьогодні одна роздача для всіх',
  undo: 'Скасувати',
  hint: 'Підказка',
  auto: 'Дограти',
  menu: 'Меню',
  exit: 'Назад',
  close: 'Закрити',
  score: 'Очки',
  time: 'Час',
  moves: 'Ходи',
  best: 'Рекорд',
  dealNo: n => `Роздача №${n}`,
  winnable: 'Розв’язна роздача',
  shuffling: 'Тасуємо розв’язну роздачу…',
  noMoves: 'Ходів більше немає',
  noMovesSub: 'Скасуйте кілька ходів або почніть нову роздачу.',
  won: 'Розкладено!',
  wonDaily: 'Роздачу дня розкладено!',
  newBest: 'Новий рекорд',
  played: 'Зіграно',
  wins: 'Перемоги',
  streak: 'Серія',
  dailySolved: 'Сьогодні розкладено',
  dailyOpen: 'Ще не розкладено',
  dailyBest: (t, m) => `Рекорд ${t} · ${m} ходів`,
  signIn: 'Увійдіть, щоб отримувати нагороди й потрапити до таблиці лідерів',
  tipTap: 'Торкніться карти, щоб перекласти її. Подвійний дотик до столу відправить карти додому.',
  tipDrag: 'Або перетягуйте — стос рухається разом.',
  abandonTitle: 'Почати нову роздачу?',
  abandonSub: 'Поточна гра буде зарахована як поразка.',
  abandonYes: 'Нова роздача',
  keep: 'Грати далі',
  undoCost: n => `Скасування ходу коштує ${n} очок`,
  vegasNote: 'Вегас: −52 на початку, +5 за кожну карту вдома, обмежені проходи колоди.',
  spiderNote: 'Кладіть за спаданням будь-якої масті; повний ряд К–Т однієї масті зникає.',
  rewards: 'Нагороди',
  skip: 'Торкніться, щоб пропустити',
};

const FULL: Record<Lang, SolStrings> = { en, lv, ru, uk, lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es };

/** Strings for a language — every app language is complete; an unknown code gets English. */
export function solStrings(lang: string): SolStrings {
  return FULL[lang as Lang] ?? en;
}

export const useSolStrings = () => solStrings(useApp().lang);

/** for tests */
export const SOL_LANGS = { full: Object.keys(FULL), en };
