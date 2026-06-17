"use client";

import { cn } from "@/lib/utils";
import type { MarketSignal } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import { TrendingUp, TrendingDown, Minus, Activity, Newspaper, Globe, BarChart3, Link2 } from "lucide-react";

const SOURCE_ICON = {
  technical: BarChart3,
  onchain: Link2,
  sentiment: Activity,
  macro: Globe,
  news: Newspaper,
};

const SOURCE_LABEL_KEY = {
  technical: "sourceTechnical",
  onchain: "sourceOnchain",
  sentiment: "sourceSentiment",
  macro: "sourceMacro",
  news: "sourceNews",
} as const;

export function SignalCard({ signal }: { signal: MarketSignal }) {
  const { language } = useAppStore();
  const Icon = SOURCE_ICON[signal.source];
  const signalColor =
    signal.signal === "bullish"
      ? "text-emerald-300"
      : signal.signal === "bearish"
      ? "text-rose-300"
      : "text-muted-foreground";
  const SignalIcon =
    signal.signal === "bullish"
      ? TrendingUp
      : signal.signal === "bearish"
      ? TrendingDown
      : Minus;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-foreground/80 truncate">
            {signal.name}
          </span>
        </div>
        <div className={cn("flex items-center gap-0.5 shrink-0", signalColor)}>
          <SignalIcon className="h-3 w-3" />
          <span className="text-[10px] font-semibold">
            {t(language, SOURCE_LABEL_KEY[signal.source] as never)}
          </span>
        </div>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className={cn("text-sm font-bold tabular-nums", signalColor)}>
          {signal.value}
        </span>
        <span className="text-[10px] text-muted-foreground">
          权重 {(signal.weight * 100).toFixed(0)}%
        </span>
      </div>
      {signal.detail && (
        <p className="mt-1 text-[10px] text-muted-foreground/70 leading-tight line-clamp-2">
          {signal.detail}
        </p>
      )}
    </div>
  );
}
