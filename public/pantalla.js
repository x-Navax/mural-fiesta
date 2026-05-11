const socket = io();

const mural = document.getElementById("mural");

async function cargarMensajes(){

  const res = await fetch("/api/aprobados");

  const mensajes = await res.json();

  mural.innerHTML = "";

  mensajes.forEach(msg => {

    mural.innerHTML += `
      <div class="post">

        ${
          msg.foto
          ? `<img src="${msg.foto}">`
          : ""
        }

        ${
          msg.mensaje
          ? `<p class="mensaje">"${msg.mensaje}"</p>`
          : ""
        }

        <h3>${msg.nombre}</h3>

      </div>
    `;
  });
}

socket.on("actualizar", cargarMensajes);

cargarMensajes();

setInterval(cargarMensajes,5000);