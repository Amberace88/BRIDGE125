import type { Strings } from '../i18n/pick';

/** Offline UI — short on purpose: a pill, a hint and a toast. All 17 languages inline (tiny). */
export interface OfflineStrings {
  /** the offline pill */
  offline: string;
  /** the pill, briefly, when the connection is back */
  back: string;
  /** the pill while queued results are being sent */
  syncing: (n: number) => string;
  /** on online-only buttons */
  needsNet: string;
  /** update toast */
  update: string;
  later: string;
}

const n = (x: number) => (x > 1 ? ` · ${x}` : '');

export const OFFLINE: Strings<OfflineStrings> = {
  en: { offline: 'Offline · play vs bots', back: 'Back online', syncing: x => `Syncing results${n(x)}`, needsNet: 'Needs internet', update: 'New version — tap to update', later: 'Later' },
  lv: { offline: 'Bezsaistē · spēlē pret botiem', back: 'Atkal tiešsaistē', syncing: x => `Sinhronizē rezultātus${n(x)}`, needsNet: 'Vajag internetu', update: 'Jauna versija — pieskaries, lai atjaunotu', later: 'Vēlāk' },
  ru: { offline: 'Офлайн · игра с ботами', back: 'Снова онлайн', syncing: x => `Синхронизация${n(x)}`, needsNet: 'Нужен интернет', update: 'Новая версия — нажмите, чтобы обновить', later: 'Позже' },
  uk: { offline: 'Офлайн · гра з ботами', back: 'Знову онлайн', syncing: x => `Синхронізація${n(x)}`, needsNet: 'Потрібен інтернет', update: 'Нова версія — торкніться, щоб оновити', later: 'Пізніше' },
  lt: { offline: 'Neprisijungta · žaiskite su botais', back: 'Vėl prisijungta', syncing: x => `Sinchronizuojama${n(x)}`, needsNet: 'Reikia interneto', update: 'Nauja versija — palieskite, kad atnaujintumėte', later: 'Vėliau' },
  et: { offline: 'Võrguta · mängi bottidega', back: 'Taas võrgus', syncing: x => `Sünkroonin${n(x)}`, needsNet: 'Vaja internetti', update: 'Uus versioon — puuduta uuendamiseks', later: 'Hiljem' },
  pl: { offline: 'Offline · graj z botami', back: 'Znowu online', syncing: x => `Synchronizacja${n(x)}`, needsNet: 'Wymaga internetu', update: 'Nowa wersja — dotknij, aby zaktualizować', later: 'Później' },
  de: { offline: 'Offline · gegen Bots spielen', back: 'Wieder online', syncing: x => `Synchronisiere${n(x)}`, needsNet: 'Internet nötig', update: 'Neue Version — tippen zum Aktualisieren', later: 'Später' },
  be: { offline: 'Па-за сеткай · гульня з ботамі', back: 'Зноў анлайн', syncing: x => `Сінхранізацыя${n(x)}`, needsNet: 'Патрэбны інтэрнэт', update: 'Новая версія — націсніце, каб абнавіць', later: 'Пазней' },
  kk: { offline: 'Офлайн · боттармен ойын', back: 'Қайта онлайн', syncing: x => `Синхрондау${n(x)}`, needsNet: 'Интернет қажет', update: 'Жаңа нұсқа — жаңарту үшін түртіңіз', later: 'Кейін' },
  uz: { offline: 'Oflayn · botlar bilan o‘yin', back: 'Yana onlayn', syncing: x => `Sinxronlanmoqda${n(x)}`, needsNet: 'Internet kerak', update: 'Yangi versiya — yangilash uchun bosing', later: 'Keyinroq' },
  az: { offline: 'Oflayn · botlarla oyun', back: 'Yenidən onlayn', syncing: x => `Sinxronlaşdırılır${n(x)}`, needsNet: 'İnternet lazımdır', update: 'Yeni versiya — yeniləmək üçün toxunun', later: 'Sonra' },
  ka: { offline: 'ხაზგარეშე · თამაში ბოტებთან', back: 'ისევ ონლაინ', syncing: x => `სინქრონიზაცია${n(x)}`, needsNet: 'საჭიროა ინტერნეტი', update: 'ახალი ვერსია — შეეხეთ განახლებისთვის', later: 'მოგვიანებით' },
  hy: { offline: 'Անցանց · խաղ բոտերի հետ', back: 'Կրկին առցանց', syncing: x => `Համաժամեցում${n(x)}`, needsNet: 'Պետք է ինտերնետ', update: 'Նոր տարբերակ — հպեք՝ թարմացնելու համար', later: 'Հետո' },
  ro: { offline: 'Offline · joacă cu boții', back: 'Din nou online', syncing: x => `Se sincronizează${n(x)}`, needsNet: 'Necesită internet', update: 'Versiune nouă — atinge pentru actualizare', later: 'Mai târziu' },
  bg: { offline: 'Офлайн · игра с ботове', back: 'Отново онлайн', syncing: x => `Синхронизиране${n(x)}`, needsNet: 'Нужен е интернет', update: 'Нова версия — докоснете за обновяване', later: 'По-късно' },
  es: { offline: 'Sin conexión · juega contra bots', back: 'De nuevo en línea', syncing: x => `Sincronizando${n(x)}`, needsNet: 'Requiere internet', update: 'Nueva versión — toca para actualizar', later: 'Más tarde' },
};
