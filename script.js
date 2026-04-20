
const tablero = document.getElementById("tablero");
const turnoTexto = document.getElementById("turnoTexto");
const tiempoTexto = document.getElementById("tiempoTexto");
const movimientosTexto = document.getElementById("movimientosTexto");
const ganadorTexto = document.getElementById("ganadorTexto");
const azulTexto = document.getElementById("azulTexto");
const rojoTexto = document.getElementById("rojoTexto");
const neutrasTexto = document.getElementById("neutrasTexto");

console.log("Script loaded, tablero:", tablero);

const size = 10;

// ---------------- ESTADO ----------------
let grid = [];
let turno = 1;
let movimientos = 5;

let playerId = null;
let gameStarted = false;

let jugadores = {};

let turnStart = Date.now();
let lastTurnSync = 0;

// ---------------- PLAYER SYNC ----------------
setInterval(() => {
  if (window.playerId && !playerId) {
    playerId = window.playerId;
    console.log("✔ Player sincronizado:", playerId);
  }
}, 200);

// ---------------- TURN CHECK ----------------
function esMiTurno() {
  if (!playerId) return false;
  if (!gameStarted) return false;
  return (playerId === "A" && turno === 1) ||
         (playerId === "B" && turno === 2);
}

// ---------------- TABLERO ----------------
for (let i = 0; i < size; i++) {
  grid[i] = [];

  for (let j = 0; j < size; j++) {
    grid[i][j] = 0;

    const celda = document.createElement("div");
    celda.classList.add("celda");
    celda.dataset.x = i;
    celda.dataset.y = j;

    if (i === 0 && j === 0) grid[i][j] = 1;
    if (i === size - 1 && j === size - 1) grid[i][j] = 2;

    actualizarColor(celda, i, j);

    celda.addEventListener("pointerdown", (e) => {
      e.preventDefault();

      if (!gameStarted) return;
      if (!esMiTurno()) return;

      const x = +celda.dataset.x;
      const y = +celda.dataset.y;

      // LÓGICA DE MOVIMIENTO: EXPANSIÓN O CONQUISTA
      if (esExpandible(x, y, turno)) {
        if (movimientos <= 0) return;
        grid[x][y] = turno;
        movimientos--;
      }
      else if (puedeConquistar(x, y, turno)) {
        if (movimientos < 2) return;
        grid[x][y] = turno;
        movimientos -= 2;
      }
      else {
        return;
      }

      capturarCeldas(turno);
      actualizarUI();
      comprobarFinJuego();

      if (movimientos === 0) cambiarTurno();

      sendGameState({
        grid,
        turno,
        movimientos,
        turnStart,
        gameStarted
      });
    });

    tablero.appendChild(celda);
  }
}

// ---------------- EXPANSIÓN ----------------
function esExpandible(x, y, jugador) {
  if (grid[x][y] !== 0) return false;

  return (
    (x > 0 && grid[x - 1][y] === jugador) ||
    (x < size - 1 && grid[x + 1][y] === jugador) ||
    (y > 0 && grid[x][y - 1] === jugador) ||
    (y < size - 1 && grid[x][y + 1] === jugador)
  );
}

// ---------------- CONQUISTA ----------------
function puedeConquistar(x, y, jugador) {
  const rival = jugador === 1 ? 2 : 1;

  // SOLO casillas del rival
  if (grid[x][y] !== rival) return false;

  // contacto mínimo
  let tieneContacto =
    (x > 0 && grid[x - 1][y] === jugador) ||
    (x < size - 1 && grid[x + 1][y] === jugador) ||
    (y > 0 && grid[x][y - 1] === jugador) ||
    (y < size - 1 && grid[x][y + 1] === jugador);

  // zona asegurada por el rival
  let bloqueVerticalRival =
    x > 0 && x < size - 1 &&
    grid[x - 1][y] === rival &&
    grid[x + 1][y] === rival;

  let bloqueHorizontalRival =
    y > 0 && y < size - 1 &&
    grid[x][y - 1] === rival &&
    grid[x][y + 1] === rival;

  if (bloqueVerticalRival || bloqueHorizontalRival) return false;

  return tieneContacto;
}

// ---------------- CAPTURAS ----------------
function capturarCeldas(jugador) {
  let cambios = true;

  while (cambios) {
    cambios = false;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {

        // VERTICAL: patrones de tamaño N (1+1, 2+2, 3+3)
        // Patrón: J^N E^N J^N (N amigos, N enemigos, N amigos)
        for (let n = 1; n <= 3; n++) {
          if (i + 3 * n <= size) {
            let esValido = true;

            // Verificar N amigos arriba
            for (let k = 0; k < n; k++) {
              if (grid[i + k][j] !== jugador) esValido = false;
            }

            // Verificar N casillas (enemiga o neutra) en el medio
            for (let k = 0; k < n; k++) {
              if (grid[i + n + k][j] === jugador) esValido = false;
            }

            // Verificar N amigos abajo
            for (let k = 0; k < n; k++) {
              if (grid[i + 2 * n + k][j] !== jugador) esValido = false;
            }

            if (esValido) {
              // Capturar todos los N enemigos
              for (let k = 0; k < n; k++) {
                grid[i + n + k][j] = jugador;
              }
              cambios = true;
            }
          }
        }

        // HORIZONTAL: patrones de tamaño N (1+1, 2+2, 3+3)
        // Patrón: J^N E^N J^N (N amigos, N enemigos, N amigos)
        for (let n = 1; n <= 3; n++) {
          if (j + 3 * n <= size) {
            let esValido = true;

            // Verificar N amigos a la izquierda
            for (let k = 0; k < n; k++) {
              if (grid[i][j + k] !== jugador) esValido = false;
            }

            // Verificar N casillas (enemiga o neutra) en el medio
            for (let k = 0; k < n; k++) {
              if (grid[i][j + n + k] === jugador) esValido = false;
            }

            // Verificar N amigos a la derecha
            for (let k = 0; k < n; k++) {
              if (grid[i][j + 2 * n + k] !== jugador) esValido = false;
            }

            if (esValido) {
              // Capturar todos los N enemigos
              for (let k = 0; k < n; k++) {
                grid[i][j + n + k] = jugador;
              }
              cambios = true;
            }
          }
        }
      }
    }
  }

  actualizarTableroVisual();
}

// ---------------- VISUAL ----------------
function actualizarColor(celda, x, y) {
  celda.classList.remove("jugador1", "jugador2");

  if (grid[x][y] === 1) celda.classList.add("jugador1");
  if (grid[x][y] === 2) celda.classList.add("jugador2");
}

function actualizarTableroVisual() {
  const celdas = document.querySelectorAll(".celda");

  let i = 0;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const c = celdas[i++];

      c.classList.remove("jugador1", "jugador2");

      if (grid[x][y] === 1) c.classList.add("jugador1");
      if (grid[x][y] === 2) c.classList.add("jugador2");
    }
  }
}

// ---------------- UI ----------------
function actualizarUI() {
  turnoTexto.innerText = `Turno ${turno}`;
  movimientosTexto.innerText = `Movimientos ${movimientos}`;
}

// ---------------- TIMER SIN DESYNC ----------------
setInterval(() => {
  if (!gameStarted) return;

  const DUR = 10;
  const now = Date.now();

  const elapsed = Math.floor((now - turnStart) / 1000);
  const remaining = Math.max(0, DUR - elapsed);

  tiempoTexto.innerText = `Tiempo: ${remaining}s`;

  if (remaining <= 0 && now - lastTurnSync > 1500) {
    lastTurnSync = now;
    cambiarTurno();
  }
}, 200);

// ---------------- TURNOS ----------------
function cambiarTurno() {
  if (!gameStarted) return;

  if (Object.keys(jugadores).length < 2) return;
  if (!gameStarted) return;

  turno = turno === 1 ? 2 : 1;
  movimientos = 5;
  turnStart = Date.now();

  sendGameState({
    grid,
    turno,
    movimientos,
    turnStart,
    gameStarted
  });

  actualizarUI();
}

// ---------------- FIN ----------------
function comprobarFinJuego() {
  let total = 0, p1 = 0, p2 = 0;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (grid[x][y]) total++;
      if (grid[x][y] === 1) p1++;
      if (grid[x][y] === 2) p2++;
    }
  }

  azulTexto.innerText = `Azul: ${p1}`;
  rojoTexto.innerText = `Rojo: ${p2}`;
  neutrasTexto.innerText = `Neutras: ${size*size - total}`;
}

// ---------------- FIREBASE SYNC ----------------
window.renderGame = function(data) {
  if (!data) return;

  if (data.grid) grid = structuredClone(data.grid);
  if (typeof data.turno === "number") turno = data.turno;
  if (typeof data.movimientos === "number") movimientos = data.movimientos;

  if (data.turnStart) {
    turnStart = data.turnStart;
  }

  gameStarted = data.gameStarted ?? false;

  if (data.jugadores) jugadores = data.jugadores;

  actualizarTableroVisual();
  actualizarUI();

  // ---- MANEJO DEL BOTÓN "INICIAR PARTIDA" ----
  const btnIniciar = document.getElementById("btnIniciar");
  const statusTexto = document.getElementById("statusTexto");

  if (playerId === "A") {
    const numJugadores = Object.keys(jugadores).length;

    if (gameStarted) {
      // Partida iniciada: ocultar botón
      btnIniciar.style.display = "none";
      statusTexto.innerText = "Partida iniciada";
    } else if (numJugadores < 2) {
      // Esperando otro jugador: mostrar botón deshabilitado
      btnIniciar.style.display = "block";
      btnIniciar.disabled = true;
      btnIniciar.innerText = "Esperando otro jugador...";
      statusTexto.innerText = "⏳ Esperando a Jugador B...";
    } else {
      // Listo para iniciar: mostrar botón habilitado
      btnIniciar.style.display = "block";
      btnIniciar.disabled = false;
      btnIniciar.innerText = "Iniciar Partida";
      statusTexto.innerText = "✓ Listo para jugar";
    }
  } else if (playerId === "B") {
    // Jugador B
    if (gameStarted) {
      btnIniciar.style.display = "none";
      statusTexto.innerText = "Partida iniciada";
    } else {
      btnIniciar.style.display = "none";
      statusTexto.innerText = "⏳ Esperando a que Jugador A inicie...";
    }
  }
};