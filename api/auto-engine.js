import admin from "firebase-admin";
import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";

// ======================
// ★ Firebase 초기화 영역
// ======================
if (!admin.apps.length) {
  if (!process.env.FIREBASE_KEY_BASE64) {
    throw new Error("FIREBASE_KEY_BASE64 is missing");
  }

  // Base64 → JSON 변환
  const firebaseKeyJson = JSON.parse(
    Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKeyJson),
  });
}

const db = admin.firestore();

// ======================
// ★ RPC & Wallet 설정
// ======================
const provider = new JsonRpcProvider(process.env.RPC_URL);

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is missing");
}
if (!process.env.AUTOSEND_ADDRESS) {
  throw new Error("AUTOSEND_ADDRESS is missing");
}
if (!process.env.TOKEN_ADDRESS) {
  throw new Error("TOKEN_ADDRESS is missing");
}

const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// ======================
// ★ AutoSend 컨트랙트 불러오기
// ======================
const autoSendAbi = [
  "function autoSendTokens(address token, uint256 gasAmount, uint256 poolAmount, uint256 feeAmount) external"
];

const autoSend = new Contract(
  process.env.AUTOSEND_ADDRESS,
  autoSendAbi,
  wallet
);

const TOKEN = process.env.TOKEN_ADDRESS;

// 테스트: 1분 간격
const TEST_INTERVAL = 60 * 1000;

// ======================
// ★ 메인 Handler
// ======================
export default async function handler(req, res) {
  try {
    console.log("=== Auto Engine 시작 ===");

    const snapshot = await db.collection("users").get();
    const now = Date.now();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // next_active 조건 체크
      if (!data.next_active || now < data.next_active) {
        continue;
      }

      console.log(`▶ 실행 대상 지갑: ${doc.id}`);

      // ======================
      // ★ 송금 세팅
      // ======================
      const gas = parseUnits("0.6", 18);   // 가스 소액
      const pool = parseUnits("90", 18);   // 풀 참여
      const fee = parseUnits("18", 18);    // 시스템 Fee

      // ======================
      // ★ 컨트랙트 실행
      // ======================
      const tx = await autoSend.autoSendTokens(TOKEN, gas, pool, fee);
      await tx.wait();

      console.log("완료 TX:", tx.hash);

      // ======================
      // ★ Firestore 업데이트
      // ======================
      await db.collection("users").doc(doc.id).update({
        last_action: now,
        next_active: now + TEST_INTERVAL,
        last_tx: tx.hash,
        updated_at: new Date().toISOString(),
      });

      console.log(`업데이트 완료: ${doc.id}`);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
