// apps/api/customers/checkin.js
import { query } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { store, firstName, lastName, phone, email, serive_type, garment } = req.body || {};
    if (!store || !firstName || !lastName || !phone || !email || !serive_type || !garment) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) store_id
    const s = await query("SELECT id FROM stores WHERE slug = $1", [store]);
    if (s.rowCount === 0) return res.status(400).json({ message: "Unknown store" });
    const storeId = s.rows[0].id;

    // 2) upsert client (MVP : par téléphone)
    const c = await query(
      `INSERT INTO customers (first_name,last_name,phone,email)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [firstName, lastName, phone, email]
    );

    let customerId;
    if (c.rowCount === 0) {
      const c2 = await query(
        "SELECT id FROM customers WHERE phone = $1 LIMIT 1",
        [phone]
      );
      customerId = c2.rows[0]?.id;
      if (!customerId) {
        // si pas de contrainte unique sur phone, on (ré)insère
        const c3 = await query(
          `INSERT INTO customers (first_name,last_name,phone,email) VALUES ($1,$2,$3,$4) RETURNING id`,
          [firstName, lastName, phone, email]
        );
        customerId = c3.rows[0].id;
      }
    } else {
      customerId = c.rows[0].id;
    }

    // 3) créer commande
    const o = await query(
      `INSERT INTO orders (store_id, customer_id, serive_type, garment)
       VALUES ($1,$2,$3,$4)
       RETURNING id, created_at`,
      [storeId, customerId, serive_type, garment]
    );
    const orderId = o.rows[0].id;

    // 4) event
    await query(
      `INSERT INTO order_events (order_id, actor_role, actor_name, prev_status, new_status)
       VALUES ($1,'Agent','Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) position + ETA via la vue queue
    const q = await query(
      `SELECT position, eta_minutes FROM queue_view WHERE id = $1`,
      [orderId]
    );
    const pos = q.rows[0]?.position ?? 1;
    const eta = q.rows[0]?.eta_minutes ?? pos * 4;

    return res.status(200).json({ orderId, position: pos, etaMinutes: eta });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}
