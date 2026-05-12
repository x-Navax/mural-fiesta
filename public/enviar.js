const form = document.getElementById("formMensaje");
const respuesta = document.getElementById("respuesta");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const datos = new FormData(form);

  respuesta.innerText = "Enviando...";

  try {

    const res = await fetch("/api/enviar", {
      method: "POST",
      body: datos
    });

    const data = await res.json();

    if (data.ok) {
        respuesta.innerText = "✅ Mensaje enviado";
        form.reset();

        preview.src = "";
        preview.style.display = "none";
        textoFoto.innerText = "📷 Subir foto";
      } else {
        respuesta.innerText = "❌ Error";
      }

  } catch (error) {
    respuesta.innerText = "❌ Error de conexión";
  }
});


const fotoInput = document.getElementById("fotoInput");

const preview = document.getElementById("preview");

const textoFoto = document.getElementById("textoFoto");

fotoInput.addEventListener("change", () => {

  const archivo = fotoInput.files[0];

  if(!archivo) return;

  textoFoto.innerText =
  "✅ " + archivo.name;

  const reader = new FileReader();

  reader.onload = (e) => {

    preview.src = e.target.result;

    preview.style.display = "block";
  };

  reader.readAsDataURL(archivo);
});