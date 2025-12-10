// api/test-send.js

import { ethers } from "ethers";

export default async function handler(req, res) {
  try {
    const to = req.query.to;
    if (!to) return res.json({ ok: false, error: "Missing 'to' address" });

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_TEST, provider);

    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseUnits("0.00001", 18),
    });

    return res.json({
      ok: true,
      message: "테스트 송금 완료",
      hash: tx.hash,
      to,
      amount: "0.00001",
    });
  } catch (e) {
    return res.json({ ok: false, error: e.message });
  }
}

