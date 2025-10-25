import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import StoreCheckin from "./pages/StoreCheckin.jsx";

function Nav() {
  return (
    <nav style={{ padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/">Home</Link> | <Link to="/s/nyc">NYC</Link> |{" "}
      <Link to="/s/los-angeles">Los Angeles</Link> |{" "}
      <Link to="/s/dallas">Dallas</Link>
    </nav>
  );
}

function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:store" element={<StoreCheckin />} />
        {/* Fallback: n'importe quelle autre route revient à l'accueil */}
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
