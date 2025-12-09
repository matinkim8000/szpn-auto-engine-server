// /api/test-send.js
import { JsonRpcProvider, Wallet, parseUnits } from "ethers";

export default async function handler(req, res) {
  try {
    const { to, amount } = req.query;

    if (!to) return res.status(400).json({ ok: false, error: "Missing 'to' address" });

    // 송금량 기본값 = 0.00001 BNB
    const sendAmount = amount ? amount : "0.00001";

    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

    const tx = await wallet.sendTransaction({
      to,
      value: parseUnits(sendAmount, "ether")
    });

    await tx.wait();

    return res.json({
      ok: true,
      message: "Test transfer completed",
      hash: tx.hash,
      to,
      amount: sendAmount
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

