import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bitget SmartAgent — AI 驱动的智能加密交易助手",
  description:
    "Bitget SmartAgent 是为 Bitget AI Hackathon 打造的 Agentic Trading 应用，集成 Bitget Skill Hub、实时行情、K线图、AI 决策链与风控系统，支持中英文切换、模拟/真实交易模式。",
  keywords: [
    "Bitget",
    "AI Trading",
    "Agentic Trading",
    "Skill Hub",
    "Crypto",
    "Hackathon",
    "SmartAgent",
  ],
  authors: [{ name: "Bitget SmartAgent Team" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bitget SmartAgent",
  },
  openGraph: {
    title: "Bitget SmartAgent — AI 驱动的智能加密交易助手",
    description:
      "Agentic Trading 应用：感知 → 多维度分析 → 决策 → 执行 → 风控 完整闭环",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
