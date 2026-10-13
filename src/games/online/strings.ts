import type { Strings } from '../../i18n/pick';

/** Online mini games: lobby modes, waiting room, table HUD. English is required; other languages fall back to it. */
export interface OnlineStrings {
  modes: { bots: string; online: string; friends: string };
  onlineNote: string;
  findTable: string;
  finding: string;
  quickError: string;
  friendsNote: string;
  createRoom: string;
  enterCode: string;
  join: string;
  needsNet: string;
  // waiting room
  code: string;
  invite: string;
  copied: string;
  shareText: (game: string) => string;
  seatsOf: (n: number, max: number) => string;
  waiting: string;
  connecting: string;
  reconnecting: string;
  bot: string;
  host: string;
  online: string;
  away: string;
  offline: string;
  you: string;
  addBot: string;
  removeBot: string;
  start: string;
  startFill: string;
  waitHost: string;
  quickTitle: string;
  startsIn: (s: number) => string;
  starting: string;
  botsFill: string;
  startNow: string;
  leave: string;
  rules: string;
  full: string;
  notFound: string;
  // table
  spectating: string;
  takeSeat: (name: string) => string;
  yourTurn: string;
  turnOf: (name: string) => string;
  autopilot: string;
  backFromAutopilot: string;
  ready: (n: number, m: number) => string;
  rematch: string;
  rematchWaiting: (n: number, m: number) => string;
  playAgain: string;
  online1: string;
}

const en: OnlineStrings = {
  modes: { bots: 'Bots', online: 'Online', friends: 'Friends' },
  onlineNote: 'Play real people. If the table is not full in 20 seconds, bots take the empty seats.',
  findTable: 'Find a table',
  finding: 'Finding a table…',
  quickError: 'Could not reach the server. Try again.',
  friendsNote: 'Open a private table and send the link — or type a friend’s code.',
  createRoom: 'Create a table',
  enterCode: 'Code',
  join: 'Join',
  needsNet: 'You are offline — online play needs a connection.',
  code: 'Table code',
  invite: 'Invite friends',
  copied: 'Link copied',
  shareText: g => `Join my ${g} table on Bridge 125!`,
  seatsOf: (n, max) => `${n}/${max}`,
  waiting: 'Waiting for players…',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  bot: 'Bot',
  host: 'Host',
  online: 'Online',
  away: 'Bot plays for them',
  offline: 'Offline',
  you: 'you',
  addBot: 'Bot',
  removeBot: 'Bot',
  start: 'Start',
  startFill: 'Start — bots fill the empty seats',
  waitHost: 'Waiting for the host to start…',
  quickTitle: 'Online table',
  startsIn: s => `Starts in ${s}s`,
  starting: 'Starting…',
  botsFill: 'Empty seats are filled with bots.',
  startNow: 'Start now',
  leave: 'Leave',
  rules: 'Rules',
  full: 'This table is full',
  notFound: 'Table not found',
  spectating: 'You are watching',
  takeSeat: n => `Take ${n}’s seat`,
  yourTurn: 'Your move',
  turnOf: n => `${n} thinks…`,
  autopilot: 'A bot is playing for you — make a move to take over.',
  backFromAutopilot: 'You are back',
  ready: (n, m) => `Ready ${n}/${m}`,
  rematch: 'Rematch',
  rematchWaiting: (n, m) => `Rematch ${n}/${m}`,
  playAgain: 'Play again',
  online1: 'Online',
};

const lv: OnlineStrings = {
  modes: { bots: 'Boti', online: 'Tiešsaistē', friends: 'Draugi' },
  onlineNote: 'Spēlē ar īstiem cilvēkiem. Ja galds 20 sekundēs nepiepildās, brīvās vietas ieņem boti.',
  findTable: 'Atrast galdu',
  finding: 'Meklējam galdu…',
  quickError: 'Neizdevās sazināties ar serveri. Mēģini vēlreiz.',
  friendsNote: 'Atver privātu galdu un nosūti saiti — vai ievadi drauga kodu.',
  createRoom: 'Izveidot galdu',
  enterCode: 'Kods',
  join: 'Pievienoties',
  needsNet: 'Tu esi bezsaistē — tiešsaistes spēlei vajag internetu.',
  code: 'Galda kods',
  invite: 'Uzaicināt draugus',
  copied: 'Saite nokopēta',
  shareText: g => `Nāc pie mana ${g} galda Bridge 125!`,
  seatsOf: (n, max) => `${n}/${max}`,
  waiting: 'Gaidām spēlētājus…',
  connecting: 'Savienojamies…',
  reconnecting: 'Atjaunojam savienojumu…',
  bot: 'Bots',
  host: 'Saimnieks',
  online: 'Tiešsaistē',
  away: 'Viņa vietā spēlē bots',
  offline: 'Bezsaistē',
  you: 'tu',
  addBot: 'Bots',
  removeBot: 'Bots',
  start: 'Sākt',
  startFill: 'Sākt — brīvās vietas aizpildīs boti',
  waitHost: 'Gaidām, kad saimnieks sāks…',
  quickTitle: 'Tiešsaistes galds',
  startsIn: s => `Sāksies pēc ${s} s`,
  starting: 'Sākam…',
  botsFill: 'Brīvās vietas aizpildīs boti.',
  startNow: 'Sākt tūlīt',
  leave: 'Iziet',
  rules: 'Noteikumi',
  full: 'Galds ir pilns',
  notFound: 'Galds nav atrasts',
  spectating: 'Tu skaties',
  takeSeat: n => `Ieņemt ${n} vietu`,
  yourTurn: 'Tavs gājiens',
  turnOf: n => `${n} domā…`,
  autopilot: 'Tavā vietā spēlē bots — izdari gājienu, lai turpinātu pats.',
  backFromAutopilot: 'Tu esi atpakaļ',
  ready: (n, m) => `Gatavi ${n}/${m}`,
  rematch: 'Revanšs',
  rematchWaiting: (n, m) => `Revanšs ${n}/${m}`,
  playAgain: 'Spēlēt vēlreiz',
  online1: 'Tiešsaistē',
};

const ru: OnlineStrings = {
  modes: { bots: 'Боты', online: 'Онлайн', friends: 'Друзья' },
  onlineNote: 'Играйте с живыми людьми. Если за 20 секунд стол не заполнится, свободные места займут боты.',
  findTable: 'Найти стол',
  finding: 'Ищем стол…',
  quickError: 'Нет связи с сервером. Попробуйте ещё раз.',
  friendsNote: 'Откройте закрытый стол и отправьте ссылку — или введите код друга.',
  createRoom: 'Создать стол',
  enterCode: 'Код',
  join: 'Войти',
  needsNet: 'Нет соединения — для игры онлайн нужен интернет.',
  code: 'Код стола',
  invite: 'Пригласить друзей',
  copied: 'Ссылка скопирована',
  shareText: g => `Садись за мой стол (${g}) в Bridge 125!`,
  seatsOf: (n, max) => `${n}/${max}`,
  waiting: 'Ждём игроков…',
  connecting: 'Подключаемся…',
  reconnecting: 'Восстанавливаем связь…',
  bot: 'Бот',
  host: 'Хозяин',
  online: 'В сети',
  away: 'За него играет бот',
  offline: 'Не в сети',
  you: 'вы',
  addBot: 'Бот',
  removeBot: 'Бот',
  start: 'Начать',
  startFill: 'Начать — свободные места займут боты',
  waitHost: 'Ждём, когда хозяин начнёт…',
  quickTitle: 'Онлайн-стол',
  startsIn: s => `Старт через ${s} с`,
  starting: 'Начинаем…',
  botsFill: 'Свободные места займут боты.',
  startNow: 'Начать сейчас',
  leave: 'Выйти',
  rules: 'Правила',
  full: 'Стол заполнен',
  notFound: 'Стол не найден',
  spectating: 'Вы наблюдаете',
  takeSeat: n => `Занять место (${n})`,
  yourTurn: 'Ваш ход',
  turnOf: n => `${n} думает…`,
  autopilot: 'За вас играет бот — сделайте ход, чтобы вернуться.',
  backFromAutopilot: 'Вы вернулись',
  ready: (n, m) => `Готовы ${n}/${m}`,
  rematch: 'Реванш',
  rematchWaiting: (n, m) => `Реванш ${n}/${m}`,
  playAgain: 'Играть ещё',
  online1: 'Онлайн',
};

export const ONLINE_STRINGS: Strings<OnlineStrings> = { en, lv, ru };
