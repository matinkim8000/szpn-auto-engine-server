// api/auto-engine.js

import admin from "firebase-admin";
import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";

/**
 * ===== Firebase 초기화 =====
 * - Vercel 환경변수: FIREBASE_KEY_BASE64 에 base64 인코딩된 서비스 계정 JSON 저장
 *   (마틴이 방금 넣은 그 값)
 */
function initFirebase() {
  if (admin.apps.length) {
    // 이미 초기화 되어 있으면 그대로 사용
    return admin.app();
  }

  const base64 = process.env.FIREBASE_KEY_BASE64;
  if (!base64) {
    throw new Error("FIREBASE_KEY_BASE64 환경변수가 없습니다.");
  }

  let decodedJson;
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    decodedJson = JSON.parse(decoded);
  } catch (e) {
    console.error("🔥 FIREBASE_KEY_BASE64 디코딩/파싱 실패:", e);
    throw new Error("FIREBASE_KEY_BASE64 값을 디코딩/JSON 파싱할 수 없습니다.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(decodedJson),
  });

  console.log("✅ Firebase Admin 초기화 완료");
  return admin.app();
}

// Firebase & Firestore 객체
initFirebase();
const db = admin.firestore();

/**
 * ===== Ethers / RPC / Wallet =====
 */
function buildWalletAndContract() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const autoSendAddress = process.env.AUTOSEND_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS;

  if (!rpcUrl) throw new Error("RPC_URL 환경변수가 없습니다.");
  if (!privateKey) throw new Error("PRIVATE_KEY 환경변수가 없습니다.");
  if (!autoSendAddress) throw new Error("AUTOSEND_ADDRESS 환경변수가 없습니다.");
  if (!tokenAddress) throw new Error("TOKEN_ADDRESS 환경변수가 없습니다.");

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  const autoSendAbi = [
    "function autoSendTokens(address token, uint256 gasAmount, uint256 poolAmount, uint256 feeAmount) external",
  ];

  const autoSend = new Contract(autoSendAddress, autoSendAbi, wallet);

  return {
    provider,
    wallet,
    autoSend,
    tokenAddress,
  };
}

// 테스트용: 1분 간격 (실전은 25시간 5분 → 25 * 60 * 60 * 1000 + 5 * 60 * 1000)
const TEST_INTERVAL_MS = 60 * 1000;

/**
 * ===== 메인 핸들러 =====
 * - GET /api/auto-engine 으로 수동 호출
 * - 나중엔 Vercel Cron, Skywork 등에서 호출해도 됨
 */
export default async function handler(req, res) {
  const startTime = Date.now();
  console.log("▶ /api/auto-engine 호출됨, method:", req.method);

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let autoSend, tokenAddress;
  try {
    const env = buildWalletAndContract();
    autoSend = env.autoSend;
    tokenAddress = env.tokenAddress;
  } catch (envErr) {
    console.error("🔥 환경변수/Wallet 초기화 실패:", envErr);
    return res.status(500).json({ error: envErr.message });
  }

  try {
    const snapshot = await db.collection("users").get();
    const now = Date.now();

    if (snapshot.empty) {
      console.log("ℹ Firestore users 컬렉션이 비어 있습니다.");
      return res.status(200).json({
        ok: true,
        processed: 0,
        message: "users 컬렉션에 문서가 없습니다.",
      });
    }

    let processed = 0;
    const results = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userId = doc.id;

      const nextActive = data.next_active;
      if (!nextActive) {
        console.log(`⏭ [${userId}] next_active 없음 → 스킵`);
        continue;
      }

      if (now < nextActive) {
        console.log(
          `⏭ [${userId}] 아직 시간 안 됨 (now=${now}, next_active=${nextActive})`
        );
        continue;
      }

      // ===== 송금 금액 세팅 =====
      const gasAmount = parseUnits("0.6", 18);  // 0.6 SZPN
      const poolAmount = parseUnits("90", 18);  // 90 SZPN
      const feeAmount = parseUnits("18", 18);   // 18 SZPN

      console.log(`🚀 [${userId}] autoSendTokens 실행 대상`);

      try {
        const tx = await autoSend.autoSendTokens(
          tokenAddress,
          gasAmount,
          poolAmount,
          feeAmount
        );
        console.log(`⏳ [${userId}] 트랜잭션 전송: ${tx.hash}`);

        await tx.wait();
        console.log(`✅ [${userId}] 트랜잭션 컨펌 완료: ${tx.hash}`);

        const updateData = {
          last_action: now,
          next_active: now + TEST_INTERVAL_MS,
          last_tx: tx.hash,
          updated_at: new Date().toISOString(),
        };

        await db.collection("users").doc(userId).update(updateData);

        results.push({
          userId,
          txHash: tx.hash,
          next_active: updateData.next_active,
        });

        processed += 1;
      } catch (txErr) {
        console.error(`❌ [${userId}] autoSendTokens 실패:`, txErr);
        // 실패한 경우 Firestore에 에러로그 남길 수도 있음
        await db
          .collection("users")
          .doc(userId)
          .set(
            {
              last_error: String(txErr.message || txErr),
              last_error_at: new Date().toISOString(),
            },
            { merge: true }
          );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `🏁 /api/auto-engine 종료 – 처리지갑 수: ${processed}, 실행시간: ${duration}ms`
    );

    return res.status(200).json({
      ok: true,
      processed,
      duration_ms: duration,
      results,
    });
  } catch (err) {
    console.error("🔥 전체 처리 중 오류 발생:", err);
    return res.status(500).json({ error: err.message });
  }
}
