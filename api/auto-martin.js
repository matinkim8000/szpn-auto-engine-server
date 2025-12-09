// api/auto-martin.js
import admin from "firebase-admin";
import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";

// ==========================
//  Firebase 초기화
// ==========================
if (!admin.apps.length) {
  const firebaseKey = JSON.parse(
    Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKey),
  });
}

const db = admin.firestore();

// ==========================
//  RPC + Wallet 초기화
// ==========================
const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY_MARTIN, provider);

// ==========================
//  AutoSend Contract
// ==========================
const autoSendAbi = [
  "function autoSendTokens(address token, uint256 gasAmount, uint256 poolAmount, uint256 feeAmount) external"
];

const autoSend = new Contract(
  process.env.AUTOSEND_ADDRESS,
  autoSendAbi,
  wallet
);

// ==========================
//  설정값
// ==========================
const TOKEN = process.env.TOKEN_ADDRESS;
const POOL = process.env.POOL_ADDRESS;

// 테스트용: 1분 간격
const TEST_INTERVAL = 60 * 1000;

export default async function handler(req, res) {
  try {
    console.log("=== 마틴 자동엔진 실행 ===");

    // Firestore 사용자 정보 (마틴 전용 문서)
    const ref = db.collection("engine").doc("martin");
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};

    const now = Date.now();

    // next_active 이전이면 아무것도 하지 않음
    if (data.next_active && now < data.next_active) {
      return res.status(200).json({
        ok: false,
        msg: "아직 실행 시간이 아님",
        next_active: data.next_active
      });
    }

    // ===== 전송 파라미터 =====
    const gas = parseUnits("0.06", 18);
    const poolAmount = parseUnits("90", 18);
    const fee = parseUnits("18", 18);

    console.log("자동 전송 실행!");

    // 컨트랙트 실행
    const tx = await autoSend.autoSendTokens(TOKEN, gas, poolAmount, fee);
    await tx.wait();

    console.log("TX 완료:", tx.hash);

    // Firestore 업데이트
    await ref.set({
      last_action: now,
      next_active: now + TEST_INTERVAL,
      last_tx: tx.hash,
      updated_at: new Date().toISOString()
    }, { merge: true });

    return res.status(200).json({
      ok: true,
      tx: tx.hash
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
