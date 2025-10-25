// apps/web/api/customers/checkin.js
import { q } from "../_db.js";

/**
 * Accepte ces payloads:
 * {
 *   store: "nyc",
 *   firstName: "...",
 *   lastName: "...",
 *   phone: "...",
 *   email: "...",
 *   // soit:
 *   service_type: "DTF" | "Press" | "DTF+Press",
 *   // soit (legacy):
 *   service: "DTF" | "Press" | "DTF+Press",
 *   // pour le vêtement: soit booleans, soit "bring" | "buy"
 *   bring_own?: boolean,
 *   buy_on_site?: boolean,
 *   garment?: "bring" | "buy"
 * }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const b = req.body || {};

    const store = (b.store || "").toLowerCase().trim();
    if (!store) return res.status(400).json({ message: "Missing store" });

    // Normaliser service_type
    const service_type = (b.service_type || b.service || "").trim();
    if (!service_type) return res.status(400).json({ message: "Missing service_type" });

    // Normaliser bring/buy
    let bring_own = !!b.bring_own;
    let buy_on_site = !!b.buy_on_site;
    if (b.garment === "bring") { bring_own = true; buy_on_site = false; }
    if (b.garment === "buy")   { bring_own = false; buy_on_site = true; }

    const firstName = (b.firstName || "").trim();
    const lastName  = (b.lastName  || "").trim();
    const phone     = (b.phone     || "").trim();
    const email     = (b.email     || "").trim();
    if (!firstName || !lastName || !phone || !email) {
      return res.status(400).json({ message: "Missing required customer fields" });
    }

    // 1) store_id
    const s = await q(`SELECT id FROM stores WHERE slug = $1`, [store]);
    if (s.rowCount === 0) return res.status(400).json({ message: "Unknown store" });
    const storeId = s.rows[0].id;

    // 2) upsert customer "simple" (par téléphone)
    //   (Si tu as déjà une contrainte unique sur phone, fais un vrai UPSERT unique; sinon on fait find → insert)
    let customerId;
    const findC = await q(`SELECT id FROM customers WHERE phone = $1 LIMIT 1`, [phone]);
    if (findC.rowCount) {
      customerId = findC.rows[0].id;
      // on peut mettre à jour le nom/email si tu veux:
      await q(
        `UPDATE customers SET first_name=$2, last_name=$3, email=$4 WHERE id=$1`,
        [customerId, firstName, lastName, email]
      );
    } else {
      const insC = await q(
        `INSERT INTO customers (first_name,last_name,phone,email)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [firstName, lastName, phone, email]
      );
      customerId = insC.rows[0].id;
    }

    // 3) créer la commande (note: colonnes = service_type, bring_own, buy_on_site)
    const insO = await q(
      `INSERT INTO orders (store_id, customer_id, service_type, bring_own, buy_on_site, status)
       VALUES ($1,$2,$3,$4,$5,'PENDING_PAYMENT')
       RETURNING id, created_at`,
      [storeId, customerId, service_type, bring_own, buy_on_site]
    );

    const orderId = insO.rows[0].id;

    // 4) event d’audit (simple MVP)
    await q(
      `INSERT INTO order_events (order_id, actor_role, actor_name, prev_status, new_status)
       VALUES ($1,'Agent','Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) position/ETA du jour selon la "première" file concernée
    //    - DTF, DTF+Press => designer_queue_today
    //    - Press => press_queue_today
    let pos = 1, eta = 0;

    if (service_type === 'Press') {
      const pr = await q(
        `SELECT position, eta_minutes FROM press_queue_today WHERE store=$1 AND id=$2`,
        [store, orderId]
      );
      if (pr.rowCount) { pos = pr.rows[0].position; eta = pr.rows[0].eta_minutes; }
    } else {
      const dz = await q(
        `SELECT position, eta_minutes FROM designer_queue_today WHERE store=$1 AND id=$2`,
        [store, orderId]
      );
      if (dz.rowCount) { pos = dz.rows[0].position; eta = dz.rows[0].eta_minutes; }
    }

    return res.status(200).json({ orderId, position: pos, etaMinutes: eta });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}
