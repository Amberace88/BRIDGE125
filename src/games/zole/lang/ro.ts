import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';
import { roN } from '../../plural';

const ro: ZoleStrings = {
  title: TITLES.ro,
  tagline: TAGLINES.ro,
  lobby: {
    sub: 'Trei jucători, 26 de cărți, unul joacă împotriva a doi. Câștigi cu 61 de puncte.',
    level: 'Adversari', levels: { easy: 'Ușori', normal: 'Normali', hard: 'Puternici' }, deals: 'Mâini', endless: '∞',
    rules: 'Regulile mesei', maza: 'Zole mică', mazaSub: 'Anunți că nu iei nicio levată', pules: 'Pule',
    pulesSub: 'Toți pas → o pule în loc de galdiņš (ca la turnee)', start: 'Ia loc la masă', howTo: 'Cum se joacă', back: 'Înapoi',
  },
  bid: { take: 'Iau masa', zole: 'Zole', maza: 'Zole mică', pass: 'Pas' },
  bidSub: {
    take: 'Iei cele 2 cărți de pe masă, pui deoparte 2 · joci singur',
    zole: 'Joci singur, fără masă · miză dublă',
    maza: 'Nu iei nicio levată',
    pass: 'Să joace altcineva',
  },
  said: { take: 'ia masa', zole: 'zole!', maza: 'zole mică', pass: 'pas' },
  contract: { lielais: 'Jocul mare', zole: 'Zole', maza: 'Zole mică', galdins: 'Galdiņš', pule: 'Pule' },
  role: { lielais: 'Mare', mazais: 'Mic', solo: 'Fiecare pentru el' },
  plays: (w, c) => c === 'lielais' ? `${w} ia masa` : c === 'zole' ? `${w} joacă zole` : c === 'maza' ? `${w} joacă zole mică` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Joci mare' : c === 'zole' ? 'Joci zole' : c === 'maza' ? 'Joci zole mică' : 'Galdiņš',
  allPassGaldins: 'Toți au zis pas — jucăm galdiņš', allPassPule: 'Toți au zis pas — se scrie o pule',
  status: {
    yourBid: 'Rândul tău', yourDiscard: 'Pune deoparte 2 cărți', yourLead: 'Deschizi tu', yourTurn: 'E rândul tău', dealing: 'Se împart…', tapToSkip: 'atinge ca să sari',
    bidding: w => `${w} se gândește…`, discarding: w => `${w} pune deoparte 2 cărți…`, thinking: w => `${w} se gândește…`,
  },
  discardBtn: p => `Pune deoparte · +${p}`,
  you: 'Tu', partner: 'partener',
  acis: 'pct.', tricks: 'levate', trickN: n => roN(n, 'levată', 'levate'),
  lastTrick: 'Ultima levată', lastTrickBy: w => `luată de ${w}`, table: 'Masa', buried: 'Puse deoparte', galdsTo: w => `cărțile mesei → ${w}`,
  deal: (n, t) => (t > 0 ? `Mâna ${n} din ${t}` : `Mâna ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Câștigi', jani: 'Câștigi — micii „în jaņi”', bezstikis: 'Ai luat toate levatele!', lose: 'Pierzi', loseJani: 'Pierzi — ai rămas „în jaņi”', loseBezstikis: 'Nicio levată' };
    const them = { win: 'câștigă', jani: 'câștigă — micii „în jaņi”', bezstikis: 'ia toate levatele!', lose: 'pierde', loseJani: 'pierde — „în jaņi”', loseBezstikis: 'rămâne fără levată' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'micii „în jaņi”', bezstikis: 'toate levatele', lose: 'sub 61', loseJani: '„în jaņi”', loseBezstikis: 'fără levată' },
  mazaLine: (w, won) => (w == null ? (won ? 'Zole mică reușită!' : 'Zole mică ratată') : `${w}: zole mică ${won ? 'reușită' : 'ratată'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Ai pierdut galdiņš' : `Pierde galdiņš: ${l.map(x => x ?? 'tu').join(' și ')}`),
  sheet: {
    title: 'Foaia de scor', next: 'Mâna următoare', finish: 'Încheie jocul', finishSub: 'Calculează rezultatul acum', sessionOver: 'Joc încheiat',
    youWon: 'Ești pe plus!', youLost: 'De data asta pe minus', winner: w => `Câștigă ${w}`, tie: 'Egalitate',
    again: 'Joc nou', exit: 'Ieși', total: 'Total', pules: n => `Pule pe masă: ${n}`, personal: 'pule personală',
    final: 'Pule decontate', puleAdded: '+1 pule comună', puleOwn: 'propria pule ștearsă', puleCommon: 'pule comună câștigată · +1 de la fiecare',
    pulePersonal: 'pule personală câștigată · +3', vs: 'vs', yourBalance: 'Soldul tău', rows: 'Mâna',
  },
  menu: {
    title: 'Pauză', resume: 'Reia', rules: 'Reguli', newGame: 'Joc nou', newGameSure: 'Atinge din nou ca să începi de la capăt',
    finish: 'Încheie și calculează', exit: 'Pleacă de la masă', exitSub: 'Se salvează după fiecare mutare — continui exact de aici.',
  },
  fast: 'Mod rapid', fastOn: 'pornit', fastOff: 'oprit',
  coach: {
    ok: 'Am înțeles',
    bid: n => `Ai ${roN(n, 'atu', 'atuuri')}. Masa se ia cu vreo 5 atuuri, printre ele dame sau valeți; cu o mână slabă — pas.`,
    suggest: b => `Sugestie: ${b}`,
    discard: 'Pune deoparte 2 cărți — punctele lor sunt ale tale. Pune deoparte un 10 sau un popă singuratic ca să rămâi fără culoarea aceea.',
    lead: 'Deschizi tu. Ca jucător mare, scoate atuurile adversarilor cu atuurile tale mari.',
    follow: 'Răspunde la culoare. Toate damele, valeții și caroul sunt atu — o singură culoare.',
    mazie: (p, d) => `Tu și ${p} jucați împreună; jucătorul mare e ${d}. Când ${p} ia levata, aruncă puncte.`,
    galdins: 'Galdiņš: fiecare pentru el — pierde cine ia cele mai multe levate.',
    maza: 'Zole mică: jucătorul care a anunțat nu are voie să ia nicio levată.',
    declarer: 'Îți trebuie 61 din 120 de puncte. Cărțile puse deoparte se numără deja pentru tine.',
  },
  rules: {
    title: 'Cum se joacă Zole',
    intro: 'Joacă trei. În fiecare mână unul joacă singur — cel mare (lielais) — împotriva celorlalți doi (mazie), care joacă împreună. Cel mare are nevoie de cel puțin 61 din cele 120 de puncte.',
    deckH: 'Pachetul', deck: '26 de cărți: as, 10, popă, damă, valet și 9 din fiecare culoare, plus 8♦ și 7♦. Fiecare primește 8 cărți, 2 stau cu fața în jos pe masă.',
    pointsH: 'Punctele cărților',
    trumpsH: 'Atuuri — 14', trumps: 'Toate damele, toți valeții și tot caroul sunt atu, de la dama de treflă până la 7 de caro. În treflă, pică și cupă rămân doar asul, 10, popa și 9.',
    playH: 'Jocul', play: 'Trebuie să răspunzi la culoarea deschisă — atuurile contează ca o singură culoare. Dacă n-ai, joci orice. Levata o ia cel mai mare atu, altfel cea mai mare carte din culoarea deschisă. Deschide jucătorul din stânga celui care împarte.',
    bidH: 'Licitația', bids: {
      take: 'Iau masa — devii jucătorul mare: iei cele 2 cărți de pe masă și pui deoparte 2. Punctele puse deoparte sunt ale tale.',
      zole: 'Zole — joci singur, fără masă (punctele ei merg la adversari). Miză mai mare.',
      maza: 'Zole mică — câștigi dacă nu iei nicio levată (regula casei).',
      pass: 'Pas — decide următorul. Joacă primul care nu zice pas.',
    },
    allPassH: 'Dacă toți zic pas', galdins: 'Galdiņš: fiecare pentru el. Pierde cine a luat cele mai multe levate (la egalitate — cele mai multe puncte); cărțile mesei merg la ultima levată.',
    pules: 'Cu pule: se scrie o pule comună și se împarte din nou. Următorul jucător mare care câștigă o încasează (+1 de la fiecare); unul mare care pierde cât e o pule deschisă primește o pule personală.',
    scoreH: 'Punctajul', scoreCols: ['Cel mare a făcut', 'Jocul mare', 'Zole'],
    scoreRows: {
      bezstikis: 'Toate 8 levatele', jani: '91 sau mai mult', win: '61–90', lose: '31–60', loseJani: '30 sau mai puțin', loseBezstikis: 'Nicio levată',
    },
    mazaRow: ['Zole mică reușită', 'Zole mică ratată'], galdinsRow: 'Galdiņš: cel care pierde −4, ceilalți +2',
    tipsH: 'Sfaturi', tips: [
      'Numără-ți atuurile: 5 sau mai multe, cu o damă sau două — ia masa fără teamă.',
      'Pune deoparte zecile și popii culorilor scurte — punctele sunt ale tale și apoi tai cu atu.',
      'Ca jucător mic: când partenerul ia levata, aruncă un as sau un 10.',
    ],
  },
};
export default ro;
