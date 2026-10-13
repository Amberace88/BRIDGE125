import type { Strings } from './pick';

/**
 * Leaderboard v2 strings. The basics (title, wins, games, win rate, you, sign in, error, empty) come from the main
 * dictionary `t.lb` (all 17 languages); this module adds the new bits. English is mandatory, others fall back.
 */
export interface LbStrings {
  tabs: { wins: string; week: string; bm: string; level: string };
  metric: { wins: string; week: string; bm: string; level: string };
  hint: { wins: string; week: string; bm: string; level: string };
  lvl: (n: number) => string;
  youRank: (n: string) => string;
  refresh: string; updated: string; pull: string; release: string; retry: string;
  guestTitle: string; guestSub: string; noGames: string;
  emptyWeek: string;
}

const en: LbStrings = {
  tabs: { wins: 'All time', week: 'This week', bm: 'Richest', level: 'Level' },
  metric: { wins: 'wins', week: 'wins this week', bm: 'BM', level: 'level' },
  hint: { wins: 'Most wins ever', week: 'Wins in the last 7 days', bm: 'Biggest Bridge Money balance', level: 'Highest level' },
  lvl: n => `Lv ${n}`,
  youRank: n => `You: #${n}`,
  refresh: 'Refresh', updated: 'Updated', pull: 'Pull to refresh', release: 'Release to refresh', retry: 'Try again',
  guestTitle: 'Get on the board', guestSub: 'Sign in — every game you play counts toward your rank.', noGames: 'no games yet',
  emptyWeek: 'No wins this week yet — be the first.',
};

const lv: LbStrings = {
  tabs: { wins: 'Visu laiku', week: 'Šonedēļ', bm: 'Bagātākie', level: 'Līmenis' },
  metric: { wins: 'uzvaras', week: 'uzvaras šonedēļ', bm: 'BM', level: 'līmenis' },
  hint: { wins: 'Visvairāk uzvaru', week: 'Uzvaras pēdējās 7 dienās', bm: 'Lielākā Bridge Money bilance', level: 'Augstākais līmenis' },
  lvl: n => `${n}. līm.`,
  youRank: n => `Tu: #${n}`,
  refresh: 'Atjaunot', updated: 'Atjaunots', pull: 'Velc, lai atjaunotu', release: 'Atlaid, lai atjaunotu', retry: 'Mēģināt vēlreiz',
  guestTitle: 'Iekļūsti tabulā', guestSub: 'Ienāc — katra spēle skaitās tavā vietā tabulā.', noGames: 'vēl nav spēļu',
  emptyWeek: 'Šonedēļ vēl nav uzvaru — esi pirmais.',
};

const ru: LbStrings = {
  tabs: { wins: 'За всё время', week: 'Неделя', bm: 'Богачи', level: 'Уровень' },
  metric: { wins: 'побед', week: 'побед за неделю', bm: 'BM', level: 'уровень' },
  hint: { wins: 'Больше всего побед', week: 'Победы за последние 7 дней', bm: 'Самый большой баланс Bridge Money', level: 'Самый высокий уровень' },
  lvl: n => `Ур. ${n}`,
  youRank: n => `Вы: #${n}`,
  refresh: 'Обновить', updated: 'Обновлено', pull: 'Потяните, чтобы обновить', release: 'Отпустите, чтобы обновить', retry: 'Повторить',
  guestTitle: 'Попади в таблицу', guestSub: 'Войдите — каждая сыгранная партия идёт в ваш рейтинг.', noGames: 'ещё нет игр',
  emptyWeek: 'На этой неделе побед ещё нет — будьте первым.',
};

const uk: LbStrings = {
  tabs: { wins: 'За весь час', week: 'Тиждень', bm: 'Багатії', level: 'Рівень' },
  metric: { wins: 'перемог', week: 'перемог за тиждень', bm: 'BM', level: 'рівень' },
  hint: { wins: 'Найбільше перемог', week: 'Перемоги за останні 7 днів', bm: 'Найбільший баланс Bridge Money', level: 'Найвищий рівень' },
  lvl: n => `Рів. ${n}`,
  youRank: n => `Ви: #${n}`,
  refresh: 'Оновити', updated: 'Оновлено', pull: 'Потягніть, щоб оновити', release: 'Відпустіть, щоб оновити', retry: 'Повторити',
  guestTitle: 'Потрап у таблицю', guestSub: 'Увійдіть — кожна зіграна партія йде у ваш рейтинг.', noGames: 'ще немає ігор',
  emptyWeek: 'Цього тижня перемог ще немає — будьте першим.',
};

const lt: LbStrings = {
  tabs: { wins: 'Visų laikų', week: 'Šią savaitę', bm: 'Turtingiausi', level: 'Lygis' },
  metric: { wins: 'pergalės', week: 'pergalės šią savaitę', bm: 'BM', level: 'lygis' },
  hint: { wins: 'Daugiausia pergalių', week: 'Pergalės per 7 dienas', bm: 'Didžiausias Bridge Money balansas', level: 'Aukščiausias lygis' },
  lvl: n => `${n} lyg.`,
  youRank: n => `Jūs: #${n}`,
  refresh: 'Atnaujinti', updated: 'Atnaujinta', pull: 'Patraukite atnaujinti', release: 'Atleiskite atnaujinti', retry: 'Bandyti dar kartą',
  guestTitle: 'Patekite į lentelę', guestSub: 'Prisijunkite — kiekvienas žaidimas skaičiuojamas.', noGames: 'dar nežaista',
  emptyWeek: 'Šią savaitę pergalių dar nėra — būkite pirmas.',
};

const et: LbStrings = {
  tabs: { wins: 'Kõigi aegade', week: 'See nädal', bm: 'Rikkaimad', level: 'Tase' },
  metric: { wins: 'võitu', week: 'võitu sel nädalal', bm: 'BM', level: 'tase' },
  hint: { wins: 'Kõige rohkem võite', week: 'Võidud viimase 7 päeva jooksul', bm: 'Suurim Bridge Money saldo', level: 'Kõrgeim tase' },
  lvl: n => `Tase ${n}`,
  youRank: n => `Sina: #${n}`,
  refresh: 'Värskenda', updated: 'Uuendatud', pull: 'Tõmba värskendamiseks', release: 'Lase lahti', retry: 'Proovi uuesti',
  guestTitle: 'Tule tabelisse', guestSub: 'Logi sisse — iga mäng loeb.', noGames: 'mänge pole veel',
  emptyWeek: 'Sel nädalal pole veel võite — ole esimene.',
};

const pl: LbStrings = {
  tabs: { wins: 'Wszech czasów', week: 'Ten tydzień', bm: 'Najbogatsi', level: 'Poziom' },
  metric: { wins: 'wygrane', week: 'wygrane w tym tygodniu', bm: 'BM', level: 'poziom' },
  hint: { wins: 'Najwięcej wygranych', week: 'Wygrane z ostatnich 7 dni', bm: 'Największe saldo Bridge Money', level: 'Najwyższy poziom' },
  lvl: n => `Poz. ${n}`,
  youRank: n => `Ty: #${n}`,
  refresh: 'Odśwież', updated: 'Zaktualizowano', pull: 'Pociągnij, aby odświeżyć', release: 'Puść, aby odświeżyć', retry: 'Spróbuj ponownie',
  guestTitle: 'Wejdź do rankingu', guestSub: 'Zaloguj się — każda gra się liczy.', noGames: 'brak gier',
  emptyWeek: 'W tym tygodniu brak wygranych — bądź pierwszy.',
};

const de: LbStrings = {
  tabs: { wins: 'Allzeit', week: 'Diese Woche', bm: 'Reichste', level: 'Level' },
  metric: { wins: 'Siege', week: 'Siege diese Woche', bm: 'BM', level: 'Level' },
  hint: { wins: 'Meiste Siege', week: 'Siege der letzten 7 Tage', bm: 'Höchstes Bridge-Money-Guthaben', level: 'Höchstes Level' },
  lvl: n => `Lv ${n}`,
  youRank: n => `Du: #${n}`,
  refresh: 'Aktualisieren', updated: 'Aktualisiert', pull: 'Zum Aktualisieren ziehen', release: 'Loslassen zum Aktualisieren', retry: 'Erneut versuchen',
  guestTitle: 'Ab in die Rangliste', guestSub: 'Melde dich an — jedes Spiel zählt für deinen Rang.', noGames: 'noch keine Spiele',
  emptyWeek: 'Diese Woche noch keine Siege — sei der Erste.',
};

const es: LbStrings = {
  tabs: { wins: 'Histórico', week: 'Esta semana', bm: 'Más ricos', level: 'Nivel' },
  metric: { wins: 'victorias', week: 'victorias esta semana', bm: 'BM', level: 'nivel' },
  hint: { wins: 'Más victorias', week: 'Victorias de los últimos 7 días', bm: 'Mayor saldo de Bridge Money', level: 'Nivel más alto' },
  lvl: n => `Nv ${n}`,
  youRank: n => `Tú: #${n}`,
  refresh: 'Actualizar', updated: 'Actualizado', pull: 'Desliza para actualizar', release: 'Suelta para actualizar', retry: 'Reintentar',
  guestTitle: 'Entra en la clasificación', guestSub: 'Inicia sesión: cada partida cuenta para tu puesto.', noGames: 'sin partidas',
  emptyWeek: 'Aún no hay victorias esta semana: sé el primero.',
};

const be: LbStrings = {
  tabs: { wins: 'За ўвесь час', week: 'Тыдзень', bm: 'Багацеі', level: 'Узровень' },
  metric: { wins: 'перамог', week: 'перамог за тыдзень', bm: 'BM', level: 'узровень' },
  hint: { wins: 'Найбольш перамог', week: 'Перамогі за апошнія 7 дзён', bm: 'Найбольшы баланс Bridge Money', level: 'Найвышэйшы ўзровень' },
  lvl: n => `Узр. ${n}`,
  youRank: n => `Вы: #${n}`,
  refresh: 'Абнавіць', updated: 'Абноўлена', pull: 'Пацягніце, каб абнавіць', release: 'Адпусціце, каб абнавіць', retry: 'Паўтарыць',
  guestTitle: 'Трапце ў табліцу', guestSub: 'Увайдзіце — кожная згуляная партыя ідзе ў ваш рэйтынг.', noGames: 'яшчэ няма гульняў',
  emptyWeek: 'На гэтым тыдні перамог яшчэ няма — будзьце першым.',
};

const kk: LbStrings = {
  tabs: { wins: 'Барлық уақыт', week: 'Осы апта', bm: 'Ең бай', level: 'Деңгей' },
  metric: { wins: 'жеңіс', week: 'апталық жеңіс', bm: 'BM', level: 'деңгей' },
  hint: { wins: 'Ең көп жеңіс', week: 'Соңғы 7 күндегі жеңістер', bm: 'Ең үлкен Bridge Money балансы', level: 'Ең жоғары деңгей' },
  lvl: n => `Дең. ${n}`,
  youRank: n => `Сіз: #${n}`,
  refresh: 'Жаңарту', updated: 'Жаңартылды', pull: 'Жаңарту үшін тартыңыз', release: 'Жаңарту үшін жіберіңіз', retry: 'Қайталау',
  guestTitle: 'Кестеге шығыңыз', guestSub: 'Кіріңіз — әр ойын рейтингіңізге есептеледі.', noGames: 'әлі ойын жоқ',
  emptyWeek: 'Бұл аптада әлі жеңіс жоқ — бірінші болыңыз.',
};

const uz: LbStrings = {
  tabs: { wins: 'Barcha vaqt', week: 'Shu hafta', bm: 'Eng boylar', level: 'Daraja' },
  metric: { wins: 'gʻalaba', week: 'haftalik gʻalaba', bm: 'BM', level: 'daraja' },
  hint: { wins: 'Eng koʻp gʻalaba', week: 'Oxirgi 7 kundagi gʻalabalar', bm: 'Eng katta Bridge Money balansi', level: 'Eng yuqori daraja' },
  lvl: n => `Dar. ${n}`,
  youRank: n => `Siz: #${n}`,
  refresh: 'Yangilash', updated: 'Yangilandi', pull: 'Yangilash uchun torting', release: 'Yangilash uchun qoʻyib yuboring', retry: 'Qayta urinish',
  guestTitle: 'Jadvalga chiqing', guestSub: 'Kiring — har bir oʻyin reytingingizga hisoblanadi.', noGames: 'hali oʻyin yoʻq',
  emptyWeek: 'Bu hafta hali gʻalaba yoʻq — birinchi boʻling.',
};

const az: LbStrings = {
  tabs: { wins: 'Bütün dövr', week: 'Bu həftə', bm: 'Ən varlılar', level: 'Səviyyə' },
  metric: { wins: 'qələbə', week: 'həftəlik qələbə', bm: 'BM', level: 'səviyyə' },
  hint: { wins: 'Ən çox qələbə', week: 'Son 7 gündəki qələbələr', bm: 'Ən böyük Bridge Money balansı', level: 'Ən yüksək səviyyə' },
  lvl: n => `Səv. ${n}`,
  youRank: n => `Siz: #${n}`,
  refresh: 'Yenilə', updated: 'Yeniləndi', pull: 'Yeniləmək üçün çəkin', release: 'Yeniləmək üçün buraxın', retry: 'Yenidən',
  guestTitle: 'Cədvələ düşün', guestSub: 'Daxil olun — hər oyun reytinqinizə sayılır.', noGames: 'hələ oyun yoxdur',
  emptyWeek: 'Bu həftə hələ qələbə yoxdur — birinci siz olun.',
};

const ka: LbStrings = {
  tabs: { wins: 'ყველა დრო', week: 'ეს კვირა', bm: 'უმდიდრესები', level: 'დონე' },
  metric: { wins: 'მოგება', week: 'მოგება ამ კვირაში', bm: 'BM', level: 'დონე' },
  hint: { wins: 'ყველაზე მეტი მოგება', week: 'მოგებები ბოლო 7 დღეში', bm: 'Bridge Money-ს ყველაზე დიდი ბალანსი', level: 'ყველაზე მაღალი დონე' },
  lvl: n => `დონე ${n}`,
  youRank: n => `თქვენ: #${n}`,
  refresh: 'განახლება', updated: 'განახლდა', pull: 'ჩამოწიეთ განსაახლებლად', release: 'გაუშვით განსაახლებლად', retry: 'ხელახლა',
  guestTitle: 'მოხვდით ცხრილში', guestSub: 'შედით — ყოველი თამაში თქვენს რეიტინგში ითვლება.', noGames: 'ჯერ თამაში არ არის',
  emptyWeek: 'ამ კვირაში ჯერ მოგება არ არის — იყავით პირველი.',
};

const hy: LbStrings = {
  tabs: { wins: 'Բոլոր ժամանակները', week: 'Այս շաբաթ', bm: 'Ամենահարուստները', level: 'Մակարդակ' },
  metric: { wins: 'հաղթանակ', week: 'հաղթանակ այս շաբաթ', bm: 'BM', level: 'մակարդակ' },
  hint: { wins: 'Ամենաշատ հաղթանակներ', week: 'Հաղթանակներ վերջին 7 օրում', bm: 'Bridge Money-ի ամենամեծ հաշվեկշիռը', level: 'Ամենաբարձր մակարդակը' },
  lvl: n => `Մկ. ${n}`,
  youRank: n => `Դուք՝ #${n}`,
  refresh: 'Թարմացնել', updated: 'Թարմացված է', pull: 'Քաշեք՝ թարմացնելու համար', release: 'Բաց թողեք՝ թարմացնելու համար', retry: 'Կրկին',
  guestTitle: 'Մտեք աղյուսակ', guestSub: 'Մուտք գործեք․ յուրաքանչյուր խաղ հաշվվում է ձեր վարկանիշում։', noGames: 'դեռ խաղ չկա',
  emptyWeek: 'Այս շաբաթ դեռ հաղթանակ չկա․ եղեք առաջինը։',
};

const bg: LbStrings = {
  tabs: { wins: 'За всички времена', week: 'Тази седмица', bm: 'Най-богати', level: 'Ниво' },
  metric: { wins: 'победи', week: 'победи тази седмица', bm: 'BM', level: 'ниво' },
  hint: { wins: 'Най-много победи', week: 'Победи през последните 7 дни', bm: 'Най-голям баланс Bridge Money', level: 'Най-високо ниво' },
  lvl: n => `Ниво ${n}`,
  youRank: n => `Ти: #${n}`,
  refresh: 'Обнови', updated: 'Обновено', pull: 'Дръпни, за да обновиш', release: 'Пусни, за да обновиш', retry: 'Опитай пак',
  guestTitle: 'Влез в класацията', guestSub: 'Влез в профила си — всяка изиграна игра се брои за мястото ти.', noGames: 'още няма игри',
  emptyWeek: 'Тази седмица още няма победи — бъди първият.',
};

export const LB: Strings<LbStrings> = { en, lv, ru, uk, lt, et, pl, de, es, be, kk, uz, az, ka, hy, bg };
