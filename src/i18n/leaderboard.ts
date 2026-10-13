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

const ro: LbStrings = {
  tabs: { wins: 'Din totdeauna', week: 'Săptămâna asta', bm: 'Cei mai bogați', level: 'Nivel' },
  metric: { wins: 'victorii', week: 'victorii săptămâna asta', bm: 'BM', level: 'nivel' },
  hint: { wins: 'Cele mai multe victorii', week: 'Victorii în ultimele 7 zile', bm: 'Cel mai mare sold Bridge Money', level: 'Cel mai înalt nivel' },
  lvl: n => `Niv. ${n}`,
  youRank: n => `Tu: #${n}`,
  refresh: 'Reîmprospătează', updated: 'Actualizat', pull: 'Trage ca să reîmprospătezi', release: 'Eliberează ca să reîmprospătezi', retry: 'Încearcă din nou',
  guestTitle: 'Intră în clasament', guestSub: 'Conectează-te — fiecare partidă contează pentru locul tău.', noGames: 'încă nicio partidă',
  emptyWeek: 'Nicio victorie săptămâna asta — fii primul.',
};

export const LB: Strings<LbStrings> = { en, lv, ru, uk, lt, et, pl, de, ro, es };
