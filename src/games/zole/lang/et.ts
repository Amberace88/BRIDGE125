import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';
import { two } from '../../plural';

const et: ZoleStrings = {
  title: TITLES.et,
  tagline: TAGLINES.et,
  lobby: {
    sub: 'Kolm mängijat, 26 kaarti, üks mängib kahe vastu. Võiduks on vaja 61 silma.',
    level: 'Vastased', levels: { easy: 'Kerged', normal: 'Tavalised', hard: 'Tugevad' }, deals: 'Jagamised', endless: '∞',
    rules: 'Laua reeglid', maza: 'Väike zole', mazaSub: 'Lubadus mitte võtta ühtki tihti', pules: 'Puled',
    pulesSub: 'Kõik passivad → pule galdiņši asemel (nagu turniiridel)', start: 'Istu lauda', howTo: 'Kuidas mängida', back: 'Tagasi',
  },
  bid: { take: 'Võta laud', zole: 'Zole', maza: 'Väike zole', pass: 'Pass' },
  bidSub: {
    take: 'Võta 2 lauakaarti, pane 2 maha · mängi üksi',
    zole: 'Mängi üksi ilma lauata · topeltpanused',
    maza: 'Ära võta ühtki tihti',
    pass: 'Mängigu keegi teine',
  },
  said: { take: 'võtab laua', zole: 'zole!', maza: 'väike zole', pass: 'pass' },
  contract: { lielais: 'Suur mäng', zole: 'Zole', maza: 'Väike zole', galdins: 'Galdiņš', pule: 'Pule' },
  role: { lielais: 'Suur', mazais: 'Väike', solo: 'Igaüks enda eest' },
  plays: (w, c) => c === 'lielais' ? `${w} võtab laua` : c === 'zole' ? `${w} mängib zolet` : c === 'maza' ? `${w} mängib väikest zolet` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Sina mängid suurt' : c === 'zole' ? 'Sina mängid zolet' : c === 'maza' ? 'Sina mängid väikest zolet' : 'Galdiņš',
  allPassGaldins: 'Kõik passisid — mängime galdiņši', allPassPule: 'Kõik passisid — kirjutatakse pule',
  status: {
    yourBid: 'Sinu sõna', yourDiscard: 'Pane 2 kaarti maha', yourLead: 'Sinu käik — alusta', yourTurn: 'Sinu käik', dealing: 'Jagan…', tapToSkip: 'puuduta vahelejätmiseks',
    bidding: w => `${w} mõtleb…`, discarding: w => `${w} paneb 2 kaarti maha…`, thinking: w => `${w} mõtleb…`,
  },
  discardBtn: p => `Pane maha · +${p}`,
  you: 'Sina', partner: 'partner',
  acis: 'silma', tricks: 'tihid', trickN: n => `${n} ${two(n, 'tihi', 'tihti')}`,
  lastTrick: 'Viimane tihi', lastTrickBy: w => `võttis ${w}`, table: 'Laud', buried: 'Mahapandud', galdsTo: w => `lauakaardid → ${w}`,
  deal: (n, t) => (t > 0 ? `Jagamine ${n}/${t}` : `Jagamine ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Sina võidad', jani: 'Võidad — väikesed „jaņis“', bezstikis: 'Võtsid kõik tihid!', lose: 'Sina kaotad', loseJani: 'Kaotad — jäid „jaņisse“', loseBezstikis: 'Mitte ühtki tihti' };
    const them = { win: 'võidab', jani: 'võidab — väikesed „jaņis“', bezstikis: 'võtab kõik tihid!', lose: 'kaotab', loseJani: 'kaotab — jäi „jaņisse“', loseBezstikis: 'jääb tihita' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'väikesed „jaņis“', bezstikis: 'kõik tihid', lose: 'alla 61', loseJani: '„jaņis“', loseBezstikis: 'tihita' },
  mazaLine: (w, won) => (w == null ? (won ? 'Väike zole tehtud!' : 'Väike zole ebaõnnestus') : `${w}: väike zole ${won ? 'tehtud' : 'kaotatud'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Sina kaotasid galdiņši' : `Galdiņši kaotab: ${l.map(x => x ?? 'sina').join(' ja ')}`),
  sheet: {
    title: 'Punktileht', next: 'Järgmine jagamine', finish: 'Lõpeta mäng', finishSub: 'Arvuta tulemus kohe', sessionOver: 'Mäng läbi',
    youWon: 'Oled plussis!', youLost: 'Seekord miinuses', winner: w => `Võidab ${w}`, tie: 'Viik',
    again: 'Uus mäng', exit: 'Lahku', total: 'Kokku', pules: n => `Puled laual: ${n}`, personal: 'isiklik pule',
    final: 'Puled arvestatud', puleAdded: '+1 ühine pule', puleOwn: 'oma pule maha võetud', puleCommon: 'ühine pule võidetud · +1 igaühelt',
    pulePersonal: 'isiklik pule võidetud · +3', vs: 'vs', yourBalance: 'Sinu saldo', rows: 'Jagamine',
  },
  menu: {
    title: 'Paus', resume: 'Jätka', rules: 'Reeglid', newGame: 'Uus mäng', newGameSure: 'Puuduta uuesti, et otsast alustada',
    finish: 'Lõpeta ja arvuta', exit: 'Lahku lauast', exitSub: 'Salvestatakse pärast iga käiku — jätkad siitsamast.',
  },
  fast: 'Kiire režiim', fastOn: 'sees', fastOff: 'väljas',
  coach: {
    ok: 'Selge',
    bid: n => `Sul on ${n} ${two(n, 'trump', 'trumpi')}. Laua võtab umbes 5 trumbiga, nende seas emandad või poisid; nõrga käega passi.`,
    suggest: b => `Soovitus: ${b}`,
    discard: 'Pane 2 kaarti maha — nende silmad lähevad sulle. Pane maha üksik kümme või kuningas, et mast tühjaks jääks.',
    lead: 'Sina alustad. Suurena tõmba kõrgete trumpidega vastaste trumbid välja.',
    follow: 'Tunnista masti. Kõik emandad, poisid ja ruudud on trumbid — üks mast.',
    mazie: (p, d) => `Sina ja ${p} mängite koos ${d} vastu. Kui tihi läheb ${p} kätte, viska silmi juurde.`,
    galdins: 'Galdiņš: igaüks enda eest — kaotab see, kes võtab kõige rohkem tihte.',
    maza: 'Väike zole: mängija ei tohi võtta ühtki tihti.',
    declarer: 'Sul on vaja 61 silma 120-st. Mahapandud kaardid lähevad juba sulle.',
  },
  rules: {
    title: 'Kuidas mängida zolet',
    intro: 'Mängib kolm. Igas jagamises mängib üks üksi — suur (lielais) — kahe ülejäänu (mazie) vastu, kes mängivad koos. Suurel on vaja vähemalt 61 silma 120-st.',
    deckH: 'Pakk', deck: '26 kaarti: kõigi mastide äss, kümme, kuningas, emand, poiss ja üheksa ning lisaks 8♦ ja 7♦. Igaüks saab 8 kaarti, 2 pannakse lauale tagurpidi.',
    pointsH: 'Kaartide silmad',
    trumpsH: 'Trumbid — 14 tükki', trumps: 'Kõik emandad, kõik poisid ja kõik ruudud on trumbid, alates risti emandast kuni ruutu seitsmeni. Ristis, potis ja ärtus jäävad alles ainult äss, 10, kuningas ja 9.',
    playH: 'Mäng', play: 'Käidud masti tuleb tunnistada — trumbid on üks mast. Kui masti pole, käi mida tahes. Tihi võtab kõrgeim trump, muidu käidud masti kõrgeim kaart. Esimesena käib jagajast vasakul olev mängija.',
    bidH: 'Pakkumine', bids: {
      take: 'Võta laud — saa suureks: võta 2 lauakaarti ja pane 2 maha. Mahapandud kaartide silmad lähevad sulle.',
      zole: 'Zole — mängi üksi ilma lauata (selle silmad lähevad vastastele). Kõrgemad panused.',
      maza: 'Väike zole — võida, võtmata ühtki tihti (laua reegel).',
      pass: 'Pass — otsustab järgmine. Mängib esimene, kes ei passi.',
    },
    allPassH: 'Kui kõik passivad', galdins: 'Galdiņš: igaüks enda eest. Kaotab see, kes võttis kõige rohkem tihte (viigi korral kõige rohkem silmi); lauakaardid lähevad viimasele tihile.',
    pules: 'Pulega: kirjutatakse ühine pule ja jagatakse uuesti. Järgmine võitnud suur korjab selle (+1 igaühelt); suur, kes kaotab avatud pule ajal, saab isikliku pule.',
    scoreH: 'Punktid', scoreCols: ['Suur sai', 'Suur', 'Zole'],
    scoreRows: {
      bezstikis: 'Kõik 8 tihti', jani: '91 või rohkem', win: '61–90', lose: '31–60', loseJani: '30 või vähem', loseBezstikis: 'Ükski tihi',
    },
    mazaRow: ['Väike zole tehtud', 'Väike zole kaotatud'], galdinsRow: 'Galdiņš: kaotaja −4, teised +2',
    tipsH: 'Nõuanded', tips: [
      'Loe trumbid kokku: 5 või rohkem ühe-kahe emandaga — võta julgelt laud.',
      'Pane maha lühikeste mastide kümned ja kuningad — silmad on sinu ja saad trumbiga lüüa.',
      'Väikesena: kui tihi läheb partnerile, viska juurde äss või kümme.',
    ],
  },
};
export default et;
