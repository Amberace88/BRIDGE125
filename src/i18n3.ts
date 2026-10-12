import { withFallback, type Lang } from './i18n';

export interface Extra2 {
  quick: { play: string; sub: string; title: string; finding: string; startsIn: (s: number) => string; startNow: string; botsFill: string; error: string; starting: string };
  lb: { title: string; sub: string; wins: string; games: string; winRate: string; empty: string; you: string; signIn: string; error: string; open: string };
  legal: { privacy: string; terms: string; updated: string; contact: string; agree: [string, string, string, string] };
  install: {
    button: string; title: string; sub: string; benefits: string[]; cta: string; done: string; later: string; banner: string;
    ios: string[]; iosOther: string; android: string[]; desktop: string[]; qr: string; free: string;
  };
  acct: {
    tabIn: string; tabUp: string; titleIn: string; subIn: string; titleUp: string; subUp: string;
    email: string; password: string; name: string; namePh: string; nameHint: string; show: string; hide: string;
    forgot: string; signIn: string; signUp: string; or: string; useLink: string; usePassword: string;
    noAccount: string; haveAccount: string; pwHint: string; strength: [string, string, string, string];
    forgotTitle: string; forgotSub: string; sendReset: string; resetSent: (e: string) => string; back: string;
    newTitle: string; newSub: string; newPw: string; repeatPw: string; savePw: string; pwSaved: string; mismatch: string;
    welcomeNew: (n: string) => string; welcomeBack: string;
    err: { badEmail: string; short: string; wrong: string; exists: string; weak: string; notConfirmed: string; tooMany: string; network: string; generic: string };
  };
  prof: {
    tabs: { me: string; look: string; account: string }; since: (d: string) => string; winRate: string; avatar: string; saved: string;
    preview: string; table: string; accent: string; backs: string; matchBack: string; premium: string; locked: string; adminFree: string;
    guestLock: string; tryOn: string; email: string; security: string; changePw: string; pwChanged: string; danger: string;
    deleteAcc: string; deleteHint: string; admin: string; adminPanel: string; guestTitle: string; guestSub: string; prefs: string;
  };
}

const en: Extra2 = {
  quick: {
    play: 'Play online now', sub: 'Get matched with real players', title: 'Quick match', finding: 'Finding players…',
    startsIn: s => `Starting in ${s}s`, startNow: 'Start now', botsFill: 'Empty seats are filled by bots when the timer ends.',
    error: 'Could not reach the server. Try again.', starting: 'Dealing…',
  },
  lb: {
    title: 'Leaderboard', sub: 'Top players by wins', wins: 'Wins', games: 'Games', winRate: 'Win rate',
    empty: 'No ranked games yet — be the first!', you: 'You', signIn: 'Sign in to get on the leaderboard', error: 'Leaderboard is unavailable right now.', open: 'Top players',
  },
  legal: { privacy: 'Privacy', terms: 'Terms', updated: 'Last updated', contact: 'Contact', agree: ['By continuing you accept the', 'Terms', 'and', 'Privacy policy'] },
  install: {
    button: 'Install app', title: 'Install Bridge 125', sub: 'Play from your home screen like a real app — free, no app store needed.',
    benefits: ['Opens full-screen in one tap', 'Play against bots even offline', 'Always the latest version, nothing to update'],
    cta: 'Install now', done: 'Installed! Find Bridge 125 on your home screen.', later: 'Not now', banner: 'Get the app — free',
    ios: ['Tap the Share button', 'Choose “Add to Home Screen”', 'Tap “Add” — done!'],
    iosOther: 'On iPhone and iPad, open bridge125.com in Safari to install.',
    android: ['Open the browser menu ⋮', 'Tap “Install app” or “Add to Home screen”', 'Confirm — done!'],
    desktop: ['In Chrome or Edge, click the install icon in the address bar', 'Or open the menu ⋮ → “Install Bridge 125”', 'It opens in its own window, like any app'],
    qr: 'Scan with your phone camera to install on your phone', free: 'Free · under 1 MB · iPhone, Android, Mac, Windows',
  },
  acct: {
    tabIn: 'Sign in', tabUp: 'Create account', titleIn: 'Welcome back', subIn: 'Sign in to keep your stats, BM and table style.',
    titleUp: 'Join Bridge 125', subUp: 'Free account in 20 seconds. Your progress follows you on every device.',
    email: 'Email', password: 'Password', name: 'Nickname', namePh: 'e.g. Eddy', nameHint: 'Shown at the table and on the leaderboard', show: 'Show', hide: 'Hide',
    forgot: 'Forgot password?', signIn: 'Sign in', signUp: 'Create account', or: 'or', useLink: 'Email me a sign-in link instead', usePassword: 'Sign in with password',
    noAccount: 'New here?', haveAccount: 'Already have an account?', pwHint: 'At least 8 characters', strength: ['Too short', 'Weak', 'Good', 'Strong'],
    forgotTitle: 'Reset password', forgotSub: 'Enter your email and we’ll send you a link to set a new password.', sendReset: 'Send reset link',
    resetSent: e => `Check ${e} — open the link to choose a new password.`, back: 'Back to sign in',
    newTitle: 'Set a new password', newSub: 'Choose a new password for your account.', newPw: 'New password', repeatPw: 'Repeat password', savePw: 'Save password',
    pwSaved: 'Password saved — you are signed in.', mismatch: 'Passwords do not match',
    welcomeNew: n => `Welcome to the table, ${n}!`, welcomeBack: 'Welcome back!',
    err: { badEmail: 'Enter a valid email address', short: 'Password must be at least 8 characters', wrong: 'Wrong email or password', exists: 'An account with this email already exists — sign in instead.',
      weak: 'Choose a stronger password', notConfirmed: 'Please confirm your email first', tooMany: 'Too many attempts — wait a minute and try again', network: 'No connection — check your internet', generic: 'Something went wrong. Please try again.' },
  },
  prof: {
    tabs: { me: 'Profile', look: 'Style', account: 'Account' }, since: d => `Member since ${d}`, winRate: 'Win rate', avatar: 'Avatar', saved: 'Saved',
    preview: 'Live preview', table: 'Table', accent: 'Accent colour', backs: 'Card backs', matchBack: 'Match table', premium: 'Premium',
    locked: 'Premium — coming soon to the shop. Try it on in the preview.', adminFree: 'Admin — every premium item is unlocked for you',
    guestLock: 'Sign in to save your style', tryOn: 'Previewing', email: 'Email', security: 'Password', changePw: 'Change password', pwChanged: 'Password changed',
    danger: 'Danger zone', deleteAcc: 'Delete my account', deleteHint: 'We will delete your account and data within 30 days.',
    admin: 'Admin', adminPanel: 'Open admin panel', guestTitle: 'Playing as guest', guestSub: 'Create a free account to keep stats, BM and your style on every device.', prefs: 'Preferences',
  },
};

const lv: Extra2 = {
  quick: {
    play: 'Spēlēt online tagad', sub: 'Atrodi pretiniekus uzreiz', title: 'Ātrā spēle', finding: 'Meklējam spēlētājus…',
    startsIn: s => `Sākums pēc ${s} s`, startNow: 'Sākt tagad', botsFill: 'Kad laiks beigsies, brīvās vietas aizpildīs boti.',
    error: 'Neizdevās sazināties ar serveri. Mēģini vēlreiz.', starting: 'Dalām kārtis…',
  },
  lb: {
    title: 'Līderu tabula', sub: 'Labākie spēlētāji pēc uzvarām', wins: 'Uzvaras', games: 'Spēles', winRate: 'Uzvaru %',
    empty: 'Vēl nav nevienas spēles — esi pirmais!', you: 'Tu', signIn: 'Ienāc, lai tiktu līderu tabulā', error: 'Līderu tabula šobrīd nav pieejama.', open: 'Līderi',
  },
  legal: { privacy: 'Privātums', terms: 'Noteikumi', updated: 'Atjaunots', contact: 'Kontakti', agree: ['Turpinot tu piekrīti', 'Noteikumiem', 'un', 'Privātuma politikai'] },
  install: {
    button: 'Instalēt lietotni', title: 'Instalē Bridge 125', sub: 'Spēlē no sākuma ekrāna kā īstā lietotnē — bez maksas un bez App Store.',
    benefits: ['Atveras pilnekrānā ar vienu pieskārienu', 'Spēlē pret botiem arī bez interneta', 'Vienmēr jaunākā versija — nekas nav jāatjauno'],
    cta: 'Instalēt tagad', done: 'Instalēts! Bridge 125 atradīsi sākuma ekrānā.', later: 'Ne tagad', banner: 'Lejuplādē lietotni — bez maksas',
    ios: ['Pieskaries pogai “Kopīgot”', 'Izvēlies “Pievienot sākuma ekrānam”', 'Spied “Pievienot” — gatavs!'],
    iosOther: 'iPhone un iPad ierīcēs atver bridge125.com pārlūkā Safari, lai instalētu.',
    android: ['Atver pārlūka izvēlni ⋮', 'Spied “Instalēt lietotni” vai “Pievienot sākuma ekrānam”', 'Apstiprini — gatavs!'],
    desktop: ['Chrome vai Edge adreses joslā spied instalēšanas ikonu', 'Vai izvēlne ⋮ → “Instalēt Bridge 125”', 'Atvērsies savā logā kā jebkura programma'],
    qr: 'Noskenē ar telefona kameru, lai instalētu telefonā', free: 'Bez maksas · mazāk par 1 MB · iPhone, Android, Mac, Windows',
  },
  acct: {
    tabIn: 'Ienākt', tabUp: 'Reģistrēties', titleIn: 'Sveicināts atpakaļ', subIn: 'Ienāc, lai saglabātu statistiku, BM un galda stilu.',
    titleUp: 'Pievienojies Bridge 125', subUp: 'Bezmaksas konts 20 sekundēs. Tavs progress būs pieejams jebkurā ierīcē.',
    email: 'E-pasts', password: 'Parole', name: 'Segvārds', namePh: 'piem., Eddy', nameHint: 'Redzams pie galda un līderu tabulā', show: 'Rādīt', hide: 'Slēpt',
    forgot: 'Aizmirsi paroli?', signIn: 'Ienākt', signUp: 'Izveidot kontu', or: 'vai', useLink: 'Ienākt ar saiti e-pastā', usePassword: 'Ienākt ar paroli',
    noAccount: 'Pirmo reizi šeit?', haveAccount: 'Jau ir konts?', pwHint: 'Vismaz 8 rakstzīmes', strength: ['Par īsu', 'Vāja', 'Laba', 'Stipra'],
    forgotTitle: 'Atjaunot paroli', forgotSub: 'Ieraksti e-pastu, un mēs atsūtīsim saiti jaunas paroles izveidei.', sendReset: 'Sūtīt saiti',
    resetSent: e => `Pārbaudi ${e} — atver saiti un izvēlies jaunu paroli.`, back: 'Atpakaļ uz ienākšanu',
    newTitle: 'Jauna parole', newSub: 'Izvēlies jaunu paroli savam kontam.', newPw: 'Jaunā parole', repeatPw: 'Atkārto paroli', savePw: 'Saglabāt paroli',
    pwSaved: 'Parole saglabāta — tu esi ienācis.', mismatch: 'Paroles nesakrīt',
    welcomeNew: n => `Laipni lūgts pie galda, ${n}!`, welcomeBack: 'Prieks tevi redzēt atkal!',
    err: { badEmail: 'Ieraksti derīgu e-pasta adresi', short: 'Parolei jābūt vismaz 8 rakstzīmēm', wrong: 'Nepareizs e-pasts vai parole', exists: 'Konts ar šo e-pastu jau ir — vienkārši ienāc.',
      weak: 'Izvēlies stiprāku paroli', notConfirmed: 'Vispirms apstiprini e-pastu', tooMany: 'Pārāk daudz mēģinājumu — pagaidi minūti', network: 'Nav savienojuma — pārbaudi internetu', generic: 'Kaut kas nogāja greizi. Mēģini vēlreiz.' },
  },
  prof: {
    tabs: { me: 'Profils', look: 'Izskats', account: 'Konts' }, since: d => `Spēlē kopš ${d}`, winRate: 'Uzvaru %', avatar: 'Avatārs', saved: 'Saglabāts',
    preview: 'Priekšskatījums', table: 'Galds', accent: 'Akcenta krāsa', backs: 'Kāršu mugura', matchBack: 'Kā galdam', premium: 'Premium',
    locked: 'Premium — drīzumā veikalā. Izmēģini priekšskatījumā.', adminFree: 'Admins — visi premium dizaini tev ir atvērti',
    guestLock: 'Ienāc, lai saglabātu savu stilu', tryOn: 'Priekšskatījums', email: 'E-pasts', security: 'Parole', changePw: 'Mainīt paroli', pwChanged: 'Parole nomainīta',
    danger: 'Bīstamā zona', deleteAcc: 'Dzēst manu kontu', deleteHint: 'Mēs izdzēsīsim tavu kontu un datus 30 dienu laikā.',
    admin: 'Admins', adminPanel: 'Atvērt admina paneli', guestTitle: 'Spēlē kā viesis', guestSub: 'Izveido bezmaksas kontu, lai saglabātu statistiku, BM un stilu visās ierīcēs.', prefs: 'Iestatījumi',
  },
};

const ru: Extra2 = {
  quick: {
    play: 'Играть онлайн', sub: 'Найдём соперников за секунды', title: 'Быстрая игра', finding: 'Ищем игроков…',
    startsIn: s => `Старт через ${s} с`, startNow: 'Начать сейчас', botsFill: 'Когда время выйдет, свободные места займут боты.',
    error: 'Не удалось связаться с сервером. Попробуйте ещё раз.', starting: 'Раздаём карты…',
  },
  lb: {
    title: 'Таблица лидеров', sub: 'Лучшие игроки по победам', wins: 'Победы', games: 'Игры', winRate: '% побед',
    empty: 'Пока нет ни одной игры — будьте первым!', you: 'Вы', signIn: 'Войдите, чтобы попасть в таблицу', error: 'Таблица лидеров сейчас недоступна.', open: 'Лидеры',
  },
  legal: { privacy: 'Конфиденциальность', terms: 'Условия', updated: 'Обновлено', contact: 'Контакты', agree: ['Продолжая, вы принимаете', 'Условия', 'и', 'Политику конфиденциальности'] },
  install: {
    button: 'Установить', title: 'Установите Bridge 125', sub: 'Играйте с главного экрана как в настоящем приложении — бесплатно, без App Store.',
    benefits: ['Открывается на весь экран в одно касание', 'Игра с ботами даже без интернета', 'Всегда последняя версия — ничего обновлять не нужно'],
    cta: 'Установить', done: 'Установлено! Bridge 125 — на главном экране.', later: 'Не сейчас', banner: 'Скачайте приложение — бесплатно',
    ios: ['Нажмите кнопку «Поделиться»', 'Выберите «На экран «Домой»»', 'Нажмите «Добавить» — готово!'],
    iosOther: 'На iPhone и iPad откройте bridge125.com в Safari, чтобы установить.',
    android: ['Откройте меню браузера ⋮', 'Нажмите «Установить приложение» или «Добавить на главный экран»', 'Подтвердите — готово!'],
    desktop: ['В Chrome или Edge нажмите значок установки в адресной строке', 'Или меню ⋮ → «Установить Bridge 125»', 'Откроется в отдельном окне, как обычная программа'],
    qr: 'Отсканируйте камерой телефона, чтобы установить на телефон', free: 'Бесплатно · меньше 1 МБ · iPhone, Android, Mac, Windows',
  },
  acct: {
    tabIn: 'Войти', tabUp: 'Регистрация', titleIn: 'С возвращением', subIn: 'Войдите, чтобы сохранить статистику, BM и стиль стола.',
    titleUp: 'Присоединяйтесь к Bridge 125', subUp: 'Бесплатный аккаунт за 20 секунд. Прогресс доступен на любом устройстве.',
    email: 'E-mail', password: 'Пароль', name: 'Ник', namePh: 'напр., Eddy', nameHint: 'Виден за столом и в таблице лидеров', show: 'Показать', hide: 'Скрыть',
    forgot: 'Забыли пароль?', signIn: 'Войти', signUp: 'Создать аккаунт', or: 'или', useLink: 'Войти по ссылке из письма', usePassword: 'Войти с паролем',
    noAccount: 'Впервые здесь?', haveAccount: 'Уже есть аккаунт?', pwHint: 'Минимум 8 символов', strength: ['Слишком короткий', 'Слабый', 'Хороший', 'Надёжный'],
    forgotTitle: 'Восстановить пароль', forgotSub: 'Введите e-mail, и мы пришлём ссылку для нового пароля.', sendReset: 'Отправить ссылку',
    resetSent: e => `Проверьте ${e} — откройте ссылку и задайте новый пароль.`, back: 'Назад ко входу',
    newTitle: 'Новый пароль', newSub: 'Придумайте новый пароль для аккаунта.', newPw: 'Новый пароль', repeatPw: 'Повторите пароль', savePw: 'Сохранить пароль',
    pwSaved: 'Пароль сохранён — вы вошли.', mismatch: 'Пароли не совпадают',
    welcomeNew: n => `Добро пожаловать за стол, ${n}!`, welcomeBack: 'Рады видеть снова!',
    err: { badEmail: 'Введите корректный e-mail', short: 'Пароль — минимум 8 символов', wrong: 'Неверный e-mail или пароль', exists: 'Аккаунт с этим e-mail уже есть — просто войдите.',
      weak: 'Выберите пароль понадёжнее', notConfirmed: 'Сначала подтвердите e-mail', tooMany: 'Слишком много попыток — подождите минуту', network: 'Нет соединения — проверьте интернет', generic: 'Что-то пошло не так. Попробуйте ещё раз.' },
  },
  prof: {
    tabs: { me: 'Профиль', look: 'Стиль', account: 'Аккаунт' }, since: d => `Играет с ${d}`, winRate: '% побед', avatar: 'Аватар', saved: 'Сохранено',
    preview: 'Предпросмотр', table: 'Стол', accent: 'Цвет акцента', backs: 'Рубашка карт', matchBack: 'Под стол', premium: 'Премиум',
    locked: 'Премиум — скоро в магазине. Примерьте в предпросмотре.', adminFree: 'Админ — все премиум-дизайны открыты',
    guestLock: 'Войдите, чтобы сохранить стиль', tryOn: 'Примерка', email: 'E-mail', security: 'Пароль', changePw: 'Сменить пароль', pwChanged: 'Пароль изменён',
    danger: 'Опасная зона', deleteAcc: 'Удалить аккаунт', deleteHint: 'Мы удалим аккаунт и данные в течение 30 дней.',
    admin: 'Админ', adminPanel: 'Открыть админ-панель', guestTitle: 'Вы играете как гость', guestSub: 'Создайте бесплатный аккаунт, чтобы сохранить статистику, BM и стиль на всех устройствах.', prefs: 'Настройки',
  },
};

const uk: Extra2 = {
  quick: {
    play: 'Грати онлайн', sub: 'Знайдемо суперників за секунди', title: 'Швидка гра', finding: 'Шукаємо гравців…',
    startsIn: s => `Старт за ${s} с`, startNow: 'Почати зараз', botsFill: 'Коли час мине, вільні місця займуть боти.',
    error: 'Не вдалося зв’язатися з сервером. Спробуйте ще раз.', starting: 'Роздаємо карти…',
  },
  lb: {
    title: 'Таблиця лідерів', sub: 'Найкращі гравці за перемогами', wins: 'Перемоги', games: 'Ігри', winRate: '% перемог',
    empty: 'Ще немає жодної гри — будьте першим!', you: 'Ви', signIn: 'Увійдіть, щоб потрапити до таблиці', error: 'Таблиця лідерів зараз недоступна.', open: 'Лідери',
  },
  legal: { privacy: 'Конфіденційність', terms: 'Умови', updated: 'Оновлено', contact: 'Контакти', agree: ['Продовжуючи, ви приймаєте', 'Умови', 'та', 'Політику конфіденційності'] },
  install: {
    button: 'Встановити', title: 'Встановіть Bridge 125', sub: 'Грайте з головного екрана як у справжньому застосунку — безкоштовно, без App Store.',
    benefits: ['Відкривається на весь екран одним дотиком', 'Гра з ботами навіть без інтернету', 'Завжди остання версія — нічого оновлювати не треба'],
    cta: 'Встановити', done: 'Встановлено! Bridge 125 — на головному екрані.', later: 'Не зараз', banner: 'Завантажте застосунок — безкоштовно',
    ios: ['Натисніть кнопку «Поділитися»', 'Оберіть «На початковий екран»', 'Натисніть «Додати» — готово!'],
    iosOther: 'На iPhone та iPad відкрийте bridge125.com у Safari, щоб встановити.',
    android: ['Відкрийте меню браузера ⋮', 'Натисніть «Встановити застосунок» або «Додати на головний екран»', 'Підтвердіть — готово!'],
    desktop: ['У Chrome чи Edge натисніть значок встановлення в адресному рядку', 'Або меню ⋮ → «Встановити Bridge 125»', 'Відкриється в окремому вікні, як звичайна програма'],
    qr: 'Відскануйте камерою телефона, щоб встановити на телефон', free: 'Безкоштовно · менше 1 МБ · iPhone, Android, Mac, Windows',
  },
  acct: {
    tabIn: 'Увійти', tabUp: 'Реєстрація', titleIn: 'З поверненням', subIn: 'Увійдіть, щоб зберегти статистику, BM і стиль столу.',
    titleUp: 'Приєднуйтесь до Bridge 125', subUp: 'Безкоштовний акаунт за 20 секунд. Прогрес доступний на будь-якому пристрої.',
    email: 'E-mail', password: 'Пароль', name: 'Нік', namePh: 'напр., Eddy', nameHint: 'Видно за столом і в таблиці лідерів', show: 'Показати', hide: 'Сховати',
    forgot: 'Забули пароль?', signIn: 'Увійти', signUp: 'Створити акаунт', or: 'або', useLink: 'Увійти за посиланням з листа', usePassword: 'Увійти з паролем',
    noAccount: 'Вперше тут?', haveAccount: 'Вже є акаунт?', pwHint: 'Щонайменше 8 символів', strength: ['Закороткий', 'Слабкий', 'Добрий', 'Надійний'],
    forgotTitle: 'Відновити пароль', forgotSub: 'Введіть e-mail, і ми надішлемо посилання для нового пароля.', sendReset: 'Надіслати посилання',
    resetSent: e => `Перевірте ${e} — відкрийте посилання та задайте новий пароль.`, back: 'Назад до входу',
    newTitle: 'Новий пароль', newSub: 'Придумайте новий пароль для акаунта.', newPw: 'Новий пароль', repeatPw: 'Повторіть пароль', savePw: 'Зберегти пароль',
    pwSaved: 'Пароль збережено — ви увійшли.', mismatch: 'Паролі не збігаються',
    welcomeNew: n => `Ласкаво просимо до столу, ${n}!`, welcomeBack: 'Раді бачити знову!',
    err: { badEmail: 'Введіть коректний e-mail', short: 'Пароль — щонайменше 8 символів', wrong: 'Неправильний e-mail або пароль', exists: 'Акаунт з цим e-mail вже є — просто увійдіть.',
      weak: 'Оберіть надійніший пароль', notConfirmed: 'Спершу підтвердіть e-mail', tooMany: 'Забагато спроб — зачекайте хвилину', network: 'Немає з’єднання — перевірте інтернет', generic: 'Щось пішло не так. Спробуйте ще раз.' },
  },
  prof: {
    tabs: { me: 'Профіль', look: 'Стиль', account: 'Акаунт' }, since: d => `Грає з ${d}`, winRate: '% перемог', avatar: 'Аватар', saved: 'Збережено',
    preview: 'Попередній перегляд', table: 'Стіл', accent: 'Колір акценту', backs: 'Сорочка карт', matchBack: 'Під стіл', premium: 'Преміум',
    locked: 'Преміум — незабаром у магазині. Приміряйте в перегляді.', adminFree: 'Адмін — усі преміум-дизайни відкриті',
    guestLock: 'Увійдіть, щоб зберегти стиль', tryOn: 'Приміряння', email: 'E-mail', security: 'Пароль', changePw: 'Змінити пароль', pwChanged: 'Пароль змінено',
    danger: 'Небезпечна зона', deleteAcc: 'Видалити акаунт', deleteHint: 'Ми видалимо акаунт і дані протягом 30 днів.',
    admin: 'Адмін', adminPanel: 'Відкрити адмін-панель', guestTitle: 'Ви граєте як гість', guestSub: 'Створіть безкоштовний акаунт, щоб зберегти статистику, BM і стиль на всіх пристроях.', prefs: 'Налаштування',
  },
};

export const EXTRA2: Record<Lang, Extra2> = withFallback({ en, lv, ru, uk });

// ---------------------------------------------------------------- legal texts

export interface LegalDoc { title: string; intro: string; sections: { h: string; p: string[] }[] }
export const LEGAL_UPDATED = '2026-10-12';
export const CONTACT_EMAIL = 'hello@bridge125.com';

const privacy: Record<'en' | 'lv' | 'ru' | 'uk', LegalDoc> = {
  en: {
    title: 'Privacy policy',
    intro: 'Bridge 125 is a free card game. We collect as little as possible and never sell your data.',
    sections: [
      { h: 'What we store', p: [
        'Without an account: nothing about you leaves your device except the nickname you use at an online table. Your settings, a saved game and a random player ID are kept in your browser’s local storage.',
        'With an account: your email address (used only to send sign-in codes), your nickname, language, colour and table choices, and your game statistics (games played, wins, BM balance).',
      ] },
      { h: 'Online tables', p: ['While you play online, the table state (seats, nicknames, cards, moves) is held on our server so every player sees the same game. It is not linked to your email and is discarded after the table goes quiet.'] },
      { h: 'Leaderboard', p: ['If you have an account and finish games, your nickname and statistics may appear on the public leaderboard. Change your nickname at any time in your profile.'] },
      { h: 'Who processes data', p: ['Supabase (accounts and statistics) and Cloudflare (hosting and online tables) process data on our behalf under their data-processing terms. We use no advertising or analytics trackers and no third-party cookies.'] },
      { h: 'How long we keep it', p: ['Account data is kept until you ask us to delete it. Local data stays in your browser until you clear it.'] },
      { h: 'Your rights', p: [`You can ask to see, correct, export or delete your data at any time by writing to ${CONTACT_EMAIL}. Under the GDPR you may also complain to your local data-protection authority.`] },
      { h: 'Children', p: ['Bridge 125 is intended for players aged 16 and over.'] },
    ],
  },
  lv: {
    title: 'Privātuma politika',
    intro: 'Bridge 125 ir bezmaksas kāršu spēle. Mēs vācam pēc iespējas mazāk datu un nekad tos nepārdodam.',
    sections: [
      { h: 'Ko mēs glabājam', p: [
        'Bez konta: no tavas ierīces nekas neaiziet, izņemot segvārdu, ko izmanto online galdā. Iestatījumi, saglabātā spēle un nejaušs spēlētāja ID glabājas tava pārlūka lokālajā atmiņā.',
        'Ar kontu: e-pasta adrese (tikai pieteikšanās kodu sūtīšanai), segvārds, valoda, krāsu un galda izvēle un spēļu statistika (spēles, uzvaras, BM bilance).',
      ] },
      { h: 'Online galdi', p: ['Online spēles laikā galda stāvoklis (vietas, segvārdi, kārtis, gājieni) atrodas mūsu serverī, lai visi redzētu vienu un to pašu spēli. Tas nav saistīts ar tavu e-pastu un tiek dzēsts, kad galds kļūst neaktīvs.'] },
      { h: 'Līderu tabula', p: ['Ja tev ir konts un tu pabeidz spēles, tavs segvārds un statistika var parādīties publiskajā līderu tabulā. Segvārdu vari mainīt jebkurā laikā profilā.'] },
      { h: 'Kas apstrādā datus', p: ['Supabase (konti un statistika) un Cloudflare (hostings un online galdi) apstrādā datus mūsu vārdā saskaņā ar saviem datu apstrādes noteikumiem. Mēs neizmantojam reklāmas vai analītikas izsekotājus un trešo pušu sīkdatnes.'] },
      { h: 'Cik ilgi glabājam', p: ['Konta datus glabājam, līdz tu lūdz tos dzēst. Lokālie dati paliek pārlūkā, līdz tu tos notīri.'] },
      { h: 'Tavas tiesības', p: [`Tu jebkurā laikā vari lūgt piekļuvi saviem datiem, to labošanu, eksportu vai dzēšanu, rakstot uz ${CONTACT_EMAIL}. Saskaņā ar VDAR tu vari arī iesniegt sūdzību savai datu aizsardzības iestādei.`] },
      { h: 'Bērni', p: ['Bridge 125 ir paredzēta spēlētājiem no 16 gadu vecuma.'] },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    intro: 'Bridge 125 — бесплатная карточная игра. Мы собираем минимум данных и никогда их не продаём.',
    sections: [
      { h: 'Что мы храним', p: [
        'Без аккаунта: с вашего устройства ничего не передаётся, кроме ника за онлайн-столом. Настройки, сохранённая игра и случайный ID игрока хранятся в локальном хранилище браузера.',
        'С аккаунтом: e-mail (только для отправки кодов входа), ник, язык, выбор цвета и стола, а также статистика (игры, победы, баланс BM).',
      ] },
      { h: 'Онлайн-столы', p: ['Во время онлайн-игры состояние стола (места, ники, карты, ходы) хранится на нашем сервере, чтобы все видели одну и ту же игру. Оно не связано с вашим e-mail и удаляется, когда стол становится неактивным.'] },
      { h: 'Таблица лидеров', p: ['Если у вас есть аккаунт и вы завершаете игры, ваш ник и статистика могут появиться в публичной таблице лидеров. Ник можно изменить в профиле в любое время.'] },
      { h: 'Кто обрабатывает данные', p: ['Supabase (аккаунты и статистика) и Cloudflare (хостинг и онлайн-столы) обрабатывают данные от нашего имени по своим условиям обработки данных. Мы не используем рекламные и аналитические трекеры и сторонние cookie.'] },
      { h: 'Сколько храним', p: ['Данные аккаунта хранятся, пока вы не попросите их удалить. Локальные данные остаются в браузере, пока вы их не очистите.'] },
      { h: 'Ваши права', p: [`Вы можете в любой момент запросить доступ к своим данным, их исправление, экспорт или удаление, написав на ${CONTACT_EMAIL}. По GDPR вы также можете подать жалобу в свой орган по защите данных.`] },
      { h: 'Дети', p: ['Bridge 125 предназначена для игроков от 16 лет.'] },
    ],
  },
  uk: {
    title: 'Політика конфіденційності',
    intro: 'Bridge 125 — безкоштовна карткова гра. Ми збираємо мінімум даних і ніколи їх не продаємо.',
    sections: [
      { h: 'Що ми зберігаємо', p: [
        'Без акаунта: з вашого пристрою нічого не передається, крім ніку за онлайн-столом. Налаштування, збережена гра та випадковий ID гравця зберігаються в локальному сховищі браузера.',
        'З акаунтом: e-mail (лише для надсилання кодів входу), нік, мова, вибір кольору та столу, а також статистика (ігри, перемоги, баланс BM).',
      ] },
      { h: 'Онлайн-столи', p: ['Під час онлайн-гри стан столу (місця, ніки, карти, ходи) зберігається на нашому сервері, щоб усі бачили ту саму гру. Він не пов’язаний з вашим e-mail і видаляється, коли стіл стає неактивним.'] },
      { h: 'Таблиця лідерів', p: ['Якщо у вас є акаунт і ви завершуєте ігри, ваш нік і статистика можуть з’явитися в публічній таблиці лідерів. Нік можна змінити в профілі будь-коли.'] },
      { h: 'Хто обробляє дані', p: ['Supabase (акаунти та статистика) і Cloudflare (хостинг та онлайн-столи) обробляють дані від нашого імені за своїми умовами обробки даних. Ми не використовуємо рекламні й аналітичні трекери та сторонні cookie.'] },
      { h: 'Скільки зберігаємо', p: ['Дані акаунта зберігаються, доки ви не попросите їх видалити. Локальні дані лишаються в браузері, доки ви їх не очистите.'] },
      { h: 'Ваші права', p: [`Ви можете будь-коли запросити доступ до своїх даних, їх виправлення, експорт або видалення, написавши на ${CONTACT_EMAIL}. Згідно з GDPR ви також можете подати скаргу до свого органу із захисту даних.`] },
      { h: 'Діти', p: ['Bridge 125 призначена для гравців від 16 років.'] },
    ],
  },
};

const terms: Record<'en' | 'lv' | 'ru' | 'uk', LegalDoc> = {
  en: {
    title: 'Terms of use',
    intro: 'By playing Bridge 125 you agree to these simple rules.',
    sections: [
      { h: 'The game', p: ['Bridge 125 is provided free of charge, as is, for entertainment. We may change, pause or end features at any time.'] },
      { h: 'Bridge Money (BM)', p: ['BM are virtual points used only inside the game. They have no monetary value, cannot be bought, sold, exchanged or withdrawn, and are not gambling.'] },
      { h: 'Fair play', p: ['Be respectful at the table. Cheating, automating play, exploiting bugs, offensive nicknames or harassing other players are not allowed and can lead to removal of your account.'] },
      { h: 'Your account', p: ['Keep access to your email safe — it is how you sign in. You can stop playing and ask us to delete your account at any time.'] },
      { h: 'Liability', p: ['We work hard to keep the game running, but we cannot guarantee it will always be available or error-free. To the extent the law allows, we are not liable for lost progress or indirect damages.'] },
      { h: 'Changes', p: ['If these terms change we will update the date above. Continuing to play means you accept the updated terms.'] },
    ],
  },
  lv: {
    title: 'Lietošanas noteikumi',
    intro: 'Spēlējot Bridge 125, tu piekrīti šiem vienkāršajiem noteikumiem.',
    sections: [
      { h: 'Spēle', p: ['Bridge 125 tiek nodrošināta bez maksas, “kā ir”, izklaidei. Mēs varam jebkurā laikā mainīt, apturēt vai pārtraukt funkcijas.'] },
      { h: 'Bridge Money (BM)', p: ['BM ir virtuāli punkti, ko izmanto tikai spēlē. Tiem nav naudas vērtības, tos nevar nopirkt, pārdot, apmainīt vai izņemt, un tās nav azartspēles.'] },
      { h: 'Godīga spēle', p: ['Esi cieņpilns pie galda. Krāpšanās, spēles automatizēšana, kļūdu izmantošana, aizskaroši segvārdi vai citu spēlētāju aizskaršana nav atļauta un var novest pie konta dzēšanas.'] },
      { h: 'Tavs konts', p: ['Sargā piekļuvi savam e-pastam — ar to tu piesakies. Tu vari jebkurā laikā pārtraukt spēlēt un lūgt dzēst savu kontu.'] },
      { h: 'Atbildība', p: ['Mēs darām visu, lai spēle darbotos, bet nevaram garantēt, ka tā vienmēr būs pieejama vai bez kļūdām. Ciktāl to pieļauj likums, mēs neatbildam par zaudētu progresu vai netiešiem zaudējumiem.'] },
      { h: 'Izmaiņas', p: ['Ja noteikumi mainīsies, mēs atjaunosim datumu augstāk. Turpinot spēlēt, tu piekrīti atjaunotajiem noteikumiem.'] },
    ],
  },
  ru: {
    title: 'Условия использования',
    intro: 'Играя в Bridge 125, вы соглашаетесь с этими простыми правилами.',
    sections: [
      { h: 'Игра', p: ['Bridge 125 предоставляется бесплатно, «как есть», для развлечения. Мы можем в любой момент изменить, приостановить или прекратить функции.'] },
      { h: 'Bridge Money (BM)', p: ['BM — виртуальные очки, используемые только в игре. Они не имеют денежной стоимости, их нельзя купить, продать, обменять или вывести, и это не азартная игра.'] },
      { h: 'Честная игра', p: ['Уважайте соперников. Жульничество, автоматизация игры, использование ошибок, оскорбительные ники или травля других игроков запрещены и могут привести к удалению аккаунта.'] },
      { h: 'Ваш аккаунт', p: ['Берегите доступ к своему e-mail — через него вы входите. Вы можете в любой момент прекратить играть и попросить удалить аккаунт.'] },
      { h: 'Ответственность', p: ['Мы стараемся, чтобы игра работала, но не можем гарантировать её постоянную доступность или отсутствие ошибок. В пределах, допускаемых законом, мы не несём ответственности за потерянный прогресс или косвенный ущерб.'] },
      { h: 'Изменения', p: ['Если условия изменятся, мы обновим дату выше. Продолжая играть, вы принимаете обновлённые условия.'] },
    ],
  },
  uk: {
    title: 'Умови використання',
    intro: 'Граючи в Bridge 125, ви погоджуєтеся з цими простими правилами.',
    sections: [
      { h: 'Гра', p: ['Bridge 125 надається безкоштовно, «як є», для розваги. Ми можемо будь-коли змінити, призупинити або припинити функції.'] },
      { h: 'Bridge Money (BM)', p: ['BM — віртуальні очки, що використовуються лише в грі. Вони не мають грошової вартості, їх не можна купити, продати, обміняти чи вивести, і це не азартна гра.'] },
      { h: 'Чесна гра', p: ['Поважайте суперників. Шахрайство, автоматизація гри, використання помилок, образливі ніки чи цькування інших гравців заборонені й можуть призвести до видалення акаунта.'] },
      { h: 'Ваш акаунт', p: ['Бережіть доступ до свого e-mail — через нього ви входите. Ви можете будь-коли припинити грати й попросити видалити акаунт.'] },
      { h: 'Відповідальність', p: ['Ми намагаємося, щоб гра працювала, але не можемо гарантувати її постійну доступність або відсутність помилок. У межах, дозволених законом, ми не відповідаємо за втрачений прогрес або непрямі збитки.'] },
      { h: 'Зміни', p: ['Якщо умови зміняться, ми оновимо дату вище. Продовжуючи грати, ви приймаєте оновлені умови.'] },
    ],
  },
};

export const LEGAL = { privacy: withFallback(privacy), terms: withFallback(terms) };
