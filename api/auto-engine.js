import admin from "firebase-admin";
import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";

// ===============================
// 🔥 FIREBASE 초기화 (Base64 → JSON)
// ===============================
if (!admin.apps.length) {
  try {
    const firebaseKey = JSON.parse(
      Buffer.from(process.env.FIREBASE_KEY, "base64").toString("utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(firebaseKey),
    });

    console.log("🔥 Firebase initialized");
  } catch (e) {
    console.error("🔥 Firebase Init ERROR:", e);
    throw new Error("Firebase initialization failed: " + e.message);
  }
}

const db = admin.firestore();

// ===============================
// 🔥 RPC & Wallet
// ===============================
let provider;
try {
  provider = new JsonRpcProvider(process.env.RPC_URL);
  console.log("🔥 RPC 연결 성공");
} catch (e) {
  console.error("🔥 RPC ERROR:", e);
  throw new Error("RPC connection failed: " + e.message);
}

let wallet;
try {
  wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  console.log("🔥 Wallet 로드 성공:", wallet.address);
} catch (e) {
  console.error("🔥 WALLET LOAD ERROR:", e);
  throw new Error("Wallet loading failed: " + e.message);
}

// ===============================
// 🔥 AutoSend Contract
// ===============================
const autoSendAbi = [
  "function autoSendTokens(address token, uint256 gasAmount, uint256 poolAmount, uint256 feeAmount) external"
];

let autoSend;
try {
  autoSend = new Contract(
    process.env.AUTOSEND_ADDRESS,
    autoSendAbi,
    wallet
  );
  console.log("🔥 AutoSend Contract 연결 성공");
} catch (e) {
  console.error("🔥 CONTRACT LOAD ERROR:", e);
  throw new Error("Contract loading failed: " + e.message);
}

const TOKEN = process.env.TOKEN_ADDRESS;

// 테스트 인터벌 (1분)
const TEST_INTERVAL = 60 * 1000;

// ===============================
// 🔥 API Handler
// ===============================
export default async function handler(req, res) {
  try {
    console.log("=== 🚀 Auto-Engine 실행 시작 ===");

    const snapshot = await db.collection("users").get();
    const now = Date.now();

    if (snapshot.empty) {
      console.log("⚠️ users 컬렉션 비어있음");
      return res.status(200).json({ ok: true, msg: "no users" });
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (!data.next_active || now < data.next_active) {
        console.log(`⏳ Skip: ${doc.id}`);
        continue;
      }

      // ===== 금액 세팅 =====
      const gas = parseUnits("0.6", 18);
      const pool = parseUnits("90", 18);
      const fee = parseUnits("18", 18);

      console.log("▶ 실행 대상:", doc.id);

      // ===== 컨트랙트 실행 =====
      const tx = await autoSend.autoSendTokens(TOKEN, gas, pool, fee);
      await tx.wait();

      console.log("✅ 완료 TX:", tx.hash);

      // ===== Firestore 업데이트 =====
      await db.collection("users").doc(doc.id).update({
        last_action: now,
        next_active: now + TEST_INTERVAL,
        last_tx: tx.hash,
        updated_at: new Date().toISOString()
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("🔥 Auto-Engine ERROR:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
