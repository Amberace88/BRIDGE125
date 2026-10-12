import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

// Uzbek, Latin script. Uses the proper modifier letters: ʻ (U+02BB) in oʻ/gʻ and ʼ (U+02BC) for the tutuq belgisi.
// Card vocabulary follows how Uzbek players talk: pika, krest, chervi, bubna; valet, dama, qirol, tuz.
const uz: LocalePack = {
  dict: {
    tagline: 'Bridge karta oʻyini', play: 'Oʻynash', vsBots: 'Botlarga qarshi oʻynash', opponents: 'Raqiblar', level: 'Bot darajasi',
    easy: 'Oson', normal: 'Oddiy', online: 'Doʻstlar bilan onlayn', soon: 'Tez orada', howToPlay: 'Qoidalar', profile: 'Profil',
    settings: 'Sozlamalar', language: 'Til', sound: 'Ovoz', on: 'Yoniq', off: 'Oʻchiq', guest: 'Mehmon', signIn: 'Akkaunt ochish yoki kirish',
    signOut: 'Chiqish', emailPlaceholder: 'E-pochtangiz', sendLink: 'Kirish havolasini yuborish',
    linkSent: e => `${e} pochtasini tekshiring va kirish uchun havolani oching.`, personalize: 'Bezash',
    personalizeLocked: 'Rangingiz va stolingizni tanlash uchun bepul akkaunt oching.', accent: 'Urgʻu rangi', background: 'Stol',
    yourName: 'Oʻyinchi ismi', save: 'Saqlash', saved: 'Saqlandi', back: 'Orqaga', close: 'Yopish',
    yourTurn: 'Sizning yurishingiz', waiting: n => `${n} oʻylayapti`, deckLeft: n => `Kolodada ${n} ta`, points: n => `${n} ochko`,
    draw: 'Olish', pass: 'Pas', take: n => `${n} ta olish`, transfer6S: '6♠ bilan oʻtkazish', playN: n => `${n} ta tashlash`, comboQ6: 'Q♠ + 6♠',
    chooseSuit: 'Mast buyuring', coverSix: 'Oltilikni yoping', suitNames: { S: 'Pika', C: 'Krest', H: 'Chervi', D: 'Bubna' },
    ev: {
      queen: w => `Pika damasi! ${w} 5 ta oladi`, queenSub: 'Agar 6♠ boʻlmasa', transfer: w => `6♠! ${w} 6 ta oladi`,
      eight: (w, n) => `${w} ${n} ta oladi`, seven: (w, n) => `${w} ${n} ta oladi`, skip: w => `${w} yurishni oʻtkazib yuboradi`,
      kings: 'Toʻrtta qirol!', kingsSub: 'Hammaning ochkosi nolga tushdi', reset125: w => `${w}: roppa-rosa 125 — ochko kuydi`,
      suit: (_w, s) => `Buyurilgan mast: ${s}`, reshuffle: 'Tashlangan kartalar kolodaga aralashtirildi',
      youTake: n => `Siz ${n} ta olasiz`, youSkip: 'Siz yurishni oʻtkazib yuborasiz', queenYou: 'Pika damasi! Siz 5 ta olasiz', transferYou: '6♠! Siz 6 ta olib, uni yopasiz',
    },
    round: n => `${n}-raund`, roundWon: w => `${w} barcha kartalaridan qutuldi`, roundWonYou: 'Siz barcha kartalardan qutuldingiz!',
    jacksFinish: n => `Valet bilan yakun: ${n} — ×${n + 1}`,
    colPlayer: 'Oʻyinchi', colHand: 'Qoʻlda', colTotal: 'Jami', burned: 'Roppa-rosa 125 — 0 gacha kuydi', nextRound: 'Keyingi raund',
    rematch: 'Revansh', home: 'Menyu', youWin: 'Siz yutdingiz!', winnerIs: w => `Gʻolib: ${w}`, gameOverSub: 'Kimdir 130 dan oshdi — eng kam ochko yutadi',
    you: 'Siz', rulesTitle: 'Qanday oʻynaladi',
    rules: [
      { h: 'Maqsad', p: 'Kartalardan qutuling va imkon qadar kam ochko yigʻing. Kimdir 130 ga yetganda oʻyin tugaydi — eng kam ochko yutadi. Roppa-rosa 125 boʻlsa, ochkongiz 0 gacha kuyadi.' },
      { h: 'Sizning yurishingiz', p: 'Ustki karta bilan masti yoki qiymati bir xil karta tashlang. Bir xil qiymatdagi bir nechta kartani birdaniga tashlash mumkin. Yuradigan karta yoʻqmi? Bittasini oling, keyin uni tashlang yoki pas deng.' },
      { h: 'Tuz', p: 'Keyingi oʻyinchi yurishni oʻtkazib yuboradi.' },
      { h: '6', p: 'Uni yopish shart: darhol ustiga boshqa karta qoʻying. Oltilik bilan tugatib boʻlmaydi.' },
      { h: '7', p: 'Keyingi oʻyinchi 1 ta karta oladi va yurishni davom ettiradi.' },
      { h: '8', p: 'Keyingi oʻyinchi 2 ta oladi va yurishni oʻtkazib yuboradi — agar oʻz sakkizligi bilan javob berib, 4, 6 yoki 8 ta kartani oʻtkazmasa.' },
      { h: '9', p: 'Har qanday karta ustiga tashlanadi, lekin mast buyurib boʻlmaydi.' },
      { h: 'Valet', p: 'Har qanday karta ustiga tashlanadi va mastni siz buyurasiz. Raundni 1–4 ta valet bilan tugatsangiz, raqiblar ochkosi ×2…×5 marta koʻpayadi.' },
      { h: 'Pika damasi', p: 'Keyingi oʻyinchi 5 ta oladi va yurishni oʻtkazib yuboradi. Sizda 6♠ bormi? U bilan javob bering — undan keyingisi 6 ta oladi va uni yopishi kerak.' },
      { h: 'Qirollar', p: 'Tashlangan kartalarda ketma-ket toʻrtta qirol tushsa, hammaning ochkosi nolga tushadi.' },
      { h: 'Ochkolar', p: 'Tuz 15 · qirol, dama, valet, 10 — 10 tadan · 6♠ — 5 · qolganlari — 0.' },
    ],
    continueGame: 'Oʻyinni davom ettirish', menuQuit: 'Oʻyindan chiqish', botNames: ['Jasur', 'Dilnoza', 'Sardor'],
  },

  extra: {
    nav: { howToPlay: 'Qoidalar', signIn: 'Kirish', play: 'Oʻynash' },
    heroLine: 'Klassik Bridge karta oʻyini — pika damasi, valetlar ×5 va mashhur 125.',
    features: ['Brauzerda bepul oʻynang', '17 tilda mavjud', 'Ilova kabi oʻrnatiladi'],
    playFriends: 'Doʻstlar bilan oʻynash',
    guide: {
      title: 'Qanday oʻynaladi', intro: 'Kartalardan qutuling, jarimalardan qoching va ochkoni past tuting. Eng muhimi — besh daqiqada.',
      tabs: { basics: 'Asoslar', special: 'Maxsus kartalar', combos: 'Kombinatsiyalar', scoring: 'Ochkolar' },
      steps: [
        { h: 'Ustki kartaga mos tashlang', p: 'Masti yoki qiymati bir xil karta. Bir xil qiymatdagi bir nechta kartani birga tashlash mumkin.' },
        { h: 'Qoʻlingizni boʻshating', p: 'Birinchi boʻlib barcha kartalaridan qutulgan oʻyinchi raundni tugatadi. Qolganlar qoʻlidagi ochkolarni sanaydi.' },
        { h: 'Ochkoni past tuting', p: 'Ochkolar raunddan raundga qoʻshilib boradi. Kimdir 130 ga yetganda oʻyin tugaydi — eng kam ochko yutadi.' },
      ],
      tags: { A: 'Oʻtkazish', '6': 'Yopish', '7': '+1', '8': '+2, zanjir', '9': 'Istalgan', J: 'Mast buyurish', QS: '+5', K: 'Nollash' },
      combos: [
        { h: 'Pika damasini uzating', p: 'Q♠ keldimi? 6♠ bilan javob bering — keyingi oʻyinchi 6 ta karta oladi va uni yopishi kerak.' },
        { h: 'Sakkizliklar zanjiri', p: 'Har bir 8 ikkita karta qoʻshadi. Oʻz sakkizligingiz bilan javob berib, 4, 6 yoki 8 tasini oʻtkazing.' },
        { h: 'Valetlar bilan yakunlash', p: 'Oxirgi kartalarni 1–4 ta valet bilan birdaniga tashlang — raqiblar ochkosi ×2…×5 marta koʻpayadi.' },
      ],
      pointsTitle: 'Raund oxirida qoʻlda qolgan kartalar uchun ochkolar',
      line: { start: 'Start', burn: 'Roppa-rosa 125 → yana 0', end: '130+ → oʻyin tugaydi' },
      example: 'Misol', youCanPlay: 'Tashlash mumkin', cta: 'Mashq oʻyinini oʻynash',
    },
    auth: {
      title: 'Natijalaringizni saqlang', sub: 'Bepul akkaunt bir necha soniyada. Parolsiz — kodni pochtangizga yuboramiz.',
      benefits: ['Oʻz stolingiz va ranglaringiz', 'Gʻalabalar va oʻyinlar barcha qurilmalarda', 'Ligalar va turnirlarga tayyor'],
      email: 'E-pochta', cont: 'Kod yuborish', hint: 'Davom etib, halol oʻynash va zavqlanishga vaʼda berasiz.',
      codeTitle: 'Kodni kiriting', codeSub: e => `${e} manziliga 6 xonali kod yubordik`, verify: 'Kirish', resend: 'Yangi kod yuborish',
      resendIn: s => `Yangi kod ${s} s dan keyin`, wrong: 'Kod mos kelmadi. Tekshiring yoki yangisini soʻrang.', change: 'Boshqa e-pochta',
      welcome: 'Tayyor!', orLink: 'Kod oʻrniga havola keldimi? Uni shu qurilmada oching.', stats: { games: 'Oʻyinlar', wins: 'Gʻalabalar', bm: 'Bridge Money' },
    },
    room: {
      create: 'Stol yaratish', join: 'Qoʻshilish', code: 'Stol kodi', enterCode: 'Kodni kiriting', invite: 'Doʻstlarni taklif qilish', copied: 'Havola nusxalandi',
      waiting: 'Oʻyinchilarni kutyapmiz…', addBot: 'Bot qoʻshish', removeBot: 'Botni olib tashlash', start: 'Oʻyinni boshlash', needTwo: 'Kamida 2 oʻyinchi kerak',
      host: 'Mezbon', waitHost: 'Mezbon boshlashini kutyapmiz', connecting: 'Ulanmoqda…', reconnecting: 'Qayta ulanmoqda…',
      full: 'Stol toʻla', notFound: 'Stol topilmadi', leave: 'Stolni tark etish', seatsOf: (n, m) => `${n}/${m} oʻrin`,
      shareText: 'Bridge 125 dagi stolimga qoʻshil', online: 'onlayn', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'Hozir onlayn oʻynash', sub: 'Haqiqiy raqiblar bilan oʻyin', title: 'Tezkor oʻyin', finding: 'Oʻyinchilarni qidiryapmiz…',
      startsIn: s => `${s} s dan keyin boshlanadi`, startNow: 'Hozir boshlash', botsFill: 'Vaqt tugaganda boʻsh oʻrinlarni botlar egallaydi.',
      error: 'Server bilan bogʻlanib boʻlmadi. Qayta urinib koʻring.', starting: 'Kartalar tarqatilmoqda…',
    },
    lb: {
      title: 'Peshqadamlar jadvali', sub: 'Gʻalabalar boʻyicha eng yaxshi oʻyinchilar', wins: 'Gʻalabalar', games: 'Oʻyinlar', winRate: 'Gʻalaba %',
      empty: 'Hali birorta oʻyin yoʻq — birinchi boʻling!', you: 'Siz', signIn: 'Jadvalga tushish uchun kiring', error: 'Peshqadamlar jadvali hozir mavjud emas.', open: 'Reyting',
    },
    legal: { privacy: 'Maxfiylik', terms: 'Shartlar', updated: 'Yangilangan', contact: 'Aloqa', agree: ['Davom etib, quyidagilarni qabul qilasiz:', 'Foydalanish shartlari', 'va', 'Maxfiylik siyosati'] },
    install: {
      button: 'Oʻrnatish', title: 'Bridge 125 ni oʻrnating', sub: 'Bosh ekrandan haqiqiy ilovadagidek oʻynang — bepul, App Storesiz.',
      benefits: ['Bir bosishda toʻliq ekranda ochiladi', 'Botlar bilan internetsiz ham oʻynang', 'Doim eng soʻnggi versiya — hech narsani yangilash shart emas'],
      cta: 'Hozir oʻrnatish', done: 'Oʻrnatildi! Bridge 125 bosh ekraningizda.', later: 'Hozir emas', banner: 'Ilovani oling — bepul',
      ios: ['“Ulashish” tugmasini bosing', '“Bosh ekranga qoʻshish” bandini tanlang', '“Qoʻshish” tugmasini bosing — tayyor!'],
      iosOther: 'iPhone va iPadʼda oʻrnatish uchun bridge125.com saytini Safariʼda oching.',
      android: ['Brauzer menyusini oching ⋮', '“Ilovani oʻrnatish” yoki “Bosh ekranga qoʻshish” bandini bosing', 'Tasdiqlang — tayyor!'],
      desktop: ['Chrome yoki Edgeʼda manzil satridagi oʻrnatish belgisini bosing', 'Yoki menyu ⋮ → “Bridge 125 ni oʻrnatish”', 'Odatiy dastur kabi alohida oynada ochiladi'],
      qr: 'Telefonga oʻrnatish uchun telefon kamerasi bilan skanerlang', free: 'Bepul · 1 MB dan kam · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Kirish', tabUp: 'Roʻyxatdan oʻtish', titleIn: 'Yana xush kelibsiz', subIn: 'Statistika, BM va stol uslubini saqlash uchun kiring.',
      titleUp: 'Bridge 125 ga qoʻshiling', subUp: 'Bepul akkaunt 20 soniyada. Natijalaringiz istalgan qurilmada mavjud boʻladi.',
      email: 'E-pochta', password: 'Parol', name: 'Taxallus', namePh: 'masalan, Eddy', nameHint: 'Stolda va peshqadamlar jadvalida koʻrinadi', show: 'Koʻrsatish', hide: 'Yashirish',
      forgot: 'Parolni unutdingizmi?', signIn: 'Kirish', signUp: 'Akkaunt ochish', or: 'yoki', useLink: 'Xatdagi havola orqali kirish', usePassword: 'Parol bilan kirish',
      noAccount: 'Bu yerda birinchi martami?', haveAccount: 'Akkauntingiz bormi?', pwHint: 'Kamida 8 ta belgi', strength: ['Juda qisqa', 'Zaif', 'Yaxshi', 'Kuchli'],
      forgotTitle: 'Parolni tiklash', forgotSub: 'E-pochtangizni kiriting, yangi parol oʻrnatish uchun havola yuboramiz.', sendReset: 'Havola yuborish',
      resetSent: e => `${e} pochtasini tekshiring — havolani ochib, yangi parol oʻrnating.`, back: 'Kirishga qaytish',
      newTitle: 'Yangi parol', newSub: 'Akkauntingiz uchun yangi parol oʻylab toping.', newPw: 'Yangi parol', repeatPw: 'Parolni takrorlang', savePw: 'Parolni saqlash',
      pwSaved: 'Parol saqlandi — siz tizimga kirdingiz.', mismatch: 'Parollar mos emas',
      welcomeNew: n => `Stolga xush kelibsiz, ${n}!`, welcomeBack: 'Sizni yana koʻrganimizdan xursandmiz!',
      err: {
        badEmail: 'Toʻgʻri e-pochta manzilini kiriting', short: 'Parol kamida 8 ta belgidan iborat boʻlishi kerak', wrong: 'E-pochta yoki parol notoʻgʻri',
        exists: 'Bu e-pochta bilan akkaunt allaqachon bor — shunchaki kiring.', weak: 'Kuchliroq parol tanlang', notConfirmed: 'Avval e-pochtangizni tasdiqlang',
        tooMany: 'Urinishlar juda koʻp — bir daqiqa kuting', network: 'Aloqa yoʻq — internetni tekshiring', generic: 'Nimadir xato ketdi. Qayta urinib koʻring.',
      },
    },
    prof: {
      tabs: { me: 'Profil', look: 'Uslub', account: 'Akkaunt' }, since: d => `Roʻyxatdan oʻtgan: ${d}`, winRate: 'Gʻalaba %', avatar: 'Avatar', saved: 'Saqlandi',
      preview: 'Oldindan koʻrish', table: 'Stol', accent: 'Urgʻu rangi', backs: 'Karta orqasi', matchBack: 'Stolga mos', premium: 'Premium',
      locked: 'Premium — tez orada doʻkonda. Oldindan koʻrishda sinab koʻring.', adminFree: 'Admin — barcha premium dizaynlar siz uchun ochiq',
      guestLock: 'Uslubingizni saqlash uchun kiring', tryOn: 'Sinab koʻrish', email: 'E-pochta', security: 'Parol', changePw: 'Parolni oʻzgartirish', pwChanged: 'Parol oʻzgartirildi',
      danger: 'Xavfli hudud', deleteAcc: 'Akkauntimni oʻchirish', deleteHint: 'Akkauntingiz va maʼlumotlaringizni 30 kun ichida oʻchiramiz.',
      admin: 'Admin', adminPanel: 'Admin panelini ochish', guestTitle: 'Mehmon sifatida oʻynayapsiz', guestSub: 'Statistika, BM va uslubni barcha qurilmalarda saqlash uchun bepul akkaunt oching.', prefs: 'Sozlamalar',
    },
  },

  privacy: {
    title: 'Maxfiylik siyosati',
    intro: 'Bridge 125 — bepul karta oʻyini. Biz imkon qadar kam maʼlumot yigʻamiz va uni hech qachon sotmaymiz.',
    sections: [
      { h: 'Nimalarni saqlaymiz', p: [
        'Akkauntsiz: onlayn stoldagi taxallusingizdan tashqari qurilmangizdan hech narsa uzatilmaydi. Sozlamalar, saqlangan oʻyin va tasodifiy oʻyinchi ID raqami brauzerning mahalliy xotirasida saqlanadi.',
        'Akkaunt bilan: e-pochta manzilingiz (faqat kirish kodlarini yuborish uchun), taxallusingiz, til, rang va stol tanlovi hamda oʻyin statistikasi (oʻyinlar, gʻalabalar, BM balansi).',
      ] },
      { h: 'Onlayn stollar', p: ['Onlayn oʻyin davomida barcha oʻyinchilar bir xil oʻyinni koʻrishi uchun stol holati (oʻrinlar, taxalluslar, kartalar, yurishlar) serverimizda saqlanadi. U e-pochtangizga bogʻlanmaydi va stolda faollik toʻxtagach oʻchiriladi.'] },
      { h: 'Peshqadamlar jadvali', p: ['Agar akkauntingiz boʻlsa va oʻyinlarni yakunlasangiz, taxallusingiz va statistikangiz ommaviy peshqadamlar jadvalida koʻrsatilishi mumkin. Taxallusni istalgan vaqtda profilda oʻzgartirishingiz mumkin.'] },
      { h: 'Maʼlumotlarni kim qayta ishlaydi', p: ['Supabase (akkauntlar va statistika) hamda Cloudflare (xosting va onlayn stollar) maʼlumotlarni bizning nomimizdan oʻz maʼlumotlarni qayta ishlash shartlari asosida qayta ishlaydi. Biz reklama yoki analitika trekerlaridan va uchinchi tomon cookie fayllaridan foydalanmaymiz.'] },
      { h: 'Qancha vaqt saqlaymiz', p: ['Akkaunt maʼlumotlari siz ularni oʻchirishni soʻraguningizcha saqlanadi. Mahalliy maʼlumotlar siz ularni tozalaguningizcha brauzerda qoladi.'] },
      { h: 'Huquqlaringiz', p: [`${CONTACT_EMAIL} manziliga yozib, istalgan vaqtda maʼlumotlaringizni koʻrish, tuzatish, eksport qilish yoki oʻchirishni soʻrashingiz mumkin. GDPR boʻyicha mamlakatingizdagi maʼlumotlarni himoya qilish organiga shikoyat ham berishingiz mumkin.`] },
      { h: 'Bolalar', p: ['Bridge 125 16 yosh va undan katta oʻyinchilar uchun moʻljallangan.'] },
    ],
  },

  terms: {
    title: 'Foydalanish shartlari',
    intro: 'Bridge 125 oʻynash orqali siz ushbu oddiy qoidalarga rozilik bildirasiz.',
    sections: [
      { h: 'Oʻyin', p: ['Bridge 125 koʻngilochar maqsadda bepul va “boricha” taqdim etiladi. Biz istalgan vaqtda funksiyalarni oʻzgartirishimiz, vaqtincha toʻxtatishimiz yoki butunlay olib tashlashimiz mumkin.'] },
      { h: 'Bridge Money (BM)', p: ['BM — faqat oʻyin ichida ishlatiladigan virtual ochkolar. Ularning pul qiymati yoʻq, ularni sotib olish, sotish, almashtirish yoki yechib olish mumkin emas va bu qimor oʻyini emas.'] },
      { h: 'Halol oʻyin', p: ['Stolda boshqalarni hurmat qiling. Firibgarlik, oʻyinni avtomatlashtirish, xatolardan foydalanish, haqoratli taxalluslar yoki boshqa oʻyinchilarni taʼqib qilish taqiqlanadi va akkauntingiz oʻchirilishiga olib kelishi mumkin.'] },
      { h: 'Akkauntingiz', p: ['E-pochtangizga kirishni himoya qiling — tizimga u orqali kirasiz. Istalgan vaqtda oʻynashni toʻxtatib, akkauntingizni oʻchirishni soʻrashingiz mumkin.'] },
      { h: 'Javobgarlik', p: ['Oʻyin ishlashi uchun qoʻlimizdan kelganini qilamiz, lekin u doim mavjud yoki xatosiz boʻlishiga kafolat bera olmaymiz. Qonun ruxsat bergan doirada yoʻqotilgan natijalar yoki bilvosita zarar uchun javobgar emasmiz.'] },
      { h: 'Oʻzgarishlar', p: ['Shartlar oʻzgarsa, yuqoridagi sanani yangilaymiz. Oʻynashda davom etsangiz, yangilangan shartlarni qabul qilgan boʻlasiz.'] },
    ],
  },
};

export default uz;
