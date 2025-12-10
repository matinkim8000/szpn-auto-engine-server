// api/userInfo.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  const keyJson = JSON.parse(
    Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
  );
  admin.initializeApp({ credential: admin.credential.cert(keyJson) });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const addr = req.query.address;
    if (!addr) return res.json({ ok: false, error: "Missing address" });

    const snap = await db.collection("users").doc(addr).get();
    if (!snap.exists) return res.json({ ok: false, error: "User not found" });

    return res.json({ ok: true, data: snap.data() });
  } catch (e) {
    return res.json({ ok: false, error: e.message });
  }
}

