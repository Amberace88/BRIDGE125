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

const be: GodStrings = {
  title: 'GOD MODE', sub: 'Інструменты ўладальніка і тэсціроўшчыка — бачаць толькі прывілеяваныя акаўнты.', who: { admin: 'Уладальнік · галоўны адмін', god: 'Сааўтар · галоўны тэсціроўшчык' },
  close: 'Закрыць', noAccess: 'Няма доступу', noAccessSub: 'GOD MODE толькі для ўладальніка і галоўнага тэсціроўшчыка.', back: 'Назад', signInFirst: 'Увайдзіце з прывілеяваным акаўнтам.',
  readout: { bm: 'Bridge Money', level: 'Узровень', owned: 'У калекцыі', ach: 'Дасягненні', streak: 'Серыя дзён', xpTo: n => `${n} XP да наступнага` },
  sec: {
    money: 'Bridge Money', moneySub: 'Адзін дотык — крэдыты заўсёды пад рукой.', progress: 'Узроўні і ўзнагароды', progressSub: 'Тэстуйце ўзроўні, куфар дня і дасягненні.',
    collection: 'Калекцыя', collectionSub: 'Адкрыйце ўсё або пачніце з нуля, каб тэставаць пакупкі.', testing: 'Лакальныя тэставыя пераключальнікі', testingSub: 'Захоўваюцца толькі на гэтай прыладзе.', danger: 'Небяспечная зона',
  },
  topup: 'Папоўніць', custom: 'Свая сума', add: 'Дадаць', setExact: 'Задаць', amountHint: '1 – 1 000 000', badAmount: 'Увядзіце 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Адкрыць усе дасягненні', unlockAchSub: 'Усе дасягненні адзначаюцца атрыманымі (BM не выплачваюцца).',
  resetDaily: 'Скінуць узнагароду дня', resetDailySub: 'Куфар дня можна адкрыць сёння яшчэ раз.',
  unlockAll: 'Адкрыць усё', unlockAllSub: 'Дадае ўсе тавары крамы ў калекцыю.', resetOwned: 'Ачысціць калекцыю', resetOwnedSub: 'Ачышчае калекцыю, каб можна было тэставаць пакупкі.',
  xray: 'Рэнтген', xraySub: 'Бачыць карты ботаў — толькі ў лакальных гульнях.', fast: 'Хуткія боты', fastSub: 'Боты гуляюць прыкладна ў 3 разы хутчэй.',
  replayIntro: 'Паўтарыць інтра', replayIntroSub: 'Перазагружае галоўны экран з уступнай анімацыяй.',
  resetProgress: 'Скінуць мой прагрэс', resetProgressSub: 'XP, узровень, серыі, дасягненні, гульні і перамогі — у нуль. BM і прадметы застаюцца.',
  confirmTitle: 'Скінуць прагрэс?', confirmBody: 'Узровень, XP, серыя дзён, дасягненні, згуляныя гульні і перамогі абнуляцца. Баланс BM і прадметы застаюцца. Гэта нельга адмяніць.',
  confirmYes: 'Так, скінуць', cancel: 'Адмена',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Баланс: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Усё адкрыта', reset_owned: 'Калекцыя ачышчана',
    reset_daily: 'Куфар дня гатовы', reset_progress: 'Прагрэс скінуты', unlock_achievements: 'Усе дасягненні адкрыты', on: 'укл.', off: 'выкл.',
  },
  err: { generic: 'Не атрымалася — паспрабуйце яшчэ раз.', network: 'Няма злучэння.', forbidden: 'Для гэтага акаўнта не дазволена.' },
  footer: 'Кожнае дзеянне запісваецца як god_tool у падзеях адміна.',
};

const kk: GodStrings = {
  title: 'GOD MODE', sub: 'Иесі мен тестерге арналған құралдар — тек артықшылығы бар аккаунттар көреді.', who: { admin: 'Иесі · бас әкімші', god: 'Қосавтор · бас тестер' },
  close: 'Жабу', noAccess: 'Қолжетімсіз', noAccessSub: 'GOD MODE тек иесі мен бас тестерге арналған.', back: 'Артқа', signInFirst: 'Артықшылығы бар аккаунтпен кіріңіз.',
  readout: { bm: 'Bridge Money', level: 'Деңгей', owned: 'Коллекцияда', ach: 'Жетістіктер', streak: 'Күндер сериясы', xpTo: n => `Келесіге ${n} XP` },
  sec: {
    money: 'Bridge Money', moneySub: 'Бір түрту — кредит әрқашан қолда.', progress: 'Деңгейлер мен сыйлықтар', progressSub: 'Деңгейлерді, күн сандығын және жетістіктерді тексеріңіз.',
    collection: 'Коллекция', collectionSub: 'Бәрін ашыңыз немесе сатып алуды тексеру үшін нөлден бастаңыз.', testing: 'Жергілікті тест қосқыштары', testingSub: 'Тек осы құрылғыда сақталады.', danger: 'Қауіпті аймақ',
  },
  topup: 'Толтыру', custom: 'Өз сомасы', add: 'Қосу', setExact: 'Орнату', amountHint: '1 – 1 000 000', badAmount: '1 – 1 000 000 енгізіңіз',
  addXp: n => `+${n} XP`, unlockAch: 'Барлық жетістікті ашу', unlockAchSub: 'Барлық жетістік алынды деп белгіленеді (BM төленбейді).',
  resetDaily: 'Күн сыйлығын қалпына келтіру', resetDailySub: 'Күн сандығын бүгін қайта ашуға болады.',
  unlockAll: 'Бәрін ашу', unlockAllSub: 'Дүкендегі барлық затты коллекцияға қосады.', resetOwned: 'Коллекцияны тазарту', resetOwnedSub: 'Сатып алуды тексеру үшін коллекцияны босатады.',
  xray: 'Рентген', xraySub: 'Боттардың картасын көру — тек жергілікті ойында.', fast: 'Жылдам боттар', fastSub: 'Боттар шамамен 3 есе жылдам ойнайды.',
  replayIntro: 'Интроны қайталау', replayIntroSub: 'Басты экранды кіріспе анимациясымен қайта жүктейді.',
  resetProgress: 'Прогресімді нөлдеу', resetProgressSub: 'XP, деңгей, сериялар, жетістіктер, ойындар мен жеңістер нөлге түседі. BM мен заттар қалады.',
  confirmTitle: 'Прогресті нөлдеу керек пе?', confirmBody: 'Деңгей, XP, күндер сериясы, жетістіктер, ойындар мен жеңістер нөлге түседі. BM балансы мен заттар сақталады. Мұны қайтару мүмкін емес.',
  confirmYes: 'Иә, нөлдеу', cancel: 'Бас тарту',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Баланс: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Бәрі ашылды', reset_owned: 'Коллекция тазартылды',
    reset_daily: 'Күн сандығы дайын', reset_progress: 'Прогресс нөлденді', unlock_achievements: 'Барлық жетістік ашылды', on: 'қосулы', off: 'өшірулі',
  },
  err: { generic: 'Болмады — қайталап көріңіз.', network: 'Байланыс жоқ.', forbidden: 'Бұл аккаунтқа рұқсат жоқ.' },
  footer: 'Әр әрекет әкімші оқиғаларында god_tool ретінде тіркеледі.',
};

const uz: GodStrings = {
  title: 'GOD MODE', sub: 'Egasi va testerning vositalari — faqat imtiyozli akkauntlar koʻradi.', who: { admin: 'Egasi · bosh admin', god: 'Hammuallif · bosh tester' },
  close: 'Yopish', noAccess: 'Ruxsat yoʻq', noAccessSub: 'GOD MODE faqat egasi va bosh tester uchun.', back: 'Orqaga', signInFirst: 'Imtiyozli akkaunt bilan kiring.',
  readout: { bm: 'Bridge Money', level: 'Daraja', owned: 'Kolleksiyada', ach: 'Yutuqlar', streak: 'Kunlar seriyasi', xpTo: n => `Keyingisigacha ${n} XP` },
  sec: {
    money: 'Bridge Money', moneySub: 'Bir bosish — kreditlar doim qoʻl ostida.', progress: 'Darajalar va mukofotlar', progressSub: 'Darajalar, kunlik sandiq va yutuqlarni sinang.',
    collection: 'Kolleksiya', collectionSub: 'Hammasini oching yoki xaridni sinash uchun noldan boshlang.', testing: 'Mahalliy test kalitlari', testingSub: 'Faqat shu qurilmada saqlanadi.', danger: 'Xavfli hudud',
  },
  topup: 'Toʻldirish', custom: 'Oʻz summasi', add: 'Qoʻshish', setExact: 'Belgilash', amountHint: '1 – 1 000 000', badAmount: '1 – 1 000 000 kiriting',
  addXp: n => `+${n} XP`, unlockAch: 'Barcha yutuqlarni ochish', unlockAchSub: 'Barcha yutuqlar olingan deb belgilanadi (BM toʻlanmaydi).',
  resetDaily: 'Kunlik mukofotni tiklash', resetDailySub: 'Kunlik sandiqni bugun yana ochish mumkin.',
  unlockAll: 'Hammasini ochish', unlockAllSub: 'Doʻkondagi barcha buyumlarni kolleksiyaga qoʻshadi.', resetOwned: 'Kolleksiyani tozalash', resetOwnedSub: 'Xaridni sinash uchun kolleksiyani boʻshatadi.',
  xray: 'Rentgen', xraySub: 'Botlarning kartalarini koʻrish — faqat mahalliy oʻyinlarda.', fast: 'Tez botlar', fastSub: 'Botlar taxminan 3 barobar tez oʻynaydi.',
  replayIntro: 'Introni takrorlash', replayIntroSub: 'Bosh ekranni kirish animatsiyasi bilan qayta yuklaydi.',
  resetProgress: 'Progressimni nollash', resetProgressSub: 'XP, daraja, seriyalar, yutuqlar, oʻyinlar va gʻalabalar nolga tushadi. BM va buyumlar qoladi.',
  confirmTitle: 'Progressni nollaysizmi?', confirmBody: 'Daraja, XP, kunlar seriyasi, yutuqlar, oʻyinlar va gʻalabalar nolga tushadi. BM balansi va buyumlar saqlanadi. Buni ortga qaytarib boʻlmaydi.',
  confirmYes: 'Ha, nollash', cancel: 'Bekor qilish',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Balans: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Hammasi ochildi', reset_owned: 'Kolleksiya tozalandi',
    reset_daily: 'Kunlik sandiq tayyor', reset_progress: 'Progress nollandi', unlock_achievements: 'Barcha yutuqlar ochildi', on: 'yoniq', off: 'oʻchiq',
  },
  err: { generic: 'Boʻlmadi — qayta urinib koʻring.', network: 'Aloqa yoʻq.', forbidden: 'Bu akkaunt uchun ruxsat yoʻq.' },
  footer: 'Har bir amal admin hodisalarida god_tool sifatida qayd etiladi.',
};

const az: GodStrings = {
  title: 'GOD MODE', sub: 'Sahibin və testerin alətləri — yalnız imtiyazlı hesablar görür.', who: { admin: 'Sahib · baş admin', god: 'Həmmüəllif · baş tester' },
  close: 'Bağla', noAccess: 'Giriş yoxdur', noAccessSub: 'GOD MODE yalnız sahib və baş tester üçündür.', back: 'Geri', signInFirst: 'İmtiyazlı hesabla daxil olun.',
  readout: { bm: 'Bridge Money', level: 'Səviyyə', owned: 'Kolleksiyada', ach: 'Nailiyyətlər', streak: 'Günlər seriyası', xpTo: n => `Növbətiyə ${n} XP` },
  sec: {
    money: 'Bridge Money', moneySub: 'Bir toxunuş — kreditlər həmişə əlinizin altında.', progress: 'Səviyyələr və mükafatlar', progressSub: 'Səviyyələri, gündəlik sandığı və nailiyyətləri yoxlayın.',
    collection: 'Kolleksiya', collectionSub: 'Hər şeyi açın və ya alışı yoxlamaq üçün sıfırdan başlayın.', testing: 'Lokal test açarları', testingSub: 'Yalnız bu cihazda saxlanılır.', danger: 'Təhlükəli zona',
  },
  topup: 'Artır', custom: 'Öz məbləğ', add: 'Əlavə et', setExact: 'Təyin et', amountHint: '1 – 1 000 000', badAmount: '1 – 1 000 000 daxil edin',
  addXp: n => `+${n} XP`, unlockAch: 'Bütün nailiyyətləri aç', unlockAchSub: 'Bütün nailiyyətlər qazanılmış kimi qeyd olunur (BM ödənilmir).',
  resetDaily: 'Gündəlik mükafatı sıfırla', resetDailySub: 'Gündəlik sandığı bu gün yenidən açmaq olar.',
  unlockAll: 'Hər şeyi aç', unlockAllSub: 'Mağazadakı bütün əşyaları kolleksiyaya əlavə edir.', resetOwned: 'Kolleksiyanı təmizlə', resetOwnedSub: 'Alışı yoxlamaq üçün kolleksiyanı boşaldır.',
  xray: 'Rentgen', xraySub: 'Botların kartlarını görün — yalnız lokal oyunlarda.', fast: 'Sürətli botlar', fastSub: 'Botlar təxminən 3 dəfə sürətli oynayır.',
  replayIntro: 'İntronu təkrarla', replayIntroSub: 'Ana ekranı giriş animasiyası ilə yenidən yükləyir.',
  resetProgress: 'İrəliləyişimi sıfırla', resetProgressSub: 'XP, səviyyə, seriyalar, nailiyyətlər, oyunlar və qələbələr sıfırlanır. BM və əşyalar qalır.',
  confirmTitle: 'İrəliləyiş sıfırlansın?', confirmBody: 'Səviyyə, XP, günlər seriyası, nailiyyətlər, oyunlar və qələbələr sıfırlanacaq. BM balansı və əşyalar qalır. Bunu geri qaytarmaq olmaz.',
  confirmYes: 'Bəli, sıfırla', cancel: 'Ləğv et',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Balans: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Hər şey açıldı', reset_owned: 'Kolleksiya təmizləndi',
    reset_daily: 'Gündəlik sandıq hazırdır', reset_progress: 'İrəliləyiş sıfırlandı', unlock_achievements: 'Bütün nailiyyətlər açıldı', on: 'açıq', off: 'bağlı',
  },
  err: { generic: 'Alınmadı — yenidən cəhd edin.', network: 'Bağlantı yoxdur.', forbidden: 'Bu hesab üçün icazə yoxdur.' },
  footer: 'Hər əməliyyat admin hadisələrində god_tool kimi qeydə alınır.',
};

const ka: GodStrings = {
  title: 'GOD MODE', sub: 'მფლობელისა და ტესტერის ხელსაწყოები — ჩანს მხოლოდ პრივილეგირებულ ანგარიშებზე.', who: { admin: 'მფლობელი · მთავარი ადმინი', god: 'თანაავტორი · მთავარი ტესტერი' },
  close: 'დახურვა', noAccess: 'წვდომა არ არის', noAccessSub: 'GOD MODE მხოლოდ მფლობელისა და მთავარი ტესტერისთვისაა.', back: 'უკან', signInFirst: 'შედით პრივილეგირებული ანგარიშით.',
  readout: { bm: 'Bridge Money', level: 'დონე', owned: 'კოლექციაში', ach: 'მიღწევები', streak: 'დღეების სერია', xpTo: n => `${n} XP შემდეგამდე` },
  sec: {
    money: 'Bridge Money', moneySub: 'ერთი შეხება — კრედიტები ყოველთვის ხელთაა.', progress: 'დონეები და ჯილდოები', progressSub: 'გატესტეთ დონეები, დღის სკივრი და მიღწევები.',
    collection: 'კოლექცია', collectionSub: 'გახსენით ყველაფერი ან დაიწყეთ ნულიდან ყიდვის სატესტოდ.', testing: 'ლოკალური სატესტო გადამრთველები', testingSub: 'ინახება მხოლოდ ამ მოწყობილობაზე.', danger: 'საშიში ზონა',
  },
  topup: 'შევსება', custom: 'სხვა თანხა', add: 'დამატება', setExact: 'დაყენება', amountHint: '1 – 1 000 000', badAmount: 'შეიყვანეთ 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'ყველა მიღწევის გახსნა', unlockAchSub: 'ყველა მიღწევა მოპოვებულად მოინიშნება (BM არ გაიცემა).',
  resetDaily: 'დღის ჯილდოს განულება', resetDailySub: 'დღის სკივრის გახსნა დღეს კიდევ შეიძლება.',
  unlockAll: 'ყველაფრის გახსნა', unlockAllSub: 'მაღაზიის ყველა ნივთს კოლექციაში ამატებს.', resetOwned: 'კოლექციის გასუფთავება', resetOwnedSub: 'ცლის კოლექციას, რომ ყიდვა გატესტოთ.',
  xray: 'რენტგენი', xraySub: 'ბოტების კარტების ნახვა — მხოლოდ ლოკალურ თამაშებში.', fast: 'სწრაფი ბოტები', fastSub: 'ბოტები დაახლოებით 3-ჯერ სწრაფად თამაშობენ.',
  replayIntro: 'ინტროს გამეორება', replayIntroSub: 'მთავარ ეკრანს შესავალი ანიმაციით გადატვირთავს.',
  resetProgress: 'ჩემი პროგრესის განულება', resetProgressSub: 'XP, დონე, სერიები, მიღწევები, თამაშები და მოგებები ნულდება. BM და ნივთები რჩება.',
  confirmTitle: 'განვანულოთ პროგრესი?', confirmBody: 'დონე, XP, დღეების სერია, მიღწევები, ნათამაშები და მოგებები განულდება. BM ბალანსი და ნივთები რჩება. ამის გაუქმება შეუძლებელია.',
  confirmYes: 'დიახ, განულება', cancel: 'გაუქმება',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `ბალანსი: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'ყველაფერი გაიხსნა', reset_owned: 'კოლექცია გასუფთავდა',
    reset_daily: 'დღის სკივრი მზადაა', reset_progress: 'პროგრესი განულდა', unlock_achievements: 'ყველა მიღწევა გაიხსნა', on: 'ჩართ.', off: 'გამორთ.',
  },
  err: { generic: 'ვერ მოხერხდა — სცადეთ ხელახლა.', network: 'კავშირი არ არის.', forbidden: 'ამ ანგარიშისთვის დაუშვებელია.' },
  footer: 'ყოველი მოქმედება ადმინის მოვლენებში god_tool-ად ჩაიწერება.',
};

const hy: GodStrings = {
  title: 'GOD MODE', sub: 'Սեփականատիրոջ և թեստավորողի գործիքներ․ տեսանելի են միայն արտոնյալ հաշիվներին։', who: { admin: 'Սեփականատեր · գլխավոր ադմին', god: 'Համահեղինակ · գլխավոր թեստավորող' },
  close: 'Փակել', noAccess: 'Մուտք չկա', noAccessSub: 'GOD MODE-ը միայն սեփականատիրոջ և գլխավոր թեստավորողի համար է։', back: 'Հետ', signInFirst: 'Մուտք գործեք արտոնյալ հաշվով։',
  readout: { bm: 'Bridge Money', level: 'Մակարդակ', owned: 'Հավաքածուում', ach: 'Նվաճումներ', streak: 'Օրերի շարք', xpTo: n => `${n} XP մինչև հաջորդը` },
  sec: {
    money: 'Bridge Money', moneySub: 'Մեկ հպում՝ վարկերը միշտ ձեռքի տակ են։', progress: 'Մակարդակներ և պարգևներ', progressSub: 'Փորձարկեք մակարդակները, օրվա սնդուկը և նվաճումները։',
    collection: 'Հավաքածու', collectionSub: 'Բացեք ամեն ինչ կամ սկսեք զրոյից՝ գնումները փորձարկելու համար։', testing: 'Տեղային թեստային փոխանջատիչներ', testingSub: 'Պահվում են միայն այս սարքում։', danger: 'Վտանգավոր գոտի',
  },
  topup: 'Լիցքավորել', custom: 'Այլ գումար', add: 'Ավելացնել', setExact: 'Սահմանել', amountHint: '1 – 1 000 000', badAmount: 'Մուտքագրեք 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Բացել բոլոր նվաճումները', unlockAchSub: 'Բոլոր նվաճումները նշվում են ստացված (BM չի վճարվում)։',
  resetDaily: 'Զրոյացնել օրվա պարգևը', resetDailySub: 'Օրվա սնդուկը կարելի է այսօր կրկին բացել։',
  unlockAll: 'Բացել ամեն ինչ', unlockAllSub: 'Խանութի բոլոր ապրանքներն ավելացնում է հավաքածուին։', resetOwned: 'Մաքրել հավաքածուն', resetOwnedSub: 'Դատարկում է հավաքածուն՝ գնումները փորձարկելու համար։',
  xray: 'Ռենտգեն', xraySub: 'Տեսնել բոտերի քարտերը՝ միայն տեղային խաղերում։', fast: 'Արագ բոտեր', fastSub: 'Բոտերը խաղում են մոտ 3 անգամ արագ։',
  replayIntro: 'Կրկնել ինտրոն', replayIntroSub: 'Վերաբեռնում է գլխավոր էկրանը ներածական անիմացիայով։',
  resetProgress: 'Զրոյացնել իմ առաջընթացը', resetProgressSub: 'XP, մակարդակ, շարքեր, նվաճումներ, խաղեր և հաղթանակներ՝ զրոյի։ BM-ը և իրերը մնում են։',
  confirmTitle: 'Զրոյացնե՞լ առաջընթացը', confirmBody: 'Մակարդակը, XP-ն, օրերի շարքը, նվաճումները, խաղերը և հաղթանակները կզրոյանան։ BM հաշվեկշիռը և իրերը կմնան։ Սա հնարավոր չէ հետարկել։',
  confirmYes: 'Այո, զրոյացնել', cancel: 'Չեղարկել',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Հաշվեկշիռ՝ ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Ամեն ինչ բացված է', reset_owned: 'Հավաքածուն մաքրված է',
    reset_daily: 'Օրվա սնդուկը պատրաստ է', reset_progress: 'Առաջընթացը զրոյացված է', unlock_achievements: 'Բոլոր նվաճումները բացված են', on: 'միաց.', off: 'անջ.',
  },
  err: { generic: 'Չստացվեց — փորձեք կրկին։', network: 'Կապ չկա։', forbidden: 'Այս հաշվի համար թույլատրված չէ։' },
  footer: 'Յուրաքանչյուր գործողություն գրանցվում է որպես god_tool ադմինի իրադարձություններում։',
};

const bg: GodStrings = {
  title: 'GOD MODE', sub: 'Инструменти за собственика и тестера — виждат ги само привилегировани профили.', who: { admin: 'Собственик · главен админ', god: 'Съавтор · главен тестер' },
  close: 'Затвори', noAccess: 'Няма достъп', noAccessSub: 'GOD MODE е само за собственика и главния тестер.', back: 'Назад', signInFirst: 'Влез с привилегирован профил.',
  readout: { bm: 'Bridge Money', level: 'Ниво', owned: 'В колекцията', ach: 'Постижения', streak: 'Серия дни', xpTo: n => `${n} XP до следващото` },
  sec: {
    money: 'Bridge Money', moneySub: 'Едно докосване — кредитите винаги под ръка.', progress: 'Нива и награди', progressSub: 'Тествай нивата, дневния сандък и постиженията.',
    collection: 'Колекция', collectionSub: 'Отключи всичко или започни на празно, за да тестваш покупки.', testing: 'Локални тестови превключватели', testingSub: 'Пазят се само на това устройство.', danger: 'Опасна зона',
  },
  topup: 'Зареди', custom: 'Друга сума', add: 'Добави', setExact: 'Задай', amountHint: '1 – 1 000 000', badAmount: 'Въведи 1 – 1 000 000',
  addXp: n => `+${n} XP`, unlockAch: 'Отключи всички постижения', unlockAchSub: 'Всички постижения се отбелязват като спечелени (без BM).',
  resetDaily: 'Нулирай дневната награда', resetDailySub: 'Дневният сандък може да се отвори отново днес.',
  unlockAll: 'Отключи всичко', unlockAllSub: 'Добавя всички артикули от магазина в колекцията.', resetOwned: 'Изчисти колекцията', resetOwnedSub: 'Изпразва колекцията, за да тестваш покупки.',
  xray: 'Рентген', xraySub: 'Виж картите на ботовете — само в локални игри.', fast: 'Бързи ботове', fastSub: 'Ботовете играят около 3 пъти по-бързо.',
  replayIntro: 'Повтори интрото', replayIntroSub: 'Презарежда началния екран с встъпителната анимация.',
  resetProgress: 'Нулирай прогреса ми', resetProgressSub: 'XP, ниво, серии, постижения, игри и победи се нулират. BM и предметите остават.',
  confirmTitle: 'Да нулираме ли прогреса?', confirmBody: 'Нивото, XP, серията дни, постиженията, изиграните игри и победите се нулират. BM балансът и предметите остават. Това не може да се отмени.',
  confirmYes: 'Да, нулирай', cancel: 'Отказ',
  done: {
    topup: n => `+${n} BM`, set_bm: n => `Баланс: ${n} BM`, add_xp: n => `+${n} XP`, unlock_all: 'Всичко е отключено', reset_owned: 'Колекцията е изчистена',
    reset_daily: 'Дневният сандък е готов', reset_progress: 'Прогресът е нулиран', unlock_achievements: 'Всички постижения са отключени', on: 'вкл.', off: 'изкл.',
  },
  err: { generic: 'Не стана — опитай пак.', network: 'Няма връзка.', forbidden: 'Не е разрешено за този профил.' },
  footer: 'Всяко действие се записва като god_tool в админ събитията.',
};

export const GOD: Strings<GodStrings> = { en, lv, ru, uk, be, kk, uz, az, ka, hy, bg };
