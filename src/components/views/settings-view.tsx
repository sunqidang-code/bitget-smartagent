"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTradingStatsStore } from "@/stores/chat-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Key,
  Shield,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  Zap,
  Database,
  RotateCcw,
} from "lucide-react";

export function SettingsView() {
  const { language, settings, updateSettings } = useAppStore();
  const resetStats = useTradingStatsStore((s) => s.resetStats);
  const [ip, setIp] = useState<string>("");
  const [ipLoading, setIpLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    fetch("/api/ip")
      .then((r) => r.json())
      .then((j) => {
        if (j.code === "00000") setIp(j.data.ip);
      })
      .finally(() => setIpLoading(false));
  }, []);

  const handleTestConnection = async () => {
    if (!settings.apiKey || !settings.apiSecret || !settings.passphrase) {
      toast.error(language === "zh" ? "请先填写完整 API 凭证" : "Please fill in all API credentials");
      return;
    }
    setTesting(true);
    setTestResult("idle");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
          passphrase: settings.passphrase,
          type: "spot",
        }),
      });
      const json = await res.json();
      if (json.code === "00000") {
        setTestResult("ok");
        toast.success(t(language, "toastConnectionOk"));
      } else {
        setTestResult("fail");
        toast.error(t(language, "toastConnectionFail"));
      }
    } catch {
      setTestResult("fail");
      toast.error(t(language, "toastConnectionFail"));
    } finally {
      setTesting(false);
    }
  };

  const copyIp = () => {
    navigator.clipboard.writeText(ip);
    toast.success(language === "zh" ? "IP 已复制" : "IP copied");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-bold">
          {language === "zh" ? "设置" : "Settings"}
        </h2>
      </div>

      {/* Mode toggle */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-300" />
            {language === "zh" ? "交易模式" : "Trading Mode"}
          </CardTitle>
          <CardDescription className="text-xs">
            {language === "zh"
              ? "模拟模式不会真实下单，所有订单仅记录到本地。切换到真实模式前请确保已配置 API 并完成 IP 白名单。"
              : "Simulation mode does NOT place real orders. Switch to Live only after configuring API and IP whitelist."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-black/20 p-3">
            <div>
              <div className="text-sm font-semibold">
                {settings.mode === "live"
                  ? language === "zh" ? "真实交易模式" : "Live Trading"
                  : language === "zh" ? "模拟交易模式" : "Simulation Mode"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {settings.mode === "live"
                  ? "⚠️ 实盘下单，请谨慎操作"
                  : "✓ 安全模式，仅本地记录"}
              </div>
            </div>
            <Switch
              checked={settings.mode === "live"}
              onCheckedChange={(v) =>
                updateSettings({ mode: v ? "live" : "simulation" })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Bitget API credentials */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4 text-cyan-300" />
            {language === "zh" ? "Bitget API 凭证" : "Bitget API Credentials"}
          </CardTitle>
          <CardDescription className="text-xs">
            {language === "zh"
              ? "凭证仅保存在浏览器本地 (localStorage)，不会上传服务器。建议使用只读 + 交易权限的子账号。"
              : "Credentials are stored locally in your browser only. Use a sub-account with read + trade permissions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <Input
              type="password"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder="bg_xxxxxxxxxxxx"
              className="bg-black/30 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API Secret</Label>
            <Input
              type="password"
              value={settings.apiSecret}
              onChange={(e) => updateSettings({ apiSecret: e.target.value })}
              placeholder="••••••••••••••••"
              className="bg-black/30 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Passphrase</Label>
            <Input
              type="password"
              value={settings.passphrase}
              onChange={(e) => updateSettings({ passphrase: e.target.value })}
              placeholder="••••••"
              className="bg-black/30 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
              className="gap-1.5"
            >
              {testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {language === "zh" ? "测试连接" : "Test Connection"}
            </Button>
            {testResult === "ok" && (
              <Badge className="bg-emerald-500/15 text-emerald-300 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> OK
              </Badge>
            )}
            {testResult === "fail" && (
              <Badge className="bg-rose-500/15 text-rose-300 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" /> Failed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* IP whitelist helper */}
      <Card className="border-amber-500/20 bg-amber-500/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-300" />
            {language === "zh" ? "IP 白名单" : "IP Whitelist"}
          </CardTitle>
          <CardDescription className="text-xs">
            {language === "zh"
              ? "Bitget API 要求绑定 IP 白名单。将下方检测到的 IP 添加到 Bitget API 管理页面的白名单中。"
              : "Bitget API requires IP whitelist. Add the detected IP below to your Bitget API management page."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg bg-black/30 p-3">
            <Globe className="h-4 w-4 text-amber-300 shrink-0" />
            <code className="flex-1 text-sm font-mono">
              {ipLoading ? "检测中…" : ip || "unknown"}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyIp}
              disabled={!ip || ip === "unknown"}
              className="gap-1 h-7"
            >
              <Copy className="h-3 w-3" />
              {language === "zh" ? "复制" : "Copy"}
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-amber-300/70 leading-relaxed">
            ⚠️ {language === "zh"
              ? "如果你部署到 Netlify/Vercel 等平台，服务器出口 IP 会变化。生产环境建议通过后端代理调用 Bitget API，并将后端 IP 加入白名单。"
              : "If deployed to Netlify/Vercel, the server egress IP may change. For production, proxy Bitget API calls through your backend and whitelist the backend IP."}
          </p>
        </CardContent>
      </Card>

      {/* Playbook Key */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-violet-300" />
            Bitget Playbook Key
          </CardTitle>
          <CardDescription className="text-xs">
            {language === "zh"
              ? "可选。配置后 Agent 会尝试调用 Bitget Skill Hub 远程技能；失败时自动回退到本地启发式实现。"
              : "Optional. When set, the agent will try Bitget Skill Hub remote skills; falls back to local heuristics on failure."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="password"
            value={settings.playbookKey}
            onChange={(e) => updateSettings({ playbookKey: e.target.value })}
            placeholder="pb_xxxxxxxxxxxx"
            className="bg-black/30 font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* Risk params */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-300" />
            {language === "zh" ? "风控参数" : "Risk Parameters"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {language === "zh" ? "默认杠杆" : "Default Leverage"}
              </Label>
              <Select
                value={String(settings.defaultLeverage)}
                onValueChange={(v) => updateSettings({ defaultLeverage: Number(v) })}
              >
                <SelectTrigger className="bg-black/30 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 20].map((l) => (
                    <SelectItem key={l} value={String(l)}>{l}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {language === "zh" ? "最大仓位 %" : "Max Position %"}
              </Label>
              <Select
                value={String(settings.maxPositionPct)}
                onValueChange={(v) => updateSettings({ maxPositionPct: Number(v) })}
              >
                <SelectTrigger className="bg-black/30 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 30, 50].map((p) => (
                    <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {language === "zh" ? "风险偏好" : "Risk Tolerance"}
            </Label>
            <Select
              value={settings.riskTolerance}
              onValueChange={(v) => updateSettings({ riskTolerance: v as "conservative" | "balanced" | "aggressive" })}
            >
              <SelectTrigger className="bg-black/30 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">
                  {language === "zh" ? "保守" : "Conservative"}
                </SelectItem>
                <SelectItem value="balanced">
                  {language === "zh" ? "平衡" : "Balanced"}
                </SelectItem>
                <SelectItem value="aggressive">
                  {language === "zh" ? "激进" : "Aggressive"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data management */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-rose-300" />
            {language === "zh" ? "数据管理" : "Data Management"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetStats();
              toast.success(language === "zh" ? "模拟账户已重置" : "Simulation account reset");
            }}
            className="gap-1.5 text-rose-300 hover:text-rose-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {language === "zh" ? "重置模拟账户" : "Reset Simulation Account"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground/60 pt-2">
        {language === "zh"
          ? "所有数据保存在浏览器本地，刷新页面不会丢失。清除浏览器数据将重置所有设置。"
          : "All data is stored locally in your browser. Clearing browser data will reset all settings."}
      </p>
    </div>
  );
}
