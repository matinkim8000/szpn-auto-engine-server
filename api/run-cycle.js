import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";
import admin from "firebase-admin";

// Firebase
if (!admin.apps.length) {
  const firebaseKey = JSON.parse(Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString());
  admin.initializeApp({ credential: admin.credential.cert(firebaseKey) });
}
const db = admin.firestore();

// Provider
const provider = new JsonRpcProvider(process.env.RPC_URL);

// 텔레그램 알림
async function sendTelegram(msg) {
  try {
    const url =
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage` +
      `?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=${encodeURIComponent(msg)}`;
    await fetch(url);
  } catch (e) {
    console.log("텔레그램 전송 실패:", e.message);
  }
}

// 메인 실행
export default async function handler(req, res) {
  const wallets = JSON.parse(process.env.USER_WALLETS);

  for (const w of wallets) {
    try {
      const privateKey = process.env[`PK_${w.address.replace("0x", "")}`];
      const wallet = new Wallet(privateKey, provider);

      const balance = await provider.getBalance(wallet.address);

      // 🔥 잔액 부족 체크 (BNB 0.001 미만이면 STOP 처리)
      if (balance < parseUnits("0.001", "ether")) {
        await sendTelegram(
          `[HIVE3 자동엔진 STOP]\n지갑: ${w.nick}\n사유: BNB 잔액 부족\n주소: ${wallet.address}`
        );
        console.log(`${w.nick} 잔액 부족 → STOP`);
        continue; // 다음 지갑으로 넘어가기
      }

      // ===== 실제 자동 엔진 로직 =====
      // (여기에 pool 참여 여부, 가스비 조건 체크 등 기존 로직이 들어감)
      console.log(`${w.nick} 정상 잔액 → 처리 진행`);

    } catch (err) {
      // 🔥 전역 오류도 텔레그램으로만 알려주고 서버는 계속 정상 동작
      await sendTelegram(
        `[HIVE3 자동엔진 ERROR]\n지갑: ${w.nick}\n오류: ${err.message}`
      );
      console.log(`${w.nick} 에러 발생 →`, err.message);
      continue;
    }
  }

  return res.json({
    ok: true,
    message: "자동엔진 모든 지갑 검사 완료 (오류 없이 종료됨)"
  });
}
