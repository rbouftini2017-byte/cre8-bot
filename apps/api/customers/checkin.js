// apps/api/customers/checkin.js
import { query } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const b = req.body || {};

    // Mapper l'ancien format vers le nouveau :
    const service_type = b.service_type ?? b.service;               // "DTF" | "Press" | "DTF+Press"
    const bring_own    = b.bring_own   ?? (b.garment === "bring");  // boolean
    const buy_on_site  = b.buy_on_site ?? (b.garment === "buy");    // boolean

    const store     = b.store;
    const firstName = b.firstName;
    const lastName  = b.lastName;
    const phone     = b.phone;
    const email     = b.email;

    if (!store || !firstName || !lastName || !phone || !email || !service_type) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) store_id
    const s = await query("SELECT id FROM stores WHERE slug = $1", [store]);
    if (s.rowCount === 0) return res.status(400).json({ message: "Unknown store" });
    const storeId = s.rows[0].id;

    // 2) client via téléphone
    let clientId;
    const c0 = await query("SELECT id FROM customers WHERE phone = $1 LIMIT 1", [phone]);
    if (c0.rowCount > 0) {
      clientId = c0.rows[0].id;
    } else {
      const ins = await query(
        `INSERT INTO customers (first_name, last_name, phone, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [firstName, lastName, phone, email]
      );
      clientId = ins.rows[0].id;
    }

    // 3) créer la commande
    const o = await query(
      `INSERT INTO orders (store_id, client_id, service_type, bring_own, buy_on_site, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING_PAYMENT')
       RETURNING id, created_at`,
      [storeId, clientId, service_type, !!bring_own, !!buy_on_site]
    );
    const orderId = o.rows[0].id;

    // 4) event
    await query(
      `INSERT INTO order_event (order_id, actor_role, actor_name, prev_status, new_status)
       VALUES ($1, 'Agent', 'Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) position + ETA (essayez via la vue si elle existe)
    let position = 1, etaMinutes = 4;
    try {
      const q = await query(
        "SELECT position, eta_minutes FROM queue_today WHERE id = $1",
        [orderId]
      );
      if (q.rowCount > 0) {
        position = q.rows[0].position ?? 1;
        etaMinutes = q.rows[0].eta_minutes ?? position * 4;
      }
    } catch (_) {}

    return res.status(200).json({ ok: true, orderId, position, etaMinutes });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}
