// api/init-wallets.js

import admin from "firebase-admin";

if (!admin.apps.length) {
  const firebaseKeyBase64 = process.env.FIREBASE_KEY_BASE64;
  if (!firebaseKeyBase64) throw new Error("FIREBASE_KEY_BASE64 미설정");

  const firebaseKeyJson = JSON.parse(
    Buffer.from(firebaseKeyBase64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKeyJson),
  });
}

const db = admin.firestore();

const INITIAL_WALLETS = [
  { address: "0x21ed393edb4D635aDeEe39c9441c9c682AB11570", nickname: "마틴H-1" },
  { address: "0xb84FB6e06043519d8cdB2177D423B7af7caCC0aB", nickname: "마틴H-2" },
  { address: "0x215553a8Af18357535d3ABfbA847BB75E48567B8", nickname: "마틴H-3" },
  { address: "0x076Ab751C74f88A07EDEf1B35b58eD4964051d80", nickname: "마틴H-4" },
  { address: "0x26B17cDE3b198a1c1Ad9A72d3fA73eF3a1729aD1", nickname: "마틴H-5" },
  { address: "0x08287A66C0B3BA634B998506A350Ce1bDce881c8", nickname: "마틴H-6" },

  { address: "0x07a7B4E6Df09c32D2F6F0fb8B31ac7507337E76b", nickname: "마틴H-MAIN" },

  { address: "0x1df288d073f3Db21Be8eCB7411AAf63174378721", nickname: "한상훈H-1" },
  { address: "0x99C7BcA2CE51eBf111CC3ba706E585F94C951666", nickname: "한상훈H-2" },
  { address: "0xFa2cD9f9b6d0DF26B0B77d05dd25e744Ed705e08", nickname: "한상훈H-3" },
];

function defaultDoc(nickname) {
  return {
    nickname,
    last_gas_sent_time: 0,
    last_pool_time: 0,
    last_reward_time: 0,
    next_gas_time: 0,
    status: "IDLE",
  };
}

export default async function handler(req, res) {
  try {
    if (!["GET", "POST"].includes(req.method))
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });

    const REQUIRED = process.env.INIT_SECRET;
    if (REQUIRED) {
      const s = req.query.secret || req.body?.secret;
      if (s !== REQUIRED)
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const users = db.collection("users");
    let created = 0,
      updated = 0;

    await Promise.all(
      INITIAL_WALLETS.map(async (w) => {
        const ref = users.doc(w.address);
        const snap = await ref.get();
        const base = defaultDoc(w.nickname);

        if (!snap.exists) {
          await ref.set(base);
          created++;
        } else {
          await ref.set({ nickname: w.nickname }, { merge: true });
          updated++;
        }
      })
    );

    return res.json({
      ok: true,
      message: "HIVE3 지갑 초기화 완료",
      created,
      updated,
      total: INITIAL_WALLETS.length,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
