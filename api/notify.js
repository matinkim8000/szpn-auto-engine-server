// api/notify.js
// 텔레그램 알림 모듈

export async function sendTelegram(message) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("❌ TELEGRAM 환경변수 누락(BOT_TOKEN or CHAT_ID)");
    return false;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("❌ Telegram Error:", data);
      return false;
    }

    console.log("📨 Telegram Sent:", message);
    return true;
  } catch (err) {
    console.error("❌ Telegram Send Error:", err);
    return false;
  }
}

export default sendTelegram;

