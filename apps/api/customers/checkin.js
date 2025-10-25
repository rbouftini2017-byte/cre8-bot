// apps/api/customers/checkin.js
import { query } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      store,            // "nyc", "los-angeles", ...
      firstName,
      lastName,
      phone,
      email,
      service_type,     // "DTF" | "Press" | "DTF+Press"
      bring_own,        // boolean
      buy_on_site       // boolean
    } = req.body || {};

    // validations basiques
    if (!store || !firstName || !lastName || !phone || !email || !service_type) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) store_id (slug -> id)
    const s = await query("SELECT id FROM stores WHERE slug = $1 LIMIT 1", [store]);
    if (s.rowCount === 0) {
      return res.status(400).json({ message: "Unknown store" });
    }
    const storeId = s.rows[0].id;

    // 2) upsert client par téléphone
    // nécessite l'index unique uq_customers_phone (cf. étape 3)
    const upsertCustomer = await query(
      `INSERT INTO customers (first_name, last_name, phone, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name  = EXCLUDED.last_name,
             email      = EXCLUDED.email
       RETURNING id`,
      [firstName, lastName, phone, email]
    );
    const customerId = upsertCustomer.rows[0].id;

    // 3) créer la commande
    const insertOrder = await query(
      `INSERT INTO orders
         (store_id, client_id, service_type, bring_own, buy_on_site, status)
       VALUES
         ($1, $2, $3, $4, $5, 'PENDING_PAYMENT')
       RETURNING id, created_at`,
      [storeId, customerId, service_type, !!bring_own, !!buy_on_site]
    );
    const { id: orderId } = insertOrder.rows[0];

    // 4) tracer l’événement (nom de table : "order_event" dans ta capture)
    await query(
      `INSERT INTO order_event (order_id, actor_role, actor_name, prev_status, new_status)
       VALUES ($1, 'Agent', 'Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) position & ETA (via la vue queue_today — déjà créée)
    // adapte à press_queue_today/designer_queue_today si tu veux des files séparées par service
    const q = await query(
      `SELECT position, eta_minutes
       FROM queue_today
       WHERE id = $1
       LIMIT 1`,
      [orderId]
    );

    const position = q.rows[0]?.position ?? 1;
    const etaMinutes = q.rows[0]?.eta_minutes ?? position * 4;

    return res.status(200).json({
      ok: true,
      orderId,
      position,
      etaMinutes
    });
  } catch (e) {
    console.error("[checkin] error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}
