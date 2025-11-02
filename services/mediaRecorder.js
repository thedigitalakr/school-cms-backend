import { pool } from "../db.js";

/**
 * Record uploaded file(s) into the central media table
 * @param {Array|Object} files - Multer file object or array of files
 */
export async function recordMedia(files) {
  if (!files) return;

  const list = Array.isArray(files) ? files : [files];
  const inserts = list
    .filter(f => !!f.filename)
    .map(f => [
      f.originalname || f.filename,
      f.filename,                          // internal
      "/uploads/" + f.filename,            // public URL
      f.mimetype || "application/octet-stream",
      f.size || 0
    ]);

  if (!inserts.length) return;

  try {
    await pool.query(
      "INSERT INTO media (filename, name, url, mime, size) VALUES ?",
      [inserts.map(([filename, name, url, mime, size]) => [filename, name, url, mime, size])]
    );
  } catch (err) {
    console.error("Media record insert failed:", err.message);
  }
}
