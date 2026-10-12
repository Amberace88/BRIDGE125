import type { Rank, Suit } from './engine/engine';

/**
 * Supported languages. en/lv/ru/uk live in this file (and i18n2/i18n3) and are bundled;
 * every other language is a lazily loaded pack in src/locales/<code>.ts (see src/locales/index.ts).
 */
export type Lang = 'en' | 'lv' | 'ru' | 'uk' | 'lt' | 'et' | 'pl' | 'de' | 'be' | 'kk' | 'uz' | 'az' | 'ka' | 'hy' | 'ro' | 'bg' | 'es';
export interface LangInfo {
  id: Lang;
  /** Native name, shown in the language picker. */
  label: string;
  /** English name — lets people search the picker in English ("German" finds Deutsch). */
  en: string;
  /** BCP 47 locale for Intl date/number formatting. */
  intl: string;
  flag?: string;
}
export const LANGS: LangInfo[] = [
  { id: 'en', label: 'English', en: 'English', intl: 'en-GB' },
  { id: 'lv', label: 'Latviešu', en: 'Latvian', intl: 'lv-LV' },
  { id: 'ru', label: 'Русский', en: 'Russian', intl: 'ru-RU' },
  { id: 'uk', label: 'Українська', en: 'Ukrainian', intl: 'uk-UA' },
  { id: 'lt', label: 'Lietuvių', en: 'Lithuanian', intl: 'lt-LT' },
  { id: 'et', label: 'Eesti', en: 'Estonian', intl: 'et-EE' },
  { id: 'pl', label: 'Polski', en: 'Polish', intl: 'pl-PL' },
  { id: 'de', label: 'Deutsch', en: 'German', intl: 'de-DE' },
  { id: 'be', label: 'Беларуская', en: 'Belarusian', intl: 'be-BY' },
  { id: 'kk', label: 'Қазақша', en: 'Kazakh', intl: 'kk-KZ' },
  { id: 'uz', label: 'Oʻzbekcha', en: 'Uzbek', intl: 'uz-Latn-UZ' },
  { id: 'az', label: 'Azərbaycanca', en: 'Azerbaijani', intl: 'az-Latn-AZ' },
  { id: 'ka', label: 'ქართული', en: 'Georgian', intl: 'ka-GE' },
  { id: 'hy', label: 'Հայերեն', en: 'Armenian', intl: 'hy-AM' },
  { id: 'ro', label: 'Română', en: 'Romanian / Moldovan', intl: 'ro-RO' },
  { id: 'bg', label: 'Български', en: 'Bulgarian', intl: 'bg-BG' },
  { id: 'es', label: 'Español', en: 'Spanish', intl: 'es-ES' },
];

export const isLang = (x: unknown): x is Lang => typeof x === 'string' && LANGS.some(l => l.id === x);
/** Locale to pass to Intl / toLocale*String for a UI language. */
export const intlLocale = (lang: Lang): string => LANGS.find(l => l.id === lang)?.intl ?? lang;

/** Fill every language missing from `base` with English (lazily loaded packs replace these on load). */
export function withFallback<T>(base: { en: T } & Partial<Record<Lang, T>>): Record<Lang, T> {
  return Object.fromEntries(LANGS.map(l => [l.id, base[l.id] ?? base.en])) as Record<Lang, T>;
}

// Traditional card-corner letters (J Q K A) where a language has them; Latin JQKA otherwise.
const CYR_RANKS = { J: 'В', Q: 'Д', K: 'К', A: 'Т' };
const RANK_LETTERS: Partial<Record<Lang, Partial<Record<Rank, string>>>> = {
  ru: CYR_RANKS, uk: CYR_RANKS, be: CYR_RANKS, kk: CYR_RANKS,
  bg: { J: 'В', Q: 'Д', K: 'П', A: 'А' },   // вале, дама, поп, асо
  de: { J: 'B', Q: 'D', K: 'K', A: 'A' },   // Bube, Dame, König, Ass
  pl: { J: 'W', Q: 'D', K: 'K', A: 'A' },   // walet, dama, król, as
  lt: { J: 'V', Q: 'D', K: 'K', A: 'T' },   // valetas, dama, karalius, tūzas
  et: { J: 'P', Q: 'E', K: 'K', A: 'Ä' },   // poiss, emand, kuningas, äss
};

/** Card corner letters per language. */
export function rankLabel(r: Rank, lang: Lang): string {
  return RANK_LETTERS[lang]?.[r] ?? r;
}

type Dict = {
  tagline: string; play: string; vsBots: string; opponents: string; level: string; easy: string; normal: string;
  online: string; soon: string; howToPlay: string; profile: string; settings: string; language: string; sound: string;
  on: string; off: string; guest: string; signIn: string; signOut: string; emailPlaceholder: string; sendLink: string;
  linkSent: (email: string) => string; personalize: string; personalizeLocked: string; accent: string; background: string;
  yourName: string; save: string; saved: string; back: string; close: string;
  yourTurn: string; waiting: (n: string) => string; deckLeft: (n: number) => string; points: (n: number) => string;
  draw: string; pass: string; take: (n: number) => string; transfer6S: string; playN: (n: number) => string; comboQ6: string;
  chooseSuit: string; coverSix: string; suitNames: Record<Suit, string>;
  ev: {
    queen: (who: string) => string; queenSub: string; transfer: (who: string) => string; eight: (who: string, n: number) => string;
    seven: (who: string, n: number) => string; skip: (who: string) => string; kings: string; kingsSub: string;
    reset125: (who: string) => string; suit: (who: string, s: string) => string; reshuffle: string;
    youTake: (n: number) => string; youSkip: string; queenYou: string; transferYou: string;
  };
  round: (n: number) => string; roundWon: (who: string) => string; roundWonYou: string; jacksFinish: (n: number) => string;
  colPlayer: string; colHand: string; colTotal: string; burned: string; nextRound: string; rematch: string; home: string;
  youWin: string; winnerIs: (who: string) => string; gameOverSub: string; you: string;
  rulesTitle: string; rules: { h: string; p: string }[];
  menuQuit: string; botNames: string[]; continueGame: string;
};

const en: Dict = {
  tagline: 'The Bridge card game', play: 'Play', vsBots: 'Play vs bots', opponents: 'Opponents', level: 'Bot level',
  easy: 'Easy', normal: 'Normal', online: 'Online with friends', soon: 'Soon', howToPlay: 'How to play', profile: 'Profile',
  settings: 'Settings', language: 'Language', sound: 'Sound', on: 'On', off: 'Off', guest: 'Guest', signIn: 'Create account or sign in',
  signOut: 'Sign out', emailPlaceholder: 'Your email', sendLink: 'Send sign-in link',
  linkSent: e => `Check ${e} and open the link to sign in.`, personalize: 'Personalize',
  personalizeLocked: 'Create a free account to choose your colour and table.', accent: 'Accent colour', background: 'Table',
  yourName: 'Player name', save: 'Save', saved: 'Saved', back: 'Back', close: 'Close',
  yourTurn: 'Your turn', waiting: n => `${n} is thinking`, deckLeft: n => `${n} in deck`, points: n => `${n} pts`,
  draw: 'Draw', pass: 'Pass', take: n => `Take ${n}`, transfer6S: 'Pass it on with 6♠', playN: n => `Play ${n}`, comboQ6: 'Q♠ + 6♠',
  chooseSuit: 'Choose a suit', coverSix: 'Cover your 6', suitNames: { S: 'Spades', C: 'Clubs', H: 'Hearts', D: 'Diamonds' },
  ev: {
    queen: w => `Queen of spades! ${w} takes 5`, queenSub: 'Unless they hold the 6♠', transfer: w => `6♠! ${w} takes 6`,
    eight: (w, n) => `${w} takes ${n}`, seven: (w, n) => `${w} takes ${n}`, skip: w => `${w} skips`,
    kings: 'Four kings!', kingsSub: 'Everyone’s score is back to zero', reset125: w => `${w} hit exactly 125 — back to 0`,
    suit: (_w, s) => `Suit called: ${s}`, reshuffle: 'Pile shuffled into the deck',
    youTake: n => `You take ${n}`, youSkip: 'You skip a turn', queenYou: 'Queen of spades! You take 5', transferYou: '6♠! You take 6 and cover it',
  },
  round: n => `Round ${n}`, roundWon: w => `${w} went out`, roundWonYou: 'You went out!', jacksFinish: n => `Finished with ${n} jack${n > 1 ? 's' : ''} — ×${n + 1}`,
  colPlayer: 'Player', colHand: 'In hand', colTotal: 'Total', burned: 'Exactly 125 — burned to 0', nextRound: 'Next round',
  rematch: 'Rematch', home: 'Home', youWin: 'You win!', winnerIs: w => `${w} wins`, gameOverSub: 'Someone passed 130 — lowest score wins',
  you: 'You', rulesTitle: 'How to play',
  rules: [
    { h: 'Goal', p: 'Get rid of your cards and collect as few points as possible. When anyone reaches 130, the game ends and the lowest score wins. Land on exactly 125 and your score burns back to 0.' },
    { h: 'Your turn', p: 'Play a card of the same suit or rank as the top card. You may play several cards of the same rank at once. No card? Draw one, then play it or pass.' },
    { h: 'Ace', p: 'The next player skips a turn.' },
    { h: '6', p: 'Must be covered: play another card on top of it right away. You can’t finish on a 6.' },
    { h: '7', p: 'The next player draws 1 card and then plays on.' },
    { h: '8', p: 'The next player draws 2 and skips — unless they answer with their own 8, passing on 4, 6 or 8 cards.' },
    { h: '9', p: 'Can be played on anything, but you don’t choose the suit.' },
    { h: 'Jack', p: 'Plays on anything and lets you choose the suit. Finish the round with 1–4 jacks and opponents’ points are multiplied ×2 to ×5.' },
    { h: 'Queen of spades', p: 'The next player draws 5 and skips. Hold the 6♠? Answer with it and the following player draws 6 and must cover it.' },
    { h: 'Kings', p: 'Four kings in a row on the pile reset everyone’s score to zero.' },
    { h: 'Points', p: 'Ace 15 · King, Queen, Jack, 10 — 10 each · 6♠ — 5 · other cards — 0.' },
  ],
  continueGame: 'Continue game', menuQuit: 'Leave game', botNames: ['Artem', 'Marina', 'Oleg'],
};

const lv: Dict = {
  tagline: 'Bridža kāršu spēle', play: 'Spēlēt', vsBots: 'Spēlēt pret botiem', opponents: 'Pretinieki', level: 'Bota līmenis',
  easy: 'Viegls', normal: 'Normāls', online: 'Online ar draugiem', soon: 'Drīzumā', howToPlay: 'Kā spēlēt', profile: 'Profils',
  settings: 'Iestatījumi', language: 'Valoda', sound: 'Skaņa', on: 'Ieslēgta', off: 'Izslēgta', guest: 'Viesis',
  signIn: 'Izveidot kontu vai ienākt', signOut: 'Iziet', emailPlaceholder: 'Tavs e-pasts', sendLink: 'Sūtīt ienākšanas saiti',
  linkSent: e => `Pārbaudi ${e} un atver saiti, lai ienāktu.`, personalize: 'Personalizēt',
  personalizeLocked: 'Izveido bezmaksas kontu, lai izvēlētos savu krāsu un galdu.', accent: 'Akcenta krāsa', background: 'Galds',
  yourName: 'Spēlētāja vārds', save: 'Saglabāt', saved: 'Saglabāts', back: 'Atpakaļ', close: 'Aizvērt',
  yourTurn: 'Tavs gājiens', waiting: n => `${n} domā`, deckLeft: n => `Kavā ${n}`, points: n => `${n} punkti`,
  draw: 'Vilkt', pass: 'Izlaist', take: n => `Paņemt ${n}`, transfer6S: 'Pārsūtīt ar 6♠', playN: n => `Likt ${n}`, comboQ6: 'Q♠ + 6♠',
  chooseSuit: 'Izvēlies masti', coverSix: 'Nosedz savu 6', suitNames: { S: 'Pīķis', C: 'Kreicis', H: 'Ercens', D: 'Kāravs' },
  ev: {
    queen: w => `Pīķa dāma! ${w} ņem 5`, queenSub: 'Ja vien nav 6♠', transfer: w => `6♠! ${w} ņem 6`,
    eight: (w, n) => `${w} ņem ${n}`, seven: (w, n) => `${w} ņem ${n}`, skip: w => `${w} izlaiž gājienu`,
    kings: 'Četri kungi!', kingsSub: 'Visu punkti atpakaļ uz nulli', reset125: w => `${w}: tieši 125 — atpakaļ uz 0`,
    suit: (_w, s) => `Pasūtīta masts: ${s}`, reshuffle: 'Kaudze sajaukta kavā',
    youTake: n => `Tu ņem ${n}`, youSkip: 'Tu izlaid gājienu', queenYou: 'Pīķa dāma! Tu ņem 5', transferYou: '6♠! Tu ņem 6 un nosedz',
  },
  round: n => `${n}. raunds`, roundWon: w => `${w} izlika visas kārtis`, roundWonYou: 'Tu izliki visas kārtis!', jacksFinish: n => `Finišs ar ${n} kalp${n > 1 ? 'iem' : 'u'} — ×${n + 1}`,
  colPlayer: 'Spēlētājs', colHand: 'Rokā', colTotal: 'Kopā', burned: 'Tieši 125 — nodega līdz 0', nextRound: 'Nākamais raunds',
  rematch: 'Revanšs', home: 'Sākums', youWin: 'Tu uzvarēji!', winnerIs: w => `Uzvar ${w}`, gameOverSub: 'Kāds pārsniedza 130 — uzvar mazākais rezultāts',
  you: 'Tu', rulesTitle: 'Kā spēlēt',
  rules: [
    { h: 'Mērķis', p: 'Atbrīvojies no kārtīm un savāc pēc iespējas mazāk punktu. Kad kāds sasniedz 130, spēle beidzas un uzvar mazākais rezultāts. Ja trāpi tieši 125, punkti nodeg līdz 0.' },
    { h: 'Tavs gājiens', p: 'Liec tās pašas masts vai vērtības kārti kā virsējā. Vari likt vairākas vienādas vērtības kārtis reizē. Nav ko likt? Velc vienu, tad liec vai izlaid.' },
    { h: 'Dūzis', p: 'Nākamais spēlētājs izlaiž gājienu.' },
    { h: '6', p: 'Jānosedz: uzreiz uzliec virsū citu kārti. Ar 6 raundu pabeigt nevar.' },
    { h: '7', p: 'Nākamais paņem 1 kārti un turpina gājienu.' },
    { h: '8', p: 'Nākamais paņem 2 un izlaiž — ja vien neatbild ar savu 8, pārsūtot 4, 6 vai 8 kārtis.' },
    { h: '9', p: 'Liekams uz jebkuras kārts, bet masti pasūtīt nevar.' },
    { h: 'Kalps', p: 'Liekams uz jebko, un tu pasūti masti. Pabeidz raundu ar 1–4 kalpiem, un pretinieku punkti reizinās ×2 līdz ×5.' },
    { h: 'Pīķa dāma', p: 'Nākamais paņem 5 un izlaiž. Ir 6♠? Atbildi ar to — tālākais paņem 6 un tam tā jānosedz.' },
    { h: 'Kungi', p: 'Četri kungi pēc kārtas kaudzē nonullē visu spēlētāju punktus.' },
    { h: 'Punkti', p: 'Dūzis 15 · kungs, dāma, kalps, 10 — pa 10 · 6♠ — 5 · pārējās — 0.' },
  ],
  continueGame: 'Turpināt spēli', menuQuit: 'Pamest spēli', botNames: ['Artjoms', 'Marina', 'Olegs'],
};

const ru: Dict = {
  tagline: 'Бридж онлайн', play: 'Играть', vsBots: 'Игра с ботами', opponents: 'Соперники', level: 'Уровень бота',
  easy: 'Лёгкий', normal: 'Обычный', online: 'Онлайн с друзьями', soon: 'Скоро', howToPlay: 'Как играть', profile: 'Профиль',
  settings: 'Настройки', language: 'Язык', sound: 'Звук', on: 'Вкл', off: 'Выкл', guest: 'Гость', signIn: 'Создать аккаунт или войти',
  signOut: 'Выйти', emailPlaceholder: 'Ваш e-mail', sendLink: 'Отправить ссылку для входа',
  linkSent: e => `Проверьте ${e} и откройте ссылку для входа.`, personalize: 'Оформление',
  personalizeLocked: 'Создайте бесплатный аккаунт, чтобы выбрать свой цвет и стол.', accent: 'Цвет акцента', background: 'Стол',
  yourName: 'Имя игрока', save: 'Сохранить', saved: 'Сохранено', back: 'Назад', close: 'Закрыть',
  yourTurn: 'Ваш ход', waiting: n => `${n} думает`, deckLeft: n => `В колоде ${n}`, points: n => `${n} очк.`,
  draw: 'Взять', pass: 'Пас', take: n => `Взять ${n}`, transfer6S: 'Перевести 6♠', playN: n => `Сыграть ${n}`, comboQ6: 'Д♠ + 6♠',
  chooseSuit: 'Выберите масть', coverSix: 'Закройте шестёрку', suitNames: { S: 'Пики', C: 'Трефы', H: 'Черви', D: 'Бубны' },
  ev: {
    queen: w => `Дама пик! ${w} берёт 5`, queenSub: 'Если нет 6♠', transfer: w => `6♠! ${w} берёт 6`,
    eight: (w, n) => `${w} берёт ${n}`, seven: (w, n) => `${w} берёт ${n}`, skip: w => `${w} пропускает ход`,
    kings: 'Четыре короля!', kingsSub: 'Счёт у всех обнулён', reset125: w => `${w}: ровно 125 — счёт сгорел`,
    suit: (_w, s) => `Заказана масть: ${s}`, reshuffle: 'Отбой замешан в колоду',
    youTake: n => `Вы берёте ${n}`, youSkip: 'Вы пропускаете ход', queenYou: 'Дама пик! Вы берёте 5', transferYou: '6♠! Вы берёте 6 и закрываете',
  },
  round: n => `Раунд ${n}`, roundWon: w => `${w} сбросил все карты`, roundWonYou: 'Вы сбросили все карты!', jacksFinish: n => `Финиш валетами: ${n} — ×${n + 1}`,
  colPlayer: 'Игрок', colHand: 'На руке', colTotal: 'Итого', burned: 'Ровно 125 — сгорело до 0', nextRound: 'Следующий раунд',
  rematch: 'Реванш', home: 'В меню', youWin: 'Вы победили!', winnerIs: w => `Победил ${w}`, gameOverSub: 'Кто-то перешёл 130 — побеждает меньший счёт',
  you: 'Вы', rulesTitle: 'Как играть',
  rules: [
    { h: 'Цель', p: 'Избавьтесь от карт и наберите как можно меньше очков. Когда у кого-то 130, игра заканчивается — побеждает меньший счёт. Ровно 125 — счёт сгорает до 0.' },
    { h: 'Ваш ход', p: 'Кладите карту той же масти или достоинства, что и верхняя. Можно сразу несколько карт одного достоинства. Нечем ходить? Возьмите одну, затем сыграйте или пасуйте.' },
    { h: 'Туз', p: 'Следующий игрок пропускает ход.' },
    { h: '6', p: 'Её нужно закрыть: сразу положите сверху другую карту. Закончить на шестёрке нельзя.' },
    { h: '7', p: 'Следующий берёт 1 карту и продолжает ход.' },
    { h: '8', p: 'Следующий берёт 2 и пропускает ход — если не ответит своей восьмёркой, переводя 4, 6 или 8 карт.' },
    { h: '9', p: 'Кладётся на любую карту, но масть заказать нельзя.' },
    { h: 'Валет', p: 'Кладётся на что угодно, вы заказываете масть. Закончите раунд 1–4 валетами — очки соперников ×2…×5.' },
    { h: 'Дама пик', p: 'Следующий берёт 5 и пропускает ход. Есть 6♠? Ответьте ею — следующий берёт 6 и должен её закрыть.' },
    { h: 'Короли', p: 'Четыре короля подряд в отбое обнуляют счёт у всех.' },
    { h: 'Очки', p: 'Туз 15 · король, дама, валет, 10 — по 10 · 6♠ — 5 · остальные — 0.' },
  ],
  continueGame: 'Продолжить игру', menuQuit: 'Выйти из игры', botNames: ['Артём', 'Марина', 'Олег'],
};

const uk: Dict = {
  tagline: 'Бридж онлайн', play: 'Грати', vsBots: 'Гра з ботами', opponents: 'Суперники', level: 'Рівень бота',
  easy: 'Легкий', normal: 'Звичайний', online: 'Онлайн з друзями', soon: 'Незабаром', howToPlay: 'Як грати', profile: 'Профіль',
  settings: 'Налаштування', language: 'Мова', sound: 'Звук', on: 'Увімк', off: 'Вимк', guest: 'Гість', signIn: 'Створити акаунт або увійти',
  signOut: 'Вийти', emailPlaceholder: 'Ваш e-mail', sendLink: 'Надіслати посилання для входу',
  linkSent: e => `Перевірте ${e} і відкрийте посилання для входу.`, personalize: 'Оформлення',
  personalizeLocked: 'Створіть безкоштовний акаунт, щоб обрати свій колір і стіл.', accent: 'Колір акценту', background: 'Стіл',
  yourName: 'Ім’я гравця', save: 'Зберегти', saved: 'Збережено', back: 'Назад', close: 'Закрити',
  yourTurn: 'Ваш хід', waiting: n => `${n} думає`, deckLeft: n => `У колоді ${n}`, points: n => `${n} оч.`,
  draw: 'Взяти', pass: 'Пас', take: n => `Взяти ${n}`, transfer6S: 'Перевести 6♠', playN: n => `Зіграти ${n}`, comboQ6: 'Д♠ + 6♠',
  chooseSuit: 'Оберіть масть', coverSix: 'Закрийте шістку', suitNames: { S: 'Піки', C: 'Трефи', H: 'Черви', D: 'Бубни' },
  ev: {
    queen: w => `Пікова дама! ${w} бере 5`, queenSub: 'Якщо немає 6♠', transfer: w => `6♠! ${w} бере 6`,
    eight: (w, n) => `${w} бере ${n}`, seven: (w, n) => `${w} бере ${n}`, skip: w => `${w} пропускає хід`,
    kings: 'Чотири королі!', kingsSub: 'Рахунок у всіх обнулено', reset125: w => `${w}: рівно 125 — рахунок згорів`,
    suit: (_w, s) => `Замовлено масть: ${s}`, reshuffle: 'Відбій перемішано в колоду',
    youTake: n => `Ви берете ${n}`, youSkip: 'Ви пропускаєте хід', queenYou: 'Пікова дама! Ви берете 5', transferYou: '6♠! Ви берете 6 і закриваєте',
  },
  round: n => `Раунд ${n}`, roundWon: w => `${w} скинув усі карти`, roundWonYou: 'Ви скинули всі карти!', jacksFinish: n => `Фініш валетами: ${n} — ×${n + 1}`,
  colPlayer: 'Гравець', colHand: 'На руці', colTotal: 'Разом', burned: 'Рівно 125 — згоріло до 0', nextRound: 'Наступний раунд',
  rematch: 'Реванш', home: 'У меню', youWin: 'Ви перемогли!', winnerIs: w => `Переміг ${w}`, gameOverSub: 'Хтось перейшов 130 — перемагає менший рахунок',
  you: 'Ви', rulesTitle: 'Як грати',
  rules: [
    { h: 'Мета', p: 'Позбудьтеся карт і наберіть якомога менше очок. Коли в когось 130, гра закінчується — перемагає менший рахунок. Рівно 125 — рахунок згоряє до 0.' },
    { h: 'Ваш хід', p: 'Кладіть карту тієї ж масті або гідності, що й верхня. Можна одразу кілька карт однієї гідності. Немає чим ходити? Візьміть одну, потім зіграйте або пасуйте.' },
    { h: 'Туз', p: 'Наступний гравець пропускає хід.' },
    { h: '6', p: 'Її треба закрити: одразу покладіть зверху іншу карту. Закінчити на шістці не можна.' },
    { h: '7', p: 'Наступний бере 1 карту і продовжує хід.' },
    { h: '8', p: 'Наступний бере 2 і пропускає хід — якщо не відповість своєю вісімкою, переводячи 4, 6 або 8 карт.' },
    { h: '9', p: 'Кладеться на будь-яку карту, але масть замовити не можна.' },
    { h: 'Валет', p: 'Кладеться на будь-що, ви замовляєте масть. Завершіть раунд 1–4 валетами — очки суперників ×2…×5.' },
    { h: 'Пікова дама', p: 'Наступний бере 5 і пропускає хід. Є 6♠? Відповідайте нею — наступний бере 6 і має її закрити.' },
    { h: 'Королі', p: 'Чотири королі поспіль у відбої обнуляють рахунок у всіх.' },
    { h: 'Очки', p: 'Туз 15 · король, дама, валет, 10 — по 10 · 6♠ — 5 · решта — 0.' },
  ],
  continueGame: 'Продовжити гру', menuQuit: 'Вийти з гри', botNames: ['Артем', 'Марина', 'Олег'],
};

export const DICTS: Record<Lang, Dict> = withFallback({ en, lv, ru, uk });
export type { Dict };

/** Map a BCP 47 tag ("de-AT", "ro-MD", "mo") to a supported language, or null. */
export function matchLang(tag: string): Lang | null {
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  const id = base === 'mo' ? 'ro' : base;   // legacy code for Moldovan
  return isLang(id) ? id : null;
}

/** First supported language from the browser's preference list, else English. */
export function detectLang(): Lang {
  try {
    const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of prefs) { const l = tag && matchLang(tag); if (l) return l; }
  } catch { /* ignore */ }
  return 'en';
}
