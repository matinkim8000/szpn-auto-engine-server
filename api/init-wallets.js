// api/init-wallets.js
// 마틴 & 한상훈 지갑 10개를 Firestore /users/{address} 에 한 번에 등록

import admin from "firebase-admin";

// --- 1. Firebase Admin 초기화 ---------------------------------------------

if (!admin.apps.length) {
  const firebaseKeyBase64 = process.env.FIREBASE_KEY_BASE64;

  if (!firebaseKeyBase64) {
    throw new Error("FIREBASE_KEY_BASE64 환경변수가 설정되어 있지 않습니다.");
  }

  const firebaseKeyJson = JSON.parse(
    Buffer.from(firebaseKeyBase64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKeyJson),
  });
}

const db = admin.firestore();

// --- 2. 초기 등록할 지갑 목록 ---------------------------------------------
// 필요하면 여기 배열만 수정하시면 됩니다.

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

// --- 3. 기본 초기값 템플릿 --------------------------------------------------

function buildInitialDoc(nickname) {
  const now = 0; // 아직 아무 것도 안 했으니 0으로 시작

  return {
    nickname,
    last_gas_sent_time: now,
    last_pool_time: now,
    last_reward_time: now,
    next_gas_time: now,
    status: "IDLE", // IDLE: 대기 상태
  };
}

// --- 4. API 핸들러 ---------------------------------------------------------

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    // ?secret=XXXX 보호장치 (INIT_SECRET 가 설정되어 있을 때만 체크)
    const REQUIRED_SECRET = process.env.INIT_SECRET || null;
    if (REQUIRED_SECRET) {
      const secret = req.query.secret || req.body?.secret;
      if (secret !== REQUIRED_SECRET) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
    }

    const usersCol = db.collection("users");
    let created = 0;
    let updated = 0;

    const ops = INITIAL_WALLETS.map(async (w) => {
      const addr = w.address.trim();
      const docRef = usersCol.doc(addr);

      const snap = await docRef.get();
      const baseData = buildInitialDoc(w.nickname);

      if (!snap.exists) {
        await docRef.set(baseData);
        created += 1;
      } else {
        // 이미 있으면 기본 필드 누락만 채워준다.
        await docRef.set(
          {
            nickname: w.nickname,
            last_gas_sent_time:
              snap.get("last_gas_sent_time") ?? baseData.last_gas_sent_time,
            last_pool_time:
              snap.get("last_pool_time") ?? baseData.last_pool_time,
            last_reward_time:
              snap.get("last_reward_time") ?? baseData.last_reward_time,
            next_gas_time: snap.get("next_gas_time") ?? baseData.next_gas_time,
            status: snap.get("status") ?? baseData.status,
          },
          { merge: true }
        );
        updated += 1;
      }
    });

    await Promise.all(ops);

    return res.status(200).json({
      ok: true,
      message: "HIVE3 지갑 초기화 완료",
      created,
      updated,
      total: INITIAL_WALLETS.length,
    });
  } catch (err) {
    console.error("[init-wallets] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

