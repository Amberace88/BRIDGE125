import type { Strings } from './pick';

/** Strings for the in-game table and the round summary. English is mandatory; others fall back to it. */
export interface TableStrings {
  menu: string; emote: string; soundOn: string; soundOff: string;
  tapDeck: string; tapToSkip: string; dealing: string;
  deckDraw: string; deckTake: (n: number) => string; deckPass: string; deckAria: string;
  playHere: (n: number) => string; comboHere: string; cancel: string; dropHere: string;
  rule125: string; rule130: string; pts: string; toEnd: (n: number) => string; to125: (n: number) => string;
  bluff: string; bluffAria: string;
  bluffCaught: string; bluffCaughtSub: (by: string, p: string) => string;
  bluffWrong: string; bluffWrongSub: string;
  inHand: string; added: string; total: string; leading: string; closest: string; over: string;
  burnTitle: string; wentOut: string; standings: string; nobody: string; winnerLabel: string;
}

const en: TableStrings = {
  menu: 'Menu', emote: 'Emotes', soundOn: 'Sound on', soundOff: 'Sound off',
  tapDeck: 'Tap the deck to draw', tapToSkip: 'Tap to skip', dealing: 'Dealing',
  deckDraw: 'Draw', deckTake: n => `Take ${n}`, deckPass: 'Pass', deckAria: 'Deck',
  playHere: n => (n > 1 ? `Tap to play ${n}` : 'Tap to play'), comboHere: 'Tap to play Q♠ + 6♠', cancel: 'Cancel selection', dropHere: 'Drop to play',
  rule125: 'Exactly 125 resets to 0', rule130: '130 ends the game', pts: 'pts', toEnd: n => `${n} to 130`, to125: n => `${n} to 125`,
  bluff: 'Bluff!', bluffAria: 'Call bluff',
  bluffCaught: 'Bluff caught!', bluffCaughtSub: (by, p) => `${by} caught ${p}`,
  bluffWrong: 'No bluff!', bluffWrongSub: 'That call was wrong',
  inHand: 'In hand', added: 'Added', total: 'Total', leading: 'Leading', closest: 'Closest to 130', over: 'Over 130',
  burnTitle: 'Burned to 0', wentOut: 'Went out', standings: 'Final standings', nobody: 'Nobody', winnerLabel: 'Winner',
};

const lv: TableStrings = {
  menu: 'Izvēlne', emote: 'Emocijas', soundOn: 'Skaņa ieslēgta', soundOff: 'Skaņa izslēgta',
  tapDeck: 'Pieskaries kavai, lai vilktu', tapToSkip: 'Pieskaries, lai izlaistu', dealing: 'Dala kārtis',
  deckDraw: 'Vilkt', deckTake: n => `Paņemt ${n}`, deckPass: 'Izlaist', deckAria: 'Kava',
  playHere: n => (n > 1 ? `Pieskaries, lai liktu ${n}` : 'Pieskaries, lai liktu'), comboHere: 'Pieskaries: Q♠ + 6♠', cancel: 'Atcelt izvēli', dropHere: 'Atlaid, lai liktu',
  rule125: 'Tieši 125 nodeg līdz 0', rule130: '130 beidz spēli', pts: 'p.', toEnd: n => `${n} līdz 130`, to125: n => `${n} līdz 125`,
  bluff: 'Melo!', bluffAria: 'Apsūdzēt blefā',
  bluffCaught: 'Blefs atklāts!', bluffCaughtSub: (by, p) => `${by} pieķēra ${p}`,
  bluffWrong: 'Tas nebija blefs!', bluffWrongSub: 'Apsūdzība bija kļūdaina',
  inHand: 'Rokā', added: 'Pieskaitīts', total: 'Kopā', leading: 'Vadībā', closest: 'Tuvāk 130', over: 'Virs 130',
  burnTitle: 'Nodega līdz 0', wentOut: 'Izlika visas', standings: 'Gala rezultāti', nobody: 'Neviens', winnerLabel: 'Uzvarētājs',
};

const ru: TableStrings = {
  menu: 'Меню', emote: 'Эмоции', soundOn: 'Звук включён', soundOff: 'Звук выключен',
  tapDeck: 'Нажмите на колоду, чтобы взять', tapToSkip: 'Нажмите, чтобы пропустить', dealing: 'Раздача',
  deckDraw: 'Взять', deckTake: n => `Взять ${n}`, deckPass: 'Пас', deckAria: 'Колода',
  playHere: n => (n > 1 ? `Нажмите, чтобы сыграть ${n}` : 'Нажмите, чтобы сыграть'), comboHere: 'Нажмите: Д♠ + 6♠', cancel: 'Отменить выбор', dropHere: 'Отпустите, чтобы сыграть',
  rule125: 'Ровно 125 сгорает до 0', rule130: '130 заканчивает игру', pts: 'очк.', toEnd: n => `${n} до 130`, to125: n => `${n} до 125`,
  bluff: 'Блеф!', bluffAria: 'Обвинить в блефе',
  bluffCaught: 'Блеф раскрыт!', bluffCaughtSub: (by, p) => `${by} поймал(а) ${p}`,
  bluffWrong: 'Это не блеф!', bluffWrongSub: 'Обвинение было ошибочным',
  inHand: 'На руке', added: 'Начислено', total: 'Итого', leading: 'Лидер', closest: 'Ближе всех к 130', over: 'Больше 130',
  burnTitle: 'Сгорело до 0', wentOut: 'Вышел', standings: 'Итоговая таблица', nobody: 'Никто', winnerLabel: 'Победитель',
};

const uk: TableStrings = {
  menu: 'Меню', emote: 'Емоції', soundOn: 'Звук увімкнено', soundOff: 'Звук вимкнено',
  tapDeck: 'Торкніться колоди, щоб узяти', tapToSkip: 'Торкніться, щоб пропустити', dealing: 'Роздача',
  deckDraw: 'Взяти', deckTake: n => `Взяти ${n}`, deckPass: 'Пас', deckAria: 'Колода',
  playHere: n => (n > 1 ? `Торкніться, щоб зіграти ${n}` : 'Торкніться, щоб зіграти'), comboHere: 'Торкніться: Д♠ + 6♠', cancel: 'Скасувати вибір', dropHere: 'Відпустіть, щоб зіграти',
  rule125: 'Рівно 125 згорає до 0', rule130: '130 завершує гру', pts: 'оч.', toEnd: n => `${n} до 130`, to125: n => `${n} до 125`,
  bluff: 'Блеф!', bluffAria: 'Звинуватити в блефі',
  bluffCaught: 'Блеф викрито!', bluffCaughtSub: (by, p) => `${by} спіймав(ла) ${p}`,
  bluffWrong: 'Це не блеф!', bluffWrongSub: 'Звинувачення було помилковим',
  inHand: 'На руці', added: 'Нараховано', total: 'Разом', leading: 'Лідер', closest: 'Найближче до 130', over: 'Понад 130',
  burnTitle: 'Згоріло до 0', wentOut: 'Вийшов', standings: 'Підсумкова таблиця', nobody: 'Ніхто', winnerLabel: 'Переможець',
};

export const TABLE_STRINGS: Strings<TableStrings> = { en, lv, ru, uk };
