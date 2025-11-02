import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";

const r = Router();

r.get("/", requireAdmin, async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM footer WHERE id=1");
  res.json(rows[0]||{});
});

r.put("/", requireAdmin, async (req,res)=>{
  const { col1_title, col1_links, col2_title, col2_links, col3_title, col3_links, socials, copyright_text } = req.body;
  await pool.query(`
    UPDATE footer SET
      col1_title=?,
      col1_links=?,
      col2_title=?,
      col2_links=?,
      col3_title=?,
      col3_links=?,
      socials=?,
      copyright_text=?
    WHERE id=1
  `, [
    col1_title, JSON.stringify(col1_links||[]),
    col2_title, JSON.stringify(col2_links||[]),
    col3_title, JSON.stringify(col3_links||[]),
    JSON.stringify(socials||{}),
    copyright_text
  ]);
  res.json({ok:true});
});

export default r;
