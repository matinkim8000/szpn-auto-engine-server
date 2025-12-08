export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    message: "User Info 정상",
    time: new Date().toISOString()
  });
}
