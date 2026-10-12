import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

const lt: LocalePack = {
  dict: {
    tagline: 'Kortų žaidimas Bridge', play: 'Žaisti', vsBots: 'Žaisti prieš botus', opponents: 'Varžovai', level: 'Boto lygis',
    easy: 'Lengvas', normal: 'Įprastas', online: 'Internetu su draugais', soon: 'Netrukus', howToPlay: 'Kaip žaisti', profile: 'Profilis',
    settings: 'Nustatymai', language: 'Kalba', sound: 'Garsas', on: 'Įj.', off: 'Išj.', guest: 'Svečias', signIn: 'Susikurti paskyrą arba prisijungti',
    signOut: 'Atsijungti', emailPlaceholder: 'Tavo el. paštas', sendLink: 'Siųsti prisijungimo nuorodą',
    linkSent: e => `Patikrink ${e} ir atidaryk nuorodą, kad prisijungtum.`, personalize: 'Asmeninis stilius',
    personalizeLocked: 'Susikurk nemokamą paskyrą ir išsirink savo spalvą bei stalą.', accent: 'Akcento spalva', background: 'Stalas',
    yourName: 'Žaidėjo vardas', save: 'Išsaugoti', saved: 'Išsaugota', back: 'Atgal', close: 'Uždaryti',
    yourTurn: 'Tavo ėjimas', waiting: n => `${n} galvoja`, deckLeft: n => `Kaladėje: ${n}`, points: n => `${n} tšk.`,
    draw: 'Traukti', pass: 'Pas', take: n => `Imti ${n}`, transfer6S: 'Perduoti su 6♠', playN: n => `Dėti ${n}`, comboQ6: 'D♠ + 6♠',
    chooseSuit: 'Užsakyk rūšį', coverSix: 'Uždenk šešiakę', suitNames: { S: 'Vynai', C: 'Kryžiai', H: 'Širdys', D: 'Būgnai' },
    ev: {
      queen: w => `Vynų dama! ${w} ima 5`, queenSub: 'Nebent turi 6♠', transfer: w => `6♠! ${w} ima 6`,
      eight: (w, n) => `${w} ima ${n}`, seven: (w, n) => `${w} ima ${n}`, skip: w => `${w} praleidžia ėjimą`,
      kings: 'Keturi karaliai!', kingsSub: 'Visų taškai vėl nulis', reset125: w => `${w}: lygiai 125 — atgal į 0`,
      suit: (_w, s) => `Užsakyta rūšis: ${s}`, reshuffle: 'Krūvelė įmaišyta į kaladę',
      youTake: n => `Imi ${n}`, youSkip: 'Praleidi ėjimą', queenYou: 'Vynų dama! Imi 5', transferYou: '6♠! Imi 6 ir uždengi',
    },
    round: n => `Raundas ${n}`, roundWon: w => `${w} išmetė visas kortas`, roundWonYou: 'Išmetei visas kortas!',
    jacksFinish: n => `Pabaiga valetais (${n}) — ×${n + 1}`,
    colPlayer: 'Žaidėjas', colHand: 'Rankoje', colTotal: 'Iš viso', burned: 'Lygiai 125 — sudegė iki 0', nextRound: 'Kitas raundas',
    rematch: 'Revanšas', home: 'Meniu', youWin: 'Laimėjai!', winnerIs: w => `Laimėjo ${w}`, gameOverSub: 'Kažkas perkopė 130 — laimi mažiausias rezultatas',
    you: 'Tu', rulesTitle: 'Kaip žaisti',
    rules: [
      { h: 'Tikslas', p: 'Atsikratyk kortų ir surink kuo mažiau taškų. Kai kas nors pasiekia 130, žaidimas baigiasi — laimi mažiausias rezultatas. Pataikei lygiai į 125? Taškai sudega iki 0.' },
      { h: 'Tavo ėjimas', p: 'Dėk tos pačios rūšies arba vertės kortą kaip viršutinė. Kelias vienodos vertės kortas gali dėti iš karto. Neturi kuo eiti? Trauk vieną kortą, tada ją dėk arba pasuok.' },
      { h: 'Tūzas', p: 'Kitas žaidėjas praleidžia ėjimą.' },
      { h: '6', p: 'Ją reikia uždengti: iškart uždėk ant jos kitą kortą. Baigti šešiake negalima.' },
      { h: '7', p: 'Kitas žaidėjas ima 1 kortą ir tęsia ėjimą.' },
      { h: '8', p: 'Kitas ima 2 ir praleidžia ėjimą — nebent atsako savo aštuntuku ir perduoda toliau 4, 6 ar 8 kortas.' },
      { h: '9', p: 'Dedama ant bet kurios kortos, bet rūšies užsakyti negalima.' },
      { h: 'Valetas', p: 'Dedamas ant bet ko, o tu užsakai rūšį. Baik raundą 1–4 valetais — varžovų taškai padauginami ×2–×5.' },
      { h: 'Vynų dama', p: 'Kitas ima 5 ir praleidžia ėjimą. Turi 6♠? Atsakyk ja — dar kitas žaidėjas ima 6 ir turi ją uždengti.' },
      { h: 'Karaliai', p: 'Keturi karaliai iš eilės krūvelėje visiems žaidėjams anuliuoja taškus.' },
      { h: 'Taškai', p: 'Tūzas 15 · karalius, dama, valetas, 10 — po 10 · 6♠ — 5 · kitos — 0.' },
    ],
    continueGame: 'Tęsti žaidimą', menuQuit: 'Palikti žaidimą', botNames: ['Lukas', 'Gabija', 'Matas'],
  },

  extra: {
    nav: { howToPlay: 'Kaip žaisti', signIn: 'Prisijungti', play: 'Žaisti' },
    heroLine: 'Klasikinis kortų žaidimas Bridge — vynų dama, valetai ×5 ir garsieji 125.',
    features: ['Žaisk nemokamai naršyklėje', 'Galima rinktis iš 17 kalbų', 'Įsidiek kaip programėlę'],
    playFriends: 'Žaisti su draugais',
    guide: {
      title: 'Kaip žaisti', intro: 'Atsikratyk kortų, venk baudų ir laikyk taškus žemai. Viskas, ką reikia žinoti, per penkias minutes.',
      tabs: { basics: 'Pagrindai', special: 'Ypatingos kortos', combos: 'Kombinacijos', scoring: 'Taškai' },
      steps: [
        { h: 'Dėk ant viršutinės kortos', p: 'Tos pačios rūšies arba tos pačios vertės korta. Kelias vienos vertės kortas galima dėti kartu.' },
        { h: 'Ištuštink ranką', p: 'Kas pirmas išmeta visas kortas, baigia raundą. Kiti suskaičiuoja rankoje likusius taškus.' },
        { h: 'Laikyk taškus žemai', p: 'Taškai kaupiasi raundas po raundo. Kai kas nors pasiekia 130, žaidimas baigiasi — laimi mažiausias rezultatas.' },
      ],
      tags: { A: 'Praleisti', '6': 'Uždengti', '7': '+1', '8': '+2, grandinė', '9': 'Ant bet ko', J: 'Užsakyti rūšį', QS: '+5', K: 'Nulis' },
      combos: [
        { h: 'Vynų dama — toliau', p: 'Gavai D♠? Atsakyk 6♠ — kitas žaidėjas ima 6 kortas ir turi ją uždengti.' },
        { h: 'Aštuntukų grandinė', p: 'Kiekvienas aštuntukas prideda dvi kortas. Atsakyk savo aštuntuku ir perduok toliau 4, 6 ar 8.' },
        { h: 'Pabaiga valetais', p: 'Išmesk paskutines kortas 1–4 valetais iš karto — visų varžovų taškai padauginami ×2–×5.' },
      ],
      pointsTitle: 'Taškai už kortas, likusias rankoje raundo pabaigoje',
      line: { start: 'Startas', burn: 'Lygiai 125 → vėl 0', end: '130+ → žaidimo pabaiga' },
      example: 'Pavyzdys', youCanPlay: 'Gali dėti', cta: 'Žaisti treniruotės partiją',
    },
    auth: {
      title: 'Išsaugok savo pažangą', sub: 'Nemokama paskyra per kelias sekundes. Be slaptažodžio — atsiųsime kodą el. paštu.',
      benefits: ['Savas stalas ir spalvos', 'Pergalės ir partijos išsaugomos visuose įrenginiuose', 'Pasiruošę lygoms ir turnyrams'],
      email: 'El. paštas', cont: 'Siųsti kodą', hint: 'Tęsdamas pasižadi žaisti sąžiningai ir mėgautis žaidimu.',
      codeTitle: 'Įvesk kodą', codeSub: e => `Išsiuntėme 6 skaitmenų kodą adresu ${e}`, verify: 'Prisijungti', resend: 'Siųsti naują kodą',
      resendIn: s => `Naujas kodas po ${s} s`, wrong: 'Kodas netinka. Patikrink jį arba paprašyk naujo.', change: 'Naudoti kitą el. paštą',
      welcome: 'Tu prisijungei!', orLink: 'Gavai nuorodą vietoj kodo? Atidaryk ją šiame įrenginyje.', stats: { games: 'Partijos', wins: 'Pergalės', bm: 'Bridge Money' },
    },
    room: {
      create: 'Sukurti stalą', join: 'Prisijungti', code: 'Stalo kodas', enterCode: 'Įvesk kodą', invite: 'Pakviesti draugus', copied: 'Nuoroda nukopijuota',
      waiting: 'Laukiame žaidėjų…', addBot: 'Pridėti botą', removeBot: 'Pašalinti botą', start: 'Pradėti žaidimą', needTwo: 'Reikia bent 2 žaidėjų',
      host: 'Šeimininkas', waitHost: 'Laukiame, kol šeimininkas pradės', connecting: 'Jungiamasi…', reconnecting: 'Jungiamasi iš naujo…',
      full: 'Stalas pilnas', notFound: 'Stalas nerastas', leave: 'Palikti stalą', seatsOf: (n, m) => `${n} iš ${m} vietų`,
      shareText: 'Prisijunk prie mano Bridge 125 stalo', online: 'tinkle', bot: 'Botas',
    },
  },

  extra2: {
    quick: {
      play: 'Žaisti internetu dabar', sub: 'Rasime tikrų varžovų', title: 'Greitas žaidimas', finding: 'Ieškome žaidėjų…',
      startsIn: s => `Pradžia po ${s} s`, startNow: 'Pradėti dabar', botsFill: 'Laikui pasibaigus, laisvas vietas užims botai.',
      error: 'Nepavyko susisiekti su serveriu. Bandyk dar kartą.', starting: 'Dalijame kortas…',
    },
    lb: {
      title: 'Lyderių lentelė', sub: 'Geriausi žaidėjai pagal pergales', wins: 'Pergalės', games: 'Partijos', winRate: 'Pergalių %',
      empty: 'Dar nėra reitinguotų partijų — būk pirmas!', you: 'Tu', signIn: 'Prisijunk ir patek į lyderių lentelę', error: 'Lyderių lentelė šiuo metu nepasiekiama.', open: 'Lyderiai',
    },
    legal: { privacy: 'Privatumas', terms: 'Sąlygos', updated: 'Atnaujinta', contact: 'Kontaktai', agree: ['Tęsdamas sutinki su', 'Naudojimo sąlygomis', 'ir', 'Privatumo politika'] },
    install: {
      button: 'Įdiegti', title: 'Įsidiek Bridge 125', sub: 'Žaisk iš pradžios ekrano kaip tikroje programėlėje — nemokamai ir be programėlių parduotuvės.',
      benefits: ['Atsidaro per visą ekraną vienu palietimu', 'Žaisk su botais net be interneto', 'Visada naujausia versija — nieko nereikia atnaujinti'],
      cta: 'Įdiegti dabar', done: 'Įdiegta! Bridge 125 rasi pradžios ekrane.', later: 'Ne dabar', banner: 'Gauk programėlę — nemokamai',
      ios: ['Paliesk mygtuką „Bendrinti“', 'Pasirink „Įtraukti į pradžios ekraną“', 'Paliesk „Pridėti“ — paruošta!'],
      iosOther: 'iPhone ir iPad įrenginiuose atidaryk bridge125.com naršyklėje Safari ir įsidiek.',
      android: ['Atidaryk naršyklės meniu ⋮', 'Paliesk „Įdiegti programą“ arba „Pridėti prie pagrindinio ekrano“', 'Patvirtink — paruošta!'],
      desktop: ['Chrome arba Edge adreso juostoje spustelėk diegimo piktogramą', 'Arba meniu ⋮ → „Įdiegti Bridge 125“', 'Atsidarys atskirame lange, kaip bet kuri programa'],
      qr: 'Nuskenuok telefono kamera ir įsidiek telefone', free: 'Nemokamai · mažiau nei 1 MB · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Prisijungti', tabUp: 'Sukurti paskyrą', titleIn: 'Su sugrįžimu!', subIn: 'Prisijunk, kad išsaugotum statistiką, BM ir stalo stilių.',
      titleUp: 'Prisijunk prie Bridge 125', subUp: 'Nemokama paskyra per 20 sekundžių. Tavo pažanga bus pasiekiama bet kuriame įrenginyje.',
      email: 'El. paštas', password: 'Slaptažodis', name: 'Slapyvardis', namePh: 'pvz., Eddy', nameHint: 'Rodomas prie stalo ir lyderių lentelėje', show: 'Rodyti', hide: 'Slėpti',
      forgot: 'Pamiršai slaptažodį?', signIn: 'Prisijungti', signUp: 'Sukurti paskyrą', or: 'arba', useLink: 'Atsiųsk man prisijungimo nuorodą', usePassword: 'Prisijungti su slaptažodžiu',
      noAccount: 'Pirmą kartą čia?', haveAccount: 'Jau turi paskyrą?', pwHint: 'Bent 8 simboliai', strength: ['Per trumpas', 'Silpnas', 'Geras', 'Stiprus'],
      forgotTitle: 'Atkurti slaptažodį', forgotSub: 'Įvesk el. paštą ir atsiųsime nuorodą naujam slaptažodžiui nustatyti.', sendReset: 'Siųsti nuorodą',
      resetSent: e => `Patikrink ${e} — atidaryk nuorodą ir nustatyk naują slaptažodį.`, back: 'Atgal į prisijungimą',
      newTitle: 'Naujas slaptažodis', newSub: 'Sugalvok naują slaptažodį savo paskyrai.', newPw: 'Naujas slaptažodis', repeatPw: 'Pakartok slaptažodį', savePw: 'Išsaugoti slaptažodį',
      pwSaved: 'Slaptažodis išsaugotas — galima žaisti.', mismatch: 'Slaptažodžiai nesutampa',
      welcomeNew: n => `Sveiki prie stalo, ${n}!`, welcomeBack: 'Smagu vėl tave matyti!',
      err: {
        badEmail: 'Įvesk tinkamą el. pašto adresą', short: 'Slaptažodį turi sudaryti bent 8 simboliai', wrong: 'Neteisingas el. paštas arba slaptažodis',
        exists: 'Paskyra su šiuo el. paštu jau yra — tiesiog prisijunk.', weak: 'Pasirink stipresnį slaptažodį', notConfirmed: 'Pirmiausia patvirtink el. paštą',
        tooMany: 'Per daug bandymų — palauk minutę', network: 'Nėra ryšio — patikrink internetą', generic: 'Kažkas nepavyko. Bandyk dar kartą.',
      },
    },
    prof: {
      tabs: { me: 'Profilis', look: 'Stilius', account: 'Paskyra' }, since: d => `Paskyra sukurta: ${d}`, winRate: 'Pergalių %', avatar: 'Avataras', saved: 'Išsaugota',
      preview: 'Peržiūra', table: 'Stalas', accent: 'Akcento spalva', backs: 'Kortų nugarėlės', matchBack: 'Kaip stalas', premium: 'Premium',
      locked: 'Premium — netrukus parduotuvėje. Išbandyk peržiūroje.', adminFree: 'Administratorius — visi premium dizainai tau atrakinti',
      guestLock: 'Prisijunk, kad išsaugotum savo stilių', tryOn: 'Peržiūra', email: 'El. paštas', security: 'Slaptažodis', changePw: 'Keisti slaptažodį', pwChanged: 'Slaptažodis pakeistas',
      danger: 'Pavojinga zona', deleteAcc: 'Ištrinti mano paskyrą', deleteHint: 'Tavo paskyrą ir duomenis ištrinsime per 30 dienų.',
      admin: 'Admin', adminPanel: 'Atidaryti administravimo skydelį', guestTitle: 'Žaidi kaip svečias', guestSub: 'Susikurk nemokamą paskyrą, kad statistika, BM ir stilius būtų išsaugoti visuose įrenginiuose.', prefs: 'Nustatymai',
    },
  },

  privacy: {
    title: 'Privatumo politika',
    intro: 'Bridge 125 — nemokamas kortų žaidimas. Renkame kuo mažiau duomenų ir niekada jų neparduodame.',
    sections: [
      { h: 'Ką saugome', p: [
        'Be paskyros: iš tavo įrenginio niekas neperduodama, išskyrus slapyvardį, kurį naudoji prie internetinio stalo. Nustatymai, išsaugotas žaidimas ir atsitiktinis žaidėjo ID saugomi naršyklės vietinėje saugykloje.',
        'Su paskyra: el. pašto adresas (naudojamas tik prisijungimo kodams siųsti), slapyvardis, kalba, spalvų ir stalo pasirinkimai bei žaidimo statistika (sužaistos partijos, pergalės, BM likutis).',
      ] },
      { h: 'Internetiniai stalai', p: ['Žaidžiant internetu stalo būsena (vietos, slapyvardžiai, kortos, ėjimai) laikoma mūsų serveryje, kad visi žaidėjai matytų tą patį žaidimą. Ji nesiejama su tavo el. paštu ir ištrinama, kai prie stalo nebelieka veiklos.'] },
      { h: 'Lyderių lentelė', p: ['Jei turi paskyrą ir baigi partijas, tavo slapyvardis ir statistika gali būti rodomi viešoje lyderių lentelėje. Slapyvardį bet kada gali pakeisti profilyje.'] },
      { h: 'Kas tvarko duomenis', p: ['Supabase (paskyros ir statistika) ir Cloudflare (talpinimas ir internetiniai stalai) tvarko duomenis mūsų vardu pagal savo duomenų tvarkymo sąlygas. Nenaudojame reklaminių ar analitinių sekiklių ir trečiųjų šalių slapukų.'] },
      { h: 'Kiek laiko saugome', p: ['Paskyros duomenis saugome, kol paprašysi juos ištrinti. Vietiniai duomenys lieka naršyklėje, kol juos išvalysi.'] },
      { h: 'Tavo teisės', p: [`Bet kada gali paprašyti leisti susipažinti su savo duomenimis, juos ištaisyti, eksportuoti ar ištrinti — tiesiog parašyk adresu ${CONTACT_EMAIL}. Pagal BDAR taip pat gali pateikti skundą savo šalies duomenų apsaugos priežiūros institucijai.`] },
      { h: 'Vaikai', p: ['Bridge 125 skirtas 16 metų ir vyresniems žaidėjams.'] },
    ],
  },

  terms: {
    title: 'Naudojimo sąlygos',
    intro: 'Žaisdamas Bridge 125 sutinki su šiomis paprastomis taisyklėmis.',
    sections: [
      { h: 'Žaidimas', p: ['Bridge 125 teikiamas nemokamai, „toks, koks yra“, pramogai. Bet kada galime keisti, sustabdyti ar nutraukti funkcijas.'] },
      { h: 'Bridge Money (BM)', p: ['BM — virtualūs taškai, naudojami tik žaidime. Jie neturi piniginės vertės, jų negalima nusipirkti, parduoti, iškeisti ar išsiimti, ir tai nėra azartiniai lošimai.'] },
      { h: 'Sąžiningas žaidimas', p: ['Gerbk kitus prie stalo. Sukčiavimas, žaidimo automatizavimas, klaidų išnaudojimas, įžeidūs slapyvardžiai ar priekabiavimas prie kitų žaidėjų draudžiami ir gali baigtis paskyros pašalinimu.'] },
      { h: 'Tavo paskyra', p: ['Saugok prieigą prie savo el. pašto — per jį prisijungi. Bet kada gali nustoti žaisti ir paprašyti ištrinti paskyrą.'] },
      { h: 'Atsakomybė', p: ['Stengiamės, kad žaidimas veiktų, tačiau negalime garantuoti, kad jis visada bus pasiekiamas ar veiks be klaidų. Kiek leidžia įstatymai, neatsakome už prarastą pažangą ar netiesioginę žalą.'] },
      { h: 'Pakeitimai', p: ['Jei šios sąlygos pasikeis, atnaujinsime datą viršuje. Tęsdamas žaidimą sutinki su atnaujintomis sąlygomis.'] },
    ],
  },
};

export default lt;
