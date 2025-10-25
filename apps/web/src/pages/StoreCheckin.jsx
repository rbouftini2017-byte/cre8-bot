import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

export default function StoreCheckin() {
  const { store } = useParams();
  const navigate = useNavigate();
  const [dayCode, setDayCode] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("DTF");
  const [garment, setGarment] = useState("bring");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // 1) Vérification Day Code
    const v = await fetch(`${API}/daycode/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store, code: dayCode }),
    }).then(r => r.json()).catch(() => ({ valid: false }));

    if (!v.valid) {
      setLoading(false);
      setResult({ ok: false, msg: "Invalid Day Code" });
      return;
    }

    // 2) Check-in (mock)
    const r = await fetch(`${API}/customers/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store, firstName, lastName, phone, email, service, garment, dayCode
      })
    }).then(r => r.json()).catch(() => null);

    setLoading(false);

    if (!r) {
      setResult({ ok: false, msg: "Server error" });
      return;
    }

    setResult({
      ok: true,
      msg: `Check-in done! Your position is #${r.position}. Estimated wait: ${r.etaMinutes} min.`,
    });

    // Exemple de redirection plus tard :
    // navigate(`/queue/${store}/${encodeURIComponent(phone)}`);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Check-in — {store}</h2>

      <form onSubmit={handleSubmit} style={{ maxWidth: 480, display: "grid", gap: 8 }}>
        <label>Day Code</label>
        <input value={dayCode} onChange={e => setDayCode(e.target.value)} required />

        <label>First name</label>
        <input value={firstName} onChange={e => setFirst(e.target.value)} required />

        <label>Last name</label>
        <input value={lastName} onChange={e => setLast(e.target.value)} required />

        <label>Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

        <label>Service</label>
        <select value={service} onChange={e => setService(e.target.value)}>
          <option>DTF</option>
          <option>Press</option>
          <option>DTF+Press</option>
        </select>

        <label>Garment</label>
        <select value={garment} onChange={e => setGarment(e.target.value)}>
          <option value="bring">Bring own</option>
          <option value="buy">Buy on site</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Check-in"}
        </button>
      </form>

      {result && (
        <p style={{ marginTop: 12, color: result.ok ? "green" : "crimson" }}>
          {result.msg}
        </p>
      )}
    </div>
  );
}
