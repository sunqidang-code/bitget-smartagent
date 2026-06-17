import { NextResponse } from "next/server";
import { getSpotTickers, DEFAULT_SYMBOLS, type PublicTickerRaw } from "@/lib/bitget";
import type { Ticker } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/tickers?symbols=BTCUSDT,ETHUSDT
 * Returns real-time spot tickers from Bitget public API.
 *
 * Maps raw Bitget ticker fields to the frontend Ticker type.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam.split(",").filter(Boolean)
      : DEFAULT_SYMBOLS;

    const rawTickers = await getSpotTickers(symbols);

    // Map raw Bitget ticker to frontend Ticker type
    const tickers: Ticker[] = rawTickers.map((r: PublicTickerRaw) => ({
      symbol: r.symbol,
      baseCoin: r.baseCoin,
      quoteCoin: r.quoteCoin,
      lastPr: r.lastPr,
      high24h: r.high24h,
      low24h: r.low24h,
      change24h: r.change24h,
      ts: Number(r.ts) || Date.now(),
      changeUtc: Number(r.changeUtc24h || r.change24h) || 0,
      bidPr: r.bidPr,
      askPr: r.askPr,
      usdtVolume: r.usdtVolume || r.quoteVolume,
    }));

    return NextResponse.json({
      code: "00000",
      data: tickers,
      ts: Date.now(),
    });
  } catch (err) {
    console.error("[/api/market/tickers] error:", err);
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
