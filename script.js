
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
  if (!window.playerId) return false;
  if (!gameStarted) return false;
  const isMyTurn = (window.playerId === "A" && turno === 1) ||
         (window.playerId === "B" && turno === 2);
  console.log("🎮 esMiTurno:", isMyTurn, "playerId:", window.playerId, "turno:", turno);
  return isMyTurn;
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

      console.log("🖱️ Click en celda:", +celda.dataset.x, +celda.dataset.y, "gameStarted:", gameStarted);

      if (!gameStarted) {
        console.log("❌ Juego no iniciado");
        return;
      }
      if (!esMiTurno()) {
        console.log("❌ No es tu turno");
        return;
      }

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
      capturarZonasEncerradas();
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
function esProtegida(x, y, jugador) {
  // Esquinas: NUNCA se pueden conquistar
  if ((x === 0 || x === size - 1) && (y === 0 || y === size - 1)) {
    return true;
  }

  const esInterior = x > 0 && x < size - 1 && y > 0 && y < size - 1;

  if (esInterior) {
    // Interior: protegida si tiene 2 en línea del mismo jugador (arriba-abajo o izquierda-derecha)
    let bloqueVertical = grid[x - 1][y] === jugador && grid[x + 1][y] === jugador;
    let bloqueHorizontal = grid[x][y - 1] === jugador && grid[x][y + 1] === jugador;
    return bloqueVertical || bloqueHorizontal;
  } else {
    // Borde (no esquina): protegida si tiene 2+ de sus vecinos del mismo jugador
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let aliados = 0;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        if (grid[nx][ny] === jugador) aliados++;
      }
    }

    return aliados >= 2;
  }
}

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

  if (!tieneContacto) return false;

  // Verificar si está protegida
  if (esProtegida(x, y, rival)) return false;

  return true;
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

// ---------------- ZONAS ENCERRADAS ----------------
function esInexpugnable(x, y, jugador) {
  // Esquinas: siempre inexpugnables
  if ((x === 0 || x === size - 1) && (y === 0 || y === size - 1)) {
    return true;
  }

  const esInterior = x > 0 && x < size - 1 && y > 0 && y < size - 1;

  if (esInterior) {
    // Interior: inexpugnable si tiene 2 aliados en línea (arriba-abajo o izquierda-derecha)
    let bloqueVertical = grid[x - 1][y] === jugador && grid[x + 1][y] === jugador;
    let bloqueHorizontal = grid[x][y - 1] === jugador && grid[x][y + 1] === jugador;
    return bloqueVertical || bloqueHorizontal;
  } else {
    // Borde (no esquina): inexpugnable si tiene 2+ aliados de sus vecinos
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let aliados = 0;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        if (grid[nx][ny] === jugador) aliados++;
      }
    }

    return aliados >= 2;
  }
}

function capturarZonasEncerradas() {
  const visitadas = Array(size).fill().map(() => Array(size).fill(false));

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      // Solo buscar en celdas neutras sin visitar
      if (grid[i][j] === 0 && !visitadas[i][j]) {
        // Hacer flood fill para encontrar la zona
        const zona = [];
        const borde = new Set(); // Casillas del borde que rodean la zona
        const jugadoresAdyacentes = new Set();
        const cola = [[i, j]];
        visitadas[i][j] = true;

        while (cola.length > 0) {
          const [x, y] = cola.shift();
          zona.push([x, y]);

          // Revisar los 4 vecinos
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
              if (grid[nx][ny] === 0 && !visitadas[nx][ny]) {
                // Es una celda neutra sin visitar, agregamos a la cola
                visitadas[nx][ny] = true;
                cola.push([nx, ny]);
              } else if (grid[nx][ny] !== 0) {
                // Es una celda de jugador, registramos qué jugador la rodea
                jugadoresAdyacentes.add(grid[nx][ny]);
                borde.add(`${nx},${ny}`); // Guardamos coordenadas como string
              }
            }
          }
        }

        // Si la zona está rodeada por un SOLO jugador
        if (jugadoresAdyacentes.size === 1) {
          const propietario = Array.from(jugadoresAdyacentes)[0];

          // Verificar que TODAS las casillas del borde sean inexpugnables
          let todasInexpugnables = true;
          for (const coordStr of borde) {
            const [bx, by] = coordStr.split(",").map(Number);
            if (!esInexpugnable(bx, by, propietario)) {
              todasInexpugnables = false;
              break;
            }
          }

          // Solo asignar si todos los bordes son inexpugnables
          if (todasInexpugnables) {
            for (const [x, y] of zona) {
              grid[x][y] = propietario;
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
  
  // Actualizar color de fondo según turno (solo si el juego ha comenzado)
  if (gameStarted) {
    document.body.className = turno === 1 ? "turno-1" : "turno-2";
  } else {
    document.body.className = "";
  }
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

// ---------------- REINICIO DE PARTIDA ----------------
function reiniciarPartida() {
  if (window.playerId !== "A") {
    console.log("❌ Solo el Jugador A puede reiniciar la partida");
    return;
  }

  // Resetear estado
  grid = [];
  turno = 1;
  movimientos = 5;
  gameStarted = false;
  ganadorTexto.innerText = "";

  // Reinicializar grid
  for (let i = 0; i < size; i++) {
    grid[i] = [];
    for (let j = 0; j < size; j++) {
      grid[i][j] = 0;
      if (i === 0 && j === 0) grid[i][j] = 1;
      if (i === size - 1 && j === size - 1) grid[i][j] = 2;
    }
  }

  actualizarTableroVisual();
  actualizarUI();

  // Enviar estado resetado a Firebase
  sendGameState({
    grid,
    turno,
    movimientos,
    turnStart: Date.now(),
    gameStarted: false
  });

  console.log("🔄 Partida reiniciada por Jugador A");
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

  // Verificar si el tablero está lleno
  if (total === size * size) {
    // Determinar ganador
    if (p1 > p2) {
      ganadorTexto.innerText = "🎉 ¡Gana Azul (Jugador A)!";
    } else if (p2 > p1) {
      ganadorTexto.innerText = "🎉 ¡Gana Rojo (Jugador B)!";
    } else {
      ganadorTexto.innerText = "🤝 ¡Empate!";
    }

    // Detener el juego
    gameStarted = false;

    // Mostrar botón de reinicio
    const btnReiniciar = document.getElementById("btnReiniciar");
    if (btnReiniciar) btnReiniciar.style.display = "block";
  }
}

// ---------------- FIREBASE SYNC ----------------
window.renderGame = function(data) {
  if (!data) return;

  console.log("📡 renderGame recibido - gameStarted:", data.gameStarted);

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
  const btnReiniciar = document.getElementById("btnReiniciar");
  const statusTexto = document.getElementById("statusTexto");

  console.log("🔥 renderGame - playerId:", window.playerId, "jugadores:", Object.keys(jugadores));

  // Si la partida comienza, ocultar botón de reinicio y limpiar ganador
  if (gameStarted) {
    if (btnReiniciar) btnReiniciar.style.display = "none";
    ganadorTexto.innerText = "";
  }

  if (window.playerId === "A") {
    const numJugadores = Object.keys(jugadores).length;

    console.log("🎮 Jugador A - Jugadores en sala:", Object.keys(jugadores), "Total:", numJugadores);

    if (gameStarted) {
      // Partida iniciada: ocultar botón de iniciar, mostrar botón de reinicio
      btnIniciar.style.display = "none";
      statusTexto.innerText = "Partida iniciada";
      if (btnReiniciar) btnReiniciar.style.display = "block";
    } else if (numJugadores < 2) {
      // Esperando otro jugador: mostrar botón deshabilitado
      btnIniciar.style.display = "block";
      btnIniciar.disabled = true;
      btnIniciar.innerText = "Esperando otro jugador...";
      statusTexto.innerText = "⏳ Esperando a Jugador B...";
      if (btnReiniciar) btnReiniciar.style.display = "none";
    } else {
      // Listo para iniciar: mostrar botón habilitado
      btnIniciar.style.display = "block";
      btnIniciar.disabled = false;
      btnIniciar.innerText = "Iniciar Partida";
      statusTexto.innerText = "✓ Listo para jugar";
      if (btnReiniciar) btnReiniciar.style.display = "none";
    }
  } else if (window.playerId === "B") {
    // Jugador B
    if (gameStarted) {
      btnIniciar.style.display = "none";
      statusTexto.innerText = "Partida iniciada";
    } else {
      btnIniciar.style.display = "none";
      statusTexto.innerText = "⏳ Esperando a que Jugador A inicie...";
      if (btnReiniciar) btnReiniciar.style.display = "none";
    }
  }
};

// ---- EVENT LISTENERS ----
document.addEventListener("DOMContentLoaded", () => {
  const btnReiniciar = document.getElementById("btnReiniciar");
  if (btnReiniciar) {
    btnReiniciar.addEventListener("click", reiniciarPartida);
  }
});