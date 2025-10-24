export default function handler(req, res) {
  res.status(200).json({ message: "pong from API (Vercel)", time: new Date().toISOString() });
}
