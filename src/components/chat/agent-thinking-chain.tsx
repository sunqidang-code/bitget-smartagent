"use client";

import { cn } from "@/lib/utils";
import type { AgentStep, AgentStage } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import {
  Eye,
  Brain,
  Target,
  Zap,
  Shield,
  Check,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGE_META: Record<
  AgentStage,
  { icon: typeof Eye; color: string; bg: string; labelKey: "stagePerception" | "stageAnalysis" | "stageDecision" | "stageExecution" | "stageRisk" }
> = {
  perception: {
    icon: Eye,
    color: "text-cyan-300",
    bg: "from-cyan-500/20 to-blue-500/10",
    labelKey: "stagePerception",
  },
  analysis: {
    icon: Brain,
    color: "text-violet-300",
    bg: "from-violet-500/20 to-purple-500/10",
    labelKey: "stageAnalysis",
  },
  decision: {
    icon: Target,
    color: "text-emerald-300",
    bg: "from-emerald-500/20 to-teal-500/10",
    labelKey: "stageDecision",
  },
  execution: {
    icon: Zap,
    color: "text-amber-300",
    bg: "from-amber-500/20 to-orange-500/10",
    labelKey: "stageExecution",
  },
  risk: {
    icon: Shield,
    color: "text-rose-300",
    bg: "from-rose-500/20 to-pink-500/10",
    labelKey: "stageRisk",
  },
};

export function AgentThinkingChain({ steps }: { steps: AgentStep[] }) {
  const { language } = useAppStore();

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const meta = STAGE_META[step.stage];
        const Icon = meta.icon;
        const isRunning = step.status === "running";
        const isDone = step.status === "done";

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className={cn(
              "rounded-xl border border-white/5 bg-gradient-to-br p-3",
              meta.bg
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/30",
                  meta.color
                )}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isDone ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4 opacity-40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", meta.color)}>
                    {t(language, meta.labelKey)}
                  </span>
                  <span className="text-xs font-medium text-foreground/80">
                    {step.title}
                  </span>
                  {isDone && (
                    <Check className={cn("h-3 w-3", meta.color)} />
                  )}
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isRunning && "animate-pulse text-foreground/40"
                )}
              />
            </div>
            <AnimatePresence>
              {step.content && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 pl-9 text-xs leading-relaxed text-foreground/70 whitespace-pre-wrap"
                >
                  {step.content}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
