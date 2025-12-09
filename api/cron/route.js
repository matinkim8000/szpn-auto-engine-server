import handler from "../auto-engine";

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const fakeReq = { method: "GET" };
  const fakeRes = {
    json: (obj) =>
      new Response(JSON.stringify(obj), {
        headers: { "Content-Type": "application/json" },
      }),
  };

  return handler(fakeReq, fakeRes);
}

