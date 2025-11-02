import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const pool = await mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "school_cms",
  waitForConnections: true,
});

const username = "admin";
const plain = "Admin@123";                   // <— your login password
const hash = await bcrypt.hash(plain, 10);

await pool.query(
  `INSERT INTO users (username, password_hash, role)
   VALUES (?, ?, 'admin')
   ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='admin'`,
  [username, hash]
);

console.log("Seeded admin:", username, "password:", plain);
process.exit(0);
