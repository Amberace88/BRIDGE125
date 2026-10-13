import type { Strings } from './pick';
import type { ChapterId, TwistId } from '../campaign/data';
import type { Metric } from '../campaign/quests';

/**
 * Journey campaign + quests. English is mandatory; lv / ru / uk are complete; every other language falls back to
 * English through useStrings(). (Not registered with the lazy feature packs on purpose — see pick.ts.)
 */

type Level = 'easy' | 'normal' | 'hard' | 'expert';
interface Char { name: string; seat?: string; epithet: string; quote: string }

export interface JourneyStrings {
  title: string; kicker: string; sub: string;
  back: string; close: string;
  chapterN: (n: number) => string;
  matchN: (n: number) => string;
  boss: string; finale: string; youAreHere: string;
  houseRule: string; difficulty: string; seats: (n: number) => string;
  play: string; replay: string; locked: string; lockedHint: string; chapterLocked: string; open: string;
  progress: (n: number, max: number) => string;
  starsTitle: string;
  star: { win: string; queen: string; under: (n: number) => string };
  rewards: string; firstWin: string; perStar: string; bossItem: string;
  levels: Record<Level, string>;
  cities: Record<ChapterId, { name: string; room: string; blurb: string }>;
  chars: Record<string, Char>;
  companions: Record<string, string>;
  twists: Record<TwistId, { name: string; desc: string }>;
  intro: { host: string; bossOf: (city: string) => string; accept: string; back: string; skip: string };
  result: {
    victory: string; defeat: string; defeatSub: string; retry: string; toCity: string; next: string; toMap: string;
    newBest: string; earned: string; signIn: string; offline: string; unlocked: string;
    conquered: (city: string) => string; grandTour: string; yourScore: (n: number) => string;
  };
  hud: { clock: string; houseRule: string };
  item: Record<string, string>;
}

export interface QuestStrings {
  title: string; sub: string; daily: string; weekly: string;
  resetsIn: (t: string) => string;
  swap: string; swapHint: (n: number) => string; swapUsed: string;
  claim: string; claimed: string; ready: string;
  chest: { title: string; sub: (n: number, max: number) => string; open: string; opened: string; locked: string };
  guest: string; guestSub: string; signIn: string;
  toast: string; toastReady: string;
  tracker: { title: string; open: string; ready: (n: number) => string; done: string };
  errors: { funds: string; network: string; ready: string; generic: string };
  names: Record<string, string>;
  desc: Record<Metric, (n: number) => string>;
  time: { d: string; h: string; m: string };
}

const ruPl = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
const lvPl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

/* ============================================================================ English */

const en: JourneyStrings = {
  title: 'The Journey', kicker: 'Single-player campaign', sub: 'A night journey across the legendary card rooms of Europe.',
  back: 'Back', close: 'Close',
  chapterN: n => `Chapter ${n}`,
  matchN: n => `Match ${n}`,
  boss: 'Boss', finale: 'Finale', youAreHere: 'You are here',
  houseRule: 'House rule', difficulty: 'Difficulty', seats: n => `${n} players`,
  play: 'Take a seat', replay: 'Play again', locked: 'Locked', lockedHint: 'Win the previous match to unlock', chapterLocked: 'Beat the previous boss to travel here', open: 'Enter',
  progress: (n, max) => `${n} of ${max} stars`,
  starsTitle: 'Stars',
  star: { win: 'Win the game', queen: 'Never take the Q♠', under: n => `Finish under ${n} points` },
  rewards: 'Rewards', firstWin: 'First win', perStar: 'per star', bossItem: 'Boss trophy',
  levels: { easy: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' },
  cities: {
    riga: { name: 'Riga', room: 'The Cellar Club', blurb: 'Beneath the cobbles of the Old Town, a vaulted cellar where the night begins.' },
    tallinn: { name: 'Tallinn', room: 'The Tower Room', blurb: 'High in a medieval tower above the walls — the stakes climb with the stairs.' },
    vilnius: { name: 'Vilnius', room: 'The Baroque Salon', blurb: 'Candlelight on gilded ceilings, and two sisters who never lose alone.' },
    warsaw: { name: 'Warsaw', room: 'The Nocturne Club', blurb: 'A piano in the corner, smoke in the air — nobody shows a true hand.' },
    kyiv: { name: 'Kyiv', room: 'The Golden Gate Club', blurb: 'Chestnut trees outside, a ticking clock inside. Think fast.' },
    tbilisi: { name: 'Tbilisi', room: 'The Balcony Club', blurb: 'Carved balconies, old wine, and a Countess obsessed with one number.' },
    vienna: { name: 'Vienna', room: 'The Grand Café', blurb: 'Marble tables, a waltz in three-four time and a full orchestra at the table.' },
    montecarlo: { name: 'Monte Carlo', room: 'Salle Privée', blurb: 'The last room of the night. The Croupier deals — and the limit is one hundred.' },
  },
  chars: {
    doorman: { name: 'Jānis', epithet: 'the Cellar Doorman', quote: 'Mind the steps. Mind the queen.' },
    pianist: { name: 'Ilze', epithet: 'Jazz Pianist', quote: 'I play in time. Do you?' },
    amber: { name: 'Old Pēteris', epithet: 'Amber Merchant', quote: 'Forty years at this table. Sit down.' },
    banker: { name: 'The Banker', epithet: 'Keeper of the Six of Spades', quote: 'The house always keeps a little something back.' },
    watchman: { name: 'Kalev', epithet: 'Night Watchman', quote: 'All quiet on the walls. Until you deal.' },
    marzipan: { name: 'Liisa', epithet: 'Marzipan Confectioner', quote: 'Sweet hands, sharp cards.' },
    captain: { name: 'Toomas', epithet: 'Harbour Captain', quote: 'You start behind. Sailors always do.' },
    pique: { name: 'Madame Pique', epithet: 'Mistress of Spades', quote: 'My queen does not ask. She takes seven.' },
    poet: { name: 'Rūta', epithet: 'Poet of Užupis', quote: 'Every bluff is a little poem.' },
    balloon: { name: 'Dovydas', epithet: 'Balloon Pilot', quote: 'From up there, every hand looks small.' },
    jeweller: { name: 'Gintarė', epithet: 'Amber Jeweller', quote: 'I know a flaw when I see one.' },
    twins: { name: 'The Twins', seat: 'Aldona', epithet: 'Aldona & Birutė', quote: 'Two of us, one of you. Shall we begin?' },
    violin: { name: 'Zofia', epithet: 'Nocturne Violinist', quote: 'Listen closely — the cards are lying.' },
    conductor: { name: 'Marek', epithet: 'Tram Conductor', quote: 'The last tram has gone. You owe a fare.' },
    editor: { name: 'Agnieszka', epithet: 'Night Editor', quote: 'Tomorrow’s headline: you, losing.' },
    baron: { name: 'The Bluff Baron', epithet: 'Lord of the Untrue Card', quote: 'Call me a liar. If you dare.' },
    bandura: { name: 'Oksana', epithet: 'Bandura Player', quote: 'Sixty strings and not one wrong note.' },
    chess: { name: 'Taras', epithet: 'Park Chess Hustler', quote: 'I see five moves ahead. You see five cards.' },
    chestnut: { name: 'Mila', epithet: 'Chestnut Seller', quote: 'Warm hands, cold heart.' },
    clockmaker: { name: 'The Clockmaker', epithet: 'Master of Fifteen Seconds', quote: 'Tick. Tock. Your move.' },
    winemaker: { name: 'Nino', epithet: 'Qvevri Winemaker', quote: 'Good wine takes time. Winning does not.' },
    singer: { name: 'Levan', epithet: 'Polyphony Singer', quote: 'Three voices, one lie.' },
    carpet: { name: 'Tamar', epithet: 'Carpet Dealer', quote: 'Every price is negotiable. Even yours.' },
    countess: { name: 'The Countess of 125', epithet: 'Keeper of the Exact Number', quote: 'Burn on one hundred and twenty-five — and everyone feels the heat.' },
    waiter: { name: 'Herr Klaus', epithet: 'Head Waiter', quote: 'Your coffee is ready. Your hand is not.' },
    soprano: { name: 'Greta', epithet: 'Opera Soprano', quote: 'I always hold the last note.' },
    doctor: { name: 'Doktor Weiss', epithet: 'Analyst of Minds', quote: 'Tell me about your bluffs.' },
    maestro: { name: 'The Maestro', epithet: 'Conductor of the Full Table', quote: 'Tonight the whole orchestra plays against you.' },
    heiress: { name: 'Isabelle', epithet: 'Yacht Heiress', quote: 'Papa taught me never to fold.' },
    racer: { name: 'Count Lorenzo', epithet: 'Racing Count', quote: 'Fast cars, faster lies.' },
    grey: { name: 'Mr. Grey', epithet: 'High Roller', quote: 'I don’t play for money. I play for silence.' },
    croupier: { name: 'The Croupier', epithet: 'Master of the Salle Privée', quote: 'Mesdames, messieurs — the limit is one hundred. Faites vos jeux.' },
  },
  companions: { c_kristjan: 'Kristjan', c_elena: 'Elena', c_twin2: 'Birutė', c_piotr: 'Piotr', c_bohdan: 'Bohdan', c_franz: 'Franz', c_viola: 'Viola', c_cello: 'Anton', c_sofia: 'Sofia' },
  twists: {
    none: { name: 'Classic rules', desc: 'Standard Bridge 125: the game ends at 130, the lowest score wins.' },
    bluff: { name: 'Bluff mode', desc: 'Any card may be played — unless the next player calls the bluff.' },
    trio: { name: 'Three at the table', desc: 'A second guest joins the game.' },
    handicap: { name: 'Late arrival', desc: 'You sit down with 20 points already on your score.' },
    banker: { name: 'The Banker’s Six', desc: 'The Banker is dealt the 6♠ every round — your Q♠ will bounce back.' },
    pique: { name: 'Queen of Seven', desc: 'In this room the Q♠ costs 7 cards instead of 5.' },
    twins: { name: 'Two against one', desc: 'You face both sisters at the same table.' },
    baron: { name: 'House of Lies', desc: 'Bluff mode is on. The Baron bluffs boldly — and calls well.' },
    clock: { name: 'Fifteen seconds', desc: 'Each of your turns runs on a 15-second clock. Time out: you draw and pass.' },
    countess: { name: 'The Burning Number', desc: 'Burn on exactly 125 and every other player takes +10.' },
    maestro: { name: 'Full orchestra', desc: 'Three opponents at one table.' },
    croupier: { name: 'Limit one hundred', desc: 'The game ends at 100 points instead of 130.' },
  },
  intro: { host: 'Tonight’s host', bossOf: c => `Boss of ${c}`, accept: 'Accept the challenge', back: 'Not yet', skip: 'Skip' },
  result: {
    victory: 'Victory', defeat: 'The house wins', defeatSub: 'Every legend loses a night. Shuffle up and try again.',
    retry: 'Try again', toCity: 'Back to the city', next: 'Next match', toMap: 'To the map',
    newBest: 'New best', earned: 'Earned', signIn: 'Sign in to collect BM, XP and trophies for your stars.',
    offline: 'Saved on this device — rewards arrive once the connection is back.', unlocked: 'Unlocked',
    conquered: c => `${c} conquered`, grandTour: 'The Grand Tour is complete', yourScore: n => `Your score: ${n}`,
  },
  hud: { clock: 'Clock', houseRule: 'House rule' },
  item: { bk_riga: 'Riga card back', fr_ice: 'Ice Crystal frame', bk_damask: 'Damask card back', t_bluff: 'Bluff King title', bn_sunburst: 'Gold Sunburst banner', t_master: '125 Master title', jugend: 'Art Nouveau set', montecarlo: 'Monte Carlo table', t_grand_tour: 'Grand Tourist title' },
};

const qen: QuestStrings = {
  title: 'Quest Log', sub: 'Fresh challenges every day and every week.', daily: 'Daily', weekly: 'Weekly',
  resetsIn: t => `Resets in ${t}`,
  swap: 'Swap', swapHint: n => `Swap one daily quest for ${n} BM — once a day`, swapUsed: 'Swap used today',
  claim: 'Claim', claimed: 'Claimed', ready: 'Ready',
  chest: { title: 'Weekly chest', sub: (n, max) => `${n} of ${max} weekly quests claimed`, open: 'Open the chest', opened: 'Opened this week', locked: 'Claim all five weekly quests to open it' },
  guest: 'Sign in to claim rewards', guestSub: 'Your quest progress is kept on this device. Sign in to collect BM and XP.', signIn: 'Sign in',
  toast: 'Quest progress', toastReady: 'Ready to claim',
  tracker: { title: 'Daily quests', open: 'Quest log', ready: n => `${n} ready`, done: 'All done for today' },
  errors: { funds: 'Not enough BM', network: 'Connection problem — try again', ready: 'Finished quests can’t be swapped', generic: 'Something went wrong' },
  names: {
    d_play3: 'Regular Guest', d_win2: 'Double Up', d_queen2: 'The Queen’s Errand', d_burn: 'Into the Fire', d_jacks: 'Jacks Finale',
    d_rounds10: 'A Long Night', d_out5: 'First Out', d_bounce: 'Mirror, Mirror', d_journey: 'Night Traveller', d_bluff10: 'Poker Face',
    w_win10: 'Ten Victories', w_play20: 'Club Member', w_quick: 'Stranger at the Table', w_queen10: 'The Queen’s Court', w_burn3: 'Fire Walker',
    w_jacks3: 'Jack Multiplier', w_bluff30: 'Master of Masks', w_star3: 'A Perfect Night', w_kings: 'Four Crowns',
  },
  desc: {
    games: n => (n === 1 ? 'Play a game' : `Play ${n} games`),
    wins: n => (n === 1 ? 'Win a game' : `Win ${n} games`),
    queen: n => (n === 1 ? 'Play the Q♠' : `Play the Q♠ ${n} times`),
    burn125: n => (n === 1 ? 'Burn on exactly 125' : `Burn on exactly 125 — ${n} times`),
    jacks: n => (n === 1 ? 'Finish a round with jacks' : `Finish ${n} rounds with jacks`),
    rounds: n => `Play ${n} rounds`,
    rounds_won: n => (n === 1 ? 'Go out first in a round' : `Go out first in ${n} rounds`),
    bluff_rounds: n => `Play ${n} rounds in bluff mode`,
    bounce: n => (n === 1 ? 'Bounce the Q♠ with the 6♠' : `Bounce the Q♠ with the 6♠ ${n} times`),
    kings: () => 'Lay the fourth king — everyone back to 0',
    quick_win: () => 'Win an online quick match',
    journey_win: () => 'Win a Journey match',
    journey_3star: () => 'Win a Journey match with 3 stars',
  },
  time: { d: 'd', h: 'h', m: 'm' },
};

/* ============================================================================ Latviešu */

const lv: JourneyStrings = {
  title: 'Ceļojums', kicker: 'Vienspēlētāja kampaņa', sub: 'Nakts ceļojums cauri leģendārajām Eiropas kāršu zālēm.',
  back: 'Atpakaļ', close: 'Aizvērt',
  chapterN: n => `${n}. nodaļa`,
  matchN: n => `${n}. spēle`,
  boss: 'Boss', finale: 'Fināls', youAreHere: 'Tu esi šeit',
  houseRule: 'Nama noteikums', difficulty: 'Grūtība', seats: n => `${n} spēlētāji`,
  play: 'Sēsties pie galda', replay: 'Spēlēt vēlreiz', locked: 'Slēgts', lockedHint: 'Uzvari iepriekšējo spēli, lai atslēgtu', chapterLocked: 'Uzvari iepriekšējo bosu, lai dotos šurp', open: 'Ieiet',
  progress: (n, max) => `${n} no ${max} zvaigznēm`,
  starsTitle: 'Zvaigznes',
  star: { win: 'Uzvari spēli', queen: 'Nekad nepaņem Q♠', under: n => `Beidz ar mazāk nekā ${n} punktiem` },
  rewards: 'Balvas', firstWin: 'Pirmā uzvara', perStar: 'par zvaigzni', bossItem: 'Bosa trofeja',
  levels: { easy: 'Viegli', normal: 'Normāli', hard: 'Grūti', expert: 'Eksperts' },
  cities: {
    riga: { name: 'Rīga', room: 'Pagraba klubs', blurb: 'Zem Vecrīgas bruģa — velvju pagrabs, kur sākas nakts.' },
    tallinn: { name: 'Tallina', room: 'Torņa istaba', blurb: 'Augstu viduslaiku tornī virs mūriem — likmes kāpj līdz ar kāpnēm.' },
    vilnius: { name: 'Viļņa', room: 'Baroka salons', blurb: 'Sveču gaisma uz zeltītiem griestiem un divas māsas, kas nekad nezaudē vienas.' },
    warsaw: { name: 'Varšava', room: 'Nokturna klubs', blurb: 'Klavieres stūrī, dūmi gaisā — neviens nerāda īstās kārtis.' },
    kyiv: { name: 'Kijiva', room: 'Zelta vārtu klubs', blurb: 'Ārā kastaņas, iekšā tikšķ pulkstenis. Domā ātri.' },
    tbilisi: { name: 'Tbilisi', room: 'Balkonu klubs', blurb: 'Kokgriezumu balkoni, sens vīns un grāfiene, kas apsēsta ar vienu skaitli.' },
    vienna: { name: 'Vīne', room: 'Lielā kafejnīca', blurb: 'Marmora galdiņi, valsis trīs ceturtdaļās un vesels orķestris pie galda.' },
    montecarlo: { name: 'Montekarlo', room: 'Salle Privée', blurb: 'Nakts pēdējā zāle. Krupjē dala — un limits ir simts.' },
  },
  chars: {
    doorman: { name: 'Jānis', epithet: 'pagraba durvju sargs', quote: 'Uzmanīgi uz kāpnēm. Uzmanīgi ar dāmu.' },
    pianist: { name: 'Ilze', epithet: 'džeza pianiste', quote: 'Es spēlēju ritmā. Un tu?' },
    amber: { name: 'Vecais Pēteris', epithet: 'dzintara tirgotājs', quote: 'Četrdesmit gadu pie šī galda. Sēdies.' },
    banker: { name: 'Baņķieris', epithet: 'pīķa sešinieka sargs', quote: 'Nams vienmēr kaut ko patur sev.' },
    watchman: { name: 'Kalevs', epithet: 'nakts sargs', quote: 'Uz mūriem kluss. Līdz tu sadali.' },
    marzipan: { name: 'Līsa', epithet: 'marcipāna meistare', quote: 'Saldas rokas, asas kārtis.' },
    captain: { name: 'Tomass', epithet: 'ostas kapteinis', quote: 'Tu sāc no aizmugures. Jūrnieki vienmēr tā.' },
    pique: { name: 'Madame Pique', epithet: 'pīķu valdniece', quote: 'Mana dāma nejautā. Viņa paņem septiņas.' },
    poet: { name: 'Rūta', epithet: 'Užupes dzejniece', quote: 'Katrs blefs ir maza poēma.' },
    balloon: { name: 'Dovīds', epithet: 'gaisa balona pilots', quote: 'No augšas katra roka izskatās maza.' },
    jeweller: { name: 'Gintare', epithet: 'dzintara juveliere', quote: 'Es redzu katru plaisu.' },
    twins: { name: 'Dvīnes', seat: 'Aldona', epithet: 'Aldona un Birute', quote: 'Mēs divas, tu viens. Sāksim?' },
    violin: { name: 'Zofija', epithet: 'nokturna vijolniece', quote: 'Klausies uzmanīgi — kārtis melo.' },
    conductor: { name: 'Mareks', epithet: 'tramvaja konduktors', quote: 'Pēdējais tramvajs aizbraucis. Tev jāmaksā par braucienu.' },
    editor: { name: 'Agņeška', epithet: 'nakts redaktore', quote: 'Rītdienas virsraksts: tu zaudē.' },
    baron: { name: 'Blefa barons', epithet: 'nepatiesās kārts kungs', quote: 'Nosauc mani par meli. Ja uzdrošinies.' },
    bandura: { name: 'Oksana', epithet: 'banduras spēlētāja', quote: 'Sešdesmit stīgu un neviena nepareiza nots.' },
    chess: { name: 'Tarass', epithet: 'parka šaha meistars', quote: 'Es redzu piecus gājienus uz priekšu. Tu — piecas kārtis.' },
    chestnut: { name: 'Mila', epithet: 'kastaņu tirgotāja', quote: 'Siltas rokas, auksta sirds.' },
    clockmaker: { name: 'Pulksteņmeistars', epithet: 'piecpadsmit sekunžu valdnieks', quote: 'Tik. Tak. Tavs gājiens.' },
    winemaker: { name: 'Nino', epithet: 'kvevri vīndare', quote: 'Labam vīnam vajag laiku. Uzvarai — ne.' },
    singer: { name: 'Levans', epithet: 'polifonijas dziedātājs', quote: 'Trīs balsis, viens meli.' },
    carpet: { name: 'Tamāra', epithet: 'paklāju tirgotāja', quote: 'Katra cena ir apspriežama. Pat tava.' },
    countess: { name: 'Grāfiene 125', epithet: 'precīzā skaitļa sargātāja', quote: 'Sadedz uz simt divdesmit pieci — un karstumu jūt visi.' },
    waiter: { name: 'Herr Klauss', epithet: 'galvenais oficiants', quote: 'Kafija ir gatava. Tava roka — vēl nē.' },
    soprano: { name: 'Grēta', epithet: 'operas soprāns', quote: 'Pēdējo noti vienmēr turu es.' },
    doctor: { name: 'Doktors Veiss', epithet: 'prātu analītiķis', quote: 'Pastāsti man par saviem blefiem.' },
    maestro: { name: 'Maestro', epithet: 'pilnā galda diriģents', quote: 'Šovakar pret tevi spēlē viss orķestris.' },
    heiress: { name: 'Izabella', epithet: 'jahtas mantiniece', quote: 'Tētis mācīja nekad nepadoties.' },
    racer: { name: 'Grāfs Lorenco', epithet: 'sacīkšu grāfs', quote: 'Ātras mašīnas, vēl ātrāki meli.' },
    grey: { name: 'Misters Grejs', epithet: 'lielo likmju spēlētājs', quote: 'Es nespēlēju naudas dēļ. Es spēlēju klusuma dēļ.' },
    croupier: { name: 'Krupjē', epithet: 'Salle Privée saimnieks', quote: 'Mesdames, messieurs — limits ir simts. Faites vos jeux.' },
  },
  companions: { c_kristjan: 'Kristjans', c_elena: 'Elena', c_twin2: 'Birute', c_piotr: 'Pjotrs', c_bohdan: 'Bohdans', c_franz: 'Francis', c_viola: 'Viola', c_cello: 'Antons', c_sofia: 'Sofija' },
  twists: {
    none: { name: 'Klasiskie noteikumi', desc: 'Parastais Bridge 125: spēle beidzas pie 130, uzvar mazākais rezultāts.' },
    bluff: { name: 'Blefa režīms', desc: 'Drīkst likt jebkuru kārti — ja nākamais neatmasko blefu.' },
    trio: { name: 'Trīs pie galda', desc: 'Spēlei pievienojas vēl viens viesis.' },
    handicap: { name: 'Novēlota ierašanās', desc: 'Tu apsēdies ar 20 punktiem jau rezultātā.' },
    banker: { name: 'Baņķiera sešinieks', desc: 'Baņķieris katrā partijā saņem 6♠ — tava Q♠ atlēks atpakaļ.' },
    pique: { name: 'Septiņu dāma', desc: 'Šajā zālē Q♠ maksā 7 kārtis, nevis 5.' },
    twins: { name: 'Divas pret vienu', desc: 'Pie viena galda pret tevi abas māsas.' },
    baron: { name: 'Melu nams', desc: 'Blefa režīms ieslēgts. Barons blefo drosmīgi — un labi atmasko.' },
    clock: { name: 'Piecpadsmit sekundes', desc: 'Katram tavam gājienam ir 15 sekunžu pulkstenis. Laiks beidzies — ņem kārti un izlaid.' },
    countess: { name: 'Degošais skaitlis', desc: 'Sadedz uz tieši 125 — visi pārējie saņem +10.' },
    maestro: { name: 'Pilns orķestris', desc: 'Trīs pretinieki pie viena galda.' },
    croupier: { name: 'Limits simts', desc: 'Spēle beidzas pie 100 punktiem, nevis 130.' },
  },
  intro: { host: 'Šovakar saimnieko', bossOf: c => `${c} — boss`, accept: 'Pieņemt izaicinājumu', back: 'Vēl ne', skip: 'Izlaist' },
  result: {
    victory: 'Uzvara', defeat: 'Nams uzvar', defeatSub: 'Katra leģenda kādu nakti zaudē. Sajauc kārtis un mēģini vēlreiz.',
    retry: 'Mēģināt vēlreiz', toCity: 'Atpakaļ uz pilsētu', next: 'Nākamā spēle', toMap: 'Uz karti',
    newBest: 'Jauns rekords', earned: 'Nopelnīts', signIn: 'Ienāc, lai saņemtu BM, XP un trofejas par zvaigznēm.',
    offline: 'Saglabāts šajā ierīcē — balvas pienāks, kad atgriezīsies savienojums.', unlocked: 'Atslēgts',
    conquered: c => `${c} iekarota`, grandTour: 'Lielais ceļojums pabeigts', yourScore: n => `Tavs rezultāts: ${n}`,
  },
  hud: { clock: 'Pulkstenis', houseRule: 'Nama noteikums' },
  item: { bk_riga: 'Rīgas kāršu mugura', fr_ice: 'Ledus kristāla rāmis', bk_damask: 'Damasta kāršu mugura', t_bluff: 'Tituls “Blefa karalis”', bn_sunburst: 'Zelta saules baneris', t_master: 'Tituls “125 meistars”', jugend: 'Jūgendstila komplekts', montecarlo: 'Montekarlo galds', t_grand_tour: 'Tituls “Lielais ceļotājs”' },
};

const qlv: QuestStrings = {
  title: 'Uzdevumu žurnāls', sub: 'Jauni izaicinājumi katru dienu un katru nedēļu.', daily: 'Dienas', weekly: 'Nedēļas',
  resetsIn: t => `Atjaunosies pēc ${t}`,
  swap: 'Mainīt', swapHint: n => `Nomaini vienu dienas uzdevumu par ${n} BM — reizi dienā`, swapUsed: 'Šodien jau mainīts',
  claim: 'Saņemt', claimed: 'Saņemts', ready: 'Gatavs',
  chest: { title: 'Nedēļas lāde', sub: (n, max) => `Saņemti ${n} no ${max} nedēļas uzdevumiem`, open: 'Atvērt lādi', opened: 'Šonedēļ atvērta', locked: 'Saņem visus piecus nedēļas uzdevumus, lai atvērtu' },
  guest: 'Ienāc, lai saņemtu balvas', guestSub: 'Uzdevumu progress tiek glabāts šajā ierīcē. Ienāc, lai saņemtu BM un XP.', signIn: 'Ienākt',
  toast: 'Uzdevumu progress', toastReady: 'Gatavs saņemšanai',
  tracker: { title: 'Dienas uzdevumi', open: 'Uzdevumi', ready: n => `${n} gatavi`, done: 'Šodienai viss izdarīts' },
  errors: { funds: 'Nepietiek BM', network: 'Savienojuma problēma — mēģini vēlreiz', ready: 'Pabeigtus uzdevumus mainīt nevar', generic: 'Kaut kas nogāja greizi' },
  names: {
    d_play3: 'Pastāvīgais viesis', d_win2: 'Divkārši', d_queen2: 'Dāmas uzdevums', d_burn: 'Ugunī', d_jacks: 'Kalpu fināls',
    d_rounds10: 'Garā nakts', d_out5: 'Pirmais ārā', d_bounce: 'Spogulīt, spogulīt', d_journey: 'Nakts ceļotājs', d_bluff10: 'Akmens seja',
    w_win10: 'Desmit uzvaras', w_play20: 'Kluba biedrs', w_quick: 'Svešinieks pie galda', w_queen10: 'Dāmas galms', w_burn3: 'Pa oglēm',
    w_jacks3: 'Kalpu reizinātājs', w_bluff30: 'Masku meistars', w_star3: 'Ideālā nakts', w_kings: 'Četri kroņi',
  },
  desc: {
    games: n => (n === 1 ? 'Nospēlē spēli' : `Nospēlē ${n} ${lvPl(n, 'spēli', 'spēles')}`),
    wins: n => (n === 1 ? 'Uzvari spēli' : `Uzvari ${n} ${lvPl(n, 'spēli', 'spēles')}`),
    queen: n => (n === 1 ? 'Izspēlē Q♠' : `Izspēlē Q♠ ${n} ${lvPl(n, 'reizi', 'reizes')}`),
    burn125: n => (n === 1 ? 'Sadedz uz tieši 125' : `Sadedz uz tieši 125 — ${n} ${lvPl(n, 'reizi', 'reizes')}`),
    jacks: n => (n === 1 ? 'Pabeidz partiju ar kalpiem' : `Pabeidz ${n} ${lvPl(n, 'partiju', 'partijas')} ar kalpiem`),
    rounds: n => `Nospēlē ${n} ${lvPl(n, 'partiju', 'partijas')}`,
    rounds_won: n => (n === 1 ? 'Izej pirmais partijā' : `Izej pirmais ${n} ${lvPl(n, 'partijā', 'partijās')}`),
    bluff_rounds: n => `Nospēlē ${n} ${lvPl(n, 'partiju', 'partijas')} blefa režīmā`,
    bounce: n => (n === 1 ? 'Atsit Q♠ ar 6♠' : `Atsit Q♠ ar 6♠ ${n} ${lvPl(n, 'reizi', 'reizes')}`),
    kings: () => 'Uzliec ceturto karali — visiem atpakaļ uz 0',
    quick_win: () => 'Uzvari ātro tiešsaistes spēli',
    journey_win: () => 'Uzvari Ceļojuma spēli',
    journey_3star: () => 'Uzvari Ceļojuma spēli ar 3 zvaigznēm',
  },
  time: { d: 'd', h: 'h', m: 'min' },
};

/* ============================================================================ Русский */

const ru: JourneyStrings = {
  title: 'Путешествие', kicker: 'Одиночная кампания', sub: 'Ночное путешествие по легендарным карточным залам Европы.',
  back: 'Назад', close: 'Закрыть',
  chapterN: n => `Глава ${n}`,
  matchN: n => `Партия ${n}`,
  boss: 'Босс', finale: 'Финал', youAreHere: 'Вы здесь',
  houseRule: 'Правило дома', difficulty: 'Сложность', seats: n => `${n} ${ruPl(n, 'игрок', 'игрока', 'игроков')}`,
  play: 'Сесть за стол', replay: 'Сыграть ещё', locked: 'Закрыто', lockedHint: 'Выиграйте предыдущую партию, чтобы открыть', chapterLocked: 'Победите предыдущего босса, чтобы отправиться сюда', open: 'Войти',
  progress: (n, max) => `${n} из ${max} ${ruPl(max, 'звезды', 'звёзд', 'звёзд')}`,
  starsTitle: 'Звёзды',
  star: { win: 'Выиграйте игру', queen: 'Ни разу не взять Q♠', under: n => `Закончите меньше чем с ${n} очками` },
  rewards: 'Награды', firstWin: 'Первая победа', perStar: 'за звезду', bossItem: 'Трофей босса',
  levels: { easy: 'Легко', normal: 'Нормально', hard: 'Сложно', expert: 'Эксперт' },
  cities: {
    riga: { name: 'Рига', room: 'Клуб в подвале', blurb: 'Под брусчаткой Старого города — сводчатый подвал, где начинается ночь.' },
    tallinn: { name: 'Таллин', room: 'Комната в башне', blurb: 'Высоко в средневековой башне над стенами — ставки растут вместе со ступенями.' },
    vilnius: { name: 'Вильнюс', room: 'Барочный салон', blurb: 'Свечи на позолоченных потолках и две сестры, которые не проигрывают поодиночке.' },
    warsaw: { name: 'Варшава', room: 'Клуб «Ноктюрн»', blurb: 'Рояль в углу, дым в воздухе — никто не показывает настоящих карт.' },
    kyiv: { name: 'Киев', room: 'Клуб у Золотых ворот', blurb: 'Снаружи каштаны, внутри тикают часы. Думайте быстро.' },
    tbilisi: { name: 'Тбилиси', room: 'Клуб на балконе', blurb: 'Резные балконы, старое вино и Графиня, одержимая одним числом.' },
    vienna: { name: 'Вена', room: 'Гранд-кафе', blurb: 'Мраморные столики, вальс на три четверти и целый оркестр за столом.' },
    montecarlo: { name: 'Монте-Карло', room: 'Salle Privée', blurb: 'Последний зал ночи. Сдаёт Крупье — и предел здесь сто.' },
  },
  chars: {
    doorman: { name: 'Янис', epithet: 'швейцар подвала', quote: 'Осторожно, ступеньки. Осторожно, дама.' },
    pianist: { name: 'Илзе', epithet: 'джазовая пианистка', quote: 'Я играю в ритме. А вы?' },
    amber: { name: 'Старый Петерис', epithet: 'торговец янтарём', quote: 'Сорок лет за этим столом. Садитесь.' },
    banker: { name: 'Банкир', epithet: 'хранитель шестёрки пик', quote: 'Заведение всегда оставляет кое-что себе.' },
    watchman: { name: 'Калев', epithet: 'ночной сторож', quote: 'На стенах тихо. Пока вы не сдали.' },
    marzipan: { name: 'Лийза', epithet: 'мастер марципана', quote: 'Сладкие руки, острые карты.' },
    captain: { name: 'Тоомас', epithet: 'капитан порта', quote: 'Вы начинаете позади. Моряки всегда так.' },
    pique: { name: 'Мадам Пик', epithet: 'повелительница пик', quote: 'Моя дама не спрашивает. Она берёт семь.' },
    poet: { name: 'Рута', epithet: 'поэтесса Ужуписа', quote: 'Каждый блеф — маленькая поэма.' },
    balloon: { name: 'Довидас', epithet: 'пилот воздушного шара', quote: 'Сверху любая рука кажется маленькой.' },
    jeweller: { name: 'Гинтаре', epithet: 'ювелир по янтарю', quote: 'Я вижу каждый изъян.' },
    twins: { name: 'Близнецы', seat: 'Алдона', epithet: 'Алдона и Бируте', quote: 'Нас двое, вы один. Начнём?' },
    violin: { name: 'Зофья', epithet: 'скрипачка «Ноктюрна»', quote: 'Слушайте внимательно — карты лгут.' },
    conductor: { name: 'Марек', epithet: 'кондуктор трамвая', quote: 'Последний трамвай ушёл. С вас за проезд.' },
    editor: { name: 'Агнешка', epithet: 'ночной редактор', quote: 'Завтрашний заголовок: вы проигрываете.' },
    baron: { name: 'Барон Блеф', epithet: 'владыка ложной карты', quote: 'Назовите меня лжецом. Если осмелитесь.' },
    bandura: { name: 'Оксана', epithet: 'бандуристка', quote: 'Шестьдесят струн и ни одной фальшивой ноты.' },
    chess: { name: 'Тарас', epithet: 'шахматист из парка', quote: 'Я вижу на пять ходов вперёд. Вы — пять карт.' },
    chestnut: { name: 'Мила', epithet: 'продавщица каштанов', quote: 'Тёплые руки, холодное сердце.' },
    clockmaker: { name: 'Часовщик', epithet: 'мастер пятнадцати секунд', quote: 'Тик. Так. Ваш ход.' },
    winemaker: { name: 'Нино', epithet: 'винодел квеври', quote: 'Хорошему вину нужно время. Победе — нет.' },
    singer: { name: 'Леван', epithet: 'певец полифонии', quote: 'Три голоса, одна ложь.' },
    carpet: { name: 'Тамар', epithet: 'торговка коврами', quote: 'Любая цена обсуждается. Даже ваша.' },
    countess: { name: 'Графиня 125', epithet: 'хранительница точного числа', quote: 'Сгорите на ста двадцати пяти — и жар почувствуют все.' },
    waiter: { name: 'Герр Клаус', epithet: 'старший официант', quote: 'Ваш кофе готов. Ваша рука — нет.' },
    soprano: { name: 'Грета', epithet: 'оперное сопрано', quote: 'Последнюю ноту всегда держу я.' },
    doctor: { name: 'Доктор Вайс', epithet: 'аналитик умов', quote: 'Расскажите мне о своих блефах.' },
    maestro: { name: 'Маэстро', epithet: 'дирижёр полного стола', quote: 'Сегодня против вас играет весь оркестр.' },
    heiress: { name: 'Изабель', epithet: 'наследница яхты', quote: 'Папа учил меня никогда не сдаваться.' },
    racer: { name: 'Граф Лоренцо', epithet: 'граф-гонщик', quote: 'Быстрые машины, ещё более быстрая ложь.' },
    grey: { name: 'Мистер Грей', epithet: 'хайроллер', quote: 'Я играю не ради денег. Я играю ради тишины.' },
    croupier: { name: 'Крупье', epithet: 'хозяин Salle Privée', quote: 'Mesdames, messieurs — предел сто. Faites vos jeux.' },
  },
  companions: { c_kristjan: 'Кристьян', c_elena: 'Елена', c_twin2: 'Бируте', c_piotr: 'Пётр', c_bohdan: 'Богдан', c_franz: 'Франц', c_viola: 'Виола', c_cello: 'Антон', c_sofia: 'София' },
  twists: {
    none: { name: 'Классические правила', desc: 'Обычный Bridge 125: игра заканчивается на 130, побеждает наименьший счёт.' },
    bluff: { name: 'Режим блефа', desc: 'Можно положить любую карту — если следующий не разоблачит блеф.' },
    trio: { name: 'Трое за столом', desc: 'К игре присоединяется ещё один гость.' },
    handicap: { name: 'Опоздание', desc: 'Вы садитесь за стол уже с 20 очками.' },
    banker: { name: 'Шестёрка Банкира', desc: 'Банкир получает 6♠ в каждом раунде — ваша Q♠ отскочит обратно.' },
    pique: { name: 'Дама семи', desc: 'В этом зале Q♠ стоит 7 карт вместо 5.' },
    twins: { name: 'Двое против одного', desc: 'Против вас обе сестры за одним столом.' },
    baron: { name: 'Дом лжи', desc: 'Режим блефа включён. Барон блефует смело — и хорошо разоблачает.' },
    clock: { name: 'Пятнадцать секунд', desc: 'На каждый ваш ход — 15 секунд. Время вышло: берёте карту и пропускаете.' },
    countess: { name: 'Горящее число', desc: 'Сгорите ровно на 125 — все остальные получат +10.' },
    maestro: { name: 'Полный оркестр', desc: 'Три соперника за одним столом.' },
    croupier: { name: 'Предел сто', desc: 'Игра заканчивается на 100 очках, а не на 130.' },
  },
  intro: { host: 'Хозяин этой ночи', bossOf: c => `Босс: ${c}`, accept: 'Принять вызов', back: 'Не сейчас', skip: 'Пропустить' },
  result: {
    victory: 'Победа', defeat: 'Заведение выигрывает', defeatSub: 'Каждая легенда иногда проигрывает ночь. Перетасуйте и попробуйте снова.',
    retry: 'Ещё раз', toCity: 'Назад в город', next: 'Следующая партия', toMap: 'На карту',
    newBest: 'Новый рекорд', earned: 'Получено', signIn: 'Войдите, чтобы получать BM, XP и трофеи за звёзды.',
    offline: 'Сохранено на этом устройстве — награды придут, когда вернётся связь.', unlocked: 'Открыто',
    conquered: c => `${c} покорён`, grandTour: 'Большое путешествие завершено', yourScore: n => `Ваш счёт: ${n}`,
  },
  hud: { clock: 'Часы', houseRule: 'Правило дома' },
  item: { bk_riga: 'Рубашка «Рига»', fr_ice: 'Рамка «Ледяной кристалл»', bk_damask: 'Рубашка «Дамаск»', t_bluff: 'Титул «Король блефа»', bn_sunburst: 'Баннер «Золотое солнце»', t_master: 'Титул «Мастер 125»', jugend: 'Набор «Модерн»', montecarlo: 'Стол «Монте-Карло»', t_grand_tour: 'Титул «Великий путешественник»' },
};

const qru: QuestStrings = {
  title: 'Журнал заданий', sub: 'Новые испытания каждый день и каждую неделю.', daily: 'Ежедневные', weekly: 'Еженедельные',
  resetsIn: t => `Обновление через ${t}`,
  swap: 'Заменить', swapHint: n => `Замените одно ежедневное задание за ${n} BM — раз в день`, swapUsed: 'Замена сегодня уже использована',
  claim: 'Забрать', claimed: 'Получено', ready: 'Готово',
  chest: { title: 'Недельный сундук', sub: (n, max) => `Получено ${n} из ${max} недельных заданий`, open: 'Открыть сундук', opened: 'Открыт на этой неделе', locked: 'Заберите все пять недельных заданий, чтобы открыть' },
  guest: 'Войдите, чтобы получать награды', guestSub: 'Прогресс заданий хранится на этом устройстве. Войдите, чтобы получить BM и XP.', signIn: 'Войти',
  toast: 'Прогресс заданий', toastReady: 'Можно забрать',
  tracker: { title: 'Задания дня', open: 'Задания', ready: n => `${n} готово`, done: 'На сегодня всё' },
  errors: { funds: 'Недостаточно BM', network: 'Проблема со связью — попробуйте снова', ready: 'Выполненные задания нельзя заменить', generic: 'Что-то пошло не так' },
  names: {
    d_play3: 'Постоянный гость', d_win2: 'Дубль', d_queen2: 'Поручение дамы', d_burn: 'В огонь', d_jacks: 'Финал вальтов',
    d_rounds10: 'Долгая ночь', d_out5: 'Первым на выход', d_bounce: 'Свет мой, зеркальце', d_journey: 'Ночной путник', d_bluff10: 'Покерфейс',
    w_win10: 'Десять побед', w_play20: 'Член клуба', w_quick: 'Незнакомец за столом', w_queen10: 'Двор дамы', w_burn3: 'По углям',
    w_jacks3: 'Множитель вальтов', w_bluff30: 'Мастер масок', w_star3: 'Идеальная ночь', w_kings: 'Четыре короны',
  },
  desc: {
    games: n => (n === 1 ? 'Сыграйте партию' : `Сыграйте ${n} ${ruPl(n, 'игру', 'игры', 'игр')}`),
    wins: n => (n === 1 ? 'Выиграйте игру' : `Выиграйте ${n} ${ruPl(n, 'игру', 'игры', 'игр')}`),
    queen: n => (n === 1 ? 'Сыграйте Q♠' : `Сыграйте Q♠ ${n} ${ruPl(n, 'раз', 'раза', 'раз')}`),
    burn125: n => (n === 1 ? 'Сгорите ровно на 125' : `Сгорите ровно на 125 — ${n} ${ruPl(n, 'раз', 'раза', 'раз')}`),
    jacks: n => (n === 1 ? 'Закончите раунд вальтами' : `Закончите вальтами ${n} ${ruPl(n, 'раунд', 'раунда', 'раундов')}`),
    rounds: n => `Сыграйте ${n} ${ruPl(n, 'раунд', 'раунда', 'раундов')}`,
    rounds_won: n => (n === 1 ? 'Выйдите первым в раунде' : `Выйдите первым в ${n} ${ruPl(n, 'раунде', 'раундах', 'раундах')}`),
    bluff_rounds: n => `Сыграйте ${n} ${ruPl(n, 'раунд', 'раунда', 'раундов')} в режиме блефа`,
    bounce: n => (n === 1 ? 'Отбейте Q♠ шестёркой пик' : `Отбейте Q♠ шестёркой пик ${n} ${ruPl(n, 'раз', 'раза', 'раз')}`),
    kings: () => 'Положите четвёртого короля — всем 0',
    quick_win: () => 'Выиграйте быструю онлайн-игру',
    journey_win: () => 'Выиграйте партию Путешествия',
    journey_3star: () => 'Выиграйте партию Путешествия на 3 звезды',
  },
  time: { d: 'д', h: 'ч', m: 'мин' },
};

/* ============================================================================ Українська */

const uk: JourneyStrings = {
  title: 'Подорож', kicker: 'Одиночна кампанія', sub: 'Нічна подорож легендарними картярськими залами Європи.',
  back: 'Назад', close: 'Закрити',
  chapterN: n => `Розділ ${n}`,
  matchN: n => `Партія ${n}`,
  boss: 'Бос', finale: 'Фінал', youAreHere: 'Ви тут',
  houseRule: 'Правило дому', difficulty: 'Складність', seats: n => `${n} ${ruPl(n, 'гравець', 'гравці', 'гравців')}`,
  play: 'Сісти за стіл', replay: 'Зіграти ще', locked: 'Закрито', lockedHint: 'Виграйте попередню партію, щоб відкрити', chapterLocked: 'Переможіть попереднього боса, щоб вирушити сюди', open: 'Увійти',
  progress: (n, max) => `${n} з ${max} зірок`,
  starsTitle: 'Зірки',
  star: { win: 'Виграйте гру', queen: 'Жодного разу не взяти Q♠', under: n => `Завершіть із менш ніж ${n} очками` },
  rewards: 'Нагороди', firstWin: 'Перша перемога', perStar: 'за зірку', bossItem: 'Трофей боса',
  levels: { easy: 'Легко', normal: 'Нормально', hard: 'Складно', expert: 'Експерт' },
  cities: {
    riga: { name: 'Рига', room: 'Клуб у підвалі', blurb: 'Під бруківкою Старого міста — склепінчастий підвал, де починається ніч.' },
    tallinn: { name: 'Таллінн', room: 'Кімната у вежі', blurb: 'Високо в середньовічній вежі над мурами — ставки ростуть разом зі сходами.' },
    vilnius: { name: 'Вільнюс', room: 'Бароковий салон', blurb: 'Свічки на позолочених стелях і дві сестри, які не програють поодинці.' },
    warsaw: { name: 'Варшава', room: 'Клуб «Ноктюрн»', blurb: 'Рояль у кутку, дим у повітрі — ніхто не показує справжніх карт.' },
    kyiv: { name: 'Київ', room: 'Клуб біля Золотих воріт', blurb: 'Надворі каштани, всередині цокає годинник. Думайте швидко.' },
    tbilisi: { name: 'Тбілісі', room: 'Клуб на балконі', blurb: 'Різьблені балкони, старе вино і Графиня, одержима одним числом.' },
    vienna: { name: 'Відень', room: 'Гранд-кафе', blurb: 'Мармурові столики, вальс на три чверті й цілий оркестр за столом.' },
    montecarlo: { name: 'Монте-Карло', room: 'Salle Privée', blurb: 'Остання зала ночі. Здає Круп’є — і межа тут сто.' },
  },
  chars: {
    doorman: { name: 'Яніс', epithet: 'швейцар підвалу', quote: 'Обережно, сходинки. Обережно, дама.' },
    pianist: { name: 'Ілзе', epithet: 'джазова піаністка', quote: 'Я граю в ритмі. А ви?' },
    amber: { name: 'Старий Петеріс', epithet: 'торговець бурштином', quote: 'Сорок років за цим столом. Сідайте.' },
    banker: { name: 'Банкір', epithet: 'хранитель шістки пік', quote: 'Заклад завжди залишає дещо собі.' },
    watchman: { name: 'Калев', epithet: 'нічний вартовий', quote: 'На мурах тихо. Поки ви не здали.' },
    marzipan: { name: 'Лійза', epithet: 'майстриня марципану', quote: 'Солодкі руки, гострі карти.' },
    captain: { name: 'Тоомас', epithet: 'капітан порту', quote: 'Ви починаєте позаду. Моряки завжди так.' },
    pique: { name: 'Мадам Пік', epithet: 'володарка пік', quote: 'Моя дама не питає. Вона бере сім.' },
    poet: { name: 'Рута', epithet: 'поетеса Ужупісу', quote: 'Кожен блеф — маленька поема.' },
    balloon: { name: 'Довідас', epithet: 'пілот повітряної кулі', quote: 'Згори кожна рука здається малою.' },
    jeweller: { name: 'Гінтаре', epithet: 'ювелірка з бурштину', quote: 'Я бачу кожну ваду.' },
    twins: { name: 'Близнючки', seat: 'Алдона', epithet: 'Алдона і Біруте', quote: 'Нас двоє, ви один. Почнемо?' },
    violin: { name: 'Зоф’я', epithet: 'скрипалька «Ноктюрну»', quote: 'Слухайте уважно — карти брешуть.' },
    conductor: { name: 'Марек', epithet: 'кондуктор трамваю', quote: 'Останній трамвай пішов. З вас за проїзд.' },
    editor: { name: 'Агнешка', epithet: 'нічна редакторка', quote: 'Завтрашній заголовок: ви програєте.' },
    baron: { name: 'Барон Блеф', epithet: 'володар фальшивої карти', quote: 'Назвіть мене брехуном. Якщо наважитеся.' },
    bandura: { name: 'Оксана', epithet: 'бандуристка', quote: 'Шістдесят струн і жодної фальшивої ноти.' },
    chess: { name: 'Тарас', epithet: 'шахіст із парку', quote: 'Я бачу на п’ять ходів уперед. Ви — п’ять карт.' },
    chestnut: { name: 'Міла', epithet: 'продавчиня каштанів', quote: 'Теплі руки, холодне серце.' },
    clockmaker: { name: 'Годинникар', epithet: 'майстер п’ятнадцяти секунд', quote: 'Тік. Так. Ваш хід.' },
    winemaker: { name: 'Ніно', epithet: 'винарка квеврі', quote: 'Доброму вину потрібен час. Перемозі — ні.' },
    singer: { name: 'Леван', epithet: 'співак поліфонії', quote: 'Три голоси, одна брехня.' },
    carpet: { name: 'Тамар', epithet: 'торговка килимами', quote: 'Кожна ціна обговорюється. Навіть ваша.' },
    countess: { name: 'Графиня 125', epithet: 'хранителька точного числа', quote: 'Згоріть на ста двадцяти п’яти — і жар відчують усі.' },
    waiter: { name: 'Гер Клаус', epithet: 'старший офіціант', quote: 'Ваша кава готова. Ваша рука — ні.' },
    soprano: { name: 'Грета', epithet: 'оперне сопрано', quote: 'Останню ноту завжди тримаю я.' },
    doctor: { name: 'Доктор Вайс', epithet: 'аналітик розумів', quote: 'Розкажіть мені про свої блефи.' },
    maestro: { name: 'Маестро', epithet: 'диригент повного столу', quote: 'Сьогодні проти вас грає весь оркестр.' },
    heiress: { name: 'Ізабель', epithet: 'спадкоємиця яхти', quote: 'Тато вчив мене ніколи не здаватися.' },
    racer: { name: 'Граф Лоренцо', epithet: 'граф-гонщик', quote: 'Швидкі машини, ще швидша брехня.' },
    grey: { name: 'Містер Грей', epithet: 'хайролер', quote: 'Я граю не заради грошей. Я граю заради тиші.' },
    croupier: { name: 'Круп’є', epithet: 'господар Salle Privée', quote: 'Mesdames, messieurs — межа сто. Faites vos jeux.' },
  },
  companions: { c_kristjan: 'Крістьян', c_elena: 'Олена', c_twin2: 'Біруте', c_piotr: 'Пйотр', c_bohdan: 'Богдан', c_franz: 'Франц', c_viola: 'Віола', c_cello: 'Антон', c_sofia: 'Софія' },
  twists: {
    none: { name: 'Класичні правила', desc: 'Звичайний Bridge 125: гра закінчується на 130, перемагає найменший рахунок.' },
    bluff: { name: 'Режим блефу', desc: 'Можна покласти будь-яку карту — якщо наступний не викриє блеф.' },
    trio: { name: 'Троє за столом', desc: 'До гри приєднується ще один гість.' },
    handicap: { name: 'Запізнення', desc: 'Ви сідаєте за стіл уже з 20 очками.' },
    banker: { name: 'Шістка Банкіра', desc: 'Банкір отримує 6♠ у кожному раунді — ваша Q♠ відскочить назад.' },
    pique: { name: 'Дама семи', desc: 'У цій залі Q♠ коштує 7 карт замість 5.' },
    twins: { name: 'Двоє проти одного', desc: 'Проти вас обидві сестри за одним столом.' },
    baron: { name: 'Дім брехні', desc: 'Режим блефу ввімкнено. Барон блефує сміливо — і добре викриває.' },
    clock: { name: 'П’ятнадцять секунд', desc: 'На кожен ваш хід — 15 секунд. Час вийшов: берете карту й пропускаєте.' },
    countess: { name: 'Палаюче число', desc: 'Згоріть рівно на 125 — усі інші отримають +10.' },
    maestro: { name: 'Повний оркестр', desc: 'Три суперники за одним столом.' },
    croupier: { name: 'Межа сто', desc: 'Гра закінчується на 100 очках, а не на 130.' },
  },
  intro: { host: 'Господар цієї ночі', bossOf: c => `Бос: ${c}`, accept: 'Прийняти виклик', back: 'Не зараз', skip: 'Пропустити' },
  result: {
    victory: 'Перемога', defeat: 'Заклад виграє', defeatSub: 'Кожна легенда іноді програє ніч. Перетасуйте й спробуйте знову.',
    retry: 'Ще раз', toCity: 'Назад до міста', next: 'Наступна партія', toMap: 'На мапу',
    newBest: 'Новий рекорд', earned: 'Отримано', signIn: 'Увійдіть, щоб отримувати BM, XP і трофеї за зірки.',
    offline: 'Збережено на цьому пристрої — нагороди прийдуть, коли повернеться зв’язок.', unlocked: 'Відкрито',
    conquered: c => `${c} підкорено`, grandTour: 'Велику подорож завершено', yourScore: n => `Ваш рахунок: ${n}`,
  },
  hud: { clock: 'Годинник', houseRule: 'Правило дому' },
  item: { bk_riga: 'Сорочка «Рига»', fr_ice: 'Рамка «Крижаний кристал»', bk_damask: 'Сорочка «Дамаск»', t_bluff: 'Титул «Король блефу»', bn_sunburst: 'Банер «Золоте сонце»', t_master: 'Титул «Майстер 125»', jugend: 'Набір «Модерн»', montecarlo: 'Стіл «Монте-Карло»', t_grand_tour: 'Титул «Великий мандрівник»' },
};

const quk: QuestStrings = {
  title: 'Журнал завдань', sub: 'Нові випробування щодня і щотижня.', daily: 'Щоденні', weekly: 'Щотижневі',
  resetsIn: t => `Оновлення через ${t}`,
  swap: 'Замінити', swapHint: n => `Замініть одне щоденне завдання за ${n} BM — раз на день`, swapUsed: 'Заміну сьогодні вже використано',
  claim: 'Забрати', claimed: 'Отримано', ready: 'Готово',
  chest: { title: 'Тижнева скриня', sub: (n, max) => `Отримано ${n} з ${max} тижневих завдань`, open: 'Відкрити скриню', opened: 'Відкрито цього тижня', locked: 'Заберіть усі п’ять тижневих завдань, щоб відкрити' },
  guest: 'Увійдіть, щоб отримувати нагороди', guestSub: 'Прогрес завдань зберігається на цьому пристрої. Увійдіть, щоб отримати BM і XP.', signIn: 'Увійти',
  toast: 'Прогрес завдань', toastReady: 'Можна забрати',
  tracker: { title: 'Завдання дня', open: 'Завдання', ready: n => `${n} готово`, done: 'На сьогодні все' },
  errors: { funds: 'Недостатньо BM', network: 'Проблема зі зв’язком — спробуйте ще', ready: 'Виконані завдання не можна замінити', generic: 'Щось пішло не так' },
  names: {
    d_play3: 'Постійний гість', d_win2: 'Дубль', d_queen2: 'Доручення дами', d_burn: 'У вогонь', d_jacks: 'Фінал валетів',
    d_rounds10: 'Довга ніч', d_out5: 'Першим на вихід', d_bounce: 'Дзеркальце', d_journey: 'Нічний мандрівник', d_bluff10: 'Покерфейс',
    w_win10: 'Десять перемог', w_play20: 'Член клубу', w_quick: 'Незнайомець за столом', w_queen10: 'Двір дами', w_burn3: 'По вуглинах',
    w_jacks3: 'Множник валетів', w_bluff30: 'Майстер масок', w_star3: 'Ідеальна ніч', w_kings: 'Чотири корони',
  },
  desc: {
    games: n => (n === 1 ? 'Зіграйте партію' : `Зіграйте ${n} ${ruPl(n, 'гру', 'гри', 'ігор')}`),
    wins: n => (n === 1 ? 'Виграйте гру' : `Виграйте ${n} ${ruPl(n, 'гру', 'гри', 'ігор')}`),
    queen: n => (n === 1 ? 'Зіграйте Q♠' : `Зіграйте Q♠ ${n} ${ruPl(n, 'раз', 'рази', 'разів')}`),
    burn125: n => (n === 1 ? 'Згоріть рівно на 125' : `Згоріть рівно на 125 — ${n} ${ruPl(n, 'раз', 'рази', 'разів')}`),
    jacks: n => (n === 1 ? 'Завершіть раунд валетами' : `Завершіть валетами ${n} ${ruPl(n, 'раунд', 'раунди', 'раундів')}`),
    rounds: n => `Зіграйте ${n} ${ruPl(n, 'раунд', 'раунди', 'раундів')}`,
    rounds_won: n => (n === 1 ? 'Вийдіть першим у раунді' : `Вийдіть першим у ${n} ${ruPl(n, 'раунді', 'раундах', 'раундах')}`),
    bluff_rounds: n => `Зіграйте ${n} ${ruPl(n, 'раунд', 'раунди', 'раундів')} у режимі блефу`,
    bounce: n => (n === 1 ? 'Відбийте Q♠ шісткою пік' : `Відбийте Q♠ шісткою пік ${n} ${ruPl(n, 'раз', 'рази', 'разів')}`),
    kings: () => 'Покладіть четвертого короля — усім 0',
    quick_win: () => 'Виграйте швидку онлайн-гру',
    journey_win: () => 'Виграйте партію Подорожі',
    journey_3star: () => 'Виграйте партію Подорожі на 3 зірки',
  },
  time: { d: 'д', h: 'год', m: 'хв' },
};

export const JOURNEY_STRINGS: Strings<JourneyStrings> = { en, lv, ru, uk };
export const QUEST_STRINGS: Strings<QuestStrings> = { en: qen, lv: qlv, ru: qru, uk: quk };

import { registerStrings } from './pick';
registerStrings('journey', JOURNEY_STRINGS);
registerStrings('quests', QUEST_STRINGS);
