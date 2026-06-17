import { NextResponse } from "next/server";
import { getSpotAccountAssets, getFuturesAccount, getFuturesPositions, type BitgetCredentials } from "@/lib/bitget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account
 * Body: { apiKey, apiSecret, passphrase, type: "spot" | "futures" }
 * Returns account assets / positions via signed Bitget private API.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const creds: BitgetCredentials = {
      apiKey: body.apiKey,
      apiSecret: body.apiSecret,
      passphrase: body.passphrase,
    };
    if (!creds.apiKey || !creds.apiSecret || !creds.passphrase) {
      return NextResponse.json(
        { code: "400", msg: "missing credentials" },
        { status: 400 }
      );
    }

    const type = body.type || "spot";
    let data: unknown;
    if (type === "futures") {
      const [account, positions] = await Promise.all([
        getFuturesAccount(creds),
        getFuturesPositions(creds),
      ]);
      data = { account, positions };
    } else {
      data = await getSpotAccountAssets(creds);
    }

    return NextResponse.json({ code: "00000", data, ts: Date.now() });
  } catch (err) {
    return NextResponse.json(
      {
        code: "500",
        msg: err instanceof Error ? err.message : "account fetch failed",
      },
      { status: 500 }
    );
  }
}
