export async function GET(req) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok:false, error:"Unauthorized" }, { status:401 });
  }

  // ==== 자동엔진 실행 ====
  const r = await fetch(process.env.AUTO_ENGINE_URL).then(r => r.json()).catch(e => ({ ok:false, e:e.message }));

  return NextResponse.json({ ok:true, autoEngine:r });
}

import { NextResponse } from 'next/server';

export async function GET() {
  // 1) 자동엔진 실행 URL 호출
  const engineUrl = process.env.AUTO_ENGINE_URL; 

  const r = await fetch(engineUrl).then(r => r.json()).catch(e => ({ ok:false, e:e.message }));

  return NextResponse.json({
    ok: true,
    autoEngine: r
  });
}
