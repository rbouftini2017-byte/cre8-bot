// apps/web/api/customers/checkin.js
import { query } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      store,            // "nyc"
      firstName,
      lastName,
      phone,
      email,
      service_type,     // "DTF" | "Press" | "DTF+Press"
      garment,          // "bring" | "buy"
      bring_own,        // boolean (si tu utilises ces deux flags)
      buy_on_site       // boolean
    } = req.body || {};

    if (!store || !firstName || !lastName || !phone || !email || !service_type || !garment) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) store_id
    const s = await query("SELECT id FROM stores WHERE slug = $1", [store]);
    if (s.rowCount === 0) return res.status(400).json({ message: "Unknown store" });
    const storeId = s.rows[0].id;

    // 2) client (au plus simple : insert puis récup par phone si conflit)
    let customerId;
    const c = await query(
      `INSERT INTO customers (first_name,last_name,phone,email)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (phone) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [firstName, lastName, phone, email]
    );
    customerId = c.rows[0].id;

    // 3) order
    const o = await query(
      `INSERT INTO orders (store_id, client_id, service_type, status, bring_own, buy_on_site)
       VALUES ($1,$2,$3,'PENDING_PAYMENT',$4,$5)
       RETURNING id, created_at`,
      [storeId, customerId, service_type, !!bring_own, !!buy_on_site]
    );
    const orderId = o.rows[0].id;

    // 4) event
    await query(
      `INSERT INTO order_event (order_id, actor_role, actor_name, prev_status, new_status)
       VALUES ($1,'Agent','Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) position/ETA (si tu as une vue queue_today/queue_view)
    let pos = 1, eta = 4;
    try {
      const q = await query(
        `SELECT position, eta_minutes FROM queue_today WHERE id = $1`,
        [orderId]
      );
      if (q.rowCount > 0) {
        pos = q.rows[0].position ?? 1;
        eta = q.rows[0].eta_minutes ?? pos * 4;
      }
    } catch { /* ignore si la vue n'existe pas */ }

    return res.status(200).json({ orderId, position: pos, etaMinutes: eta });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}
