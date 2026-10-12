import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

const et: LocalePack = {
  dict: {
    tagline: 'Kaardimäng Bridge', play: 'Mängi', vsBots: 'Mängi bottide vastu', opponents: 'Vastased', level: 'Boti tase',
    easy: 'Lihtne', normal: 'Tavaline', online: 'Võrgus sõpradega', soon: 'Varsti', howToPlay: 'Reeglid', profile: 'Profiil',
    settings: 'Seaded', language: 'Keel', sound: 'Heli', on: 'Sees', off: 'Väljas', guest: 'Külaline', signIn: 'Loo konto või logi sisse',
    signOut: 'Logi välja', emailPlaceholder: 'Sinu e-post', sendLink: 'Saada sisselogimislink',
    linkSent: e => `Vaata postkasti ${e} ja ava sisselogimiseks link.`, personalize: 'Isikupärasta',
    personalizeLocked: 'Loo tasuta konto, et valida oma värv ja laud.', accent: 'Aktsentvärv', background: 'Laud',
    yourName: 'Mängija nimi', save: 'Salvesta', saved: 'Salvestatud', back: 'Tagasi', close: 'Sulge',
    yourTurn: 'Sinu käik', waiting: n => `${n} mõtleb`, deckLeft: n => `Pakis ${n}`, points: n => `${n} p`,
    draw: 'Võta', pass: 'Pass', take: n => `Võta ${n}`, transfer6S: 'Anna 6♠-ga edasi', playN: n => `Käi ${n}`, comboQ6: 'E♠ + 6♠',
    chooseSuit: 'Telli mast', coverSix: 'Kata oma kuus', suitNames: { S: 'Poti', C: 'Risti', H: 'Ärtu', D: 'Ruutu' },
    ev: {
      queen: w => `Poti emand! ${w} võtab 5`, queenSub: 'Kui tal pole 6♠', transfer: w => `6♠! ${w} võtab 6`,
      eight: (w, n) => `${w} võtab ${n}`, seven: (w, n) => `${w} võtab ${n}`, skip: w => `${w} jääb vahele`,
      kings: 'Neli kuningat!', kingsSub: 'Kõigi punktid on taas nullis', reset125: w => `${w}: täpselt 125 — tagasi nulli`,
      suit: (_w, s) => `Tellitud mast: ${s}`, reshuffle: 'Mahakäidud kaardid segati pakki',
      youTake: n => `Võtad ${n}`, youSkip: 'Jääd vahele', queenYou: 'Poti emand! Võtad 5', transferYou: '6♠! Võtad 6 ja katad',
    },
    round: n => `${n}. voor`, roundWon: w => `${w} sai kaartidest lahti`, roundWonYou: 'Said kõigist kaartidest lahti!',
    jacksFinish: n => `Lõpp ${n} poisiga — ×${n + 1}`,
    colPlayer: 'Mängija', colHand: 'Käes', colTotal: 'Kokku', burned: 'Täpselt 125 — põles nulli', nextRound: 'Järgmine voor',
    rematch: 'Revanš', home: 'Avaleht', youWin: 'Sa võitsid!', winnerIs: w => `Võitja: ${w}`, gameOverSub: 'Keegi ületas 130 — võidab väikseim tulemus',
    you: 'Sina', rulesTitle: 'Kuidas mängida',
    rules: [
      { h: 'Eesmärk', p: 'Vabane kaartidest ja kogu võimalikult vähe punkte. Kui keegi jõuab 130-ni, mäng lõpeb ja võidab väikseim tulemus. Kui jõuad täpselt 125-ni, põleb su skoor nulli.' },
      { h: 'Sinu käik', p: 'Käi sama masti või sama väärtusega kaart kui pealmine. Mitu sama väärtusega kaarti võid käia korraga. Pole midagi käia? Võta pakist üks kaart, siis käi see või passi.' },
      { h: 'Äss', p: 'Järgmine mängija jääb vahele.' },
      { h: '6', p: 'Tuleb katta: pane kohe uus kaart peale. Kuuega lõpetada ei saa.' },
      { h: '7', p: 'Järgmine mängija võtab 1 kaardi ja jätkab käiku.' },
      { h: '8', p: 'Järgmine võtab 2 ja jääb vahele — kui ta just ei vasta oma kaheksaga, andes edasi 4, 6 või 8 kaarti.' },
      { h: '9', p: 'Sobib iga kaardi peale, kuid masti tellida ei saa.' },
      { h: 'Poiss', p: 'Sobib kõige peale ja sina tellid masti. Lõpeta voor 1–4 poisiga ja vastaste punktid korrutatakse ×2 kuni ×5.' },
      { h: 'Poti emand', p: 'Järgmine võtab 5 ja jääb vahele. On sul 6♠? Vasta sellega — ülejärgmine võtab 6 ja peab selle katma.' },
      { h: 'Kuningad', p: 'Neli kuningat järjest mahakäidud kaartide peal nullivad kõigi mängijate punktid.' },
      { h: 'Punktid', p: 'Äss 15 · kuningas, emand, poiss, 10 — igaüks 10 · 6♠ — 5 · ülejäänud — 0.' },
    ],
    continueGame: 'Jätka mängu', menuQuit: 'Lahku mängust', botNames: ['Rasmus', 'Liis', 'Markus'],
  },

  extra: {
    nav: { howToPlay: 'Reeglid', signIn: 'Logi sisse', play: 'Mängi' },
    heroLine: 'Klassikaline kaardimäng Bridge — poti emand, poisid ×5 ja kuulus 125.',
    features: ['Mängi tasuta brauseris', 'Saadaval 17 keeles', 'Paigalda nagu äpp'],
    playFriends: 'Mängi sõpradega',
    guide: {
      title: 'Kuidas mängida', intro: 'Vabane kaartidest, väldi karistusi ja hoia punktid madalal. Kõik oluline viie minutiga.',
      tabs: { basics: 'Alused', special: 'Erikaardid', combos: 'Kombod', scoring: 'Punktid' },
      steps: [
        { h: 'Käi pealmise kaardi peale', p: 'Sama masti või sama väärtusega kaart. Mitu sama väärtusega kaarti saab käia korraga.' },
        { h: 'Tühjenda käsi', p: 'Kes esimesena kaartidest lahti saab, lõpetab vooru. Teised loevad kokku käes olevad punktid.' },
        { h: 'Hoia punktid madalal', p: 'Punktid kogunevad voorust vooru. Kui keegi jõuab 130-ni, mäng lõpeb ja võidab väikseim tulemus.' },
      ],
      tags: { A: 'Vahele', '6': 'Kata', '7': '+1', '8': '+2, ahel', '9': 'Joker', J: 'Joker + mast', QS: '+5', K: 'Nulli' },
      combos: [
        { h: 'Poti emand edasi', p: 'Said E♠? Vasta 6♠-ga — järgmine võtab 6 kaarti ja peab selle katma.' },
        { h: 'Kaheksate ahel', p: 'Iga kaheksa lisab kaks kaarti. Vasta oma kaheksaga ja anna edasi 4, 6 või 8.' },
        { h: 'Lõpeta poistega', p: 'Mine välja 1–4 poisiga korraga ja kõigi vastaste punktid korrutatakse ×2 kuni ×5.' },
      ],
      pointsTitle: 'Punktid kaartide eest, mis jäävad vooru lõpus kätte',
      line: { start: 'Start', burn: 'Täpselt 125 → taas 0', end: '130+ → mängu lõpp' },
      example: 'Näide', youCanPlay: 'Võid käia', cta: 'Mängi harjutusmängu',
    },
    auth: {
      title: 'Salvesta oma edusammud', sub: 'Tasuta konto mõne sekundiga. Parooli pole vaja — saadame koodi e-postiga.',
      benefits: ['Oma laud ja värvid', 'Võidud ja mängud salvestatud igas seadmes', 'Valmis liigadeks ja turniirideks'],
      email: 'E-post', cont: 'Saada kood', hint: 'Jätkates lubad mängida ausalt ja mängu nautida.',
      codeTitle: 'Sisesta kood', codeSub: e => `Saatsime 6-kohalise koodi aadressile ${e}`, verify: 'Logi sisse', resend: 'Saada uus kood',
      resendIn: s => `Uus kood ${s} s pärast`, wrong: 'See kood ei sobi. Kontrolli seda või küsi uus.', change: 'Kasuta teist e-posti',
      welcome: 'Oled sees!', orLink: 'Said koodi asemel lingi? Ava see selles seadmes.', stats: { games: 'Mängud', wins: 'Võidud', bm: 'Bridge Money' },
    },
    room: {
      create: 'Loo laud', join: 'Liitu', code: 'Laua kood', enterCode: 'Sisesta kood', invite: 'Kutsu sõpru', copied: 'Link kopeeritud',
      waiting: 'Ootame mängijaid…', addBot: 'Lisa bot', removeBot: 'Eemalda bot', start: 'Alusta mängu', needTwo: 'Vaja on vähemalt 2 mängijat',
      host: 'Võõrustaja', waitHost: 'Ootame, kuni võõrustaja alustab', connecting: 'Ühendan…', reconnecting: 'Taasühendan…',
      full: 'Laud on täis', notFound: 'Lauda ei leitud', leave: 'Lahku lauast', seatsOf: (n, m) => `${n}/${m} kohta`,
      shareText: 'Tule minu Bridge 125 lauda', online: 'võrgus', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'Mängi kohe võrgus', sub: 'Leiame sulle päris vastased', title: 'Kiirmäng', finding: 'Otsime mängijaid…',
      startsIn: s => `Algus ${s} s pärast`, startNow: 'Alusta kohe', botsFill: 'Kui aeg saab täis, täidavad vabad kohad botid.',
      error: 'Serveriga ei saanud ühendust. Proovi uuesti.', starting: 'Jagame kaarte…',
    },
    lb: {
      title: 'Edetabel', sub: 'Parimad mängijad võitude järgi', wins: 'Võidud', games: 'Mängud', winRate: 'Võidu-%',
      empty: 'Arvestusmänge veel pole — ole esimene!', you: 'Sina', signIn: 'Logi sisse, et pääseda edetabelisse', error: 'Edetabel pole praegu saadaval.', open: 'Edetabel',
    },
    legal: { privacy: 'Privaatsus', terms: 'Tingimused', updated: 'Viimati uuendatud', contact: 'Kontakt', agree: ['Jätkates nõustud', 'kasutustingimuste', 'ja', 'privaatsuspoliitikaga'] },
    install: {
      button: 'Paigalda äpp', title: 'Paigalda Bridge 125', sub: 'Mängi avakuvalt nagu päris äpis — tasuta ja ilma äpipoeta.',
      benefits: ['Avaneb ühe puudutusega täisekraanil', 'Mängi bottidega ka ilma internetita', 'Alati uusim versioon, midagi pole vaja uuendada'],
      cta: 'Paigalda kohe', done: 'Paigaldatud! Bridge 125 leiad avakuvalt.', later: 'Mitte praegu', banner: 'Hangi äpp — tasuta',
      ios: ['Puuduta nuppu „Jaga“', 'Vali „Lisa avakuvale“', 'Puuduta „Lisa“ — valmis!'],
      iosOther: 'iPhone’is ja iPadis ava paigaldamiseks bridge125.com Safaris.',
      android: ['Ava brauseri menüü ⋮', 'Puuduta „Installi rakendus“ või „Lisa avaekraanile“', 'Kinnita — valmis!'],
      desktop: ['Klõpsa Chrome’is või Edge’is aadressiribal paigaldusikooni', 'Või ava menüü ⋮ → „Installi Bridge 125“', 'See avaneb oma aknas nagu iga teine rakendus'],
      qr: 'Skanni telefoni kaameraga, et paigaldada telefoni', free: 'Tasuta · alla 1 MB · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Logi sisse', tabUp: 'Loo konto', titleIn: 'Tere tulemast tagasi', subIn: 'Logi sisse, et säilitada statistika, BM ja laua stiil.',
      titleUp: 'Liitu Bridge 125-ga', subUp: 'Tasuta konto 20 sekundiga. Sinu edusammud on kaasas igas seadmes.',
      email: 'E-post', password: 'Parool', name: 'Hüüdnimi', namePh: 'nt Eddy', nameHint: 'Näidatakse laua taga ja edetabelis', show: 'Näita', hide: 'Peida',
      forgot: 'Unustasid parooli?', signIn: 'Logi sisse', signUp: 'Loo konto', or: 'või', useLink: 'Saada mulle hoopis sisselogimislink', usePassword: 'Logi sisse parooliga',
      noAccount: 'Oled siin esimest korda?', haveAccount: 'Konto juba olemas?', pwHint: 'Vähemalt 8 märki', strength: ['Liiga lühike', 'Nõrk', 'Hea', 'Tugev'],
      forgotTitle: 'Lähtesta parool', forgotSub: 'Sisesta oma e-post ja saadame lingi uue parooli määramiseks.', sendReset: 'Saada link',
      resetSent: e => `Vaata postkasti ${e} — ava link ja vali uus parool.`, back: 'Tagasi sisselogimise juurde',
      newTitle: 'Määra uus parool', newSub: 'Vali oma kontole uus parool.', newPw: 'Uus parool', repeatPw: 'Korda parooli', savePw: 'Salvesta parool',
      pwSaved: 'Parool salvestatud — oled sisse logitud.', mismatch: 'Paroolid ei kattu',
      welcomeNew: n => `Tere tulemast lauda, ${n}!`, welcomeBack: 'Tore sind jälle näha!',
      err: {
        badEmail: 'Sisesta kehtiv e-posti aadress', short: 'Parool peab olema vähemalt 8 märki pikk', wrong: 'Vale e-post või parool',
        exists: 'Selle e-postiga konto on juba olemas — logi lihtsalt sisse.', weak: 'Vali tugevam parool', notConfirmed: 'Kinnita esmalt oma e-post',
        tooMany: 'Liiga palju katseid — oota minut', network: 'Ühendus puudub — kontrolli internetti', generic: 'Midagi läks valesti. Proovi uuesti.',
      },
    },
    prof: {
      tabs: { me: 'Profiil', look: 'Stiil', account: 'Konto' }, since: d => `Liitunud: ${d}`, winRate: 'Võidu-%', avatar: 'Avatar', saved: 'Salvestatud',
      preview: 'Eelvaade', table: 'Laud', accent: 'Aktsentvärv', backs: 'Kaardiseljad', matchBack: 'Nagu laud', premium: 'Premium',
      locked: 'Premium — varsti poes. Proovi eelvaates.', adminFree: 'Admin — kõik premium-kujundused on sulle avatud',
      guestLock: 'Logi sisse, et oma stiil salvestada', tryOn: 'Eelvaade', email: 'E-post', security: 'Parool', changePw: 'Muuda parooli', pwChanged: 'Parool muudetud',
      danger: 'Ohutsoon', deleteAcc: 'Kustuta minu konto', deleteHint: 'Kustutame sinu konto ja andmed 30 päeva jooksul.',
      admin: 'Admin', adminPanel: 'Ava halduspaneel', guestTitle: 'Mängid külalisena', guestSub: 'Loo tasuta konto, et statistika, BM ja stiil oleksid alles igas seadmes.', prefs: 'Eelistused',
    },
  },

  privacy: {
    title: 'Privaatsuspoliitika',
    intro: 'Bridge 125 on tasuta kaardimäng. Kogume võimalikult vähe andmeid ega müü neid kunagi.',
    sections: [
      { h: 'Mida me talletame', p: [
        'Ilma kontota: sinu seadmest ei lahku midagi peale hüüdnime, mida kasutad võrgulaua taga. Seaded, salvestatud mäng ja juhuslik mängija ID hoitakse brauseri kohalikus mälus.',
        'Kontoga: e-posti aadress (ainult sisselogimiskoodide saatmiseks), hüüdnimi, keel, värvi- ja lauavalikud ning mängustatistika (mängitud mängud, võidud, BM-saldo).',
      ] },
      { h: 'Võrgulauad', p: ['Võrgus mängides hoitakse laua olekut (kohad, hüüdnimed, kaardid, käigud) meie serveris, et kõik mängijad näeksid sama mängu. See ei ole seotud sinu e-postiga ja kustutatakse, kui laua taga tegevus lakkab.'] },
      { h: 'Edetabel', p: ['Kui sul on konto ja lõpetad mänge, võivad sinu hüüdnimi ja statistika ilmuda avalikku edetabelisse. Hüüdnime saad profiilis igal ajal muuta.'] },
      { h: 'Kes andmeid töötleb', p: ['Supabase (kontod ja statistika) ja Cloudflare (majutus ja võrgulauad) töötlevad andmeid meie nimel oma andmetöötlustingimuste alusel. Me ei kasuta reklaami- ega analüütikajälgijaid ega kolmandate osapoolte küpsiseid.'] },
      { h: 'Kui kaua säilitame', p: ['Konto andmeid säilitame seni, kuni palud need kustutada. Kohalikud andmed jäävad brauserisse, kuni need ise kustutad.'] },
      { h: 'Sinu õigused', p: [`Võid igal ajal paluda oma andmetega tutvumist, nende parandamist, eksporti või kustutamist, kirjutades aadressile ${CONTACT_EMAIL}. Isikuandmete kaitse üldmääruse (GDPR) alusel võid esitada kaebuse ka oma riigi andmekaitseasutusele.`] },
      { h: 'Lapsed', p: ['Bridge 125 on mõeldud mängijatele alates 16. eluaastast.'] },
    ],
  },

  terms: {
    title: 'Kasutustingimused',
    intro: 'Bridge 125 mängides nõustud nende lihtsate reeglitega.',
    sections: [
      { h: 'Mäng', p: ['Bridge 125 on tasuta ja seda pakutakse meelelahutuseks „nagu on“. Võime funktsioone igal ajal muuta, peatada või lõpetada.'] },
      { h: 'Bridge Money (BM)', p: ['BM on virtuaalsed punktid, mida kasutatakse ainult mängus. Neil puudub rahaline väärtus, neid ei saa osta, müüa, vahetada ega välja võtta ning need ei ole hasartmäng.'] },
      { h: 'Aus mäng', p: ['Ole laua taga lugupidav. Sohk, mängu automatiseerimine, vigade ärakasutamine, solvavad hüüdnimed ja teiste mängijate ahistamine on keelatud ning võivad kaasa tuua konto eemaldamise.'] },
      { h: 'Sinu konto', p: ['Hoia oma e-postile ligipääs turvaliselt — sellega logid sisse. Võid igal ajal mängimise lõpetada ja paluda oma konto kustutada.'] },
      { h: 'Vastutus', p: ['Anname endast parima, et mäng töötaks, kuid ei saa tagada, et see on alati kättesaadav või vigadeta. Seadusega lubatud ulatuses ei vastuta me kaotatud edusammude ega kaudse kahju eest.'] },
      { h: 'Muudatused', p: ['Kui need tingimused muutuvad, uuendame ülal olevat kuupäeva. Mängimist jätkates nõustud uuendatud tingimustega.'] },
    ],
  },
};

export default et;
