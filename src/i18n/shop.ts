import type { Strings } from './pick';

/** Strings for the Shop, daily rewards, levels and achievements. English is mandatory; others fall back to it. */
export interface ShopStrings {
  shop: {
    title: string; sub: string; balance: string; collection: (n: number, total: number) => string;
    tabs: { featured: string; tables: string; backs: string; colours: string; bundles: string };
    rarity: { common: string; rare: string; epic: string; legendary: string };
    tags: { new: string; hot: string };
    kinds: { accent: string; table: string; back: string; set: string };
    setOf: (parts: string) => string;
    buy: string; owned: string; equip: string; equipped: string; equipAll: string; adminFree: string; signInToBuy: string;
    confirmTitle: string; confirmBuy: (price: string) => string; cancel: string; balanceAfter: string; buying: string;
    notEnough: (need: string) => string; earnHint: string; getDaily: string;
    unlocked: string; unlockedSub: string; equipNow: string; keepShopping: string; equippedToast: (name: string) => string;
    guestTitle: string; guestSub: string; signIn: string;
    featured: string; featuredSub: string; trending: string; seeAll: string;
    comingSoon: string; notifyMe: string; notifyOn: string; notifyToast: string;
    bundleBonus: (pct: number) => string; bestValue: string; bundlesTitle: string; bundlesSub: string;
    passTitle: string; passSub: string; passPerks: string[]; passSeason: string;
    dailyCta: string; dailyCtaSub: string; dailyDone: string;
    errors: { generic: string; network: string; owned: string; unknown: string; banned: string; auth: string };
    items: Record<string, string>;
    blurbs: Record<string, string>;
  };
  daily: {
    title: string; sub: string; day: (n: number) => string; today: string; claim: string; claimed: string;
    comeBack: string; nextIn: (t: string) => string; streak: (n: number) => string; streakNone: string;
    plusItem: string; reward: (bm: string) => string; signIn: string; close: string; error: string; itemUnlocked: (name: string) => string;
  };
  level: { short: string; level: (n: number) => string; levelUp: string; xp: (a: string, b: string) => string; toNext: (n: string) => string; xpGain: (xp: number) => string; win: string };
  ach: {
    title: string; unlocked: string; count: (a: number, b: number) => string; reward: (bm: string) => string; secret: string;
    list: Record<string, { name: string; desc: string }>;
  };
}

const en: ShopStrings = {
  shop: {
    title: 'Shop', sub: 'Tables, card backs & colours', balance: 'Balance', collection: (n, t) => `${n}/${t} owned`,
    tabs: { featured: 'Featured', tables: 'Tables', backs: 'Card backs', colours: 'Colours', bundles: 'BM bundles' },
    rarity: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' },
    tags: { new: 'New', hot: 'Popular' },
    kinds: { accent: 'Colour', table: 'Table', back: 'Card back', set: 'Set' },
    setOf: p => `Set · ${p}`,
    buy: 'Buy', owned: 'Owned', equip: 'Equip', equipped: 'Equipped', equipAll: 'Equip set', adminFree: 'Admin — free', signInToBuy: 'Sign in to buy',
    confirmTitle: 'Unlock this style?', confirmBuy: p => `Buy for ${p}`, cancel: 'Cancel', balanceAfter: 'Balance after', buying: 'Unlocking…',
    notEnough: n => `You need ${n} more BM`, earnHint: 'Win games, claim your daily reward and level up to earn BM.', getDaily: 'Open daily reward',
    unlocked: 'Unlocked!', unlockedSub: 'It’s in your collection forever.', equipNow: 'Equip now', keepShopping: 'Keep browsing', equippedToast: n => `${n} equipped`,
    guestTitle: 'Sign in to unlock styles', guestSub: 'Your BM, levels and collection are saved to your account.', signIn: 'Sign in',
    featured: 'Featured', featuredSub: 'The table of the week', trending: 'Trending now', seeAll: 'See all',
    comingSoon: 'Coming soon', notifyMe: 'Notify me', notifyOn: 'We’ll let you know', notifyToast: 'Got it — we’ll tell you when it launches',
    bundleBonus: p => `+${p}% bonus`, bestValue: 'Best value', bundlesTitle: 'Bridge Money bundles', bundlesSub: 'Top up BM instantly. Card payments are coming soon.',
    passTitle: 'Bridge Pass', passSub: 'A season of exclusive styles and double rewards.', passSeason: 'Season 1',
    passPerks: ['Exclusive season table & card back', 'Double daily rewards', 'Premium achievement frames', 'Early access to new styles'],
    dailyCta: 'Daily reward is ready', dailyCtaSub: 'Free BM every day — bigger the longer your streak.', dailyDone: 'Daily reward collected — see you tomorrow',
    errors: { generic: 'Something went wrong. Try again.', network: 'No connection. Try again.', owned: 'You already own this.', unknown: 'This item is not for sale right now.', banned: 'Your account can’t make purchases.', auth: 'Please sign in again.' },
    items: { emerald: 'Emerald', rosegold: 'Rose Gold', platinum: 'Platinum', neon: 'Neon', gold: 'Gold Foil', royal: 'Royal Purple', synth: 'Neon Night', jugend: 'Art Nouveau', montecarlo: 'Monte Carlo' },
    blurbs: {
      montecarlo: 'Deep casino red with a hairline sheen — the high-roller table.',
      jugend: 'Riga Art Nouveau curls in brushed gold on teal felt.',
      royal: 'Velvet purple and gold studs, with a matching card back.',
      synth: 'A neon grid humming under midnight glass.',
      platinum: 'Cool, bright metal for every button and highlight.',
      rosegold: 'Warm rose metal — soft, elegant, unmistakable.',
      emerald: 'A jewel-green accent for the whole app.',
      neon: 'Hot pink accent plus the Neon Grid card back.',
      gold: 'Mirror-polished gold foil on every card you hold.',
    },
  },
  daily: {
    title: 'Daily reward', sub: 'Come back every day — the rewards grow for 7 days.', day: n => `Day ${n}`, today: 'Today',
    claim: 'Open the chest', claimed: 'Collected', comeBack: 'Come back tomorrow', nextIn: t => `Next reward in ${t}`,
    streak: n => `${n}-day streak`, streakNone: 'Start your streak', plusItem: '+ style', reward: b => `+${b} BM`,
    signIn: 'Sign in to collect daily rewards', close: 'Close', error: 'Couldn’t open the chest. Try again.', itemUnlocked: n => `${n} unlocked`,
  },
  level: { short: 'Lv', level: n => `Level ${n}`, levelUp: 'Level up!', xp: (a, b) => `${a} / ${b} XP`, toNext: n => `${n} XP to next level`, xpGain: x => `+${x} XP`, win: 'Victory' },
  ach: {
    title: 'Achievements', unlocked: 'Achievement unlocked', count: (a, b) => `${a} of ${b}`, reward: b => `+${b} BM`, secret: 'Keep playing to discover',
    list: {
      first_win: { name: 'First Blood', desc: 'Win your first game' },
      games_10: { name: 'Regular', desc: 'Finish 10 games' },
      wins_10: { name: 'Card Shark', desc: 'Win 10 games' },
      win_streak_3: { name: 'Hot Hand', desc: 'Win 3 games in a row' },
      online_win: { name: 'Table Talk', desc: 'Win a game against real people' },
      quick_win: { name: 'Lightning', desc: 'Win a Quick Match' },
      games_50: { name: 'Veteran', desc: 'Finish 50 games' },
      wins_50: { name: 'High Roller', desc: 'Win 50 games' },
      level_10: { name: 'Double Digits', desc: 'Reach level 10' },
      daily_7: { name: 'Devoted', desc: 'Claim the daily reward 7 days in a row' },
      jacks_finish: { name: 'Jack Pot', desc: 'Finish a round with jacks to multiply the score' },
      exact_125: { name: 'Exactly 125', desc: 'Land on 125 and burn back to zero' },
      queen_bounce: { name: 'Pass the Queen', desc: 'Send the Queen of Spades on with the 6♠' },
      four_kings: { name: 'Four Kings', desc: 'Complete four kings on the pile' },
    },
  },
};

const lv: ShopStrings = {
  shop: {
    title: 'Veikals', sub: 'Galdi, kāršu muguras un krāsas', balance: 'Bilance', collection: (n, t) => `${n}/${t} iegūti`,
    tabs: { featured: 'Izceltie', tables: 'Galdi', backs: 'Kāršu muguras', colours: 'Krāsas', bundles: 'BM komplekti' },
    rarity: { common: 'Parasts', rare: 'Rets', epic: 'Episks', legendary: 'Leģendārs' },
    tags: { new: 'Jauns', hot: 'Populārs' },
    kinds: { accent: 'Krāsa', table: 'Galds', back: 'Kāršu mugura', set: 'Komplekts' },
    setOf: p => `Komplekts · ${p}`,
    buy: 'Pirkt', owned: 'Iegūts', equip: 'Lietot', equipped: 'Lietots', equipAll: 'Lietot komplektu', adminFree: 'Admins — bez maksas', signInToBuy: 'Ienāc, lai pirktu',
    confirmTitle: 'Atbloķēt šo stilu?', confirmBuy: p => `Pirkt par ${p}`, cancel: 'Atcelt', balanceAfter: 'Bilance pēc pirkuma', buying: 'Atbloķē…',
    notEnough: n => `Tev pietrūkst ${n} BM`, earnHint: 'Uzvari spēlēs, saņem dienas balvu un kāp līmeņos, lai krātu BM.', getDaily: 'Atvērt dienas balvu',
    unlocked: 'Atbloķēts!', unlockedSub: 'Tas ir tavā kolekcijā uz visiem laikiem.', equipNow: 'Lietot tagad', keepShopping: 'Turpināt skatīties', equippedToast: n => `${n} — lietots`,
    guestTitle: 'Ienāc, lai atbloķētu stilus', guestSub: 'Tavi BM, līmeņi un kolekcija glabājas tavā kontā.', signIn: 'Ienākt',
    featured: 'Izceltais', featuredSub: 'Nedēļas galds', trending: 'Šobrīd populāri', seeAll: 'Visi',
    comingSoon: 'Drīzumā', notifyMe: 'Paziņot man', notifyOn: 'Mēs paziņosim', notifyToast: 'Skaidrs — paziņosim, kad būs pieejams',
    bundleBonus: p => `+${p}% bonuss`, bestValue: 'Izdevīgākais', bundlesTitle: 'Bridge Money komplekti', bundlesSub: 'Papildini BM uzreiz. Maksājumi ar karti — drīzumā.',
    passTitle: 'Bridge Pass', passSub: 'Sezona ar ekskluzīviem stiliem un dubultām balvām.', passSeason: '1. sezona',
    passPerks: ['Ekskluzīvs sezonas galds un kāršu mugura', 'Dubultas dienas balvas', 'Premium sasniegumu rāmji', 'Agrīna piekļuve jauniem stiliem'],
    dailyCta: 'Dienas balva gaida', dailyCtaSub: 'Bezmaksas BM katru dienu — jo garāka sērija, jo vairāk.', dailyDone: 'Dienas balva saņemta — tiekamies rīt',
    errors: { generic: 'Kaut kas nogāja greizi. Mēģini vēlreiz.', network: 'Nav savienojuma. Mēģini vēlreiz.', owned: 'Tas tev jau pieder.', unknown: 'Šī prece šobrīd nav pārdošanā.', banned: 'Tavs konts nevar veikt pirkumus.', auth: 'Lūdzu, ienāc vēlreiz.' },
    items: { emerald: 'Smaragds', rosegold: 'Rozā zelts', platinum: 'Platīns', neon: 'Neons', gold: 'Zelta folija', royal: 'Karaliskā violetā', synth: 'Neona nakts', jugend: 'Jūgendstils', montecarlo: 'Montekarlo' },
    blurbs: {
      montecarlo: 'Dziļi sarkans kazino galds ar smalku spīdumu — lielo likmju galds.',
      jugend: 'Rīgas jūgendstila cilpas matētā zeltā uz zilganzaļa auduma.',
      royal: 'Violets samts ar zelta kniedēm un saskaņotu kāršu mugaru.',
      synth: 'Neona režģis, kas dūc zem pusnakts stikla.',
      platinum: 'Vēss, gaišs metāls katrai pogai un akcentam.',
      rosegold: 'Silts rozā metāls — maigs, elegants, neatkārtojams.',
      emerald: 'Dārgakmens zaļš akcents visai lietotnei.',
      neon: 'Spilgti rozā akcents un Neon Grid kāršu mugura.',
      gold: 'Spoguļspīdīga zelta folija uz katras kārts.',
    },
  },
  daily: {
    title: 'Dienas balva', sub: 'Nāc katru dienu — balvas aug 7 dienas pēc kārtas.', day: n => `${n}. diena`, today: 'Šodien',
    claim: 'Atvērt lādi', claimed: 'Saņemts', comeBack: 'Nāc atpakaļ rīt', nextIn: t => `Nākamā balva pēc ${t}`,
    streak: n => `${n} dienu sērija`, streakNone: 'Sāc savu sēriju', plusItem: '+ stils', reward: b => `+${b} BM`,
    signIn: 'Ienāc, lai saņemtu dienas balvas', close: 'Aizvērt', error: 'Neizdevās atvērt lādi. Mēģini vēlreiz.', itemUnlocked: n => `${n} atbloķēts`,
  },
  level: { short: 'Lv', level: n => `${n}. līmenis`, levelUp: 'Jauns līmenis!', xp: (a, b) => `${a} / ${b} XP`, toNext: n => `${n} XP līdz nākamajam līmenim`, xpGain: x => `+${x} XP`, win: 'Uzvara' },
  ach: {
    title: 'Sasniegumi', unlocked: 'Sasniegums atbloķēts', count: (a, b) => `${a} no ${b}`, reward: b => `+${b} BM`, secret: 'Spēlē, lai atklātu',
    list: {
      first_win: { name: 'Pirmā uzvara', desc: 'Uzvari savā pirmajā spēlē' },
      games_10: { name: 'Pastāvīgais', desc: 'Pabeidz 10 spēles' },
      wins_10: { name: 'Kāršu haizivs', desc: 'Uzvari 10 spēlēs' },
      win_streak_3: { name: 'Karstā roka', desc: 'Uzvari 3 spēlēs pēc kārtas' },
      online_win: { name: 'Pie galda', desc: 'Uzvari spēlē pret īstiem cilvēkiem' },
      quick_win: { name: 'Zibens', desc: 'Uzvari ātrajā spēlē' },
      games_50: { name: 'Veterāns', desc: 'Pabeidz 50 spēles' },
      wins_50: { name: 'Lielās likmes', desc: 'Uzvari 50 spēlēs' },
      level_10: { name: 'Divciparu', desc: 'Sasniedz 10. līmeni' },
      daily_7: { name: 'Uzticīgais', desc: 'Saņem dienas balvu 7 dienas pēc kārtas' },
      jacks_finish: { name: 'Kalpu džekpots', desc: 'Pabeidz kārtu ar kalpiem un reizini punktus' },
      exact_125: { name: 'Tieši 125', desc: 'Sasniedz tieši 125 un nodedzini līdz nullei' },
      queen_bounce: { name: 'Padod dāmu', desc: 'Pārsūti pīķa dāmu tālāk ar pīķa 6' },
      four_kings: { name: 'Četri karaļi', desc: 'Pabeidz četrus karaļus uz kaudzes' },
    },
  },
};

const ru: ShopStrings = {
  shop: {
    title: 'Магазин', sub: 'Столы, рубашки и цвета', balance: 'Баланс', collection: (n, t) => `${n}/${t} в коллекции`,
    tabs: { featured: 'Главное', tables: 'Столы', backs: 'Рубашки', colours: 'Цвета', bundles: 'Пакеты BM' },
    rarity: { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' },
    tags: { new: 'Новинка', hot: 'Популярное' },
    kinds: { accent: 'Цвет', table: 'Стол', back: 'Рубашка', set: 'Набор' },
    setOf: p => `Набор · ${p}`,
    buy: 'Купить', owned: 'Есть', equip: 'Надеть', equipped: 'Выбрано', equipAll: 'Выбрать набор', adminFree: 'Админ — бесплатно', signInToBuy: 'Войдите, чтобы купить',
    confirmTitle: 'Открыть этот стиль?', confirmBuy: p => `Купить за ${p}`, cancel: 'Отмена', balanceAfter: 'Баланс после покупки', buying: 'Открываем…',
    notEnough: n => `Не хватает ${n} BM`, earnHint: 'Побеждайте, забирайте ежедневную награду и повышайте уровень, чтобы копить BM.', getDaily: 'Открыть награду дня',
    unlocked: 'Открыто!', unlockedSub: 'Теперь это навсегда в вашей коллекции.', equipNow: 'Выбрать сейчас', keepShopping: 'Смотреть дальше', equippedToast: n => `${n} — выбрано`,
    guestTitle: 'Войдите, чтобы открывать стили', guestSub: 'Ваши BM, уровни и коллекция сохраняются в аккаунте.', signIn: 'Войти',
    featured: 'Главное', featuredSub: 'Стол недели', trending: 'Сейчас популярно', seeAll: 'Все',
    comingSoon: 'Скоро', notifyMe: 'Сообщить мне', notifyOn: 'Мы сообщим', notifyToast: 'Готово — сообщим, когда появится',
    bundleBonus: p => `+${p}% бонус`, bestValue: 'Выгоднее всего', bundlesTitle: 'Пакеты Bridge Money', bundlesSub: 'Мгновенное пополнение BM. Оплата картой — скоро.',
    passTitle: 'Bridge Pass', passSub: 'Сезон эксклюзивных стилей и двойных наград.', passSeason: 'Сезон 1',
    passPerks: ['Эксклюзивный стол и рубашка сезона', 'Двойные ежедневные награды', 'Премиальные рамки достижений', 'Ранний доступ к новым стилям'],
    dailyCta: 'Награда дня ждёт', dailyCtaSub: 'Бесплатные BM каждый день — чем длиннее серия, тем больше.', dailyDone: 'Награда дня получена — до завтра',
    errors: { generic: 'Что-то пошло не так. Попробуйте ещё раз.', network: 'Нет соединения. Попробуйте ещё раз.', owned: 'Это уже у вас есть.', unknown: 'Этот товар сейчас недоступен.', banned: 'Ваш аккаунт не может совершать покупки.', auth: 'Пожалуйста, войдите снова.' },
    items: { emerald: 'Изумруд', rosegold: 'Розовое золото', platinum: 'Платина', neon: 'Неон', gold: 'Золотая фольга', royal: 'Королевский пурпур', synth: 'Неоновая ночь', jugend: 'Модерн', montecarlo: 'Монте-Карло' },
    blurbs: {
      montecarlo: 'Глубокий казино-красный с тонким блеском — стол хайроллеров.',
      jugend: 'Рижский модерн: завитки матового золота на бирюзовом сукне.',
      royal: 'Пурпурный бархат с золотыми заклёпками и рубашкой в тон.',
      synth: 'Неоновая сетка под полуночным стеклом.',
      platinum: 'Холодный светлый металл для каждой кнопки.',
      rosegold: 'Тёплый розовый металл — мягко и элегантно.',
      emerald: 'Изумрудный акцент для всего приложения.',
      neon: 'Ярко-розовый акцент и рубашка Neon Grid.',
      gold: 'Зеркальная золотая фольга на каждой карте.',
    },
  },
  daily: {
    title: 'Награда дня', sub: 'Заходите каждый день — награды растут 7 дней подряд.', day: n => `День ${n}`, today: 'Сегодня',
    claim: 'Открыть сундук', claimed: 'Получено', comeBack: 'Возвращайтесь завтра', nextIn: t => `Следующая награда через ${t}`,
    streak: n => `Серия: ${n} дн.`, streakNone: 'Начните серию', plusItem: '+ стиль', reward: b => `+${b} BM`,
    signIn: 'Войдите, чтобы получать награды', close: 'Закрыть', error: 'Не удалось открыть сундук. Попробуйте ещё раз.', itemUnlocked: n => `${n} — открыто`,
  },
  level: { short: 'Ур', level: n => `Уровень ${n}`, levelUp: 'Новый уровень!', xp: (a, b) => `${a} / ${b} XP`, toNext: n => `${n} XP до следующего уровня`, xpGain: x => `+${x} XP`, win: 'Победа' },
  ach: {
    title: 'Достижения', unlocked: 'Достижение открыто', count: (a, b) => `${a} из ${b}`, reward: b => `+${b} BM`, secret: 'Играйте, чтобы открыть',
    list: {
      first_win: { name: 'Первая победа', desc: 'Выиграйте первую партию' },
      games_10: { name: 'Завсегдатай', desc: 'Сыграйте 10 партий' },
      wins_10: { name: 'Картёжник', desc: 'Выиграйте 10 партий' },
      win_streak_3: { name: 'Рука на удачу', desc: 'Выиграйте 3 партии подряд' },
      online_win: { name: 'За живым столом', desc: 'Выиграйте у реальных игроков' },
      quick_win: { name: 'Молния', desc: 'Выиграйте быструю игру' },
      games_50: { name: 'Ветеран', desc: 'Сыграйте 50 партий' },
      wins_50: { name: 'Хайроллер', desc: 'Выиграйте 50 партий' },
      level_10: { name: 'Двузначный', desc: 'Достигните 10 уровня' },
      daily_7: { name: 'Верность', desc: 'Забирайте награду дня 7 дней подряд' },
      jacks_finish: { name: 'Вальты-джекпот', desc: 'Закончите кон вальтами и умножьте очки' },
      exact_125: { name: 'Ровно 125', desc: 'Наберите ровно 125 и сгорите до нуля' },
      queen_bounce: { name: 'Передай даму', desc: 'Переведите даму пик шестёркой пик' },
      four_kings: { name: 'Четыре короля', desc: 'Соберите четырёх королей на столе' },
    },
  },
};

const uk: ShopStrings = {
  shop: {
    title: 'Магазин', sub: 'Столи, сорочки й кольори', balance: 'Баланс', collection: (n, t) => `${n}/${t} у колекції`,
    tabs: { featured: 'Головне', tables: 'Столи', backs: 'Сорочки', colours: 'Кольори', bundles: 'Пакети BM' },
    rarity: { common: 'Звичайний', rare: 'Рідкісний', epic: 'Епічний', legendary: 'Легендарний' },
    tags: { new: 'Новинка', hot: 'Популярне' },
    kinds: { accent: 'Колір', table: 'Стіл', back: 'Сорочка', set: 'Набір' },
    setOf: p => `Набір · ${p}`,
    buy: 'Купити', owned: 'Є', equip: 'Обрати', equipped: 'Обрано', equipAll: 'Обрати набір', adminFree: 'Адмін — безкоштовно', signInToBuy: 'Увійдіть, щоб купити',
    confirmTitle: 'Відкрити цей стиль?', confirmBuy: p => `Купити за ${p}`, cancel: 'Скасувати', balanceAfter: 'Баланс після покупки', buying: 'Відкриваємо…',
    notEnough: n => `Бракує ${n} BM`, earnHint: 'Перемагайте, забирайте щоденну нагороду й підвищуйте рівень, щоб збирати BM.', getDaily: 'Відкрити нагороду дня',
    unlocked: 'Відкрито!', unlockedSub: 'Тепер це назавжди у вашій колекції.', equipNow: 'Обрати зараз', keepShopping: 'Дивитися далі', equippedToast: n => `${n} — обрано`,
    guestTitle: 'Увійдіть, щоб відкривати стилі', guestSub: 'Ваші BM, рівні й колекція зберігаються в акаунті.', signIn: 'Увійти',
    featured: 'Головне', featuredSub: 'Стіл тижня', trending: 'Зараз популярне', seeAll: 'Усі',
    comingSoon: 'Незабаром', notifyMe: 'Повідомити мене', notifyOn: 'Ми повідомимо', notifyToast: 'Готово — повідомимо, коли з’явиться',
    bundleBonus: p => `+${p}% бонус`, bestValue: 'Найвигідніше', bundlesTitle: 'Пакети Bridge Money', bundlesSub: 'Миттєве поповнення BM. Оплата карткою — незабаром.',
    passTitle: 'Bridge Pass', passSub: 'Сезон ексклюзивних стилів і подвійних нагород.', passSeason: 'Сезон 1',
    passPerks: ['Ексклюзивний стіл і сорочка сезону', 'Подвійні щоденні нагороди', 'Преміальні рамки досягнень', 'Ранній доступ до нових стилів'],
    dailyCta: 'Нагорода дня чекає', dailyCtaSub: 'Безкоштовні BM щодня — що довша серія, то більше.', dailyDone: 'Нагороду дня отримано — до завтра',
    errors: { generic: 'Щось пішло не так. Спробуйте ще раз.', network: 'Немає з’єднання. Спробуйте ще раз.', owned: 'Це вже у вас є.', unknown: 'Цей товар зараз недоступний.', banned: 'Ваш акаунт не може робити покупки.', auth: 'Будь ласка, увійдіть знову.' },
    items: { emerald: 'Смарагд', rosegold: 'Рожеве золото', platinum: 'Платина', neon: 'Неон', gold: 'Золота фольга', royal: 'Королівський пурпур', synth: 'Неонова ніч', jugend: 'Модерн', montecarlo: 'Монте-Карло' },
    blurbs: {
      montecarlo: 'Глибокий казино-червоний з тонким блиском — стіл хайролерів.',
      jugend: 'Ризький модерн: завитки матового золота на бірюзовому сукні.',
      royal: 'Пурпуровий оксамит із золотими заклепками й сорочкою в тон.',
      synth: 'Неонова сітка під опівнічним склом.',
      platinum: 'Холодний світлий метал для кожної кнопки.',
      rosegold: 'Теплий рожевий метал — м’яко й елегантно.',
      emerald: 'Смарагдовий акцент для всього застосунку.',
      neon: 'Яскраво-рожевий акцент і сорочка Neon Grid.',
      gold: 'Дзеркальна золота фольга на кожній карті.',
    },
  },
  daily: {
    title: 'Нагорода дня', sub: 'Заходьте щодня — нагороди ростуть 7 днів поспіль.', day: n => `День ${n}`, today: 'Сьогодні',
    claim: 'Відкрити скриню', claimed: 'Отримано', comeBack: 'Повертайтеся завтра', nextIn: t => `Наступна нагорода через ${t}`,
    streak: n => `Серія: ${n} дн.`, streakNone: 'Почніть серію', plusItem: '+ стиль', reward: b => `+${b} BM`,
    signIn: 'Увійдіть, щоб отримувати нагороди', close: 'Закрити', error: 'Не вдалося відкрити скриню. Спробуйте ще раз.', itemUnlocked: n => `${n} — відкрито`,
  },
  level: { short: 'Рів', level: n => `Рівень ${n}`, levelUp: 'Новий рівень!', xp: (a, b) => `${a} / ${b} XP`, toNext: n => `${n} XP до наступного рівня`, xpGain: x => `+${x} XP`, win: 'Перемога' },
  ach: {
    title: 'Досягнення', unlocked: 'Досягнення відкрито', count: (a, b) => `${a} з ${b}`, reward: b => `+${b} BM`, secret: 'Грайте, щоб відкрити',
    list: {
      first_win: { name: 'Перша перемога', desc: 'Виграйте першу партію' },
      games_10: { name: 'Завсідник', desc: 'Зіграйте 10 партій' },
      wins_10: { name: 'Картяр', desc: 'Виграйте 10 партій' },
      win_streak_3: { name: 'Щаслива рука', desc: 'Виграйте 3 партії поспіль' },
      online_win: { name: 'За живим столом', desc: 'Виграйте у реальних гравців' },
      quick_win: { name: 'Блискавка', desc: 'Виграйте швидку гру' },
      games_50: { name: 'Ветеран', desc: 'Зіграйте 50 партій' },
      wins_50: { name: 'Хайролер', desc: 'Виграйте 50 партій' },
      level_10: { name: 'Двозначний', desc: 'Досягніть 10 рівня' },
      daily_7: { name: 'Вірність', desc: 'Забирайте нагороду дня 7 днів поспіль' },
      jacks_finish: { name: 'Валети-джекпот', desc: 'Завершіть кон валетами й помножте очки' },
      exact_125: { name: 'Рівно 125', desc: 'Наберіть рівно 125 і згоріть до нуля' },
      queen_bounce: { name: 'Передай даму', desc: 'Переведіть даму пік шісткою пік' },
      four_kings: { name: 'Чотири королі', desc: 'Зберіть чотирьох королів на столі' },
    },
  },
};

export const SHOP_STRINGS: Strings<ShopStrings> = { en, lv, ru, uk };
