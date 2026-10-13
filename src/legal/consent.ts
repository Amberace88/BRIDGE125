import type { Lang } from '../i18n';

/**
 * EU right of withdrawal for digital content (Directive 2011/83/EU, Art. 16(m)): before a paid item is delivered the
 * consumer must expressly agree to immediate delivery and acknowledge losing the 14-day withdrawal right.
 * Every purchase flow (Diamonds, season pass, cosmetics for money) must show this box and send `consent: true`
 * with the checkout request; the Worker refuses checkout without it (worker/pay.ts).
 */
const TEXT: Record<Lang, { text: string; need: string }> = {
  en: { text: 'I want my purchase delivered immediately and I acknowledge that I lose my 14-day right of withdrawal once delivery has started.', need: 'Please tick the box to continue to checkout.' },
  lv: { text: 'Es vēlos, lai pirkums tiek piegādāts nekavējoties, un apzinos, ka līdz ar piegādes sākumu zaudēju 14 dienu atteikuma tiesības.', need: 'Lai turpinātu uz apmaksu, lūdzu, atzīmē rūtiņu.' },
  ru: { text: 'Я хочу получить покупку немедленно и понимаю, что с началом доставки теряю право на отказ от покупки в течение 14 дней.', need: 'Отметьте галочку, чтобы перейти к оплате.' },
  uk: { text: 'Я хочу отримати покупку негайно й розумію, що з початком доставки втрачаю право на відмову від покупки протягом 14 днів.', need: 'Позначте поле, щоб перейти до оплати.' },
  lt: { text: 'Noriu, kad pirkinys būtų pristatytas iš karto, ir suprantu, kad pradėjus pristatymą prarandu 14 dienų teisę atsisakyti sutarties.', need: 'Pažymėkite langelį, kad tęstumėte apmokėjimą.' },
  et: { text: 'Soovin, et ost tarnitaks kohe, ja olen teadlik, et tarne alguses kaotan 14-päevase taganemisõiguse.', need: 'Maksmise jätkamiseks märgi ruut.' },
  pl: { text: 'Chcę, aby zakup został dostarczony natychmiast, i przyjmuję do wiadomości, że z chwilą rozpoczęcia dostawy tracę 14-dniowe prawo odstąpienia od umowy.', need: 'Zaznacz pole, aby przejść do płatności.' },
  de: { text: 'Ich möchte, dass mein Kauf sofort geliefert wird, und nehme zur Kenntnis, dass ich mit Beginn der Lieferung mein 14-tägiges Widerrufsrecht verliere.', need: 'Bitte setze das Häkchen, um zur Zahlung zu gelangen.' },
  be: { text: 'Я хачу атрымаць пакупку неадкладна і разумею, што з пачаткам дастаўкі губляю права на адмову ад пакупкі на працягу 14 дзён.', need: 'Адзначце поле, каб перайсці да аплаты.' },
  kk: { text: 'Сатып алғанымды бірден алғым келеді және жеткізу басталғаннан кейін 14 күндік бас тарту құқығымнан айырылатынымды түсінемін.', need: 'Төлемге өту үшін белгіні қойыңыз.' },
  uz: { text: 'Xaridim darhol yetkazilishini xohlayman va yetkazib berish boshlangach, 14 kunlik voz kechish huquqimni yoʻqotishimni tushunaman.', need: 'Toʻlovga oʻtish uchun katakchani belgilang.' },
  az: { text: 'Alışımın dərhal çatdırılmasını istəyirəm və çatdırılma başladıqdan sonra 14 günlük imtina hüququmu itirdiyimi qəbul edirəm.', need: 'Ödənişə keçmək üçün xananı işarələyin.' },
  ka: { text: 'მსურს, შენაძენი დაუყოვნებლივ მომეწოდოს და ვაცნობიერებ, რომ მიწოდების დაწყებისთანავე ვკარგავ 14-დღიან უარის თქმის უფლებას.', need: 'გადახდაზე გადასასვლელად მონიშნეთ ველი.' },
  hy: { text: 'Ցանկանում եմ, որ գնումն անմիջապես առաքվի, և գիտակցում եմ, որ առաքումը սկսվելուն պես կորցնում եմ 14-օրյա հրաժարման իրավունքը։', need: 'Վճարմանն անցնելու համար նշեք վանդակը։' },
  ro: { text: 'Doresc ca achiziția să fie livrată imediat și iau la cunoștință că îmi pierd dreptul de retragere de 14 zile odată ce livrarea a început.', need: 'Bifează căsuța pentru a continua la plată.' },
  bg: { text: 'Искам покупката да бъде доставена незабавно и приемам, че губя правото си на отказ в 14-дневен срок, след като доставката започне.', need: 'Отбележи полето, за да продължиш към плащането.' },
  es: { text: 'Quiero que mi compra se entregue de inmediato y acepto que pierdo mi derecho de desistimiento de 14 días una vez iniciada la entrega.', need: 'Marca la casilla para continuar con el pago.' },
};

export const consentText = (lang: Lang) => TEXT[lang] ?? TEXT.en;
