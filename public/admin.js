const socket = io();

const pendientes = document.getElementById("pendientes");
const pinInput = document.getElementById("pin");

pinInput.value = localStorage.getItem("pin") || "";

function guardarPin(){

  localStorage.setItem(
    "pin",
    pinInput.value
  );

  cargarPendientes();
}

function obtenerPin(){
  return localStorage.getItem("pin");
}

async function cargarPendientes(){

  const pin = obtenerPin();

  if(!pin){
    pendientes.innerHTML =
    "<p>Ingresá el PIN</p>";
    return;
  }

  const res = await fetch(
    "/api/pendientes?pin=" + pin
  );

  if(res.status !== 200){

    pendientes.innerHTML =
    "<p>PIN incorrecto</p>";

    return;
  }

  const mensajes = await res.json();

  pendientes.innerHTML = "";

  mensajes.forEach(msg => {

    pendientes.innerHTML += `
      <div class="admin-post">

        ${
          msg.foto
          ? `<img src="${msg.foto}">`
          : ""
        }

        <h3>${msg.nombre}</h3>

        <p>${msg.mensaje}</p>

        <div class="acciones">

          <button
            class="aprobar"
            onclick="aprobar(${msg.id})"
          >
            Aprobar
          </button>

          <button
            class="rechazar"
            onclick="rechazar(${msg.id})"
          >
            Rechazar
          </button>

        </div>

      </div>
    `;
  });
}

async function aprobar(id){

  await fetch(
    "/api/aprobar/" + id,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        pin:obtenerPin()
      })
    }
  );

  cargarPendientes();
}

async function rechazar(id){

  await fetch(
    "/api/rechazar/" + id,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        pin:obtenerPin()
      })
    }
  );

  cargarPendientes();
}

socket.on("nuevo",cargarPendientes);

cargarPendientes();

setInterval(cargarPendientes,5000);