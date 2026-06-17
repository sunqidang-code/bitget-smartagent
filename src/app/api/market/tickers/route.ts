import { NextResponse } from "next/server";
import { getSpotTickers, DEFAULT_SYMBOLS } from "@/lib/bitget";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/market/tickers?symbols=BTCUSDT,ETHUSDT
 * Returns real-time spot tickers from Bitget public API.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam.split(",").filter(Boolean)
      : DEFAULT_SYMBOLS;

    const tickers = await getSpotTickers(symbols);
    return NextResponse.json({
      code: "00000",
      data: tickers,
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
