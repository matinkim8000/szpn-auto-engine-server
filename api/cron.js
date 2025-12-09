// /api/cron.js
import { runAutoEngine } from './auto-engine';

export default async function handler(req, res) {
  try {
    // Check secret
    if (
      req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const result = await runAutoEngine();
    return res.status(200).json({ ok: true, result });

  } catch (err) {
    console.error("CRON ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
