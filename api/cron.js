// api/cron.js
// Vercel Cron 이 10분마다 호출하는 엔드포인트
// 실제 로직은 run-cycle.js 에서 처리

import runCycleHandler from "./run-cycle";

export default async function handler(req, res) {
  // 크론은 보통 GET으로 호출되지만, 혹시 몰라서 POST도 허용 가능
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  console.log("⏰ [CRON] HIVE3 AutoEngine 사이클 시작");

  // run-cycle.js 의 handler를 그대로 호출
  return runCycleHandler(req, res);
}
