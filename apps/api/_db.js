// apps/api/_db.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optimisation vercel: pool réutilisé entre invocations
  max: 5,
  idleTimeoutMillis: 30000
});

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}
