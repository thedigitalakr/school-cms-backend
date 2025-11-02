import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";
import bcrypt from "bcrypt";

const r = Router();

r.get("/", requireAdmin, async (req,res)=>{
  const [rows] = await pool.query("SELECT id, username FROM users WHERE id=?", [req.user.id]);
  res.json(rows[0]||{});
});

r.put("/", requireAdmin, async (req,res)=>{
  const { username, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET username=?, password_hash=? WHERE id=?", [username, hash, req.user.id]);
  } else {
    await pool.query("UPDATE users SET username=? WHERE id=?", [username, req.user.id]);
  }
  res.json({ok:true});
});

export default r;
