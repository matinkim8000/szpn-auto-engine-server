/**
 * api/run-cycle.js
 * HIVE3 자동엔진 메인 사이클
 * - Firestore users 컬렉션 읽기
 * - 조건 검사 후 자동 가스비 송금
 * - 상태 업데이트
 * - 텔레그램 알림
 */

import admin from "firebase-admin";
import { sendTelegram } from "./notify";
import { sendGasFee } from "./auto-engine";

// ------------------------ 1. Firebase Admin 초기화 ------------------------
if (!admin.apps.length) {
  const firebaseKeyBase64 = process.env.FIREBASE_KEY_BASE64;
  if (!firebaseKeyBase64) {
    throw new Error("FIREBASE_KEY_BASE64 환경변수가 없습니다.");
  }

  const firebaseKeyJson = JSON.parse(
    Buffer.from(firebaseKeyBase64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKeyJson),
  });
}

const db = admin.firestore();

// ------------------------ 2. 시간 계산 함수 ------------------------

function now() {
  return Date.now(); // ms
}

// HIVE3 규칙: 25시간 5분 = 901 * 100000 ms
const CYCLE_MS = (25 * 60 * 60 + 5 * 60) * 1000;

// 풀참여 + 보상 조합 값
const VALID_REWARD_COMBO = [90.6, 302, 1510, 3020];

// ------------------------ 3. 메인 자동 사이클 ------------------------

export async function runAutoEngineCycle() {
  const users = await db.collection("users").get();

  let results = [];

  const ops = users.docs.map(async (doc) => {
    const data = doc.data();
    const addr = doc.id;

    let {
      nickname,
      last_gas_sent_time,
      last_pool_time,
      last_reward_time,
      next_gas_time,
      status,
    } = data;

    // 1) STOP 상태면 알림만 보내고 스킵
    if (status === "STOP") {
      results.push({ addr, status: "STOP 상태라 패스" });
      return;
    }

    // 2) 보상합산 규칙 체크 (보상 미발생 시 STOP)
    const rewardCombo = last_pool_time > 0 && last_reward_time > 0
      ? Number((last_pool_time + last_reward_time).toFixed(3))
      : 0;

    if (!VALID_REWARD_COMBO.includes(rewardCombo)) {
      await sendTelegram(`❌ [HIVE3 STOP]
지갑: ${nickname}
사유: 보상합산 미감지
→ 자동엔진 중지됨`);

      await doc.ref.set(
        { status: "STOP" },
        { merge: true }
      );

      results.push({ addr, error: "보상합산 없음 → STOP" });
      return;
    }

    // 3) 시간 체크: 마지막 풀참여 기준 + 25시간 5분
    const mustSendGas = now() >= next_gas_time;

    if (!mustSendGas) {
      results.push({ addr, msg: "아직 가스비 송금 시간 아님" });
      return;
    }

    // 4) 자동 가스비 송금 실행
    try {
      const tx = await sendGasFee(addr);

      // Firestore 값 업데이트
      const newNext = now() + CYCLE_MS;

      await doc.ref.set(
        {
          last_gas_sent_time: now(),
          next_gas_time: newNext,
          status: "WAITING_POOL",
        },
        { merge: true }
      );

      // 알림
      await sendTelegram(`🟢 [HIVE3 자동 가스비 송금 완료]
지갑: ${nickname}
Hash: ${tx}
다음 실행시간: ${new Date(newNext).toLocaleString("ko-KR")}`);

      results.push({ addr, tx });
    } catch (err) {
      await sendTelegram(`⚠️ [HIVE3 자동엔진 오류]
지갑: ${nickname}
오류: ${err.message}`);

      results.push({ addr, error: err.message });
    }
  });

  await Promise.all(ops);

  return { ok: true, results };
}

export default async function handler(req, res) {
  try {
    const REQUIRED_SECRET = process.env.CRON_SECRET;
    const secret = req.query.secret;

    if (REQUIRED_SECRET && secret !== REQUIRED_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const result = await runAutoEngineCycle();
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

export const dynamic = "force-dynamic";

