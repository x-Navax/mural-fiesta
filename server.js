require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads";
const DB_PATH = process.env.DB_PATH || "./mensajes.db";

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/uploads", express.static(UPLOADS_DIR));

const db = new sqlite3.Database(DB_PATH);

db.run(`
CREATE TABLE IF NOT EXISTS mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  mensaje TEXT,
  foto TEXT,
  estado TEXT DEFAULT 'pendiente'
)
`);

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
  const nombre = req.body.nombre || "Invitado";
  const mensaje = req.body.mensaje || "";
  const foto = req.file ? "/uploads/" + req.file.filename : "";

  db.run(
    `INSERT INTO mensajes(nombre,mensaje,foto,estado)
     VALUES(?,?,?,'pendiente')`,
    [nombre, mensaje, foto],
    () => {
      io.emit("nuevo");
      res.json({ ok: true });
    }
  );
});

app.get("/api/aprobados", (req, res) => {
  db.all(
    `SELECT * FROM mensajes
     WHERE estado='aprobado'
     ORDER BY id DESC`,
    (err, rows) => {
      res.json(rows);
    }
  );
});

app.get("/api/pendientes", (req, res) => {
  if (req.query.pin !== ADMIN_PIN) {
    return res.status(401).json([]);
  }

  db.all(
    `SELECT * FROM mensajes
     WHERE estado='pendiente'
     ORDER BY id DESC`,
    (err, rows) => {
      res.json(rows);
    }
  );
});

app.post("/api/aprobar/:id", (req, res) => {
  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  db.run(
    `UPDATE mensajes SET estado='aprobado' WHERE id=?`,
    [req.params.id],
    () => {
      io.emit("actualizar");
      io.emit("nuevo");
      res.json({ ok: true });
    }
  );
});

app.post("/api/rechazar/:id", (req, res) => {
  if (req.body.pin !== ADMIN_PIN) {
    return res.sendStatus(401);
  }

  db.run(
    `UPDATE mensajes SET estado='rechazado' WHERE id=?`,
    [req.params.id],
    () => {
      io.emit("nuevo");
      res.json({ ok: true });
    }
  );
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