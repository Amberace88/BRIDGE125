import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';
import { lt3 } from '../../plural';

const trick = (n: number) => `${n} ${lt3(n, 'kirtis', 'kirčiai', 'kirčių')}`;

const lt: ZoleStrings = {
  title: TITLES.lt,
  tagline: TAGLINES.lt,
  lobby: {
    sub: 'Trys žaidėjai, 26 kortos, vienas žaidžia prieš du. Pergalei reikia 61 akies.',
    level: 'Varžovai', levels: { easy: 'Lengvi', normal: 'Vidutiniai', hard: 'Stiprūs' }, deals: 'Dalijimai', endless: '∞',
    rules: 'Stalo taisyklės', maza: 'Mažoji zolė', mazaSub: 'Įsipareigoti nepaimti nė vieno kirčio', pules: 'Pulės',
    pulesSub: 'Visi pas → pulė vietoj galdiņš (kaip turnyruose)', start: 'Sėstis prie stalo', howTo: 'Kaip žaisti', back: 'Atgal',
  },
  bid: { take: 'Imti stalą', zole: 'Zolė', maza: 'Mažoji zolė', pass: 'Pas' },
  bidSub: {
    take: 'Paimk 2 stalo kortas, nusimesk 2 · žaisk vienas',
    zole: 'Žaisk vienas be stalo · dvigubi statymai',
    maza: 'Nepaimk nė vieno kirčio',
    pass: 'Tegu žaidžia kitas',
  },
  said: { take: 'ima stalą', zole: 'zolė!', maza: 'mažoji zolė', pass: 'pas' },
  contract: { lielais: 'Didysis', zole: 'Zolė', maza: 'Mažoji zolė', galdins: 'Galdiņš', pule: 'Pulė' },
  role: { lielais: 'Didysis', mazais: 'Mažasis', solo: 'Pats už save' },
  plays: (w, c) => c === 'lielais' ? `${w} ima stalą` : c === 'zole' ? `${w} žaidžia zolę` : c === 'maza' ? `${w} žaidžia mažąją zolę` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Jūs žaidžiate didįjį' : c === 'zole' ? 'Jūs žaidžiate zolę' : c === 'maza' ? 'Jūs žaidžiate mažąją zolę' : 'Galdiņš',
  allPassGaldins: 'Visi pas — žaidžiame galdiņš', allPassPule: 'Visi pas — rašoma pulė',
  status: {
    yourBid: 'Jūsų žodis', yourDiscard: 'Nusimeskite 2 kortas', yourLead: 'Jūsų ėjimas — pradėkite', yourTurn: 'Jūsų ėjimas', dealing: 'Dalijama…', tapToSkip: 'palieskite, kad praleistumėte',
    bidding: w => `${w} galvoja…`, discarding: w => `${w} nusimeta 2 kortas…`, thinking: w => `${w} galvoja…`,
  },
  discardBtn: p => `Nusimesti · +${p}`,
  you: 'Jūs', partner: 'partneris',
  acis: 'akys', tricks: 'kirčiai', trickN: trick,
  lastTrick: 'Paskutinis kirtis', lastTrickBy: w => `paėmė ${w}`, table: 'Stalas', buried: 'Nusimestos', galdsTo: w => `stalo kortos → ${w}`,
  deal: (n, t) => (t > 0 ? `Dalijimas ${n} iš ${t}` : `Dalijimas ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Jūs laimite', jani: 'Jūs laimite — mažieji „jaņos“', bezstikis: 'Paėmėte visus kirčius!', lose: 'Jūs pralaimite', loseJani: 'Pralaimite — likote „jaņos“', loseBezstikis: 'Nė vieno kirčio' };
    const them = { win: 'laimi', jani: 'laimi — mažieji „jaņos“', bezstikis: 'paima visus kirčius!', lose: 'pralaimi', loseJani: 'pralaimi — liko „jaņos“', loseBezstikis: 'lieka be kirčio' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'mažieji „jaņos“', bezstikis: 'visi kirčiai', lose: 'mažiau nei 61', loseJani: '„jaņos“', loseBezstikis: 'be kirčio' },
  mazaLine: (w, won) => (w == null ? (won ? 'Mažoji zolė sužaista!' : 'Mažoji zolė nepavyko') : `${w}: mažoji zolė ${won ? 'sužaista' : 'pralaimėta'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Jūs pralaimėjote galdiņš' : `Galdiņš pralaimi: ${l.map(x => x ?? 'jūs').join(' ir ')}`),
  sheet: {
    title: 'Užrašai', next: 'Kitas dalijimas', finish: 'Baigti žaidimą', finishSub: 'Suskaičiuoti rezultatą dabar', sessionOver: 'Žaidimas baigtas',
    youWon: 'Jūs pliuse!', youLost: 'Šįkart minuse', winner: w => `Laimi ${w}`, tie: 'Lygiosios',
    again: 'Naujas žaidimas', exit: 'Išeiti', total: 'Iš viso', pules: n => `Pulių ant stalo: ${n}`, personal: 'asmeninė pulė',
    final: 'Pulės nurašytos', puleAdded: '+1 bendra pulė', puleOwn: 'sava pulė nuimta', puleCommon: 'bendra pulė paimta · +1 iš kiekvieno',
    pulePersonal: 'asmeninė pulė paimta · +3', vs: 'prieš', yourBalance: 'Jūsų balansas', rows: 'Dalijimas',
  },
  menu: {
    title: 'Pauzė', resume: 'Tęsti', rules: 'Taisyklės', newGame: 'Naujas žaidimas', newGameSure: 'Palieskite dar kartą, kad pradėtumėte iš naujo',
    finish: 'Baigti ir suskaičiuoti', exit: 'Palikti stalą', exitSub: 'Išsaugoma po kiekvieno ėjimo — tęsite nuo čia.',
  },
  fast: 'Greitas režimas', fastOn: 'įj.', fastOff: 'išj.',
  coach: {
    ok: 'Supratau',
    bid: n => `Turite ${n} ${lt3(n, 'kozirį', 'kozirius', 'kozirių')}. Stalą imkite turėdami apie 5 kozirius, tarp jų damas ar valetus; su silpna ranka — pas.`,
    suggest: b => `Patarimas: ${b}`,
    discard: 'Nusimeskite 2 kortas — jų akys skaičiuojamos jums. Nusimeskite vienišą dešimtuką ar karalių, kad liktumėte be tos spalvos.',
    lead: 'Jūs pradedate. Didžiajam verta aukštais koziriais išmušti varžovų kozirius.',
    follow: 'Eikite į spalvą. Visos damos, valetai ir būgnai yra koziriai — viena spalva.',
    mazie: (p, d) => `Jūs ir ${p} žaidžiate kartu prieš ${d}. Kai kirtį ima ${p}, primeskite akių.`,
    galdins: 'Galdiņš: kiekvienas už save — pralaimi tas, kas paima daugiausia kirčių.',
    maza: 'Mažoji zolė: pasiskelbęs žaidėjas neturi paimti nė vieno kirčio.',
    declarer: 'Reikia 61 akies iš 120. Nusimestos kortos jau skaičiuojamos jums.',
  },
  rules: {
    title: 'Kaip žaisti zolę',
    intro: 'Žaidžia trise. Kiekviename dalijime vienas žaidžia vienas — didysis (lielais) — prieš kitus du (mazie), kurie žaidžia kartu. Didžiajam reikia surinkti bent 61 akį iš 120.',
    deckH: 'Kaladė', deck: '26 kortos: tūzai, dešimtukai, karaliai, damos, valetai ir devynakės visų spalvų, taip pat 8♦ ir 7♦. Kiekvienas gauna po 8 kortas, 2 dedamos ant stalo užverstos.',
    pointsH: 'Kortų akys',
    trumpsH: 'Koziriai — 14', trumps: 'Visos damos, visi valetai ir visi būgnai yra koziriai — nuo kryžių damos iki būgnų septynakės. Kryžiuose, vynuose ir širdyse lieka tik tūzas, 10, karalius ir 9.',
    playH: 'Žaidimas', play: 'Reikia eiti į pradėtą spalvą — koziriai laikomi viena spalva. Jei neturite, dėkite bet ką. Kirtį ima aukščiausias koziris, o jei kozirių nėra — aukščiausia pradėtos spalvos korta. Pirmas eina žaidėjas kairėje nuo dalijančio.',
    bidH: 'Varžytinės', bids: {
      take: 'Imti stalą — tapti didžiuoju: paimti 2 stalo kortas ir nusimesti 2. Nusimestų kortų akys skaičiuojamos jums.',
      zole: 'Zolė — žaisti vienam be stalo (jo akys atitenka varžovams). Statymai didesni.',
      maza: 'Mažoji zolė — laimėti nepaimant nė vieno kirčio (stalo taisyklė).',
      pass: 'Pas — sprendžia kitas. Žaidžia pirmasis, kuris nepasako „pas“.',
    },
    allPassH: 'Jei visi pas', galdins: 'Galdiņš: kiekvienas už save. Pralaimi tas, kas paėmė daugiausia kirčių (jei lygu — daugiausia akių); stalo kortos atitenka paskutiniam kirčiui.',
    pules: 'Su pulėmis: rašoma bendra pulė ir kortos perdalijamos. Kitas laimėjęs didysis ją pasiima (+1 iš kiekvieno); didysis, pralaimėjęs esant atvirai pulei, gauna asmeninę pulę.',
    scoreH: 'Taškai', scoreCols: ['Didysis surinko', 'Didysis', 'Zolė'],
    scoreRows: {
      bezstikis: 'Visi 8 kirčiai', jani: '91 ir daugiau', win: '61–90', lose: '31–60', loseJani: '30 ir mažiau', loseBezstikis: 'Nė vieno kirčio',
    },
    mazaRow: ['Mažoji zolė sužaista', 'Mažoji zolė pralaimėta'], galdinsRow: 'Galdiņš: pralaimėjęs −4, kiti +2',
    tipsH: 'Patarimai', tips: [
      'Skaičiuokite kozirius: 5 ir daugiau su viena ar dviem damomis — drąsiai imkite stalą.',
      'Nusimeskite trumpų spalvų dešimtukus ir karalius — akys jūsų, ir galėsite kirsti koziriu.',
      'Mažajam: kai kirtį ima partneris, primeskite tūzą ar dešimtuką.',
    ],
  },
};
export default lt;
