import { ethers } from "ethers";
import admin from "firebase-admin";

// -------------------------------------
// 1) Firebase Admin 초기화 (Base64 Key)
// -------------------------------------
if (!admin.apps.length) {
  const firebaseKey = JSON.parse(
    Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(firebaseKey),
  });
}

const db = admin.firestore();

// -------------------------------------
// 2) Web3 초기 설정
// -------------------------------------
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 토큰 인터페이스 (BEP20 / ERC20 호환)
const tokenAbi = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint amount)"
];

const token = new ethers.Contract(
  process.env.TOKEN_ADDRESS,
  tokenAbi,
  wallet
);

// -------------------------------------
// 3) 응답 헬퍼
// -------------------------------------
function resJSON(res, status, data) {
  return res.status(status).json(data);
}

// -------------------------------------
// 4) 오토엔진 테스트 송금 기능
// -------------------------------------
async function sendToken(to, amount) {
  try {
    const decimals = 18;
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.transfer(to, amountWei);
    await tx.wait();

    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (err) {
    console.error("SendToken Error:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

// -------------------------------------
// 5) API 라우트
// -------------------------------------
export default async function handler(req, res) {
  try {
    const { action } = req.query;

    // 기본 Ping 테스트
    if (action === "ping") {
      return resJSON(res, 200, { ok: true, message: "Auto Engine API Running" });
    }

    // 토큰 송금 테스트
    if (action === "send") {
      const { to, amount } = req.body;

      if (!to || !amount) {
        return resJSON(res, 400, { error: "Missing to / amount" });
      }

      const result = await sendToken(to, amount);

      return resJSON(res, 200, result);
    }

    // 잘못된 접근
    return resJSON(res, 400, { error: "Invalid action" });

  } catch (err) {
    console.error("API Error:", err);
    return resJSON(res, 500, { error: err.message });
  }
}
