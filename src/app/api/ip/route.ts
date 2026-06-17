import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ip
 * Returns the caller's IP address (for Bitget IP whitelist setup).
 * Reads from standard forwarded headers.
 */
export async function GET(request: Request) {
  const headers = request.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown";

  return NextResponse.json({
    code: "00000",
    data: { ip },
    ts: Date.now(),
  });
}
