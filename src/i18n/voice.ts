// Spoken phrases for the voice assistant (narrator + coach) and the audio settings UI, in all 17 languages.
//
// Every language is written as real sentences with its own grammar: traditional card names, numeral agreement
// (Slavic one/few/many, Latvian/Lithuanian numerals, Georgian attributive numerals …) and "you" vs a third
// person. Gendered past tenses are avoided on purpose (names can belong to anyone), so the narration stays in the
// present tense. Big numbers (scores) stay as digits — every TTS engine reads digits in its own language — while
// card counts (1…20) are written out so that gender/case agreement is right.

import type { Rank, Suit, Card } from '../engine/engine';
import type { Lang } from '../i18n';
import type { Strings } from './pick';

export type Who = { you: true } | { you: false; name: string };
export const YOU: Who = { you: true };
export const who = (name: string): Who => ({ you: false, name });

export interface VoicePhrases {
  /** "Six of clubs" */
  card(c: Card): string;
  /** "Two kings" (n = 2…4) */
  set(r: Rank, n: number): string;
  and: string;
  // ---- consequences
  queen(w: Who): string;
  transfer(w: Who): string;
  eight(w: Who, n: number, chain: boolean): string;
  seven(w: Who, n: number): string;
  skip(w: Who): string;
  called(s: Suit): string;
  kings: string;
  reset(w: Who): string;
  draws(w: Who): string;
  lastCard(w: Who): string;
  reshuffle: string;
  bluffCaught(p: Who): string;
  bluffWrong(p: Who): string;
  wentOut(w: Who): string;
  add(n: number): string;
  mult(n: number): string;
  win(w: Who): string;
  tie(names: string): string;
  // ---- coach tips (always addressed to the player)
  turn(s: Suit, r: Rank | null): string;
  noMatch: string;
  playOrPass: string;
  passNow: string;
  cover: string;
  answer8(n: number): string;
  answerQ: string;
  takeQ6: string;
  take7(n: number): string;
  chooseSuit: string;
  skipped: string;
  canBluff: string;
}

/* --------------------------------------------------------------------------- shared helpers */
const R_IDX: Record<Rank, number> = { '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, J: 5, Q: 6, K: 7, A: 8 };
const S_IDX: Record<Suit, number> = { S: 0, C: 1, H: 2, D: 3 };
const ri = (r: Rank) => R_IDX[r];
const si = (s: Suit) => S_IDX[s];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Azerbaijani capitalises i → İ. */
const capAz = (s: string) => s.charAt(0).toLocaleUpperCase('az') + s.slice(1);
/** Word for 1…20 from a list, digits beyond. */
const w20 = (words: string[], n: number) => words[n - 1] ?? String(n);
/** Slavic one / few / many. */
export function slav(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

/* =========================================================================== English */
const EN_R = ['six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
const EN_RP = ['sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];
const EN_S = ['spades', 'clubs', 'hearts', 'diamonds'];
const EN_N = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const enW = (w: Who) => (w.you ? 'You' : w.name);
const enV = (w: Who, base: string, third: string) => `${enW(w)} ${w.you ? base : third}`;
const en: VoicePhrases = {
  card: c => cap(`${EN_R[ri(c.r)]} of ${EN_S[si(c.s)]}`),
  set: (r, n) => cap(`${w20(EN_N, n)} ${EN_RP[ri(r)]}`),
  and: 'and',
  queen: w => `${enV(w, 'take', 'takes')} five and ${w.you ? 'miss' : 'misses'} a turn`,
  transfer: w => `Passed on! ${enV(w, 'take', 'takes')} six and must cover it`,
  eight: (w, n, chain) => chain ? `Chain! ${enV(w, 'take', 'takes')} ${w20(EN_N, n)}` : `${enV(w, 'take', 'takes')} ${w20(EN_N, n)} and ${w.you ? 'miss' : 'misses'} a turn`,
  seven: (w, n) => `${enV(w, 'draw', 'draws')} ${w20(EN_N, n)}`,
  skip: w => `${enV(w, 'skip', 'skips')} a turn`,
  called: s => `${cap(EN_S[si(s)])} called`,
  kings: 'Four kings! Everyone goes back to zero',
  reset: w => `Exactly 125! ${enV(w, 'burn', 'burns')} back to zero`,
  draws: w => `${enV(w, 'draw', 'draws')} a card`,
  lastCard: w => (w.you ? 'Last card!' : `${w.name} has one card left!`),
  reshuffle: 'The pile is shuffled into the deck',
  bluffCaught: p => `Bluff caught! ${enV(p, 'take', 'takes')} the cards back, plus two`,
  bluffWrong: p => `No bluff! ${enV(p, 'draw', 'draws')} two and ${p.you ? 'miss' : 'misses'} a turn`,
  wentOut: w => `${enV(w, 'go', 'goes')} out!`,
  add: n => `You add ${n} ${n === 1 ? 'point' : 'points'}`,
  mult: n => `Jacks finish — times ${w20(EN_N, n)}!`,
  win: w => (w.you ? 'You win the game!' : `${w.name} wins the game!`),
  tie: names => `A tie — ${names} win`,
  turn: (s, r) => r ? `Your turn — match ${EN_S[si(s)]} or ${r === '8' || r === 'A' ? 'an' : 'a'} ${EN_R[ri(r)]}` : `Your turn — play ${EN_S[si(s)]}`,
  noMatch: 'Nothing fits — tap the deck to draw',
  playOrPass: 'Play the card you drew, or pass',
  passNow: 'Still nothing — tap the deck to pass',
  cover: 'Now cover the six',
  answer8: n => `Take ${w20(EN_N, n)}, or answer with an eight`,
  answerQ: 'Take five, or answer with the six of spades',
  takeQ6: 'Take six, then cover the six of spades',
  take7: n => `Draw ${w20(EN_N, n)}, then keep playing`,
  chooseSuit: 'Choose a suit',
  skipped: 'You are skipped — pass, or call bluff',
  canBluff: 'Suspicious? You can call bluff',
};

/* =========================================================================== Latvian (tu) */
const LV_R = ['sešinieks', 'septiņnieks', 'astoņnieks', 'deviņnieks', 'desmitnieks', 'kalps', 'dāma', 'kungs', 'dūzis'];
const LV_RP = ['sešinieki', 'septiņnieki', 'astoņnieki', 'deviņnieki', 'desmitnieki', 'kalpi', 'dāmas', 'kungi', 'dūži'];
const LV_RA = ['sešinieku', 'septiņnieku', 'astoņnieku', 'deviņnieku', 'desmitnieku', 'kalpu', 'dāmu', 'kungu', 'dūzi'];
const LV_SG = ['pīķa', 'kreiča', 'ercena', 'kārava'];      // genitive — "pīķa dāma"
const LV_SN = ['pīķis', 'kreicis', 'ercens', 'kāravs'];
const LV_SA = ['pīķi', 'kreici', 'ercenu', 'kāravu'];
const LV_NM = ['viens', 'divi', 'trīs', 'četri', 'pieci', 'seši', 'septiņi', 'astoņi', 'deviņi', 'desmit', 'vienpadsmit', 'divpadsmit', 'trīspadsmit', 'četrpadsmit', 'piecpadsmit', 'sešpadsmit', 'septiņpadsmit', 'astoņpadsmit', 'deviņpadsmit', 'divdesmit'];
const LV_NF = ['viena', 'divas', 'trīs', 'četras', 'piecas', 'sešas', 'septiņas', 'astoņas', 'deviņas', 'desmit', ...LV_NM.slice(10)];
const lvOne = (n: number) => n % 10 === 1 && n % 100 !== 11;
/** accusative "kārtis": vienu kārti / divas kārtis */
const lvCards = (n: number) => (n === 1 ? 'vienu kārti' : `${w20(LV_NF, n)} kārtis`);
const lvW = (w: Who) => (w.you ? 'Tu' : w.name);
const lvV = (w: Who, tu: string, vins: string) => `${lvW(w)} ${w.you ? tu : vins}`;
const lv: VoicePhrases = {
  card: c => cap(`${LV_SG[si(c.s)]} ${LV_R[ri(c.r)]}`),
  set: (r, n) => cap(`${w20(r === 'Q' ? LV_NF : LV_NM, n)} ${LV_RP[ri(r)]}`),
  and: 'un',
  queen: w => `${lvV(w, 'ņem', 'ņem')} piecas kārtis un ${w.you ? 'izlaid' : 'izlaiž'} gājienu`,
  transfer: w => `Pārsūtīts! ${lvV(w, 'ņem', 'ņem')} sešas kārtis un nosedz pīķa sešinieku`,
  eight: (w, n, chain) => chain ? `Ķēde! ${lvV(w, 'ņem', 'ņem')} ${lvCards(n)}` : `${lvV(w, 'ņem', 'ņem')} ${lvCards(n)} un ${w.you ? 'izlaid' : 'izlaiž'} gājienu`,
  seven: (w, n) => `${lvV(w, 'velc', 'velk')} ${lvCards(n)}`,
  skip: w => `${lvV(w, 'izlaid', 'izlaiž')} gājienu`,
  called: s => `Pasūtīts ${LV_SN[si(s)]}`,
  kings: 'Četri kungi! Visiem punkti atpakaļ uz nulli',
  reset: w => `Tieši 125! ${lvW(w)} atpakaļ uz nulli`,
  draws: w => `${lvV(w, 'velc', 'velk')} kārti`,
  lastCard: w => (w.you ? 'Tev pēdējā kārts!' : `${w.name}: pēdējā kārts!`),
  reshuffle: 'Kaudze sajaukta kavā',
  bluffCaught: p => `Blefs atklāts! ${lvV(p, 'ņem', 'ņem')} kārtis atpakaļ un vēl divas`,
  bluffWrong: p => `Tas nebija blefs! ${lvV(p, 'velc', 'velk')} divas kārtis un ${p.you ? 'izlaid' : 'izlaiž'} gājienu`,
  wentOut: w => `${lvV(w, 'izliec', 'izliek')} visas kārtis!`,
  add: n => `Tev pieskaitīt${lvOne(n) ? 's' : 'i'} ${n} punkt${lvOne(n) ? 's' : 'i'}`,
  mult: n => `Kalpu finišs — punkti reiz ${w20(LV_NM, n)}!`,
  win: w => (w.you ? 'Tu uzvari!' : `Uzvar ${w.name}!`),
  tie: names => `Neizšķirts — uzvar ${names}`,
  turn: (s, r) => r ? `Tavs gājiens — liec ${LV_SA[si(s)]} vai ${LV_RA[ri(r)]}` : `Tavs gājiens — liec ${LV_SA[si(s)]}`,
  noMatch: 'Nav ko likt — pieskaries kavai un velc',
  playOrPass: 'Liec izvilkto kārti vai izlaid',
  passNow: 'Joprojām nekā — pieskaries kavai, lai izlaistu',
  cover: 'Tagad nosedz sešinieku',
  answer8: n => `Ņem ${lvCards(n)} vai atbildi ar astoņnieku`,
  answerQ: 'Ņem piecas kārtis vai atbildi ar pīķa sešinieku',
  takeQ6: 'Ņem sešas kārtis un nosedz pīķa sešinieku',
  take7: n => `Velc ${lvCards(n)} un turpini`,
  chooseSuit: 'Izvēlies masti',
  skipped: 'Tevi izlaiž — izlaid gājienu vai apsūdzi blefā',
  canBluff: 'Šķiet aizdomīgi? Vari apsūdzēt blefā',
};

/* =========================================================================== Russian (Вы) */
const RU_R = ['шестёрка', 'семёрка', 'восьмёрка', 'девятка', 'десятка', 'валет', 'дама', 'король', 'туз'];
const RU_RG = ['шестёрки', 'семёрки', 'восьмёрки', 'девятки', 'десятки', 'валета', 'дамы', 'короля', 'туза'];   // after 2–4
const RU_FEM = [true, true, true, true, true, false, true, false, false];
const RU_SG = ['пик', 'треф', 'червей', 'бубен'];
const RU_SN = ['пики', 'трефы', 'черви', 'бубны'];
const RU_NF = ['одну', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать'];
const RU_NM = ['один', 'два', 'три', 'четыре', 'пять'];
const ruCards = (n: number) => `${w20(RU_NF, n)} ${slav(n, 'карту', 'карты', 'карт')}`;
const ruW = (w: Who) => (w.you ? 'Вы' : w.name);
const ruV = (w: Who, vy: string, on: string) => `${ruW(w)} ${w.you ? vy : on}`;
const ru: VoicePhrases = {
  card: c => cap(`${RU_R[ri(c.r)]} ${RU_SG[si(c.s)]}`),
  set: (r, n) => cap(`${RU_FEM[ri(r)] ? w20(RU_NF.map((x, i) => (i === 0 ? 'одна' : x)), n) : w20(RU_NM, n)} ${RU_RG[ri(r)]}`),
  and: 'и',
  queen: w => `${ruV(w, 'берёте', 'берёт')} пять карт и ${w.you ? 'пропускаете' : 'пропускает'} ход`,
  transfer: w => `Перевод! ${ruV(w, 'берёте', 'берёт')} шесть карт и ${w.you ? 'закрываете' : 'закрывает'} шестёрку пик`,
  eight: (w, n, chain) => chain ? `Цепочка! ${ruV(w, 'берёте', 'берёт')} ${ruCards(n)}` : `${ruV(w, 'берёте', 'берёт')} ${ruCards(n)} и ${w.you ? 'пропускаете' : 'пропускает'} ход`,
  seven: (w, n) => `${ruV(w, 'берёте', 'берёт')} ${ruCards(n)}`,
  skip: w => `${ruV(w, 'пропускаете', 'пропускает')} ход`,
  called: s => `Заказаны ${RU_SN[si(s)]}`,
  kings: 'Четыре короля! Счёт у всех обнуляется',
  reset: w => (w.you ? 'Ровно сто двадцать пять! Ваш счёт сгорает до нуля' : `Ровно сто двадцать пять! ${w.name}: счёт сгорает до нуля`),
  draws: w => `${ruV(w, 'берёте', 'берёт')} карту`,
  lastCard: w => (w.you ? 'У вас последняя карта!' : `${w.name}: последняя карта!`),
  reshuffle: 'Отбой замешан в колоду',
  bluffCaught: p => `Блеф раскрыт! ${ruV(p, 'забираете', 'забирает')} карты и ещё две`,
  bluffWrong: p => `Это не блеф! ${ruV(p, 'берёте', 'берёт')} две карты и ${p.you ? 'пропускаете' : 'пропускает'} ход`,
  wentOut: w => `${ruV(w, 'сбрасываете', 'сбрасывает')} последнюю карту!`,
  add: n => `Вам начислено ${n} ${slav(n, 'очко', 'очка', 'очков')}`,
  mult: n => `Финиш валетами — очки умножаются на ${w20(RU_NM, n)}!`,
  win: w => (w.you ? 'Вы побеждаете!' : `Побеждает ${w.name}!`),
  tie: names => `Ничья — побеждают ${names}`,
  turn: (s, r) => r ? `Ваш ход: ${RU_SN[si(s)]} или ${RU_R[ri(r)]}` : `Ваш ход: заказаны ${RU_SN[si(s)]}`,
  noMatch: 'Нечем ходить — нажмите на колоду',
  playOrPass: 'Сыграйте взятую карту или пасуйте',
  passNow: 'Снова нечем — нажмите на колоду, чтобы пасовать',
  cover: 'Теперь закройте шестёрку',
  answer8: n => `Возьмите ${ruCards(n)} или ответьте восьмёркой`,
  answerQ: 'Возьмите пять карт или ответьте шестёркой пик',
  takeQ6: 'Возьмите шесть карт и закройте шестёрку пик',
  take7: n => `Возьмите ${ruCards(n)} и продолжайте`,
  chooseSuit: 'Выберите масть',
  skipped: 'Вас пропускают — пасуйте или обвините в блефе',
  canBluff: 'Подозрительно? Можно обвинить в блефе',
};

/* =========================================================================== Ukrainian (Ви) */
const UK_R = ['шістка', 'сімка', 'вісімка', 'дев’ятка', 'десятка', 'валет', 'дама', 'король', 'туз'];
const UK_RP = ['шістки', 'сімки', 'вісімки', 'дев’ятки', 'десятки', 'валети', 'дами', 'королі', 'тузи'];
const UK_FEM = RU_FEM;
const UK_SG = ['пік', 'треф', 'черв', 'бубон'];
const UK_SN = ['піки', 'трефи', 'черви', 'бубни'];
const UK_NF = ['одну', 'дві', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять', 'десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п’ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев’ятнадцять', 'двадцять'];
const UK_NM = ['один', 'два', 'три', 'чотири', 'п’ять'];
const ukCards = (n: number) => `${w20(UK_NF, n)} ${slav(n, 'карту', 'карти', 'карт')}`;
const ukW = (w: Who) => (w.you ? 'Ви' : w.name);
const ukV = (w: Who, vy: string, vin: string) => `${ukW(w)} ${w.you ? vy : vin}`;
const uk: VoicePhrases = {
  card: c => cap(`${UK_R[ri(c.r)]} ${UK_SG[si(c.s)]}`),
  set: (r, n) => cap(`${UK_FEM[ri(r)] ? w20(UK_NF.map((x, i) => (i === 0 ? 'одна' : x)), n) : w20(UK_NM, n)} ${UK_RP[ri(r)]}`),
  and: 'і',
  queen: w => `${ukV(w, 'берете', 'бере')} п’ять карт і ${w.you ? 'пропускаєте' : 'пропускає'} хід`,
  transfer: w => `Переведено! ${ukV(w, 'берете', 'бере')} шість карт і ${w.you ? 'закриваєте' : 'закриває'} шістку пік`,
  eight: (w, n, chain) => chain ? `Ланцюжок! ${ukV(w, 'берете', 'бере')} ${ukCards(n)}` : `${ukV(w, 'берете', 'бере')} ${ukCards(n)} і ${w.you ? 'пропускаєте' : 'пропускає'} хід`,
  seven: (w, n) => `${ukV(w, 'берете', 'бере')} ${ukCards(n)}`,
  skip: w => `${ukV(w, 'пропускаєте', 'пропускає')} хід`,
  called: s => `Замовлено: ${UK_SN[si(s)]}`,
  kings: 'Чотири королі! Рахунок у всіх обнуляється',
  reset: w => (w.you ? 'Рівно сто двадцять п’ять! Ваш рахунок згоряє до нуля' : `Рівно сто двадцять п’ять! ${w.name}: рахунок згоряє до нуля`),
  draws: w => `${ukV(w, 'берете', 'бере')} карту`,
  lastCard: w => (w.you ? 'У вас остання карта!' : `${w.name}: остання карта!`),
  reshuffle: 'Відбій перемішано в колоду',
  bluffCaught: p => `Блеф викрито! ${ukV(p, 'забираєте', 'забирає')} карти і ще дві`,
  bluffWrong: p => `Це не блеф! ${ukV(p, 'берете', 'бере')} дві карти і ${p.you ? 'пропускаєте' : 'пропускає'} хід`,
  wentOut: w => `${ukV(w, 'скидаєте', 'скидає')} останню карту!`,
  add: n => `Вам нараховано ${n} ${slav(n, 'очко', 'очки', 'очок')}`,
  mult: n => `Фініш валетами — очки множаться на ${w20(UK_NM, n)}!`,
  win: w => (w.you ? 'Ви перемагаєте!' : `Перемагає ${w.name}!`),
  tie: names => `Нічия — перемагають ${names}`,
  turn: (s, r) => r ? `Ваш хід: ${UK_SN[si(s)]} або ${UK_R[ri(r)]}` : `Ваш хід: замовлено ${UK_SN[si(s)]}`,
  noMatch: 'Немає чим ходити — торкніться колоди',
  playOrPass: 'Зіграйте взяту карту або пасуйте',
  passNow: 'Знову нічим — торкніться колоди, щоб пасувати',
  cover: 'Тепер закрийте шістку',
  answer8: n => `Візьміть ${ukCards(n)} або відповідайте вісімкою`,
  answerQ: 'Візьміть п’ять карт або відповідайте шісткою пік',
  takeQ6: 'Візьміть шість карт і закрийте шістку пік',
  take7: n => `Візьміть ${ukCards(n)} і грайте далі`,
  chooseSuit: 'Оберіть масть',
  skipped: 'Вас пропускають — пасуйте або звинувачуйте в блефі',
  canBluff: 'Підозріло? Можна звинуватити в блефі',
};

/* =========================================================================== Belarusian (Вы) */
const BE_R = ['шасцёрка', 'сямёрка', 'васьмёрка', 'дзявятка', 'дзясятка', 'валет', 'дама', 'кароль', 'туз'];
const BE_RP = ['шасцёркі', 'сямёркі', 'васьмёркі', 'дзявяткі', 'дзясяткі', 'валеты', 'дамы', 'каралі', 'тузы'];
const BE_SG = ['пік', 'трэф', 'чырваў', 'бубнаў'];
const BE_SN = ['пікі', 'трэфы', 'чырвы', 'бубны'];
const BE_NF = ['адну', 'дзве', 'тры', 'чатыры', 'пяць', 'шэсць', 'сем', 'восем', 'дзевяць', 'дзесяць', 'адзінаццаць', 'дванаццаць', 'трынаццаць', 'чатырнаццаць', 'пятнаццаць', 'шаснаццаць', 'семнаццаць', 'васямнаццаць', 'дзевятнаццаць', 'дваццаць'];
const BE_NM = ['адзін', 'два', 'тры', 'чатыры', 'пяць'];
const beCards = (n: number) => `${w20(BE_NF, n)} ${slav(n, 'карту', 'карты', 'карт')}`;
const beW = (w: Who) => (w.you ? 'Вы' : w.name);
const beV = (w: Who, vy: string, jon: string) => `${beW(w)} ${w.you ? vy : jon}`;
const be: VoicePhrases = {
  card: c => cap(`${BE_R[ri(c.r)]} ${BE_SG[si(c.s)]}`),
  set: (r, n) => cap(`${RU_FEM[ri(r)] ? w20(BE_NF.map((x, i) => (i === 0 ? 'адна' : x)), n) : w20(BE_NM, n)} ${BE_RP[ri(r)]}`),
  and: 'і',
  queen: w => `${beV(w, 'бераце', 'бярэ')} пяць карт і ${w.you ? 'прапускаеце' : 'прапускае'} ход`,
  transfer: w => `Перавод! ${beV(w, 'бераце', 'бярэ')} шэсць карт і ${w.you ? 'накрываеце' : 'накрывае'} шасцёрку пік`,
  eight: (w, n, chain) => chain ? `Ланцужок! ${beV(w, 'бераце', 'бярэ')} ${beCards(n)}` : `${beV(w, 'бераце', 'бярэ')} ${beCards(n)} і ${w.you ? 'прапускаеце' : 'прапускае'} ход`,
  seven: (w, n) => `${beV(w, 'бераце', 'бярэ')} ${beCards(n)}`,
  skip: w => `${beV(w, 'прапускаеце', 'прапускае')} ход`,
  called: s => `Заказаны ${BE_SN[si(s)]}`,
  kings: 'Чатыры каралі! Лік ва ўсіх абнуляецца',
  reset: w => (w.you ? 'Роўна сто дваццаць пяць! Ваш лік згарае да нуля' : `Роўна сто дваццаць пяць! ${w.name}: лік згарае да нуля`),
  draws: w => `${beV(w, 'бераце', 'бярэ')} карту`,
  lastCard: w => (w.you ? 'У вас апошняя карта!' : `${w.name}: апошняя карта!`),
  reshuffle: 'Адбой перамяшаны ў калоду',
  bluffCaught: p => `Блеф выкрыты! ${beV(p, 'забіраеце', 'забірае')} карты і яшчэ дзве`,
  bluffWrong: p => `Гэта не блеф! ${beV(p, 'бераце', 'бярэ')} дзве карты і ${p.you ? 'прапускаеце' : 'прапускае'} ход`,
  wentOut: w => `${beV(w, 'скідаеце', 'скідае')} апошнюю карту!`,
  add: n => `Вам налічана ${n} ${slav(n, 'ачко', 'ачкі', 'ачкоў')}`,
  mult: n => `Фініш валетамі — ачкі множацца на ${w20(BE_NM, n)}!`,
  win: w => (w.you ? 'Вы перамагаеце!' : `Перамагае ${w.name}!`),
  tie: names => `Нічыя — перамагаюць ${names}`,
  turn: (s, r) => r ? `Ваш ход: ${BE_SN[si(s)]} або ${BE_R[ri(r)]}` : `Ваш ход: заказаны ${BE_SN[si(s)]}`,
  noMatch: 'Няма чым хадзіць — націсніце на калоду',
  playOrPass: 'Згуляйце ўзятую карту або пасуйце',
  passNow: 'Зноў няма чым — націсніце на калоду, каб пасаваць',
  cover: 'Цяпер накрыйце шасцёрку',
  answer8: n => `Вазьміце ${beCards(n)} або адкажыце васьмёркай`,
  answerQ: 'Вазьміце пяць карт або адкажыце шасцёркай пік',
  takeQ6: 'Вазьміце шэсць карт і накрыйце шасцёрку пік',
  take7: n => `Вазьміце ${beCards(n)} і гуляйце далей`,
  chooseSuit: 'Выберыце масць',
  skipped: 'Вас прапускаюць — пасуйце або абвінаваціце ў блефе',
  canBluff: 'Падазрона? Можна абвінаваціць у блефе',
};

/* =========================================================================== Lithuanian (tu) */
const LT_R = ['šešakė', 'septynakė', 'aštuonakė', 'devynakė', 'dešimtakė', 'valetas', 'dama', 'karalius', 'tūzas'];
const LT_RP = ['šešakės', 'septynakės', 'aštuonakės', 'devynakės', 'dešimtakės', 'valetai', 'damos', 'karaliai', 'tūzai'];
const LT_FEM = [true, true, true, true, true, false, true, false, false];
const LT_SG = ['vynų', 'kryžių', 'širdžių', 'būgnų'];
const LT_SN = ['vynai', 'kryžiai', 'širdys', 'būgnai'];
const LT_NM = ['vienas', 'du', 'trys', 'keturi', 'penki'];
const LT_NFn = ['viena', 'dvi', 'trys', 'keturios'];
const LT_NFA = ['vieną', 'dvi', 'tris', 'keturias', 'penkias', 'šešias', 'septynias', 'aštuonias', 'devynias', 'dešimt', 'vienuolika', 'dvylika', 'trylika', 'keturiolika', 'penkiolika', 'šešiolika', 'septyniolika', 'aštuoniolika', 'devyniolika', 'dvidešimt'];
const LT_NG = ['vieno', 'dviejų', 'trijų', 'keturių', 'penkių'];
/** accusative of "korta": vieną kortą, dvi kortas … dešimt kortų */
function ltCards(n: number) {
  const a = n % 100, b = n % 10;
  const noun = b === 0 || (a > 10 && a < 20) ? 'kortų' : b === 1 ? 'kortą' : 'kortas';
  return `${w20(LT_NFA, n)} ${noun}`;
}
function ltPts(n: number) {
  const a = n % 100, b = n % 10;
  return b === 0 || (a > 10 && a < 20) ? 'taškų' : b === 1 ? 'tašką' : 'taškus';
}
const ltW = (w: Who) => (w.you ? 'Tu' : w.name);
const ltV = (w: Who, tu: string, jis: string) => `${ltW(w)} ${w.you ? tu : jis}`;
const lt: VoicePhrases = {
  card: c => cap(`${LT_SG[si(c.s)]} ${LT_R[ri(c.r)]}`),
  set: (r, n) => cap(`${w20(LT_FEM[ri(r)] ? LT_NFn : LT_NM, n)} ${LT_RP[ri(r)]}`),
  and: 'ir',
  queen: w => `${ltV(w, 'imi', 'ima')} penkias kortas ir ${w.you ? 'praleidi' : 'praleidžia'} ėjimą`,
  transfer: w => `Perduota! ${ltV(w, 'imi', 'ima')} šešias kortas ir ${w.you ? 'uždengi' : 'uždengia'} vynų šešakę`,
  eight: (w, n, chain) => chain ? `Grandinė! ${ltV(w, 'imi', 'ima')} ${ltCards(n)}` : `${ltV(w, 'imi', 'ima')} ${ltCards(n)} ir ${w.you ? 'praleidi' : 'praleidžia'} ėjimą`,
  seven: (w, n) => `${ltV(w, 'imi', 'ima')} ${ltCards(n)}`,
  skip: w => `${ltV(w, 'praleidi', 'praleidžia')} ėjimą`,
  called: s => `Užsakyta rūšis — ${LT_SN[si(s)]}`,
  kings: 'Keturi karaliai! Visų taškai grįžta į nulį',
  reset: w => `Lygiai 125! ${ltV(w, 'grįžti', 'grįžta')} į nulį`,
  draws: w => `${ltV(w, 'trauki', 'traukia')} kortą`,
  lastCard: w => (w.you ? 'Tau paskutinė korta!' : `${w.name}: paskutinė korta!`),
  reshuffle: 'Krūva sumaišyta į kaladę',
  bluffCaught: p => `Blefas atskleistas! ${ltV(p, 'atsiimi', 'atsiima')} kortas ir dar dvi`,
  bluffWrong: p => `Tai ne blefas! ${ltV(p, 'imi', 'ima')} dvi kortas ir ${p.you ? 'praleidi' : 'praleidžia'} ėjimą`,
  wentOut: w => `${ltV(w, 'išmeti', 'išmeta')} paskutinę kortą!`,
  add: n => `Gauni ${n} ${ltPts(n)}`,
  mult: n => `Valetų finišas — taškai dauginami iš ${w20(LT_NG, n)}!`,
  win: w => (w.you ? 'Tu laimi!' : `Laimi ${w.name}!`),
  tie: names => `Lygiosios — laimi ${names}`,
  turn: (s, r) => r ? `Tavo ėjimas: ${LT_SN[si(s)]} arba ${LT_R[ri(r)]}` : `Tavo ėjimas: užsakyta rūšis — ${LT_SN[si(s)]}`,
  noMatch: 'Nėra kuo eiti — paliesk kaladę',
  playOrPass: 'Mesk ištrauktą kortą arba praleisk',
  passNow: 'Vis dar nieko — paliesk kaladę ir praleisk',
  cover: 'Dabar uždenk šešakę',
  answer8: n => `Imk ${ltCards(n)} arba atsakyk aštuonake`,
  answerQ: 'Imk penkias kortas arba atsakyk vynų šešake',
  takeQ6: 'Imk šešias kortas ir uždenk vynų šešakę',
  take7: n => `Imk ${ltCards(n)} ir tęsk`,
  chooseSuit: 'Užsakyk rūšį',
  skipped: 'Tave praleidžia — praleisk arba apkaltink blefu',
  canBluff: 'Įtartina? Gali apkaltinti blefu',
};

/* =========================================================================== Estonian (sina) */
const ET_R = ['kuus', 'seitse', 'kaheksa', 'üheksa', 'kümme', 'poiss', 'emand', 'kuningas', 'äss'];
const ET_RP = ['kuut', 'seitset', 'kaheksat', 'üheksat', 'kümmet', 'poissi', 'emandat', 'kuningat', 'ässa'];   // partitive after numerals
const ET_S = ['poti', 'risti', 'ärtu', 'ruutu'];
const ET_N = ['üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus', 'seitse', 'kaheksa', 'üheksa', 'kümme', 'üksteist', 'kaksteist', 'kolmteist', 'neliteist', 'viisteist', 'kuusteist', 'seitseteist', 'kaheksateist', 'üheksateist', 'kakskümmend'];
/** object of a statement ("võtab ühe kaardi / viis kaarti") */
const etCards = (n: number) => (n === 1 ? 'ühe kaardi' : `${w20(ET_N, n)} kaarti`);
/** object of a command ("võta üks kaart / viis kaarti") */
const etCardsImp = (n: number) => (n === 1 ? 'üks kaart' : `${w20(ET_N, n)} kaarti`);
const etW = (w: Who) => (w.you ? 'Sa' : w.name);
const etV = (w: Who, sa: string, tema: string) => `${etW(w)} ${w.you ? sa : tema}`;
const et: VoicePhrases = {
  card: c => cap(`${ET_S[si(c.s)]} ${ET_R[ri(c.r)]}`),
  set: (r, n) => cap(`${w20(ET_N, n)} ${ET_RP[ri(r)]}`),
  and: 'ja',
  queen: w => `${etV(w, 'võtad', 'võtab')} viis kaarti ja ${w.you ? 'jätad' : 'jätab'} käigu vahele`,
  transfer: w => `Edasi antud! ${etV(w, 'võtad', 'võtab')} kuus kaarti ja ${w.you ? 'katad' : 'katab'} poti kuue`,
  eight: (w, n, chain) => chain ? `Kett! ${etV(w, 'võtad', 'võtab')} ${etCards(n)}` : `${etV(w, 'võtad', 'võtab')} ${etCards(n)} ja ${w.you ? 'jätad' : 'jätab'} käigu vahele`,
  seven: (w, n) => `${etV(w, 'võtad', 'võtab')} ${etCards(n)}`,
  skip: w => `${etV(w, 'jätad', 'jätab')} käigu vahele`,
  called: s => `Tellitud mast: ${ET_S[si(s)]}`,
  kings: 'Neli kuningat! Kõigi punktid lähevad nulli',
  reset: w => (w.you ? 'Täpselt 125! Sinu punktid põlevad nulli' : `Täpselt 125! ${w.name}: tagasi nulli`),
  draws: w => `${etV(w, 'võtad', 'võtab')} kaardi`,
  lastCard: w => (w.you ? 'Sul on viimane kaart!' : `${w.name}: viimane kaart!`),
  reshuffle: 'Kuhi segati pakki',
  bluffCaught: p => `Bluff paljastatud! ${etV(p, 'võtad', 'võtab')} kaardid tagasi ja veel kaks`,
  bluffWrong: p => `See polnud bluff! ${etV(p, 'võtad', 'võtab')} kaks kaarti ja ${p.you ? 'jätad' : 'jätab'} käigu vahele`,
  wentOut: w => `${etV(w, 'käid', 'käib')} viimase kaardi!`,
  add: n => `Sulle lisandub ${n} ${n === 1 ? 'punkt' : 'punkti'}`,
  mult: n => `Poistega lõpp — korda ${w20(ET_N, n)}!`,
  win: w => (w.you ? 'Sa võidad!' : `Võidab ${w.name}!`),
  tie: names => `Viik — võidavad ${names}`,
  turn: (s, r) => r ? `Sinu käik: ${ET_S[si(s)]} või ${ET_R[ri(r)]}` : `Sinu käik: tellitud on ${ET_S[si(s)]}`,
  noMatch: 'Pole midagi käia — puuduta pakki',
  playOrPass: 'Käi võetud kaart või passi',
  passNow: 'Ikka mitte midagi — puuduta pakki, et passida',
  cover: 'Nüüd kata kuus',
  answer8: n => `Võta ${etCardsImp(n)} või vasta kaheksaga`,
  answerQ: 'Võta viis kaarti või vasta poti kuuega',
  takeQ6: 'Võta kuus kaarti ja kata poti kuus',
  take7: n => `Võta ${etCardsImp(n)} ja jätka`,
  chooseSuit: 'Telli mast',
  skipped: 'Sinu käik jääb vahele — passi või süüdista bluffis',
  canBluff: 'Kahtlane? Võid süüdistada bluffis',
};

/* =========================================================================== Polish (ty) */
const PL_R = ['szóstka', 'siódemka', 'ósemka', 'dziewiątka', 'dziesiątka', 'walet', 'dama', 'król', 'as'];
const PL_RP = ['szóstki', 'siódemki', 'ósemki', 'dziewiątki', 'dziesiątki', 'walety', 'damy', 'króle', 'asy'];
const PL_FEM = RU_FEM;
const PL_S = ['pik', 'trefl', 'kier', 'karo'];
const PL_NFA = ['jedną', 'dwie', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć', 'dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście', 'dwadzieścia'];
const PL_NM = ['jeden', 'dwa', 'trzy', 'cztery', 'pięć'];
const plFew = (n: number, one: string, few: string, many: string) => (n === 1 ? one : slav(n, many, few, many));
const plCards = (n: number) => `${w20(PL_NFA, n)} ${plFew(n, 'kartę', 'karty', 'kart')}`;
const plW = (w: Who, ty: string, on: string) => (w.you ? cap(ty) : `${w.name} ${on}`);
const pl: VoicePhrases = {
  card: c => cap(`${PL_R[ri(c.r)]} ${PL_S[si(c.s)]}`),
  set: (r, n) => cap(`${PL_FEM[ri(r)] ? w20(['jedna', 'dwie', 'trzy', 'cztery'], n) : w20(PL_NM, n)} ${PL_RP[ri(r)]}`),
  and: 'i',
  queen: w => `${plW(w, 'bierzesz', 'bierze')} pięć kart i ${w.you ? 'tracisz' : 'traci'} kolejkę`,
  transfer: w => `Przekazane! ${plW(w, 'bierzesz', 'bierze')} sześć kart i ${w.you ? 'przykrywasz' : 'przykrywa'} szóstkę pik`,
  eight: (w, n, chain) => chain ? `Łańcuch! ${plW(w, 'bierzesz', 'bierze')} ${plCards(n)}` : `${plW(w, 'bierzesz', 'bierze')} ${plCards(n)} i ${w.you ? 'tracisz' : 'traci'} kolejkę`,
  seven: (w, n) => `${plW(w, 'bierzesz', 'bierze')} ${plCards(n)}`,
  skip: w => `${plW(w, 'tracisz', 'traci')} kolejkę`,
  called: s => `Zamówiono ${PL_S[si(s)]}`,
  kings: 'Cztery króle! Wszystkim wynik wraca do zera',
  reset: w => (w.you ? 'Równo sto dwadzieścia pięć! Twój wynik spada do zera' : `Równo sto dwadzieścia pięć! ${w.name}: wynik spada do zera`),
  draws: w => `${plW(w, 'dobierasz', 'dobiera')} kartę`,
  lastCard: w => (w.you ? 'Masz ostatnią kartę!' : `${w.name}: ostatnia karta!`),
  reshuffle: 'Stos przetasowany do talii',
  bluffCaught: p => `Blef wykryty! ${plW(p, 'zabierasz', 'zabiera')} karty i jeszcze dwie`,
  bluffWrong: p => `To nie blef! ${plW(p, 'bierzesz', 'bierze')} dwie karty i ${p.you ? 'tracisz' : 'traci'} kolejkę`,
  wentOut: w => `${plW(w, 'zrzucasz', 'zrzuca')} ostatnią kartę!`,
  add: n => `Dostajesz ${n} ${plFew(n, 'punkt', 'punkty', 'punktów')}`,
  mult: n => `Koniec waletami — razy ${w20(PL_NM, n)}!`,
  win: w => (w.you ? 'Wygrywasz!' : `Wygrywa ${w.name}!`),
  tie: names => `Remis — wygrywają ${names}`,
  turn: (s, r) => r ? `Twój ruch: ${PL_S[si(s)]} albo ${PL_R[ri(r)]}` : `Twój ruch: zamówiono ${PL_S[si(s)]}`,
  noMatch: 'Nie masz czym zagrać — dotknij talii',
  playOrPass: 'Zagraj dobraną kartę albo pasuj',
  passNow: 'Dalej nic — dotknij talii, żeby spasować',
  cover: 'Teraz przykryj szóstkę',
  answer8: n => `Weź ${plCards(n)} albo odpowiedz ósemką`,
  answerQ: 'Weź pięć kart albo odpowiedz szóstką pik',
  takeQ6: 'Weź sześć kart i przykryj szóstkę pik',
  take7: n => `Weź ${plCards(n)} i graj dalej`,
  chooseSuit: 'Wybierz kolor',
  skipped: 'Tracisz kolejkę — pasuj albo zarzuć blef',
  canBluff: 'Podejrzane? Możesz zarzucić blef',
};

/* =========================================================================== German (du) */
const DE_R = ['Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Bube', 'Dame', 'König', 'Ass'];
const DE_RP = ['Sechsen', 'Siebenen', 'Achten', 'Neunen', 'Zehnen', 'Buben', 'Damen', 'Könige', 'Asse'];
const DE_S = ['Pik', 'Kreuz', 'Herz', 'Karo'];
const DE_N = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig'];
const deCards = (n: number) => (n === 1 ? 'eine Karte' : `${w20(DE_N, n)} Karten`);
const deV = (w: Who, du: string, er: string) => (w.you ? `Du ${du}` : `${w.name} ${er}`);
const de: VoicePhrases = {
  card: c => `${DE_S[si(c.s)]}-${DE_R[ri(c.r)]}`,
  set: (r, n) => cap(`${w20(DE_N, n)} ${DE_RP[ri(r)]}`),
  and: 'und',
  queen: w => `${deV(w, 'ziehst', 'zieht')} fünf Karten und setzt aus`,
  transfer: w => `Weitergegeben! ${deV(w, 'ziehst', 'zieht')} sechs Karten und ${w.you ? 'deckst' : 'deckt'} die Pik-Sechs ab`,
  eight: (w, n, chain) => chain ? `Kette! ${deV(w, 'ziehst', 'zieht')} ${deCards(n)}` : `${deV(w, 'ziehst', 'zieht')} ${deCards(n)} und setzt aus`,
  seven: (w, n) => `${deV(w, 'ziehst', 'zieht')} ${deCards(n)}`,
  skip: w => `${deV(w, 'setzt', 'setzt')} aus`,
  called: s => `${DE_S[si(s)]} gewünscht`,
  kings: 'Vier Könige! Alle Punkte zurück auf null',
  reset: w => `Genau 125! ${deV(w, 'fällst', 'fällt')} zurück auf null`,
  draws: w => `${deV(w, 'ziehst', 'zieht')} eine Karte`,
  lastCard: w => (w.you ? 'Deine letzte Karte!' : `${w.name}: letzte Karte!`),
  reshuffle: 'Der Ablagestapel wird ins Deck gemischt',
  bluffCaught: p => `Bluff erwischt! ${deV(p, 'nimmst', 'nimmt')} die Karten zurück und zwei dazu`,
  bluffWrong: p => `Kein Bluff! ${deV(p, 'ziehst', 'zieht')} zwei Karten und setzt aus`,
  wentOut: w => `${deV(w, 'legst', 'legt')} die letzte Karte ab!`,
  add: n => `Du bekommst ${n} ${n === 1 ? 'Punkt' : 'Punkte'}`,
  mult: n => `Buben-Finish — mal ${w20(DE_N, n)}!`,
  win: w => (w.you ? 'Du gewinnst das Spiel!' : `${w.name} gewinnt das Spiel!`),
  tie: names => `Unentschieden — es gewinnen ${names}`,
  turn: (s, r) => r ? `Du bist dran: ${DE_S[si(s)]} oder ${DE_R[ri(r)]}` : `Du bist dran: ${DE_S[si(s)]} ist gewünscht`,
  noMatch: 'Nichts passt — tipp auf den Stapel zum Ziehen',
  playOrPass: 'Spiel die gezogene Karte oder pass',
  passNow: 'Immer noch nichts — tipp auf den Stapel zum Passen',
  cover: 'Jetzt deck die Sechs ab',
  answer8: n => `Nimm ${deCards(n)} oder antworte mit einer Acht`,
  answerQ: 'Nimm fünf Karten oder antworte mit der Pik-Sechs',
  takeQ6: 'Nimm sechs Karten und deck die Pik-Sechs ab',
  take7: n => `Nimm ${deCards(n)} und spiel weiter`,
  chooseSuit: 'Wünsch dir eine Farbe',
  skipped: 'Du wirst übersprungen — pass oder ruf Bluff',
  canBluff: 'Verdächtig? Du kannst Bluff rufen',
};

/* =========================================================================== Kazakh (Сіз) */
const KK_R = ['алтылық', 'жетілік', 'сегіздік', 'тоғыздық', 'ондық', 'валет', 'дама', 'король', 'тұз'];
const KK_RP = ['алтылығы', 'жетілігі', 'сегіздігі', 'тоғыздығы', 'ондығы', 'валеті', 'дамасы', 'королі', 'тұзы'];   // possessive — "пики дамасы"
const KK_S = ['пики', 'трефы', 'черви', 'бубны'];
const KK_N = ['бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он', 'он бір', 'он екі', 'он үш', 'он төрт', 'он бес', 'он алты', 'он жеті', 'он сегіз', 'он тоғыз', 'жиырма'];
const kkCards = (n: number) => `${w20(KK_N, n)} карта`;
const kkV = (w: Who, siz: string, ol: string) => (w.you ? `Сіз ${siz}` : `${w.name} ${ol}`);
const kk: VoicePhrases = {
  card: c => cap(`${KK_S[si(c.s)]} ${KK_RP[ri(c.r)]}`),
  set: (r, n) => cap(`${w20(KK_N, n)} ${KK_R[ri(r)]}`),
  and: 'және',
  queen: w => `${kkV(w, 'бес карта аласыз', 'бес карта алады')} және жүрісті ${w.you ? 'өткізіп жібересіз' : 'өткізіп жібереді'}`,
  transfer: w => `Ауыстырылды! ${kkV(w, 'алты карта аласыз', 'алты карта алады')} және пики алтылығын ${w.you ? 'жабасыз' : 'жабады'}`,
  eight: (w, n, chain) => chain ? `Тізбек! ${kkV(w, `${kkCards(n)} аласыз`, `${kkCards(n)} алады`)}` : `${kkV(w, `${kkCards(n)} аласыз`, `${kkCards(n)} алады`)} және жүрісті ${w.you ? 'өткізіп жібересіз' : 'өткізіп жібереді'}`,
  seven: (w, n) => kkV(w, `${kkCards(n)} аласыз`, `${kkCards(n)} алады`),
  skip: w => kkV(w, 'жүрісті өткізіп жібересіз', 'жүрісті өткізіп жібереді'),
  called: s => `${cap(KK_S[si(s)])} тапсырылды`,
  kings: 'Төрт король! Барлығының ұпайы нөлге түседі',
  reset: w => (w.you ? 'Дәл 125! Сіздің ұпайыңыз нөлге түседі' : `Дәл 125! ${w.name}: ұпай нөлге түседі`),
  draws: w => kkV(w, 'карта аласыз', 'карта алады'),
  lastCard: w => (w.you ? 'Сізде соңғы карта!' : `${w.name}: соңғы карта!`),
  reshuffle: 'Үйінді колодаға араластырылды',
  bluffCaught: p => `Блеф әшкереленді! ${kkV(p, 'карталарды қайтып аласыз және тағы екі карта аласыз', 'карталарды қайтып алады және тағы екі карта алады')}`,
  bluffWrong: p => `Бұл блеф емес! ${kkV(p, 'екі карта аласыз және жүрісті өткізіп жібересіз', 'екі карта алады және жүрісті өткізіп жібереді')}`,
  wentOut: w => kkV(w, 'соңғы картаңызды тастайсыз!', 'соңғы картасын тастайды!'),
  add: n => `Сізге ${n} ұпай қосылды`,
  mult: n => `Валетпен аяқтау — ${w20(KK_N, n)} есе!`,
  win: w => (w.you ? 'Сіз жеңдіңіз!' : `${w.name} жеңеді!`),
  tie: names => `Тең ойын — жеңімпаздар: ${names}`,
  turn: (s, r) => r ? `Сіздің жүрісіңіз: ${KK_S[si(s)]} немесе ${KK_R[ri(r)]}` : `Сіздің жүрісіңіз: ${KK_S[si(s)]} тапсырылды`,
  noMatch: 'Жүретін карта жоқ — колоданы басыңыз',
  playOrPass: 'Алған картаны ойнаңыз немесе пас беріңіз',
  passNow: 'Тағы жоқ — пас беру үшін колоданы басыңыз',
  cover: 'Енді алтылықты жабыңыз',
  answer8: n => `${cap(kkCards(n))} алыңыз немесе сегіздікпен жауап беріңіз`,
  answerQ: 'Бес карта алыңыз немесе пики алтылығымен жауап беріңіз',
  takeQ6: 'Алты карта алыңыз да, пики алтылығын жабыңыз',
  take7: n => `${cap(kkCards(n))} алыңыз да, ойынды жалғастырыңыз`,
  chooseSuit: 'Масть тапсырыңыз',
  skipped: 'Сіздің жүрісіңіз өтіп кетеді — пас беріңіз немесе блефке айыптаңыз',
  canBluff: 'Күдікті ме? Блефке айыптауға болады',
};

/* =========================================================================== Uzbek (Siz, Latin) */
const UZ_R = ['oltilik', 'yettilik', 'sakkizlik', 'toʻqqizlik', 'oʻnlik', 'valet', 'dama', 'qirol', 'tuz'];
const UZ_RP = ['oltiligi', 'yettiligi', 'sakkizligi', 'toʻqqizligi', 'oʻnligi', 'valeti', 'damasi', 'qiroli', 'tuzi'];
const UZ_S = ['pika', 'krest', 'chervi', 'bubna'];
const UZ_N = ['bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz', 'oʻn', 'oʻn bir', 'oʻn ikki', 'oʻn uch', 'oʻn toʻrt', 'oʻn besh', 'oʻn olti', 'oʻn yetti', 'oʻn sakkiz', 'oʻn toʻqqiz', 'yigirma'];
/** counted: bitta / ikkita / beshta karta */
const uzCards = (n: number) => `${n === 1 ? 'bitta' : `${w20(UZ_N, n)}ta`} karta`;
const uzV = (w: Who, siz: string, u: string) => (w.you ? `Siz ${siz}` : `${w.name} ${u}`);
const uz: VoicePhrases = {
  card: c => cap(`${UZ_S[si(c.s)]} ${UZ_RP[ri(c.r)]}`),
  set: (r, n) => cap(`${w20(UZ_N, n)}ta ${UZ_R[ri(r)]}`),
  and: 'va',
  queen: w => `${uzV(w, 'beshta karta olasiz', 'beshta karta oladi')} va yurishni ${w.you ? 'oʻtkazib yuborasiz' : 'oʻtkazib yuboradi'}`,
  transfer: w => `Oʻtkazildi! ${uzV(w, 'oltita karta olasiz', 'oltita karta oladi')} va pika oltiligini ${w.you ? 'yopasiz' : 'yopadi'}`,
  eight: (w, n, chain) => chain ? `Zanjir! ${uzV(w, `${uzCards(n)} olasiz`, `${uzCards(n)} oladi`)}` : `${uzV(w, `${uzCards(n)} olasiz`, `${uzCards(n)} oladi`)} va yurishni ${w.you ? 'oʻtkazib yuborasiz' : 'oʻtkazib yuboradi'}`,
  seven: (w, n) => uzV(w, `${uzCards(n)} olasiz`, `${uzCards(n)} oladi`),
  skip: w => uzV(w, 'yurishni oʻtkazib yuborasiz', 'yurishni oʻtkazib yuboradi'),
  called: s => `${cap(UZ_S[si(s)])} buyurildi`,
  kings: 'Toʻrtta qirol! Hammaning ochkosi nolga tushadi',
  reset: w => (w.you ? 'Roppa-rosa 125! Sizning ochkongiz nolga tushadi' : `Roppa-rosa 125! ${w.name}: ochko nolga tushadi`),
  draws: w => uzV(w, 'karta olasiz', 'karta oladi'),
  lastCard: w => (w.you ? 'Sizda oxirgi karta!' : `${w.name}: oxirgi karta!`),
  reshuffle: 'Uyum kolodaga aralashtirildi',
  bluffCaught: p => `Blef fosh boʻldi! ${uzV(p, 'kartalarni qaytarib olasiz va yana ikkita olasiz', 'kartalarni qaytarib oladi va yana ikkita oladi')}`,
  bluffWrong: p => `Bu blef emas! ${uzV(p, 'ikkita karta olasiz va yurishni oʻtkazib yuborasiz', 'ikkita karta oladi va yurishni oʻtkazib yuboradi')}`,
  wentOut: w => uzV(w, 'oxirgi kartangizni tashlaysiz!', 'oxirgi kartasini tashlaydi!'),
  add: n => `Sizga ${n} ochko qoʻshildi`,
  mult: n => `Valet bilan tugatish — ${w20(UZ_N, n)} barobar!`,
  win: w => (w.you ? 'Siz gʻalaba qozondingiz!' : `${w.name} gʻalaba qozonadi!`),
  tie: names => `Durang — gʻoliblar: ${names}`,
  turn: (s, r) => r ? `Sizning yurishingiz: ${UZ_S[si(s)]} yoki ${UZ_R[ri(r)]}` : `Sizning yurishingiz: ${UZ_S[si(s)]} buyurilgan`,
  noMatch: 'Yuradigan karta yoʻq — kolodaga bosing',
  playOrPass: 'Olingan kartani oʻynang yoki pas bering',
  passNow: 'Yana yoʻq — pas berish uchun kolodaga bosing',
  cover: 'Endi oltilikni yoping',
  answer8: n => `${cap(uzCards(n))} oling yoki sakkizlik bilan javob bering`,
  answerQ: 'Beshta karta oling yoki pika oltiligi bilan javob bering',
  takeQ6: 'Oltita karta oling va pika oltiligini yoping',
  take7: n => `${cap(uzCards(n))} oling va davom eting`,
  chooseSuit: 'Mast buyuring',
  skipped: 'Yurishingiz oʻtkazib yuboriladi — pas bering yoki blefda ayblang',
  canBluff: 'Shubhalimi? Blefda ayblashingiz mumkin',
};

/* =========================================================================== Azerbaijani (Siz) */
const AZ_R = ['altılıq', 'yeddilik', 'səkkizlik', 'doqquzluq', 'onluq', 'valet', 'dama', 'kral', 'tuz'];
const AZ_RP = ['altılığı', 'yeddiliyi', 'səkkizliyi', 'doqquzluğu', 'onluğu', 'valeti', 'daması', 'kralı', 'tuzu'];
const AZ_S = ['pika', 'xaç', 'ürək', 'kərpic'];
const AZ_N = ['bir', 'iki', 'üç', 'dörd', 'beş', 'altı', 'yeddi', 'səkkiz', 'doqquz', 'on', 'on bir', 'on iki', 'on üç', 'on dörd', 'on beş', 'on altı', 'on yeddi', 'on səkkiz', 'on doqquz', 'iyirmi'];
const azCards = (n: number) => `${w20(AZ_N, n)} kart`;
const azV = (w: Who, siz: string, o: string) => (w.you ? `Siz ${siz}` : `${w.name} ${o}`);
const az: VoicePhrases = {
  card: c => capAz(`${AZ_S[si(c.s)]} ${AZ_RP[ri(c.r)]}`),
  set: (r, n) => capAz(`${w20(AZ_N, n)} ${AZ_R[ri(r)]}`),
  and: 'və',
  queen: w => `${azV(w, 'beş kart götürürsünüz', 'beş kart götürür')} və gedişi ${w.you ? 'buraxırsınız' : 'buraxır'}`,
  transfer: w => `Ötürüldü! ${azV(w, 'altı kart götürürsünüz', 'altı kart götürür')} və pika altılığını ${w.you ? 'örtürsünüz' : 'örtür'}`,
  eight: (w, n, chain) => chain ? `Zəncir! ${azV(w, `${azCards(n)} götürürsünüz`, `${azCards(n)} götürür`)}` : `${azV(w, `${azCards(n)} götürürsünüz`, `${azCards(n)} götürür`)} və gedişi ${w.you ? 'buraxırsınız' : 'buraxır'}`,
  seven: (w, n) => azV(w, `${azCards(n)} götürürsünüz`, `${azCards(n)} götürür`),
  skip: w => azV(w, 'gedişi buraxırsınız', 'gedişi buraxır'),
  called: s => `${capAz(AZ_S[si(s)])} sifariş olundu`,
  kings: 'Dörd kral! Hamının xalı sıfırlanır',
  reset: w => (w.you ? 'Düz 125! Sizin xalınız sıfıra düşür' : `Düz 125! ${w.name}: xal sıfıra düşür`),
  draws: w => azV(w, 'kart götürürsünüz', 'kart götürür'),
  lastCard: w => (w.you ? 'Sizdə son kart qaldı!' : `${w.name}: son kart!`),
  reshuffle: 'Yığın kolodaya qarışdırıldı',
  bluffCaught: p => `Blef ifşa olundu! ${azV(p, 'kartları geri götürürsünüz və daha iki kart alırsınız', 'kartları geri götürür və daha iki kart alır')}`,
  bluffWrong: p => `Bu blef deyil! ${azV(p, 'iki kart götürürsünüz və gedişi buraxırsınız', 'iki kart götürür və gedişi buraxır')}`,
  wentOut: w => azV(w, 'son kartınızı atırsınız!', 'son kartını atır!'),
  add: n => `Sizə ${n} xal əlavə olundu`,
  mult: n => `Valetlə bitiş — ${w20(AZ_N, n)} qat!`,
  win: w => (w.you ? 'Siz qalib gəldiniz!' : `${w.name} qalib gəlir!`),
  tie: names => `Heç-heçə — qaliblər: ${names}`,
  turn: (s, r) => r ? `Sizin gedişiniz: ${AZ_S[si(s)]} və ya ${AZ_R[ri(r)]}` : `Sizin gedişiniz: ${AZ_S[si(s)]} sifariş olunub`,
  noMatch: 'Uyğun kart yoxdur — kolodaya toxunun',
  playOrPass: 'Götürdüyünüz kartı oynayın və ya pas verin',
  passNow: 'Yenə yoxdur — pas üçün kolodaya toxunun',
  cover: 'İndi altılığı örtün',
  answer8: n => `${capAz(azCards(n))} götürün və ya səkkizliklə cavab verin`,
  answerQ: 'Beş kart götürün və ya pika altılığı ilə cavab verin',
  takeQ6: 'Altı kart götürün və pika altılığını örtün',
  take7: n => `${capAz(azCards(n))} götürün və davam edin`,
  chooseSuit: 'Mast sifariş edin',
  skipped: 'Gedişiniz buraxılır — pas verin və ya blefdə ittiham edin',
  canBluff: 'Şübhəlidir? Blefdə ittiham edə bilərsiniz',
};

/* =========================================================================== Georgian (თქვენ) */
const KA_R = ['ექვსიანი', 'შვიდიანი', 'რვიანი', 'ცხრიანი', 'ათიანი', 'ვალეტი', 'ქალი', 'მეფე', 'ტუზი'];
const KA_SG = ['ყვავის', 'ჯვრის', 'გულის', 'აგურის'];
const KA_SN = ['ყვავი', 'ჯვარი', 'გული', 'აგური'];
const KA_N = ['ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა', 'ათი', 'თერთმეტი', 'თორმეტი', 'ცამეტი', 'თოთხმეტი', 'თხუთმეტი', 'თექვსმეტი', 'ჩვიდმეტი', 'თვრამეტი', 'ცხრამეტი', 'ოცი'];
/** attributive (dative) numeral: ხუთ კარტს */
const kaAttr = (n: number) => { const x = w20(KA_N, n); return x.endsWith('ი') ? x.slice(0, -1) : x; };
const kaCardsDat = (n: number) => `${kaAttr(n)} კარტს`;
const kaCardsNom = (n: number) => `${w20(KA_N, n)} კარტი`;
const kaV = (w: Who, tkven: string, is: string) => (w.you ? `თქვენ ${tkven}` : `${w.name} ${is}`);
const ka: VoicePhrases = {
  card: c => `${KA_SG[si(c.s)]} ${KA_R[ri(c.r)]}`,
  set: (r, n) => `${w20(KA_N, n)} ${KA_R[ri(r)]}`,
  and: 'და',
  queen: w => `${kaV(w, 'იღებთ', 'იღებს')} ხუთ კარტს და ${w.you ? 'ტოვებთ' : 'ტოვებს'} სვლას`,
  transfer: w => `გადაცემულია! ${kaV(w, 'იღებთ', 'იღებს')} ექვს კარტს და ${w.you ? 'ფარავთ' : 'ფარავს'} ყვავის ექვსიანს`,
  eight: (w, n, chain) => chain ? `ჯაჭვი! ${kaV(w, 'იღებთ', 'იღებს')} ${kaCardsDat(n)}` : `${kaV(w, 'იღებთ', 'იღებს')} ${kaCardsDat(n)} და ${w.you ? 'ტოვებთ' : 'ტოვებს'} სვლას`,
  seven: (w, n) => `${kaV(w, 'იღებთ', 'იღებს')} ${kaCardsDat(n)}`,
  skip: w => `${kaV(w, 'ტოვებთ', 'ტოვებს')} სვლას`,
  called: s => `შეკვეთილია ${KA_SN[si(s)]}`,
  kings: 'ოთხი მეფე! ყველას ქულები ნულდება',
  reset: w => (w.you ? 'ზუსტად 125! თქვენი ქულები ნულამდე იწვის' : `ზუსტად 125! ${w.name}: ქულები ნულამდე იწვის`),
  draws: w => `${kaV(w, 'იღებთ', 'იღებს')} კარტს`,
  lastCard: w => (w.you ? 'თქვენ ბოლო კარტი გაქვთ!' : `${w.name}: ბოლო კარტი!`),
  reshuffle: 'დასტა კოლოდაში აირია',
  bluffCaught: p => `ბლეფი გამოაშკარავდა! ${kaV(p, 'კარტებს უკან იღებთ', 'კარტებს უკან იღებს')} და კიდევ ორს`,
  bluffWrong: p => `ეს ბლეფი არ იყო! ${kaV(p, 'იღებთ', 'იღებს')} ორ კარტს და ${p.you ? 'ტოვებთ' : 'ტოვებს'} სვლას`,
  wentOut: w => `${kaV(w, 'აგდებთ', 'აგდებს')} ბოლო კარტს!`,
  add: n => `თქვენ გემატებათ ${n} ქულა`,
  mult: n => `ვალეტებით დასრულება — ${kaAttr(n)}ჯერ მეტი!`,
  win: w => (w.you ? 'თქვენ იგებთ!' : `იგებს ${w.name}!`),
  tie: names => `ფრე — იგებენ: ${names}`,
  turn: (s, r) => r ? `თქვენი სვლა: ${KA_SN[si(s)]} ან ${KA_R[ri(r)]}` : `თქვენი სვლა: შეკვეთილია ${KA_SN[si(s)]}`,
  noMatch: 'სასვლელი კარტი არ გაქვთ — შეეხეთ კოლოდას',
  playOrPass: 'ჩამოდით აღებული კარტით ან თქვით პასი',
  passNow: 'ისევ არაფერი — შეეხეთ კოლოდას პასისთვის',
  cover: 'ახლა გადაფარეთ ექვსიანი',
  answer8: n => `აიღეთ ${kaCardsNom(n)} ან უპასუხეთ რვიანით`,
  answerQ: 'აიღეთ ხუთი კარტი ან უპასუხეთ ყვავის ექვსიანით',
  takeQ6: 'აიღეთ ექვსი კარტი და გადაფარეთ ყვავის ექვსიანი',
  take7: n => `აიღეთ ${kaCardsNom(n)} და განაგრძეთ`,
  chooseSuit: 'შეუკვეთეთ მასტი',
  skipped: 'თქვენი სვლა გამოტოვებულია — თქვით პასი ან დაადანაშაულეთ ბლეფში',
  canBluff: 'საეჭვოა? შეგიძლიათ ბლეფში დაადანაშაულოთ',
};

/* =========================================================================== Armenian (Դուք) */
const HY_R = ['վեցնոց', 'յոթնոց', 'ութնոց', 'իննոց', 'տասնոց', 'վալետ', 'դամա', 'թագավոր', 'տուզ'];
const HY_SG = ['պիկի', 'խաչի', 'սրտի', 'աղյուսի'];
const HY_SN = ['պիկ', 'խաչ', 'սիրտ', 'աղյուս'];
const HY_N = ['մեկ', 'երկու', 'երեք', 'չորս', 'հինգ', 'վեց', 'յոթ', 'ութ', 'ինը', 'տասը', 'տասնմեկ', 'տասներկու', 'տասներեք', 'տասնչորս', 'տասնհինգ', 'տասնվեց', 'տասնյոթ', 'տասնութ', 'տասնինը', 'քսան'];
const hyCards = (n: number) => `${w20(HY_N, n)} քարտ`;
const hyV = (w: Who, duq: string, na: string) => (w.you ? `Դուք ${duq}` : `${w.name} ${na}`);
const hy: VoicePhrases = {
  card: c => cap(`${HY_SG[si(c.s)]} ${HY_R[ri(c.r)]}`),
  set: (r, n) => cap(`${w20(HY_N, n)} ${HY_R[ri(r)]}`),
  and: 'և',
  queen: w => `${hyV(w, 'վերցնում եք', 'վերցնում է')} հինգ քարտ և բաց ${w.you ? 'եք' : 'է'} թողնում քայլը`,
  transfer: w => `Փոխանցված է! ${hyV(w, 'վերցնում եք', 'վերցնում է')} վեց քարտ և ծածկում ${w.you ? 'եք' : 'է'} պիկի վեցնոցը`,
  eight: (w, n, chain) => chain ? `Շղթա! ${hyV(w, 'վերցնում եք', 'վերցնում է')} ${hyCards(n)}` : `${hyV(w, 'վերցնում եք', 'վերցնում է')} ${hyCards(n)} և բաց ${w.you ? 'եք' : 'է'} թողնում քայլը`,
  seven: (w, n) => `${hyV(w, 'վերցնում եք', 'վերցնում է')} ${hyCards(n)}`,
  skip: w => `${hyV(w, 'բաց եք թողնում', 'բաց է թողնում')} քայլը`,
  called: s => `Պատվիրված է ${HY_SN[si(s)]}`,
  kings: 'Չորս թագավոր! Բոլորի միավորները զրոյանում են',
  reset: w => (w.you ? 'Ուղիղ 125! Ձեր միավորները այրվում են մինչև զրո' : `Ուղիղ 125! ${w.name} — վերադարձ զրոյի`),
  draws: w => hyV(w, 'քարտ եք վերցնում', 'քարտ է վերցնում'),
  lastCard: w => (w.you ? 'Ձեզ մոտ վերջին քարտն է!' : `${w.name} — վերջին քարտ!`),
  reshuffle: 'Կույտը խառնվեց կոլոդայի մեջ',
  bluffCaught: p => `Բլեֆը բացահայտվեց! ${hyV(p, 'հետ եք վերցնում', 'հետ է վերցնում')} քարտերը և ևս երկուսը`,
  bluffWrong: p => `Սա բլեֆ չէր! ${hyV(p, 'վերցնում եք', 'վերցնում է')} երկու քարտ և բաց ${p.you ? 'եք' : 'է'} թողնում քայլը`,
  wentOut: w => `${hyV(w, 'գցում եք', 'գցում է')} վերջին քարտը!`,
  add: n => `Ձեզ ավելացավ ${n} միավոր`,
  mult: n => `Վալետներով ավարտ — ${w20(HY_N, n)} անգամ!`,
  win: w => (w.you ? 'Դուք հաղթեցիք!' : `Հաղթում է ${w.name}!`),
  tie: names => `Ոչ-ոքի — հաղթում են ${names}`,
  turn: (s, r) => r ? `Ձեր քայլն է — ${HY_SN[si(s)]} կամ ${HY_R[ri(r)]}` : `Ձեր քայլն է — պատվիրված է ${HY_SN[si(s)]}`,
  noMatch: 'Քայլելու քարտ չկա — հպեք կոլոդային',
  playOrPass: 'Խաղացեք վերցված քարտը կամ պաս ասեք',
  passNow: 'Էլի ոչինչ — հպեք կոլոդային՝ պաս ասելու համար',
  cover: 'Հիմա ծածկեք վեցնոցը',
  answer8: n => `Վերցրեք ${hyCards(n)} կամ պատասխանեք ութնոցով`,
  answerQ: 'Վերցրեք հինգ քարտ կամ պատասխանեք պիկի վեցնոցով',
  takeQ6: 'Վերցրեք վեց քարտ և ծածկեք պիկի վեցնոցը',
  take7: n => `Վերցրեք ${hyCards(n)} և շարունակեք`,
  chooseSuit: 'Պատվիրեք մաստը',
  skipped: 'Ձեր քայլը բաց է թողնվում — պաս ասեք կամ մեղադրեք բլեֆի մեջ',
  canBluff: 'Կասկածելի՞ է — կարող եք մեղադրել բլեֆի մեջ',
};

/* =========================================================================== Romanian (tu) */
const RO_R = ['șase', 'șapte', 'opt', 'nouă', 'zece', 'valet', 'damă', 'rege', 'as'];
const RO_RD = ['șase', 'șapte', 'opt', 'nouă', 'zece', 'valetul', 'dama', 'regele', 'asul'];   // card names: "dama de pică"
const RO_RP: Partial<Record<number, string>> = { 5: 'valeți', 6: 'dame', 7: 'regi', 8: 'ași' };
const RO_S = ['pică', 'treflă', 'inimă roșie', 'romb'];
const RO_NF = ['o', 'două', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece', 'unsprezece', 'douăsprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece', 'douăzeci'];
const RO_NM = ['unu', 'doi', 'trei', 'patru', 'cinci'];
const roDe = (n: number) => (n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? 'de ' : '');
const roCards = (n: number) => (n === 1 ? 'o carte' : `${w20(RO_NF, n)} ${roDe(n)}cărți`);
const roV = (w: Who, tu: string, el: string) => (w.you ? cap(tu) : `${w.name} ${el}`);
const ro: VoicePhrases = {
  card: c => cap(`${RO_RD[ri(c.r)]} de ${RO_S[si(c.s)]}`),
  set: (r, n) => {
    const i = ri(r), pic = RO_RP[i];
    if (pic) return cap(`${w20(r === 'Q' ? RO_NF : RO_NM, n)} ${pic}`);
    return cap(`${w20(RO_NF, n)} cărți de ${RO_R[i]}`);
  },
  and: 'și',
  queen: w => `${roV(w, 'iei', 'ia')} cinci cărți și ${w.you ? 'stai' : 'stă'} o tură`,
  transfer: w => `Transferat! ${roV(w, 'iei', 'ia')} șase cărți și ${w.you ? 'acoperi' : 'acoperă'} șasele de pică`,
  eight: (w, n, chain) => chain ? `Lanț! ${roV(w, 'iei', 'ia')} ${roCards(n)}` : `${roV(w, 'iei', 'ia')} ${roCards(n)} și ${w.you ? 'stai' : 'stă'} o tură`,
  seven: (w, n) => `${roV(w, 'iei', 'ia')} ${roCards(n)}`,
  skip: w => `${roV(w, 'stai', 'stă')} o tură`,
  called: s => `S-a cerut ${RO_S[si(s)]}`,
  kings: 'Patru regi! Scorul tuturor revine la zero',
  reset: w => `Exact 125! ${roV(w, 'revii', 'revine')} la zero`,
  draws: w => `${roV(w, 'tragi', 'trage')} o carte`,
  lastCard: w => (w.you ? 'Ai ultima carte!' : `${w.name}: ultima carte!`),
  reshuffle: 'Teancul e amestecat în pachet',
  bluffCaught: p => `Cacealma prinsă! ${roV(p, 'îți iei', 'își ia')} cărțile înapoi și încă două`,
  bluffWrong: p => `Nu e cacealma! ${roV(p, 'iei', 'ia')} două cărți și ${p.you ? 'stai' : 'stă'} o tură`,
  wentOut: w => `${roV(w, 'scapi', 'scapă')} de ultima carte!`,
  add: n => `Primești ${n === 1 ? 'un punct' : `${n} ${roDe(n)}puncte`}`,
  mult: n => `Final cu valeți — punctele se înmulțesc cu ${w20(RO_NM, n)}!`,
  win: w => (w.you ? 'Câștigi jocul!' : `${w.name} câștigă jocul!`),
  tie: names => `Egalitate — câștigă ${names}`,
  turn: (s, r) => r ? `Rândul tău: ${RO_S[si(s)]} sau ${RO_R[ri(r)]}` : `Rândul tău: s-a cerut ${RO_S[si(s)]}`,
  noMatch: 'Nu ai ce juca — atinge pachetul',
  playOrPass: 'Joacă cartea trasă sau dă pas',
  passNow: 'Tot nimic — atinge pachetul ca să dai pas',
  cover: 'Acum acoperă șasele',
  answer8: n => `Ia ${roCards(n)} sau răspunde cu un opt`,
  answerQ: 'Ia cinci cărți sau răspunde cu șase de pică',
  takeQ6: 'Ia șase cărți și acoperă șasele de pică',
  take7: n => `Ia ${roCards(n)} și joacă mai departe`,
  chooseSuit: 'Cere o culoare',
  skipped: 'Ești sărit — dă pas sau acuză de cacealma',
  canBluff: 'Suspect? Poți acuza de cacealma',
};

/* =========================================================================== Bulgarian (ти) */
const BG_R = ['шестица', 'седмица', 'осмица', 'деветка', 'десетка', 'вале', 'дама', 'поп', 'асо'];
const BG_RP = ['шестици', 'седмици', 'осмици', 'деветки', 'десетки', 'валета', 'дами', 'попа', 'аса'];   // counted forms
const BG_MASC = [false, false, false, false, false, false, false, true, false];
const BG_S = ['пика', 'спатия', 'купа', 'каро'];
const BG_NF = ['една', 'две', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет', 'десет', 'единайсет', 'дванайсет', 'тринайсет', 'четиринайсет', 'петнайсет', 'шестнайсет', 'седемнайсет', 'осемнайсет', 'деветнайсет', 'двайсет'];
const bgCards = (n: number) => (n === 1 ? 'една карта' : `${w20(BG_NF, n)} карти`);
const bgV = (w: Who, ti: string, toi: string) => (w.you ? cap(ti) : `${w.name} ${toi}`);
const bg: VoicePhrases = {
  card: c => cap(`${BG_R[ri(c.r)]} ${BG_S[si(c.s)]}`),
  set: (r, n) => cap(`${BG_MASC[ri(r)] ? w20(['един', 'два', 'три', 'четири'], n) : w20(BG_NF, n)} ${BG_RP[ri(r)]}`),
  and: 'и',
  queen: w => `${bgV(w, 'теглиш', 'тегли')} пет карти и ${w.you ? 'пропускаш' : 'пропуска'} ход`,
  transfer: w => `Прехвърлено! ${bgV(w, 'теглиш', 'тегли')} шест карти и ${w.you ? 'покриваш' : 'покрива'} шестицата пика`,
  eight: (w, n, chain) => chain ? `Верига! ${bgV(w, 'теглиш', 'тегли')} ${bgCards(n)}` : `${bgV(w, 'теглиш', 'тегли')} ${bgCards(n)} и ${w.you ? 'пропускаш' : 'пропуска'} ход`,
  seven: (w, n) => `${bgV(w, 'теглиш', 'тегли')} ${bgCards(n)}`,
  skip: w => `${bgV(w, 'пропускаш', 'пропуска')} ход`,
  called: s => `Иска се ${BG_S[si(s)]}`,
  kings: 'Четири попа! Точките на всички падат на нула',
  reset: w => `Точно 125! ${bgV(w, 'връщаш се', 'се връща')} на нула`,
  draws: w => `${bgV(w, 'теглиш', 'тегли')} карта`,
  lastCard: w => (w.you ? 'Имаш последна карта!' : `${w.name}: последна карта!`),
  reshuffle: 'Купчината е разбъркана в тестето',
  bluffCaught: p => `Блъфът е хванат! ${bgV(p, 'взимаш си', 'си взима')} картите обратно и още две`,
  bluffWrong: p => `Не е блъф! ${bgV(p, 'теглиш', 'тегли')} две карти и ${p.you ? 'пропускаш' : 'пропуска'} ход`,
  wentOut: w => `${bgV(w, 'хвърляш', 'хвърля')} последната си карта!`,
  add: n => `Получаваш ${n} ${n === 1 ? 'точка' : 'точки'}`,
  mult: n => `Финал с валета — точките се умножават по ${w20(['едно', 'две', 'три', 'четири', 'пет'], n)}!`,
  win: w => (w.you ? 'Печелиш играта!' : `${w.name} печели играта!`),
  tie: names => `Равенство — печелят ${names}`,
  turn: (s, r) => r ? `Твой ход: ${BG_S[si(s)]} или ${BG_R[ri(r)]}` : `Твой ход: иска се ${BG_S[si(s)]}`,
  noMatch: 'Нямаш с какво да играеш — докосни тестето',
  playOrPass: 'Изиграй изтеглената карта или пасувай',
  passNow: 'Пак нищо — докосни тестето, за да пасуваш',
  cover: 'Сега покрий шестицата',
  answer8: n => `Изтегли ${bgCards(n)} или отговори с осмица`,
  answerQ: 'Изтегли пет карти или отговори с шестица пика',
  takeQ6: 'Изтегли шест карти и покрий шестицата пика',
  take7: n => `Изтегли ${bgCards(n)} и продължи`,
  chooseSuit: 'Поискай боя',
  skipped: 'Пропускаш ход — пасувай или обвини в блъф',
  canBluff: 'Подозрително? Можеш да обвиниш в блъф',
};

/* =========================================================================== Spanish (tú) */
const ES_R = ['seis', 'siete', 'ocho', 'nueve', 'diez', 'jota', 'reina', 'rey', 'as'];
const ES_RP = ['seises', 'sietes', 'ochos', 'nueves', 'dieces', 'jotas', 'reinas', 'reyes', 'ases'];
const ES_FEM = [false, false, false, false, false, true, true, false, false];
const ES_S = ['picas', 'tréboles', 'corazones', 'diamantes'];
const ES_N = ['una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const esCards = (n: number) => (n === 1 ? 'una carta' : `${w20(ES_N, n)} cartas`);
const esV = (w: Who, tu: string, el: string) => (w.you ? cap(tu) : `${w.name} ${el}`);
const es: VoicePhrases = {
  card: c => cap(`${ES_R[ri(c.r)]} de ${ES_S[si(c.s)]}`),
  set: (r, n) => cap(`${w20(ES_N, n)} ${ES_RP[ri(r)]}`),
  and: 'y',
  queen: w => `${esV(w, 'robas', 'roba')} cinco cartas y ${w.you ? 'pierdes' : 'pierde'} el turno`,
  transfer: w => `¡Pasada! ${esV(w, 'robas', 'roba')} seis cartas y ${w.you ? 'cubres' : 'cubre'} el seis de picas`,
  eight: (w, n, chain) => chain ? `¡Cadena! ${esV(w, 'robas', 'roba')} ${esCards(n)}` : `${esV(w, 'robas', 'roba')} ${esCards(n)} y ${w.you ? 'pierdes' : 'pierde'} el turno`,
  seven: (w, n) => `${esV(w, 'robas', 'roba')} ${esCards(n)}`,
  skip: w => `${esV(w, 'pierdes', 'pierde')} el turno`,
  called: s => `Se piden ${ES_S[si(s)]}`,
  kings: '¡Cuatro reyes! Todos vuelven a cero',
  reset: w => `¡Exactamente 125! ${esV(w, 'vuelves', 'vuelve')} a cero`,
  draws: w => `${esV(w, 'robas', 'roba')} una carta`,
  lastCard: w => (w.you ? '¡Te queda una carta!' : `${w.name}: ¡última carta!`),
  reshuffle: 'El montón se baraja en el mazo',
  bluffCaught: p => `¡Farol descubierto! ${esV(p, 'recuperas tus', 'recupera sus')} cartas y dos más`,
  bluffWrong: p => `¡No era farol! ${esV(p, 'robas', 'roba')} dos cartas y ${p.you ? 'pierdes' : 'pierde'} el turno`,
  wentOut: w => (w.you ? '¡Te quedas sin cartas!' : `¡${w.name} se queda sin cartas!`),
  add: n => `Sumas ${n} ${n === 1 ? 'punto' : 'puntos'}`,
  mult: n => `¡Cierre con jotas — por ${w20(['uno', ...ES_N.slice(1)], n)}!`,
  win: w => (w.you ? '¡Ganas la partida!' : `¡${w.name} gana la partida!`),
  tie: names => `Empate — ganan ${names}`,
  turn: (s, r) => r ? `Tu turno: ${ES_S[si(s)]} o ${ES_FEM[ri(r)] ? 'una' : 'un'} ${ES_R[ri(r)]}` : `Tu turno: se piden ${ES_S[si(s)]}`,
  noMatch: 'Nada encaja — toca el mazo para robar',
  playOrPass: 'Juega la carta robada o pasa',
  passNow: 'Sigue sin encajar — toca el mazo para pasar',
  cover: 'Ahora cubre el seis',
  answer8: n => `Roba ${esCards(n)} o responde con un ocho`,
  answerQ: 'Roba cinco cartas o responde con el seis de picas',
  takeQ6: 'Roba seis cartas y cubre el seis de picas',
  take7: n => `Roba ${esCards(n)} y sigue jugando`,
  chooseSuit: 'Pide un palo',
  skipped: 'Te saltan — pasa o acusa de farol',
  canBluff: '¿Sospechoso? Puedes acusar de farol',
};

export const VOICE_PHRASES: Record<Lang, VoicePhrases> = { en, lv, ru, uk, lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es };

/** "Marina, Oleg and you" in the given language. */
export function joinNames(lang: Lang, names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${VOICE_PHRASES[lang].and} ${names[names.length - 1]}`;
}

/** Pronoun used in name lists ("Marina and you"). */
export const YOU_WORD: Record<Lang, string> = {
  en: 'you', lv: 'tu', ru: 'вы', uk: 'ви', lt: 'tu', et: 'sina', pl: 'ty', de: 'du', be: 'вы', kk: 'сіз', uz: 'siz', az: 'siz',
  ka: 'თქვენ', hy: 'դուք', ro: 'tu', bg: 'ти', es: 'tú',
};

/** A played set of cards as speech: one card, a same-rank set, or the Q♠ + 6♠ combo. */
export function cardsPhrase(lang: Lang, cards: Card[]): string {
  const P = VOICE_PHRASES[lang];
  if (!cards.length) return '';
  if (cards.length === 1) return P.card(cards[0]);
  if (cards.every(c => c.r === cards[0].r)) return P.set(cards[0].r, cards.length);
  return `${P.card(cards[0])} ${P.and} ${lowerFirst(P.card(cards[1]), lang)}`;
}
const lowerFirst = (s: string, lang: Lang) => (lang === 'de' ? s : s.charAt(0).toLowerCase() + s.slice(1));

/* =========================================================================== settings / quick-toggle UI */
export interface VoiceUi {
  voice: string; voiceSub: string; moves: string; tips: string; sfx: string; sfxSub: string; volume: string;
  test: string; noVoice: string; fallback: (lang: string) => string; quick: string; music: string; close: string;
}

export const VOICE_UI: Strings<VoiceUi> = {
  en: { voice: 'Voice assistant', voiceSub: 'Announces every move and explains the game', moves: 'Moves only', tips: 'Moves + tips', sfx: 'Sound effects', sfxSub: 'Cards, table and effects', volume: 'Volume', test: 'Hear it', noVoice: 'This device has no voice for this language', fallback: l => `No voice for this language here — speaking ${l}`, quick: 'Sound & voice', music: 'Music', close: 'Close' },
  lv: { voice: 'Balss asistents', voiceSub: 'Paziņo katru gājienu un izskaidro spēli', moves: 'Tikai gājieni', tips: 'Gājieni + padomi', sfx: 'Skaņas efekti', sfxSub: 'Kārtis, galds un efekti', volume: 'Skaļums', test: 'Noklausīties', noVoice: 'Šai ierīcei nav balss šajā valodā', fallback: l => `Šai ierīcei nav latviešu balss — balss: ${l}`, quick: 'Skaņa un balss', music: 'Mūzika', close: 'Aizvērt' },
  ru: { voice: 'Голосовой помощник', voiceSub: 'Озвучивает ходы и объясняет игру', moves: 'Только ходы', tips: 'Ходы + подсказки', sfx: 'Звуковые эффекты', sfxSub: 'Карты, стол и эффекты', volume: 'Громкость', test: 'Прослушать', noVoice: 'На этом устройстве нет голоса для этого языка', fallback: l => `Нет голоса для этого языка — голос: ${l}`, quick: 'Звук и голос', music: 'Музыка', close: 'Закрыть' },
  uk: { voice: 'Голосовий помічник', voiceSub: 'Озвучує ходи та пояснює гру', moves: 'Лише ходи', tips: 'Ходи + підказки', sfx: 'Звукові ефекти', sfxSub: 'Карти, стіл та ефекти', volume: 'Гучність', test: 'Прослухати', noVoice: 'На цьому пристрої немає голосу для цієї мови', fallback: l => `Немає голосу для цієї мови — голос: ${l}`, quick: 'Звук і голос', music: 'Музика', close: 'Закрити' },
  lt: { voice: 'Balso asistentas', voiceSub: 'Praneša kiekvieną ėjimą ir paaiškina žaidimą', moves: 'Tik ėjimai', tips: 'Ėjimai + patarimai', sfx: 'Garso efektai', sfxSub: 'Kortos, stalas ir efektai', volume: 'Garsumas', test: 'Išklausyti', noVoice: 'Šiame įrenginyje nėra balso šiai kalbai', fallback: l => `Šiai kalbai įrenginyje nėra balso — balsas: ${l}`, quick: 'Garsas ir balsas', music: 'Muzika', close: 'Uždaryti' },
  et: { voice: 'Häälassistent', voiceSub: 'Teatab iga käigu ja selgitab mängu', moves: 'Ainult käigud', tips: 'Käigud + nõuanded', sfx: 'Heliefektid', sfxSub: 'Kaardid, laud ja efektid', volume: 'Helitugevus', test: 'Kuula', noVoice: 'Selles seadmes pole selle keele häält', fallback: l => `Selle keele häält seadmes pole — hääl: ${l}`, quick: 'Heli ja hääl', music: 'Muusika', close: 'Sulge' },
  pl: { voice: 'Asystent głosowy', voiceSub: 'Ogłasza każdy ruch i tłumaczy grę', moves: 'Tylko ruchy', tips: 'Ruchy + podpowiedzi', sfx: 'Efekty dźwiękowe', sfxSub: 'Karty, stół i efekty', volume: 'Głośność', test: 'Posłuchaj', noVoice: 'To urządzenie nie ma głosu w tym języku', fallback: l => `Brak głosu w tym języku — głos: ${l}`, quick: 'Dźwięk i głos', music: 'Muzyka', close: 'Zamknij' },
  de: { voice: 'Sprachassistent', voiceSub: 'Sagt jeden Zug an und erklärt das Spiel', moves: 'Nur Züge', tips: 'Züge + Tipps', sfx: 'Soundeffekte', sfxSub: 'Karten, Tisch und Effekte', volume: 'Lautstärke', test: 'Anhören', noVoice: 'Dieses Gerät hat keine Stimme für diese Sprache', fallback: l => `Keine Stimme für diese Sprache — Stimme: ${l}`, quick: 'Ton & Stimme', music: 'Musik', close: 'Schließen' },
  be: { voice: 'Галасавы памочнік', voiceSub: 'Агучвае хады і тлумачыць гульню', moves: 'Толькі хады', tips: 'Хады + падказкі', sfx: 'Гукавыя эфекты', sfxSub: 'Карты, стол і эфекты', volume: 'Гучнасць', test: 'Праслухаць', noVoice: 'На гэтай прыладзе няма голасу для гэтай мовы', fallback: l => `Няма голасу для гэтай мовы — голас: ${l}`, quick: 'Гук і голас', music: 'Музыка', close: 'Закрыць' },
  kk: { voice: 'Дауыстық көмекші', voiceSub: 'Әр жүрісті айтып, ойынды түсіндіреді', moves: 'Тек жүрістер', tips: 'Жүрістер + кеңестер', sfx: 'Дыбыс әсерлері', sfxSub: 'Карталар, үстел және әсерлер', volume: 'Дыбыс деңгейі', test: 'Тыңдау', noVoice: 'Бұл құрылғыда осы тілге дауыс жоқ', fallback: l => `Бұл тілге дауыс жоқ — дауыс: ${l}`, quick: 'Дыбыс және дауыс', music: 'Музыка', close: 'Жабу' },
  uz: { voice: 'Ovozli yordamchi', voiceSub: 'Har bir yurishni aytadi va oʻyinni tushuntiradi', moves: 'Faqat yurishlar', tips: 'Yurishlar + maslahatlar', sfx: 'Ovoz effektlari', sfxSub: 'Kartalar, stol va effektlar', volume: 'Ovoz balandligi', test: 'Tinglash', noVoice: 'Bu qurilmada ushbu til uchun ovoz yoʻq', fallback: l => `Bu til uchun ovoz yoʻq — ovoz: ${l}`, quick: 'Ovoz va tovush', music: 'Musiqa', close: 'Yopish' },
  az: { voice: 'Səsli köməkçi', voiceSub: 'Hər gedişi elan edir və oyunu izah edir', moves: 'Yalnız gedişlər', tips: 'Gedişlər + məsləhətlər', sfx: 'Səs effektləri', sfxSub: 'Kartlar, masa və effektlər', volume: 'Səs səviyyəsi', test: 'Dinlə', noVoice: 'Bu cihazda bu dil üçün səs yoxdur', fallback: l => `Bu dil üçün səs yoxdur — səs: ${l}`, quick: 'Səs və nitq', music: 'Musiqi', close: 'Bağla' },
  ka: { voice: 'ხმოვანი ასისტენტი', voiceSub: 'აცხადებს ყოველ სვლას და ხსნის თამაშს', moves: 'მხოლოდ სვლები', tips: 'სვლები + რჩევები', sfx: 'ხმოვანი ეფექტები', sfxSub: 'კარტები, მაგიდა და ეფექტები', volume: 'ხმის სიმაღლე', test: 'მოსმენა', noVoice: 'ამ მოწყობილობაზე ამ ენის ხმა არ არის', fallback: l => `ამ ენის ხმა არ არის — ხმა: ${l}`, quick: 'ხმა და მეტყველება', music: 'მუსიკა', close: 'დახურვა' },
  hy: { voice: 'Ձայնային օգնական', voiceSub: 'Հայտարարում է յուրաքանչյուր քայլը և բացատրում խաղը', moves: 'Միայն քայլեր', tips: 'Քայլեր + հուշումներ', sfx: 'Ձայնային էֆեկտներ', sfxSub: 'Քարտեր, սեղան և էֆեկտներ', volume: 'Ձայնի ուժգնություն', test: 'Լսել', noVoice: 'Այս սարքում այս լեզվի ձայն չկա', fallback: l => `Այս լեզվի ձայն չկա — ձայն՝ ${l}`, quick: 'Ձայն և խոսք', music: 'Երաժշտություն', close: 'Փակել' },
  ro: { voice: 'Asistent vocal', voiceSub: 'Anunță fiecare mutare și explică jocul', moves: 'Doar mutările', tips: 'Mutări + sfaturi', sfx: 'Efecte sonore', sfxSub: 'Cărți, masă și efecte', volume: 'Volum', test: 'Ascultă', noVoice: 'Acest dispozitiv nu are voce pentru această limbă', fallback: l => `Nu există voce pentru această limbă — voce: ${l}`, quick: 'Sunet și voce', music: 'Muzică', close: 'Închide' },
  bg: { voice: 'Гласов асистент', voiceSub: 'Обявява всеки ход и обяснява играта', moves: 'Само ходове', tips: 'Ходове + съвети', sfx: 'Звукови ефекти', sfxSub: 'Карти, маса и ефекти', volume: 'Сила на звука', test: 'Чуй', noVoice: 'Това устройство няма глас за този език', fallback: l => `Няма глас за този език — глас: ${l}`, quick: 'Звук и глас', music: 'Музика', close: 'Затвори' },
  es: { voice: 'Asistente de voz', voiceSub: 'Anuncia cada jugada y explica el juego', moves: 'Solo jugadas', tips: 'Jugadas + consejos', sfx: 'Efectos de sonido', sfxSub: 'Cartas, mesa y efectos', volume: 'Volumen', test: 'Escuchar', noVoice: 'Este dispositivo no tiene voz para este idioma', fallback: l => `No hay voz para este idioma — voz: ${l}`, quick: 'Sonido y voz', music: 'Música', close: 'Cerrar' },
};
