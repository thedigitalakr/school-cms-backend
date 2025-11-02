import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";

const r = Router();
r.get("/", requireAdmin, async (req,res)=>{
  const [[{c1}]] = await pool.query("SELECT COUNT(*) c1 FROM pages");
  const [[{c2}]] = await pool.query("SELECT COUNT(*) c2 FROM events");
  const [[{c3}]] = await pool.query("SELECT COUNT(*) c3 FROM media");
  const [[{c4}]] = await pool.query("SELECT COUNT(*) c4 FROM menus");
  res.json({ pages:c1, events:c2, media:c3, menus:c4 });
});
export default r;
