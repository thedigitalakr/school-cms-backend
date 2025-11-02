import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../db.js";

const router = Router();

/**
 * POST /api/admin/auth/login
 * body: { username, password }
 * table: users (role='admin')
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    // find admin user
    const [rows] = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    const user = rows[0];
    if (!user || user.role !== "admin") {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid username or password" });

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: "admin" },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );
    res.json({ token, username: user.username });
  } catch (e) {
    console.error("LOGIN ERR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/admin/auth/me
 * header: Authorization: Bearer <token>
 */
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    const [rows] = await pool.query(
      "SELECT id, username, role FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    if (!rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ message: "Invalid/expired token" });
  }
});

/**
 * PUT /api/admin/auth/profile
 * body: { username?, password? }  (only for the current admin)
 */
router.put("/profile", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    const { username, password } = req.body || {};

    if (!username && !password) return res.status(400).json({ message: "Nothing to update" });

    if (username) {
      await pool.query("UPDATE users SET username = ? WHERE id = ?", [username, payload.sub]);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, payload.sub]);
    }
    res.json({ message: "Updated" });
  } catch (e) {
    console.error("PROFILE ERR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
