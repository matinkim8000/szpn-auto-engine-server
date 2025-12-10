import { NextResponse } from "next/server";
import { runAutoEngineCycle } from "./run-cycle";

export async function GET(req) {
  try {
    const result = await runAutoEngineCycle();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[cron.js ERROR]", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}

export const dynamic = "force-dynamic";

