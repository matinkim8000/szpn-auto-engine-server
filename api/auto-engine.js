import admin from "firebase-admin";
import { ethers } from "ethers";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY)),
  });
}
const db = admin.firestore();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// AutoSend Contract
const autoSendAbi = [
  "function autoSendTokens(address token, uint256 gasAmount, uint256 poolAmount, uint256 feeAmount) external"
];
const autoSend = new ethers.Contract(process.env.AUTOSEND_ADDRESS, autoSendAbi, wallet);

const TOKEN = process.env.TOKEN_ADDRESS;

// 테스트 용 1분 간격 (실전은 25h5m = 902999초)
const TEST_INTERVAL = 60 * 1000;

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection("users").get();

    const now = Date.now();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // next_active 시간이 지나야 실행
      if (!data.next_active || now < data.next_active) continue;

      // === 조건 체크 ===
      const gas = ethers.parseUnits("0.6", 18);
      const pool = ethers.parseUnits("90", 18);
      const fee = ethers.parseUnits("18", 18);

      console.log("▶ 실행 대상:", doc.id);

      // AutoSend 실행
      const tx = await autoSend.autoSendTokens(TOKEN, gas, pool, fee);
      await tx.wait();

      console.log("완료:", tx.hash);

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
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
