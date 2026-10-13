import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';

// Azerbaijani card vocabulary: pika, xaç, ürək, kərpic; tuz, kral, dama, valet; mast (suit), vzyatka (trick).
const az: ZoleStrings = {
  title: TITLES.az,
  tagline: TAGLINES.az,
  lobby: {
    sub: 'Üç oyunçu, 26 kart, biri ikiyə qarşı oynayır. Qələbə üçün 61 xal lazımdır.',
    level: 'Rəqiblər', levels: { easy: 'Asan', normal: 'Adi', hard: 'Çətin' }, deals: 'Paylamalar', endless: '∞',
    rules: 'Masa qaydaları', maza: 'Kiçik zole', mazaSub: 'Bir vzyatka da almamaq sifarişi', pules: 'Pulalar',
    pulesSub: 'Hamı pas → galdinş əvəzinə pula (turnirlərdəki kimi)', start: 'Masaya otur', howTo: 'Qaydalar', back: 'Geri',
  },
  bid: { take: 'Masanı götür', zole: 'Zole', maza: 'Kiçik zole', pass: 'Pas' },
  bidSub: {
    take: 'Masadan 2 kart götür, 2-ni at · böyük kimi oyna',
    zole: 'Masasız tək oyna · mərc yüksəkdir',
    maza: 'Bir vzyatka da alma',
    pass: 'Qoy başqası oynasın',
  },
  said: { take: 'masanı götürür', zole: 'zole!', maza: 'kiçik zole', pass: 'pas' },
  contract: { lielais: 'Böyük', zole: 'Zole', maza: 'Kiçik zole', galdins: 'Galdinş', pule: 'Pula' },
  role: { lielais: 'Böyük', mazais: 'Kiçik', solo: 'Hərə özü üçün' },
  plays: (w, c) => c === 'lielais' ? `${w} masanı götürür` : c === 'zole' ? `${w} zole oynayır` : c === 'maza' ? `${w} kiçik zole oynayır` : 'Galdinş',
  playsYou: c => c === 'lielais' ? 'Sən böyük oynayırsan' : c === 'zole' ? 'Sən zole oynayırsan' : c === 'maza' ? 'Sən kiçik zole oynayırsan' : 'Galdinş',
  allPassGaldins: 'Hamı pas — galdinş oynayırıq', allPassPule: 'Hamı pas — pula yazılır',
  status: {
    yourBid: 'Sənin sözün', yourDiscard: '2 kart at', yourLead: 'Sənin gedişin — başla', yourTurn: 'Sənin gedişin', dealing: 'Paylanır…', tapToSkip: 'keçmək üçün toxun',
    bidding: w => `${w} düşünür…`, discarding: w => `${w} 2 kart atır…`, thinking: w => `${w} düşünür…`,
  },
  discardBtn: p => `At · +${p}`,
  you: 'Sən', partner: 'tərəfdaş',
  acis: 'xal', tricks: 'vzyatka', trickN: n => `${n} vzyatka`,
  lastTrick: 'Son vzyatka', lastTrickBy: w => `${w} götürdü`, table: 'Masa', buried: 'Atılanlar', galdsTo: w => `masa kartları → ${w}`,
  deal: (n, t) => (t > 0 ? `Paylama ${n} / ${t}` : `Paylama ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Qalib gəldin', jani: 'Qalib gəldin — kiçiklər «yanda»', bezstikis: 'Bütün vzyatkaları aldın!', lose: 'Uduzdun', loseJani: 'Uduzdun — «yanda» qaldın', loseBezstikis: 'Bir vzyatka da yoxdur' };
    const them = { win: 'qalib gəlir', jani: 'qalib gəlir — kiçiklər «yanda»', bezstikis: 'bütün vzyatkaları alır!', lose: 'uduzur', loseJani: 'uduzur — «yanda»', loseBezstikis: 'vzyatkasız qalır' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'kiçiklər «yanda»', bezstikis: 'bütün vzyatkalar', lose: '61-dən az', loseJani: '«yanda»', loseBezstikis: 'vzyatkasız' },
  mazaLine: (w, won) => (w == null ? (won ? 'Kiçik zole oynanıldı!' : 'Kiçik zole alınmadı') : `${w}: kiçik zole ${won ? 'oynanıldı' : 'uduzuldu'}`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Galdinşi sən uduzdun' : `Galdinşi uduzan: ${l.map(x => x ?? 'sən').join(' və ')}`),
  sheet: {
    title: 'Hesab', next: 'Növbəti paylama', finish: 'Oyunu bitir', finishSub: 'Nəticəni indi hesabla', sessionOver: 'Oyun bitdi',
    youWon: 'Sən plyusdasan!', youLost: 'Bu dəfə minusda', winner: w => `Qalib: ${w}`, tie: 'Heç-heçə',
    again: 'Yeni oyun', exit: 'Çıx', total: 'Cəmi', pules: n => `Masadakı pulalar: ${n}`, personal: 'şəxsi pula',
    final: 'Pulalar hesablandı', puleAdded: '+1 ümumi pula', puleOwn: 'öz pulası silindi', puleCommon: 'ümumi pula alındı · hərəsindən +1',
    pulePersonal: 'şəxsi pula alındı · +3', vs: 'qarşı', yourBalance: 'Balansın', rows: 'Paylama',
  },
  menu: {
    title: 'Fasilə', resume: 'Davam et', rules: 'Qaydalar', newGame: 'Yeni oyun', newGameSure: 'Yenidən başlamaq üçün bir də toxun',
    finish: 'Bitir və hesabla', exit: 'Masadan qalx', exitSub: 'Hər gedişdən sonra saxlanılır — elə buradan davam edəcəksən.',
  },
  fast: 'Sürətli rejim', fastOn: 'açıq', fastOff: 'bağlı',
  coach: {
    ok: 'Aydındır',
    bid: n => `Səndə ${n} kozır var. Masanı təxminən 5 kozırla, aralarında dama və ya valet olmaqla götürürlər; zəif əllə — pas.`,
    suggest: b => `Məsləhət: ${b}`,
    discard: '2 kart at — onların xalları sənə yazılır. Mastı boşaltmaq üçün tək qalmış onluğu və ya kralı at.',
    lead: 'Sən başlayırsan. Böyük kimi rəqiblərin kozırlarını böyük kozırlarla çıxart.',
    follow: 'Mastla get. Bütün damalar, valetlər və kərpiclər kozırdır — bir mast.',
    mazie: (p, d) => `Sən və ${p} — kiçiklər, böyük — ${d}. Vzyatkanı ${p} alanda xal at.`,
    galdins: 'Galdinş: hərə özü üçün — ən çox vzyatka alan uduzur.',
    maza: 'Kiçik zole: elan edən bir vzyatka da almamalıdır.',
    declarer: '120 xaldan 61-i lazımdır. Atdığın kartlar artıq sənə yazılıb.',
  },
  rules: {
    title: 'Zole necə oynanılır',
    intro: 'Üç nəfər oynayır. Hər paylamada biri tək oynayır — böyük (lielais) — birlikdə oynayan iki kiçiyə (mazie) qarşı. Böyüyə 120 xaldan ən azı 61-i lazımdır.',
    deckH: 'Dəstə', deck: '26 kart: hər mastın tuzu, onluğu, kralı, daması, valeti və doqquzluğu, üstəlik 8♦ və 7♦. Hər kəsə 8 kart, 2 kart masaya üzüaşağı qoyulur.',
    pointsH: 'Kart xalları',
    trumpsH: 'Kozırlar — 14', trumps: 'Bütün damalar, bütün valetlər və bütün kərpiclər kozırdır: xaç damasından kərpic yeddiliyinədək. Xaç, pika və ürəkdə yalnız tuz, 10, kral və 9 qalır.',
    playH: 'Oyun', play: 'Başlanan mastla getmək lazımdır — kozırlar bir mast sayılır. O mast yoxdursa, istənilən kartı at. Vzyatkanı ən böyük kozır alır, yoxsa başlanan mastın ən böyük kartı. Paylayanın solundakı oyunçu birinci gedir.',
    bidH: 'Hərrac', bids: {
      take: 'Masanı götür — böyük ol: masadakı 2 kartı götür və 2-ni at. Atılan kartların xalı sənə yazılır.',
      zole: 'Zole — masasız tək oyna (onun xalları rəqiblərə gedir). Mərc daha yüksəkdir.',
      maza: 'Kiçik zole — bir vzyatka da almadan qalib gəl (masa qaydası).',
      pass: 'Pas — növbəti qərar verir. «Pas» deməyən ilk oyunçu oynayır.',
    },
    allPassH: 'Hamı pas desə', galdins: 'Galdinş: hərə özü üçün. Ən çox vzyatka alan uduzur (bərabərlikdə — ən çox xal); masa kartları son vzyatkaya gedir.',
    pules: 'Pulalarla: ümumi pula yazılır və kartlar yenidən paylanır. Növbəti qalib gələn böyük onu götürür (hərəsindən +1); açıq pula zamanı uduzan böyük şəxsi pula alır.',
    scoreH: 'Hesab', scoreCols: ['Böyük topladı', 'Böyük', 'Zole'],
    scoreRows: {
      bezstikis: 'Bütün 8 vzyatka', jani: '91 və çox', win: '61–90', lose: '31–60', loseJani: '30 və az', loseBezstikis: 'Vzyatka yoxdur',
    },
    mazaRow: ['Kiçik zole oynanıldı', 'Kiçik zole uduzuldu'], galdinsRow: 'Galdinş: uduzan −4, digərləri +2',
    tipsH: 'Məsləhətlər', tips: [
      'Kozırları say: bir-iki dama ilə 5 və çox — masanı cəsarətlə götür.',
      'Qısa mastların onluğunu və kralını at — xal sənindir, sonra kozırla vurarsan.',
      'Kiçiyə: vzyatkanı tərəfdaş alanda tuz və ya onluq at.',
    ],
  },
};
export default az;
