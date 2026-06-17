# Bitget SmartAgent 🤖

> AI 驱动的智能加密交易助手 — 为 **Bitget AI Hackathon 赛道一** 打造的 Agentic Trading 应用

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Bitget](https://img.shields.io/badge/Bitget-Skill%20Hub-00f5a0)](https://www.bitget.com/)

---

## 📖 项目简介

Bitget SmartAgent 是一个完整的 **Agentic Trading** Web 应用，实现了从市场感知到风控的完整闭环：

```
感知 (Perceive) → 分析 (Analyze) → 决策 (Decide) → 执行 (Execute) → 风控 (Risk)
```

用户用自然语言描述交易策略（如"BTC 现在能买吗？"），Agent 会：
1. **感知**：调用 Bitget Skill Hub 多源数据（技术指标 / 链上 / 情绪 / 新闻 / 宏观）
2. **分析**：综合多维度信号 + LLM 个性化解读
3. **决策**：输出 BUY/SELL/HOLD + 置信度 + 入场区间 + 止损止盈 + 仓位 + 杠杆
4. **执行**：一键模拟下单（记录到历史）
5. **风控**：波动率 / 流动性 / 集中度 / 最大回撤评估

---

## ✨ 核心功能

### 1. 智能对话（主入口）
- 玻璃拟态聊天界面，支持自然语言输入
- 8 个快捷策略示例：Meme 跟单、趋势突破、均值回归、情绪反转、高频套利、趋势跟踪、网格交易、宏观对冲
- 完整 Agent 思考链可视化（5 阶段逐步展示）
- LLM 个性化策略解读

### 2. 实时仪表盘
- 6 币种实时价格卡片（BTC/ETH/SOL/BNB/XRP/DOGE，5 秒刷新）
- 交互式 K线图（Recharts，支持 8 种时间周期切换 + MA7 均线 + 成交量）
- 资产概览：余额、总 PnL、胜率、总交易数
- 最新 Agent 信号列表

### 3. Bitget 深度集成
- **Skill Hub**：sentiment-analyst、technical-analysis、market-intel、news-briefing、on-chain
- **Playbook Key**：辅助验证 + 优雅 fallback
- **Public API**：实时价格、K线（无需鉴权）
- **Private API**：账户资产、下单（HMAC SHA256 签名 + IP 白名单指引）

### 4. 高级功能
- 策略历史记录 + 一键重新运行
- 模拟交易日志 CSV 导出
- 深色 / 浅色主题切换
- 中英文切换
- PWA 支持（可安装到手机桌面）
- 移动端极致响应式
- 设置页：API 配置 + IP 白名单提示 + 模拟/真实模式切换 + 风险偏好

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态管理 | Zustand (persist) |
| 图表 | Recharts |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| LLM | z-ai-web-dev-sdk (GLM) |
| API | Bitget Spot/Futures REST API |
| 部署 | Netlify |

---

## 🚀 快速开始

### 前置要求
- Node.js 20+
- npm 或 pnpm

### 安装

```bash
git clone <your-repo-url>
cd bitget-smartagent
npm install --legacy-peer-deps
```

### 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 Bitget API 凭证（可选，不填也能用模拟模式）：

```env
BITGET_API_KEY=your_key
BITGET_API_SECRET=your_secret
BITGET_PASSPHRASE=your_passphrase
PLAYBOOK_KEY=your_playbook_key
```

> ⚠️ **重要**：在 Bitget 创建 API Key 时，务必将服务器 IP 加入白名单。
> 在应用「设置」页面可查看当前服务器 IP。

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

---

## 📦 Netlify 部署

### 方式一：Git 集成（推荐）

1. 将代码推送到 GitHub
2. 登录 [Netlify](https://app.netlify.com/)
3. 点击 "Add new site" → "Import an existing project"
4. 选择你的 GitHub 仓库
5. Netlify 会自动识别 `netlify.toml` 配置：
   - Build command: `npm run build`
   - Publish directory: `.next`
6. 在 "Environment variables" 中添加：
   - `BITGET_API_KEY`
   - `BITGET_API_SECRET`
   - `BITGET_PASSPHRASE`
   - `PLAYBOOK_KEY`
7. 点击 "Deploy site"

### 方式二：CLI 部署

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --build --prod
```

> ⚠️ 部署后，在 Netlify 站点设置中找到服务器 IP，添加到 Bitget API Key 白名单。

---

## 📁 项目结构

```
bitget-smartagent/
├── src/
│   ├── app/
│   │   ├── api/                    # API 路由
│   │   │   ├── agent/chat/         # Agent 智能闭环
│   │   │   ├── market/tickers/     # 实时价格
│   │   │   ├── market/candles/     # K线数据
│   │   │   ├── account/            # 账户资产（签名）
│   │   │   ├── order/              # 下单（签名）
│   │   │   └── ip/                 # IP 查询（白名单用）
│   │   ├── globals.css             # 暗黑科技风 + 玻璃拟态
│   │   ├── layout.tsx              # 根布局
│   │   └── page.tsx                # 主页面（视图切换）
│   ├── components/
│   │   ├── chat/                   # 聊天组件
│   │   ├── dashboard/              # 仪表盘组件
│   │   ├── views/                  # 历史 / 设置视图
│   │   ├── ui/                     # shadcn/ui 组件
│   │   └── header.tsx              # 顶部导航
│   ├── lib/
│   │   ├── bitget.ts               # Bitget API 客户端（签名）
│   │   ├── agent.ts                # Agent 核心引擎
│   │   ├── skill-hub.ts            # Skill Hub 集成层
│   │   ├── indicators.ts           # 技术指标计算
│   │   ├── llm.ts                  # LLM 个性化解读
│   │   ├── i18n.ts                 # 中英文翻译
│   │   └── types.ts                # TypeScript 类型
│   └── stores/
│       ├── app-store.ts            # 全局状态
│       └── chat-store.ts           # 聊天 + 历史 + 交易统计
├── public/
│   ├── icons/                      # PWA 图标
│   └── manifest.webmanifest        # PWA 配置
├── .env.example
├── netlify.toml
└── README.md
```

---

## 🔐 安全说明

- API Key 仅存储在浏览器 localStorage，不会上传到任何第三方
- 所有私有 API 调用都在服务端完成（Next.js API Routes），Key 不会暴露到前端
- **务必**在 Bitget 设置 IP 白名单，限制 Key 只能从你的服务器调用
- 模拟模式（默认）不会调用真实交易 API，所有订单仅记录在本地

---

## 🎯 Hackathon 提交说明

### 赛道
Bitget AI Hackathon — 赛道一：Trading Agent

### 使用了哪些 Bitget 工具
- ✅ **Skill Hub**：sentiment-analyst、technical-analysis、market-intel、news-briefing、on-chain（含 fallback）
- ✅ **Playbook Key**：作为 Skill Hub 调用凭证
- ✅ **Bitget Public API**：实时价格、K线
- ✅ **Bitget Private API**：账户资产、下单（HMAC SHA256 签名）

### 亮点
1. **完整 Agentic 闭环**：感知 → 分析 → 决策 → 执行 → 风控，5 阶段可视化
2. **多源信号融合**：技术 + 链上 + 情绪 + 新闻 + 宏观，加权决策
3. **LLM 个性化解读**：GLM 模型根据用户原始查询生成定制化分析
4. **优雅降级**：Skill Hub 不可用时自动 fallback 到本地启发式实现
5. **专业风控**：波动率 / 流动性 / 集中度 / 最大回撤多维评估
6. **极致体验**：玻璃拟态暗黑科技风 + 中英文 + PWA + 移动端优化

---

## 📄 License

MIT License — for Hackathon demo and learning purposes only.

## ⚠️ 免责声明

本项目仅供学习和 Hackathon 演示使用，不构成任何投资建议。加密货币交易存在高风险，请谨慎决策。
