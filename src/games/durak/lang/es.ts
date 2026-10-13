import type { DurakStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { two } from '../../plural';

const es: DurakStrings = {
  title: TITLE.es, tagline: TAGLINE.es,
  play: 'Repartir', resume: 'Continuar partida', newGame: 'Nueva partida', players: 'Jugadores', level: 'Bots', easy: 'Fáciles', normal: 'Normales', hard: 'Difíciles',
  variant: 'Variante', podkidnoy: 'Clásico', perevodnoy: 'Con traspaso', podkidnoyHint: 'Todos pueden echar cartas del mismo valor',
  perevodnoyHint: 'Además: puedes traspasar el ataque con una carta del mismo valor',
  deck: 'Baraja', cards: n => `${n} ${two(n, 'carta', 'cartas')}`, rules: 'Reglas', back: 'Atrás', close: 'Cerrar', menu: 'Menú',
  saveExit: 'Guardar y salir', savedNote: 'Cada jugada se guarda: sigue cuando quieras.', newGameConfirm: '¿Empezar una partida nueva? Esta se perderá.',
  bito: 'Hecho', take: 'Recojo', pass: 'Paso', transfer: 'Traspasar', you: 'Tú', trump: 'Triunfo', talon: n => `quedan ${n}`, discard: 'Descarte',
  st: {
    attack: 'Tu ataque', defend: 'Mata o recoge', throwIn: 'Echa cartas o hecho', throwTaking: 'Recoge: ¿echas más?',
    waiting: w => `${w} está pensando`, dealing: 'Repartiendo…', tapToSkip: 'Toca para saltar', youOut: 'Has salido: vemos el final',
    selectTarget: 'Elige la carta que vas a matar',
  },
  bubble: { take: 'Recojo', bito: 'Hecho', pass: 'Paso', transfer: '¡Traspaso!' },
  ev: {
    lowTrump: (w, c) => `Triunfo más bajo ${c}: empieza ${w}`, lowTrumpYou: c => `Tu triunfo más bajo ${c}: empiezas tú`, firstMove: w => `Empieza ${w}`,
    took: w => `${w} recoge las cartas`, tookYou: 'Recoges las cartas', beaten: '¡Matadas!', transfer: w => `¡Traspaso! Defiende ${w}`,
    transferYou: '¡Te lo han traspasado!', out: w => `${w} ha salido`, outYou: '¡Te has quedado sin cartas!', talonEmpty: 'El mazo se ha acabado',
  },
  role: { attacker: 'Ataca', defender: 'Defiende' },
  end: {
    durak: '¡Durak!', notDurak: '¡No eres el tonto!', durakIs: w => `${w} es el durak`, draw: 'Empate', drawSub: 'Las últimas cartas salieron a la vez: nadie se lleva el gorro',
    place: n => `${n}.º puesto`, again: 'Otra vez', settings: 'Ajustes', home: 'Salir',
    pogony: '¡Con charreteras!', durakTag: 'Durak',
    loseLines: ['El gorro de papel te sienta bien.', 'Todo maestro fue alguna vez el tonto.', 'Hoy no entraban las cartas. ¿Revancha?'],
    winLines: ['Manos limpias, mente clara.', 'El primero en salir, con estilo.', 'Hoy el gorro lo lleva otro.'],
    signIn: 'Inicia sesión para guardar premios y subir en la clasificación', skip: 'Saltar',
  },
  hints: {
    attack: 'Tu ataque: juega cualquier carta. Lo más listo es abrir con una carta baja que no sea triunfo.',
    defend: 'Mata cada carta con una más alta del mismo palo o con un triunfo. O pulsa «Recojo».',
    throwIn: 'Echa cartas de los valores que ya están en la mesa, o pulsa «Hecho».',
    transfer: 'Traspaso: pon una carta del mismo valor y defenderá el siguiente.',
    taking: 'El rival lo recoge todo: échale más o di «Paso».', gotIt: 'Entendido',
  },
  fast: 'Modo rápido', on: 'sí', off: 'no',
  rulesTitle: 'Cómo se juega al Durak',
  rulesList: [
    { h: 'Objetivo', p: 'Quedarte sin cartas. El último jugador que aún tiene cartas es el durak, el tonto.' },
    { h: 'Reparto y triunfo', p: 'Seis cartas para cada uno. La última carta del mazo queda boca arriba debajo de él: su palo es triunfo toda la partida. Ataca primero quien tenga el triunfo más bajo.' },
    { h: 'Ataque', p: 'El atacante juega una carta al siguiente jugador (el defensor). Después, todos menos el defensor pueden echar cartas de un valor que ya esté en la mesa.' },
    { h: 'Defensa', p: 'Mata cada carta con una más alta del mismo palo o con cualquier triunfo (a un triunfo solo lo mata otro más alto). Si no puedes o no quieres, recoges todas las cartas de la mesa.' },
    { h: 'Límites', p: 'Como mucho seis cartas de ataque por ronda, y nunca más de las que tiene el defensor en la mano.' },
    { h: 'Tras la ronda', p: 'Matadas: las cartas van al descarte y el defensor ataca a continuación. Recogidas: el defensor se las queda y pierde el turno. Todos roban hasta tener seis: primero el atacante, el defensor el último.' },
    { h: 'Variante con traspaso', p: 'Antes de matar nada, el defensor puede añadir una carta del mismo valor y traspasar todo el ataque al siguiente jugador (si tiene cartas suficientes).' },
    { h: 'El final', p: 'Cuando el mazo se acaba, quien se queda sin cartas sale. El último con cartas se pone el gorro de papel.' },
  ],
  botNames: ['Pablo', 'Lucía', 'Javier', 'Marta', 'Diego'],
};
export default es;
