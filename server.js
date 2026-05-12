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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.post("/api/enviar", upload.single("foto"), (req, res) => {
  const mensajes = leerMensajes();

  const nuevo = {
    id: Date.now(),
    nombre: req.body.nombre || "Invitado",
    mensaje: req.body.mensaje || "",
    foto: req.file ? "/uploads/" + req.file.filename : "",
    estado: "pendiente"
  };

  mensajes.push(nuevo);
  guardarMensajes(mensajes);

  io.emit("nuevo");
  res.json({ ok: true });
});

app.get("/api/aprobados", (req, res) => {
  const mensajes = leerMensajes()
    .filter(m => m.estado === "aprobado")
    .sort((a, b) => b.id - a.id);

  res.json(mensajes);
});

app.get("/api/pendientes", (req, res) => {
  if (req.query.pin !== ADMIN_PIN) {
    return res.status(401).json([]);
  }

  const mensajes = leerMensajes()
    .filter(m => m.estado === "pendiente")
    .sort((a, b) => b.id - a.id);

  res.json(mensajes);
});

app.post("/api/aprobar/:id", (req, res) => {
  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  const mensajes = leerMensajes();
  const mensaje = mensajes.find(m => String(m.id) === String(req.params.id));

  if (mensaje) {
    mensaje.estado = "aprobado";
  }

  guardarMensajes(mensajes);

  io.emit("actualizar");
  io.emit("nuevo");

  res.json({ ok: true });
});

app.post("/api/rechazar/:id", (req, res) => {
  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  const mensajes = leerMensajes();
  const mensaje = mensajes.find(m => String(m.id) === String(req.params.id));

  if (mensaje) {
    mensaje.estado = "rechazado";
  }

  guardarMensajes(mensajes);

  io.emit("nuevo");
  res.json({ ok: true });
});

app.get("/qr", async (req, res) => {
  const url = `${req.protocol}://${req.headers.host}/enviar.html`;
  const qr = await QRCode.toDataURL(url);

  res.send(`
    <body style="background:#111;color:white;text-align:center;font-family:Arial;padding:30px">
      <h1>QR Fiesta</h1>
      <p>Escaneá para dejar tu mensaje</p>
      <img src="${qr}" width="300" style="background:white;padding:15px;border-radius:20px"/>
      <p>${url}</p>
    </body>
  `);
});

server.listen(PORT, () => {
  console.log("Servidor iniciado en puerto " + PORT);
});