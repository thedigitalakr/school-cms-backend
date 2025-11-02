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
  filename: (req, file, cb) =>
    cb(null, "media_" + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const getAllFiles = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .map((f) => path.join(dir, f));

/* ------------------ GET ------------------ */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const dir = path.resolve(UPLOAD_DIR);
    const fsFiles = getAllFiles(dir);

    // Fetch DB records
    const [rows] = await pool.query("SELECT * FROM media ORDER BY id DESC");

    // Build a quick lookup of existing URLs
    const known = new Set(rows.map((r) => (r.url || "").trim().toLowerCase()));

    const newFiles = [];
    for (const filePath of fsFiles) {
      const rel = "/uploads/" + path.basename(filePath);
      if (!known.has(rel.toLowerCase())) {
        // Gather file metadata
        const stats = fs.statSync(filePath);
        const mime =
          path.extname(filePath).match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ? "image/" + path.extname(filePath).replace(".", "")
            : "application/octet-stream";

        newFiles.push([path.basename(filePath), rel, mime, stats.size, "", new Date()]);
      }
    }

    // Auto-insert any missing files into DB
    if (newFiles.length > 0) {
      await pool.query(
        "INSERT INTO media (filename, url, mime, size, alt_text, created_at) VALUES ?",
        [newFiles]
      );
      console.log(`Inserted ${newFiles.length} missing uploads into media table`);
    }

    // Return updated combined list
    const [allRows] = await pool.query("SELECT * FROM media ORDER BY id DESC");
    res.json(allRows);
  } catch (err) {
    console.error("MEDIA GET failed:", err);
    res.status(500).json({ message: "Failed to fetch media" });
  }
});

/* ------------------ POST upload ------------------ */
router.post("/", requireAdmin, upload.array("files"), async (req, res) => {
  try {
    if (!req.files?.length)
      return res.status(400).json({ message: "No files uploaded" });

    const inserts = req.files.map((f) => [
      f.originalname || f.filename,
      "/uploads/" + f.filename,
      f.mimetype || "application/octet-stream",
      f.size || 0,
      "",
      new Date(),
    ]);

    await pool.query(
      "INSERT INTO media (filename, url, mime, size, alt_text, created_at) VALUES ?",
      [inserts]
    );

    res.json({ ok: true, uploaded: inserts.length });
  } catch (err) {
    console.error("MEDIA POST failed:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ------------------ PUT update ------------------ */
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { alt_text = "" } = req.body;
    const [r] = await pool.query("UPDATE media SET alt_text=? WHERE id=?", [
      alt_text,
      id,
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ message: "Media not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("MEDIA PUT failed:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

/* ------------------ DELETE ------------------ */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT url FROM media WHERE id=?", [id]);
    if (rows.length) {
      const rel = String(rows[0].url || "").replace(/^\//, "");
      const filepath = path.join(process.cwd(), rel);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    await pool.query("DELETE FROM media WHERE id=?", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("MEDIA DELETE failed:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;
