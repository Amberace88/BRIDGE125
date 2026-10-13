import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { two } from '../../plural';

const et: DurakStrings = {
  title: TITLE.et, tagline: TAGLINE.et,
  play: 'Jaga', resume: 'Jätka mängu', newGame: 'Uus mäng', players: 'Mängijad', level: 'Botid', easy: 'Kerged', normal: 'Tavalised', hard: 'Tugevad',
  variant: 'Variant', podkidnoy: 'Juurdeviskamine', perevodnoy: 'Edasiandmine', podkidnoyHint: 'Kõik võivad juurde visata sama väärtusega kaarte',
  perevodnoyHint: 'Lisaks: rünnaku saab sama väärtusega kaardiga edasi anda',
  deck: 'Pakk', cards: n => `${n} ${two(n, 'kaart', 'kaarti')}`, rules: 'Reeglid', back: 'Tagasi', close: 'Sulge', menu: 'Menüü',
  saveExit: 'Salvesta ja lahku', savedNote: 'Iga käik salvestatakse — jätka millal tahes.', newGameConfirm: 'Alustada uut mängu? See mäng läheb kaotsi.',
  bito: 'Löödud', take: 'Võtan', pass: 'Pass', transfer: 'Anna edasi', you: 'Sina', trump: 'Trump', talon: n => `${n} alles`, discard: 'Mahakäidud',
  st: {
    attack: 'Sinu rünnak', defend: 'Löö — või võta', throwIn: 'Viska juurde — või löödud', throwTaking: 'Ta võtab — viskad veel?',
    waiting: w => `${w} mõtleb`, dealing: 'Jagan…', tapToSkip: 'Puuduta vahelejätmiseks', youOut: 'Sa oled väljas — vaatame lõppu',
    selectTarget: 'Vali kaart, mida lüüa',
  },
  bubble: { take: 'Võtan', bito: 'Löödud', pass: 'Pass', transfer: 'Edasi!' },
  ev: {
    lowTrump: (w, c) => `Väikseim trump ${c} — alustab ${w}`, lowTrumpYou: c => `Sinu väikseim trump ${c} — sina alustad`, firstMove: w => `Alustab ${w}`,
    took: w => `${w} võtab kaardid`, tookYou: 'Sa võtad kaardid', beaten: 'Löödud!', transfer: w => `Edasi antud! Kaitseb ${w}`,
    transferYou: 'Anti sulle edasi!', out: w => `${w} on väljas`, outYou: 'Sul said kaardid otsa!', talonEmpty: 'Pakk on tühi',
  },
  role: { attacker: 'Ründab', defender: 'Kaitseb' },
  end: {
    durak: 'Turakas!', notDurak: 'Pole turakas!', durakIs: w => `${w} on turakas`, draw: 'Viik', drawSub: 'Viimased kaardid läksid koos — mütsi ei saa keegi',
    place: n => `${n}. koht`, again: 'Veel kord', settings: 'Seaded', home: 'Lahku',
    pogony: 'Pagunitega!', durakTag: 'Turakas',
    loseLines: ['Paberist müts sobib sulle.', 'Iga meister on kord turakas olnud.', 'Täna kaart ei tulnud. Revanš?'],
    winLines: ['Puhtad käed, selge pea.', 'Esimesena väljas — stiilne.', 'Mütsi kannab täna keegi teine.'],
    signIn: 'Logi sisse, et saada auhindu ja tõusta edetabelis', skip: 'Jäta vahele',
  },
  hints: {
    attack: 'Sinu rünnak: käi ükskõik milline kaart. Targem on alustada väikese mittetrumbiga.',
    defend: 'Löö sama masti kõrgema kaardi või trumbiga. Või vajuta „Võtan“.',
    throwIn: 'Viska juurde kaarte, mille väärtus on laual, — või „Löödud“.',
    transfer: 'Edasiandmine: pane sama väärtusega kaart — kaitsma peab järgmine.',
    taking: 'Vastane võtab kõik — viska juurde või ütle „Pass“.', gotIt: 'Selge',
  },
  fast: 'Kiire režiim', on: 'sees', off: 'väljas',
  rulesTitle: 'Kuidas mängida turakat',
  rulesList: [
    { h: 'Eesmärk', p: 'Saa lahti kõigist kaartidest. Viimane, kellel on veel kaarte käes, on turakas.' },
    { h: 'Jagamine ja trump', p: 'Igaühele kuus kaarti. Paki alumine kaart on selle all avatult — selle mast on kogu mängu trump. Alustab see, kellel on väikseim trump.' },
    { h: 'Rünnak', p: 'Ründaja käib kaardi järgmisele mängijale (kaitsjale). Seejärel võivad kõik peale kaitsja juurde visata kaarte, mille väärtus on juba laual.' },
    { h: 'Kaitse', p: 'Löö iga kaart sama masti kõrgema kaardiga või ükskõik millise trumbiga (trumpi lööb ainult kõrgem trump). Ei saa või ei taha — võta kõik laua kaardid.' },
    { h: 'Piirangud', p: 'Ühes rünnakus kõige rohkem kuus kaarti ja mitte rohkem, kui kaitsjal on käes.' },
    { h: 'Pärast rünnakut', p: 'Löödud — kaardid lähevad mahakäidute hulka ja kaitsja ründab järgmisena. Võttis — kaitsja jätab käigu vahele. Kõik võtavad kuueni juurde: esimesena ründaja, viimasena kaitsja.' },
    { h: 'Edasiandmine', p: 'Kuni ühtki kaarti pole löödud, võib kaitsja panna sama väärtusega kaardi ja anda kogu rünnaku järgmisele mängijale (kui tal on piisavalt kaarte).' },
    { h: 'Lõpp', p: 'Kui pakk on tühi, lähevad kaartideta mängijad välja. Viimane, kellel on kaarte, paneb pähe paberist mütsi.' },
  ],
  botNames: ['Mart', 'Kadri', 'Tanel', 'Liis', 'Rasmus'],
};
export default et;
