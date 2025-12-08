import { ethers } from "ethers";

export default async function handler(req, res) {
  try {
    const { wallet, level } = req.body;

    if (!wallet || !level) {
      return res.status(400).json({ error: "wallet, level missing" });
    }

    // -------------------------
    // 1. PRIVATE KEY 설정 (환경변수)
    // -------------------------
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: "Missing PRIVATE_KEY" });
    }

    // -------------------------
    // 2. BSC Provider
    // -------------------------
    const provider = new ethers.providers.JsonRpcProvider(
      "https://bsc-dataseed.binance.org/"
    );

    const walletSigner = new ethers.Wallet(PRIVATE_KEY, provider);

    // -------------------------
    // 3. SZPN Token Contract (BEP-20)
    // -------------------------
    const SZPN = "0xYourSZPNContract";  // 반드시 수정!
    const ABI = [
      "function transfer(address to, uint256 amount) public returns (bool)"
    ];

    const contract = new ethers.Contract(SZPN, ABI, walletSigner);

    // -------------------------
    // 4. level → 전송수량 처리
    // -------------------------
    const amountMap = {
      90: "90",
      300: "300",
      1500: "1500",
      3000: "3000"
    };

    const amount = amountMap[level];
    if (!amount) {
      return res.status(400).json({ error: "Invalid level" });
    }

    const sendAmount = ethers.utils.parseUnits(amount, 18);

    // -------------------------
    // 5. 전송 실행 (풀참여 주소로)
    // -------------------------
    const POOL_ADDRESS = "0xb3cf454ba8bd35134c14f7b5426d6d70585d0903";

    const tx = await contract.transfer(POOL_ADDRESS, sendAmount);

    // -------------------------
    // 6. 결과 반환
    // -------------------------
    return res.status(200).json({
      success: true,
      txHash: tx.hash
    });

  } catch (err) {
    console.error("AutoSend Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

