import type { ZoleStrings } from '../strings';
import { TAGLINES, TITLES } from '../titles';
import { two } from '../../plural';

const es: ZoleStrings = {
  title: TITLES.es,
  tagline: TAGLINES.es,
  lobby: {
    sub: 'Tres jugadores, 26 cartas, uno juega contra dos. Se gana con 61 tantos.',
    level: 'Rivales', levels: { easy: 'Fáciles', normal: 'Normales', hard: 'Difíciles' }, deals: 'Manos', endless: '∞',
    rules: 'Reglas de la mesa', maza: 'Zole pequeña', mazaSub: 'Te comprometes a no ganar ninguna baza', pules: 'Pules',
    pulesSub: 'Todos pasan → una pule en vez de galdiņš (como en los torneos)', start: 'Sentarse', howTo: 'Cómo jugar', back: 'Atrás',
  },
  bid: { take: 'Tomar la mesa', zole: 'Zole', maza: 'Zole pequeña', pass: 'Paso' },
  bidSub: {
    take: 'Coge las 2 cartas de la mesa, descarta 2 · juegas solo',
    zole: 'Juegas solo sin la mesa · apuesta doble',
    maza: 'No ganes ninguna baza',
    pass: 'Que juegue otro',
  },
  said: { take: 'toma la mesa', zole: '¡zole!', maza: 'zole pequeña', pass: 'paso' },
  contract: { lielais: 'Juego grande', zole: 'Zole', maza: 'Zole pequeña', galdins: 'Galdiņš', pule: 'Pule' },
  role: { lielais: 'Grande', mazais: 'Pequeño', solo: 'Cada uno por su cuenta' },
  plays: (w, c) => c === 'lielais' ? `${w} toma la mesa` : c === 'zole' ? `${w} juega zole` : c === 'maza' ? `${w} juega zole pequeña` : 'Galdiņš',
  playsYou: c => c === 'lielais' ? 'Juegas de grande' : c === 'zole' ? 'Juegas zole' : c === 'maza' ? 'Juegas zole pequeña' : 'Galdiņš',
  allPassGaldins: 'Todos pasan: se juega galdiņš', allPassPule: 'Todos pasan: se anota una pule',
  status: {
    yourBid: 'Te toca hablar', yourDiscard: 'Descarta 2 cartas', yourLead: 'Sales tú', yourTurn: 'Te toca', dealing: 'Repartiendo…', tapToSkip: 'toca para saltar',
    bidding: w => `${w} se lo piensa…`, discarding: w => `${w} descarta 2 cartas…`, thinking: w => `${w} está pensando…`,
  },
  discardBtn: p => `Descartar · +${p}`,
  you: 'Tú', partner: 'compañero',
  acis: 'tantos', tricks: 'bazas', trickN: n => `${n} ${two(n, 'baza', 'bazas')}`,
  lastTrick: 'Última baza', lastTrickBy: w => `se la lleva ${w}`, table: 'Mesa', buried: 'Descarte', galdsTo: w => `cartas de la mesa → ${w}`,
  deal: (n, t) => (t > 0 ? `Mano ${n} de ${t}` : `Mano ${n}`),
  outcomeLine: (w, o) => {
    const you = { win: 'Ganas', jani: 'Ganas: los pequeños, «en jaņi»', bezstikis: '¡Te llevas todas las bazas!', lose: 'Pierdes', loseJani: 'Pierdes: te quedas «en jaņi»', loseBezstikis: 'Ni una sola baza' };
    const them = { win: 'gana', jani: 'gana: los pequeños, «en jaņi»', bezstikis: '¡se lleva todas las bazas!', lose: 'pierde', loseJani: 'pierde: «en jaņi»', loseBezstikis: 'se queda sin bazas' };
    return w == null ? you[o] : `${w} ${them[o]}`;
  },
  outcomeTag: { win: '61+', jani: 'pequeños «en jaņi»', bezstikis: 'todas las bazas', lose: 'menos de 61', loseJani: '«en jaņi»', loseBezstikis: 'sin bazas' },
  mazaLine: (w, won) => (w == null ? (won ? '¡Zole pequeña cumplida!' : 'Zole pequeña fallida') : `${w} ${won ? 'cumple' : 'falla'} la zole pequeña`),
  galdinsLine: l => (l.length === 1 && l[0] == null ? 'Pierdes el galdiņš' : `Pierde el galdiņš: ${l.map(x => x ?? 'tú').join(' y ')}`),
  sheet: {
    title: 'Anotador', next: 'Siguiente mano', finish: 'Terminar partida', finishSub: 'Hacer las cuentas ahora', sessionOver: 'Partida terminada',
    youWon: '¡Vas en positivo!', youLost: 'Esta vez en negativo', winner: w => `Gana ${w}`, tie: 'Empate',
    again: 'Nueva partida', exit: 'Salir', total: 'Total', pules: n => `Pules en la mesa: ${n}`, personal: 'pule personal',
    final: 'Pules liquidadas', puleAdded: '+1 pule común', puleOwn: 'pule propia borrada', puleCommon: 'pule común ganada · +1 de cada uno',
    pulePersonal: 'pule personal ganada · +3', vs: 'contra', yourBalance: 'Tu saldo', rows: 'Mano',
  },
  menu: {
    title: 'En pausa', resume: 'Seguir', rules: 'Reglas', newGame: 'Nueva partida', newGameSure: 'Toca otra vez para empezar de nuevo',
    finish: 'Terminar y contar', exit: 'Dejar la mesa', exitSub: 'Se guarda tras cada jugada: seguirás justo aquí.',
  },
  fast: 'Modo rápido', fastOn: 'sí', fastOff: 'no',
  coach: {
    ok: 'Entendido',
    bid: n => `Tienes ${n} ${two(n, 'triunfo', 'triunfos')}. La mesa se toma con unos 5 triunfos, entre ellos damas o jotas; con mano floja, paso.`,
    suggest: b => `Sugerencia: ${b}`,
    discard: 'Descarta 2 cartas: sus tantos cuentan para ti. Descarta un 10 o un rey solitario para quedarte fallo en ese palo.',
    lead: 'Sales tú. Como grande, arrastra los triunfos de los rivales con tus triunfos altos.',
    follow: 'Asiste al palo. Todas las damas, jotas y diamantes son triunfo: un solo palo.',
    mazie: (p, d) => `Tú y ${p} jugáis juntos contra ${d}. Cuando ${p} gane la baza, cárgale tantos.`,
    galdins: 'Galdiņš: cada uno por su cuenta; pierde quien se lleve más bazas.',
    maza: 'Zole pequeña: quien la canta no puede ganar ni una baza.',
    declarer: 'Necesitas 61 de los 120 tantos. Tu descarte ya cuenta para ti.',
  },
  rules: {
    title: 'Cómo se juega a la Zole',
    intro: 'Juegan tres. En cada mano uno juega solo —el grande (lielais)— contra los otros dos (mazie), que van juntos. El grande necesita al menos 61 de los 120 tantos.',
    deckH: 'La baraja', deck: '26 cartas: as, 10, rey, dama, jota y 9 de cada palo, más el 8♦ y el 7♦. Cada uno recibe 8 cartas; 2 quedan boca abajo en la mesa.',
    pointsH: 'Valor de las cartas',
    trumpsH: 'Triunfos: 14', trumps: 'Todas las damas, todas las jotas y todos los diamantes son triunfo, desde la dama de tréboles hasta el 7 de diamantes. En tréboles, picas y corazones solo quedan as, 10, rey y 9.',
    playH: 'El juego', play: 'Hay que asistir al palo de salida (los triunfos cuentan como un palo). Si no tienes, juega cualquier carta. Gana la baza el triunfo más alto; si no hay, la carta más alta del palo de salida. Sale primero el jugador a la izquierda del que reparte.',
    bidH: 'Subasta', bids: {
      take: 'Tomar la mesa: te conviertes en el grande, coges las 2 cartas de la mesa y descartas 2. Los tantos del descarte son tuyos.',
      zole: 'Zole: juegas solo sin la mesa (sus tantos son para los rivales). Apuesta más alta.',
      maza: 'Zole pequeña: ganas si no te llevas ninguna baza (regla de la casa).',
      pass: 'Paso: decide el siguiente. Juega el primero que no pase.',
    },
    allPassH: 'Si todos pasan', galdins: 'Galdiņš: cada uno por su cuenta. Pierde quien se lleve más bazas (si empatan, más tantos); las cartas de la mesa van a la última baza.',
    pules: 'Con pules: se anota una pule común y se vuelve a repartir. El siguiente grande que gane la cobra (+1 de cada uno); un grande que pierda con una pule abierta se lleva una pule personal.',
    scoreH: 'Puntuación', scoreCols: ['El grande hace', 'Grande', 'Zole'],
    scoreRows: {
      bezstikis: 'Las 8 bazas', jani: '91 o más', win: '61–90', lose: '31–60', loseJani: '30 o menos', loseBezstikis: 'Ninguna baza',
    },
    mazaRow: ['Zole pequeña cumplida', 'Zole pequeña fallida'], galdinsRow: 'Galdiņš: el que pierde −4, los demás +2',
    tipsH: 'Consejos', tips: [
      'Cuenta tus triunfos: 5 o más con una o dos damas, toma la mesa sin miedo.',
      'Descarta los 10 y reyes de palos cortos: los tantos son tuyos y luego fallas con triunfo.',
      'De pequeño: cuando tu compañero gane la baza, cárgale un as o un 10.',
    ],
  },
};
export default es;
