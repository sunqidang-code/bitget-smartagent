"use client";

import { cn } from "@/lib/utils";
import type { AgentDecision, RiskAssessment } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import { ArrowUpCircle, ArrowDownCircle, PauseCircle, ShieldAlert, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { useTradingStatsStore, useHistoryStore } from "@/stores/chat-store";
import { v4 as uuidv4 } from "uuid";

export function DecisionCard({
  decision,
  risk,
  symbol,
  strategyTag,
  userQuery,
}: {
  decision: AgentDecision;
  risk: RiskAssessment;
  symbol: string;
  strategyTag: string;
  userQuery: string;
}) {
  const { language, settings } = useAppStore();
  const recordOrder = useTradingStatsStore((s) => s.recordOrder);
  const addRecord = useHistoryStore((s) => s.addRecord);
  const [executing, setExecuting] = useState(false);

  const isBuy = decision.decision === "BUY";
  const isSell = decision.decision === "SELL";
  const isHold = decision.decision === "HOLD";

  const riskRewardRatio =
    decision.stopLoss > 0
      ? Math.abs(decision.takeProfit - decision.entryZone.low) /
        Math.abs(decision.entryZone.low - decision.stopLoss)
      : 0;

  const Icon = isBuy ? ArrowUpCircle : isSell ? ArrowDownCircle : PauseCircle;
  const color = isBuy
    ? "text-emerald-300"
    : isSell
    ? "text-rose-300"
    : "text-amber-300";
  const bg = isBuy
    ? "from-emerald-500/15 to-teal-500/5 border-emerald-500/20"
    : isSell
    ? "from-rose-500/15 to-pink-500/5 border-rose-500/20"
    : "from-amber-500/15 to-orange-500/5 border-amber-500/20";

  const handleExecute = async () => {
    if (isHold) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
          passphrase: settings.passphrase,
          symbol,
          side: isBuy ? "buy" : "sell",
          orderType: "limit",
          size: String(decision.positionSizePct),
          price: decision.entryZone.low.toFixed(2),
          leverage: decision.leverage,
          simulation: settings.mode === "simulation",
        }),
      });
      const json = await res.json();
      if (json.code === "00000") {
        recordOrder({
          id: json.data.orderId,
          symbol,
          side: isBuy ? "buy" : "sell",
          size: String(decision.positionSizePct),
          price: decision.entryZone.low,
          status: settings.mode === "simulation" ? "simulated" : "live",
          strategyTag,
        });
        addRecord({
          id: uuidv4(),
          createdAt: Date.now(),
          userQuery,
          strategyTag,
          decision,
          risk,
          signals: [],
          executed: true,
          executionResult: {
            orderId: json.data.orderId,
            status: settings.mode === "simulation" ? "simulated" : "success",
            message: json.data.message || "Order placed",
            executedAt: Date.now(),
          },
        });
        toast.success(
          settings.mode === "simulation"
            ? t(language, "toastOrderSimulated")
            : t(language, "toastOrderSuccess")
        );
      } else {
        toast.error(json.msg || t(language, "toastOrderFailed"));
      }
    } catch (e) {
      toast.error(t(language, "toastOrderFailed"));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", bg)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-7 w-7", color)} />
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xl font-bold", color)}>
                {decision.decision}
              </span>
              <Badge variant="outline" className="border-0 bg-white/5 text-[10px]">
                {symbol}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {decision.reasoning}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">
            {t(language, "decisionConfidence")}
          </div>
          <div className={cn("text-2xl font-bold tabular-nums", color)}>
            {decision.confidence}%
          </div>
        </div>
      </div>

      {/* Params grid */}
      {!isHold && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Param label={t(language, "decisionEntryZone")} value={`${decision.entryZone.low.toFixed(2)}-${decision.entryZone.high.toFixed(2)}`} />
          <Param label={t(language, "decisionStopLoss")} value={decision.stopLoss.toFixed(2)} valueClass="text-rose-300" />
          <Param label={t(language, "decisionTakeProfit")} value={decision.takeProfit.toFixed(2)} valueClass="text-emerald-300" />
          <Param label={t(language, "decisionPosition")} value={`${decision.positionSizePct}%`} />
          <Param label={t(language, "decisionLeverage")} value={`${decision.leverage}x`} />
          <Param label={t(language, "decisionTimeframe")} value={decision.timeframe} />
          <Param label={t(language, "decisionRiskReward")} value={`1:${riskRewardRatio.toFixed(1)}`} />
          <Param label={t(language, "decisionStrategy")} value={strategyTag} />
        </div>
      )}

      {/* Risk summary */}
      <div className="mt-3 rounded-lg bg-black/20 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-[11px] font-semibold text-amber-300">
            {t(language, "riskOverall")}: {risk.overallRisk.toUpperCase()}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Gauge className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {t(language, "riskMaxDrawdown")}: {risk.maxDrawdownPct}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <RiskPill label={t(language, "riskVolatility")} level={numToLevel(risk.volatilityRisk)} />
          <RiskPill label={t(language, "riskLiquidity")} level={numToLevel(risk.liquidityRisk)} />
          <RiskPill label={t(language, "riskConcentration")} level={numToLevel(risk.concentrationRisk)} />
        </div>
        {risk.warnings.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {risk.warnings.map((w, i) => (
              <li key={i} className="text-[10px] text-amber-300/80 flex gap-1">
                <span>⚠</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Execute button */}
      {!isHold && (
        <Button
          onClick={handleExecute}
          disabled={executing}
          className={cn(
            "mt-3 w-full font-semibold",
            isBuy
              ? "bg-emerald-500 hover:bg-emerald-600 text-black"
              : "bg-rose-500 hover:bg-rose-600 text-white"
          )}
        >
          {executing
            ? t(language, "commonExecuting")
            : settings.mode === "simulation"
            ? `${t(language, "commonExecute")} (${t(language, "commonSimulated")})`
            : `${t(language, "commonExecute")} (LIVE)`}
        </Button>
      )}
    </div>
  );
}

function Param({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-black/20 px-2 py-1.5">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-xs font-bold tabular-nums mt-0.5", valueClass)}>{value}</div>
    </div>
  );
}

function RiskPill({ label, level }: { label: string; level: "low" | "medium" | "high" }) {
  const color =
    level === "low"
      ? "text-emerald-300 bg-emerald-500/10"
      : level === "medium"
      ? "text-amber-300 bg-amber-500/10"
      : "text-rose-300 bg-rose-500/10";
  return (
    <div className={cn("rounded px-1.5 py-1 text-center", color)}>
      <div className="text-muted-foreground/70 text-[9px]">{label}</div>
      <div className="font-semibold uppercase">{level}</div>
    </div>
  );
}

function numToLevel(v: number): "low" | "medium" | "high" {
  if (v < 33) return "low";
  if (v < 66) return "medium";
  return "high";
}
