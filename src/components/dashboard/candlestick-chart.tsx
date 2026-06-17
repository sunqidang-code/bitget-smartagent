"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import { GRANULARITY_OPTIONS, SYMBOL_LABELS } from "@/lib/bitget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pause, Play } from "lucide-react";
import type { Candle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  defaultSymbol?: string;
}

export function CandlestickChart({ defaultSymbol = "BTCUSDT" }: Props) {
  const { language } = useAppStore();
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [granularity, setGranularity] = useState("1H");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/market/candles?symbol=${symbol}&granularity=${granularity}&limit=150`
      );
      const json = await res.json();
      if (json.code === "00000") {
        setCandles(json.data);
      }
    } catch (e) {
      console.error("fetch candles error", e);
    } finally {
      setLoading(false);
    }
  }, [symbol, granularity]);

  useEffect(() => {
    setLoading(true);
    fetchCandles();
  }, [fetchCandles]);

  // Auto refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchCandles, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchCandles]);

  const chartData = candles.map((c) => ({
    ts: c.ts,
    time: new Date(c.ts).toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    isUp: c.close >= c.open,
    // For range bar (high-low)
    range: [c.low, c.high],
    // For close line
    ma7: 0,
  }));

  // Compute MA7
  const closes = candles.map((c) => c.close);
  for (let i = 0; i < chartData.length; i++) {
    if (i >= 6) {
      const sum = closes.slice(i - 6, i + 1).reduce((a, b) => a + b, 0);
      chartData[i].ma7 = sum / 7;
    }
  }

  const lastPrice = candles[candles.length - 1]?.close ?? 0;
  const prevPrice = candles[candles.length - 2]?.close ?? lastPrice;
  const changePct = prevPrice ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0;
  const isUp = changePct >= 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-bold">
            {SYMBOL_LABELS[symbol]?.base || symbol}
            <span className="text-xs text-muted-foreground ml-1">
              /{SYMBOL_LABELS[symbol]?.quote || "USDT"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-lg font-bold tabular-nums", isUp ? "text-emerald-300" : "text-rose-300")}>
              ${lastPrice.toLocaleString(language === "zh" ? "zh-CN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={cn("text-xs font-semibold", isUp ? "text-emerald-300" : "text-rose-300")}>
              {isUp ? "+" : ""}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(SYMBOL_LABELS).map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {SYMBOL_LABELS[s].base}/{SYMBOL_LABELS[s].quote}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRANULARITY_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value} className="text-xs">
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? t(language, "commonAuto") : t(language, "commonRefresh")}
          >
            {autoRefresh ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchCandles}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[320px] sm:h-[400px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading…</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,14,26,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                formatter={(value: number | string, name: string) => {
                  if (name === "range") return [null, null];
                  if (name === "volume") return [Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }), "Vol"];
                  return [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                }}
              />
              {/* Volume bars */}
              <Bar dataKey="volume" opacity={0.3} yAxisId={0}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isUp ? "#10b981" : "#f43f5e"} />
                ))}
              </Bar>
              {/* High-Low range bar (candle body simulation) */}
              <Bar dataKey="range" barSize={3} radius={[1, 1, 1, 1]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isUp ? "#10b98180" : "#f43f5e80"} />
                ))}
              </Bar>
              {/* Close line */}
              <Line
                type="monotone"
                dataKey="close"
                stroke="#00f5a0"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              {/* MA7 */}
              <Line
                type="monotone"
                dataKey="ma7"
                stroke="#fbbf24"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
                opacity={0.7}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Close
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> MA7
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400/40" /> Vol Up
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-400/40" /> Vol Down
        </span>
        <span className="ml-auto">
          {autoRefresh ? "● Live · 5s" : "❚❚ Paused"}
        </span>
      </div>
    </div>
  );
}
