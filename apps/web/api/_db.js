// apps/web/api/_db.js

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // nécessaire pour Neon sur Vercel
});

export const query = (text, params) => pool.query(text, params);

