import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const r = Router();

/* ---------- Multer config ---------- */
const UP_DIR = "uploads";
if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".webp");
    const base = `${file.fieldname}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    cb(null, base + ext.toLowerCase());
  },
});
const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed"));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ---------- GET settings ---------- */
r.get("/", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM settings WHERE id=1");
  res.json(rows[0] || {});
});

/* ---------- UPDATE settings ---------- */
r.put(
  "/",
  requireAdmin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "intro_image", maxCount: 1 },
    { name: "og_image", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const {
        school_name = "",
        phone = "",
        email = "",
        theme_color = "#2563eb",
        intro_title = "",
        intro_html = "",
        meta_title = "",
        meta_description = "",
        meta_keywords = "",
        og_title = "",
        og_description = "",
        remove_logo = "0",
        remove_favicon = "0",
        remove_intro_image = "0",
        remove_og_image = "0",
      } = req.body;

      const files = req.files || {};
      const logoFile = files.logo?.[0];
      const faviconFile = files.favicon?.[0];
      const introFile = files.intro_image?.[0];
      const ogFile = files.og_image?.[0];

      const fields = [
        ["school_name", school_name],
        ["phone", phone],
        ["email", email],
        ["theme_color", theme_color],
        ["intro_title", intro_title],
        ["intro_html", intro_html],
        ["meta_title", meta_title],
        ["meta_description", meta_description],
        ["meta_keywords", meta_keywords],
        ["og_title", og_title],
        ["og_description", og_description],
        ["updated_at", new Date()],
      ];

      if (logoFile) fields.push(["logo", `/${UP_DIR}/${logoFile.filename}`]);
      else if (remove_logo === "1") fields.push(["logo", ""]);

      if (faviconFile) fields.push(["favicon", `/${UP_DIR}/${faviconFile.filename}`]);
      else if (remove_favicon === "1") fields.push(["favicon", ""]);

      if (introFile) fields.push(["intro_image", `/${UP_DIR}/${introFile.filename}`]);
      else if (remove_intro_image === "1") fields.push(["intro_image", ""]);

      if (ogFile) fields.push(["og_image", `/${UP_DIR}/${ogFile.filename}`]);
      else if (remove_og_image === "1") fields.push(["og_image", ""]);

      const setSql = fields.map(([k]) => `${k}=?`).join(", ");
      const values = fields.map(([, v]) => v);

      await pool.query(`UPDATE settings SET ${setSql} WHERE id=1`, values);

      res.json({ ok: true });
    } catch (err) {
      console.error("SETTINGS PUT failed:", err);
      next(err);
    }
  }
);

export default r;
