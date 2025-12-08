export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    message: "Auto Engine 기본 구조 정상 작동",
  });
}

