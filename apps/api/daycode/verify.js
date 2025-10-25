// apps/api/daycode/verify.js
import { query } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  try {
    const { store, code } = req.body || {};
    if (!store || !code) return res.status(400).json({ valid: false, message: "Missing store/code" });

    const { rows } = await query(
      "SELECT 1 FROM stores WHERE slug = $1 AND day_code = $2 LIMIT 1",
      [store, code]
    );

    return res.status(200).json({ valid: rows.length > 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ valid: false });
  }
}
