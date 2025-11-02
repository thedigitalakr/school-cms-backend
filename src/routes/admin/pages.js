import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const r = Router();

/* Optional: enable image/file uploads from RichText (if you use it) */
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, "page_" + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/* --------- LIST --------- */
r.get("/", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM pages ORDER BY id DESC");
  res.json(rows);
});

/* --------- READ ONE --------- */
r.get("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM pages WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ message: "Page not found" });
  res.json(rows[0]);
});

/* --------- CREATE --------- */
r.post("/", requireAdmin, async (req, res) => {
  const { title, slug, content_html = "", status = "draft" } = req.body;
  if (!title || !slug) return res.status(400).json({ message: "Title and slug are required." });

  const [dup] = await pool.query("SELECT id FROM pages WHERE slug = ?", [slug]);
  if (dup.length) return res.status(409).json({ message: "Slug already exists. Choose another one." });

  const [r1] = await pool.query(
    "INSERT INTO pages (title, slug, content_html, status, created_at, updated_at) VALUES (?,?,?,?,NOW(),NOW())",
    [title, slug, content_html, status]
  );
  res.json({ ok: true, id: r1.insertId });
});

/* --------- UPDATE --------- */
r.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, slug, content_html = "", status = "draft" } = req.body;
  if (!title || !slug) return res.status(400).json({ message: "Title and slug are required." });

  const [dup] = await pool.query("SELECT id FROM pages WHERE slug = ? AND id <> ?", [slug, id]);
  if (dup.length) return res.status(409).json({ message: "Another page already uses this slug." });

  const [r2] = await pool.query(
    "UPDATE pages SET title=?, slug=?, content_html=?, status=?, updated_at=NOW() WHERE id=?",
    [title, slug, content_html, status, id]
  );
  if (r2.affectedRows === 0) return res.status(404).json({ message: "Page not found." });

  res.json({ ok: true });
});

/* --------- DELETE --------- */
r.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM pages WHERE id=?", [id]);
  res.json({ ok: true });
});

/* --------- (Optional) RTE file upload endpoint --------- */
r.post("/upload", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const url = "/uploads/" + req.file.filename;

  // also register into media table (central library)
  const mime = req.file.mimetype || "application/octet-stream";
  const size = req.file.size || 0;
  try {
    await pool.query(
      "INSERT INTO media (filename, url, mime, size, alt_text) VALUES (?,?,?,?,?)",
      [req.file.originalname || req.file.filename, url, mime, size, ""]
    );
  } catch (e) {
    console.warn("media insert (pages/upload) failed:", e.message);
  }

  res.json({ ok: true, url });
});

export default r;
