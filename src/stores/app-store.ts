"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BitgetSettings,
  Language,
  ThemeMode,
  ViewName,
} from "@/lib/types";

interface AppState {
  language: Language;
  theme: ThemeMode;
  currentView: ViewName;
  settings: BitgetSettings;
  sidebarOpen: boolean;

  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCurrentView: (view: ViewName) => void;
  setSidebarOpen: (open: boolean) => void;
  updateSettings: (partial: Partial<BitgetSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: BitgetSettings = {
  apiKey: "",
  apiSecret: "",
  passphrase: "",
  playbookKey: "",
  mode: "simulation",
  defaultLeverage: 5,
  maxPositionPct: 20,
  riskTolerance: "balanced",
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: "zh",
      theme: "dark",
      currentView: "chat",
      settings: DEFAULT_SETTINGS,
      sidebarOpen: false,

      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () =>
        set({ language: get().language === "zh" ? "en" : "zh" }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setCurrentView: (view) => set({ currentView: view, sidebarOpen: false }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      updateSettings: (partial) =>
        set({ settings: { ...get().settings, ...partial } }),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "bitget-smartagent-app",
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        settings: state.settings,
      }),
    }
  )
);
