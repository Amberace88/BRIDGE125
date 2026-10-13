import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';
import { pl3 } from '../../plural';

const pl: ZoleStrings = {
  title: TITLES.pl,
  tagline: TAGLINES.pl,
  lobby: {
    sub: 'Trzech graczy, 26 kart, jeden gra przeciw dwóm. Do wygranej trzeba 61 oczek.',
    level: 'Rywale', levels: { easy: 'Łatwi', normal: 'Zwykli', hard: 'Trudni' }, deals: 'Rozdania', endless: '∞',
    rules: 'Zasady stołu', maza: 'Mała zole', mazaSub: 'Deklaracja: ani jednej lewy', pules: 'Pule',
    pulesSub: 'Wszyscy pas → pula zamiast galdiņš (jak na turniejach)', start: 'Siadaj do stołu', howTo: 'Jak grać', back: 'Wstecz',
  },
  bid: { take: 'Biorę stół', zole: 'Zole', maza: 'Mała zole', pass: 'Pas' },
  bidSub: {
    take: 'Weź 2 karty ze stołu, odłóż 2 · grasz sam',
    zole: 'Grasz sam bez stołu · podwójna stawka',
    maza: 'Nie weź ani jednej lewy',
    pass: 'Niech gra ktoś inny',
  },
  said: { take: 'bierze stół', zole: 'zole!', maza: 'mała zole', pass: 'pas' },
  contract: { lielais: 'Duża gra', zole: 'Zole', maza: 'Mała zole', galdins: 'Galdiņš', pule: 'Pula' },
  role: { lielais: 'Duży', mazais: 'Mały', solo: 'Każdy za siebie' },
  plays: (w, c) => c === 'lielais' ? `${w} bierze stół` : c === 'zole' ? `${w} gra zole` : c === 'maza' ? `${w} gra małą zole` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Grasz dużego' : c === 'zole' ? 'Grasz zole' : c === 'maza' ? 'Grasz małą zole' : 'Galdiņš',
  allPassGaldins: 'Wszyscy pas — gramy galdiņš', allPassPule: 'Wszyscy pas — zapisujemy pulę',
  status: {
    yourBid: 'Twoje słowo', yourDiscard: 'Odłóż 2 karty', yourLead: 'Twój ruch — wychodzisz', yourTurn: 'Twój ruch', dealing: 'Rozdaję…', tapToSkip: 'dotknij, aby pominąć',
    bidding: w => `${w} się zastanawia…`, discarding: w => `${w} odkłada 2 karty…`, thinking: w => `${w} myśli…`,
  },
  discardBtn: p => `Odłóż · +${p}`,
  you: 'Ty', partner: 'partner',
  acis: 'oczka', tricks: 'lewy', trickN: n => `${n} ${pl3(n, 'lewa', 'lewy', 'lew')}`,
  lastTrick: 'Ostatnia lewa', lastTrickBy: w => `wziął: ${w}`, table: 'Stół', buried: 'Odłożone', galdsTo: w => `karty ze stołu → ${w}`,
  deal: (n, t) => (t > 0 ? `Rozdanie ${n} z ${t}` : `Rozdanie ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Wygrywasz', jani: 'Wygrywasz — mali „w jaņi”', bezstikis: 'Wziąłeś wszystkie lewy!', lose: 'Przegrywasz', loseJani: 'Przegrywasz — zostałeś „w jaņi”', loseBezstikis: 'Ani jednej lewy' };
    const them = { win: 'wygrywa', jani: 'wygrywa — mali „w jaņi”', bezstikis: 'bierze wszystkie lewy!', lose: 'przegrywa', loseJani: 'przegrywa — „w jaņi”', loseBezstikis: 'zostaje bez lewy' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'mali „w jaņi”', bezstikis: 'wszystkie lewy', lose: 'poniżej 61', loseJani: '„w jaņi”', loseBezstikis: 'bez lewy' },
  mazaLine: (w, won) => (w == null ? (won ? 'Mała zole zagrana!' : 'Mała zole nie wyszła') : `${w}: mała zole ${won ? 'zagrana' : 'przegrana'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Przegrywasz galdiņš' : `Galdiņš przegrywa: ${l.map(x => x ?? 'ty').join(' i ')}`),
  sheet: {
    title: 'Zapis', next: 'Następne rozdanie', finish: 'Zakończ grę', finishSub: 'Podlicz wynik teraz', sessionOver: 'Koniec gry',
    youWon: 'Jesteś na plusie!', youLost: 'Tym razem na minusie', winner: w => `Wygrywa ${w}`, tie: 'Remis',
    again: 'Nowa gra', exit: 'Wyjdź', total: 'Razem', pules: n => `Pule na stole: ${n}`, personal: 'pula osobista',
    final: 'Pule rozliczone', puleAdded: '+1 pula wspólna', puleOwn: 'własna pula zdjęta', puleCommon: 'pula wspólna wzięta · +1 od każdego',
    pulePersonal: 'pula osobista wzięta · +3', vs: 'vs', yourBalance: 'Twój bilans', rows: 'Rozdanie',
  },
  menu: {
    title: 'Pauza', resume: 'Wznów', rules: 'Zasady', newGame: 'Nowa gra', newGameSure: 'Dotknij ponownie, aby zacząć od nowa',
    finish: 'Zakończ i podlicz', exit: 'Odejdź od stołu', exitSub: 'Zapis po każdym ruchu — wrócisz dokładnie tutaj.',
  },
  fast: 'Tryb szybki', fastOn: 'wł.', fastOff: 'wył.',
  coach: {
    ok: 'Rozumiem',
    bid: n => `Masz ${n} ${pl3(n, 'atut', 'atuty', 'atutów')}. Stół bierze się z ok. 5 atutami, w tym damami lub waletami; ze słabą ręką — pas.`,
    suggest: b => `Podpowiedź: ${b}`,
    discard: 'Odłóż 2 karty — ich oczka liczą się dla ciebie. Odłóż samotną dziesiątkę lub króla, żeby zostać bez koloru.',
    lead: 'Wychodzisz. Jako duży wyciągnij atuty rywali wysokimi atutami.',
    follow: 'Dokładaj do koloru. Wszystkie damy, walety i kara to atuty — jeden kolor.',
    mazie: (p, d) => `Ty i ${p} gracie razem przeciw ${d}. Gdy lewę bierze ${p}, dorzucaj oczka.`,
    galdins: 'Galdiņš: każdy za siebie — przegrywa ten, kto weźmie najwięcej lew.',
    maza: 'Mała zole: rozgrywający nie może wziąć ani jednej lewy.',
    declarer: 'Potrzebujesz 61 ze 120 oczek. Odłożone karty już liczą się dla ciebie.',
  },
  rules: {
    title: 'Jak grać w zole',
    intro: 'Gra trzech graczy. W każdym rozdaniu jeden gra sam — duży (lielais) — przeciw dwóm pozostałym (mazie), którzy grają razem. Duży potrzebuje co najmniej 61 ze 120 oczek.',
    deckH: 'Talia', deck: '26 kart: as, dziesiątka, król, dama, walet i dziewiątka w każdym kolorze oraz 8♦ i 7♦. Każdy dostaje 8 kart, 2 leżą zakryte na stole.',
    pointsH: 'Oczka kart',
    trumpsH: 'Atuty — 14', trumps: 'Wszystkie damy, wszystkie walety i wszystkie kara to atuty, od damy trefl do siódemki karo. W treflach, pikach i kierach zostają tylko as, 10, król i 9.',
    playH: 'Rozgrywka', play: 'Trzeba dokładać do koloru wyjścia — atuty liczą się jako jeden kolor. Bez koloru możesz zagrać cokolwiek. Lewę bierze najwyższy atut, a bez atutów najwyższa karta koloru wyjścia. Pierwszy wychodzi gracz na lewo od rozdającego.',
    bidH: 'Licytacja', bids: {
      take: 'Biorę stół — zostań dużym: weź 2 karty ze stołu i odłóż 2. Oczka odłożonych kart liczą się dla ciebie.',
      zole: 'Zole — grasz sam bez stołu (jego oczka idą do rywali). Wyższa stawka.',
      maza: 'Mała zole — wygrywasz, nie biorąc żadnej lewy (zasada stołu).',
      pass: 'Pas — decyduje następny. Gra pierwszy, kto nie spasuje.',
    },
    allPassH: 'Gdy wszyscy pasują', galdins: 'Galdiņš: każdy za siebie. Przegrywa ten, kto wziął najwięcej lew (przy remisie — najwięcej oczek); karty ze stołu idą do ostatniej lewy.',
    pules: 'Z pulami: zapisuje się pulę wspólną i karty są rozdawane od nowa. Następny wygrany duży ją zgarnia (+1 od każdego); duży, który przegra przy otwartej puli, dostaje pulę osobistą.',
    scoreH: 'Punktacja', scoreCols: ['Duży zdobył', 'Duży', 'Zole'],
    scoreRows: {
      bezstikis: 'Wszystkie 8 lew', jani: '91 i więcej', win: '61–90', lose: '31–60', loseJani: '30 i mniej', loseBezstikis: 'Ani jednej lewy',
    },
    mazaRow: ['Mała zole zagrana', 'Mała zole przegrana'], galdinsRow: 'Galdiņš: przegrany −4, pozostali +2',
    tipsH: 'Wskazówki', tips: [
      'Policz atuty: 5 i więcej z damą czy dwiema — śmiało bierz stół.',
      'Odkładaj dziesiątki i króle krótkich kolorów — oczka są twoje, a potem przebijesz atutem.',
      'Jako mały: gdy lewę bierze partner, dorzuć asa albo dziesiątkę.',
    ],
  },
};
export default pl;
