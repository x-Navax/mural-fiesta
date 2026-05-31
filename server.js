require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

const UPLOADS_DIR = "uploads";
const DB_PATH = "mensajes.json";

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, "[]");
}

function leerMensajes() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function guardarMensajes(mensajes) {
  fs.writeFileSync(DB_PATH, JSON.stringify(mensajes, null, 2));
}

function limpiarEvento(evento) {
  return String(evento || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const nombreFinal =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1000000) +
      path.extname(file.originalname);

    cb(null, nombreFinal);
  }
});

const upload = multer({ storage });

app.post("/api/enviar", upload.single("foto"), (req, res) => {
  const evento = limpiarEvento(req.body.evento);

  if (!evento) {
    return res.status(400).json({
      ok: false,
      error: "Falta el evento"
    });
  }

  const mensajes = leerMensajes();

  const nuevo = {
    id: Date.now(),
    evento: evento,
    nombre: req.body.nombre || "Invitado",
    mensaje: req.body.mensaje || "",
    foto: req.file ? "/uploads/" + req.file.filename : "",
    estado: "pendiente",
    fecha: new Date().toISOString()
  };

  mensajes.push(nuevo);
  guardarMensajes(mensajes);

  io.emit("nuevo-" + evento);

  res.json({ ok: true });
});

app.get("/api/aprobados", (req, res) => {
  const evento = limpiarEvento(req.query.evento);

  if (!evento) {
    return res.status(400).json([]);
  }

  const mensajes = leerMensajes()
  .filter(m => m.evento === evento && m.estado === "aprobado")
  .sort((a, b) => b.id - a.id)
  .slice(0, 12);

  res.json(mensajes);
});

app.get("/api/pendientes", (req, res) => {
  const evento = limpiarEvento(req.query.evento);

  if (req.query.pin !== ADMIN_PIN) {
    return res.status(401).json([]);
  }

  if (!evento) {
    return res.status(400).json([]);
  }

  const mensajes = leerMensajes()
    .filter(m => m.evento === evento && m.estado === "pendiente")
    .sort((a, b) => b.id - a.id);

  res.json(mensajes);
});

app.post("/api/aprobar/:id", (req, res) => {
  const evento = limpiarEvento(req.body.evento);

  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  const mensajes = leerMensajes();

  const mensaje = mensajes.find(
    m => String(m.id) === String(req.params.id) && m.evento === evento
  );

  if (mensaje) {
    mensaje.estado = "aprobado";
  }

  guardarMensajes(mensajes);

  io.emit("actualizar-" + evento);
  io.emit("nuevo-" + evento);

  res.json({ ok: true });
});

app.post("/api/rechazar/:id", (req, res) => {
  const evento = limpiarEvento(req.body.evento);

  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  const mensajes = leerMensajes();

  const mensaje = mensajes.find(
    m => String(m.id) === String(req.params.id) && m.evento === evento
  );

  if (mensaje) {
    mensaje.estado = "rechazado";
  }

  guardarMensajes(mensajes);

  io.emit("nuevo-" + evento);

  res.json({ ok: true });
});

app.get("/api/eventos", (req, res) => {
  const pin = req.query.pin;

  if (pin !== ADMIN_PIN) {
    return res.status(401).json([]);
  }

  const mensajes = leerMensajes();

  const eventos = {};

  mensajes.forEach(m => {
    if (!m.evento) return;

    if (!eventos[m.evento]) {
      eventos[m.evento] = {
        evento: m.evento,
        total: 0,
        pendientes: 0,
        aprobados: 0
      };
    }

    eventos[m.evento].total++;

    if (m.estado === "pendiente") {
      eventos[m.evento].pendientes++;
    }

    if (m.estado === "aprobado") {
      eventos[m.evento].aprobados++;
    }
  });

  res.json(Object.values(eventos));
});

app.delete("/api/eventos/:evento", (req, res) => {
  const pin = req.body.pin;
  const evento = limpiarEvento(req.params.evento);

  if (pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  const mensajes = leerMensajes();

  const mensajesFiltrados = mensajes.filter(m => m.evento !== evento);

  guardarMensajes(mensajesFiltrados);

  res.json({ ok: true });
});

app.get("/api/aprobados-admin", (req, res) => {
  const evento = limpiarEvento(req.query.evento);

  if (req.query.pin !== ADMIN_PIN) {
    return res.status(401).json([]);
  }

  if (!evento) {
    return res.status(400).json([]);
  }

  const mensajes = leerMensajes()
    .filter(m => m.evento === evento && m.estado === "aprobado")
    .sort((a, b) => b.id - a.id);

  res.json(mensajes);
});

app.post("/api/eliminar-aprobado/:id", (req, res) => {
  const evento = limpiarEvento(req.body.evento);

  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  let mensajes = leerMensajes();

  mensajes = mensajes.filter(m => {
    return !(
      String(m.id) === String(req.params.id) &&
      m.evento === evento &&
      m.estado === "aprobado"
    );
  });

  guardarMensajes(mensajes);

  io.emit("actualizar-" + evento);
  io.emit("nuevo-" + evento);

  res.json({ ok: true });
});

app.get("/qr", async (req, res) => {
  const evento = limpiarEvento(req.query.evento);

  if (!evento) {
    return res.send(`
      <body style="font-family:Arial;text-align:center;padding:30px">
        <h1>Falta el evento</h1>
        <p>Usá una URL así:</p>
        <p><b>/qr?evento=juana-15</b></p>
      </body>
    `);
  }

  const url = `${req.protocol}://${req.headers.host}/enviar.html?evento=${evento}`;
  const pantalla = `${req.protocol}://${req.headers.host}/pantalla.html?evento=${evento}`;
  const admin = `${req.protocol}://${req.headers.host}/admin.html?evento=${evento}`;

  const qr = await QRCode.toDataURL(url);

  res.send(`
    <body style="background:#111;color:white;text-align:center;font-family:Arial;padding:30px">
      <h1>QR Fiesta</h1>
      <h2>${evento}</h2>

      <p>Escaneá para dejar tu mensaje</p>

      <img src="${qr}" width="300" style="background:white;padding:15px;border-radius:20px"/>

      <p><b>Invitados:</b></p>
      <p>${url}</p>

      <p><b>Pantalla:</b></p>
      <p>${pantalla}</p>

      <p><b>Admin:</b></p>
      <p>${admin}</p>
    </body>
  `);
});

server.listen(PORT, () => {
  console.log("Servidor iniciado en puerto " + PORT);
});