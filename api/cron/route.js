import { NextResponse } from 'next/server';

export async function GET(req) {
  const url = new URL(req.url);

  const querySecret = url.searchParams.get('secret');         // ?secret=...
  const headerAuth = req.headers.get('authorization');        // Bearer xxx
  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
  const envSecret = process.env.CRON_SECRET;

  // 1) Vercel Cron  → Authorization: Bearer CRON_SECRET
  // 2) 수동테스트 → ?secret=CRON_SECRET
  if (headerAuth !== expectedHeader && querySecret !== envSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ==== 자동엔진 호출 ====
  try {
    const engineUrl = process.env.AUTO_ENGINE_URL;
    const res = await fetch(engineUrl);
    const data = await res.json().catch(() => null);

    return NextResponse.json({
      ok: true,
      source: headerAuth === expectedHeader ? 'cron' : 'manual',
      engine: data,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}
