/* Ta-Te-Ti accesible — lógica de juego, IA, gestión de foco y anuncios */

// ---------- Referencias al DOM ----------
const celdas = Array.from(document.querySelectorAll(".celda"));
const tableroGrid = document.querySelector(".tablero-grid");
const panelNivel = document.getElementById("panel-nivel");
const panelJugando = document.getElementById("panel-jugando");
const panelFinalizado = document.getElementById("panel-finalizado");
const btnIniciar = document.getElementById("btn-iniciar");
const btnSiguiente = document.getElementById("btn-siguiente");
const btnFinalizar = document.getElementById("btn-finalizar");
const btnNuevo = document.getElementById("btn-nuevo");
const btnSonido = document.getElementById("btn-sonido");
const sonidoLabel = document.getElementById("sonido-label");
const btnTema = document.getElementById("btn-tema");
const temaLabel = document.getElementById("tema-label");
const anuncios = document.getElementById("anuncios");
const estadoTurno = document.getElementById("estado-turno");
const resumen = document.getElementById("resumen");
const panelPuntuacion = document.getElementById("panel-puntuacion");
const btnAyuda = document.getElementById("btn-ayuda");
const btnCerrarAyuda = document.getElementById("btn-cerrar-ayuda");
const dialogoAyuda = document.getElementById("dialogo-ayuda");
const inputCantidad = document.getElementById("cantidad-partidas");
const checkboxSinLimite = document.getElementById("sin-limite");
const scoreVictorias = document.getElementById("score-victorias");
const scoreDerrotas = document.getElementById("score-derrotas");
const scoreEmpates = document.getElementById("score-empates");
const scorePartidas = document.getElementById("score-partidas");

// ---------- Constantes ----------
const LINEAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
  [0, 4, 8], [2, 4, 6],            // diagonales
];

const NIVEL_TEXTO = { facil: "Fácil", medio: "Medio", imposible: "Imposible" };

// ---------- Estado ----------
let fase = "inicio"; // "inicio" | "jugando" | "finalizado"
let nivel = "facil";
let tablero = Array(9).fill(null); // null | "X" | "O"
let marcador = { victorias: 0, derrotas: 0, empates: 0, partidas: 0 };
let esTurnoMaquina = false;
let juegoTerminado = false;
let celdaActiva = 0;
let limitePartidas = Infinity; // Infinity = torneo sin límite
let disparadorAyuda = null; // elemento que abrió el diálogo de ayuda

// ---------- Sonido (Web Audio) ----------
let audioCtx = null;
let sonidoActivo = true;

function asegurarAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function tocarTonos(frecuencias, duracion) {
  if (!sonidoActivo || !audioCtx) return;
  const inicioBase = audioCtx.currentTime;
  frecuencias.forEach((frecuencia, i) => {
    const osc = audioCtx.createOscillator();
    const ganancia = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = frecuencia;

    const inicio = inicioBase + i * duracion;
    const fin = inicio + duracion;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.3, inicio + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, fin);

    osc.connect(ganancia);
    ganancia.connect(audioCtx.destination);
    osc.start(inicio);
    osc.stop(fin + 0.02);
  });
}

function sonarExito() {
  tocarTonos([523.25, 659.25, 783.99], 0.15); // C5, E5, G5 ascendente
}

function sonarFracaso() {
  tocarTonos([220.0, 174.61, 146.83], 0.18); // descendente grave
}

function sonarEmpate() {
  tocarTonos([392.0, 392.0], 0.18); // dos tonos iguales, neutros
}

function actualizarBotonSonido() {
  btnSonido.setAttribute("aria-pressed", String(sonidoActivo));
  sonidoLabel.textContent = sonidoActivo ? "Sonido: activado" : "Sonido: silenciado";
}

function alternarSonido() {
  sonidoActivo = !sonidoActivo;
  localStorage.setItem("ta-te-ti:sonido", sonidoActivo ? "on" : "off");
  actualizarBotonSonido();
  anunciar(sonidoActivo ? "Sonido activado." : "Sonido silenciado.");
}

// ---------- Tema (claro / oscuro) ----------
function temaOscuroActivo() {
  const tema = document.documentElement.dataset.tema;
  if (tema === "oscuro") return true;
  if (tema === "claro") return false;
  // Sin preferencia guardada: sigue al sistema.
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function actualizarBotonTema() {
  const oscuro = temaOscuroActivo();
  btnTema.setAttribute("aria-pressed", String(oscuro));
  temaLabel.textContent = oscuro ? "Modo oscuro: activado" : "Modo oscuro: desactivado";
}

function alternarTema() {
  const oscuro = temaOscuroActivo();
  const nuevo = oscuro ? "claro" : "oscuro";
  document.documentElement.dataset.tema = nuevo;
  try {
    localStorage.setItem("ta-te-ti:tema", nuevo);
  } catch (e) {
    // Almacenamiento no disponible: el tema aplica igual durante la sesión.
  }
  actualizarBotonTema();
  anunciar(oscuro ? "Modo oscuro desactivado." : "Modo oscuro activado.");
}

// ---------- Utilidades ----------
function posicionNombre(i) {
  const fila = Math.floor(i / 3) + 1;
  const col = (i % 3) + 1;
  return "fila " + fila + ", columna " + col;
}

function etiquetaCelda(i, contenido) {
  const pos = posicionNombre(i);
  const posCapitalizada = pos.charAt(0).toUpperCase() + pos.slice(1);
  return posCapitalizada + ", " + contenido;
}

function celdasVacias() {
  return tablero.reduce((acc, valor, i) => (valor === null ? acc.concat(i) : acc), []);
}

function hayGanador() {
  for (const linea of LINEAS) {
    const [a, b, c] = linea;
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
      return tablero[a];
    }
  }
  return null;
}

function obtenerLineaGanadora() {
  for (const linea of LINEAS) {
    const [a, b, c] = linea;
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
      return linea;
    }
  }
  return null;
}

function nivelTexto() {
  return NIVEL_TEXTO[nivel];
}

function textoMarcador() {
  return (
    marcador.victorias +
    " victorias, " +
    marcador.derrotas +
    " derrotas, " +
    marcador.empates +
    " empates"
  );
}

function textoResumen() {
  return (
    "Jugaste " +
    marcador.partidas +
    " partidas: " +
    marcador.victorias +
    " victorias, " +
    marcador.derrotas +
    " derrotas, " +
    marcador.empates +
    " empates"
  );
}

function leerLimitePartidas() {
  if (checkboxSinLimite.checked) return Infinity;
  const valor = Number(inputCantidad.value);
  if (Number.isFinite(valor) && valor >= 1) return Math.floor(valor);
  return 5; // valor por defecto si el campo está vacío o es inválido
}

function textoInicioTorneo() {
  const base = "Torneo iniciado en nivel " + nivelTexto() + ".";
  if (limitePartidas === Infinity) return base + " Tu turno.";
  return base + " Partida 1 de " + limitePartidas + ". Tu turno.";
}

function textoNuevaPartida() {
  if (limitePartidas === Infinity) return "Nueva partida. Tu turno.";
  return "Partida " + (marcador.partidas + 1) + " de " + limitePartidas + ". Tu turno.";
}

// ---------- IA ----------
function jugadaAleatoria() {
  const vacias = celdasVacias();
  return vacias[Math.floor(Math.random() * vacias.length)];
}

function buscarJugadaGanadora(simbolo) {
  for (const i of celdasVacias()) {
    tablero[i] = simbolo;
    const gana = hayGanador() === simbolo;
    tablero[i] = null;
    if (gana) return i;
  }
  return null;
}

function jugadaMedio() {
  // 1. ganar si puede
  const ganadora = buscarJugadaGanadora("O");
  if (ganadora !== null) return ganadora;
  // 2. bloquear si el jugador puede ganar
  const bloqueo = buscarJugadaGanadora("X");
  if (bloqueo !== null) return bloqueo;
  // 3. al azar
  return jugadaAleatoria();
}

function minimax(profundidad, esMaximizador, alfa, beta) {
  const ganador = hayGanador();
  if (ganador === "O") return 10 - profundidad; // gana la máquina
  if (ganador === "X") return profundidad - 10; // gana el jugador
  if (celdasVacias().length === 0) return 0; // empate

  if (esMaximizador) {
    let mejor = -Infinity;
    for (const i of celdasVacias()) {
      tablero[i] = "O";
      mejor = Math.max(mejor, minimax(profundidad + 1, false, alfa, beta));
      tablero[i] = null;
      alfa = Math.max(alfa, mejor);
      if (beta <= alfa) break;
    }
    return mejor;
  } else {
    let mejor = Infinity;
    for (const i of celdasVacias()) {
      tablero[i] = "X";
      mejor = Math.min(mejor, minimax(profundidad + 1, true, alfa, beta));
      tablero[i] = null;
      beta = Math.min(beta, mejor);
      if (beta <= alfa) break;
    }
    return mejor;
  }
}

function jugadaImposible() {
  let mejor = -Infinity;
  let mejorMov = null;
  for (const i of celdasVacias()) {
    tablero[i] = "O";
    const puntaje = minimax(0, false, -Infinity, Infinity);
    tablero[i] = null;
    if (puntaje > mejor) {
      mejor = puntaje;
      mejorMov = i;
    }
  }
  return mejorMov;
}

function calcularJugadaMaquina() {
  switch (nivel) {
    case "facil":
      return jugadaAleatoria();
    case "medio":
      return jugadaMedio();
    case "imposible":
      return jugadaImposible();
  }
}

// ---------- Render del tablero ----------
function limpiarTablero() {
  tablero = Array(9).fill(null);
  celdas.forEach((btn, i) => {
    btn.textContent = "";
    btn.classList.remove("celda-x", "celda-o", "celda-ganadora");
    btn.setAttribute("aria-label", etiquetaCelda(i, "vacía"));
  });
}

function colocar(i, simbolo) {
  tablero[i] = simbolo;
  const btn = celdas[i];
  btn.innerHTML = "<span class=\"simbolo\">" + simbolo + "</span>";
  btn.classList.add(simbolo === "X" ? "celda-x" : "celda-o");
  btn.setAttribute("aria-label", etiquetaCelda(i, simbolo));
}

function actualizarCeldaActiva(i) {
  celdaActiva = i;
  celdas.forEach((btn, idx) => {
    btn.tabIndex = idx === i ? 0 : -1;
  });
}

function fijarFocoEn(i) {
  actualizarCeldaActiva(i);
  celdas[i].focus();
}

function setBoardDisabled(deshabilitado) {
  celdas.forEach((btn) => {
    btn.disabled = deshabilitado;
  });
}

function actualizarPuntuacion() {
  scoreVictorias.textContent = marcador.victorias;
  scoreDerrotas.textContent = marcador.derrotas;
  scoreEmpates.textContent = marcador.empates;
  scorePartidas.textContent = marcador.partidas;
}

// ---------- Anuncios ----------
let alternarAnuncio = false;

function anunciar(mensaje) {
  alternarAnuncio = !alternarAnuncio;
  // Alterna un espacio final (que el lector de pantalla no pronuncia) para
  // forzar un cambio real en la región viva en cada anuncio, incluso cuando
  // dos mensajes consecutivos son idénticos. Una única mutación es más
  // fiable para VoiceOver que el patrón "limpiar y rellenar con setTimeout".
  anuncios.textContent = alternarAnuncio ? mensaje + " " : mensaje;
}

function mostrarEstado(texto) {
  estadoTurno.textContent = texto;
}

// ---------- Estados ----------
function setFase(nueva) {
  fase = nueva;
  panelNivel.hidden = nueva !== "inicio";
  panelJugando.hidden = nueva !== "jugando";
  panelFinalizado.hidden = nueva !== "finalizado";
  // En Finalizado la puntuación se oculta: el resumen ya muestra esos datos.
  panelPuntuacion.hidden = nueva === "finalizado";
}

// ---------- Flujo del juego ----------
function nivelSeleccionado() {
  return document.querySelector('input[name="nivel"]:checked').value;
}

function iniciarTorneo() {
  asegurarAudio();
  nivel = nivelSeleccionado();
  limitePartidas = leerLimitePartidas();
  marcador = { victorias: 0, derrotas: 0, empates: 0, partidas: 0 };
  esTurnoMaquina = false;
  juegoTerminado = false;

  actualizarPuntuacion();
  limpiarTablero();
  setFase("jugando");
  setBoardDisabled(false);
  btnSiguiente.hidden = true;

  mostrarEstado("Tu turno");
  anunciar(textoInicioTorneo());
  fijarFocoEn(0);
}

function comprobarResultado() {
  const ganador = hayGanador();
  if (ganador === "X") return "victoria";
  if (ganador === "O") return "derrota";
  if (celdasVacias().length === 0) return "empate";
  return null;
}

function terminarPartida(resultado, movMaquina) {
  juegoTerminado = true;
  esTurnoMaquina = false;
  tableroGrid.removeAttribute("aria-busy");

  // Resalta la línea ganadora (solo en victoria o derrota, no en empate).
  if (resultado === "victoria" || resultado === "derrota") {
    const linea = obtenerLineaGanadora();
    if (linea) linea.forEach((i) => celdas[i].classList.add("celda-ganadora"));
  }

  marcador.partidas += 1;

  // Si la máquina terminó la partida, su jugada y el resultado se anuncian juntos
  // para que no se pisen dos anuncios consecutivos.
  const prefijo =
    movMaquina !== undefined
      ? "La máquina jugó en " + posicionNombre(movMaquina) + ". "
      : "";

  if (resultado === "victoria") {
    marcador.victorias += 1;
    sonarExito();
    mostrarEstado("¡Ganaste!");
    anunciar("¡Ganaste! Marcador: " + textoMarcador() + ".");
  } else if (resultado === "derrota") {
    marcador.derrotas += 1;
    sonarFracaso();
    mostrarEstado("La máquina ganó");
    anunciar(prefijo + "La máquina ganó. Marcador: " + textoMarcador() + ".");
  } else {
    marcador.empates += 1;
    sonarEmpate();
    mostrarEstado("Empate");
    anunciar(prefijo + "Empate. Marcador: " + textoMarcador() + ".");
  }

  actualizarPuntuacion();

  if (marcador.partidas >= limitePartidas) {
    // Se completó el límite de partidas: el torneo se cierra solo.
    setTimeout(() => {
      if (fase === "jugando" && dialogoAyuda.hidden) {
        finalizarTorneo(true);
      }
    }, 2000);
  } else {
    btnSiguiente.hidden = false;
    // El foco se mueve con un delay amplio: moverlo antes interrumpe a
    // VoiceOver en pleno anuncio del resultado.
    setTimeout(() => {
      if (fase === "jugando" && juegoTerminado) {
        btnSiguiente.focus();
      }
    }, 2500);
  }
}

function jugarJugador(i) {
  if (fase !== "jugando" || esTurnoMaquina || juegoTerminado) return;
  if (tablero[i] !== null) {
    anunciar("Esa celda ya está ocupada. Elegí otra.");
    return;
  }

  asegurarAudio();
  colocar(i, "X");

  const resultado = comprobarResultado();
  if (resultado) {
    terminarPartida(resultado);
    return;
  }

  esTurnoMaquina = true;
  tableroGrid.setAttribute("aria-busy", "true");
  mostrarEstado("Turno de la máquina…");
  anunciar("Turno de la máquina.");

  setTimeout(() => {
    if (fase !== "jugando") return; // el torneo se finalizó mientras la máquina pensaba

    const mov = calcularJugadaMaquina();
    colocar(mov, "O");
    esTurnoMaquina = false;
    tableroGrid.removeAttribute("aria-busy");

    const resultadoMaquina = comprobarResultado();
    if (resultadoMaquina) {
      terminarPartida(resultadoMaquina, mov);
    } else {
      mostrarEstado("Tu turno");
      anunciar("La máquina jugó en " + posicionNombre(mov) + ". Tu turno.");
    }
  }, 500);
}

function siguientePartida() {
  asegurarAudio();
  juegoTerminado = false;
  esTurnoMaquina = false;

  limpiarTablero();
  mostrarEstado("Tu turno");
  anunciar(textoNuevaPartida());

  fijarFocoEn(0); // foco a la primera celda (índice 0)
  btnSiguiente.hidden = true; // recién después se oculta el botón
}

function finalizarTorneo(completado) {
  esTurnoMaquina = false;
  juegoTerminado = true;
  tableroGrid.removeAttribute("aria-busy");

  setFase("finalizado");
  setBoardDisabled(true);
  btnSiguiente.hidden = true;

  const prefijo = completado ? "Torneo completado." : "Torneo finalizado.";
  const texto = textoResumen();
  resumen.textContent = prefijo + " " + texto;
  mostrarEstado("");

  resumen.focus(); // el resumen recibe el foco y se anuncia al recibirlo
}

function nuevoTorneo() {
  setFase("inicio");
  marcador = { victorias: 0, derrotas: 0, empates: 0, partidas: 0 };
  actualizarPuntuacion();
  limpiarTablero();
  setBoardDisabled(true);
  mostrarEstado("");

  document.querySelector('input[name="nivel"]:checked').focus();
}

// ---------- Diálogo de ayuda ----------
function toggleSinLimite() {
  inputCantidad.disabled = checkboxSinLimite.checked;
}

function abrirAyuda() {
  disparadorAyuda = document.activeElement;
  dialogoAyuda.hidden = false;
  dialogoAyuda.focus();
}

function cerrarAyuda() {
  dialogoAyuda.hidden = true;
  if (disparadorAyuda) {
    disparadorAyuda.focus();
  }
}

// ---------- Eventos ----------
celdas.forEach((btn) => {
  btn.addEventListener("click", () => {
    const i = Number(btn.dataset.index);
    actualizarCeldaActiva(i); // sincroniza el roving tabindex con el clic del puntero
    jugarJugador(i);
  });
});

tableroGrid.addEventListener("keydown", (evento) => {
  if (fase !== "jugando") return;

  const idx = celdaActiva;
  let nuevo = null;
  switch (evento.key) {
    case "ArrowLeft":
      if (idx % 3 > 0) nuevo = idx - 1;
      break;
    case "ArrowRight":
      if (idx % 3 < 2) nuevo = idx + 1;
      break;
    case "ArrowUp":
      if (idx >= 3) nuevo = idx - 3;
      break;
    case "ArrowDown":
      if (idx < 6) nuevo = idx + 3;
      break;
  }

  if (nuevo !== null) {
    evento.preventDefault();
    fijarFocoEn(nuevo);
  }
});

btnIniciar.addEventListener("click", iniciarTorneo);
btnSiguiente.addEventListener("click", siguientePartida);
btnFinalizar.addEventListener("click", () => finalizarTorneo());
btnNuevo.addEventListener("click", nuevoTorneo);
btnSonido.addEventListener("click", alternarSonido);
btnTema.addEventListener("click", alternarTema);
btnAyuda.addEventListener("click", abrirAyuda);
btnCerrarAyuda.addEventListener("click", cerrarAyuda);
checkboxSinLimite.addEventListener("change", toggleSinLimite);

// Trampa de foco y cierre con Esc dentro del diálogo de ayuda
dialogoAyuda.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    evento.preventDefault();
    cerrarAyuda();
    return;
  }
  if (evento.key !== "Tab") return;

  const focusables = dialogoAyuda.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;

  const primero = focusables[0];
  const ultimo = focusables[focusables.length - 1];

  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
});

// Sigue al sistema mientras no haya preferencia manual guardada
const mediaOscura = window.matchMedia("(prefers-color-scheme: dark)");
mediaOscura.addEventListener("change", () => {
  try {
    if (localStorage.getItem("ta-te-ti:tema") === null) {
      actualizarBotonTema();
    }
  } catch (e) {
    // Almacenamiento no disponible: el botón ya refleja el estado actual.
  }
});

// ---------- Inicialización ----------
function init() {
  setFase("inicio");
  setBoardDisabled(true);

  const pref = localStorage.getItem("ta-te-ti:sonido");
  sonidoActivo = pref !== "off";
  actualizarBotonSonido();

  actualizarBotonTema();
}

init();
