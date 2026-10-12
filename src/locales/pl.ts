import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

const pl: LocalePack = {
  dict: {
    tagline: 'Gra karciana Bridge', play: 'Graj', vsBots: 'Graj z botami', opponents: 'Przeciwnicy', level: 'Poziom bota',
    easy: 'Łatwy', normal: 'Normalny', online: 'Online ze znajomymi', soon: 'Wkrótce', howToPlay: 'Jak grać', profile: 'Profil',
    settings: 'Ustawienia', language: 'Język', sound: 'Dźwięk', on: 'Wł.', off: 'Wył.', guest: 'Gość', signIn: 'Załóż konto lub zaloguj się',
    signOut: 'Wyloguj się', emailPlaceholder: 'Twój e-mail', sendLink: 'Wyślij link do logowania',
    linkSent: e => `Sprawdź skrzynkę ${e} i otwórz link, aby się zalogować.`, personalize: 'Personalizacja',
    personalizeLocked: 'Załóż darmowe konto, aby wybrać swój kolor i stół.', accent: 'Kolor akcentu', background: 'Stół',
    yourName: 'Nazwa gracza', save: 'Zapisz', saved: 'Zapisano', back: 'Wstecz', close: 'Zamknij',
    yourTurn: 'Twój ruch', waiting: n => `${n} myśli`, deckLeft: n => `W talii: ${n}`, points: n => `${n} pkt`,
    draw: 'Dobierz', pass: 'Pas', take: n => `Weź ${n}`, transfer6S: 'Przekaż dalej 6♠', playN: n => `Zagraj ${n}`, comboQ6: 'D♠ + 6♠',
    chooseSuit: 'Wybierz kolor', coverSix: 'Przykryj szóstkę', suitNames: { S: 'Pik', C: 'Trefl', H: 'Kier', D: 'Karo' },
    ev: {
      queen: w => `Dama pik! ${w} bierze 5`, queenSub: 'Chyba że ma 6♠', transfer: w => `6♠! ${w} bierze 6`,
      eight: (w, n) => `${w} bierze ${n}`, seven: (w, n) => `${w} bierze ${n}`, skip: w => `${w} traci kolejkę`,
      kings: 'Cztery króle!', kingsSub: 'Wyniki wszystkich wracają do zera', reset125: w => `${w}: równo 125 — wynik spada do 0`,
      suit: (_w, s) => `Wybrany kolor: ${s}`, reshuffle: 'Stos przetasowany do talii',
      youTake: n => `Bierzesz ${n}`, youSkip: 'Tracisz kolejkę', queenYou: 'Dama pik! Bierzesz 5', transferYou: '6♠! Bierzesz 6 i przykrywasz',
    },
    round: n => `Runda ${n}`, roundWon: w => `${w} wygrywa rundę`, roundWonYou: 'Wygrywasz rundę!',
    jacksFinish: n => `Koniec ${n === 1 ? 'waletem' : `${n} waletami`} — ×${n + 1}`,
    colPlayer: 'Gracz', colHand: 'Na ręce', colTotal: 'Razem', burned: 'Równo 125 — spalone do 0', nextRound: 'Następna runda',
    rematch: 'Rewanż', home: 'Menu', youWin: 'Wygrywasz!', winnerIs: w => `Wygrywa ${w}`, gameOverSub: 'Ktoś przekroczył 130 — wygrywa najniższy wynik',
    you: 'Ty', rulesTitle: 'Jak grać',
    rules: [
      { h: 'Cel', p: 'Pozbądź się kart i zbierz jak najmniej punktów. Gdy ktoś dojdzie do 130, gra się kończy — wygrywa najniższy wynik. Trafisz równo w 125? Twój wynik spala się do 0.' },
      { h: 'Twój ruch', p: 'Zagraj kartę w tym samym kolorze albo o tej samej wartości co karta na wierzchu. Możesz zagrać naraz kilka kart tej samej wartości. Nie masz czym zagrać? Dobierz kartę, potem ją zagraj albo spasuj.' },
      { h: 'As', p: 'Następny gracz traci kolejkę.' },
      { h: '6', p: 'Trzeba ją przykryć: od razu połóż na nią kolejną kartę. Nie można zakończyć na szóstce.' },
      { h: '7', p: 'Następny gracz dobiera 1 kartę i gra dalej.' },
      { h: '8', p: 'Następny dobiera 2 i traci kolejkę — chyba że odpowie własną ósemką, przekazując dalej 4, 6 lub 8 kart.' },
      { h: '9', p: 'Pasuje na każdą kartę, ale nie zmieniasz koloru.' },
      { h: 'Walet', p: 'Pasuje na wszystko i zmieniasz nim kolor. Zakończ rundę 1–4 waletami, a punkty przeciwników pomnożą się ×2 do ×5.' },
      { h: 'Dama pik', p: 'Następny dobiera 5 i traci kolejkę. Masz 6♠? Odpowiedz nią — kolejny gracz dobiera 6 i musi ją przykryć.' },
      { h: 'Króle', p: 'Cztery króle z rzędu na stosie zerują wyniki wszystkich graczy.' },
      { h: 'Punkty', p: 'As 15 · król, dama, walet, 10 — po 10 · 6♠ — 5 · pozostałe — 0.' },
    ],
    continueGame: 'Kontynuuj grę', menuQuit: 'Opuść grę', botNames: ['Kuba', 'Ola', 'Marek'],
  },

  extra: {
    nav: { howToPlay: 'Jak grać', signIn: 'Zaloguj się', play: 'Graj' },
    heroLine: 'Klasyczna gra karciana Bridge — dama pik, walety ×5 i słynne 125.',
    features: ['Graj za darmo w przeglądarce', 'Dostępna w 17 językach', 'Zainstaluj jak aplikację'],
    playFriends: 'Graj ze znajomymi',
    guide: {
      title: 'Jak grać', intro: 'Pozbądź się kart, unikaj kar i trzymaj wynik nisko. Wszystko, co ważne, w pięć minut.',
      tabs: { basics: 'Podstawy', special: 'Karty specjalne', combos: 'Kombinacje', scoring: 'Punktacja' },
      steps: [
        { h: 'Dopasuj do karty na wierzchu', p: 'Zagraj kartę w tym samym kolorze albo o tej samej wartości. Kilka kart jednej wartości możesz położyć naraz.' },
        { h: 'Opróżnij rękę', p: 'Kto pierwszy pozbędzie się kart, kończy rundę. Pozostali liczą punkty z kart na ręce.' },
        { h: 'Trzymaj wynik nisko', p: 'Punkty sumują się z rundy na rundę. Gdy ktoś dojdzie do 130, gra się kończy — wygrywa najniższy wynik.' },
      ],
      tags: { A: 'Stop', '6': 'Przykryj', '7': '+1', '8': '+2, łańcuch', '9': 'Dzika karta', J: 'Zmiana koloru', QS: '+5', K: 'Zerowanie' },
      combos: [
        { h: 'Dama pik — dalej', p: 'Trafiła cię D♠? Odpowiedz 6♠ — następny gracz bierze 6 kart i musi ją przykryć.' },
        { h: 'Łańcuch ósemek', p: 'Każda ósemka dokłada dwie karty. Odpowiedz własną ósemką i przekaż dalej 4, 6 lub 8.' },
        { h: 'Koniec waletami', p: 'Wyłóż ostatnie karty, 1–4 walety naraz, a punkty każdego przeciwnika pomnożą się ×2 do ×5.' },
      ],
      pointsTitle: 'Punkty za karty, które zostały na ręce na koniec rundy',
      line: { start: 'Start', burn: 'Równo 125 → znów 0', end: '130+ → koniec gry' },
      example: 'Przykład', youCanPlay: 'Możesz zagrać', cta: 'Zagraj partię treningową',
    },
    auth: {
      title: 'Zapisz swoje postępy', sub: 'Darmowe konto w kilka sekund. Bez hasła — wyślemy ci kod e-mailem.',
      benefits: ['Własny stół i kolory', 'Wygrane i partie zapisane na każdym urządzeniu', 'Gotowe na ligi i turnieje'],
      email: 'E-mail', cont: 'Wyślij kod', hint: 'Kontynuując, obiecujesz grać fair i dobrze się bawić.',
      codeTitle: 'Wpisz kod', codeSub: e => `Wysłaliśmy 6-cyfrowy kod na ${e}`, verify: 'Zaloguj się', resend: 'Wyślij nowy kod',
      resendIn: s => `Nowy kod za ${s} s`, wrong: 'Ten kod nie działa. Sprawdź go lub poproś o nowy.', change: 'Użyj innego e-maila',
      welcome: 'Jesteś w grze!', orLink: 'Przyszedł link zamiast kodu? Otwórz go na tym urządzeniu.', stats: { games: 'Partie', wins: 'Wygrane', bm: 'Bridge Money' },
    },
    room: {
      create: 'Utwórz stół', join: 'Dołącz', code: 'Kod stołu', enterCode: 'Wpisz kod', invite: 'Zaproś znajomych', copied: 'Link skopiowany',
      waiting: 'Czekamy na graczy…', addBot: 'Dodaj bota', removeBot: 'Usuń bota', start: 'Zacznij grę', needTwo: 'Potrzeba co najmniej 2 graczy',
      host: 'Gospodarz', waitHost: 'Czekamy, aż gospodarz zacznie', connecting: 'Łączenie…', reconnecting: 'Ponowne łączenie…',
      full: 'Ten stół jest pełny', notFound: 'Nie znaleziono stołu', leave: 'Opuść stół', seatsOf: (n, m) => `${n} z ${m} miejsc`,
      shareText: 'Dołącz do mojego stołu w Bridge 125', online: 'online', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'Graj online teraz', sub: 'Zagraj z prawdziwymi graczami', title: 'Szybka gra', finding: 'Szukamy graczy…',
      startsIn: s => `Start za ${s} s`, startNow: 'Zacznij teraz', botsFill: 'Gdy czas minie, wolne miejsca zajmą boty.',
      error: 'Brak połączenia z serwerem. Spróbuj ponownie.', starting: 'Rozdajemy karty…',
    },
    lb: {
      title: 'Ranking', sub: 'Najlepsi gracze według wygranych', wins: 'Wygrane', games: 'Partie', winRate: '% wygranych',
      empty: 'Brak partii rankingowych — zagraj pierwszą!', you: 'Ty', signIn: 'Zaloguj się, aby trafić do rankingu', error: 'Ranking jest teraz niedostępny.', open: 'Ranking',
    },
    legal: { privacy: 'Prywatność', terms: 'Regulamin', updated: 'Ostatnia aktualizacja', contact: 'Kontakt', agree: ['Kontynuując, akceptujesz', 'Regulamin', 'oraz', 'Politykę prywatności'] },
    install: {
      button: 'Zainstaluj', title: 'Zainstaluj Bridge 125', sub: 'Graj z ekranu głównego jak w prawdziwej aplikacji — za darmo, bez sklepu z aplikacjami.',
      benefits: ['Otwiera się na pełnym ekranie jednym dotknięciem', 'Gra z botami nawet offline', 'Zawsze najnowsza wersja, bez aktualizacji'],
      cta: 'Zainstaluj teraz', done: 'Zainstalowano! Bridge 125 znajdziesz na ekranie głównym.', later: 'Nie teraz', banner: 'Pobierz aplikację — za darmo',
      ios: ['Stuknij przycisk „Udostępnij”', 'Wybierz „Do ekranu początkowego”', 'Stuknij „Dodaj” — gotowe!'],
      iosOther: 'Na iPhonie i iPadzie otwórz bridge125.com w Safari, aby zainstalować.',
      android: ['Otwórz menu przeglądarki ⋮', 'Stuknij „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”', 'Potwierdź — gotowe!'],
      desktop: ['W Chrome lub Edge kliknij ikonę instalacji na pasku adresu', 'Albo otwórz menu ⋮ → „Zainstaluj Bridge 125”', 'Otworzy się we własnym oknie, jak każda aplikacja'],
      qr: 'Zeskanuj aparatem telefonu, aby zainstalować na telefonie', free: 'Za darmo · poniżej 1 MB · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Zaloguj się', tabUp: 'Załóż konto', titleIn: 'Witaj ponownie', subIn: 'Zaloguj się, aby zachować statystyki, BM i styl stołu.',
      titleUp: 'Dołącz do Bridge 125', subUp: 'Darmowe konto w 20 sekund. Twoje postępy będą dostępne na każdym urządzeniu.',
      email: 'E-mail', password: 'Hasło', name: 'Pseudonim', namePh: 'np. Eddy', nameHint: 'Widoczny przy stole i w rankingu', show: 'Pokaż', hide: 'Ukryj',
      forgot: 'Nie pamiętasz hasła?', signIn: 'Zaloguj się', signUp: 'Załóż konto', or: 'lub', useLink: 'Wyślij mi link do logowania', usePassword: 'Zaloguj się hasłem',
      noAccount: 'Pierwszy raz tutaj?', haveAccount: 'Masz już konto?', pwHint: 'Co najmniej 8 znaków', strength: ['Za krótkie', 'Słabe', 'Dobre', 'Silne'],
      forgotTitle: 'Zresetuj hasło', forgotSub: 'Podaj e-mail, a wyślemy ci link do ustawienia nowego hasła.', sendReset: 'Wyślij link',
      resetSent: e => `Sprawdź skrzynkę ${e} — otwórz link i ustaw nowe hasło.`, back: 'Wróć do logowania',
      newTitle: 'Ustaw nowe hasło', newSub: 'Wybierz nowe hasło do swojego konta.', newPw: 'Nowe hasło', repeatPw: 'Powtórz hasło', savePw: 'Zapisz hasło',
      pwSaved: 'Hasło zapisane — możesz grać.', mismatch: 'Hasła nie są takie same',
      welcomeNew: n => `Witaj przy stole, ${n}!`, welcomeBack: 'Miło cię znów widzieć!',
      err: {
        badEmail: 'Podaj prawidłowy adres e-mail', short: 'Hasło musi mieć co najmniej 8 znaków', wrong: 'Nieprawidłowy e-mail lub hasło',
        exists: 'Konto z tym e-mailem już istnieje — po prostu się zaloguj.', weak: 'Wybierz silniejsze hasło', notConfirmed: 'Najpierw potwierdź swój e-mail',
        tooMany: 'Zbyt wiele prób — odczekaj minutę', network: 'Brak połączenia — sprawdź internet', generic: 'Coś poszło nie tak. Spróbuj ponownie.',
      },
    },
    prof: {
      tabs: { me: 'Profil', look: 'Styl', account: 'Konto' }, since: d => `Konto od: ${d}`, winRate: '% wygranych', avatar: 'Awatar', saved: 'Zapisano',
      preview: 'Podgląd na żywo', table: 'Stół', accent: 'Kolor akcentu', backs: 'Rewersy kart', matchBack: 'Jak stół', premium: 'Premium',
      locked: 'Premium — wkrótce w sklepie. Przymierz w podglądzie.', adminFree: 'Admin — wszystkie elementy premium są dla ciebie odblokowane',
      guestLock: 'Zaloguj się, aby zapisać swój styl', tryOn: 'Podgląd', email: 'E-mail', security: 'Hasło', changePw: 'Zmień hasło', pwChanged: 'Hasło zmienione',
      danger: 'Strefa zagrożenia', deleteAcc: 'Usuń moje konto', deleteHint: 'Usuniemy twoje konto i dane w ciągu 30 dni.',
      admin: 'Admin', adminPanel: 'Otwórz panel admina', guestTitle: 'Grasz jako gość', guestSub: 'Załóż darmowe konto, aby zachować statystyki, BM i styl na każdym urządzeniu.', prefs: 'Ustawienia',
    },
  },

  privacy: {
    title: 'Polityka prywatności',
    intro: 'Bridge 125 to darmowa gra karciana. Zbieramy jak najmniej danych i nigdy ich nie sprzedajemy.',
    sections: [
      { h: 'Co przechowujemy', p: [
        'Bez konta: poza pseudonimem, którego używasz przy stole online, nic o tobie nie opuszcza twojego urządzenia. Ustawienia, zapisana gra i losowy identyfikator gracza są przechowywane w pamięci lokalnej przeglądarki.',
        'Z kontem: adres e-mail (używany wyłącznie do wysyłania kodów logowania), pseudonim, język, wybrany kolor i stół oraz statystyki gry (rozegrane partie, wygrane, saldo BM).',
      ] },
      { h: 'Stoły online', p: ['Podczas gry online stan stołu (miejsca, pseudonimy, karty, ruchy) jest przechowywany na naszym serwerze, aby wszyscy gracze widzieli tę samą grę. Nie jest powiązany z twoim adresem e-mail i zostaje usunięty, gdy przy stole ustanie aktywność.'] },
      { h: 'Ranking', p: ['Jeśli masz konto i kończysz partie, twój pseudonim i statystyki mogą pojawić się w publicznym rankingu. Pseudonim możesz w każdej chwili zmienić w profilu.'] },
      { h: 'Kto przetwarza dane', p: ['Supabase (konta i statystyki) oraz Cloudflare (hosting i stoły online) przetwarzają dane w naszym imieniu na podstawie swoich umów powierzenia przetwarzania danych. Nie używamy trackerów reklamowych ani analitycznych ani plików cookie podmiotów trzecich.'] },
      { h: 'Jak długo przechowujemy dane', p: ['Dane konta przechowujemy, dopóki nie poprosisz o ich usunięcie. Dane lokalne pozostają w przeglądarce, dopóki ich nie wyczyścisz.'] },
      { h: 'Twoje prawa', p: [`W każdej chwili możesz poprosić o dostęp do swoich danych, ich sprostowanie, eksport lub usunięcie, pisząc na ${CONTACT_EMAIL}. Zgodnie z RODO możesz też złożyć skargę do organu ochrony danych osobowych.`] },
      { h: 'Dzieci', p: ['Gra Bridge 125 jest przeznaczona dla graczy, którzy ukończyli 16 lat.'] },
    ],
  },

  terms: {
    title: 'Regulamin',
    intro: 'Grając w Bridge 125, akceptujesz te proste zasady.',
    sections: [
      { h: 'Gra', p: ['Gra Bridge 125 jest udostępniana bezpłatnie, w stanie „takim, jaki jest”, w celach rozrywkowych. Możemy w każdej chwili zmieniać, wstrzymywać lub wycofywać funkcje.'] },
      { h: 'Bridge Money (BM)', p: ['BM to wirtualne punkty używane wyłącznie w grze. Nie mają wartości pieniężnej, nie można ich kupić, sprzedać, wymienić ani wypłacić i nie są formą hazardu.'] },
      { h: 'Uczciwa gra', p: ['Szanuj innych przy stole. Oszukiwanie, automatyzowanie gry, wykorzystywanie błędów, obraźliwe pseudonimy i nękanie innych graczy są zabronione i mogą skutkować usunięciem konta.'] },
      { h: 'Twoje konto', p: ['Dbaj o bezpieczeństwo dostępu do swojej skrzynki e-mail — to przez nią się logujesz. W każdej chwili możesz przestać grać i poprosić o usunięcie konta.'] },
      { h: 'Odpowiedzialność', p: ['Dokładamy starań, aby gra działała, ale nie możemy zagwarantować, że zawsze będzie dostępna i wolna od błędów. W zakresie dozwolonym przez prawo nie odpowiadamy za utracone postępy ani szkody pośrednie.'] },
      { h: 'Zmiany', p: ['Jeśli regulamin się zmieni, zaktualizujemy datę powyżej. Dalsza gra oznacza akceptację zaktualizowanego regulaminu.'] },
    ],
  },
};

export default pl;
