import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

const de: LocalePack = {
  dict: {
    tagline: 'Das Bridge-Kartenspiel', play: 'Spielen', vsBots: 'Gegen Bots spielen', opponents: 'Gegner', level: 'Bot-Stärke',
    easy: 'Leicht', normal: 'Normal', online: 'Online mit Freunden', soon: 'Bald', howToPlay: 'Spielregeln', profile: 'Profil',
    settings: 'Einstellungen', language: 'Sprache', sound: 'Ton', on: 'An', off: 'Aus', guest: 'Gast', signIn: 'Konto erstellen oder anmelden',
    signOut: 'Abmelden', emailPlaceholder: 'Deine E-Mail', sendLink: 'Anmeldelink senden',
    linkSent: e => `Schau in dein Postfach (${e}) und öffne den Link zum Anmelden.`, personalize: 'Personalisieren',
    personalizeLocked: 'Erstelle ein kostenloses Konto, um Farbe und Tisch zu wählen.', accent: 'Akzentfarbe', background: 'Tisch',
    yourName: 'Spielername', save: 'Speichern', saved: 'Gespeichert', back: 'Zurück', close: 'Schließen',
    yourTurn: 'Du bist dran', waiting: n => `${n} überlegt`, deckLeft: n => `${n} im Stapel`, points: n => `${n} Pkt.`,
    draw: 'Ziehen', pass: 'Passen', take: n => `${n} ziehen`, transfer6S: 'Mit 6♠ weitergeben', playN: n => `${n} legen`, comboQ6: 'D♠ + 6♠',
    chooseSuit: 'Wünsch dir eine Farbe', coverSix: 'Deck deine 6 ab', suitNames: { S: 'Pik', C: 'Kreuz', H: 'Herz', D: 'Karo' },
    ev: {
      queen: w => `Pik-Dame! ${w} zieht 5`, queenSub: 'Außer mit der 6♠', transfer: w => `6♠! ${w} zieht 6`,
      eight: (w, n) => `${w} zieht ${n}`, seven: (w, n) => `${w} zieht ${n}`, skip: w => `${w} setzt aus`,
      kings: 'Vier Könige!', kingsSub: 'Alle Punktestände zurück auf null', reset125: w => `${w}: genau 125 – zurück auf 0`,
      suit: (_w, s) => `Gewünschte Farbe: ${s}`, reshuffle: 'Ablage in den Stapel gemischt',
      youTake: n => `Du ziehst ${n}`, youSkip: 'Du setzt aus', queenYou: 'Pik-Dame! Du ziehst 5', transferYou: '6♠! Du ziehst 6 und deckst ab',
    },
    round: n => `Runde ${n}`, roundWon: w => `${w} hat alle Karten abgelegt`, roundWonYou: 'Alle Karten abgelegt!',
    jacksFinish: n => `Schluss mit ${n} ${n > 1 ? 'Buben' : 'Bube'} – ×${n + 1}`,
    colPlayer: 'Spieler', colHand: 'Auf der Hand', colTotal: 'Gesamt', burned: 'Genau 125 – zurück auf 0', nextRound: 'Nächste Runde',
    rematch: 'Revanche', home: 'Start', youWin: 'Du gewinnst!', winnerIs: w => `${w} gewinnt`, gameOverSub: 'Jemand hat 130 überschritten – die wenigsten Punkte gewinnen',
    you: 'Du', rulesTitle: 'Spielregeln',
    rules: [
      { h: 'Ziel', p: 'Werde deine Karten los und sammle so wenige Punkte wie möglich. Erreicht jemand 130, endet das Spiel – die niedrigste Punktzahl gewinnt. Landest du genau auf 125, fällt dein Stand auf 0 zurück.' },
      { h: 'Dein Zug', p: 'Lege eine Karte gleicher Farbe oder gleichen Werts wie die oberste Karte. Mehrere Karten gleichen Werts darfst du auf einmal legen. Nichts Passendes? Zieh eine Karte, dann leg sie oder passe.' },
      { h: 'Ass', p: 'Der nächste Spieler setzt aus.' },
      { h: '6', p: 'Muss abgedeckt werden: Lege sofort eine weitere Karte darauf. Mit einer 6 kannst du nicht ausgehen.' },
      { h: '7', p: 'Der nächste Spieler zieht 1 Karte und spielt dann weiter.' },
      { h: '8', p: 'Der nächste Spieler zieht 2 und setzt aus – außer er kontert mit einer eigenen 8 und gibt 4, 6 oder 8 Karten weiter.' },
      { h: '9', p: 'Passt auf jede Karte, aber du darfst dir keine Farbe wünschen.' },
      { h: 'Bube', p: 'Passt auf alles, und du wünschst dir eine Farbe. Beendest du die Runde mit 1–4 Buben, zählen die Punkte der Gegner ×2 bis ×5.' },
      { h: 'Pik-Dame', p: 'Der nächste Spieler zieht 5 und setzt aus. Hast du die 6♠? Konter damit – dann zieht der Nächste 6 und muss sie abdecken.' },
      { h: 'Könige', p: 'Vier Könige hintereinander auf der Ablage setzen alle Punktestände auf null.' },
      { h: 'Punkte', p: 'Ass 15 · König, Dame, Bube, 10 – je 10 · 6♠ – 5 · übrige Karten – 0.' },
    ],
    continueGame: 'Spiel fortsetzen', menuQuit: 'Spiel verlassen', botNames: ['Lukas', 'Anna', 'Jonas'],
  },

  extra: {
    nav: { howToPlay: 'Spielregeln', signIn: 'Anmelden', play: 'Spielen' },
    heroLine: 'Das klassische Kartenspiel Bridge – Pik‑Dame, Buben ×5 und die berühmte 125.',
    features: ['Kostenlos im Browser spielen', 'In 17 Sprachen verfügbar', 'Wie eine App installierbar'],
    playFriends: 'Mit Freunden spielen',
    guide: {
      title: 'Spielregeln', intro: 'Karten loswerden, Strafen ausweichen, Punkte niedrig halten. Alles Wichtige in fünf Minuten.',
      tabs: { basics: 'Grundlagen', special: 'Sonderkarten', combos: 'Kombos', scoring: 'Punkte' },
      steps: [
        { h: 'Bediene die oberste Karte', p: 'Lege eine Karte gleicher Farbe oder gleichen Werts. Mehrere Karten eines Werts dürfen zusammen gelegt werden.' },
        { h: 'Leere deine Hand', p: 'Wer zuerst alle Karten los ist, beendet die Runde. Alle anderen zählen die Punkte auf ihrer Hand.' },
        { h: 'Bleib niedrig', p: 'Die Punkte summieren sich über die Runden. Erreicht jemand 130, endet das Spiel – die niedrigste Punktzahl gewinnt.' },
      ],
      tags: { A: 'Aussetzen', '6': 'Abdecken', '7': '+1', '8': '+2, Kette', '9': 'Joker', J: 'Joker + Farbe', QS: '+5', K: 'Reset' },
      combos: [
        { h: 'Pik-Dame weitergeben', p: 'Dich trifft die D♠? Konter mit der 6♠ – dann zieht der Nächste 6 und muss sie abdecken.' },
        { h: 'Achter-Kette', p: 'Jede 8 bringt zwei Karten mehr. Konter eine 8 mit deiner eigenen und gib 4, 6 oder 8 weiter.' },
        { h: 'Mit Buben ausgehen', p: 'Geh mit 1–4 Buben auf einmal aus – dann zählen die Punkte aller Gegner ×2 bis ×5.' },
      ],
      pointsTitle: 'Punkte für Karten, die am Rundenende auf der Hand bleiben',
      line: { start: 'Start', burn: 'Genau 125 → zurück auf 0', end: '130+ → Spielende' },
      example: 'Beispiel', youCanPlay: 'Du kannst legen', cta: 'Übungsspiel starten',
    },
    auth: {
      title: 'Speichere deinen Fortschritt', sub: 'Kostenloses Konto in Sekunden. Kein Passwort – wir schicken dir einen Code per E-Mail.',
      benefits: ['Dein eigener Tisch und deine Farben', 'Siege und Spiele auf allen Geräten gespeichert', 'Bereit für Ligen und Turniere'],
      email: 'E-Mail', cont: 'Code senden', hint: 'Mit dem Fortfahren versprichst du, fair zu spielen und Spaß zu haben.',
      codeTitle: 'Code eingeben', codeSub: e => `Wir haben einen 6-stelligen Code an ${e} gesendet`, verify: 'Anmelden', resend: 'Neuen Code senden',
      resendIn: s => `Neuer Code in ${s} s`, wrong: 'Der Code hat nicht funktioniert. Prüfe ihn oder fordere einen neuen an.', change: 'Andere E-Mail verwenden',
      welcome: 'Du bist drin!', orLink: 'Stattdessen einen Anmeldelink bekommen? Öffne ihn auf diesem Gerät.', stats: { games: 'Spiele', wins: 'Siege', bm: 'Bridge Money' },
    },
    room: {
      create: 'Tisch erstellen', join: 'Beitreten', code: 'Tisch-Code', enterCode: 'Code eingeben', invite: 'Freunde einladen', copied: 'Link kopiert',
      waiting: 'Warte auf Spieler …', addBot: 'Bot hinzufügen', removeBot: 'Bot entfernen', start: 'Spiel starten', needTwo: 'Mindestens 2 Spieler nötig',
      host: 'Gastgeber', waitHost: 'Warte, bis der Gastgeber startet', connecting: 'Verbinde …', reconnecting: 'Verbinde neu …',
      full: 'Dieser Tisch ist voll', notFound: 'Tisch nicht gefunden', leave: 'Tisch verlassen', seatsOf: (n, m) => `${n} von ${m} Plätzen`,
      shareText: 'Komm an meinen Bridge-125-Tisch', online: 'online', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'Jetzt online spielen', sub: 'Gegen echte Spieler antreten', title: 'Schnelles Spiel', finding: 'Suche Spieler …',
      startsIn: s => `Start in ${s} s`, startNow: 'Jetzt starten', botsFill: 'Freie Plätze werden nach Ablauf der Zeit mit Bots besetzt.',
      error: 'Server nicht erreichbar. Versuch es noch einmal.', starting: 'Karten werden verteilt …',
    },
    lb: {
      title: 'Bestenliste', sub: 'Top-Spieler nach Siegen', wins: 'Siege', games: 'Spiele', winRate: 'Siegquote',
      empty: 'Noch keine gewerteten Spiele – sei die Nummer eins!', you: 'Du', signIn: 'Melde dich an, um in die Bestenliste zu kommen',
      error: 'Die Bestenliste ist gerade nicht verfügbar.', open: 'Bestenliste',
    },
    legal: { privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', updated: 'Zuletzt aktualisiert', contact: 'Kontakt', agree: ['Mit dem Fortfahren akzeptierst du die', 'Nutzungsbedingungen', 'und die', 'Datenschutzerklärung'] },
    install: {
      button: 'App installieren', title: 'Bridge 125 installieren', sub: 'Spiel direkt vom Startbildschirm wie mit einer echten App – kostenlos, ohne App Store.',
      benefits: ['Startet mit einem Tipp im Vollbild', 'Gegen Bots auch offline spielen', 'Immer die neueste Version, ohne Updates'],
      cta: 'Jetzt installieren', done: 'Installiert! Du findest Bridge 125 auf deinem Startbildschirm.', later: 'Nicht jetzt', banner: 'Hol dir die App – kostenlos',
      ios: ['Tippe auf „Teilen“', 'Wähle „Zum Home-Bildschirm“', 'Tippe auf „Hinzufügen“ – fertig!'],
      iosOther: 'Öffne bridge125.com auf iPhone und iPad in Safari, um die App zu installieren.',
      android: ['Öffne das Browsermenü ⋮', 'Tippe auf „App installieren“ oder „Zum Startbildschirm hinzufügen“', 'Bestätigen – fertig!'],
      desktop: ['Klicke in Chrome oder Edge auf das Installationssymbol in der Adressleiste', 'Oder öffne das Menü ⋮ → „Bridge 125 installieren“', 'Die App öffnet sich in einem eigenen Fenster'],
      qr: 'Mit der Handykamera scannen, um die App aufs Handy zu holen', free: 'Kostenlos · unter 1 MB · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Anmelden', tabUp: 'Konto erstellen', titleIn: 'Willkommen zurück', subIn: 'Melde dich an, um Statistik, BM und Tisch-Stil zu behalten.',
      titleUp: 'Willkommen bei Bridge 125', subUp: 'Kostenloses Konto in 20 Sekunden. Dein Fortschritt begleitet dich auf jedes Gerät.',
      email: 'E-Mail', password: 'Passwort', name: 'Spitzname', namePh: 'z. B. Eddy', nameHint: 'Wird am Tisch und in der Bestenliste angezeigt', show: 'Anzeigen', hide: 'Verbergen',
      forgot: 'Passwort vergessen?', signIn: 'Anmelden', signUp: 'Konto erstellen', or: 'oder', useLink: 'Lieber einen Anmeldelink per E-Mail', usePassword: 'Mit Passwort anmelden',
      noAccount: 'Neu hier?', haveAccount: 'Schon ein Konto?', pwHint: 'Mindestens 8 Zeichen', strength: ['Zu kurz', 'Schwach', 'Gut', 'Stark'],
      forgotTitle: 'Passwort zurücksetzen', forgotSub: 'Gib deine E-Mail ein, und wir schicken dir einen Link für ein neues Passwort.', sendReset: 'Link senden',
      resetSent: e => `Schau in dein Postfach (${e}) – über den Link legst du ein neues Passwort fest.`, back: 'Zurück zur Anmeldung',
      newTitle: 'Neues Passwort festlegen', newSub: 'Wähle ein neues Passwort für dein Konto.', newPw: 'Neues Passwort', repeatPw: 'Passwort wiederholen', savePw: 'Passwort speichern',
      pwSaved: 'Passwort gespeichert – du bist angemeldet.', mismatch: 'Die Passwörter stimmen nicht überein',
      welcomeNew: n => `Willkommen am Tisch, ${n}!`, welcomeBack: 'Schön, dass du wieder da bist!',
      err: {
        badEmail: 'Gib eine gültige E-Mail-Adresse ein', short: 'Das Passwort muss mindestens 8 Zeichen haben', wrong: 'E-Mail oder Passwort falsch',
        exists: 'Mit dieser E-Mail gibt es schon ein Konto – melde dich einfach an.', weak: 'Wähle ein stärkeres Passwort', notConfirmed: 'Bitte bestätige zuerst deine E-Mail',
        tooMany: 'Zu viele Versuche – warte eine Minute', network: 'Keine Verbindung – prüfe dein Internet', generic: 'Etwas ist schiefgelaufen. Bitte versuch es noch einmal.',
      },
    },
    prof: {
      tabs: { me: 'Profil', look: 'Stil', account: 'Konto' }, since: d => `Dabei seit ${d}`, winRate: 'Siegquote', avatar: 'Avatar', saved: 'Gespeichert',
      preview: 'Live-Vorschau', table: 'Tisch', accent: 'Akzentfarbe', backs: 'Kartenrücken', matchBack: 'Wie der Tisch', premium: 'Premium',
      locked: 'Premium – bald im Shop. Probier es in der Vorschau aus.', adminFree: 'Admin – alle Premium-Designs sind für dich freigeschaltet',
      guestLock: 'Melde dich an, um deinen Stil zu speichern', tryOn: 'Vorschau', email: 'E-Mail', security: 'Passwort', changePw: 'Passwort ändern', pwChanged: 'Passwort geändert',
      danger: 'Gefahrenzone', deleteAcc: 'Mein Konto löschen', deleteHint: 'Wir löschen dein Konto und deine Daten innerhalb von 30 Tagen.',
      admin: 'Admin', adminPanel: 'Admin-Bereich öffnen', guestTitle: 'Du spielst als Gast', guestSub: 'Erstelle ein kostenloses Konto, um Statistik, BM und Stil auf allen Geräten zu behalten.', prefs: 'Einstellungen',
    },
  },

  privacy: {
    title: 'Datenschutzerklärung',
    intro: 'Bridge 125 ist ein kostenloses Kartenspiel. Wir erheben so wenig Daten wie möglich und verkaufen sie niemals.',
    sections: [
      { h: 'Was wir speichern', p: [
        'Ohne Konto: Außer dem Spitznamen, den du an einem Online-Tisch verwendest, verlässt nichts über dich dein Gerät. Deine Einstellungen, ein gespeichertes Spiel und eine zufällige Spieler-ID liegen im lokalen Speicher deines Browsers.',
        'Mit Konto: deine E-Mail-Adresse (nur für den Versand von Anmeldecodes), dein Spitzname, deine Sprache, deine Farb- und Tischauswahl sowie deine Spielstatistik (gespielte Spiele, Siege, BM-Guthaben).',
      ] },
      { h: 'Online-Tische', p: ['Während du online spielst, wird der Tischzustand (Plätze, Spitznamen, Karten, Züge) auf unserem Server gehalten, damit alle Spieler dasselbe Spiel sehen. Er ist nicht mit deiner E-Mail verknüpft und wird verworfen, sobald am Tisch nichts mehr passiert.'] },
      { h: 'Bestenliste', p: ['Wenn du ein Konto hast und Spiele beendest, können dein Spitzname und deine Statistik in der öffentlichen Bestenliste erscheinen. Deinen Spitznamen kannst du jederzeit im Profil ändern.'] },
      { h: 'Wer Daten verarbeitet', p: ['Supabase (Konten und Statistik) und Cloudflare (Hosting und Online-Tische) verarbeiten Daten in unserem Auftrag gemäß ihren Bedingungen zur Auftragsverarbeitung. Wir verwenden keine Werbe- oder Analyse-Tracker und keine Cookies von Drittanbietern.'] },
      { h: 'Wie lange wir speichern', p: ['Kontodaten speichern wir, bis du uns um ihre Löschung bittest. Lokale Daten bleiben in deinem Browser, bis du sie löschst.'] },
      { h: 'Deine Rechte', p: [`Du kannst jederzeit Auskunft, Berichtigung, Export oder Löschung deiner Daten verlangen – schreib uns an ${CONTACT_EMAIL}. Nach der DSGVO kannst du dich außerdem bei deiner zuständigen Datenschutzaufsichtsbehörde beschweren.`] },
      { h: 'Kinder', p: ['Bridge 125 richtet sich an Spieler ab 16 Jahren.'] },
    ],
  },

  terms: {
    title: 'Nutzungsbedingungen',
    intro: 'Wenn du Bridge 125 spielst, akzeptierst du diese einfachen Regeln.',
    sections: [
      { h: 'Das Spiel', p: ['Bridge 125 wird kostenlos und ohne Gewähr („wie besehen“) zur Unterhaltung bereitgestellt. Wir können Funktionen jederzeit ändern, pausieren oder einstellen.'] },
      { h: 'Bridge Money (BM)', p: ['BM sind virtuelle Punkte, die nur im Spiel verwendet werden. Sie haben keinen Geldwert, können nicht gekauft, verkauft, getauscht oder ausgezahlt werden und sind kein Glücksspiel.'] },
      { h: 'Fair Play', p: ['Sei respektvoll am Tisch. Betrug, automatisiertes Spielen, das Ausnutzen von Fehlern, beleidigende Spitznamen oder die Belästigung anderer Spieler sind nicht erlaubt und können zur Löschung deines Kontos führen.'] },
      { h: 'Dein Konto', p: ['Schütze den Zugang zu deinem E-Mail-Postfach – darüber meldest du dich an. Du kannst jederzeit aufhören zu spielen und uns bitten, dein Konto zu löschen.'] },
      { h: 'Haftung', p: ['Wir tun viel dafür, dass das Spiel läuft, können aber nicht garantieren, dass es immer verfügbar oder fehlerfrei ist. Soweit gesetzlich zulässig, haften wir nicht für verlorenen Spielfortschritt oder mittelbare Schäden.'] },
      { h: 'Änderungen', p: ['Wenn sich diese Bedingungen ändern, aktualisieren wir das Datum oben. Wenn du weiterspielst, akzeptierst du die aktualisierten Bedingungen.'] },
    ],
  },
};

export default de;
