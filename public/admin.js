const socket = io();

const pendientes = document.getElementById("pendientes");
const aprobados = document.getElementById("aprobados");
const pinInput = document.getElementById("pin");

const params = new URLSearchParams(window.location.search);
const evento = params.get("evento");

pinInput.value = localStorage.getItem("pin") || "";

if (!evento) {
  pendientes.innerHTML = "<p>❌ Falta el evento en el link</p>";
}

function guardarPin() {
  localStorage.setItem("pin", pinInput.value);
  cargarPendientes();
  cargarAprobados();
}

function obtenerPin() {
  return localStorage.getItem("pin") || pinInput.value;
}

async function cargarPendientes() {
  const pin = obtenerPin();

  if (!evento) {
    pendientes.innerHTML = "<p>❌ Falta el evento en el link</p>";
    return;
  }

  if (!pin) {
    pendientes.innerHTML = "<p>Ingresá el PIN</p>";
    return;
  }

  const res = await fetch(
    "/api/pendientes?pin=" + encodeURIComponent(pin) +
    "&evento=" + encodeURIComponent(evento)
  );

  if (res.status !== 200) {
    pendientes.innerHTML = "<p>PIN incorrecto</p>";
    return;
  }

  const mensajes = await res.json();

  if (mensajes.length === 0) {
    pendientes.innerHTML = "<p>No hay mensajes pendientes para este evento.</p>";
    return;
  }

  pendientes.innerHTML = "";

  mensajes.forEach(msg => {
    pendientes.innerHTML += `
      <div class="admin-post">
        ${msg.foto ? `<img src="${msg.foto}">` : ""}

        <h3>${msg.nombre}</h3>
        <p>${msg.mensaje}</p>

        <div class="acciones">
          <button class="aprobar" onclick="aprobar(${msg.id})">
            Aprobar
          </button>

          <button class="rechazar" onclick="rechazar(${msg.id})">
            Rechazar
          </button>
        </div>
      </div>
    `;
  });
}

async function cargarAprobados() {
  const pin = obtenerPin();

  if (!evento || !pin) return;

  const res = await fetch(
    "/api/aprobados-admin?pin=" + encodeURIComponent(pin) +
    "&evento=" + encodeURIComponent(evento)
  );

  if (res.status !== 200) {
    aprobados.innerHTML = "<p>No se pudieron cargar aprobados.</p>";
    return;
  }

  const mensajes = await res.json();

  if (mensajes.length === 0) {
    aprobados.innerHTML = "<p>No hay mensajes aprobados todavía.</p>";
    return;
  }

  aprobados.innerHTML = "";

  mensajes.forEach(msg => {
    aprobados.innerHTML += `
      <div class="admin-post aprobado-post">
        ${msg.foto ? `<img src="${msg.foto}">` : ""}

        <h3>${msg.nombre}</h3>
        <p>${msg.mensaje}</p>

        <div class="acciones">
          <button class="rechazar" onclick="eliminarAprobado(${msg.id})">
            Eliminar del mural
          </button>
        </div>
      </div>
    `;
  });
}

async function aprobar(id) {
  await fetch("/api/aprobar/" + id, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pin: obtenerPin(),
      evento: evento
    })
  });

  cargarPendientes();
  cargarAprobados();
}

async function rechazar(id) {
  await fetch("/api/rechazar/" + id, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pin: obtenerPin(),
      evento: evento
    })
  });

  cargarPendientes();
}

async function eliminarAprobado(id) {
  const confirmar = confirm(
    "¿Eliminar este mensaje del mural?"
  );

  if (!confirmar) return;

  await fetch("/api/eliminar-aprobado/" + id, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pin: obtenerPin(),
      evento: evento
    })
  });

  cargarAprobados();
}

socket.on("nuevo-" + evento, () => {
  cargarPendientes();
  cargarAprobados();
});

socket.on("actualizar-" + evento, () => {
  cargarAprobados();
});

cargarPendientes();
cargarAprobados();

setInterval(() => {
  cargarPendientes();
  cargarAprobados();
}, 5000);