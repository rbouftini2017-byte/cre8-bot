import React, { useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function StoreCheckin() {
  const { store } = useParams();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    email: "",
    service: "DTF",
    garment: "bring",
    dayCode: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // 1) Vérifier le Day Code
      const verify = await fetch(`${API_BASE}/daycode/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, code: form.dayCode }),
      });
      const ok = await verify.json();
      if (!verify.ok || !ok.valid) {
        setStatus({ type: "error", msg: "Invalid Day Code. Please check with the staff." });
        setLoading(false);
        return;
      }

      // 2) Check-in
      const res = await fetch(`${API_BASE}/customers/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Check-in failed");

      setStatus({
        type: "success",
        msg: `Check-in done! Your position is #${data.position}. Estimated wait: ${data.etaMinutes} min.`,
      });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 680 }}>
      <h2>Store: {store.toUpperCase()}</h2>
      <p>Please enter today’s Day Code (ask the staff), then your details.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Day Code *
          <input
            name="dayCode"
            value={form.dayCode}
            onChange={onChange}
            required
            placeholder="e.g. 1234"
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            First name *
            <input name="firstName" value={form.firstName} onChange={onChange} required />
          </label>
          <label>
            Last name *
            <input name="lastName" value={form.lastName} onChange={onChange} required />
          </label>
        </div>

        <label>
          Company (optional)
          <input name="company" value={form.company} onChange={onChange} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Phone *
            <input name="phone" value={form.phone} onChange={onChange} required />
          </label>
          <label>
            Email *
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Service *
            <select name="service" value={form.service} onChange={onChange}>
              <option value="DTF">DTF</option>
              <option value="Press">Press</option>
              <option value="DTF+Press">DTF + Press</option>
            </select>
          </label>

          <label>
            Garment *
            <select name="garment" value={form.garment} onChange={onChange}>
              <option value="bring">Bring own</option>
              <option value="buy">Buy on site</option>
            </select>
          </label>
        </div>

        <button disabled={loading} type="submit">
          {loading ? "Submitting…" : "Check-in"}
        </button>
      </form>

      {status && (
        <p style={{ marginTop: 16, color: status.type === "error" ? "crimson" : "green" }}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
