"use client";

import { useAppStore } from "@/stores/app-store";
import { useTradingStatsStore } from "@/stores/chat-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, Target, Activity } from "lucide-react";

export function AssetOverview() {
  const { language, settings } = useAppStore();
  const { balance, totalPnl, winRate, totalTrades, executedOrders } = useTradingStatsStore();

  const pnlPositive = totalPnl >= 0;
  const recentOrders = executedOrders.slice(0, 5);

  const stats = [
    {
      label: language === "zh" ? "账户余额" : "Balance",
      value: `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "text-cyan-300",
      bg: "from-cyan-500/15 to-blue-500/5",
    },
    {
      label: language === "zh" ? "总盈亏" : "Total PnL",
      value: `${pnlPositive ? "+" : ""}$${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: pnlPositive ? "text-emerald-300" : "text-rose-300",
      bg: pnlPositive ? "from-emerald-500/15 to-teal-500/5" : "from-rose-500/15 to-pink-500/5",
    },
    {
      label: language === "zh" ? "胜率" : "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      icon: Target,
      color: "text-violet-300",
      bg: "from-violet-500/15 to-purple-500/5",
    },
    {
      label: language === "zh" ? "总交易" : "Total Trades",
      value: String(totalTrades),
      icon: Activity,
      color: "text-amber-300",
      bg: "from-amber-500/15 to-orange-500/5",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">
          {language === "zh" ? "资产概览" : "Asset Overview"}
        </h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            settings.mode === "live"
              ? "bg-rose-500/15 text-rose-300"
              : "bg-amber-500/15 text-amber-300"
          )}
        >
          {settings.mode === "live" ? "LIVE MODE" : "SIMULATION"}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn("rounded-xl bg-gradient-to-br p-3", s.bg)}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </span>
                <Icon className={cn("h-3.5 w-3.5", s.color)} />
              </div>
              <div className={cn("mt-1 text-lg font-bold tabular-nums", s.color)}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {language === "zh" ? "最近订单" : "Recent Orders"}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recentOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg bg-black/20 px-2.5 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      o.side === "buy"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    )}
                  >
                    {o.side}
                  </span>
                  <span className="font-medium">{o.symbol}</span>
                  <span className="text-muted-foreground">{o.size}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    ${o.price.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase",
                      o.status === "simulated" ? "text-amber-300" : "text-emerald-300"
                    )}
                  >
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
