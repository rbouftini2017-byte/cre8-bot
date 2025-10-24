import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [pong, setPong] = React.useState(null);

  const ping = async () => {
    const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const res = await fetch(`${API}/public/ping`);
    setPong(await res.json());
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Cre8-BOT Frontend</h1>
      <p>Test de connexion avec l’API Render</p>
      <button onClick={ping}>Tester l’API</button>
      <pre style={{ background: "#f6f6f6", padding: 10 }}>
        {pong ? JSON.stringify(pong, null, 2) : "Clique sur le bouton ↑"}
      </pre>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
