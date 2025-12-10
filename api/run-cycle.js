// ------------------------ 보상합산 규칙 체크 ------------------------

const lp = Number(last_pool_time || 0);
const lr = Number(last_reward_time || 0);

let rewardCombo = 0;

// 두 값이 모두 존재해야만 보상합산 계산
if (lp > 0 && lr > 0) {
  rewardCombo = Number((lp + lr).toFixed(3));
}

// 보상합산이 유효하지 않으면 STOP
if (!VALID_REWARD_COMBO.includes(rewardCombo)) {
  await sendTelegram(`❌ [HIVE3 STOP]
지갑: ${nickname}
사유: 보상합산 미감지
→ 자동엔진 중지됨`);

  await doc.ref.set({ status: "STOP" }, { merge: true });

  results.push({ addr, error: "보상합산 없음 → STOP" });
  return;
}
