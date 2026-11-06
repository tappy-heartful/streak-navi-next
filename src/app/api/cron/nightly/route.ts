import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/src/lib/cron-auth";
import { runNightlyCronTasks } from "@/src/features/cron/services/cron-nightly-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/nightly (GAS定期実行Botの標準エントリーポイント: 夜間メンテナンス)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    let isForce = req.nextUrl.searchParams.get("force") === "true";
    try {
      const body = await req.json();
      if (body?.isForce !== undefined) {
        isForce = Boolean(body.isForce);
      }
    } catch {
      // JSONボディなしの場合はクエリパラメータを使用
    }

    const res = await runNightlyCronTasks(isForce);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API /api/cron/nightly] POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/cron/nightly (ブラウザ検証・手動テスト用)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const isForce = req.nextUrl.searchParams.get("force") === "true";
    const res = await runNightlyCronTasks(isForce);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API /api/cron/nightly] GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

