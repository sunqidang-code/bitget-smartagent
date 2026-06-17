"use client";

import { create } from "zustand";
import type { ChatMessage, StrategyRecord } from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentMessageId: string | null;
  abortFlag: boolean;

  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void;
  setProcessing: (v: boolean) => void;
  setCurrentMessageId: (id: string | null) => void;
  requestAbort: () => void;
  resetAbort: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isProcessing: false,
  currentMessageId: null,
  abortFlag: false,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, partial) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),
  setProcessing: (v) => set({ isProcessing: v }),
  setCurrentMessageId: (id) => set({ currentMessageId: id }),
  requestAbort: () => set({ abortFlag: true }),
  resetAbort: () => set({ abortFlag: false }),
  clearMessages: () => set({ messages: [] }),
}));

// ============ Strategy History Store ============

interface HistoryState {
  records: StrategyRecord[];
  addRecord: (r: StrategyRecord) => void;
  updateRecord: (id: string, partial: Partial<StrategyRecord>) => void;
  deleteRecord: (id: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  (set) => ({
    records: [],
    addRecord: (r) => set((s) => ({ records: [r, ...s.records] })),
    updateRecord: (id, partial) =>
      set((s) => ({
        records: s.records.map((r) => (r.id === id ? { ...r, ...partial } : r)),
      })),
    deleteRecord: (id) =>
      set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
    clearAll: () => set({ records: [] }),
  })
);

// ============ Trading Stats Store (in-memory, simulated) ============

interface TradingStatsState {
  balance: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  executedOrders: {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    size: string;
    price: number;
    status: "simulated" | "live";
    createdAt: number;
    strategyTag: string;
  }[];

  recordOrder: (order: {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    size: string;
    price: number;
    status: "simulated" | "live";
    strategyTag: string;
    pnl?: number;
  }) => void;
  resetStats: () => void;
}

export const useTradingStatsStore = create<TradingStatsState>()(
  (set, get) => ({
    balance: 100000,
    totalPnl: 0,
    winRate: 0,
    totalTrades: 0,
    winningTrades: 0,
    executedOrders: [],

    recordOrder: (order) => {
      const pnl = order.pnl ?? (Math.random() - 0.4) * 500;
      const isWin = pnl > 0;
      set((s) => ({
        executedOrders: [
          { ...order, createdAt: Date.now() },
          ...s.executedOrders,
        ].slice(0, 100),
        totalTrades: s.totalTrades + 1,
        winningTrades: s.winningTrades + (isWin ? 1 : 0),
        totalPnl: s.totalPnl + pnl,
        balance: s.balance + pnl,
        winRate:
          s.totalTrades + 1 === 0
            ? 0
            : ((s.winningTrades + (isWin ? 1 : 0)) / (s.totalTrades + 1)) * 100,
      }));
    },
    resetStats: () =>
      set({
        balance: 100000,
        totalPnl: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        executedOrders: [],
      }),
  })
);
