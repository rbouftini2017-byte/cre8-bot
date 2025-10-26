// apps/api/customers/checkin.js
import { query } from "../_db.js";

function toBool(val) {
  if (typeof val === "boolean") return val;
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return ["true","1","yes","y","on"].includes(s);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const b = req.body || {};

    // Accepter l'ancien ET le nouveau format
    const service_type = b.service_type ?? b.service ?? null;

    // "garment" peut venir comme "bring" | "buy" | "Bring own" | "Buy on site"
    const garmentRaw = (b.garment ?? "").toString().toLowerCase();
    const bring_own  = b.bring_own   ?? (garmentRaw.includes("bring"));
    const buy_on_site= b.buy_on_site ?? (garmentRaw.includes("buy"));

    const store     = b.store;
    const firstName = b.firstName;
    const lastName  = b.lastName;
    const phone     = b.phone;
    const email     = b.email;

    if (!store || !firstName || !lastName || !phone || !email || !service_type) {
      return res.status(400).json({
        message: "Missing fields",
        expected: ["store","firstName","lastName","phone","email","service_type|service","bring_own|buy_on_site|garment"]
      });
    }

    // 1) store_id
    const s = await query("SELECT id FROM stores WHERE slug = $1", [store]);
    if (s.rowCount === 0) {
      return res.status(400).json({ message: `Unknown store: ${store}` });
    }
    const storeId = s.rows[0].id;

    // 2) client par téléphone (upsert simple)
    let clientId;
    const c0 = await query("SELECT id FROM customers WHERE phone = $1 LIMIT 1", [phone]);
    if (c0.rowCount > 0) {
      clientId = c0.rows[0].id;
    } else {
      const ins = await query(
        `INSERT INTO customers (first_name, last_name, phone, email)
         VALUES ($1,$2,$3,$4)
         RETURNING id`,
        [firstName, lastName, phone, email]
      );
      clientId = ins.rows[0].id;
    }

    // 3) INSERT dans orders
    const o = await query(
      `INSERT INTO orders (store_id, client_id, service_type, bring_own, buy_on_site, status)
       VALUES ($1,$2,$3,$4,$5,'PENDING_PAYMENT')
       RETURNING id, created_at`,
      [storeId, clientId, service_type, toBool(bring_own), toBool(buy_on_site)]
    );
    const orderId = o.rows[0].id;

    // 4) event (d'après ta base, la table s'appelle "order_event")
    await query(
      `INSERT INTO order_event (order_id, employee_role, employee_id, prev_status, new_status)
       VALUES ($1,'Agent','Front desk', NULL, 'PENDING_PAYMENT')`,
      [orderId]
    );

    // 5) position + ETA (si la vue queue_today existe)
    let position = 1, etaMinutes = 4;
    try {
      const q = await query(
        "SELECT position, eta_minutes FROM queue_today WHERE id = $1",
        [orderId]
      );
      if (q.rowCount > 0) {
        position   = q.rows[0].position ?? 1;
        etaMinutes = q.rows[0].eta_minutes ?? position * 4;
      }
    } catch (err) {
      // ce n'est pas bloquant : on calcule une ETA par défaut
      console.error("queue_today lookup failed:", err);
    }

    return res.status(200).json({ ok: true, orderId, position, etaMinutes });
  } catch (e) {
    // >>> LOG + renvoyer l'erreur pour débogage
    console.error("checkin error:", e);
    return res.status(500).json({
      message: "Server error",
      error: String(e?.message || e),
      detail: e?.detail ?? null,
      hint: e?.hint ?? null
    });
  }
}
