import type { Strings } from './pick';

/**
 * The games hub's social layer (src/games/tournament, src/games/challenge, src/games/hub/Showcase): weekly tournaments,
 * challenge-a-friend links (/c/<code>), the game of the day, the marathon and the card-room level.
 * English is mandatory; lv / ru / uk live here, the 13 lazily loaded languages translate it in their pack
 * (src/i18n/locales/<lang>.ts → `arena`). Counts sit next to a label, so no plural rules are needed.
 */
export interface ArenaStrings {
  hall: { title: string; level: string; toNext: string; ranks: [string, string, string, string, string]; showcase: string; empty: string; best: string; fastest: string; streak: string; wins: string };
  today: { gotd: string; bonus: string; gotdSub: string; earned: string; play: string; marathon: string; marathonSub: string; open: string; opened: string; chest: string; signIn: string };
  tour: {
    kicker: string; title: string; endsIn: string; units: { d: string; h: string; m: string; s: string };
    metric: { wins: string; score: string }; points: { wins: string; score: string };
    rank: string; unranked: string; qualify: string; players: string; free: string; play: string; standings: string; prizes: string; prizeLine: string;
    tiers: { gold: string; silver: string; bronze: string; top10: string };
    items: { champion: string; podium: string; frame: string; badge: string };
    rules: (game: string) => string; empty: string; error: string; retry: string; you: string; guest: string; signIn: string;
    lastWeek: string; noGame: string;
    claim: { title: string; sub: (game: string) => string; collect: string; collecting: string; done: string; equip: string };
  };
  challenge: {
    cta: string; ctaSub: string; pick: string; pickSub: string; mine: string; answers: string; beaten: string; noneYet: string;
    prompt: string; sameDeal: string; ownDeal: string; yourResult: string;
    creating: string; link: string; copy: string; copied: string; share: string; image: string; saved: string; error: string; retry: string;
    signIn: string; signInSub: string; limit: string;
    shareText: (game: string, result: string) => string;
    landing: {
      kicker: string; from: (name: string) => string; toBeat: string; play: string; sameDeal: string; ownDeal: string;
      expired: string; unknown: string; loading: string; mine: string; board: string; home: string; guest: string; notHere: string; offline: string;
    };
    vs: { win: string; lose: string; tie: string; you: string; versus: string; back: string; again: string; revenge: string; saved: string; guestNote: string; first: string; share: string; shareText: (game: string, score: string) => string };
    won: string; lost: string; score: string; time: string;
    card: { kicker: string; cta: string; vs: string };
  };
}

const en: ArenaStrings = {
  hall: {
    title: 'Card room level', level: 'Level', toNext: 'to the next level',
    ranks: ['Newcomer', 'Regular', 'Card sharp', 'High roller', 'Legend of the room'],
    showcase: 'Your showcase', empty: 'Finish a game and your records appear here.', best: 'Best', fastest: 'Fastest', streak: 'Streak', wins: 'Wins',
  },
  today: {
    gotd: 'Game of the day', bonus: '+50% rewards', gotdSub: 'Every game of it pays half as much again today.', earned: 'Bonus today', play: 'Play',
    marathon: 'Marathon', marathonSub: 'Play 3 different games today', open: 'Open chest', opened: 'Opened — new chest tomorrow', chest: 'Chest', signIn: 'Sign in for the chest',
  },
  tour: {
    kicker: 'Weekly tournament', title: 'Tournament', endsIn: 'Ends in', units: { d: 'd', h: 'h', m: 'm', s: 's' },
    metric: { wins: 'Most wins', score: 'Best score' }, points: { wins: 'wins', score: 'pts' },
    rank: 'Your rank', unranked: 'Not ranked yet', qualify: 'Qualify: 3 games + a win', players: 'Players', free: 'Free entry',
    play: 'Play now', standings: 'Standings', prizes: 'Prizes', prizeLine: '+ title & frame',
    tiers: { gold: '1st', silver: '2nd', bronze: '3rd', top10: 'Top 10%' },
    items: { champion: 'Title “Champion”', podium: 'Title “Finalist”', frame: 'Frame “Podium Laurel”', badge: 'Top 10% badge' },
    rules: g => `Every game of ${g} you play this week counts. Entry is free; prizes are paid when the week ends (Monday, Riga time).`,
    empty: 'Nobody has played yet — take the lead.', error: 'The standings did not load.', retry: 'Retry', you: 'you',
    guest: 'Sign in to enter — it is free.', signIn: 'Sign in', lastWeek: 'Last week', noGame: 'Coming to your app soon',
    claim: { title: 'Tournament prize!', sub: g => `Your result in ${g} last week`, collect: 'Collect', collecting: 'Collecting…', done: 'Added to your wardrobe', equip: 'Equip it in Profile → Style' },
  },
  challenge: {
    cta: 'Challenge a friend', ctaSub: 'Play a deal, then send them the very same one.', pick: 'Pick a game', pickSub: 'Play it first — your result becomes the score to beat.',
    mine: 'Your challenges', answers: 'answers', beaten: 'beat you', noneYet: 'No challenges sent yet.',
    prompt: 'Challenge a friend', sameDeal: 'Same deal', ownDeal: 'Beat my score', yourResult: 'Your result',
    creating: 'Creating your challenge…', link: 'Challenge link', copy: 'Copy link', copied: 'Copied', share: 'Send', image: 'Share image', saved: 'Image saved — the link is copied',
    error: 'Could not create the challenge.', retry: 'Try again', signIn: 'Sign in', signInSub: 'Challenges are saved to your account.', limit: 'That is enough challenges for today.',
    shareText: (g, r) => `Can you beat my ${r} in ${g}? Same deal, one try — Bridge 125`,
    landing: {
      kicker: 'Challenge', from: n => `${n} challenges you`, toBeat: 'Score to beat', play: 'Accept & play',
      sameDeal: 'You get the very same deal', ownDeal: 'Your own deal — just beat the score',
      expired: 'This challenge has expired.', unknown: 'This challenge does not exist.', loading: 'Shuffling…',
      mine: 'This is your challenge — send it to a friend.', board: 'Who took it on', home: 'Open Bridge 125',
      guest: 'Playing as a guest — sign in to save your result.', notHere: 'This game is not in your version yet — update the app.', offline: 'Challenges need a connection.',
    },
    vs: {
      win: 'You won the challenge!', lose: 'Not this time', tie: 'Dead heat', you: 'You', versus: 'vs', back: 'Back to games', again: 'Play again',
      revenge: 'Challenge them back', saved: 'Result saved', guestNote: 'Sign in to save your result and appear on the challenge board.', first: 'Only your first try counts.',
      share: 'Share result', shareText: (g, s) => `Challenge in ${g}: ${s}. Your turn — Bridge 125`,
    },
    won: 'Won', lost: 'Lost', score: 'Score', time: 'Time',
    card: { kicker: 'Challenge', cta: 'Can you beat me?', vs: 'VS' },
  },
};

const lv: ArenaStrings = {
  hall: {
    title: 'Kāršu zāles līmenis', level: 'Līmenis', toNext: 'līdz nākamajam līmenim',
    ranks: ['Jaunpienācējs', 'Pastāvīgais viesis', 'Kāršu meistars', 'Lielais spēlētājs', 'Zāles leģenda'],
    showcase: 'Tava vitrīna', empty: 'Pabeidz spēli — un tavi rekordi parādīsies šeit.', best: 'Labākais', fastest: 'Ātrākais', streak: 'Sērija', wins: 'Uzvaras',
  },
  today: {
    gotd: 'Dienas spēle', bonus: '+50% balvas', gotdSub: 'Šodien katra tās spēle maksā pusotru reizi vairāk.', earned: 'Bonuss šodien', play: 'Spēlēt',
    marathon: 'Maratons', marathonSub: 'Šodien uzspēlē 3 dažādas spēles', open: 'Atvērt lādi', opened: 'Atvērta — jauna lāde rīt', chest: 'Lāde', signIn: 'Ienāc, lai saņemtu lādi',
  },
  tour: {
    kicker: 'Nedēļas turnīrs', title: 'Turnīrs', endsIn: 'Beigsies pēc', units: { d: 'd', h: 'h', m: 'm', s: 's' },
    metric: { wins: 'Visvairāk uzvaru', score: 'Labākais rezultāts' }, points: { wins: 'uzv.', score: 'p.' },
    rank: 'Tava vieta', unranked: 'Vēl nav vietas', qualify: 'Kvalifikācija: 3 spēles + uzvara', players: 'Spēlētāji', free: 'Dalība bez maksas',
    play: 'Spēlēt tagad', standings: 'Tabula', prizes: 'Balvas', prizeLine: '+ tituls un rāmis',
    tiers: { gold: '1. vieta', silver: '2. vieta', bronze: '3. vieta', top10: 'Top 10%' },
    items: { champion: 'Tituls “Čempions”', podium: 'Tituls “Finālists”', frame: 'Rāmis “Pjedestāla lauri”', badge: 'Top 10% nozīmīte' },
    rules: g => `Skaitās katra spēle “${g}”, ko šonedēļ uzspēlē. Dalība bez maksas; balvas izmaksā, kad nedēļa beidzas (pirmdien, Rīgas laikā).`,
    empty: 'Vēl neviens nav spēlējis — ieņem vadību.', error: 'Tabulu neizdevās ielādēt.', retry: 'Mēģināt vēlreiz', you: 'tu',
    guest: 'Ienāc, lai piedalītos — tas ir bez maksas.', signIn: 'Ienākt', lastWeek: 'Pagājušā nedēļa', noGame: 'Drīzumā tavā lietotnē',
    claim: { title: 'Turnīra balva!', sub: g => `Tavs rezultāts spēlē “${g}” pagājušajā nedēļā`, collect: 'Saņemt', collecting: 'Saņem…', done: 'Pievienots tavai garderobei', equip: 'Uzvelc to: Profils → Stils' },
  },
  challenge: {
    cta: 'Izaicini draugu', ctaSub: 'Izspēlē dalījumu un nosūti draugam tieši to pašu.', pick: 'Izvēlies spēli', pickSub: 'Vispirms nospēlē pats — tavs rezultāts būs jāpārspēj.',
    mine: 'Tavi izaicinājumi', answers: 'atbildes', beaten: 'pārspēja tevi', noneYet: 'Vēl neesi nosūtījis nevienu izaicinājumu.',
    prompt: 'Izaicini draugu', sameDeal: 'Tas pats dalījums', ownDeal: 'Pārspēj manu rezultātu', yourResult: 'Tavs rezultāts',
    creating: 'Veido izaicinājumu…', link: 'Izaicinājuma saite', copy: 'Kopēt saiti', copied: 'Nokopēts', share: 'Sūtīt', image: 'Dalīties ar attēlu', saved: 'Attēls saglabāts — saite nokopēta',
    error: 'Izaicinājumu neizdevās izveidot.', retry: 'Mēģināt vēlreiz', signIn: 'Ienākt', signInSub: 'Izaicinājumi tiek saglabāti tavā kontā.', limit: 'Šodienai izaicinājumu pietiek.',
    shareText: (g, r) => `Vai vari pārspēt manu ${r} spēlē “${g}”? Tas pats dalījums, viens mēģinājums — Bridge 125`,
    landing: {
      kicker: 'Izaicinājums', from: n => `${n} tevi izaicina`, toBeat: 'Jāpārspēj', play: 'Pieņemt un spēlēt',
      sameDeal: 'Tu saņemsi tieši to pašu dalījumu', ownDeal: 'Tavs dalījums — vienkārši pārspēj rezultātu',
      expired: 'Šim izaicinājumam beidzies termiņš.', unknown: 'Tāda izaicinājuma nav.', loading: 'Jaucam kārtis…',
      mine: 'Šis ir tavs izaicinājums — nosūti to draugam.', board: 'Kas pieņēma izaicinājumu', home: 'Atvērt Bridge 125',
      guest: 'Spēlē kā viesis — ienāc, lai saglabātu rezultātu.', notHere: 'Šīs spēles tavā versijā vēl nav — atjauno lietotni.', offline: 'Izaicinājumiem vajag savienojumu.',
    },
    vs: {
      win: 'Tu uzvarēji izaicinājumā!', lose: 'Šoreiz ne', tie: 'Neizšķirts', you: 'Tu', versus: 'pret', back: 'Atpakaļ uz spēlēm', again: 'Spēlēt vēlreiz',
      revenge: 'Izaicini atpakaļ', saved: 'Rezultāts saglabāts', guestNote: 'Ienāc, lai saglabātu rezultātu un parādītos izaicinājuma tabulā.', first: 'Skaitās tikai pirmais mēģinājums.',
      share: 'Dalīties ar rezultātu', shareText: (g, s) => `Izaicinājums spēlē “${g}”: ${s}. Tava kārta — Bridge 125`,
    },
    won: 'Uzvara', lost: 'Zaudējums', score: 'Punkti', time: 'Laiks',
    card: { kicker: 'Izaicinājums', cta: 'Vai vari mani pārspēt?', vs: 'VS' },
  },
};

const ru: ArenaStrings = {
  hall: {
    title: 'Уровень карточного зала', level: 'Уровень', toNext: 'до следующего уровня',
    ranks: ['Новичок', 'Завсегдатай', 'Знаток карт', 'Хайроллер', 'Легенда зала'],
    showcase: 'Твоя витрина', empty: 'Сыграй партию — и твои рекорды появятся здесь.', best: 'Лучший', fastest: 'Быстрее всего', streak: 'Серия', wins: 'Победы',
  },
  today: {
    gotd: 'Игра дня', bonus: '+50% к наградам', gotdSub: 'Сегодня каждая её партия приносит в полтора раза больше.', earned: 'Бонус сегодня', play: 'Играть',
    marathon: 'Марафон', marathonSub: 'Сыграй сегодня в 3 разные игры', open: 'Открыть сундук', opened: 'Открыт — новый сундук завтра', chest: 'Сундук', signIn: 'Войди, чтобы открыть сундук',
  },
  tour: {
    kicker: 'Турнир недели', title: 'Турнир', endsIn: 'До конца', units: { d: 'д', h: 'ч', m: 'м', s: 'с' },
    metric: { wins: 'Больше всех побед', score: 'Лучший счёт' }, points: { wins: 'поб.', score: 'очк.' },
    rank: 'Твоё место', unranked: 'Пока без места', qualify: 'Допуск: 3 партии + победа', players: 'Игроки', free: 'Участие бесплатно',
    play: 'Играть', standings: 'Таблица', prizes: 'Призы', prizeLine: '+ титул и рамка',
    tiers: { gold: '1-е место', silver: '2-е место', bronze: '3-е место', top10: 'Топ 10%' },
    items: { champion: 'Титул «Чемпион»', podium: 'Титул «Финалист»', frame: 'Рамка «Лавры пьедестала»', badge: 'Значок «Топ 10%»' },
    rules: g => `Засчитывается каждая партия в «${g}» на этой неделе. Участие бесплатное; призы выдаются в конце недели (в понедельник по рижскому времени).`,
    empty: 'Ещё никто не играл — займи первое место.', error: 'Таблица не загрузилась.', retry: 'Повторить', you: 'ты',
    guest: 'Войди, чтобы участвовать — это бесплатно.', signIn: 'Войти', lastWeek: 'Прошлая неделя', noGame: 'Скоро в твоём приложении',
    claim: { title: 'Приз турнира!', sub: g => `Твой результат в «${g}» на прошлой неделе`, collect: 'Забрать', collecting: 'Забираем…', done: 'Добавлено в гардероб', equip: 'Надень в Профиль → Стиль' },
  },
  challenge: {
    cta: 'Вызови друга', ctaSub: 'Сыграй раздачу и отправь другу точно такую же.', pick: 'Выбери игру', pickSub: 'Сначала сыграй сам — твой результат нужно будет побить.',
    mine: 'Твои вызовы', answers: 'ответов', beaten: 'обошли тебя', noneYet: 'Ты ещё не отправлял вызовов.',
    prompt: 'Вызови друга', sameDeal: 'Та же раздача', ownDeal: 'Побей мой счёт', yourResult: 'Твой результат',
    creating: 'Создаём вызов…', link: 'Ссылка на вызов', copy: 'Копировать', copied: 'Скопировано', share: 'Отправить', image: 'Картинка', saved: 'Картинка сохранена — ссылка скопирована',
    error: 'Не удалось создать вызов.', retry: 'Ещё раз', signIn: 'Войти', signInSub: 'Вызовы сохраняются в твоём аккаунте.', limit: 'На сегодня вызовов достаточно.',
    shareText: (g, r) => `Побьёшь мой результат ${r} в «${g}»? Та же раздача, одна попытка — Bridge 125`,
    landing: {
      kicker: 'Вызов', from: n => `${n} бросает тебе вызов`, toBeat: 'Нужно побить', play: 'Принять и играть',
      sameDeal: 'Тебе достанется точно такая же раздача', ownDeal: 'Своя раздача — просто побей результат',
      expired: 'Срок этого вызова истёк.', unknown: 'Такого вызова нет.', loading: 'Тасуем…',
      mine: 'Это твой вызов — отправь его другу.', board: 'Кто принял вызов', home: 'Открыть Bridge 125',
      guest: 'Ты играешь как гость — войди, чтобы сохранить результат.', notHere: 'Этой игры пока нет в твоей версии — обнови приложение.', offline: 'Для вызовов нужно подключение.',
    },
    vs: {
      win: 'Ты выиграл вызов!', lose: 'Не в этот раз', tie: 'Ничья', you: 'Ты', versus: 'против', back: 'К играм', again: 'Ещё раз',
      revenge: 'Брось ответный вызов', saved: 'Результат сохранён', guestNote: 'Войди, чтобы сохранить результат и попасть в таблицу вызова.', first: 'Засчитывается только первая попытка.',
      share: 'Поделиться', shareText: (g, s) => `Вызов в «${g}»: ${s}. Твой ход — Bridge 125`,
    },
    won: 'Победа', lost: 'Поражение', score: 'Счёт', time: 'Время',
    card: { kicker: 'Вызов', cta: 'Сможешь меня обойти?', vs: 'VS' },
  },
};

const uk: ArenaStrings = {
  hall: {
    title: 'Рівень карткової зали', level: 'Рівень', toNext: 'до наступного рівня',
    ranks: ['Новачок', 'Завсідник', 'Знавець карт', 'Хайролер', 'Легенда зали'],
    showcase: 'Твоя вітрина', empty: 'Зіграй партію — і твої рекорди з’являться тут.', best: 'Найкращий', fastest: 'Найшвидше', streak: 'Серія', wins: 'Перемоги',
  },
  today: {
    gotd: 'Гра дня', bonus: '+50% до нагород', gotdSub: 'Сьогодні кожна її партія приносить у півтора раза більше.', earned: 'Бонус сьогодні', play: 'Грати',
    marathon: 'Марафон', marathonSub: 'Зіграй сьогодні в 3 різні гри', open: 'Відкрити скриню', opened: 'Відкрито — нова скриня завтра', chest: 'Скриня', signIn: 'Увійди, щоб відкрити скриню',
  },
  tour: {
    kicker: 'Турнір тижня', title: 'Турнір', endsIn: 'До кінця', units: { d: 'д', h: 'г', m: 'х', s: 'с' },
    metric: { wins: 'Найбільше перемог', score: 'Найкращий рахунок' }, points: { wins: 'пер.', score: 'оч.' },
    rank: 'Твоє місце', unranked: 'Поки без місця', qualify: 'Допуск: 3 партії + перемога', players: 'Гравці', free: 'Участь безкоштовна',
    play: 'Грати', standings: 'Таблиця', prizes: 'Призи', prizeLine: '+ титул і рамка',
    tiers: { gold: '1-ше місце', silver: '2-ге місце', bronze: '3-тє місце', top10: 'Топ 10%' },
    items: { champion: 'Титул «Чемпіон»', podium: 'Титул «Фіналіст»', frame: 'Рамка «Лаври п’єдесталу»', badge: 'Значок «Топ 10%»' },
    rules: g => `Зараховується кожна партія в «${g}» цього тижня. Участь безкоштовна; призи видаються наприкінці тижня (у понеділок за ризьким часом).`,
    empty: 'Ще ніхто не грав — займи перше місце.', error: 'Таблиця не завантажилася.', retry: 'Повторити', you: 'ти',
    guest: 'Увійди, щоб узяти участь — це безкоштовно.', signIn: 'Увійти', lastWeek: 'Минулий тиждень', noGame: 'Незабаром у твоєму застосунку',
    claim: { title: 'Приз турніру!', sub: g => `Твій результат у «${g}» минулого тижня`, collect: 'Забрати', collecting: 'Забираємо…', done: 'Додано до гардероба', equip: 'Вдягни в Профіль → Стиль' },
  },
  challenge: {
    cta: 'Виклич друга', ctaSub: 'Зіграй роздачу й надішли другові точнісінько таку саму.', pick: 'Обери гру', pickSub: 'Спершу зіграй сам — твій результат треба буде побити.',
    mine: 'Твої виклики', answers: 'відповідей', beaten: 'обійшли тебе', noneYet: 'Ти ще не надсилав викликів.',
    prompt: 'Виклич друга', sameDeal: 'Та сама роздача', ownDeal: 'Побий мій рахунок', yourResult: 'Твій результат',
    creating: 'Створюємо виклик…', link: 'Посилання на виклик', copy: 'Копіювати', copied: 'Скопійовано', share: 'Надіслати', image: 'Картинка', saved: 'Картинку збережено — посилання скопійовано',
    error: 'Не вдалося створити виклик.', retry: 'Ще раз', signIn: 'Увійти', signInSub: 'Виклики зберігаються у твоєму акаунті.', limit: 'На сьогодні викликів досить.',
    shareText: (g, r) => `Поб’єш мій результат ${r} у «${g}»? Та сама роздача, одна спроба — Bridge 125`,
    landing: {
      kicker: 'Виклик', from: n => `${n} кидає тобі виклик`, toBeat: 'Треба побити', play: 'Прийняти й грати',
      sameDeal: 'Тобі дістанеться точнісінько та сама роздача', ownDeal: 'Своя роздача — просто побий результат',
      expired: 'Термін цього виклику минув.', unknown: 'Такого виклику немає.', loading: 'Тасуємо…',
      mine: 'Це твій виклик — надішли його другові.', board: 'Хто прийняв виклик', home: 'Відкрити Bridge 125',
      guest: 'Ти граєш як гість — увійди, щоб зберегти результат.', notHere: 'Цієї гри ще немає у твоїй версії — онови застосунок.', offline: 'Для викликів потрібне з’єднання.',
    },
    vs: {
      win: 'Ти виграв виклик!', lose: 'Не цього разу', tie: 'Нічия', you: 'Ти', versus: 'проти', back: 'До ігор', again: 'Ще раз',
      revenge: 'Кинь виклик у відповідь', saved: 'Результат збережено', guestNote: 'Увійди, щоб зберегти результат і потрапити до таблиці виклику.', first: 'Зараховується лише перша спроба.',
      share: 'Поділитися', shareText: (g, s) => `Виклик у «${g}»: ${s}. Твій хід — Bridge 125`,
    },
    won: 'Перемога', lost: 'Поразка', score: 'Рахунок', time: 'Час',
    card: { kicker: 'Виклик', cta: 'Зможеш мене обійти?', vs: 'VS' },
  },
};

export const ARENA_STRINGS: Strings<ArenaStrings> = { en, lv, ru, uk };

import { registerStrings } from './pick';
registerStrings('arena', ARENA_STRINGS);
