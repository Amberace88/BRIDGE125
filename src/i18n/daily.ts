import type { Strings } from './pick';

/**
 * Daily challenge ("Dienas izaicinājums"). English is mandatory; lv / ru / uk are complete; every other language
 * falls back to English (lazily loaded packs may add a `daily` key — see locales/types.ts).
 */
export interface DailyStrings {
  kicker: string; same: string; intro: string; format: string;
  no: (n: number) => string;
  play: string; resume: string; practice: string; back: string; signIn: string; close: string;
  nextIn: (t: string) => string;
  played: string; yourScore: string; yourRank: string;
  rankOf: (rank: number, total: number) => string;
  practiceTag: string;
  guest: { title: string; sub: string };
  board: {
    title: string; today: string; yesterday: string; empty: string; emptyYesterday: string; error: string; retry: string; you: string;
    players: (n: number) => string; turns: (n: number) => string;
  };
  winners: string;
  stats: { won: string; lost: string; points: string; turns: string; queens: string; rounds: string };
  how: { title: string; base: string; win: string; round: string; point: string; turn: string; queen: string; floor: string };
  rewards: { title: string; play: string; top1: string; top10: string; top10pct: string; note: string };
  result: {
    title: string; practiceTitle: string; practiceNote: string; won: string; lost: string;
    sending: string; onBoard: string; offline: string; rejected: string; done: string; again: string; breakdown: string;
  };
  share: { button: string; preparing: string; copied: string; saved: string; text: (score: number, no: number) => string; cta: string };
  /** printed on the share image (the canvas upper-cases the small labels itself) */
  card: { daily: string; score: string; rank: string; won: string; lost: string; points: string; turns: string; queens: string; cta: string };
  home: { title: string; sub: string; done: (score: number) => string; rank: (rank: number, total: number) => string; nextIn: (t: string) => string; play: string; resume: string };
  hud: { title: string; round: (n: number, max: number) => string };
  claimed: (rank: number) => string;
  time: { d: string; h: string; m: string };
}

const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString('fr-FR');
const ruPl = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
const lvPl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

const en: DailyStrings = {
  kicker: 'Daily challenge', same: 'Same deal for everyone',
  intro: "Everyone plays today's deal against the same three bots. Only your first attempt counts.",
  format: '3 rounds · 3 hard bots · 1 attempt',
  no: n => `No. ${n}`,
  play: "Play today's deal", resume: 'Continue your attempt', practice: 'Practice', back: 'Back', signIn: 'Sign in', close: 'Close',
  nextIn: t => `Next deal in ${t}`,
  played: 'Played today', yourScore: 'Your score', yourRank: 'Your rank',
  rankOf: (r, n) => `#${fmt(r)} of ${fmt(n)}`,
  practiceTag: 'Practice',
  guest: { title: 'Sign in to enter the leaderboard', sub: 'Your score is saved on this device — sign in today and it goes on the board.' },
  board: {
    title: 'Leaderboard', today: 'Today', yesterday: 'Yesterday', empty: 'No scores yet — be the first today!', emptyYesterday: 'Nobody played yesterday.',
    error: "Couldn't load the leaderboard.", retry: 'Try again', you: 'you',
    players: n => `${fmt(n)} ${n === 1 ? 'player' : 'players'}`, turns: n => `${fmt(n)} ${n === 1 ? 'turn' : 'turns'}`,
  },
  winners: "Yesterday's winners",
  stats: { won: 'Won', lost: 'Lost', points: 'Points', turns: 'Turns', queens: 'Q♠ taken', rounds: 'Rounds won' },
  how: {
    title: 'How scoring works', base: 'Start', win: 'Win the game (lowest total)', round: 'Each round you go out first', point: 'Each point you hold',
    turn: 'Each of your turns', queen: 'Each Q♠ you take', floor: 'Never below 0',
  },
  rewards: { title: 'Rewards', play: 'Play', top1: '1st place', top10: 'Top 10', top10pct: 'Top 10 %', note: 'Rank rewards are paid once the day is over.' },
  result: {
    title: "Today's result", practiceTitle: 'Practice result', practiceNote: 'Practice — not on the leaderboard', won: 'You won!', lost: 'Good try',
    sending: 'Sending…', onBoard: 'On the leaderboard', offline: "Saved — we'll send it when you're online", rejected: "The server didn't accept this result.",
    done: 'Done', again: 'Practice again', breakdown: 'Breakdown',
  },
  share: {
    button: 'Share', preparing: 'Preparing…', copied: 'Link copied', saved: 'Image saved',
    text: (s, n) => `I scored ${fmt(s)} in Bridge 125 Daily challenge #${n}. Can you beat me?`, cta: 'Can you beat me?',
  },
  card: { daily: 'Daily challenge', score: 'Score', rank: 'Rank', won: 'Won', lost: 'Lost', points: 'Points', turns: 'Turns', queens: 'Q♠ taken', cta: 'Can you beat me?' },
  home: { title: 'Daily challenge', sub: 'Same deal for everyone', done: s => `Score ${fmt(s)}`, rank: (r, n) => `#${fmt(r)} of ${fmt(n)}`, nextIn: t => `New in ${t}`, play: 'Play', resume: 'Continue' },
  hud: { title: 'Daily challenge', round: (n, m) => `Round ${n} of ${m}` },
  claimed: r => `You finished #${r} in yesterday's challenge — reward paid`,
  time: { d: 'd', h: 'h', m: 'm' },
};

const lv: DailyStrings = {
  kicker: 'Dienas izaicinājums', same: 'Viena izdale visiem',
  intro: 'Šodien visi spēlē vienu un to pašu izdali pret tiem pašiem trim botiem. Ieskaitē tikai tavs pirmais mēģinājums.',
  format: '3 raundi · 3 spēcīgi boti · 1 mēģinājums',
  no: n => `Nr. ${n}`,
  play: 'Spēlēt šodienas izdali', resume: 'Turpināt mēģinājumu', practice: 'Trenēties', back: 'Atpakaļ', signIn: 'Ienākt', close: 'Aizvērt',
  nextIn: t => `Nākamā izdale pēc ${t}`,
  played: 'Šodien nospēlēts', yourScore: 'Tavs rezultāts', yourRank: 'Tava vieta',
  rankOf: (r, n) => `${fmt(r)}. vieta no ${fmt(n)}`,
  practiceTag: 'Treniņš',
  guest: { title: 'Ienāc, lai tiktu tabulā', sub: 'Rezultāts saglabāts šajā ierīcē — ienāc vēl šodien, un tas nonāks tabulā.' },
  board: {
    title: 'Rezultātu tabula', today: 'Šodien', yesterday: 'Vakar', empty: 'Vēl neviena rezultāta — esi pirmais!', emptyYesterday: 'Vakar neviens nespēlēja.',
    error: 'Neizdevās ielādēt tabulu.', retry: 'Mēģināt vēlreiz', you: 'tu',
    players: n => `${fmt(n)} ${lvPl(n, 'spēlētājs', 'spēlētāji')}`, turns: n => `${fmt(n)} ${lvPl(n, 'gājiens', 'gājieni')}`,
  },
  winners: 'Vakardienas uzvarētāji',
  stats: { won: 'Uzvara', lost: 'Zaudējums', points: 'Punkti', turns: 'Gājieni', queens: 'Saņemtas Q♠', rounds: 'Uzvarēti raundi' },
  how: {
    title: 'Kā skaita punktus', base: 'Sākumā', win: 'Uzvara spēlē (mazākā summa)', round: 'Par katru raundu, kurā izej pirmais', point: 'Par katru punktu rokā',
    turn: 'Par katru savu gājienu', queen: 'Par katru saņemto Q♠', floor: 'Nekad mazāk par 0',
  },
  rewards: { title: 'Balvas', play: 'Par spēli', top1: '1. vieta', top10: 'Top 10', top10pct: 'Top 10 %', note: 'Balvas par vietu izmaksā, kad diena beigusies.' },
  result: {
    title: 'Šodienas rezultāts', practiceTitle: 'Treniņa rezultāts', practiceNote: 'Treniņš — tabulā netiek ieskaitīts', won: 'Uzvara!', lost: 'Labs mēģinājums',
    sending: 'Sūta…', onBoard: 'Ierakstīts tabulā', offline: 'Saglabāts — nosūtīsim, kad būsi tiešsaistē', rejected: 'Serveris šo rezultātu nepieņēma.',
    done: 'Gatavs', again: 'Trenēties vēlreiz', breakdown: 'Aprēķins',
  },
  share: {
    button: 'Dalīties', preparing: 'Gatavo…', copied: 'Saite nokopēta', saved: 'Attēls saglabāts',
    text: (s, n) => `Bridge 125 dienas izaicinājumā #${n} mans rezultāts ir ${fmt(s)}. Vai vari labāk?`, cta: 'Vai vari labāk?',
  },
  card: { daily: 'Dienas izaicinājums', score: 'Rezultāts', rank: 'Vieta', won: 'Uzvara', lost: 'Zaudējums', points: 'Punkti', turns: 'Gājieni', queens: 'Saņemtas Q♠', cta: 'Vai vari labāk?' },
  home: { title: 'Dienas izaicinājums', sub: 'Viena izdale visiem', done: s => `Rezultāts ${fmt(s)}`, rank: (r, n) => `${fmt(r)}. vieta no ${fmt(n)}`, nextIn: t => `Jauna pēc ${t}`, play: 'Spēlēt', resume: 'Turpināt' },
  hud: { title: 'Dienas izaicinājums', round: (n, m) => `${n}. raunds no ${m}` },
  claimed: r => `Vakardienas izaicinājumā tu ieguvi ${r}. vietu — balva ieskaitīta`,
  time: { d: 'd', h: 'h', m: 'min' },
};

const ru: DailyStrings = {
  kicker: 'Задание дня', same: 'Одна раздача для всех',
  intro: 'Сегодня все играют одну и ту же раздачу против тех же трёх ботов. В зачёт идёт только первая попытка.',
  format: '3 раунда · 3 сильных бота · 1 попытка',
  no: n => `№ ${n}`,
  play: 'Играть раздачу дня', resume: 'Продолжить попытку', practice: 'Тренировка', back: 'Назад', signIn: 'Войти', close: 'Закрыть',
  nextIn: t => `Новая раздача через ${t}`,
  played: 'Сыграно сегодня', yourScore: 'Ваш результат', yourRank: 'Ваше место',
  rankOf: (r, n) => `#${fmt(r)} из ${fmt(n)}`,
  practiceTag: 'Тренировка',
  guest: { title: 'Войдите, чтобы попасть в таблицу', sub: 'Результат сохранён на этом устройстве — войдите сегодня, и он попадёт в таблицу.' },
  board: {
    title: 'Таблица', today: 'Сегодня', yesterday: 'Вчера', empty: 'Пока нет результатов — будьте первым!', emptyYesterday: 'Вчера никто не играл.',
    error: 'Не удалось загрузить таблицу.', retry: 'Повторить', you: 'вы',
    players: n => `${fmt(n)} ${ruPl(n, 'игрок', 'игрока', 'игроков')}`, turns: n => `${fmt(n)} ${ruPl(n, 'ход', 'хода', 'ходов')}`,
  },
  winners: 'Победители вчерашнего дня',
  stats: { won: 'Победа', lost: 'Поражение', points: 'Очки', turns: 'Ходы', queens: 'Взято Q♠', rounds: 'Выиграно раундов' },
  how: {
    title: 'Подсчёт очков', base: 'Старт', win: 'Победа в игре (наименьшая сумма)', round: 'За каждый раунд, где вы вышли первым', point: 'За каждое очко на руках',
    turn: 'За каждый ваш ход', queen: 'За каждую взятую Q♠', floor: 'Не ниже 0',
  },
  rewards: { title: 'Награды', play: 'За участие', top1: '1-е место', top10: 'Топ-10', top10pct: 'Топ-10 %', note: 'Награды за место начисляются после окончания дня.' },
  result: {
    title: 'Результат дня', practiceTitle: 'Результат тренировки', practiceNote: 'Тренировка — в таблицу не идёт', won: 'Победа!', lost: 'Хорошая попытка',
    sending: 'Отправляем…', onBoard: 'В таблице', offline: 'Сохранено — отправим, когда появится связь', rejected: 'Сервер не принял этот результат.',
    done: 'Готово', again: 'Ещё тренировка', breakdown: 'Расчёт',
  },
  share: {
    button: 'Поделиться', preparing: 'Готовим…', copied: 'Ссылка скопирована', saved: 'Картинка сохранена',
    text: (s, n) => `Мой результат в задании дня #${n} в Bridge 125 — ${fmt(s)}. Сможете лучше?`, cta: 'Сможешь лучше?',
  },
  card: { daily: 'Задание дня', score: 'Результат', rank: 'Место', won: 'Победа', lost: 'Поражение', points: 'Очки', turns: 'Ходы', queens: 'Взято Q♠', cta: 'Сможешь лучше?' },
  home: { title: 'Задание дня', sub: 'Одна раздача для всех', done: s => `Результат ${fmt(s)}`, rank: (r, n) => `#${fmt(r)} из ${fmt(n)}`, nextIn: t => `Новое через ${t}`, play: 'Играть', resume: 'Продолжить' },
  hud: { title: 'Задание дня', round: (n, m) => `Раунд ${n} из ${m}` },
  claimed: r => `Во вчерашнем задании вы заняли ${r}-е место — награда начислена`,
  time: { d: 'д', h: 'ч', m: 'мин' },
};

const uk: DailyStrings = {
  kicker: 'Завдання дня', same: 'Одна роздача для всіх',
  intro: 'Сьогодні всі грають ту саму роздачу проти тих самих трьох ботів. До заліку йде лише перша спроба.',
  format: '3 раунди · 3 сильні боти · 1 спроба',
  no: n => `№ ${n}`,
  play: 'Грати роздачу дня', resume: 'Продовжити спробу', practice: 'Тренування', back: 'Назад', signIn: 'Увійти', close: 'Закрити',
  nextIn: t => `Нова роздача через ${t}`,
  played: 'Зіграно сьогодні', yourScore: 'Ваш результат', yourRank: 'Ваше місце',
  rankOf: (r, n) => `#${fmt(r)} з ${fmt(n)}`,
  practiceTag: 'Тренування',
  guest: { title: 'Увійдіть, щоб потрапити до таблиці', sub: 'Результат збережено на цьому пристрої — увійдіть сьогодні, і він потрапить до таблиці.' },
  board: {
    title: 'Таблиця', today: 'Сьогодні', yesterday: 'Учора', empty: 'Ще немає результатів — будьте першим!', emptyYesterday: 'Учора ніхто не грав.',
    error: 'Не вдалося завантажити таблицю.', retry: 'Повторити', you: 'ви',
    players: n => `${fmt(n)} ${ruPl(n, 'гравець', 'гравці', 'гравців')}`, turns: n => `${fmt(n)} ${ruPl(n, 'хід', 'ходи', 'ходів')}`,
  },
  winners: 'Переможці вчорашнього дня',
  stats: { won: 'Перемога', lost: 'Поразка', points: 'Очки', turns: 'Ходи', queens: 'Взято Q♠', rounds: 'Виграно раундів' },
  how: {
    title: 'Підрахунок очок', base: 'Старт', win: 'Перемога в грі (найменша сума)', round: 'За кожен раунд, де ви вийшли першим', point: 'За кожне очко на руках',
    turn: 'За кожен ваш хід', queen: 'За кожну взяту Q♠', floor: 'Не нижче 0',
  },
  rewards: { title: 'Нагороди', play: 'За участь', top1: '1-ше місце', top10: 'Топ-10', top10pct: 'Топ-10 %', note: 'Нагороди за місце нараховуються після завершення дня.' },
  result: {
    title: 'Результат дня', practiceTitle: 'Результат тренування', practiceNote: 'Тренування — до таблиці не йде', won: 'Перемога!', lost: 'Гарна спроба',
    sending: 'Надсилаємо…', onBoard: 'У таблиці', offline: 'Збережено — надішлемо, коли з’явиться зв’язок', rejected: 'Сервер не прийняв цей результат.',
    done: 'Готово', again: 'Ще тренування', breakdown: 'Розрахунок',
  },
  share: {
    button: 'Поділитися', preparing: 'Готуємо…', copied: 'Посилання скопійовано', saved: 'Зображення збережено',
    text: (s, n) => `Мій результат у завданні дня #${n} у Bridge 125 — ${fmt(s)}. Зможете краще?`, cta: 'Зможеш краще?',
  },
  card: { daily: 'Завдання дня', score: 'Результат', rank: 'Місце', won: 'Перемога', lost: 'Поразка', points: 'Очки', turns: 'Ходи', queens: 'Взято Q♠', cta: 'Зможеш краще?' },
  home: { title: 'Завдання дня', sub: 'Одна роздача для всіх', done: s => `Результат ${fmt(s)}`, rank: (r, n) => `#${fmt(r)} з ${fmt(n)}`, nextIn: t => `Нове через ${t}`, play: 'Грати', resume: 'Продовжити' },
  hud: { title: 'Завдання дня', round: (n, m) => `Раунд ${n} з ${m}` },
  claimed: r => `Ваше місце у вчорашньому завданні — #${r}. Нагороду нараховано`,
  time: { d: 'д', h: 'год', m: 'хв' },
};

export const DAILY_STRINGS: Strings<DailyStrings> = { en, lv, ru, uk };

import { registerStrings } from './pick';
registerStrings('daily', DAILY_STRINGS);
