// Base64 → JSON 디코딩
const firebaseKeyJson = JSON.parse(
  Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseKeyJson),
  });
}
