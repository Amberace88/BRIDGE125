import type { Lang } from '../i18n';
import { CONTACT_EMAIL } from '../i18n3';

/**
 * Privacy policy + Terms of use, ready for paid features (Diamonds via Stripe Checkout, season pass, cosmetics).
 *
 * English is the binding version; Latvian is a full translation. Every other UI language shows the English text
 * with a short note in that language (BINDING_NOTE). Lazily loaded only with the Legal screen.
 *
 * OWNER TODO — fill in the bracketed values below (they are highlighted on the page until replaced), then bump
 * LEGAL_VERSION. Have a lawyer review before switching payments on.
 */
export const OWNER = {
  company: '[COMPANY NAME]',
  regNo: '[REGISTRATION NO.]',
  vatNo: '[VAT NO.]',
  address: '[REGISTERED ADDRESS]',
  /** Governing law for the terms, e.g. "the Republic of Latvia". */
  law: '[COUNTRY]',
  /** Lead data-protection authority, e.g. "the Data State Inspectorate of Latvia (dvi.gov.lv)". */
  authority: '[SUPERVISORY AUTHORITY]',
  /** Where the Supabase project is hosted, e.g. "the EU (Frankfurt, Germany)". */
  dataRegion: '[SUPABASE REGION]',
  /** How long purchase/tax records are kept, e.g. "5 years". */
  taxRetention: '[RETENTION PERIOD]',
};
export const LEGAL_VERSION = '2026-10-13';

export interface LegalSection { h: string; p: string[]; list?: string[]; after?: string[] }
export interface LegalText { title: string; intro: string; sections: LegalSection[] }
export type LegalKind = 'privacy' | 'terms';

const E = CONTACT_EMAIL, O = OWNER;

const en: Record<LegalKind, LegalText> = {
  terms: {
    title: 'Terms of use',
    intro: `These terms are the agreement between you and ${O.company}, the operator of Bridge 125 (bridge125.com). Please read them — especially the parts about purchases, virtual currencies and your right of withdrawal. By playing Bridge 125 you accept them.`,
    sections: [
      { h: 'Who we are', p: [`Bridge 125 is operated by ${O.company}, registration no. ${O.regNo}, VAT no. ${O.vatNo}, registered address ${O.address}. You can reach us at any time at ${E}.`] },
      { h: 'The game', p: [
        'Bridge 125 is a card game for entertainment. The core game — playing against bots and with other people online — is free. Some optional extras, such as Diamonds, a season pass or cosmetic items, can be bought. Nothing you buy changes the cards you are dealt or your chances of winning a hand.',
        'We keep improving the game, so features, content and prices may change. We will not take away something you have already paid for except as described in these terms.',
      ] },
      { h: 'Minimum age', p: [
        'You must be at least 16 years old to use Bridge 125.',
        'If you are under 18, you may only make purchases with the permission of a parent or legal guardian, who accepts these terms on your behalf. If a purchase was made by a minor without permission, contact us and we will look at it in good faith.',
      ] },
      { h: 'Your account', p: [
        'You can play as a guest. A free account keeps your progress, balances and purchases on every device. Keep access to your email address safe — it is how you sign in — and do not share, sell or transfer your account. You are responsible for what happens on your account unless it is our fault.',
        `You can delete your account at any time in Profile → Delete my account, or by writing to ${E}. We delete the account and its data within 30 days, except records the law requires us to keep (see the Privacy policy). Deleting your account permanently removes your BM, unspent Diamonds, cosmetics and other virtual items, without refund.`,
      ] },
      { h: 'Virtual currencies: BM and Diamonds', p: [
        'Bridge Money (BM) is earned by playing and may also be offered in packs. Diamonds are a premium currency bought with real money. Both are virtual: you receive a limited, personal, non-transferable and revocable licence to use them inside Bridge 125 — not ownership of property.',
        'BM and Diamonds have no cash value. They cannot be exchanged for money or anything of monetary value, redeemed, withdrawn, sold or transferred outside the game, except through the in-game gifting features we provide. Selling or buying accounts, currency or items for real money, inside or outside the game, is not allowed.',
        'Bridge 125 is not gambling. Stake tables, the Lucky Wheel and similar features only use virtual currency that can never be cashed out. Where a feature awards random prizes, the possible prizes are shown in the game and the odds are available from us on request.',
        'We may correct balances that are wrong because of a bug, an obvious pricing error, abuse or a refunded payment.',
      ] },
      { h: 'Purchases', p: [
        'Prices are shown in euros and include VAT. Payments are processed by Stripe; we never see or store your full card details. The contract is concluded when Stripe confirms your payment, and you receive a confirmation by email.',
        'What you buy is delivered to your account straight after payment: Diamonds are credited, and a season pass or cosmetic item is unlocked. If something has not arrived within a few minutes, write to us with your receipt and we will fix it.',
        'A season pass gives the rewards described on its page until the end date shown there; rewards that are not claimed before the season ends may be lost. Cosmetic items are licensed for use in the game for as long as the game is offered.',
      ] },
      { h: 'Your right of withdrawal (EU/EEA and UK consumers)', p: [
        'As a consumer you normally have the right to withdraw from an online purchase within 14 days without giving any reason. For digital content that is not supplied on a physical medium — such as Diamonds, a season pass or cosmetic items — this right ends as soon as delivery has started, provided that you expressly agreed to immediate delivery and acknowledged that you would lose your right of withdrawal (Article 16(m) of Directive 2011/83/EU and the national laws implementing it).',
        'Before every purchase we therefore ask you to tick a box confirming exactly that. Because delivery starts immediately after payment, the right of withdrawal ends at that moment. Your confirmation is recorded with the order and repeated in your order confirmation.',
        `If delivery has not started — for example the Diamonds were never credited — you can still withdraw within 14 days by telling us clearly, for example by email to ${E}. We will then refund you within 14 days, using the same payment method.`,
      ] },
      { h: 'Refunds', p: [
        'Apart from the rights above, purchases are final. But when something is our fault we always put it right: if an item was not delivered, you were charged twice, or it does not work as described, we will deliver it, fix it or refund you.',
        'Bought something by mistake? Write to us within 14 days. If the Diamonds are still unspent, we will usually refund them as a goodwill gesture.',
        'When a payment is refunded or charged back, the Diamonds or items it bought are removed from your account. Abusing refunds or chargebacks can lead to suspension.',
        'Nothing in these terms affects your statutory rights as a consumer, including your remedies for digital content that is faulty or not as described.',
      ] },
      { h: 'Fair play', p: [
        'Bridge 125 has to be fair and fun for everyone. You must not: cheat, or use software, bots or scripts that play for you or reveal hidden information; collude with other players at an online table; exploit bugs instead of reporting them; create several accounts to farm rewards or avoid sanctions; interfere with the app, its traffic or our servers; or harass, threaten or insult other players — including through nicknames, chat, profile photos or video.',
        'To protect fair play we use automated checks of game data (such as impossible play patterns, unusual win rates or reward farming) and player reports. Depending on how serious a breach is, we may warn you, remove rewards gained unfairly, mute your chat, or suspend or close your account. If we close an account for a serious breach, unspent purchases are not refunded unless the law requires it. You can always contest a decision by writing to us.',
      ] },
      { h: 'Your content', p: ['You are responsible for what you share — your nickname, profile photo and chat messages. Do not post anything illegal, hateful, sexual or that infringes the rights of others. You allow us to show this content to other players inside the game. Camera and microphone at tables are optional; they connect you directly with the other players and we do not record them.'] },
      { h: 'Availability and changes', p: ['We work hard to keep Bridge 125 running, but it may sometimes be unavailable, for example during maintenance. We may change or retire features. If we ever stop offering paid features or the game itself, we will tell you at least 30 days in advance and explain what happens to unspent purchases.'] },
      { h: 'Liability', p: ['Nothing in these terms limits liability that cannot be limited by law — for example for death or personal injury caused by negligence, for fraud, or your statutory rights as a consumer. Otherwise we are only liable for foreseeable damage caused by our breach of these terms. Bridge 125 is for private, non-commercial use, and we are not liable for loss of business or profits.'] },
      { h: 'Law and disputes', p: [`These terms are governed by the laws of ${O.law}. If you are a consumer, you also keep the protection of the mandatory laws of the country where you live and may bring a claim before your local courts. Please contact us first — most problems are solved quickly by email.`] },
      { h: 'Changes to these terms', p: ['We may update these terms, for example when we add features. The date at the top shows the current version, and we will tell you in the game before important changes apply. A purchase is always governed by the terms in force when you made it.'] },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'This policy explains what personal data Bridge 125 uses, why, and what your rights are. We collect as little as we can, we never sell your data and we show no ads.',
    sections: [
      { h: 'Who is responsible', p: [`The controller of your personal data is ${O.company}, registration no. ${O.regNo}, ${O.address}. For anything about privacy, write to ${E}.`] },
      { h: 'What we collect', p: [], list: [
        'Guest play — a random player ID, your settings and saved games are kept on your device. When you join an online table, the nickname you choose and your moves are sent to our server so that every player sees the same game.',
        'Account — your email address (to sign you in and for important messages about your account or purchases), your password in hashed form if you set one, nickname, optional profile photo, language and appearance choices, game statistics, levels, achievements, BM and Diamond balances, and owned items.',
        'Purchases — Stripe processes your payment details. We receive and keep the order: what you bought, amount, currency, country (for VAT), date, payment and refund status, and your consent to immediate delivery.',
        'Social features — table chat is relayed to the players at that table; reported messages and the report are stored for moderation. Gifts and tips are recorded for the sender and the receiver.',
        'Usage statistics — the app sends simple first-party events to our database (the "events" table), for example "app opened" or "game finished", together with your language, device type and random player ID. We use them to fix problems and improve the game. We use no third-party analytics, advertising trackers or cross-site cookies.',
        'Security and fair play — technical logs (IP address, browser type, time) kept briefly by our hosting provider, and game data we check for cheating.',
        'Camera and microphone — only if you switch them on at a table. Audio and video go directly between players, or through an encrypted relay when a direct connection is not possible. We do not record or store them.',
      ] },
      { h: 'Why we use it', p: [], list: [
        'To provide the game and your account and to deliver your purchases — performance of our contract with you (Art. 6(1)(b) GDPR).',
        'To keep the game secure and fair, prevent fraud and abuse, and understand how the game is used — our legitimate interests (Art. 6(1)(f) GDPR). We keep this data minimal and pseudonymous.',
        'To keep accounting and tax records of purchases — our legal obligation (Art. 6(1)(c) GDPR).',
        'Camera, microphone and the optional voice download — your consent (Art. 6(1)(a) GDPR), which you can withdraw at any time by switching them off.',
      ] },
      { h: 'Cookies and storage on your device', p: ['Bridge 125 sets no advertising or tracking cookies, so there is no cookie banner. To work, the app keeps the following in your browser’s local storage and cache:'], list: [
        'pikovaya.prefs.v1 — your settings: language, sound, colours, bot level (necessary)',
        'sb-…-auth-token — your Supabase sign-in session, so you stay signed in (necessary; only with an account)',
        'b125.pid — a random player ID for online tables and pseudonymous usage statistics',
        'Saved game, Journey, quests, cosmetics, music, voice and camera preferences, chat mutes — so the game remembers where you left off (functional)',
        'b125-v3 (Cache Storage) — the app’s own files, so it starts fast and works on a poor connection (necessary)',
        'b125-voice-v1 (Cache Storage) — neural voice models, only if you choose to download a voice (functional)',
      ], after: ['Usage statistics are not stored on your device — they are sent to the events table in our database. You can remove everything listed above by clearing the site data for bridge125.com in your browser.'] },
      { h: 'Who else processes data', p: ['We use a small number of trusted providers, bound by data-processing agreements:'], list: [
        'Cloudflare — hosting, content delivery, online tables, the video relay (TURN) and protection against attacks.',
        `Supabase — database, sign-in, sign-in emails and storage of profile photos; our project is hosted in ${O.dataRegion}.`,
        'Stripe — payment processing and fraud prevention. Stripe acts as an independent controller for some payment data under its own privacy policy.',
        'Hugging Face — only if you choose to download a neural voice: your browser fetches the voice model directly from huggingface.co, which sees your IP address.',
        'Google — the app may use Google’s public STUN server to set up video connections between players; it sees your IP address.',
      ], after: ['Some providers are based outside the EU/EEA. Where data leaves the EU/EEA, it is protected by the EU–US Data Privacy Framework or the European Commission’s Standard Contractual Clauses.'] },
      { h: 'How long we keep it', p: [`Account data: until you delete your account, then within 30 days. Purchase and tax records: as long as accounting and tax law requires (${O.taxRetention}). Usage statistics: up to 24 months, then deleted or aggregated. Chat reports: up to 12 months. Online table state: deleted soon after the table closes. Data on your device: until you clear it.`] },
      { h: 'Deleting your account', p: [`Use Profile → Delete my account, or email ${E} from the address linked to your account. Within 30 days we delete your profile, statistics, balances, items, photo and history. We keep only what the law requires (such as purchase records) and statistics that no longer identify you.`] },
      { h: 'Your rights', p: [`Under the GDPR you can access your data and get a copy, correct it, have it deleted, restrict or object to processing based on legitimate interests, receive it in a portable format, and withdraw consent at any time. Write to ${E} — we reply within one month. You may also complain to a data-protection authority: ${O.authority}, or the authority where you live.`] },
      { h: 'Age', p: ['Bridge 125 is for players aged 16 and over. We do not knowingly collect data from children under 16. If you believe a child has given us personal data, contact us and we will delete it.'] },
      { h: 'Security', p: ['Data is encrypted in transit (HTTPS), access to our database is restricted and protected by row-level security, and payment card data never touches our servers.'] },
      { h: 'Changes', p: ['When this policy changes we update the date above, and we tell you in the game about important changes.'] },
    ],
  },
};

const lv: Record<LegalKind, LegalText> = {
  terms: {
    title: 'Lietošanas noteikumi',
    intro: `Šie noteikumi ir līgums starp tevi un ${O.company} — Bridge 125 (bridge125.com) uzturētāju. Lūdzu, izlasi tos, īpaši daļas par pirkumiem, virtuālajām valūtām un atteikuma tiesībām. Spēlējot Bridge 125, tu tiem piekrīti.`,
    sections: [
      { h: 'Kas mēs esam', p: [`Bridge 125 uztur ${O.company}, reģistrācijas Nr. ${O.regNo}, PVN Nr. ${O.vatNo}, juridiskā adrese: ${O.address}. Ar mums vienmēr vari sazināties: ${E}.`] },
      { h: 'Spēle', p: [
        'Bridge 125 ir kāršu spēle izklaidei. Pamatspēle — spēlēšana pret botiem un ar citiem cilvēkiem tiešsaistē — ir bez maksas. Dažus papildinājumus, piemēram, dimantus, sezonas caurlaidi vai kosmētiskus priekšmetus, var nopirkt. Nekas, ko tu nopērc, nemaina izdalītās kārtis vai tavas izredzes uzvarēt.',
        'Mēs nepārtraukti uzlabojam spēli, tāpēc funkcijas, saturs un cenas var mainīties. Mēs neatņemsim to, par ko tu jau esi samaksājis, izņemot šajos noteikumos aprakstītos gadījumus.',
      ] },
      { h: 'Minimālais vecums', p: [
        'Lai lietotu Bridge 125, tev jābūt vismaz 16 gadus vecam.',
        'Ja tev vēl nav 18 gadu, pirkumus drīksti veikt tikai ar vecāku vai likumiskā aizbildņa atļauju, kurš tavā vārdā piekrīt šiem noteikumiem. Ja nepilngadīgais veicis pirkumu bez atļaujas, sazinies ar mums, un mēs to godprātīgi izskatīsim.',
      ] },
      { h: 'Tavs konts', p: [
        'Tu vari spēlēt kā viesis. Bezmaksas konts saglabā tavu progresu, bilances un pirkumus visās ierīcēs. Sargā piekļuvi savam e-pastam — ar to tu piesakies — un nedalies ar kontu, nepārdod un nenodod to citiem. Tu atbildi par darbībām savā kontā, ja vien tās nav notikušas mūsu vainas dēļ.',
        `Kontu vari jebkurā laikā dzēst sadaļā Profils → Dzēst manu kontu vai rakstot uz ${E}. Kontu un tā datus izdzēšam 30 dienu laikā, izņemot ierakstus, kas mums jāglabā saskaņā ar likumu (sk. Privātuma politiku). Dzēšot kontu, neatgriezeniski tiek dzēsti tavi BM, neiztērētie dimanti, kosmētika un citi virtuālie priekšmeti — bez kompensācijas.`,
      ] },
      { h: 'Virtuālās valūtas: BM un dimanti', p: [
        'Bridge Money (BM) nopelni spēlējot, un tos var piedāvāt arī paciņās. Dimanti ir premium valūta, ko pērk par īstu naudu. Abas ir virtuālas: tu saņem ierobežotu, personisku, nenododamu un atsaucamu licenci tās izmantot Bridge 125 — nevis īpašumtiesības.',
        'BM un dimantiem nav naudas vērtības. Tos nevar apmainīt pret naudu vai ko citu ar naudas vērtību, izņemt, pārdot vai nodot ārpus spēles, izņemot ar spēlē paredzētajām dāvināšanas funkcijām. Kontu, valūtas vai priekšmetu pirkšana vai pārdošana par īstu naudu — spēlē vai ārpus tās — nav atļauta.',
        'Bridge 125 nav azartspēle. Likmju galdos, Laimes ratā un līdzīgās funkcijās izmanto tikai virtuālu valūtu, ko nekad nevar izņemt naudā. Ja funkcija piešķir nejaušas balvas, iespējamās balvas ir redzamas spēlē, bet laimesta iespējas pēc pieprasījuma sniegsim mēs.',
        'Mēs varam labot bilances, kas ir nepareizas kļūdas, acīmredzamas cenas kļūdas, ļaunprātīgas izmantošanas vai atmaksāta maksājuma dēļ.',
      ] },
      { h: 'Pirkumi', p: [
        'Cenas norādītas eiro, un tajās ir iekļauts PVN. Maksājumus apstrādā Stripe; mēs nekad neredzam un neglabājam tavas kartes pilnos datus. Līgums tiek noslēgts, kad Stripe apstiprina maksājumu, un apstiprinājumu tu saņem e-pastā.',
        'Nopirktais tiek piegādāts tavā kontā uzreiz pēc samaksas: dimanti tiek ieskaitīti, sezonas caurlaide vai kosmētika — atbloķēta. Ja pēc dažām minūtēm nekas nav pienācis, raksti mums, pievienojot čeku, un mēs to salabosim.',
        'Sezonas caurlaide dod tās lapā aprakstītās balvas līdz tur norādītajam beigu datumam; balvas, kas nav saņemtas līdz sezonas beigām, var tikt zaudētas. Kosmētiskie priekšmeti ir licencēti lietošanai spēlē tik ilgi, kamēr spēle tiek piedāvāta.',
      ] },
      { h: 'Atteikuma tiesības (ES/EEZ un Apvienotās Karalistes patērētājiem)', p: [
        'Patērētājam parasti ir tiesības 14 dienu laikā bez iemesla atteikties no tiešsaistē noslēgta pirkuma. Digitālajam saturam, kas netiek piegādāts materiālā datu nesējā — piemēram, dimantiem, sezonas caurlaidei vai kosmētikai —, šīs tiesības beidzas, tiklīdz piegāde ir sākusies, ja tu esi skaidri piekritis tūlītējai piegādei un apliecinājis, ka zini, ka zaudēsi atteikuma tiesības (Direktīvas 2011/83/ES 16. panta m) punkts un to ieviešošie valstu likumi).',
        'Tāpēc pirms katra pirkuma mēs lūdzam atzīmēt rūtiņu, kas tieši to apliecina. Tā kā piegāde sākas uzreiz pēc samaksas, atteikuma tiesības beidzas tajā pašā brīdī. Tavs apliecinājums tiek saglabāts kopā ar pasūtījumu un atkārtots pasūtījuma apstiprinājumā.',
        `Ja piegāde nav sākusies — piemēram, dimanti nekad netika ieskaitīti —, tu joprojām vari 14 dienu laikā atkāpties no līguma, skaidri par to paziņojot, piemēram, rakstot uz ${E}. Tādā gadījumā naudu atmaksāsim 14 dienu laikā, izmantojot to pašu maksājuma veidu.`,
      ] },
      { h: 'Atmaksa', p: [
        'Izņemot iepriekš minētās tiesības, pirkumi ir galīgi. Taču, ja vaina ir mūsu pusē, mēs vienmēr to izlabojam: ja pirkums netika piegādāts, nauda tika noņemta divreiz vai prece nedarbojas, kā aprakstīts, mēs to piegādāsim, salabosim vai atmaksāsim naudu.',
        'Nopirki kaut ko kļūdas pēc? Raksti mums 14 dienu laikā. Ja dimanti vēl nav iztērēti, parasti tos atmaksājam kā labās gribas žestu.',
        'Ja maksājums tiek atmaksāts vai apstrīdēts bankā, par to nopirktie dimanti vai priekšmeti tiek noņemti no tava konta. Ļaunprātīga atmaksu vai apstrīdējumu izmantošana var novest pie konta bloķēšanas.',
        'Nekas šajos noteikumos neierobežo tavas patērētāja likumīgās tiesības, tostarp tiesiskās aizsardzības līdzekļus, ja digitālais saturs ir bojāts vai neatbilst aprakstam.',
      ] },
      { h: 'Godīga spēle', p: [
        'Bridge 125 jābūt godīgai un patīkamai visiem. Aizliegts: krāpties vai izmantot programmas, botus vai skriptus, kas spēlē tavā vietā vai atklāj slēptu informāciju; sadarboties ar citiem spēlētājiem pie online galda; izmantot kļūdas, nevis par tām ziņot; veidot vairākus kontus, lai krātu balvas vai izvairītos no sankcijām; iejaukties lietotnes darbībā, tās datplūsmā vai mūsu serveros; aizskart, draudēt vai apvainot citus spēlētājus — arī ar segvārdiem, čatā, profila foto vai video.',
        'Lai sargātu godīgu spēli, mēs automātiski pārbaudām spēļu datus (piemēram, neiespējamus gājienu modeļus, neparasti augstu uzvaru īpatsvaru vai balvu krāšanu) un izskatām spēlētāju ziņojumus. Atkarībā no pārkāpuma smaguma mēs varam tevi brīdināt, noņemt negodīgi iegūtās balvas, izslēgt čatu, uz laiku bloķēt vai slēgt kontu. Ja kontu slēdzam par smagu pārkāpumu, neiztērētie pirkumi netiek atmaksāti, ja vien to neprasa likums. Lēmumu vienmēr vari apstrīdēt, rakstot mums.',
      ] },
      { h: 'Tavs saturs', p: ['Tu atbildi par to, ar ko dalies, — segvārdu, profila foto un čata ziņām. Nepublicē neko nelikumīgu, naidpilnu, seksuāla rakstura vai tādu, kas pārkāpj citu tiesības. Tu atļauj mums rādīt šo saturu citiem spēlētājiem spēlē. Kamera un mikrofons pie galda nav obligāti; tie savieno tevi tieši ar citiem spēlētājiem, un mēs tos neierakstām.'] },
      { h: 'Pieejamība un izmaiņas', p: ['Mēs darām visu, lai Bridge 125 darbotos, taču reizēm tā var nebūt pieejama, piemēram, apkopes laikā. Mēs varam mainīt vai pārtraukt funkcijas. Ja kādreiz pārtrauksim piedāvāt maksas funkcijas vai pašu spēli, mēs par to paziņosim vismaz 30 dienas iepriekš un paskaidrosim, kas notiks ar neiztērētajiem pirkumiem.'] },
      { h: 'Atbildība', p: ['Nekas šajos noteikumos neierobežo atbildību, ko nevar ierobežot ar likumu, — piemēram, par nāvi vai miesas bojājumiem nolaidības dēļ, par krāpšanu vai tavas patērētāja likumīgās tiesības. Citos gadījumos mēs atbildam tikai par paredzamiem zaudējumiem, kas radušies, mums pārkāpjot šos noteikumus. Bridge 125 ir paredzēta privātai, nekomerciālai lietošanai, un mēs neatbildam par uzņēmējdarbības vai peļņas zaudējumiem.'] },
      { h: 'Piemērojamie likumi un strīdi', p: [`Šiem noteikumiem piemēro ${O.law} likumus. Ja esi patērētājs, tev saglabājas arī tavas dzīvesvietas valsts obligāto likumu aizsardzība, un tu vari vērsties savas valsts tiesā. Lūdzu, vispirms sazinies ar mums — lielākā daļa problēmu ātri atrisinās e-pastā.`] },
      { h: 'Noteikumu izmaiņas', p: ['Mēs varam atjaunināt šos noteikumus, piemēram, pievienojot jaunas funkcijas. Datums augšā rāda aktuālo versiju, un par būtiskām izmaiņām paziņosim spēlē, pirms tās stāsies spēkā. Pirkumam vienmēr piemēro noteikumus, kas bija spēkā tā veikšanas brīdī.'] },
    ],
  },
  privacy: {
    title: 'Privātuma politika',
    intro: 'Šī politika skaidro, kādus personas datus Bridge 125 izmanto, kāpēc un kādas ir tavas tiesības. Mēs vācam pēc iespējas mazāk datu, nekad tos nepārdodam un nerādām reklāmas.',
    sections: [
      { h: 'Kas ir pārzinis', p: [`Tavu personas datu pārzinis ir ${O.company}, reģistrācijas Nr. ${O.regNo}, ${O.address}. Visos privātuma jautājumos raksti uz ${E}.`] },
      { h: 'Ko mēs vācam', p: [], list: [
        'Spēle kā viesim — nejaušs spēlētāja ID, tavi iestatījumi un saglabātās spēles glabājas tavā ierīcē. Kad pievienojies online galdam, tevis izvēlētais segvārds un gājieni tiek nosūtīti uz mūsu serveri, lai visi spēlētāji redzētu vienu un to pašu spēli.',
        'Konts — e-pasta adrese (pieteikšanās un svarīgu ziņu par kontu vai pirkumiem sūtīšanai), parole jaucējkoda veidā, ja tādu iestati, segvārds, profila foto (ja pievieno), valodas un izskata izvēle, spēļu statistika, līmeņi, sasniegumi, BM un dimantu bilances un tev piederošie priekšmeti.',
        'Pirkumi — maksājuma datus apstrādā Stripe. Mēs saņemam un glabājam pasūtījumu: ko nopirki, summu, valūtu, valsti (PVN aprēķinam), datumu, maksājuma un atmaksas statusu un tavu piekrišanu tūlītējai piegādei.',
        'Sociālās funkcijas — galda čata ziņas tiek pārsūtītas spēlētājiem pie šī galda; ziņas, par kurām ziņots, un pats ziņojums tiek glabāti moderēšanai. Dāvanas un dzeramnauda tiek reģistrētas sūtītājam un saņēmējam.',
        'Lietošanas statistika — lietotne sūta vienkāršus pirmās puses notikumus uz mūsu datubāzi (tabula “events”), piemēram, “lietotne atvērta” vai “spēle pabeigta”, kopā ar valodu, ierīces veidu un nejaušo spēlētāja ID. Tos izmantojam kļūdu labošanai un spēles uzlabošanai. Mēs neizmantojam trešo pušu analītiku, reklāmas izsekotājus vai starpvietņu sīkdatnes.',
        'Drošība un godīga spēle — tehniskie žurnāli (IP adrese, pārlūka veids, laiks), ko īslaicīgi glabā mūsu hostinga pakalpojumu sniedzējs, un spēļu dati, ko pārbaudām krāpšanās novēršanai.',
        'Kamera un mikrofons — tikai tad, ja tos ieslēdz pie galda. Audio un video plūst tieši starp spēlētājiem vai caur šifrētu retranslatoru, ja tiešs savienojums nav iespējams. Mēs tos neierakstām un neglabājam.',
      ] },
      { h: 'Kāpēc mēs tos izmantojam', p: [], list: [
        'Lai nodrošinātu spēli, tavu kontu un piegādātu pirkumus, — līguma izpilde (VDAR 6. panta 1. punkta b) apakšpunkts).',
        'Lai spēle būtu droša un godīga, novērstu krāpšanu un ļaunprātīgu izmantošanu un saprastu, kā spēle tiek lietota, — mūsu leģitīmās intereses (VDAR 6. panta 1. punkta f) apakšpunkts). Šos datus turam minimālus un pseidonimizētus.',
        'Lai glabātu pirkumu grāmatvedības un nodokļu uzskaiti, — juridisks pienākums (VDAR 6. panta 1. punkta c) apakšpunkts).',
        'Kamera, mikrofons un neobligātā balss lejupielāde — tava piekrišana (VDAR 6. panta 1. punkta a) apakšpunkts), ko vari jebkurā laikā atsaukt, tos izslēdzot.',
      ] },
      { h: 'Sīkdatnes un dati tavā ierīcē', p: ['Bridge 125 neizmanto reklāmas vai izsekošanas sīkdatnes, tāpēc sīkdatņu paziņojuma nav. Lai darbotos, lietotne tava pārlūka lokālajā krātuvē un kešatmiņā glabā:'], list: [
        'pikovaya.prefs.v1 — tavi iestatījumi: valoda, skaņa, krāsas, bota līmenis (nepieciešams)',
        'sb-…-auth-token — tava Supabase pieteikšanās sesija, lai tu paliktu pieteicies (nepieciešams; tikai ar kontu)',
        'b125.pid — nejaušs spēlētāja ID online galdiem un pseidonimizētai lietošanas statistikai',
        'Saglabātā spēle, Ceļojums, uzdevumi, kosmētika, mūzikas, balss un kameras iestatījumi, apklusinātie čatā — lai spēle atcerētos, kur tu paliki (funkcionāli)',
        'b125-v3 (Cache Storage) — lietotnes faili, lai tā ātri atvērtos un darbotos arī ar vāju savienojumu (nepieciešams)',
        'b125-voice-v1 (Cache Storage) — neironu balss modeļi, tikai ja izvēlies lejupielādēt balsi (funkcionāli)',
      ], after: ['Lietošanas statistika tavā ierīcē netiek glabāta — tā tiek nosūtīta uz mūsu datubāzes tabulu “events”. Visu iepriekš minēto vari izdzēst, pārlūkā notīrot vietnes bridge125.com datus.'] },
      { h: 'Kas vēl apstrādā datus', p: ['Mēs izmantojam nedaudzus uzticamus pakalpojumu sniedzējus, kurus saista datu apstrādes līgumi:'], list: [
        'Cloudflare — hostings, satura piegāde, online galdi, video retranslators (TURN) un aizsardzība pret uzbrukumiem.',
        `Supabase — datubāze, pieteikšanās, pieteikšanās e-pasti un profila foto glabāšana; mūsu projekts tiek uzturēts: ${O.dataRegion}.`,
        'Stripe — maksājumu apstrāde un krāpšanas novēršana. Daļai maksājumu datu Stripe ir patstāvīgs pārzinis saskaņā ar savu privātuma politiku.',
        'Hugging Face — tikai ja izvēlies lejupielādēt neironu balsi: tavs pārlūks lejupielādē balss modeli tieši no huggingface.co, kas redz tavu IP adresi.',
        'Google — lietotne var izmantot Google publisko STUN serveri video savienojumu izveidei starp spēlētājiem; tas redz tavu IP adresi.',
      ], after: ['Daži pakalpojumu sniedzēji atrodas ārpus ES/EEZ. Ja dati tiek nodoti ārpus ES/EEZ, tos aizsargā ES–ASV Datu privātuma regulējums vai Eiropas Komisijas standarta līguma klauzulas.'] },
      { h: 'Cik ilgi glabājam', p: [`Konta dati: līdz konta dzēšanai, pēc tam — 30 dienu laikā. Pirkumu un nodokļu ieraksti: tik ilgi, cik to prasa grāmatvedības un nodokļu likumi (${O.taxRetention}). Lietošanas statistika: līdz 24 mēnešiem, pēc tam tā tiek dzēsta vai apkopota. Ziņojumi par čatu: līdz 12 mēnešiem. Online galda stāvoklis: tiek dzēsts drīz pēc galda slēgšanas. Dati tavā ierīcē: līdz tu tos notīri.`] },
      { h: 'Konta dzēšana', p: [`Izmanto Profils → Dzēst manu kontu vai raksti uz ${E} no e-pasta adreses, kas piesaistīta kontam. 30 dienu laikā izdzēsīsim tavu profilu, statistiku, bilances, priekšmetus, foto un vēsturi. Paturam tikai to, ko prasa likums (piemēram, pirkumu ierakstus), un statistiku, kas tevi vairs neidentificē.`] },
      { h: 'Tavas tiesības', p: [`Saskaņā ar VDAR tu vari piekļūt saviem datiem un saņemt to kopiju, tos labot, dzēst, ierobežot apstrādi vai iebilst pret apstrādi, kuras pamatā ir leģitīmās intereses, saņemt datus pārnesamā formātā un jebkurā laikā atsaukt piekrišanu. Raksti uz ${E} — atbildēsim viena mēneša laikā. Tu vari iesniegt sūdzību arī datu aizsardzības iestādē: ${O.authority} vai savas dzīvesvietas iestādē.`] },
      { h: 'Vecums', p: ['Bridge 125 ir paredzēta spēlētājiem no 16 gadu vecuma. Mēs apzināti nevācam datus par bērniem, kas jaunāki par 16 gadiem. Ja uzskati, ka bērns mums sniedzis personas datus, sazinies ar mums, un mēs tos izdzēsīsim.'] },
      { h: 'Drošība', p: ['Dati tiek šifrēti pārsūtīšanas laikā (HTTPS), piekļuve mūsu datubāzei ir ierobežota un aizsargāta ar rindu līmeņa drošību, un maksājumu karšu dati nekad nenonāk mūsu serveros.'] },
      { h: 'Izmaiņas', p: ['Kad šī politika mainās, mēs atjaunojam datumu augšā un par būtiskām izmaiņām paziņojam spēlē.'] },
    ],
  },
};

export const LEGAL_DOCS: { en: Record<LegalKind, LegalText>; lv: Record<LegalKind, LegalText> } = { en, lv };

/** The text shown for a UI language: Latvian has its own translation, every other language reads the English original. */
export const legalText = (kind: LegalKind, lang: Lang): LegalText => (lang === 'lv' ? lv : en)[kind];

/** Shown above the text in every language except English: which version is binding. */
export const BINDING_NOTE: Partial<Record<Lang, string>> = {
  lv: 'Šis ir tulkojums. Neskaidrību gadījumā noteicošā ir angļu valodas versija.',
  ru: 'Этот документ доступен на английском языке. Юридически обязывающей является английская версия.',
  uk: 'Цей документ доступний англійською мовою. Юридично обов’язковою є англійська версія.',
  lt: 'Šis dokumentas pateikiamas anglų kalba. Privaloma yra angliška versija.',
  et: 'See dokument on saadaval inglise keeles. Siduv on ingliskeelne versioon.',
  pl: 'Ten dokument jest dostępny w języku angielskim. Wiążąca jest wersja angielska.',
  de: 'Dieses Dokument ist auf Englisch verfügbar. Verbindlich ist die englische Fassung.',
  be: 'Гэты дакумент даступны на англійскай мове. Юрыдычна абавязковай з’яўляецца англійская версія.',
  kk: 'Бұл құжат ағылшын тілінде қолжетімді. Заңды күші бар нұсқа — ағылшын тіліндегі нұсқа.',
  uz: 'Ushbu hujjat ingliz tilida taqdim etilgan. Ingliz tilidagi versiya yuridik kuchga ega.',
  az: 'Bu sənəd ingilis dilində təqdim olunur. Hüquqi qüvvəyə malik olan ingilis dilindəki versiyadır.',
  ka: 'ეს დოკუმენტი ხელმისაწვდომია ინგლისურ ენაზე. იურიდიული ძალა აქვს ინგლისურ ვერსიას.',
  hy: 'Այս փաստաթուղթը հասանելի է անգլերենով։ Իրավաբանորեն պարտադիր է անգլերեն տարբերակը։',
  ro: 'Acest document este disponibil în limba engleză. Versiunea în limba engleză este cea obligatorie.',
  bg: 'Този документ е достъпен на английски език. Обвързваща е английската версия.',
  es: 'Este documento está disponible en inglés. La versión en inglés es la vinculante.',
};
