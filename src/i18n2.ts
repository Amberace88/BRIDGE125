import type { Lang } from './i18n';

export interface Extra {
  nav: { howToPlay: string; signIn: string; play: string };
  heroLine: string;
  features: string[];
  playFriends: string;
  guide: {
    title: string; intro: string;
    tabs: { basics: string; special: string; combos: string; scoring: string };
    steps: { h: string; p: string }[];
    tags: { A: string; '6': string; '7': string; '8': string; '9': string; J: string; QS: string; K: string };
    combos: { h: string; p: string }[];
    pointsTitle: string;
    line: { start: string; burn: string; end: string };
    example: string; youCanPlay: string; cta: string;
  };
  auth: {
    title: string; sub: string; benefits: string[]; email: string; cont: string; hint: string;
    codeTitle: string; codeSub: (e: string) => string; verify: string; resend: string; resendIn: (s: number) => string;
    wrong: string; change: string; welcome: string; stats: { games: string; wins: string; bm: string };
  };
  room: {
    create: string; join: string; code: string; enterCode: string; invite: string; copied: string; waiting: string;
    addBot: string; removeBot: string; start: string; needTwo: string; host: string; waitHost: string;
    connecting: string; reconnecting: string; full: string; notFound: string; leave: string; seatsOf: (n: number, m: number) => string;
    shareText: string; online: string; bot: string;
  };
}

const en: Extra = {
  nav: { howToPlay: 'How to play', signIn: 'Sign in', play: 'Play' },
  heroLine: 'The classic Bridge card game — queen of spades, jacks ×5 and the famous 125.',
  features: ['Play free in your browser', 'English, Latviešu, Русский, Українська', 'Install it like an app'],
  playFriends: 'Play with friends',
  guide: {
    title: 'How to play', intro: 'Get rid of your cards, dodge the penalties, keep your score low. Here is everything in five minutes.',
    tabs: { basics: 'Basics', special: 'Special cards', combos: 'Combos', scoring: 'Scoring' },
    steps: [
      { h: 'Match the top card', p: 'Play a card of the same suit or the same rank. Several cards of one rank can go down together.' },
      { h: 'Empty your hand', p: 'The first player out ends the round. Everyone else counts the points left in their hand.' },
      { h: 'Stay low', p: 'Scores add up over rounds. When anyone reaches 130 the game ends and the lowest score wins.' },
    ],
    tags: { A: 'Skip', '6': 'Cover it', '7': '+1', '8': '+2, chain', '9': 'Wild', J: 'Wild + suit', QS: '+5', K: 'Reset' },
    combos: [
      { h: 'Queen of spades, passed on', p: 'Hit by Q♠? Answer with the 6♠ and the next player draws 6 instead — and has to cover it.' },
      { h: 'Chain of eights', p: 'Each 8 adds two cards. Answer an 8 with your own and pass on 4, 6 or 8.' },
      { h: 'Finish with jacks', p: 'Go out with 1–4 jacks at once and every opponent’s points are multiplied ×2 to ×5.' },
    ],
    pointsTitle: 'Points left in hand at the end of a round',
    line: { start: 'Start', burn: 'Exactly 125 → back to 0', end: '130+ → game over' },
    example: 'Example', youCanPlay: 'You can play', cta: 'Play a practice game',
  },
  auth: {
    title: 'Save your progress', sub: 'Create a free account in seconds. No password — we email you a code.',
    benefits: ['Your own table and colours', 'Wins and games saved on every device', 'Ready for leagues and tournaments'],
    email: 'Email', cont: 'Send code', hint: 'By continuing you agree to play fair and have fun.',
    codeTitle: 'Enter your code', codeSub: e => `We sent a 6-digit code to ${e}`, verify: 'Sign in', resend: 'Send a new code',
    resendIn: s => `New code in ${s}s`, wrong: 'That code didn’t work. Check it or send a new one.', change: 'Use another email',
    welcome: 'You’re in!', stats: { games: 'Games', wins: 'Wins', bm: 'Bridge Money' },
  },
  room: {
    create: 'Create a table', join: 'Join', code: 'Table code', enterCode: 'Enter code', invite: 'Invite friends', copied: 'Link copied',
    waiting: 'Waiting for players…', addBot: 'Add bot', removeBot: 'Remove bot', start: 'Start game', needTwo: 'At least 2 players needed',
    host: 'Host', waitHost: 'Waiting for the host to start', connecting: 'Connecting…', reconnecting: 'Reconnecting…',
    full: 'This table is full', notFound: 'Table not found', leave: 'Leave table', seatsOf: (n, m) => `${n} of ${m} seats`,
    shareText: 'Join my Bridge 125 table', online: 'online', bot: 'Bot',
  },
};

const lv: Extra = {
  nav: { howToPlay: 'Kā spēlēt', signIn: 'Ienākt', play: 'Spēlēt' },
  heroLine: 'Klasiskā Bridža kāršu spēle — pīķa dāma, kalpi ×5 un slavenie 125.',
  features: ['Spēlē bez maksas pārlūkā', 'English, Latviešu, Русский, Українська', 'Uzstādi kā lietotni'],
  playFriends: 'Spēlēt ar draugiem',
  guide: {
    title: 'Kā spēlēt', intro: 'Atbrīvojies no kārtīm, izvairies no sodiem un turi punktus zemu. Viss, kas jāzina, piecās minūtēs.',
    tabs: { basics: 'Pamati', special: 'Īpašās kārtis', combos: 'Kombinācijas', scoring: 'Punkti' },
    steps: [
      { h: 'Liec uz virsējās kārts', p: 'Liec tās pašas masts vai vērtības kārti. Vairākas vienas vērtības kārtis var likt reizē.' },
      { h: 'Iztukšo roku', p: 'Pirmais, kurš izliek visas kārtis, beidz raundu. Pārējie saskaita punktus rokā.' },
      { h: 'Turi punktus zemu', p: 'Punkti krājas raundu pēc raunda. Kad kāds sasniedz 130, spēle beidzas un uzvar mazākais rezultāts.' },
    ],
    tags: { A: 'Izlaiž', '6': 'Jānosedz', '7': '+1', '8': '+2, ķēde', '9': 'Jokeris', J: 'Jokeris + masts', QS: '+5', K: 'Nonullē' },
    combos: [
      { h: 'Pīķa dāmu pārsūti tālāk', p: 'Tev uzlika Q♠? Atbildi ar 6♠ — nākamais paņem 6 kārtis un tam tā jānosedz.' },
      { h: 'Astotnieku ķēde', p: 'Katrs 8 pieliek divas kārtis. Atbildi ar savu 8 un pārsūti 4, 6 vai 8.' },
      { h: 'Finišs ar kalpiem', p: 'Izliec pēdējās kārtis ar 1–4 kalpiem reizē — visu pretinieku punkti reizinās ×2 līdz ×5.' },
    ],
    pointsTitle: 'Punkti par kārtīm, kas raunda beigās palikušas rokā',
    line: { start: 'Sākums', burn: 'Tieši 125 → atpakaļ uz 0', end: '130+ → spēles beigas' },
    example: 'Piemērs', youCanPlay: 'Vari likt', cta: 'Spēlēt treniņa spēli',
  },
  auth: {
    title: 'Saglabā savu progresu', sub: 'Bezmaksas konts dažās sekundēs. Bez paroles — atsūtīsim kodu e-pastā.',
    benefits: ['Savs galds un krāsas', 'Uzvaras un spēles saglabātas visās ierīcēs', 'Gatavs līgām un turnīriem'],
    email: 'E-pasts', cont: 'Sūtīt kodu', hint: 'Turpinot tu apņemies spēlēt godīgi un izbaudīt spēli.',
    codeTitle: 'Ievadi kodu', codeSub: e => `Nosūtījām 6 ciparu kodu uz ${e}`, verify: 'Ienākt', resend: 'Sūtīt jaunu kodu',
    resendIn: s => `Jauns kods pēc ${s} s`, wrong: 'Kods neder. Pārbaudi to vai pieprasi jaunu.', change: 'Cits e-pasts',
    welcome: 'Tu esi iekšā!', stats: { games: 'Spēles', wins: 'Uzvaras', bm: 'Bridge Money' },
  },
  room: {
    create: 'Izveidot galdu', join: 'Pievienoties', code: 'Galda kods', enterCode: 'Ievadi kodu', invite: 'Uzaicināt draugus', copied: 'Saite nokopēta',
    waiting: 'Gaidām spēlētājus…', addBot: 'Pievienot botu', removeBot: 'Noņemt botu', start: 'Sākt spēli', needTwo: 'Vajag vismaz 2 spēlētājus',
    host: 'Saimnieks', waitHost: 'Gaidām, kad saimnieks sāks', connecting: 'Savienojas…', reconnecting: 'Atjauno savienojumu…',
    full: 'Galds ir pilns', notFound: 'Galds nav atrasts', leave: 'Pamest galdu', seatsOf: (n, m) => `${n} no ${m} vietām`,
    shareText: 'Pievienojies manam Bridge 125 galdam', online: 'tiešsaistē', bot: 'Bots',
  },
};

const ru: Extra = {
  nav: { howToPlay: 'Как играть', signIn: 'Войти', play: 'Играть' },
  heroLine: 'Классический Бридж — дама пик, валеты ×5 и знаменитые 125.',
  features: ['Играйте бесплатно в браузере', 'English, Latviešu, Русский, Українська', 'Устанавливается как приложение'],
  playFriends: 'Играть с друзьями',
  guide: {
    title: 'Как играть', intro: 'Избавьтесь от карт, уходите от штрафов и держите счёт низким. Всё самое важное за пять минут.',
    tabs: { basics: 'Основы', special: 'Особые карты', combos: 'Комбинации', scoring: 'Очки' },
    steps: [
      { h: 'Кладите на верхнюю карту', p: 'Карта той же масти или того же достоинства. Несколько карт одного достоинства можно класть сразу.' },
      { h: 'Освободите руку', p: 'Кто первым сбросил все карты, заканчивает раунд. Остальные считают очки на руке.' },
      { h: 'Держите счёт низким', p: 'Очки копятся от раунда к раунду. Когда у кого-то 130, игра заканчивается — побеждает меньший счёт.' },
    ],
    tags: { A: 'Пропуск', '6': 'Закрыть', '7': '+1', '8': '+2, цепочка', '9': 'Любая масть', J: 'Заказ масти', QS: '+5', K: 'Обнуление' },
    combos: [
      { h: 'Дама пик — дальше', p: 'Пришла Д♠? Ответьте 6♠ — следующий берёт 6 карт и должен её закрыть.' },
      { h: 'Цепочка восьмёрок', p: 'Каждая 8 добавляет две карты. Ответьте своей восьмёркой и переведите 4, 6 или 8.' },
      { h: 'Финиш валетами', p: 'Сбросьте последние карты 1–4 валетами сразу — очки соперников ×2…×5.' },
    ],
    pointsTitle: 'Очки за карты, оставшиеся на руке в конце раунда',
    line: { start: 'Старт', burn: 'Ровно 125 → снова 0', end: '130+ → конец игры' },
    example: 'Пример', youCanPlay: 'Можно сыграть', cta: 'Сыграть тренировочную партию',
  },
  auth: {
    title: 'Сохраните прогресс', sub: 'Бесплатный аккаунт за секунды. Без пароля — пришлём код на почту.',
    benefits: ['Свой стол и цвета', 'Победы и партии на всех устройствах', 'Готов к лигам и турнирам'],
    email: 'E-mail', cont: 'Отправить код', hint: 'Продолжая, вы обещаете играть честно и получать удовольствие.',
    codeTitle: 'Введите код', codeSub: e => `Мы отправили 6-значный код на ${e}`, verify: 'Войти', resend: 'Отправить новый код',
    resendIn: s => `Новый код через ${s} с`, wrong: 'Код не подошёл. Проверьте его или запросите новый.', change: 'Другой e-mail',
    welcome: 'Готово!', stats: { games: 'Партии', wins: 'Победы', bm: 'Bridge Money' },
  },
  room: {
    create: 'Создать стол', join: 'Войти', code: 'Код стола', enterCode: 'Введите код', invite: 'Пригласить друзей', copied: 'Ссылка скопирована',
    waiting: 'Ждём игроков…', addBot: 'Добавить бота', removeBot: 'Убрать бота', start: 'Начать игру', needTwo: 'Нужно минимум 2 игрока',
    host: 'Хозяин', waitHost: 'Ждём, когда хозяин начнёт', connecting: 'Подключение…', reconnecting: 'Переподключение…',
    full: 'Стол заполнен', notFound: 'Стол не найден', leave: 'Покинуть стол', seatsOf: (n, m) => `${n} из ${m} мест`,
    shareText: 'Присоединяйся к моему столу Bridge 125', online: 'в сети', bot: 'Бот',
  },
};

const uk: Extra = {
  nav: { howToPlay: 'Як грати', signIn: 'Увійти', play: 'Грати' },
  heroLine: 'Класичний Бридж — пікова дама, валети ×5 і знамениті 125.',
  features: ['Грайте безкоштовно в браузері', 'English, Latviešu, Русский, Українська', 'Встановлюється як застосунок'],
  playFriends: 'Грати з друзями',
  guide: {
    title: 'Як грати', intro: 'Позбудьтеся карт, уникайте штрафів і тримайте рахунок низьким. Усе головне за п’ять хвилин.',
    tabs: { basics: 'Основи', special: 'Особливі карти', combos: 'Комбінації', scoring: 'Очки' },
    steps: [
      { h: 'Кладіть на верхню карту', p: 'Карта тієї ж масті або тієї ж гідності. Кілька карт однієї гідності можна класти одразу.' },
      { h: 'Звільніть руку', p: 'Хто першим скинув усі карти, завершує раунд. Інші рахують очки на руці.' },
      { h: 'Тримайте рахунок низьким', p: 'Очки накопичуються. Коли в когось 130, гра закінчується — перемагає менший рахунок.' },
    ],
    tags: { A: 'Пропуск', '6': 'Закрити', '7': '+1', '8': '+2, ланцюг', '9': 'Будь-яка масть', J: 'Замовлення масті', QS: '+5', K: 'Обнулення' },
    combos: [
      { h: 'Пікова дама — далі', p: 'Прийшла Д♠? Відповідайте 6♠ — наступний бере 6 карт і має її закрити.' },
      { h: 'Ланцюг вісімок', p: 'Кожна 8 додає дві карти. Відповідайте своєю вісімкою і переведіть 4, 6 або 8.' },
      { h: 'Фініш валетами', p: 'Скиньте останні карти 1–4 валетами одразу — очки суперників ×2…×5.' },
    ],
    pointsTitle: 'Очки за карти, що залишилися на руці наприкінці раунду',
    line: { start: 'Старт', burn: 'Рівно 125 → знову 0', end: '130+ → кінець гри' },
    example: 'Приклад', youCanPlay: 'Можна зіграти', cta: 'Зіграти тренувальну партію',
  },
  auth: {
    title: 'Збережіть прогрес', sub: 'Безкоштовний акаунт за секунди. Без пароля — надішлемо код на пошту.',
    benefits: ['Свій стіл і кольори', 'Перемоги та партії на всіх пристроях', 'Готовий до ліг і турнірів'],
    email: 'E-mail', cont: 'Надіслати код', hint: 'Продовжуючи, ви обіцяєте грати чесно й отримувати задоволення.',
    codeTitle: 'Введіть код', codeSub: e => `Ми надіслали 6-значний код на ${e}`, verify: 'Увійти', resend: 'Надіслати новий код',
    resendIn: s => `Новий код через ${s} с`, wrong: 'Код не підійшов. Перевірте його або запросіть новий.', change: 'Інший e-mail',
    welcome: 'Готово!', stats: { games: 'Партії', wins: 'Перемоги', bm: 'Bridge Money' },
  },
  room: {
    create: 'Створити стіл', join: 'Увійти', code: 'Код столу', enterCode: 'Введіть код', invite: 'Запросити друзів', copied: 'Посилання скопійовано',
    waiting: 'Чекаємо гравців…', addBot: 'Додати бота', removeBot: 'Прибрати бота', start: 'Почати гру', needTwo: 'Потрібно щонайменше 2 гравці',
    host: 'Господар', waitHost: 'Чекаємо, поки господар почне', connecting: 'Підключення…', reconnecting: 'Перепідключення…',
    full: 'Стіл заповнений', notFound: 'Стіл не знайдено', leave: 'Залишити стіл', seatsOf: (n, m) => `${n} з ${m} місць`,
    shareText: 'Приєднуйся до мого столу Bridge 125', online: 'онлайн', bot: 'Бот',
  },
};

export const EXTRA: Record<Lang, Extra> = { en, lv, ru, uk };
