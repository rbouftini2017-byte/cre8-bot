import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import StoreCheckin from "./pages/StoreCheckin.jsx";

const Home = () => (
  <div style={{ fontFamily: "sans-serif", padding: 24 }}>
    <h1>Cre8-BOT</h1>
    <p>Choisis un magasin pour commencer :</p>
    <ul>
      <li><Link to="/s/nyc">New York</Link></li>
      <li><Link to="/s/los-angeles">Los Angeles</Link></li>
      <li><Link to="/s/dallas">Dallas</Link></li>
    </ul>
  </div>
);

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/s/:store" element={<StoreCheckin />} />
    </Routes>
  </BrowserRouter>
);

createRoot(document.getElementById("root")).render(<App />);
