// api/auto-engine.js
// 마틴 자동엔진: 가스비 송금 실행 모듈

import { JsonRpcProvider, Wallet, parseUnits } from "ethers";

// RPC Provider 초기화
const provider = new JsonRpcProvider(process.env.RPC_URL);

// 마틴 전용 지갑 (PRIVATE_KEY 사용)
const masterWallet = new Wallet(process.env.PRIVATE_KEY, provider);

// 기본 가스 설정
const GAS_LIMIT = 120000; // HIVE3 전송 충분

// 목적지 주소 (풀 지갑)
const POOL_ADDRESS = "0xb3cf454ba8bd35134c14f7b5426D6d70585D0903";

// --------------------------------------------------------------------
// ⭐ 자동 송금 함수
// amountSZPN = "0.06" 또는 "0.2" 또는 "1" 또는 "2"
// fromWalletPk = 사용할 지갑의 Private Key (마틴 전용 여러개 가능)
// --------------------------------------------------------------------

export async function sendGasSZPN(fromWalletPk, amountSZPN) {
  try {
    if (!fromWalletPk) {
      throw new Error("fromWalletPk(사용자 프라이빗키)가 전달되지 않았습니다.");
    }

    const wallet = new Wallet(fromWalletPk, provider);

    const amount = parseUnits(amountSZPN, 18);

    console.log(`🚀 [SEND] ${wallet.address} → ${POOL_ADDRESS} (${amountSZPN} SZPN)`);

    const tx = await wallet.sendTransaction({
      to: POOL_ADDRESS,
      value: amount,
      gasLimit: GAS_LIMIT,
    });

    const receipt = await tx.wait();

    console.log("✅ 송금 완료:", receipt.hash);

    return {
      ok: true,
      hash: receipt.hash,
      from: wallet.address,
      amount: amountSZPN,
    };
  } catch (err) {
    console.error("❌ [SEND ERROR]:", err);
    return { ok: false, error: err.message };
  }
}

export default sendGasSZPN;

