import { NextResponse } from "next/server";
import { placeFuturesOrder, type BitgetCredentials, type PlaceOrderParams } from "@/lib/bitget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/order
 * Body: {
 *   apiKey, apiSecret, passphrase,
 *   symbol, side, orderType, size, price?, leverage?, reduceOnly?,
 *   simulation: boolean  // if true, do NOT call Bitget, just echo back
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const simulation: boolean = body.simulation !== false;

    // Simulation mode: return a fake order id without calling Bitget
    if (simulation) {
      const orderId = `SIM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      return NextResponse.json({
        code: "00000",
        data: {
          orderId,
          status: "simulated",
          message: "Simulated order recorded locally",
          symbol: body.symbol,
          side: body.side,
          size: body.size,
          price: body.price,
          createdAt: Date.now(),
        },
        ts: Date.now(),
      });
    }

    // Live mode: require full credentials
    const creds: BitgetCredentials = {
      apiKey: body.apiKey,
      apiSecret: body.apiSecret,
      passphrase: body.passphrase,
    };
    if (!creds.apiKey || !creds.apiSecret || !creds.passphrase) {
      return NextResponse.json(
        {
          code: "400",
          msg: "Live mode requires full Bitget API credentials. Configure them in Settings.",
        },
        { status: 400 }
      );
    }

    const params: PlaceOrderParams = {
      symbol: body.symbol,
      side: body.side,
      orderType: body.orderType || "limit",
      size: body.size,
      price: body.price,
      leverage: body.leverage,
      reduceOnly: body.reduceOnly,
      marginMode: body.marginMode || "crossed",
    };

    const data = await placeFuturesOrder(creds, params);
    return NextResponse.json({ code: "00000", data, ts: Date.now() });
  } catch (err) {
    return NextResponse.json(
      {
        code: "500",
        msg: err instanceof Error ? err.message : "order failed",
      },
      { status: 500 }
    );
  }
}
