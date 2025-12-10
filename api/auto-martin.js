// api/auto-martin.js

import admin from "firebase-admin";
import { ethers } from "ethers";

// Firebase Admin 초기화
if (!admin.apps.length) {
  const firebaseKeyJson = JSON.parse(Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString());
  admin.initializeApp({ credential: admin.credential.cert(firebaseKeyJson) });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const martinAddress = "0x07a7B4E6Df09c32D2F6F0fb8B31ac7507337E76b";
    const toPool = "0xb3cf454ba8bd35134c14f7b5426D6d70585D0903";

    const PRIVATE_KEY = process.env.PRIVATE_KEY_MARTIN_MAIN;
    const RPC = process.env.RPC_URL;

    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const tx = await wallet.sendTransaction({
      to: toPool,
      value: ethers.parseUnits("0.06", 18),
    });

    await db.collection("logs").add({
      wallet: martinAddress,
      type: "AUTO_GAS_SENT",
      tx_hash: tx.hash,
      timestamp: Date.now(),
    });

    return res.json({ ok: true, hash: tx.hash });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

