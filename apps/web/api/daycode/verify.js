export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { store, code } = req.body || {};
  // Mock : codes du jour par magasin
  const validCodes = {
    nyc: "1111",
    "los-angeles": "2222",
    dallas: "3333",
  };

  const expected = validCodes[store];
  const valid = expected && code === expected;

  return res.status(200).json({ valid: !!valid });
}
