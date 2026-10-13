import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';

const uz: DurakStrings = {
  title: TITLE.uz, tagline: TAGLINE.uz,
  play: 'Tarqatish', resume: 'Oʻyinni davom ettirish', newGame: 'Yangi oʻyin', players: 'Oʻyinchilar', level: 'Botlar', easy: 'Oson', normal: 'Oddiy', hard: 'Kuchli',
  variant: 'Turi', podkidnoy: 'Tashlamali', perevodnoy: 'Oʻtkazmali', podkidnoyHint: 'Hamma stoldagi qiymatdagi kartalarni tashlay oladi',
  perevodnoyHint: 'Qoʻshimcha: hujumni shu qiymatdagi karta bilan oʻtkazish mumkin',
  deck: 'Dasta', cards: n => `${n} ta karta`, rules: 'Qoidalar', back: 'Orqaga', close: 'Yopish', menu: 'Menyu',
  saveExit: 'Saqlash va chiqish', savedNote: 'Har bir yurish saqlanadi — istalgan vaqtda davom eting.', newGameConfirm: 'Yangi oʻyin boshlansinmi? Bu oʻyin yoʻqoladi.',
  bito: 'Bito', take: 'Olaman', pass: 'Pas', transfer: 'Oʻtkazish', you: 'Siz', trump: 'Kozir', talon: n => `${n} ta qoldi`, discard: 'Chiqqanlar',
  st: {
    attack: 'Sizning hujumingiz', defend: 'Yoping — yoki oling', throwIn: 'Tashlang — yoki bito', throwTaking: 'Olyapti — yana tashlaysizmi?',
    waiting: w => `${w} oʻylayapti`, dealing: 'Tarqatilmoqda…', tapToSkip: 'Oʻtkazib yuborish uchun bosing', youOut: 'Siz chiqdingiz — oxirini kuzatamiz',
    selectTarget: 'Qaysi kartani yopishni tanlang',
  },
  bubble: { take: 'Olaman', bito: 'Bito', pass: 'Pas', transfer: 'Oʻtkazaman!' },
  ev: {
    lowTrump: (w, c) => `Eng kichik kozir ${c} — ${w} boshlaydi`, lowTrumpYou: c => `Eng kichik koziringiz ${c} — siz boshlaysiz`, firstMove: w => `${w} boshlaydi`,
    took: w => `${w} kartalarni oladi`, tookYou: 'Siz kartalarni olasiz', beaten: 'Bito!', transfer: w => `Oʻtkazildi! ${w} himoyalanadi`,
    transferYou: 'Sizga oʻtkazildi!', out: w => `${w} — kartasiz`, outYou: 'Kartalaringiz tugadi!', talonEmpty: 'Dasta tugadi',
  },
  role: { attacker: 'Hujum qiladi', defender: 'Himoyalanadi' },
  end: {
    durak: 'Durak!', notDurak: 'Durak emas!', durakIs: w => `${w} — durak`, draw: 'Durang', drawSub: 'Oxirgi kartalar birga chiqdi — qalpoq hech kimga yoʻq',
    place: n => `${n}-oʻrin`, again: 'Yana bir bor', settings: 'Sozlamalar', home: 'Chiqish',
    pogony: 'Pogonlar bilan!', durakTag: 'Durak',
    loseLines: ['Qogʻoz qalpoq sizga yarashadi.', 'Har bir usta bir marta durak boʻlgan.', 'Bugun karta yurmadi. Revansh?'],
    winLines: ['Toza qoʻl, tiniq bosh.', 'Birinchi chiqdingiz — chiroyli.', 'Bugun qalpoqni boshqa kimdir kiyadi.'],
    signIn: 'Mukofot olish va reytingga chiqish uchun kiring', skip: 'Oʻtkazib yuborish',
  },
  hints: {
    attack: 'Sizning hujumingiz: istalgan kartani tashlang. Kichik kozir boʻlmagan kartadan boshlash oqilona.',
    defend: 'Shu mastdagi kattaroq karta yoki kozir bilan yoping. Yoki «Olaman»ni bosing.',
    throwIn: 'Stoldagi qiymatdagi kartalarni tashlang — yoki «Bito».',
    transfer: 'Oʻtkazish: shu qiymatdagi kartani qoʻying — keyingi oʻyinchi himoyalanadi.',
    taking: 'Raqib hammasini oladi — yana tashlang yoki «Pas» deng.', gotIt: 'Tushunarli',
  },
  fast: 'Tez rejim', on: 'yoq.', off: 'oʻch.',
  rulesTitle: 'Durak qanday oʻynaladi',
  rulesList: [
    { h: 'Maqsad', p: 'Barcha kartalardan qutulish. Qoʻlida kartasi qolgan oxirgi oʻyinchi — durak.' },
    { h: 'Tarqatish va kozir', p: 'Har kimga oltitadan karta. Dastaning eng pastki kartasi ochiq yotadi — uning masti butun oʻyin uchun kozir. Eng kichik koziri bor oʻyinchi birinchi yuradi.' },
    { h: 'Hujum', p: 'Hujumchi keyingi oʻyinchiga (himoyachiga) karta tashlaydi. Soʻng himoyachidan boshqa hamma stolda yotgan qiymatdagi kartalarni tashlashi mumkin.' },
    { h: 'Himoya', p: 'Har bir kartani shu mastdagi kattaroq karta yoki istalgan kozir bilan yoping (kozirni faqat kattaroq kozir yopadi). Yopolmasangiz yoki xohlamasangiz — stoldagi hamma kartani oling.' },
    { h: 'Cheklovlar', p: 'Bir hujumda oltitadan koʻp karta boʻlmaydi va himoyachining qoʻlidagidan koʻp boʻlmaydi.' },
    { h: 'Hujumdan keyin', p: 'Bito — kartalar chiqib ketadi, himoyachi keyingi hujum qiladi. Olsa — navbatini oʻtkazib yuboradi. Hamma oltitagacha toʻldiradi: avval hujumchi, oxirida himoyachi.' },
    { h: 'Oʻtkazmali', p: 'Hech bir karta yopilmaguncha, himoyachi shu qiymatdagi kartani qoʻyib, butun hujumni keyingi oʻyinchiga oʻtkazishi mumkin (agar uning kartasi yetarli boʻlsa).' },
    { h: 'Yakun', p: 'Dasta tugagach, kartasiz qolganlar oʻyindan chiqadi. Kartasi bor oxirgi oʻyinchi qogʻoz qalpoq kiyadi.' },
  ],
  botNames: ['Jasur', 'Dilnoza', 'Sardor', 'Malika', 'Bekzod'],
};
export default uz;
