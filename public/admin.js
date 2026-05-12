const socket = io();

const pendientes = document.getElementById("pendientes");
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

socket.on("nuevo-" + evento, cargarPendientes);

cargarPendientes();

setInterval(cargarPendientes, 5000);