import { NextResponse } from 'next/server';

export async function GET() {
  // 1) 자동엔진 실행 URL 호출
  const engineUrl = process.env.AUTO_ENGINE_URL; https://szpn-auto-engine-server.vercel.app/api/auto-engine

  const r = await fetch(engineUrl).then(r => r.json()).catch(e => ({ ok:false, e:e.message }));

  return NextResponse.json({
    ok: true,
    autoEngine: r
  });
}
