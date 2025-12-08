import admin from "firebase-admin";
import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";

// ===== Firebase 초기화 (Base64 decoding) =====
if (!admin.apps.length) {
  try {
    console.log("🔥 FIREBASE_KEY Base64 디코딩 중...");
    const decoded = Buffer.from(process.env.FIREBASE_KEY, "base64").toString("utf8");

    const firebaseKey = JSON.parse(decoded);

    admin.initializeApp({
      credential: admin.credential.cert(firebaseKey),
    });

    console.log("✅ Firebase Admin 초기화 성공");
  } catch (e) {
    console.error("❌ Firebase 초기화 오류:", e);
  }
}

const db = admin.firestore();

// ===== RPC & Wallet =====
const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// ===== AutoSend Contract =====
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

export default async function handler(req, res) {
  try {
    console.log("=== Auto Engine 실행 ===");

    const snapshot = await db.collection("users").get();
    const now = Date.now();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (!data.next_active || now < data.next_active) continue;

      // ===== 금액 세팅 =====
      const gas = parseUnits("0.6", 18);
      const pool = parseUnits("90", 18);
      const fee = parseUnits("18", 18);

      console.log("▶ 실행 대상:", doc.id);

      // AutoSend Contract 실행
      const tx = await autoSend.autoSendTokens(TOKEN, gas, pool, fee);
      await tx.wait();

      console.log("🎉 완료:", tx.hash);

      // Firestore 업데이트
      await db.collection("users").doc(doc.id).update({
        last_action: now,
        next_active: now + TEST_INTERVAL,
        last_tx: tx.hash,
        updated_at: new Date().toISOString()
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("🔥 Auto Engine ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
