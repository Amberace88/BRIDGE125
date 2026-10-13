import type { Strings } from '../i18n/pick';

/** Strings for the wardrobe (Profile → Style), the new shop categories and cosmetic item names. English is mandatory. */
export interface CosStrings {
  cats: { table: string; back: string; accent: string; face: string; frame: string; victory: string; emotes: string; title: string; namecolor: string; banner: string; pack: string };
  kind: { accent: string; table: string; back: string; set: string; face: string; frame: string; victory: string; emotes: string; title: string; namecolor: string; banner: string; pack: string };
  about: { accent: string; table: string; back: string; set: string; face: string; frame: string; victory: string; emotes: string; title: string; namecolor: string; banner: string; pack: string };
  wardrobe: string; collected: (n: number, t: number) => string; equipped: string; owned: string; free: string; locked: string;
  tryOn: string; getIt: string; trying: string; allUnlocked: string; replay: string; a11y: string; includes: string;
  save: (pct: number) => string; worth: string; featuredToday: string; featuredSub: string; sets: string; setsSub: string; all: string;
  partOwned: string; signInToSave: string; equipFree: string; newIn: string; orEur: (eur: string) => string; details: string;
  names: Record<string, string>;
}

const en: CosStrings = {
  cats: { table: 'Tables', back: 'Backs', accent: 'Colours', face: 'Faces', frame: 'Frames', victory: 'Victory', emotes: 'Emotes', title: 'Titles', namecolor: 'Name colour', banner: 'Banners', pack: 'Sets' },
  kind: { accent: 'Accent colour', table: 'Table', back: 'Card back', set: 'Set', face: 'Card faces', frame: 'Avatar frame', victory: 'Victory effect', emotes: 'Emote pack', title: 'Title badge', namecolor: 'Name colour', banner: 'Profile banner', pack: 'Bundle' },
  about: {
    accent: 'Recolours every button, highlight and glow in the game.',
    table: 'The felt under every game you play — with a matching card back.',
    back: 'The design on the back of every card at your table.',
    set: 'Two matching styles in one.',
    face: 'Restyles the front of every card you see — your hand, the pile and replays.',
    frame: 'An animated ring around your avatar — at the table and on your profile.',
    victory: 'Plays across your screen every time you win.',
    emotes: 'New reactions for the emote button at the table.',
    title: 'A badge next to your name that everyone at the table sees.',
    namecolor: 'Your name in colour at every seat and on the leaderboard.',
    banner: 'The backdrop of your profile card.',
    pack: 'A matching collection at a bundle price.',
  },
  wardrobe: 'Wardrobe', collected: (n, t) => `${n} of ${t} collected`, equipped: 'Equipped', owned: 'Owned', free: 'Free', locked: 'Locked',
  tryOn: 'Try on', getIt: 'Get it', trying: 'Trying on', allUnlocked: 'All premium unlocked — equip anything you like', replay: 'Replay', a11y: 'Accessibility',
  includes: 'Includes', save: p => `Save ${p}%`, worth: 'Worth', featuredToday: 'Featured today', featuredSub: 'A new pick every day', sets: 'Sets', setsSub: 'Matching collections — up to 48% cheaper than buying one by one.',
  all: 'All', partOwned: 'You already own part of this set — the price is reduced.', signInToSave: 'Sign in to keep your style', equipFree: 'Free for everyone', newIn: 'New in', orEur: e => `or ${e} soon`, details: 'Details',
  names: {
    marble: 'Midnight Marble', emvelvet: 'Emerald Chesterfield', oldriga: 'Old Riga Night', yacht: 'Monaco Yacht', aurora: 'Northern Lights', damask: 'Black Gold Damask', sakura: 'Sakura', carbonrace: 'Carbon Racing',
    bk_onyx: 'Onyx Foil', bk_holo: 'Holographic', bk_dragon: 'Dragon Scale', bk_marble: 'Marble', bk_damask: 'Wine Damask', bk_aurora: 'Aurora', bk_riga: 'Riga Spires', bk_deco: 'Art Deco Fan',
    bk_sakura: 'Sakura', bk_racing: 'Chequered Flag', bk_teak: 'Teak & Brass', bk_studs: 'Brass Studs', bk_tartan: 'Tartan',
    f_classic: 'Classic', f_large: 'Large Print', f_minimal: 'Minimal Modern', f_deco: 'Art Deco', f_neon: 'Neon Night', f_royal: 'Royal Gold',
    fr_none: 'No frame', fr_brass: 'Brass Ring', fr_neon: 'Neon Pulse', fr_laurel: 'Gold Laurel', fr_flames: 'Inferno', fr_ice: 'Ice Crystal', fr_crown: 'Royal Crown', fr_diamond: 'Diamond',
    vx_classic: 'Gold Sparkle', vx_confetti: 'Gold Confetti', vx_fireworks: 'Fireworks', vx_waterfall: 'Card Waterfall', vx_crowns: 'Crown Rain',
    em_classic: 'Classic', em_cheeky: 'Cheeky', em_animals: 'Animals', em_casino: 'High Roller', em_royal: 'Royal',
    t_none: 'No title', t_lucky: 'Lucky Charm', t_shark: 'Shark', t_bluff: 'Bluff King', t_queenslayer: 'Queen Slayer', t_highroller: 'High Roller', t_master: '125 Master', t_legend: 'Legend',
    nc_default: 'Default', nc_gold: 'Gold', nc_ruby: 'Ruby', nc_ice: 'Ice', nc_emerald: 'Emerald', nc_neon: 'Neon', nc_fire: 'Fire', nc_holo: 'Holographic',
    bn_felt: 'Felt', bn_bokeh: 'Casino Lights', bn_sunburst: 'Gold Sunburst', bn_aurora: 'Aurora Sky', bn_riga: 'Riga Rooftops', bn_suits: 'Royal Suits',
    // earned, never sold: achievements / collections / prestige (migration 012) and the Journey finale (011)
    ach_t_phoenix: 'Phoenix', ach_t_detective: 'Lie Detector', ach_t_immortal: 'Immortal', ach_t_founder: 'Founder', ach_t_curator: 'Curator', t_grand_tour: 'Grand Tourist',
    ach_fr_veteran: "Veteran's Wreath", ach_fr_prestige: 'Prestige Halo', ach_fr_obsidian: 'Obsidian Ring', ach_nc_ember: 'Ember', ach_nc_aurum: 'Aurum', ach_bn_vault: 'The Vault', ach_fr_envoy: "Envoy's Ring",
    pk_starter: 'Starter Kit', pk_sakura: 'Sakura Set', pk_racing: 'Pit Lane Set', pk_neon: 'Neon Night Set', pk_aurora: 'Northern Lights Set', pk_montecarlo: 'Monte Carlo Set', pk_riga: 'Old Riga Set', pk_royal: 'Royal Court Set',
  },
};

const lv: CosStrings = {
  cats: { table: 'Galdi', back: 'Muguras', accent: 'Krāsas', face: 'Kārtis', frame: 'Rāmji', victory: 'Uzvara', emotes: 'Emocijas', title: 'Tituli', namecolor: 'Vārda krāsa', banner: 'Baneri', pack: 'Komplekti' },
  kind: { accent: 'Akcenta krāsa', table: 'Galds', back: 'Kāršu mugura', set: 'Komplekts', face: 'Kāršu priekšpuse', frame: 'Avatāra rāmis', victory: 'Uzvaras efekts', emotes: 'Emociju paka', title: 'Tituls', namecolor: 'Vārda krāsa', banner: 'Profila baneris', pack: 'Komplekts' },
  about: {
    accent: 'Pārkrāso katru pogu, akcentu un mirdzumu spēlē.',
    table: 'Galda virsma katrā tavā spēlē — ar saskaņotu kāršu mugaru.',
    back: 'Zīmējums uz katras kārts muguras pie tava galda.',
    set: 'Divi saskaņoti stili vienā.',
    face: 'Maina katras kārts priekšpusi — rokā, kaudzē un atkārtojumos.',
    frame: 'Animēts gredzens ap tavu avatāru — pie galda un profilā.',
    victory: 'Atskan pār visu ekrānu katru reizi, kad uzvari.',
    emotes: 'Jaunas reakcijas emociju pogai pie galda.',
    title: 'Nozīmīte blakus tavam vārdam, ko redz visi pie galda.',
    namecolor: 'Tavs vārds krāsā pie katras vietas un līderu tabulā.',
    banner: 'Tava profila kartītes fons.',
    pack: 'Saskaņota kolekcija par komplekta cenu.',
  },
  wardrobe: 'Garderobe', collected: (n, t) => `${n} no ${t} savākti`, equipped: 'Lietots', owned: 'Iegūts', free: 'Bez maksas', locked: 'Slēgts',
  tryOn: 'Pielaikot', getIt: 'Iegūt', trying: 'Pielaiko', allUnlocked: 'Viss premium atvērts — lieto, ko vēlies', replay: 'Atkārtot', a11y: 'Pieejamība',
  includes: 'Ietver', save: p => `Ietaupi ${p}%`, worth: 'Vērtība', featuredToday: 'Šodienas izvēle', featuredSub: 'Katru dienu kaut kas jauns', sets: 'Komplekti', setsSub: 'Saskaņotas kolekcijas — līdz 48% lētāk nekā pa vienam.',
  all: 'Visi', partOwned: 'Daļa komplekta tev jau pieder — cena samazināta.', signInToSave: 'Ienāc, lai saglabātu stilu', equipFree: 'Bez maksas visiem', newIn: 'Jaunumi', orEur: e => `vai ${e} drīzumā`, details: 'Sīkāk',
  names: {
    marble: 'Pusnakts marmors', emvelvet: 'Smaragda Česterfīlds', oldriga: 'Vecrīgas nakts', yacht: 'Monako jahta', aurora: 'Ziemeļblāzma', damask: 'Melnzelta damasts', sakura: 'Sakura', carbonrace: 'Oglekļa sacīkstes',
    bk_onyx: 'Oniksa folija', bk_holo: 'Hologramma', bk_dragon: 'Pūķa zvīņas', bk_marble: 'Marmors', bk_damask: 'Vīna damasts', bk_aurora: 'Ziemeļblāzma', bk_riga: 'Rīgas torņi', bk_deco: 'Art Deco vēdeklis',
    bk_sakura: 'Sakura', bk_racing: 'Finiša karogs', bk_teak: 'Tīkkoks un misiņš', bk_studs: 'Misiņa kniedes', bk_tartan: 'Tartāns',
    f_classic: 'Klasiskās', f_large: 'Lielais druks', f_minimal: 'Minimālisms', f_deco: 'Art Deco', f_neon: 'Neona nakts', f_royal: 'Karaliskais zelts',
    fr_none: 'Bez rāmja', fr_brass: 'Misiņa gredzens', fr_neon: 'Neona pulss', fr_laurel: 'Zelta lauri', fr_flames: 'Inferno', fr_ice: 'Ledus kristāls', fr_crown: 'Karaliskais kronis', fr_diamond: 'Dimants',
    vx_classic: 'Zelta dzirksteles', vx_confetti: 'Zelta konfeti', vx_fireworks: 'Salūts', vx_waterfall: 'Kāršu ūdenskritums', vx_crowns: 'Kroņu lietus',
    em_classic: 'Klasiskās', em_cheeky: 'Nerātnās', em_animals: 'Dzīvnieki', em_casino: 'Lielās likmes', em_royal: 'Karaliskās',
    t_none: 'Bez titula', t_lucky: 'Laimes talismans', t_shark: 'Haizivs', t_bluff: 'Blefa karalis', t_queenslayer: 'Dāmu slepkava', t_highroller: 'Lielais spēlētājs', t_master: '125 meistars', t_legend: 'Leģenda',
    nc_default: 'Parastā', nc_gold: 'Zelts', nc_ruby: 'Rubīns', nc_ice: 'Ledus', nc_emerald: 'Smaragds', nc_neon: 'Neons', nc_fire: 'Uguns', nc_holo: 'Hologramma',
    bn_felt: 'Audums', bn_bokeh: 'Kazino gaismas', bn_sunburst: 'Zelta saule', bn_aurora: 'Ziemeļblāzmas debesis', bn_riga: 'Rīgas jumti', bn_suits: 'Karaliskie masti',
    // earned, never sold: achievements / collections / prestige (migration 012) and the Journey finale (011)
    ach_t_phoenix: 'Fēnikss', ach_t_detective: 'Melu detektors', ach_t_immortal: 'Nemirstīgais', ach_t_founder: 'Dibinātājs', ach_t_curator: 'Kurators', t_grand_tour: 'Lielais ceļotājs',
    ach_fr_veteran: 'Veterāna vainags', ach_fr_prestige: 'Prestiža oreols', ach_fr_obsidian: 'Obsidiāna gredzens', ach_nc_ember: 'Ogle', ach_nc_aurum: 'Aurum', ach_bn_vault: 'Seifs', ach_fr_envoy: 'Sūtņa gredzens',
    pk_starter: 'Sākuma komplekts', pk_sakura: 'Sakura komplekts', pk_racing: 'Boksu komplekts', pk_neon: 'Neona nakts komplekts', pk_aurora: 'Ziemeļblāzmas komplekts', pk_montecarlo: 'Montekarlo komplekts', pk_riga: 'Vecrīgas komplekts', pk_royal: 'Karaliskā galma komplekts',
  },
};

const ru: CosStrings = {
  cats: { table: 'Столы', back: 'Рубашки', accent: 'Цвета', face: 'Карты', frame: 'Рамки', victory: 'Победа', emotes: 'Эмоции', title: 'Титулы', namecolor: 'Цвет имени', banner: 'Баннеры', pack: 'Наборы' },
  kind: { accent: 'Цвет акцента', table: 'Стол', back: 'Рубашка', set: 'Комплект', face: 'Лицевая сторона', frame: 'Рамка аватара', victory: 'Эффект победы', emotes: 'Набор эмоций', title: 'Титул', namecolor: 'Цвет имени', banner: 'Баннер профиля', pack: 'Набор' },
  about: {
    accent: 'Перекрашивает все кнопки, акценты и свечение в игре.',
    table: 'Сукно под каждой вашей партией — с подходящей рубашкой.',
    back: 'Узор на рубашке каждой карты за вашим столом.',
    set: 'Два подходящих стиля в одном.',
    face: 'Меняет лицевую сторону всех карт — в руке, в стопке и в повторах.',
    frame: 'Анимированное кольцо вокруг аватара — за столом и в профиле.',
    victory: 'Проигрывается на весь экран при каждой победе.',
    emotes: 'Новые реакции для кнопки эмоций за столом.',
    title: 'Значок рядом с именем, который видят все за столом.',
    namecolor: 'Ваше имя в цвете за каждым столом и в рейтинге.',
    banner: 'Фон вашей карточки профиля.',
    pack: 'Подобранная коллекция по цене набора.',
  },
  wardrobe: 'Гардероб', collected: (n, t) => `Собрано ${n} из ${t}`, equipped: 'Надето', owned: 'Есть', free: 'Бесплатно', locked: 'Закрыто',
  tryOn: 'Примерить', getIt: 'Получить', trying: 'Примерка', allUnlocked: 'Весь премиум открыт — выбирайте что угодно', replay: 'Повтор', a11y: 'Доступность',
  includes: 'Внутри', save: p => `Скидка ${p}%`, worth: 'Стоимость', featuredToday: 'Выбор дня', featuredSub: 'Каждый день что-то новое', sets: 'Наборы', setsSub: 'Подобранные коллекции — до 48% дешевле, чем по отдельности.',
  all: 'Все', partOwned: 'Часть набора у вас уже есть — цена снижена.', signInToSave: 'Войдите, чтобы сохранить стиль', equipFree: 'Бесплатно для всех', newIn: 'Новинки', orEur: e => `или ${e} скоро`, details: 'Подробнее',
  names: {
    marble: 'Полночный мрамор', emvelvet: 'Изумрудный честерфилд', oldriga: 'Ночь Старой Риги', yacht: 'Яхта в Монако', aurora: 'Северное сияние', damask: 'Чёрно-золотой дамаск', sakura: 'Сакура', carbonrace: 'Карбон',
    bk_onyx: 'Оникс', bk_holo: 'Голограмма', bk_dragon: 'Драконья чешуя', bk_marble: 'Мрамор', bk_damask: 'Винный дамаск', bk_aurora: 'Сияние', bk_riga: 'Шпили Риги', bk_deco: 'Ар-деко',
    bk_sakura: 'Сакура', bk_racing: 'Клетчатый флаг', bk_teak: 'Тик и латунь', bk_studs: 'Латунные гвозди', bk_tartan: 'Тартан',
    f_classic: 'Классика', f_large: 'Крупный шрифт', f_minimal: 'Минимализм', f_deco: 'Ар-деко', f_neon: 'Неоновая ночь', f_royal: 'Королевское золото',
    fr_none: 'Без рамки', fr_brass: 'Латунное кольцо', fr_neon: 'Неоновый пульс', fr_laurel: 'Золотой лавр', fr_flames: 'Инферно', fr_ice: 'Ледяной кристалл', fr_crown: 'Королевская корона', fr_diamond: 'Бриллиант',
    vx_classic: 'Золотые искры', vx_confetti: 'Золотое конфетти', vx_fireworks: 'Салют', vx_waterfall: 'Карточный водопад', vx_crowns: 'Дождь из корон',
    em_classic: 'Классика', em_cheeky: 'Дерзкие', em_animals: 'Звери', em_casino: 'Хайроллер', em_royal: 'Королевские',
    t_none: 'Без титула', t_lucky: 'Талисман', t_shark: 'Акула', t_bluff: 'Король блефа', t_queenslayer: 'Гроза дам', t_highroller: 'Хайроллер', t_master: 'Мастер 125', t_legend: 'Легенда',
    nc_default: 'Обычный', nc_gold: 'Золото', nc_ruby: 'Рубин', nc_ice: 'Лёд', nc_emerald: 'Изумруд', nc_neon: 'Неон', nc_fire: 'Огонь', nc_holo: 'Голограмма',
    bn_felt: 'Сукно', bn_bokeh: 'Огни казино', bn_sunburst: 'Золотое солнце', bn_aurora: 'Небо сияния', bn_riga: 'Крыши Риги', bn_suits: 'Королевские масти',
    // earned, never sold: achievements / collections / prestige (migration 012) and the Journey finale (011)
    ach_t_phoenix: 'Феникс', ach_t_detective: 'Детектор лжи', ach_t_immortal: 'Бессмертный', ach_t_founder: 'Основатель', ach_t_curator: 'Куратор', t_grand_tour: 'Великий путешественник',
    ach_fr_veteran: 'Венок ветерана', ach_fr_prestige: 'Ореол престижа', ach_fr_obsidian: 'Обсидиановое кольцо', ach_nc_ember: 'Угли', ach_nc_aurum: 'Аурум', ach_bn_vault: 'Хранилище', ach_fr_envoy: 'Кольцо посла',
    pk_starter: 'Стартовый набор', pk_sakura: 'Набор «Сакура»', pk_racing: 'Набор «Пит-лейн»', pk_neon: 'Набор «Неоновая ночь»', pk_aurora: 'Набор «Северное сияние»', pk_montecarlo: 'Набор «Монте-Карло»', pk_riga: 'Набор «Старая Рига»', pk_royal: 'Набор «Королевский двор»',
  },
};

const uk: CosStrings = {
  cats: { table: 'Столи', back: 'Сорочки', accent: 'Кольори', face: 'Карти', frame: 'Рамки', victory: 'Перемога', emotes: 'Емоції', title: 'Титули', namecolor: 'Колір імені', banner: 'Банери', pack: 'Набори' },
  kind: { accent: 'Колір акценту', table: 'Стіл', back: 'Сорочка', set: 'Комплект', face: 'Лицьовий бік', frame: 'Рамка аватара', victory: 'Ефект перемоги', emotes: 'Набір емоцій', title: 'Титул', namecolor: 'Колір імені', banner: 'Банер профілю', pack: 'Набір' },
  about: {
    accent: 'Перефарбовує всі кнопки, акценти й сяйво в грі.',
    table: 'Сукно під кожною вашою партією — з відповідною сорочкою.',
    back: 'Візерунок на сорочці кожної карти за вашим столом.',
    set: 'Два відповідні стилі в одному.',
    face: 'Змінює лицьовий бік усіх карт — у руці, у стосі та в повторах.',
    frame: 'Анімоване кільце навколо аватара — за столом і в профілі.',
    victory: 'Програється на весь екран після кожної перемоги.',
    emotes: 'Нові реакції для кнопки емоцій за столом.',
    title: 'Значок біля імені, який бачать усі за столом.',
    namecolor: 'Ваше ім’я в кольорі за кожним столом і в рейтингу.',
    banner: 'Тло вашої картки профілю.',
    pack: 'Підібрана колекція за ціною набору.',
  },
  wardrobe: 'Гардероб', collected: (n, t) => `Зібрано ${n} з ${t}`, equipped: 'Вдягнено', owned: 'Є', free: 'Безкоштовно', locked: 'Закрито',
  tryOn: 'Приміряти', getIt: 'Отримати', trying: 'Примірка', allUnlocked: 'Увесь преміум відкрито — обирайте що завгодно', replay: 'Повтор', a11y: 'Доступність',
  includes: 'Усередині', save: p => `Знижка ${p}%`, worth: 'Вартість', featuredToday: 'Вибір дня', featuredSub: 'Щодня щось нове', sets: 'Набори', setsSub: 'Підібрані колекції — до 48% дешевше, ніж окремо.',
  all: 'Усі', partOwned: 'Частина набору у вас уже є — ціну знижено.', signInToSave: 'Увійдіть, щоб зберегти стиль', equipFree: 'Безкоштовно для всіх', newIn: 'Новинки', orEur: e => `або ${e} незабаром`, details: 'Детальніше',
  names: {
    marble: 'Опівнічний мармур', emvelvet: 'Смарагдовий честерфілд', oldriga: 'Ніч Старої Риги', yacht: 'Яхта в Монако', aurora: 'Північне сяйво', damask: 'Чорно-золотий дамаск', sakura: 'Сакура', carbonrace: 'Карбон',
    bk_onyx: 'Онікс', bk_holo: 'Голограма', bk_dragon: 'Луска дракона', bk_marble: 'Мармур', bk_damask: 'Винний дамаск', bk_aurora: 'Сяйво', bk_riga: 'Шпилі Риги', bk_deco: 'Ар-деко',
    bk_sakura: 'Сакура', bk_racing: 'Картатий прапор', bk_teak: 'Тик і латунь', bk_studs: 'Латунні цвяхи', bk_tartan: 'Тартан',
    f_classic: 'Класика', f_large: 'Великий шрифт', f_minimal: 'Мінімалізм', f_deco: 'Ар-деко', f_neon: 'Неонова ніч', f_royal: 'Королівське золото',
    fr_none: 'Без рамки', fr_brass: 'Латунне кільце', fr_neon: 'Неоновий пульс', fr_laurel: 'Золотий лавр', fr_flames: 'Інферно', fr_ice: 'Крижаний кристал', fr_crown: 'Королівська корона', fr_diamond: 'Діамант',
    vx_classic: 'Золоті іскри', vx_confetti: 'Золоте конфеті', vx_fireworks: 'Салют', vx_waterfall: 'Картковий водоспад', vx_crowns: 'Дощ із корон',
    em_classic: 'Класика', em_cheeky: 'Зухвалі', em_animals: 'Звірі', em_casino: 'Хайролер', em_royal: 'Королівські',
    t_none: 'Без титулу', t_lucky: 'Талісман', t_shark: 'Акула', t_bluff: 'Король блефу', t_queenslayer: 'Гроза дам', t_highroller: 'Хайролер', t_master: 'Майстер 125', t_legend: 'Легенда',
    nc_default: 'Звичайний', nc_gold: 'Золото', nc_ruby: 'Рубін', nc_ice: 'Лід', nc_emerald: 'Смарагд', nc_neon: 'Неон', nc_fire: 'Вогонь', nc_holo: 'Голограма',
    bn_felt: 'Сукно', bn_bokeh: 'Вогні казино', bn_sunburst: 'Золоте сонце', bn_aurora: 'Небо сяйва', bn_riga: 'Дахи Риги', bn_suits: 'Королівські масті',
    // earned, never sold: achievements / collections / prestige (migration 012) and the Journey finale (011)
    ach_t_phoenix: 'Фенікс', ach_t_detective: 'Детектор брехні', ach_t_immortal: 'Безсмертний', ach_t_founder: 'Засновник', ach_t_curator: 'Куратор', t_grand_tour: 'Великий мандрівник',
    ach_fr_veteran: 'Вінок ветерана', ach_fr_prestige: 'Ореол престижу', ach_fr_obsidian: 'Обсидіанове кільце', ach_nc_ember: 'Жар', ach_nc_aurum: 'Аурум', ach_bn_vault: 'Сховище', ach_fr_envoy: 'Перстень посла',
    pk_starter: 'Стартовий набір', pk_sakura: 'Набір «Сакура»', pk_racing: 'Набір «Піт-лейн»', pk_neon: 'Набір «Неонова ніч»', pk_aurora: 'Набір «Північне сяйво»', pk_montecarlo: 'Набір «Монте-Карло»', pk_riga: 'Набір «Стара Рига»', pk_royal: 'Набір «Королівський двір»',
  },
};

export const COS_STRINGS: Strings<CosStrings> = { en, lv, ru, uk };
