/**
 * LLM helper using z-ai-web-dev-sdk for personalized strategy interpretation.
 * Server-side only.
 */

import ZAI from "z-ai-web-dev-sdk";

export interface LLMInterpretInput {
  userQuery: string;
  symbol: string;
  strategyTag: string;
  signals: { name: string; value: string; signal: string; detail?: string }[];
  technicalSnapshot: {
    price: number;
    change24h: number;
    rsi14: number;
    trend: string;
    macdHist: number;
    volatility: number;
  };
  decision: { decision: string; confidence: number };
}

export interface LLMInterpretOutput {
  personalizedSummary: string;
  keyRisks: string[];
}

/**
 * Calls the LLM to produce a personalized, natural-language summary
 * of the agent's analysis based on the user's original query.
 * Falls back to a templated summary if the LLM call fails.
 */
export async function interpretStrategy(
  input: LLMInterpretInput
): Promise<LLMInterpretOutput> {
  try {
    const zai = await ZAI.create();
    const prompt = buildPrompt(input);

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Bitget SmartAgent, a professional crypto trading AI. " +
            "Given the user's strategy query and the agent's analysis data, " +
            "produce a concise personalized summary (2-3 sentences) explaining " +
            "WHY this strategy makes sense for the user's specific request, " +
            "and list 2-3 key risks. Respond in the same language as the user query. " +
            "Keep it under 150 words total. Be specific and actionable.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ||
      fallbackSummary(input);

    // Try to split into summary + risks
    const lines = text.split("\n").filter(Boolean);
    const summary = lines[0] || text;
    const risks = lines
      .slice(1)
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    return {
      personalizedSummary: summary,
      keyRisks: risks.length > 0 ? risks : fallbackRisks(input),
    };
  } catch (err) {
    console.warn("[LLM] interpretStrategy failed, using fallback:", err);
    return {
      personalizedSummary: fallbackSummary(input),
      keyRisks: fallbackRisks(input),
    };
  }
}

function buildPrompt(input: LLMInterpretInput): string {
  const signalLines = input.signals
    .map((s) => `- ${s.name}: ${s.value} (${s.signal})${s.detail ? " — " + s.detail : ""}`)
    .join("\n");
  return `用户策略: ${input.userQuery}
标的: ${input.symbol}
策略类型: ${input.strategyTag}

技术面快照:
- 价格: ${input.technicalSnapshot.price}
- 24h涨跌: ${input.technicalSnapshot.change24h}%
- RSI(14): ${input.technicalSnapshot.rsi14.toFixed(1)}
- 趋势: ${input.technicalSnapshot.trend}
- MACD柱: ${input.technicalSnapshot.macdHist.toFixed(4)}
- 波动率: ${input.technicalSnapshot.volatility.toFixed(2)}%

市场信号:
${signalLines}

Agent决策: ${input.decision.decision} (置信度 ${input.decision.confidence}%)

请用与用户查询相同的语言，给出个性化解读（2-3句话）和关键风险（2-3条）。`;
}

function fallbackSummary(input: LLMInterpretInput): string {
  const isZh = /[\u4e00-\u9fa5]/.test(input.userQuery);
  if (isZh) {
    return `基于您"${input.strategyTag}"的策略需求，综合 ${input.signals.length} 个市场信号分析，${input.symbol} 当前${input.technicalSnapshot.trend === "up" ? "处于上升趋势" : input.technicalSnapshot.trend === "down" ? "处于下降趋势" : "震荡整理"}，RSI ${input.technicalSnapshot.rsi14.toFixed(0)}，Agent 给出 ${input.decision.decision} 决策，置信度 ${input.decision.confidence}%。`;
  }
  return `Based on your "${input.strategyTag}" strategy, ${input.symbol} is currently ${input.technicalSnapshot.trend} with RSI ${input.technicalSnapshot.rsi14.toFixed(0)}. Agent decision: ${input.decision.decision} at ${input.decision.confidence}% confidence.`;
}

function fallbackRisks(input: LLMInterpretInput): string[] {
  const isZh = /[\u4e00-\u9fa5]/.test(input.userQuery);
  if (isZh) {
    return [
      `波动率 ${input.technicalSnapshot.volatility.toFixed(2)}%，注意止损`,
      "市场情绪可能快速反转",
      "仓位控制建议不超过总资金的 20%",
    ];
  }
  return [
    `Volatility at ${input.technicalSnapshot.volatility.toFixed(2)}%, set stop-loss`,
    "Market sentiment may reverse quickly",
    "Keep position under 20% of total capital",
  ];
}
