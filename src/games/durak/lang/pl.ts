import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { pl3 } from '../../plural';

const pl: DurakStrings = {
  title: TITLE.pl, tagline: TAGLINE.pl,
  play: 'Rozdaj', resume: 'Kontynuuj grę', newGame: 'Nowa gra', players: 'Gracze', level: 'Boty', easy: 'Łatwe', normal: 'Zwykłe', hard: 'Trudne',
  variant: 'Wariant', podkidnoy: 'Dorzucany', perevodnoy: 'Przekazywany', podkidnoyHint: 'Każdy może dorzucać karty tej samej wartości',
  perevodnoyHint: 'Do tego: atak można przekazać kartą tej samej wartości',
  deck: 'Talia', cards: n => `${n} ${pl3(n, 'karta', 'karty', 'kart')}`, rules: 'Zasady', back: 'Wstecz', close: 'Zamknij', menu: 'Menu',
  saveExit: 'Zapisz i wyjdź', savedNote: 'Każdy ruch jest zapisywany — wróć, kiedy chcesz.', newGameConfirm: 'Zacząć nową grę? Ta przepadnie.',
  bito: 'Pobite', take: 'Biorę', pass: 'Pas', transfer: 'Przekaż', you: 'Ty', trump: 'Atut', talon: n => `zostało ${n}`, discard: 'Odrzucone',
  st: {
    attack: 'Twój atak', defend: 'Bij — albo bierz', throwIn: 'Dorzuć — albo pobite', throwTaking: 'Bierze — dorzucisz?',
    waiting: w => `${w} myśli`, dealing: 'Rozdaję…', tapToSkip: 'Dotknij, aby pominąć', youOut: 'Wyszedłeś — patrzymy, kto zostanie',
    selectTarget: 'Wybierz kartę do pobicia',
  },
  bubble: { take: 'Biorę', bito: 'Pobite', pass: 'Pas', transfer: 'Przekazuję!' },
  ev: {
    lowTrump: (w, c) => `Najniższy atut ${c} — zaczyna ${w}`, lowTrumpYou: c => `Twój najniższy atut ${c} — zaczynasz`, firstMove: w => `Zaczyna ${w}`,
    took: w => `${w} bierze karty`, tookYou: 'Bierzesz karty', beaten: 'Pobite!', transfer: w => `Przekazane! Broni się ${w}`,
    transferYou: 'Przekazane do ciebie!', out: w => `${w} bez kart`, outYou: 'Nie masz już kart!', talonEmpty: 'Talia się skończyła',
  },
  role: { attacker: 'Atakuje', defender: 'Broni się' },
  end: {
    durak: 'Dureń!', notDurak: 'Nie dureń!', durakIs: w => `${w} jest dureniem`, draw: 'Remis', drawSub: 'Ostatnie karty zeszły razem — czapka dla nikogo',
    place: n => `${n}. miejsce`, again: 'Jeszcze raz', settings: 'Ustawienia', home: 'Wyjdź',
    pogony: 'Z pagonami!', durakTag: 'Dureń',
    loseLines: ['Papierowa czapka ci pasuje.', 'Każdy mistrz był kiedyś dureniem.', 'Dziś karta nie szła. Rewanż?'],
    winLines: ['Czyste ręce, jasna głowa.', 'Pierwszy bez kart — z klasą.', 'Czapkę nosi dziś ktoś inny.'],
    signIn: 'Zaloguj się, aby zbierać nagrody i piąć się w rankingu', skip: 'Pomiń',
  },
  hints: {
    attack: 'Twój atak: zagraj dowolną kartę. Najlepiej zacząć od niskiej nieatutowej.',
    defend: 'Bij wyższą kartą w tym samym kolorze albo atutem. Albo naciśnij „Biorę”.',
    throwIn: 'Dorzucaj karty o wartościach, które już leżą na stole, — albo „Pobite”.',
    transfer: 'Przekazanie: połóż kartę tej samej wartości — bronić się będzie następny.',
    taking: 'Rywal bierze wszystko — dorzuć mu jeszcze albo powiedz „Pas”.', gotIt: 'Rozumiem',
  },
  fast: 'Tryb szybki', on: 'wł.', off: 'wył.',
  rulesTitle: 'Jak grać w durenia',
  rulesList: [
    { h: 'Cel', p: 'Pozbyć się wszystkich kart. Ostatni gracz, który ma jeszcze karty, zostaje dureniem.' },
    { h: 'Rozdanie i atut', p: 'Każdy dostaje sześć kart. Spodnia karta talii leży pod nią odkryta — jej kolor jest atutowy przez całą grę. Zaczyna ten, kto ma najniższego atuta.' },
    { h: 'Atak', p: 'Atakujący zagrywa kartę do następnego gracza (obrońcy). Potem wszyscy oprócz obrońcy mogą dorzucać karty o wartościach, które już leżą na stole.' },
    { h: 'Obrona', p: 'Każdą kartę bij wyższą w tym samym kolorze albo dowolnym atutem (atuta bije tylko wyższy atut). Nie możesz albo nie chcesz — bierzesz wszystkie karty ze stołu.' },
    { h: 'Limity', p: 'Najwyżej sześć kart w jednym ataku i nigdy więcej, niż obrońca ma w ręku.' },
    { h: 'Po ataku', p: 'Pobite — karty idą do odrzuconych, a obrońca atakuje jako następny. Wziął — traci kolejkę. Wszyscy dobierają do sześciu: najpierw atakujący, obrońca na końcu.' },
    { h: 'Wariant przekazywany', p: 'Dopóki nic nie zostało pobite, obrońca może dołożyć kartę tej samej wartości i przekazać cały atak następnemu graczowi (jeśli ma on dość kart).' },
    { h: 'Koniec', p: 'Gdy talia się skończy, gracze bez kart wychodzą. Ostatni z kartami zakłada papierową czapkę.' },
  ],
  botNames: ['Kuba', 'Ola', 'Marek', 'Kasia', 'Piotr'],
};
export default pl;
