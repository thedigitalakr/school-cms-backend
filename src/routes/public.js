import { Router } from "express";
import { pool } from "../db.js";

const r = Router();

r.get("/settings", async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM settings WHERE id=1");
  const s = rows[0]||{};
  if (s.logo && !/^https?:\/\//.test(s.logo)) s.logo = new URL(s.logo, process.env.BASE_URL).href;
  res.json(s);
});

r.get("/menus", async (req,res)=>{
  const [rows] = await pool.query(`
    SELECT m.*, p.slug AS page_slug
    FROM menus m
    LEFT JOIN pages p ON p.id=m.page_id
    ORDER BY parent_id IS NULL DESC, parent_id ASC, sort_order ASC, id ASC
  `);
  const byId = {};
  rows.forEach(x=>{
    byId[x.id] = { id:x.id, label:x.label, url:x.url, page_slug:x.page_slug, parent_id:x.parent_id, children:[] };
  });
  const tree = [];
  rows.forEach(x=>{
    const node = byId[x.id];
    if (x.parent_id && byId[x.parent_id]) byId[x.parent_id].children.push(node);
    else tree.push(node);
  });
  res.json(tree);
});

r.get("/slider", async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM slider ORDER BY sort_order ASC, id ASC");
  const mapped = rows.map(s=>({
    ...s,
    image: /^https?:\/\//.test(s.image) ? s.image : new URL(s.image, process.env.BASE_URL).href
  }));
  res.json(mapped);
});

r.get("/events", async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM events ORDER BY date DESC, id DESC LIMIT 50");
  const mapped = rows.map(e=>({
    ...e,
    image: e.image ? (/^https?:\/\//.test(e.image)?e.image:new URL(e.image, process.env.BASE_URL).href) : null
  }));
  res.json(mapped);
});

r.get("/page/:slug", async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM pages WHERE slug=?", [req.params.slug]);
  if (!rows[0]) return res.status(404).json({message:"Not found"});
  res.json(rows[0]);
});

r.get("/intro", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT intro_title, intro_html, intro_image, school_name, logo FROM settings WHERE id=1"
  );
  const s = rows[0] || {};

  // ✅ Prefer intro_image → fallback to logo → fallback to blank
  let image = s.intro_image || s.logo || "";

  // Convert /uploads/... into full URL using BASE_URL
  if (image && !/^https?:\/\//.test(image)) {
    image = new URL(image, process.env.BASE_URL).href;
  }

  res.json({
    intro_title: s.intro_title || s.school_name || "Introduction",
    intro_html: s.intro_html || "",
    image,
  });
});


r.get("/footer", async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM footer WHERE id=1");
  const f = rows[0] || {};
  const parse = (v, def)=> {
    try { return typeof v === "string" ? JSON.parse(v) : (v||def); } catch { return def; }
  };
  res.json({
    col1_title: f.col1_title, col1_links: parse(f.col1_links, []),
    col2_title: f.col2_title, col2_links: parse(f.col2_links, []),
    col3_title: f.col3_title, col3_links: parse(f.col3_links, []),
    socials: parse(f.socials, {}), copyright_text: f.copyright_text
  });
});

export default r;
