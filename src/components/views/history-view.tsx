"use client";

import { useAppStore } from "@/stores/app-store";
import { useHistoryStore, useChatStore } from "@/stores/chat-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RotateCcw, Trash2, History as HistoryIcon, ArrowUpCircle, ArrowDownCircle, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import type { StrategyRecord } from "@/lib/types";

export function HistoryView() {
  const { language, settings } = useAppStore();
  const { records, deleteRecord, clearAll } = useHistoryStore();
  const addMessage = useChatStore((s) => s.addMessage);

  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error(language === "zh" ? "没有可导出的记录" : "No records to export");
      return;
    }
    const headers = [
      "ID", "CreatedAt", "Query", "Strategy", "Symbol", "Decision",
      "Confidence", "EntryLow", "EntryHigh", "StopLoss", "TakeProfit",
      "PositionPct", "Leverage", "OverallRisk", "Executed", "Status",
    ];
    const rows = records.map((r) => [
      r.id,
      new Date(r.createdAt).toISOString(),
      `"${r.userQuery.replace(/"/g, '""')}"`,
      r.strategyTag,
      r.decision.symbol,
      r.decision.decision,
      r.decision.confidence,
      r.decision.entryZone.low,
      r.decision.entryZone.high,
      r.decision.stopLoss,
      r.decision.takeProfit,
      r.decision.positionSizePct,
      r.decision.leverage,
      r.risk.overallRisk,
      r.executed ? "yes" : "no",
      r.executionResult?.status || "pending",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitget-smartagent-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t(language, "toastExported"));
  };

  const handleRerun = (record: StrategyRecord) => {
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: record.userQuery,
      createdAt: Date.now(),
    });
    toast.success(language === "zh" ? "已发送到聊天，请稍候" : "Sent to chat, please wait");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-emerald-300" />
          <h2 className="text-lg font-bold">
            {language === "zh" ? "策略历史" : "Strategy History"}
          </h2>
          <Badge variant="secondary" className="text-[10px]">
            {records.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {language === "zh" ? "导出 CSV" : "Export CSV"}
          </Button>
          {records.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearAll();
                toast.success(t(language, "toastCleared"));
              }}
              className="gap-1.5 text-rose-300 hover:text-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {language === "zh" ? "清空" : "Clear"}
            </Button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
          <HistoryIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {language === "zh"
              ? "还没有策略记录，去聊天页面让 Agent 帮你做第一个决策吧"
              : "No strategy records yet. Head to Chat to get your first decision."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.slice().reverse().map((r) => {
            const isBuy = r.decision.decision === "BUY";
            const isSell = r.decision.decision === "SELL";
            const Icon = isBuy ? ArrowUpCircle : isSell ? ArrowDownCircle : PauseCircle;
            const color = isBuy ? "text-emerald-300" : isSell ? "text-rose-300" : "text-amber-300";
            return (
              <div
                key={r.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-bold", color)}>
                        {r.decision.decision}
                      </span>
                      <span className="text-xs font-medium">{r.decision.symbol}</span>
                      <Badge variant="outline" className="text-[9px] py-0">
                        {r.strategyTag}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")}
                      </span>
                      {r.executed && (
                        <Badge
                          className={cn(
                            "text-[9px] py-0",
                            r.executionResult?.status === "simulated"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-emerald-500/15 text-emerald-300"
                          )}
                        >
                          {r.executionResult?.status === "simulated" ? "SIM" : "LIVE"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {r.userQuery}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>置信度 <span className={cn("font-bold", color)}>{r.decision.confidence}%</span></span>
                      <span>仓位 {r.decision.positionSizePct}%</span>
                      <span>杠杆 {r.decision.leverage}x</span>
                      <span>风险 {r.risk.overallRisk}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRerun(r)}
                    className="gap-1 text-[11px] shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {language === "zh" ? "重跑" : "Rerun"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
