import type { Strings } from './pick';

/** Strings for the Bridge Money economy: the Vault (wheel, boosts, collections, prestige) and the stake tables. */
export interface EcoStrings {
  vault: { title: string; sub: string; tabs: { wheel: string; boosts: string; collections: string; prestige: string }; shards: string; close: string; signIn: string; signInBtn: string; noCash: string };
  wheel: {
    title: string; sub: string; free: string; spinFree: string; spinPaid: (price: string) => string; spinning: string;
    nextFree: (t: string) => string; paidLeft: (n: number) => string; limit: string; odds: string; oddsSub: string; chance: string;
    prize: { bm: (n: string) => string; xp: (n: string) => string; shards: (n: number) => string; boost_xp: string; boost_luck: string; shield: string };
    won: string; jackpot: string; collect: string; again: string;
  };
  stakes: {
    title: string; sub: string; tiers: [string, string, string]; entry: string; pot: string; level: (n: number) => string;
    sit: (entry: string) => string; locked: (n: number) => string; funds: string; active: string; resume: string; forfeit: string; forfeitConfirm: string;
    today: (n: number, max: number) => string; rules: string[]; shield: (n: number) => string; lucky: string;
    result: { won: (bm: string) => string; lost: (bm: string) => string; void: string; expired: string };
    pick: string; cancel: string; starting: string;
  };
  boosts: {
    title: string; sub: string; buy: (price: string) => string; active: (t: string) => string; max: string; owned: (n: number) => string;
    xp2: { name: string; desc: string }; lucky: { name: string; desc: string }; shield: { name: string; desc: string };
  };
  collections: {
    title: string; sub: string; names: Record<string, string>; forge: (cost: number) => string; forged: string; complete: string;
    reward: string; progress: (n: number) => string; need: (n: number) => string;
  };
  prestige: {
    title: string; sub: string; star: (n: number) => string; need: (lvl: number) => string; go: string; confirm: string; yes: string; no: string;
    keeps: string; resets: string; done: (n: number) => string; perks: string[];
  };
  err: { funds: (n: string) => string; limit: string; used: string; level: (n: number) => string; network: string; max: string; owned: string; generic: string };
}

const en: EcoStrings = {
  vault: { title: 'The Vault', sub: 'Spin, boost, forge and rise — Bridge Money at work.', tabs: { wheel: 'Fortune Wheel', boosts: 'Boosts', collections: 'Collections', prestige: 'Prestige' }, shards: 'Shards', close: 'Close', signIn: 'Sign in to open the Vault — your spins, shards and boosts live on your account.', signInBtn: 'Sign in', noCash: 'Bridge Money has no cash value and can never be withdrawn.' },
  wheel: {
    title: 'Fortune Wheel', sub: 'One free spin every day. Prizes are decided by the house — and the odds are on the table.', free: 'Free spin ready',
    spinFree: 'Spin for free', spinPaid: p => `Spin again · ${p}`, spinning: 'Spinning…',
    nextFree: t => `Next free spin in ${t}`, paidLeft: n => `${n} extra ${n === 1 ? 'spin' : 'spins'} left today`, limit: 'That’s all the spins for today. See you tomorrow.',
    odds: 'Odds', oddsSub: 'Every spin is decided on the server. These are the exact chances.', chance: 'Chance',
    prize: { bm: n => `${n} BM`, xp: n => `${n} XP`, shards: n => `${n} ${n === 1 ? 'shard' : 'shards'}`, boost_xp: 'XP ×2 · 1 h', boost_luck: 'Lucky shuffle · 24 h', shield: 'Shield' },
    won: 'You won', jackpot: 'Jackpot!', collect: 'Collect', again: 'Spin again',
  },
  stakes: {
    title: 'High-stakes tables', sub: 'Pay the entry, beat three Hard bots, take the pot.', tiers: ['The Salon', 'Private Room', 'High Table'],
    entry: 'Entry', pot: 'Pot', level: n => `Level ${n}+`, sit: e => `Sit down · ${e}`, locked: n => `Unlocks at level ${n}`, funds: 'Not enough BM',
    active: 'Stake in play', resume: 'Back to the table', forfeit: 'Forfeit', forfeitConfirm: 'Leave the stake? The entry is lost.',
    today: (n, m) => `${n} of ${m} stake tables today`,
    rules: ['Pot = entry × 2.5 to the winner', 'Three Hard bots · bluff off', 'Leaving the table forfeits the entry', 'Lucky shuffle adds 10 % · a Shield softens one Q♠'],
    shield: n => `${n} ${n === 1 ? 'Shield' : 'Shields'} ready`, lucky: 'Lucky shuffle +10 %',
    result: { won: bm => `Pot won · +${bm} BM`, lost: bm => `Stake lost · −${bm} BM`, void: 'Stake void — the game ended too fast', expired: 'Stake expired' },
    pick: 'Choose your table', cancel: 'Cancel', starting: 'Taking your seat…',
  },
  boosts: {
    title: 'Boosts', sub: 'Rewards only — boosts never touch the cards against real players.', buy: p => `Activate · ${p}`, active: t => `Active · ${t} left`, max: 'Maxed out', owned: n => `${n} in hand`,
    xp2: { name: 'XP ×2', desc: 'Double XP from every game for 1 hour. Stacks up to 6 hours.' },
    lucky: { name: 'Lucky shuffle', desc: '+10 % BM from won games and won stakes for 24 hours.' },
    shield: { name: 'Shield', desc: 'In a stake match, the next Q♠ against you draws 2 cards fewer. Hold up to 5.' },
  },
  collections: {
    title: 'Collections', sub: 'Shards from the wheel and medals forge relics. Four relics complete a set — and an exclusive reward.',
    names: { obsidian: 'Obsidian Spades', aurum: 'Aurum Diamonds', vault: 'Velvet Hearts' }, forge: c => `Forge · ${c}`, forged: 'Forged', complete: 'Complete',
    reward: 'Set reward', progress: n => `${n} / 4 relics`, need: n => `${n} more ${n === 1 ? 'shard' : 'shards'}`,
  },
  prestige: {
    title: 'Prestige', sub: 'Reach level 50, then start again with a star — and an exclusive frame.', star: n => `Prestige ${n}`, need: l => `Reach level ${l} to prestige`,
    go: 'Prestige now', confirm: 'Your level returns to 1. Level rewards are paid again on the way back up.', yes: 'Yes, prestige', no: 'Not yet',
    keeps: 'You keep: BM, items, achievements', resets: 'Resets: level and XP', done: n => `Prestige ${n} reached`,
    perks: ['A prestige star by your name', 'Prestige Halo frame', '+10 shards', 'Level rewards all over again'],
  },
  err: { funds: n => `You need ${n} more BM`, limit: 'Daily limit reached', used: 'Already used today', level: n => `Unlocks at level ${n}`, network: 'Connection problem — try again', max: 'Already at the maximum', owned: 'Already owned', generic: 'Something went wrong' },
};

const lv: EcoStrings = {
  vault: { title: 'Seifs', sub: 'Griez, pastiprini, kal un kāp augšup — Bridge Money darbībā.', tabs: { wheel: 'Laimes rats', boosts: 'Pastiprinājumi', collections: 'Kolekcijas', prestige: 'Prestižs' }, shards: 'Šķembas', close: 'Aizvērt', signIn: 'Pieslēdzies, lai atvērtu Seifu — tavi griezieni, šķembas un pastiprinājumi glabājas kontā.', signInBtn: 'Pieslēgties', noCash: 'Bridge Money nav naudas vērtības, un to nevar izņemt.' },
  wheel: {
    title: 'Laimes rats', sub: 'Viens bezmaksas grieziens katru dienu. Balvas nosaka nams — un izredzes ir uz galda.', free: 'Bezmaksas grieziens gaida',
    spinFree: 'Griezt bez maksas', spinPaid: p => `Griezt vēlreiz · ${p}`, spinning: 'Griežas…',
    nextFree: t => `Nākamais bezmaksas grieziens pēc ${t}`, paidLeft: n => `Šodien atlikuši ${n} papildu griezieni`, limit: 'Šodienas griezieni ir izsmelti. Tiekamies rīt.',
    odds: 'Izredzes', oddsSub: 'Katru griezienu nosaka serveris. Šīs ir precīzās iespējas.', chance: 'Iespēja',
    prize: { bm: n => `${n} BM`, xp: n => `${n} XP`, shards: n => `${n} ${n === 1 ? 'šķemba' : 'šķembas'}`, boost_xp: 'XP ×2 · 1 h', boost_luck: 'Laimīgā jaukšana · 24 h', shield: 'Vairogs' },
    won: 'Tu laimēji', jackpot: 'Džekpots!', collect: 'Saņemt', again: 'Griezt vēlreiz',
  },
  stakes: {
    title: 'Augsto likmju galdi', sub: 'Samaksā iemaksu, pārspēj trīs grūtos botus, paņem banku.', tiers: ['Salons', 'Privātā istaba', 'Augstais galds'],
    entry: 'Iemaksa', pot: 'Banka', level: n => `${n}. līmenis+`, sit: e => `Apsēsties · ${e}`, locked: n => `Atveras ${n}. līmenī`, funds: 'Nepietiek BM',
    active: 'Likme spēlē', resume: 'Atpakaļ pie galda', forfeit: 'Padoties', forfeitConfirm: 'Pamest likmi? Iemaksa tiks zaudēta.',
    today: (n, m) => `Šodien ${n} no ${m} likmju galdiem`,
    rules: ['Banka = iemaksa × 2,5 uzvarētājam', 'Trīs grūtie boti · bez blefa', 'Pametot galdu, iemaksa tiek zaudēta', 'Laimīgā jaukšana +10 % · Vairogs mīkstina vienu pīķa dāmu'],
    shield: n => `${n} ${n === 1 ? 'vairogs' : 'vairogi'} gatavībā`, lucky: 'Laimīgā jaukšana +10 %',
    result: { won: bm => `Banka laimēta · +${bm} BM`, lost: bm => `Likme zaudēta · −${bm} BM`, void: 'Likme anulēta — spēle beidzās pārāk ātri', expired: 'Likmei beidzies termiņš' },
    pick: 'Izvēlies galdu', cancel: 'Atcelt', starting: 'Ieņem vietu…',
  },
  boosts: {
    title: 'Pastiprinājumi', sub: 'Tikai balvām — pastiprinājumi nekad neietekmē kārtis pret īstiem spēlētājiem.', buy: p => `Aktivizēt · ${p}`, active: t => `Aktīvs · atlikušas ${t}`, max: 'Maksimums sasniegts', owned: n => `${n} rokā`,
    xp2: { name: 'XP ×2', desc: 'Dubults XP no katras spēles 1 stundu. Krājas līdz 6 stundām.' },
    lucky: { name: 'Laimīgā jaukšana', desc: '+10 % BM no uzvarētām spēlēm un likmēm 24 stundas.' },
    shield: { name: 'Vairogs', desc: 'Likmju spēlē nākamā pīķa dāma pret tevi liek vilkt par 2 kārtīm mazāk. Līdz 5 vienībām.' },
  },
  collections: {
    title: 'Kolekcijas', sub: 'Šķembas no rata un medaļām kaļ relikvijas. Četras relikvijas pabeidz komplektu — un dod ekskluzīvu balvu.',
    names: { obsidian: 'Obsidiāna pīķi', aurum: 'Aurum kārava', vault: 'Samta ercens' }, forge: c => `Kalt · ${c}`, forged: 'Izkalta', complete: 'Pabeigta',
    reward: 'Komplekta balva', progress: n => `${n} / 4 relikvijas`, need: n => `Vēl ${n} ${n === 1 ? 'šķemba' : 'šķembas'}`,
  },
  prestige: {
    title: 'Prestižs', sub: 'Sasniedz 50. līmeni un sāc no jauna ar zvaigzni — un ekskluzīvu rāmi.', star: n => `${n}. prestižs`, need: l => `Sasniedz ${l}. līmeni, lai iegūtu prestižu`,
    go: 'Iegūt prestižu', confirm: 'Tavs līmenis atgriezīsies uz 1. Līmeņu balvas tiks izmaksātas vēlreiz ceļā augšup.', yes: 'Jā, prestižs', no: 'Vēl ne',
    keeps: 'Paliek: BM, priekšmeti, sasniegumi', resets: 'Nonullējas: līmenis un XP', done: n => `Sasniegts ${n}. prestižs`,
    perks: ['Prestiža zvaigzne pie tava vārda', 'Prestiža oreola rāmis', '+10 šķembas', 'Līmeņu balvas no jauna'],
  },
  err: { funds: n => `Vajag vēl ${n} BM`, limit: 'Dienas limits sasniegts', used: 'Šodien jau izmantots', level: n => `Atveras ${n}. līmenī`, network: 'Savienojuma problēma — mēģini vēlreiz', max: 'Jau maksimums', owned: 'Jau pieder', generic: 'Kaut kas nogāja greizi' },
};

const ru: EcoStrings = {
  vault: { title: 'Сейф', sub: 'Крутите, усиливайтесь, куйте и растите — Bridge Money в деле.', tabs: { wheel: 'Колесо фортуны', boosts: 'Бустеры', collections: 'Коллекции', prestige: 'Престиж' }, shards: 'Осколки', close: 'Закрыть', signIn: 'Войдите, чтобы открыть Сейф — вращения, осколки и бустеры хранятся в аккаунте.', signInBtn: 'Войти', noCash: 'Bridge Money не имеет денежной ценности и не выводится.' },
  wheel: {
    title: 'Колесо фортуны', sub: 'Одно бесплатное вращение каждый день. Призы решает заведение — а шансы открыты.', free: 'Бесплатное вращение ждёт',
    spinFree: 'Крутить бесплатно', spinPaid: p => `Ещё раз · ${p}`, spinning: 'Крутится…',
    nextFree: t => `Следующее бесплатное через ${t}`, paidLeft: n => `Сегодня осталось доп. вращений: ${n}`, limit: 'На сегодня вращения закончились. До завтра.',
    odds: 'Шансы', oddsSub: 'Каждое вращение решает сервер. Это точные вероятности.', chance: 'Шанс',
    prize: { bm: n => `${n} BM`, xp: n => `${n} XP`, shards: n => `${n} оск.`, boost_xp: 'XP ×2 · 1 ч', boost_luck: 'Удачная тасовка · 24 ч', shield: 'Щит' },
    won: 'Ваш выигрыш', jackpot: 'Джекпот!', collect: 'Забрать', again: 'Крутить ещё',
  },
  stakes: {
    title: 'Столы с высокими ставками', sub: 'Внесите ставку, обыграйте трёх сильных ботов, заберите банк.', tiers: ['Салон', 'Отдельный кабинет', 'Высокий стол'],
    entry: 'Взнос', pot: 'Банк', level: n => `Уровень ${n}+`, sit: e => `Сесть · ${e}`, locked: n => `Откроется на ${n}-м уровне`, funds: 'Не хватает BM',
    active: 'Ставка в игре', resume: 'Вернуться за стол', forfeit: 'Сдаться', forfeitConfirm: 'Покинуть ставку? Взнос будет потерян.',
    today: (n, m) => `Сегодня ${n} из ${m} столов`,
    rules: ['Банк = взнос × 2,5 победителю', 'Три сильных бота · без блефа', 'Уход из-за стола — потеря взноса', 'Удачная тасовка +10 % · Щит смягчает одну даму пик'],
    shield: n => `Щитов: ${n}`, lucky: 'Удачная тасовка +10 %',
    result: { won: bm => `Банк ваш · +${bm} BM`, lost: bm => `Ставка проиграна · −${bm} BM`, void: 'Ставка аннулирована — партия закончилась слишком быстро', expired: 'Срок ставки истёк' },
    pick: 'Выберите стол', cancel: 'Отмена', starting: 'Занимаем место…',
  },
  boosts: {
    title: 'Бустеры', sub: 'Только награды — бустеры никогда не влияют на карты против живых игроков.', buy: p => `Активировать · ${p}`, active: t => `Активен · осталось ${t}`, max: 'Максимум', owned: n => `В запасе: ${n}`,
    xp2: { name: 'XP ×2', desc: 'Двойной XP за каждую партию в течение часа. Копится до 6 часов.' },
    lucky: { name: 'Удачная тасовка', desc: '+10 % BM за выигранные партии и ставки в течение 24 часов.' },
    shield: { name: 'Щит', desc: 'В игре на ставку следующая дама пик против вас — на 2 карты меньше. До 5 штук.' },
  },
  collections: {
    title: 'Коллекции', sub: 'Осколки с колеса и медалей превращаются в реликвии. Четыре реликвии — полный комплект и эксклюзивная награда.',
    names: { obsidian: 'Обсидиановые пики', aurum: 'Аурум-бубны', vault: 'Бархатные червы' }, forge: c => `Выковать · ${c}`, forged: 'Выкована', complete: 'Собрана',
    reward: 'Награда за комплект', progress: n => `${n} / 4 реликвии`, need: n => `Не хватает ${n} оск.`,
  },
  prestige: {
    title: 'Престиж', sub: 'Достигните 50-го уровня и начните заново со звездой — и эксклюзивной рамкой.', star: n => `Престиж ${n}`, need: l => `Достигните ${l}-го уровня для престижа`,
    go: 'Получить престиж', confirm: 'Уровень вернётся к 1. Награды за уровни будут выплачены снова.', yes: 'Да, престиж', no: 'Пока нет',
    keeps: 'Остаются: BM, предметы, достижения', resets: 'Сбрасываются: уровень и XP', done: n => `Престиж ${n} получен`,
    perks: ['Звезда престижа у имени', 'Рамка «Ореол престижа»', '+10 осколков', 'Награды за уровни заново'],
  },
  err: { funds: n => `Не хватает ${n} BM`, limit: 'Дневной лимит исчерпан', used: 'Уже использовано сегодня', level: n => `Откроется на ${n}-м уровне`, network: 'Проблема со связью — попробуйте ещё раз', max: 'Уже максимум', owned: 'Уже есть', generic: 'Что-то пошло не так' },
};

const uk: EcoStrings = {
  vault: { title: 'Сейф', sub: 'Крутіть, підсилюйтесь, куйте й ростіть — Bridge Money у справі.', tabs: { wheel: 'Колесо фортуни', boosts: 'Бустери', collections: 'Колекції', prestige: 'Престиж' }, shards: 'Уламки', close: 'Закрити', signIn: 'Увійдіть, щоб відкрити Сейф — оберти, уламки й бустери зберігаються в акаунті.', signInBtn: 'Увійти', noCash: 'Bridge Money не має грошової цінності й не виводиться.' },
  wheel: {
    title: 'Колесо фортуни', sub: 'Один безкоштовний оберт щодня. Призи вирішує заклад — а шанси відкриті.', free: 'Безкоштовний оберт чекає',
    spinFree: 'Крутити безкоштовно', spinPaid: p => `Ще раз · ${p}`, spinning: 'Крутиться…',
    nextFree: t => `Наступний безкоштовний через ${t}`, paidLeft: n => `Сьогодні лишилося дод. обертів: ${n}`, limit: 'На сьогодні оберти скінчилися. До завтра.',
    odds: 'Шанси', oddsSub: 'Кожен оберт вирішує сервер. Це точні ймовірності.', chance: 'Шанс',
    prize: { bm: n => `${n} BM`, xp: n => `${n} XP`, shards: n => `${n} ул.`, boost_xp: 'XP ×2 · 1 год', boost_luck: 'Вдале тасування · 24 год', shield: 'Щит' },
    won: 'Ваш виграш', jackpot: 'Джекпот!', collect: 'Забрати', again: 'Крутити ще',
  },
  stakes: {
    title: 'Столи з високими ставками', sub: 'Внесіть ставку, обіграйте трьох сильних ботів, заберіть банк.', tiers: ['Салон', 'Окремий кабінет', 'Високий стіл'],
    entry: 'Внесок', pot: 'Банк', level: n => `Рівень ${n}+`, sit: e => `Сісти · ${e}`, locked: n => `Відкриється на ${n}-му рівні`, funds: 'Бракує BM',
    active: 'Ставка в грі', resume: 'Повернутися за стіл', forfeit: 'Здатися', forfeitConfirm: 'Покинути ставку? Внесок буде втрачено.',
    today: (n, m) => `Сьогодні ${n} з ${m} столів`,
    rules: ['Банк = внесок × 2,5 переможцю', 'Три сильні боти · без блефу', 'Вихід з-за столу — втрата внеску', 'Вдале тасування +10 % · Щит пом’якшує одну даму пік'],
    shield: n => `Щитів: ${n}`, lucky: 'Вдале тасування +10 %',
    result: { won: bm => `Банк ваш · +${bm} BM`, lost: bm => `Ставку програно · −${bm} BM`, void: 'Ставку анульовано — партія скінчилася надто швидко', expired: 'Строк ставки минув' },
    pick: 'Оберіть стіл', cancel: 'Скасувати', starting: 'Займаємо місце…',
  },
  boosts: {
    title: 'Бустери', sub: 'Лише нагороди — бустери ніколи не впливають на карти проти живих гравців.', buy: p => `Активувати · ${p}`, active: t => `Активний · лишилось ${t}`, max: 'Максимум', owned: n => `У запасі: ${n}`,
    xp2: { name: 'XP ×2', desc: 'Подвійний XP за кожну партію протягом години. Накопичується до 6 годин.' },
    lucky: { name: 'Вдале тасування', desc: '+10 % BM за виграні партії та ставки протягом 24 годин.' },
    shield: { name: 'Щит', desc: 'У грі на ставку наступна дама пік проти вас — на 2 карти менше. До 5 штук.' },
  },
  collections: {
    title: 'Колекції', sub: 'Уламки з колеса й медалей стають реліквіями. Чотири реліквії — повний комплект і ексклюзивна нагорода.',
    names: { obsidian: 'Обсидіанові піки', aurum: 'Аурум-бубни', vault: 'Оксамитові чирви' }, forge: c => `Викувати · ${c}`, forged: 'Викувано', complete: 'Зібрано',
    reward: 'Нагорода за комплект', progress: n => `${n} / 4 реліквії`, need: n => `Бракує ${n} ул.`,
  },
  prestige: {
    title: 'Престиж', sub: 'Досягніть 50-го рівня й почніть знову із зіркою — та ексклюзивною рамкою.', star: n => `Престиж ${n}`, need: l => `Досягніть ${l}-го рівня для престижу`,
    go: 'Отримати престиж', confirm: 'Рівень повернеться до 1. Нагороди за рівні буде виплачено знову.', yes: 'Так, престиж', no: 'Ще ні',
    keeps: 'Залишаються: BM, предмети, досягнення', resets: 'Скидаються: рівень і XP', done: n => `Престиж ${n} отримано`,
    perks: ['Зірка престижу біля імені', 'Рамка «Ореол престижу»', '+10 уламків', 'Нагороди за рівні знову'],
  },
  err: { funds: n => `Бракує ${n} BM`, limit: 'Денний ліміт вичерпано', used: 'Уже використано сьогодні', level: n => `Відкриється на ${n}-му рівні`, network: 'Проблема зі зв’язком — спробуйте ще раз', max: 'Уже максимум', owned: 'Уже є', generic: 'Щось пішло не так' },
};

/** Not registered with registerStrings() yet (see achievements.ts) — lazily loaded languages show English. */
export const ECO_STRINGS: Strings<EcoStrings> = { en, lv, ru, uk };
