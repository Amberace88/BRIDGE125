import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

const ro: LocalePack = {
  dict: {
    tagline: 'Jocul de cărți Bridge', play: 'Joacă', vsBots: 'Joacă cu boții', opponents: 'Adversari', level: 'Nivelul botului',
    easy: 'Ușor', normal: 'Normal', online: 'Online cu prietenii', soon: 'În curând', howToPlay: 'Cum se joacă', profile: 'Profil',
    settings: 'Setări', language: 'Limbă', sound: 'Sunet', on: 'Pornit', off: 'Oprit', guest: 'Vizitator', signIn: 'Creează cont sau conectează-te',
    signOut: 'Deconectare', emailPlaceholder: 'E-mailul tău', sendLink: 'Trimite link de conectare',
    linkSent: e => `Verifică ${e} și deschide linkul ca să te conectezi.`, personalize: 'Personalizează',
    personalizeLocked: 'Creează un cont gratuit ca să-ți alegi culoarea și masa.', accent: 'Culoare de accent', background: 'Masă',
    yourName: 'Numele jucătorului', save: 'Salvează', saved: 'Salvat', back: 'Înapoi', close: 'Închide',
    yourTurn: 'E rândul tău', waiting: n => `${n} se gândește`, deckLeft: n => `${n} în pachet`, points: n => `${n} pct.`,
    draw: 'Trage', pass: 'Pas', take: n => `Ia ${n}`, transfer6S: 'Pasează cu 6♠', playN: n => `Joacă ${n}`, comboQ6: 'Q♠ + 6♠',
    chooseSuit: 'Cere o culoare', coverSix: 'Acoperă cartea de 6', suitNames: { S: 'Pică', C: 'Treflă', H: 'Inimă roșie', D: 'Romb' },
    ev: {
      queen: w => `Dama de pică! ${w} ia 5`, queenSub: 'Doar dacă nu are 6♠', transfer: w => `6♠! ${w} ia 6`,
      eight: (w, n) => `${w} ia ${n}`, seven: (w, n) => `${w} ia ${n}`, skip: w => `${w} stă o tură`,
      kings: 'Patru popi!', kingsSub: 'Scorul tuturor revine la zero', reset125: w => `${w}: fix 125 — înapoi la 0`,
      suit: (_w, s) => `Culoare cerută: ${s}`, reshuffle: 'Teancul a fost amestecat în pachet',
      youTake: n => `Iei ${n}`, youSkip: 'Stai o tură', queenYou: 'Dama de pică! Iei 5', transferYou: '6♠! Iei 6 și acoperi',
    },
    round: n => `Runda ${n}`, roundWon: w => `${w} a rămas fără cărți`, roundWonYou: 'Ai rămas fără cărți!',
    jacksFinish: n => `Final cu ${n === 1 ? 'un valet' : `${n} valeți`} — ×${n + 1}`,
    colPlayer: 'Jucător', colHand: 'În mână', colTotal: 'Total', burned: 'Fix 125 — ars la 0', nextRound: 'Runda următoare',
    rematch: 'Revanșă', home: 'Meniu', youWin: 'Ai câștigat!', winnerIs: w => `Câștigă ${w}`, gameOverSub: 'Cineva a depășit 130 — câștigă scorul cel mai mic',
    you: 'Tu', rulesTitle: 'Cum se joacă',
    rules: [
      { h: 'Scopul', p: 'Scapă de cărți și adună cât mai puține puncte. Când cineva ajunge la 130, jocul se termină și câștigă scorul cel mai mic. Dacă ajungi fix la 125, scorul tău arde înapoi la 0.' },
      { h: 'Rândul tău', p: 'Joacă o carte de aceeași culoare sau de aceeași valoare cu cea de deasupra. Poți juca deodată mai multe cărți de aceeași valoare. Nu ai ce juca? Trage una, apoi joac-o sau dă pas.' },
      { h: 'As', p: 'Următorul jucător stă o tură.' },
      { h: '6', p: 'Trebuie acoperit: pune imediat altă carte peste el. Nu poți termina cu un 6.' },
      { h: '7', p: 'Următorul jucător trage 1 carte și joacă mai departe.' },
      { h: '8', p: 'Următorul trage 2 și stă o tură — dacă nu răspunde cu propriul 8, pasând mai departe 4, 6 sau 8 cărți.' },
      { h: '9', p: 'Se joacă pe orice carte, dar nu poți cere culoarea.' },
      { h: 'Valet', p: 'Se joacă pe orice, iar tu ceri culoarea. Termină runda cu 1–4 valeți și punctele adversarilor se înmulțesc de la ×2 la ×5.' },
      { h: 'Dama de pică', p: 'Următorul trage 5 și stă o tură. Ai 6♠? Răspunde cu el — următorul trage 6 și trebuie să-l acopere.' },
      { h: 'Popii', p: 'Patru popi la rând pe teanc aduc scorul tuturor la zero.' },
      { h: 'Puncte', p: 'As 15 · popă, damă, valet, 10 — câte 10 · 6♠ — 5 · celelalte — 0.' },
    ],
    continueGame: 'Continuă jocul', menuQuit: 'Părăsește jocul', botNames: ['Andrei', 'Ioana', 'Mihai'],
  },

  extra: {
    nav: { howToPlay: 'Cum se joacă', signIn: 'Conectare', play: 'Joacă' },
    heroLine: 'Clasicul joc de cărți Bridge — dama de pică, valeți ×5 și celebrul 125.',
    features: ['Joacă gratuit în browser', 'Disponibil în 17 limbi', 'Se instalează ca o aplicație'],
    playFriends: 'Joacă cu prietenii',
    guide: {
      title: 'Cum se joacă', intro: 'Scapă de cărți, ferește-te de penalizări și ține scorul jos. Tot ce contează, în cinci minute.',
      tabs: { basics: 'Bazele', special: 'Cărți speciale', combos: 'Combinații', scoring: 'Punctaj' },
      steps: [
        { h: 'Potrivește cartea de sus', p: 'Joacă o carte de aceeași culoare sau de aceeași valoare. Mai multe cărți de aceeași valoare pot fi jucate împreună.' },
        { h: 'Golește-ți mâna', p: 'Primul care scapă de cărți încheie runda. Ceilalți numără punctele rămase în mână.' },
        { h: 'Ține scorul jos', p: 'Punctele se adună de la o rundă la alta. Când cineva ajunge la 130, jocul se termină și câștigă scorul cel mai mic.' },
      ],
      tags: { A: 'Stai o tură', '6': 'Acoperă', '7': '+1', '8': '+2, lanț', '9': 'Joker', J: 'Joker + culoare', QS: '+5', K: 'Reset' },
      combos: [
        { h: 'Dama de pică, pasată', p: 'Te-a lovit Q♠? Răspunde cu 6♠ și următorul trage 6 — și trebuie să-l acopere.' },
        { h: 'Lanțul de opturi', p: 'Fiecare 8 adaugă două cărți. Răspunde la un 8 cu al tău și pasează mai departe 4, 6 sau 8.' },
        { h: 'Final cu valeți', p: 'Ieși cu 1–4 valeți deodată și punctele fiecărui adversar se înmulțesc de la ×2 la ×5.' },
      ],
      pointsTitle: 'Punctele cărților rămase în mână la finalul rundei',
      line: { start: 'Start', burn: 'Fix 125 → înapoi la 0', end: '130+ → final de joc' },
      example: 'Exemplu', youCanPlay: 'Poți juca', cta: 'Joacă o partidă de antrenament',
    },
    auth: {
      title: 'Salvează-ți progresul', sub: 'Cont gratuit în câteva secunde. Fără parolă — îți trimitem un cod pe e-mail.',
      benefits: ['Masa și culorile tale', 'Victorii și partide salvate pe orice dispozitiv', 'Pregătit pentru ligi și turnee'],
      email: 'E-mail', cont: 'Trimite codul', hint: 'Continuând, promiți să joci corect și să te distrezi.',
      codeTitle: 'Introdu codul', codeSub: e => `Am trimis un cod din 6 cifre la ${e}`, verify: 'Conectează-te', resend: 'Trimite un cod nou',
      resendIn: s => `Cod nou în ${s} s`, wrong: 'Codul nu a mers. Verifică-l sau cere unul nou.', change: 'Folosește alt e-mail',
      welcome: 'Ești înăuntru!', orLink: 'Ai primit un link în loc de cod? Deschide-l pe acest dispozitiv.', stats: { games: 'Partide', wins: 'Victorii', bm: 'Bridge Money' },
    },
    room: {
      create: 'Creează o masă', join: 'Intră', code: 'Codul mesei', enterCode: 'Introdu codul', invite: 'Invită prieteni', copied: 'Link copiat',
      waiting: 'Așteptăm jucători…', addBot: 'Adaugă bot', removeBot: 'Scoate botul', start: 'Începe jocul', needTwo: 'E nevoie de cel puțin 2 jucători',
      host: 'Gazdă', waitHost: 'Așteptăm ca gazda să înceapă', connecting: 'Se conectează…', reconnecting: 'Se reconectează…',
      full: 'Masa e plină', notFound: 'Masa nu a fost găsită', leave: 'Părăsește masa', seatsOf: (n, m) => `${n} din ${m} locuri`,
      shareText: 'Vino la masa mea de Bridge 125', online: 'online', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'Joacă online acum', sub: 'Te potrivim cu jucători reali', title: 'Joc rapid', finding: 'Căutăm jucători…',
      startsIn: s => `Începe în ${s} s`, startNow: 'Începe acum', botsFill: 'Când expiră timpul, locurile libere sunt ocupate de boți.',
      error: 'Serverul nu răspunde. Încearcă din nou.', starting: 'Se împart cărțile…',
    },
    lb: {
      title: 'Clasament', sub: 'Cei mai buni jucători după victorii', wins: 'Victorii', games: 'Partide', winRate: '% victorii',
      empty: 'Încă nu sunt partide în clasament — fii primul!', you: 'Tu', signIn: 'Conectează-te ca să intri în clasament', error: 'Clasamentul nu este disponibil acum.', open: 'Clasament',
    },
    legal: { privacy: 'Confidențialitate', terms: 'Termeni', updated: 'Ultima actualizare', contact: 'Contact', agree: ['Continuând, accepți', 'Termenii', 'și', 'Politica de confidențialitate'] },
    install: {
      button: 'Instalează', title: 'Instalează Bridge 125', sub: 'Joacă de pe ecranul principal ca într-o aplicație adevărată — gratuit, fără magazin de aplicații.',
      benefits: ['Se deschide pe tot ecranul dintr-o atingere', 'Joacă cu boții chiar și offline', 'Mereu cea mai nouă versiune, nimic de actualizat'],
      cta: 'Instalează acum', done: 'Instalat! Găsești Bridge 125 pe ecranul principal.', later: 'Nu acum', banner: 'Ia aplicația — gratuit',
      ios: ['Atinge butonul „Partajează”', 'Alege „Adaugă pe ecranul principal”', 'Atinge „Adaugă” — gata!'],
      iosOther: 'Pe iPhone și iPad, deschide bridge125.com în Safari ca să-l instalezi.',
      android: ['Deschide meniul browserului ⋮', 'Atinge „Instalează aplicația” sau „Adaugă pe ecranul de pornire”', 'Confirmă — gata!'],
      desktop: ['În Chrome sau Edge, apasă pictograma de instalare din bara de adrese', 'Sau meniul ⋮ → „Instalează Bridge 125”', 'Se deschide în propria fereastră, ca orice aplicație'],
      qr: 'Scanează cu camera telefonului ca să-l instalezi pe telefon', free: 'Gratuit · sub 1 MB · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Conectare', tabUp: 'Creează cont', titleIn: 'Bine ai revenit', subIn: 'Conectează-te ca să-ți păstrezi statisticile, BM și stilul mesei.',
      titleUp: 'Alătură-te Bridge 125', subUp: 'Cont gratuit în 20 de secunde. Progresul te urmează pe orice dispozitiv.',
      email: 'E-mail', password: 'Parolă', name: 'Poreclă', namePh: 'ex.: Eddy', nameHint: 'Apare la masă și în clasament', show: 'Arată', hide: 'Ascunde',
      forgot: 'Ai uitat parola?', signIn: 'Conectează-te', signUp: 'Creează cont', or: 'sau', useLink: 'Trimite-mi un link de conectare', usePassword: 'Conectează-te cu parola',
      noAccount: 'Ești nou aici?', haveAccount: 'Ai deja cont?', pwHint: 'Cel puțin 8 caractere', strength: ['Prea scurtă', 'Slabă', 'Bună', 'Puternică'],
      forgotTitle: 'Resetează parola', forgotSub: 'Introdu e-mailul și îți trimitem un link pentru o parolă nouă.', sendReset: 'Trimite linkul',
      resetSent: e => `Verifică ${e} — deschide linkul ca să alegi o parolă nouă.`, back: 'Înapoi la conectare',
      newTitle: 'Setează o parolă nouă', newSub: 'Alege o parolă nouă pentru contul tău.', newPw: 'Parolă nouă', repeatPw: 'Repetă parola', savePw: 'Salvează parola',
      pwSaved: 'Parola a fost salvată — te-ai conectat.', mismatch: 'Parolele nu coincid',
      welcomeNew: n => `Bine ai venit la masă, ${n}!`, welcomeBack: 'Ne bucurăm să te revedem!',
      err: {
        badEmail: 'Introdu o adresă de e-mail validă', short: 'Parola trebuie să aibă cel puțin 8 caractere', wrong: 'E-mail sau parolă greșită',
        exists: 'Există deja un cont cu acest e-mail — conectează-te.', weak: 'Alege o parolă mai puternică', notConfirmed: 'Confirmă mai întâi adresa de e-mail',
        tooMany: 'Prea multe încercări — așteaptă un minut', network: 'Fără conexiune — verifică internetul', generic: 'Ceva n-a mers. Încearcă din nou.',
      },
    },
    prof: {
      tabs: { me: 'Profil', look: 'Stil', account: 'Cont' }, since: d => `Membru din ${d}`, winRate: '% victorii', avatar: 'Avatar', saved: 'Salvat',
      preview: 'Previzualizare', table: 'Masă', accent: 'Culoare de accent', backs: 'Spatele cărților', matchBack: 'Ca masa', premium: 'Premium',
      locked: 'Premium — în curând în magazin. Încearcă-l în previzualizare.', adminFree: 'Admin — toate articolele premium sunt deblocate pentru tine',
      guestLock: 'Conectează-te ca să-ți salvezi stilul', tryOn: 'Previzualizare', email: 'E-mail', security: 'Parolă', changePw: 'Schimbă parola', pwChanged: 'Parola a fost schimbată',
      danger: 'Zonă periculoasă', deleteAcc: 'Șterge-mi contul', deleteHint: 'Îți vom șterge contul și datele în cel mult 30 de zile.',
      admin: 'Admin', adminPanel: 'Deschide panoul de admin', guestTitle: 'Joci ca vizitator', guestSub: 'Creează un cont gratuit ca să-ți păstrezi statisticile, BM și stilul pe orice dispozitiv.', prefs: 'Preferințe',
    },
  },

  privacy: {
    title: 'Politica de confidențialitate',
    intro: 'Bridge 125 este un joc de cărți gratuit. Colectăm cât mai puține date și nu le vindem niciodată.',
    sections: [
      { h: 'Ce stocăm', p: [
        'Fără cont: nimic despre tine nu părăsește dispozitivul, cu excepția poreclei pe care o folosești la o masă online. Setările, un joc salvat și un ID de jucător aleatoriu sunt păstrate în stocarea locală a browserului.',
        'Cu cont: adresa de e-mail (folosită doar pentru trimiterea codurilor de conectare), porecla, limba, alegerile de culoare și de masă și statisticile de joc (partide jucate, victorii, sold BM).',
      ] },
      { h: 'Mese online', p: ['Cât timp joci online, starea mesei (locuri, porecle, cărți, mutări) este păstrată pe serverul nostru, ca toți jucătorii să vadă același joc. Nu este legată de e-mailul tău și este ștearsă după ce masa devine inactivă.'] },
      { h: 'Clasament', p: ['Dacă ai un cont și termini partide, porecla și statisticile tale pot apărea în clasamentul public. Îți poți schimba porecla oricând din profil.'] },
      { h: 'Cine prelucrează datele', p: ['Supabase (conturi și statistici) și Cloudflare (găzduire și mese online) prelucrează date în numele nostru, conform propriilor condiții de prelucrare a datelor. Nu folosim trackere de publicitate sau de analiză și nici cookie-uri terțe.'] },
      { h: 'Cât timp le păstrăm', p: ['Datele contului sunt păstrate până când ne ceri să le ștergem. Datele locale rămân în browser până când le ștergi.'] },
      { h: 'Drepturile tale', p: [`Poți cere oricând accesul la datele tale, rectificarea, exportul sau ștergerea lor, scriind la ${CONTACT_EMAIL}. Conform GDPR, poți depune și o plângere la autoritatea de protecție a datelor din țara ta.`] },
      { h: 'Copii', p: ['Bridge 125 este destinat jucătorilor cu vârsta de cel puțin 16 ani.'] },
    ],
  },

  terms: {
    title: 'Termeni de utilizare',
    intro: 'Jucând Bridge 125, accepți aceste reguli simple.',
    sections: [
      { h: 'Jocul', p: ['Bridge 125 este oferit gratuit, „ca atare”, pentru divertisment. Putem modifica, suspenda sau încheia funcții oricând.'] },
      { h: 'Bridge Money (BM)', p: ['BM sunt puncte virtuale folosite doar în joc. Nu au valoare bănească, nu pot fi cumpărate, vândute, schimbate sau retrase și nu reprezintă jocuri de noroc.'] },
      { h: 'Fair-play', p: ['Fii respectuos la masă. Trișatul, automatizarea jocului, exploatarea erorilor, poreclele jignitoare sau hărțuirea altor jucători nu sunt permise și pot duce la eliminarea contului.'] },
      { h: 'Contul tău', p: ['Păstrează în siguranță accesul la e-mail — prin el te conectezi. Poți înceta oricând să joci și ne poți cere să-ți ștergem contul.'] },
      { h: 'Răspundere', p: ['Ne străduim ca jocul să funcționeze, dar nu putem garanta că va fi mereu disponibil sau fără erori. În limitele permise de lege, nu răspundem pentru progresul pierdut sau pentru daune indirecte.'] },
      { h: 'Modificări', p: ['Dacă acești termeni se schimbă, vom actualiza data de mai sus. Dacă continui să joci, accepți termenii actualizați.'] },
    ],
  },
};

export default ro;
