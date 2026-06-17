"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useChatStore } from "@/stores/chat-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  TrendingUp,
  Activity,
  Repeat,
  Gauge,
  Zap,
  LayoutGrid,
  Globe2,
  Bot,
  User,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentThinkingChain } from "./agent-thinking-chain";
import { SignalCard } from "./signal-card";
import { DecisionCard } from "./decision-card";
import type { ChatMessage } from "@/lib/types";

const EXAMPLES = [
  { key: "exMeme", icon: Sparkles, query: "帮我分析 PEPE 当前是否值得跟单买入，结合链上聪明钱动向和情绪指标", color: "from-pink-500/20 to-rose-500/10 text-pink-300" },
  { key: "exBreakout", icon: TrendingUp, query: "BTC 现在能买吗？分析趋势突破信号，给出建仓建议和止损止盈", color: "from-emerald-500/20 to-teal-500/10 text-emerald-300" },
  { key: "exMeanReversion", icon: Repeat, query: "ETH 是否处于超卖区间？用 RSI 和布林带做均值回归策略分析", color: "from-blue-500/20 to-cyan-500/10 text-blue-300" },
  { key: "exSentiment", icon: Activity, query: "当前市场情绪如何？恐惧贪婪指数极端值是否暗示反转机会", color: "from-violet-500/20 to-purple-500/10 text-violet-300" },
  { key: "exArbitrage", icon: Zap, query: "SOL 现货和合约价差套利机会分析，资金费率是否支持套利", color: "from-amber-500/20 to-orange-500/10 text-amber-300" },
  { key: "exTrend", icon: Gauge, query: "BNB 多周期均线共振分析，MACD 是否确认上升趋势", color: "from-cyan-500/20 to-blue-500/10 text-cyan-300" },
  { key: "exGrid", icon: LayoutGrid, query: "XRP 震荡区间识别，适合做网格交易吗？给出网格参数建议", color: "from-teal-500/20 to-emerald-500/10 text-teal-300" },
  { key: "exMacro", icon: Globe2, query: "结合宏观 CPI 数据和 FOMC 会议，BTC 接下来一周的方向判断", color: "from-indigo-500/20 to-blue-500/10 text-indigo-300" },
] as const;

export function ChatView() {
  const { language, settings } = useAppStore();
  const { messages, isProcessing, addMessage, updateMessage, setProcessing, clearMessages } = useChatStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText ?? input).trim();
    if (!query || isProcessing) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: query,
      createdAt: Date.now(),
    };
    const agentMsgId = uuidv4();
    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: "agent",
      content: "",
      createdAt: Date.now(),
      status: "thinking",
      steps: [],
      signals: [],
    };
    addMessage(userMsg);
    addMessage(agentMsg);
    setInput("");
    setProcessing(true);
    toast.info(t(language, "toastAgentStart"));

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          riskTolerance: settings.riskTolerance,
          defaultLeverage: settings.defaultLeverage,
          maxPositionPct: settings.maxPositionPct,
          playbookKey: settings.playbookKey,
        }),
      });
      const json = await res.json();
      if (json.code !== "00000") throw new Error(json.msg);

      const data = json.data;
      // Stream steps progressively
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 350));
        updateMessage(agentMsgId, {
          steps: data.steps.slice(0, i + 1),
        });
      }
      updateMessage(agentMsgId, {
        content: data.steps[data.steps.length - 1]?.content || "",
        steps: data.steps,
        signals: data.signals,
        decision: data.decision,
        risk: data.risk,
        strategyTag: data.strategyTag,
        status: "done",
      });
      toast.success(t(language, "toastAgentDone"));
    } catch (e) {
      updateMessage(agentMsgId, {
        content: e instanceof Error ? e.message : "Agent failed",
        status: "error",
      });
      toast.error(t(language, "toastAgentError"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <WelcomeScreen onPick={(q) => handleSend(q)} />
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-background/60 backdrop-blur-xl px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {messages.length > 0 && (
            <div className="mb-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearMessages();
                  toast.success(t(language, "toastCleared"));
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {language === "zh" ? "清空对话" : "Clear chat"}
              </Button>
            </div>
          )}
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-emerald-500/40 transition-colors">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t(language, "chatPlaceholder")}
              disabled={isProcessing}
              className="min-h-[52px] max-h-[160px] resize-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={2}
            />
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[10px] text-muted-foreground">
                Enter 发送 · Shift+Enter 换行
              </span>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isProcessing}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:opacity-90 font-semibold"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {t(language, "chatSend")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onPick }: { onPick: (q: string) => void }) {
  const { language } = useAppStore();
  return (
    <div className="flex flex-col items-center text-center pt-8 animate-float-up">
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-xl shadow-emerald-500/30">
          <Bot className="h-9 w-9 text-black" />
        </div>
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400 animate-pulse-glow" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
        {t(language, "chatWelcome")}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t(language, "chatWelcomeDesc")}
      </p>

      <div className="mt-8 w-full">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          {t(language, "chatExamples")}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {EXAMPLES.map((ex) => {
            const Icon = ex.icon;
            return (
              <button
                key={ex.key}
                onClick={() => onPick(ex.query)}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-white/5 bg-gradient-to-br p-3 text-left transition-all hover:scale-[1.02] hover:border-white/10",
                  ex.color
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t(language, ex.key as never)}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {ex.query}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3 animate-float-up", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-white/5"
            : "bg-gradient-to-br from-emerald-400 to-cyan-400"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-foreground/70" />
        ) : (
          <Bot className="h-4 w-4 text-black" />
        )}
      </div>
      <div className={cn("flex-1 min-w-0", isUser && "flex justify-end")}>
        <div
          className={cn(
            "inline-block max-w-full rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-emerald-500/15 text-foreground"
              : "bg-white/[0.03] border border-white/5"
          )}
        >
          {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
          {msg.status === "thinking" && !msg.content && (
            <span className="text-muted-foreground blink-cursor">
              Agent 思考中
            </span>
          )}
        </div>

        {/* Agent thinking chain */}
        {msg.steps && msg.steps.length > 0 && (
          <div className="mt-3 max-w-2xl">
            <AgentThinkingChain steps={msg.steps} />
          </div>
        )}

        {/* Signals */}
        {msg.signals && msg.signals.length > 0 && (
          <div className="mt-3 max-w-2xl">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              市场信号 ({msg.signals.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {msg.signals.map((s, i) => (
                <SignalCard key={i} signal={s} />
              ))}
            </div>
          </div>
        )}

        {/* Decision card */}
        {msg.decision && msg.risk && (
          <div className="mt-3 max-w-2xl">
            <DecisionCard
              decision={msg.decision}
              risk={msg.risk}
              symbol={msg.strategyTag ? "BTCUSDT" : "BTCUSDT"}
              strategyTag={msg.strategyTag || "trend-breakout"}
              userQuery={msg.content}
            />
          </div>
        )}
      </div>
    </div>
  );
}
