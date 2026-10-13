import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { lt3 } from '../../plural';

const lt: DurakStrings = {
  title: TITLE.lt, tagline: TAGLINE.lt,
  play: 'Dalinti', resume: 'Tęsti žaidimą', newGame: 'Naujas žaidimas', players: 'Žaidėjai', level: 'Botai', easy: 'Lengvi', normal: 'Vidutiniai', hard: 'Stiprūs',
  variant: 'Variantas', podkidnoy: 'Primetamasis', perevodnoy: 'Perduodamasis', podkidnoyHint: 'Visi gali primesti tokios pat vertės kortų',
  perevodnoyHint: 'Be to: puolimą galima perduoti tokios pat vertės korta',
  deck: 'Kaladė', cards: n => `${n} ${lt3(n, 'korta', 'kortos', 'kortų')}`, rules: 'Taisyklės', back: 'Atgal', close: 'Uždaryti', menu: 'Meniu',
  saveExit: 'Išsaugoti ir išeiti', savedNote: 'Kiekvienas ėjimas išsaugomas — tęskite bet kada.', newGameConfirm: 'Pradėti naują žaidimą? Šis bus prarastas.',
  bito: 'Atmušta', take: 'Imu', pass: 'Pas', transfer: 'Perduoti', you: 'Jūs', trump: 'Koziris', talon: n => `liko ${n}`, discard: 'Atmuštos',
  st: {
    attack: 'Jūsų puolimas', defend: 'Atmuškite — arba imkite', throwIn: 'Primeskite — arba atmušta', throwTaking: 'Ima — primesite dar?',
    waiting: w => `${w} galvoja`, dealing: 'Dalijama…', tapToSkip: 'Palieskite, kad praleistumėte', youOut: 'Jūs išėjote — žiūrime pabaigą',
    selectTarget: 'Pasirinkite, kurią kortą mušti',
  },
  bubble: { take: 'Imu', bito: 'Atmušta', pass: 'Pas', transfer: 'Perduodu!' },
  ev: {
    lowTrump: (w, c) => `Mažiausias koziris ${c} — pradeda ${w}`, lowTrumpYou: c => `Jūsų mažiausias koziris ${c} — pradedate jūs`, firstMove: w => `Pradeda ${w}`,
    took: w => `${w} ima kortas`, tookYou: 'Jūs imate kortas', beaten: 'Atmušta!', transfer: w => `Perduota! Ginasi ${w}`,
    transferYou: 'Perduota jums!', out: w => `${w} be kortų`, outYou: 'Jums baigėsi kortos!', talonEmpty: 'Kaladė tuščia',
  },
  role: { attacker: 'Puola', defender: 'Ginasi' },
  end: {
    durak: 'Durnius!', notDurak: 'Ne durnius!', durakIs: w => `${w} — durnius`, draw: 'Lygiosios', drawSub: 'Paskutinės kortos išėjo kartu — kepurės niekam',
    place: n => `${n}-a vieta`, again: 'Dar kartą', settings: 'Nustatymai', home: 'Išeiti',
    pogony: 'Su antpečiais!', durakTag: 'Durnius',
    loseLines: ['Popierinė kepurė jums tinka.', 'Kiekvienas meistras kartą buvo durnius.', 'Šiandien korta nėjo. Revanšas?'],
    winLines: ['Švarios rankos, šviesi galva.', 'Išėjote pirmas — gražu.', 'Kepurę šiandien nešioja kažkas kitas.'],
    signIn: 'Prisijunkite, kad gautumėte prizus ir kiltumėte reitinge', skip: 'Praleisti',
  },
  hints: {
    attack: 'Jūsų puolimas: dėkite bet kurią kortą. Protingiau pradėti nuo mažos ne kozirio.',
    defend: 'Muškite aukštesne tos pačios spalvos korta arba koziriu. Arba spauskite „Imu“.',
    throwIn: 'Primeskite kortų, kurių vertė jau yra ant stalo, — arba „Atmušta“.',
    transfer: 'Perdavimas: padėkite tokios pat vertės kortą — gintis teks kitam.',
    taking: 'Varžovas ima viską — primeskite dar arba sakykite „Pas“.', gotIt: 'Supratau',
  },
  fast: 'Greitas režimas', on: 'įj.', off: 'išj.',
  rulesTitle: 'Kaip žaisti durnių',
  rulesList: [
    { h: 'Tikslas', p: 'Atsikratyti visų kortų. Paskutinis, kuriam dar liko kortų, yra durnius.' },
    { h: 'Dalijimas ir koziris', p: 'Kiekvienam po šešias kortas. Apatinė kaladės korta guli po ja atversta — jos spalva yra koziris visam žaidimui. Pradeda tas, kas turi mažiausią kozirį.' },
    { h: 'Puolimas', p: 'Puolėjas deda kortą kitam žaidėjui (gynėjui). Tada visi, išskyrus gynėją, gali primesti kortų, kurių vertė jau yra ant stalo.' },
    { h: 'Gynyba', p: 'Kiekvieną kortą muškite aukštesne tos pačios spalvos korta arba bet kuriuo koziriu (kozirį muša tik aukštesnis koziris). Negalite ar nenorite — imkite visas stalo kortas.' },
    { h: 'Ribos', p: 'Ne daugiau kaip šešios kortos per vieną puolimą ir ne daugiau, nei gynėjas turi rankoje.' },
    { h: 'Po puolimo', p: 'Atmušta — kortos eina į atmuštas, o gynėjas puola kitas. Paėmė — gynėjas praleidžia ėjimą. Visi pasiima iki šešių: pirmas puolėjas, gynėjas paskutinis.' },
    { h: 'Perduodamasis', p: 'Kol nė viena korta neatmušta, gynėjas gali padėti tokios pat vertės kortą ir perduoti visą puolimą kitam žaidėjui (jei šis turi pakankamai kortų).' },
    { h: 'Pabaiga', p: 'Kai kaladė tuščia, žaidėjai be kortų išeina. Paskutinis su kortomis užsideda popierinę kepurę.' },
  ],
  botNames: ['Mantas', 'Rūta', 'Tomas', 'Eglė', 'Darius'],
};
export default lt;
