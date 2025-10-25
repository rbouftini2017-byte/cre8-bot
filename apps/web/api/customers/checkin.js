// apps/web/api/customers/checkin.js
import { q } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const b = req.body || {};
    const store = (b.store || "").toLowerCase().trim();
    const firstName = (b.firstName || "").trim();
    const lastName  = (b.lastName  || "").trim();
    const phone     = (b.phone     || "").trim();
    const email     = (b.email     || "").trim();

    // ta table a la colonne service_type (pas serive_type)
    const service_type = (b.service_type || b.service || "").trim();

    // garment → deux booléens bring_own / buy_on_site
    let bring_own  = !!b.bring_own;
    let buy_on_site = !!b.buy_on_site;
    if (b.garment === "bring") { bring_own = true;  buy_on_site = false; }
    if (b.garment === "buy")   { bring_own = false; buy_on_site = true;  }

    if (!store || !firstName || !lastName || !phone || !email || !service_type) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) store_id
    const s = await q(`SELECT id FROM stores WHERE slug = $1 LIMIT 1`, [store]);
    if (s.rowCount === 0) return res.status(400).json({ message: "Unknown store" });
    const storeId = s.rows[0].id;

    // 2) upsert client par téléphone (recommandé: contrainte UNIQUE(phone))
    const c = await q(
      `INSERT INTO customers (first_name,last_name,phone,email)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (phone) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name  = EXCLUDED.last_name,
             email      = EXCLUDED.email
       RETURNING id`,
      [firstName, lastName, phone, email]
    );
    const clientId = c.rows[0].id;

    // 3) créer la commande (note: client_id, service_type, bring_own, buy_on_site, status)
    const o = await q(
      `INSERT INTO orders (store_id, client_id, service_type, bring_own, buy_on_site, status)
       VALUES ($1,$2,$3,$4,$5,'PENDING_PAYMENT')
       RETURNING id, created_at`,
      [storeId, clientId, service_type, bring_own, buy_on_site]
    );
    const orderId = o.rows[0].id;

    // 4) journal d’événement (ta table s’appelle order_event)
    await q(
      `INSERT INTO order_event (order_id, actor_role, actor_name, prev_status, new_status)
       VALUES ($1,'Agent','Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) Récupérer position/ETA du jour (vue queue_today que tu as créée)
    const qv = await q(`SELECT position, eta_minutes FROM queue_today WHERE id = $1`, [orderId]);
    const position   = qv.rows[0]?.position ?? 1;
    const etaMinutes = qv.rows[0]?.eta_minutes ?? (position - 1) * 4;

    return res.status(200).json({ orderId, position, etaMinutes });
  } catch (e) {
    console.error("CHECKIN ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
}
