import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

export async function verifyUser(username, password) {
  const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
  const u = rows[0];
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.password_hash);
  return ok ? u : null;
}

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "2d" });
}
