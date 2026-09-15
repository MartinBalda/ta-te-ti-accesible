# Spec — Ta-Te-Ti accesible (WCAG 2.2)

## 1. Objetivo

Crear un juego de ta-te-ti (tres en línea) de jugador contra máquina, en español,
accesible según WCAG 2.2 nivel AA, implementado con HTML, CSS y JavaScript vanilla.

## 2. Alcance

**Incluido**

- Tablero de 3×3 jugable por teclado y puntero.
- Modo jugador (X) contra máquina (O).
- Tres niveles de dificultad: Fácil, Medio e Imposible.
- Torneo con puntuación acumulada: victorias, derrotas, empates y partidas jugadas.
- Ciclo de estados: Inicio → Jugando → Finalizado.
- Sonidos de éxito y fracaso, con botón de silencio persistente.
- Botones: "Iniciar torneo", "Finalizar torneo" e "Iniciar nuevo torneo".

**Excluido**

- Modo de dos jugadores locales.
- Persistencia de la puntuación entre sesiones (solo se persiste la preferencia de sonido).
- Modo en línea o multijugador por red.
- Variantes del juego (tableros mayores, reglas alternativas).
- Soporte de navegadores antiguos (Internet Explorer).

## 3. Estados del juego

El juego es una máquina de estados con tres estados excluyentes.

| Estado       | Contenido visible                              | Controles activos                            |
| ------------ | ---------------------------------------------- | -------------------------------------------- |
| **Inicio**   | Selector de nivel, tablero vacío, puntuación a cero | Radios de nivel, "Iniciar torneo"        |
| **Jugando**  | Tablero activo, puntuación en curso            | Tablero, "Finalizar torneo"                  |
| **Finalizado** | Resumen del torneo, tablero bloqueado        | "Iniciar nuevo torneo"                       |

Transiciones:

- **Inicio → Jugando**: al activar "Iniciar torneo".
- **Jugando → Finalizado**: al activar "Finalizar torneo".
- **Finalizado → Inicio**: al activar "Iniciar nuevo torneo".

El nivel de dificultad solo se elige en el estado Inicio. No es posible cambiar de nivel
durante un torneo en curso.

## 4. Requisitos funcionales

### RF-1. Tablero

1. El tablero tiene 9 celdas dispuestas en una cuadrícula de 3×3.
2. Cada celda es un control nativo de botón (`<button>`).
3. Cada celda tiene un nombre accesible que describe su posición (fila y columna) y su
   contenido ("vacía", "X" u "O").
4. El jugador humano juega con X y mueve primero.

### RF-2. Turno del jugador

1. En su turno, el jugador puede activar cualquier celda vacía.
2. Al activar una celda vacía, se coloca la X del jugador y el turno pasa a la máquina.
3. Al activar una celda ocupada, la acción no produce cambios y se anuncia que la celda
   ya está ocupada.

### RF-3. Turno de la máquina

1. Tras la jugada del jugador (y si la partida no terminó), la máquina responde con una
   jugada según el nivel seleccionado.
2. Durante el turno de la máquina, el tablero queda deshabilitado para el jugador.
3. La jugada de la máquina no aparece de forma instantánea: se introduce un retardo de
   400–600 ms para permitir el anuncio de estado antes de mostrar el movimiento.

### RF-4. Niveles de dificultad

1. **Fácil**: la máquina elige una celda vacía al azar.
2. **Medio**: la máquina aplica una heurística en este orden: (a) si tiene una jugada
   ganadora, la realiza; (b) si el jugador puede ganar en la próxima jugada, la bloquea;
   (c) en cualquier otro caso, elige al azar.
3. **Imposible**: la máquina usa el algoritmo minimax y no pierde nunca.

### RF-5. Fin de partida

1. **Victoria**: al alinear tres símbolos iguales (fila, columna o diagonal) se declara
   ganador y la partida termina.
2. **Empate**: si el tablero se llena sin un ganador, la partida termina en empate.
3. El resultado se anuncia y actualiza la puntuación del torneo.

### RF-6. Puntuación del torneo

1. La puntuación muestra cuatro valores: victorias, derrotas, empates y partidas jugadas.
2. Se actualiza al finalizar cada partida.
3. Se reinicia a cero al iniciar un nuevo torneo.

### RF-7. Ciclo del torneo

1. "Iniciar torneo" inicia el torneo con el nivel seleccionado en el estado Inicio.
2. "Finalizar torneo" termina el torneo en curso y muestra un resumen.
3. "Iniciar nuevo torneo" devuelve el juego al estado Inicio.

### RF-8. Sonidos

1. Se reproduce un sonido de éxito al ganar una partida.
2. Se reproduce un sonido de fracaso al perder una partida.
3. Existe un botón para silenciar/activar el sonido, con estado visible y persistente
   entre sesiones.
4. El sonido nunca es el único canal para transmitir el resultado de una partida.

## 5. Requisitos de accesibilidad (WCAG 2.2)

Cada requisito se formula como criterio verificable y se vincula al criterio WCAG
correspondiente.

### A-1. Semántica y estructura (1.3.1)

1. El selector de nivel usa `<fieldset>` con `<legend>` visible e `<input type="radio">`.
2. La puntuación usa una estructura semántica (tabla con `<caption>` y encabezados
   `<th>`, o lista de definición) que relaciona cada valor con su etiqueta.
3. La página usa una jerarquía de encabezados correcta (un solo `<h1>` y niveles
   anidados sin saltos).

### A-2. No depender del color (1.4.1, 1.3.3)

1. Los símbolos X y O se distinguen por su forma y por texto, no solo por color.
2. Ninguna instrucción hace referencia al color como único medio ("el botón rojo");
   las referencias usan posición, símbolo o nombre.
3. El resultado (victoria/derrota/empate) se transmite por texto, además de cualquier
   refuerzo de color.

### A-3. Contraste (1.4.3, 1.4.11)

1. El texto tiene una relación de contraste de al menos 4.5:1.
2. Los bordes del tablero y de los componentes de interfaz tienen una relación de
   contraste de al menos 3:1 frente a sus adyacentes.

### A-4. Operación por teclado (2.1.1, 2.1.2, 2.4.3)

1. Todas las funciones del juego son operables solo con teclado.
2. El tablero usa el patrón roving tabindex: un único punto de parada de tabulación a la
   vez y desplazamiento entre celdas con teclas de flecha.
3. No existe trampa de foco en ningún estado.
4. El orden de foco sigue un orden lógico y predecible.

### A-5. Foco visible (2.4.7, 2.4.11, 2.4.13)

1. Todo elemento interactivo muestra un indicador de foco visible.
2. El indicador de foco no queda oculto por otros contenidos (2.4.11).
3. El indicador de foco tiene una relación de contraste de al menos 3:1 (2.4.13).

### A-6. Tamaño del objetivo (2.5.8)

1. Cada celda del tablero y cada control tienen un área clicable de al menos 24×24
   píxeles CSS.

### A-7. Mensajes de estado (4.1.3)

1. Los cambios de estado se anuncian mediante regiones vivas (`aria-live`): turno del
   jugador, turno de la máquina, jugada de la máquina, celda ocupada, resultado de la
   partida, inicio del torneo y resumen del torneo.
2. Los anuncios no se superponen ni se pierden; el anuncio de la máquina se produce antes
   de mostrar la jugada.

### A-8. Nombre, rol y valor (4.1.2)

1. Cada control expone un nombre accesible, un rol correcto y su estado (por ejemplo, el
   botón de sonido expone su estado silenciado/activo).

### A-9. Idioma de la página (3.1.1)

1. El documento declara `lang="es"`.

### A-10. Reflow y adaptación (1.4.10, 1.4.4, 1.4.12, 1.3.4)

1. El juego es utilizable a 320 píxeles de ancho sin desplazamiento horizontal (1.4.10).
2. El texto admite un aumento de hasta el 200 % sin pérdida de contenido o función (1.4.4).
3. El contenido respeta los ajustes de espaciado de texto del usuario (1.4.12).
4. El juego es utilizable en orientación vertical y horizontal (1.3.4).

### A-11. Movimiento reducido (2.3.3, 2.3.1)

1. Toda animación respeta `prefers-reduced-motion`.
2. No hay destellos de más de tres por segundo (2.3.1).

### A-12. Control de audio (1.4.2)

1. Los sonidos son breves y existe un control de silencio claramente etiquetado.

### A-13. Cambio de contexto (3.2.1, 3.2.2)

1. Enfocar un control no provoca un cambio de contexto (3.2.1).
2. Cambiar la selección del nivel de dificultad no provoca un cambio de contexto
   inesperado (3.2.2).

### A-14. Título y etiquetas (2.4.2, 2.4.6, 3.3.2)

1. La página tiene un título descriptivo (2.4.2).
2. Los encabezados y etiquetas describen su propósito (2.4.6).
3. Los controles tienen instrucciones y etiquetas claras (3.3.2).

## 6. Escenarios de aceptación

Formato: **Dado / Cuando / Entonces**.

### E-1. Ganar una partida

- **Dado** un torneo en curso y el turno del jugador,
- **Cuando** el jugador completa una línea de tres X,
- **Entonces** se anuncia la victoria, suena el sonido de éxito, y la puntuación suma una
  victoria y una partida.

### E-2. Perder una partida

- **Dado** un torneo en curso,
- **Cuando** la máquina completa una línea de tres O,
- **Entonces** se anuncia la derrota, suena el sonido de fracaso, y la puntuación suma una
  derrota y una partida.

### E-3. Empatar una partida

- **Dado** un torneo en curso,
- **Cuando** el tablero se llena sin que nadie alinee tres símbolos,
- **Entonces** se anuncia el empate y la puntuación suma un empate y una partida.

### E-4. Celda ocupada

- **Dado** un torneo en curso y una celda ya ocupada,
- **Cuando** el jugador intenta activarla,
- **Entonces** no ocurre ningún cambio y se anuncia que la celda ya está ocupada.

### E-5. Turno de la máquina

- **Dado** que el jugador acaba de realizar su jugada sin terminar la partida,
- **Cuando** el turno pasa a la máquina,
- **Entonces** el tablero se deshabilita, se anuncia el turno de la máquina y, tras el
  retardo, se anuncia y se muestra la jugada de la máquina.

### E-6. Selección de nivel

- **Dado** el estado Inicio,
- **Cuando** el usuario selecciona un nivel y activa "Iniciar torneo",
- **Entonces** el torneo comienza con ese nivel y se anuncia el inicio.

### E-7. Finalizar torneo

- **Dado** un torneo en curso,
- **Cuando** el usuario activa "Finalizar torneo",
- **Entonces** el torneo termina y se anuncia el resumen con la puntuación final.

### E-8. Iniciar nuevo torneo

- **Dado** el estado Finalizado,
- **Cuando** el usuario activa "Iniciar nuevo torneo",
- **Entonces** el juego vuelve al estado Inicio con la puntuación a cero.

### E-9. Silenciar sonido

- **Dado** el juego con sonido activo,
- **Cuando** el usuario activa el botón de silencio,
- **Entonces** se deja de reproducir sonido, el estado del botón lo refleja y la
  preferencia se conserva entre sesiones.

### E-10. Navegación por teclado

- **Dado** un jugador que usa solo teclado,
- **Cuando** navega el tablero con Tab y flechas y activa celdas con Enter o Espacio,
- **Entonces** puede completar un torneo entero sin usar el puntero.

## 7. Criterios de aceptación globales

1. Todos los escenarios E-1 a E-10 se cumplen.
2. Todos los requisitos A-1 a A-14 se verifican (manualmente o con herramientas de
   prueba de accesibilidad).
3. El juego se carga y funciona sin errores de consola.
