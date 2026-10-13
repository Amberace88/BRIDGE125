import { type DeepPartial, type Strings, registerStrings, withFallback } from '../../i18n/pick';
import { TAGLINE, TITLE } from './meta';

/** Durak's own strings. en / lv / ru / uk are complete; the other languages translate the main words (rest: English). */
export interface DurakStrings {
  title: string; tagline: string;
  play: string; resume: string; newGame: string; players: string; level: string; easy: string; normal: string; hard: string;
  variant: string; podkidnoy: string; perevodnoy: string; podkidnoyHint: string; perevodnoyHint: string;
  deck: string; cards: (n: number) => string; rules: string; back: string; close: string; menu: string;
  saveExit: string; savedNote: string; newGameConfirm: string;
  bito: string; take: string; pass: string; transfer: string; you: string; trump: string; talon: (n: number) => string; discard: string;
  st: {
    attack: string; defend: string; throwIn: string; throwTaking: string; waiting: (who: string) => string;
    dealing: string; tapToSkip: string; youOut: string; selectTarget: string;
  };
  bubble: { take: string; bito: string; pass: string; transfer: string };
  ev: {
    lowTrump: (who: string, card: string) => string; lowTrumpYou: (card: string) => string; firstMove: (who: string) => string;
    took: (who: string) => string; tookYou: string; beaten: string; transfer: (who: string) => string; transferYou: string;
    out: (who: string) => string; outYou: string; talonEmpty: string;
  };
  role: { attacker: string; defender: string };
  end: {
    durak: string; notDurak: string; durakIs: (who: string) => string; draw: string; drawSub: string;
    place: (n: number) => string; again: string; settings: string; home: string; pogony: string; durakTag: string;
    loseLines: string[]; winLines: string[]; signIn: string; skip: string;
  };
  hints: { attack: string; defend: string; throwIn: string; transfer: string; taking: string; gotIt: string };
  fast: string; on: string; off: string;
  rulesTitle: string; rulesList: { h: string; p: string }[];
  botNames: string[];
}

const en: DurakStrings = {
  title: TITLE.en, tagline: TAGLINE.en,
  play: 'Deal', resume: 'Continue game', newGame: 'New game', players: 'Players', level: 'Bots', easy: 'Easy', normal: 'Normal', hard: 'Hard',
  variant: 'Variant', podkidnoy: 'Throw-in', perevodnoy: 'Transfer', podkidnoyHint: 'Everyone may throw in cards of ranks on the table',
  perevodnoyHint: 'Plus: pass the attack on with a card of the same rank',
  deck: 'Deck', cards: n => `${n} cards`, rules: 'Rules', back: 'Back', close: 'Close', menu: 'Menu',
  saveExit: 'Save and leave', savedNote: 'Every move is saved — continue any time.', newGameConfirm: 'Start a new game? This one will be lost.',
  bito: 'Done', take: 'Take', pass: 'Pass', transfer: 'Transfer', you: 'You', trump: 'Trump', talon: n => `${n} left`, discard: 'Discard',
  st: {
    attack: 'Your attack', defend: 'Beat it — or take', throwIn: 'Throw in — or done', throwTaking: 'They take — add more?',
    waiting: w => `${w} is thinking`, dealing: 'Dealing…', tapToSkip: 'Tap to skip', youOut: 'You are out — watching the finish',
    selectTarget: 'Pick the card to beat',
  },
  bubble: { take: 'I take', bito: 'Done', pass: 'Pass', transfer: 'Transfer!' },
  ev: {
    lowTrump: (w, c) => `Lowest trump ${c} — ${w} starts`, lowTrumpYou: c => `Your lowest trump ${c} — you start`, firstMove: w => `${w} starts`,
    took: w => `${w} takes the cards`, tookYou: 'You take the cards', beaten: 'Beaten!', transfer: w => `Transferred! ${w} defends`,
    transferYou: 'Transferred to you!', out: w => `${w} is out`, outYou: 'You are out of cards!', talonEmpty: 'The deck is empty',
  },
  role: { attacker: 'Attacks', defender: 'Defends' },
  end: {
    durak: 'Durak!', notDurak: 'Not the fool!', durakIs: w => `${w} is the durak`, draw: 'A draw', drawSub: 'The last cards went out together — nobody wears the hat',
    place: n => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} place`, again: 'Play again', settings: 'Settings', home: 'Leave',
    pogony: 'With epaulettes!', durakTag: 'Durak',
    loseLines: ['The paper hat suits you.', 'Every master once wore the hat.', 'The cards were against you. This time.'],
    winLines: ['Clean hands, clear head.', 'Out first — style points.', 'Someone else gets the hat today.'],
    signIn: 'Sign in to keep rewards and climb the leaderboard', skip: 'Skip',
  },
  hints: {
    attack: 'Your attack: play any card. Low non-trumps are the smart lead.',
    defend: 'Beat each card with a higher one of the same suit, or with a trump. Or press Take.',
    throwIn: 'Throw in cards whose rank is on the table — or press Done.',
    transfer: 'Transfer: drop a card of the same rank to pass the attack to the next player.',
    taking: 'They take everything — add cards of the ranks on the table, or pass.', gotIt: 'Got it',
  },
  fast: 'Fast mode', on: 'on', off: 'off',
  rulesTitle: 'How to play Durak',
  rulesList: [
    { h: 'Goal', p: 'Get rid of all your cards. The last player still holding cards is the durak — the fool.' },
    { h: 'Deal & trump', p: 'Six cards each. The bottom card of the deck lies face up under it: its suit is trump for the whole game. The lowest trump attacks first.' },
    { h: 'Attack', p: 'The attacker plays a card to the next player (the defender). Then anyone except the defender may throw in cards of a rank already on the table.' },
    { h: 'Defence', p: 'Beat each attack card with a higher card of the same suit, or with any trump (a trump only falls to a higher trump). If you cannot or do not want to, take all the cards.' },
    { h: 'Limits', p: 'At most six attack cards per bout, and never more than the defender holds.' },
    { h: 'After the bout', p: 'Beaten: the cards go to the discard and the defender attacks next. Taken: the defender picks them up and loses the turn. Everyone draws back to six — attacker first, defender last.' },
    { h: 'Transfer variant', p: 'Before beating anything, the defender may add a card of the same rank and pass the whole attack on to the next player (if they hold enough cards).' },
    { h: 'The end', p: 'When the deck is empty, players who run out of cards are out. The last one with cards wears the paper hat.' },
  ],
  botNames: ['Artem', 'Marina', 'Oleg', 'Vika', 'Stas'],
};

const ru: DurakStrings = {
  title: TITLE.ru, tagline: TAGLINE.ru,
  play: 'Раздать', resume: 'Продолжить игру', newGame: 'Новая игра', players: 'Игроков', level: 'Боты', easy: 'Лёгкие', normal: 'Обычные', hard: 'Сильные',
  variant: 'Вариант', podkidnoy: 'Подкидной', perevodnoy: 'Переводной', podkidnoyHint: 'Все подкидывают карты того же достоинства',
  perevodnoyHint: 'Плюс: можно перевести картой того же достоинства',
  deck: 'Колода', cards: n => `${n} карт${n === 24 ? 'ы' : ''}`, rules: 'Правила', back: 'Назад', close: 'Закрыть', menu: 'Меню',
  saveExit: 'Сохранить и выйти', savedNote: 'Каждый ход сохраняется — доиграете в любой момент.', newGameConfirm: 'Начать новую игру? Текущая пропадёт.',
  bito: 'Бито', take: 'Беру', pass: 'Пас', transfer: 'Перевести', you: 'Вы', trump: 'Козырь', talon: n => `осталось ${n}`, discard: 'Отбой',
  st: {
    attack: 'Ваш ход', defend: 'Отбивайтесь — или берите', throwIn: 'Подкидывайте — или бито', throwTaking: 'Берёт — подкинете ещё?',
    waiting: w => `${w} думает`, dealing: 'Раздача…', tapToSkip: 'Нажмите, чтобы пропустить', youOut: 'Вы вышли — смотрим, кто останется',
    selectTarget: 'Выберите, какую карту бить',
  },
  bubble: { take: 'Беру', bito: 'Бито', pass: 'Пас', transfer: 'Перевод!' },
  ev: {
    lowTrump: (w, c) => `Младший козырь ${c} — ходит ${w}`, lowTrumpYou: c => `Ваш младший козырь ${c} — вы ходите`, firstMove: w => `Ходит ${w}`,
    took: w => `${w} берёт`, tookYou: 'Вы берёте', beaten: 'Бито!', transfer: w => `Перевод! Отбивается ${w}`, transferYou: 'Перевели на вас!',
    out: w => `${w} — без карт`, outYou: 'Вы вышли из игры!', talonEmpty: 'Колода кончилась',
  },
  role: { attacker: 'Ходит', defender: 'Отбивается' },
  end: {
    durak: 'Дурак!', notDurak: 'Не дурак!', durakIs: w => `${w} — дурак`, draw: 'Ничья', drawSub: 'Последние карты ушли одновременно — колпак никому',
    place: n => `${n}-е место`, again: 'Ещё партию', settings: 'Настройки', home: 'Выйти', pogony: 'С погонами!', durakTag: 'Дурак',
    loseLines: ['Колпак вам к лицу.', 'Каждый мастер хоть раз был дураком.', 'Сегодня карта не шла. Реванш?'],
    winLines: ['Чистые руки, светлая голова.', 'Вышли первым — красиво.', 'Колпак сегодня носит кто-то другой.'],
    signIn: 'Войдите, чтобы получать награды и попасть в рейтинг', skip: 'Пропустить',
  },
  hints: {
    attack: 'Ваш ход: положите любую карту. Умнее начинать с мелкой некозырной.',
    defend: 'Бейте старшей картой той же масти или козырем. Или нажмите «Беру».',
    throwIn: 'Подкидывайте карты того же достоинства, что на столе, — или «Бито».',
    transfer: 'Перевод: положите карту того же достоинства — и отбиваться будет следующий.',
    taking: 'Соперник берёт — подкиньте ему ещё или скажите «Пас».', gotIt: 'Понятно',
  },
  fast: 'Быстрый режим', on: 'вкл', off: 'выкл',
  rulesTitle: 'Как играть в дурака',
  rulesList: [
    { h: 'Цель', p: 'Избавиться от всех карт. Последний, у кого остались карты, — дурак.' },
    { h: 'Раздача и козырь', p: 'Каждому по шесть карт. Нижняя карта колоды лежит под ней открытой — её масть козырная на всю игру. Первым ходит тот, у кого младший козырь.' },
    { h: 'Ход', p: 'Ходящий кладёт карту следующему игроку (он отбивается). Затем все, кроме отбивающегося, могут подкидывать карты того же достоинства, что уже лежат на столе.' },
    { h: 'Отбой', p: 'Каждую карту бьют старшей той же масти или любым козырем (козырь бьётся только старшим козырем). Не можете или не хотите — берите все карты со стола.' },
    { h: 'Ограничения', p: 'Не больше шести карт за один ход и не больше, чем карт на руках у отбивающегося.' },
    { h: 'После хода', p: 'Бито — карты уходят в отбой, отбившийся ходит следующим. Взял — пропускает ход. Все добирают до шести: сначала ходивший, отбивавшийся последним.' },
    { h: 'Переводной', p: 'Пока ни одна карта не побита, можно перевести: положить карту того же достоинства, и отбиваться будет следующий игрок (если у него хватает карт).' },
    { h: 'Конец', p: 'Когда колода кончилась, вышедшие без карт выбывают. Последний с картами надевает бумажный колпак.' },
  ],
  botNames: ['Артём', 'Марина', 'Олег', 'Вика', 'Стас'],
};

const uk: DurakStrings = {
  title: TITLE.uk, tagline: TAGLINE.uk,
  play: 'Роздати', resume: 'Продовжити гру', newGame: 'Нова гра', players: 'Гравців', level: 'Боти', easy: 'Легкі', normal: 'Звичайні', hard: 'Сильні',
  variant: 'Варіант', podkidnoy: 'Підкидний', perevodnoy: 'Перевідний', podkidnoyHint: 'Усі підкидають карти тієї ж вартості',
  perevodnoyHint: 'Плюс: можна перевести картою тієї ж вартості',
  deck: 'Колода', cards: n => `${n} карт${n === 24 ? 'и' : ''}`, rules: 'Правила', back: 'Назад', close: 'Закрити', menu: 'Меню',
  saveExit: 'Зберегти й вийти', savedNote: 'Кожен хід збережено — догравайте будь-коли.', newGameConfirm: 'Почати нову гру? Поточна зникне.',
  bito: 'Бито', take: 'Беру', pass: 'Пас', transfer: 'Перевести', you: 'Ви', trump: 'Козир', talon: n => `лишилось ${n}`, discard: 'Відбій',
  st: {
    attack: 'Ваш хід', defend: 'Відбивайтеся — або беріть', throwIn: 'Підкидайте — або бито', throwTaking: 'Бере — підкинете ще?',
    waiting: w => `${w} думає`, dealing: 'Роздача…', tapToSkip: 'Торкніться, щоб пропустити', youOut: 'Ви вийшли — дивимось, хто лишиться',
    selectTarget: 'Оберіть, яку карту бити',
  },
  bubble: { take: 'Беру', bito: 'Бито', pass: 'Пас', transfer: 'Переклад!' },
  ev: {
    lowTrump: (w, c) => `Молодший козир ${c} — ходить ${w}`, lowTrumpYou: c => `Ваш молодший козир ${c} — ви ходите`, firstMove: w => `Ходить ${w}`,
    took: w => `${w} бере`, tookYou: 'Ви берете', beaten: 'Бито!', transfer: w => `Переклад! Відбивається ${w}`, transferYou: 'Перевели на вас!',
    out: w => `${w} — без карт`, outYou: 'Ви вийшли з гри!', talonEmpty: 'Колода скінчилася',
  },
  role: { attacker: 'Ходить', defender: 'Відбивається' },
  end: {
    durak: 'Дурень!', notDurak: 'Не дурень!', durakIs: w => `${w} — дурень`, draw: 'Нічия', drawSub: 'Останні карти пішли разом — ковпак нікому',
    place: n => `${n}-е місце`, again: 'Ще партію', settings: 'Налаштування', home: 'Вийти', pogony: 'З погонами!', durakTag: 'Дурень',
    loseLines: ['Паперовий ковпак вам личить.', 'Кожен майстер хоч раз був дурнем.', 'Сьогодні карта не йшла. Реванш?'],
    winLines: ['Чисті руки, ясна голова.', 'Вийшли першим — гарно.', 'Ковпак сьогодні носить хтось інший.'],
    signIn: 'Увійдіть, щоб отримувати нагороди й потрапити до рейтингу', skip: 'Пропустити',
  },
  hints: {
    attack: 'Ваш хід: покладіть будь-яку карту. Розумніше почати з дрібної некозирної.',
    defend: 'Бийте старшою картою тієї ж масті або козирем. Або натисніть «Беру».',
    throwIn: 'Підкидайте карти тієї ж вартості, що на столі, — або «Бито».',
    transfer: 'Переклад: покладіть карту тієї ж вартості — і відбиватиметься наступний.',
    taking: 'Суперник бере — підкиньте ще або скажіть «Пас».', gotIt: 'Зрозуміло',
  },
  fast: 'Швидкий режим', on: 'увімк', off: 'вимк',
  rulesTitle: 'Як грати в дурня',
  rulesList: [
    { h: 'Мета', p: 'Позбутися всіх карт. Останній, у кого лишилися карти, — дурень.' },
    { h: 'Роздача й козир', p: 'Кожному по шість карт. Нижня карта колоди лежить під нею відкритою — її масть козирна на всю гру. Першим ходить той, у кого молодший козир.' },
    { h: 'Хід', p: 'Той, хто ходить, кладе карту наступному гравцеві (він відбивається). Далі всі, крім того, хто відбивається, можуть підкидати карти тієї ж вартості, що вже на столі.' },
    { h: 'Відбій', p: 'Кожну карту б’ють старшою тієї ж масті або будь-яким козирем (козир б’ється лише старшим козирем). Не можете чи не хочете — беріть усі карти зі столу.' },
    { h: 'Обмеження', p: 'Не більше шести карт за хід і не більше, ніж карт у того, хто відбивається.' },
    { h: 'Після ходу', p: 'Бито — карти йдуть у відбій, той, хто відбився, ходить наступним. Узяв — пропускає хід. Усі добирають до шести: спершу той, хто ходив, останнім — хто відбивався.' },
    { h: 'Перевідний', p: 'Поки жодну карту не побито, можна перевести: покласти карту тієї ж вартості, і відбиватиметься наступний гравець (якщо в нього досить карт).' },
    { h: 'Кінець', p: 'Коли колода скінчилася, ті, хто лишився без карт, виходять. Останній з картами вдягає паперовий ковпак.' },
  ],
  botNames: ['Артем', 'Марина', 'Олег', 'Віка', 'Стас'],
};

const lv: DurakStrings = {
  title: TITLE.lv, tagline: TAGLINE.lv,
  play: 'Dalīt', resume: 'Turpināt spēli', newGame: 'Jauna spēle', players: 'Spēlētāji', level: 'Boti', easy: 'Viegli', normal: 'Normāli', hard: 'Stipri',
  variant: 'Variants', podkidnoy: 'Piemetamais', perevodnoy: 'Pārsūtāmais', podkidnoyHint: 'Visi drīkst piemest tāda paša vērtības kārtis',
  perevodnoyHint: 'Plus: uzbrukumu var pārsūtīt ar tādas pašas vērtības kārti',
  deck: 'Kava', cards: n => `${n} kārtis`, rules: 'Noteikumi', back: 'Atpakaļ', close: 'Aizvērt', menu: 'Izvēlne',
  saveExit: 'Saglabāt un iziet', savedNote: 'Katrs gājiens saglabāts — turpini, kad vēlies.', newGameConfirm: 'Sākt jaunu spēli? Šī tiks zaudēta.',
  bito: 'Atsists', take: 'Ņemu', pass: 'Garām', transfer: 'Pārsūtīt', you: 'Tu', trump: 'Trumpis', talon: n => `atlikušas ${n}`, discard: 'Atmestās',
  st: {
    attack: 'Tavs uzbrukums', defend: 'Atsit — vai ņem', throwIn: 'Piemet — vai atsists', throwTaking: 'Viņš ņem — piemetīsi vēl?',
    waiting: w => `${w} domā`, dealing: 'Dala…', tapToSkip: 'Pieskaries, lai izlaistu', youOut: 'Tu esi ārā — skatāmies, kurš paliks',
    selectTarget: 'Izvēlies, kuru kārti sist',
  },
  bubble: { take: 'Ņemu', bito: 'Atsists', pass: 'Garām', transfer: 'Pārsūtu!' },
  ev: {
    lowTrump: (w, c) => `Mazākais trumpis ${c} — sāk ${w}`, lowTrumpYou: c => `Tavs mazākais trumpis ${c} — tu sāc`, firstMove: w => `Sāk ${w}`,
    took: w => `${w} ņem`, tookYou: 'Tu ņem', beaten: 'Atsists!', transfer: w => `Pārsūtīts! Aizsargājas ${w}`, transferYou: 'Pārsūtīts tev!',
    out: w => `${w} ir ārā`, outYou: 'Tev vairs nav kāršu!', talonEmpty: 'Kava ir tukša',
  },
  role: { attacker: 'Uzbrūk', defender: 'Aizsargājas' },
  end: {
    durak: 'Duraks!', notDurak: 'Ne duraks!', durakIs: w => `${w} — duraks`, draw: 'Neizšķirts', drawSub: 'Pēdējās kārtis aizgāja reizē — cepure nevienam',
    place: n => `${n}. vieta`, again: 'Vēlreiz', settings: 'Iestatījumi', home: 'Iziet', pogony: 'Ar uzplečiem!', durakTag: 'Duraks',
    loseLines: ['Papīra cepure tev piestāv.', 'Katrs meistars kādreiz ir bijis duraks.', 'Šodien kārts negāja. Revanšs?'],
    winLines: ['Tīras rokas, skaidra galva.', 'Ārā pirmais — skaisti.', 'Cepuri šodien nēsā kāds cits.'],
    signIn: 'Ienāc, lai saņemtu balvas un iekļūtu reitingā', skip: 'Izlaist',
  },
  hints: {
    attack: 'Tavs uzbrukums: liec jebkuru kārti. Gudrāk sākt ar mazu netrumpi.',
    defend: 'Sit ar augstāku tās pašas masts kārti vai trumpi. Vai spied «Ņemu».',
    throwIn: 'Piemet kārtis, kuru vērtība ir uz galda, — vai «Atsists».',
    transfer: 'Pārsūtīšana: noliec tādas pašas vērtības kārti — aizsargāsies nākamais.',
    taking: 'Pretinieks ņem — piemet vēl vai saki «Garām».', gotIt: 'Skaidrs',
  },
  fast: 'Ātrais režīms', on: 'iesl.', off: 'izsl.',
  rulesTitle: 'Kā spēlēt duraku',
  rulesList: [
    { h: 'Mērķis', p: 'Atbrīvoties no visām kārtīm. Pēdējais, kuram vēl ir kārtis, ir duraks.' },
    { h: 'Dalīšana un trumpis', p: 'Katram sešas kārtis. Kavas apakšējā kārts guļ zem tās atklāta — tās masts ir trumpis visai spēlei. Sāk tas, kuram ir mazākais trumpis.' },
    { h: 'Uzbrukums', p: 'Uzbrucējs liek kārti nākamajam spēlētājam (aizsargam). Pēc tam visi, izņemot aizsargu, drīkst piemest kārtis, kuru vērtība jau ir uz galda.' },
    { h: 'Aizsardzība', p: 'Katru kārti sit ar augstāku tās pašas masts kārti vai jebkuru trumpi (trumpi sit tikai augstāks trumpis). Nevari vai negribi — ņem visas galda kārtis.' },
    { h: 'Ierobežojumi', p: 'Ne vairāk kā sešas kārtis vienā uzbrukumā un ne vairāk, kā aizsargam ir rokā.' },
    { h: 'Pēc uzbrukuma', p: 'Atsists — kārtis aiziet atmestajās, aizsargs uzbrūk nākamais. Paņēma — izlaiž gājienu. Visi papildina līdz sešām: vispirms uzbrucējs, aizsargs pēdējais.' },
    { h: 'Pārsūtāmais', p: 'Kamēr neviena kārts nav nosista, aizsargs var pielikt tādas pašas vērtības kārti un pārsūtīt uzbrukumu nākamajam (ja tam pietiek kāršu).' },
    { h: 'Beigas', p: 'Kad kava tukša, spēlētāji bez kārtīm iziet. Pēdējais ar kārtīm uzliek papīra cepuri.' },
  ],
  botNames: ['Artjoms', 'Marina', 'Olegs', 'Vika', 'Stass'],
};

type P = DeepPartial<DurakStrings>;
/** Other languages: title, tagline and the main buttons; everything else falls back to English. */
const PART: Record<string, P> = {
  lt: { title: TITLE.lt, tagline: TAGLINE.lt, play: 'Dalinti', resume: 'Tęsti žaidimą', newGame: 'Naujas žaidimas', bito: 'Atmušta', take: 'Imu', pass: 'Pas', transfer: 'Perduoti', trump: 'Koziris', rules: 'Taisyklės', end: { durak: 'Durnius!', notDurak: 'Ne durnius!', again: 'Dar kartą' } },
  et: { title: TITLE.et, tagline: TAGLINE.et, play: 'Jaga', resume: 'Jätka mängu', newGame: 'Uus mäng', bito: 'Löödud', take: 'Võtan', pass: 'Pass', transfer: 'Edasi', trump: 'Trump', rules: 'Reeglid', end: { durak: 'Turakas!', notDurak: 'Pole turakas!', again: 'Veel kord' } },
  pl: { title: TITLE.pl, tagline: TAGLINE.pl, play: 'Rozdaj', resume: 'Kontynuuj grę', newGame: 'Nowa gra', bito: 'Pobite', take: 'Biorę', pass: 'Pas', transfer: 'Przekaż', trump: 'Atut', rules: 'Zasady', end: { durak: 'Dureń!', notDurak: 'Nie dureń!', again: 'Jeszcze raz' } },
  de: { title: TITLE.de, tagline: TAGLINE.de, play: 'Geben', resume: 'Spiel fortsetzen', newGame: 'Neues Spiel', bito: 'Fertig', take: 'Nehmen', pass: 'Passe', transfer: 'Weitergeben', trump: 'Trumpf', rules: 'Regeln', end: { durak: 'Durak!', notDurak: 'Kein Durak!', again: 'Noch einmal' } },
  be: { title: TITLE.be, tagline: TAGLINE.be, play: 'Раздаць', resume: 'Працягнуць гульню', newGame: 'Новая гульня', bito: 'Біта', take: 'Бяру', pass: 'Пас', transfer: 'Перавесці', trump: 'Козыр', rules: 'Правілы', end: { durak: 'Дурань!', notDurak: 'Не дурань!', again: 'Яшчэ партыю' } },
  kk: { title: TITLE.kk, tagline: TAGLINE.kk, play: 'Тарату', resume: 'Ойынды жалғастыру', newGame: 'Жаңа ойын', bito: 'Бито', take: 'Аламын', pass: 'Пас', transfer: 'Аудару', trump: 'Көзір', rules: 'Ережелер', end: { durak: 'Дурак!', notDurak: 'Дурак емес!', again: 'Тағы бір рет' } },
  uz: { title: TITLE.uz, tagline: TAGLINE.uz, play: 'Tarqatish', resume: 'Oʻyinni davom ettirish', newGame: 'Yangi oʻyin', bito: 'Bito', take: 'Olaman', pass: 'Pas', transfer: 'Oʻtkazish', trump: 'Kozir', rules: 'Qoidalar', end: { durak: 'Durak!', notDurak: 'Durak emas!', again: 'Yana bir bor' } },
  az: { title: TITLE.az, tagline: TAGLINE.az, play: 'Payla', resume: 'Oyuna davam et', newGame: 'Yeni oyun', bito: 'Bito', take: 'Götürürəm', pass: 'Pas', transfer: 'Ötür', trump: 'Kozır', rules: 'Qaydalar', end: { durak: 'Durak!', notDurak: 'Durak deyil!', again: 'Bir daha' } },
  ka: { title: TITLE.ka, tagline: TAGLINE.ka, play: 'დარიგება', resume: 'თამაშის გაგრძელება', newGame: 'ახალი თამაში', bito: 'ბიტო', take: 'ვიღებ', pass: 'პასი', transfer: 'გადაცემა', trump: 'კოზირი', rules: 'წესები', end: { durak: 'დურაკი!', notDurak: 'დურაკი არა!', again: 'კიდევ ერთხელ' } },
  hy: { title: TITLE.hy, tagline: TAGLINE.hy, play: 'Բաժանել', resume: 'Շարունակել խաղը', newGame: 'Նոր խաղ', bito: 'Բիտո', take: 'Վերցնում եմ', pass: 'Պաս', transfer: 'Փոխանցել', trump: 'Կոզիր', rules: 'Կանոններ', end: { durak: 'Դուրակ!', notDurak: 'Դուրակ չէ!', again: 'Եվս մեկ անգամ' } },
  ro: { title: TITLE.ro, tagline: TAGLINE.ro, play: 'Împarte', resume: 'Continuă jocul', newGame: 'Joc nou', bito: 'Gata', take: 'Iau', pass: 'Pas', transfer: 'Transferă', trump: 'Atu', rules: 'Reguli', end: { durak: 'Prostul!', notDurak: 'Nu ești prostul!', again: 'Încă o dată' } },
  bg: { title: TITLE.bg, tagline: TAGLINE.bg, play: 'Раздай', resume: 'Продължи играта', newGame: 'Нова игра', bito: 'Бито', take: 'Взимам', pass: 'Пас', transfer: 'Прехвърли', trump: 'Коз', rules: 'Правила', end: { durak: 'Дурак!', notDurak: 'Не си дурак!', again: 'Още една' } },
  es: { title: TITLE.es, tagline: TAGLINE.es, play: 'Repartir', resume: 'Continuar partida', newGame: 'Nueva partida', bito: 'Hecho', take: 'Tomo', pass: 'Paso', transfer: 'Pasar', trump: 'Triunfo', rules: 'Reglas', end: { durak: '¡Durak!', notDurak: '¡No eres el tonto!', again: 'Otra vez' } },
};

export const DURAK_STRINGS: Strings<DurakStrings> = {
  en, ru, uk, lv,
  ...Object.fromEntries(Object.entries(PART).map(([k, v]) => [k, withFallback(en, v)])),
};
registerStrings('durak', DURAK_STRINGS);

