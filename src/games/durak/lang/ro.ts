import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { roN } from '../../plural';

const ro: DurakStrings = {
  title: TITLE.ro, tagline: TAGLINE.ro,
  play: 'Împarte', resume: 'Continuă jocul', newGame: 'Joc nou', players: 'Jucători', level: 'Boți', easy: 'Ușori', normal: 'Normali', hard: 'Puternici',
  variant: 'Variantă', podkidnoy: 'Cu aruncare', perevodnoy: 'Cu transfer', podkidnoyHint: 'Toți pot arunca cărți de aceeași valoare',
  perevodnoyHint: 'În plus: atacul se poate transfera cu o carte de aceeași valoare',
  deck: 'Pachet', cards: n => roN(n, 'carte', 'cărți'), rules: 'Reguli', back: 'Înapoi', close: 'Închide', menu: 'Meniu',
  saveExit: 'Salvează și ieși', savedNote: 'Fiecare mutare e salvată — continui oricând.', newGameConfirm: 'Începi un joc nou? Acesta se va pierde.',
  bito: 'Gata', take: 'Iau', pass: 'Pas', transfer: 'Transferă', you: 'Tu', trump: 'Atu', talon: n => `au rămas ${n}`, discard: 'Teanc bătut',
  st: {
    attack: 'Atacul tău', defend: 'Bate — sau ia', throwIn: 'Aruncă — sau gata', throwTaking: 'Ia cărțile — mai arunci?',
    waiting: w => `${w} se gândește`, dealing: 'Se împart…', tapToSkip: 'Atinge ca să sari', youOut: 'Ai ieșit — urmărim finalul',
    selectTarget: 'Alege cartea pe care o bați',
  },
  bubble: { take: 'Iau', bito: 'Gata', pass: 'Pas', transfer: 'Transfer!' },
  ev: {
    lowTrump: (w, c) => `Cel mai mic atu ${c} — începe ${w}`, lowTrumpYou: c => `Cel mai mic atu al tău ${c} — începi tu`, firstMove: w => `Începe ${w}`,
    took: w => `${w} ia cărțile`, tookYou: 'Iei cărțile', beaten: 'Bătute!', transfer: w => `Transferat! Se apără ${w}`,
    transferYou: 'Transferat la tine!', out: w => `${w} a ieșit`, outYou: 'Nu mai ai cărți!', talonEmpty: 'Pachetul s-a terminat',
  },
  role: { attacker: 'Atacă', defender: 'Se apără' },
  end: {
    durak: 'Prostul!', notDurak: 'Nu ești prostul!', durakIs: w => `${w} e prostul`, draw: 'Egalitate', drawSub: 'Ultimele cărți au ieșit deodată — nimeni nu poartă coiful',
    place: n => (n === 1 ? 'Locul întâi' : `Locul ${n}`), again: 'Încă o dată', settings: 'Setări', home: 'Ieși',
    pogony: 'Cu epoleți!', durakTag: 'Prostul',
    loseLines: ['Coiful de hârtie îți stă bine.', 'Orice maestru a fost odată prostul.', 'Azi n-a venit cartea. Revanșa?'],
    winLines: ['Mâini curate, minte limpede.', 'Primul afară — cu stil.', 'Coiful îl poartă azi altcineva.'],
    signIn: 'Conectează-te ca să păstrezi recompensele și să urci în clasament', skip: 'Sari',
  },
  hints: {
    attack: 'Atacul tău: joacă orice carte. Cel mai bine deschizi cu o carte mică, fără atu.',
    defend: 'Bate fiecare carte cu una mai mare de aceeași culoare sau cu un atu. Sau apasă „Iau”.',
    throwIn: 'Aruncă cărți cu valori care sunt deja pe masă — sau „Gata”.',
    transfer: 'Transfer: pune o carte de aceeași valoare — se apără următorul.',
    taking: 'Ia tot — mai aruncă din valorile de pe masă sau spune „Pas”.', gotIt: 'Am înțeles',
  },
  fast: 'Mod rapid', on: 'pornit', off: 'oprit',
  rulesTitle: 'Cum se joacă Durak',
  rulesList: [
    { h: 'Scopul', p: 'Scapă de toate cărțile. Ultimul jucător care mai are cărți în mână e durakul — prostul.' },
    { h: 'Împărțire și atu', p: 'Fiecare primește șase cărți. Ultima carte din pachet stă cu fața în sus sub el: culoarea ei e atu tot jocul. Atacă primul cel cu cel mai mic atu.' },
    { h: 'Atac', p: 'Atacantul joacă o carte spre jucătorul următor (apărătorul). Apoi toți, în afară de apărător, pot arunca cărți de o valoare aflată deja pe masă.' },
    { h: 'Apărare', p: 'Bate fiecare carte cu una mai mare de aceeași culoare sau cu orice atu (un atu e bătut doar de un atu mai mare). Dacă nu poți sau nu vrei, iei toate cărțile de pe masă.' },
    { h: 'Limite', p: 'Cel mult șase cărți de atac într-o rundă și niciodată mai multe decât are apărătorul în mână.' },
    { h: 'După rundă', p: 'Bătute: cărțile merg în teancul bătut, iar apărătorul atacă următorul. Luate: apărătorul le ia și pierde rândul. Toți completează până la șase — atacantul primul, apărătorul ultimul.' },
    { h: 'Varianta cu transfer', p: 'Înainte să bată ceva, apărătorul poate pune o carte de aceeași valoare și transferă tot atacul jucătorului următor (dacă acesta are destule cărți).' },
    { h: 'Finalul', p: 'Când pachetul e gol, jucătorii rămași fără cărți ies. Ultimul cu cărți poartă coiful de hârtie.' },
  ],
  botNames: ['Andrei', 'Ioana', 'Mihai', 'Elena', 'Radu'],
};
export default ro;
