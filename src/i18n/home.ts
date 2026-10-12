import type { Strings } from './pick';

/** Home page, intro and one-page rules. English is mandatory; other languages fall back to it. */
export interface HomeStrings {
  intro: { skip: string; burn: string; low: string };
  modes: { bots: string; online: string; friends: string };
  players: string;
  level: string;
  levels: { easy: string; normal: string; hard: string; expert: string };
  bluff: string;
  bluffHint: string;
  onlineNote: string;
  friendsNote: string;
  orJoin: string;
  shop: { title: string; sub: string };
  merch: { title: string; sub: string };
  rulesCue: string;
  rules: {
    kicker: string; title: string; sub: string;
    deal: string;
    basics: { h: string; p: string }[];
    specialTitle: string;
    special: { A: Sp; '6': Sp; '7': Sp; '8': Sp; '9': Sp; J: Sp; QS: Sp; K: Sp };
    combosTitle: string;
    combos: { h: string; p: string }[];
    jacksTitle: string; jacksP: string; jacksN: (n: number) => string;
    pointsTitle: string; pointsSub: string; except6S: string;
    exampleTitle: string; exampleLeft: string; exampleJacks: string;
    scoreTitle: string; facts: { burn: string; end: string; low: string; kings: string };
    bluffTitle: string; bluffP: string; bluffOff: string;
    guide: string; practice: string;
  };
}

interface Sp { h: string; tag: string; p: string }

const en: HomeStrings = {
  intro: { skip: 'Skip', burn: 'Exactly 125 → 0', low: 'Lowest score wins' },
  modes: { bots: 'Bots', online: 'Online', friends: 'Friends' },
  players: 'Players',
  level: 'Bot level',
  levels: { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' },
  bluff: 'Bluff mode',
  bluffHint: 'Optional house rule',
  onlineNote: 'Real players right now. Empty seats are filled by bots.',
  friendsNote: 'Start a private table and share the link — or join with a code.',
  orJoin: 'Have a code?',
  shop: { title: 'Shop', sub: 'Tables, card backs & bonuses' },
  merch: { title: 'Merch', sub: 'Real decks & gifts' },
  rulesCue: 'Rules',
  rules: {
    kicker: 'One page, one minute', title: 'The rules', sub: 'Empty your hand first. Everyone else scores what is left in theirs — keep your total low.',
    deal: '2 players: 5 cards each · 3–4 players: 4 cards each',
    basics: [
      { h: 'Match', p: 'Same suit or same rank as the top card. Several cards of one rank go down together.' },
      { h: 'Can’t match?', p: 'Draw one card. Play it if it fits — otherwise pass.' },
      { h: 'Go out', p: 'First with an empty hand wins the round. The others add up their points.' },
    ],
    specialTitle: 'Special cards',
    special: {
      A: { h: 'Ace', tag: 'Skip', p: 'The next player misses a turn. Two aces skip two players.' },
      '6': { h: 'Six', tag: 'Cover it', p: 'Cover it at once with another card — draw until you can. You can’t go out on a 6.' },
      '7': { h: 'Seven', tag: '+1', p: 'The next player draws 1 card per 7, then plays on.' },
      '8': { h: 'Eight', tag: '+2 · chain', p: 'Next player draws 2 and skips — or answers with an 8 and passes on 4, 6, 8.' },
      '9': { h: 'Nine', tag: 'Wild', p: 'Goes on any card. The suit becomes the nine’s own.' },
      J: { h: 'Jack', tag: 'Wild + suit', p: 'Goes on any card and you name the next suit.' },
      QS: { h: 'Queen of spades', tag: '+5 · skip', p: 'The next player draws 5 and loses the turn. Only the 6♠ can answer it.' },
      K: { h: 'Four kings', tag: 'Reset', p: 'Four kings in a row on the pile: everyone’s score drops to 0.' },
    },
    combosTitle: 'Combos',
    combos: [
      { h: 'Q♠ answered with 6♠', p: 'The next player draws 6 instead and must cover the 6♠. Q♠ + 6♠ played together works the same.' },
      { h: 'Chain of eights', p: 'Every 8 adds two cards. Whoever can’t answer takes the lot and skips.' },
    ],
    jacksTitle: 'Go out on jacks', jacksP: 'Finish with jacks and every opponent’s points are multiplied.', jacksN: n => `${n} J`,
    pointsTitle: 'Points', pointsSub: 'Only the cards left in your hand when someone goes out count.',
    except6S: 'except 6♠',
    exampleTitle: 'Example', exampleLeft: 'Left in your hand', exampleJacks: 'Winner went out with 2 jacks',
    scoreTitle: 'The score', facts: { burn: 'Exactly 125 → burns back to 0', end: 'Anyone reaches 130 → game over', low: 'Lowest total wins', kings: 'Four kings → everyone to 0' },
    bluffTitle: 'Bluff mode', bluffP: 'An optional house rule: you may slip down a card that doesn’t match. Get caught and you draw the penalty — call a bluff wrongly and you draw it.', bluffOff: 'Off by default — switch it on above.',
    guide: 'Detailed guide', practice: 'Play a practice game',
  },
};

const lv: HomeStrings = {
  intro: { skip: 'Izlaist', burn: 'Tieši 125 → 0', low: 'Uzvar mazākais rezultāts' },
  modes: { bots: 'Boti', online: 'Online', friends: 'Draugi' },
  players: 'Spēlētāji',
  level: 'Bota līmenis',
  levels: { easy: 'Viegls', normal: 'Normāls', hard: 'Grūts', expert: 'Eksperts' },
  bluff: 'Blefa režīms',
  bluffHint: 'Neobligāts noteikums',
  onlineNote: 'Īsti spēlētāji tieši tagad. Tukšās vietas aizpilda boti.',
  friendsNote: 'Izveido privātu galdu un nosūti saiti — vai pievienojies ar kodu.',
  orJoin: 'Ir kods?',
  shop: { title: 'Veikals', sub: 'Galdi, kāršu muguras un bonusi' },
  merch: { title: 'Merch', sub: 'Īstas kārtis un dāvanas' },
  rulesCue: 'Noteikumi',
  rules: {
    kicker: 'Viena lapa, viena minūte', title: 'Noteikumi', sub: 'Pirmais iztukšo roku. Pārējie saskaita, kas palicis rokā — turi savus punktus zemu.',
    deal: '2 spēlētāji: pa 5 kārtīm · 3–4 spēlētāji: pa 4 kārtīm',
    basics: [
      { h: 'Liec pēc masts vai vērtības', p: 'Tā pati masts vai vērtība kā virsējai kārtij. Vienādas vērtības kārtis var likt reizē.' },
      { h: 'Nav ko likt?', p: 'Velc vienu kārti. Ja der — liec, ja nē — izlaid.' },
      { h: 'Izej', p: 'Pirmais ar tukšu roku uzvar raundu. Pārējie saskaita punktus.' },
    ],
    specialTitle: 'Īpašās kārtis',
    special: {
      A: { h: 'Dūzis', tag: 'Izlaiž', p: 'Nākamais izlaiž gājienu. Divi dūži — izlaiž divi spēlētāji.' },
      '6': { h: 'Sešinieks', tag: 'Jānosedz', p: 'Uzreiz nosedz ar citu kārti — velc, līdz vari. Ar 6 iziet nevar.' },
      '7': { h: 'Septiņnieks', tag: '+1', p: 'Nākamais paņem 1 kārti par katru 7 un turpina gājienu.' },
      '8': { h: 'Astotnieks', tag: '+2 · ķēde', p: 'Nākamais ņem 2 un izlaiž — vai atbild ar 8 un pārsūta 4, 6, 8.' },
      '9': { h: 'Devītnieks', tag: 'Jokeris', p: 'Liekams uz jebkuras kārts. Masts kļūst devītnieka masts.' },
      J: { h: 'Kalps', tag: 'Jokeris + masts', p: 'Liekams uz jebkuras kārts, un tu pasūti nākamo masti.' },
      QS: { h: 'Pīķa dāma', tag: '+5 · izlaiž', p: 'Nākamais paņem 5 kārtis un zaudē gājienu. Atbildēt var tikai ar 6♠.' },
      K: { h: 'Četri kungi', tag: 'Nonullē', p: 'Četri kungi pēc kārtas kaudzē — visu punkti atgriežas uz 0.' },
    },
    combosTitle: 'Kombinācijas',
    combos: [
      { h: 'Q♠ atbildēta ar 6♠', p: 'Nākamais paņem 6 kārtis un tam jānosedz 6♠. Q♠ + 6♠ kopā darbojas tāpat.' },
      { h: 'Astotnieku ķēde', p: 'Katrs 8 pieliek divas kārtis. Kurš nevar atbildēt, paņem visas un izlaiž.' },
    ],
    jacksTitle: 'Izej ar kalpiem', jacksP: 'Pabeidz ar kalpiem — visu pretinieku punkti tiek reizināti.', jacksN: n => `${n} J`,
    pointsTitle: 'Punkti', pointsSub: 'Skaitās tikai kārtis, kas palikušas rokā, kad kāds iziet.',
    except6S: 'izņemot 6♠',
    exampleTitle: 'Piemērs', exampleLeft: 'Palika rokā', exampleJacks: 'Uzvarētājs izgāja ar 2 kalpiem',
    scoreTitle: 'Rezultāts', facts: { burn: 'Tieši 125 → nodeg līdz 0', end: 'Kāds sasniedz 130 → spēles beigas', low: 'Uzvar mazākais rezultāts', kings: 'Četri kungi → visiem 0' },
    bluffTitle: 'Blefa režīms', bluffP: 'Neobligāts mājas noteikums: vari iešmugulēt kārti, kas neder. Ja tevi pieķer — ņem sodu; ja kāds kļūdaini apsūdz — sodu ņem viņš.', bluffOff: 'Pēc noklusējuma izslēgts — ieslēdz augstāk.',
    guide: 'Detalizēta pamācība', practice: 'Spēlēt treniņa spēli',
  },
};

const ru: HomeStrings = {
  intro: { skip: 'Пропустить', burn: 'Ровно 125 → 0', low: 'Побеждает наименьший счёт' },
  modes: { bots: 'Боты', online: 'Онлайн', friends: 'Друзья' },
  players: 'Игроки',
  level: 'Уровень ботов',
  levels: { easy: 'Лёгкий', normal: 'Обычный', hard: 'Сложный', expert: 'Эксперт' },
  bluff: 'Режим блефа',
  bluffHint: 'Домашнее правило',
  onlineNote: 'Живые игроки прямо сейчас. Пустые места займут боты.',
  friendsNote: 'Создайте приватный стол и отправьте ссылку — или войдите по коду.',
  orJoin: 'Есть код?',
  shop: { title: 'Магазин', sub: 'Столы, рубашки и бонусы' },
  merch: { title: 'Мерч', sub: 'Настоящие колоды и подарки' },
  rulesCue: 'Правила',
  rules: {
    kicker: 'Одна страница, одна минута', title: 'Правила', sub: 'Первым избавьтесь от карт. Остальные считают то, что осталось на руках, — держите счёт низким.',
    deal: '2 игрока: по 5 карт · 3–4 игрока: по 4 карты',
    basics: [
      { h: 'Масть или значение', p: 'Та же масть или то же значение, что у верхней карты. Карты одного значения можно класть вместе.' },
      { h: 'Нечем ходить?', p: 'Возьмите одну карту. Подходит — кладите, нет — пас.' },
      { h: 'Выход', p: 'Первый с пустой рукой выигрывает раунд. Остальные считают очки.' },
    ],
    specialTitle: 'Особые карты',
    special: {
      A: { h: 'Туз', tag: 'Пропуск', p: 'Следующий игрок пропускает ход. Два туза — пропускают двое.' },
      '6': { h: 'Шестёрка', tag: 'Покрыть', p: 'Сразу покройте другой картой — берите, пока не сможете. На 6 выйти нельзя.' },
      '7': { h: 'Семёрка', tag: '+1', p: 'Следующий берёт по 1 карте за каждую 7 и продолжает ход.' },
      '8': { h: 'Восьмёрка', tag: '+2 · цепь', p: 'Следующий берёт 2 и пропускает — или отвечает своей 8 и передаёт 4, 6, 8.' },
      '9': { h: 'Девятка', tag: 'Джокер', p: 'Кладётся на любую карту. Масть становится мастью девятки.' },
      J: { h: 'Валет', tag: 'Джокер + масть', p: 'Кладётся на любую карту, и вы заказываете масть.' },
      QS: { h: 'Дама пик', tag: '+5 · пропуск', p: 'Следующий берёт 5 карт и теряет ход. Ответить можно только 6♠.' },
      K: { h: 'Четыре короля', tag: 'Сброс', p: 'Четыре короля подряд в колоде сброса — у всех счёт обнуляется.' },
    },
    combosTitle: 'Комбинации',
    combos: [
      { h: 'Q♠, отбитая 6♠', p: 'Следующий берёт 6 карт и должен покрыть 6♠. Q♠ + 6♠ вместе работают так же.' },
      { h: 'Цепочка восьмёрок', p: 'Каждая 8 добавляет две карты. Кто не может ответить — берёт все и пропускает.' },
    ],
    jacksTitle: 'Выход на валетах', jacksP: 'Закончите валетами — очки всех соперников умножаются.', jacksN: n => `${n} В`,
    pointsTitle: 'Очки', pointsSub: 'Считаются только карты, оставшиеся на руках, когда кто-то вышел.',
    except6S: 'кроме 6♠',
    exampleTitle: 'Пример', exampleLeft: 'Осталось на руках', exampleJacks: 'Победитель вышел на 2 валетах',
    scoreTitle: 'Счёт', facts: { burn: 'Ровно 125 → сгорает до 0', end: 'Кто-то набрал 130 → конец игры', low: 'Побеждает наименьший счёт', kings: 'Четыре короля → всем 0' },
    bluffTitle: 'Режим блефа', bluffP: 'Необязательное домашнее правило: можно подложить неподходящую карту. Поймали — берёте штраф; обвинили зря — штраф берёт обвинитель.', bluffOff: 'По умолчанию выключен — включите выше.',
    guide: 'Подробное руководство', practice: 'Сыграть тренировочную игру',
  },
};

const uk: HomeStrings = {
  intro: { skip: 'Пропустити', burn: 'Рівно 125 → 0', low: 'Перемагає найменший рахунок' },
  modes: { bots: 'Боти', online: 'Онлайн', friends: 'Друзі' },
  players: 'Гравці',
  level: 'Рівень ботів',
  levels: { easy: 'Легкий', normal: 'Звичайний', hard: 'Складний', expert: 'Експерт' },
  bluff: 'Режим блефу',
  bluffHint: 'Домашнє правило',
  onlineNote: 'Живі гравці просто зараз. Порожні місця займуть боти.',
  friendsNote: 'Створіть приватний стіл і надішліть посилання — або увійдіть за кодом.',
  orJoin: 'Маєте код?',
  shop: { title: 'Крамниця', sub: 'Столи, сорочки й бонуси' },
  merch: { title: 'Мерч', sub: 'Справжні колоди й подарунки' },
  rulesCue: 'Правила',
  rules: {
    kicker: 'Одна сторінка, одна хвилина', title: 'Правила', sub: 'Першим позбудьтеся карт. Інші рахують те, що лишилося в руці, — тримайте рахунок низьким.',
    deal: '2 гравці: по 5 карт · 3–4 гравці: по 4 карти',
    basics: [
      { h: 'Масть або значення', p: 'Та сама масть або те саме значення, що й у верхньої карти. Карти одного значення можна класти разом.' },
      { h: 'Нема чим ходити?', p: 'Візьміть одну карту. Підходить — кладіть, ні — пас.' },
      { h: 'Вихід', p: 'Перший з порожньою рукою виграє раунд. Інші рахують очки.' },
    ],
    specialTitle: 'Особливі карти',
    special: {
      A: { h: 'Туз', tag: 'Пропуск', p: 'Наступний гравець пропускає хід. Два тузи — пропускають двоє.' },
      '6': { h: 'Шістка', tag: 'Покрити', p: 'Одразу покрийте іншою картою — беріть, доки не зможете. На 6 вийти не можна.' },
      '7': { h: 'Сімка', tag: '+1', p: 'Наступний бере по 1 карті за кожну 7 і продовжує хід.' },
      '8': { h: 'Вісімка', tag: '+2 · ланцюг', p: 'Наступний бере 2 і пропускає — або відповідає своєю 8 і передає 4, 6, 8.' },
      '9': { h: 'Дев’ятка', tag: 'Джокер', p: 'Кладеться на будь-яку карту. Масть стає мастю дев’ятки.' },
      J: { h: 'Валет', tag: 'Джокер + масть', p: 'Кладеться на будь-яку карту, і ви замовляєте масть.' },
      QS: { h: 'Пікова дама', tag: '+5 · пропуск', p: 'Наступний бере 5 карт і втрачає хід. Відповісти можна лише 6♠.' },
      K: { h: 'Чотири королі', tag: 'Скидання', p: 'Чотири королі поспіль у скиді — рахунок усіх обнуляється.' },
    },
    combosTitle: 'Комбінації',
    combos: [
      { h: 'Q♠, відбита 6♠', p: 'Наступний бере 6 карт і мусить покрити 6♠. Q♠ + 6♠ разом працюють так само.' },
      { h: 'Ланцюжок вісімок', p: 'Кожна 8 додає дві карти. Хто не може відповісти — бере все й пропускає.' },
    ],
    jacksTitle: 'Вихід на валетах', jacksP: 'Завершіть валетами — очки всіх суперників множаться.', jacksN: n => `${n} В`,
    pointsTitle: 'Очки', pointsSub: 'Рахуються лише карти, що лишилися в руці, коли хтось вийшов.',
    except6S: 'крім 6♠',
    exampleTitle: 'Приклад', exampleLeft: 'Лишилося в руці', exampleJacks: 'Переможець вийшов на 2 валетах',
    scoreTitle: 'Рахунок', facts: { burn: 'Рівно 125 → згорає до 0', end: 'Хтось набрав 130 → кінець гри', low: 'Перемагає найменший рахунок', kings: 'Чотири королі → усім 0' },
    bluffTitle: 'Режим блефу', bluffP: 'Необов’язкове домашнє правило: можна підкласти карту, що не підходить. Спіймали — берете штраф; звинуватили даремно — штраф бере той, хто звинуватив.', bluffOff: 'Типово вимкнено — увімкніть вище.',
    guide: 'Детальний посібник', practice: 'Зіграти тренувальну гру',
  },
};

export const HOME: Strings<HomeStrings> = { en, lv, ru, uk };

// lt et pl de be kk uz az ka hy ro bg es: src/i18n/locales/<lang>.ts, deep-merged over English on load
import { registerStrings } from './pick';
registerStrings('home', HOME);
