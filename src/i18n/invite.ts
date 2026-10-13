import type { Strings } from './pick';

/**
 * Invite friends (referrals). English is mandatory; lv / ru / uk are complete; every other language falls back to
 * English (lazily loaded packs may add an `invite` key — see locales/types.ts).
 */
export interface InviteStrings {
  title: string;
  sub: (bm: number, games: number) => string;
  link: string; copy: string; copied: string; share: string;
  shareTitle: string; shareText: string;
  stats: { joined: string; rewarded: string; earned: string };
  friends: string;
  progress: (n: number, max: number) => string;
  rewardedTag: string;
  frame: string; frameNote: string;
  signIn: string; signInSub: string; error: string; retry: string;
  invitedBy: (name: string) => string;
  welcome: {
    kicker: string;
    title: (name: string) => string;
    body: (bm: number, games: number) => string;
    signIn: string; ok: string; later: string;
    progress: (n: number, max: number) => string;
  };
  reward: { title: string; body: (bm: number) => string; friend: (name: string, bm: number) => string };
}

const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString('fr-FR');
const ruPl = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
const lvPl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

const en: InviteStrings = {
  title: 'Invite friends',
  sub: (bm, g) => `When a friend joins with your link and plays ${g} ${g === 1 ? 'game' : 'games'}, you both get ${fmt(bm)} BM and the invite-only Envoy's Ring frame.`,
  link: 'Your invite link', copy: 'Copy', copied: 'Copied!', share: 'Share',
  shareTitle: 'Bridge 125',
  shareText: 'Play Bridge 125 with me — the card game of Q♠, sixes and the 125 burn. Join with my link and we both get a bonus:',
  stats: { joined: 'Joined', rewarded: 'Bonus earned', earned: 'BM earned' },
  friends: 'Your friends',
  progress: (n, m) => `${n}/${m} games`,
  rewardedTag: 'Bonus paid',
  frame: "Envoy's Ring", frameNote: 'Invite-only frame',
  signIn: 'Sign in to get your invite link', signInSub: 'Every friend who joins and plays earns you both a bonus.',
  error: "Couldn't load your invite link.", retry: 'Try again',
  invitedBy: name => `Invited by ${name}`,
  welcome: {
    kicker: 'Invitation',
    title: name => `${name} invited you`,
    body: (bm, g) => `Play ${g} ${g === 1 ? 'game' : 'games'} and you both get ${fmt(bm)} BM + an exclusive frame.`,
    signIn: 'Sign in to accept', ok: "Let's play", later: 'Later',
    progress: (n, m) => `${n} of ${m} games played`,
  },
  reward: {
    title: 'Invite bonus unlocked!',
    body: bm => `+${fmt(bm)} BM and the Envoy's Ring frame are yours.`,
    friend: (name, bm) => `${name} has played their games — +${fmt(bm)} BM for you`,
  },
};

const lv: InviteStrings = {
  title: 'Uzaicini draugus',
  sub: (bm, g) => `Kad draugs pievienojas ar tavu saiti un nospēlē ${g} ${lvPl(g, 'spēli', 'spēles')}, jūs abi saņemat ${fmt(bm)} BM un tikai ielūgumiem paredzēto rāmi „Sūtņa gredzens”.`,
  link: 'Tava ielūguma saite', copy: 'Kopēt', copied: 'Nokopēts!', share: 'Dalīties',
  shareTitle: 'Bridge 125',
  shareText: 'Uzspēlē ar mani Bridge 125 — kāršu spēli ar pīķa dāmu, sešniekiem un 125 punktu „sadegšanu”. Pievienojies ar manu saiti, un mēs abi saņemsim bonusu:',
  stats: { joined: 'Pievienojušies', rewarded: 'Bonuss saņemts', earned: 'Nopelnīti BM' },
  friends: 'Tavi draugi',
  progress: (n, m) => `${n}/${m} spēles`,
  rewardedTag: 'Bonuss izmaksāts',
  frame: 'Sūtņa gredzens', frameNote: 'Rāmis tikai par ielūgumiem',
  signIn: 'Ienāc, lai saņemtu savu ielūguma saiti', signInSub: 'Par katru draugu, kurš pievienojas un spēlē, bonusu saņemat abi.',
  error: 'Neizdevās ielādēt ielūguma saiti.', retry: 'Mēģināt vēlreiz',
  invitedBy: name => `Tevi uzaicināja ${name}`,
  welcome: {
    kicker: 'Ielūgums',
    title: name => `${name} tevi uzaicināja`,
    body: (bm, g) => `Nospēlē ${g} ${lvPl(g, 'spēli', 'spēles')}, un jūs abi saņemsiet ${fmt(bm)} BM + ekskluzīvu rāmi.`,
    signIn: 'Ienākt un pieņemt', ok: 'Spēlējam!', later: 'Vēlāk',
    progress: (n, m) => `Nospēlētas ${n} no ${m}`,
  },
  reward: {
    title: 'Ielūguma bonuss atbloķēts!',
    body: bm => `+${fmt(bm)} BM un rāmis „Sūtņa gredzens” ir tavi.`,
    friend: (name, bm) => `${name} nospēlēja savas spēles — tev +${fmt(bm)} BM`,
  },
};

const ru: InviteStrings = {
  title: 'Пригласите друзей',
  sub: (bm, g) => `Когда друг присоединится по вашей ссылке и сыграет ${g} ${ruPl(g, 'игру', 'игры', 'игр')}, вы оба получите ${fmt(bm)} BM и рамку «Кольцо посла» — только по приглашению.`,
  link: 'Ваша ссылка-приглашение', copy: 'Копировать', copied: 'Скопировано!', share: 'Поделиться',
  shareTitle: 'Bridge 125',
  shareText: 'Сыграй со мной в Bridge 125 — карточную игру с дамой пик, шестёрками и «сгоранием» на 125. Заходи по моей ссылке — и мы оба получим бонус:',
  stats: { joined: 'Присоединились', rewarded: 'Бонус получен', earned: 'Заработано BM' },
  friends: 'Ваши друзья',
  progress: (n, m) => `${n}/${m} игр`,
  rewardedTag: 'Бонус выплачен',
  frame: 'Кольцо посла', frameNote: 'Рамка только за приглашения',
  signIn: 'Войдите, чтобы получить ссылку-приглашение', signInSub: 'За каждого друга, который присоединится и сыграет, бонус получите вы оба.',
  error: 'Не удалось загрузить ссылку-приглашение.', retry: 'Повторить',
  invitedBy: name => `Вас пригласил(а) ${name}`,
  welcome: {
    kicker: 'Приглашение',
    title: name => `${name} приглашает вас`,
    body: (bm, g) => `Сыграйте ${g} ${ruPl(g, 'игру', 'игры', 'игр')} — и вы оба получите ${fmt(bm)} BM + эксклюзивную рамку.`,
    signIn: 'Войти и принять', ok: 'Играем!', later: 'Позже',
    progress: (n, m) => `Сыграно ${n} из ${m}`,
  },
  reward: {
    title: 'Бонус за приглашение открыт!',
    body: bm => `+${fmt(bm)} BM и рамка «Кольцо посла» — ваши.`,
    friend: (name, bm) => `${name} сыграл(а) свои игры — вам +${fmt(bm)} BM`,
  },
};

const uk: InviteStrings = {
  title: 'Запросіть друзів',
  sub: (bm, g) => `Коли друг приєднається за вашим посиланням і зіграє ${g} ${ruPl(g, 'гру', 'гри', 'ігор')}, ви обидва отримаєте ${fmt(bm)} BM і рамку «Перстень посла» — лише за запрошення.`,
  link: 'Ваше посилання-запрошення', copy: 'Копіювати', copied: 'Скопійовано!', share: 'Поділитися',
  shareTitle: 'Bridge 125',
  shareText: 'Зіграй зі мною в Bridge 125 — карткову гру з дамою пік, шістками та «згорянням» на 125. Заходь за моїм посиланням — і ми обидва отримаємо бонус:',
  stats: { joined: 'Приєдналися', rewarded: 'Бонус отримано', earned: 'Зароблено BM' },
  friends: 'Ваші друзі',
  progress: (n, m) => `${n}/${m} ігор`,
  rewardedTag: 'Бонус виплачено',
  frame: 'Перстень посла', frameNote: 'Рамка лише за запрошення',
  signIn: 'Увійдіть, щоб отримати посилання-запрошення', signInSub: 'За кожного друга, який приєднається і зіграє, бонус отримаєте ви обидва.',
  error: 'Не вдалося завантажити посилання-запрошення.', retry: 'Повторити',
  invitedBy: name => `Вас запросив(ла) ${name}`,
  welcome: {
    kicker: 'Запрошення',
    title: name => `${name} запрошує вас`,
    body: (bm, g) => `Зіграйте ${g} ${ruPl(g, 'гру', 'гри', 'ігор')} — і ви обидва отримаєте ${fmt(bm)} BM + ексклюзивну рамку.`,
    signIn: 'Увійти й прийняти', ok: 'Граємо!', later: 'Пізніше',
    progress: (n, m) => `Зіграно ${n} з ${m}`,
  },
  reward: {
    title: 'Бонус за запрошення відкрито!',
    body: bm => `+${fmt(bm)} BM і рамка «Перстень посла» — ваші.`,
    friend: (name, bm) => `${name} зіграв(ла) свої ігри — вам +${fmt(bm)} BM`,
  },
};

export const INVITE_STRINGS: Strings<InviteStrings> = { en, lv, ru, uk };

import { registerStrings } from './pick';
registerStrings('invite', INVITE_STRINGS);
