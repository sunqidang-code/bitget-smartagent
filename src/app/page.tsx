"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { Header } from "@/components/header";
import { ChatView } from "@/components/chat/chat-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { HistoryView } from "@/components/views/history-view";
import { SettingsView } from "@/components/views/settings-view";

export default function Home() {
  const { currentView, theme } = useAppStore();

  // Sync theme class to <html>
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background ambient gradients */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <Header />

      <main className="relative">
        {currentView === "chat" && <ChatView />}
        {currentView === "dashboard" && <DashboardView />}
        {currentView === "history" && <HistoryView />}
        {currentView === "settings" && <SettingsView />}
      </main>

      <footer className="border-t border-white/5 py-4 px-4 text-center">
        <p className="text-[10px] text-muted-foreground/60">
          Powered by Bitget Skill Hub · Built for Bitget AI Hackathon · For learning only, not financial advice
        </p>
      </footer>
    </div>
  );
}
