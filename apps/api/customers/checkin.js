// apps/api/customers/checkin.js
import { query } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Champs attendus côté front (à adapter si ton form envoie autre chose)
    const {
      store,            // slug du magasin: "nyc" | "los-angeles" | "dallas"
      firstName,
      lastName,
      phone,
      email,
      service_type,     // "DTF" | "Press" | "DTF+Press"
      bring_own,        // boolean
      buy_on_site       // boolean
    } = req.body || {};

    // Validation minimale
    if (
      !store ||
      !firstName ||
      !lastName ||
      !phone ||
      !email ||
      !service_type ||
      typeof bring_own === "undefined" ||
      typeof buy_on_site === "undefined"
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) Récupérer le store_id
    const s = await query(
      `SELECT id FROM stores WHERE slug = $1 LIMIT 1`,
      [store]
    );
    if (s.rowCount === 0) {
      return res.status(400).json({ message: "Unknown store" });
    }
    const storeId = s.rows[0].id;

    // 2) Upsert du client (par téléphone)
    // PRÉ-REQUIS conseillé : contrainte unique sur customers.phone (voir SQL plus bas)
    const c = await query(
      `
      INSERT INTO customers (first_name, last_name, phone, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name  = EXCLUDED.last_name,
            email      = EXCLUDED.email
      RETURNING id
      `,
      [firstName, lastName, phone, email]
    );
    const clientId = c.rows[0].id;

    // 3) Créer la commande (status initial: PENDING_PAYMENT)
    const o = await query(
      `
      INSERT INTO orders (store_id, client_id, service_type, bring_own, buy_on_site, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING_PAYMENT')
      RETURNING id, created_at
      `,
      [storeId, clientId, service_type, !!bring_own, !!buy_on_site]
    );
    const orderId = o.rows[0].id;

    // 4) Journal d’événement
    await query(
      `
      INSERT INTO order_event (order_id, actor_role, actor_name, prev_status, new_status)
      VALUES ($1, 'Agent', 'Front desk', NULL, 'PENDING_PAYMENT')
      `,
      [orderId]
    );

    // 5) Position + ETA depuis la vue queue_today (créée précédemment)
    //    Si tu as des vues séparées par rôle, tu peux aussi interroger designer_queue_today / press_queue_today
    const q = await query(
      `SELECT position, eta_minutes FROM queue_today WHERE id = $1`,
      [orderId]
    );

    const position = q.rows[0]?.position ?? 1;
    const etaMinutes = q.rows[0]?.eta_minutes ?? position * 4;

    return res.status(200).json({
      orderId,
      position,
      etaMinutes
    });
  } catch (e) {
    console.error("CHECKIN ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
}
