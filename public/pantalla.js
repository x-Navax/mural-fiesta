const socket = io();

const mural = document.getElementById("mural");

const params = new URLSearchParams(window.location.search);
const evento = params.get("evento");

if (!evento) {
  mural.innerHTML = "<p>❌ Falta el evento en el link</p>";
}

async function cargarMensajes() {
  if (!evento) return;

  const res = await fetch(
    "/api/aprobados?evento=" + encodeURIComponent(evento)
  );

  const mensajes = await res.json();

  const segundos = Math.max(30, mensajes.length * 8);

mural.style.animationDuration = `${segundos}s`;

  mural.innerHTML = "";

  mensajes.forEach(msg => {
    mural.innerHTML += `
      <div class="slide-card">
        ${msg.foto ? `<img src="${msg.foto}">` : ""}

        ${msg.mensaje ? `<p class="mensaje-slide">"${msg.mensaje}"</p>` : ""}

        <h3>${msg.nombre}</h3>
      </div>
    `;
  });

  if (mensajes.length >= 6) {
    duplicarSlides();
    mural.classList.add("animado");
  } else {
    mural.classList.remove("animado");
  }
}

function duplicarSlides() {
  const cards = [...mural.children];

  cards.forEach(card => {
    const copia = card.cloneNode(true);
    mural.appendChild(copia);
  });
}

if (evento) {
  socket.on("actualizar-" + evento, cargarMensajes);
  cargarMensajes();
  setInterval(cargarMensajes, 5000);
}