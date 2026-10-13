import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { two } from '../../plural';

const de: DurakStrings = {
  title: TITLE.de, tagline: TAGLINE.de,
  play: 'Geben', resume: 'Spiel fortsetzen', newGame: 'Neues Spiel', players: 'Spieler', level: 'Bots', easy: 'Leicht', normal: 'Normal', hard: 'Stark',
  variant: 'Variante', podkidnoy: 'Zuwerfen', perevodnoy: 'Weitergeben', podkidnoyHint: 'Alle dürfen Karten gleichen Werts zuwerfen',
  perevodnoyHint: 'Dazu: den Angriff mit einer Karte gleichen Werts weitergeben',
  deck: 'Blatt', cards: n => `${n} ${two(n, 'Karte', 'Karten')}`, rules: 'Regeln', back: 'Zurück', close: 'Schließen', menu: 'Menü',
  saveExit: 'Speichern und verlassen', savedNote: 'Jeder Zug wird gespeichert — spiel jederzeit weiter.', newGameConfirm: 'Neues Spiel starten? Dieses geht verloren.',
  bito: 'Fertig', take: 'Nehmen', pass: 'Passe', transfer: 'Weitergeben', you: 'Du', trump: 'Trumpf', talon: n => `noch ${n}`, discard: 'Ablage',
  st: {
    attack: 'Dein Angriff', defend: 'Stechen — oder nehmen', throwIn: 'Zuwerfen — oder fertig', throwTaking: 'Er nimmt — noch was dazu?',
    waiting: w => `${w} überlegt`, dealing: 'Geben…', tapToSkip: 'Tippen zum Überspringen', youOut: 'Du bist raus — wir sehen dem Ende zu',
    selectTarget: 'Wähle die Karte zum Stechen',
  },
  bubble: { take: 'Ich nehme', bito: 'Fertig', pass: 'Passe', transfer: 'Weiter!' },
  ev: {
    lowTrump: (w, c) => `Niedrigster Trumpf ${c} — ${w} beginnt`, lowTrumpYou: c => `Dein niedrigster Trumpf ${c} — du beginnst`, firstMove: w => `${w} beginnt`,
    took: w => `${w} nimmt die Karten`, tookYou: 'Du nimmst die Karten', beaten: 'Abgewehrt!', transfer: w => `Weitergegeben! ${w} verteidigt`,
    transferYou: 'An dich weitergegeben!', out: w => `${w} ist raus`, outYou: 'Du hast keine Karten mehr!', talonEmpty: 'Der Stapel ist leer',
  },
  role: { attacker: 'Greift an', defender: 'Verteidigt' },
  end: {
    durak: 'Durak!', notDurak: 'Kein Durak!', durakIs: w => `${w} ist der Durak`, draw: 'Unentschieden', drawSub: 'Die letzten Karten gingen gleichzeitig — niemand bekommt den Hut',
    place: n => `${n}. Platz`, again: 'Noch einmal', settings: 'Einstellungen', home: 'Verlassen',
    pogony: 'Mit Schulterstücken!', durakTag: 'Durak',
    loseLines: ['Der Papierhut steht dir.', 'Jeder Meister war schon mal der Durak.', 'Heute lief es nicht. Revanche?'],
    winLines: ['Saubere Hände, klarer Kopf.', 'Als Erster raus — mit Stil.', 'Den Hut trägt heute jemand anderes.'],
    signIn: 'Melde dich an, um Belohnungen zu behalten und in der Rangliste aufzusteigen', skip: 'Überspringen',
  },
  hints: {
    attack: 'Dein Angriff: spiel eine beliebige Karte. Am klügsten eröffnest du mit einer niedrigen Nicht-Trumpfkarte.',
    defend: 'Stich jede Karte mit einer höheren derselben Farbe oder mit Trumpf. Oder tippe auf „Nehmen“.',
    throwIn: 'Wirf Karten zu, deren Wert schon auf dem Tisch liegt — oder „Fertig“.',
    transfer: 'Weitergeben: leg eine Karte gleichen Werts — dann verteidigt der Nächste.',
    taking: 'Er nimmt alles — wirf Karten der Werte auf dem Tisch zu oder passe.', gotIt: 'Verstanden',
  },
  fast: 'Schnellmodus', on: 'an', off: 'aus',
  rulesTitle: 'So spielt man Durak',
  rulesList: [
    { h: 'Ziel', p: 'Werde alle Karten los. Wer am Ende als Letzter noch Karten hält, ist der Durak — der Dumme.' },
    { h: 'Geben & Trumpf', p: 'Jeder bekommt sechs Karten. Die unterste Karte des Stapels liegt offen darunter: Ihre Farbe ist für das ganze Spiel Trumpf. Wer den niedrigsten Trumpf hat, greift zuerst an.' },
    { h: 'Angriff', p: 'Der Angreifer spielt eine Karte gegen den nächsten Spieler (den Verteidiger). Danach dürfen alle außer dem Verteidiger Karten zuwerfen, deren Wert schon auf dem Tisch liegt.' },
    { h: 'Verteidigung', p: 'Stich jede Angriffskarte mit einer höheren derselben Farbe oder mit einem beliebigen Trumpf (Trumpf sticht nur ein höherer Trumpf). Kannst oder willst du nicht, nimm alle Karten auf.' },
    { h: 'Grenzen', p: 'Höchstens sechs Angriffskarten pro Runde und nie mehr, als der Verteidiger auf der Hand hat.' },
    { h: 'Nach der Runde', p: 'Abgewehrt: Die Karten kommen auf die Ablage, der Verteidiger greift als Nächster an. Genommen: Der Verteidiger nimmt sie auf und setzt aus. Alle ziehen auf sechs nach — Angreifer zuerst, Verteidiger zuletzt.' },
    { h: 'Variante Weitergeben', p: 'Bevor er etwas sticht, darf der Verteidiger eine Karte gleichen Werts dazulegen und den ganzen Angriff an den Nächsten weitergeben (wenn der genug Karten hat).' },
    { h: 'Das Ende', p: 'Ist der Stapel leer, scheidet aus, wer keine Karten mehr hat. Der Letzte mit Karten muss den Papierhut tragen.' },
  ],
  botNames: ['Lukas', 'Anna', 'Felix', 'Lena', 'Jonas'],
};
export default de;
