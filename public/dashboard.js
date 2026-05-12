const nombreEvento = document.getElementById("nombreEvento");
const resultadoEvento = document.getElementById("resultadoEvento");

const PIN = "1234";

function limpiarTexto(texto) {
  return texto
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function crearEvento() {

  const nombre = nombreEvento.value.trim();

  if (!nombre) {
    resultadoEvento.innerHTML =
    "<p>Escribí el nombre del evento.</p>";
    return;
  }

  const codigo = limpiarTexto(nombre);

  mostrarEvento(codigo, nombre);

  cargarEventos();
}

function mostrarEvento(codigo, nombre = codigo) {

  const base = window.location.origin;

  const linkQR =
    `${base}/qr?evento=${codigo}`;

  const linkInvitados =
    `${base}/enviar.html?evento=${codigo}`;

  const linkAdmin =
    `${base}/admin.html?evento=${codigo}`;

  const linkPantalla =
    `${base}/pantalla.html?evento=${codigo}`;

  resultadoEvento.innerHTML = `
    <div class="admin-post">

      <h2>${nombre}</h2>

      <p><b>Código:</b> ${codigo}</p>

      <div class="acciones">

        <a
          class="boton-link"
          href="${linkQR}"
          target="_blank"
        >
          Ver QR
        </a>

        <a
          class="boton-link"
          href="${linkPantalla}"
          target="_blank"
        >
          Pantalla
        </a>

        <a
          class="boton-link"
          href="${linkAdmin}"
          target="_blank"
        >
          Moderación
        </a>

        <a
          class="boton-link"
          href="${linkInvitados}"
          target="_blank"
        >
          Invitados
        </a>

      </div>

    </div>
  `;
}

async function cargarEventos() {

  const contenedorViejos =
    document.getElementById("eventosViejos");

  const res = await fetch(
    "/api/eventos?pin=" + PIN
  );

  if (res.status !== 200) {
    return;
  }

  const eventos = await res.json();

  contenedorViejos.innerHTML = "";

  eventos.reverse();

  eventos.forEach(ev => {

    const base = window.location.origin;

    contenedorViejos.innerHTML += `
      <div class="admin-post">

        <h2>${ev.evento}</h2>

        <p>
          Total: ${ev.total}
        </p>

        <p>
          Pendientes: ${ev.pendientes}
        </p>

        <p>
          Aprobados: ${ev.aprobados}
        </p>

        <div class="acciones">

          <a
            class="boton-link"
            href="${base}/qr?evento=${ev.evento}"
            target="_blank"
          >
            QR
          </a>

          <a
            class="boton-link"
            href="${base}/pantalla.html?evento=${ev.evento}"
            target="_blank"
          >
            Pantalla
          </a>

          <a
            class="boton-link"
            href="${base}/admin.html?evento=${ev.evento}"
            target="_blank"
          >
            Admin
          </a>

          <button
            class="rechazar"
            onclick="eliminarEvento('${ev.evento}')"
          >
            Eliminar
          </button>

        </div>

      </div>
    `;
  });
}

async function eliminarEvento(evento) {

  const confirmar = confirm(
    "¿Eliminar evento?"
  );

  if (!confirmar) return;

  await fetch(
    "/api/eventos/" + evento,
    {
      method: "DELETE",
      headers: {
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        pin: PIN
      })
    }
  );

  cargarEventos();
}

cargarEventos();