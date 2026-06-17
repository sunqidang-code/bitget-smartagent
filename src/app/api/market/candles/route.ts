import { NextResponse } from "next/server";
import { getSpotCandles } from "@/lib/bitget";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/candles?symbol=BTCUSDT&granularity=1H&limit=200
 * Returns spot candles from Bitget public API (oldest first).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    const granularity = searchParams.get("granularity") || "1H";
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);

    const candles = await getSpotCandles(symbol, granularity, limit);
    return NextResponse.json({
      code: "00000",
      data: candles,
      ts: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        code: "500",
        msg: err instanceof Error ? err.message : "unknown error",
        data: [],
      },
      { status: 500 }
    );
  }
}
