# Diseño técnico — Ta-Te-Ti accesible (WCAG 2.2)

Este documento define el **cómo** de la spec (`spec.md`): arquitectura, estructura del
DOM, lógica de juego, gestión de foco, sonido y estilos. No es código final, pero
contiene todas las decisiones que la implementación debe respetar.

## 1. Arquitectura y archivos

Proyecto vanilla, sin dependencias ni paso de build.

```
Ta-Te-Ti/
  index.html   — estructura semántica
  styles.css   — presentación y accesibilidad visual
  script.js    — lógica de juego, IA, foco y anuncios
  spec.md      — contrato de requisitos
  design.md    — este documento
```

Separación de responsabilidades:

- **HTML**: semántica y accesibilidad estructural (roles, labels, regions).
- **CSS**: layout, contraste, foco visible, tamaño de objetivos, `prefers-reduced-motion`.
- **JS**: estado del juego, IA, gestión de foco (roving tabindex), anuncios vía
  `aria-live` y sonido. El JS **no** inventa semántica: opera sobre el HTML ya accesible.

## 2. Estructura del DOM

Esqueleto semántico (resumido; los textos son el copy final en español):

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ta-Te-Ti accesible</title>
</head>
<body>
  <a class="skip-link" href="#tablero">Saltar al tablero</a>

  <header>
    <h1>Ta-Te-Ti</h1>
    <button type="button" id="btn-sonido" aria-pressed="true">
      <span id="sonido-label">Sonido: activado</span>
    </button>
  </header>

  <main>
    <!-- Estado INICIO -->
    <section id="panel-nivel" aria-labelledby="titulo-nivel">
      <h2 id="titulo-nivel" class="sr-only">Nivel de dificultad</h2>
      <fieldset>
        <legend>Nivel de dificultad</legend>
        <label><input type="radio" name="nivel" value="facil" checked /> Fácil</label>
        <label><input type="radio" name="nivel" value="medio" /> Medio</label>
        <label><input type="radio" name="nivel" value="imposible" /> Imposible</label>
      </fieldset>
      <button type="button" id="btn-iniciar">Iniciar torneo</button>
    </section>

    <!-- Tablero (visible en JUGANDO y FINALIZADO) -->
    <section id="tablero" aria-labelledby="titulo-tablero">
      <h2 id="titulo-tablero" class="sr-only">Tablero</h2>
      <div class="tablero-grid" role="presentation">
        <button class="celda" data-index="0" aria-label="Fila 1, columna 1, vacía"></button>
        <!-- ... 9 celdas en total, data-index 0..8 ... -->
      </div>
    </section>

    <!-- Puntuación -->
    <section aria-labelledby="titulo-puntuacion">
      <h2 id="titulo-puntuacion" class="sr-only">Puntuación del torneo</h2>
      <table>
        <caption>Puntuación del torneo</caption>
        <thead>
          <tr>
            <th scope="col">Victorias</th>
            <th scope="col">Derrotas</th>
            <th scope="col">Empates</th>
            <th scope="col">Partidas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td id="score-victorias">0</td>
            <td id="score-derrotas">0</td>
            <td id="score-empates">0</td>
            <td id="score-partidas">0</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Estado JUGANDO -->
    <section id="panel-jugando" hidden>
      <button type="button" id="btn-siguiente" hidden>Siguiente partida</button>
      <button type="button" id="btn-finalizar">Finalizar torneo</button>
    </section>

    <!-- Estado FINALIZADO -->
    <section id="panel-finalizado" hidden>
      <h2 class="sr-only">Resumen del torneo</h2>
      <p id="resumen"></p>
      <button type="button" id="btn-nuevo">Iniciar nuevo torneo</button>
    </section>

    <!-- Región viva de estado -->
    <div id="anuncios" class="sr-only" role="status" aria-live="polite"></div>
  </main>
</body>
</html>
```

### Decisiones de semántica

- **Celdas = `<button>`**: control nativo, enfocable y activable con teclado. El
  `aria-label` describe posición y contenido ("Fila 2, columna 3, vacía") y se actualiza
  al jugar ("Fila 2, columna 3, X").
- **Selector de nivel = `fieldset` + `legend` + radios nativos**: agrupa semánticamente
  la pregunta (1.3.1) y el teclado nativo ya permite mover con flechas dentro del grupo.
  Cada `<label>` envuelve su radio, dando nombre accesible gratis.
- **Puntuación = `<table>`** con `<caption>` y `<th scope="col">`: relaciona cada valor
  con su etiqueta sin depender del color.
- **Región viva única** (`#anuncios`, `role="status"` + `aria-live="polite"`): canal
  central de anuncios. Evita anuncios duplicados concentrando todo en un solo punto.
- **`.sr-only`**: técnica de ocultamiento accesible (con `clip-path`, no `display:none`,
  que retira el contenido del árbol de accesibilidad) para encabezados estructurales que
  no se muestran visualmente.
- **Visibilidad por estado**: los paneles de JUGANDO y FINALIZADO usan el atributo
  `hidden`. El atributo `hidden` los retira del árbol de accesibilidad (correcto: no
  deben ser alcanzables fuera de su estado).

## 3. Gestión de foco y teclado

### Roving tabindex

- Una sola celda tiene `tabindex="0"` en cada momento; el resto `tabindex="-1"`.
- Al entrar al tablero con Tab, el foco cae en la celda "activa".
- Las flechas mueven el foco entre celdas (arriba/abajo/izquierda/derecha), actualizando
  cuál celda es `tabindex="0"`.
- `Enter` y `Espacio` activan la celda (comportamiento nativo de `<button>`).
- El foco se conserva entre jugadas: tras jugar, la celda jugada mantiene el foco y
  sigue siendo `tabindex="0"`, de modo que el usuario continúa desde donde estaba.

### Turno de la máquina (sin pérdida de foco)

- **No** se usa el atributo `disabled` en las celdas durante el turno de la máquina,
  porque `disabled` retira el elemento del orden de tabulación y **hace perder el foco**.
- En su lugar:
  1. Una bandera JS `esTurnoMaquina = true` ignora cualquier activación del jugador.
  2. El contenedor del tablero recibe `aria-busy="true"` durante el turno de la máquina.
  3. Un indicador de texto visible y anunciado ("Turno de la máquina…") comunica el
     estado también de forma visual.

### Enfoque tras eventos

- Tras jugar, el foco permanece en la celda jugada.
- Al finalizar una partida, se muestra el botón "Siguiente partida" y el foco se mueve
  a él. Así el usuario no tiene que buscarlo: el foco lo lleva directo a la acción.
- Al activar "Siguiente partida", el foco se mueve a la primera celda (índice 0) del
  tablero (`tabindex="0"`) y, recién después, el botón se oculta; el foco nunca queda
  sobre un elemento oculto.
- Al iniciar un torneo, el foco se mueve a la primera celda (índice 0) del tablero.
- Al finalizar un torneo, el foco se mueve al botón "Iniciar nuevo torneo".

## 4. Lógica del juego

### Representación del estado

```js
const estado = {
  fase: 'inicio' | 'jugando' | 'finalizado',
  nivel: 'facil' | 'medio' | 'imposible',
  tablero: Array(9).fill(null),        // null | 'X' | 'O'
  turno: 'X' | 'O',                    // X = jugador, O = máquina
  marcador: { victorias: 0, derrotas: 0, empates: 0, partidas: 0 },
  esTurnoMaquina: false,
};
```

### Detección de victoria

Líneas ganadoras (índices 0–8):

```
[0,1,2] [3,4,5] [6,7,8]   // filas
[0,3,6] [1,4,7] [2,5,8]   // columnas
[0,4,8] [2,4,6]           // diagonales
```

Tras cada jugada se comprueba si alguna línea está completa con el mismo símbolo.

### IA por nivel

- **Fácil**: elegir una celda vacía al azar.
- **Medio**: (1) si la máquina tiene jugada ganadora, la realiza; (2) si el jugador
  puede ganar en su próxima jugada, la bloquea; (3) en otro caso, al azar.
- **Imposible**: minimax (con poda alfa-beta) evaluando todas las celdas vacías. La
  máquina maximiza su puntuación (+10 victoria de O, -10 victoria de X, 0 empate).

### Flujo de una jugada

1. El jugador activa una celda vacía → se coloca `X`, se comprueba fin de partida.
2. Si la partida no terminó → `esTurnoMaquina = true`, se anuncia "Turno de la máquina".
3. Tras 400–600 ms, se calcula y coloca la jugada de la máquina, se anuncia, se comprueba
   fin de partida y `esTurnoMaquina = false`.

## 5. Anuncios y regiones vivas

Todo cambio de estado pasa por la región viva `#anuncios` (`aria-live="polite"`). Copy
final (español neutro):

| Evento | Mensaje |
| ------ | ------- |
| Turno del jugador | "Tu turno." |
| Turno de la máquina | "Turno de la máquina." |
| Jugada de la máquina | "La máquina jugó en fila {f}, columna {c}." |
| Celda ocupada | "Esa celda ya está ocupada. Elegí otra." |
| Victoria | "¡Ganaste! Marcador: {v} victorias, {d} derrotas, {e} empates." |
| Derrota | "La máquina ganó. Marcador: {v} victorias, {d} derrotas, {e} empates." |
| Empate | "Empate. Marcador: {v} victorias, {d} derrotas, {e} empates." |
| Inicio de torneo | "Torneo iniciado en nivel {nivel}." |
| Nueva partida | "Nueva partida. Tu turno." |
| Fin de torneo | "Torneo finalizado. Jugaste {p} partidas: {v} victorias, {d} derrotas, {e} empates." |
| Sonido | "Sonido activado." / "Sonido silenciado." |

### Reglas de anuncio

- El turno de la máquina se anuncia **antes** de mostrar su jugada, con el retardo de
  400–600 ms para que el lector de pantalla termine de leer.
- El resultado de la partida incluye el marcador actualizado en el mismo mensaje
  (evita duplicar: la tabla de puntuación **no** es a su vez región viva).
- Para que un mismo texto se vuelva a anunciar, se limpia la región viva (se vacía su
  contenido) antes de insertar el siguiente mensaje.

## 6. Sonido

- **Implementación**: Web Audio API con `OscillatorNode` + `GainNode`. Sin archivos de
  audio. Duración breve (< 500 ms), por lo que no aplica la exigencia de 3 segundos de
  1.4.2; aun así, hay control de silencio.
- **Éxito**: dos tonos ascendentes (notas de un acorde mayor) con envolvente suave.
- **Fracaso**: tono descendente grave (zumbido corto).
- **Control de silencio**: botón `#btn-sonido` con `aria-pressed`. El texto cambia entre
  "Sonido: activado" y "Sonido: silenciado". La preferencia se guarda en `localStorage`
  (clave `ta-te-ti:sonido`) y se restaura al cargar.
- **Autoplay**: el `AudioContext` se crea/reanuda dentro de un gesto del usuario (el
  primer clic). Nunca se reproduce sonido como único canal: el resultado siempre se
  anuncia por texto.

## 7. Estilos (CSS)

### Layout

- Tablero: `display: grid; grid-template-columns: repeat(3, 1fr);` con ancho máximo y
  centrado.
- Cada celda con `aspect-ratio: 1 / 1` y altura mínima de 64 px (supera el mínimo de
  24×24 px de 2.5.8).
- Contenedor con `max-width` para que a 320 px no haya desplazamiento horizontal (1.4.10).
- El texto admite `rem` y escalado de hasta 200 % sin romper el layout (1.4.4).

### Contraste y color

Paleta candidata (verificar valores exactos con herramienta de contraste al implementar):

| Token | Valor | Uso | Contraste objetivo |
| ----- | ----- | --- | ------------------ |
| `--bg` | `#ffffff` | fondo | — |
| `--texto` | `#1b1b1b` | texto principal | ≥ 4.5:1 ✓ |
| `--x` | `#1d4ed8` (azul) | símbolo X | ≥ 4.5:1 ✓ |
| `--o` | `#b91c1c` (rojo) | símbolo O | ≥ 4.5:1 ✓ |
| `--borde` | `#1b1b1b` | líneas del tablero | ≥ 3:1 ✓ |

Los símbolos X y O son letras distintas (forma) además de color; el color es refuerzo,
nunca el único canal.

### Foco visible

```css
:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
  box-shadow: 0 0 0 5px #ffffff; /* anillo claro sobre fondos oscuros */
}
```

Esto garantiza un indicador de ≥ 3:1 (2.4.13) que no queda oculto (2.4.11).

### Tamaño de objetivos

- Celdas: ≥ 64 px (2.5.8).
- Botones: altura mínima 44 px y `padding` amplio.
- Radios: el `<label>` envolvente recibe `padding` para que el área clicable sea ≥ 24×24
  px (el input nativo es pequeño; el label agranda el objetivo).

### Movimiento reducido

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

Sin destellos de más de tres por segundo (2.3.1).

## 8. Máquina de estados y flujo completo

```
INICIO ──[Iniciar torneo]──► JUGANDO ──[Finalizar torneo]──► FINALIZADO
                                ▲                              │
                                └──────[Iniciar nuevo torneo]──┘
```

Dentro de JUGANDO, las partidas se encadenan:

1. Se anuncia "Nueva partida. Tu turno." y el foco va a la primera celda (índice 0).
2. Jugador mueve → máquina mueve → fin de partida (victoria/derrota/empate).
3. Se anuncia el resultado con el marcador actualizado, se actualiza la puntuación y se
   muestra el botón "Siguiente partida".
4. El foco se mueve al botón "Siguiente partida".
5. Al activarlo, el tablero se limpia, el botón se oculta, el foco vuelve a la primera
   celda (índice 0) y comienza la siguiente partida.

## 9. Decisiones de diseño y tradeoffs

1. **`disabled` vs `aria-busy` en el turno de la máquina**: `disabled` hace perder el
   foco (sale del orden de tabulación). Se usa bandera JS + `aria-busy` para conservar
   el foco y la orientación del usuario.
2. **Texto "X"/"O" en lugar de SVG o emoji**: las letras ya son formas distintas (1.4.1)
   y son texto nativo accesible; se evita complejidad innecesaria.
3. **Región viva única** en lugar de varias: concentrar los anuncios evita lecturas
   duplicadas y superpuestas; el resultado incluye el marcador en el mismo mensaje.
4. **Botón "Siguiente partida"**: tras cada partida no se reinicia sola; se muestra un
   botón "Siguiente partida" y el foco se mueve a él. Da control explícito (3.2) y tiempo
   para procesar el resultado, y el envío de foco elimina la búsqueda manual del control.
5. **Puntuación en tabla, no en región viva**: la tabla es consultable por navegación;
   los cambios se comunican por el mensaje de resultado, no por una segunda región viva.
