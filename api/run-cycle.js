// api/run-cycle.js
// HIVE3 자동엔진 수동 실행 (테스트용)
// - Firestore users 컬렉션 읽기
// - 텔레그램으로 간단한 로그 전송
// - 현재 지갑 상태를 JSON 으로 반환

import admin from "firebase-admin";

// -------------------- 1. Firebase Admin 초기화 -------------------------

if (!admin.apps.length) {
  const firebaseKeyBase64 = process.env.FIREBASE_KEY_BASE64;

  if (!firebaseKeyBase64) {
    throw new Error("FIREBASE_KEY_BASE64 환경변수가 설정되어 있지 않습니다.");
  }

  const firebaseKeyJson = JSON.parse(
    Buffer.from(firebaseKeyBase64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKeyJson),
  });
}

const db = admin.firestore();

// -------------------- 2. 텔레그램 알림 도우미 -------------------------

async function sendTelegramToAdmin(text) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
      console.warn("[run-cycle] TELEGRAM env 미설정, 알림 스킵");
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (err) {
    console.error("[run-cycle] 텔레그램 전송 실패:", err);
  }
}

// -------------------- 3. 메인 핸들러 -------------------------

export default async function handler(req, res) {
  try {
    // (1) 메서드 제한
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    // (2) 비밀키 체크 (?secret=0000)
    const REQUIRED_SECRET = process.env.INIT_SECRET || null;
    if (REQUIRED_SECRET) {
      const secret = req.query.secret || req.body?.secret;
      if (secret !== REQUIRED_SECRET) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
    }

    const now = Date.now();

    // (3) Firestore users 전체 읽기
    const snap = await db.collection("users").get();

    const wallets = [];
    snap.forEach((doc) => {
      const data = doc.data() || {};
      wallets.push({
        address: doc.id,
        nickname: data.nickname || "",
        status: data.status || "IDLE",
        last_gas_sent_time: data.last_gas_sent_time || 0,
        last_pool_time: data.last_pool_time || 0,
        last_reward_time: data.last_reward_time || 0,
        next_gas_time: data.next_gas_time || 0,
      });
    });

    // (4) 텔레그램으로 간단히 보고
    await sendTelegramToAdmin(
      [
        "🚀 [HIVE3 run-cycle 수동 실행]",
        `지갑 수: ${wallets.length}`,
        `시간: ${new Date(now).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        })}`,
      ].join("\n")
    );

    // (5) 아직은 “실제 자동 송금”은 하지 않고, 구조/상태만 리턴
    return res.status(200).json({
      ok: true,
      message: "run-cycle 테스트 실행 완료 (아직 송금 로직은 미구현)",
      count: wallets.length,
      wallets,
    });
  } catch (err) {
    console.error("[run-cycle] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
