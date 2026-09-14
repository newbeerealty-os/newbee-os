# NewBee OS · Day 1 骨架

"合同即数据"的房地产交易操作系统。这是 30 天计划的 **Day 1 仓库骨架**：
目录结构、核心引擎（日期 / 里程碑 / Playbook / 佣金）+ 测试、AI 抽取（服务端）、
Supabase 建表脚本、Next.js 三个页面（今天 / 交易 / 任务）。

> 先读 `CLAUDE.md`（项目宪法），再读 `docs/devplan.html`（30 天计划）。

## 结构

```
newbee-os/
├── apps/web/            Next.js 16（App Router + Tailwind）——经纪人网站 + PWA
│   ├── app/(agent)/     today / deals / deals/[id] / tasks（登录后）
│   ├── app/api/extract  POST：触发一份 PDF 的 AI 抽取
│   ├── lib/actions/     Server Actions（UI 只调这里）
│   ├── lib/extract.ts   下载 PDF → Claude 抽取 → 写 deal_fields（待确认）
│   └── proxy.ts         每请求刷新 Supabase 会话（Next 16 的 middleware）
├── .claude/settings.json Claude Code 的项目权限：test/typecheck/git 免确认；禁读 .env
├── packages/core/       纯 TypeScript，无 UI、无 supabase 依赖 —— 未来手机 App 直接复用
│   ├── src/schemas/     deal-fields（字段注册表）、playbook、extraction（zod）
│   ├── src/engines/     dates / milestones / playbook / commission
│   ├── src/ai/          extract（Claude PDF 抽取）、classify（文档分类）
│   ├── playbooks/       seller.json（从你的 Wise Agent Seller 模板转的）
│   └── test/            vitest；golden/ 放真实合同（已 gitignore）
├── supabase/            migrations/0001_init.sql、seed.sql
└── docs/                spec / devplan / teardown / adr / log
```

## Day 1：把它跑起来（约 1 小时，Windows 为例）

> 目录放在 `C:\dev\newbee-os`，不要放 OneDrive / 桌面 / 带空格的路径。命令在 PowerShell 或 VS Code 终端里跑。

```powershell
# 0. 前置：Git for Windows、Node 22 LTS、pnpm 10
winget install Git.Git OpenJS.NodeJS.LTS      # 或去官网下安装包；装完关掉再开一个终端
corepack enable; corepack prepare pnpm@10.28.0 --activate   # 或 npm i -g pnpm@10
cd C:\dev\newbee-os
git init; git add -A; git commit -m "Day 1 scaffold"       # 先入库，之后每天一个 commit
pnpm install                  # 会顺带装 Supabase CLI（项目内，不用全局装）
pnpm test                     # core 引擎测试应全绿（不需要任何 key）

# 1. Supabase：在 supabase.com 建项目（区域选 us-east / us-central），记下 project ref
pnpm supabase login
pnpm supabase link --project-ref <你的 project ref>
pnpm db:push                  # 跑 migrations/0001_init.sql
pnpm gen:types                # 生成 packages/core/src/types/database.ts

# 2. 环境变量
copy .env.example apps\web\.env.local   # 填 Supabase URL / anon key / service role；ANTHROPIC_API_KEY（抽取才用，可以明天再填）

# 3. Supabase Dashboard
#    Authentication → URL Configuration：Site URL = http://localhost:3000，Redirect URLs 加 http://localhost:3000/auth/callback
#    Authentication → Users → Add user：你的邮箱 + 密码，勾 Auto Confirm（Day 1 用密码登录，不依赖邮件）

# 4. 跑起来
pnpm dev                      # http://localhost:3000 → 邮箱 + 密码登录 → /today
```

## Day 1 验收

1. `/login` 收到邮件、点链接进 `/today`。
2. `/deals` 新建一笔卖方交易 → 进入详情页。
3. 在「字段」区手动写入 `effective_date = 2026-09-01`、`option_period_days = 10`、`closing_date = 2026-11-30`，
   点「派生里程碑与任务」→ 里程碑出现 Option 到期 2026-09-11 17:00、Closing 11-30、Walk-through 11-29，
   任务按 Playbook 生成，`/today` 能看到 7 天内的节点。
4. 上传一份**已执行**的 TREC 1-4 PDF → 点「AI 抽取」→ 「待确认」出现字段（带页码和原文引用）→ 逐个确认 → 再派生。

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 本地跑 web |
| `pnpm test` | core 单测（vitest） |
| `pnpm typecheck` | 全仓库 tsc |
| `pnpm build` | 全仓库 build（部署前） |
| `pnpm gen:types` | 从 Supabase 重新生成 DB 类型（每次 migration 后） |
| `pnpm db:push` | 推 migration 到线上库 |
| `pnpm supabase <cmd>` | 项目内的 Supabase CLI（login / link / status …） |

## 约定（详见 CLAUDE.md）

- 字段 key 永不改名（`packages/core/src/schemas/deal-fields.ts` 是宪法）。
- AI 只在服务端调用；数值 / 日期字段或置信度 < 0.9 的一律进「待确认」，不得自动派生。
- 引擎改动先写测试；真实合同放 `packages/core/test/golden/`（不入库）。
- migration 只增不改：新改动写 `0002_xxx.sql`。
- 提交前 `pnpm test && pnpm typecheck`。

## 已知留白（第 1 周内补）

- `packages/core/src/types/database.ts` 目前是占位，`pnpm gen:types` 后 Supabase 查询才有类型。
- 抽取是同步等待（20–40 秒）；Day 5 改成后台任务 + 状态轮询。
- 没有 buyer / lease Playbook（先把 seller 跑顺）。
- 没有 contacts / properties 表（Week 3）。
