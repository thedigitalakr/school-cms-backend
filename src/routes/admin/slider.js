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
    cb(null, "slide_" + Date.now() + ext);
  },
});
const upload = multer({ storage });

router.get("/", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM slider ORDER BY sort_order,id");
  res.json(rows);
});

router.post("/", requireAdmin, upload.single("image"), async (req, res) => {
  const { caption = null, link = null, sort_order = 0 } = req.body;
  const image = req.file ? "/uploads/" + req.file.filename : null;

  await pool.query(
    "INSERT INTO slider (image,caption,link,sort_order) VALUES (?,?,?,?)",
    [image, caption, link, sort_order]
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
          caption || "",
        ]
      );
    } catch (e) {
      console.warn("media insert (slider POST) failed:", e.message);
    }
  }

  res.json({ ok: true });
});

router.put("/:id", requireAdmin, upload.single("image"), async (req, res) => {
  const { caption = null, link = null, sort_order = 0 } = req.body;

  if (req.file) {
    const image = "/uploads/" + req.file.filename;

    await pool.query(
      "UPDATE slider SET image=?, caption=?, link=?, sort_order=? WHERE id=?",
      [image, caption, link, sort_order, req.params.id]
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
          caption || "",
        ]
      );
    } catch (e) {
      console.warn("media insert (slider PUT) failed:", e.message);
    }
  } else {
    await pool.query(
      "UPDATE slider SET caption=?, link=?, sort_order=? WHERE id=?",
      [caption, link, sort_order, req.params.id]
    );
  }

  res.json({ ok: true });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  // NOTE: We don't remove the media record/file here to keep the library intact.
  await pool.query("DELETE FROM slider WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

export default router;
