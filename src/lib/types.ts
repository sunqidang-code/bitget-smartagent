// ============ Bitget API Types ============

export interface Ticker {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  lastPr: string;
  high24h: string;
  low24h: string;
  change24h: string; // percentage as string
  ts: number;
  changeUtc: number;
  bidPr: string;
  askPr: string;
  usdtVolume?: string;
}

export interface Candle {
  ts: number; // timestamp ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Granularity = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W";

export interface AccountAsset {
  coin: string;
  available: string;
  frozen: string;
  total: string;
  usdtValue: string;
}

export interface Position {
  symbol: string;
  side: "long" | "short";
  size: string;
  margin: string;
  leverage: number;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  roe: string;
  liquidationPrice: string;
  marginMode: "crossed" | "isolated";
}

export interface OrderRecord {
  orderId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price?: string;
  size: string;
  status: "new" | "filled" | "cancelled" | "partially_filled";
  filledSize: string;
  createTime: number;
  reduceOnly?: boolean;
}

// ============ Agent Types ============

export type AgentStage =
  | "perception"
  | "analysis"
  | "decision"
  | "execution"
  | "risk";

export interface AgentStep {
  stage: AgentStage;
  title: string;
  content: string;
  status: "pending" | "running" | "done" | "error";
  sources?: string[];
  data?: Record<string, unknown>;
  startedAt?: number;
  finishedAt?: number;
}

export type Decision = "BUY" | "SELL" | "HOLD";

export interface AgentDecision {
  decision: Decision;
  symbol: string;
  confidence: number; // 0-100
  entryZone: { low: number; high: number };
  targetPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSizePct: number; // % of portfolio
  leverage: number;
  reasoning: string;
  timeframe: string;
  riskLevel: "low" | "medium" | "high";
}

export interface RiskAssessment {
  overallRisk: "low" | "medium" | "high";
  volatilityRisk: number; // 0-100
  liquidityRisk: number;
  concentrationRisk: number;
  maxDrawdownPct: number;
  recommendedPositionPct: number;
  warnings: string[];
  suggestions: string[];
}

export interface MarketSignal {
  source: "technical" | "onchain" | "sentiment" | "macro" | "news";
  name: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
  weight: number; // 0-1
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  createdAt: number;
  steps?: AgentStep[];
  decision?: AgentDecision;
  risk?: RiskAssessment;
  signals?: MarketSignal[];
  strategyTag?: string;
  status?: "thinking" | "done" | "error";
}

// ============ Strategy Types ============

export interface StrategyRecord {
  id: string;
  createdAt: number;
  userQuery: string;
  strategyTag: string;
  decision: AgentDecision;
  risk: RiskAssessment;
  signals: MarketSignal[];
  executed: boolean;
  executionResult?: {
    orderId?: string;
    status: "success" | "failed" | "simulated";
    message: string;
    executedAt: number;
  };
}

// ============ Settings Types ============

export interface BitgetSettings {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  playbookKey: string;
  mode: "simulation" | "live";
  defaultLeverage: number;
  maxPositionPct: number;
  riskTolerance: "conservative" | "balanced" | "aggressive";
}

export type Language = "zh" | "en";
export type ViewName = "chat" | "dashboard" | "history" | "settings";
export type ThemeMode = "dark" | "light";
