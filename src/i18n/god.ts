import type { Strings } from './pick';

/** GOD MODE panel (admin + god only). English is mandatory; other languages fall back to it. */
export interface GodStrings {
  title: string; sub: string; who: { admin: string; god: string };
  close: string; noAccess: string; noAccessSub: string; back: string; signInFirst: string;
  readout: { bm: string; level: string; owned: string; ach: string; streak: string; xpTo: (n: string) => string };
  sec: { money: string; moneySub: string; progress: string; progressSub: string; collection: string; collectionSub: string; testing: string; testingSub: string; danger: string };
  topup: string; custom: string; add: string; setExact: string; amountHint: string; badAmount: string;
  addXp: (n: string) => string; unlockAch: string; unlockAchSub: string; resetDaily: string; resetDailySub: string;
  unlockAll: string; unlockAllSub: string; resetOwned: string; resetOwnedSub: string;
  xray: string; xraySub: string; fast: string; fastSub: string; replayIntro: string; replayIntroSub: string;
  resetProgress: string; resetProgressSub: string; confirmTitle: string; confirmBody: string; confirmYes: string; cancel: string;
  done: {
    topup: (n: string) => string; set_bm: (n: string) => string; add_xp: (n: string) => string; unlock_all: string; reset_owned: string;
    reset_daily: string; reset_progress: string; unlock_achievements: string; on: string; off: string;
  };
  err: { generic: string; network: string; forbidden: string };
  footer: string;
}

const en: GodStrings = {
  title: 'GOD MODE', sub: 'Owner & tester tools — only privileged accounts see this.', who: { admin: 'Owner · super admin', god: 'Co-author · main tester' },
  close: 'Close', noAccess: 'No access', noAccessSub: 'GOD MODE is only for the owner and the main tester.', back: 'Back', signInFirst: 'Sign in with a privileged account.',
  readout: { bm: 'Bridge Money', level: 'Level', owned: 'Owned', ach: 'Achievements', streak: 'Daily streak', xpTo: n => `${n} XP to next` },
  sec: {
    money: 'Bridge Money', moneySub: 'One tap — always there when you need credits.', progress: 'Levels & rewards', progressSub: 'Test level-ups, the daily chest and achievements.',
    collection: 'Collection', collectionSub: 'Own everything, or start empty to test buying.', testing: 'Local test switches', testingSub: 'Stored on this device only.', danger: 'Danger zone',
  },
  topup: 'Top up', custom: 'Custom amount', add: 'Add', setExact: 'Set exact', amountHint: '1 – 1 000 000', badAmount: 'Enter 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Unlock all achievements', unlockAchSub: 'Marks every achievement as earned (no BM paid).',
  resetDaily: 'Reset daily reward', resetDailySub: 'The daily chest can be opened again today.',
  unlockAll: 'Unlock everything', unlockAllSub: 'Adds every shop item to your collection.', resetOwned: 'Reset owned', resetOwnedSub: 'Empties your collection so you can test buying.',
  xray: 'X-ray', xraySub: 'See the bots’ cards — local games only.', fast: 'Fast bots', fastSub: 'Bots play about 3× faster.',
  replayIntro: 'Replay intro', replayIntroSub: 'Reloads the home screen with the opening animation.',
  resetProgress: 'Reset my progress', resetProgressSub: 'XP, level, streaks, achievements, games and wins back to zero. BM and items stay.',
  confirmTitle: 'Reset your progress?', confirmBody: 'Level, XP, daily streak, achievements, games played and wins go back to zero. Your BM balance and owned items are kept. This cannot be undone.',
  confirmYes: 'Yes, reset', cancel: 'Cancel',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Balance set to ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Everything unlocked', reset_owned: 'Collection emptied',
    reset_daily: 'Daily chest is ready', reset_progress: 'Progress reset', unlock_achievements: 'All achievements unlocked', on: 'on', off: 'off',
  },
  err: { generic: 'That did not work — try again.', network: 'No connection.', forbidden: 'Not allowed for this account.' },
  footer: 'Every action is logged as god_tool in the admin events.',
};

const lv: GodStrings = {
  title: 'GOD MODE', sub: 'Īpašnieka un testētāja rīki — redz tikai privileģēti konti.', who: { admin: 'Īpašnieks · galvenais admins', god: 'Līdzautors · galvenais testētājs' },
  close: 'Aizvērt', noAccess: 'Nav piekļuves', noAccessSub: 'GOD MODE ir tikai īpašniekam un galvenajam testētājam.', back: 'Atpakaļ', signInFirst: 'Ienāc ar privileģētu kontu.',
  readout: { bm: 'Bridge Money', level: 'Līmenis', owned: 'Kolekcijā', ach: 'Sasniegumi', streak: 'Dienu sērija', xpTo: n => `${n} XP līdz nākamajam` },
  sec: {
    money: 'Bridge Money', moneySub: 'Viens pieskāriens — kredīti vienmēr pie rokas.', progress: 'Līmeņi un balvas', progressSub: 'Testē līmeņus, dienas lādi un sasniegumus.',
    collection: 'Kolekcija', collectionSub: 'Atslēdz visu vai sāc no nulles, lai testētu pirkšanu.', testing: 'Lokālie testa slēdži', testingSub: 'Saglabāti tikai šajā ierīcē.', danger: 'Bīstamā zona',
  },
  topup: 'Papildināt', custom: 'Sava summa', add: 'Pievienot', setExact: 'Iestatīt', amountHint: '1 – 1 000 000', badAmount: 'Ievadi 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Atslēgt visus sasniegumus', unlockAchSub: 'Visi sasniegumi atzīmēti kā iegūti (BM netiek maksāti).',
  resetDaily: 'Atiestatīt dienas balvu', resetDailySub: 'Dienas lādi šodien var atvērt vēlreiz.',
  unlockAll: 'Atslēgt visu', unlockAllSub: 'Visas veikala preces pievieno kolekcijai.', resetOwned: 'Notīrīt kolekciju', resetOwnedSub: 'Iztukšo kolekciju, lai varētu testēt pirkšanu.',
  xray: 'Rentgens', xraySub: 'Redzi botu kārtis — tikai lokālās spēlēs.', fast: 'Ātrie boti', fastSub: 'Boti spēlē ~3× ātrāk.',
  replayIntro: 'Atkārtot intro', replayIntroSub: 'Pārlādē sākumu ar ievada animāciju.',
  resetProgress: 'Atiestatīt manu progresu', resetProgressSub: 'XP, līmenis, sērijas, sasniegumi, spēles un uzvaras uz nulli. BM un preces paliek.',
  confirmTitle: 'Atiestatīt progresu?', confirmBody: 'Līmenis, XP, dienu sērija, sasniegumi, spēles un uzvaras tiks nonullēti. BM bilance un preces paliek. To nevar atsaukt.',
  confirmYes: 'Jā, atiestatīt', cancel: 'Atcelt',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Bilance: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Viss atslēgts', reset_owned: 'Kolekcija iztukšota',
    reset_daily: 'Dienas lāde gatava', reset_progress: 'Progress atiestatīts', unlock_achievements: 'Visi sasniegumi atslēgti', on: 'ieslēgts', off: 'izslēgts',
  },
  err: { generic: 'Neizdevās — mēģini vēlreiz.', network: 'Nav savienojuma.', forbidden: 'Šim kontam nav atļauts.' },
  footer: 'Katra darbība tiek reģistrēta kā god_tool admina notikumos.',
};

const ru: GodStrings = {
  title: 'GOD MODE', sub: 'Инструменты владельца и тестера — видят только привилегированные аккаунты.', who: { admin: 'Владелец · главный админ', god: 'Соавтор · главный тестер' },
  close: 'Закрыть', noAccess: 'Нет доступа', noAccessSub: 'GOD MODE только для владельца и главного тестера.', back: 'Назад', signInFirst: 'Войдите в привилегированный аккаунт.',
  readout: { bm: 'Bridge Money', level: 'Уровень', owned: 'В коллекции', ach: 'Достижения', streak: 'Серия дней', xpTo: n => `${n} XP до следующего` },
  sec: {
    money: 'Bridge Money', moneySub: 'Одно касание — кредиты всегда под рукой.', progress: 'Уровни и награды', progressSub: 'Тестируйте уровни, ежедневный сундук и достижения.',
    collection: 'Коллекция', collectionSub: 'Открыть всё или начать с нуля, чтобы проверить покупки.', testing: 'Локальные тест-переключатели', testingSub: 'Хранятся только на этом устройстве.', danger: 'Опасная зона',
  },
  topup: 'Пополнить', custom: 'Своя сумма', add: 'Добавить', setExact: 'Установить', amountHint: '1 – 1 000 000', badAmount: 'Введите 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Открыть все достижения', unlockAchSub: 'Все достижения отмечены как полученные (без BM).',
  resetDaily: 'Сбросить ежедневную награду', resetDailySub: 'Сундук дня можно открыть ещё раз сегодня.',
  unlockAll: 'Открыть всё', unlockAllSub: 'Все товары магазина добавлены в коллекцию.', resetOwned: 'Очистить коллекцию', resetOwnedSub: 'Пустая коллекция — чтобы тестировать покупки.',
  xray: 'Рентген', xraySub: 'Карты ботов видны — только в локальных играх.', fast: 'Быстрые боты', fastSub: 'Боты ходят примерно в 3 раза быстрее.',
  replayIntro: 'Повторить интро', replayIntroSub: 'Перезагружает главную с вступительной анимацией.',
  resetProgress: 'Сбросить мой прогресс', resetProgressSub: 'XP, уровень, серии, достижения, игры и победы — в ноль. BM и предметы останутся.',
  confirmTitle: 'Сбросить прогресс?', confirmBody: 'Уровень, XP, серия дней, достижения, сыгранные игры и победы обнулятся. Баланс BM и предметы сохранятся. Отменить нельзя.',
  confirmYes: 'Да, сбросить', cancel: 'Отмена',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Баланс: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Всё открыто', reset_owned: 'Коллекция очищена',
    reset_daily: 'Сундук дня готов', reset_progress: 'Прогресс сброшен', unlock_achievements: 'Все достижения открыты', on: 'вкл.', off: 'выкл.',
  },
  err: { generic: 'Не получилось — попробуйте ещё раз.', network: 'Нет соединения.', forbidden: 'Для этого аккаунта запрещено.' },
  footer: 'Каждое действие записывается как god_tool в событиях админки.',
};

const uk: GodStrings = {
  title: 'GOD MODE', sub: 'Інструменти власника й тестувальника — бачать лише привілейовані акаунти.', who: { admin: 'Власник · головний адмін', god: 'Співавтор · головний тестувальник' },
  close: 'Закрити', noAccess: 'Немає доступу', noAccessSub: 'GOD MODE лише для власника та головного тестувальника.', back: 'Назад', signInFirst: 'Увійдіть у привілейований акаунт.',
  readout: { bm: 'Bridge Money', level: 'Рівень', owned: 'У колекції', ach: 'Досягнення', streak: 'Серія днів', xpTo: n => `${n} XP до наступного` },
  sec: {
    money: 'Bridge Money', moneySub: 'Один дотик — кредити завжди під рукою.', progress: 'Рівні та нагороди', progressSub: 'Тестуйте рівні, щоденну скриню й досягнення.',
    collection: 'Колекція', collectionSub: 'Відкрити все або почати з нуля, щоб перевірити покупки.', testing: 'Локальні тест-перемикачі', testingSub: 'Зберігаються лише на цьому пристрої.', danger: 'Небезпечна зона',
  },
  topup: 'Поповнити', custom: 'Своя сума', add: 'Додати', setExact: 'Встановити', amountHint: '1 – 1 000 000', badAmount: 'Введіть 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Відкрити всі досягнення', unlockAchSub: 'Усі досягнення позначено як отримані (без BM).',
  resetDaily: 'Скинути щоденну нагороду', resetDailySub: 'Скриню дня можна відкрити ще раз сьогодні.',
  unlockAll: 'Відкрити все', unlockAllSub: 'Усі товари магазину додано до колекції.', resetOwned: 'Очистити колекцію', resetOwnedSub: 'Порожня колекція — щоб тестувати покупки.',
  xray: 'Рентген', xraySub: 'Карти ботів видно — лише в локальних іграх.', fast: 'Швидкі боти', fastSub: 'Боти ходять приблизно втричі швидше.',
  replayIntro: 'Повторити інтро', replayIntroSub: 'Перезавантажує головну зі вступною анімацією.',
  resetProgress: 'Скинути мій прогрес', resetProgressSub: 'XP, рівень, серії, досягнення, ігри й перемоги — до нуля. BM і предмети лишаються.',
  confirmTitle: 'Скинути прогрес?', confirmBody: 'Рівень, XP, серія днів, досягнення, зіграні ігри та перемоги обнуляться. Баланс BM і предмети збережуться. Скасувати неможливо.',
  confirmYes: 'Так, скинути', cancel: 'Скасувати',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Баланс: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Усе відкрито', reset_owned: 'Колекцію очищено',
    reset_daily: 'Скриня дня готова', reset_progress: 'Прогрес скинуто', unlock_achievements: 'Усі досягнення відкрито', on: 'увімк.', off: 'вимк.',
  },
  err: { generic: 'Не вдалося — спробуйте ще раз.', network: 'Немає з’єднання.', forbidden: 'Для цього акаунта заборонено.' },
  footer: 'Кожна дія записується як god_tool у подіях адмінки.',
};

export const GOD: Strings<GodStrings> = { en, lv, ru, uk };
