export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { store, firstName, lastName, phone, email, service, garment, dayCode } = req.body || {};

  // Vérifs basiques
  if (!store || !firstName || !lastName || !phone || !email || !service || !garment || !dayCode) {
    return res.status(400).json({ message: "Missing fields" });
  }

  // Mock: on "simule" une file d'attente et un ETA
  const position = Math.floor(Math.random() * 6) + 1; // 1..6
  const etaMinutes = position * 4;

  // Ici, plus tard: écriture DB (Neon) + audit trail

  return res.status(200).json({
    position,
    etaMinutes,
    nextStep: "Please wait for your turn. You will be called by the staff.",
  });
}
