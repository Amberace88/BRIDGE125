import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

// Card vocabulary as Azerbaijani players use it: pika, xaç, ürək, kərpic; valet, dama, kral, tuz; "mast" for suit.
const az: LocalePack = {
  dict: {
    tagline: 'Bridge kart oyunu', play: 'Oyna', vsBots: 'Botlarla oyna', opponents: 'Rəqiblər', level: 'Bot səviyyəsi',
    easy: 'Asan', normal: 'Normal', online: 'Dostlarla onlayn', soon: 'Tezliklə', howToPlay: 'Necə oynanılır', profile: 'Profil',
    settings: 'Ayarlar', language: 'Dil', sound: 'Səs', on: 'Açıq', off: 'Bağlı', guest: 'Qonaq', signIn: 'Hesab yarat və ya daxil ol',
    signOut: 'Çıxış', emailPlaceholder: 'E-poçtunuz', sendLink: 'Giriş linkini göndər',
    linkSent: e => `${e} ünvanını yoxlayın və daxil olmaq üçün linki açın.`, personalize: 'Fərdiləşdir',
    personalizeLocked: 'Rənginizi və masanızı seçmək üçün pulsuz hesab yaradın.', accent: 'Vurğu rəngi', background: 'Masa',
    yourName: 'Oyunçu adı', save: 'Yadda saxla', saved: 'Yadda saxlanıldı', back: 'Geri', close: 'Bağla',
    yourTurn: 'Sizin gedişiniz', waiting: n => `${n} düşünür`, deckLeft: n => `Dəstədə ${n}`, points: n => `${n} xal`,
    draw: 'Götür', pass: 'Pas', take: n => `${n} götür`, transfer6S: '6♠ ilə ötür', playN: n => `${n} at`, comboQ6: 'Q♠ + 6♠',
    chooseSuit: 'Mast sifariş edin', coverSix: 'Altılığı örtün', suitNames: { S: 'Pika', C: 'Xaç', H: 'Ürək', D: 'Kərpic' },
    ev: {
      queen: w => `Pika daması! ${w} 5 kart götürür`, queenSub: '6♠ yoxdursa', transfer: w => `6♠! ${w} 6 kart götürür`,
      eight: (w, n) => `${w} ${n} kart götürür`, seven: (w, n) => `${w} ${n} kart götürür`, skip: w => `${w} gedişi buraxır`,
      kings: 'Dörd kral!', kingsSub: 'Hamının xalı sıfırlandı', reset125: w => `${w}: düz 125 — xal yandı`,
      suit: (_w, s) => `Sifariş edilən mast: ${s}`, reshuffle: 'Atılan kartlar qarışdırılıb dəstəyə qaytarıldı',
      youTake: n => `${n} kart götürürsünüz`, youSkip: 'Gedişi buraxırsınız', queenYou: 'Pika daması! 5 kart götürürsünüz', transferYou: '6♠! 6 kart götürüb onu örtürsünüz',
    },
    round: n => `Raund ${n}`, roundWon: w => `${w} bütün kartlarından qurtuldu`, roundWonYou: 'Bütün kartlarınızdan qurtuldunuz!',
    jacksFinish: n => `Valetlə bitiriş: ${n} — ×${n + 1}`,
    colPlayer: 'Oyunçu', colHand: 'Əldə', colTotal: 'Cəmi', burned: 'Düz 125 — sıfıra qədər yandı', nextRound: 'Növbəti raund',
    rematch: 'Revanş', home: 'Menyu', youWin: 'Qalib gəldiniz!', winnerIs: w => `Qalib: ${w}`, gameOverSub: 'Kimsə 130-u keçdi — ən az xal toplayan qalib gəlir',
    you: 'Siz', rulesTitle: 'Necə oynanılır',
    rules: [
      { h: 'Məqsəd', p: 'Kartlarınızdan qurtulun və mümkün qədər az xal toplayın. Kimsə 130-a çatanda oyun bitir — ən az xal toplayan qalib gəlir. Düz 125 olsa, xalınız sıfıra qədər yanır.' },
      { h: 'Sizin gedişiniz', p: 'Üstdəki kartla eyni mastdan və ya eyni dəyərdə kart atın. Eyni dəyərli bir neçə kartı birdən atmaq olar. Atmağa kart yoxdur? Birini götürün, sonra onu atın və ya pas deyin.' },
      { h: 'Tuz', p: 'Növbəti oyunçu gedişi buraxır.' },
      { h: '6', p: 'Onu örtmək lazımdır: dərhal üstünə başqa kart qoyun. Altılıqla bitirmək olmaz.' },
      { h: '7', p: 'Növbəti oyunçu 1 kart götürür və gedişini davam etdirir.' },
      { h: '8', p: 'Növbəti oyunçu 2 kart götürür və gedişi buraxır — öz səkkizliyi ilə cavab verib 4, 6 və ya 8 kartı ötürməsə.' },
      { h: '9', p: 'İstənilən kartın üstünə atılır, amma mast sifariş etmək olmaz.' },
      { h: 'Valet', p: 'İstənilən kartın üstünə atılır və mastı siz sifariş edirsiniz. Raundu 1–4 valetlə bitirsəniz, rəqiblərin xalları ×2…×5 dəfə artır.' },
      { h: 'Pika daması', p: 'Növbəti oyunçu 5 kart götürür və gedişi buraxır. 6♠ sizdədir? Onunla cavab verin — ondan sonrakı oyunçu 6 kart götürür və onu örtməlidir.' },
      { h: 'Krallar', p: 'Atılan kartlarda ardıcıl dörd kral hamının xalını sıfırlayır.' },
      { h: 'Xallar', p: 'Tuz 15 · kral, dama, valet, 10 — hərəsi 10 · 6♠ — 5 · qalanları — 0.' },
    ],
    continueGame: 'Oyuna davam et', menuQuit: 'Oyundan çıx', botNames: ['Elvin', 'Aysel', 'Rauf'],
  },

  extra: {
    nav: { howToPlay: 'Qaydalar', signIn: 'Daxil ol', play: 'Oyna' },
    heroLine: 'Klassik Bridge kart oyunu — pika daması, valetlər ×5 və məşhur 125.',
    features: ['Brauzerdə pulsuz oynayın', '17 dildə mövcuddur', 'Tətbiq kimi quraşdırılır'],
    playFriends: 'Dostlarla oyna',
    guide: {
      title: 'Necə oynanılır', intro: 'Kartlardan qurtulun, cərimələrdən yayının və xalınızı aşağı saxlayın. Ən vacibi — beş dəqiqəyə.',
      tabs: { basics: 'Əsaslar', special: 'Xüsusi kartlar', combos: 'Kombinasiyalar', scoring: 'Xallar' },
      steps: [
        { h: 'Üstdəki karta uyğun atın', p: 'Eyni mastdan və ya eyni dəyərdə kart. Eyni dəyərli bir neçə kartı birlikdə atmaq olar.' },
        { h: 'Əlinizi boşaldın', p: 'Bütün kartlarından ilk qurtulan raundu bitirir. Qalanlar əllərində qalan xalları sayır.' },
        { h: 'Xalı aşağı saxlayın', p: 'Xallar raunddan raunda toplanır. Kimsə 130-a çatanda oyun bitir — ən az xal toplayan qalib gəlir.' },
      ],
      tags: { A: 'Buraxma', '6': 'Ört', '7': '+1', '8': '+2, zəncir', '9': 'İstənilən', J: 'Mast sifarişi', QS: '+5', K: 'Sıfırlama' },
      combos: [
        { h: 'Pika damasını ötürün', p: 'Q♠ gəldi? 6♠ ilə cavab verin — növbəti oyunçu 6 kart götürür və onu örtməlidir.' },
        { h: 'Səkkizlik zənciri', p: 'Hər 8 iki kart əlavə edir. Öz səkkizliyinizlə cavab verib 4, 6 və ya 8 kartı ötürün.' },
        { h: 'Valetlərlə bitirin', p: 'Son kartları birdən 1–4 valetlə atın — rəqiblərin xalları ×2…×5 dəfə artır.' },
      ],
      pointsTitle: 'Raundun sonunda əldə qalan kartlara görə xallar',
      line: { start: 'Start', burn: 'Düz 125 → yenə 0', end: '130+ → oyunun sonu' },
      example: 'Nümunə', youCanPlay: 'Ata bilərsiniz', cta: 'Məşq oyunu oyna',
    },
    auth: {
      title: 'Nəticələrinizi yadda saxlayın', sub: 'Pulsuz hesab bir neçə saniyəyə. Şifrəsiz — kodu e-poçtunuza göndəririk.',
      benefits: ['Öz masanız və rəngləriniz', 'Qələbələr və oyunlar bütün cihazlarda', 'Liqalara və turnirlərə hazır'],
      email: 'E-poçt', cont: 'Kodu göndər', hint: 'Davam etməklə ədalətli oynamağa və oyundan zövq almağa söz verirsiniz.',
      codeTitle: 'Kodu daxil edin', codeSub: e => `${e} ünvanına 6 rəqəmli kod göndərdik`, verify: 'Daxil ol', resend: 'Yeni kod göndər',
      resendIn: s => `Yeni kod ${s} san. sonra`, wrong: 'Kod uyğun gəlmədi. Yoxlayın və ya yenisini istəyin.', change: 'Başqa e-poçt',
      welcome: 'Hazırdır!', orLink: 'Kod əvəzinə link gəldi? Onu bu cihazda açın.', stats: { games: 'Oyunlar', wins: 'Qələbələr', bm: 'Bridge Money' },
    },
    room: {
      create: 'Masa yarat', join: 'Qoşul', code: 'Masa kodu', enterCode: 'Kodu daxil edin', invite: 'Dostları dəvət et', copied: 'Link kopyalandı',
      waiting: 'Oyunçuları gözləyirik…', addBot: 'Bot əlavə et', removeBot: 'Botu çıxar', start: 'Oyuna başla', needTwo: 'Ən azı 2 oyunçu lazımdır',
      host: 'Masa sahibi', waitHost: 'Masa sahibinin başlamasını gözləyirik', connecting: 'Qoşulur…', reconnecting: 'Yenidən qoşulur…',
      full: 'Masa doludur', notFound: 'Masa tapılmadı', leave: 'Masanı tərk et', seatsOf: (n, m) => `${n}/${m} yer`,
      shareText: 'Bridge 125-də masama qoşul', online: 'onlayn', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'İndi onlayn oyna', sub: 'Rəqibləri saniyələr içində tapırıq', title: 'Sürətli oyun', finding: 'Oyunçular axtarılır…',
      startsIn: s => `${s} san. sonra başlayır`, startNow: 'İndi başla', botsFill: 'Vaxt bitəndə boş yerləri botlar tutacaq.',
      error: 'Serverlə əlaqə qurulmadı. Yenidən cəhd edin.', starting: 'Kartlar paylanır…',
    },
    lb: {
      title: 'Liderlər cədvəli', sub: 'Qələbələrə görə ən yaxşı oyunçular', wins: 'Qələbələr', games: 'Oyunlar', winRate: 'Qələbə %',
      empty: 'Hələ heç bir oyun yoxdur — birinci olun!', you: 'Siz', signIn: 'Cədvələ düşmək üçün daxil olun', error: 'Liderlər cədvəli hazırda əlçatan deyil.', open: 'Liderlər',
    },
    legal: { privacy: 'Məxfilik', terms: 'Şərtlər', updated: 'Yenilənib', contact: 'Əlaqə', agree: ['Davam etməklə aşağıdakıları qəbul edirsiniz:', 'İstifadə şərtləri', 'və', 'Məxfilik siyasəti'] },
    install: {
      button: 'Quraşdır', title: 'Bridge 125-i quraşdırın', sub: 'Əsas ekrandan əsl tətbiq kimi oynayın — pulsuz, App Store olmadan.',
      benefits: ['Bir toxunuşla tam ekranda açılır', 'Botlarla internetsiz də oynayın', 'Həmişə ən son versiya — heç nəyi yeniləmək lazım deyil'],
      cta: 'İndi quraşdır', done: 'Quraşdırıldı! Bridge 125 əsas ekranınızdadır.', later: 'İndi yox', banner: 'Tətbiqi əldə edin — pulsuz',
      ios: ['“Paylaş” düyməsinə toxunun', '“Əsas ekrana əlavə et” seçin', '“Əlavə et” düyməsinə toxunun — hazırdır!'],
      iosOther: 'iPhone və iPad-də quraşdırmaq üçün bridge125.com saytını Safari-də açın.',
      android: ['Brauzer menyusunu açın ⋮', '“Tətbiqi quraşdır” və ya “Əsas ekrana əlavə et” seçin', 'Təsdiqləyin — hazırdır!'],
      desktop: ['Chrome və ya Edge-də ünvan sətrindəki quraşdırma ikonuna klikləyin', 'Və ya menyu ⋮ → “Bridge 125-i quraşdır”', 'Adi proqram kimi ayrıca pəncərədə açılır'],
      qr: 'Telefona quraşdırmaq üçün telefon kamerası ilə skan edin', free: 'Pulsuz · 1 MB-dan az · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Daxil ol', tabUp: 'Qeydiyyat', titleIn: 'Yenidən xoş gəlmisiniz', subIn: 'Statistikanı, BM-i və masa stilini saxlamaq üçün daxil olun.',
      titleUp: 'Bridge 125-ə qoşulun', subUp: 'Pulsuz hesab 20 saniyəyə. Nəticələriniz istənilən cihazda əlçatandır.',
      email: 'E-poçt', password: 'Şifrə', name: 'Ləqəb', namePh: 'məsələn, Eddy', nameHint: 'Masada və liderlər cədvəlində görünür', show: 'Göstər', hide: 'Gizlət',
      forgot: 'Şifrəni unutmusunuz?', signIn: 'Daxil ol', signUp: 'Hesab yarat', or: 'və ya', useLink: 'Məktubdakı linklə daxil ol', usePassword: 'Şifrə ilə daxil ol',
      noAccount: 'Buraya ilk dəfədir gəlirsiniz?', haveAccount: 'Artıq hesabınız var?', pwHint: 'Ən azı 8 simvol', strength: ['Çox qısa', 'Zəif', 'Yaxşı', 'Güclü'],
      forgotTitle: 'Şifrəni bərpa et', forgotSub: 'E-poçtunuzu daxil edin, yeni şifrə təyin etmək üçün link göndərək.', sendReset: 'Link göndər',
      resetSent: e => `${e} ünvanını yoxlayın — linki açıb yeni şifrə təyin edin.`, back: 'Girişə qayıt',
      newTitle: 'Yeni şifrə', newSub: 'Hesabınız üçün yeni şifrə seçin.', newPw: 'Yeni şifrə', repeatPw: 'Şifrəni təkrarlayın', savePw: 'Şifrəni yadda saxla',
      pwSaved: 'Şifrə yadda saxlanıldı — daxil oldunuz.', mismatch: 'Şifrələr uyğun gəlmir',
      welcomeNew: n => `Masaya xoş gəldiniz, ${n}!`, welcomeBack: 'Sizi yenidən görməyə şadıq!',
      err: {
        badEmail: 'Düzgün e-poçt ünvanı daxil edin', short: 'Şifrə ən azı 8 simvoldan ibarət olmalıdır', wrong: 'E-poçt və ya şifrə yanlışdır',
        exists: 'Bu e-poçtla hesab artıq var — sadəcə daxil olun.', weak: 'Daha güclü şifrə seçin', notConfirmed: 'Əvvəlcə e-poçtunuzu təsdiqləyin',
        tooMany: 'Çox cəhd edildi — bir dəqiqə gözləyin', network: 'Bağlantı yoxdur — internetinizi yoxlayın', generic: 'Nəsə alınmadı. Yenidən cəhd edin.',
      },
    },
    prof: {
      tabs: { me: 'Profil', look: 'Stil', account: 'Hesab' }, since: d => `Qeydiyyat: ${d}`, winRate: 'Qələbə %', avatar: 'Avatar', saved: 'Yadda saxlanıldı',
      preview: 'Canlı baxış', table: 'Masa', accent: 'Vurğu rəngi', backs: 'Kartların arxası', matchBack: 'Masaya uyğun', premium: 'Premium',
      locked: 'Premium — tezliklə mağazada. Baxışda sınayın.', adminFree: 'Admin — bütün premium dizaynlar sizin üçün açıqdır',
      guestLock: 'Stilinizi saxlamaq üçün daxil olun', tryOn: 'Sınaq baxışı', email: 'E-poçt', security: 'Şifrə', changePw: 'Şifrəni dəyiş', pwChanged: 'Şifrə dəyişdirildi',
      danger: 'Təhlükəli zona', deleteAcc: 'Hesabımı sil', deleteHint: 'Hesabınızı və məlumatlarınızı 30 gün ərzində silərik.',
      admin: 'Admin', adminPanel: 'Admin panelini aç', guestTitle: 'Qonaq kimi oynayırsınız', guestSub: 'Statistikanı, BM-i və stili bütün cihazlarda saxlamaq üçün pulsuz hesab yaradın.', prefs: 'Ayarlar',
    },
  },

  privacy: {
    title: 'Məxfilik siyasəti',
    intro: 'Bridge 125 pulsuz kart oyunudur. Mümkün qədər az məlumat toplayırıq və onu heç vaxt satmırıq.',
    sections: [
      { h: 'Nəyi saxlayırıq', p: [
        'Hesabsız: onlayn masada istifadə etdiyiniz ləqəbdən başqa cihazınızdan heç nə ötürülmür. Ayarlarınız, saxlanılmış oyun və təsadüfi oyunçu ID-si brauzerin lokal yaddaşında saxlanılır.',
        'Hesabla: e-poçt ünvanınız (yalnız giriş kodlarını göndərmək üçün), ləqəbiniz, dil, rəng və masa seçimləriniz, həmçinin oyun statistikanız (oyunlar, qələbələr, BM balansı).',
      ] },
      { h: 'Onlayn masalar', p: ['Onlayn oyun zamanı bütün oyunçuların eyni oyunu görməsi üçün masanın vəziyyəti (yerlər, ləqəblər, kartlar, gedişlər) serverimizdə saxlanılır. O, e-poçtunuzla əlaqələndirilmir və masada fəallıq dayandıqdan sonra silinir.'] },
      { h: 'Liderlər cədvəli', p: ['Hesabınız varsa və oyunları başa vurursunuzsa, ləqəbiniz və statistikanız ictimai liderlər cədvəlində görünə bilər. Ləqəbinizi istənilən vaxt profildə dəyişə bilərsiniz.'] },
      { h: 'Məlumatları kim emal edir', p: ['Supabase (hesablar və statistika) və Cloudflare (hostinq və onlayn masalar) məlumatları bizim adımızdan öz məlumat emalı şərtlərinə uyğun olaraq emal edir. Biz reklam və ya analitika izləyicilərindən və üçüncü tərəf cookie fayllarından istifadə etmirik.'] },
      { h: 'Nə qədər saxlayırıq', p: ['Hesab məlumatları siz onların silinməsini istəyənə qədər saxlanılır. Lokal məlumatlar siz onları təmizləyənə qədər brauzerdə qalır.'] },
      { h: 'Hüquqlarınız', p: [`İstənilən vaxt ${CONTACT_EMAIL} ünvanına yazaraq məlumatlarınıza baxmağı, onları düzəltməyi, ixrac etməyi və ya silməyi tələb edə bilərsiniz. GDPR-a əsasən ölkənizin məlumatların qorunması orqanına şikayət də edə bilərsiniz.`] },
      { h: 'Uşaqlar', p: ['Bridge 125 16 yaş və ondan yuxarı oyunçular üçün nəzərdə tutulub.'] },
    ],
  },

  terms: {
    title: 'İstifadə şərtləri',
    intro: 'Bridge 125 oynamaqla bu sadə qaydalarla razılaşırsınız.',
    sections: [
      { h: 'Oyun', p: ['Bridge 125 əyləncə məqsədilə pulsuz və “olduğu kimi” təqdim olunur. Funksiyaları istənilən vaxt dəyişə, dayandıra və ya ləğv edə bilərik.'] },
      { h: 'Bridge Money (BM)', p: ['BM yalnız oyun daxilində istifadə olunan virtual xallardır. Onların pul dəyəri yoxdur, onları almaq, satmaq, dəyişdirmək və ya nağdlaşdırmaq olmaz və bu, qumar oyunu deyil.'] },
      { h: 'Ədalətli oyun', p: ['Masada hörmətli olun. Fırıldaqçılıq, oyunun avtomatlaşdırılması, xətalardan sui-istifadə, təhqiramiz ləqəblər və ya digər oyunçuları təqib etmək qadağandır və hesabınızın silinməsinə səbəb ola bilər.'] },
      { h: 'Hesabınız', p: ['E-poçtunuza girişi qoruyun — sistemə onun vasitəsilə daxil olursunuz. İstənilən vaxt oynamağı dayandırıb hesabınızın silinməsini istəyə bilərsiniz.'] },
      { h: 'Məsuliyyət', p: ['Oyunun işləməsi üçün əlimizdən gələni edirik, lakin onun həmişə əlçatan və ya xətasız olacağına zəmanət verə bilmərik. Qanunun icazə verdiyi həddə itirilmiş irəliləyişə və ya dolayı zərərə görə məsuliyyət daşımırıq.'] },
      { h: 'Dəyişikliklər', p: ['Bu şərtlər dəyişsə, yuxarıdakı tarixi yeniləyəcəyik. Oynamağa davam etməklə yenilənmiş şərtləri qəbul etmiş olursunuz.'] },
    ],
  },
};

export default az;
