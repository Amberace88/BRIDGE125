import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';
import { two } from '../../plural';

// German card players know the Skat words: Augen (card points), Stich, Schneider (≤ 30), schwarz (no trick).
const de: ZoleStrings = {
  title: TITLES.de,
  tagline: TAGLINES.de,
  lobby: {
    sub: 'Drei Spieler, 26 Karten, einer spielt gegen zwei. Gewonnen ist mit 61 Augen.',
    level: 'Gegner', levels: { easy: 'Leicht', normal: 'Normal', hard: 'Stark' }, deals: 'Spiele', endless: '∞',
    rules: 'Hausregeln', maza: 'Kleine Zole', mazaSub: 'Ansage: keinen einzigen Stich machen', pules: 'Pulen',
    pulesSub: 'Alle passen → Pule statt Galdiņš (wie im Turnier)', start: 'Platz nehmen', howTo: 'Spielregeln', back: 'Zurück',
  },
  bid: { take: 'Tisch nehmen', zole: 'Zole', maza: 'Kleine Zole', pass: 'Passe' },
  bidSub: {
    take: '2 Tischkarten aufnehmen, 2 drücken · allein spielen',
    zole: 'Allein ohne Tisch spielen · doppelter Einsatz',
    maza: 'Keinen einzigen Stich machen',
    pass: 'Soll ein anderer spielen',
  },
  said: { take: 'nimmt den Tisch', zole: 'Zole!', maza: 'kleine Zole', pass: 'passe' },
  contract: { lielais: 'Großes Spiel', zole: 'Zole', maza: 'Kleine Zole', galdins: 'Galdiņš', pule: 'Pule' },
  role: { lielais: 'Großer', mazais: 'Kleiner', solo: 'Jeder für sich' },
  plays: (w, c) => c === 'lielais' ? `${w} nimmt den Tisch` : c === 'zole' ? `${w} spielt Zole` : c === 'maza' ? `${w} spielt kleine Zole` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Du spielst den Großen' : c === 'zole' ? 'Du spielst Zole' : c === 'maza' ? 'Du spielst kleine Zole' : 'Galdiņš',
  allPassGaldins: 'Alle passen — wir spielen Galdiņš', allPassPule: 'Alle passen — eine Pule wird geschrieben',
  status: {
    yourBid: 'Du bist dran', yourDiscard: '2 Karten drücken', yourLead: 'Du spielst aus', yourTurn: 'Du bist am Zug', dealing: 'Geben…', tapToSkip: 'tippen zum Überspringen',
    bidding: w => `${w} überlegt…`, discarding: w => `${w} drückt 2 Karten…`, thinking: w => `${w} überlegt…`,
  },
  discardBtn: p => `Drücken · +${p}`,
  you: 'Du', partner: 'Partner',
  acis: 'Augen', tricks: 'Stiche', trickN: n => `${n} ${two(n, 'Stich', 'Stiche')}`,
  lastTrick: 'Letzter Stich', lastTrickBy: w => `geht an ${w}`, table: 'Tisch', buried: 'Gedrückt', galdsTo: w => `Tischkarten → ${w}`,
  deal: (n, t) => (t > 0 ? `Spiel ${n} von ${t}` : `Spiel ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Du gewinnst', jani: 'Gewonnen — Gegner Schneider', bezstikis: 'Alle Stiche — schwarz!', lose: 'Du verlierst', loseJani: 'Verloren — du bist Schneider', loseBezstikis: 'Kein einziger Stich' };
    const them = { win: 'gewinnt', jani: 'gewinnt — Gegner Schneider', bezstikis: 'macht alle Stiche!', lose: 'verliert', loseJani: 'verliert — Schneider', loseBezstikis: 'bleibt schwarz' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'Gegner Schneider', bezstikis: 'schwarz', lose: 'unter 61', loseJani: 'Schneider', loseBezstikis: 'schwarz' },
  mazaLine: (w, won) => (w == null ? (won ? 'Kleine Zole gewonnen!' : 'Kleine Zole verloren') : `${w} ${won ? 'gewinnt' : 'verliert'} die kleine Zole`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Du verlierst den Galdiņš' : `Den Galdiņš verliert: ${l.map(x => x ?? 'du').join(' und ')}`),
  sheet: {
    title: 'Spielliste', next: 'Nächstes Spiel', finish: 'Runde beenden', finishSub: 'Jetzt abrechnen', sessionOver: 'Runde vorbei',
    youWon: 'Du liegst im Plus!', youLost: 'Diesmal im Minus', winner: w => `${w} gewinnt die Runde`, tie: 'Unentschieden',
    again: 'Neue Runde', exit: 'Verlassen', total: 'Summe', pules: n => (n === 1 ? '1 Pule offen' : `${n} Pulen offen`), personal: 'persönliche Pule',
    final: 'Pulen abgerechnet', puleAdded: '+1 gemeinsame Pule', puleOwn: 'eigene Pule gelöscht', puleCommon: 'gemeinsame Pule gewonnen · +1 von jedem',
    pulePersonal: 'persönliche Pule gewonnen · +3', vs: 'gegen', yourBalance: 'Dein Stand', rows: 'Spiel',
  },
  menu: {
    title: 'Pause', resume: 'Weiter', rules: 'Regeln', newGame: 'Neue Runde', newGameSure: 'Nochmal tippen, um neu zu beginnen',
    finish: 'Beenden & abrechnen', exit: 'Tisch verlassen', exitSub: 'Nach jedem Zug gespeichert — du machst genau hier weiter.',
  },
  fast: 'Schnellmodus', fastOn: 'an', fastOff: 'aus',
  coach: {
    ok: 'Verstanden',
    bid: n => `Du hast ${n} ${two(n, 'Trumpf', 'Trümpfe')}. Den Tisch nimmt man mit etwa 5 Trümpfen, darunter Damen oder Buben; mit schwacher Hand passen.`,
    suggest: b => `Vorschlag: ${b}`,
    discard: 'Drück 2 Karten — ihre Augen zählen für dich. Drück eine blanke Zehn oder einen König, um eine Farbe frei zu bekommen.',
    lead: 'Du spielst aus. Als Großer ziehst du den Gegnern mit hohen Trümpfen die Trümpfe.',
    follow: 'Farbe bedienen. Alle Damen, Buben und Karos sind Trumpf — eine Farbe.',
    mazie: (p, d) => `Du und ${p} spielt zusammen gegen ${d}. Wenn ${p} den Stich macht, schmier Augen dazu.`,
    galdins: 'Galdiņš: jeder für sich — wer die meisten Stiche macht, verliert.',
    maza: 'Kleine Zole: der Spieler darf keinen einzigen Stich machen.',
    declarer: 'Du brauchst 61 von 120 Augen. Deine gedrückten Karten zählen schon mit.',
  },
  rules: {
    title: 'So spielt man Zole',
    intro: 'Drei Spieler. In jedem Spiel spielt einer allein — der Große (lielais) — gegen die beiden anderen (mazie), die zusammenspielen. Der Große braucht mindestens 61 der 120 Augen.',
    deckH: 'Das Blatt', deck: '26 Karten: Ass, Zehn, König, Dame, Bube und Neun jeder Farbe sowie 8♦ und 7♦. Jeder bekommt 8 Karten, 2 liegen verdeckt auf dem Tisch.',
    pointsH: 'Augen der Karten',
    trumpsH: 'Trümpfe — 14 Stück', trumps: 'Alle Damen, alle Buben und alle Karos sind Trumpf, von der Kreuz-Dame bis zur Karo-Sieben. In Kreuz, Pik und Herz bleiben nur Ass, Zehn, König und Neun.',
    playH: 'Das Spiel', play: 'Farbe muss bedient werden — Trümpfe zählen als eine Farbe. Wer nicht bedienen kann, spielt beliebig. Den Stich macht der höchste Trumpf, sonst die höchste Karte der ausgespielten Farbe. Der Spieler links vom Geber spielt zuerst aus.',
    bidH: 'Reizen', bids: {
      take: 'Tisch nehmen — werde der Große: nimm die 2 Tischkarten auf und drück 2. Die gedrückten Augen zählen für dich.',
      zole: 'Zole — allein ohne Tisch spielen (seine Augen gehen an die Gegner). Höherer Einsatz.',
      maza: 'Kleine Zole — gewinnen, ohne einen Stich zu machen (Hausregel).',
      pass: 'Passe — der Nächste entscheidet. Es spielt der Erste, der nicht passt.',
    },
    allPassH: 'Wenn alle passen', galdins: 'Galdiņš: jeder für sich. Wer die meisten Stiche macht, verliert (bei Gleichstand die meisten Augen); die Tischkarten gehen an den letzten Stich.',
    pules: 'Mit Pulen: Eine gemeinsame Pule wird geschrieben und neu gegeben. Der nächste Große, der gewinnt, kassiert sie (+1 von jedem); ein Großer, der bei offener Pule verliert, bekommt eine persönliche Pule.',
    scoreH: 'Abrechnung', scoreCols: ['Großer hat', 'Großes Spiel', 'Zole'],
    scoreRows: {
      bezstikis: 'Alle 8 Stiche (schwarz)', jani: '91 oder mehr (Schneider)', win: '61–90', lose: '31–60', loseJani: '30 oder weniger', loseBezstikis: 'Kein Stich',
    },
    mazaRow: ['Kleine Zole gewonnen', 'Kleine Zole verloren'], galdinsRow: 'Galdiņš: der Verlierer −4, die anderen +2',
    tipsH: 'Tipps', tips: [
      'Zähl deine Trümpfe: 5 oder mehr mit ein, zwei Damen — nimm den Tisch.',
      'Drück Zehnen und Könige kurzer Farben — die Augen gehören dir, und du kannst dort stechen.',
      'Als Kleiner: Macht dein Partner den Stich, schmier Ass oder Zehn dazu.',
    ],
  },
};
export default de;
