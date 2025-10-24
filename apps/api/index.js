import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: ["https://cre8-bot.vercel.app", "http://localhost:5173"] }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/api/v1/public/ping", (_req, res) => {
  res.json({ message: "pong from API", time: new Date().toISOString() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API running on port ${port}`));
