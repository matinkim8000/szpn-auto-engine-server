// api/auto-martin.js
import { JsonRpcProvider, Wallet, Contract, parseUnits } from "ethers";

// ===== 기본 설정 =====

// BSC RPC
const provider = new JsonRpcProvider(process.env.RPC_URL);

// 하이브3 풀(컨트랙트) 주소 — 여기에 0.2 SZPN이 들어가야 함
const POOL_ADDRESS = "0xb3cf454ba8bd35134c14f7b5426D6d70585D0903";

// SZPN 토큰 컨트랙트 주소 (환경변수에서 가져옴)
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;

// ERC-20 기본 ABI
const erc20Abi = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// ===== 여러 지갑 프라이빗키 읽기 =====
function getPrivateKeysFromEnv() {
  const keys = [];

  // 필요하면 최대 50까지 늘릴 수 있음
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`PRIVATE_KEY_${i}`];
    if (key && key.trim() !== "") {
      keys.push({
        index: i,
        privateKey: key.trim(),
      });
    }
  }

  return keys;
}

export default async function handler(req, res) {
  try {
    const { action = "run", amount = "0.2" } = req.query || {};

    // 헬스체크용
    if (action === "ping") {
      return res.status(200).json({
        ok: true,
        message: "auto-martin API Running",
      });
    }

    if (!RPC_URL_OK() || !TOKEN_ADDRESS) {
      return res.status(500).json({
        ok: false,
        error: "RPC_URL 또는 TOKEN_ADDRESS 환경변수가 설정되지 않았습니다.",
      });
    }

    const walletConfigs = getPrivateKeysFromEnv();

    if (walletConfigs.length === 0) {
      return res.status(500).json({
        ok: false,
        error: "PRIVATE_KEY_1, PRIVATE_KEY_2 ... 환경변수를 찾지 못했습니다.",
      });
    }

    // 임시 지갑 하나로 decimals 확인
    const tempWallet = new Wallet(walletConfigs[0].privateKey, provider);
    const tempToken = new Contract(TOKEN_ADDRESS, erc20Abi, tempWallet);
    const decimals = await tempToken.decimals();

    const amountWei = parseUnits(amount, decimals);

    const results = [];

    for (const cfg of walletConfigs) {
      const wallet = new Wallet(cfg.privateKey, provider);
      const fromAddress = await wallet.getAddress();

      const token = new Contract(TOKEN_ADDRESS, erc20Abi, wallet);

      // 잔고 체크(선택사항이지만 안전하게)
      const balance = await token.balanceOf(fromAddress);
      if (balance < amountWei) {
        results.push({
          index: cfg.index,
          from: fromAddress,
          skipped: true,
          reason: "SZPN 잔고 부족",
        });
        continue;
      }

      // 실제 전송
      const tx = await token.transfer(POOL_ADDRESS, amountWei);
      const receipt = await tx.wait();

      results.push({
        index: cfg.index,
        from: fromAddress,
        to: POOL_ADDRESS,
        hash: tx.hash,
        status: receipt.status,
      });
    }

    return res.status(200).json({
      ok: true,
      to: POOL_ADDRESS,
      amount,
      wallets: results.length,
      results,
    });
  } catch (err) {
    console.error("auto-martin ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
}

// 단순한 RPC_URL 체크용 (선택)
function RPC_URL_OK() {
  return typeof process.env.RPC_URL === "string" && process.env.RPC_URL.startsWith("http");
}
