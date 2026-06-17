"use client";

import { PriceGrid } from "./price-grid";
import { CandlestickChart } from "./candlestick-chart";
import { AssetOverview } from "./asset-overview";
import { AgentSignalsList } from "./agent-signals-list";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import { Activity } from "lucide-react";

export function DashboardView() {
  const { language } = useAppStore();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-4">
      {/* Section: Real-time prices */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold">
            {language === "zh" ? "实时行情" : "Real-time Prices"}
          </h2>
          <span className="text-[10px] text-muted-foreground">· 5s 刷新</span>
        </div>
        <PriceGrid />
      </section>

      {/* Section: Chart + Asset */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CandlestickChart defaultSymbol="BTCUSDT" />
        </div>
        <div>
          <AssetOverview />
        </div>
      </div>

      {/* Section: Agent signals */}
      <section>
        <AgentSignalsList />
      </section>
    </div>
  );
}
