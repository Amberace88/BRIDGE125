import type { Strings } from './pick';
import type { QuickKey } from '../social/sanitize';
import type { SocialError } from '../social/gifts';

/** Strings for table chat, gifts, tips, Diamonds and the wallet. English is mandatory; other languages fall back to it. */
export interface SocialStrings {
  chat: {
    title: string; open: string; close: string; placeholder: string; send: string; empty: string; emoji: string;
    quick: Record<QuickKey, string>;
    slow: (s: number) => string; mute: string; unmute: string; muted: (name: string) => string; hidden: (n: number) => string;
    report: string; reported: string; reportSignIn: string; filtered: string; you: string; unread: (n: number) => string;
  };
  gift: {
    title: string; to: (name: string) => string; tabGifts: string; tabTip: string; names: Record<string, string>;
    send: string; sending: string; signIn: string; balance: string; bot: string; guest: (name: string) => string;
    tipNote: string; tipNoAcct: string; tipLeft: (n: string) => string; tipSend: (n: string) => string;
    flyBy: (from: string) => string; tipBy: (from: string, n: string) => string;
    getDiamonds: string; mute: string; unmute: string; account: string; guestTag: string; botTag: string; close: string;
    errors: Record<SocialError, string>; fundsBm: (n: string) => string; fundsDm: (n: string) => string; games: (n: number) => string;
  };
  dm: {
    name: string; title: string; sub: string; bonus: (pct: number) => string; best: string; popular: string; buy: string; buying: string;
    comingSoon: string; soonNote: string; vat: string; noLoot: string; refunds: (email: string) => string; signIn: string; secure: string;
    payOk: string; payCancel: string; uses: string[];
  };
  wallet: {
    title: string; history: string; none: string; refunded: string; sent: string; received: string; ledger: string;
    reasons: Record<'purchase' | 'refund' | 'gift' | 'gift_item' | 'admin_grant' | 'correction', string>; tip: (n: string) => string;
  };
  inbox: { item: (name: string, item: string) => string; tip: (name: string, n: string) => string; thanks: string };
  giftItem: {
    action: string; title: string; sub: string; nick: string; send: (n: string) => string; sending: string;
    done: (name: string) => string; owned: string; signIn: string;
  };
}

const en: SocialStrings = {
  chat: {
    title: 'Table chat', open: 'Chat', close: 'Close chat', placeholder: 'Say something nice…', send: 'Send', empty: 'No messages yet — say hi 👋', emoji: 'Emoji',
    quick: { gl: 'Good luck!', nice: 'Nice move!', oops: 'Oops 🙈', wp: 'Well played', hurry: 'Hurry up 😅', rematch: 'Rematch?', thanks: 'Thanks!', gg: 'GG 🤝' },
    slow: s => `Easy there — wait ${s}s`, mute: 'Mute', unmute: 'Unmute', muted: n => `${n} is muted`, hidden: n => `${n} hidden`,
    report: 'Report', reported: 'Reported — thank you', reportSignIn: 'Sign in to report messages', filtered: 'filtered', you: 'You', unread: n => `${n} unread`,
  },
  gift: {
    title: 'Send a gift', to: n => `to ${n}`, tabGifts: 'Gifts', tabTip: 'Tip BM',
    names: { clover: 'Lucky Clover', rose: 'Red Rose', cigar: 'Havana Cigar', champagne: 'Champagne', trophy: 'Trophy', fireworks: 'Fireworks', crown: 'Golden Crown', ring: 'Diamond Ring' },
    send: 'Send', sending: 'Sending…', signIn: 'Sign in to send gifts', balance: 'Balance', bot: 'Bots love gifts too — it’s shown to the whole table.',
    guest: n => `${n} plays as a guest: the gift is shown to the table, but only signed-in players keep it.`,
    tipNote: 'Tips go straight to their BM balance. Up to 1 000 BM per player per day.', tipNoAcct: 'Tips need a signed-in player on both sides.',
    tipLeft: n => `${n} BM left for this player today`, tipSend: n => `Tip ${n} BM`,
    flyBy: f => `from ${f}`, tipBy: (f, n) => `${f} tipped ${n} BM`,
    getDiamonds: 'Get Diamonds', mute: 'Mute chat', unmute: 'Unmute chat', account: 'Player', guestTag: 'Guest', botTag: 'Bot', close: 'Close',
    errors: {
      auth: 'Please sign in first.', banned: 'Your account can’t send gifts.', unknown: 'This gift isn’t available.', funds: 'Not enough balance.',
      self: 'You can’t send that to yourself.', throttle: 'One moment — not so fast.', target: 'That player can’t receive it.', noAccount: 'That player has no account.',
      games: 'Finish a few games first.', limit: 'Daily tip limit reached.', owned: 'They already own this.', ambiguous: 'Several players have this nickname.',
      notFound: 'No player with that nickname.', unavailable: 'Not available right now.', network: 'Connection problem — try again.', generic: 'Something went wrong.',
    },
    fundsBm: n => `You need ${n} more BM`, fundsDm: n => `You need ${n} more 💎`, games: n => `Finish ${n} more game${n === 1 ? '' : 's'} to unlock tips`,
  },
  dm: {
    name: 'Diamonds', title: 'Diamonds', sub: 'Premium currency for table gifts and for gifting styles to friends.',
    bonus: p => `+${p}% bonus`, best: 'Best value', popular: 'Most popular', buy: 'Buy', buying: 'Opening checkout…',
    comingSoon: 'Payments coming soon', soonNote: 'Card payments are being switched on. Diamonds will be available here very soon.',
    vat: 'Prices include VAT.', noLoot: 'No loot boxes, no random rewards — you always see exactly what you get.',
    refunds: e => `Diamonds are delivered instantly. In the EU the 14-day withdrawal right ends once delivery starts. Charged by mistake? Write to ${e} — we fix it.`,
    signIn: 'Sign in to buy Diamonds', secure: 'Secure checkout by Stripe',
    payOk: 'Payment received — your Diamonds are on their way ✨', payCancel: 'Checkout cancelled — nothing was charged.',
    uses: ['Throw champagne, crowns and fireworks at the table', 'Gift a table or card back to a friend', 'Support the game ♥'],
  },
  wallet: {
    title: 'Wallet', history: 'Purchase history', none: 'No purchases yet', refunded: 'Refunded', sent: 'Gifts sent', received: 'Gifts received', ledger: 'Diamond activity',
    reasons: { purchase: 'Purchase', refund: 'Refund', gift: 'Table gift', gift_item: 'Gifted style', admin_grant: 'Test grant', correction: 'Correction' },
    tip: n => `${n} BM tip`,
  },
  inbox: { item: (n, i) => `${n} sent you ${i} 🎁`, tip: (n, b) => `${n} tipped you ${b} BM`, thanks: 'Lovely!' },
  giftItem: {
    action: 'Gift to a friend', title: 'Gift this style', sub: 'It goes straight into your friend’s collection, with your name on it.',
    nick: 'Friend’s nickname', send: n => `Gift for ${n} 💎`, sending: 'Wrapping…', done: n => `Sent to ${n}! 🎁`, owned: 'They already own it', signIn: 'Sign in to send gifts',
  },
};

const lv: SocialStrings = {
  chat: {
    title: 'Galda čats', open: 'Čats', close: 'Aizvērt čatu', placeholder: 'Uzraksti ko jauku…', send: 'Sūtīt', empty: 'Vēl nav ziņu — pasveicini 👋', emoji: 'Emocijzīmes',
    quick: { gl: 'Veiksmi!', nice: 'Labs gājiens!', oops: 'Ups 🙈', wp: 'Labi nospēlēts', hurry: 'Ātrāk 😅', rematch: 'Revanšs?', thanks: 'Paldies!', gg: 'GG 🤝' },
    slow: s => `Mierīgi — pagaidi ${s} s`, mute: 'Apklusināt', unmute: 'Ieslēgt', muted: n => `${n} apklusināts`, hidden: n => `${n} paslēptas`,
    report: 'Ziņot', reported: 'Paziņots — paldies', reportSignIn: 'Pieslēdzies, lai ziņotu', filtered: 'filtrēts', you: 'Tu', unread: n => `${n} nelasītas`,
  },
  gift: {
    title: 'Sūtīt dāvanu', to: n => `spēlētājam ${n}`, tabGifts: 'Dāvanas', tabTip: 'Dzeramnauda',
    names: { clover: 'Laimes āboliņš', rose: 'Sarkanā roze', cigar: 'Havanas cigārs', champagne: 'Šampanietis', trophy: 'Kauss', fireworks: 'Salūts', crown: 'Zelta kronis', ring: 'Briljanta gredzens' },
    send: 'Sūtīt', sending: 'Sūta…', signIn: 'Pieslēdzies, lai sūtītu dāvanas', balance: 'Bilance', bot: 'Arī boti priecājas — dāvanu redz viss galds.',
    guest: n => `${n} spēlē kā viesis: dāvanu redz galds, bet paturēt to var tikai pieslēgušies spēlētāji.`,
    tipNote: 'Dzeramnauda nonāk tieši viņa BM bilancē. Līdz 1 000 BM vienam spēlētājam dienā.', tipNoAcct: 'Dzeramnaudai abiem jābūt pieslēgušiem.',
    tipLeft: n => `Šodien šim spēlētājam vēl ${n} BM`, tipSend: n => `Dot ${n} BM`,
    flyBy: f => `no ${f}`, tipBy: (f, n) => `${f} iedeva ${n} BM`,
    getDiamonds: 'Iegūt dimantus', mute: 'Apklusināt čatu', unmute: 'Ieslēgt čatu', account: 'Spēlētājs', guestTag: 'Viesis', botTag: 'Bots', close: 'Aizvērt',
    errors: {
      auth: 'Lūdzu, vispirms pieslēdzies.', banned: 'Tavs konts nevar sūtīt dāvanas.', unknown: 'Šī dāvana nav pieejama.', funds: 'Nepietiek līdzekļu.',
      self: 'To nevar sūtīt sev.', throttle: 'Mirkli — ne tik ātri.', target: 'Šis spēlētājs to nevar saņemt.', noAccount: 'Šim spēlētājam nav konta.',
      games: 'Vispirms nospēlē dažas spēles.', limit: 'Dienas limits sasniegts.', owned: 'Tas viņam jau ir.', ambiguous: 'Šis vārds ir vairākiem spēlētājiem.',
      notFound: 'Spēlētājs ar šādu vārdu nav atrasts.', unavailable: 'Pašlaik nav pieejams.', network: 'Savienojuma kļūda — mēģini vēlreiz.', generic: 'Kaut kas nogāja greizi.',
    },
    fundsBm: n => `Vajag vēl ${n} BM`, fundsDm: n => `Vajag vēl ${n} 💎`, games: n => `Nospēlē vēl ${n} spēl${n === 1 ? 'i' : 'es'}, lai varētu dot dzeramnaudu`,
  },
  dm: {
    name: 'Dimanti', title: 'Dimanti', sub: 'Premium valūta galda dāvanām un stilu dāvināšanai draugiem.',
    bonus: p => `+${p}% bonuss`, best: 'Izdevīgākais', popular: 'Populārākais', buy: 'Pirkt', buying: 'Atver apmaksu…',
    comingSoon: 'Maksājumi drīzumā', soonNote: 'Karšu maksājumi tiek ieslēgti. Dimanti šeit būs pieejami pavisam drīz.',
    vat: 'Cenās iekļauts PVN.', noLoot: 'Nekādu “loot box” un nejaušu balvu — tu vienmēr redzi, ko saņem.',
    refunds: e => `Dimanti tiek piešķirti uzreiz. ES 14 dienu atteikuma tiesības beidzas, kad piegāde sākta. Kļūdains maksājums? Raksti uz ${e} — mēs to izlabosim.`,
    signIn: 'Pieslēdzies, lai pirktu dimantus', secure: 'Droša apmaksa ar Stripe',
    payOk: 'Maksājums saņemts — dimanti jau ceļā ✨', payCancel: 'Apmaksa atcelta — nekas netika iekasēts.',
    uses: ['Met pie galda šampanieti, kroņus un salūtu', 'Uzdāvini draugam galdu vai kāršu muguru', 'Atbalsti spēli ♥'],
  },
  wallet: {
    title: 'Maciņš', history: 'Pirkumu vēsture', none: 'Pirkumu vēl nav', refunded: 'Atmaksāts', sent: 'Nosūtītās dāvanas', received: 'Saņemtās dāvanas', ledger: 'Dimantu kustība',
    reasons: { purchase: 'Pirkums', refund: 'Atmaksa', gift: 'Galda dāvana', gift_item: 'Uzdāvināts stils', admin_grant: 'Testa piešķīrums', correction: 'Korekcija' },
    tip: n => `${n} BM dzeramnauda`,
  },
  inbox: { item: (n, i) => `${n} tev uzdāvināja: ${i} 🎁`, tip: (n, b) => `${n} tev iedeva ${b} BM`, thanks: 'Jauki!' },
  giftItem: {
    action: 'Uzdāvināt draugam', title: 'Uzdāvināt šo stilu', sub: 'Tas nonāks drauga kolekcijā ar tavu vārdu.',
    nick: 'Drauga vārds spēlē', send: n => `Uzdāvināt par ${n} 💎`, sending: 'Iesaiņo…', done: n => `Nosūtīts: ${n}! 🎁`, owned: 'Tas viņam jau ir', signIn: 'Pieslēdzies, lai dāvinātu',
  },
};

const ru: SocialStrings = {
  chat: {
    title: 'Чат стола', open: 'Чат', close: 'Закрыть чат', placeholder: 'Напишите что-нибудь…', send: 'Отправить', empty: 'Пока тихо — поздоровайтесь 👋', emoji: 'Эмодзи',
    quick: { gl: 'Удачи!', nice: 'Красивый ход!', oops: 'Упс 🙈', wp: 'Хорошо сыграно', hurry: 'Поторопись 😅', rematch: 'Реванш?', thanks: 'Спасибо!', gg: 'GG 🤝' },
    slow: s => `Не так быстро — подождите ${s} с`, mute: 'Заглушить', unmute: 'Включить', muted: n => `${n} заглушён`, hidden: n => `скрыто: ${n}`,
    report: 'Пожаловаться', reported: 'Жалоба отправлена — спасибо', reportSignIn: 'Войдите, чтобы пожаловаться', filtered: 'отфильтровано', you: 'Вы', unread: n => `непрочитано: ${n}`,
  },
  gift: {
    title: 'Отправить подарок', to: n => `для ${n}`, tabGifts: 'Подарки', tabTip: 'Чаевые BM',
    names: { clover: 'Клевер удачи', rose: 'Алая роза', cigar: 'Гаванская сигара', champagne: 'Шампанское', trophy: 'Кубок', fireworks: 'Салют', crown: 'Золотая корона', ring: 'Кольцо с бриллиантом' },
    send: 'Отправить', sending: 'Отправляем…', signIn: 'Войдите, чтобы дарить подарки', balance: 'Баланс', bot: 'Боты тоже любят подарки — его увидит весь стол.',
    guest: n => `${n} играет как гость: подарок увидит стол, но сохраняют его только вошедшие игроки.`,
    tipNote: 'Чаевые сразу зачисляются на баланс BM. До 1 000 BM одному игроку в день.', tipNoAcct: 'Для чаевых оба игрока должны войти в аккаунт.',
    tipLeft: n => `Сегодня этому игроку можно ещё ${n} BM`, tipSend: n => `Дать ${n} BM`,
    flyBy: f => `от ${f}`, tipBy: (f, n) => `${f}: чаевые ${n} BM`,
    getDiamonds: 'Получить алмазы', mute: 'Заглушить чат', unmute: 'Включить чат', account: 'Игрок', guestTag: 'Гость', botTag: 'Бот', close: 'Закрыть',
    errors: {
      auth: 'Сначала войдите.', banned: 'Ваш аккаунт не может дарить подарки.', unknown: 'Этот подарок недоступен.', funds: 'Недостаточно средств.',
      self: 'Себе отправить нельзя.', throttle: 'Секунду — не так быстро.', target: 'Этот игрок не может это получить.', noAccount: 'У этого игрока нет аккаунта.',
      games: 'Сначала сыграйте несколько игр.', limit: 'Дневной лимит исчерпан.', owned: 'У него это уже есть.', ambiguous: 'Такой ник у нескольких игроков.',
      notFound: 'Игрок с таким ником не найден.', unavailable: 'Сейчас недоступно.', network: 'Проблема со связью — попробуйте ещё раз.', generic: 'Что-то пошло не так.',
    },
    fundsBm: n => `Не хватает ${n} BM`, fundsDm: n => `Не хватает ${n} 💎`, games: n => `Сыграйте ещё ${n}, чтобы открыть чаевые`,
  },
  dm: {
    name: 'Алмазы', title: 'Алмазы', sub: 'Премиум-валюта для подарков за столом и стилей в подарок друзьям.',
    bonus: p => `+${p}% бонус`, best: 'Выгоднее всего', popular: 'Популярный', buy: 'Купить', buying: 'Открываем оплату…',
    comingSoon: 'Оплата скоро', soonNote: 'Оплата картой подключается. Алмазы появятся здесь совсем скоро.',
    vat: 'Цены включают НДС.', noLoot: 'Никаких лутбоксов и случайных наград — вы всегда видите, что получаете.',
    refunds: e => `Алмазы зачисляются сразу. В ЕС право отказа (14 дней) прекращается с началом доставки. Ошибочный платёж? Напишите на ${e} — исправим.`,
    signIn: 'Войдите, чтобы купить алмазы', secure: 'Безопасная оплата через Stripe',
    payOk: 'Платёж получен — алмазы уже в пути ✨', payCancel: 'Оплата отменена — деньги не списаны.',
    uses: ['Шампанское, короны и салют прямо за столом', 'Подарите другу стол или рубашку карт', 'Поддержите игру ♥'],
  },
  wallet: {
    title: 'Кошелёк', history: 'История покупок', none: 'Покупок пока нет', refunded: 'Возврат', sent: 'Отправленные подарки', received: 'Полученные подарки', ledger: 'Движение алмазов',
    reasons: { purchase: 'Покупка', refund: 'Возврат', gift: 'Подарок за столом', gift_item: 'Стиль в подарок', admin_grant: 'Тестовое начисление', correction: 'Корректировка' },
    tip: n => `чаевые ${n} BM`,
  },
  inbox: { item: (n, i) => `${n} подарил(а) вам: ${i} 🎁`, tip: (n, b) => `${n}: чаевые вам ${b} BM`, thanks: 'Приятно!' },
  giftItem: {
    action: 'Подарить другу', title: 'Подарить этот стиль', sub: 'Он сразу попадёт в коллекцию друга — с вашим именем.',
    nick: 'Ник друга', send: n => `Подарить за ${n} 💎`, sending: 'Упаковываем…', done: n => `Отправлено: ${n}! 🎁`, owned: 'У него это уже есть', signIn: 'Войдите, чтобы дарить',
  },
};

const uk: SocialStrings = {
  chat: {
    title: 'Чат столу', open: 'Чат', close: 'Закрити чат', placeholder: 'Напишіть щось приємне…', send: 'Надіслати', empty: 'Поки тихо — привітайтеся 👋', emoji: 'Емодзі',
    quick: { gl: 'Удачі!', nice: 'Гарний хід!', oops: 'Ой 🙈', wp: 'Добре зіграно', hurry: 'Швидше 😅', rematch: 'Реванш?', thanks: 'Дякую!', gg: 'GG 🤝' },
    slow: s => `Не так швидко — зачекайте ${s} с`, mute: 'Вимкнути', unmute: 'Увімкнути', muted: n => `${n} вимкнено`, hidden: n => `приховано: ${n}`,
    report: 'Поскаржитися', reported: 'Скаргу надіслано — дякуємо', reportSignIn: 'Увійдіть, щоб поскаржитися', filtered: 'відфільтровано', you: 'Ви', unread: n => `непрочитано: ${n}`,
  },
  gift: {
    title: 'Надіслати подарунок', to: n => `для ${n}`, tabGifts: 'Подарунки', tabTip: 'Чайові BM',
    names: { clover: 'Конюшина удачі', rose: 'Червона троянда', cigar: 'Гаванська сигара', champagne: 'Шампанське', trophy: 'Кубок', fireworks: 'Феєрверк', crown: 'Золота корона', ring: 'Каблучка з діамантом' },
    send: 'Надіслати', sending: 'Надсилаємо…', signIn: 'Увійдіть, щоб дарувати подарунки', balance: 'Баланс', bot: 'Боти теж люблять подарунки — його побачить увесь стіл.',
    guest: n => `${n} грає як гість: подарунок побачить стіл, але зберігають його лише гравці з акаунтом.`,
    tipNote: 'Чайові одразу надходять на баланс BM. До 1 000 BM одному гравцеві на день.', tipNoAcct: 'Для чайових обидва гравці мають увійти в акаунт.',
    tipLeft: n => `Сьогодні цьому гравцеві ще ${n} BM`, tipSend: n => `Дати ${n} BM`,
    flyBy: f => `від ${f}`, tipBy: (f, n) => `${f}: чайові ${n} BM`,
    getDiamonds: 'Отримати діаманти', mute: 'Вимкнути чат', unmute: 'Увімкнути чат', account: 'Гравець', guestTag: 'Гість', botTag: 'Бот', close: 'Закрити',
    errors: {
      auth: 'Спершу увійдіть.', banned: 'Ваш акаунт не може дарувати подарунки.', unknown: 'Цей подарунок недоступний.', funds: 'Недостатньо коштів.',
      self: 'Собі надіслати не можна.', throttle: 'Секунду — не так швидко.', target: 'Цей гравець не може це отримати.', noAccount: 'У цього гравця немає акаунта.',
      games: 'Спершу зіграйте кілька ігор.', limit: 'Денний ліміт вичерпано.', owned: 'У нього це вже є.', ambiguous: 'Такий нік у кількох гравців.',
      notFound: 'Гравця з таким ніком не знайдено.', unavailable: 'Зараз недоступно.', network: 'Проблема зі з’єднанням — спробуйте ще.', generic: 'Щось пішло не так.',
    },
    fundsBm: n => `Бракує ${n} BM`, fundsDm: n => `Бракує ${n} 💎`, games: n => `Зіграйте ще ${n}, щоб відкрити чайові`,
  },
  dm: {
    name: 'Діаманти', title: 'Діаманти', sub: 'Преміум-валюта для подарунків за столом і стилів у подарунок друзям.',
    bonus: p => `+${p}% бонус`, best: 'Найвигідніше', popular: 'Популярний', buy: 'Купити', buying: 'Відкриваємо оплату…',
    comingSoon: 'Оплата незабаром', soonNote: 'Оплату карткою підключаємо. Діаманти з’являться тут зовсім скоро.',
    vat: 'Ціни включають ПДВ.', noLoot: 'Жодних лутбоксів і випадкових нагород — ви завжди бачите, що отримуєте.',
    refunds: e => `Діаманти зараховуються одразу. У ЄС право відмови (14 днів) припиняється з початком доставки. Помилковий платіж? Напишіть на ${e} — виправимо.`,
    signIn: 'Увійдіть, щоб купити діаманти', secure: 'Безпечна оплата через Stripe',
    payOk: 'Платіж отримано — діаманти вже в дорозі ✨', payCancel: 'Оплату скасовано — кошти не списано.',
    uses: ['Шампанське, корони й феєрверки просто за столом', 'Подаруйте другу стіл або сорочку карт', 'Підтримайте гру ♥'],
  },
  wallet: {
    title: 'Гаманець', history: 'Історія покупок', none: 'Покупок ще немає', refunded: 'Повернено', sent: 'Надіслані подарунки', received: 'Отримані подарунки', ledger: 'Рух діамантів',
    reasons: { purchase: 'Покупка', refund: 'Повернення', gift: 'Подарунок за столом', gift_item: 'Стиль у подарунок', admin_grant: 'Тестове нарахування', correction: 'Коригування' },
    tip: n => `чайові ${n} BM`,
  },
  inbox: { item: (n, i) => `${n} подарував(ла) вам: ${i} 🎁`, tip: (n, b) => `${n}: чайові вам ${b} BM`, thanks: 'Приємно!' },
  giftItem: {
    action: 'Подарувати другу', title: 'Подарувати цей стиль', sub: 'Він одразу потрапить у колекцію друга — з вашим ім’ям.',
    nick: 'Нік друга', send: n => `Подарувати за ${n} 💎`, sending: 'Пакуємо…', done: n => `Надіслано: ${n}! 🎁`, owned: 'У нього це вже є', signIn: 'Увійдіть, щоб дарувати',
  },
};

export const SOCIAL_STRINGS: Strings<SocialStrings> = { en, lv, ru, uk };
