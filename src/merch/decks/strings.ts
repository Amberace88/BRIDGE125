import type { Strings } from '../../i18n/pick';

/**
 * Deck collection copy, keyed by product id. `DeckCopy` has the same shape as ProductCopy in src/i18n/merch.ts, so
 * the store can merge `DECK_STRINGS[lang].decks` into its products. en / lv / ru / uk are complete; the other
 * 13 languages carry localized names + taglines (and full copy for the decks made for them); the rest is English.
 */
export interface DeckCopy { name: string; tagline: string; desc: string; details: string[] }
export interface DeckStrings {
  collection: { title: string; lede: string; edition36: string; twin: string; forYou: string };
  decks: Record<string, DeckCopy>;
}

const IDS = ['deck', 'deck-baltic', 'deck-slavic', 'deck-caucasus', 'deck-iberian', 'deck-bauhaus', 'deck-neon', 'deck-ivory'] as const;
type Id = (typeof IDS)[number];
type Copy3 = [name: string, tagline: string, desc: string];

function build(c: DeckStrings['collection'], d: Record<Id, Copy3>, details: (edition36: boolean, id: Id) => string[]): DeckStrings {
  const e36: Record<Id, boolean> = { 'deck': true, 'deck-baltic': true, 'deck-slavic': true, 'deck-caucasus': true, 'deck-iberian': false, 'deck-bauhaus': false, 'deck-neon': false, 'deck-ivory': false };
  return { collection: c, decks: Object.fromEntries(IDS.map(id => [id, { name: d[id][0], tagline: d[id][1], desc: d[id][2], details: details(e36[id], id) }])) };
}

// ------------------------------------------------------------------------------------------------ English
const en = build(
  { title: 'The deck collection', lede: 'Eight original 54-card decks drawn for Bridge 125 — from felt and brass to folk ornament and neon.', edition36: '36-card edition available (Bridge 125 · Durak · Zolīte)', twin: 'Digital twin: the box unlocks the same card back in the game.', forYou: 'Made for your region' },
  {
    'deck': ['Signature Playing Cards', 'Felt green & brass — the house deck', 'The deck of the game itself: ivory faces, ruby and ink suits, art-deco courts on felt green with brass sunbursts, a dark Queen of Spades and the felt-and-brass back you know from the table.'],
    'deck-baltic': ['Baltic Folk Playing Cards', 'Woven-belt ornament, oak and amber', 'Kings in oak crowns, queens in flower wreaths, the Auseklis morning star woven into a red-and-linen back, amber accents — ornament shared by Latvia, Lithuania and Estonia, drawn fresh. Every Zolīte card is in the 36-card edition.'],
    'deck-slavic': ['Slavic Tale Playing Cards', 'Red berries and gold leaves on black lacquer', 'Fairy-tale kings in fur crowns, queens in tall headdresses, rowan berries and golden grass painted on black lacquer — a storybook deck for long Durak nights.'],
    'deck-caucasus': ['Silk Road Playing Cards', 'Carpet medallions and pomegranates', 'Madder red, indigo, saffron and turquoise: stepped carpet medallions, eight-pointed stars and pomegranates from the Caucasus to Central Asia, with courts in tall hats and coin caps.'],
    'deck-iberian': ['Iberian Fiesta Playing Cards', 'Azulejo blue, flamenco red, Spanish sun', 'Cobalt azulejo tiles, a red-and-gold sun, polka-dot ruffles, fans and guitars — the brightest deck on the table, in the spirit of Rojo y Gualda.'],
    'deck-bauhaus': ['Bauhaus Playing Cards', 'Circle, triangle, square', 'Primary red, yellow and blue with black on off-white: suits built from circles and triangles, court figures assembled from pure geometry. A design classic.'],
    'deck-neon': ['Neon Noir Playing Cards', 'Magenta & cyan tubes on midnight black', 'Retro-80s neon: glowing magenta hearts and cyan spades, a striped synthwave sun and a perspective grid. Kings in shades, jacks in fedoras — made for photos and late games.'],
    'deck-ivory': ['Ivory Playing Cards', 'Fine line, warm ivory, a single gold', 'Luxury minimal: warm ivory stock, fine-line courts, generous white space and one spot gold, ready for hot-foil. The gift deck.'],
  },
  e36 => [
    '54 cards (52 + 2 jokers), poker size 63 × 88 mm',
    e36 ? '36-card edition, 6 to Ace — for Bridge 125, Durak and Zolīte' : 'Standard indices A K Q J — every game, every language',
    'Tuck box with a QR code: unlock the matching card back in the game',
    'Original artwork drawn for Bridge 125, printed on demand',
  ],
);

// ------------------------------------------------------------------------------------------------ Latvian
const lv = build(
  { title: 'Kāršu kolekcija', lede: 'Astoņas oriģinālas 54 kāršu kavas, zīmētas Bridge 125 — no zaļā galda un misiņa līdz tautas ornamentam un neonam.', edition36: 'Pieejama arī 36 kāršu versija (Bridge 125 · Durak · Zolīte)', twin: 'Digitālais dvīnis: kastīte atbloķē to pašu kāršu muguru spēlē.', forYou: 'Radīts tavam reģionam' },
  {
    'deck': ['Signature spēļu kārtis', 'Galda zaļais un misiņš — mājas kava', 'Pašas spēles kava: ziloņkaula krāsas kārtis, rubīna un tintes masti, art deco figūras uz zaļa auduma ar misiņa stariem, tumšā pīķa dāma un zaļi zeltītā mugura, ko pazīsti no galda.'],
    'deck-baltic': ['Baltu rakstu spēļu kārtis', 'Jostu raksti, ozols un dzintars', 'Karaļi ozola vainagos, dāmas ziedu vainagos, Auseklis sarkanā un linu baltā mugurā, dzintara akcenti — Latvijai, Lietuvai un Igaunijai kopīgs ornaments jaunā zīmējumā. 36 kāršu versijā ir visas Zolītes kārtis.'],
    'deck-slavic': ['Slāvu pasakas spēļu kārtis', 'Sarkanas ogas un zelta lapas uz melnas lakas', 'Pasaku karaļi kažokādas kroņos, dāmas augstās galvassegās, pīlādžu ogas un zelta zāle uz melnas lakas — pasaku kava gariem Duraka vakariem.'],
    'deck-caucasus': ['Zīda ceļa spēļu kārtis', 'Paklāju medaljoni un granātāboli', 'Tumši sarkans, indigo, safrāns un tirkīzs: pakāpjveida paklāju medaljoni, astoņstaru zvaigznes un granātāboli no Kaukāza līdz Vidusāzijai, figūras augstās cepurēs un monētu cepurītēs.'],
    'deck-iberian': ['Ibērijas fiestas spēļu kārtis', 'Azulejo zils, flamenko sarkans, Spānijas saule', 'Kobalta azulejo flīzes, sarkanzelta saule, punktoti volāni, vēdekļi un ģitāras — spilgtākā kava uz galda, Rojo y Gualda garā.'],
    'deck-bauhaus': ['Bauhaus spēļu kārtis', 'Aplis, trijstūris, kvadrāts', 'Sarkans, dzeltens un zils ar melnu uz krēmbalta: masti no apļiem un trijstūriem, figūras no tīras ģeometrijas. Dizaina klasika.'],
    'deck-neon': ['Neon Noir spēļu kārtis', 'Fuksīna un ciāna neons uz pusnakts melna', 'Astoņdesmito gadu neons: mirdzoši fuksīna erceni un ciāna pīķi, svītrota retro saule un perspektīvas režģis. Karaļi saulesbrillēs, kalpi platmalēs — radīts fotogrāfijām un vēlām spēlēm.'],
    'deck-ivory': ['Ivory spēļu kārtis', 'Smalka līnija, silts ziloņkauls, viens zelts', 'Luksusa minimālisms: silta ziloņkaula krāsas kartons, smalku līniju figūras, daudz gaisa un viens zelta tonis — gatavs zelta folijai. Kava dāvanai.'],
  },
  e36 => [
    '54 kārtis (52 + 2 džokeri), pokera izmērs 63 × 88 mm',
    e36 ? '36 kāršu versija no 6 līdz dūzim — Bridge 125, Durakam un Zolītei' : 'Standarta apzīmējumi A K Q J — jebkurai spēlei un valodai',
    'Kastīte ar QR kodu: atbloķē tādu pašu kāršu muguru spēlē',
    'Oriģināls dizains, zīmēts Bridge 125, drukāts pēc pasūtījuma',
  ],
);

// ------------------------------------------------------------------------------------------------ Russian
const ru = build(
  { title: 'Коллекция колод', lede: 'Восемь оригинальных колод по 54 карты, нарисованных для Bridge 125 — от зелёного сукна и латуни до народного орнамента и неона.', edition36: 'Есть версия на 36 карт (Bridge 125 · Дурак · Zolīte)', twin: 'Цифровой двойник: коробка открывает такую же рубашку карт в игре.', forYou: 'Для вашего региона' },
  {
    'deck': ['Игральные карты Signature', 'Зелёное сукно и латунь — фирменная колода', 'Колода самой игры: карты цвета слоновой кости, рубиновые и чёрные масти, фигуры в стиле ар-деко на зелёном сукне с латунными лучами, тёмная пиковая дама и рубашка, знакомая по игровому столу.'],
    'deck-baltic': ['Игральные карты «Балтийский орнамент»', 'Узоры тканых поясов, дуб и янтарь', 'Короли в дубовых венках, дамы в цветочных венках, звезда Аусеклис на красно-льняной рубашке, янтарные акценты — орнамент, общий для Латвии, Литвы и Эстонии, в новом рисунке. В версии на 36 карт есть все карты для Zolīte.'],
    'deck-slavic': ['Игральные карты «Славянская сказка»', 'Красные ягоды и золотые листья на чёрном лаке', 'Сказочные короли в меховых венцах, дамы в кокошниках, рябина и золотая травка на чёрном лаке — колода-сказка для долгих вечеров за «Дураком».'],
    'deck-caucasus': ['Игральные карты «Шёлковый путь»', 'Ковровые медальоны и гранаты', 'Марена, индиго, шафран и бирюза: ступенчатые ковровые медальоны, восьмиконечные звёзды и гранаты — от Кавказа до Центральной Азии, фигуры в высоких шапках и шапочках с монетами.'],
    'deck-iberian': ['Игральные карты «Иберийская фиеста»', 'Синие азулежу, красный фламенко, испанское солнце', 'Кобальтовые изразцы азулежу, красно-золотое солнце, оборки в горошек, веера и гитары — самая яркая колода на столе, в духе Rojo y Gualda.'],
    'deck-bauhaus': ['Игральные карты Bauhaus', 'Круг, треугольник, квадрат', 'Красный, жёлтый и синий с чёрным на молочно-белом: масти из кругов и треугольников, фигуры из чистой геометрии. Дизайнерская классика.'],
    'deck-neon': ['Игральные карты Neon Noir', 'Неон фуксии и циана на полуночном чёрном', 'Неон 80-х: светящиеся розовые червы и голубые пики, полосатое ретро-солнце и сетка в перспективе. Короли в тёмных очках, валеты в федорах — для фото и поздних партий.'],
    'deck-ivory': ['Игральные карты Ivory', 'Тонкая линия, тёплая слоновая кость, одно золото', 'Роскошный минимализм: тёплый картон цвета слоновой кости, фигуры тонкой линией, много воздуха и одно золото — готово к золотому тиснению. Колода в подарок.'],
  },
  e36 => [
    '54 карты (52 + 2 джокера), покерный размер 63 × 88 мм',
    e36 ? 'Версия на 36 карт, от шестёрки до туза — для Bridge 125, «Дурака» и Zolīte' : 'Стандартные индексы A K Q J — для любой игры и языка',
    'Коробка с QR-кодом: такая же рубашка открывается в игре',
    'Оригинальные рисунки для Bridge 125, печать по заказу',
  ],
);

// ------------------------------------------------------------------------------------------------ Ukrainian
const uk = build(
  { title: 'Колекція колод', lede: 'Вісім оригінальних колод по 54 карти, намальованих для Bridge 125 — від зеленого сукна й латуні до народного орнаменту та неону.', edition36: 'Є версія на 36 карт (Bridge 125 · Дурень · Zolīte)', twin: 'Цифровий двійник: коробка відкриває таку саму сорочку карт у грі.', forYou: 'Для вашого регіону' },
  {
    'deck': ['Гральні карти Signature', 'Зелене сукно й латунь — фірмова колода', 'Колода самої гри: карти кольору слонової кістки, рубінові й чорні масті, фігури в стилі ар-деко на зеленому сукні з латунними променями, темна пікова дама і сорочка, знайома з ігрового столу.'],
    'deck-baltic': ['Гральні карти «Балтійський орнамент»', 'Візерунки тканих поясів, дуб і бурштин', 'Королі в дубових вінках, дами у квіткових вінках, зірка Аусекліс на червоно-лляній сорочці, бурштинові акценти — орнамент, спільний для Латвії, Литви та Естонії, у новому малюнку. У версії на 36 карт є всі карти для Zolīte.'],
    'deck-slavic': ['Гральні карти «Слов’янська казка»', 'Червоні ягоди й золоте листя на чорному лаку', 'Казкові королі в хутряних вінцях, дами в розписних головних уборах, горобина й золота травка на чорному лаку — орнамент у дусі народного розпису для довгих вечорів за картами.'],
    'deck-caucasus': ['Гральні карти «Шовковий шлях»', 'Килимові медальйони та гранати', 'Марена, індиго, шафран і бірюза: ступінчасті килимові медальйони, восьмикутні зірки й гранати — від Кавказу до Центральної Азії, фігури у високих шапках і шапочках з монетами.'],
    'deck-iberian': ['Гральні карти «Іберійська фієста»', 'Сині азулежу, червоне фламенко, іспанське сонце', 'Кобальтові кахлі азулежу, червоно-золоте сонце, волани в горошок, віяла й гітари — найяскравіша колода на столі, в дусі Rojo y Gualda.'],
    'deck-bauhaus': ['Гральні карти Bauhaus', 'Коло, трикутник, квадрат', 'Червоний, жовтий і синій з чорним на молочно-білому: масті з кіл і трикутників, фігури з чистої геометрії. Дизайнерська класика.'],
    'deck-neon': ['Гральні карти Neon Noir', 'Неон фуксії та ціану на опівнічному чорному', 'Неон 80-х: сяючі рожеві чирви й блакитні піки, смугасте ретро-сонце і сітка в перспективі. Королі в темних окулярах, валети у федорах — для фото й пізніх партій.'],
    'deck-ivory': ['Гральні карти Ivory', 'Тонка лінія, тепла слонова кістка, одне золото', 'Розкішний мінімалізм: теплий картон кольору слонової кістки, фігури тонкою лінією, багато повітря й одне золото — готово до золотого тиснення. Колода в подарунок.'],
  },
  e36 => [
    '54 карти (52 + 2 джокери), покерний розмір 63 × 88 мм',
    e36 ? 'Версія на 36 карт, від шістки до туза — для Bridge 125, «Дурня» і Zolīte' : 'Стандартні індекси A K Q J — для будь-якої гри й мови',
    'Коробка з QR-кодом: така сама сорочка відкривається в грі',
    'Оригінальні малюнки для Bridge 125, друк на замовлення',
  ],
);

// ------------------------------------------------------------------------------------------------ the other 13 languages
/** Localized names + taglines (+ optional full description) over English. */
function local(title: string, names: Record<Id, [string, string]>, descs: Partial<Record<Id, string>> = {}): DeckStrings {
  return {
    collection: { ...en.collection, title },
    decks: Object.fromEntries(IDS.map(id => [id, { ...en.decks[id], name: names[id][0], tagline: names[id][1], ...(descs[id] ? { desc: descs[id] } : {}) }])),
  };
}

const lt = local('Kortų kolekcija', {
  'deck': ['Signature žaidimo kortos', 'Žalias audinys ir žalvaris'],
  'deck-baltic': ['Baltų ornamento kortos', 'Juostų raštai, ąžuolas ir gintaras'],
  'deck-slavic': ['Slavų pasakos kortos', 'Raudonos uogos ir aukso lapai ant juodo lako'],
  'deck-caucasus': ['Šilko kelio kortos', 'Kilimų medalionai ir granatai'],
  'deck-iberian': ['Iberijos fiestos kortos', 'Azulejo mėlyna, flamenko raudona'],
  'deck-bauhaus': ['Bauhaus kortos', 'Apskritimas, trikampis, kvadratas'],
  'deck-neon': ['Neon Noir kortos', 'Rožinis ir žydras neonas ant juodo'],
  'deck-ivory': ['Ivory kortos', 'Plona linija, dramblio kaulas, auksas'],
}, { 'deck-baltic': 'Karaliai ąžuolo vainikais, damos gėlių vainikais, ryto žvaigždė raudonai baltoje nugarėlėje ir gintaro akcentai – Latvijai, Lietuvai ir Estijai bendras ornamentas, nupieštas iš naujo.' });

const et = local('Kaardipakkide kollektsioon', {
  'deck': ['Signature mängukaardid', 'Roheline kalev ja messing'],
  'deck-baltic': ['Balti rahvamustri kaardid', 'Vöökirjad, tamm ja merevaik'],
  'deck-slavic': ['Slaavi muinasjutu kaardid', 'Punased marjad ja kuldlehed mustal lakil'],
  'deck-caucasus': ['Siiditee kaardid', 'Vaibamedaljonid ja granaatõunad'],
  'deck-iberian': ['Ibeeria fiesta kaardid', 'Asulejo sinine, flamenko punane'],
  'deck-bauhaus': ['Bauhausi kaardid', 'Ring, kolmnurk, ruut'],
  'deck-neon': ['Neon Noir kaardid', 'Roosa ja tsüaan neoon mustal'],
  'deck-ivory': ['Ivory kaardid', 'Peen joon, elevandiluu, kuld'],
}, { 'deck-baltic': 'Kuningad tammepärgades, emandad lillepärgades, koidutäht punavalgel tagaküljel ja merevaigu toonid – Läti, Leedu ja Eesti ühine ornament uues joonistuses.' });

const pl = local('Kolekcja talii', {
  'deck': ['Karty Signature', 'Zielone sukno i mosiądz'],
  'deck-baltic': ['Karty Bałtycki folk', 'Wzory tkanych pasów, dąb i bursztyn'],
  'deck-slavic': ['Karty Słowiańska baśń', 'Czerwone jagody i złote liście na czarnym lakierze'],
  'deck-caucasus': ['Karty Jedwabny Szlak', 'Medaliony z dywanów i granaty'],
  'deck-iberian': ['Karty Iberyjska fiesta', 'Błękit azulejos, czerwień flamenco'],
  'deck-bauhaus': ['Karty Bauhaus', 'Koło, trójkąt, kwadrat'],
  'deck-neon': ['Karty Neon Noir', 'Neon magenta i cyjan na czerni'],
  'deck-ivory': ['Karty Ivory', 'Cienka linia, kość słoniowa, złoto'],
}, { 'deck-bauhaus': 'Czerwień, żółć i błękit z czernią na złamanej bieli: kolory z kół i trójkątów, figury z czystej geometrii. Klasyka designu.' });

const de = local('Die Kartenkollektion', {
  'deck': ['Signature Spielkarten', 'Filzgrün und Messing – das Hausdeck'],
  'deck-baltic': ['Baltic Folk Spielkarten', 'Gewebte Gürtelmuster, Eiche und Bernstein'],
  'deck-slavic': ['Slawisches Märchen Spielkarten', 'Rote Beeren und Goldblätter auf schwarzem Lack'],
  'deck-caucasus': ['Seidenstraße Spielkarten', 'Teppichmedaillons und Granatäpfel'],
  'deck-iberian': ['Iberische Fiesta Spielkarten', 'Azulejo-Blau, Flamenco-Rot, spanische Sonne'],
  'deck-bauhaus': ['Bauhaus Spielkarten', 'Kreis, Dreieck, Quadrat'],
  'deck-neon': ['Neon Noir Spielkarten', 'Magenta und Cyan auf Mitternachtsschwarz'],
  'deck-ivory': ['Ivory Spielkarten', 'Feine Linie, warmes Elfenbein, ein Gold'],
}, { 'deck-bauhaus': 'Rot, Gelb und Blau mit Schwarz auf gebrochenem Weiß: Farben aus Kreisen und Dreiecken, Hofkarten aus reiner Geometrie. Ein Designklassiker.' });

const be = local('Калекцыя калод', {
  'deck': ['Гульнявыя карты Signature', 'Зялёнае сукно і латунь'],
  'deck-baltic': ['Карты «Балтыйскі арнамент»', 'Узоры тканых паясоў, дуб і бурштын'],
  'deck-slavic': ['Карты «Славянская казка»', 'Чырвоныя ягады і залатое лісце на чорным лаку'],
  'deck-caucasus': ['Карты «Шаўковы шлях»', 'Дывановыя медальёны і гранаты'],
  'deck-iberian': ['Карты «Іберыйская фіеста»', 'Сінія азулежу, чырвонае фламенка'],
  'deck-bauhaus': ['Карты Bauhaus', 'Круг, трохвугольнік, квадрат'],
  'deck-neon': ['Карты Neon Noir', 'Неон фуксіі і блакіту на чорным'],
  'deck-ivory': ['Карты Ivory', 'Тонкая лінія, слановая косць, золата'],
});

const kk = local('Карта колодалары жинағы', {
  'deck': ['Signature ойын карталары', 'Жасыл шұға мен жез'],
  'deck-baltic': ['«Балтық өрнегі» карталары', 'Белбеу өрнектері, емен және кәріптас'],
  'deck-slavic': ['«Славян ертегісі» карталары', 'Қара лактағы қызыл жидектер мен алтын жапырақтар'],
  'deck-caucasus': ['«Жібек жолы» карталары', 'Кілем медальондары мен анар'],
  'deck-iberian': ['«Иберия фиестасы» карталары', 'Азулежу көгі, фламенко қызылы'],
  'deck-bauhaus': ['Bauhaus карталары', 'Шеңбер, үшбұрыш, шаршы'],
  'deck-neon': ['Neon Noir карталары', 'Қара түстегі қызғылт және көгілдір неон'],
  'deck-ivory': ['Ivory карталары', 'Нәзік сызық, піл сүйегі, алтын'],
});

const uz = local('Karta toʻplamlari kolleksiyasi', {
  'deck': ['Signature oʻyin kartalari', 'Yashil movut va jez'],
  'deck-baltic': ['«Boltiq naqshi» kartalari', 'Kamar naqshlari, eman va qahrabo'],
  'deck-slavic': ['«Slavyan ertagi» kartalari', 'Qora lakdagi qizil rezavorlar va oltin barglar'],
  'deck-caucasus': ['«Ipak yoʻli» kartalari', 'Gilam medalonlari va anorlar'],
  'deck-iberian': ['«Iberiya fiyestasi» kartalari', 'Azulejo koʻki, flamenko qizili'],
  'deck-bauhaus': ['Bauhaus kartalari', 'Doira, uchburchak, kvadrat'],
  'deck-neon': ['Neon Noir kartalari', 'Qora fonda pushti va havorang neon'],
  'deck-ivory': ['Ivory kartalari', 'Nozik chiziq, fil suyagi, oltin'],
});

const az = local('Kart dəstləri kolleksiyası', {
  'deck': ['Signature oyun kartları', 'Yaşıl mahud və latun'],
  'deck-baltic': ['«Baltik ornamenti» kartları', 'Kəmər naxışları, palıd və kəhrəba'],
  'deck-slavic': ['«Slavyan nağılı» kartları', 'Qara lak üzərində qırmızı giləmeyvələr və qızıl yarpaqlar'],
  'deck-caucasus': ['«İpək Yolu» kartları', 'Xalça medalyonları və nar'],
  'deck-iberian': ['«İberiya fiestası» kartları', 'Azulejo mavisi, flamenko qırmızısı'],
  'deck-bauhaus': ['Bauhaus kartları', 'Dairə, üçbucaq, kvadrat'],
  'deck-neon': ['Neon Noir kartları', 'Qara fonda çəhrayı və mavi neon'],
  'deck-ivory': ['Ivory kartları', 'İncə xətt, fil sümüyü, qızıl'],
});

const ka = local('ბანქოს კოლექცია', {
  'deck': ['Signature სათამაშო ბანქო', 'მწვანე მაუდი და თითბერი'],
  'deck-baltic': ['ბალტიური ორნამენტის ბანქო', 'სარტყლის ორნამენტი, მუხა და ქარვა'],
  'deck-slavic': ['სლავური ზღაპრის ბანქო', 'წითელი კენკრა და ოქროს ფოთლები შავ ლაქზე'],
  'deck-caucasus': ['აბრეშუმის გზის ბანქო', 'ხალიჩის მედალიონები და ბროწეული'],
  'deck-iberian': ['იბერიული ფიესტას ბანქო', 'აზულეჟოს ლურჯი, ფლამენკოს წითელი'],
  'deck-bauhaus': ['Bauhaus ბანქო', 'წრე, სამკუთხედი, კვადრატი'],
  'deck-neon': ['Neon Noir ბანქო', 'ვარდისფერი და ცისფერი ნეონი შავზე'],
  'deck-ivory': ['Ivory ბანქო', 'თხელი ხაზი, სპილოს ძვალი, ოქრო'],
});

const hy = local('Խաղաթղթերի հավաքածու', {
  'deck': ['Signature խաղաթղթեր', 'Կանաչ մահուդ և արույր'],
  'deck-baltic': ['«Բալթյան զարդանախշ» խաղաթղթեր', 'Գոտիների նախշեր, կաղնի և սաթ'],
  'deck-slavic': ['«Սլավոնական հեքիաթ» խաղաթղթեր', 'Կարմիր հատապտուղներ և ոսկե տերևներ սև լաքի վրա'],
  'deck-caucasus': ['«Մետաքսի ճանապարհ» խաղաթղթեր', 'Գորգի մեդալիոններ և նուռ'],
  'deck-iberian': ['«Իբերիական ֆիեստա» խաղաթղթեր', 'Ազուլեժուի կապույտ, ֆլամենկոյի կարմիր'],
  'deck-bauhaus': ['Bauhaus խաղաթղթեր', 'Շրջան, եռանկյուն, քառակուսի'],
  'deck-neon': ['Neon Noir խաղաթղթեր', 'Վարդագույն և երկնագույն նեոն սևի վրա'],
  'deck-ivory': ['Ivory խաղաթղթեր', 'Նուրբ գիծ, փղոսկր, ոսկի'],
});

const ro = local('Colecția de pachete', {
  'deck': ['Cărți de joc Signature', 'Postav verde și alamă'],
  'deck-baltic': ['Cărți Baltic Folk', 'Motive de brâu țesut, stejar și chihlimbar'],
  'deck-slavic': ['Cărți Poveste slavă', 'Fructe roșii și frunze de aur pe lac negru'],
  'deck-caucasus': ['Cărți Drumul Mătăsii', 'Medalioane de covor și rodii'],
  'deck-iberian': ['Cărți Fiesta iberică', 'Albastru azulejo, roșu flamenco'],
  'deck-bauhaus': ['Cărți Bauhaus', 'Cerc, triunghi, pătrat'],
  'deck-neon': ['Cărți Neon Noir', 'Neon magenta și cyan pe negru'],
  'deck-ivory': ['Cărți Ivory', 'Linie fină, fildeș cald, un singur auriu'],
});

const bg = local('Колекция тестета', {
  'deck': ['Карти за игра Signature', 'Зелено сукно и месинг'],
  'deck-baltic': ['Карти „Балтийски фолклор“', 'Шарки на тъкани пояси, дъб и кехлибар'],
  'deck-slavic': ['Карти „Славянска приказка“', 'Червени плодове и златни листа върху черен лак'],
  'deck-caucasus': ['Карти „Пътят на коприната“', 'Килимени медальони и нарове'],
  'deck-iberian': ['Карти „Иберийска фиеста“', 'Синьо азулежу, червено фламенко'],
  'deck-bauhaus': ['Карти Bauhaus', 'Кръг, триъгълник, квадрат'],
  'deck-neon': ['Карти Neon Noir', 'Неон в магента и циан върху черно'],
  'deck-ivory': ['Карти Ivory', 'Фина линия, слонова кост, злато'],
});

const es = local('La colección de barajas', {
  'deck': ['Baraja Signature', 'Tapete verde y latón: la baraja de la casa'],
  'deck-baltic': ['Baraja Baltic Folk', 'Cenefas tejidas, roble y ámbar'],
  'deck-slavic': ['Baraja Cuento eslavo', 'Bayas rojas y hojas de oro sobre laca negra'],
  'deck-caucasus': ['Baraja Ruta de la Seda', 'Medallones de alfombra y granadas'],
  'deck-iberian': ['Baraja Fiesta Ibérica', 'Azul de azulejo, rojo flamenco y sol de España'],
  'deck-bauhaus': ['Baraja Bauhaus', 'Círculo, triángulo, cuadrado'],
  'deck-neon': ['Baraja Neon Noir', 'Neón magenta y cian sobre negro medianoche'],
  'deck-ivory': ['Baraja Ivory', 'Línea fina, marfil cálido, un solo oro'],
}, { 'deck-iberian': 'Azulejos de cobalto, un sol rojo y gualda, volantes de lunares, abanicos y guitarras: la baraja más alegre de la mesa, con el espíritu de Rojo y Gualda.' });

export const DECK_STRINGS: Strings<DeckStrings> = { en, lv, ru, uk, lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es };
export const DECK_PRODUCT_IDS: readonly string[] = IDS;
