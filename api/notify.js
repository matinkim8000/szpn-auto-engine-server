import axios from "axios";

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_ADMIN_CHAT_ID;

// 기본 메시지 전송 함수
export async function sendTelegram(text) {
  if (!BOT || !ADMIN) return;

  const url = `https://api.telegram.org/bot${BOT}/sendMessage`;

  await axios.post(url, {
    chat_id: ADMIN,
    text,
    parse_mode: "HTML",
  });
}

// =============================
// 메시지 템플릿
// =============================

export function msgGasSent(wallet, amount) {
  return `🔥 <b>HIVE3 자동엔진</b>\n지갑: ${wallet}\n가스비 송금 완료\n송금량: ${amount} SZPN`;
}

export function msgAutoStop(wallet, reason) {
  return `🚫 <b>자동엔진 중단</b>\n지갑: ${wallet}\n사유: ${reason}`;
}

export function msgNoReward(wallet) {
  return `⚠️ 보상 미감지\n지갑: ${wallet}\n자동엔진이 일시 중단되었습니다.`;
}

export function msgNewCycle(wallet, nextTime) {
  return `🔄 새 사이클 시작\n지갑: ${wallet}\n다음 실행: ${nextTime}`;
}
