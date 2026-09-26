import { Pool } from "pg";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, "utf8");
      for (const line of envConfig.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
        if (match) {
          const key = match[1];
          const value = match[2];
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query(text: string, params?: any[]) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    // Log query text without logging raw query params to avoid leaking passwords, hashes, OTPs, or tokens in logs
    console.error("Database query execution error:", err instanceof Error ? err.message : err, { text });
    throw err;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

