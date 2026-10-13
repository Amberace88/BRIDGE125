// Solitaire strings. en / lv / ru / uk are complete; the other languages carry the title, tagline and the main
// buttons, and fall back to English key by key for the rest.
import type { Lang } from '../../i18n';
import { withFallback, type DeepPartial } from '../../i18n/pick';
import { useApp } from '../../store';
import { TAGLINE, TITLE } from './meta';

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

type Main = Pick<SolStrings, 'klondike' | 'spider' | 'play' | 'newGame' | 'continue' | 'daily' | 'undo' | 'hint' | 'auto' | 'menu' | 'won'>;

const MAIN: Partial<Record<Lang, Main>> = {
  lt: { klondike: 'Klondaikas', spider: 'Voras', play: 'Žaisti', newGame: 'Naujas dalijimas', continue: 'Tęsti', daily: 'Dienos dalijimas', undo: 'Atšaukti', hint: 'Patarimas', auto: 'Užbaigti', menu: 'Meniu', won: 'Išspręsta!' },
  et: { klondike: 'Klondike', spider: 'Ämblik', play: 'Mängi', newGame: 'Uus jagamine', continue: 'Jätka', daily: 'Päeva jagamine', undo: 'Võta tagasi', hint: 'Vihje', auto: 'Lõpeta automaatselt', menu: 'Menüü', won: 'Lahendatud!' },
  pl: { klondike: 'Klondike', spider: 'Pająk', play: 'Graj', newGame: 'Nowe rozdanie', continue: 'Kontynuuj', daily: 'Rozdanie dnia', undo: 'Cofnij', hint: 'Podpowiedź', auto: 'Dokończ', menu: 'Menu', won: 'Ułożone!' },
  de: { klondike: 'Klondike', spider: 'Spider', play: 'Spielen', newGame: 'Neues Spiel', continue: 'Weiter', daily: 'Tagesspiel', undo: 'Rückgängig', hint: 'Tipp', auto: 'Automatisch beenden', menu: 'Menü', won: 'Gelöst!' },
  be: { klondike: 'Касынка', spider: 'Павук', play: 'Гуляць', newGame: 'Новая раздача', continue: 'Працягнуць', daily: 'Раздача дня', undo: 'Адмяніць', hint: 'Падказка', auto: 'Дагуляць', menu: 'Меню', won: 'Раскладзена!' },
  kk: { klondike: 'Клондайк', spider: 'Өрмекші', play: 'Ойнау', newGame: 'Жаңа тарату', continue: 'Жалғастыру', daily: 'Күн таратуы', undo: 'Болдырмау', hint: 'Кеңес', auto: 'Аяқтау', menu: 'Мәзір', won: 'Шешілді!' },
  uz: { klondike: 'Klondayk', spider: 'O‘rgimchak', play: 'O‘ynash', newGame: 'Yangi tarqatish', continue: 'Davom etish', daily: 'Kun tarqatmasi', undo: 'Bekor qilish', hint: 'Maslahat', auto: 'Avto yakunlash', menu: 'Menyu', won: 'Yechildi!' },
  az: { klondike: 'Klondayk', spider: 'Hörümçək', play: 'Oyna', newGame: 'Yeni paylama', continue: 'Davam et', daily: 'Günün paylaması', undo: 'Geri al', hint: 'İpucu', auto: 'Avtomatik bitir', menu: 'Menyu', won: 'Həll olundu!' },
  ka: { klondike: 'კლონდაიკი', spider: 'ობობა', play: 'თამაში', newGame: 'ახალი დარიგება', continue: 'გაგრძელება', daily: 'დღის დარიგება', undo: 'გაუქმება', hint: 'მინიშნება', auto: 'ავტომატური დასრულება', menu: 'მენიუ', won: 'ამოხსნილია!' },
  hy: { klondike: 'Կլոնդայկ', spider: 'Սարդ', play: 'Խաղալ', newGame: 'Նոր բաժանում', continue: 'Շարունակել', daily: 'Օրվա բաժանում', undo: 'Չեղարկել', hint: 'Հուշում', auto: 'Ավարտել ավտոմատ', menu: 'Մենյու', won: 'Լուծված է։' },
  ro: { klondike: 'Klondike', spider: 'Păianjen', play: 'Joacă', newGame: 'Împărțire nouă', continue: 'Continuă', daily: 'Împărțirea zilei', undo: 'Anulează', hint: 'Indiciu', auto: 'Finalizare automată', menu: 'Meniu', won: 'Rezolvat!' },
  bg: { klondike: 'Клондайк', spider: 'Паяк', play: 'Играй', newGame: 'Ново раздаване', continue: 'Продължи', daily: 'Раздаване на деня', undo: 'Отмени', hint: 'Подсказка', auto: 'Довърши', menu: 'Меню', won: 'Подредено!' },
  es: { klondike: 'Klondike', spider: 'Spider', play: 'Jugar', newGame: 'Nueva partida', continue: 'Continuar', daily: 'Reparto del día', undo: 'Deshacer', hint: 'Pista', auto: 'Completar', menu: 'Menú', won: '¡Resuelto!' },
};

const FULL: Partial<Record<Lang, SolStrings>> = { en, lv, ru, uk };
const cache = new Map<string, SolStrings>();

export function solStrings(lang: string): SolStrings {
  const hit = cache.get(lang);
  if (hit) return hit;
  const full = FULL[lang as Lang];
  const main = MAIN[lang as Lang];
  const out = full ?? withFallback(en, main ? ({ ...main, title: TITLE[lang as Lang], tagline: TAGLINE[lang as Lang] } as DeepPartial<SolStrings>) : undefined);
  cache.set(lang, out);
  return out;
}

export const useSolStrings = () => solStrings(useApp().lang);

/** for tests */
export const SOL_LANGS = { full: Object.keys(FULL), main: Object.keys(MAIN) };
