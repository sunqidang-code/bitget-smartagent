"use client";

import { useAppStore } from "@/stores/app-store";
import { useChatStore } from "@/stores/chat-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Radio, ArrowUpCircle, ArrowDownCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AgentSignalsList() {
  const { language, setCurrentView } = useAppStore();
  const messages = useChatStore((s) => s.messages);
  const router = useRouter();

  // Get agent messages with decisions
  const agentMessages = messages.filter(
    (m) => m.role === "agent" && m.decision
  );

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-300 animate-pulse" />
          <h2 className="text-sm font-semibold">
            {language === "zh" ? "最新 Agent 信号" : "Latest Agent Signals"}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[11px] text-muted-foreground"
          onClick={() => setCurrentView("chat")}
        >
          {language === "zh" ? "去对话 →" : "Chat →"}
        </Button>
      </div>

      {agentMessages.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {language === "zh"
            ? "暂无信号，去聊天页面让 Agent 给出第一个决策吧"
            : "No signals yet. Head to Chat to get your first decision."}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {agentMessages.slice().reverse().map((m) => {
            const d = m.decision!;
            const isBuy = d.decision === "BUY";
            const isSell = d.decision === "SELL";
            const Icon = isBuy ? ArrowUpCircle : isSell ? ArrowDownCircle : PauseCircle;
            const color = isBuy ? "text-emerald-300" : isSell ? "text-rose-300" : "text-amber-300";
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2"
              >
                <Icon className={cn("h-5 w-5 shrink-0", color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", color)}>{d.decision}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {m.strategyTag}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {d.reasoning}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-sm font-bold tabular-nums", color)}>
                    {d.confidence}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
