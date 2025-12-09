import { runAutoEngine } from "./auto-engine";

export default async function handler(req, res) {
  try {
    // Authorization Header 확인 (Vercel Cron 보호)
    const auth = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return res.status(500).json({ ok: false, error: "CRON_SECRET not set" });
    }

    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // ===== 자동 엔진 실행 =====
    const result = await runAutoEngine();

    return res.status(200).json({
      ok: true,
      message: "Cron 실행 완료",
      result,
    });

  } catch (e) {
    console.error("cron error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
