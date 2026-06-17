"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Bot,
  LayoutDashboard,
  History,
  Settings,
  MessageSquare,
  Moon,
  Sun,
  Languages,
  Menu,
  X,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ViewName } from "@/lib/types";

const NAV_ITEMS: { view: ViewName; icon: typeof Bot; key: "navChat" | "navDashboard" | "navHistory" | "navSettings" }[] = [
  { view: "chat", icon: MessageSquare, key: "navChat" },
  { view: "dashboard", icon: LayoutDashboard, key: "navDashboard" },
  { view: "history", icon: History, key: "navHistory" },
  { view: "settings", icon: Settings, key: "navSettings" },
];

export function Header() {
  const { language, theme, currentView, setCurrentView, toggleLanguage, toggleTheme, settings, sidebarOpen, setSidebarOpen } =
    useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView("chat")}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-lg shadow-emerald-500/20">
              <Bot className="h-5 w-5 text-black" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-bold leading-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Bitget SmartAgent
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {t(language, "appTagline")}
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/5 bg-white/5 p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 shadow-inner"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(language, item.key)}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {/* Mode badge */}
          <Badge
            variant="outline"
            className={cn(
              "hidden sm:inline-flex border-0 text-[10px] font-semibold",
              settings.mode === "live"
                ? "bg-rose-500/15 text-rose-300"
                : "bg-amber-500/15 text-amber-300"
            )}
          >
            {settings.mode === "live" ? "LIVE" : "SIM"}
          </Badge>

          {/* Language toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-9 w-9 rounded-lg hover:bg-white/5"
            title="切换语言 / Switch language"
          >
            <Languages className="h-4 w-4" />
            <span className="ml-0.5 text-[10px] font-bold">
              {language === "zh" ? "中" : "EN"}
            </span>
          </Button>

          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg hover:bg-white/5"
              title={theme === "dark" ? "切换到浅色" : "Switch to dark"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden h-9 w-9 rounded-lg hover:bg-white/5"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col p-3 gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-300"
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(language, item.key)}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
