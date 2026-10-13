import { type DeepPartial, type Strings, registerStrings, withFallback } from '../../i18n/pick';
import type { NoteKind, Suit, ThousandRules } from './engine';
import type { TLevel } from './bot';
import { TAGLINES, TITLES } from './titles';

export { TAGLINES, TITLES } from './titles';

type RuleKey = keyof ThousandRules;

export interface ThousandStrings {
  title: string;
  tagline: string;
  lobby: {
    sub: string; level: string; levels: Record<TLevel, string>; rules: string; start: string; howTo: string; back: string;
    toggles: Record<RuleKey, { label: string; sub: string }>;
  };
  suit: Record<Suit, string>;
  /** the bidding panel */
  bid: { pass: string; bid: (n: number) => string; high: (n: number, who: string) => string; forced: string; max: string };
  /** what a seat said, under its name */
  said: { pass: string; forced: (n: number) => string; bid: (n: number) => string };
  give: { title: string; to: (who: string) => string; confirm: string; pick: string };
  contract: { title: string; sub: (talonPts: number) => string; play: (n: number) => string; keep: string };
  talon: string; contractWord: string;
  trump: string; noTrump: string;
  /** banners */
  takes: (who: string | null, n: number) => string;
  plays: (who: string | null, n: number) => string;
  marriage: string;
  marriageBy: (who: string | null, v: number) => string;
  declare: (v: number) => string; plainPlay: string;
  status: {
    yourBid: string; yourGive: string; yourContract: string; yourLead: string; yourTurn: string; dealing: string; tapToSkip: string;
    bidding: (who: string) => string; giving: (who: string) => string; contracting: (who: string) => string; thinking: (who: string) => string;
  };
  you: string;
  role: { declarer: string; defender: string };
  pts: string; trickN: (n: number) => string;
  lastTrick: string; lastTrickBy: (who: string) => string;
  deal: (n: number) => string;
  of: (pts: number, contract: number) => string;
  barrel: string; bolts: string;
  sheet: {
    title: string; next: string; results: string; gameOver: string;
    made: (who: string | null, n: number) => string;
    failed: (who: string | null, n: number, pts: number) => string;
    dealPts: string; total: string; breakdown: (cards: number, mar: number) => string;
    note: Record<NoteKind, (who: string, n?: number) => string>;
    youWon: string; winner: (who: string) => string; resigned: string;
  };
  facts: { deals: string; made: string; best: string; marriages: string; place: string };
  menu: { title: string; resume: string; rules: string; newGame: string; newGameSure: string; finish: string; finishSub: string; exit: string; exitSub: string };
  fast: string; fastOn: string; fastOff: string;
  coach: {
    ok: string; bid: string; suggest: (n: number) => string; suggestPass: string; give: string; contract: string; lead: string;
    marriage: string; follow: string; barrel: string; defend: (mate: string, decl: string) => string;
  };
  rules: {
    title: string; intro: string; deckH: string; deck: string; pointsH: string;
    bidH: string; bid: string; talonH: string; talon: string;
    playH: string; play: string; marriageH: string; marriage: string;
    scoreH: string; score: string; barrelH: string; barrel: string; boltH: string; bolt: string; samosvalH: string; samosval: string;
    variantH: string; variant: (r: ThousandRules) => string[];
    tipsH: string; tips: string[];
  };
}

/* =================================================================================================== en */
const en: ThousandStrings = {
  title: TITLES.en,
  tagline: TAGLINES.en,
  lobby: {
    sub: 'Three players, 24 cards. Win the bidding, take the talon and make your contract — the first to 1000 wins.',
    level: 'Opponents', levels: { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, rules: 'House rules', start: 'Take a seat', howTo: 'How to play', back: 'Back',
    toggles: {
      marriageToBid: { label: 'Marriage to bid over 120', sub: 'Bids above 120 need K+Q of a suit in hand' },
      step10: { label: 'Steps of 10 from 200', sub: 'Bids go 200, 210, 220…' },
      barrel: { label: 'Barrel at 880', sub: 'Get off it with a contract to 1000 in 3 deals, or −120' },
      bolts: { label: 'Bolts', sub: 'No trick as a defender = a bolt; 3 bolts = −120' },
      samosval: { label: 'Dump truck', sub: 'Land on exactly 555 and your score drops to 0' },
    },
  },
  suit: { H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades' },
  bid: { pass: 'Pass', bid: n => `Bid ${n}`, high: (n, w) => `${n} · ${w}`, forced: 'You open with the forced 100', max: 'max' },
  said: { pass: 'pass', forced: n => `${n} · forced`, bid: n => `${n}` },
  give: { title: 'Give one card to each opponent', to: w => `→ ${w}`, confirm: 'Give', pick: 'Tap two cards' },
  contract: { title: 'Your contract', sub: p => `The talon brought ${p} pts. Keep the bid or raise it.`, play: n => `Play ${n}`, keep: 'Keep' },
  talon: 'Talon', contractWord: 'Bid',
  trump: 'Trump', noTrump: 'No trump',
  takes: (w, n) => (w == null ? `You take the talon at ${n}` : `${w} takes the talon at ${n}`),
  plays: (w, n) => (w == null ? `You play ${n}` : `${w} plays ${n}`),
  marriage: 'Marriage',
  marriageBy: (w, v) => (w == null ? `Your marriage · +${v}` : `${w} · marriage +${v}`),
  declare: v => `Marriage +${v}`, plainPlay: 'Just play it',
  status: {
    yourBid: 'Your bid', yourGive: 'Give away 2 cards', yourContract: 'Set your contract', yourLead: 'Your lead', yourTurn: 'Your turn',
    dealing: 'Dealing…', tapToSkip: 'tap to skip',
    bidding: w => `${w} is bidding…`, giving: w => `${w} gives away 2 cards…`, contracting: w => `${w} sets the contract…`, thinking: w => `${w} is thinking…`,
  },
  you: 'You',
  role: { declarer: 'Declarer', defender: 'Defender' },
  pts: 'pts', trickN: n => (n === 1 ? '1 trick' : `${n} tricks`),
  lastTrick: 'Last trick', lastTrickBy: w => `taken by ${w}`,
  deal: n => `Deal ${n}`,
  of: (p, c) => `${p} of ${c}`,
  barrel: 'Barrel', bolts: 'Bolts',
  sheet: {
    title: 'Score sheet', next: 'Next deal', results: 'Results', gameOver: 'Game over',
    made: (w, n) => (w == null ? `You made ${n}!` : `${w} makes ${n}`),
    failed: (w, n, p) => (w == null ? `You fell short: ${p} of ${n}` : `${w} falls short: ${p} of ${n}`),
    dealPts: 'This deal', total: 'Total', breakdown: (c, m) => `cards ${c}${m ? ` · marriages ${m}` : ''}`,
    note: {
      barrelOn: w => `${w} climbs onto the barrel`, barrelStay: (w, n) => `${w}: barrel, try ${n} of 3`, barrelFail: w => `${w} falls off the barrel · −120`,
      barrelOff: w => `${w} drops off the barrel`, barrelPush: w => `${w} is knocked off the barrel · −120`,
      bolt: (w, n) => `${w}: bolt ${n}`, bolt3: w => `${w}: third bolt · −120`, samosval: w => `${w}: dump truck! 555 → 0`, win: w => `${w} reaches 1000!`,
    },
    youWon: 'You reached 1000!', winner: w => `${w} wins the game`, resigned: 'Game ended early',
  },
  facts: { deals: 'Deals', made: 'Contracts made', best: 'Best contract', marriages: 'Marriages', place: 'Place' },
  menu: {
    title: 'Paused', resume: 'Resume', rules: 'Rules', newGame: 'New game', newGameSure: 'Tap again to drop this game',
    finish: 'End the game', finishSub: 'Counts as a loss unless you already reached 1000', exit: 'Leave the table', exitSub: 'Saved after every move — you continue right here.',
  },
  fast: 'Fast mode', fastOn: 'on', fastOff: 'off',
  coach: {
    ok: 'Got it',
    bid: 'Bid what you expect to take: card points plus marriages. Above 120 you need a marriage in hand.',
    suggest: n => `Suggestion: bid ${n}`, suggestPass: 'Suggestion: pass',
    give: 'Give each opponent one low card — never a card of your marriage, and few points.',
    contract: 'You may raise your contract now. A higher contract scores more — but miss it and you lose it all.',
    lead: 'You lead. Win the lead back with an ace, then declare your marriage on your next lead.',
    marriage: 'Lead the K or Q of a marriage to declare it: points now, and that suit becomes trump.',
    follow: 'Follow suit. Without the suit you must trump; only then may you throw anything.',
    barrel: 'On the barrel: only a contract that reaches 1000 gets you off — 3 deals, or −120.',
    defend: (m, d) => `You and ${m} defend against ${d}. When ${m} wins a trick, throw in your points.`,
  },
  rules: {
    title: 'How to play Thousand',
    intro: 'Three players, one declarer per deal. Win the bidding, take the talon and score at least the points you bid. Defenders bank what they take. The first to 1000 wins.',
    deckH: 'The deck', deck: '24 cards: A 10 K Q J 9 of every suit, in that order of rank (the 10 beats the king!). Each player gets 7 cards, 3 go face down to the talon.',
    pointsH: 'Card points',
    bidH: 'Bidding', bid: 'The player left of the dealer must open with 100. Then, round the table, raise by 5 or pass for good. The last bidder left becomes the declarer.',
    talonH: 'The talon', talon: 'The declarer shows the 3 talon cards to everyone and takes them, then gives one card face down to each opponent. Now he may raise his contract.',
    playH: 'Play', play: 'The declarer leads first; the winner of a trick leads the next. Follow suit; without the suit you must trump; otherwise anything. Highest trump wins, else the highest card of the suit led.',
    marriageH: 'Marriages', marriage: 'On lead (never the first trick) with K and Q of a suit, lead one of them to declare a marriage: its points are yours and that suit becomes trump.',
    scoreH: 'Scoring', score: 'Declarer: reach the contract (cards + marriages) and score it, else lose it. Defenders: their points, rounded to 5.',
    barrelH: 'The barrel', barrel: 'At 880 you sit on the barrel: defender points stop counting. Make a contract that lifts you to 1000 within 3 deals — or fall off, −120. A second player climbing on knocks you off.',
    boltH: 'Bolts', bolt: 'A defender who takes no trick (and declares no marriage) gets a bolt. Three bolts cost 120.',
    samosvalH: 'Dump truck', samosval: 'Land on exactly 555 and your score goes back to 0.',
    variantH: 'This table plays',
    variant: r => [
      'Forced 100 for the player left of the dealer; steps of 5' + (r.step10 ? ', 10 from 200' : ''),
      r.marriageToBid ? 'Bids above 120 need a marriage in hand' : 'Any bid up to 300',
      'No marriage on the first trick; must trump when void',
      r.barrel ? 'Barrel at 880 · 3 tries · −120' : 'No barrel: the first to 1000 wins',
      r.bolts ? 'Bolts: 3 = −120' : 'No bolts',
      r.samosval ? 'Dump truck at 555' : 'No dump truck',
    ],
    tipsH: 'Tips', tips: [
      'A marriage is the heart of a bid: ♥ alone is worth 100.',
      'Keep an ace to win the lead back — you can only declare a marriage on lead.',
      'As a defender, throw your 10s and aces onto your partner’s tricks.',
    ],
  },
};

/* =================================================================================================== ru */
const ru: ThousandStrings = {
  title: TITLES.ru,
  tagline: TAGLINES.ru,
  lobby: {
    sub: 'Трое игроков, 24 карты. Выиграй торг, возьми прикуп и сыграй заказ — первый до 1000 побеждает.',
    level: 'Соперники', levels: { easy: 'Лёгкие', normal: 'Обычные', hard: 'Сильные' }, rules: 'Правила стола', start: 'За стол', howTo: 'Как играть', back: 'Назад',
    toggles: {
      marriageToBid: { label: 'Больше 120 — только с марьяжем', sub: 'Заказ выше 120 требует K+Q одной масти на руке' },
      step10: { label: 'Шаг 10 после 200', sub: 'Ставки: 200, 210, 220…' },
      barrel: { label: 'Бочка на 880', sub: 'Слезть — сыграть до 1000 за 3 раздачи, иначе −120' },
      bolts: { label: 'Болты', sub: 'Ни одной взятки в защите — болт; 3 болта = −120' },
      samosval: { label: 'Самосвал', sub: 'Ровно 555 очков — счёт обнуляется' },
    },
  },
  suit: { H: 'черви', D: 'бубны', C: 'трефы', S: 'пики' },
  bid: { pass: 'Пас', bid: n => `Заказать ${n}`, high: (n, w) => `${n} · ${w}`, forced: 'Вы открываете обязательной сотней', max: 'макс' },
  said: { pass: 'пас', forced: n => `${n} · обяз.`, bid: n => `${n}` },
  give: { title: 'Отдайте по карте каждому сопернику', to: w => `→ ${w}`, confirm: 'Отдать', pick: 'Выберите две карты' },
  contract: { title: 'Ваш заказ', sub: p => `Прикуп принёс ${p} оч. Оставьте ставку или поднимите.`, play: n => `Играть ${n}`, keep: 'Оставить' },
  talon: 'Прикуп', contractWord: 'Заказ',
  trump: 'Козырь', noTrump: 'Без козыря',
  takes: (w, n) => (w == null ? `Прикуп ваш за ${n}` : `${w} берёт прикуп за ${n}`),
  plays: (w, n) => (w == null ? `Вы играете ${n}` : `${w} играет ${n}`),
  marriage: 'Марьяж',
  marriageBy: (w, v) => (w == null ? `Ваш марьяж · +${v}` : `${w} · марьяж +${v}`),
  declare: v => `Марьяж +${v}`, plainPlay: 'Просто ход',
  status: {
    yourBid: 'Ваша ставка', yourGive: 'Отдайте 2 карты', yourContract: 'Назначьте заказ', yourLead: 'Ваш ход', yourTurn: 'Ваш ход',
    dealing: 'Раздача…', tapToSkip: 'нажмите, чтобы пропустить',
    bidding: w => `${w} торгуется…`, giving: w => `${w} отдаёт 2 карты…`, contracting: w => `${w} назначает заказ…`, thinking: w => `${w} думает…`,
  },
  you: 'Вы',
  role: { declarer: 'Играет', defender: 'Защита' },
  pts: 'оч.', trickN: n => `${n} ${ruPl(n, 'взятка', 'взятки', 'взяток')}`,
  lastTrick: 'Последняя взятка', lastTrickBy: w => `забрал(а) ${w}`,
  deal: n => `Раздача ${n}`,
  of: (p, c) => `${p} из ${c}`,
  barrel: 'Бочка', bolts: 'Болты',
  sheet: {
    title: 'Пулька', next: 'Следующая раздача', results: 'Итоги', gameOver: 'Партия окончена',
    made: (w, n) => (w == null ? `Вы сыграли ${n}!` : `${w} сыграл(а) ${n}`),
    failed: (w, n, p) => (w == null ? `Недобор: ${p} из ${n}` : `${w} не добрал(а): ${p} из ${n}`),
    dealPts: 'Раздача', total: 'Всего', breakdown: (c, m) => `в картах ${c}${m ? ` · марьяжи ${m}` : ''}`,
    note: {
      barrelOn: w => `${w} садится на бочку`, barrelStay: (w, n) => `${w}: бочка, попытка ${n} из 3`, barrelFail: w => `${w} слетает с бочки · −120`,
      barrelOff: w => `${w} падает с бочки`, barrelPush: w => `${w} сбит(а) с бочки · −120`,
      bolt: (w, n) => `${w}: болт ${n}`, bolt3: w => `${w}: третий болт · −120`, samosval: w => `${w}: самосвал! 555 → 0`, win: w => `${w} набирает 1000!`,
    },
    youWon: 'Вы набрали 1000!', winner: w => `${w} выигрывает партию`, resigned: 'Партия прервана',
  },
  facts: { deals: 'Раздач', made: 'Сыграно заказов', best: 'Лучший заказ', marriages: 'Марьяжи', place: 'Место' },
  menu: {
    title: 'Пауза', resume: 'Продолжить', rules: 'Правила', newGame: 'Новая партия', newGameSure: 'Нажмите ещё раз, чтобы бросить партию',
    finish: 'Завершить партию', finishSub: 'Засчитывается поражение, если вы ещё не набрали 1000', exit: 'Выйти из-за стола', exitSub: 'Сохраняется после каждого хода — продолжите с этого места.',
  },
  fast: 'Быстрый режим', fastOn: 'вкл', fastOff: 'выкл',
  coach: {
    ok: 'Понятно',
    bid: 'Заказывайте, сколько рассчитываете взять: очки карт плюс марьяжи. Больше 120 — только с марьяжем на руке.',
    suggest: n => `Совет: заказать ${n}`, suggestPass: 'Совет: пас',
    give: 'Отдайте каждому сопернику по мелкой карте — не из марьяжа и без лишних очков.',
    contract: 'Сейчас можно поднять заказ. Больше заказ — больше очков, но недобор спишет его целиком.',
    lead: 'Ваш ход. Возьмите взятку тузом, а следующим ходом объявите марьяж.',
    marriage: 'Пойдите королём или дамой марьяжа, чтобы его объявить: очки сразу, и масть становится козырем.',
    follow: 'Ходите в масть. Нет масти — обязаны козырять; нет и козыря — любая карта.',
    barrel: 'На бочке: слезть можно только заказом, который доводит до 1000, — 3 раздачи, иначе −120.',
    defend: (m, d) => `Вы с ${m} защищаетесь против ${d}. Когда взятку берёт ${m}, подкидывайте очки.`,
  },
  rules: {
    title: 'Как играть в Тысячу',
    intro: 'Трое игроков, в каждой раздаче один разыгрывающий. Выиграйте торг, возьмите прикуп и наберите не меньше заказанного. Защитники записывают то, что взяли. Первый до 1000 побеждает.',
    deckH: 'Колода', deck: '24 карты: Т 10 К Д В 9 каждой масти — именно в таком старшинстве (десятка бьёт короля!). Каждому по 7 карт, 3 — в прикуп рубашкой вверх.',
    pointsH: 'Очки карт',
    bidH: 'Торговля', bid: 'Игрок слева от сдающего обязан заказать 100. Дальше по кругу: поднять на 5 или пасовать до конца раздачи. Последний оставшийся становится разыгрывающим.',
    talonH: 'Прикуп', talon: 'Разыгрывающий показывает прикуп всем и забирает его, затем отдаёт по одной карте каждому сопернику. После этого можно поднять заказ.',
    playH: 'Розыгрыш', play: 'Первым ходит разыгрывающий, дальше — взявший взятку. В масть; нет масти — козырем; нет козыря — любой картой. Берёт старший козырь, иначе старшая карта масти хода.',
    marriageH: 'Марьяжи', marriage: 'Имея ход (не в первой взятке) и короля с дамой одной масти, пойдите одной из них и объявите марьяж: его очки ваши, а масть становится козырной.',
    scoreH: 'Подсчёт', score: 'Разыгрывающий: набрал заказ (карты + марьяжи) — записывает его, нет — списывает. Защитники: свои очки, округлённые до 5.',
    barrelH: 'Бочка', barrel: 'С 880 очков вы на бочке: очки в защите не идут. За 3 раздачи сыграйте заказ, который доводит до 1000, — иначе слетаете, −120. Второй, севший на бочку, сбивает первого.',
    boltH: 'Болты', bolt: 'Защитник без единой взятки (и без марьяжа) получает болт. Три болта — минус 120.',
    samosvalH: 'Самосвал', samosval: 'Ровно 555 очков — счёт обнуляется.',
    variantH: 'За этим столом',
    variant: r => [
      'Обязательная сотня у игрока слева от сдающего; шаг 5' + (r.step10 ? ', после 200 — шаг 10' : ''),
      r.marriageToBid ? 'Больше 120 — только с марьяжем на руке' : 'Любой заказ до 300',
      'В первой взятке марьяж не объявляется; нет масти — обязан козырять',
      r.barrel ? 'Бочка на 880 · 3 попытки · −120' : 'Без бочки: побеждает первый до 1000',
      r.bolts ? 'Болты: 3 = −120' : 'Без болтов',
      r.samosval ? 'Самосвал на 555' : 'Без самосвала',
    ],
    tipsH: 'Советы', tips: [
      'Марьяж — сердце заказа: одни черви стоят 100.',
      'Держите туза, чтобы вернуть ход: марьяж объявляется только своим ходом.',
      'В защите подкидывайте десятки и тузы во взятки партнёра.',
    ],
  },
};

/* =================================================================================================== uk */
const uk: ThousandStrings = {
  title: TITLES.uk,
  tagline: TAGLINES.uk,
  lobby: {
    sub: 'Троє гравців, 24 карти. Виграй торг, візьми прикуп і зіграй замовлення — перший до 1000 перемагає.',
    level: 'Суперники', levels: { easy: 'Легкі', normal: 'Звичайні', hard: 'Сильні' }, rules: 'Правила столу', start: 'За стіл', howTo: 'Як грати', back: 'Назад',
    toggles: {
      marriageToBid: { label: 'Понад 120 — лише з мар’яжем', sub: 'Замовлення понад 120 потребує K+Д однієї масті' },
      step10: { label: 'Крок 10 після 200', sub: 'Ставки: 200, 210, 220…' },
      barrel: { label: 'Бочка на 880', sub: 'Злізти — зіграти до 1000 за 3 роздачі, інакше −120' },
      bolts: { label: 'Болти', sub: 'Жодного хабара в захисті — болт; 3 болти = −120' },
      samosval: { label: 'Самоскид', sub: 'Рівно 555 очок — рахунок обнуляється' },
    },
  },
  suit: { H: 'чирви', D: 'бубни', C: 'трефи', S: 'піки' },
  bid: { pass: 'Пас', bid: n => `Замовити ${n}`, high: (n, w) => `${n} · ${w}`, forced: 'Ви відкриваєте обов’язковою сотнею', max: 'макс' },
  said: { pass: 'пас', forced: n => `${n} · обов.`, bid: n => `${n}` },
  give: { title: 'Віддайте по карті кожному суперникові', to: w => `→ ${w}`, confirm: 'Віддати', pick: 'Виберіть дві карти' },
  contract: { title: 'Ваше замовлення', sub: p => `Прикуп приніс ${p} оч. Залиште ставку або підніміть.`, play: n => `Грати ${n}`, keep: 'Залишити' },
  talon: 'Прикуп', contractWord: 'Замовлення',
  trump: 'Козир', noTrump: 'Без козиря',
  takes: (w, n) => (w == null ? `Прикуп ваш за ${n}` : `${w} бере прикуп за ${n}`),
  plays: (w, n) => (w == null ? `Ви граєте ${n}` : `${w} грає ${n}`),
  marriage: 'Мар’яж',
  marriageBy: (w, v) => (w == null ? `Ваш мар’яж · +${v}` : `${w} · мар’яж +${v}`),
  declare: v => `Мар’яж +${v}`, plainPlay: 'Просто хід',
  status: {
    yourBid: 'Ваша ставка', yourGive: 'Віддайте 2 карти', yourContract: 'Призначте замовлення', yourLead: 'Ваш хід', yourTurn: 'Ваш хід',
    dealing: 'Роздача…', tapToSkip: 'торкніться, щоб пропустити',
    bidding: w => `${w} торгується…`, giving: w => `${w} віддає 2 карти…`, contracting: w => `${w} призначає замовлення…`, thinking: w => `${w} думає…`,
  },
  you: 'Ви',
  role: { declarer: 'Грає', defender: 'Захист' },
  pts: 'оч.', trickN: n => `${n} ${ruPl(n, 'хабар', 'хабарі', 'хабарів')}`,
  lastTrick: 'Останній хабар', lastTrickBy: w => `забрав(ла) ${w}`,
  deal: n => `Роздача ${n}`,
  of: (p, c) => `${p} із ${c}`,
  barrel: 'Бочка', bolts: 'Болти',
  sheet: {
    title: 'Запис', next: 'Наступна роздача', results: 'Підсумки', gameOver: 'Партію завершено',
    made: (w, n) => (w == null ? `Ви зіграли ${n}!` : `${w} зіграв(ла) ${n}`),
    failed: (w, n, p) => (w == null ? `Недобір: ${p} із ${n}` : `${w} не добрав(ла): ${p} із ${n}`),
    dealPts: 'Роздача', total: 'Разом', breakdown: (c, m) => `у картах ${c}${m ? ` · мар’яжі ${m}` : ''}`,
    note: {
      barrelOn: w => `${w} сідає на бочку`, barrelStay: (w, n) => `${w}: бочка, спроба ${n} із 3`, barrelFail: w => `${w} злітає з бочки · −120`,
      barrelOff: w => `${w} падає з бочки`, barrelPush: w => `${w} збито з бочки · −120`,
      bolt: (w, n) => `${w}: болт ${n}`, bolt3: w => `${w}: третій болт · −120`, samosval: w => `${w}: самоскид! 555 → 0`, win: w => `${w} набирає 1000!`,
    },
    youWon: 'Ви набрали 1000!', winner: w => `${w} виграє партію`, resigned: 'Партію перервано',
  },
  facts: { deals: 'Роздач', made: 'Зіграно замовлень', best: 'Найкраще замовлення', marriages: 'Мар’яжі', place: 'Місце' },
  menu: {
    title: 'Пауза', resume: 'Продовжити', rules: 'Правила', newGame: 'Нова партія', newGameSure: 'Торкніться ще раз, щоб кинути партію',
    finish: 'Завершити партію', finishSub: 'Зараховується поразка, якщо ви ще не набрали 1000', exit: 'Вийти з-за столу', exitSub: 'Зберігається після кожного ходу — продовжите з цього місця.',
  },
  fast: 'Швидкий режим', fastOn: 'увімк', fastOff: 'вимк',
  coach: {
    ok: 'Зрозуміло',
    bid: 'Замовляйте стільки, скільки розраховуєте взяти: очки карт плюс мар’яжі. Понад 120 — лише з мар’яжем на руці.',
    suggest: n => `Порада: замовити ${n}`, suggestPass: 'Порада: пас',
    give: 'Віддайте кожному суперникові по дрібній карті — не з мар’яжу й без зайвих очок.',
    contract: 'Зараз можна підняти замовлення. Більше замовлення — більше очок, але недобір спише його повністю.',
    lead: 'Ваш хід. Візьміть хабар тузом, а наступним ходом оголосіть мар’яж.',
    marriage: 'Підіть королем або дамою мар’яжу, щоб його оголосити: очки одразу, і масть стає козирем.',
    follow: 'Ходіть у масть. Немає масті — мусите козиряти; немає й козиря — будь-яка карта.',
    barrel: 'На бочці: злізти можна лише замовленням, яке доводить до 1000, — 3 роздачі, інакше −120.',
    defend: (m, d) => `Ви з ${m} захищаєтеся проти ${d}. Коли хабар бере ${m}, підкидайте очки.`,
  },
  rules: {
    title: 'Як грати в Тисячу',
    intro: 'Троє гравців, у кожній роздачі один розігрує. Виграйте торг, візьміть прикуп і наберіть не менше замовленого. Захисники записують те, що взяли. Перший до 1000 перемагає.',
    deckH: 'Колода', deck: '24 карти: Т 10 К Д В 9 кожної масті — саме в такому старшинстві (десятка б’є короля!). Кожному по 7 карт, 3 — у прикуп сорочкою догори.',
    pointsH: 'Очки карт',
    bidH: 'Торг', bid: 'Гравець ліворуч від того, хто роздає, мусить замовити 100. Далі по колу: підняти на 5 або пасувати до кінця роздачі. Останній, хто лишився, розігрує.',
    talonH: 'Прикуп', talon: 'Той, хто розігрує, показує прикуп усім і забирає його, потім віддає по одній карті кожному суперникові. Після цього можна підняти замовлення.',
    playH: 'Розіграш', play: 'Першим ходить той, хто розігрує, далі — хто взяв хабар. У масть; немає масті — козирем; немає козиря — будь-якою картою. Бере старший козир, інакше старша карта масті ходу.',
    marriageH: 'Мар’яжі', marriage: 'Маючи хід (не в першому хабарі) і короля з дамою однієї масті, підіть однією з них і оголосіть мар’яж: його очки ваші, а масть стає козирною.',
    scoreH: 'Підрахунок', score: 'Той, хто розігрує: набрав замовлення (карти + мар’яжі) — записує його, ні — списує. Захисники: свої очки, округлені до 5.',
    barrelH: 'Бочка', barrel: 'З 880 очок ви на бочці: очки в захисті не йдуть. За 3 роздачі зіграйте замовлення, що доводить до 1000, — інакше злітаєте, −120. Другий, хто сів на бочку, збиває першого.',
    boltH: 'Болти', bolt: 'Захисник без жодного хабара (і без мар’яжу) отримує болт. Три болти — мінус 120.',
    samosvalH: 'Самоскид', samosval: 'Рівно 555 очок — рахунок обнуляється.',
    variantH: 'За цим столом',
    variant: r => [
      'Обов’язкова сотня у гравця ліворуч від того, хто роздає; крок 5' + (r.step10 ? ', після 200 — крок 10' : ''),
      r.marriageToBid ? 'Понад 120 — лише з мар’яжем на руці' : 'Будь-яке замовлення до 300',
      'У першому хабарі мар’яж не оголошується; немає масті — мусиш козиряти',
      r.barrel ? 'Бочка на 880 · 3 спроби · −120' : 'Без бочки: перемагає перший до 1000',
      r.bolts ? 'Болти: 3 = −120' : 'Без болтів',
      r.samosval ? 'Самоскид на 555' : 'Без самоскида',
    ],
    tipsH: 'Поради', tips: [
      'Мар’яж — серце замовлення: самі чирви коштують 100.',
      'Тримайте туза, щоб повернути хід: мар’яж оголошується лише своїм ходом.',
      'У захисті підкидайте десятки й тузи в хабарі партнера.',
    ],
  },
};

/* =================================================================================================== lv */
const lv: ThousandStrings = {
  title: TITLES.lv,
  tagline: TAGLINES.lv,
  lobby: {
    sub: 'Trīs spēlētāji, 24 kārtis. Uzvari solīšanā, paņem pirkumu un izpildi pasūtījumu — pirmais līdz 1000 uzvar.',
    level: 'Pretinieki', levels: { easy: 'Viegli', normal: 'Parasti', hard: 'Stipri' }, rules: 'Galda noteikumi', start: 'Pie galda', howTo: 'Kā spēlēt', back: 'Atpakaļ',
    toggles: {
      marriageToBid: { label: 'Virs 120 — tikai ar mariāžu', sub: 'Solījumam virs 120 rokā vajag vienas mastas K+Q' },
      step10: { label: 'Solis 10 no 200', sub: 'Solījumi: 200, 210, 220…' },
      barrel: { label: 'Muca pie 880', sub: 'Nokāp, izpildot pasūtījumu līdz 1000 trīs dalīšanās, citādi −120' },
      bolts: { label: 'Bolti', sub: 'Aizsardzībā neviena stiķa — bolts; 3 bolti = −120' },
      samosval: { label: 'Pašizgāzējs', sub: 'Tieši 555 punkti — rezultāts nokrīt uz 0' },
    },
  },
  suit: { H: 'ercens', D: 'kāravs', C: 'kreiči', S: 'pīķis' },
  bid: { pass: 'Garām', bid: n => `Solīt ${n}`, high: (n, w) => `${n} · ${w}`, forced: 'Tu atver ar obligāto simtu', max: 'maks.' },
  said: { pass: 'garām', forced: n => `${n} · oblig.`, bid: n => `${n}` },
  give: { title: 'Atdod katram pretiniekam pa kārtij', to: w => `→ ${w}`, confirm: 'Atdot', pick: 'Izvēlies divas kārtis' },
  contract: { title: 'Tavs pasūtījums', sub: p => `Pirkums atnesa ${p} p. Atstāj solījumu vai paaugstini.`, play: n => `Spēlēt ${n}`, keep: 'Atstāt' },
  talon: 'Pirkums', contractWord: 'Pasūtījums',
  trump: 'Trumpis', noTrump: 'Bez trumpja',
  takes: (w, n) => (w == null ? `Pirkums tavs par ${n}` : `${w} ņem pirkumu par ${n}`),
  plays: (w, n) => (w == null ? `Tu spēlē ${n}` : `${w} spēlē ${n}`),
  marriage: 'Mariāža',
  marriageBy: (w, v) => (w == null ? `Tava mariāža · +${v}` : `${w} · mariāža +${v}`),
  declare: v => `Mariāža +${v}`, plainPlay: 'Vienkārši gājiens',
  status: {
    yourBid: 'Tavs solījums', yourGive: 'Atdod 2 kārtis', yourContract: 'Nosaki pasūtījumu', yourLead: 'Tavs gājiens', yourTurn: 'Tavs gājiens',
    dealing: 'Dala…', tapToSkip: 'pieskaries, lai izlaistu',
    bidding: w => `${w} solās…`, giving: w => `${w} atdod 2 kārtis…`, contracting: w => `${w} nosaka pasūtījumu…`, thinking: w => `${w} domā…`,
  },
  you: 'Tu',
  role: { declarer: 'Spēlē', defender: 'Aizsargā' },
  pts: 'p.', trickN: n => (n % 10 === 1 && n % 100 !== 11 ? `${n} stiķis` : `${n} stiķi`),
  lastTrick: 'Pēdējais stiķis', lastTrickBy: w => `paņēma ${w}`,
  deal: n => `${n}. dalīšana`,
  of: (p, c) => `${p} no ${c}`,
  barrel: 'Muca', bolts: 'Bolti',
  sheet: {
    title: 'Pieraksts', next: 'Nākamā dalīšana', results: 'Rezultāti', gameOver: 'Partija beigusies',
    made: (w, n) => (w == null ? `Tu izpildīji ${n}!` : `${w} izpilda ${n}`),
    failed: (w, n, p) => (w == null ? `Pietrūka: ${p} no ${n}` : `${w} nepietiek: ${p} no ${n}`),
    dealPts: 'Dalīšana', total: 'Kopā', breakdown: (c, m) => `kārtīs ${c}${m ? ` · mariāžas ${m}` : ''}`,
    note: {
      barrelOn: w => `${w} uzkāpj uz mucas`, barrelStay: (w, n) => `${w}: muca, ${n}. mēģinājums no 3`, barrelFail: w => `${w} nokrīt no mucas · −120`,
      barrelOff: w => `${w} nokrīt no mucas`, barrelPush: w => `${w} nogrūsts no mucas · −120`,
      bolt: (w, n) => `${w}: ${n}. bolts`, bolt3: w => `${w}: trešais bolts · −120`, samosval: w => `${w}: pašizgāzējs! 555 → 0`, win: w => `${w} sasniedz 1000!`,
    },
    youWon: 'Tu sasniedzi 1000!', winner: w => `${w} uzvar partiju`, resigned: 'Partija pārtraukta',
  },
  facts: { deals: 'Dalīšanas', made: 'Izpildīti pasūtījumi', best: 'Labākais pasūtījums', marriages: 'Mariāžas', place: 'Vieta' },
  menu: {
    title: 'Pauze', resume: 'Turpināt', rules: 'Noteikumi', newGame: 'Jauna partija', newGameSure: 'Pieskaries vēlreiz, lai pamestu partiju',
    finish: 'Beigt partiju', finishSub: 'Skaitās zaudējums, ja vēl neesi sasniedzis 1000', exit: 'Atstāt galdu', exitSub: 'Saglabājas pēc katra gājiena — turpināsi tieši šeit.',
  },
  fast: 'Ātrais režīms', fastOn: 'iesl.', fastOff: 'izsl.',
  coach: {
    ok: 'Skaidrs',
    bid: 'Sola tik, cik ceri paņemt: kāršu punkti plus mariāžas. Virs 120 — tikai ar mariāžu rokā.',
    suggest: n => `Ieteikums: solīt ${n}`, suggestPass: 'Ieteikums: garām',
    give: 'Atdod katram pretiniekam pa sīkai kārtij — ne no mariāžas un bez liekiem punktiem.',
    contract: 'Tagad vari paaugstināt pasūtījumu. Lielāks pasūtījums — vairāk punktu, bet neizpildīts tiek norakstīts pilnībā.',
    lead: 'Tavs gājiens. Paņem stiķi ar dūzi, bet nākamajā gājienā piesaki mariāžu.',
    marriage: 'Ej ar mariāžas kungu vai dāmu, lai to pieteiktu: punkti uzreiz, un masts kļūst par trumpi.',
    follow: 'Liec mastu. Ja mastas nav — jāliek trumpis; ja nav arī trumpja — jebkura kārts.',
    barrel: 'Uz mucas: nokāpt var tikai ar pasūtījumu, kas aizved līdz 1000, — 3 dalīšanas, citādi −120.',
    defend: (m, d) => `Tu un ${m} aizsargājaties pret ${d}. Kad stiķi ņem ${m}, piemet punktus.`,
  },
  rules: {
    title: 'Kā spēlēt Tūkstoti',
    intro: 'Trīs spēlētāji, katrā dalīšanā viens izspēlē. Uzvari solīšanā, paņem pirkumu un savāc vismaz nosolīto. Aizsargi pieraksta paņemto. Pirmais līdz 1000 uzvar.',
    deckH: 'Kava', deck: '24 kārtis: A 10 K Q J 9 katrā mastā — tieši šādā secībā (desmitnieks pārsit kungu!). Katram 7 kārtis, 3 ar muguru uz augšu — pirkumā.',
    pointsH: 'Kāršu punkti',
    bidH: 'Solīšana', bid: 'Spēlētājam pa kreisi no dalītāja jāsola 100. Tālāk pa apli: paaugstini par 5 vai saki «garām» līdz dalīšanas beigām. Pēdējais palikušais izspēlē.',
    talonH: 'Pirkums', talon: 'Izspēlētājs parāda pirkumu visiem un paņem to, tad atdod katram pretiniekam pa vienai kārtij. Pēc tam var paaugstināt pasūtījumu.',
    playH: 'Izspēle', play: 'Pirmais iet izspēlētājs, tālāk — stiķa ņēmējs. Liec mastu; nav mastas — trumpi; nav trumpja — jebko. Ņem lielākais trumpis, citādi lielākā izietās mastas kārts.',
    marriageH: 'Mariāžas', marriage: 'Ja tev ir gājiens (ne pirmajā stiķī) un vienas mastas kungs ar dāmu, ej ar vienu no tiem un piesaki mariāžu: tās punkti tavi, un masts kļūst par trumpi.',
    scoreH: 'Skaitīšana', score: 'Izspēlētājs: savāca pasūtīto (kārtis + mariāžas) — pieraksta to, nesavāca — noraksta. Aizsargi: savus punktus, noapaļotus līdz 5.',
    barrelH: 'Muca', barrel: 'No 880 punktiem tu esi uz mucas: aizsardzības punkti neskaitās. Trīs dalīšanās izpildi pasūtījumu, kas aizved līdz 1000, — citādi nokrīti, −120. Otrs, kas uzkāpj uz mucas, nogrūž pirmo.',
    boltH: 'Bolti', bolt: 'Aizsargs bez neviena stiķa (un bez mariāžas) saņem boltu. Trīs bolti — mīnus 120.',
    samosvalH: 'Pašizgāzējs', samosval: 'Tieši 555 punkti — rezultāts nokrīt uz 0.',
    variantH: 'Pie šī galda',
    variant: r => [
      'Obligātais simts spēlētājam pa kreisi no dalītāja; solis 5' + (r.step10 ? ', no 200 — solis 10' : ''),
      r.marriageToBid ? 'Virs 120 — tikai ar mariāžu rokā' : 'Jebkurš solījums līdz 300',
      'Pirmajā stiķī mariāžu nepiesaka; nav mastas — jātrumpo',
      r.barrel ? 'Muca pie 880 · 3 mēģinājumi · −120' : 'Bez mucas: uzvar pirmais līdz 1000',
      r.bolts ? 'Bolti: 3 = −120' : 'Bez boltiem',
      r.samosval ? 'Pašizgāzējs pie 555' : 'Bez pašizgāzēja',
    ],
    tipsH: 'Padomi', tips: [
      'Mariāža ir solījuma sirds: ercens vien maksā 100.',
      'Paturi dūzi, lai atgūtu gājienu: mariāžu piesaka tikai savā gājienā.',
      'Aizsardzībā met desmitniekus un dūžus partnera stiķos.',
    ],
  },
};

function ruPl(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

type P = DeepPartial<ThousandStrings>;
const main = (t: string, tg: string, x: { start: string; howTo: string; pass: string; bid: (n: number) => string; next: string; trump: string; rules: string; resume: string; newGame: string; talon: string; marriage: string }): P => ({
  title: t, tagline: tg, lobby: { start: x.start, howTo: x.howTo }, bid: { pass: x.pass, bid: x.bid }, sheet: { next: x.next }, trump: x.trump, talon: x.talon,
  marriage: x.marriage, menu: { rules: x.rules, resume: x.resume, newGame: x.newGame },
});
/** Other languages: title, tagline and the main buttons; everything else falls back to English. */
const PART: Record<string, P> = {
  lt: main(TITLES.lt, TAGLINES.lt, { start: 'Prie stalo', howTo: 'Kaip žaisti', pass: 'Pas', bid: n => `Siūlyti ${n}`, next: 'Kitas dalijimas', trump: 'Koziris', rules: 'Taisyklės', resume: 'Tęsti', newGame: 'Naujas žaidimas', talon: 'Talionas', marriage: 'Santuoka' }),
  et: main(TITLES.et, TAGLINES.et, { start: 'Laua taha', howTo: 'Kuidas mängida', pass: 'Pass', bid: n => `Paku ${n}`, next: 'Järgmine jagamine', trump: 'Trump', rules: 'Reeglid', resume: 'Jätka', newGame: 'Uus mäng', talon: 'Talong', marriage: 'Abielu' }),
  pl: main(TITLES.pl, TAGLINES.pl, { start: 'Do stołu', howTo: 'Jak grać', pass: 'Pas', bid: n => `Licytuj ${n}`, next: 'Następne rozdanie', trump: 'Atut', rules: 'Zasady', resume: 'Kontynuuj', newGame: 'Nowa gra', talon: 'Musik', marriage: 'Meldunek' }),
  de: main(TITLES.de, TAGLINES.de, { start: 'Platz nehmen', howTo: 'Spielregeln', pass: 'Passe', bid: n => `${n} reizen`, next: 'Nächstes Spiel', trump: 'Trumpf', rules: 'Regeln', resume: 'Weiter', newGame: 'Neues Spiel', talon: 'Stock', marriage: 'Paar' }),
  be: main(TITLES.be, TAGLINES.be, { start: 'За стол', howTo: 'Як гуляць', pass: 'Пас', bid: n => `Заказаць ${n}`, next: 'Наступная раздача', trump: 'Козыр', rules: 'Правілы', resume: 'Працягнуць', newGame: 'Новая партыя', talon: 'Прыкуп', marriage: 'Мар’яж' }),
  kk: main(TITLES.kk, TAGLINES.kk, { start: 'Үстелге', howTo: 'Қалай ойнау', pass: 'Пас', bid: n => `${n} тапсырыс`, next: 'Келесі тарату', trump: 'Көзір', rules: 'Ережелер', resume: 'Жалғастыру', newGame: 'Жаңа ойын', talon: 'Прикуп', marriage: 'Марьяж' }),
  uz: main(TITLES.uz, TAGLINES.uz, { start: 'Stolga', howTo: 'Qanday o‘ynash', pass: 'Pas', bid: n => `${n} buyurtma`, next: 'Keyingi tarqatish', trump: 'Kozir', rules: 'Qoidalar', resume: 'Davom etish', newGame: 'Yangi o‘yin', talon: 'Prikup', marriage: 'Maryaj' }),
  az: main(TITLES.az, TAGLINES.az, { start: 'Masaya', howTo: 'Necə oynamalı', pass: 'Pas', bid: n => `${n} sifariş`, next: 'Növbəti paylama', trump: 'Kozır', rules: 'Qaydalar', resume: 'Davam et', newGame: 'Yeni oyun', talon: 'Prikup', marriage: 'Maryaj' }),
  ka: main(TITLES.ka, TAGLINES.ka, { start: 'მაგიდასთან', howTo: 'როგორ ვითამაშოთ', pass: 'პასი', bid: n => `შეკვეთა ${n}`, next: 'შემდეგი დარიგება', trump: 'კოზირი', rules: 'წესები', resume: 'გაგრძელება', newGame: 'ახალი თამაში', talon: 'პრიკუპი', marriage: 'მარიაჟი' }),
  hy: main(TITLES.hy, TAGLINES.hy, { start: 'Սեղանի մոտ', howTo: 'Ինչպես խաղալ', pass: 'Պաս', bid: n => `Պատվիրել ${n}`, next: 'Հաջորդ բաժանումը', trump: 'Կոզիր', rules: 'Կանոններ', resume: 'Շարունակել', newGame: 'Նոր խաղ', talon: 'Պրիկուպ', marriage: 'Մարյաժ' }),
  ro: main(TITLES.ro, TAGLINES.ro, { start: 'La masă', howTo: 'Cum se joacă', pass: 'Pas', bid: n => `Licitez ${n}`, next: 'Următoarea mână', trump: 'Atu', rules: 'Reguli', resume: 'Continuă', newGame: 'Joc nou', talon: 'Talon', marriage: 'Mariaj' }),
  bg: main(TITLES.bg, TAGLINES.bg, { start: 'На масата', howTo: 'Как се играе', pass: 'Пас', bid: n => `Обявявам ${n}`, next: 'Следващо раздаване', trump: 'Коз', rules: 'Правила', resume: 'Продължи', newGame: 'Нова игра', talon: 'Прикуп', marriage: 'Женитба' }),
  es: main(TITLES.es, TAGLINES.es, { start: 'Sentarse', howTo: 'Cómo jugar', pass: 'Paso', bid: n => `Pujar ${n}`, next: 'Siguiente mano', trump: 'Triunfo', rules: 'Reglas', resume: 'Continuar', newGame: 'Nueva partida', talon: 'Talón', marriage: 'Matrimonio' }),
};

export const THOUSAND: Strings<ThousandStrings> = {
  en, ru, uk, lv,
  ...Object.fromEntries(Object.entries(PART).map(([k, v]) => [k, withFallback(en, v)])),
};
registerStrings('thousand', THOUSAND);
