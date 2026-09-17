# NewBee OS

## 这是什么
一个人的房地产交易操作系统（self-use first）。核心思想：**合同即数据**——上传合同 → AI 抽取 Key-Value → 人工确认 → 派生里程碑 / 任务 / 日历 / 提醒 / 佣金。
产品规格见 `docs/spec.html`，30 天计划见 `docs/devplan.html`，每日日志见 `docs/log.md`。**开工前先读 `docs/log.md` 最后 3 条。**

## 技术栈（不要换、不要加计划外的库）
pnpm monorepo · TypeScript · Next.js App Router + Tailwind（shadcn/ui 按需 `pnpm dlx shadcn@latest add`）· Supabase（Postgres / Auth / Storage）· Vitest · `@anthropic-ai/sdk` · zod · date-fns

## 目录
- `packages/core` — 纯业务逻辑：`types/` `schemas/` `engines/` `ai/` `playbooks/` `test/`。**禁止** import React、Next、supabase-js。只吃纯数据、吐纯数据。
- `apps/web` — Next.js。只做界面和调用；**不写业务规则**（日期计算、任务生成、佣金公式一律调 core）。
- `supabase/migrations` — 只增不改。每次改动后运行 `pnpm gen:types`。
- `supabase/seed.sql` — dev 用的样例数据；真实数据只进 prod。

## 约定
- 表 `snake_case` 复数；TS `camelCase`；Key-Value 的 `key` 用 `packages/core/src/schemas/deal-fields.ts` 里的英文 key，**永不改名**（改名 = 新 key + 迁移）。
- 所有表：`id uuid`、`agent_id`、`created_at`、`updated_at`、`deleted_at`（软删）。
- 时间 `timestamptz`（UTC）；日期型字段用 `date`；金额 `numeric(14,2)`。
- 业务日期计算只在 `packages/core/src/engines/dates.ts`；UI 不算天数。
- AI 只在服务端调用（`apps/web/app/api/**/route.ts`）；用 tool_use 强制 JSON；system prompt 加 `cache_control`。
- 抽取结果里数值 / 日期字段、或 `confidence < 0.9` 的，必须进待确认队列，**不得自动派生**。
- 失败必须落 `documents.status = 'failed'` + `error`，禁止静默吞错。
- 界面文案一律走 `packages/core/src/i18n/messages.ts`（中英都要有），**并且必须放进"设置 › 语言 / 翻译"对应页面的复刻**（`apps/web/components/i18n-replicas.tsx`）——新增菜单、表格、按钮、提示都要在复刻里出现，`apps/web/test` 会检查每条文案都被放置，漏了 `pnpm test` 直接挂。
- **永远不读、不打印、不复制 `.env*` 文件里的值**；需要新的环境变量就在 `.env.example` 加一行占位并告诉我去填。

## 工作方式
- 开工第一件事：`git status` 确认干净；结束前 `pnpm test && pnpm typecheck`，然后写 `docs/log.md`（做了什么 · 卡在哪 · 明天第一件事）并 commit。
- 引擎先写测试再实现（`pnpm test` 跑 core + web 两套）；UI 手测。
- 一次一个交付物；大任务先列步骤给我看。
- 每天结束 `main` 必须可运行、可部署（`pnpm build` 通过）。
- 不确定的业务规则就问，不要猜；Texas 合同规则以 `docs/spec.html` 第 2 节为准。
- 提议装新库前先说明"不装能不能做"。

## 第 1 个月不做
客户端 · Deal Health · Net Sheet · 短信 · 营销 · 报表 · 多用户 · 本地 Docker · Edge Functions 里复用 core
