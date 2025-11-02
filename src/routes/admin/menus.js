import { Router } from "express";
import { pool } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";

const r = Router();

r.get("/", requireAdmin, async (req,res)=>{
  const [rows] = await pool.query(`
    SELECT m.*, p.slug AS page_slug
    FROM menus m
    LEFT JOIN pages p ON p.id=m.page_id
    ORDER BY parent_id IS NULL DESC, parent_id ASC, sort_order ASC, id ASC`);
  res.json(rows);
});

r.post("/", requireAdmin, async (req,res)=>{
  const { label, url=null, page_id=null, parent_id=null, sort_order=0 } = req.body;
  await pool.query("INSERT INTO menus (label,url,page_id,parent_id,sort_order) VALUES (?,?,?,?,?)",
    [label, url, page_id, parent_id, sort_order]);
  res.json({ok:true});
});

r.put("/:id", requireAdmin, async (req,res)=>{
  const { label, url=null, page_id=null, parent_id=null, sort_order=0 } = req.body;
  await pool.query("UPDATE menus SET label=?, url=?, page_id=?, parent_id=?, sort_order=? WHERE id=?",
    [label, url, page_id, parent_id, sort_order, req.params.id]);
  res.json({ok:true});
});

r.delete("/:id", requireAdmin, async (req,res)=>{
  await pool.query("DELETE FROM menus WHERE id=?", [req.params.id]);
  res.json({ok:true});
});

export default r;
