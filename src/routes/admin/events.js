import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "event_" + Date.now() + ext);
  },
});
const upload = multer({ storage });

router.get("/", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM events ORDER BY date DESC, id DESC");
  res.json(rows);
});

router.post("/", requireAdmin, upload.single("image"), async (req, res) => {
  const { title, date, description } = req.body;
  const image = req.file ? "/uploads/" + req.file.filename : null;

  await pool.query(
    "INSERT INTO events (title,date,description,image) VALUES (?,?,?,?)",
    [title, date, description, image]
  );

  // record into media
  if (req.file) {
    try {
      await pool.query(
        "INSERT INTO media (filename, url, mime, size, alt_text) VALUES (?,?,?,?,?)",
        [
          req.file.originalname || req.file.filename,
          image,
          req.file.mimetype || "application/octet-stream",
          req.file.size || 0,
          title || "",
        ]
      );
    } catch (e) {
      console.warn("media insert (events POST) failed:", e.message);
    }
  }

  res.json({ ok: true });
});

router.put("/:id", requireAdmin, upload.single("image"), async (req, res) => {
  const { title, date, description } = req.body;

  if (req.file) {
    const image = "/uploads/" + req.file.filename;
    await pool.query(
      "UPDATE events SET title=?, date=?, description=?, image=? WHERE id=?",
      [title, date, description, image, req.params.id]
    );

    // record into media
    try {
      await pool.query(
        "INSERT INTO media (filename, url, mime, size, alt_text) VALUES (?,?,?,?,?)",
        [
          req.file.originalname || req.file.filename,
          image,
          req.file.mimetype || "application/octet-stream",
          req.file.size || 0,
          title || "",
        ]
      );
    } catch (e) {
      console.warn("media insert (events PUT) failed:", e.message);
    }
  } else {
    await pool.query(
      "UPDATE events SET title=?, date=?, description=? WHERE id=?",
      [title, date, description, req.params.id]
    );
  }

  res.json({ ok: true });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  // keep media entries/files; events removal shouldn’t purge library automatically
  await pool.query("DELETE FROM events WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

export default router;
