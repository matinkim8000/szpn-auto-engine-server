import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  const body = req.body;

  try {
    // Moralis Stream → 모든 transaction 감지
    for (const log of body.txs) {
      const address = log.address.toLowerCase();

      await db.collection("users").doc(address).set({
        last_tx: log.hash,
        last_action: Date.now(),
        next_active: Date.now() + 60 * 1000, // 테스트 모드: 1분
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }

    return res.status(200).json({ saved: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

