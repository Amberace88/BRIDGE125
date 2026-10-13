import type { Strings } from './pick';

/** Save & resume wording (local games, Journey matches) — short, in all 17 languages. */
export interface SavingStrings {
  resume: (round: number, score: number) => string;
  restart: string;
  saveExit: string;
  savedNote: string;
  continueRun: string;
}

export const SAVING: Strings<SavingStrings> = {
  en: { resume: (r, p) => `Continue · round ${r}, ${p} pts`, restart: 'Start over', saveExit: 'Save & leave', savedNote: 'Your game saves automatically — continue any time.', continueRun: 'Unfinished match' },
  lv: { resume: (r, p) => `Turpināt · ${r}. raunds, ${p} p.`, restart: 'Sākt no jauna', saveExit: 'Saglabāt un iziet', savedNote: 'Spēle saglabājas automātiski — vari turpināt jebkurā brīdī.', continueRun: 'Nepabeigta spēle' },
  ru: { resume: (r, p) => `Продолжить · раунд ${r}, ${p} оч.`, restart: 'Начать заново', saveExit: 'Сохранить и выйти', savedNote: 'Игра сохраняется автоматически — продолжите в любой момент.', continueRun: 'Незаконченная партия' },
  uk: { resume: (r, p) => `Продовжити · раунд ${r}, ${p} оч.`, restart: 'Почати знову', saveExit: 'Зберегти й вийти', savedNote: 'Гра зберігається автоматично — продовжте будь-коли.', continueRun: 'Незавершена партія' },
  lt: { resume: (r, p) => `Tęsti · ${r} raundas, ${p} tšk.`, restart: 'Pradėti iš naujo', saveExit: 'Išsaugoti ir išeiti', savedNote: 'Žaidimas išsaugomas automatiškai — tęsk bet kada.', continueRun: 'Nebaigta partija' },
  et: { resume: (r, p) => `Jätka · ${r}. voor, ${p} p`, restart: 'Alusta uuesti', saveExit: 'Salvesta ja lahku', savedNote: 'Mäng salvestub automaatselt — jätka millal tahes.', continueRun: 'Pooleli mäng' },
  pl: { resume: (r, p) => `Kontynuuj · runda ${r}, ${p} pkt`, restart: 'Zacznij od nowa', saveExit: 'Zapisz i wyjdź', savedNote: 'Gra zapisuje się automatycznie — wróć w dowolnej chwili.', continueRun: 'Niedokończona partia' },
  de: { resume: (r, p) => `Weiter · Runde ${r}, ${p} P.`, restart: 'Neu beginnen', saveExit: 'Speichern & verlassen', savedNote: 'Dein Spiel wird automatisch gespeichert — mach jederzeit weiter.', continueRun: 'Offene Partie' },
  be: { resume: (r, p) => `Працягнуць · раўнд ${r}, ${p} ачк.`, restart: 'Пачаць нанова', saveExit: 'Захаваць і выйсці', savedNote: 'Гульня захоўваецца аўтаматычна — працягвайце калі заўгодна.', continueRun: 'Незавершаная партыя' },
  kk: { resume: (r, p) => `Жалғастыру · ${r}-раунд, ${p} ұпай`, restart: 'Қайта бастау', saveExit: 'Сақтап шығу', savedNote: 'Ойын автоматты түрде сақталады — кез келген уақытта жалғастырыңыз.', continueRun: 'Аяқталмаған ойын' },
  uz: { resume: (r, p) => `Davom etish · ${r}-raund, ${p} ochko`, restart: 'Qaytadan boshlash', saveExit: 'Saqlash va chiqish', savedNote: 'Oʻyin avtomatik saqlanadi — istalgan vaqtda davom eting.', continueRun: 'Tugallanmagan oʻyin' },
  az: { resume: (r, p) => `Davam et · raund ${r}, ${p} xal`, restart: 'Yenidən başla', saveExit: 'Saxla və çıx', savedNote: 'Oyun avtomatik saxlanılır — istənilən vaxt davam edin.', continueRun: 'Bitməmiş oyun' },
  ka: { resume: (r, p) => `გაგრძელება · რაუნდი ${r}, ${p} ქულა`, restart: 'თავიდან', saveExit: 'შენახვა და გასვლა', savedNote: 'თამაში ავტომატურად ინახება — განაგრძეთ ნებისმიერ დროს.', continueRun: 'დაუსრულებელი თამაში' },
  hy: { resume: (r, p) => `Շարունակել · ռաունդ ${r}, ${p} միավոր`, restart: 'Սկսել նորից', saveExit: 'Պահել և դուրս գալ', savedNote: 'Խաղը պահվում է ավտոմատ․ շարունակեք ցանկացած պահի։', continueRun: 'Չավարտված խաղ' },
  ro: { resume: (r, p) => `Continuă · runda ${r}, ${p} p.`, restart: 'Ia-o de la capăt', saveExit: 'Salvează și ieși', savedNote: 'Jocul se salvează automat — continuă oricând.', continueRun: 'Partidă neterminată' },
  bg: { resume: (r, p) => `Продължи · рунд ${r}, ${p} т.`, restart: 'Започни отначало', saveExit: 'Запази и излез', savedNote: 'Играта се запазва автоматично — продължи по всяко време.', continueRun: 'Незавършена игра' },
  es: { resume: (r, p) => `Continuar · ronda ${r}, ${p} pts`, restart: 'Empezar de nuevo', saveExit: 'Guardar y salir', savedNote: 'La partida se guarda sola — sigue cuando quieras.', continueRun: 'Partida sin terminar' },
};
