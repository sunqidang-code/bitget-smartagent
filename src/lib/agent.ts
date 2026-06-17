/**
 * Bitget SmartAgent core engine.
 *
 * Pipeline:  Perceive → Analyze → Decide → Execute → Risk
 *
 * The engine orchestrates multiple Bitget Skill Hub skills,
 * aggregates their signals, and produces a structured trade
 * decision with risk assessment. An LLM (z-ai-web-dev-sdk) is
 * used to translate the user's natural-language strategy into
 * a personalized interpretation and final reasoning.
 */

import {
  getSpotCandles,
  getSpotTickers,
  SYMBOL_LABELS,
} from "./bitget";
import { buildTechnicalSnapshot, type CandleNum } from "./indicators";
import {
  runMarketIntel,
  runNewsBriefing,
  runOnChainAnalysis,
  runSentimentAnalysis,
  runTechnicalAnalysis,
  type SkillHubConfig,
} from "./skill-hub";
import { interpretStrategy } from "./llm";
import type {
  AgentDecision,
  AgentStep,
  MarketSignal,
  RiskAssessment,
} from "./types";

export interface AgentRunInput {
  userQuery: string;
  symbol?: string; // e.g. BTCUSDT
  skillHubConfig: SkillHubConfig;
  riskTolerance: "conservative" | "balanced" | "aggressive";
  defaultLeverage: number;
  maxPositionPct: number;
}

export interface AgentRunOutput {
  steps: AgentStep[];
  signals: MarketSignal[];
  decision: AgentDecision;
  risk: RiskAssessment;
  skillSources: string[];
}

// ============ Symbol extraction ============

const SYMBOL_KEYWORDS: Record<string, string> = {
  BTC: "BTCUSDT",
  BITCOIN: "BTCUSDT",
  比特币: "BTCUSDT",
  ETH: "ETHUSDT",
  ETHEREUM: "ETHUSDT",
  以太坊: "ETHUSDT",
  以太: "ETHUSDT",
  SOL: "SOLUSDT",
  SOLANA: "SOLUSDT",
  索拉纳: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
  瑞波: "XRPUSDT",
  DOGE: "DOGEUSDT",
  狗狗币: "DOGEUSDT",
  PEPE: "PEPEUSDT",
  WIF: "WIFUSDT",
};

export function extractSymbol(query: string): string {
  const upper = query.toUpperCase();
  for (const [kw, sym] of Object.entries(SYMBOL_KEYWORDS)) {
    if (upper.includes(kw)) return sym;
  }
  // default to BTC
  return "BTCUSDT";
}

// ============ Strategy tag detection ============

export function detectStrategyTag(query: string): string {
  const q = query.toLowerCase();
  if (/meme|跟单|聪明钱|pepe|wif|doge/.test(q)) return "meme-tracking";
  if (/突破|breakout|阻力|压力位/.test(q)) return "breakout";
  if (/均值|回归|reversion|超买|超卖|rsi/.test(q)) return "mean-reversion";
  if (/情绪|sentiment|恐惧|贪婪|fear|greed/.test(q)) return "sentiment-reversal";
  if (/套利|arbitrage|资金费率|funding|价差/.test(q)) return "arbitrage";
  if (/趋势|trend|均线|macd/.test(q)) return "trend-following";
  if (/网格|grid|震荡/.test(q)) return "grid";
  if (/宏观|macro|cpi|fomc|加息|降息/.test(q)) return "macro";
  return "custom";
}

// ============ Signal aggregation ============

function aggregateSignals(signalGroups: MarketSignal[][]): MarketSignal[] {
  return signalGroups.flat();
}

function computeBullishScore(signals: MarketSignal[]): number {
  // weighted score in [-1, 1]
  let sum = 0;
  let weight = 0;
  for (const s of signals) {
    const v = s.signal === "bullish" ? 1 : s.signal === "bearish" ? -1 : 0;
    sum += v * s.weight;
    weight += s.weight;
  }
  return weight === 0 ? 0 : sum / weight;
}

// ============ Decision generation ============

function buildDecision(
  symbol: string,
  price: number,
  signals: MarketSignal[],
  snapshot: ReturnType<typeof buildTechnicalSnapshot>,
  input: AgentRunInput,
  atr14: number
): AgentDecision {
  const score = computeBullishScore(signals); // -1..1
  const confidence = Math.round(50 + score * 45); // 5..95
  let decision: AgentDecision["decision"] = "HOLD";
  if (score > 0.15) decision = "BUY";
  else if (score < -0.15) decision = "SELL";

  // Entry zone: within 0.5 ATR of current price
  const entryLow = price - atr14 * 0.5;
  const entryHigh = price + atr14 * 0.5;

  // Target / SL / TP based on decision and ATR
  const riskMult =
    input.riskTolerance === "conservative" ? 1 : input.riskTolerance === "aggressive" ? 2.5 : 1.7;
  const targetMult = 2.5;
  let targetPrice: number;
  let stopLoss: number;
  let takeProfit: number;
  if (decision === "BUY") {
    targetPrice = price + atr14 * targetMult * riskMult;
    stopLoss = price - atr14 * 1.2;
    takeProfit = price + atr14 * targetMult * riskMult;
  } else if (decision === "SELL") {
    targetPrice = price - atr14 * targetMult * riskMult;
    stopLoss = price + atr14 * 1.2;
    takeProfit = price - atr14 * targetMult * riskMult;
  } else {
    targetPrice = price;
    stopLoss = price - atr14;
    takeProfit = price + atr14;
  }

  // Position size: scale by confidence and risk tolerance
  const basePct =
    decision === "HOLD"
      ? 0
      : Math.min(
          input.maxPositionPct,
          Math.round((confidence / 100) * input.maxPositionPct * (riskMult / 1.7))
        );
  const positionSizePct = Math.max(0, basePct);

  const leverage =
    decision === "HOLD"
      ? 1
      : input.riskTolerance === "conservative"
      ? Math.min(3, input.defaultLeverage)
      : input.riskTolerance === "aggressive"
      ? Math.min(20, input.defaultLeverage * 1.5)
      : input.defaultLeverage;

  const riskLevel: AgentDecision["riskLevel"] =
    snapshot.volatility > 0.05 || leverage > 10
      ? "high"
      : snapshot.volatility > 0.03 || leverage > 5
      ? "medium"
      : "low";

  const reasoning = buildReasoningText(decision, symbol, price, signals, snapshot, score);

  return {
    decision,
    symbol,
    confidence,
    entryZone: { low: entryLow, high: entryHigh },
    targetPrice,
    stopLoss,
    takeProfit,
    positionSizePct,
    leverage,
    reasoning,
    timeframe: "4H",
    riskLevel,
  };
}

function buildReasoningText(
  decision: AgentDecision["decision"],
  symbol: string,
  price: number,
  signals: MarketSignal[],
  snapshot: ReturnType<typeof buildTechnicalSnapshot>,
  score: number
): string {
  const label = SYMBOL_LABELS[symbol]?.base ?? symbol;
  const bullish = signals.filter((s) => s.signal === "bullish").length;
  const bearish = signals.filter((s) => s.signal === "bearish").length;
  const neutral = signals.filter((s) => s.signal === "neutral").length;
  const parts: string[] = [];
  parts.push(
    `综合 ${signals.length} 个市场信号（看涨 ${bullish} / 看跌 ${bearish} / 中性 ${neutral}），加权得分 ${score.toFixed(2)}。`
  );
  parts.push(
    `${label} 现价 ${price.toFixed(2)}，RSI(14) ${snapshot.rsi14.toFixed(1)}，趋势 ${snapshot.trend.toUpperCase()}，波动率 ${(snapshot.volatility * 100).toFixed(1)}%。`
  );
  if (decision === "BUY") {
    parts.push(
      `多头信号占优，建议在 ${snapshot.bollLower.toFixed(2)}-${snapshot.bollMid.toFixed(2)} 区间分批建仓，止损设于近期支撑下方，目标看 ${snapshot.bollUpper.toFixed(2)} 之上。`
    );
  } else if (decision === "SELL") {
    parts.push(
      `空头信号占优，建议在 ${snapshot.bollMid.toFixed(2)}-${snapshot.bollUpper.toFixed(2)} 区间分批做空，止损设于阻力上方，目标看 ${snapshot.bollLower.toFixed(2)} 附近。`
    );
  } else {
    parts.push(
      `多空信号较为均衡，建议观望或轻仓区间操作，等待方向明确后再进场。`
    );
  }
  return parts.join(" ");
}

// ============ Risk assessment ============

function buildRiskAssessment(
  decision: AgentDecision,
  snapshot: ReturnType<typeof buildTechnicalSnapshot>,
  input: AgentRunInput
): RiskAssessment {
  const volatilityRisk = Math.min(100, Math.round(snapshot.volatility * 1000));
  const liquidityRisk = Math.min(
    100,
    Math.round(100 - Math.log10(snapshot.volume24h + 1) * 15)
  );
  const concentrationRisk = Math.min(
    100,
    Math.round(decision.positionSizePct * (input.riskTolerance === "aggressive" ? 2 : 1.2))
  );
  const maxDrawdownPct = Math.round(
    (snapshot.atr14 / snapshot.price) * 100 * (decision.leverage || 1) * 1.5
  );
  const overallScore = (volatilityRisk + liquidityRisk + concentrationRisk) / 3;
  const overallRisk: RiskAssessment["overallRisk"] =
    overallScore > 60 ? "high" : overallScore > 35 ? "medium" : "low";

  const warnings: string[] = [];
  const suggestions: string[] = [];
  if (volatilityRisk > 60) {
    warnings.push("当前波动率较高，单笔风险敞口建议不超过 5%");
    suggestions.push("降低杠杆至 3x 以内，或采用分批建仓策略");
  }
  if (decision.leverage > 10) {
    warnings.push(`杠杆 ${decision.leverage}x 偏高，强平风险显著`);
    suggestions.push("建议将杠杆降至 5x 以内，或设置更紧的止损");
  }
  if (maxDrawdownPct > 20) {
    warnings.push(`预估最大回撤 ${maxDrawdownPct}%，超出常规风险预算`);
    suggestions.push("减小仓位或增加对冲头寸");
  }
  if (snapshot.rsi14 > 70 || snapshot.rsi14 < 30) {
    warnings.push(`RSI 处于 ${snapshot.rsi14.toFixed(0)} 极端区域，反转风险上升`);
    suggestions.push("等待 RSI 回归中性区间后再确认进场");
  }
  if (warnings.length === 0) {
    suggestions.push("当前风险可控，可按计划执行");
  }
  const recommendedPositionPct = Math.max(
    1,
    Math.min(input.maxPositionPct, Math.round(100 - overallScore))
  );

  return {
    overallRisk,
    volatilityRisk,
    liquidityRisk,
    concentrationRisk,
    maxDrawdownPct,
    recommendedPositionPct,
    warnings,
    suggestions,
  };
}

// ============ Main run ============

export async function runAgent(input: AgentRunInput): Promise<AgentRunOutput> {
  const symbol = input.symbol || extractSymbol(input.userQuery);
  const strategyTag = detectStrategyTag(input.userQuery);
  const steps: AgentStep[] = [];
  const skillSources: string[] = [];

  // ---------- Stage 1: Perception ----------
  const perceptionStep: AgentStep = {
    stage: "perception",
    title: "市场数据采集",
    content: "",
    status: "running",
    startedAt: Date.now(),
  };
  steps.push(perceptionStep);

  let candles: CandleNum[] = [];
  let snapshot: ReturnType<typeof buildTechnicalSnapshot>;
  let change24h = 0;
  try {
    const [tickerData, candleRaw] = await Promise.all([
      getSpotTickers([symbol]),
      getSpotCandles(symbol, "1H", 300),
    ]);
    const ticker = tickerData[0];
    change24h = ticker ? parseFloat(ticker.change24h) : 0;
    candles = candleRaw.map((c) => ({
      ts: parseInt(c.ts, 10),
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
      volume: parseFloat(c.vol),
    }));
    snapshot = buildTechnicalSnapshot(candles, change24h);
    perceptionStep.content = `已采集 ${symbol} 现货 ${candles.length} 根 1H K线，现价 ${snapshot.price.toFixed(2)}，24h 涨跌 ${change24h.toFixed(2)}%，波动率 ${(snapshot.volatility * 100).toFixed(1)}%。`;
    perceptionStep.data = {
      symbol,
      price: snapshot.price,
      change24h,
      rsi: snapshot.rsi14,
      trend: snapshot.trend,
      volume24h: snapshot.volume24h,
    };
    perceptionStep.status = "done";
    perceptionStep.finishedAt = Date.now();
  } catch (err) {
    perceptionStep.status = "error";
    perceptionStep.content = `数据采集失败: ${err instanceof Error ? err.message : "unknown"}`;
    perceptionStep.finishedAt = Date.now();
    // Provide a minimal fallback snapshot so the pipeline can continue
    snapshot = {
      price: 0,
      change24h: 0,
      rsi14: 50,
      macdHist: 0,
      macdBullish: false,
      sma20: 0,
      sma50: 0,
      trend: "sideways",
      bollUpper: 0,
      bollLower: 0,
      bollMid: 0,
      atr14: 0,
      volatility: 0.02,
      volume24h: 0,
      nearSupport: false,
      nearResistance: false,
    };
  }

  // ---------- Stage 2: Analysis (Skill Hub) ----------
  const analysisStep: AgentStep = {
    stage: "analysis",
    title: "多维度综合分析",
    content: "",
    status: "running",
    startedAt: Date.now(),
  };
  steps.push(analysisStep);

  const cfg = input.skillHubConfig;
  const [techRes, sentRes, intelRes, newsRes, onchainRes] = await Promise.all([
    runTechnicalAnalysis(symbol, snapshot, cfg),
    runSentimentAnalysis(symbol, cfg),
    runMarketIntel(symbol, snapshot, cfg),
    runNewsBriefing(symbol, cfg),
    runOnChainAnalysis(symbol, cfg),
  ]);

  const allSignals = aggregateSignals([
    techRes.data?.signals ?? [],
    sentRes.data?.signals ?? [],
    intelRes.data?.signals ?? [],
    newsRes.data?.signals ?? [],
    onchainRes.data?.signals ?? [],
  ]);

  const sourceList = [
    `${techRes.skill} (${techRes.source})`,
    `${sentRes.skill} (${sentRes.source})`,
    `${intelRes.skill} (${intelRes.source})`,
    `${newsRes.skill} (${newsRes.source})`,
    `${onchainRes.skill} (${onchainRes.source})`,
  ];
  skillSources.push(...sourceList);

  analysisStep.content = `调用 5 个 Skill Hub 模块：技术分析、情绪分析、市场情报、新闻快讯、链上数据。共聚合 ${allSignals.length} 个市场信号。`;
  analysisStep.sources = sourceList;
  analysisStep.data = {
    technical: techRes.data,
    sentiment: sentRes.data,
    marketIntel: intelRes.data,
    news: newsRes.data,
    onchain: onchainRes.data,
  };
  analysisStep.status = "done";
  analysisStep.finishedAt = Date.now();

  // ---------- Stage 3: Decision ----------
  const decisionStep: AgentStep = {
    stage: "decision",
    title: "交易决策生成",
    content: "",
    status: "running",
    startedAt: Date.now(),
  };
  steps.push(decisionStep);

  const decision = buildDecision(symbol, snapshot.price, allSignals, snapshot, input, snapshot.atr14);

  // LLM-powered personalized interpretation
  let llmSummary = "";
  let llmRisks: string[] = [];
  try {
    const llmResult = await interpretStrategy({
      userQuery: input.userQuery,
      symbol,
      strategyTag,
      signals: allSignals.map((s) => ({
        name: s.name,
        value: s.value,
        signal: s.signal,
        detail: s.detail,
      })),
      technicalSnapshot: {
        price: snapshot.price,
        change24h: snapshot.change24h,
        rsi14: snapshot.rsi14,
        trend: snapshot.trend,
        macdHist: snapshot.macdHist,
        volatility: snapshot.volatility,
      },
      decision: { decision: decision.decision, confidence: decision.confidence },
    });
    llmSummary = llmResult.personalizedSummary;
    llmRisks = llmResult.keyRisks;
    if (llmSummary) {
      decision.reasoning = `${llmSummary}\n\n${decision.reasoning}`;
    }
  } catch (e) {
    // LLM failure is non-fatal; keep the rule-based reasoning
    console.warn("[agent] LLM interpretation failed, using fallback:", e);
  }

  decisionStep.content = `决策: ${decision.decision} | 置信度 ${decision.confidence}% | 入场 ${decision.entryZone.low.toFixed(2)}-${decision.entryZone.high.toFixed(2)} | 止损 ${decision.stopLoss.toFixed(2)} | 止盈 ${decision.takeProfit.toFixed(2)} | 仓位 ${decision.positionSizePct}% | 杠杆 ${decision.leverage}x`;
  decisionStep.data = { decision, llmSummary };
  decisionStep.status = "done";
  decisionStep.finishedAt = Date.now();

  // ---------- Stage 4: Execution ----------
  const executionStep: AgentStep = {
    stage: "execution",
    title: "执行建议",
    content: "",
    status: "running",
    startedAt: Date.now(),
  };
  steps.push(executionStep);
  const side = decision.decision === "BUY" ? "buy" : decision.decision === "SELL" ? "sell" : "wait";
  executionStep.content =
    decision.decision === "HOLD"
      ? "建议观望，暂不执行下单。可设置价格提醒，待信号确认后再行动。"
      : `建议以 ${side.toUpperCase()} 方向在 ${decision.entryZone.low.toFixed(2)}-${decision.entryZone.high.toFixed(2)} 区间挂限价单，仓位 ${decision.positionSizePct}%，杠杆 ${decision.leverage}x，止损 ${decision.stopLoss.toFixed(2)}，止盈 ${decision.takeProfit.toFixed(2)}。`;
  executionStep.data = { side, ...decision };
  executionStep.status = "done";
  executionStep.finishedAt = Date.now();

  // ---------- Stage 5: Risk ----------
  const riskStep: AgentStep = {
    stage: "risk",
    title: "风险评估",
    content: "",
    status: "running",
    startedAt: Date.now(),
  };
  steps.push(riskStep);
  const risk = buildRiskAssessment(decision, snapshot, input);
  if (llmRisks.length > 0) {
    risk.warnings = [...llmRisks, ...risk.warnings];
  }
  riskStep.content = `综合风险: ${risk.overallRisk.toUpperCase()} | 波动 ${risk.volatilityRisk} | 流动性 ${risk.liquidityRisk} | 集中度 ${risk.concentrationRisk} | 预估最大回撤 ${risk.maxDrawdownPct}%`;
  riskStep.data = { risk };
  riskStep.status = "done";
  riskStep.finishedAt = Date.now();

  return {
    steps,
    signals: allSignals,
    decision,
    risk,
    skillSources,
  };
}
