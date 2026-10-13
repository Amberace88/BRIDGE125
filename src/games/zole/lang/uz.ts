import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';

// Uzbek card vocabulary as players use it: pika, krest, chervi, bubna; tuz, qirol, dama, valet; vzyatka (trick).
const uz: ZoleStrings = {
  title: TITLES.uz,
  tagline: TAGLINES.uz,
  lobby: {
    sub: 'Uch oʻyinchi, 26 karta, biri ikkitaga qarshi oʻynaydi. Gʻalaba uchun 61 ochko kerak.',
    level: 'Raqiblar', levels: { easy: 'Oson', normal: 'Oddiy', hard: 'Qiyin' }, deals: 'Tarqatishlar', endless: '∞',
    rules: 'Stol qoidalari', maza: 'Kichik zole', mazaSub: 'Birorta ham vzyatka olmaslik', pules: 'Pulalar',
    pulesSub: 'Hamma pas → galdinsh oʻrniga pula (turnirlardagidek)', start: 'Stolga oʻtirish', howTo: 'Qoidalar', back: 'Orqaga',
  },
  bid: { take: 'Stolni olish', zole: 'Zole', maza: 'Kichik zole', pass: 'Pas' },
  bidSub: {
    take: 'Stoldan 2 karta ol, 2 tasini tashla · katta boʻlib oʻyna',
    zole: 'Stolsiz yolgʻiz oʻyna · tikish yuqori',
    maza: 'Birorta ham vzyatka olma',
    pass: 'Boshqasi oʻynasin',
  },
  said: { take: 'stolni oladi', zole: 'zole!', maza: 'kichik zole', pass: 'pas' },
  contract: { lielais: 'Katta', zole: 'Zole', maza: 'Kichik zole', galdins: 'Galdinsh', pule: 'Pula' },
  role: { lielais: 'Katta', mazais: 'Kichik', solo: 'Har kim oʻzi uchun' },
  plays: (w, c) => c === 'lielais' ? `${w} stolni oladi` : c === 'zole' ? `${w} zole oʻynaydi` : c === 'maza' ? `${w} kichik zole oʻynaydi` : 'Galdinsh',
  playsYou: c => c === 'lielais' ? 'Siz katta boʻlib oʻynaysiz' : c === 'zole' ? 'Siz zole oʻynaysiz' : c === 'maza' ? 'Siz kichik zole oʻynaysiz' : 'Galdinsh',
  allPassGaldins: 'Hamma pas — galdinsh oʻynaymiz', allPassPule: 'Hamma pas — pula yoziladi',
  status: {
    yourBid: 'Sizning soʻzingiz', yourDiscard: '2 ta karta tashlang', yourLead: 'Sizning yurishingiz — boshlang', yourTurn: 'Sizning yurishingiz', dealing: 'Tarqatilmoqda…', tapToSkip: 'oʻtkazib yuborish uchun bosing',
    bidding: w => `${w} oʻylayapti…`, discarding: w => `${w} 2 ta karta tashlayapti…`, thinking: w => `${w} oʻylayapti…`,
  },
  discardBtn: p => `Tashlash · +${p}`,
  you: 'Siz', partner: 'sherik',
  acis: 'ochko', tricks: 'vzyatka', trickN: n => `${n} ta vzyatka`,
  lastTrick: 'Oxirgi vzyatka', lastTrickBy: w => `${w} oldi`, table: 'Stol', buried: 'Tashlanganlar', galdsTo: w => `stol kartalari → ${w}`,
  deal: (n, t) => (t > 0 ? `Tarqatish ${n} / ${t}` : `Tarqatish ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Siz yutdingiz', jani: 'Yutdingiz — kichiklar «yanda»', bezstikis: 'Barcha vzyatkalarni oldingiz!', lose: 'Siz yutqazdingiz', loseJani: 'Yutqazdingiz — «yanda» qoldingiz', loseBezstikis: 'Birorta vzyatka yoʻq' };
    const them = { win: 'yutadi', jani: 'yutadi — kichiklar «yanda»', bezstikis: 'barcha vzyatkalarni oladi!', lose: 'yutqazadi', loseJani: 'yutqazadi — «yanda»', loseBezstikis: 'vzyatkasiz qoladi' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'kichiklar «yanda»', bezstikis: 'barcha vzyatka', lose: '61 dan kam', loseJani: '«yanda»', loseBezstikis: 'vzyatkasiz' },
  mazaLine: (w, won) => (w == null ? (won ? 'Kichik zole oʻynaldi!' : 'Kichik zole chiqmadi') : `${w}: kichik zole ${won ? 'oʻynaldi' : 'yutqazildi'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Siz galdinshda yutqazdingiz' : `Galdinshda yutqazdi: ${l.map(x => x ?? 'siz').join(' va ')}`),
  sheet: {
    title: 'Yozuv', next: 'Keyingi tarqatish', finish: 'Oʻyinni tugatish', finishSub: 'Natijani hozir hisoblash', sessionOver: 'Oʻyin tugadi',
    youWon: 'Siz plyusdasiz!', youLost: 'Bu safar minusda', winner: w => `${w} gʻolib`, tie: 'Durang',
    again: 'Yangi oʻyin', exit: 'Chiqish', total: 'Jami', pules: n => `Stoldagi pulalar: ${n}`, personal: 'shaxsiy pula',
    final: 'Pulalar hisoblandi', puleAdded: '+1 umumiy pula', puleOwn: 'oʻz pulasi olib tashlandi', puleCommon: 'umumiy pula olindi · har biridan +1',
    pulePersonal: 'shaxsiy pula olindi · +3', vs: 'qarshi', yourBalance: 'Balansingiz', rows: 'Tarqatish',
  },
  menu: {
    title: 'Pauza', resume: 'Davom etish', rules: 'Qoidalar', newGame: 'Yangi oʻyin', newGameSure: 'Qaytadan boshlash uchun yana bosing',
    finish: 'Tugatish va hisoblash', exit: 'Stoldan turish', exitSub: 'Har yurishdan keyin saqlanadi — shu joydan davom etasiz.',
  },
  fast: 'Tez rejim', fastOn: 'yoq.', fastOff: 'oʻch.',
  coach: {
    ok: 'Tushunarli',
    bid: n => `Sizda ${n} ta kozir bor. Stolni taxminan 5 ta kozir, jumladan dama yoki valet bilan oladilar; kuchsiz qoʻl bilan — pas.`,
    suggest: b => `Maslahat: ${b}`,
    discard: '2 ta karta tashlang — ularning ochkolari sizga yoziladi. Mastni boʻshatish uchun yolgʻiz oʻnlik yoki qirolni tashlang.',
    lead: 'Siz boshlaysiz. Katta sifatida raqiblarning kozirlarini katta kozirlar bilan chiqarib oling.',
    follow: 'Mastga yuring. Barcha damalar, valetlar va bubnalar — kozir, bitta mast.',
    mazie: (p, d) => `Siz va ${p} — kichiklar, katta — ${d}. Vzyatkani ${p} olsa, ochko tashlang.`,
    galdins: 'Galdinsh: har kim oʻzi uchun — eng koʻp vzyatka olgan yutqazadi.',
    maza: 'Kichik zole: eʼlon qilgan oʻyinchi birorta ham vzyatka olmasligi kerak.',
    declarer: '120 ochkodan 61 tasi kerak. Tashlangan kartalar allaqachon sizga hisoblangan.',
  },
  rules: {
    title: 'Zole qanday oʻynaladi',
    intro: 'Uch kishi oʻynaydi. Har tarqatishda bittasi yolgʻiz oʻynaydi — katta (lielais) — birga oʻynaydigan ikki kichikka (mazie) qarshi. Kattaga 120 ochkodan kamida 61 tasi kerak.',
    deckH: 'Dasta', deck: '26 ta karta: har bir mastning tuzi, oʻnligi, qiroli, damasi, valeti va toʻqqizligi hamda 8♦ va 7♦. Har kimga 8 tadan, 2 tasi stolga yopiq qoʻyiladi.',
    pointsH: 'Karta ochkolari',
    trumpsH: 'Kozirlar — 14 ta', trumps: 'Barcha damalar, barcha valetlar va barcha bubnalar — kozir: krest damasidan bubna yettiligigacha. Krest, pika va chervida faqat tuz, 10, qirol va 9 qoladi.',
    playH: 'Oʻyin', play: 'Boshlangan mastga yurish shart — kozirlar bitta mast hisoblanadi. U mast boʻlmasa, istalgan kartani tashlang. Vzyatkani eng katta kozir oladi, aks holda boshlangan mastning eng katta kartasi. Tarqatuvchidan chapdagi oʻyinchi birinchi yuradi.',
    bidH: 'Savdo', bids: {
      take: 'Stolni olish — katta boʻlish: stoldagi 2 kartani olib, 2 tasini tashlash. Tashlanganlarning ochkosi sizga yoziladi.',
      zole: 'Zole — stolsiz yolgʻiz oʻynash (uning ochkolari raqiblarga ketadi). Tikish yuqoriroq.',
      maza: 'Kichik zole — birorta ham vzyatka olmay yutish (stol qoidasi).',
      pass: 'Pas — keyingisi hal qiladi. «Pas» demagan birinchi oʻyinchi oʻynaydi.',
    },
    allPassH: 'Hamma pas desa', galdins: 'Galdinsh: har kim oʻzi uchun. Eng koʻp vzyatka olgan yutqazadi (teng boʻlsa — eng koʻp ochko); stol kartalari oxirgi vzyatkaga qoʻshiladi.',
    pules: 'Pulalar bilan: umumiy pula yoziladi va karta qayta tarqatiladi. Keyingi yutgan katta uni oladi (har biridan +1); ochiq pula paytida yutqazgan katta shaxsiy pula oladi.',
    scoreH: 'Hisob', scoreCols: ['Katta toʻpladi', 'Katta', 'Zole'],
    scoreRows: {
      bezstikis: 'Barcha 8 vzyatka', jani: '91 va koʻp', win: '61–90', lose: '31–60', loseJani: '30 va kam', loseBezstikis: 'Vzyatka yoʻq',
    },
    mazaRow: ['Kichik zole oʻynaldi', 'Kichik zole yutqazildi'], galdinsRow: 'Galdinsh: yutqazgan −4, qolganlar +2',
    tipsH: 'Maslahatlar', tips: [
      'Kozirlarni sanang: bir-ikki dama bilan 5 ta va koʻp boʻlsa — stolni bemalol oling.',
      'Qisqa mastlarning oʻnligi va qirolini tashlang — ochkolar sizniki, keyin kozir bilan urasiz.',
      'Kichikka: vzyatkani sherik olsa, tuz yoki oʻnlik tashlang.',
    ],
  },
};
export default uz;
