import type { Strings } from './pick';

/**
 * Games hub (/games), the shared game-over sheet and the per-game leaderboards. English is mandatory; lv / ru / uk live
 * here, the 13 lazily loaded languages translate it in their pack (src/i18n/locales/<lang>.ts → `games`).
 * Counts are shown next to a label (never inside a sentence), so no plural rules are needed.
 */
export interface GamesStrings {
  title: string; kicker: string; sub: string; close: string;
  main: { tag: string; sub: string; play: string; level: string; wins: string };
  more: string; moreSub: string;
  tile: {
    daily: string; dailyDone: string; local: string; best: string; fastest: string; streak: string;
    wins: string; played: string; fresh: string; perWin: string; solo: string; board: string; play: string;
  };
  empty: { title: string; sub: string };
  quest: string;
  guest: { title: string; sub: string; signIn: string };
  result: {
    won: string; lost: string; solved: string; unsolved: string;
    score: string; time: string; level: string; best: string; newBest: string; streak: string;
    rewards: string; dailyBonus: string; medal: string; quest: string; levelUp: string; stars: string;
    sending: string; offline: string; guest: string; signIn: string; capped: string; fast: string; slow: string; error: string;
    again: string; back: string; share: string; copied: string;
    shareText: (game: string, score: string) => string;
  };
  board: {
    title: string; tabs: { best: string; week: string; daily: string }; hint: { best: string; week: string; daily: string };
    wins: string; empty: string; emptyDaily: string; error: string; retry: string; you: string; guest: string;
  };
  levels: { easy: string; normal: string; hard: string; expert: string };
}

const en: GamesStrings = {
  title: 'Games', kicker: 'Bridge 125 · Card room', close: 'Close',
  sub: 'Bridge is the main table. Here are a few more games for a change of pace — same account, same Bridge Money.',
  main: { tag: 'Main game', sub: 'Get rid of your cards first and keep your points low.', play: 'Play Bridge', level: 'Level', wins: 'Wins' },
  more: 'More games', moreSub: 'Short games between rounds. They pay a little less than Bridge.',
  tile: {
    daily: 'Daily', dailyDone: 'Solved today', local: 'Local classic', best: 'Best', fastest: 'Fastest', streak: 'Streak',
    wins: 'Wins', played: 'Games', fresh: 'Not played yet', perWin: 'a win', solo: 'Solo', board: 'Leaderboard', play: 'Play',
  },
  empty: { title: 'New tables are being set', sub: 'More games are on their way to the card room. Bridge is waiting for you in the meantime.' },
  quest: 'Game quest of the day',
  guest: { title: 'Sign in to keep your records', sub: 'Best scores, streaks, BM and XP are saved to your account.', signIn: 'Sign in' },
  result: {
    won: 'You won!', lost: 'Good game', solved: 'Solved!', unsolved: 'Not this time',
    score: 'Score', time: 'Time', level: 'Level', best: 'Best', newBest: 'New best!', streak: 'Streak',
    rewards: 'Rewards', dailyBonus: 'Daily puzzle bonus', medal: 'Medal', quest: 'Quest', levelUp: 'Level up!', stars: 'Season stars',
    sending: 'Counting your winnings…', offline: "Saved on this device — rewards need a connection.",
    guest: 'Sign in to earn BM and XP and get on the leaderboard.', signIn: 'Sign in',
    capped: "Today's rewards for this game are used up — the game still counts for your records.",
    fast: 'That was too quick to count.', slow: 'One moment — the last game is still being counted.', error: "The server didn't accept this result.",
    again: 'Play again', back: 'Back to games', share: 'Share', copied: 'Copied',
    shareText: (g, s) => `I scored ${s} in ${g} on Bridge 125. Can you beat me?`,
  },
  board: {
    title: 'Leaderboard', tabs: { best: 'All time', week: 'This week', daily: 'Today' },
    hint: { best: 'Best score ever', week: 'Wins in the last 7 days', daily: "Today's daily puzzle" },
    wins: 'wins', empty: 'No scores yet — be the first.', emptyDaily: 'Nobody has solved today’s puzzle yet.',
    error: "Couldn't load the leaderboard.", retry: 'Try again', you: 'you', guest: 'Sign in to get on the board.',
  },
  levels: { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' },
};

const lv: GamesStrings = {
  title: 'Spēles', kicker: 'Bridge 125 · Kāršu zāle', close: 'Aizvērt',
  sub: 'Bridge ir galvenais galds. Šeit ir vēl dažas spēles pārmaiņai — tas pats konts, tie paši Bridge Money.',
  main: { tag: 'Galvenā spēle', sub: 'Atbrīvojies no kārtīm pirmais un turi punktus zemus.', play: 'Spēlēt Bridge', level: 'Līmenis', wins: 'Uzvaras' },
  more: 'Vairāk spēļu', moreSub: 'Īsas spēles starp partijām. Tās maksā mazliet mazāk nekā Bridge.',
  tile: {
    daily: 'Dienas', dailyDone: 'Šodien atrisināts', local: 'Vietējā klasika', best: 'Labākais', fastest: 'Ātrākais', streak: 'Sērija',
    wins: 'Uzvaras', played: 'Spēles', fresh: 'Vēl nav spēlēts', perWin: 'par uzvaru', solo: 'Solo', board: 'Līderu tabula', play: 'Spēlēt',
  },
  empty: { title: 'Jaunie galdi tiek klāti', sub: 'Kāršu zālē drīz būs vairāk spēļu. Pa to laiku tevi gaida Bridge.' },
  quest: 'Dienas spēļu uzdevums',
  guest: { title: 'Ienāc, lai saglabātu rekordus', sub: 'Labākie rezultāti, sērijas, BM un XP tiek saglabāti tavā kontā.', signIn: 'Ienākt' },
  result: {
    won: 'Uzvara!', lost: 'Laba spēle', solved: 'Atrisināts!', unsolved: 'Šoreiz ne',
    score: 'Rezultāts', time: 'Laiks', level: 'Līmenis', best: 'Labākais', newBest: 'Jauns rekords!', streak: 'Sērija',
    rewards: 'Balvas', dailyBonus: 'Dienas mīklas bonuss', medal: 'Medaļa', quest: 'Uzdevums', levelUp: 'Jauns līmenis!', stars: 'Sezonas zvaigznes',
    sending: 'Skaitām laimestu…', offline: 'Saglabāts šajā ierīcē — balvām vajag savienojumu.',
    guest: 'Ienāc, lai pelnītu BM un XP un iekļūtu līderu tabulā.', signIn: 'Ienākt',
    capped: 'Šodienas balvas par šo spēli ir izsmeltas — spēle tomēr skaitās tavos rekordos.',
    fast: 'Tas bija par ātru, lai skaitītos.', slow: 'Mirkli — iepriekšējā spēle vēl tiek skaitīta.', error: 'Serveris šo rezultātu nepieņēma.',
    again: 'Spēlēt vēlreiz', back: 'Atpakaļ uz spēlēm', share: 'Dalīties', copied: 'Nokopēts',
    shareText: (g, s) => `Es ieguvu ${s} spēlē ${g} vietnē Bridge 125. Vai vari labāk?`,
  },
  board: {
    title: 'Līderu tabula', tabs: { best: 'Visu laiku', week: 'Šonedēļ', daily: 'Šodien' },
    hint: { best: 'Labākais rezultāts', week: 'Uzvaras pēdējās 7 dienās', daily: 'Šodienas dienas mīkla' },
    wins: 'uzvaras', empty: 'Vēl nav rezultātu — esi pirmais.', emptyDaily: 'Šodienas mīklu vēl neviens nav atrisinājis.',
    error: 'Neizdevās ielādēt līderu tabulu.', retry: 'Mēģināt vēlreiz', you: 'tu', guest: 'Ienāc, lai iekļūtu tabulā.',
  },
  levels: { easy: 'Viegls', normal: 'Normāls', hard: 'Grūts', expert: 'Eksperts' },
};

const ru: GamesStrings = {
  title: 'Игры', kicker: 'Bridge 125 · Карточный зал', close: 'Закрыть',
  sub: 'Бридж — главный стол. А здесь ещё несколько игр для разнообразия — тот же аккаунт, те же Bridge Money.',
  main: { tag: 'Главная игра', sub: 'Избавься от карт первым и держи очки низкими.', play: 'Играть в Бридж', level: 'Уровень', wins: 'Победы' },
  more: 'Ещё игры', moreSub: 'Короткие игры между партиями. Платят чуть меньше, чем Бридж.',
  tile: {
    daily: 'Ежедневная', dailyDone: 'Решено сегодня', local: 'Местная классика', best: 'Рекорд', fastest: 'Быстрее всего', streak: 'Серия',
    wins: 'Победы', played: 'Игры', fresh: 'Ещё не играл', perWin: 'за победу', solo: 'Соло', board: 'Рейтинг', play: 'Играть',
  },
  empty: { title: 'Новые столы накрываются', sub: 'В карточный зал скоро придут новые игры. А пока тебя ждёт Бридж.' },
  quest: 'Игровое задание дня',
  guest: { title: 'Войди, чтобы сохранять рекорды', sub: 'Рекорды, серии, BM и XP сохраняются в твоём аккаунте.', signIn: 'Войти' },
  result: {
    won: 'Победа!', lost: 'Хорошая игра', solved: 'Решено!', unsolved: 'В этот раз нет',
    score: 'Очки', time: 'Время', level: 'Уровень', best: 'Рекорд', newBest: 'Новый рекорд!', streak: 'Серия',
    rewards: 'Награды', dailyBonus: 'Бонус ежедневной головоломки', medal: 'Медаль', quest: 'Задание', levelUp: 'Новый уровень!', stars: 'Звёзды сезона',
    sending: 'Считаем выигрыш…', offline: 'Сохранено на этом устройстве — для наград нужна сеть.',
    guest: 'Войди, чтобы получать BM и XP и попасть в рейтинг.', signIn: 'Войти',
    capped: 'Награды за эту игру на сегодня исчерпаны — игра всё равно идёт в твои рекорды.',
    fast: 'Слишком быстро, чтобы засчитать.', slow: 'Минутку — прошлая игра ещё засчитывается.', error: 'Сервер не принял этот результат.',
    again: 'Сыграть ещё', back: 'Назад к играм', share: 'Поделиться', copied: 'Скопировано',
    shareText: (g, s) => `Мой результат ${s} в игре ${g} на Bridge 125. Сможешь лучше?`,
  },
  board: {
    title: 'Рейтинг', tabs: { best: 'За всё время', week: 'Эта неделя', daily: 'Сегодня' },
    hint: { best: 'Лучший результат', week: 'Победы за последние 7 дней', daily: 'Сегодняшняя головоломка' },
    wins: 'побед', empty: 'Результатов пока нет — будь первым.', emptyDaily: 'Сегодняшнюю головоломку ещё никто не решил.',
    error: 'Не удалось загрузить рейтинг.', retry: 'Повторить', you: 'ты', guest: 'Войди, чтобы попасть в рейтинг.',
  },
  levels: { easy: 'Лёгкий', normal: 'Обычный', hard: 'Сложный', expert: 'Эксперт' },
};

const uk: GamesStrings = {
  title: 'Ігри', kicker: 'Bridge 125 · Картковий зал', close: 'Закрити',
  sub: 'Бридж — головний стіл. А тут ще кілька ігор для різноманіття — той самий акаунт, ті самі Bridge Money.',
  main: { tag: 'Головна гра', sub: 'Позбудься карт першим і тримай очки низькими.', play: 'Грати в Бридж', level: 'Рівень', wins: 'Перемоги' },
  more: 'Ще ігри', moreSub: 'Короткі ігри між партіями. Платять трохи менше, ніж Бридж.',
  tile: {
    daily: 'Щоденна', dailyDone: 'Розв’язано сьогодні', local: 'Місцева класика', best: 'Рекорд', fastest: 'Найшвидше', streak: 'Серія',
    wins: 'Перемоги', played: 'Ігри', fresh: 'Ще не грав', perWin: 'за перемогу', solo: 'Соло', board: 'Рейтинг', play: 'Грати',
  },
  empty: { title: 'Нові столи накривають', sub: 'До карткового залу скоро прийдуть нові ігри. А поки на тебе чекає Бридж.' },
  quest: 'Ігрове завдання дня',
  guest: { title: 'Увійди, щоб зберігати рекорди', sub: 'Рекорди, серії, BM і XP зберігаються у твоєму акаунті.', signIn: 'Увійти' },
  result: {
    won: 'Перемога!', lost: 'Гарна гра', solved: 'Розв’язано!', unsolved: 'Цього разу ні',
    score: 'Очки', time: 'Час', level: 'Рівень', best: 'Рекорд', newBest: 'Новий рекорд!', streak: 'Серія',
    rewards: 'Нагороди', dailyBonus: 'Бонус щоденної головоломки', medal: 'Медаль', quest: 'Завдання', levelUp: 'Новий рівень!', stars: 'Зірки сезону',
    sending: 'Рахуємо виграш…', offline: 'Збережено на цьому пристрої — для нагород потрібна мережа.',
    guest: 'Увійди, щоб отримувати BM і XP та потрапити в рейтинг.', signIn: 'Увійти',
    capped: 'Нагороди за цю гру на сьогодні вичерпано — гра все одно йде у твої рекорди.',
    fast: 'Надто швидко, щоб зарахувати.', slow: 'Хвилинку — попередню гру ще зараховують.', error: 'Сервер не прийняв цей результат.',
    again: 'Зіграти ще', back: 'Назад до ігор', share: 'Поділитися', copied: 'Скопійовано',
    shareText: (g, s) => `Мій результат ${s} у грі ${g} на Bridge 125. Зможеш краще?`,
  },
  board: {
    title: 'Рейтинг', tabs: { best: 'За весь час', week: 'Цей тиждень', daily: 'Сьогодні' },
    hint: { best: 'Найкращий результат', week: 'Перемоги за останні 7 днів', daily: 'Сьогоднішня головоломка' },
    wins: 'перемог', empty: 'Результатів поки немає — будь першим.', emptyDaily: 'Сьогоднішню головоломку ще ніхто не розв’язав.',
    error: 'Не вдалося завантажити рейтинг.', retry: 'Повторити', you: 'ти', guest: 'Увійди, щоб потрапити в рейтинг.',
  },
  levels: { easy: 'Легкий', normal: 'Звичайний', hard: 'Складний', expert: 'Експерт' },
};

export const GAMES_STRINGS: Strings<GamesStrings> = { en, lv, ru, uk };

import { registerStrings } from './pick';
registerStrings('games', GAMES_STRINGS);
