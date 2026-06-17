import { NextResponse } from "next/server";
import { getSpotCandles, type CandleRaw } from "@/lib/bitget";
import type { Candle } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/candles?symbol=BTCUSDT&granularity=1H&limit=200
 * Returns spot candles from Bitget public API (oldest first).
 *
 * Maps raw Bitget candle arrays to the frontend Candle type.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    const granularity = searchParams.get("granularity") || "1H";
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);

    const rawCandles = await getSpotCandles(symbol, granularity, limit);

    // Map raw CandleRaw to frontend Candle type
    const candles: Candle[] = rawCandles.map((r: CandleRaw) => ({
      ts: r.ts,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));

    return NextResponse.json({
      code: "00000",
      data: candles,
      ts: Date.now(),
    });
  } catch (err) {
    console.error("[/api/market/candles] error:", err);
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
