"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { DEFAULT_SYMBOLS, SYMBOL_LABELS } from "@/lib/bitget";
import type { Ticker } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

export function PriceGrid() {
  const { language } = useAppStore();
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/tickers?symbols=${DEFAULT_SYMBOLS.join(",")}`);
      const json = await res.json();
      if (json.code === "00000") {
        setTickers(json.data);
      }
    } catch (e) {
      console.error("fetch tickers error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const id = setInterval(fetchTickers, 5000);
    return () => clearInterval(id);
  }, [fetchTickers]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {DEFAULT_SYMBOLS.map((s) => (
          <div key={s} className="h-24 rounded-xl bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {tickers.map((tk) => {
        const meta = SYMBOL_LABELS[tk.symbol];
        const change = parseFloat(tk.change24h);
        const isUp = change >= 0;
        return (
          <div
            key={tk.symbol}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] hover:border-white/10 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">
                {meta?.base || tk.baseCoin}
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px] font-semibold",
                  isUp ? "text-emerald-300" : "text-rose-300"
                )}
              >
                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isUp ? "+" : ""}{change.toFixed(2)}%
              </span>
            </div>
            <div className="mt-1 text-base font-bold tabular-nums">
              ${parseFloat(tk.lastPr).toLocaleString(language === "zh" ? "zh-CN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              H {parseFloat(tk.high24h).toLocaleString(undefined, { maximumFractionDigits: 0 })} · L {parseFloat(tk.low24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
