import { CONTACT_EMAIL } from '../i18n3';
import type { LocalePack } from './types';

const es: LocalePack = {
  dict: {
    tagline: 'El juego de cartas Bridge', play: 'Jugar', vsBots: 'Jugar contra bots', opponents: 'Rivales', level: 'Nivel del bot',
    easy: 'Fácil', normal: 'Normal', online: 'Online con amigos', soon: 'Pronto', howToPlay: 'Cómo se juega', profile: 'Perfil',
    settings: 'Ajustes', language: 'Idioma', sound: 'Sonido', on: 'Sí', off: 'No', guest: 'Invitado', signIn: 'Crea una cuenta o inicia sesión',
    signOut: 'Cerrar sesión', emailPlaceholder: 'Tu email', sendLink: 'Enviar enlace de acceso',
    linkSent: e => `Revisa ${e} y abre el enlace para entrar.`, personalize: 'Personalizar',
    personalizeLocked: 'Crea una cuenta gratis para elegir tu color y tu mesa.', accent: 'Color de acento', background: 'Mesa',
    yourName: 'Nombre de jugador', save: 'Guardar', saved: 'Guardado', back: 'Atrás', close: 'Cerrar',
    yourTurn: 'Tu turno', waiting: n => `${n} está pensando`, deckLeft: n => `${n} en el mazo`, points: n => `${n} pts`,
    draw: 'Robar', pass: 'Pasar', take: n => `Robar ${n}`, transfer6S: 'Pásala con el 6♠', playN: n => `Jugar ${n}`, comboQ6: 'Q♠ + 6♠',
    chooseSuit: 'Pide un palo', coverSix: 'Cubre tu 6', suitNames: { S: 'Picas', C: 'Tréboles', H: 'Corazones', D: 'Diamantes' },
    ev: {
      queen: w => `¡Reina de picas! ${w} roba 5`, queenSub: 'Salvo que tenga el 6♠', transfer: w => `¡6♠! ${w} roba 6`,
      eight: (w, n) => `${w} roba ${n}`, seven: (w, n) => `${w} roba ${n}`, skip: w => `${w} pierde el turno`,
      kings: '¡Cuatro reyes!', kingsSub: 'La puntuación de todos vuelve a cero', reset125: w => `${w}: justo 125, vuelve a 0`,
      suit: (_w, s) => `Palo pedido: ${s}`, reshuffle: 'La pila se baraja en el mazo',
      youTake: n => `Robas ${n}`, youSkip: 'Pierdes el turno', queenYou: '¡Reina de picas! Robas 5', transferYou: '¡6♠! Robas 6 y la cubres',
    },
    round: n => `Ronda ${n}`, roundWon: w => `${w} se quedó sin cartas`, roundWonYou: '¡Te has quedado sin cartas!',
    jacksFinish: n => `Cierre con ${n} ${n > 1 ? 'jotas' : 'jota'} — ×${n + 1}`,
    colPlayer: 'Jugador', colHand: 'En mano', colTotal: 'Total', burned: 'Justo 125: vuelve a 0', nextRound: 'Siguiente ronda',
    rematch: 'Revancha', home: 'Inicio', youWin: '¡Has ganado!', winnerIs: w => `Gana ${w}`, gameOverSub: 'Alguien ha pasado de 130: gana la puntuación más baja',
    you: 'Tú', rulesTitle: 'Cómo se juega',
    rules: [
      { h: 'Objetivo', p: 'Deshazte de tus cartas y suma los menos puntos posibles. Cuando alguien llega a 130, la partida termina y gana la puntuación más baja. Si llegas justo a 125, tu puntuación vuelve a 0.' },
      { h: 'Tu turno', p: 'Juega una carta del mismo palo o del mismo valor que la de arriba. Puedes jugar a la vez varias cartas del mismo valor. ¿No tienes jugada? Roba una y luego juégala o pasa.' },
      { h: 'As', p: 'El siguiente jugador pierde el turno.' },
      { h: '6', p: 'Hay que cubrirlo: pon otra carta encima enseguida. No puedes terminar con un 6.' },
      { h: '7', p: 'El siguiente jugador roba 1 carta y sigue jugando.' },
      { h: '8', p: 'El siguiente roba 2 y pierde el turno, salvo que responda con su propio 8 y pase 4, 6 u 8 cartas.' },
      { h: '9', p: 'Se puede jugar sobre cualquier carta, pero no pides palo.' },
      { h: 'Jota', p: 'Va sobre cualquier carta y tú pides el palo. Cierra la ronda con 1–4 jotas y los puntos de los rivales se multiplican de ×2 a ×5.' },
      { h: 'Reina de picas', p: 'El siguiente roba 5 y pierde el turno. ¿Tienes el 6♠? Responde con él: el siguiente roba 6 y tiene que cubrirlo.' },
      { h: 'Reyes', p: 'Cuatro reyes seguidos en la pila ponen a cero la puntuación de todos.' },
      { h: 'Puntos', p: 'As 15 · rey, reina, jota, 10 — 10 cada uno · 6♠ — 5 · el resto — 0.' },
    ],
    continueGame: 'Continuar partida', menuQuit: 'Salir de la partida', botNames: ['Pablo', 'Lucía', 'Javier'],
  },

  extra: {
    nav: { howToPlay: 'Cómo se juega', signIn: 'Entrar', play: 'Jugar' },
    heroLine: 'El clásico juego de cartas Bridge: reina de picas, jotas ×5 y el famoso 125.',
    features: ['Juega gratis en tu navegador', 'Disponible en 17 idiomas', 'Instálalo como una app'],
    playFriends: 'Jugar con amigos',
    guide: {
      title: 'Cómo se juega', intro: 'Deshazte de tus cartas, esquiva las penalizaciones y mantén baja tu puntuación. Todo lo esencial en cinco minutos.',
      tabs: { basics: 'Lo básico', special: 'Cartas especiales', combos: 'Combos', scoring: 'Puntuación' },
      steps: [
        { h: 'Sigue la carta de arriba', p: 'Juega una carta del mismo palo o del mismo valor. Puedes bajar juntas varias cartas de un mismo valor.' },
        { h: 'Vacía tu mano', p: 'El primero que se queda sin cartas cierra la ronda. Los demás cuentan los puntos que les quedan en la mano.' },
        { h: 'Puntúa bajo', p: 'Los puntos se acumulan ronda tras ronda. Cuando alguien llega a 130, la partida termina y gana la puntuación más baja.' },
      ],
      tags: { A: 'Salta turno', '6': 'Cúbrelo', '7': '+1', '8': '+2, cadena', '9': 'Comodín', J: 'Comodín + palo', QS: '+5', K: 'A cero' },
      combos: [
        { h: 'Reina de picas, devuelta', p: '¿Te cae la Q♠? Responde con el 6♠ y el siguiente roba 6 en tu lugar… y tiene que cubrirlo.' },
        { h: 'Cadena de ochos', p: 'Cada 8 suma dos cartas. Responde a un 8 con el tuyo y pasa 4, 6 u 8.' },
        { h: 'Cierra con jotas', p: 'Sal con 1–4 jotas a la vez y los puntos de cada rival se multiplican de ×2 a ×5.' },
      ],
      pointsTitle: 'Puntos de las cartas que quedan en la mano al final de la ronda',
      line: { start: 'Inicio', burn: 'Justo 125 → vuelta a 0', end: '130+ → fin de la partida' },
      example: 'Ejemplo', youCanPlay: 'Puedes jugar', cta: 'Jugar una partida de práctica',
    },
    auth: {
      title: 'Guarda tu progreso', sub: 'Cuenta gratis en segundos. Sin contraseña: te enviamos un código por email.',
      benefits: ['Tu propia mesa y tus colores', 'Victorias y partidas guardadas en todos tus dispositivos', 'Lista para ligas y torneos'],
      email: 'Email', cont: 'Enviar código', hint: 'Al continuar, te comprometes a jugar limpio y a pasarlo bien.',
      codeTitle: 'Introduce tu código', codeSub: e => `Hemos enviado un código de 6 dígitos a ${e}`, verify: 'Entrar', resend: 'Enviar un código nuevo',
      resendIn: s => `Nuevo código en ${s} s`, wrong: 'Ese código no funciona. Revísalo o pide uno nuevo.', change: 'Usar otro email',
      welcome: '¡Ya estás dentro!', orLink: '¿Te ha llegado un enlace en lugar de un código? Ábrelo en este dispositivo.', stats: { games: 'Partidas', wins: 'Victorias', bm: 'Bridge Money' },
    },
    room: {
      create: 'Crear mesa', join: 'Unirse', code: 'Código de mesa', enterCode: 'Introduce el código', invite: 'Invitar amigos', copied: 'Enlace copiado',
      waiting: 'Esperando jugadores…', addBot: 'Añadir bot', removeBot: 'Quitar bot', start: 'Empezar partida', needTwo: 'Se necesitan al menos 2 jugadores',
      host: 'Anfitrión', waitHost: 'Esperando a que el anfitrión empiece', connecting: 'Conectando…', reconnecting: 'Reconectando…',
      full: 'Esta mesa está llena', notFound: 'Mesa no encontrada', leave: 'Salir de la mesa', seatsOf: (n, m) => `${n} de ${m} plazas`,
      shareText: 'Únete a mi mesa de Bridge 125', online: 'en línea', bot: 'Bot',
    },
  },

  extra2: {
    quick: {
      play: 'Jugar online ahora', sub: 'Contra jugadores reales', title: 'Partida rápida', finding: 'Buscando jugadores…',
      startsIn: s => `Empieza en ${s} s`, startNow: 'Empezar ya', botsFill: 'Cuando acabe el tiempo, los bots ocuparán los asientos libres.',
      error: 'No se pudo conectar con el servidor. Inténtalo de nuevo.', starting: 'Repartiendo…',
    },
    lb: {
      title: 'Clasificación', sub: 'Mejores jugadores por victorias', wins: 'Victorias', games: 'Partidas', winRate: '% de victorias',
      empty: 'Aún no hay partidas clasificadas. ¡Estrena la tabla!', you: 'Tú', signIn: 'Inicia sesión para entrar en la clasificación', error: 'La clasificación no está disponible ahora.', open: 'Ranking',
    },
    legal: { privacy: 'Privacidad', terms: 'Términos', updated: 'Última actualización', contact: 'Contacto', agree: ['Al continuar, aceptas los', 'Términos', 'y la', 'Política de privacidad'] },
    install: {
      button: 'Instalar app', title: 'Instala Bridge 125', sub: 'Juega desde tu pantalla de inicio como en una app de verdad: gratis y sin tienda de apps.',
      benefits: ['Se abre a pantalla completa con un toque', 'Juega contra bots incluso sin conexión', 'Siempre la última versión, sin actualizar nada'],
      cta: 'Instalar ahora', done: '¡Instalada! Encontrarás Bridge 125 en tu pantalla de inicio.', later: 'Ahora no', banner: 'Consigue la app gratis',
      ios: ['Toca el botón «Compartir»', 'Elige «Añadir a pantalla de inicio»', 'Toca «Añadir» y listo'],
      iosOther: 'En iPhone y iPad, abre bridge125.com en Safari para instalarla.',
      android: ['Abre el menú del navegador ⋮', 'Toca «Instalar aplicación» o «Añadir a pantalla de inicio»', 'Confirma y listo'],
      desktop: ['En Chrome o Edge, haz clic en el icono de instalación de la barra de direcciones', 'O abre el menú ⋮ → «Instalar Bridge 125»', 'Se abre en su propia ventana, como cualquier app'],
      qr: 'Escanea con la cámara del móvil para instalarla en tu teléfono', free: 'Gratis · menos de 1 MB · iPhone, Android, Mac, Windows',
    },
    acct: {
      tabIn: 'Entrar', tabUp: 'Crear cuenta', titleIn: 'Hola de nuevo', subIn: 'Entra para conservar tus estadísticas, tus BM y el estilo de tu mesa.',
      titleUp: 'Únete a Bridge 125', subUp: 'Cuenta gratis en 20 segundos. Tu progreso te acompaña en cualquier dispositivo.',
      email: 'Email', password: 'Contraseña', name: 'Apodo', namePh: 'p. ej., Eddy', nameHint: 'Se muestra en la mesa y en la clasificación', show: 'Mostrar', hide: 'Ocultar',
      forgot: '¿Olvidaste tu contraseña?', signIn: 'Entrar', signUp: 'Crear cuenta', or: 'o', useLink: 'Prefiero recibir un enlace por email', usePassword: 'Entrar con contraseña',
      noAccount: '¿Primera vez aquí?', haveAccount: '¿Ya tienes cuenta?', pwHint: 'Mínimo 8 caracteres', strength: ['Muy corta', 'Débil', 'Buena', 'Fuerte'],
      forgotTitle: 'Restablecer contraseña', forgotSub: 'Escribe tu email y te enviaremos un enlace para crear una contraseña nueva.', sendReset: 'Enviar enlace',
      resetSent: e => `Revisa ${e} y abre el enlace para elegir una contraseña nueva.`, back: 'Volver a iniciar sesión',
      newTitle: 'Crea una contraseña nueva', newSub: 'Elige una contraseña nueva para tu cuenta.', newPw: 'Contraseña nueva', repeatPw: 'Repite la contraseña', savePw: 'Guardar contraseña',
      pwSaved: 'Contraseña guardada. Ya has entrado.', mismatch: 'Las contraseñas no coinciden',
      welcomeNew: n => `¡Te damos la bienvenida a la mesa, ${n}!`, welcomeBack: '¡Qué bien verte de nuevo!',
      err: {
        badEmail: 'Introduce un email válido', short: 'La contraseña debe tener al menos 8 caracteres', wrong: 'Email o contraseña incorrectos',
        exists: 'Ya existe una cuenta con este email. Inicia sesión.', weak: 'Elige una contraseña más segura', notConfirmed: 'Primero confirma tu email',
        tooMany: 'Demasiados intentos. Espera un minuto', network: 'Sin conexión. Revisa tu internet', generic: 'Algo ha fallado. Inténtalo de nuevo.',
      },
    },
    prof: {
      tabs: { me: 'Perfil', look: 'Estilo', account: 'Cuenta' }, since: d => `Miembro desde ${d}`, winRate: '% de victorias', avatar: 'Avatar', saved: 'Guardado',
      preview: 'Vista previa', table: 'Mesa', accent: 'Color de acento', backs: 'Reversos', matchBack: 'Como la mesa', premium: 'Premium',
      locked: 'Premium: pronto en la tienda. Pruébalo en la vista previa.', adminFree: 'Admin: todos los artículos premium están desbloqueados para ti',
      guestLock: 'Inicia sesión para guardar tu estilo', tryOn: 'Probando', email: 'Email', security: 'Contraseña', changePw: 'Cambiar contraseña', pwChanged: 'Contraseña cambiada',
      danger: 'Zona de peligro', deleteAcc: 'Eliminar mi cuenta', deleteHint: 'Eliminaremos tu cuenta y tus datos en un plazo de 30 días.',
      admin: 'Admin', adminPanel: 'Abrir panel de admin', guestTitle: 'Juegas como invitado', guestSub: 'Crea una cuenta gratis para conservar estadísticas, BM y estilo en todos tus dispositivos.', prefs: 'Preferencias',
    },
  },

  privacy: {
    title: 'Política de privacidad',
    intro: 'Bridge 125 es un juego de cartas gratuito. Recogemos los mínimos datos posibles y nunca los vendemos.',
    sections: [
      { h: 'Qué guardamos', p: [
        'Sin cuenta: nada sobre ti sale de tu dispositivo, salvo el apodo que usas en una mesa online. Tus ajustes, una partida guardada y un ID de jugador aleatorio se guardan en el almacenamiento local de tu navegador.',
        'Con cuenta: tu dirección de email (solo para enviarte códigos de acceso), tu apodo, tu idioma, tu elección de color y mesa, y tus estadísticas de juego (partidas jugadas, victorias, saldo de BM).',
      ] },
      { h: 'Mesas online', p: ['Mientras juegas online, el estado de la mesa (asientos, apodos, cartas, jugadas) se mantiene en nuestro servidor para que todos los jugadores vean la misma partida. No está vinculado a tu email y se descarta cuando la mesa queda inactiva.'] },
      { h: 'Clasificación', p: ['Si tienes cuenta y terminas partidas, tu apodo y tus estadísticas pueden aparecer en la clasificación pública. Puedes cambiar tu apodo cuando quieras desde tu perfil.'] },
      { h: 'Quién trata los datos', p: ['Supabase (cuentas y estadísticas) y Cloudflare (alojamiento y mesas online) tratan datos por cuenta nuestra conforme a sus condiciones de tratamiento de datos. No usamos rastreadores publicitarios ni de analítica, ni cookies de terceros.'] },
      { h: 'Cuánto tiempo los conservamos', p: ['Los datos de la cuenta se conservan hasta que nos pidas eliminarlos. Los datos locales permanecen en tu navegador hasta que los borres.'] },
      { h: 'Tus derechos', p: [`Puedes pedir en cualquier momento el acceso a tus datos, su rectificación, exportación o supresión escribiendo a ${CONTACT_EMAIL}. Conforme al RGPD, también puedes presentar una reclamación ante tu autoridad de protección de datos.`] },
      { h: 'Menores', p: ['Bridge 125 está pensado para jugadores a partir de 16 años.'] },
    ],
  },

  terms: {
    title: 'Términos de uso',
    intro: 'Al jugar a Bridge 125 aceptas estas sencillas normas.',
    sections: [
      { h: 'El juego', p: ['Bridge 125 se ofrece gratis, «tal cual», como entretenimiento. Podemos cambiar, pausar o retirar funciones en cualquier momento.'] },
      { h: 'Bridge Money (BM)', p: ['Los BM son puntos virtuales que solo se usan dentro del juego. No tienen valor monetario, no se pueden comprar, vender, intercambiar ni retirar, y no constituyen un juego de azar.'] },
      { h: 'Juego limpio', p: ['Sé respetuoso en la mesa. Hacer trampas, automatizar el juego, aprovecharse de fallos, usar apodos ofensivos o acosar a otros jugadores no está permitido y puede conllevar la eliminación de tu cuenta.'] },
      { h: 'Tu cuenta', p: ['Protege el acceso a tu email: es como inicias sesión. Puedes dejar de jugar y pedirnos que eliminemos tu cuenta en cualquier momento.'] },
      { h: 'Responsabilidad', p: ['Nos esforzamos para que el juego funcione, pero no podemos garantizar que esté siempre disponible ni libre de errores. En la medida en que la ley lo permita, no respondemos de la pérdida de progreso ni de daños indirectos.'] },
      { h: 'Cambios', p: ['Si estos términos cambian, actualizaremos la fecha de arriba. Si sigues jugando, aceptas los términos actualizados.'] },
    ],
  },
};

export default es;
