import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';

/** 1-ci, 2-ci, 3-cü, 4-cü, 5-ci, 6-cı … 9-cu, 10-cu (vowel harmony with the number word). */
const azOrd = (n: number) => {
  const d = n % 10, t = n % 100;
  if (t === 10 || t === 30) return `${n}-cu`;
  if (t === 20 || t === 50 || t === 70 || t === 80) return `${n}-ci`;
  if (t === 40 || t === 60 || t === 90) return `${n}-cı`;
  if (n !== 0 && n % 100 === 0) return `${n}-cü`;
  return `${n}-${[1, 2, 5, 7, 8].includes(d) ? 'ci' : d === 3 || d === 4 ? 'cü' : d === 6 ? 'cı' : 'cu'}`;
};

const az: DurakStrings = {
  title: TITLE.az, tagline: TAGLINE.az,
  play: 'Payla', resume: 'Oyuna davam et', newGame: 'Yeni oyun', players: 'Oyunçular', level: 'Botlar', easy: 'Asan', normal: 'Adi', hard: 'Güclü',
  variant: 'Növ', podkidnoy: 'Atmalı', perevodnoy: 'Ötürməli', podkidnoyHint: 'Hamı masadakı dəyərdə kart ata bilər',
  perevodnoyHint: 'Üstəlik: hücumu eyni dəyərli kartla ötürmək olar',
  deck: 'Dəstə', cards: n => `${n} kart`, rules: 'Qaydalar', back: 'Geri', close: 'Bağla', menu: 'Menyu',
  saveExit: 'Saxla və çıx', savedNote: 'Hər gediş saxlanılır — istədiyin vaxt davam et.', newGameConfirm: 'Yeni oyun başlasın? Bu oyun itəcək.',
  bito: 'Bito', take: 'Götürürəm', pass: 'Pas', transfer: 'Ötür', you: 'Sən', trump: 'Kozır', talon: n => `${n} qaldı`, discard: 'Atılanlar',
  st: {
    attack: 'Sənin hücumun', defend: 'Vur — ya da götür', throwIn: 'At — ya da bito', throwTaking: 'Götürür — daha atırsan?',
    waiting: w => `${w} düşünür`, dealing: 'Paylanır…', tapToSkip: 'Keçmək üçün toxun', youOut: 'Sən çıxdın — sonuna baxırıq',
    selectTarget: 'Hansı kartı vuracağını seç',
  },
  bubble: { take: 'Götürürəm', bito: 'Bito', pass: 'Pas', transfer: 'Ötürürəm!' },
  ev: {
    lowTrump: (w, c) => `Ən kiçik kozır ${c} — ${w} başlayır`, lowTrumpYou: c => `Ən kiçik kozırın ${c} — sən başlayırsan`, firstMove: w => `${w} başlayır`,
    took: w => `${w} kartları götürür`, tookYou: 'Kartları sən götürürsən', beaten: 'Bito!', transfer: w => `Ötürüldü! ${w} müdafiə olunur`,
    transferYou: 'Sənə ötürüldü!', out: w => `${w} — kartsız`, outYou: 'Kartların bitdi!', talonEmpty: 'Dəstə bitdi',
  },
  role: { attacker: 'Hücum edir', defender: 'Müdafiə olunur' },
  end: {
    durak: 'Durak!', notDurak: 'Durak deyil!', durakIs: w => `${w} — durak`, draw: 'Heç-heçə', drawSub: 'Son kartlar birlikdə çıxdı — papaq heç kimə',
    place: n => `${azOrd(n)} yer`, again: 'Bir daha', settings: 'Ayarlar', home: 'Çıx',
    pogony: 'Poqonlarla!', durakTag: 'Durak',
    loseLines: ['Kağız papaq sənə yaraşır.', 'Hər usta bir dəfə durak olub.', 'Bu gün kart gəlmədi. Revanş?'],
    winLines: ['Təmiz əllər, aydın baş.', 'Birinci çıxdın — gözəl.', 'Papağı bu gün başqası taxır.'],
    signIn: 'Mükafat almaq və reytinqdə yüksəlmək üçün daxil ol', skip: 'Keç',
  },
  hints: {
    attack: 'Sənin hücumun: istənilən kartı at. Kiçik, kozır olmayan kartla başlamaq daha ağıllıdır.',
    defend: 'Eyni mastın böyük kartı və ya kozırla vur. Ya da «Götürürəm» düyməsini bas.',
    throwIn: 'Masadakı dəyərdə kartlar at — ya da «Bito».',
    transfer: 'Ötürmə: eyni dəyərli kart qoy — növbəti oyunçu müdafiə olunacaq.',
    taking: 'Rəqib hamısını götürür — daha at və ya «Pas» de.', gotIt: 'Aydındır',
  },
  fast: 'Sürətli rejim', on: 'açıq', off: 'bağlı',
  rulesTitle: 'Durak necə oynanılır',
  rulesList: [
    { h: 'Məqsəd', p: 'Bütün kartlardan qurtulmaq. Əlində kart qalan sonuncu oyunçu duraktır.' },
    { h: 'Paylama və kozır', p: 'Hər kəsə altı kart. Dəstənin ən alt kartı açıq qalır — onun mastı bütün oyun boyu kozırdır. Ən kiçik kozırı olan birinci gedir.' },
    { h: 'Hücum', p: 'Hücumçu növbəti oyunçuya (müdafiəçiyə) kart atır. Sonra müdafiəçidən başqa hamı masada olan dəyərdə kartlar ata bilər.' },
    { h: 'Müdafiə', p: 'Hər kartı eyni mastın böyük kartı və ya istənilən kozırla vur (kozırı yalnız böyük kozır vurur). Bacarmırsan və ya istəmirsən — masadakı bütün kartları götür.' },
    { h: 'Məhdudiyyətlər', p: 'Bir hücumda ən çox altı kart və müdafiəçinin əlindəkindən çox olmamaq şərtilə.' },
    { h: 'Hücumdan sonra', p: 'Bito — kartlar oyundan çıxır, müdafiəçi növbəti hücum edir. Götürdü — növbəsini buraxır. Hamı altıya qədər tamamlayır: əvvəl hücumçu, sonda müdafiəçi.' },
    { h: 'Ötürməli', p: 'Heç bir kart vurulmamış müdafiəçi eyni dəyərli kart qoyub bütün hücumu növbəti oyunçuya ötürə bilər (əgər onun kartı kifayət edirsə).' },
    { h: 'Son', p: 'Dəstə bitəndə kartsız qalanlar oyundan çıxır. Kartı olan sonuncu kağız papağı taxır.' },
  ],
  botNames: ['Elvin', 'Leyla', 'Orxan', 'Nigar', 'Rauf'],
};
export default az;
