import { registerStrings, type Strings } from '../../i18n/pick';
import type { Bid, Contract, Outcome } from './engine';
import type { ZLevel } from './bot';

export { TAGLINES, TITLES } from './titles';
import { TAGLINES } from './titles';

export interface RulesText {
  title: string;
  intro: string;
  deckH: string; deck: string;
  pointsH: string;
  trumpsH: string; trumps: string;
  playH: string; play: string;
  bidH: string; bids: Record<Exclude<Bid, never>, string>;
  allPassH: string; galdins: string; pules: string;
  scoreH: string; scoreCols: [string, string, string]; scoreRows: Record<Outcome, string>; mazaRow: [string, string]; galdinsRow: string;
  tipsH: string; tips: string[];
}

export interface ZoleStrings {
  title: string;
  tagline: string;
  lobby: {
    sub: string; level: string; levels: Record<ZLevel, string>; deals: string; endless: string;
    rules: string; maza: string; mazaSub: string; pules: string; pulesSub: string; start: string; howTo: string; back: string;
  };
  bid: Record<Bid, string>;
  bidSub: Record<Bid, string>;
  /** what a seat said, shown under its name */
  said: Record<Bid, string>;
  contract: Record<Contract | 'pule', string>;
  role: { lielais: string; mazais: string; solo: string };
  /** "Artjoms plays big" */
  plays: (who: string, c: Contract) => string;
  playsYou: (c: Contract) => string;
  allPassGaldins: string; allPassPule: string;
  status: {
    yourBid: string; yourDiscard: string; yourLead: string; yourTurn: string; dealing: string; tapToSkip: string;
    bidding: (who: string) => string; discarding: (who: string) => string; thinking: (who: string) => string;
  };
  discardBtn: (pts: number) => string;
  you: string;
  partner: string;
  acis: string; tricks: string; trickN: (n: number) => string;
  lastTrick: string; lastTrickBy: (who: string) => string; table: string; buried: string; galdsTo: (who: string) => string;
  deal: (n: number, total: number) => string;
  /** the deal's result, `who` null = you */
  outcomeLine: (who: string | null, o: Outcome) => string;
  /** short tag for the result chip */
  outcomeTag: Record<Outcome, string>;
  mazaLine: (who: string | null, won: boolean) => string;
  /** galdiņš losers (null = you) */
  galdinsLine: (losers: (string | null)[]) => string;
  /** sheet */
  sheet: {
    title: string; next: string; finish: string; finishSub: string; sessionOver: string; youWon: string; youLost: string;
    winner: (who: string) => string; tie: string; again: string; exit: string; total: string; pules: (n: number) => string;
    personal: string; final: string; puleAdded: string; puleOwn: string; puleCommon: string; pulePersonal: string; vs: string;
    yourBalance: string; rows: string;
  };
  menu: { title: string; resume: string; rules: string; newGame: string; newGameSure: string; finish: string; exit: string; exitSub: string };
  fast: string; fastOn: string; fastOff: string;
  coach: {
    ok: string; bid: (trumps: number) => string; suggest: (b: string) => string; discard: string; lead: string; follow: string;
    mazie: (partner: string, decl: string) => string; galdins: string; maza: string; declarer: string;
  };
  rules: RulesText;
}

/* =================================================================================================== en */
const en: ZoleStrings = {
  title: 'Zole',
  tagline: TAGLINES.en,
  lobby: {
    sub: 'Three players, 26 cards, one plays alone. 61 card points wins.',
    level: 'Opponents', levels: { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, deals: 'Deals', endless: '∞',
    rules: 'House rules', maza: 'Mazā zole', mazaSub: 'Bid to take no trick at all', pules: 'Pules',
    pulesSub: 'All pass → a pot penalty instead of galdiņš (tournament style)', start: 'Take a seat', howTo: 'How to play', back: 'Back',
  },
  bid: { take: 'Take the table', zole: 'Zole', maza: 'Mazā zole', pass: 'Pass' },
  bidSub: {
    take: 'Pick up the 2 table cards, bury 2 · play alone',
    zole: 'Play alone without the table · double stakes',
    maza: 'Take no trick at all',
    pass: 'Let someone else play',
  },
  said: { take: 'takes the table', zole: 'zole!', maza: 'mazā zole', pass: 'pass' },
  contract: { lielais: 'Big game', zole: 'Zole', maza: 'Mazā zole', galdins: 'Galdiņš', pule: 'Pule' },
  role: { lielais: 'Big', mazais: 'Small', solo: 'Alone' },
  plays: (w, c) => c === 'lielais' ? `${w} takes the table` : c === 'zole' ? `${w} plays zole` : c === 'maza' ? `${w} plays mazā zole` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'You play big' : c === 'zole' ? 'You play zole' : c === 'maza' ? 'You play mazā zole' : 'Galdiņš',
  allPassGaldins: 'Everyone passed — galdiņš', allPassPule: 'Everyone passed — a pule is written',
  status: {
    yourBid: 'Your call', yourDiscard: 'Bury 2 cards', yourLead: 'Your lead', yourTurn: 'Your turn', dealing: 'Dealing…', tapToSkip: 'tap to skip',
    bidding: w => `${w} is deciding…`, discarding: w => `${w} buries 2 cards…`, thinking: w => `${w} is thinking…`,
  },
  discardBtn: p => `Bury · +${p}`,
  you: 'You', partner: 'partner',
  acis: 'pts', tricks: 'tricks', trickN: n => (n === 1 ? '1 trick' : `${n} tricks`),
  lastTrick: 'Last trick', lastTrickBy: w => `taken by ${w}`, table: 'Table', buried: 'Buried', galdsTo: w => `table cards → ${w}`,
  deal: (n, t) => (t > 0 ? `Deal ${n} of ${t}` : `Deal ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'You win', jani: 'You win big', bezstikis: 'You took every trick!', lose: 'You lose', loseJani: 'You lose big', loseBezstikis: 'Not a single trick' };
    const them = { win: 'wins', jani: 'wins big', bezstikis: 'takes every trick!', lose: 'loses', loseJani: 'loses big', loseBezstikis: 'takes no trick at all' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'opponents in jaņi', bezstikis: 'bezstiķis', lose: 'under 61', loseJani: 'in jaņi', loseBezstikis: 'bezstiķis' },
  mazaLine: (w, won) => (w == null ? (won ? 'Mazā zole made!' : 'Mazā zole failed') : `${w} ${won ? 'makes' : 'fails'} the mazā zole`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'You lose the galdiņš' : `${l.map(x => x ?? 'you').join(' and ')} lose${l.length === 1 ? 's' : ''} the galdiņš`),
  sheet: {
    title: 'Score sheet', next: 'Next deal', finish: 'End session', finishSub: 'Count the result now', sessionOver: 'Session over',
    youWon: 'You won the session', youLost: 'Better luck next time', winner: w => `${w} wins the session`, tie: 'A draw',
    again: 'New session', exit: 'Leave', total: 'Total', pules: n => (n === 1 ? '1 pule open' : `${n} pules open`), personal: 'personal pule',
    final: 'Pules settled', puleAdded: '+1 common pule', puleOwn: 'own pule cleared', puleCommon: 'common pule won · +1 each',
    pulePersonal: 'a personal pule won · +3', vs: 'vs', yourBalance: 'Your balance', rows: 'Deal',
  },
  menu: {
    title: 'Paused', resume: 'Resume', rules: 'Rules', newGame: 'New session', newGameSure: 'Tap again to drop this session',
    finish: 'End session & count', exit: 'Leave the table', exitSub: 'Saved after every move — you continue right here.',
  },
  fast: 'Fast mode', fastOn: 'on', fastOff: 'off',
  coach: {
    ok: 'Got it',
    bid: n => `You hold ${n} trump${n === 1 ? '' : 's'}. Take the table with about 5 trumps incl. queens or jacks; with a weak hand, pass.`,
    suggest: b => `Suggestion: ${b}`,
    discard: 'Bury 2 cards: their points count for you. Bury a lonely 10 or king to make a void.',
    lead: 'You lead. As the big player, pull the opponents’ trumps with your high trumps.',
    follow: 'Follow the suit led. All queens, jacks and diamonds are trumps — one suit.',
    mazie: (p, d) => `You and ${p} play together against ${d}. When ${p} wins a trick, throw in your points.`,
    galdins: 'Galdiņš: everyone for himself — whoever takes the most tricks loses.',
    maza: 'Mazā zole: the declarer must not take a single trick.',
    declarer: 'You need 61 of 120 card points. Your buried cards already count.',
  },
  rules: {
    title: 'How to play Zole',
    intro: 'Three players. In every deal one of them plays alone — the big player (lielais) — against the other two (mazie), who play as a team. The big player needs at least 61 of the 120 card points.',
    deckH: 'The deck', deck: '26 cards: A 10 K Q J 9 of every suit plus 8♦ and 7♦. Each player gets 8 cards, 2 go face down to the table.',
    pointsH: 'Card points',
    trumpsH: 'Trumps — 14 of them', trumps: 'All queens, all jacks and all diamonds are trumps, from the queen of clubs down to the 7 of diamonds. Clubs, spades and hearts keep only A 10 K 9.',
    playH: 'Playing', play: 'You must follow the suit led — trumps count as one suit. If you can’t, play anything. The highest trump wins the trick, otherwise the highest card of the suit led. The player left of the dealer leads first.',
    bidH: 'Bidding', bids: {
      take: 'Take the table — become the big player: pick up the 2 table cards and bury 2. Buried points count for you.',
      zole: 'Zole — play alone without the table (its points go to the opponents). Higher stakes.',
      maza: 'Mazā zole — win by taking no trick at all (house rule).',
      pass: 'Pass — the next player decides. The first player who does not pass plays.',
    },
    allPassH: 'If everyone passes', galdins: 'Galdiņš: everyone for himself. Whoever takes the most tricks loses (a tie: the most points); the table cards go to the last trick.',
    pules: 'With pules: a common pule is written and the cards are redealt. The next winning big player collects it (+1 from each); a big player who loses while a pule is open gets a personal pule.',
    scoreH: 'Scoring', scoreCols: ['Big player', 'Big', 'Zole'],
    scoreRows: {
      bezstikis: 'All 8 tricks', jani: '91 or more', win: '61–90', lose: '31–60', loseJani: '30 or less', loseBezstikis: 'No trick',
    },
    mazaRow: ['Mazā zole made', 'Mazā zole failed'], galdinsRow: 'Galdiņš: the loser −4, the others +2',
    tipsH: 'Tips', tips: [
      'Count your trumps: 5 or more with a queen or two is a big game.',
      'Bury 10s and kings of short suits — they score for you and leave a void to trump into.',
      'As a small player, throw your aces and tens onto a trick your partner is winning.',
    ],
  },
};

/* =================================================================================================== lv */
const lv: ZoleStrings = {
  title: 'Zolīte',
  tagline: TAGLINES.lv,
  lobby: {
    sub: 'Trīs spēlētāji, 26 kārtis, viens spēlē pret diviem. Uzvarai vajag 61 aci.',
    level: 'Pretinieki', levels: { easy: 'Viegli', normal: 'Normāli', hard: 'Grūti' }, deals: 'Partijas', endless: '∞',
    rules: 'Galda noteikumi', maza: 'Mazā zole', mazaSub: 'Pieteikums neņemt nevienu stiķi', pules: 'Pules',
    pulesSub: 'Visi garām → pule galdiņa vietā (kā turnīros)', start: 'Sēsties pie galda', howTo: 'Noteikumi', back: 'Atpakaļ',
  },
  bid: { take: 'Ņemt galdu', zole: 'Zole', maza: 'Mazā zole', pass: 'Garām' },
  bidSub: {
    take: 'Paņem 2 galda kārtis, noraksti 2 · spēlē lielo',
    zole: 'Spēlē viens bez galda · lielākas likmes',
    maza: 'Neņem nevienu stiķi',
    pass: 'Lai spēlē kāds cits',
  },
  said: { take: 'ņem galdu', zole: 'zole!', maza: 'mazā zole', pass: 'garām' },
  contract: { lielais: 'Lielais', zole: 'Zole', maza: 'Mazā zole', galdins: 'Galdiņš', pule: 'Pule' },
  role: { lielais: 'Lielais', mazais: 'Mazais', solo: 'Pats par sevi' },
  plays: (w, c) => c === 'lielais' ? `${w} ņem galdu` : c === 'zole' ? `${w} spēlē zoli` : c === 'maza' ? `${w} spēlē mazo zoli` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Tu spēlē lielo' : c === 'zole' ? 'Tu spēlē zoli' : c === 'maza' ? 'Tu spēlē mazo zoli' : 'Galdiņš',
  allPassGaldins: 'Visi garām — spēlējam galdiņu', allPassPule: 'Visi garām — raksta puli',
  status: {
    yourBid: 'Tavs vārds', yourDiscard: 'Noraksti 2 kārtis', yourLead: 'Tavs gājiens — sāc', yourTurn: 'Tavs gājiens', dealing: 'Dala kārtis…', tapToSkip: 'pieskaries, lai izlaistu',
    bidding: w => `${w} domā…`, discarding: w => `${w} noraksta…`, thinking: w => `${w} domā…`,
  },
  discardBtn: p => `Norakstīt · +${p}`,
  you: 'Tu', partner: 'partneris',
  acis: 'acis', tricks: 'stiķi', trickN: n => (n % 10 === 1 && n % 100 !== 11 ? `${n} stiķis` : `${n} stiķi`),
  lastTrick: 'Pēdējais stiķis', lastTrickBy: w => `paņēma ${w}`, table: 'Galds', buried: 'Norakstītās', galdsTo: w => `galda kārtis → ${w}`,
  deal: (n, t) => (t > 0 ? `Partija ${n} no ${t}` : `Partija ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Tu uzvari', jani: 'Tu uzvari — mazie jaņos', bezstikis: 'Tu paņēmi visus stiķus!', lose: 'Tu zaudēji', loseJani: 'Tu zaudēji — paliki jaņos', loseBezstikis: 'Tu paliki bez stiķa' };
    const them = { win: 'uzvar', jani: 'uzvar — mazie jaņos', bezstikis: 'paņem visus stiķus!', lose: 'zaudē', loseJani: 'zaudē — paliek jaņos', loseBezstikis: 'paliek bez stiķa' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'mazie jaņos', bezstikis: 'bezstiķis', lose: 'zem 61', loseJani: 'jaņos', loseBezstikis: 'bezstiķis' },
  mazaLine: (w, won) => (w == null ? (won ? 'Mazā zole izdevās!' : 'Mazā zole neizdevās') : `${w} ${won ? 'izspēlē' : 'zaudē'} mazo zoli`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Tu zaudēji galdiņu' : `Galdiņu zaudē ${l.map(x => x ?? 'tu').join(' un ')}`),
  sheet: {
    title: 'Pieraksts', next: 'Nākamā partija', finish: 'Beigt spēli', finishSub: 'Saskaitīt rezultātu tagad', sessionOver: 'Spēle beigusies',
    youWon: 'Tu esi plusos!', youLost: 'Šoreiz mīnusos', winner: w => `Uzvar ${w}`, tie: 'Neizšķirts',
    again: 'Jauna spēle', exit: 'Iziet', total: 'Kopā', pules: n => (n === 1 ? '1 pule uz galda' : `${n} pules uz galda`), personal: 'personīgā pule',
    final: 'Pules norakstītas', puleAdded: '+1 kopējā pule', puleOwn: 'sava pule noņemta', puleCommon: 'kopējā pule paņemta · +1 no katra',
    pulePersonal: 'personīgā pule paņemta · +3', vs: 'pret', yourBalance: 'Tava bilance', rows: 'Partija',
  },
  menu: {
    title: 'Pauze', resume: 'Turpināt', rules: 'Noteikumi', newGame: 'Jauna spēle', newGameSure: 'Pieskaries vēlreiz, lai sāktu no jauna',
    finish: 'Beigt un saskaitīt', exit: 'Atstāt galdu', exitSub: 'Saglabājas pēc katra gājiena — turpināsi tieši šeit.',
  },
  fast: 'Ātrais režīms', fastOn: 'ieslēgts', fastOff: 'izslēgts',
  coach: {
    ok: 'Skaidrs',
    bid: n => `Tev ir ${n} ${n % 10 === 1 && n !== 11 ? 'trumpis' : 'trumpji'}. Galdu ņem ar kādiem 5 trumpjiem, tajā skaitā dāmām vai kalpiem; ar vāju roku — garām.`,
    suggest: b => `Ieteikums: ${b}`,
    discard: 'Noraksti 2 kārtis — to acis skaitās tev. Noraksti vientuļu desmitnieku vai kungu, lai paliktu bez masta.',
    lead: 'Tu sāc. Lielajam ar augstiem trumpjiem jāizvelk pretinieku trumpji.',
    follow: 'Jāliek tas pats masts. Visas dāmas, kalpi un kāravi ir trumpji — viens masts.',
    mazie: (p, d) => `Tu un ${p} esat mazie, lielais ir ${d}. Kad stiķi ņem ${p}, piemet acis.`,
    galdins: 'Galdiņš: katrs par sevi — zaudē tas, kurš paņem visvairāk stiķu.',
    maza: 'Mazā zole: pieteicējs nedrīkst paņemt nevienu stiķi.',
    declarer: 'Vajag 61 no 120 acīm. Norakstītās kārtis jau skaitās tev.',
  },
  rules: {
    title: 'Kā spēlēt zolīti',
    intro: 'Spēlē trīs. Katrā partijā viens spēlē viens pats — lielais — pret pārējiem diviem, mazajiem, kas spēlē kopā. Lielajam jāsavāc vismaz 61 no 120 acīm.',
    deckH: 'Kārtis', deck: '26 kārtis: visu mastu dūži, desmitnieki, kungi, dāmas, kalpi un devītnieki, kā arī kāravu astotnieks un septītnieks. Katram 8 kārtis, 2 aizklātas uz galda.',
    pointsH: 'Acis',
    trumpsH: 'Trumpji — 14', trumps: 'Visas dāmas, visi kalpi un visi kāravi ir trumpji — no kreiča dāmas līdz kāravu septītniekam. Kreičiem, pīķiem un ercēm paliek tikai A 10 K 9.',
    playH: 'Izspēle', play: 'Jāliek tas pats masts, ar kuru iziets — trumpji ir viens masts. Ja nav, drīkst likt jebko. Stiķi ņem augstākais trumpis, citādi augstākā izietā masta kārts. Sāk pirmā roka — spēlētājs pa kreisi no dalītāja.',
    bidH: 'Solīšana', bids: {
      take: 'Ņemt galdu — kļūsti par lielo: paņem 2 galda kārtis un noraksti 2. Norakstītās acis skaitās tev.',
      zole: 'Zole — spēlē viens bez galda (galda acis tiek mazajiem). Lielākas likmes.',
      maza: 'Mazā zole — uzvari, nepaņemot nevienu stiķi (galda noteikums).',
      pass: 'Garām — lemj nākamais. Spēlē pirmais, kurš nesaka garām.',
    },
    allPassH: 'Ja visi garām', galdins: 'Galdiņš: katrs par sevi. Zaudē tas, kurš paņem visvairāk stiķu (ja vienādi — visvairāk acu); galda kārtis tiek pēdējā stiķa ņēmējam.',
    pules: 'Ar pulēm: raksta kopējo puli, kārtis pārdala. Nākamais lielais, kurš uzvar, puli paņem (+1 no katra); lielais, kurš zaudē, kamēr pule ir uz galda, dabū personīgo puli.',
    scoreH: 'Punkti', scoreCols: ['Lielais savāc', 'Lielais', 'Zole'],
    scoreRows: {
      bezstikis: 'Visi 8 stiķi', jani: '91 un vairāk', win: '61–90', lose: '31–60', loseJani: '30 un mazāk', loseBezstikis: 'Neviena stiķa',
    },
    mazaRow: ['Mazā zole izdodas', 'Mazā zole zaudēta'], galdinsRow: 'Galdiņš: zaudētājs −4, pārējie +2',
    tipsH: 'Padomi', tips: [
      'Skaiti trumpjus: 5 un vairāk ar dāmu vai divām — droši ņem galdu.',
      'Noraksti īso mastu desmitniekus un kungus — acis tev, un var trumpot.',
      'Mazajam: kad stiķi ņem partneris, piemet dūzi vai desmitnieku.',
    ],
  },
};

/* =================================================================================================== ru */
const ru: ZoleStrings = {
  title: 'Золе',
  tagline: TAGLINES.ru,
  lobby: {
    sub: 'Трое игроков, 26 карт, один играет против двоих. Для победы нужно 61 очко.',
    level: 'Соперники', levels: { easy: 'Легко', normal: 'Нормально', hard: 'Сложно' }, deals: 'Раздачи', endless: '∞',
    rules: 'Правила стола', maza: 'Малая золе', mazaSub: 'Заявка не взять ни одной взятки', pules: 'Пули',
    pulesSub: 'Все пас → пуля вместо галдиньша (как на турнирах)', start: 'Сесть за стол', howTo: 'Правила', back: 'Назад',
  },
  bid: { take: 'Взять стол', zole: 'Золе', maza: 'Малая золе', pass: 'Пас' },
  bidSub: {
    take: 'Возьми 2 карты со стола, сбрось 2 · играешь большого',
    zole: 'Играешь один без стола · ставки выше',
    maza: 'Не взять ни одной взятки',
    pass: 'Пусть играет другой',
  },
  said: { take: 'берёт стол', zole: 'золе!', maza: 'малая золе', pass: 'пас' },
  contract: { lielais: 'Большой', zole: 'Золе', maza: 'Малая золе', galdins: 'Галдиньш', pule: 'Пуля' },
  role: { lielais: 'Большой', mazais: 'Малый', solo: 'Сам за себя' },
  plays: (w, c) => c === 'lielais' ? `${w} берёт стол` : c === 'zole' ? `${w} играет золе` : c === 'maza' ? `${w} играет малую золе` : 'Галдиньш',
  playsYou: c => c === 'lielais' ? 'Вы играете большого' : c === 'zole' ? 'Вы играете золе' : c === 'maza' ? 'Вы играете малую золе' : 'Галдиньш',
  allPassGaldins: 'Все пас — играем галдиньш', allPassPule: 'Все пас — пишется пуля',
  status: {
    yourBid: 'Ваше слово', yourDiscard: 'Сбросьте 2 карты', yourLead: 'Ваш ход — заходите', yourTurn: 'Ваш ход', dealing: 'Раздача…', tapToSkip: 'нажмите, чтобы пропустить',
    bidding: w => `${w} думает…`, discarding: w => `${w} сбрасывает…`, thinking: w => `${w} думает…`,
  },
  discardBtn: p => `Сбросить · +${p}`,
  you: 'Вы', partner: 'партнёр',
  acis: 'оч.', tricks: 'взятки', trickN: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'взятка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'взятки' : 'взяток'}`,
  lastTrick: 'Последняя взятка', lastTrickBy: w => `взял(а) ${w}`, table: 'Стол', buried: 'Сброс', galdsTo: w => `карты стола → ${w}`,
  deal: (n, t) => (t > 0 ? `Раздача ${n} из ${t}` : `Раздача ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Вы выиграли', jani: 'Вы выиграли — малые «в янах»', bezstikis: 'Вы взяли все взятки!', lose: 'Вы проиграли', loseJani: 'Вы проиграли — «в янах»', loseBezstikis: 'Вы без взятки' };
    const them = { win: 'выигрывает', jani: 'выигрывает — малые «в янах»', bezstikis: 'берёт все взятки!', lose: 'проигрывает', loseJani: 'проигрывает — «в янах»', loseBezstikis: 'остаётся без взятки' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'малые «в янах»', bezstikis: 'все взятки', lose: 'меньше 61', loseJani: '«в янах»', loseBezstikis: 'без взятки' },
  mazaLine: (w, won) => (w == null ? (won ? 'Малая золе сыграна!' : 'Малая золе не удалась') : `${w}: малая золе ${won ? 'сыграна' : 'проиграна'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Вы проиграли галдиньш' : `Галдиньш проигрывает: ${l.map(x => x ?? 'вы').join(' и ')}`),
  sheet: {
    title: 'Запись', next: 'Следующая раздача', finish: 'Закончить игру', finishSub: 'Подсчитать результат сейчас', sessionOver: 'Игра окончена',
    youWon: 'Вы в плюсе!', youLost: 'В этот раз в минусе', winner: w => `Побеждает ${w}`, tie: 'Ничья',
    again: 'Новая игра', exit: 'Выйти', total: 'Итого', pules: n => `Пуль на столе: ${n}`, personal: 'личная пуля',
    final: 'Пули списаны', puleAdded: '+1 общая пуля', puleOwn: 'своя пуля снята', puleCommon: 'общая пуля взята · +1 с каждого',
    pulePersonal: 'личная пуля взята · +3', vs: 'против', yourBalance: 'Ваш баланс', rows: 'Раздача',
  },
  menu: {
    title: 'Пауза', resume: 'Продолжить', rules: 'Правила', newGame: 'Новая игра', newGameSure: 'Нажмите ещё раз, чтобы начать заново',
    finish: 'Закончить и подсчитать', exit: 'Выйти из-за стола', exitSub: 'Сохраняется после каждого хода — продолжите с этого места.',
  },
  fast: 'Быстрый режим', fastOn: 'вкл.', fastOff: 'выкл.',
  coach: {
    ok: 'Понятно',
    bid: n => `У вас козырей: ${n}. Стол берут примерно с 5 козырями, включая дам или валетов; со слабой рукой — пас.`,
    suggest: b => `Совет: ${b}`,
    discard: 'Сбросьте 2 карты — их очки идут вам. Сбросьте одинокую десятку или короля, чтобы остаться без масти.',
    lead: 'Вы заходите. Большому стоит выбить козыри соперников старшими козырями.',
    follow: 'Ходите в масть. Все дамы, валеты и бубны — козыри, это одна масть.',
    mazie: (p, d) => `Вы и ${p} — малые, большой — ${d}. Когда взятку берёт ${p}, подкидывайте очки.`,
    galdins: 'Галдиньш: каждый сам за себя — проигрывает тот, кто возьмёт больше всех взяток.',
    maza: 'Малая золе: заявивший не должен взять ни одной взятки.',
    declarer: 'Нужно 61 из 120 очков. Сброшенные карты уже считаются вам.',
  },
  rules: {
    title: 'Как играть в золе',
    intro: 'Играют трое. В каждой раздаче один играет сам — большой (lielais) — против двоих малых (mazie), которые играют вместе. Большому нужно набрать не меньше 61 из 120 очков.',
    deckH: 'Колода', deck: '26 карт: тузы, десятки, короли, дамы, валеты и девятки всех мастей плюс 8♦ и 7♦. Каждому по 8 карт, 2 кладутся на стол рубашкой вверх.',
    pointsH: 'Очки карт',
    trumpsH: 'Козыри — 14', trumps: 'Все дамы, все валеты и все бубны — козыри, от дамы треф до семёрки бубен. В трефах, пиках и червах остаются только Т 10 К 9.',
    playH: 'Розыгрыш', play: 'Нужно ходить в масть — козыри считаются одной мастью. Если масти нет, можно класть любую карту. Взятку берёт старший козырь, иначе старшая карта заходной масти. Первым ходит игрок слева от сдающего.',
    bidH: 'Торговля', bids: {
      take: 'Взять стол — стать большим: взять 2 карты со стола и сбросить 2. Очки сброса идут вам.',
      zole: 'Золе — играть одному без стола (очки стола уходят малым). Ставки выше.',
      maza: 'Малая золе — выиграть, не взяв ни одной взятки (правило стола).',
      pass: 'Пас — решает следующий. Играет первый, кто не сказал «пас».',
    },
    allPassH: 'Если все пас', galdins: 'Галдиньш: каждый сам за себя. Проигрывает взявший больше всех взяток (при равенстве — больше очков); карты стола идут к последней взятке.',
    pules: 'С пулями: пишется общая пуля, карты пересдаются. Следующий выигравший большой забирает её (+1 с каждого); проигравший при открытой пуле получает личную пулю.',
    scoreH: 'Очки', scoreCols: ['Большой набрал', 'Большой', 'Золе'],
    scoreRows: {
      bezstikis: 'Все 8 взяток', jani: '91 и больше', win: '61–90', lose: '31–60', loseJani: '30 и меньше', loseBezstikis: 'Ни одной взятки',
    },
    mazaRow: ['Малая золе сыграна', 'Малая золе проиграна'], galdinsRow: 'Галдиньш: проигравший −4, остальные +2',
    tipsH: 'Советы', tips: [
      'Считайте козыри: 5 и больше с дамой-двумя — смело берите стол.',
      'Сбрасывайте десятки и королей коротких мастей — очки ваши, и можно бить козырем.',
      'Малому: когда взятку берёт партнёр, подкиньте туза или десятку.',
    ],
  },
};

/* =================================================================================================== uk */
const uk: ZoleStrings = {
  title: 'Золе',
  tagline: TAGLINES.uk,
  lobby: {
    sub: 'Троє гравців, 26 карт, один грає проти двох. Для перемоги потрібно 61 очко.',
    level: 'Суперники', levels: { easy: 'Легко', normal: 'Нормально', hard: 'Складно' }, deals: 'Роздачі', endless: '∞',
    rules: 'Правила столу', maza: 'Мала золе', mazaSub: 'Заявка не взяти жодного хабара', pules: 'Пулі',
    pulesSub: 'Усі пас → пуля замість галдиньша (як на турнірах)', start: 'Сісти за стіл', howTo: 'Правила', back: 'Назад',
  },
  bid: { take: 'Взяти стіл', zole: 'Золе', maza: 'Мала золе', pass: 'Пас' },
  bidSub: {
    take: 'Візьми 2 карти зі столу, скинь 2 · граєш великого',
    zole: 'Граєш сам без столу · ставки вищі',
    maza: 'Не взяти жодного хабара',
    pass: 'Хай грає інший',
  },
  said: { take: 'бере стіл', zole: 'золе!', maza: 'мала золе', pass: 'пас' },
  contract: { lielais: 'Великий', zole: 'Золе', maza: 'Мала золе', galdins: 'Галдиньш', pule: 'Пуля' },
  role: { lielais: 'Великий', mazais: 'Малий', solo: 'Сам за себе' },
  plays: (w, c) => c === 'lielais' ? `${w} бере стіл` : c === 'zole' ? `${w} грає золе` : c === 'maza' ? `${w} грає малу золе` : 'Галдиньш',
  playsYou: c => c === 'lielais' ? 'Ви граєте великого' : c === 'zole' ? 'Ви граєте золе' : c === 'maza' ? 'Ви граєте малу золе' : 'Галдиньш',
  allPassGaldins: 'Усі пас — граємо галдиньш', allPassPule: 'Усі пас — пишеться пуля',
  status: {
    yourBid: 'Ваше слово', yourDiscard: 'Скиньте 2 карти', yourLead: 'Ваш хід — заходьте', yourTurn: 'Ваш хід', dealing: 'Роздача…', tapToSkip: 'торкніться, щоб пропустити',
    bidding: w => `${w} думає…`, discarding: w => `${w} скидає…`, thinking: w => `${w} думає…`,
  },
  discardBtn: p => `Скинути · +${p}`,
  you: 'Ви', partner: 'партнер',
  acis: 'оч.', tricks: 'хабарі', trickN: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'хабар' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'хабарі' : 'хабарів'}`,
  lastTrick: 'Останній хабар', lastTrickBy: w => `узяв(ла) ${w}`, table: 'Стіл', buried: 'Скид', galdsTo: w => `карти столу → ${w}`,
  deal: (n, t) => (t > 0 ? `Роздача ${n} з ${t}` : `Роздача ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Ви виграли', jani: 'Ви виграли — малі «в янах»', bezstikis: 'Ви взяли всі хабарі!', lose: 'Ви програли', loseJani: 'Ви програли — «в янах»', loseBezstikis: 'Ви без хабара' };
    const them = { win: 'виграє', jani: 'виграє — малі «в янах»', bezstikis: 'бере всі хабарі!', lose: 'програє', loseJani: 'програє — «в янах»', loseBezstikis: 'лишається без хабара' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'малі «в янах»', bezstikis: 'усі хабарі', lose: 'менше 61', loseJani: '«в янах»', loseBezstikis: 'без хабара' },
  mazaLine: (w, won) => (w == null ? (won ? 'Малу золе зіграно!' : 'Мала золе не вдалася') : `${w}: мала золе ${won ? 'зіграна' : 'програна'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Ви програли галдиньш' : `Галдиньш програє: ${l.map(x => x ?? 'ви').join(' і ')}`),
  sheet: {
    title: 'Запис', next: 'Наступна роздача', finish: 'Завершити гру', finishSub: 'Підрахувати результат зараз', sessionOver: 'Гру завершено',
    youWon: 'Ви в плюсі!', youLost: 'Цього разу в мінусі', winner: w => `Перемагає ${w}`, tie: 'Нічия',
    again: 'Нова гра', exit: 'Вийти', total: 'Разом', pules: n => `Пуль на столі: ${n}`, personal: 'особиста пуля',
    final: 'Пулі списано', puleAdded: '+1 спільна пуля', puleOwn: 'свою пулю знято', puleCommon: 'спільну пулю взято · +1 з кожного',
    pulePersonal: 'особисту пулю взято · +3', vs: 'проти', yourBalance: 'Ваш баланс', rows: 'Роздача',
  },
  menu: {
    title: 'Пауза', resume: 'Продовжити', rules: 'Правила', newGame: 'Нова гра', newGameSure: 'Торкніться ще раз, щоб почати знову',
    finish: 'Завершити й підрахувати', exit: 'Вийти з-за столу', exitSub: 'Зберігається після кожного ходу — продовжите з цього місця.',
  },
  fast: 'Швидкий режим', fastOn: 'увімк.', fastOff: 'вимк.',
  coach: {
    ok: 'Зрозуміло',
    bid: n => `У вас козирів: ${n}. Стіл беруть приблизно з 5 козирями, серед них дами чи валети; зі слабкою рукою — пас.`,
    suggest: b => `Порада: ${b}`,
    discard: 'Скиньте 2 карти — їхні очки йдуть вам. Скиньте самотню десятку чи короля, щоб лишитися без масті.',
    lead: 'Ви заходите. Великому варто вибити козирі суперників старшими козирями.',
    follow: 'Ходіть у масть. Усі дами, валети й бубни — козирі, це одна масть.',
    mazie: (p, d) => `Ви і ${p} — малі, великий — ${d}. Коли хабар бере ${p}, підкидайте очки.`,
    galdins: 'Галдиньш: кожен сам за себе — програє той, хто візьме найбільше хабарів.',
    maza: 'Мала золе: той, хто заявив, не має взяти жодного хабара.',
    declarer: 'Потрібно 61 зі 120 очок. Скинуті карти вже рахуються вам.',
  },
  rules: {
    title: 'Як грати в золе',
    intro: 'Грають троє. У кожній роздачі один грає сам — великий (lielais) — проти двох малих (mazie), які грають разом. Великому треба набрати щонайменше 61 зі 120 очок.',
    deckH: 'Колода', deck: '26 карт: тузи, десятки, королі, дами, валети й дев’ятки всіх мастей плюс 8♦ і 7♦. Кожному по 8 карт, 2 кладуться на стіл сорочкою догори.',
    pointsH: 'Очки карт',
    trumpsH: 'Козирі — 14', trumps: 'Усі дами, усі валети й усі бубни — козирі, від дами трефи до сімки бубни. У трефах, піках і чирвах лишаються тільки Т 10 К 9.',
    playH: 'Розіграш', play: 'Треба ходити в масть — козирі вважаються однією мастю. Якщо масті немає, можна класти будь-яку карту. Хабар бере старший козир, інакше старша карта масті заходу. Першим ходить гравець ліворуч від того, хто роздає.',
    bidH: 'Торг', bids: {
      take: 'Взяти стіл — стати великим: узяти 2 карти зі столу й скинути 2. Очки скиду йдуть вам.',
      zole: 'Золе — грати самому без столу (очки столу йдуть малим). Ставки вищі.',
      maza: 'Мала золе — виграти, не взявши жодного хабара (правило столу).',
      pass: 'Пас — вирішує наступний. Грає перший, хто не сказав «пас».',
    },
    allPassH: 'Якщо всі пас', galdins: 'Галдиньш: кожен сам за себе. Програє той, хто взяв найбільше хабарів (за рівності — більше очок); карти столу йдуть до останнього хабара.',
    pules: 'З пулями: пишеться спільна пуля, карти перероздаються. Наступний великий, що виграє, забирає її (+1 з кожного); великий, що програв при відкритій пулі, отримує особисту пулю.',
    scoreH: 'Очки', scoreCols: ['Великий набрав', 'Великий', 'Золе'],
    scoreRows: {
      bezstikis: 'Усі 8 хабарів', jani: '91 і більше', win: '61–90', lose: '31–60', loseJani: '30 і менше', loseBezstikis: 'Жодного хабара',
    },
    mazaRow: ['Мала золе зіграна', 'Мала золе програна'], galdinsRow: 'Галдиньш: той, хто програв, −4, інші +2',
    tipsH: 'Поради', tips: [
      'Рахуйте козирі: 5 і більше з дамою-двома — сміливо беріть стіл.',
      'Скидайте десятки й королів коротких мастей — очки ваші, і можна бити козирем.',
      'Малому: коли хабар бере партнер, підкиньте туза чи десятку.',
    ],
  },
};

export const ZOLE: Strings<ZoleStrings> = { en, lv, ru, uk };
registerStrings('zole', ZOLE);
