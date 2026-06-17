import { NextResponse } from "next/server";
import { runAgent, detectStrategyTag, extractSymbol } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/chat
 * Body: {
 *   query: string,
 *   symbol?: string,
 *   riskTolerance: "conservative" | "balanced" | "aggressive",
 *   defaultLeverage: number,
 *   maxPositionPct: number,
 *   playbookKey?: string,
 *   skillHubBaseUrl?: string
 * }
 *
 * Returns the full agent run output: steps, signals, decision, risk.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query: string = body.query?.trim();
    if (!query) {
      return NextResponse.json(
        { code: "400", msg: "query is required" },
        { status: 400 }
      );
    }

    const symbol = body.symbol || extractSymbol(query);
    const strategyTag = detectStrategyTag(query);

    const output = await runAgent({
      userQuery: query,
      symbol,
      skillHubConfig: {
        baseUrl: body.skillHubBaseUrl || process.env.SKILL_HUB_BASE_URL,
        playbookKey: body.playbookKey || process.env.PLAYBOOK_KEY,
        timeoutMs: 8000,
      },
      riskTolerance: body.riskTolerance || "balanced",
      defaultLeverage: body.defaultLeverage || 5,
      maxPositionPct: body.maxPositionPct || 20,
    });

    return NextResponse.json({
      code: "00000",
      data: {
        ...output,
        symbol,
        strategyTag,
        query,
      },
      ts: Date.now(),
    });
  } catch (err) {
    console.error("[agent/chat] error:", err);
    return NextResponse.json(
      {
        code: "500",
        msg: err instanceof Error ? err.message : "agent run failed",
      },
      { status: 500 }
    );
  }
}
