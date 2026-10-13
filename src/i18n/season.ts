import type { Strings } from './pick';

/**
 * Season Pass (/season). English is mandatory; lv / ru / uk are complete. The 13 lazily loaded languages show English
 * until their pack in src/i18n/locales/<lang>.ts adds a `season` section (the FeaturePack key is optional for now).
 */
export interface SeasonStrings {
  title: string;
  kicker: (n: number, name: string) => string;
  seasonNames: Record<string, string>;
  back: string;
  tierN: (n: number) => string;
  tierShort: string;
  stars: string;
  next: (n: number) => string;
  maxed: string;
  endsIn: (t: string) => string;
  startsIn: (t: string) => string;
  claimUntil: (t: string) => string;
  over: string;
  week: (w: number, of: number) => string;
  units: { d: string; h: string; m: string };
  free: string; premium: string;
  claim: string; claimAll: (n: number) => string; claimed: string;
  reach: (n: number) => string;
  unlock: string; unlockSub: string; premiumActive: string; premiumFree: string;
  skip: string; skipTitle: string; skipSub: string; skipBtn: (n: number, price: string) => string; skipN: (n: number) => string; skipTo: (n: number) => string;
  sheet: {
    title: string; exclusive: string; plus: string; retro: string;
    buy: (price: string) => string; balance: (b: string) => string; need: (n: string) => string;
    getDiamonds: string; later: string; done: string; doneSub: string; legal: string;
  };
  reward: { bm: (n: string) => string; dm: (n: string) => string; shards: (n: number) => string; spin: (n: number) => string; boost: (min: number) => string };
  reveal: { title: string; premiumTitle: string; tierTrack: (n: number, track: string) => string; collect: string; all: (n: number) => string; wheel: string };
  how: { title: string; win: string; loss: string; daily: string; weekly: string; chest: string; challenge: string; medals: string; note: string };
  guest: string; guestSub: string; signIn: string; offline: string;
  dock: string;
  toast: { tier: (n: number) => string; claim: (n: number) => string; open: string };
  profile: { sub: (tier: number) => string; ready: (n: number) => string };
  errors: { funds: string; network: string; locked: string; premium: string; none: string; generic: string; max: string; banned: string };
  god: { title: string; reset: string };
}

/* ------------------------------------------------------------------ plural helpers */
/** Latvian: 1, 21, 31 … (not 11) take the singular. */
const lv1 = (n: number) => n % 10 === 1 && n % 100 !== 11;
/** Russian / Ukrainian: one · few · many */
const slav = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};
const hrs = (min: number) => (min % 60 === 0 ? min / 60 : Math.round((min / 60) * 10) / 10);

const en: SeasonStrings = {
  title: 'Season Pass',
  kicker: (n, name) => `Season ${n} · ${name}`,
  seasonNames: { s1: 'Jazz Age' },
  back: 'Back',
  tierN: n => `Tier ${n}`,
  tierShort: 'Tier',
  stars: 'Stars',
  next: n => `Next: tier ${n}`,
  maxed: 'Pass complete!',
  endsIn: t => `Ends in ${t}`,
  startsIn: t => `Starts in ${t}`,
  claimUntil: t => `Season over · claim for ${t}`,
  over: 'Season over',
  week: (w, of) => `Week ${w} of ${of}`,
  units: { d: 'd', h: 'h', m: 'min' },
  free: 'Free', premium: 'Premium',
  claim: 'Claim', claimAll: n => `Claim all (${n})`, claimed: 'Claimed',
  reach: n => `Reach tier ${n}`,
  unlock: 'Unlock Premium', unlockSub: 'Exclusive season styles and a bigger reward on every tier',
  premiumActive: 'Premium active', premiumFree: 'Premium included for the owner & testers',
  skip: 'Skip a tier', skipTitle: 'Skip tiers', skipSub: 'Jump ahead now — every reward you pass becomes claimable at once.',
  skipBtn: (n, p) => `Skip ${n} · ${p} 💎`, skipN: n => `${n} ${n === 1 ? 'tier' : 'tiers'}`, skipTo: n => `To tier ${n}`,
  sheet: {
    title: 'Premium Pass', exclusive: 'Exclusive styles — never sold in the shop', plus: 'Plus, on the premium track',
    retro: 'Premium rewards of every tier you have already reached unlock at once.',
    buy: p => `Unlock · ${p} 💎`, balance: b => `You have ${b} 💎`, need: n => `${n} 💎 more needed`,
    getDiamonds: 'Get Diamonds', later: 'Not now', done: 'Premium unlocked!', doneSub: 'Your premium rewards are waiting.',
    legal: 'Digital content, delivered instantly. Paid with Diamonds only.',
  },
  reward: {
    bm: n => `${n} BM`, dm: n => `${n} Diamonds`, shards: n => `${n} ${n === 1 ? 'shard' : 'shards'}`,
    spin: n => (n === 1 ? 'Wheel spin' : `${n} wheel spins`), boost: m => `XP ×2 · ${hrs(m)} h`,
  },
  reveal: { title: 'Reward collected', premiumTitle: 'Premium reward', tierTrack: (n, t) => `Tier ${n} · ${t}`, collect: 'Continue', all: n => `${n} ${n === 1 ? 'reward' : 'rewards'} collected`, wheel: 'Fortune wheel' },
  how: { title: 'How to earn stars', win: 'Win a game', loss: 'Finish a game', daily: 'Daily quest', weekly: 'Weekly quest', chest: 'Weekly chest', challenge: 'Daily challenge', medals: 'Achievement', note: 'Games count up to the daily reward limit. Stars only grow while the season is live.' },
  guest: 'Sign in to earn stars', guestSub: 'This is a preview — season progress and rewards live on your account.', signIn: 'Sign in',
  offline: 'Could not load the season — showing a preview.',
  dock: 'Pass',
  toast: { tier: n => `Tier ${n} reached!`, claim: n => (n ? `${n} ${n === 1 ? 'reward is' : 'rewards are'} waiting` : 'Keep collecting stars'), open: 'Open' },
  profile: { sub: t => `Tier ${t}`, ready: n => `${n} ready` },
  errors: { funds: 'Not enough Diamonds', network: 'Connection problem — try again', locked: 'Reach this tier first', premium: 'Needs the Premium Pass', none: 'The season is not running right now', generic: 'Something went wrong', max: 'Already at the last tier', banned: 'Account suspended' },
  god: { title: 'GOD tools', reset: 'Reset season' },
};

const lv: SeasonStrings = {
  title: 'Sezonas caurlaide',
  kicker: (n, name) => `${n}. sezona · ${name}`,
  seasonNames: { s1: 'Džeza laikmets' },
  back: 'Atpakaļ',
  tierN: n => `${n}. pakāpe`,
  tierShort: 'Pakāpe',
  stars: 'Zvaigznes',
  next: n => `Nākamā: ${n}. pakāpe`,
  maxed: 'Caurlaide pabeigta!',
  endsIn: t => `Beigsies pēc ${t}`,
  startsIn: t => `Sāksies pēc ${t}`,
  claimUntil: t => `Sezona beigusies · balvas vēl ${t}`,
  over: 'Sezona beigusies',
  week: (w, of) => `${w}. nedēļa no ${of}`,
  units: { d: 'd.', h: 'st.', m: 'min' },
  free: 'Bezmaksas', premium: 'Premium',
  claim: 'Saņemt', claimAll: n => `Saņemt visu (${n})`, claimed: 'Saņemts',
  reach: n => `Sasniedz ${n}. pakāpi`,
  unlock: 'Atvērt Premium', unlockSub: 'Ekskluzīvi sezonas stili un lielāka balva katrā pakāpē',
  premiumActive: 'Premium aktīvs', premiumFree: 'Premium iekļauts īpašniekam un testētājiem',
  skip: 'Izlaist pakāpi', skipTitle: 'Izlaist pakāpes', skipSub: 'Pārlec uz priekšu uzreiz — visas pārlēktās balvas varēsi saņemt tūlīt.',
  skipBtn: (n, p) => `Izlaist ${n} · ${p} 💎`, skipN: n => `${n} ${lv1(n) ? 'pakāpe' : 'pakāpes'}`, skipTo: n => `Līdz ${n}. pakāpei`,
  sheet: {
    title: 'Premium caurlaide', exclusive: 'Ekskluzīvi stili, ko veikalā nopirkt nevar', plus: 'Un vēl premium celiņā',
    retro: 'Premium balvas visās jau sasniegtajās pakāpēs atvērsies uzreiz.',
    buy: p => `Atvērt · ${p} 💎`, balance: b => `Tev ir ${b} 💎`, need: n => `Pietrūkst ${n} 💎`,
    getDiamonds: 'Iegūt dimantus', later: 'Vēlāk', done: 'Premium atvērts!', doneSub: 'Tavas premium balvas jau gaida.',
    legal: 'Digitāls saturs, piegādāts uzreiz. Maksā tikai ar dimantiem.',
  },
  reward: {
    bm: n => `${n} BM`, dm: n => `${n} ${lv1(Number(String(n).replace(/\D/g, ''))) ? 'dimants' : 'dimanti'}`, shards: n => `${n} ${lv1(n) ? 'šķemba' : 'šķembas'}`,
    spin: n => (n === 1 ? 'Laimes rata grieziens' : `${n} rata ${lv1(n) ? 'grieziens' : 'griezieni'}`), boost: m => `XP ×2 · ${hrs(m)} st.`,
  },
  reveal: { title: 'Balva saņemta', premiumTitle: 'Premium balva', tierTrack: (n, t) => `${n}. pakāpe · ${t}`, collect: 'Lieliski', all: n => `${n} ${lv1(n) ? 'balva saņemta' : 'balvas saņemtas'}`, wheel: 'Laimes rats' },
  how: { title: 'Kā krāt zvaigznes', win: 'Uzvarēta spēle', loss: 'Nospēlēta spēle', daily: 'Dienas uzdevums', weekly: 'Nedēļas uzdevums', chest: 'Nedēļas lāde', challenge: 'Dienas izaicinājums', medals: 'Sasniegums', note: 'Spēles skaitās līdz dienas balvu limitam. Zvaigznes krājas tikai sezonas laikā.' },
  guest: 'Pieslēdzies, lai krātu zvaigznes', guestSub: 'Šis ir priekšskatījums — sezonas progress un balvas glabājas tavā kontā.', signIn: 'Pieslēgties',
  offline: 'Sezonu neizdevās ielādēt — rādām priekšskatījumu.',
  dock: 'Caurlaide',
  toast: { tier: n => `Sasniegta ${n}. pakāpe!`, claim: n => (n ? `Gaida ${n} ${lv1(n) ? 'balva' : 'balvas'}` : 'Turpini krāt zvaigznes'), open: 'Atvērt' },
  profile: { sub: t => `${t}. pakāpe`, ready: n => `${n} gaida` },
  errors: { funds: 'Nepietiek dimantu', network: 'Savienojuma kļūda — mēģini vēlreiz', locked: 'Vispirms sasniedz šo pakāpi', premium: 'Vajag Premium caurlaidi', none: 'Sezona šobrīd nenotiek', generic: 'Kaut kas nogāja greizi', max: 'Jau pēdējā pakāpe', banned: 'Konts bloķēts' },
  god: { title: 'GOD rīki', reset: 'Atiestatīt sezonu' },
};

const ru: SeasonStrings = {
  title: 'Сезонный пропуск',
  kicker: (n, name) => `Сезон ${n} · ${name}`,
  seasonNames: { s1: 'Эпоха джаза' },
  back: 'Назад',
  tierN: n => `Ступень ${n}`,
  tierShort: 'Ступень',
  stars: 'Звёзды',
  next: n => `Дальше: ступень ${n}`,
  maxed: 'Пропуск пройден!',
  endsIn: t => `До конца ${t}`,
  startsIn: t => `Старт через ${t}`,
  claimUntil: t => `Сезон окончен · награды ещё ${t}`,
  over: 'Сезон окончен',
  week: (w, of) => `Неделя ${w} из ${of}`,
  units: { d: 'д', h: 'ч', m: 'мин' },
  free: 'Бесплатно', premium: 'Премиум',
  claim: 'Забрать', claimAll: n => `Забрать всё (${n})`, claimed: 'Получено',
  reach: n => `Откроется на ступени ${n}`,
  unlock: 'Открыть Премиум', unlockSub: 'Эксклюзивные стили сезона и награда побольше на каждой ступени',
  premiumActive: 'Премиум активен', premiumFree: 'Премиум включён для владельца и тестеров',
  skip: 'Пропустить ступень', skipTitle: 'Пропуск ступеней', skipSub: 'Прыгните вперёд сразу — все пройденные награды можно забрать тут же.',
  skipBtn: (n, p) => `Пропустить ${n} · ${p} 💎`, skipN: n => `${n} ${slav(n, 'ступень', 'ступени', 'ступеней')}`, skipTo: n => `До ступени ${n}`,
  sheet: {
    title: 'Премиум-пропуск', exclusive: 'Эксклюзивные стили — в магазине их не купить', plus: 'А ещё на премиум-дорожке',
    retro: 'Премиум-награды всех уже пройденных ступеней откроются сразу.',
    buy: p => `Открыть · ${p} 💎`, balance: b => `У вас ${b} 💎`, need: n => `Не хватает ${n} 💎`,
    getDiamonds: 'Получить алмазы', later: 'Позже', done: 'Премиум открыт!', doneSub: 'Ваши премиум-награды уже ждут.',
    legal: 'Цифровой контент, доставляется сразу. Оплата только алмазами.',
  },
  reward: {
    bm: n => `${n} BM`, dm: n => `${n} ${slav(Number(String(n).replace(/\D/g, '')), 'алмаз', 'алмаза', 'алмазов')}`, shards: n => `${n} ${slav(n, 'осколок', 'осколка', 'осколков')}`,
    spin: n => (n === 1 ? 'Вращение колеса' : `${n} ${slav(n, 'вращение', 'вращения', 'вращений')}`), boost: m => `XP ×2 · ${hrs(m)} ч`,
  },
  reveal: { title: 'Награда получена', premiumTitle: 'Премиум-награда', tierTrack: (n, t) => `Ступень ${n} · ${t}`, collect: 'Отлично', all: n => `${n} ${slav(n, 'награда получена', 'награды получены', 'наград получено')}`, wheel: 'Колесо фортуны' },
  how: { title: 'Как получать звёзды', win: 'Победа в партии', loss: 'Сыгранная партия', daily: 'Задание дня', weekly: 'Задание недели', chest: 'Сундук недели', challenge: 'Испытание дня', medals: 'Достижение', note: 'Партии засчитываются до дневного лимита наград. Звёзды копятся только во время сезона.' },
  guest: 'Войдите, чтобы копить звёзды', guestSub: 'Это предпросмотр — прогресс сезона и награды хранятся в аккаунте.', signIn: 'Войти',
  offline: 'Не удалось загрузить сезон — показываем предпросмотр.',
  dock: 'Пропуск',
  toast: { tier: n => `Ступень ${n} пройдена!`, claim: n => (n ? `Ждут ${n} ${slav(n, 'награда', 'награды', 'наград')}` : 'Копите звёзды дальше'), open: 'Открыть' },
  profile: { sub: t => `Ступень ${t}`, ready: n => `${n} ждут` },
  errors: { funds: 'Не хватает алмазов', network: 'Проблема со связью — попробуйте ещё раз', locked: 'Сначала дойдите до этой ступени', premium: 'Нужен Премиум-пропуск', none: 'Сезон сейчас не идёт', generic: 'Что-то пошло не так', max: 'Это уже последняя ступень', banned: 'Аккаунт заблокирован' },
  god: { title: 'Инструменты GOD', reset: 'Сбросить сезон' },
};

const uk: SeasonStrings = {
  title: 'Сезонна перепустка',
  kicker: (n, name) => `Сезон ${n} · ${name}`,
  seasonNames: { s1: 'Доба джазу' },
  back: 'Назад',
  tierN: n => `Щабель ${n}`,
  tierShort: 'Щабель',
  stars: 'Зірки',
  next: n => `Далі: щабель ${n}`,
  maxed: 'Перепустку пройдено!',
  endsIn: t => `До кінця ${t}`,
  startsIn: t => `Старт через ${t}`,
  claimUntil: t => `Сезон завершено · нагороди ще ${t}`,
  over: 'Сезон завершено',
  week: (w, of) => `Тиждень ${w} з ${of}`,
  units: { d: 'д', h: 'год', m: 'хв' },
  free: 'Безкоштовно', premium: 'Преміум',
  claim: 'Забрати', claimAll: n => `Забрати все (${n})`, claimed: 'Отримано',
  reach: n => `Відкриється на щаблі ${n}`,
  unlock: 'Відкрити Преміум', unlockSub: 'Ексклюзивні стилі сезону й більша нагорода на кожному щаблі',
  premiumActive: 'Преміум активний', premiumFree: 'Преміум увімкнено для власника й тестерів',
  skip: 'Пропустити щабель', skipTitle: 'Пропуск щаблів', skipSub: 'Стрибніть уперед одразу — усі пройдені нагороди можна забрати тут же.',
  skipBtn: (n, p) => `Пропустити ${n} · ${p} 💎`, skipN: n => `${n} ${slav(n, 'щабель', 'щаблі', 'щаблів')}`, skipTo: n => `До щабля ${n}`,
  sheet: {
    title: 'Преміум-перепустка', exclusive: 'Ексклюзивні стилі — у крамниці їх не купити', plus: 'А ще на преміум-доріжці',
    retro: 'Преміум-нагороди всіх уже пройдених щаблів відкриються одразу.',
    buy: p => `Відкрити · ${p} 💎`, balance: b => `У вас ${b} 💎`, need: n => `Бракує ${n} 💎`,
    getDiamonds: 'Отримати діаманти', later: 'Пізніше', done: 'Преміум відкрито!', doneSub: 'Ваші преміум-нагороди вже чекають.',
    legal: 'Цифровий контент, доставляється одразу. Оплата лише діамантами.',
  },
  reward: {
    bm: n => `${n} BM`, dm: n => `${n} ${slav(Number(String(n).replace(/\D/g, '')), 'діамант', 'діаманти', 'діамантів')}`, shards: n => `${n} ${slav(n, 'уламок', 'уламки', 'уламків')}`,
    spin: n => (n === 1 ? 'Оберт колеса' : `${n} ${slav(n, 'оберт', 'оберти', 'обертів')}`), boost: m => `XP ×2 · ${hrs(m)} год`,
  },
  reveal: { title: 'Нагороду отримано', premiumTitle: 'Преміум-нагорода', tierTrack: (n, t) => `Щабель ${n} · ${t}`, collect: 'Чудово', all: n => `${n} ${slav(n, 'нагороду отримано', 'нагороди отримано', 'нагород отримано')}`, wheel: 'Колесо фортуни' },
  how: { title: 'Як отримувати зірки', win: 'Перемога в партії', loss: 'Зіграна партія', daily: 'Завдання дня', weekly: 'Завдання тижня', chest: 'Скриня тижня', challenge: 'Випробування дня', medals: 'Досягнення', note: 'Партії зараховуються до денного ліміту нагород. Зірки накопичуються лише під час сезону.' },
  guest: 'Увійдіть, щоб збирати зірки', guestSub: 'Це попередній перегляд — прогрес сезону й нагороди зберігаються в акаунті.', signIn: 'Увійти',
  offline: 'Не вдалося завантажити сезон — показуємо попередній перегляд.',
  dock: 'Перепустка',
  toast: { tier: n => `Щабель ${n} пройдено!`, claim: n => (n ? `Чекають ${n} ${slav(n, 'нагорода', 'нагороди', 'нагород')}` : 'Збирайте зірки далі'), open: 'Відкрити' },
  profile: { sub: t => `Щабель ${t}`, ready: n => `${n} чекають` },
  errors: { funds: 'Бракує діамантів', network: 'Проблема зі зв’язком — спробуйте ще раз', locked: 'Спершу дійдіть до цього щабля', premium: 'Потрібна Преміум-перепустка', none: 'Сезон зараз не триває', generic: 'Щось пішло не так', max: 'Це вже останній щабель', banned: 'Акаунт заблоковано' },
  god: { title: 'Інструменти GOD', reset: 'Скинути сезон' },
};

/** Registered below: the 13 lazily loaded languages show English until their pack (src/i18n/locales) translates it. */
export const SEASON_STRINGS: Strings<SeasonStrings> = { en, lv, ru, uk };

import { registerStrings } from './pick';
registerStrings('season', SEASON_STRINGS);
