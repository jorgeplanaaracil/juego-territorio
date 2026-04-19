const tablero = document.getElementById("tablero");
const turnoTexto = document.getElementById("turnoTexto");
const tiempoTexto = document.getElementById("tiempoTexto");
const movimientosTexto = document.getElementById("movimientosTexto");
const ganadorTexto = document.getElementById("ganadorTexto");
const azulTexto = document.getElementById("azulTexto");
const rojoTexto = document.getElementById("rojoTexto");
const neutrasTexto = document.getElementById("neutrasTexto");

const size = 10;

let grid = [];
let turno = 1;

let tiempo = 10;
let movimientos = 5;

let timer = null;

// -------------------- CREAR TABLERO --------------------

for (let i = 0; i < size; i++) {
  grid[i] = [];

  for (let j = 0; j < size; j++) {

    grid[i][j] = 0;

    const celda = document.createElement("div");
    celda.classList.add("celda");
    celda.dataset.x = i;
    celda.dataset.y = j;

    // bases iniciales
    if (i === 0 && j === 0) grid[i][j] = 1;
    if (i === size - 1 && j === size - 1) grid[i][j] = 2;

    actualizarColor(celda, i, j);

    // 🔥 CAMBIO CLAVE PARA MÓVIL
    celda.addEventListener("pointerdown", (e) => {
      e.preventDefault();

      const x = parseInt(celda.dataset.x);
      const y = parseInt(celda.dataset.y);

      // -------------------------
      // 🔹 CASO 1: celda vacía
      // -------------------------
      if (grid[x][y] === 0) {

        if (movimientos <= 0) return;
        if (!esValida(x, y, turno)) return;

        grid[x][y] = turno;
        actualizarColor(celda, x, y);

        capturarCeldas(turno);

        movimientos--;
      }

      // -------------------------
      // 🔹 CASO 2: CONQUISTA
      // -------------------------
      else if (grid[x][y] !== turno) {

        if (movimientos < 2) return;
        if (!puedeConquistar(x, y, turno)) return;

        movimientos -= 2;

        grid[x][y] = turno;
        actualizarColor(celda, x, y);

        capturarCeldas(turno);
      }

      actualizarUI();

      if (movimientos === 0) {
        cambiarTurno();
      }

      comprobarFinJuego();
    });

    tablero.appendChild(celda);
  }
}

// -------------------- REGLA DE CONTIGÜIDAD --------------------

function esValida(x, y, jugador) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  for (let [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
      if (grid[nx][ny] === jugador) return true;
    }
  }

  return false;
}

// -------------------- FONDO --------------------

function actualizarFondoTurno() {
  document.body.classList.remove("turno-1", "turno-2");
  document.body.classList.add(turno === 1 ? "turno-1" : "turno-2");
}

// -------------------- CAPTURAS --------------------

function capturarCeldas(jugador) {
  let cambios = true;

  while (cambios) {
    cambios = false;

    if (aplicarCapturaNM(jugador, 1, 1)) cambios = true;
    if (aplicarCapturaNM(jugador, 2, 2)) cambios = true;
    if (aplicarCapturaNM(jugador, 3, 3)) cambios = true;
    if (aplicarCapturaNM(jugador, 3, 2)) cambios = true;
  }

  actualizarTableroVisual();
}

function aplicarCapturaNM(jugador, N, M) {
  if (N < M) return false;

  let total = 2 * N + M;
  let huboCambios = false;

  // vertical
  for (let i = 0; i <= size - total; i++) {
    for (let j = 0; j < size; j++) {

      let valido = true;

      for (let k = 0; k < N; k++)
        if (grid[i + k][j] !== jugador) valido = false;

      for (let k = 0; k < N; k++)
        if (grid[i + N + M + k][j] !== jugador) valido = false;

      for (let k = 0; k < M; k++)
        if (grid[i + N + k][j] === jugador) valido = false;

      if (valido) {
        for (let k = 0; k < M; k++)
          grid[i + N + k][j] = jugador;

        huboCambios = true;
      }
    }
  }

  // horizontal
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size - total; j++) {

      let valido = true;

      for (let k = 0; k < N; k++)
        if (grid[i][j + k] !== jugador) valido = false;

      for (let k = 0; k < N; k++)
        if (grid[i][j + N + M + k] !== jugador) valido = false;

      for (let k = 0; k < M; k++)
        if (grid[i][j + N + k] === jugador) valido = false;

      if (valido) {
        for (let k = 0; k < M; k++)
          grid[i][j + N + k] = jugador;

        huboCambios = true;
      }
    }
  }

  return huboCambios;
}

// -------------------- CONQUISTA --------------------

function puedeConquistar(x, y, jugador) {
  if (grid[x][y] === jugador) return false;

  let tieneContacto =
    (x > 0 && grid[x - 1][y] === jugador) ||
    (x < size - 1 && grid[x + 1][y] === jugador) ||
    (y > 0 && grid[x][y - 1] === jugador) ||
    (y < size - 1 && grid[x][y + 1] === jugador);

  let bloqueVertical =
    x > 0 && x < size - 1 &&
    grid[x - 1][y] === jugador &&
    grid[x + 1][y] === jugador;

  let bloqueHorizontal =
    y > 0 && y < size - 1 &&
    grid[x][y - 1] === jugador &&
    grid[x][y + 1] === jugador;

  return tieneContacto && !bloqueVertical && !bloqueHorizontal;
}

// -------------------- VISUAL --------------------

function actualizarColor(celda, x, y) {
  celda.classList.remove("jugador1", "jugador2");
  if (grid[x][y] === 1) celda.classList.add("jugador1");
  if (grid[x][y] === 2) celda.classList.add("jugador2");
}

function actualizarTableroVisual() {
  const celdas = document.querySelectorAll(".celda");
  let index = 0;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const celda = celdas[index];

      celda.classList.remove("jugador1", "jugador2");
      if (grid[i][j] === 1) celda.classList.add("jugador1");
      if (grid[i][j] === 2) celda.classList.add("jugador2");

      index++;
    }
  }
}

// -------------------- UI --------------------

function actualizarUI() {
  turnoTexto.innerText = `Turno del Jugador ${turno}`;
  tiempoTexto.innerText = `Tiempo: ${tiempo}s`;
  movimientosTexto.innerText = `Movimientos restantes: ${movimientos}`;
}

// -------------------- TURNOS --------------------

function iniciarTurno() {
  clearInterval(timer);

  tiempo = 10;
  movimientos = 5;

  actualizarFondoTurno();
  actualizarUI();

  timer = setInterval(() => {
    tiempo--;
    actualizarUI();

    if (tiempo <= 0) cambiarTurno();
  }, 1000);
}

function cambiarTurno() {
  clearInterval(timer);
  turno = turno === 1 ? 2 : 1;
  iniciarTurno();
}

// -------------------- FIN --------------------

function comprobarFinJuego() {
  let total = 0;
  let p1 = 0;
  let p2 = 0;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (grid[i][j] !== 0) total++;
      if (grid[i][j] === 1) p1++;
      if (grid[i][j] === 2) p2++;
    }
  }

  let neutras = size * size - total;

  azulTexto.innerText = `Azul: ${p1}`;
  rojoTexto.innerText = `Rojo: ${p2}`;
  neutrasTexto.innerText = `Neutras: ${neutras}`;

  if (total === size * size) {
    clearInterval(timer);

    if (p1 > p2) ganadorTexto.innerText = "Gana Jugador 1 🔵";
    else if (p2 > p1) ganadorTexto.innerText = "Gana Jugador 2 🔴";
    else ganadorTexto.innerText = "Empate ⚖️";
  }
}

// -------------------- INICIO --------------------

iniciarTurno();